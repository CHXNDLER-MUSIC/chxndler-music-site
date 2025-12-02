"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { buildPlanetSongs, ELEMENT_COLORS, type Element } from "@/lib/planets";

type Element4 = "heart" | "water" | "lightning" | "darkness";

interface HeartverseSolarSystemProps {
  songs?: Array<{ id: string; title?: string; element?: Element4; planet?: { element?: Element4 } }>;
  onSongClick?: (songId: string) => void;
}

// Simple sphere helper
function Sphere({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}

export default function HeartverseSolarSystem({ songs: propSongs, onSongClick }: HeartverseSolarSystemProps) {
  const systemRef = useRef<Group>(null);

  // Source songs: use provided or build from library
  const songs = useMemo(() => {
    if (propSongs && propSongs.length) return propSongs;
    try {
      const { holoSongs } = buildPlanetSongs();
      return holoSongs.map((s: any) => ({ id: s.id, element: s.planet?.element as Element4 }));
    } catch {
      return [] as Array<{ id: string; element?: Element4 }>;
    }
  }, [propSongs]);

  // Group songs by element
  const grouped = useMemo(() => {
    const g: Record<Element4, Array<{ id: string }>> = {
      heart: [],
      water: [],
      lightning: [],
      darkness: [],
    };
    songs.forEach((s) => {
      const e = (s.planet?.element || s.element || "heart") as Element4;
      if (g[e]) g[e].push({ id: s.id });
    });
    return g;
  }, [songs]);

  // Slow rotation for the whole system
  useFrame((_, delta) => {
    if (systemRef.current) systemRef.current.rotation.y += delta * 0.05;
  });

  // Orbit params
  const centerRadius = 6;
  const elementRadius = 6; // radius of elemental planets themselves
  const orbitRadius = 22; // distance from center
  const elementSpeeds: Record<Element4, number> = {
    heart: 0.2,
    water: 0.15,
    lightning: 0.25,
    darkness: 0.12,
  };
  const songRingRadius = 6; // radius of song ring around its elemental planet

  const elementAngles = useRef<Record<Element4, number>>({ heart: 0, water: 0, lightning: 0, darkness: 0 });
  useFrame((_, delta) => {
    (Object.keys(elementSpeeds) as Element4[]).forEach((e) => {
      elementAngles.current[e] += delta * elementSpeeds[e];
    });
  });

  const elementOrder: Element4[] = ["water", "heart", "lightning", "darkness"];

  return (
    <group ref={systemRef}>
      {/* Center planet */}
      <Sphere radius={centerRadius} color={ELEMENT_COLORS.heart} />

      {/* Four elemental planets orbiting center */}
      {elementOrder.map((e, i) => {
        const ang = elementAngles.current[e] + (i * Math.PI) / 2; // spaced 90° apart
        const ex = Math.cos(ang) * orbitRadius;
        const ez = Math.sin(ang) * orbitRadius;
        const color = ELEMENT_COLORS[e as unknown as Element];
        const songsForE = grouped[e];

        return (
          <group key={e} position={[ex, 0, ez] as any}>
            {/* Big elemental planet */}
            <Sphere radius={elementRadius} color={color} />

            {/* Song planets orbiting the elemental planet */}
            <group rotation={[0, ang * 2, 0] as any}>
              {songsForE.map((s, idx) => {
                const angleStep = (2 * Math.PI) / Math.max(1, songsForE.length);
                const sa = idx * angleStep;
                const sx = Math.cos(sa) * songRingRadius;
                const sz = Math.sin(sa) * songRingRadius;
                return (
                  <group key={s.id} position={[sx, 0, sz] as any}
                         onClick={() => onSongClick && onSongClick(s.id)}>
                    <Sphere radius={1.2} color={color} />
                  </group>
                );
              })}
            </group>
          </group>
        );
      })}
    </group>
  );
}
