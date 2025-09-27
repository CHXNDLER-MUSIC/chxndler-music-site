"use client";

import React, { useRef } from "react";
import { Mesh } from "three";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  
  console.log("HeartPlanet component is rendering!");

  // Animation loop
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Fast rotation to make it obvious
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.rotation.x += delta * 1;
      
      // Strong pulsing
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Very obvious bright pink sphere */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial
          color={0xff00ff}
          emissive={0xff69b4}
          transparent={false}
        />
      </mesh>
    </group>
  );
}