"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playerStore } from "@/store/usePlayerStore";
import { computePlanetLayout } from "@/lib/planetLayout";
import { buildPlanetSongs } from "@/lib/planets";
import type { PlanetType, WeatherSystem, PlanetGeometry } from "@/lib/planets";
import PlanetMinimap from "@/components/holo/PlanetMinimap";

type Sat = {
  id: string;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  r: number;
  speed: number;
  a: number;
  baseRadius: number;
  atmosphereMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  moons: THREE.Mesh[];
  planetType: PlanetType;
  cloudLayers: THREE.Mesh[];
  stormSystems: {
    mesh: THREE.Mesh;
    type: string;
    intensity: number;
    duration: number;
    age: number;
    active: boolean;
  }[];
  weatherData?: WeatherSystem;
};

export default function PlanetSystemRaw({ showAll = false, hideUntilPlaying = false, onSongChange }: { showAll?: boolean; hideUntilPlaying?: boolean; onSongChange?: (id: string) => void }) {
  // Mark 3D system as active so global key handlers can avoid interfering
  React.useEffect(() => {
    try { (window as any).__CHX_3D_ACTIVE = true; } catch {}
    return () => { try { (window as any).__CHX_3D_ACTIVE = false; } catch {} };
  }, []);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const satsRef = useRef<Sat[]>([]);
  const mainRef = useRef<{ id: string | null; mesh: THREE.Mesh | null; ring: THREE.Mesh | null }>({ id: null, mesh: null, ring: null });
  const ringsRef = useRef<THREE.Group[]>([]);
  const sweepUniforms = useRef<{ uTime: { value: number } } | null>(null);
  // Focus logic: rotate system to bring selected planet to front-center
  const focusTargetRy = useRef<number | null>(null);
  const spinSpeedRef = useRef<number>(0.0025);
  // Central planet system: selected planet becomes stationary at center
  const centralPlanetRef = useRef<{ id: string | null; mesh: THREE.Mesh | null; originalSat: Sat | null }>({ id: null, mesh: null, originalSat: null });
  // Camera animation for smooth focus transitions
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 150, 400.0));
  const targetCameraLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const cameraTransitionSpeed = useRef<number>(0.08);
  // Track when user is actively manipulating the camera to avoid snapping back
  const isUserCameraDragging = useRef<boolean>(false);
  
  // Particle system for gravitational connections
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const connectionLinesRef = useRef<THREE.LineSegments[]>([]);
  const particleUniforms = useRef<{ uTime: { value: number }; uCentralPos: { value: THREE.Vector3 }; uCentralColor: { value: THREE.Color } } | null>(null);

  // Safety: ensure songs are initialized if not already populated
  React.useEffect(() => {
    try {
      if (!playerStore.getState().songs || playerStore.getState().songs.length === 0) {
        const { holoSongs } = buildPlanetSongs();
        playerStore.getState().initSongs(holoSongs as any);
      }
    } catch {}
  }, []);

  // Create special material for Collide planet - half color, half black and white
  function createCollidePlanetMaterial(seed: number) {
    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uColorSide: { value: new THREE.Color('#FC54AF') }, // Heart pink
      uMonoSide: { value: new THREE.Color('#FFFFFF') },  // White for B&W side
      uDarkSide: { value: new THREE.Color('#000000') },  // Black for B&W side
    };

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uColorSide;
      uniform vec3 uMonoSide;
      uniform vec3 uDarkSide;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      // Noise function for surface detail
      float hash(float n) {
        return fract(sin(n) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i.x + i.y * 57.0), hash(i.x + 1.0 + i.y * 57.0), u.x),
                   mix(hash(i.x + (i.y + 1.0) * 57.0), hash(i.x + 1.0 + (i.y + 1.0) * 57.0), u.x), u.y);
      }
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        
        // Split the planet along the X-axis (longitude)
        // Left side (negative X) = color, Right side (positive X) = black & white
        float splitLine = vWorldPosition.x;
        float transitionWidth = 0.3;
        float splitFactor = smoothstep(-transitionWidth, transitionWidth, splitLine);
        
        // Lighting calculation
        vec3 lightDir = normalize(vec3(2.0, 3.0, 5.0));
        float NdotL = max(dot(normal, lightDir), 0.1);
        
        // Surface detail
        vec2 surfaceUv = vUv * 8.0 + uTime * 0.05;
        float surfaceNoise = noise(surfaceUv) * 0.3;
        float crackedPattern = noise(vUv * 12.0) * 0.4;
        
        // Color side (left) - vibrant lightning colors
        vec3 colorSurface = uColorSide * (0.8 + surfaceNoise);
        colorSurface = mix(colorSurface, uColorSide * 1.5, crackedPattern * NdotL);
        
        // Black & white side (right) - monochrome with contrast
        float monoIntensity = 0.7 + surfaceNoise * 0.6 + crackedPattern * 0.4;
        vec3 monoSurface = mix(uDarkSide, uMonoSide, monoIntensity * NdotL);
        
        // Mix between color and monochrome based on position
        vec3 finalColor = mix(colorSurface, monoSurface, splitFactor);
        
        // Add some rim lighting for 3D effect
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.0);
        vec3 rimColor = mix(uColorSide, uMonoSide, splitFactor) * 0.5;
        finalColor += rimColor * fresnel;
        
        // Apply lighting
        finalColor *= (0.4 + 0.6 * NdotL);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: false,
      depthWrite: true
    });
  }

  // Create ultra-realistic planet material based on planet type and properties
  function makePlanetMaterial(planetData: any) {
    // Check if this is the Collide planet (heart element with collide in the ID)
    const isCollidePlanet = planetData.element === 'heart' && planetData.songId && planetData.songId.toLowerCase().includes('collide');
    
    // Use proper heart color
    const color = new THREE.Color((planetData.element === 'heart') ? '#FC54AF' : (planetData.color || '#38B6FF'));
    const surface = planetData.surface || {};
    const type = planetData.type || 'terrestrial';
    const geometry = planetData.geometry || {};
    // Stable per-planet seed to avoid unintended color/texture shifts over time
    const seed = typeof planetData.seed === 'number' ? planetData.seed : Math.random() * 1000;
    
    // Special material for Collide planet
    if (isCollidePlanet) {
      return createCollidePlanetMaterial(seed);
    }
    
    // Enhanced planet-specific properties for more realism
    const planetTypeData = getPlanetTypeData(type);
    const enhancedSurface = { ...planetTypeData.surface, ...surface };
    
    // High-quality geometry settings
    // Prepare dramatic motif flags/colors from planetData.motifs
    const motifs: Array<{ name: string; color?: string; intensity?: number }> = (planetData.motifs || []) as any;
    const has = (n: string) => motifs?.some((m) => m.name === n);
    const accent1 = motifs?.[0]?.color || (planetData.element === 'heart' ? '#FC54AF' : planetData.element === 'lightning' ? '#F2EF1D' : planetData.color || '#38B6FF');
    const accent2 = motifs?.[1]?.color || (planetData.element === 'darkness' ? '#8B5A8B' : '#66AAFF');

    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uBaseColor: { value: color },
      uEmissive: { value: new THREE.Color(surface.emissive || '#000000') },
      uRoughness: { value: surface.roughness || 0.5 },
      uMetallic: { value: surface.metallic || 0.1 },
      uNormalStrength: { value: surface.normalStrength || 1.0 },
      uAtmosphereColor: { value: new THREE.Color(planetData.atmosphere?.color || '#66AAFF') },
      uAtmosphereDensity: { value: planetData.atmosphere?.density || 0.3 },
      uPlanetType: { value: getPlanetTypeCode(type) },
      uSurfaceRoughness: { value: geometry.surfaceRoughness || 0.5 },
      uCraterDensity: { value: geometry.craterDensity || 0.2 },
      uDeformation: { value: geometry.deformation || 0.05 },
      // Motif flags and accents
      uHasCracks: { value: has('cracks') ? 1 : 0 },
      uHasHoneycomb: { value: has('honeycomb') ? 1 : 0 },
      uHasPixel: { value: has('pixel') ? 1 : 0 },
      uHasTiles: { value: has('tiles') ? 1 : 0 },
      uHasQuilt: { value: has('quilt') ? 1 : 0 },
      uHasGraffiti: { value: has('graffiti') ? 1 : 0 },
      uHasCobble: { value: has('cobblestone') ? 1 : 0 },
      uHasMirror: { value: has('mirror') ? 1 : 0 },
      uHasSkyscraper: { value: has('skyscraper') ? 1 : 0 },
      uHasHeartLakes: { value: has('heart_lakes') ? 1 : 0 },
      uHasAurora: { value: has('aurora') ? 1 : 0 },
      uHasCoral: { value: has('coral') ? 1 : 0 },
      uHasShards: { value: has('shards') ? 1 : 0 },
      uHasDollarBolts: { value: has('dollar_bolts') ? 1 : 0 },
      uHasPetals: { value: has('petals') ? 1 : 0 },
      uHasRivers: { value: has('rivers') ? 1 : 0 },
      uHasStadiumLines: { value: has('stadium_lines') ? 1 : 0 },
      uHasVelvet: { value: has('velvet') ? 1 : 0 },
      uAccent1: { value: new THREE.Color(accent1) },
      uAccent2: { value: new THREE.Color(accent2) },
      uMotifIntensity: { value: Math.min(1.5, 0.6 + (motifs?.length || 0) * 0.2) },
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform float uSeed;
      uniform vec3 uEmissive;
      uniform float uRoughness;
      uniform float uMetallic;
      uniform float uNormalStrength;
      uniform vec3 uAtmosphereColor;
      uniform float uAtmosphereDensity;
      uniform float uPlanetType;
      uniform float uSurfaceRoughness;
      uniform float uCraterDensity;
      uniform float uDeformation;
      // Motif flags
      uniform float uHasCracks, uHasHoneycomb, uHasPixel, uHasTiles, uHasQuilt, uHasGraffiti, uHasCobble, uHasMirror, uHasSkyscraper, uHasHeartLakes, uHasAurora, uHasCoral, uHasShards, uHasDollarBolts, uHasPetals, uHasRivers, uHasStadiumLines, uHasVelvet;
      uniform vec3 uAccent1, uAccent2;
      uniform float uMotifIntensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      // Simplex noise utilities (matches cloud shader for coherence)
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      float fbm(vec3 p) {
        float v = 0.0; float a = 0.5; vec3 s = p;
        for (int i = 0; i < 5; i++) { v += a * snoise(s); s *= 2.0; a *= 0.5; }
        return 0.5 + 0.5 * v;
      }
      float ridged(vec3 p) {
        float v = 0.0; float a = 0.5; vec3 s = p;
        for (int i = 0; i < 4; i++) { float n = snoise(s); v += a * (1.0 - abs(n)); s *= 2.0; a *= 0.5; }
        return clamp(v, 0.0, 1.0);
      }

      // Quick saturation boost approximation
      vec3 saturateColor(vec3 color, float amt) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(luma), color, 1.0 + amt);
      }
      
      // Hex grid util
      vec2 hex(vec2 p) {
        const vec2 k = vec2(0.5773502692, 1.1547005384);
        p = abs(p);
        float a = dot(p, vec2(k.x, k.y));
        float b = dot(p, vec2(-k.x, k.y));
        float h = max(a, b);
        return vec2(h, p.y);
      }

      float heartSDF(vec2 p){
        p.x = abs(p.x);
        float a = atan(p.x, p.y)/3.141593;
        float r = length(p);
        float h = pow(r,2.0)*(13.0*a*a - 22.0*a + 10.0);
        return h - 0.5;
      }

      float checker(vec2 uv, float scale){
        vec2 c = floor(uv*scale);
        return mod(c.x + c.y, 2.0);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 nrm = normalize(vWorldPosition);
        float lat = asin(clamp(nrm.y, -1.0, 1.0));
        float lon = atan(nrm.z, nrm.x);
        // lat/lon uv in 0..1
        vec2 uvLL = vec2(fract((lon / 6.2831853) + 0.5), clamp((lat / 3.141593) + 0.5, 0.0, 1.0));
        
        // Compute coherent noise-driven height for realism
        // Use a stable per-planet seed so surface patterns do not change over time
        float height = fbm(vec3(lon * 2.5, lat * 3.0, uSeed));
        float ridges = ridged(vec3(lon * 6.0, lat * 6.5, uSeed));
        float continents = smoothstep(0.42, 0.58, height);
        float mountains = smoothstep(0.65, 0.9, ridges);
        
        // Temperature by latitude (colder near poles)
        float temp = 1.0 - smoothstep(0.6, 1.0, abs(sin(lat)));
        
        // Gas giant branch
        vec3 surfaceColor;
        float waterMask = 0.0;
        if (uPlanetType < 2.5) {
          // Stable band patterns without time animation
          float bands = sin(lat * 18.0 + uSeed * 0.1) * 0.5 + 0.5;
          float turb = fbm(vec3(lon * 8.0, lat * 20.0, uSeed));
          
          // More detailed atmospheric layers for gas giants
          float layer1 = sin(lat * 32.0 + uSeed * 0.2) * 0.3 + 0.7;
          float layer2 = sin(lat * 12.0 + uSeed * 0.15) * 0.2 + 0.8;
          float stormPattern = ridged(vec3(lon * 4.0, lat * 8.0, uSeed + 50.0));
          
          vec3 hi = saturateColor(uBaseColor * (1.2 + 0.3 * turb + 0.15 * stormPattern), 0.4);
          vec3 lo = uBaseColor * (0.7 + 0.15 * turb);
          vec3 mid = uBaseColor * (0.9 + 0.1 * layer2);
          
          // Complex layered appearance
          surfaceColor = mix(lo, hi, bands);
          surfaceColor = mix(surfaceColor, mid, layer1 * 0.6);
        } else {
          // Enhanced terrestrial planets with planet-type specific features
          float sea = 0.5; // sea level
          float h = height * 1.1 - 0.05;
          waterMask = step(h, sea);
          
          // Planet-type specific terrain generation
          vec3 surfaceA, surfaceB, surfaceC;
          
          if (uPlanetType >= 3.5 && uPlanetType < 4.5) { // Ice worlds
            vec3 ice = vec3(0.85, 0.90, 0.95);
            vec3 deepIce = vec3(0.60, 0.75, 0.90);
            vec3 rock = vec3(0.30, 0.25, 0.22);
            vec3 cracks = vec3(0.20, 0.40, 0.60);
            
            float iceCracks = ridged(vec3(lon * 25.0, lat * 20.0, uSeed + 400.0));
            float exposed = smoothstep(0.7, 0.9, mountains);
            
            surfaceColor = mix(deepIce, ice, smoothstep(0.2, 0.8, height));
            surfaceColor = mix(surfaceColor, cracks, iceCracks * 0.4);
            surfaceColor = mix(surfaceColor, rock, exposed * 0.6);
            
          } else if (uPlanetType >= 4.5 && uPlanetType < 5.5) { // Desert worlds
            vec3 sand = vec3(0.8, 0.6, 0.3);
            vec3 darkSand = vec3(0.5, 0.4, 0.2);
            vec3 rock = vec3(0.4, 0.3, 0.25);
            vec3 dunes = vec3(0.9, 0.7, 0.4);
            
            float dunePattern = fbm(vec3(lon * 8.0, lat * 12.0, uSeed + 350.0));
            float rockFormations = ridged(vec3(lon * 20.0, lat * 16.0, uSeed + 450.0));
            
            surfaceColor = mix(darkSand, sand, smoothstep(0.2, 0.8, height));
            surfaceColor = mix(surfaceColor, dunes, dunePattern * 0.5);
            surfaceColor = mix(surfaceColor, rock, rockFormations * 0.7);
            
          } else if (uPlanetType >= 5.5 && uPlanetType < 6.5) { // Ocean worlds
            vec3 deepOcean = vec3(0.01, 0.08, 0.20);
            vec3 shallowOcean = vec3(0.05, 0.25, 0.45);
            vec3 coral = vec3(0.15, 0.45, 0.35);
            vec3 islands = vec3(0.6, 0.55, 0.4);
            
            // Coral reefs and underwater features
            float coralMask = ridged(vec3(lon * 15.0, lat * 15.0, uSeed + 100.0));
            vec3 waterColor = mix(deepOcean, shallowOcean, smoothstep(sea - 0.2, sea, h));
            waterColor = mix(waterColor, coral, coralMask * (1.0 - waterMask) * 0.4);
            vec3 landColor = mix(islands, coral, coralMask * 0.3);
            surfaceColor = mix(waterColor, landColor, 1.0 - waterMask);
            
          } else if (uPlanetType >= 6.5 && uPlanetType < 7.5) { // Volcanic worlds
            vec3 lava = vec3(0.8, 0.2, 0.1);
            vec3 cooledLava = vec3(0.15, 0.10, 0.08);
            vec3 ash = vec3(0.25, 0.22, 0.20);
            vec3 hotSpots = vec3(1.0, 0.4, 0.0);
            
            // Volcanic activity patterns
            float volcanic = ridged(vec3(lon * 12.0, lat * 8.0, uSeed + 200.0));
            float lavaFlows = fbm(vec3(lon * 20.0, lat * 16.0, uSeed + 300.0));
            
            surfaceColor = mix(cooledLava, ash, smoothstep(0.3, 0.7, height));
            surfaceColor = mix(surfaceColor, lava, volcanic * 0.6);
            surfaceColor = mix(surfaceColor, hotSpots, lavaFlows * volcanic * 0.3);
            
          } else if (uPlanetType >= 7.5 && uPlanetType < 8.5) { // Crystal worlds
            vec3 crystal = vec3(0.8, 0.9, 1.0);
            vec3 darkCrystal = vec3(0.4, 0.5, 0.7);
            vec3 prisms = vec3(0.9, 0.8, 1.0);
            vec3 energy = vec3(0.6, 0.9, 1.0);
            
            float crystalPattern = ridged(vec3(lon * 18.0, lat * 18.0, uSeed + 500.0));
            float facets = fbm(vec3(lon * 35.0, lat * 35.0, uSeed + 600.0));
            
            surfaceColor = mix(darkCrystal, crystal, smoothstep(0.3, 0.8, height));
            surfaceColor = mix(surfaceColor, prisms, crystalPattern * 0.7);
            surfaceColor = mix(surfaceColor, energy, facets * crystalPattern * 0.4);
            
          } else if (uPlanetType >= 8.5 && uPlanetType < 9.5) { // Toxic worlds
            vec3 toxicGreen = vec3(0.3, 0.6, 0.2);
            vec3 acidPools = vec3(0.6, 0.8, 0.1);
            vec3 poison = vec3(0.8, 0.9, 0.3);
            vec3 sludge = vec3(0.2, 0.3, 0.1);
            
            float toxic = fbm(vec3(lon * 14.0, lat * 14.0, uSeed + 700.0));
            float corrosion = ridged(vec3(lon * 22.0, lat * 22.0, uSeed + 800.0));
            
            surfaceColor = mix(sludge, toxicGreen, smoothstep(0.2, 0.7, height));
            surfaceColor = mix(surfaceColor, acidPools, toxic * 0.6);
            surfaceColor = mix(surfaceColor, poison, corrosion * toxic * 0.4);
            
          } else if (uPlanetType >= 9.5 && uPlanetType < 10.5) { // Metal worlds
            vec3 darkMetal = vec3(0.15, 0.15, 0.18);
            vec3 brightMetal = vec3(0.6, 0.6, 0.65);
            vec3 rust = vec3(0.4, 0.25, 0.15);
            vec3 chrome = vec3(0.8, 0.8, 0.85);
            
            float metalPattern = ridged(vec3(lon * 16.0, lat * 16.0, uSeed + 900.0));
            float corrosion = fbm(vec3(lon * 24.0, lat * 24.0, uSeed + 1000.0));
            
            surfaceColor = mix(darkMetal, brightMetal, smoothstep(0.4, 0.8, height));
            surfaceColor = mix(surfaceColor, rust, corrosion * 0.5);
            surfaceColor = mix(surfaceColor, chrome, metalPattern * 0.3);
            
          } else { // Default terrestrial
            vec3 deepWater = vec3(0.02, 0.1, 0.25);
            vec3 shallowWater = vec3(0.08, 0.3, 0.55);
            vec3 sand = vec3(0.76, 0.7, 0.5);
            vec3 grass = vec3(0.22, 0.55, 0.28);
            vec3 rock = vec3(0.42, 0.38, 0.36);
            vec3 snow = vec3(0.95, 0.97, 1.0);
            
            vec3 landColor = mix(sand, grass, smoothstep(sea, sea + 0.08, h));
            landColor = mix(landColor, rock, mountains);
            float snowLine = mix(0.85, 0.65, temp);
            landColor = mix(landColor, snow, smoothstep(snowLine, 1.0, h));
            vec3 waterColor = mix(deepWater, shallowWater, smoothstep(sea - 0.15, sea, h));
            surfaceColor = mix(waterColor, landColor, 1.0 - waterMask);
          }
          
          // Subtle element color tinting
          surfaceColor = mix(surfaceColor, uBaseColor, 0.12);
          surfaceColor = saturateColor(surfaceColor, 0.2);
        }

        // Apply motifs to surfaceColor before lighting
        float motif = uMotifIntensity;
        // Cracks
        if (uHasCracks > 0.5) {
          float crack = 1.0 - smoothstep(0.06, 0.12, ridged(vec3(lon*24.0, lat*24.0, uSeed+12.0)));
          surfaceColor = mix(surfaceColor, uAccent1, clamp(crack * 1.5 * motif, 0.0, 1.0));
        }
        // Honeycomb
        if (uHasHoneycomb > 0.5) {
          vec2 p = uvLL * 8.0;
          vec2 hxy = hex(p*2.0);
          float edge = smoothstep(0.15, 0.12, abs(fract(hxy.x) - 0.5));
          float honey = edge * (0.7 + 0.3*sin(uTime*1.5));
          surfaceColor = mix(surfaceColor, mix(surfaceColor, uAccent1, 0.6), clamp(honey*motif, 0.0, 1.0));
        }
        // Pixel
        if (uHasPixel > 0.5) {
          vec2 q = floor(uvLL * 32.0) / 32.0;
          float pix = checker(q, 32.0);
          vec3 pxCol = mix(surfaceColor * 0.8, saturateColor(uAccent1, 0.4), pix);
          surfaceColor = mix(surfaceColor, pxCol, 0.65*motif);
        }
        // Tiles
        if (uHasTiles > 0.5) {
          vec2 g = floor(uvLL * 20.0);
          float on = step(0.5, fract(sin(g.x*12.9898 + g.y*78.233 + floor(uTime*4.0))*43758.5453));
          vec3 tileCol = mix(surfaceColor*0.6, uAccent1, on);
          surfaceColor = mix(surfaceColor, tileCol, 0.7*motif);
        }
        // Quilt
        if (uHasQuilt > 0.5) {
          vec2 q = uvLL * 12.0;
          vec2 f = fract(q);
          float seam = 1.0 - smoothstep(0.04, 0.06, min(min(f.x, 1.0-f.x), min(f.y, 1.0-f.y)));
          vec3 patchColor = mix(uAccent1, uAccent2, checker(q, 1.0));
          surfaceColor = mix(surfaceColor, patchColor, 0.5*motif);
          surfaceColor += vec3(0.2)*seam;
        }
        // Graffiti
        if (uHasGraffiti > 0.5) {
          float stripes = 0.5 + 0.5*sin(lon*30.0 + uSeed*0.2);
          float splat = step(0.75, fbm(vec3(uvLL*18.0, uSeed+uTime*0.6)));
          vec3 ink = mix(uAccent2, uAccent1, stripes);
          surfaceColor = mix(surfaceColor, ink, clamp((0.35*stripes + 0.25*splat)*motif, 0.0, 0.85));
        }
        // Cobblestone
        if (uHasCobble > 0.5) {
          vec2 u = uvLL*14.0;
          vec2 cell = fract(u) - 0.5;
          float d = length(cell);
          float ring = smoothstep(0.45, 0.40, d);
          vec3 stone = mix(surfaceColor*0.8, vec3(0.2,0.2,0.22), ring);
          surfaceColor = mix(surfaceColor, stone, 0.6*motif);
        }
        // Mirror
        if (uHasMirror > 0.5) {
          surfaceColor = mix(surfaceColor, vec3(0.9), 0.25*motif);
        }
        // Skyscraper
        if (uHasSkyscraper > 0.5) {
          float band = smoothstep(0.02, 0.0, abs(fract(lon*10.0) - 0.5));
          vec3 neon = mix(uAccent2, uAccent1, 0.7);
          surfaceColor = mix(surfaceColor, neon, clamp(band*motif, 0.0, 0.8));
        }
        // Heart lakes
        if (uHasHeartLakes > 0.5) {
          vec2 p = (uvLL - 0.5) * 3.0;
          float h0 = heartSDF(p);
          float lake = smoothstep(0.04, 0.0, abs(h0));
          vec3 rim = uAccent1 * smoothstep(0.06, 0.04, abs(h0));
          surfaceColor = mix(surfaceColor, surfaceColor*0.35, lake*0.7*motif);
          surfaceColor += rim*0.5*motif;
        }
        // Coral
        if (uHasCoral > 0.5) {
          float reefs = smoothstep(0.6, 0.95, fbm(vec3(uvLL*22.0, uSeed)));
          surfaceColor = mix(surfaceColor, uAccent1, reefs*0.35*motif);
        }
        // Shards
        if (uHasShards > 0.5) {
          float facets = smoothstep(0.8, 0.95, ridged(vec3(uvLL*30.0, uSeed+5.0)));
          surfaceColor = mix(surfaceColor, vec3(1.0), facets*0.25*motif);
        }
        // Dollar bolts
        if (uHasDollarBolts > 0.5) {
          float bolts = step(0.88, fbm(vec3(uvLL*28.0 + vec2(uTime*0.5,0.0), uSeed)));
          surfaceColor = mix(surfaceColor, uAccent2, bolts*0.4*motif);
        }
        // Rivers
        if (uHasRivers > 0.5) {
          float rv = smoothstep(0.44, 0.5, sin(lon*8.0 + fbm(vec3(lat*6.0, lon*6.0, uSeed))*2.0));
          surfaceColor = mix(surfaceColor, saturateColor(uAccent2,0.5), rv*0.35*motif);
        }
        // Stadium lines
        if (uHasStadiumLines > 0.5) {
          float line = smoothstep(0.01, 0.0, min(abs(fract(uvLL.x*10.0)-0.5), abs(fract(uvLL.y*10.0)-0.5)));
          surfaceColor += vec3(1.0)*line*0.25*motif;
        }
        // Velvet
        if (uHasVelvet > 0.5) {
          surfaceColor = mix(surfaceColor, saturateColor(surfaceColor, 0.6), 0.5*motif);
        }
        
        // Lighting calculation (softer for hologram look)
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float NdotL = max(dot(normal, lightDirection), 0.0);
        
        // Stronger Fresnel for hologram rim
        float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.2);
        vec3 atmosphereGlow = uAtmosphereColor * fresnel * (uAtmosphereDensity * 1.0);
        
        // Specular highlight — stronger over water, softer over land
        vec3 halfV = normalize(lightDirection + viewDirection);
        float specStrength = mix(0.15, 0.6, waterMask);
        float spec = pow(max(dot(normal, halfV), 0.0), mix(24.0, 80.0, waterMask)) * specStrength;
        
        // Combine surface and atmosphere with stable lighting
        vec3 baseTint = uBaseColor * 0.4;
        vec3 finalColor = surfaceColor * (0.35 + 0.65 * NdotL) + atmosphereGlow + uEmissive + baseTint * 0.08 + vec3(spec);

        // Add metallic reflection for appropriate planet types
        if (uMetallic > 0.5) {
          vec3 reflectDirection = reflect(-viewDirection, normal);
          float metalSpec = pow(max(dot(reflectDirection, lightDirection), 0.0), 32.0);
          finalColor += vec3(1.0) * metalSpec * uMetallic;
        }
        
        // Stable surface detail enhancement based on planet seed
        float detailNoise = fbm(vec3(lon * 40.0, lat * 40.0, uSeed + 1000.0));
        finalColor *= (0.92 + 0.16 * detailNoise);

        // Solid planets - no transparency
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: false,
      blending: THREE.NormalBlending,
      depthWrite: true
    });
  }
  
  // Create atmosphere material
  function makeAtmosphereMaterial(planetData: any) {
    const atmosphere = planetData.atmosphere;
    if (!atmosphere) return null;
    
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(atmosphere.color) },
      uDensity: { value: atmosphere.density },
      uGlow: { value: atmosphere.glow || 1.0 }
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uGlow;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        
        float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 1.5);
        float alpha = fresnel * uDensity * 0.8;
        
        // Gentle brightness pulse for atmosphere without hue shift
        float pulse = 0.04 * sin(uTime * 0.8);
        vec3 glowColor = uColor * uGlow * (1.0 + pulse);
        
        gl_FragColor = vec4(glowColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
  }
  
  function getPlanetTypeCode(type: PlanetType): number {
    const typeMap: Record<PlanetType, number> = {
      'terrestrial': 1,
      'gas_giant': 2,
      'ice_world': 3,
      'desert': 4,
      'ocean': 5,
      'volcanic': 6,
      'crystal': 7,
      'toxic': 8,
      'metal': 9
    };
    return typeMap[type] || 1;
  }
  
  // Enhanced planet type data for ultra-realistic worlds
  function getPlanetTypeData(type: PlanetType) {
    const typeData = {
      terrestrial: {
        surface: {
          roughness: 0.6,
          metallic: 0.1,
          normalStrength: 1.2,
          emissive: '#000000',
          landMass: 0.35,
          oceanDepth: 0.8,
          mountainHeight: 0.25,
          plateauSize: 0.15
        },
        colors: {
          ocean: '#1a4b84',
          land: '#8B4513',
          vegetation: '#228B22',
          snow: '#F8F8FF',
          desert: '#DEB887'
        }
      },
      gas_giant: {
        surface: {
          roughness: 0.2,
          metallic: 0.0,
          normalStrength: 0.8,
          emissive: '#001122',
          bandCount: 12,
          stormSize: 0.3,
          atmosphereThickness: 2.5
        },
        colors: {
          primaryBand: '#FF6B35',
          secondaryBand: '#4A90E2',
          storm: '#8B0000',
          glow: '#FFD700'
        }
      },
      ice_world: {
        surface: {
          roughness: 0.8,
          metallic: 0.3,
          normalStrength: 1.5,
          emissive: '#001133',
          iceThickness: 0.9,
          crackDensity: 0.4,
          reflectivity: 0.95
        },
        colors: {
          ice: '#B0E0E6',
          deepIce: '#4682B4',
          cracks: '#00008B',
          aurora: '#00FF7F'
        }
      },
      desert: {
        surface: {
          roughness: 0.9,
          metallic: 0.05,
          normalStrength: 1.8,
          emissive: '#331100',
          duneSize: 0.2,
          rockFormations: 0.3,
          oasisCount: 0.02
        },
        colors: {
          sand: '#DEB887',
          rock: '#8B4513',
          mesa: '#CD853F',
          oasis: '#228B22'
        }
      },
      ocean: {
        surface: {
          roughness: 0.1,
          metallic: 0.0,
          normalStrength: 0.6,
          emissive: '#000033',
          waveHeight: 0.05,
          islandSize: 0.08,
          coralReefs: 0.12,
          deepTrenches: 0.6
        },
        colors: {
          shallowWater: '#40E0D0',
          deepWater: '#191970',
          foam: '#F0F8FF',
          coral: '#FF7F50'
        }
      },
      volcanic: {
        surface: {
          roughness: 1.2,
          metallic: 0.2,
          normalStrength: 2.0,
          emissive: '#FF4500',
          lavaFlows: 0.25,
          craterSize: 0.35,
          ashClouds: 0.4,
          temperature: 1.8
        },
        colors: {
          lava: '#FF4500',
          cooledLava: '#2F4F4F',
          ash: '#696969',
          magma: '#DC143C'
        }
      },
      crystal: {
        surface: {
          roughness: 0.05,
          metallic: 0.9,
          normalStrength: 3.0,
          emissive: '#4B0082',
          crystalSize: 0.4,
          facetCount: 8,
          prismEffect: 1.5,
          resonance: 2.2
        },
        colors: {
          primaryCrystal: '#9932CC',
          secondaryCrystal: '#00CED1',
          energy: '#FFFF00',
          core: '#FF00FF'
        }
      },
      toxic: {
        surface: {
          roughness: 0.7,
          metallic: 0.3,
          normalStrength: 1.4,
          emissive: '#228B22',
          acidPools: 0.3,
          poisonGas: 0.6,
          corrosion: 0.8,
          bioLuminescence: 1.2
        },
        colors: {
          toxic: '#ADFF2F',
          acid: '#32CD32',
          poison: '#9ACD32',
          decay: '#556B2F'
        }
      },
      metal: {
        surface: {
          roughness: 0.3,
          metallic: 0.95,
          normalStrength: 1.0,
          emissive: '#1C1C1C',
          corrosion: 0.15,
          wireframe: 0.05,
          panels: 0.4,
          machinery: 0.25
        },
        colors: {
          steel: '#708090',
          copper: '#B87333',
          gold: '#FFD700',
          rust: '#CD853F'
        }
      }
    };
    
    return typeData[type] || typeData.terrestrial;
  }
  
  // Create cloud layer material
  function createCloudMaterial(cloudLayer: any) {
    const uniforms = {
      uTime: { value: 0 },
      uCloudColor: { value: new THREE.Color(cloudLayer.color) },
      uDensity: { value: cloudLayer.density },
      uTurbulence: { value: cloudLayer.turbulence },
      uSpeed: { value: cloudLayer.speed },
      uWindDirection: { value: Math.random() * Math.PI * 2 }
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uCloudColor;
      uniform float uDensity;
      uniform float uTurbulence;
      uniform float uSpeed;
      uniform float uWindDirection;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      // 3D Noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      float turbulence(vec3 p) {
        float value = 0.0;
        float amplitude = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * abs(snoise(p));
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      void main() {
        // Create cloud movement based on wind
        vec2 windOffset = vec2(
          cos(uWindDirection) * uTime * uSpeed,
          sin(uWindDirection) * uTime * uSpeed
        );
        
        // Generate cloud patterns
        vec3 noisePos = vPosition * 2.0 + vec3(windOffset, uTime * 0.1);
        float cloudNoise = turbulence(noisePos * uTurbulence);
        
        // Edge fade for spherical clouds
        float edgeFade = 1.0 - pow(abs(dot(normalize(vNormal), normalize(vPosition))), 0.8);
        
        // Final cloud alpha
        float cloudAlpha = cloudNoise * uDensity * edgeFade;
        cloudAlpha = smoothstep(0.2, 0.8, cloudAlpha);
        
        // Cloud color with slight variation
        vec3 finalColor = uCloudColor * (0.8 + 0.4 * cloudNoise);
        
        gl_FragColor = vec4(finalColor, cloudAlpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }
  
  // Create storm system material
  function createStormMaterial(storm: any) {
    const uniforms = {
      uTime: { value: 0 },
      uStormColor: { value: new THREE.Color(storm.color) },
      uIntensity: { value: storm.intensity },
      uSize: { value: storm.size },
      uStormType: { value: getStormTypeCode(storm.type) }
    };
    
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uStormColor;
      uniform float uIntensity;
      uniform float uSize;
      uniform float uStormType;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      void main() {
        vec2 center = vec2(0.5);
        float dist = distance(vUv, center);
        
        // Storm eye and spiral pattern
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        float spiral = sin(angle * 8.0 + dist * 20.0 - uTime * 3.0) * 0.5 + 0.5;
        
        // Different storm patterns based on type
        float pattern = 1.0;
        if (uStormType < 1.5) { // hurricane
          pattern = (1.0 - smoothstep(0.0, uSize, dist)) * spiral;
        } else if (uStormType < 2.5) { // electrical
          float lightning = step(0.95, random(vUv + uTime));
          pattern = (1.0 - smoothstep(0.0, uSize * 0.8, dist)) + lightning * 0.5;
        } else if (uStormType < 3.5) { // dust
          float dustCloud = smoothstep(uSize, 0.0, dist) * (0.5 + 0.5 * sin(uTime * 2.0));
          pattern = dustCloud;
        } else { // plasma/ice
          pattern = (1.0 - smoothstep(0.0, uSize, dist)) * (0.7 + 0.3 * sin(uTime * 4.0));
        }
        
        float alpha = pattern * uIntensity;
        gl_FragColor = vec4(uStormColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
  
  function getStormTypeCode(type: string): number {
    const typeMap: Record<string, number> = {
      'hurricane': 1,
      'electrical': 2,
      'dust': 3,
      'plasma': 4,
      'ice': 4
    };
    return typeMap[type] || 1;
  }
  
  // Create particle system for gravitational connections
  function createGravitationalParticles(scene: THREE.Scene, centralPlanetColor: string = '#38B6FF') {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    
    // Create particle positions along orbital paths
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const distances = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles along different orbital distances
      const orbitRadius = 2.5 + Math.random() * 8.5; // 2.5 to 11
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 0.8;
      
      positions[i3] = Math.cos(angle) * orbitRadius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * orbitRadius;
      
      // Velocity for orbital motion
      velocities[i3] = -Math.sin(angle) * 0.02 / orbitRadius; // Slower for outer orbits
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i3 + 2] = Math.cos(angle) * 0.02 / orbitRadius;
      
      phases[i] = Math.random() * Math.PI * 2;
      distances[i] = orbitRadius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('distance', new THREE.BufferAttribute(distances, 1));
    
    // Particle shader material
    const uniforms = {
      uTime: { value: 0 },
      uCentralPos: { value: new THREE.Vector3(0, 0, 1.2) },
      uCentralColor: { value: new THREE.Color(centralPlanetColor) },
      uSize: { value: 3.0 }
    };
    
    particleUniforms.current = uniforms;
    
    const vertexShader = `
      attribute vec3 velocity;
      attribute float phase;
      attribute float distance;
      
      uniform float uTime;
      uniform vec3 uCentralPos;
      uniform float uSize;
      
      varying float vAlpha;
      varying float vDistanceFactor;
      
      void main() {
        vec3 pos = position;
        
        // Orbital motion
        pos += velocity * uTime * 20.0;
        
        // Oscillating pull toward center
        vec3 toCentral = uCentralPos - pos;
        float distToCentral = length(toCentral);
        float pullStrength = 0.1 / (1.0 + distToCentral * 0.5);
        pos += normalize(toCentral) * sin(uTime * 2.0 + phase) * pullStrength;
        
        // Distance-based alpha for depth effect
        vDistanceFactor = 1.0 / (1.0 + distance * 0.1);
        vAlpha = vDistanceFactor * (0.3 + 0.7 * sin(uTime * 3.0 + phase));
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Distance-based size
        gl_PointSize = uSize * vDistanceFactor * (1.0 + sin(uTime * 4.0 + phase) * 0.3);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 uCentralColor;
      varying float vAlpha;
      varying float vDistanceFactor;
      
      void main() {
        // Circular particle shape
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        
        // Soft circular gradient
        float alpha = (1.0 - dist * 2.0) * vAlpha;
        
        // Color mixing between central planet color and cyan energy
        vec3 energyColor = mix(vec3(0.1, 0.9, 1.0), uCentralColor, vDistanceFactor * 0.6);
        
        gl_FragColor = vec4(energyColor, alpha * 0.8);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particleSystemRef.current = particles;
    
    return particles;
  }
  
  // Create connection lines between central planet and orbiting planets
  function createConnectionLines(scene: THREE.Scene, satellites: Sat[], centralPos: THREE.Vector3, centralColor: string = '#38B6FF') {
    // Clear existing lines
    connectionLinesRef.current.forEach(line => {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    connectionLinesRef.current = [];
    
    satellites.forEach(sat => {
      if (!sat.mesh.visible) return; // Skip hidden satellites
      
      const points = [];
      const segmentCount = 20;
      
      // Create curved connection from central planet to satellite
      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const satellitePos = sat.mesh.position;
        
        // Bezier-like curve with gravitational pull effect
        const midPoint = new THREE.Vector3()
          .lerpVectors(centralPos, satellitePos, 0.5)
          .add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.8, 0));
        
        const point = new THREE.Vector3()
          .lerpVectors(centralPos, satellitePos, t)
          .lerp(midPoint, Math.sin(t * Math.PI) * 0.4);
        
        points.push(point);
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Create gradient material
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(centralColor),
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      connectionLinesRef.current.push(line as any);
    });
  }
  
  // Create heart-shaped planet geometry
  function createHeartGeometry(radius: number) {
    // Use the existing heart geometry library for proper 3D heart shape
    // Import and use the more sophisticated heart geometry
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Heart equation parameters - optimized for planet-like roundness
    const scale = radius * 0.5;
    const thickness = scale * 1.2; // More volume for planet-like appearance
    // More circular to resemble a planet
    const heartness = 0.5; // Balanced toward spherical
    
    // Generate vertices for solid heart shape using layered approach
    const layers = 24; // Good detail for planet
    const pointsPerLayer = 32; // Smooth outline
    
    for (let layer = 0; layer <= layers; layer++) {
      for (let point = 0; point < pointsPerLayer; point++) {
        const t = (point / pointsPerLayer) * Math.PI * 2;
        const layerDepth = (layer / layers) - 0.5; // from -0.5 to 0.5
        
        // 2D heart shape equation (parametric) 
        const heartX = scale * (16 * Math.sin(t) ** 3) * 0.08;
        const heartY = scale * -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 0.08;
        
        // Create solid planet-like body with rounded profile
        const distanceFromCenter = Math.abs(layerDepth);
        const sphericalFactor = Math.cos(distanceFromCenter * Math.PI); // Rounded profile
        const heartScale = 0.8 + 0.2 * sphericalFactor;

        // Blend heart outline toward circular for planet-like roundness
        const dir = { x: heartX, y: heartY };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (len > 1e-6) {
          dir.x /= len;
          dir.y /= len;
        } else {
          dir.x = 1;
          dir.y = 0;
        }
        
        // Push toward a more circular outline
        const targetCircleRadius = scale * 0.95 * heartScale;
        const circleX = dir.x * targetCircleRadius;
        const circleY = dir.y * targetCircleRadius;
        
        // More circular blend for planet-like appearance
        // Stronger rounding (clamped)
        const roundness = Math.min(0.95, 0.65 / heartness);
        const baseX = heartX * heartScale;
        const baseY = heartY * heartScale;
        const x = baseX * (1 - roundness) + circleX * roundness;
        const y = baseY * (1 - roundness) + circleY * roundness;
        const z = layerDepth * thickness;

        vertices.push(x, y, z);

        // Calculate normals for proper lighting
        const heartNormal = { x: baseX, y: baseY, z: 0 };
        const heartLen = Math.sqrt(heartNormal.x ** 2 + heartNormal.y ** 2 + heartNormal.z ** 2);
        if (heartLen > 1e-6) {
          heartNormal.x /= heartLen;
          heartNormal.y /= heartLen;
          heartNormal.z /= heartLen;
        }
        
        const sphericalNormal = { x, y, z };
        const sphereLen = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
        if (sphereLen > 1e-6) {
          sphericalNormal.x /= sphereLen;
          sphericalNormal.y /= sphereLen;
          sphericalNormal.z /= sphereLen;
        }
        
        const lerpToSphere = 0.7; // Strong spherical influence
        const normalX = heartNormal.x * (1 - lerpToSphere) + sphericalNormal.x * lerpToSphere;
        const normalY = heartNormal.y * (1 - lerpToSphere) + sphericalNormal.y * lerpToSphere;
        const normalZ = heartNormal.z * (1 - lerpToSphere) + sphericalNormal.z * lerpToSphere;
        
        normals.push(normalX, normalY, normalZ);
        uvs.push(point / pointsPerLayer, layer / layers);
      }
    }
    
    // Generate indices for surface
    for (let layer = 0; layer < layers; layer++) {
      for (let point = 0; point < pointsPerLayer; point++) {
        const ringStride = pointsPerLayer;
        const current = layer * ringStride + point;
        const next = layer * ringStride + ((point + 1) % pointsPerLayer);
        const currentNext = (layer + 1) * ringStride + point;
        const nextNext = (layer + 1) * ringStride + ((point + 1) % pointsPerLayer);

        indices.push(current, next, currentNext);
        indices.push(next, nextNext, currentNext);
      }
    }

    // Add caps
    const ringStride = pointsPerLayer;
    const backZ = -0.5 * thickness;
    const frontZ = 0.5 * thickness;

    const backCenterIndex = vertices.length / 3;
    vertices.push(0, 0, backZ);
    normals.push(0, 0, -1);
    uvs.push(0.5, 0.5);
    
    for (let p = 0; p < pointsPerLayer; p++) {
      const a = 0 * ringStride + p;
      const b = 0 * ringStride + ((p + 1) % pointsPerLayer);
      indices.push(backCenterIndex, b, a);
    }

    const frontCenterIndex = vertices.length / 3;
    vertices.push(0, 0, frontZ);
    normals.push(0, 0, 1);
    uvs.push(0.5, 0.5);
    
    for (let p = 0; p < pointsPerLayer; p++) {
      const a = layers * ringStride + p;
      const b = layers * ringStride + ((p + 1) % pointsPerLayer);
      indices.push(frontCenterIndex, a, b);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    
    geometry.computeVertexNormals();
    
    return geometry;
  }

  // Create detailed planet geometry based on planet type
  function createPlanetGeometry(radius: number, geometry: PlanetGeometry, isHeartPlanet = false) {
    // Use heart geometry for the central heart planet
    if (isHeartPlanet) {
      return createHeartGeometry(radius);
    }
    // Validate inputs to prevent NaN values
    if (!radius || radius <= 0 || !isFinite(radius)) {
      if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('Invalid radius provided to createPlanetGeometry:', radius); }
      radius = 0.5; // fallback
    }
    
    const { segments, scale, deformation, poleFlattening, surfaceRoughness } = geometry;
    
    // Validate geometry parameters
    const safeScale = {
      x: (scale?.x && isFinite(scale.x) && scale.x > 0) ? scale.x : 1,
      y: (scale?.y && isFinite(scale.y) && scale.y > 0) ? scale.y : 1,
      z: (scale?.z && isFinite(scale.z) && scale.z > 0) ? scale.z : 1
    };
    
    const safeDeformation = (deformation && isFinite(deformation)) ? Math.max(0, Math.min(1, deformation)) : 0.05;
    const safePoleFlattening = (poleFlattening && isFinite(poleFlattening)) ? Math.max(0, Math.min(1, poleFlattening)) : 0.02;
    const safeSurfaceRoughness = (surfaceRoughness && isFinite(surfaceRoughness)) ? Math.max(0, Math.min(2, surfaceRoughness)) : 0.5;
    
    // Create base sphere geometry with high detail
    const baseGeometry = new THREE.SphereGeometry(
      radius,
      segments.widthSegments,
      segments.heightSegments
    );
    
    // Apply deformation for non-spherical planets
    const positions = baseGeometry.attributes.position;
    const vector = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);
      
      // Validate vector components
      if (!isFinite(vector.x) || !isFinite(vector.y) || !isFinite(vector.z)) {
        if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('Invalid vector components detected, skipping vertex:', i); }
        continue;
      }
      
      // Apply pole flattening (like gas giants) with safe math
      const latitudeInput = Math.max(-1, Math.min(1, vector.y / radius)); // clamp to valid asin range
      const latitude = Math.asin(latitudeInput);
      const poleEffect = Math.cos(latitude);
      
      if (isFinite(poleEffect)) {
        vector.y *= (1 - safePoleFlattening * poleEffect);
      }
      
      // Apply general deformation with noise
      const noiseValue = 
        Math.sin(vector.x * 8) * Math.cos(vector.z * 6) * 0.1 +
        Math.sin(vector.x * 16) * Math.cos(vector.z * 12) * 0.05 +
        Math.sin(vector.x * 32) * Math.cos(vector.z * 24) * 0.025;
      
      if (isFinite(noiseValue)) {
        const deformationFactor = 1 + (noiseValue * safeDeformation * safeSurfaceRoughness);
        if (isFinite(deformationFactor) && deformationFactor > 0) {
          vector.multiplyScalar(deformationFactor);
        }
      }
      
      // Apply scale with validation
      vector.x *= safeScale.x;
      vector.y *= safeScale.y;
      vector.z *= safeScale.z;
      
      // Final validation before setting position
      if (isFinite(vector.x) && isFinite(vector.y) && isFinite(vector.z)) {
        positions.setXYZ(i, vector.x, vector.y, vector.z);
      } else {
        if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('NaN detected in final vector position, using fallback for vertex:', i); }
        // Use original position as fallback
        vector.fromBufferAttribute(positions, i);
        positions.setXYZ(i, vector.x * safeScale.x, vector.y * safeScale.y, vector.z * safeScale.z);
      }
    }
    
    // Recalculate normals for proper lighting
    baseGeometry.computeVertexNormals();
    
    return baseGeometry;
  }

  // Helper to add a realistic satellite mesh to the current system group
  function addSatLocal(id: string, planetData: any, r = 6.0, speed = 0.25, a = Math.random() * Math.PI * 2, isOutermostRing = false) {
    const sys = groupRef.current; if (!sys) return;
    // Add subtle per-planet size variation for a more organic feel
    const sizeJitter = 0.75 + Math.random() * 0.8; // 0.75x .. 1.55x
    const radius = (planetData.radius || 0.42) * sizeJitter;

    // Strengthen element-specific atmosphere hues for heart/lightning
    const element = (planetData && (planetData as any).element) || null;
    const tunedAtmosphere = planetData.atmosphere ? {
      ...planetData.atmosphere,
      color: (element === 'heart') ? '#FC54AF' : (element === 'lightning') ? '#FFD84D' : planetData.atmosphere.color,
      glow: (element === 'heart') ? Math.max(planetData.atmosphere.glow || 0, 1.3) : (element === 'lightning') ? Math.max(planetData.atmosphere.glow || 0, 1.6) : (planetData.atmosphere.glow || 1.0),
    } : undefined;
    const tunedPlanetData = { ...planetData, atmosphere: tunedAtmosphere, seed: (planetData.seed ?? Math.random() * 1000), songId: id };
    // Special geometry for Collide planet - more spherical
    const isCollidePlanet = (id && id.toLowerCase().includes('collide'));
    const geometry = isCollidePlanet ? {
      segments: { widthSegments: 64, heightSegments: 64 },
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.0,  // No deformation for perfect sphere
      poleFlattening: 0.0,  // No flattening
      surfaceRoughness: 0.1  // Smooth surface
    } : (planetData.geometry || {
      segments: { widthSegments: 128, heightSegments: 128 },
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.05,
      poleFlattening: 0.02,
      surfaceRoughness: 0.5
    });
    
    // Main planet with detailed geometry - only center planet uses heart shape (handled by HeartPlanet component)
    const isHeartPlanet = false; // Baby planets with heart element should use spherical geometry
    const planetGeometry = createPlanetGeometry(radius, geometry, isHeartPlanet);
    const material = makePlanetMaterial(tunedPlanetData);
    const mesh = new THREE.Mesh(planetGeometry, material);
    
    // Atmosphere - disabled to remove blue spheres around planets
    let atmosphereMesh: THREE.Mesh | undefined;
    // if (tunedPlanetData.atmosphere && !isHeartPlanet) {
    //   const atmosphereMat = makeAtmosphereMaterial(tunedPlanetData);
    //   if (atmosphereMat) {
    //     const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.05, geometry.segments.widthSegments / 2, geometry.segments.heightSegments / 2);
    //     atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMat);
    //     mesh.add(atmosphereMesh);
    //   }
    // }
    
    // Rings
    let ringMesh: THREE.Mesh | undefined;
    if (planetData.rings) {
      const rings = planetData.rings;
      const ringGeometry = new THREE.RingGeometry(
        radius * rings.innerRadius,
        radius * rings.outerRadius,
        32
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity,
        side: THREE.DoubleSide
      });
      ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      mesh.add(ringMesh);
    }

    // Hologram wireframe shell - disabled to remove blue spheres around planets
    // if (!isHeartPlanet) {
    //   try {
    //     const wireGeo = new THREE.SphereGeometry(radius * 1.01, Math.max(24, geometry.segments.widthSegments / 4), Math.max(16, geometry.segments.heightSegments / 4));
    //     const wireMat = new THREE.MeshBasicMaterial({ color: 0x19E3FF, wireframe: true, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    //     const wire = new THREE.Mesh(wireGeo, wireMat);
    //     mesh.add(wire);
    //   } catch {}
    // }
    
    // Moons - only create for outermost ring planets, and they orbit the heart planet
    const moons: THREE.Mesh[] = [];
    if (planetData.moons && planetData.moons > 0 && isOutermostRing) {
      for (let i = 0; i < planetData.moons; i++) {
        const moonRadius = radius * (0.08 + Math.random() * 0.12);
        // Moons orbit much farther out around the heart planet
        const moonDistance = 8.0 + i * 1.5 + Math.random() * 2.0;
        const moonGeometry = new THREE.SphereGeometry(moonRadius, 16, 16);
        const moonMaterial = new THREE.MeshPhongMaterial({
          color: 0x888888,
          emissive: 0x222222
        });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        
        const angle = (Math.PI * 2 * i) / planetData.moons + Math.random() * 0.5;
        moonMesh.position.set(
          Math.cos(angle) * moonDistance,
          (Math.random() - 0.5) * moonDistance * 0.1,
          Math.sin(angle) * moonDistance
        );
        
        // Add moons directly to the system instead of the planet
        sys.add(moonMesh);
        moons.push(moonMesh);
      }
    }
    
    // Cloud Layers (skip for heart planets)
    const cloudLayers: THREE.Mesh[] = [];
    if (planetData.weather?.cloudLayers && !isHeartPlanet) {
      planetData.weather.cloudLayers.forEach((cloudLayer) => {
        const cloudGeometry = new THREE.SphereGeometry(
          radius * cloudLayer.height,
          Math.max(32, geometry.segments.widthSegments / 2),
          Math.max(32, geometry.segments.heightSegments / 2)
        );
        const cloudMaterial = createCloudMaterial(cloudLayer);
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        mesh.add(cloudMesh);
        cloudLayers.push(cloudMesh);
      });
    }
    
    // Storm Systems
    const stormSystems: {
      mesh: THREE.Mesh;
      type: string;
      intensity: number;
      duration: number;
      age: number;
      active: boolean;
    }[] = [];
    
    if (planetData.weather?.storms) {
      planetData.weather.storms.forEach((storm) => {
        // Create storm geometry on planet surface
        const stormGeometry = new THREE.PlaneGeometry(
          radius * storm.size * 2,
          radius * storm.size * 2,
          16,
          16
        );
        const stormMaterial = createStormMaterial(storm);
        const stormMesh = new THREE.Mesh(stormGeometry, stormMaterial);
        
        // Position storm on planet surface
        const stormAngle = Math.random() * Math.PI * 2;
        const stormLat = (Math.random() - 0.5) * Math.PI;
        const stormDistance = radius * 1.001; // Just above surface
        
        stormMesh.position.set(
          Math.cos(stormAngle) * Math.cos(stormLat) * stormDistance,
          Math.sin(stormLat) * stormDistance,
          Math.sin(stormAngle) * Math.cos(stormLat) * stormDistance
        );
        
        // Orient storm to face outward from planet
        stormMesh.lookAt(mesh.position);
        stormMesh.rotateY(Math.PI);
        
        mesh.add(stormMesh);
        stormSystems.push({
          mesh: stormMesh,
          type: storm.type,
          intensity: storm.intensity,
          duration: storm.duration,
          age: 0,
          active: Math.random() < storm.frequency
        });
      });
    }
    
    // Position heart planet at center, others in orbit
    if (isHeartPlanet) {
      mesh.position.set(0, 0, 0);
      sys.add(mesh);
      // Store heart planet separately - no orbital parameters
      satsRef.current.push({ 
        id, 
        mesh, 
        mat: material, 
        r: 0, // No orbital radius - at center
        speed: 0, // No orbital speed
        a: 0, // No orbital angle
        baseRadius: radius,
        atmosphereMesh,
        ringMesh,
        moons,
        planetType: planetData.type || 'terrestrial',
        cloudLayers,
        stormSystems,
        weatherData: planetData.weather,
        isHeartPlanet: true
      });
    } else {
      sys.add(mesh);
      satsRef.current.push({ 
        id, 
        mesh, 
        mat: material, 
        r, 
        speed, 
        a, 
        baseRadius: radius,
        atmosphereMesh,
        ringMesh,
        moons,
        planetType: planetData.type || 'terrestrial',
        cloudLayers,
        stormSystems,
        weatherData: planetData.weather
      });
    }
  }

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    // Guard against transient zero-size containers (e.g., during layout)
    const width = Math.max(1, mount.clientWidth || 600);
    const height = Math.max(1, mount.clientHeight || 340);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000); // Slightly wider FOV for closer framing
    // Closer default framing for better planet visibility
    camera.position.set(0, 110, 260.0);
    camera.lookAt(0, 0, 0); // Look at center
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    // Boost brightness and use correct color space/energy (slightly reduced to avoid washout)
    // @ts-ignore three versions differ
    renderer.toneMappingExposure = 2.0;
    // @ts-ignore
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // @ts-ignore
    renderer.physicallyCorrectLights = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const hemi = new THREE.HemisphereLight(0xbfefff, 0x0a1e24, 0.26);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0x99ffff, 0.5); dir.position.set(3, 6, 5); scene.add(dir);
    const pt1 = new THREE.PointLight(0x44ffff, 0.35); pt1.position.set(-4, 2, 4); scene.add(pt1);
    const pt2 = new THREE.PointLight(0x19e3ff, 1.1, 9); pt2.position.set(0, -1.4, 0.6); scene.add(pt2);
    const pt3 = new THREE.PointLight(0xfc54af, 0.26, 7.5); pt3.position.set(0.8, -1.0, -0.4); scene.add(pt3);

    // System group
    const sys = new THREE.Group();
    sys.position.set(0, 0, 0); // Center the system at origin
    sys.rotation.set(0, 0, 0); // Start with no rotation
    scene.add(sys);
    groupRef.current = sys;

    // Elemental planets now created in the proper location with orbital mechanics

    // Main planet placeholder (real one created when songs available)
    const mainGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const mainMat = new THREE.MeshPhongMaterial({ color: 0x1bd3ff, emissive: 0x0a3240, shininess: 18, specular: 0x66ffff });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.visible = false;
    sys.add(main);
    mainRef.current = { id: null, mesh: main, ring: null as any };

    // (Rings will be created once layout is known)

    // Projection sweep removed to avoid left-to-right flashes above planets

    // Initial simple satellites until songs load with weather systems
    const defaultPlanet1 = { 
      radius: 0.42, 
      color: '#38B6FF', 
      type: 'ocean' as PlanetType, 
      atmosphere: { color: '#38B6FF', density: 0.6, glow: 0.8 },
      weather: {
        cloudLayers: [
          { count: 2, speed: 0.015, density: 0.6, color: '#FFFFFF', height: 1.03, turbulence: 0.4 }
        ],
        storms: [
          { frequency: 0.2, intensity: 0.6, color: '#4A90E2', size: 0.15, duration: 30, type: 'hurricane' as const }
        ]
      },
      geometry: {
        shape: 'sphere' as const,
        deformation: 0.02,
        poleFlattening: 0.08,
        surfaceRoughness: 0.15,
        craterDensity: 0.05,
        segments: { widthSegments: 128, heightSegments: 128 },
        scale: { x: 1.2, y: 1.15, z: 1.2 }
      }
    };
    const defaultPlanet2 = { 
      radius: 0.5, 
      color: '#F2EF1D', 
      type: 'crystal' as PlanetType, 
      atmosphere: { color: '#F2EF1D', density: 0.2, glow: 2.0 },
      geometry: {
        shape: 'irregular' as const,
        deformation: 0.25,
        poleFlattening: 0.0,
        surfaceRoughness: 0.6,
        craterDensity: 0.1,
        segments: { widthSegments: 102, heightSegments: 102 },
        scale: { x: 0.8, y: 1.0, z: 0.8 }
      }
    };
    const defaultPlanet3 = { 
      radius: 0.34, 
      color: '#FC54AF', 
      type: 'terrestrial' as PlanetType, 
      atmosphere: { color: '#66AAFF', density: 0.5, glow: 0.4 }, 
      moons: 1,
      weather: {
        cloudLayers: [
          { count: 2, speed: 0.012, density: 0.5, color: '#FFFFFF', height: 1.025, turbulence: 0.3 }
        ],
        storms: [
          { frequency: 0.18, intensity: 0.4, color: '#708090', size: 0.12, duration: 35, type: 'electrical' as const }
        ]
      },
      geometry: {
        shape: 'sphere' as const,
        deformation: 0.05,
        poleFlattening: 0.06,
        surfaceRoughness: 0.5,
        craterDensity: 0.2,
        segments: { widthSegments: 128, heightSegments: 128 },
        scale: { x: 1.0, y: 1.0, z: 1.0 }
      }
    };

    
    addSatLocal('s1', defaultPlanet1, 4.5, 0.25);
    addSatLocal('s2', defaultPlanet2, 3.2, 0.2);
    addSatLocal('s3', defaultPlanet3, 2.1, 0.32);

    // Animate
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0;
    const tick = () => {
      t += 0.016;
      const hov = hoverRef.current;
      const centralPlanet = centralPlanetRef.current;
      
      // Update camera focus for smooth transitions
      const camera = cameraRef.current;
      if (camera) {
        // If the user is dragging/zooming the camera, don't override their input
        if (!isUserCameraDragging.current) {
          // Smoothly animate camera position to target with eased motion
          const distance = camera.position.distanceTo(targetCameraPos.current);
          const easedSpeed = distance > 0.1 ? cameraTransitionSpeed.current * 1.5 : cameraTransitionSpeed.current;
          camera.position.lerp(targetCameraPos.current, easedSpeed);

          // Smoothly animate camera look-at target with enhanced focus
          const currentLookAt = new THREE.Vector3();
          camera.getWorldDirection(currentLookAt);
          currentLookAt.add(camera.position);

          const targetLookDirection = targetCameraLookAt.current.clone().sub(camera.position).normalize();
          const currentLookDirection = currentLookAt.sub(camera.position).normalize();

          // Use faster look-at transition for more responsive focusing
          const lookAtSpeed = distance > 0.1 ? easedSpeed * 1.2 : easedSpeed;
          currentLookDirection.lerp(targetLookDirection, lookAtSpeed);
          const newLookAt = camera.position.clone().add(currentLookDirection);
          camera.lookAt(newLookAt);
        }
      }

      // Update central planet if it exists
      if (centralPlanet.mesh) {
        const hovered = !!hov && centralPlanet.id === hov;
        const focused = !!centralPlanet.id; // Planet is focused when it's the central planet
        // Enhanced hover: stronger pulse oscillation
        const osc = hovered ? (1 + 0.14 * Math.sin(t * 3.5)) : (focused ? (1 + 0.04 * Math.sin(t * 2.0)) : 1);
        const targetScale = (hovered ? 2.4 : (focused ? 2.0 : 1.6)) * osc; // Central planet is much larger and pulses when focused
        const ms = centralPlanet.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.15;
        ms.y = ms.x; ms.z = ms.x;

        // Vertical bob for central planet when hovered
        const yBob = hovered ? Math.sin(t * 2.5) * 3.0 : 0;
        centralPlanet.mesh.position.set(0, yBob, 0);
        // Gentle rotation for the central planet
        centralPlanet.mesh.rotation.y += 0.003;
        // Keep heart planets right-side up
        if (centralPlanet.id === 'heart') {
          centralPlanet.mesh.rotation.x = 0; // Reset any X rotation
          centralPlanet.mesh.rotation.z = Math.PI; // Keep heart point facing downward
        }
        
        // Drive planet shader uniforms
        try {
          const u: any = (centralPlanet.mesh.material as any).uniforms;
          if (u && u.uTime) { u.uTime.value = t; }
          
          // Update atmosphere and weather for central planet
          centralPlanet.mesh.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material) {
              const childU: any = (child.material as any).uniforms;
              if (childU && childU.uTime) { childU.uTime.value = t; }
              if (childU && childU.uGlow) {
                // Enhanced glow for central planet on hover
                const targetGlow = hovered ? 3.0 : 1.2;
                childU.uGlow.value += (targetGlow - childU.uGlow.value) * 0.15;
              }
              
              // Update cloud layers on central planet
              if (childU && childU.uCloudColor) {
                child.rotation.y += 0.003;
                child.rotation.x += 0.001;
              }
              
              // Update storm systems on central planet
              if (childU && childU.uStormColor) {
                if (childU.uIntensity) {
                  const stormPulse = 0.5 + 0.5 * Math.sin(t * 2.0);
                  childU.uIntensity.value = 0.8 * stormPulse;
                }
                child.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.02);
              }
            }
          });
        } catch {}
      }
      
      satsRef.current.forEach(s => {
        // Skip the satellite if it's the central planet
        if (centralPlanet.id && s.id === centralPlanet.id) {
          s.mesh.visible = false; // Hide the original satellite
          return;
        }
        
        s.mesh.visible = true;
        
        // Hide/show planets based on focus - when a song is selected, only show that planet
        const isFocused = mainId && s.id === mainId;
        const shouldHide = !effectiveShowAll && mainId && !isFocused;
        
        // Debug planet visibility logic
        /* debug removed */ ({ 
          planetsVisible, 
          showAll: effectiveShowAll, 
          mainId, 
          isFocused, 
          shouldHide, 
          finalVisible: planetsVisible && effectiveMode !== 'hidden' && !shouldHide 
        });
        
        // Show all planets on homepage overview regardless of store hide state.
        // Otherwise, honor global visibility and focus rules.
        const finalVisible = effectiveShowAll ? true : (planetsVisible && effectiveMode !== 'hidden' && !shouldHide);
        s.mesh.visible = finalVisible;

        /* debug removed */ ({
          showAll: effectiveShowAll,
          planetsVisible,
          shouldHide,
          finalVisible
        });
        
        // Hide atmosphere, rings, and other elements along with the main planet
        if (s.atmosphereMesh) {
          s.atmosphereMesh.visible = finalVisible;
        }
        
        if (s.ringMesh) {
          s.ringMesh.visible = finalVisible;
        }
        
        // Hide all child elements (moons, clouds, storms, etc.)
        if (s.mesh.children && s.mesh.children.length > 0) {
          s.mesh.children.forEach(child => {
            child.visible = finalVisible;
          });
        }
        
        // Skip orbital movement for heart planet (it stays at center)
        if (!(s as any).isHeartPlanet) {
          s.a += (reduced ? 0.0 : s.speed * 0.008);
          const x = Math.cos(s.a) * s.r;
          const z = Math.sin(s.a) * s.r;
          s.mesh.position.set(x, 0, z);
        }
        
        // Rotation for planet - adjust for heart planets
        s.mesh.rotation.y += 0.005;
        if ((s as any).isHeartPlanet) {
          // Heart planet stays upright - no X rotation
        } else {
          s.mesh.rotation.x += 0.002;
        }
        
        const hovered = !!hov && s.id === hov;
        // Enhanced hover effect: stronger pulse, larger scale, vertical bob
        const osc = hovered ? (1 + 0.12 * Math.sin(t * 3.2)) : 1;
        const targetScale = (hovered ? 1.35 : 1.0) * osc;
        const ms = s.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.15;
        ms.y = ms.x; ms.z = ms.x;

        // Vertical pulsing (up/down bob) when hovered
        if (hovered) {
          const yBob = Math.sin(t * 2.5) * 2.5; // Gentle vertical oscillation
          s.mesh.position.y += (yBob - s.mesh.position.y) * 0.12;
        } else {
          // Return to neutral Y position
          s.mesh.position.y += (0 - s.mesh.position.y) * 0.1;
        }
        
        // Update planet shader uniforms
        try {
          const u: any = (s.mesh.material as any).uniforms || s.mat.uniforms;
          
          // Update time for special materials like Collide planet
          if (u && u.uTime) {
            u.uTime.value = t;
          }
          
          // Update atmosphere if present - enhanced glow on hover
          if (s.atmosphereMesh && s.atmosphereMesh.material) {
            const atmU: any = (s.atmosphereMesh.material as any).uniforms;
            if (atmU && atmU.uGlow) {
              // Much stronger glow when hovered (2.8x vs 1.0x)
              const targetGlow = hovered ? 2.8 : 1.0;
              atmU.uGlow.value += (targetGlow - atmU.uGlow.value) * 0.15;
            }
          }
          
          // Animate moons if present - they now orbit the heart planet
          if (s.moons && s.moons.length > 0) {
            s.moons.forEach((moon, idx) => {
              const moonSpeed = 0.015 + idx * 0.005; // Slower, more stately orbit
              const currentPos = moon.position.clone();
              const distance = currentPos.length();
              const angle = Math.atan2(currentPos.z, currentPos.x) + moonSpeed;
              
              // Moons orbit around the heart planet at (0,0,0) with slight vertical wobble
              const verticalWobble = Math.sin(state.clock.elapsedTime * 0.5 + idx) * 0.3;
              moon.position.set(
                Math.cos(angle) * distance,
                currentPos.y + verticalWobble * 0.1,
                Math.sin(angle) * distance
              );
              moon.rotation.y += 0.03;
            });
          }
          
          // Animate rings if present
          if (s.ringMesh) {
            s.ringMesh.rotation.z += 0.01;
          }
          
          // Update cloud layers
          if (s.cloudLayers && s.cloudLayers.length > 0) {
            s.cloudLayers.forEach((cloudLayer, idx) => {
              const cloudU: any = (cloudLayer.material as any).uniforms;
              // Each cloud layer rotates at different speeds
              cloudLayer.rotation.y += 0.002 + idx * 0.001;
              cloudLayer.rotation.x += 0.0005;
            });
          }
          
          // Update storm systems
          if (s.stormSystems && s.stormSystems.length > 0 && s.weatherData) {
            s.stormSystems.forEach((storm, idx) => {
              const stormU: any = (storm.mesh.material as any).uniforms;
              
              // Storm lifecycle management
              storm.age += 0.016;
              
              // Check if storm should become active
              const stormConfig = s.weatherData.storms?.[idx];
              if (stormConfig && !storm.active && Math.random() < stormConfig.frequency * 0.001) {
                storm.active = true;
                storm.age = 0;
              }
              
              // Deactivate storm after duration
              if (storm.active && storm.age > storm.duration) {
                storm.active = false;
                storm.age = 0;
              }
              
              // Update storm visibility and intensity
              if (storm.active) {
                const fadeIn = Math.min(storm.age / 5, 1); // 5 second fade in
                const fadeOut = storm.age > (storm.duration - 5) ? 
                  Math.max(0, (storm.duration - storm.age) / 5) : 1;
                const stormAlpha = fadeIn * fadeOut;
                
                if (stormU && stormU.uIntensity) {
                  stormU.uIntensity.value = storm.intensity * stormAlpha;
                }
                storm.mesh.visible = true;
                
                // Storm movement (rotate around planet)
                if (storm.type === 'hurricane' || storm.type === 'dust') {
                  storm.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.01);
                }
              } else {
                storm.mesh.visible = false;
              }
            });
          }
        } catch {}
      });
      // Update particle system
      if (particleSystemRef.current && particleUniforms.current) {
        try {
          particleUniforms.current.uTime.value = t;
          
          // Update central position if we have a central planet
          if (centralPlanet.mesh) {
            particleUniforms.current.uCentralPos.value.copy(centralPlanet.mesh.position);
            // Update particle visibility and intensity based on central planet
            const visibility = centralPlanet.mesh.visible ? 1.0 : 0.0;
            particleSystemRef.current.material.opacity = visibility * 0.8;
          } else {
            // Fade out particles when no central planet
            particleSystemRef.current.material.opacity *= 0.95;
          }
        } catch {}
      }
      
      // Update connection lines
      if (connectionLinesRef.current.length > 0 && centralPlanet.mesh) {
        connectionLinesRef.current.forEach((line, index) => {
          if (line && line.material) {
            // Animate line opacity with breathing effect
            const baseOpacity = 0.15;
            const breath = Math.sin(t * 2.0 + index * 0.5) * 0.05;
            (line.material as any).opacity = baseOpacity + breath;
          }
        });
      }
      
      // Update holo sweep shader time
      try { if (sweepUniforms.current) sweepUniforms.current.uTime.value = t; } catch {}
      // Apply focus-or-spin for the system group
      if (sys) {
        // Don't rotate the system if we have a central planet - let it stay fixed
        if (centralPlanet.mesh) {
          // Keep system rotation stable when central planet is active
          // The central planet is at origin, others orbit around it
        } else if (focusTargetRy.current !== null) {
          // Smoothly rotate toward the target yaw using shortest angular path
          const cur = sys.rotation.y;
          const target = focusTargetRy.current;
          // Normalize delta to [-PI, PI]
          let delta = ((target - cur + Math.PI) % (Math.PI * 2));
          if (delta < 0) delta += Math.PI * 2;
          delta -= Math.PI;
          // Step a fraction of the remaining angle
          sys.rotation.y = cur + delta * 0.12;
          if (Math.abs(delta) < 0.002) {
            sys.rotation.y = target;
            focusTargetRy.current = null; // done focusing
          }
        } else if (!reduced) {
          sys.rotation.y += spinSpeedRef.current;
        }
      }
      // Animate orbiting song planets and elemental planets
      if (sys) {
        sys.traverse((child) => {
          if (child.userData && child.userData.isOrbitingSong) {
            const data = child.userData;
            const time = Date.now() * 0.001; // Convert to seconds
            
            // Update orbit angle
            data.orbitAngle += data.orbitSpeed;
            
            // Find the current position of the elemental planet this song orbits around
            let elementPosition = data.elementPosition; // fallback to original position
            sys.traverse((elementChild) => {
              if (elementChild.userData && elementChild.userData.isElementalPlanet && 
                  elementChild.userData.elementName === data.elementName.toUpperCase()) {
                elementPosition = [elementChild.position.x, elementChild.position.y, elementChild.position.z];
              }
            });
            
            // Calculate new position
            const x = elementPosition[0] + Math.cos(data.orbitAngle) * data.orbitRadius;
            const y = elementPosition[1] + Math.sin(data.orbitAngle) * data.orbitRadius * 0.3;
            const z = elementPosition[2] + Math.sin(data.orbitAngle) * data.orbitRadius * 0.5;
            
            child.position.set(x, y, z);
            
            // Add gentle rotation to song planets
            child.rotation.y += 0.02;
          }
          
          // Animate elemental planets orbiting around center heart planet
          if (child.userData && child.userData.isElementalPlanet) {
            const data = child.userData;
            
            // Update orbit angle
            data.orbitAngle += data.orbitSpeed;
            
            // Calculate new position around center (0,0,0)
            const x = Math.cos(data.orbitAngle) * data.orbitRadius;
            const y = 0; // Keep elemental planets on same Y plane
            const z = Math.sin(data.orbitAngle) * data.orbitRadius;
            
            child.position.set(x, y, z);
            
            // Add gentle rotation to elemental planets
            child.rotation.y += 0.005;
          }
        });
      }
      
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // Mouse interaction for planet selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!onSongChange) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Check intersections with planet meshes
      const planetMeshes: THREE.Mesh[] = [];
      const planetIds: string[] = [];
      
      satsRef.current.forEach(sat => {
        if (sat.mesh) {
          planetMeshes.push(sat.mesh);
          planetIds.push(sat.id);
        }
      });

      const intersects = raycaster.intersectObjects(planetMeshes);
      
      if (intersects.length > 0) {
        const clickedMeshIndex = planetMeshes.indexOf(intersects[0].object as THREE.Mesh);
        if (clickedMeshIndex >= 0) {
          const planetId = planetIds[clickedMeshIndex];
        onSongChange(planetId);
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Camera drag controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      isUserCameraDragging.current = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
      if (process.env.NODE_ENV !== "production") console.log('🎮 Started camera drag');
    };
    
    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };
      
      // Horizontal movement rotates around Y-axis
      const rotationSpeedY = 0.005;
      const rotationSpeedX = 0.005;
      
      // Get current camera position
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      
      // Apply rotations
      spherical.theta -= deltaMove.x * rotationSpeedY;
      spherical.phi += deltaMove.y * rotationSpeedX;
      
      // Clamp phi to prevent camera from flipping
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      
      // Update camera position
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);

      // Keep target in sync so the tick loop doesn't snap back
      targetCameraPos.current.copy(camera.position);
      targetCameraLookAt.current.set(0, 0, 0);
      
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };
    
    const onMouseUp = () => {
      isDragging = false;
      isUserCameraDragging.current = false;
      // Persist the final position as the new target
      targetCameraPos.current.copy(camera.position);
      targetCameraLookAt.current.set(0, 0, 0);
      if (process.env.NODE_ENV !== "production") console.log('🎮 Ended camera drag');
    };
    
    // Mouse wheel zoom
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const zoomDelta = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      
      camera.position.multiplyScalar(zoomDelta);

      // Prevent getting too close or too far
      const distance = camera.position.length();
      if (distance < 5) {
        camera.position.normalize().multiplyScalar(5);
      } else if (distance > 100) {
        camera.position.normalize().multiplyScalar(100);
      }

      // Treat wheel as user camera interaction and sync target
      isUserCameraDragging.current = true;
      targetCameraPos.current.copy(camera.position);
      targetCameraLookAt.current.set(0, 0, 0);
      // Small timeout to allow the tick to resume smoothing after wheel
      setTimeout(() => { isUserCameraDragging.current = false; }, 100);

      if (process.env.NODE_ENV !== "production") console.log('🔍 Mouse wheel zoom, distance:', distance);
    };
    
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Resize
    const onResize = () => {
      if (!mount) return;
      // Clamp to at least 1×1 to avoid IndexSizeError in some browsers
      const w = Math.max(1, mount.clientWidth || 600);
      const h = Math.max(1, mount.clientHeight || 340);
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    return () => {
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
      try { ro.disconnect(); } catch {}
      try { renderer.domElement.removeEventListener('click', onMouseClick); } catch {}
      try { renderer.domElement.removeEventListener('mousedown', onMouseDown); } catch {}
      try { renderer.domElement.removeEventListener('mousemove', onMouseMove); } catch {}
      try { renderer.domElement.removeEventListener('mouseup', onMouseUp); } catch {}
      try { renderer.domElement.removeEventListener('wheel', onWheel); } catch {}
      try { if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current.forceContextLoss?.(); } } catch {}
      try { if (mount && renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement); } catch {}
      // Cleanup central planet
      try {
        const centralPlanet = centralPlanetRef.current;
        if (centralPlanet.mesh) {
          centralPlanet.mesh.geometry?.dispose();
          centralPlanet.mesh.material?.dispose();
        }
      } catch {}
      // Cleanup particle system
      try {
        if (particleSystemRef.current) {
          particleSystemRef.current.geometry?.dispose();
          (particleSystemRef.current.material as THREE.Material)?.dispose();
        }
      } catch {}
      // Cleanup connection lines
      try {
        connectionLinesRef.current.forEach(line => {
          line.geometry?.dispose();
          (line.material as THREE.Material)?.dispose();
        });
      } catch {}
    };
  }, []);

  // Sync planets to songs from the global store for closer match to previous visuals
  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  // Hide internal minimap by default to avoid duplicate map UI
  const [isMinimapVisible, setIsMinimapVisible] = React.useState(false);
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { songs, mainId, hoverId, planetsVisible, planetDisplayMode } = storeSnap as any;
  
  // Respect global planet display mode; treat prop showAll as homepage-only when there's no selection
  const isHomeOverview = !!showAll && !mainId;
  const effectiveMode: 'all' | 'single' | 'hidden' = isHomeOverview ? 'all' : (planetDisplayMode || 'all');
  const effectiveShowAll = effectiveMode === 'all';
  const hoverRef = useRef<string | null>(null);
  useEffect(() => { hoverRef.current = hoverId || null; }, [hoverId]);
  // Compute layout with consistent spacing (matching planetLayout defaults)
  const layout = useMemo(() => (
    songs && songs.length 
      ? computePlanetLayout(songs as any, { 
          ringGap: effectiveShowAll ? 2.2 : 1.8, 
          baseRadius: effectiveShowAll ? 5.2 : 3.5, 
          tiltPerRing: 6, 
          minScale: 0.7, 
          maxScale: effectiveShowAll ? 1.35 : 1.25 
        }) 
      : undefined
  ), [songs, effectiveShowAll]);

  useEffect(() => {
    // Build system from songs when available
    const sys = groupRef.current; if (!sys) return;
    // Fallback: if store has no songs in homepage mode, build from tracks immediately
    let songsToUse = songs as any[] | undefined;
    if ((!songs || !songs.length) && effectiveShowAll) {
      try {
        const { holoSongs } = buildPlanetSongs();
        if (holoSongs && holoSongs.length) {
          songsToUse = holoSongs as any[];
          // Also initialize the store for subsequent updates
          try { playerStore.getState().initSongs(holoSongs as any); } catch {}
        }
      } catch {}
    }
    if (!songsToUse || !songsToUse.length) return;
    const focusId = effectiveShowAll ? null : mainId;
    
    // Debug removed for production
    
    // Do not force-enable planets on homepage; Start button toggles visibility
    // visibility gate
    // Clear existing satellites
    for (const s of satsRef.current) {
      try { sys.remove(s.mesh); (s.mesh.geometry as any)?.dispose?.(); (s.mesh.material as any)?.dispose?.(); } catch {}
    }
    satsRef.current = [];
    // Clear existing rings
    for (const g of ringsRef.current) {
      try { sys.remove(g); g.clear(); } catch {}
    }
    ringsRef.current = [];
    
    // Clear central planet when rebuilding system
    const centralPlanet = centralPlanetRef.current;
    if (centralPlanet.mesh) {
      try { sys.remove(centralPlanet.mesh); } catch {}
      centralPlanetRef.current = { id: null, mesh: null, originalSat: null };
    }
    
    // Clear connection lines when rebuilding
    connectionLinesRef.current.forEach(line => {
      try { 
        if (sys.parent) (sys.parent as THREE.Scene).remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      } catch {}
    });
    connectionLinesRef.current = [];
    
    // Reset camera to overview position when showing all planets
    if (effectiveShowAll || !focusId) {
      // Moderate zoom for good system overview  
      targetCameraPos.current.set(0, 150, 400.0);
      targetCameraLookAt.current.set(0, 0, 0);
      cameraTransitionSpeed.current = 0.08;
      
      // Fade out particle system when no focus
      if (particleSystemRef.current) {
        (particleSystemRef.current.material as any).opacity = 0.2;
      }

      // Single bright central heart planet when using raw system (only when showing all planets)
      if (effectiveShowAll) {
        try {
          const heartGeo = createHeartGeometry(2.0, 96, { heartness: 5.0, thicknessMultiplier: 0.6 });

          // Textured glowing shader for the heart planet (raw three.js)
          const heartUniforms = {
            uTime: { value: 0 },
            // Pink ramp
            uColorCool: { value: new THREE.Color('#7A0F46') },
            uColorMid:  { value: new THREE.Color('#FC54AF') },
            uColorHot:  { value: new THREE.Color('#FFB1DC') },
            uColorCore: { value: new THREE.Color('#FFE9F6') },
            uScale: { value: 1.6 },
            uDetail: { value: 3.5 },
            uGranularity: { value: 8.0 },
            uEmissiveBoost: { value: 3.0 },
            uRimBoost: { value: 1.7 },
            uNormalStrength: { value: 0.65 },
          };
          const heartVS = `
            uniform float uTime;
            varying vec3 vWorldPosition;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            void main(){
              vNormalW = normalize(normalMatrix * normal);
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorldPosition = wp.xyz;
              vViewDir = normalize(cameraPosition - vWorldPosition);
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `;
          const heartFS = `
            precision highp float;
            uniform float uTime;
            uniform vec3 uColorCool, uColorMid, uColorHot, uColorCore;
            uniform float uScale, uDetail, uGranularity, uEmissiveBoost, uRimBoost, uNormalStrength;
            varying vec3 vWorldPosition; varying vec3 vNormalW; varying vec3 vViewDir;
            float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453123); }
            float noise3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x);
              float n000=hash3(i+vec3(0.0)); float n100=hash3(i+vec3(1.0,0.0,0.0));
              float n010=hash3(i+vec3(0.0,1.0,0.0)); float n110=hash3(i+vec3(1.0,1.0,0.0));
              float n001=hash3(i+vec3(0.0,0.0,1.0)); float n101=hash3(i+vec3(1.0,0.0,1.0));
              float n011=hash3(i+vec3(0.0,1.0,1.0)); float n111=hash3(i+vec3(1.0,1.0,1.0));
              vec3 u=f*f*(3.0-2.0*f);
              float nx00=mix(n000,n100,u.x); float nx10=mix(n010,n110,u.x);
              float nx01=mix(n001,n101,u.x); float nx11=mix(n011,n111,u.x);
              float nxy0=mix(nx00,nx10,u.y); float nxy1=mix(nx01,nx11,u.y);
              return mix(nxy0,nxy1,u.z);
            }
            float fbm3(vec3 p){ float v=0.0; float a=0.55; for(int i=0;i<6;i++){ v+=a*noise3(p); p*=2.0; a*=0.5;} return v; }
            float ridge3(vec3 p){ float n=fbm3(p); return 1.0-abs(2.0*n-1.0); }
            vec3 swirl(vec3 p, float t){ float a=0.6*sin(t*0.25)+0.4*sin(t*0.73); float s=sin(a), c=cos(a);
              mat3 R=mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); return R*p; }
            vec3 ramp(float x){ float t1=smoothstep(0.10,0.45,x); float t2=smoothstep(0.40,0.75,x); float t3=smoothstep(0.70,0.98,x);
              vec3 c1=mix(uColorCool,uColorMid,t1); vec3 c2=mix(uColorMid,uColorHot,t2); vec3 c3=mix(uColorHot,uColorCore,t3); return mix(mix(c1,c2,t2), c3, t3);
            }
            void main(){
              vec3 N=normalize(vNormalW); vec3 V=normalize(vViewDir); vec3 L=normalize(vec3(0.5,0.8,0.35));
              vec3 P=swirl(vWorldPosition*uScale, uTime*0.9);
              float base=fbm3(P+vec3(0.0,0.0,uTime*0.08));
              float cells=ridge3(P*(1.5+uDetail)-vec3(0.0,0.0,uTime*0.06));
              float micro=fbm3(P*uGranularity+vec3(uTime*0.2,0.0,-uTime*0.23));
              float field=clamp(mix(mix(base,cells,0.55), micro, 0.35), 0.0, 1.0);
              float flares=smoothstep(0.92,0.98, ridge3(P*3.3+7.0));
              float e=0.02; float n0=fbm3(P); float nx=fbm3(P+vec3(e,0.0,0.0))-n0; float ny=fbm3(P+vec3(0.0,e,0.0))-n0; float nz=fbm3(P+vec3(0.0,0.0,e))-n0;
              vec3 grad=normalize(vec3(nx,ny,nz)); vec3 Np=normalize(N + grad*(uNormalStrength*1.25));
              vec3 col=ramp(field); col += vec3(1.0)*flares*0.5;
              float dif=max(dot(Np,L),0.0); vec3 H=normalize(L+V); float spec=pow(max(dot(Np,H),0.0), 48.0)*0.7; float night=smoothstep(0.0,0.6,dif);
              vec3 lit = col*(0.28 + 0.95*night) + vec3(1.0)*spec;
              float fres=pow(1.0-abs(dot(N,V)), 1.35);
              lit *= (1.0 + uEmissiveBoost*(0.65 + 0.35*sin(uTime*1.7)));
              lit += lit*fres*uRimBoost;
              gl_FragColor = vec4(lit, 1.0);
            }
          `;
          const heartMat = new THREE.ShaderMaterial({ uniforms: heartUniforms, vertexShader: heartVS, fragmentShader: heartFS, transparent: false, depthWrite: true });
          const heartMesh = new THREE.Mesh(heartGeo, heartMat);
          heartMesh.position.set(0, 0, 0);
          heartMesh.rotation.z = Math.PI; // Ensure heart point faces downward
          heartMesh.scale.set(2.0, 1.8, 1.5);
          heartMesh.visible = true;
          sys.add(heartMesh);

          // Removed pink atmosphere and outer glow to eliminate aura

          centralPlanetRef.current = { id: 'heart', mesh: heartMesh, originalSat: null };

          // ADD 4 ELEMENTAL PLANETS AROUND THE HEART
          try {
            if (process.env.NODE_ENV !== "production") console.log("🚨🪐 ADDING ELEMENTAL PLANETS TO RAW SYSTEM! 🪐🚨");
            
            const elementalPlanets = [
              { name: 'WATER', color: '#38B6FF', position: [35, 0, 0] },
              { name: 'LIGHTNING', color: '#F2EF1D', position: [0, 35, 0] },
              { name: 'HEART', color: '#FC54AF', position: [-35, 0, 0] },
              { name: 'DARKNESS', color: '#6A4C93', position: [0, -35, 0] }
            ];

            elementalPlanets.forEach(planet => {
              // Create sphere geometry - Moderate size for better balance
              const sphereGeo = new THREE.SphereGeometry(12.0, 32, 32);
              
              // Load texture for this planet
              const textureLoader = new THREE.TextureLoader();
              const textureMap = {
                'WATER': '/textures/planet_water.webp',
                'LIGHTNING': '/textures/planet_lightning.webp', 
                'HEART': '/textures/planet_heart.webp',
                'DARKNESS': '/textures/planet_darkness.webp'
              };
              
              const textureUrl = textureMap[planet.name as keyof typeof textureMap];
              
              // Create enhanced material with texture and emissive properties
              const sphereMat = new THREE.MeshStandardMaterial({ 
                map: textureUrl ? textureLoader.load(textureUrl) : null,
                color: textureUrl ? '#ffffff' : planet.color, // White when using texture
                emissive: new THREE.Color(planet.color),
                emissiveIntensity: textureUrl ? 1.0 : 3.0, // Less emissive when textured
                metalness: 0.1,
                roughness: 0.3,
                transparent: false
              });
              
              if (process.env.NODE_ENV !== "production") console.log(`Loading texture for ${planet.name}: ${textureUrl}`);
              
              // Create main planet mesh
              const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
              sphereMesh.position.set(planet.position[0], planet.position[1], planet.position[2]);
              
              // Add orbital animation data
              const orbitRadius = 35; // Distance from center
              const initialAngle = Math.atan2(planet.position[2], planet.position[0]); // Current angle based on position
              sphereMesh.userData = {
                isElementalPlanet: true,
                orbitRadius: orbitRadius,
                orbitAngle: initialAngle,
                orbitSpeed: 0.002, // Slow orbital speed for elemental planets
                elementName: planet.name
              };
              
              sys.add(sphereMesh);
              
              // Add inner glow effect - VISIBLE SIZE
              const innerGlowGeo = new THREE.SphereGeometry(1.5, 12, 12);
              const innerGlowMat = new THREE.MeshBasicMaterial({
                color: planet.color,
                transparent: true,
                opacity: 0.4,
                depthWrite: false
              });
              const innerGlowMesh = new THREE.Mesh(innerGlowGeo, innerGlowMat);
              innerGlowMesh.position.copy(sphereMesh.position);
              sys.add(innerGlowMesh);
              
              // Add outer atmospheric glow - VISIBLE SIZE
              const outerGlowGeo = new THREE.SphereGeometry(2.2, 12, 12);
              const outerGlowMat = new THREE.MeshBasicMaterial({
                color: planet.color,
                transparent: true,
                opacity: 0.15,
                depthWrite: false
              });
              const outerGlowMesh = new THREE.Mesh(outerGlowGeo, outerGlowMat);
              outerGlowMesh.position.copy(sphereMesh.position);
              sys.add(outerGlowMesh);
              
              if (process.env.NODE_ENV !== "production") console.log(`Enhanced ${planet.name} planet at position:`, planet.position);
              
              // ADD ORBITING SONG PLANETS AROUND THIS ELEMENTAL PLANET
              const elementName = planet.name.toLowerCase();
              const songPlanetsPerElement = 3; // Number of song planets per element
              const songOrbitRadius = 15; // MUCH tighter orbit around elemental planet
              
              for (let i = 0; i < songPlanetsPerElement; i++) {
                const angle = (i / songPlanetsPerElement) * Math.PI * 2;
                const x = planet.position[0] + Math.cos(angle) * songOrbitRadius;
                const y = planet.position[1] + Math.sin(angle) * songOrbitRadius * 0.3; // Elliptical orbit
                const z = planet.position[2] + Math.sin(angle) * songOrbitRadius * 0.5;
                
                // Create small song planet
                const songGeo = new THREE.SphereGeometry(5.0, 16, 16);
                const songMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(planet.color).multiplyScalar(0.7), // Darker version
                  emissive: new THREE.Color(planet.color),
                  emissiveIntensity: 1.5,
                  metalness: 0.2,
                  roughness: 0.4
                });
                
                const songMesh = new THREE.Mesh(songGeo, songMat);
                songMesh.position.set(x, y, z);
                songMesh.userData = { 
                  elementName: elementName,
                  orbitAngle: angle,
                  orbitRadius: songOrbitRadius,
                  elementPosition: [...planet.position],
                  isOrbitingSong: true,
                  orbitSpeed: 0.01 + Math.random() * 0.01 // Random orbit speed
                };
                sys.add(songMesh);
                
                if (process.env.NODE_ENV !== "production") console.log(`Added orbiting song planet for ${elementName} at:`, [x, y, z]);
              }
            });
          } catch (error) {
            console.error("Failed to add elemental planets:", error);
          }
        } catch {}
      }
    }

    // Build orbit ring guides per ring index using layout radii
    if (layout) {
      const ringMaxByIndex = new Map<number, { r: number; tiltDeg: number }>();
      songs.forEach((song) => {
        const id = song.id;
        const lay = (layout as any)[id];
        if (!lay) return;
        const spacingMul = 1.0;
        const r = (lay.orbitRadius ?? 4) * spacingMul;
        const prev = ringMaxByIndex.get(lay.ringIndex);
        if (!prev || r > prev.r) ringMaxByIndex.set(lay.ringIndex, { r, tiltDeg: lay.tiltDeg ?? 8 });
      });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.35, depthWrite: false });
      const gridLineMat = new THREE.LineBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.25 });
      const indices = Array.from(ringMaxByIndex.keys()).sort((a, b) => a - b);
      
      // Create radial grid lines emanating from center
      const radialLineCount = 12;
      const maxRadius = Math.max(...Array.from(ringMaxByIndex.values()).map(v => v.r));
      for (let i = 0; i < radialLineCount; i++) {
        const angle = (i / radialLineCount) * Math.PI * 2;
        const lineGeometry = new THREE.BufferGeometry();
        const points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * maxRadius, 0, Math.sin(angle) * maxRadius)
        ];
        lineGeometry.setFromPoints(points);
        const radialLine = new THREE.Line(lineGeometry, gridLineMat.clone());
        sys.add(radialLine);
        ringsRef.current.push(radialLine as any);
      }
      
      for (const idx of indices) {
        const { r, tiltDeg } = ringMaxByIndex.get(idx)!;
        const g = new THREE.Group();
        g.rotation.x = -Math.PI / 2 + (tiltDeg * Math.PI / 180);
        
        // Main orbital ring with increased thickness
        const geom = new THREE.RingGeometry(Math.max(0, r - 0.03), r + 0.03, 128);
        const mesh = new THREE.Mesh(geom, ringMat.clone());
        g.add(mesh);
        
        // Add additional orbital path indicators - thinner inner and outer guides
        if (r > 1) {
          const innerGuideGeom = new THREE.RingGeometry(Math.max(0, r * 0.85 - 0.01), r * 0.85 + 0.01, 64);
          const innerGuideMesh = new THREE.Mesh(innerGuideGeom, new THREE.MeshBasicMaterial({ 
            color: 0x19e3ff, transparent: true, opacity: 0.15, depthWrite: false 
          }));
          g.add(innerGuideMesh);
          
          const outerGuideGeom = new THREE.RingGeometry(r * 1.15 - 0.01, r * 1.15 + 0.01, 64);
          const outerGuideMesh = new THREE.Mesh(outerGuideGeom, new THREE.MeshBasicMaterial({ 
            color: 0x19e3ff, transparent: true, opacity: 0.15, depthWrite: false 
          }));
          g.add(outerGuideMesh);
        }
        
        sys.add(g);
        ringsRef.current.push(g);
      }
    }
    // Find the maximum ring index to identify outermost ring
    const maxRingIndex = Math.max(...songsToUse.map(song => {
      const lay = layout ? (layout as any)[song.id] : undefined;
      return lay?.ringIndex ?? 0;
    }));

    // Old orbital planet system removed - now using elemental planets with orbiting song planets
    // Update main planet
    // const mainEntry = focusId ? songs.find(s => s.id === focusId) : null;
    const main = mainRef.current.mesh;
    if (main) main.visible = false; // no separate central planet; every song has its own
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mainId, effectiveShowAll, planetsVisible, layout && Object.keys(layout).join(',')]);

  // When the selected song changes, create central planet and update orbital system
  useEffect(() => {
    
    const sys = groupRef.current; if (!sys) return;
    const id = mainId; if (!id) { return; }
    const sat = satsRef.current.find(s => s.id === id);
    if (!sat) { return; }
    
    
    // Create central planet from the selected satellite
    const centralPlanet = centralPlanetRef.current;
    
    // Clean up previous central planet
    if (centralPlanet.mesh && centralPlanet.mesh !== sat.mesh) {
      try { sys.remove(centralPlanet.mesh); } catch {}
    }
    
    // Get the original song data for the selected planet
    const songData = songs.find(s => s.id === id);
    const planetData = songData?.planet || { radius: sat.baseRadius, color: '#38B6FF', type: 'terrestrial' };
    
    // Create new central planet as a larger, higher quality version
    const centralRadius = sat.baseRadius * 2.0;
    // Strengthen element-specific atmosphere for the central planet as well
    const element = (planetData && (planetData as any).element) || null;
    const tunedAtmosphere = planetData.atmosphere ? {
      ...planetData.atmosphere,
      color: (element === 'heart') ? '#FC54AF' : (element === 'lightning') ? '#FFD84D' : planetData.atmosphere.color,
      glow: (element === 'heart') ? Math.max(planetData.atmosphere.glow || 0, 1.3) : (element === 'lightning') ? Math.max(planetData.atmosphere.glow || 0, 1.6) : (planetData.atmosphere.glow || 1.0),
    } : undefined;
    const enhancedPlanetData = {
      ...planetData,
      atmosphere: tunedAtmosphere,
      radius: centralRadius
    };
    
    // Enhanced geometry for central planet
    const centralGeometry = enhancedPlanetData.geometry || {
      segments: { widthSegments: 256, heightSegments: 256 }, // Ultra high quality
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.05,
      poleFlattening: 0.02,
      surfaceRoughness: 0.5
    };
    
    const isHeartPlanet = false; // Center heart planet handled by separate HeartPlanet component
    const centralGeo = createPlanetGeometry(centralRadius, centralGeometry, isHeartPlanet);
    const centralMat = makePlanetMaterial({ ...enhancedPlanetData, seed: (enhancedPlanetData as any).seed ?? Math.random() * 1000 });
    const centralMesh = new THREE.Mesh(centralGeo, centralMat);
    
    // Add atmosphere to central planet - disabled to remove blue spheres around planets
    // if (enhancedPlanetData.atmosphere && !isHeartPlanet) {
    //   const atmosphereMat = makeAtmosphereMaterial(enhancedPlanetData);
    //   if (atmosphereMat) {
    //     const atmosphereGeo = new THREE.SphereGeometry(centralRadius * 1.05, 64, 64);
    //     const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    //     centralMesh.add(atmosphereMesh);
    //   }
    // }
    
    // Hologram wireframe shell on central planet - disabled to remove blue spheres around planets
    // if (!isHeartPlanet) {
    //   try {
    //     const wireGeo = new THREE.SphereGeometry(centralRadius * 1.01, 48, 32);
    //     const wireMat = new THREE.MeshBasicMaterial({ color: 0x19E3FF, wireframe: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
    //     const wire = new THREE.Mesh(wireGeo, wireMat);
    //     centralMesh.add(wire);
    //   } catch {}
    // }

    // Add rings to central planet if it has them
    if (enhancedPlanetData.rings) {
      const rings = enhancedPlanetData.rings;
      const ringGeometry = new THREE.RingGeometry(
        centralRadius * rings.innerRadius,
        centralRadius * rings.outerRadius,
        64
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      centralMesh.add(ringMesh);
    }
    
    // Add weather systems to central planet (skip cloud layers for heart planets)
    if (enhancedPlanetData.weather?.cloudLayers && !isHeartPlanet) {
      enhancedPlanetData.weather.cloudLayers.forEach((cloudLayer) => {
        const cloudGeometry = new THREE.SphereGeometry(
          centralRadius * cloudLayer.height,
          64,
          64
        );
        const cloudMaterial = createCloudMaterial(cloudLayer);
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        centralMesh.add(cloudMesh);
      });
    }
    
    if (enhancedPlanetData.weather?.storms) {
      enhancedPlanetData.weather.storms.forEach((storm) => {
        const stormGeometry = new THREE.PlaneGeometry(
          centralRadius * storm.size * 2,
          centralRadius * storm.size * 2,
          32,
          32
        );
        const stormMaterial = createStormMaterial(storm);
        const stormMesh = new THREE.Mesh(stormGeometry, stormMaterial);
        
        // Position storm on central planet surface
        const stormAngle = Math.random() * Math.PI * 2;
        const stormLat = (Math.random() - 0.5) * Math.PI;
        const stormDistance = centralRadius * 1.001;
        
        stormMesh.position.set(
          Math.cos(stormAngle) * Math.cos(stormLat) * stormDistance,
          Math.sin(stormLat) * stormDistance,
          Math.sin(stormAngle) * Math.cos(stormLat) * stormDistance
        );
        
        stormMesh.lookAt(centralMesh.position);
        stormMesh.rotateY(Math.PI);
        
        if (Math.random() < storm.frequency) {
          centralMesh.add(stormMesh);
        }
      });
    }
    
    // Position at TRUE center with elemental planets
    centralMesh.position.set(0, 0, 0);
    centralMesh.scale.set(1.6, 1.6, 1.6); // Start even larger
    centralMesh.visible = true; // Ensure central planet is visible
    sys.add(centralMesh);
    
    
    // Update central planet reference
    centralPlanetRef.current = {
      id: id,
      mesh: centralMesh,
      originalSat: sat
    };
    
    // Set camera to focus on the central planet with cinematic positioning
    // ONLY set focused camera if not in showAll mode
    if (!showAll) {
      const planetColor = new THREE.Color(enhancedPlanetData.color || '#38B6FF');
      const isWarmColor = planetColor.r > 0.6 || (planetColor.r + planetColor.g) > 1.0;
      
      // Dynamic camera positioning based on planet characteristics - better framing for HUD display
      const baseDistance = 18.0; // Increased distance for better framing in HUD
      const focusDistance = baseDistance * (isWarmColor ? 1.0 : 0.95); // Slightly closer for warm colors to show detail
      const heightOffset = isWarmColor ? 1.8 : 1.5; // Adjusted height for better viewing angle
      
      // Set target camera position - focused on selected planet
      targetCameraPos.current.set(0, heightOffset, focusDistance);
      targetCameraLookAt.current.set(0, 0, 1.2); // Look directly at central planet position
    }
    
    // Immediate focus with faster initial transition for dramatic effect
    cameraTransitionSpeed.current = 0.25; // Start with fast transition for immediate focus
    
    // Set up a timer to slow down the transition after initial focus
    setTimeout(() => {
      if (cameraTransitionSpeed.current > 0.15) {
        cameraTransitionSpeed.current = 0.15; // Slow down for smooth fine-tuning
      }
    }, 500);
    
    // Create particle system for gravitational effects
    if (!particleSystemRef.current) {
      const scene = sys.parent as THREE.Scene;
      if (scene) {
        createGravitationalParticles(scene, enhancedPlanetData.color || '#38B6FF');
      }
    } else {
      // Update existing particle system color
      if (particleUniforms.current) {
        particleUniforms.current.uCentralColor.value.set(enhancedPlanetData.color || '#38B6FF');
        particleUniforms.current.uCentralPos.value.set(0, 0, 1.2);
      }
    }
    
    // Create connection lines to orbiting planets
    const scene = sys.parent as THREE.Scene;
    if (scene) {
      const visibleSatellites = satsRef.current.filter(sat => sat.mesh.visible);
      createConnectionLines(scene, visibleSatellites, new THREE.Vector3(0, 0, 1.2), enhancedPlanetData.color || '#38B6FF');
    }
    
    // Reset system rotation to face forward since central planet is now at origin
    focusTargetRy.current = 0;
    
  }, [mainId]);

  // Hover behavior handled in main tick via hoverRef

  // Fade logic: hide when a song is selected but not yet playing; otherwise visible
  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      data-planet-system="true"
      style={{
        background: 'transparent',
        // Gate visibility by global planetsVisible and respect 'hidden' mode (during warp)
        // CRITICAL: On true homepage overview (showAll + no main selection), always show planets
        opacity: isHomeOverview ? 1 : (planetsVisible && effectiveMode !== 'hidden' ? 1 : 0),
        transition: 'opacity 400ms ease-in-out'
      }}
      onLoad={() => { if (process.env.NODE_ENV !== "production") console.log('🚀 PLANETSYSTEMRAW COMPONENT IS DEFINITELY RENDERING!'); }}
      ref={(el) => {
        if (el && process.env.NODE_ENV !== "production") console.log('🎯 PLANETSYSTEMRAW DOM ELEMENT CREATED!', el);
      }}
    >

      {/* WORKING ZOOM CONTROLS - Top Left Corner */}
      <div 
        className="absolute top-4 left-4 flex items-center gap-2"
        style={{ zIndex: 999999, pointerEvents: 'auto' }}
      >
        {/* Zoom Out Button */}
        <button
          onClick={() => {
            if (process.env.NODE_ENV !== "production") console.log('🔍 ZOOM OUT!');
            if (cameraRef.current && sceneRef.current) {
              const camera = cameraRef.current;
              const currentPos = camera.position.clone();
              const targetPos = currentPos.multiplyScalar(1.3); // Move camera further away
              camera.position.copy(targetPos);
              // Keep the camera target in sync
              targetCameraPos.current.copy(camera.position);
              targetCameraLookAt.current.set(0, 0, 0);
            }
          }}
          className="bg-cyan-500/80 hover:bg-cyan-500 border-2 border-white rounded text-white text-lg font-bold transition-colors duration-200 w-10 h-10 flex items-center justify-center shadow-lg"
          title="Zoom Out"
        >
          −
        </button>
        
        {/* Zoom In Button */}
        <button
          onClick={() => {
            if (process.env.NODE_ENV !== "production") console.log('🔍 ZOOM IN!');
            if (cameraRef.current && sceneRef.current) {
              const camera = cameraRef.current;
              const currentPos = camera.position.clone();
              const targetPos = currentPos.multiplyScalar(0.8); // Move camera closer
              camera.position.copy(targetPos);
              // Keep the camera target in sync
              targetCameraPos.current.copy(camera.position);
              targetCameraLookAt.current.set(0, 0, 0);
            }
          }}
          className="bg-cyan-500/80 hover:bg-cyan-500 border-2 border-white rounded text-white text-lg font-bold transition-colors duration-200 w-10 h-10 flex items-center justify-center shadow-lg"
          title="Zoom In"
        >
          +
        </button>
        
        {/* Camera Reset Button */}
        <button
          onClick={() => {
            if (process.env.NODE_ENV !== "production") console.log('🎯 RESET CAMERA!');
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 8, 25);
              cameraRef.current.lookAt(0, 0, 0);
              // Sync targets so no snap-back
              targetCameraPos.current.set(0, 8, 25);
              targetCameraLookAt.current.set(0, 0, 0);
            }
          }}
          className="bg-yellow-500/80 hover:bg-yellow-500 border-2 border-white rounded text-black text-xs font-bold transition-colors duration-200 px-2 py-1"
          title="Reset Camera"
        >
          RESET
        </button>
      </div>

      {/* Minimap Toggle Button */}
      <button
        onClick={() => setIsMinimapVisible(!isMinimapVisible)}
        className="absolute top-4 right-4 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 rounded text-cyan-400 text-xs font-bold transition-colors duration-200 px-2 py-1 flex items-center gap-1"
        style={{ zIndex: 999998 }}
        title={isMinimapVisible ? "Hide minimap" : "Show minimap"}
      >
        <span className="text-xs">🗺️</span>
        <span className="text-xs">{isMinimapVisible ? "Hide" : "Show"}</span>
      </button>
      
      {/* 2D Minimap overlay - show when enabled */}
      {isMinimapVisible && (
        <PlanetMinimap 
          currentMainId={mainId} 
          hoverId={hoverId} 
          songs={songs}
          onClose={() => setIsMinimapVisible(false)}
        />
      )}
    </div>
  );
}
