import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function SongPlanet({ 
  song, 
  position, 
  elementColor, 
  orbitRadius = 2, 
  orbitSpeed = 1,
  angle = 0 
}) {
  const meshRef = useRef();
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * orbitSpeed;
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 2;
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, angle, 0]}>
      <group position={[orbitRadius, 0, 0]}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={elementColor}
            emissive={elementColor}
            emissiveIntensity={0.2}
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
        
        <mesh scale={1.3}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial 
            color={elementColor}
            transparent
            opacity={0.05}
          />
        </mesh>
      </group>
    </group>
  );
}