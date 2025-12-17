'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InstancedStarsProps {
  count?: number;
  quality: 'low' | 'high';
}

export const InstancedStars = React.memo(({ 
  count = 1000, 
  quality 
}: InstancedStarsProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Reduce star count for low quality
  const starCount = quality === 'low' ? Math.floor(count / 2) : count;
  
  // Memoized geometry and material
  const { geometry, material, positions } = useMemo(() => {
    const geom = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    return { geometry: geom, material: mat, positions: pos };
  }, [starCount]);
  
  // Set instance positions once
  React.useEffect(() => {
    if (!meshRef.current) return;
    
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < starCount; i++) {
      matrix.setPosition(
        positions[i * 3],
        positions[i * 3 + 1], 
        positions[i * 3 + 2]
      );
      meshRef.current.setMatrixAt(i, matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, starCount]);
  
  // Minimal animation - just slow rotation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, starCount]}
      frustumCulled
    />
  );
});

InstancedStars.displayName = 'InstancedStars';