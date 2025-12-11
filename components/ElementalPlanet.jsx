import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import SongPlanet from './SongPlanet';
import { getSongsForElement } from '../data/songData';

export default function ElementalPlanet({ 
  name, 
  color, 
  position, 
  orbitSpeed = 0.5 
}) {
  const meshRef = useRef();
  const songOrbitGroupRef = useRef();
  
  const songs = getSongsForElement(name);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
      meshRef.current.rotation.x += delta * 0.3;
    }
    
    if (songOrbitGroupRef.current) {
      songOrbitGroupRef.current.rotation.y += delta * 1.0;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <mesh scale={1.15}>
        <sphereGeometry args={[0.8, 12, 12]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.08}
        />
      </mesh>

      <pointLight 
        position={[0, 0, 0]} 
        color={color} 
        intensity={1.5} 
        distance={8}
        decay={2}
      />

      <group ref={songOrbitGroupRef}>
        {songs.map((song, index) => {
          const angle = (index / songs.length) * Math.PI * 2;
          return (
            <SongPlanet
              key={`${name}-${song.title}`}
              song={song}
              elementColor={color}
              orbitRadius={1.8}
              orbitSpeed={0.8}
              angle={angle}
            />
          );
        })}
      </group>
    </group>
  );
}