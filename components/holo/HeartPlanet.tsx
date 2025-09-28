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
    <group position={[0, 0, 0]} scale={[1, 1, 1]}>
      {/* Large, obvious heart-shaped planet made from two spheres */}
      <group ref={meshRef}>
        {/* Left heart lobe */}
        <mesh position={[-0.6, 0.3, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial
            color="#ff69b4"
            emissive="#ff1493"
            emissiveIntensity={0.8}
          />
        </mesh>
        
        {/* Right heart lobe */}
        <mesh position={[0.6, 0.3, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial
            color="#ff69b4"
            emissive="#ff1493"
            emissiveIntensity={0.8}
          />
        </mesh>
        
        {/* Bottom point of heart */}
        <mesh position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial
            color="#ff69b4"
            emissive="#ff1493"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
      
      {/* Bright glow effect */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial
          color="#ff69b4"
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Extra bright pink core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff1493"
          emissive="#ff69b4"
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
}