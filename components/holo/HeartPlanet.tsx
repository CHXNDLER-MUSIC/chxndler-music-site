"use client";

import React, { useRef } from "react";
import { Mesh } from "three";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  
  console.log("🧡 HeartPlanet is rendering!");

  // Animation loop
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.3;
      
      // Heartbeat pulsing
      const time = state.clock.elapsedTime;
      const heartbeat = 1 + Math.sin(time * 8) * 0.2 + Math.sin(time * 16) * 0.1;
      meshRef.current.scale.setScalar(heartbeat);
    }
    
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.3;
      const time = state.clock.elapsedTime;
      const glow = 1.2 + Math.sin(time * 4) * 0.3;
      glowRef.current.scale.setScalar(glow);
    }
  });

  return (
    <group position={[0, 0, 0]} scale={[3, 3, 3]}>
      {/* Large, obvious heart-shaped planet made from two spheres */}
      <group ref={meshRef}>
        {/* Left heart lobe */}
        <mesh position={[-1.2, 0.6, 0]}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshStandardMaterial
            color="#ff1744"
            emissive="#ff69b4"
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.3}
          />
        </mesh>
        
        {/* Right heart lobe */}
        <mesh position={[1.2, 0.6, 0]}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshStandardMaterial
            color="#ff1744"
            emissive="#ff69b4"
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.3}
          />
        </mesh>
        
        {/* Bottom point of heart */}
        <mesh position={[0, -1.6, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[2.4, 2.4, 2.4]} />
          <meshStandardMaterial
            color="#ff1744"
            emissive="#ff69b4"
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.3}
          />
        </mesh>
      </group>
      
      {/* Bright glow effect */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial
          color="#ff69b4"
          transparent
          opacity={0.15}
        />
      </mesh>
      
      {/* Extra bright core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          emissive="#ff1744"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}