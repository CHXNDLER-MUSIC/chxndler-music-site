"use client";

import React, { useMemo, useRef } from "react";
import { Points, BufferGeometry, PointsMaterial, BufferAttribute } from "three";
import { useFrame } from "@react-three/fiber";

interface StarfieldProps {
  count?: number;
  radius?: number;
}

export default function Starfield({ count = 2000, radius = 200 }: StarfieldProps) {
  const pointsRef = useRef<Points>(null);
  
  // Generate random star positions
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random spherical distribution
      const r = Math.random() * radius + 50; // Keep stars away from center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    return positions;
  }, [count, radius]);

  // Create geometry
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  // Subtle twinkle animation
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <points ref={pointsRef}>
      <primitive attach="geometry" object={geometry} />
      <pointsMaterial
        color="#ffffff"
        size={0.5}
        sizeAttenuation={true}
        transparent
        opacity={0.8}
      />
    </points>
  );
}