import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CenterPlanet from './CenterPlanet';
import ElementalPlanet from './ElementalPlanet';
import { elementalPlanets } from '../data/songData';

export default function PlanetSystem() {
  const systemGroupRef = useRef();

  useFrame((state, delta) => {
    if (systemGroupRef.current) {
      systemGroupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group>
      <CenterPlanet />
      
      <group ref={systemGroupRef}>
        {elementalPlanets.map((planet, index) => (
          <ElementalPlanet
            key={planet.name}
            name={planet.name}
            color={planet.color}
            position={planet.position}
            orbitSpeed={0.5}
          />
        ))}
      </group>

      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.5} 
        color="#ffffff"
      />
      <directionalLight 
        position={[-10, -10, -5]} 
        intensity={0.3} 
        color="#FC54AF"
      />
    </group>
  );
}