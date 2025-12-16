'use client';

import React, { forwardRef, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ACTIVE_GLOW_COLOR, ACTIVE_GLOW_OPACITY, ACTIVE_GLOW_SCALE } from './planetarium/assets';

interface ElementPlanetProps {
  texturePath: string;
  position?: [number, number, number];
  size?: number;
  scale?: number;
  isActive?: boolean;
  children?: React.ReactNode;
  elementId?: string;
}

// Custom geometry creation functions
const createHeartGeometry = (size: number) => {
  const heartShape = new THREE.Shape();
  const scale = size * 0.2;
  
  heartShape.moveTo(0, -scale * 2);
  heartShape.bezierCurveTo(-scale * 1.5, -scale * 4, -scale * 4, -scale * 2, -scale * 2, 0);
  heartShape.bezierCurveTo(-scale * 4, scale * 2, 0, scale * 3, 0, scale * 1);
  heartShape.bezierCurveTo(0, scale * 3, scale * 4, scale * 2, scale * 2, 0);
  heartShape.bezierCurveTo(scale * 4, -scale * 2, scale * 1.5, -scale * 4, 0, -scale * 2);
  
  const extrudeSettings = {
    depth: size * 0.2,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.3,
    bevelThickness: 0.3
  };
  
  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  geometry.center();
  return geometry;
};

const createWaterDropGeometry = (size: number) => {
  const points = [];
  const scale = size * 0.5;
  
  // Create a teardrop profile
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const angle = t * Math.PI;
    
    let radius;
    if (t <= 0.7) {
      // Rounded bottom part
      radius = Math.sin(angle) * scale;
    } else {
      // Tapered top part
      const taper = (1 - t) / 0.3; // taper factor
      radius = Math.sin(angle) * scale * taper;
    }
    
    const y = Math.cos(angle) * scale;
    points.push(new THREE.Vector2(radius, y));
  }
  
  const geometry = new THREE.LatheGeometry(points, 16);
  geometry.center();
  return geometry;
};

const createLightningGeometry = (size: number) => {
  const geometry = new THREE.ConeGeometry(size / 2, size * 1.2, 8);
  
  // Create jagged edges by modifying vertices
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    // Add noise for jagged appearance, but less extreme
    const noise = (Math.random() - 0.5) * 0.2;
    positions[i] += noise;
    positions[i + 1] += noise * 0.5; // Less Y noise to keep general cone shape
    positions[i + 2] += noise;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.center();
  
  return geometry;
};

const createDarknessGeometry = (size: number) => {
  const geometry = new THREE.IcosahedronGeometry(size / 2, 1);
  
  // Create irregular, crystalline appearance with more controlled deformation
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const scale = 0.85 + Math.random() * 0.3; // Less extreme scaling
    positions[i] *= scale;
    positions[i + 1] *= scale;
    positions[i + 2] *= scale;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.center();
  
  return geometry;
};

export const ElementPlanet = forwardRef<THREE.Group, ElementPlanetProps>(
  ({ texturePath, position, size = 4, scale = 1, isActive = false, children, elementId }, ref) => {
    const texture = useLoader(THREE.TextureLoader, texturePath);

    // Configure texture for transparency
    texture.colorSpace = THREE.SRGBColorSpace;

    // Create element-specific geometry
    const geometry = useMemo(() => {
      switch (elementId) {
        case 'HEART':
          return createHeartGeometry(size);
        case 'WATER':
          return createWaterDropGeometry(size);
        case 'LIGHTNING':
          return createLightningGeometry(size);
        case 'DARKNESS':
          return createDarknessGeometry(size);
        default:
          return new THREE.SphereGeometry(size/2, 16, 16);
      }
    }, [elementId, size]);

    // Create glow geometry (always sphere for consistent glow)
    const glowGeometry = useMemo(() => new THREE.SphereGeometry(size/2, 16, 16), [size]);

    // Calculate rotation based on element type for proper orientation toward camera
    const getRotation = (): [number, number, number] => {
      switch (elementId) {
        case 'HEART':
          return [Math.PI * 0.1, 0, 0]; // Slight tilt toward camera
        case 'WATER':
          return [0, 0, 0]; // Droplet faces up naturally
        case 'LIGHTNING':
          return [Math.PI * 0.1, 0, 0]; // Tilt lightning bolt slightly toward camera
        case 'DARKNESS':
          return [Math.PI * 0.15, Math.PI * 0.25, 0]; // Angular tilt for crystalline look
        default:
          return [0, 0, 0];
      }
    };

    const rotation = getRotation();

    return (
      <group ref={ref} position={position} scale={scale} rotation={rotation}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            map={texture}
            transparent={true}
            alphaTest={0.2}
            emissive={isActive ? new THREE.Color(0x333333) : new THREE.Color(0x111111)}
            emissiveIntensity={isActive ? 0.2 : 0.1}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>
        {isActive && (
          <mesh geometry={glowGeometry} scale={ACTIVE_GLOW_SCALE}>
            <meshBasicMaterial 
              color={ACTIVE_GLOW_COLOR} 
              transparent 
              opacity={ACTIVE_GLOW_OPACITY}
              side={THREE.BackSide}
            />
          </mesh>
        )}
        {children}
      </group>
    );
  }
);

ElementPlanet.displayName = 'ElementPlanet';