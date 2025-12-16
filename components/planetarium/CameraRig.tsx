'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import OrbitControls to avoid SSR issues
const OrbitControls = dynamic(() => import('@react-three/drei').then(mod => ({ default: mod.OrbitControls })), { 
  ssr: false 
});

export function CameraRig() {
  return (
    <OrbitControls 
      enablePan={false} 
      minDistance={15}
      maxDistance={100}
      enableDamping
      dampingFactor={0.05}
    />
  );
}