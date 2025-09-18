"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Mesh, AdditiveBlending, Color, DataTexture, RGBAFormat, UnsignedByteType, RepeatWrapping, Vector2, Vector3, Texture, TextureLoader, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";
import HoloMaterial from "@/components/HoloMaterial";
import type { Song } from "@/data/songs";
import { usePlanetLayout } from "@/lib/planetLayout";
import { registerPlanet, unregisterPlanet } from "@/lib/planetRegistry";
// Html labels removed; titles will render in HUD top-left overlay

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Planet({
  song,
  isMain,
  isHover,
  isMoon,
}: {
  song: Song;
  isMain: boolean;
  isHover: boolean;
  isMoon: boolean;
}) {
  // Enable procedural surface/normal/roughness maps for more realistic shading
  const USE_PROCEDURAL = true;
  // Global size scaling; increase base so all planets are much larger
  const BASE_SCALE = 1.2; // Increased for more dramatic presence
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  const outlineRef = useRef<Mesh>(null);
  const mainRingRef = useRef<Mesh>(null);
  const mainRingRef2 = useRef<Mesh>(null);
  const sprinkleRef = useRef<any>(null);

  const angleRef = useRef(Math.random() * Math.PI * 2);
  const orbitRadiusRef = useRef(song.planet.orbitRadius);
  const scaleRef = useRef(song.planet.radius * BASE_SCALE);
  const phaseOffsetRef = useRef(0);
  const phaseTargetRef = useRef(0);
  const worldPosRef = useRef(new Vector3());
  const [depthFactor, setDepthFactor] = useState(1.0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchOpacity, setGlitchOpacity] = useState(1.0);
  const glitchTimerRef = useRef<number | undefined>(undefined);

  // Deterministic jitter so orbiting planets don't overlap perfectly
  const idHash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < song.id.length; i++) h = (h * 31 + song.id.charCodeAt(i)) | 0;
    return h;
  }, [song.id]);
  
  // Realistic planetary size variation based on song characteristics
  const sizeVar = (idHash % 997) / 997; // [0,1)
  
  // Create dramatic size differences like real planets
  const planetType = sizeVar < 0.15 ? 'dwarf' : sizeVar < 0.4 ? 'terrestrial' : sizeVar < 0.75 ? 'neptune' : 'gas-giant';
  
  // Element-based tweaks (non-destructive): radius/speed/wobble/scale tinting done as computed fields
  const element = (song as any)?.planet?.element as ("water"|"fire"|"lightning"|"heart"|"moon"|"magic"|"darkness"|undefined);
  
  // More varied and realistic colors for each planet type
  const color = useMemo(() => {
    if (planetType === 'gas-giant') {
      // Gas giants have varied compositions
      const gasColors = ["#FFD700", "#FFA500", "#FF6347", "#DDA0DD", "#98FB98"];
      return gasColors[Math.abs(idHash) % gasColors.length];
    }
    if (planetType === 'neptune') {
      // Ice giants in different hues
      const iceColors = ["#4169E1", "#00BFFF", "#87CEEB", "#B0E0E6", "#E6E6FA"];
      return iceColors[Math.abs(idHash) % iceColors.length];
    }
    if (planetType === 'dwarf') {
      // Diverse rocky/metallic compositions
      const dwarfColors = ["#A0522D", "#8B4513", "#696969", "#D2691E", "#CD853F"];
      return dwarfColors[Math.abs(idHash) % dwarfColors.length];
    }
    if (element === 'water') return "#00CED1"; // Dark turquoise for water worlds
    if (element === 'fire') return "#FF4500"; // Orange-red for fire worlds
    if (element === 'lightning') return "#9400D3"; // Violet for lightning worlds
    if (element === 'darkness') return "#8B0000"; // Dark red for dark worlds
    return song.planet.color || "#3DF5FF";
  }, [song.planet.color, planetType, element, idHash]);
  const ringColor = useMemo(() => {
    const hex = (color || "#3DF5FF").replace('#','');
    const r = parseInt(hex.substring(0,2) || '00', 16);
    const g = parseInt(hex.substring(2,4) || '00', 16);
    const b = parseInt(hex.substring(4,6) || '00', 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 30 ? '#19E3FF' : color;
  }, [color]);
  // Lock main planet shader to element color: inner = element color, base = darkened element
  const innerColor = useMemo(() => new Color(color), [color]);
  const baseColor = useMemo(() => {
    const c = new Color(color);
    const dark = c.clone().multiplyScalar(0.22);
    // slight teal bias for richness
    return dark.lerp(new Color('#0C2A33'), 0.18);
  }, [color]);
  // One dominant center planet; others arranged on a shared ring, smaller.
  const speedBase = song.planet.orbitSpeed;
  const speedTarget = isHover ? speedBase * 1.8 : speedBase;
  const jitter = ((idHash % 1000) / 1000 - 0.5) * 0.4; // wider placement jitter [-0.2, 0.2]
  const titleLength = song.title.length;
  const genreInfluence = (song as any).genre ? (song as any).genre.length / 10 : 0.5;
  
  // Debug: Log planet types so user can see the system working
  if (isMain) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`🪐 MAIN PLANET: "${song.title}" -> Type: ${planetType}, Size: ${sizeVar.toFixed(2)}, Element: ${element}, Color: ${color}`);
    }
  }
  
  const sizeMultipliers = {
    'dwarf': 0.15 + sizeVar * 0.8,       // 0.15-0.95x - varied tiny to small sizes, more visible
    'terrestrial': 0.8 + sizeVar * 1.8,  // 0.8-2.6x - highly varied earth-like sizes, more dramatic
    'neptune': 3.2 + sizeVar * 3.5,      // 3.2-6.7x - dramatically varied ice giant sizes, larger
    'gas-giant': 8.0 + sizeVar * 12.0    // 8.0-20.0x - extremely varied massive gas giant sizes, much larger
  };
  
  const satelliteSizeJitter = (sizeMultipliers[planetType] || 1.0) * (0.8 + (titleLength || 0) * 0.02);
  const mainSizeJitter = (sizeMultipliers[planetType] || 1.0) * (0.9 + (genreInfluence || 0) * 0.2);
  // Push satellites a bit further out on the shared ring
  // Keep system within left HUD column: tighten satellite ring radius
  const ringBase = 6.0; // push satellites further out for even more spacing
  // Larger outward nudge on hover
  const orbitTarget = isMain ? 0 : (isMoon ? 2.0 : ringBase) + jitter + (isHover ? 1.0 : 0);
  const base = (song.planet?.radius || 1.0) * BASE_SCALE;
  // Ultra-dramatic size differences with extreme variation for holographic effect
  const MAIN_MULT = planetType === 'gas-giant' ? (80.0 + sizeVar * 50.0) : planetType === 'neptune' ? (45.0 + sizeVar * 35.0) : planetType === 'terrestrial' ? (25.0 + sizeVar * 20.0) : (12.0 + sizeVar * 15.0);
  const ORBIT_MULT = isMoon ? (0.05 + sizeVar * 0.12) : (planetType === 'gas-giant' ? (2.2 + sizeVar * 1.5) : planetType === 'neptune' ? (1.5 + sizeVar * 1.0) : planetType === 'terrestrial' ? (0.9 + sizeVar * 0.8) : (0.4 + sizeVar * 0.6));
  const HOVER_MULT = 1.25;
  const scaleTarget = Math.max(0.01, isMain
    ? base * MAIN_MULT * mainSizeJitter
    : (isHover ? base * ORBIT_MULT * HOVER_MULT : base * ORBIT_MULT) * satelliteSizeJitter) || 1.0;

  // Layout fields (concentric rings + golden-angle)
  const layout = usePlanetLayout(song.id);
  const layoutOrbit = layout?.orbitRadius ?? orbitTarget;
  const layoutTiltDeg = layout?.tiltDeg ?? ((song.planet?.tilt || 0) * (180 / Math.PI));
  const layoutEcc = layout?.ecc ?? 0.0;
  const layoutAngle0 = layout?.angle0 ?? angleRef.current;

  // Element-based tweaks (non-destructive): radius/speed/wobble/scale tinting done as computed fields
  const radiusMul = element === "water" ? 1.04 : element === "fire" ? 0.96 : 1.0;
  const speedMul = element === "water" ? 0.92 : element === "fire" ? 1.08 : element === "lightning" ? 1.10 : 1.0;
  const wobbleExtra = element === "lightning" ? 0.01 : 0.0;
  const scaleMul = element === "heart" ? 1.06 : 1.0;
  
  // Element type flags for material properties
  const isDark = element === 'darkness';

  // Register with global overlap manager (screen-space separation)
  useEffect(() => {
    const ringIndex = layout?.ringIndex ?? 0;
    const getWorldPosition = () => {
      if (groupRef.current) groupRef.current.getWorldPosition(worldPosRef.current);
      return worldPosRef.current;
    };
    const getAngle = () => (layoutAngle0 + angleRef.current + phaseOffsetRef.current);
    const addPhase = (delta: number) => { phaseTargetRef.current += delta; };
    registerPlanet({ id: song.id, ringIndex, getWorldPosition, getAngle, addPhase });
    return () => {
      unregisterPlanet(song.id);
      // Cleanup glitch timer
      if (glitchTimerRef.current !== undefined) {
        clearTimeout(glitchTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, layout?.ringIndex, layoutAngle0]);

  // color and ringColor now defined above

  // Optional external texture map (e.g., cover art) when provided — disabled to keep realistic planets
  const USE_EXTERNAL_TEXTURES = false;
  // Optional external texture map (e.g., cover art) when provided
  const [externalMap, setExternalMap] = useState<Texture|null>(null);
  useEffect(() => {
    if (!USE_EXTERNAL_TEXTURES) { setExternalMap(null); return; }
    let cancelled = false;
    const url = song.planet.textureUrl;
    if (!url) { setExternalMap(null); return; }
    try {
      const loader = new TextureLoader();
      loader.load(url, (tex) => { if (!cancelled) { tex.wrapS = tex.wrapT = RepeatWrapping; setExternalMap(tex); } }, undefined, () => { if(!cancelled) setExternalMap(null); });
    } catch { setExternalMap(null); }
    return () => { cancelled = true; };
  }, [song.planet.textureUrl]);

  // Only build procedural textures when enabled and no external map
  const { colorTex, normalTex, roughTex, cloudsTex } = useMemo(() => {
    if (!USE_PROCEDURAL || (USE_EXTERNAL_TEXTURES && externalMap)) {
      const empty = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
      empty.needsUpdate = true;
      return { colorTex: empty, normalTex: empty, roughTex: empty, cloudsTex: empty } as any;
    }
    try {
      const size = 2048; // Ultra-high resolution for maximum detail and realism
      const base = new Color(color);
      const light = base.clone().lerp(new Color('#ffffff'), 0.25);
      const dark = base.clone().multiplyScalar(0.55);
      const dataColor = new Uint8Array(size * size * 4);
      const dataHeight = new Float32Array(size * size);
      const dataNormal = new Uint8Array(size * size * 4);
      const dataRough = new Uint8Array(size * size * 4);
      const dataClouds = new Uint8Array(size * size * 4);
      let ph = 0;
      for (let i = 0; i < song.id.length; i++) ph = (ph * 31 + song.id.charCodeAt(i)) % 9973;
      const phase = ph * 0.001;
      const bandFreq = 8 + (ph % 7);
      // Ultra-advanced multi-octave noise for ultra-realistic terrain with holographic surface patterns
      const noise = (x: number, y: number) => {
        // Primary landform noise (continents, major features) with holographic interference
        const n1 = Math.sin(x * 0.27 + phase) * Math.cos(y * 0.23 - phase * 1.7);
        const n2 = Math.sin((x + y) * 0.11 + phase * 2.3);
        const n3 = Math.sin(x * 0.41 + phase * 1.3) * Math.cos(y * 0.37 + phase * 0.9);
        const n4 = Math.sin((x - y) * 0.19 + phase * 2.7) * 0.6;
        
        // Medium-scale features (mountain ranges, river systems) with digital artifacts
        const n5 = Math.sin(x * 1.1 + phase * 0.7) * Math.cos(y * 1.3 - phase * 1.1) * 0.3;
        const n6 = Math.sin((x * 2.1 + y * 1.9) * 0.5 + phase * 3.1) * 0.2;
        
        // Fine-scale details (local terrain, small-scale geology) with scan line interference
        const n7 = Math.sin(x * 3.7 + phase * 1.2) * Math.cos(y * 4.1 - phase * 0.8) * 0.15;
        const n8 = Math.sin((x * 5.3 - y * 4.7) * 0.3 + phase * 2.8) * 0.1;
        
        // Ultra-fine surface texture with holographic noise
        const n9 = Math.sin(x * 8.9 + phase * 0.9) * Math.cos(y * 9.7 + phase * 1.5) * 0.08;
        const n10 = Math.sin((x * 12.1 + y * 11.3) * 0.2 + phase * 4.2) * 0.05;
        
        // Micro-detail surface features (enhanced realism) with digital grid patterns
        const n11 = Math.sin(x * 15.7 + phase * 1.8) * Math.cos(y * 16.3 - phase * 2.1) * 0.03;
        const n12 = Math.sin((x * 21.1 - y * 19.7) * 0.15 + phase * 5.2) * 0.02;
        const n13 = Math.sin(x * 28.3 + phase * 2.7) * Math.cos(y * 31.1 + phase * 3.3) * 0.015;
        
        // Add holographic surface pattern overlays
        const holoGrid1 = Math.sin(x * 45.0 + phase * 3.0) * Math.sin(y * 45.0 + phase * 2.5) * 0.008;
        const holoGrid2 = Math.sin(x * 90.0 + phase * 4.0) * Math.sin(y * 90.0 + phase * 3.5) * 0.004;
        const holoScanlines = Math.sin(y * 180.0 + phase * 5.0) * 0.006;
        
        // Digital artifact patterns (like holographic projection errors)
        const digitalNoise1 = Math.floor(Math.sin(x * 25.0 + phase) * 4.0) / 4.0 * 0.01;
        const digitalNoise2 = Math.floor(Math.sin(y * 30.0 + phase * 1.5) * 3.0) / 3.0 * 0.008;
        
        // Combine all octaves with appropriate weights plus holographic effects
        return (n1 + n2 + n3 * 0.7 + n4 * 0.5 + n5 * 0.4 + n6 * 0.25 + n7 * 0.15 + n8 * 0.1 + 
                n9 * 0.08 + n10 * 0.05 + n11 * 0.03 + n12 * 0.02 + n13 * 0.015 + 
                holoGrid1 + holoGrid2 + holoScanlines + digitalNoise1 + digitalNoise2) * 0.22;
      };
      let p = 0; let idx = 0;
      for (let j = 0; j < size; j++) {
        const v = j / (size - 1);
        const lat = (v - 0.5) * 2;
        for (let i = 0; i < size; i++) {
          const n = noise(i, j);
          // Advanced geological features
          const continentalNoise = Math.sin(i * 0.15 + phase) * Math.cos(j * 0.12 - phase) * 0.6 + 0.5;
          const oceanicPattern = Math.sin(lat * (bandFreq * 1.3) + n * 2.1) * 0.5 + 0.5;
          const tectonicLines = Math.sin((i + j) * 0.08 + phase * 1.5) > 0.7 ? 0.3 : 0;
          
          // Polar ice caps (brighten near poles)
          const polarDistance = Math.abs(lat);
          const polarCaps = polarDistance > 0.7 ? Math.pow((polarDistance - 0.7) / 0.3, 2) * 0.4 : 0;
          
          // Equatorial features (different for each element)
          const equatorialBand = Math.exp(-Math.pow(lat * 3, 2)) * 0.2;
          
          let bands = (oceanicPattern * 0.6) + (continentalNoise * 0.4) - tectonicLines + polarCaps + equatorialBand;
          // Rough element inference from color if element not passed
          const elemColor = (song as any)?.planet?.element || '';
          const isWater = (elemColor || '').toLowerCase() === 'water';
          const isEarth = (elemColor || '').toLowerCase() === 'earth';
          const isDark = (elemColor || '').toLowerCase() === 'darkness';
          const isLightning = (elemColor || '').toLowerCase() === 'lightning';
          // Planet type booleans for material properties
          const isGasGiant = planetType === 'gas-giant';
          const isNeptune = planetType === 'neptune';
          // Advanced element-specific terrain features
          let bandBoost = 1.0;
          if (isWater) {
            bandBoost = 1.7;
            // Oceanic ridges and trenches
            const ridges = Math.sin(i * 0.09 + phase) * Math.sin(j * 0.07 - phase) > 0.6 ? 0.25 : 0;
            const trenches = Math.sin(i * 0.06 + phase * 1.3) * Math.cos(j * 0.08 - phase * 0.9) < -0.7 ? -0.2 : 0;
            // Coral reef patterns near equator
            const reefs = equatorialBand > 0.1 ? Math.sin(i * 0.31 + j * 0.29) > 0.6 ? 0.15 : 0 : 0;
            bands += ridges * 0.3 + trenches + reefs;
          } else if (isEarth) {
            bandBoost = 0.9;
            // Mountain ranges and valleys
            const mountains = Math.sin(lat * 12 + n * 3) > 0.5 ? 0.3 : 0;
            const valleys = Math.sin(lat * 8 + n * 2.5) < -0.6 ? -0.2 : 0;
            // Desert patterns
            const deserts = Math.abs(lat) > 0.2 && Math.abs(lat) < 0.5 ? Math.sin(i * 0.25) > 0.3 ? -0.15 : 0 : 0;
            bands += mountains + valleys + deserts;
          } else if (isDark) {
            bandBoost = 0.65;
            // Volcanic and lava patterns
            const volcanic = Math.sin((i + j) * 0.13 + phase * 2) > 0.8 ? 0.5 : 0;
            const lavaFlows = Math.sin(i * 0.17 + phase) * Math.cos(j * 0.21 - phase) > 0.75 ? 0.3 : 0;
            // Obsidian plains
            const plains = Math.sin(lat * 6) > -0.2 && Math.sin(lat * 6) < 0.2 ? -0.25 : 0;
            bands += volcanic * 0.4 + lavaFlows * 0.2 - plains;
          } else {
            bandBoost = 1.15;
            // Generic rocky terrain with canyons
            const canyons = Math.sin(i * 0.11 + j * 0.13) < -0.7 ? -0.3 : 0;
            bands += canyons;
          }
          bands = Math.max(0, Math.min(1, 0.5 + (bands - 0.5) * bandBoost));
          if (isLightning) {
            // Advanced electrical storm patterns
            const stormCell1 = Math.sin((i + ph) * 0.22) * Math.cos((j - ph) * 0.176);
            const stormCell2 = Math.sin((i - ph) * 0.18) * Math.cos((j + ph * 0.8) * 0.205);
            const stormCell3 = Math.sin((i + j + ph) * 0.15) * Math.cos((i - j - ph) * 0.19);
            const electricField = (stormCell1 + stormCell2 * 0.7 + stormCell3 * 0.5) * 0.4;
            
            // Lightning network patterns
            const lightningBolt = Math.sin(i * 0.31 + j * 0.29 + phase * 4) > 0.85 ? 0.7 : 0;
            const electricArcs = Math.sin(i * 0.41 - j * 0.37 + phase * 6) > 0.9 ? 0.5 : 0;
            
            // Plasma storms (larger scale)
            const plasmaStorm = Math.sin(i * 0.07 + j * 0.09 + phase) > 0.6 ? 0.3 : 0;
            
            bands = Math.min(1.0, Math.max(0.0, bands + 0.4 * electricField + lightningBolt * 0.5 + electricArcs * 0.3 + plasmaStorm * 0.2));
          }
          const mixT = Math.min(1, Math.max(0, bands * 0.85 + (n + 0.5) * 0.15));
          // Base color from bands
          const c = dark.clone().lerp(light, mixT);
          // Enhanced crater and geological features with planet-type specific patterns
          const nx = Math.sin((i + ph) * 0.045) * Math.cos((j - ph) * 0.04) * 0.5 + 0.5;
          const secondaryNoise = Math.sin((i * 1.3 + ph) * 0.067) * Math.cos((j * 1.1 - ph) * 0.052) * 0.3 + 0.5;
          const combinedNoise = (nx * 0.7 + secondaryNoise * 0.3);
          
          // Planet-type specific surface features
          let surfacePattern = 0;
          if (planetType === 'gas-giant') {
            // Gas giants have banded atmospheric patterns
            surfacePattern = Math.sin(lat * 15.0 + phase * 2.0) * 0.3 + 
                           Math.sin(lat * 25.0 + phase * 3.0) * 0.2 +
                           Math.sin(lat * 40.0 + phase * 1.5) * 0.1;
          } else if (planetType === 'neptune') {
            // Ice giants have swirling storm patterns
            surfacePattern = Math.sin((i + j) * 0.08 + phase * 2.0) * Math.cos(lat * 8.0) * 0.25 +
                           Math.sin(i * 0.12 + j * 0.15 + phase) * 0.15;
          } else if (planetType === 'dwarf') {
            // Dwarf planets have more chaotic, irregular surfaces
            surfacePattern = Math.sin(i * 0.25 + j * 0.23 + phase) * Math.cos(i * 0.19 + phase * 1.5) * 0.4 +
                           Math.floor(Math.sin(i * 0.08 + j * 0.07) * 5.0) / 5.0 * 0.2;
          } else {
            // Terrestrial planets have continent-like features
            surfacePattern = Math.sin(i * 0.03 + j * 0.025 + phase) * Math.cos(lat * 6.0) * 0.3 +
                           Math.sin(lat * 12.0 + phase * 2.0) * 0.2;
          }
          
          // Add holographic projection artifacts
          const holoArtifact1 = Math.floor(Math.sin(i * 0.4 + phase) * 8.0) / 8.0 * 0.05;
          const holoArtifact2 = Math.floor(Math.sin(j * 0.35 + phase * 1.3) * 6.0) / 6.0 * 0.03;
          const scanLineArtifact = Math.sin(j * 2.0) > 0.8 ? 0.04 : 0.0;
          
          // Large impact craters with holographic distortion
          const largeCraters = Math.max(0, (combinedNoise - 0.75) / 0.25);
          const craterRims = Math.max(0, Math.min(1, (combinedNoise - 0.72) / 0.06)) - Math.max(0, (combinedNoise - 0.78) / 0.04);
          
          // Medium craters and erosion patterns with planet-specific variations
          const mediumFeatures = Math.max(0, (combinedNoise - 0.45) / 0.55);
          const spots = Math.pow(mediumFeatures, planetType === 'dwarf' ? 0.6 : 0.8);
          const core = Math.pow(largeCraters, planetType === 'gas-giant' ? 0.8 : 1.2);
          const rims = craterRims * (planetType === 'dwarf' ? 2.0 : 1.5);
          // Realistic surface albedo and material properties
          const surfaceAlbedo = isGasGiant ? 0.9 : isNeptune ? 0.8 : isWater ? 0.4 : isEarth ? 0.7 : isDark ? 0.1 : 0.6;
          let craterShadeMax = (1.0 - surfaceAlbedo) * (isGasGiant ? 0.2 : 0.8);
          let rimBrightness = surfaceAlbedo * (isGasGiant ? 0.1 : 0.4);
          
          // Combine all surface features with holographic effects
          const shade = 1.0 - (craterShadeMax * spots + 0.25 * core) + (rimBrightness * rims) + 
                       surfacePattern * 0.3 + holoArtifact1 + holoArtifact2 + scanLineArtifact;
          
          // Apply enhanced color with holographic tinting
          const holoTint = planetType === 'gas-giant' ? 1.05 : 
                          planetType === 'neptune' ? 1.03 : 
                          planetType === 'dwarf' ? 0.95 : 1.0;
          
          const finalR = Math.floor(Math.max(0, Math.min(255, c.r * 255 * shade * holoTint)));
          const finalG = Math.floor(Math.max(0, Math.min(255, c.g * 255 * shade * holoTint)));
          const finalB = Math.floor(Math.max(0, Math.min(255, c.b * 255 * shade * holoTint)));
          
          dataColor[p] = finalR;
          dataColor[p + 1] = finalG;
          dataColor[p + 2] = finalB;
          dataColor[p + 3] = 255;
          // Enhanced height mapping with rim elevation
          const craterDepthMul = isEarth ? 0.4 : isDark ? 0.38 : isWater ? 0.15 : 0.32;
          const rimHeightBoost = isEarth ? 0.12 : isDark ? 0.05 : isWater ? 0.08 : 0.1;
          const baseHeight = (mixT * 0.6 + (n + 0.5) * 0.4);
          const depthModifier = 1.0 - (craterDepthMul * spots + 0.12 * core);
          const h = (baseHeight * depthModifier) + (rimHeightBoost * rims);
          dataHeight[idx] = Math.max(0, Math.min(1, h));
          // Enhanced roughness mapping
          let rough = 0.6 + (1.0 - h) * 0.4;
          // Element-specific roughness characteristics
          if (isWater) rough *= 0.7; // smoother surfaces
          else if (isEarth) rough += 0.2; // rougher terrain
          else if (isDark) rough += 0.15; // volcanic texture
          
          // Crater roughness with smooth rims
          rough = rough + 0.3 * spots + 0.15 * core - 0.2 * rims;
          const rr = Math.floor(Math.min(255, Math.max(0, rough * 255)));
          dataRough[p] = rr; dataRough[p + 1] = rr; dataRough[p + 2] = rr; dataRough[p + 3] = 255;
          // Advanced weather and atmospheric systems
          const atmo1 = Math.sin((i + ph) * 0.07) * Math.cos((j - ph) * 0.05) * 0.5 + 0.5;
          const atmo2 = Math.sin((i * 0.9 + ph) * 0.063) * Math.cos((j * 1.1 - ph) * 0.058) * 0.3 + 0.5;
          const atmo3 = Math.sin((i * 1.3 - j * 0.8 + ph) * 0.045) * Math.cos((j * 1.2 + i * 0.7 - ph) * 0.041) * 0.4 + 0.5;
          
          // Cyclonic storm systems
          const stormSystems = Math.sin(i * 0.12 + j * 0.14 + phase * 2) * Math.cos(i * 0.11 - j * 0.13 + phase * 1.8) > 0.7 ? 0.3 : 0;
          
          // Jet streams and wind patterns
          const jetStreams = Math.abs(lat - 0.3) < 0.1 || Math.abs(lat + 0.3) < 0.1 ? Math.sin(i * 0.31 + phase * 3) * 0.2 + 0.2 : 0;
          
          const weatherPattern = (atmo1 * 0.5 + atmo2 * 0.3 + atmo3 * 0.2) + stormSystems + jetStreams;
          
          // Element-specific atmospheric characteristics
          const atmoThreshold = isWater ? 0.78 : isEarth ? 0.85 : isDark ? 0.9 : isLightning ? 0.75 : 0.82;
          const atmoIntensity = isWater ? 6.2 : isEarth ? 4.1 : isDark ? 2.8 : isLightning ? 7.5 : 4.8;
          const ca = weatherPattern > atmoThreshold ? (weatherPattern - atmoThreshold) * atmoIntensity : 0.0;
          const ca8 = Math.floor(Math.min(1, Math.max(0, ca)) * 255);
          dataClouds[p] = 255; dataClouds[p + 1] = 255; dataClouds[p + 2] = 255; dataClouds[p + 3] = ca8;
          p += 4; idx++;
        }
      }
      const sobel = (x: number, y: number) => {
        const sx = size; const sy = size;
        const ix = (x + sx) % sx; const iy = (y + sy) % sy;
        const idx = iy * sx + ix; return dataHeight[idx];
      };
      p = 0;
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const hL = sobel(i - 1, j); const hR = sobel(i + 1, j);
          const hU = sobel(i, j - 1); const hD = sobel(i, j + 1);
          const dx = (hR - hL);
          const dy = (hD - hU);
          let nx = -dx * 2.0, ny = -dy * 2.0, nz = 1.0;
          const inv = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
          nx *= inv; ny *= inv; nz *= inv;
          dataNormal[p] = Math.floor((nx * 0.5 + 0.5) * 255);
          dataNormal[p + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
          dataNormal[p + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
          dataNormal[p + 3] = 255; p += 4;
        }
      }
      const texColor = new DataTexture(dataColor, size, size, RGBAFormat, UnsignedByteType);
      texColor.needsUpdate = true; texColor.wrapS = texColor.wrapT = RepeatWrapping;
      const texNormal = new DataTexture(dataNormal, size, size, RGBAFormat, UnsignedByteType);
      texNormal.needsUpdate = true; texNormal.wrapS = texNormal.wrapT = RepeatWrapping;
      const texRough = new DataTexture(dataRough, size, size, RGBAFormat, UnsignedByteType);
      texRough.needsUpdate = true; texRough.wrapS = texRough.wrapT = RepeatWrapping;
      const texClouds = new DataTexture(dataClouds, size, size, RGBAFormat, UnsignedByteType);
      texClouds.needsUpdate = true; texClouds.wrapS = texClouds.wrapT = RepeatWrapping;
      return { colorTex: texColor, normalTex: texNormal, roughTex: texRough, cloudsTex: texClouds };
    } catch {
      const empty = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat, UnsignedByteType);
      empty.needsUpdate = true; return { colorTex: empty, normalTex: empty, roughTex: empty, cloudsTex: empty } as any;
    }
  }, [song.id, color]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.033);
    // Time-based smoothing: hover ~150ms, normal ~600ms
    const lerpFast = 1 - Math.exp(-d / 0.15);
    const lerpSlow = 1 - Math.exp(-d / 0.6);
    const orbitLerp = isHover ? lerpFast : (isMain ? (1 - Math.exp(-d / 0.5)) : lerpSlow);
    const scaleLerp = isHover ? lerpFast : (isMain ? (1 - Math.exp(-d / 0.5)) : lerpSlow);

    // Respect computed layout + element tweaks (non-destructive) with safety checks
    const targetR = (isMain ? 0 : layoutOrbit) * radiusMul;
    const safeTargetR = isFinite(targetR) ? targetR : 0;
    orbitRadiusRef.current = lerp(orbitRadiusRef.current, safeTargetR, orbitLerp);
    const layoutScale = (layout?.scale ?? 1) * scaleMul;
    const safeLayoutScale = isFinite(layoutScale) ? layoutScale : 1;
    const scaleProduct = scaleTarget * safeLayoutScale;
    const safeScaleProduct = isFinite(scaleProduct) ? scaleProduct : 1;
    scaleRef.current = lerp(scaleRef.current, safeScaleProduct, scaleLerp);

    // Angular velocity from existing orbitSpeed
    angleRef.current += (speedTarget * speedMul) * d;

    // Elliptical orbit + wobble + tilt with comprehensive safety checks
    const a = isFinite(orbitRadiusRef.current) ? orbitRadiusRef.current : 0;
    const safeLayoutEcc = isFinite(layoutEcc) ? Math.max(0, Math.min(0.99, layoutEcc)) : 0; // Clamp eccentricity
    const b = a * (1.0 - safeLayoutEcc);
    const t = state.clock.elapsedTime;
    // damp phase target into offset (gentle)
    const phaseDamp = 1 - Math.exp(-d / 0.5);
    const safePhaseDamp = isFinite(phaseDamp) ? phaseDamp : 0;
    const phaseTarget = isFinite(phaseTargetRef.current) ? phaseTargetRef.current : 0;
    const currentPhaseOffset = isFinite(phaseOffsetRef.current) ? phaseOffsetRef.current : 0;
    phaseOffsetRef.current = currentPhaseOffset + (phaseTarget - currentPhaseOffset) * safePhaseDamp;
    const safeLayoutAngle0 = isFinite(layoutAngle0) ? layoutAngle0 : 0;
    const safeAngleRef = isFinite(angleRef.current) ? angleRef.current : 0;
    const safePhaseOffset = isFinite(phaseOffsetRef.current) ? phaseOffsetRef.current : 0;
    const theta = safeLayoutAngle0 + safeAngleRef + safePhaseOffset;
    let x = a * Math.cos(theta);
    let z = b * Math.sin(theta);
    const hoverWobble = isHover && !isMain ? 0.005 : 0.0;
    x += (0.02 + wobbleExtra + hoverWobble) * Math.sin(t * 0.9 + (idHash % 17));
    z += (0.02 + wobbleExtra + hoverWobble) * Math.sin(t * 1.1 + (idHash % 31));
    const tilt = MathUtils.degToRad(layoutTiltDeg || 0);
    const zt = z * Math.cos(tilt);
    const yt = z * Math.sin(tilt);

    if (groupRef.current) {
      // Safety check to prevent NaN values
      const safeX = isFinite(x) ? x : 0;
      const safeYt = isFinite(yt) ? yt : 0;
      const safeZt = isFinite(zt) ? zt : 0;
      const safeTilt = isFinite(tilt) ? tilt : 0;
      
      groupRef.current.position.set(safeX, safeYt, safeZt);
      groupRef.current.rotation.x = safeTilt;
    }
    // Depth readability: compute a camera-relative factor once per frame
    let depthLocal = depthFactor;
    if (groupRef.current && (state as any).camera) {
      const cam = (state as any).camera as any;
      const v = worldPosRef.current.clone();
      groupRef.current.getWorldPosition(v);
      const ndc = v.clone().project(cam);
      const tZ = Math.min(1, Math.max(0, (ndc.z + 1) / 2));
      depthLocal = 1.0 - 0.15 * tZ;
    }

    if (meshRef.current) {
      const rotSpeed = isHover ? 1.6 : (isMain ? 0.9 : 0.8);
      const safeRotSpeed = isFinite(rotSpeed) ? rotSpeed : 0.8;
      const safeDelta = isFinite(d) ? d : 0.016;
      meshRef.current.rotation.y += safeRotSpeed * safeDelta;
      // Subtle oscillating pulse on hover (+heart pulse)
      const elapsedTime = isFinite(state.clock.elapsedTime) ? state.clock.elapsedTime : 0;
      const hPulse = isHover ? 1 + 0.03 * Math.sin(elapsedTime * 6) : 1;
      const heartPulse = element === 'heart' ? (1 + 0.06 * Math.sin(elapsedTime * 2.4)) : 1.0;
      const safeHPulse = isFinite(hPulse) ? hPulse : 1.0;
      const safeHeartPulse = isFinite(heartPulse) ? heartPulse : 1.0;
      const safeScaleRef = isFinite(scaleRef.current) ? scaleRef.current : 1.0;
      const finalScale = safeScaleRef * safeHPulse * safeHeartPulse;
      const safeScale = isFinite(finalScale) && finalScale > 0 ? finalScale : 1.0;
      meshRef.current.scale.setScalar(safeScale);
      const m: any = (meshRef.current.material as any);
      const safeDepthLocal = isFinite(depthLocal) ? depthLocal : 1.0;
      if (m && typeof m.opacity === 'number') m.opacity = (isMain ? 0.62 : 0.52) * safeDepthLocal;
      (m as any).clearcoat = 0.25;
    }
    // Throttled state update to refresh HoloMaterial uniforms for depth
    if (Number.isFinite(depthLocal) && Math.abs(depthLocal - depthFactor) > 0.03) {
      setDepthFactor(depthLocal);
    }

    // Random holographic glitch effects
    if (!glitchActive && Math.random() < (isMain ? 0.0008 : 0.0003)) {
      setGlitchActive(true);
      const glitchDuration = 150 + Math.random() * 200; // 150-350ms
      
      // Clear any existing timer
      if (glitchTimerRef.current !== undefined) {
        clearTimeout(glitchTimerRef.current);
      }
      
      glitchTimerRef.current = window.setTimeout(() => {
        setGlitchActive(false);
        setGlitchOpacity(1.0);
        glitchTimerRef.current = undefined;
      }, glitchDuration);
    }

    // Animate glitch opacity
    if (glitchActive) {
      const glitchTime = elapsedTime * 50; // Fast oscillation
      const glitchPattern = Math.sin(glitchTime) * Math.cos(glitchTime * 1.7) * Math.sin(glitchTime * 0.3);
      setGlitchOpacity(0.3 + Math.abs(glitchPattern) * 0.7);
    }
    // Slow-moving cloud layer for parallax realism
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.12 * d;
    }
    if (outlineRef.current) {
      outlineRef.current.rotation.z += 0.1 * d;
      const mat: any = (outlineRef.current as any).material;
      if (mat && typeof mat.opacity === "number") {
        const depthFactor = (groupRef.current?.position?.z ?? 0) >= 0 ? 1.0 : 0.85;
        const base = isHover ? 0.6 : 0.25;
        const osc = isHover ? 0.18 * Math.sin(state.clock.elapsedTime * 6) : 0.0;
        mat.opacity = (base + osc) * depthFactor;
      }
    }

    // Animate decorative main rings (pulse scale softly)
    if (isMain) {
      const pulse = 1 + 0.04 * Math.sin(state.clock.elapsedTime * 2.6);
      const s = scaleRef.current * 1.35 * pulse;
      if (mainRingRef.current) mainRingRef.current.scale.setScalar(s);
      if (mainRingRef2.current) mainRingRef2.current.scale.setScalar(s * 1.06);
      if (sprinkleRef.current) {
        sprinkleRef.current.rotation.y += 0.08 * dt;
        const t = state.clock.elapsedTime;
        const m: any = sprinkleRef.current.material;
        if (m && typeof m.opacity === 'number') m.opacity = 0.18 + 0.06 * Math.sin(t * 1.8);
        sprinkleRef.current.scale.setScalar(scaleRef.current * 2.3);
      }
    }

    // Lightweight overlap avoidance (phase nudge)
    if (!isMain && layout) {
      const ideal = (layout.ringIndex * 0.37) % (Math.PI * 2);
      const baseTheta = layoutAngle0 + angleRef.current;
      const diff = Math.atan2(Math.sin(baseTheta - ideal), Math.cos(baseTheta - ideal));
      const tooClose = Math.abs(diff) < 0.06;
      const targetPhase = tooClose ? (diff > 0 ? phaseOffsetRef.current + 0.01 : phaseOffsetRef.current - 0.01) : 0;
      const phaseLerp = 1 - Math.exp(-d / 0.4);
      phaseOffsetRef.current += (targetPhase - phaseOffsetRef.current) * phaseLerp;
      if (phaseOffsetRef.current > Math.PI) phaseOffsetRef.current -= Math.PI * 2;
      if (phaseOffsetRef.current < -Math.PI) phaseOffsetRef.current += Math.PI * 2;
    }
  });

  const ringInner = Math.max(orbitRadiusRef.current - 0.012, 0);
  const ringOuter = orbitRadiusRef.current + 0.012;

  return (
    <group ref={groupRef}>
      {/* Titles render in HUD overlay (top-left), not above planets */}
      {/* Planet-type specific ring systems */}
      {isMain && planetType === 'gas-giant' && (
        <>
          {/* Enhanced multiple ring systems for gas giants with realistic gaps and density variations */}
          <mesh ref={mainRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.8, 256]} />
            <meshStandardMaterial
              color={ringColor}
              transparent
              opacity={0.75}
              roughness={0.8}
              metalness={0.02}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          {/* Cassini Division gap simulation */}
          <mesh ref={mainRingRef2} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.1, 2.5, 256]} />
            <meshStandardMaterial
              color={new Color(ringColor).lerp(new Color('#FFFFFF'), 0.2)}
              transparent
              opacity={0.5}
              roughness={0.9}
              metalness={0.01}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          {/* Outer E ring simulation */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.7, 3.1, 256]} />
            <meshStandardMaterial
              color={new Color(ringColor).lerp(new Color('#FFFFFF'), 0.4)}
              transparent
              opacity={0.3}
              roughness={0.95}
              metalness={0.005}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          {/* Faint shepherd moon effect ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.2, 3.35, 128]} />
            <meshBasicMaterial
              color={new Color(ringColor).lerp(new Color('#FFFFFF'), 0.6)}
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </>
      )}
      
      {isMain && planetType === 'neptune' && (
        <>
          {/* Faint ice rings for neptune-type planets */}
          <mesh ref={mainRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.1, 1.25, 128]} />
            <meshBasicMaterial
              color="#AACCFF"
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </>
      )}
      
      {isMain && (planetType === 'terrestrial' || planetType === 'dwarf') && (
        <>
          {/* Subtle rings for rocky planets */}
          <mesh ref={mainRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.12, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.25}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </>
      )}
      {/* Show orbit outline only when hovering non-main to reduce clutter */}
      {!isMain && isHover && orbitRadiusRef.current > 0.05 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} ref={outlineRef}>
            <ringGeometry args={[ringInner, ringOuter, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.6}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          {/* soft spread ring for higher quality glow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(ringInner - 0.03, 0), ringOuter + 0.08, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </>
      )}

      {/* Outer glow shell removed per request (no aura around planets) */}

      {/* Core planet body with enhanced high-detail geometry and realistic shapes */}
      <mesh ref={meshRef}>
        {(() => {
          // Create more diverse and realistic planet shapes based on type and characteristics
          const safeIdHash = isFinite(idHash) ? Math.abs(idHash) : 12345;
          const shapeVariant = safeIdHash % 4;
          // Realistic flattening due to rotation (computed if needed)
          
          if (planetType === 'gas-giant') {
            // Gas giants are oblate due to rapid rotation
            // Jupiter-like flattening
            return <sphereGeometry args={[1, 64, 64]} />;
          } else if (planetType === 'neptune') {
            // Ice giants, slightly less oblate than gas giants
            // Slight oblateness
            return <sphereGeometry args={[1, 72, 72]} />;
          } else if (planetType === 'dwarf') {
            // Dwarf planets have more irregular shapes
            switch (shapeVariant) {
              case 0: return <dodecahedronGeometry args={[1, 4]} />; // Rocky, angular
              case 1: return <icosahedronGeometry args={[1, 4]} />; // More rounded
              case 2: return <octahedronGeometry args={[1, 5]} />; // Crystalline structure
              default: 
                // Potato-shaped (highly irregular)
                return <sphereGeometry args={[1, 16, 12]} />; // Low-poly for irregularity
            }
          } else {
            // Terrestrial planets - mostly spherical but with geological variation
            switch (shapeVariant) {
              case 0: return <sphereGeometry args={[1, 96, 96]} />; // High detail sphere
              case 1: return <sphereGeometry args={[1, 88, 88]} />; // Slightly less detail
              case 2: return <icosahedronGeometry args={[1, 6]} />; // Geodesic appearance
              default: return <sphereGeometry args={[1, 80, 80]} />; // Standard sphere
            }
          }
        })()}
        <HoloMaterial
          baseColor={baseColor}
          glowColor={innerColor}
          scanIntensity={
            planetType === 'gas-giant' ? (isMain ? 0.9 : (isHover ? 0.85 : 0.75)) :
            planetType === 'neptune' ? (isMain ? 0.8 : (isHover ? 0.75 : 0.65)) :
            planetType === 'dwarf' ? (isMain ? 0.65 : (isHover ? 0.6 : 0.5)) :
            element === 'lightning' ? (isMain ? 1.0 : (isHover ? 0.95 : 0.85)) :
            element === 'fire' ? (isMain ? 0.85 : (isHover ? 0.8 : 0.7)) :
            element === 'water' ? (isMain ? 0.75 : (isHover ? 0.7 : 0.6)) :
            element === 'magic' ? (isMain ? 1.05 : (isHover ? 1.0 : 0.9)) :
            isMain ? 0.8 : (isHover ? 0.75 : 0.65)
          }
          fresnelPower={
            (isMain ? 2.2 : 2.6) * 
            (planetType === 'gas-giant' ? 0.8 : 
             planetType === 'neptune' ? 0.85 : 
             planetType === 'dwarf' ? 1.2 : 
             element === 'darkness' ? 1.15 : 
             element === 'lightning' ? 0.95 : 
             element === 'water' ? 0.85 : 1.0)
          }
          brighten={
            (isMain ? 1.6 : (isHover ? 1.7 : 1.5)) * 
            (planetType === 'gas-giant' ? 1.2 : 
             planetType === 'neptune' ? 1.15 : 
             planetType === 'dwarf' ? 0.95 : 
             element === 'fire' ? 1.25 : 
             element === 'lightning' ? 1.2 : 
             element === 'magic' ? 1.3 : 
             element === 'water' ? 1.0 : 1.05)
          }
          alpha={
            (isMain ? 0.55 : (isHover ? 0.6 : 0.45)) * 
            (planetType === 'gas-giant' ? 1.3 : 
             planetType === 'neptune' ? 1.2 : 
             planetType === 'dwarf' ? 0.9 : 
             element === 'darkness' ? 1.0 : 
             element === 'water' ? 1.25 : 
             element === 'lightning' ? 1.3 : 
             element === 'magic' ? 1.4 : 1.1) *
            (glitchActive ? glitchOpacity : 1.0)
          }
          depthFactor={depthFactor}
        />
        
        {/* Enhanced holographic wireframe overlay with size-based complexity */}
        <mesh scale={1.001}>
          <sphereGeometry args={[1, 
            planetType === 'gas-giant' ? 48 : 
            planetType === 'neptune' ? 40 : 
            planetType === 'terrestrial' ? 32 : 24, 
            planetType === 'gas-giant' ? 24 : 
            planetType === 'neptune' ? 20 : 
            planetType === 'terrestrial' ? 16 : 12]} />
          <meshBasicMaterial 
            color={new Color(color).lerp(new Color('#FFFFFF'), 0.6)}
            transparent
            opacity={planetType === 'gas-giant' ? 0.18 : 
                     planetType === 'neptune' ? 0.15 : 0.12}
            wireframe
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        
        {/* Holographic scanlines effect with planet-specific intensity */}
        <mesh scale={1.002}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            color={new Color(color).lerp(new Color('#FFFFFF'), 0.8)}
            transparent
            opacity={planetType === 'gas-giant' ? 0.12 : 
                     planetType === 'neptune' ? 0.10 : 
                     planetType === 'terrestrial' ? 0.08 : 0.06}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        
        {/* Size-based holographic detail layers for massive planets */}
        {planetType === 'gas-giant' && (
          <>
            <mesh scale={1.003}>
              <sphereGeometry args={[1, 80, 80]} />
              <meshBasicMaterial
                color={new Color(color).lerp(new Color('#FFFF00'), 0.4)}
                transparent
                opacity={0.06}
                depthWrite={false}
                blending={AdditiveBlending}
              />
            </mesh>
            <mesh scale={1.004}>
              <sphereGeometry args={[1, 96, 96]} />
              <meshBasicMaterial
                color={new Color(color).lerp(new Color('#00FFFF'), 0.5)}
                transparent
                opacity={0.04}
                depthWrite={false}
                blending={AdditiveBlending}
              />
            </mesh>
          </>
        )}
        
        {planetType === 'neptune' && (
          <mesh scale={1.003}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#AACCFF'), 0.6)}
              transparent
              opacity={0.05}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        )}
      </mesh>

      {/* Holographic interference patterns */}
      <mesh scale={1.005}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={new Color(color).lerp(new Color('#00FFFF'), 0.7)}
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={AdditiveBlending}
          side={2}
        />
      </mesh>
      
      {/* Digital glitch effect layer */}
      <mesh scale={1.008}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={element === 'lightning' ? new Color('#FF00FF') : 
                 element === 'magic' ? new Color('#00FFFF') : 
                 new Color(color).lerp(new Color('#FFFFFF'), 0.9)}
          transparent
          opacity={glitchActive ? 0.15 * glitchOpacity : 0.04}
          depthWrite={false}
          blending={AdditiveBlending}
          side={2}
        />
      </mesh>

      {/* Glitch overlay - only visible during glitch */}
      {glitchActive && (
        <>
          <mesh scale={1.012}>
            <sphereGeometry args={[1, 12, 6]} />
            <meshBasicMaterial
              color={new Color('#FF0000')}
              transparent
              opacity={0.2 * glitchOpacity}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.015}>
            <sphereGeometry args={[1, 8, 4]} />
            <meshBasicMaterial
              color={new Color('#00FF00')}
              transparent
              opacity={0.15 * glitchOpacity}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.018}>
            <sphereGeometry args={[1, 6, 3]} />
            <meshBasicMaterial
              color={new Color('#0000FF')}
              transparent
              opacity={0.1 * glitchOpacity}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </>
      )}

      {/* Holographic atmospheric glow layers - much more transparent */}
      <mesh scale={1.045}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color={
            planetType === 'gas-giant' ? new Color(color).lerp(new Color('#FFFFFF'), 0.8) :
            planetType === 'neptune' ? new Color('#87CEEB').lerp(new Color('#FFFFFF'), 0.6) :
            element === 'water' ? new Color('#B0E0E6').lerp(new Color('#E6F7FF'), 0.7) :
            element === 'fire' ? new Color('#FFB347').lerp(new Color('#FF6B35'), 0.6) :
            element === 'lightning' ? new Color('#E0E6FF').lerp(new Color('#CCFFFF'), 0.8) :
            element === 'magic' ? new Color('#8FBC8F').lerp(new Color('#DDA0DD'), 0.7) :
            element === 'darkness' ? new Color('#2F2F4F').lerp(new Color('#000000'), 0.5) :
            new Color(color).lerp(new Color('#FFFFFF'), 0.7)
          }
          transparent
          opacity={
            planetType === 'gas-giant' ? 0.08 :
            planetType === 'neptune' ? 0.06 :
            element === 'water' ? 0.05 :
            element === 'fire' ? 0.07 :
            element === 'lightning' ? 0.09 :
            element === 'magic' ? 0.06 :
            0.04
          }
          side={2} // BackSide for rim effect
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Secondary holographic glow layer */}
      <mesh scale={1.075}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={
            planetType === 'gas-giant' ? new Color(color).lerp(new Color('#FFFFFF'), 0.9) :
            planetType === 'neptune' ? new Color('#CCDDFF') :
            element === 'water' ? new Color('#E6F7FF') :
            element === 'fire' ? new Color('#FFDDAA') :
            element === 'lightning' ? new Color('#F0F8FF') :
            element === 'magic' ? new Color('#E6E6FA') :
            element === 'darkness' ? new Color('#1A1A2E') :
            new Color(color).lerp(new Color('#FFFFFF'), 0.85)
          }
          transparent
          opacity={
            planetType === 'gas-giant' ? 0.04 :
            planetType === 'neptune' ? 0.03 :
            element === 'water' ? 0.025 :
            element === 'fire' ? 0.035 :
            element === 'lightning' ? 0.045 :
            element === 'magic' ? 0.03 :
            0.02
          }
          side={2}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Enhanced hologram overlay shell with element-specific holographic effects */}
      <mesh scale={0.998}>
        <sphereGeometry args={[1, 64, 64]} />
        <HoloMaterial
          baseColor={baseColor}
          glowColor={innerColor}
          scanIntensity={
            planetType === 'gas-giant' ? (isMain ? 0.8 : (isHover ? 0.75 : 0.65)) :
            planetType === 'neptune' ? (isMain ? 0.7 : (isHover ? 0.68 : 0.6)) :
            planetType === 'dwarf' ? (isMain ? 0.6 : (isHover ? 0.58 : 0.5)) :
            element === 'lightning' ? (isMain ? 0.9 : (isHover ? 0.85 : 0.75)) :
            element === 'fire' ? (isMain ? 0.75 : (isHover ? 0.7 : 0.6)) :
            element === 'water' ? (isMain ? 0.65 : (isHover ? 0.6 : 0.5)) :
            element === 'magic' ? (isMain ? 0.95 : (isHover ? 0.9 : 0.8)) :
            isMain ? 0.7 : (isHover ? 0.65 : 0.55)
          }
          fresnelPower={
            (isMain ? 2.8 : 2.4) * 
            (planetType === 'gas-giant' ? 0.9 : 
             planetType === 'neptune' ? 0.95 : 
             planetType === 'dwarf' ? 1.15 : 
             element === 'darkness' ? 1.12 : 
             element === 'lightning' ? 1.05 : 
             element === 'water' ? 0.95 : 1.0)
          }
          brighten={
            (isMain ? 1.45 : (isHover ? 1.55 : 1.45)) * 
            (planetType === 'gas-giant' ? 1.15 : 
             planetType === 'neptune' ? 1.1 : 
             planetType === 'dwarf' ? 0.9 : 
             element === 'fire' ? 1.15 : 
             element === 'lightning' ? 1.12 : 
             element === 'magic' ? 1.2 : 
             element === 'water' ? 0.95 : 1.0)
          }
          alpha={
            (isMain ? 0.35 : (isHover ? 0.38 : 0.28)) * 
            (planetType === 'gas-giant' ? 1.4 : 
             planetType === 'neptune' ? 1.25 : 
             planetType === 'dwarf' ? 1.0 : 
             element === 'darkness' ? 1.1 : 
             element === 'water' ? 1.3 : 
             element === 'lightning' ? 1.35 : 
             element === 'magic' ? 1.5 : 1.2)
          }
          depthFactor={depthFactor}
        />
      </mesh>

      {/* Faint particle sprinkle around main planet */}
      {isMain ? (
        <points ref={sprinkleRef}>
          <bufferGeometry>
            {(() => { const pos = sprinklePositions(song.id); return (
              // @ts-ignore
              <bufferAttribute attach="attributes-position" array={pos} count={pos.length/3} itemSize={3} />
            ); })()}
          </bufferGeometry>
          <pointsMaterial size={0.02} color={ringColor} transparent opacity={0.22} depthWrite={false} sizeAttenuation blending={AdditiveBlending} />
        </points>
      ) : null}

      {/* Holographic atmospheric data overlay - very subtle */}
      <mesh ref={cloudsRef} scale={
        planetType === 'gas-giant' ? (1.025 + sizeVar * 0.015) : 
        planetType === 'neptune' ? (1.015 + sizeVar * 0.01) : 
        planetType === 'dwarf' ? (1.002 + sizeVar * 0.002) : 
        element === 'water' ? (1.012 + sizeVar * 0.008) : 
        element === 'magic' ? (1.008 + sizeVar * 0.012) : 
        element === 'fire' ? (1.018 + sizeVar * 0.01) : 
        element === 'lightning' ? (1.01 + sizeVar * 0.008) : 
        element === 'darkness' ? (1.005 + sizeVar * 0.003) : 
        1.006 + sizeVar * 0.005
      }>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial 
          color={
            planetType === 'gas-giant' ? new Color(color).lerp(new Color('#FFFFFF'), 0.8) : 
            planetType === 'neptune' ? new Color("#CCDDFF").lerp(new Color(color), 0.5) : 
            planetType === 'dwarf' ? new Color(color).lerp(new Color('#888888'), 0.8) : 
            element === 'water' ? new Color("#E6F7FF") : 
            element === 'fire' ? new Color("#FFE6CC") : 
            element === 'lightning' ? new Color("#F0F8FF") : 
            element === 'magic' ? new Color(color).lerp(new Color('#DDA0DD'), 0.7) :
            element === 'darkness' ? new Color("#1A1A2E") : 
            new Color('white').lerp(new Color(color), 0.6)
          } 
          transparent 
          opacity={
            planetType === 'gas-giant' ? 0.06 : 
            planetType === 'neptune' ? 0.05 : 
            planetType === 'dwarf' ? 0.015 : 
            element === 'water' ? 0.04 : 
            element === 'magic' ? 0.03 : 
            element === 'fire' ? 0.05 : 
            element === 'lightning' ? 0.045 : 
            element === 'darkness' ? 0.025 : 
            0.025
          } 
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      
      {/* Minimal holographic atmospheric effects */}
      {planetType === 'gas-giant' && (
        <>
          {/* Holographic gas bands */}
          <mesh scale={1.02}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshBasicMaterial 
              color={new Color(color).lerp(new Color('#FFFFFF'), 0.8)} 
              transparent 
              opacity={0.03} 
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </>
      )}
      
      {planetType === 'neptune' && (
        <>
          {/* Holographic ice crystal lattice */}
          <mesh scale={1.015}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshBasicMaterial 
              color={"#AACCFF"} 
              transparent 
              opacity={0.025} 
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </>
      )}
      
      {element === 'lightning' && (
        <>
          {/* Holographic electromagnetic field lines */}
          <mesh scale={1.018}>
            <sphereGeometry args={[1, 20, 10]} />
            <meshBasicMaterial 
              color={"#00FFFF"} 
              transparent 
              opacity={0.035} 
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </>
      )}
      
      {element === 'water' && planetType === 'terrestrial' && (
        <>
          {/* Holographic fluid flow patterns */}
          <mesh scale={1.01}>
            <sphereGeometry args={[1, 28, 14]} />
            <meshBasicMaterial 
              color={"#E6F7FF"} 
              transparent 
              opacity={0.025} 
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </>
      )}
      
      {element === 'darkness' && (
        <>
          {/* Holographic void distortion */}
          <mesh scale={1.012}>
            <sphereGeometry args={[1, 16, 8]} />
            <meshBasicMaterial 
              color={"#1A1A2E"} 
              transparent 
              opacity={0.02} 
              depthWrite={false}
              wireframe
            />
          </mesh>
        </>
      )}
      
      {/* Planet-type specific holographic components */}
      {isMain && planetType === 'gas-giant' && (
        <group>
          {/* Massive gas giant data streams with interactive pulsing */}
          <mesh rotation={[Math.PI / 4, 0, 0]} scale={1.8}>
            <ringGeometry args={[1.3, 1.4, 128]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FFD700'), 0.6)}
              transparent
              opacity={isHover ? 0.55 : 0.35}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 3, Math.PI / 2, 0]} scale={2.2}>
            <ringGeometry args={[1.5, 1.6, 128]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#00FFFF'), 0.7)}
              transparent
              opacity={isHover ? 0.4 : 0.25}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          <mesh rotation={[Math.PI / 6, -Math.PI / 4, Math.PI / 8]} scale={2.6}>
            <ringGeometry args={[1.7, 1.8, 128]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FFFFFF'), 0.8)}
              transparent
              opacity={isHover ? 0.25 : 0.15}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          {/* Atmospheric turbulence effects */}
          <mesh scale={1.1}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FFA500'), 0.5)}
              transparent
              opacity={0.08}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          
          {/* Animated atmospheric storm particles */}
          <points>
            <bufferGeometry>
              {(() => { 
                const stormParticles = generateStormParticles(song.id, 'gas-giant'); 
                return (
                  // @ts-ignore
                  <bufferAttribute attach="attributes-position" array={stormParticles} count={stormParticles.length/3} itemSize={3} />
                ); 
              })()}
            </bufferGeometry>
            <pointsMaterial 
              size={0.015} 
              color={new Color(color).lerp(new Color('#FFD700'), 0.4)} 
              transparent 
              opacity={0.6}
              depthWrite={false} 
              sizeAttenuation 
              blending={AdditiveBlending} 
            />
          </points>
          
          {/* Secondary storm layer with different motion */}
          <points>
            <bufferGeometry>
              {(() => { 
                const stormParticles2 = generateStormParticles(song.id + '_2', 'gas-giant'); 
                return (
                  // @ts-ignore
                  <bufferAttribute attach="attributes-position" array={stormParticles2} count={stormParticles2.length/3} itemSize={3} />
                ); 
              })()}
            </bufferGeometry>
            <pointsMaterial 
              size={0.008} 
              color={new Color(color).lerp(new Color('#00FFFF'), 0.6)} 
              transparent 
              opacity={0.4}
              depthWrite={false} 
              sizeAttenuation 
              blending={AdditiveBlending} 
            />
          </points>
        </group>
      )}

      {isMain && planetType === 'neptune' && (
        <group>
          {/* Ice giant crystalline structures with interactive feedback */}
          <mesh rotation={[Math.PI / 3, 0, 0]} scale={1.4}>
            <ringGeometry args={[1.1, 1.2, 96]} />
            <meshBasicMaterial
              color={'#AACCFF'}
              transparent
              opacity={isHover ? 0.45 : 0.3}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 4, Math.PI / 3, 0]} scale={1.7}>
            <ringGeometry args={[1.25, 1.35, 96]} />
            <meshBasicMaterial
              color={'#CCDDFF'}
              transparent
              opacity={isHover ? 0.3 : 0.2}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          {/* Ice crystal formations with interactive intensity */}
          <mesh scale={1.05}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial
              color={'#E6F3FF'}
              transparent
              opacity={isHover ? 0.18 : 0.12}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {isMain && planetType === 'terrestrial' && (
        <group>
          {/* Earth-like technological data streams with interactive feedback */}
          <mesh rotation={[Math.PI / 4, 0, 0]} scale={1.2}>
            <ringGeometry args={[1.1, 1.15, 64]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#00FFFF'), 0.5)}
              transparent
              opacity={isHover ? 0.4 : 0.25}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 6, Math.PI / 3, 0]} scale={1.4}>
            <ringGeometry args={[1.2, 1.25, 64]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FFFFFF'), 0.7)}
              transparent
              opacity={isHover ? 0.25 : 0.15}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          {/* Continental outlines with interactive intensity */}
          <mesh scale={1.02}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#00FF00'), 0.3)}
              transparent
              opacity={isHover ? 0.15 : 0.1}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {isMain && planetType === 'dwarf' && (
        <group>
          {/* Compact asteroid-like formations with interactive feedback */}
          <mesh rotation={[Math.PI / 5, 0, 0]} scale={0.9}>
            <ringGeometry args={[0.95, 1.0, 48]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FF6B35'), 0.4)}
              transparent
              opacity={isHover ? 0.45 : 0.3}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 7, Math.PI / 4, 0]} scale={1.1}>
            <ringGeometry args={[1.05, 1.1, 48]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#FFFFFF'), 0.6)}
              transparent
              opacity={isHover ? 0.3 : 0.2}
              depthWrite={false}
              blending={AdditiveBlending}
              side={2}
            />
          </mesh>
          {/* Irregular rocky structure with interactive intensity */}
          <mesh scale={1.01}>
            <dodecahedronGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={new Color(color).lerp(new Color('#8B4513'), 0.4)}
              transparent
              opacity={isHover ? 0.22 : 0.15}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {/* Element-specific holographic effects for main planets */}
      {isMain && element === 'lightning' && (
        <group>
          {/* Electrical discharge patterns */}
          <mesh scale={1.3}>
            <sphereGeometry args={[1, 16, 8]} />
            <meshBasicMaterial
              color={'#9400D3'}
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.5}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshBasicMaterial
              color={'#00FFFF'}
              transparent
              opacity={0.1}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {isMain && element === 'fire' && (
        <group>
          {/* Volcanic energy streams with interactive intensity */}
          <mesh scale={1.25}>
            <sphereGeometry args={[1, 20, 10]} />
            <meshBasicMaterial
              color={'#FF4500'}
              transparent
              opacity={isHover ? 0.28 : 0.18}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.4}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={'#FFB347'}
              transparent
              opacity={isHover ? 0.18 : 0.12}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          
          {/* Animated volcanic eruption particles */}
          <points>
            <bufferGeometry>
              {(() => { 
                const volcanicParticles = generateVolcanicParticles(song.id); 
                return (
                  // @ts-ignore
                  <bufferAttribute attach="attributes-position" array={volcanicParticles} count={volcanicParticles.length/3} itemSize={3} />
                ); 
              })()}
            </bufferGeometry>
            <pointsMaterial 
              size={0.012} 
              color={'#FF4500'} 
              transparent 
              opacity={0.8}
              depthWrite={false} 
              sizeAttenuation 
              blending={AdditiveBlending} 
            />
          </points>
          
          {/* Lava flow particles */}
          <points>
            <bufferGeometry>
              {(() => { 
                const lavaParticles = generateVolcanicParticles(song.id + '_lava'); 
                return (
                  // @ts-ignore
                  <bufferAttribute attach="attributes-position" array={lavaParticles} count={lavaParticles.length/3} itemSize={3} />
                ); 
              })()}
            </bufferGeometry>
            <pointsMaterial 
              size={0.008} 
              color={'#FFB347'} 
              transparent 
              opacity={0.6}
              depthWrite={false} 
              sizeAttenuation 
              blending={AdditiveBlending} 
            />
          </points>
          
          {/* Sparks and ember effects */}
          <points>
            <bufferGeometry>
              {(() => { 
                const emberParticles = generateVolcanicParticles(song.id + '_ember'); 
                return (
                  // @ts-ignore
                  <bufferAttribute attach="attributes-position" array={emberParticles} count={emberParticles.length/3} itemSize={3} />
                ); 
              })()}
            </bufferGeometry>
            <pointsMaterial 
              size={0.004} 
              color={'#FFFF00'} 
              transparent 
              opacity={0.9}
              depthWrite={false} 
              sizeAttenuation 
              blending={AdditiveBlending} 
            />
          </points>
        </group>
      )}

      {isMain && element === 'water' && (
        <group>
          {/* Fluid dynamics visualization */}
          <mesh scale={1.15}>
            <sphereGeometry args={[1, 32, 16]} />
            <meshBasicMaterial
              color={'#00CED1'}
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.35}>
            <sphereGeometry args={[1, 48, 24]} />
            <meshBasicMaterial
              color={'#87CEEB'}
              transparent
              opacity={0.08}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {isMain && element === 'magic' && (
        <group>
          {/* Mystical energy patterns */}
          <mesh scale={1.4}>
            <octahedronGeometry args={[1, 2]} />
            <meshBasicMaterial
              color={'#DDA0DD'}
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
          <mesh scale={1.6}>
            <tetrahedronGeometry args={[1, 2]} />
            <meshBasicMaterial
              color={'#E6E6FA'}
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={AdditiveBlending}
              wireframe
            />
          </mesh>
        </group>
      )}

      {isMain && element === 'darkness' && (
        <group>
          {/* Shadow void effects */}
          <mesh scale={1.2}>
            <sphereGeometry args={[1, 12, 6]} />
            <meshBasicMaterial
              color={'#8B0000'}
              transparent
              opacity={0.25}
              depthWrite={false}
              wireframe
            />
          </mesh>
          <mesh scale={1.45}>
            <sphereGeometry args={[1, 18, 9]} />
            <meshBasicMaterial
              color={'#2F2F4F'}
              transparent
              opacity={0.15}
              depthWrite={false}
              wireframe
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Generate deterministic sprinkle field per song id
function sprinklePositions(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) | 0;
  function rnd() { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }
  const count = 600;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const favorRing = rnd() < 0.7; // 70% favor equatorial band
    let x, y, z;
    if (favorRing) {
      // equatorial ring: around y≈0 with slight thickness
      const theta = 2 * Math.PI * rnd();
      const r = 1.6 + (rnd() - 0.5) * 0.2; // ring radius with jitter
      x = r * Math.cos(theta);
      z = r * Math.sin(theta);
      // small vertical thickness, gaussian-ish
      const ny = (rnd() + rnd() + rnd() + rnd()) / 4; // ~N(0.5, small)
      y = (ny - 0.5) * 0.28; // thin band
    } else {
      // random point on spherical shell radius ~1.2..1.6
      const u = rnd();
      const v = rnd();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.2 + rnd() * 0.6;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.cos(phi) * 0.6; // squash vertically a bit
      z = r * Math.sin(phi) * Math.sin(theta);
    }
    arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
  }
  return arr;
}

// Generate atmospheric storm particles for gas giants
function generateStormParticles(seedStr: string, planetType: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) | 0;
  function rnd() { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }
  
  const count = planetType === 'gas-giant' ? 800 : 400;
  const arr = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    // Create swirling storm bands at different latitudes
    const lat = (rnd() - 0.5) * Math.PI; // -π/2 to π/2
    const lon = rnd() * 2 * Math.PI; // 0 to 2π
    const r = 1.02 + rnd() * 0.15; // Particles close to surface with some altitude variation
    
    // Add storm band concentrations
    const bandStrength = Math.abs(Math.sin(lat * 3.0)) * 0.8 + 0.2;
    if (rnd() > bandStrength) continue; // Skip particles not in storm bands
    
    // Convert spherical to cartesian with atmospheric swirl
    const x = r * Math.cos(lat) * Math.cos(lon + Math.sin(lat * 2.0) * 0.3);
    const y = r * Math.sin(lat) + (rnd() - 0.5) * 0.05; // Small vertical jitter
    const z = r * Math.cos(lat) * Math.sin(lon + Math.sin(lat * 2.0) * 0.3);
    
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  return arr;
}

// Generate volcanic particle effects for fire planets
function generateVolcanicParticles(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) | 0;
  function rnd() { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }
  
  const count = 400;
  const arr = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    if (seedStr.includes('_ember')) {
      // Sparse, high-altitude sparks
      const theta = rnd() * 2 * Math.PI;
      const phi = Math.acos(2 * rnd() - 1);
      const r = 1.15 + rnd() * 0.4; // Higher altitude
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    } else if (seedStr.includes('_lava')) {
      // Dense, surface-hugging lava flows
      const theta = rnd() * 2 * Math.PI;
      const phi = Math.acos(2 * rnd() - 1);
      const r = 1.01 + rnd() * 0.05; // Close to surface
      
      // Concentrate in equatorial and mid-latitude bands (volcanic zones)
      const latBias = Math.abs(Math.cos(phi)) > 0.3 ? 1.0 : 0.3;
      if (rnd() > latBias) continue;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    } else {
      // Primary volcanic eruptions - medium altitude, localized hotspots
      const hotspots = 6 + Math.floor(rnd() * 4); // 6-9 volcanic hotspots
      const hotspotIndex = Math.floor(rnd() * hotspots);
      const baseTheta = (hotspotIndex / hotspots) * 2 * Math.PI;
      const basePhi = Math.PI * 0.5 + (rnd() - 0.5) * Math.PI * 0.8; // Favor equatorial regions
      
      // Add jitter around hotspot location
      const theta = baseTheta + (rnd() - 0.5) * 0.6;
      const phi = basePhi + (rnd() - 0.5) * 0.4;
      const r = 1.03 + rnd() * 0.25; // Variable eruption height
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
  }
  return arr;
}
