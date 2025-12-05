'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

function SpinningPlanet() {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <mesh rotation={[0.4, 0.8, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#38B6FF" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

export default function BasicPlanetScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <Suspense fallback={null}>
          <SpinningPlanet />
          <OrbitControls enablePan={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}