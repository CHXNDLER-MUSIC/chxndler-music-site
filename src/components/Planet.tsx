"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide } from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FresnelMat from "@/src/components/FresnelMaterial";
import { useMemo, useRef } from "react";
import { useStore, type Song } from "@/src/store";
import { seedToHSL, hslToHex } from "@/src/lib/color";
import { useReducedMotion } from "@/src/lib/motion";
import { DataTexture, RGBAFormat, UnsignedByteType } from "three";

function Rings({ color = new Color("#19E3FF"), opacity = 0.4 }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}
            position={[0, 0, 0]}
      >
        <ringGeometry args={[1.6, 2.4, 64]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <ringGeometry args={[2.6, 2.9, 64]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.6} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function ProjectionCone({ intensity = 0.5 }) {
  const ref = useRef<any>();
  useFrame((_, dt) => {
    if (ref.current) {
      const t = performance.now() * 0.001;
      ref.current.material.opacity = 0.15 + 0.35 * intensity * (0.8 + 0.2 * Math.sin(t * 2));
    }
  });
  return (
    <mesh ref={ref} rotation={[Math.PI, 0, 0]} position={[0, -1.4, 0]}>
      <coneGeometry args={[2.4, 3.0, 48, 1, true]} />
      <meshBasicMaterial color={new Color("#19E3FF")} transparent opacity={0.2} blending={AdditiveBlending} side={DoubleSide} />
    </mesh>
  );
}

function PlanetMesh({ song, proximity, state }: { song: Song; proximity: number; state: "idle" | "preview" | "selected" }) {
  const mesh = useRef<any>();
  const mat = useRef<any>();
  const hsl = useMemo(() => seedToHSL(song.seed), [song.seed]);
  const base = useMemo(() => new Color(hslToHex(hsl.h, 80, 55)), [hsl]);
  const reduced = useReducedMotion();

  // Tiny procedural normal map to add subtle surface detail (very light)
  const normalTex = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    let idx = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Pseudo-noise: hash grid with seed; centered near 128
        const n = (Math.sin((x * 12.9898 + y * 78.233 + song.seed) * 0.05) * 43758.5453) % 1;
        const v = 120 + ((n - Math.floor(n)) * 16);
        data[idx++] = v;      // R ~ X normal
        data[idx++] = 128;    // G ~ Y normal
        data[idx++] = 255 - v; // B ~ Z normal
        data[idx++] = 255;    // A
      }
    }
    const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = 1000; // RepeatWrapping
    return tex;
  }, [song.seed]);

  useFrame((_, dt) => {
    if (!mesh.current || !mat.current) return;
    const idleE = 0.2;
    const selE = 1.0;
    const preE = 0.2 + 0.4 * proximity;
    const targetE = state === "selected" ? selE : state === "preview" ? preE : idleE;
    mat.current.emissiveIntensity += (targetE - mat.current.emissiveIntensity) * (reduced ? 0.2 : 0.1);

    const idleS = 0.9;
    const preS = 1.0 + 0.05 * proximity;
    const selS = 1.2;
    const targetS = state === "selected" ? selS : state === "preview" ? preS : idleS;
    const s = mesh.current.scale.x + (targetS - mesh.current.scale.x) * (reduced ? 0.2 : 0.12);
    mesh.current.scale.setScalar(s);

    mesh.current.rotation.y += (reduced ? 0.02 : 0.05) * dt;
  });

  return (
    <group>
      <mesh ref={mesh} position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial ref={mat}
          color={base}
          emissive={base}
          emissiveIntensity={0.25}
          roughness={0.6}
          metalness={0.1}
          normalMap={normalTex}
          normalScale={[0.15, 0.15] as any}
        />
      </mesh>
      {/* Fresnel rim shell */}
      <mesh scale={1.26}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <fresnelMat uColor={base} uPower={2.5} uIntensity={state === 'selected' ? 1.4 : state === 'preview' ? 1.0 : 0.6} transparent blending={AdditiveBlending} />
      </mesh>
      <Rings color={base} opacity={state === "selected" ? 0.8 : state === "preview" ? 0.5 : 0.2} />
      <ProjectionCone intensity={state === "selected" ? 1 : state === "preview" ? Math.max(0.4, proximity) : 0.2} />
    </group>
  );
}

export function PlanetCanvas({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const songs = useStore((s) => s.songs);
  const previewId = useStore((s) => s.previewId);
  const selectedId = useStore((s) => s.selectedId);
  const active = useMemo(() => songs.find(s => (selectedId ?? previewId) === s.id) || songs[0], [songs, previewId, selectedId]);
  // proximity ~ if selected, 1; else if preview, 1; else 0.2 (simple for demo; real value is from list)
  const isSelected = !!selectedId && selectedId === active.id;
  const proximity = isSelected ? 1 : 0.9;
  const state: "idle" | "preview" | "selected" = isSelected ? "selected" : previewId ? "preview" : "idle";

  return (
    <Canvas camera={{ position: [0, compact ? 1.4 : 1.8, compact ? 4.2 : 5.2], fov: compact ? 52 : 48 }} dpr={[1, 1.5]} gl={{ alpha: true }} className={className}>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 6, 4]} intensity={1.2} />
      <group position={[0, 0, 0]}>
        <PlanetMesh song={active} proximity={proximity} state={state} />
      </group>
      <EffectComposer>
        <Bloom intensity={compact ? 0.45 : 0.6} luminanceThreshold={0.22} luminanceSaturation={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
