"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { buildPlanetSongs, ELEMENT_COLORS, type Element } from "@/lib/planets";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabaseClient } from "@/lib/supabaseClient";

type Element4 = "heart" | "water" | "lightning" | "darkness";

type Star = {
  id: string;
  x: number;
  y: number;
  z: number;
};

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

// Star component - glowing sphere for soul journal entries
function StarMesh({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#FFD700" 
          emissive="#FFD700" 
          emissiveIntensity={0.8}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
      {/* Glow effect */}
      <mesh scale={[2, 2, 2]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial 
          color="#FFD700" 
          transparent 
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

export default function HeartverseSolarSystem({ songs: propSongs, onSongClick }: HeartverseSolarSystemProps) {
  const systemRef = useRef<Group>(null);
  const { user } = useAuth();
  const [stars, setStars] = useState<Star[]>([]);

  // Fetch and subscribe to soul stars
  useEffect(() => {
    if (!user?.id) {
      setStars([]);
      return;
    }

    // Fetch existing stars
    const fetchStars = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('soul_stars')
          .select('id, x, y, z')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching soul stars:', error);
        } else {
          setStars(data || []);
        }
      } catch (error) {
        console.error('Error in fetchStars:', error);
      }
    };

    fetchStars();

    // Set up realtime subscription
    const channel = supabaseClient
      .channel('soul_stars_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'soul_stars',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New soul star inserted:', payload);
          const newStar = payload.new as Star & { user_id: string };
          setStars((prev) => [...prev, {
            id: newStar.id,
            x: newStar.x,
            y: newStar.y,
            z: newStar.z,
          }]);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id]);

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

      {/* Soul Stars - journal entry stars scattered around the system */}
      {stars.map((star) => (
        <StarMesh key={star.id} position={[star.x, star.y, star.z]} />
      ))}
    </group>
  );
}
