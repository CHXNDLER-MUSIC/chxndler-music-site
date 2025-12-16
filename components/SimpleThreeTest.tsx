'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';

function TestSphere() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function SimpleThreeTest() {
  return (
    <div className="w-full h-[300px] bg-gray-900 border rounded">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <TestSphere />
      </Canvas>
    </div>
  );
}