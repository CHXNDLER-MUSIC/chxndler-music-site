'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RingConfig {
  radius: number;
  opacity: number;
  rotationSpeed: number;
  tilt: number;
}

interface OrbitRingsProps {
  color?: string | THREE.Color;
  baseOpacity?: number;
  position?: [number, number, number];
  ringConfigs?: RingConfig[];
}

export const OrbitRings = React.memo(({
  color = '#00d4aa',
  baseOpacity = 0.06,
  position = [0, 0, 0],
  ringConfigs
}: OrbitRingsProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Default ring configurations - subtle, varied sizes
  const rings = useMemo(() => {
    return ringConfigs || [
      { radius: 25, opacity: baseOpacity, rotationSpeed: 0.003, tilt: Math.PI / 12 },
      { radius: 35, opacity: baseOpacity * 0.7, rotationSpeed: -0.002, tilt: Math.PI / 18 },
      { radius: 45, opacity: baseOpacity * 0.5, rotationSpeed: 0.0015, tilt: Math.PI / 24 }
    ];
  }, [ringConfigs, baseOpacity]);

  // Convert color to THREE.Color
  const ringColor = useMemo(() => {
    return new THREE.Color(color);
  }, [color]);

  // Memoized ring geometry and material
  const ringMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [ringColor, baseOpacity]);

  // Animation loop
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Line && rings[index]) {
          child.rotation.z += rings[index].rotationSpeed;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position} renderOrder={-99}>
      {rings.map((ring, index) => (
        <RingLine
          key={index}
          radius={ring.radius}
          opacity={ring.opacity}
          tilt={ring.tilt}
          color={ringColor}
        />
      ))}
    </group>
  );
});

OrbitRings.displayName = 'OrbitRings';

// Individual ring component
interface RingLineProps {
  radius: number;
  opacity: number;
  tilt: number;
  color: THREE.Color;
  segments?: number;
}

const RingLine = React.memo(({
  radius,
  opacity,
  tilt,
  color,
  segments = 128
}: RingLineProps) => {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * radius,
        0,
        Math.sin(theta) * radius
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius, segments]);

  return (
    <line
      rotation={[tilt, 0, 0]}
      renderOrder={-99}
    >
      <bufferGeometry attach="geometry" {...geometry} />
      <lineBasicMaterial
        attach="material"
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
});

RingLine.displayName = 'RingLine';

export default OrbitRings;
