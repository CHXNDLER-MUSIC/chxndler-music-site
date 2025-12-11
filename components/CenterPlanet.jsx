import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';

export default function CenterPlanet() {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= delta * 0.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial 
          color="#FC54AF"
          emissive="#FC54AF"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      
      <mesh ref={glowRef} scale={1.2}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color="#FC54AF"
          transparent
          opacity={0.1}
        />
      </mesh>

      <pointLight 
        position={[0, 0, 0]} 
        color="#FC54AF" 
        intensity={2} 
        distance={20}
        decay={2}
      />
    </group>
  );
}