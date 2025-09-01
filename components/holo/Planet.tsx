"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Mesh, AdditiveBlending, Color, DataTexture, RGBAFormat, UnsignedByteType, RepeatWrapping, Vector2, Vector3, Texture, TextureLoader, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";
import HoloMaterial from "@/components/HoloMaterial";
import { usePlayerStore } from "@/store/usePlayerStore";
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
  const BASE_SCALE = 0.85;
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

  const { mainId, hoverId } = usePlayerStore((s) => ({ mainId: s.mainId, hoverId: s.hoverId }));
  // Compute color first to avoid TDZ when referenced below
  const color = useMemo(() => song.planet.color || "#3DF5FF", [song.planet.color]);
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
  // Deterministic jitter so orbiting planets don't overlap perfectly
  const idHash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < song.id.length; i++) h = (h * 31 + song.id.charCodeAt(i)) | 0;
    return h;
  }, [song.id]);
  const jitter = ((idHash % 1000) / 1000 - 0.5) * 0.4; // wider placement jitter [-0.2, 0.2]
  // Per-planet size variation so planets aren't uniform
  const sizeVar = (idHash % 997) / 997; // [0,1)
  const satelliteSizeJitter = 0.8 + sizeVar * 0.45; // 0.80 .. 1.25
  const mainSizeJitter = 0.95 + sizeVar * 0.10;     // 0.95 .. 1.05 (subtle)
  // Push satellites a bit further out on the shared ring
  // Keep system within left HUD column: tighten satellite ring radius
  const ringBase = 6.0; // push satellites further out for even more spacing
  // Larger outward nudge on hover
  const orbitTarget = isMain ? 0 : (isMoon ? 2.0 : ringBase) + jitter + (isHover ? 1.0 : 0);
  const base = song.planet.radius * BASE_SCALE;
  // Make both main and satellites dramatically larger
  const MAIN_MULT = 9.5; // reduce main planet size for better balance
  const ORBIT_MULT = isMoon ? 0.26 : 0.36; // reduce satellite + moon size slightly
  const HOVER_MULT = 1.25;
  const scaleTarget = isMain
    ? base * MAIN_MULT * mainSizeJitter
    : (isHover ? base * ORBIT_MULT * HOVER_MULT : base * ORBIT_MULT) * satelliteSizeJitter;

  // Layout fields (concentric rings + golden-angle)
  const layout = usePlanetLayout(song.id);
  const layoutOrbit = layout?.orbitRadius ?? orbitTarget;
  const layoutTiltDeg = layout?.tiltDeg ?? (song.planet.tilt * (180 / Math.PI));
  const layoutEcc = layout?.ecc ?? 0.0;
  const layoutAngle0 = layout?.angle0 ?? angleRef.current;

  // Element-based tweaks (non-destructive): radius/speed/wobble/scale tinting done as computed fields
  const element = (song as any)?.planet?.element as ("water"|"fire"|"lightning"|"heart"|"moon"|"magic"|"darkness"|undefined);
  const radiusMul = element === "water" ? 1.04 : element === "fire" ? 0.96 : 1.0;
  const speedMul = element === "water" ? 0.92 : element === "fire" ? 1.08 : element === "lightning" ? 1.10 : 1.0;
  const wobbleExtra = element === "lightning" ? 0.01 : 0.0;
  const scaleMul = element === "heart" ? 1.06 : 1.0;

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
    return () => unregisterPlanet(song.id);
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
      const size = 128;
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
      const bandFreq = 6 + (ph % 5);
      const noise = (x: number, y: number) => {
        const n = Math.sin(x * 0.27 + phase) * Math.cos(y * 0.23 - phase * 1.7) + Math.sin((x + y) * 0.11 + phase * 2.3);
        return n * 0.5;
      };
      let p = 0; let idx = 0;
      for (let j = 0; j < size; j++) {
        const v = j / (size - 1);
        const lat = (v - 0.5) * 2;
        for (let i = 0; i < size; i++) {
          const n = noise(i, j);
          // Element-based latitude bands + optional lightning streaks (longitude)
          let bands = 0.5 + 0.5 * Math.sin(lat * bandFreq + n * 1.4);
          // Rough element inference from color if element not passed
          const elemColor = (song as any)?.planet?.element || '';
          const isWater = (elemColor || '').toLowerCase() === 'water';
          const isEarth = (elemColor || '').toLowerCase() === 'earth';
          const isDark = (elemColor || '').toLowerCase() === 'darkness';
          const isLightning = (elemColor || '').toLowerCase() === 'lightning';
          const bandBoost = isWater ? 1.4 : isEarth ? 0.9 : isDark ? 0.8 : 1.05;
          bands = 0.5 + (bands - 0.5) * bandBoost;
          if (isLightning) {
            const lon = Math.sin((i + ph) * 0.22) * Math.cos((j - ph) * 0.176);
            bands = Math.min(1.0, Math.max(0.0, bands + 0.25 * lon));
          }
          const mixT = Math.min(1, Math.max(0, bands * 0.85 + (n + 0.5) * 0.15));
          // Base color from bands
          const c = dark.clone().lerp(light, mixT);
          // Low-frequency dark spots (craters) mask — stronger influence
          const nx = Math.sin((i + ph) * 0.045) * Math.cos((j - ph) * 0.04) * 0.5 + 0.5; // [0,1]
          const spotsRaw = Math.max(0, (nx - 0.42) / 0.58); // much wider coverage
          const spots = Math.pow(spotsRaw, 0.9); // boost contrast a bit
          const core = Math.max(0, (nx - 0.78) / 0.22); // crater cores
          // Crater darkness by element
          let craterShadeMax = isEarth ? 0.75 : isDark ? 0.8 : isWater ? 0.4 : 0.65;
          const shade = 1.0 - (craterShadeMax * spots + 0.2 * core);
          dataColor[p] = Math.floor(c.r * 255 * shade);
          dataColor[p + 1] = Math.floor(c.g * 255 * shade);
          dataColor[p + 2] = Math.floor(c.b * 255 * shade);
          dataColor[p + 3] = 255;
          // Height: add deeper depressions where spots occur
          const craterDepthMul = isEarth ? 0.35 : isDark ? 0.32 : isWater ? 0.12 : 0.28;
          const h = (mixT * 0.55 + (n + 0.5) * 0.45) * (1.0 - (craterDepthMul * spots + 0.08 * core));
          dataHeight[idx] = h;
          const rough = 0.6 + (1.0 - h) * 0.35;
          // Increase roughness in dark spots for more matte look (stronger)
          const rr = Math.floor(Math.min(1, Math.max(0, rough + 0.28 * spots + 0.1 * core)) * 255);
          dataRough[p] = rr; dataRough[p + 1] = rr; dataRough[p + 2] = rr; dataRough[p + 3] = 255;
          const cn = Math.sin((i + ph) * 0.07) * Math.cos((j - ph) * 0.05) * 0.5 + 0.5;
          const ca = cn > 0.86 ? (cn - 0.86) * 4.5 : 0.0;
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

    // Respect computed layout + element tweaks (non-destructive)
    const targetR = (isMain ? 0 : layoutOrbit) * radiusMul;
    orbitRadiusRef.current = lerp(orbitRadiusRef.current, targetR, orbitLerp);
    const layoutScale = (layout?.scale ?? 1) * scaleMul;
    scaleRef.current = lerp(scaleRef.current, scaleTarget * layoutScale, scaleLerp);

    // Angular velocity from existing orbitSpeed
    angleRef.current += (speedTarget * speedMul) * d;

    // Elliptical orbit + wobble + tilt
    const a = orbitRadiusRef.current;
    const b = a * (1.0 - layoutEcc);
    const t = state.clock.elapsedTime;
    // damp phase target into offset (gentle)
    const phaseDamp = 1 - Math.exp(-d / 0.5);
    phaseOffsetRef.current += (phaseTargetRef.current - phaseOffsetRef.current) * phaseDamp;
    const theta = (layoutAngle0 + angleRef.current + phaseOffsetRef.current);
    let x = a * Math.cos(theta);
    let z = b * Math.sin(theta);
    const hoverWobble = isHover && !isMain ? 0.005 : 0.0;
    x += (0.02 + wobbleExtra + hoverWobble) * Math.sin(t * 0.9 + (idHash % 17));
    z += (0.02 + wobbleExtra + hoverWobble) * Math.sin(t * 1.1 + (idHash % 31));
    const tilt = MathUtils.degToRad(layoutTiltDeg || 0);
    const zt = z * Math.cos(tilt);
    const yt = z * Math.sin(tilt);

    if (groupRef.current) {
      groupRef.current.position.set(x, yt, zt);
      groupRef.current.rotation.x = tilt;
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
      meshRef.current.rotation.y += rotSpeed * d;
      // Subtle oscillating pulse on hover (+heart pulse)
      const hPulse = isHover ? 1 + 0.03 * Math.sin(state.clock.elapsedTime * 6) : 1;
      const heartPulse = element === 'heart' ? (1 + 0.06 * Math.sin(state.clock.elapsedTime * 2.4)) : 1.0;
      const finalScale = scaleRef.current * hPulse * heartPulse;
      meshRef.current.scale.setScalar(finalScale);
      const m: any = (meshRef.current.material as any);
      if (m && typeof m.opacity === 'number') m.opacity = (isMain ? 0.62 : 0.52) * depthLocal;
      (m as any).clearcoat = 0.25;
    }
    // Throttled state update to refresh HoloMaterial uniforms for depth
    if (Number.isFinite(depthLocal) && Math.abs(depthLocal - depthFactor) > 0.03) {
      setDepthFactor(depthLocal);
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
      {/* Decorative rings around main planet (shown when centered) */}
      {isMain && (
        <>
          <mesh ref={mainRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.12, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh ref={mainRingRef2} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.18, 1.28, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.3}
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

      {/* Core planet body: keep edges clean with higher opacity */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          map={colorTex}
          normalMap={normalTex}
          roughnessMap={roughTex}
          color={"white"}
          metalness={0.0}
          roughness={0.95}
          clearcoat={0.25}
          clearcoatRoughness={0.6}
          normalScale={new Vector2(0.6, 0.6)}
          envMapIntensity={0.25}
          transparent
          opacity={isMain ? 0.62 : 0.52}
          depthWrite
        />
      </mesh>

      {/* Hologram overlay shell (additive): inset slightly so it doesn't soften the silhouette */}
      <mesh scale={0.998}>
        <sphereGeometry args={[1, 64, 64]} />
        <HoloMaterial
          baseColor={baseColor}
          glowColor={innerColor}
          scanIntensity={isMain ? 0.3 : (isHover ? 0.28 : 0.24)}
          fresnelPower={(isMain ? 2.6 : 2.2) * (element === 'darkness' ? 1.12 : 1.0)}
          brighten={isMain ? 1.35 : (isHover ? 1.45 : 1.35)}
          alpha={(isMain ? 0.18 : (isHover ? 0.18 : 0.12)) * (element === 'darkness' ? 0.9 : 1.0)}
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

      {/* Soft cloud layer slightly above the surface for parallax (tighter to surface for crisp edge) */}
      <mesh ref={cloudsRef} scale={1.005}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={"white"} transparent opacity={0.03} map={cloudsTex} depthWrite={false} />
      </mesh>
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
