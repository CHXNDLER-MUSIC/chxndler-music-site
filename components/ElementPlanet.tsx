'use client';

import React from 'react';
import { Billboard } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface ElementPlanetProps {
  texturePath: string;
  position: [number, number, number];
  size?: number;
}

export function ElementPlanet({ texturePath, position, size = 4 }: ElementPlanetProps) {
  const texture = useLoader(THREE.TextureLoader, texturePath);

  // Configure texture for transparency
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <Billboard position={position}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        alphaTest={0.2}
        side={THREE.DoubleSide}
        emissive={0x111111}
        emissiveIntensity={0.1}
        roughness={0.7}
        metalness={0.3}
      />
    </Billboard>
  );
}