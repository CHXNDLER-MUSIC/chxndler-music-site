"use client";

import React, { useMemo, useRef } from "react";
import { Group, Mesh, AdditiveBlending, Color, DataTexture, RGBAFormat, UnsignedByteType, RepeatWrapping } from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Song } from "@/data/songs";

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
  // Global size scaling; satellites small, main larger
  const BASE_SCALE = 0.38;
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const outlineRef = useRef<Mesh>(null);
  const mainRingRef = useRef<Mesh>(null);
  const mainRingRef2 = useRef<Mesh>(null);

  const angleRef = useRef(Math.random() * Math.PI * 2);
  const orbitRadiusRef = useRef(song.planet.orbitRadius);
  const scaleRef = useRef(song.planet.radius * BASE_SCALE);

  const { mainId, hoverId } = usePlayerStore((s) => ({ mainId: s.mainId, hoverId: s.hoverId }));
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
  const speedTarget = isHover ? speedBase * 1.8 : isMoon ? speedBase * 0.5 : speedBase;
  // Deterministic jitter so orbiting planets don't overlap perfectly
  const idHash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < song.id.length; i++) h = (h * 31 + song.id.charCodeAt(i)) | 0;
    return h;
  }, [song.id]);
  const jitter = ((idHash % 1000) / 1000 - 0.5) * 0.3; // [-0.15, 0.15]
  const ringBase = 2.3;
  const orbitTarget = isMain ? 0 : isMoon ? 0.9 : ringBase + jitter + (isHover ? 0.2 : 0);
  const base = song.planet.radius * BASE_SCALE;
  const MAIN_MULT = 1.55; // ~dominant center (~40% of box height visually)
  const ORBIT_MULT = 0.18;
  const HOVER_MULT = 1.06;
  const scaleTarget = isMain ? base * MAIN_MULT : isHover ? base * ORBIT_MULT * HOVER_MULT : base * ORBIT_MULT;

  const color = useMemo(() => song.planet.color || "#3DF5FF", [song.planet.color]);
  const ringColor = useMemo(() => {
    const hex = (color || "#3DF5FF").replace('#','');
    const r = parseInt(hex.substring(0,2) || '00', 16);
    const g = parseInt(hex.substring(2,4) || '00', 16);
    const b = parseInt(hex.substring(4,6) || '00', 16);
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 30 ? '#19E3FF' : color;
  }, [color]);

  // Procedural surface: color map + bump map for more realistic look
  const { colorTex, bumpTex } = useMemo(() => {
    const size = 128;
    const base = new Color(color);
    const light = base.clone().lerp(new Color('#ffffff'), 0.25);
    const dark = base.clone().multiplyScalar(0.55);
    const dataColor = new Uint8Array(size * size * 4);
    const dataBump = new Uint8Array(size * size * 4);
    // simple seeded phase
    let ph = 0;
    for (let i = 0; i < song.id.length; i++) ph = (ph * 31 + song.id.charCodeAt(i)) % 9973;
    const phase = ph * 0.001;
    const bandFreq = 7 + (ph % 5);
    const noise = (x: number, y: number) => {
      const n = Math.sin(x * 0.27 + phase) * Math.cos(y * 0.23 - phase * 1.7) + Math.sin((x + y) * 0.11 + phase * 2.3);
      return n * 0.5; // ~[-1,1] -> [-0.5,0.5]
    };
    let p = 0;
    for (let j = 0; j < size; j++) {
      const v = j / (size - 1);
      const lat = (v - 0.5) * 2; // -1..1
      for (let i = 0; i < size; i++) {
        const u = i / (size - 1);
        // bands + noise
        const n = noise(i, j);
        const bands = 0.5 + 0.5 * Math.sin(lat * bandFreq + n * 1.4);
        const mixT = Math.min(1, Math.max(0, bands * 0.85 + (n + 0.5) * 0.15));
        const c = dark.clone().lerp(light, mixT);
        dataColor[p] = Math.floor(c.r * 255);
        dataColor[p + 1] = Math.floor(c.g * 255);
        dataColor[p + 2] = Math.floor(c.b * 255);
        dataColor[p + 3] = 255;
        // bump height from bands/noise
        const h = mixT * 0.5 + (n + 0.5) * 0.5; // 0..1
        const hh = Math.floor(h * 255);
        dataBump[p] = hh; dataBump[p + 1] = hh; dataBump[p + 2] = hh; dataBump[p + 3] = 255;
        p += 4;
      }
    }
    const texColor = new DataTexture(dataColor, size, size, RGBAFormat, UnsignedByteType);
    texColor.needsUpdate = true; texColor.wrapS = texColor.wrapT = RepeatWrapping;
    const texBump = new DataTexture(dataBump, size, size, RGBAFormat, UnsignedByteType);
    texBump.needsUpdate = true; texBump.wrapS = texBump.wrapT = RepeatWrapping;
    return { colorTex: texColor, bumpTex: texBump };
  }, [song.id, color]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.033);
    orbitRadiusRef.current = lerp(orbitRadiusRef.current, orbitTarget, isHover ? 0.25 : 0.12);
    scaleRef.current = lerp(scaleRef.current, scaleTarget, 0.15);

    angleRef.current += speedTarget * d;

    const r = orbitRadiusRef.current;
    const theta = angleRef.current;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = 0;

    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.rotation.x = song.planet.tilt;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.8 * d;
      // Subtle oscillating pulse on hover
      const hPulse = isHover ? 1 + 0.03 * Math.sin(state.clock.elapsedTime * 6) : 1;
      const finalScale = scaleRef.current * hPulse;
      meshRef.current.scale.setScalar(finalScale);
      const ePulse = isMain ? 0.6 + 0.5 * Math.sin(state.clock.elapsedTime * 4) : isHover ? 0.2 : 0.06;
      (meshRef.current.material as any).emissiveIntensity = (isMain ? 0.7 : 0.35) + ePulse;
    }
    if (outlineRef.current) {
      outlineRef.current.rotation.z += 0.1 * d;
      const mat: any = (outlineRef.current as any).material;
      if (mat && typeof mat.opacity === "number") {
        mat.opacity = isHover ? 0.5 + 0.15 * Math.sin(state.clock.elapsedTime * 6) : 0.25;
      }
    }

    // Animate decorative main rings (pulse scale softly)
    if (isMain) {
      const pulse = 1 + 0.04 * Math.sin(state.clock.elapsedTime * 2.6);
      const s = scaleRef.current * 1.35 * pulse;
      if (mainRingRef.current) mainRingRef.current.scale.setScalar(s);
      if (mainRingRef2.current) mainRingRef2.current.scale.setScalar(s * 1.06);
    }
  });

  const ringInner = Math.max(orbitRadiusRef.current - 0.012, 0);
  const ringOuter = orbitRadiusRef.current + 0.012;

  return (
    <group ref={groupRef}>
      {/* Decorative rings around main planet (shown when centered) */}
      {isMain && (
        <>
          <mesh ref={mainRingRef} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.95, 1.12, 128]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh ref={mainRingRef2} rotation-x={-Math.PI / 2}>
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
          <mesh rotation-x={-Math.PI / 2} ref={outlineRef}>
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
          <mesh rotation-x={-Math.PI / 2}>
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

      {/* Outer glow shell (additive) */}
      <mesh scale={scaleRef.current * (isMain ? 1.7 : 1.35)}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isMain ? 0.1 : 0.08} depthWrite={false} blending={AdditiveBlending} />
      </mesh>

      {/* Core planet: PBR material with procedural surface maps for realistic shading */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={new Color('#ffffff')}
          map={colorTex as any}
          bumpMap={bumpTex as any}
          bumpScale={isMain ? 0.08 : 0.05}
          metalness={0.04}
          roughness={0.9}
          emissive={new Color(color)}
          emissiveIntensity={isMain ? 0.18 : 0.1}
          transparent
          opacity={0.98}
        />
      </mesh>

      {/* Hover flare */}
      <mesh scale={scaleRef.current * 1.9} visible={isHover}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} blending={AdditiveBlending} />
      </mesh>

      {/* Soft inner aura */}
      <mesh scale={scaleRef.current * 1.25}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isMain ? 0.1 : 0.05} depthWrite={false} blending={AdditiveBlending} />
      </mesh>

      {/* Atmosphere shell (additive fresnel-like) */}
      <mesh scale={scaleRef.current * 1.35}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isMain ? 0.08 : 0.04} depthWrite={false} blending={AdditiveBlending} side={2} />
      </mesh>

      <Html distanceFactor={10} position={[0, scaleRef.current + 0.2, 0]} center>
        <div className="px-1.5 py-[2px] rounded-md text-[10px] md:text-[11px] bg-cyan-400/10 ring-1 ring-cyan-300/50 text-cyan-100 whitespace-nowrap">
          {song.title}
          {song.id === mainId ? " • MAIN" : song.id === hoverId ? " • HOVER" : ""}
        </div>
      </Html>
    </group>
  );
}
