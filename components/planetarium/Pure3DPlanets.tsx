'use client';

import React, { Suspense, useEffect, useState } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

export interface Pure3DPlanetsProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

export default function Pure3DPlanets({ quality, onPlanetSelect, songs, songsByElement, zoomLevel }: Pure3DPlanetsProps) {
  const [ThreeComponents, setThreeComponents] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  console.log('Pure3DPlanets render:', { quality, songsCount: songs?.length || 0, zoomLevel, isClient, hasComponents: !!ThreeComponents });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    const loadThree = async () => {
      try {
        console.log('Pure3DPlanets: Loading React Three Fiber...');
        
        const [
          { Canvas },
          { OrbitControls }
        ] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei')
        ]);
        
        if (!isMounted) return;
        
        console.log('Pure3DPlanets: React Three Fiber loaded successfully');

        const PlanetSystem = ({ onPlanetSelect }: { onPlanetSelect?: (planetId: string) => void }) => (
          <>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1.2} />
            <directionalLight position={[-10, -10, -10]} intensity={0.8} />

            {/* Controls */}
            <OrbitControls
              enablePan={false}
              minDistance={20}
              maxDistance={80}
              autoRotate
              autoRotateSpeed={0.5}
            />

            {/* Center Planet - Sun-like */}
            <mesh position={[0, 0, 0]} onClick={() => onPlanetSelect?.('center')}>
              <sphereGeometry args={[4, 64, 64]} />
              <meshStandardMaterial
                color="#ffaa00"
                emissive="#ff6600"
                emissiveIntensity={0.3}
                metalness={0.1}
                roughness={0.4}
              />
            </mesh>

            {/* Heart Planet */}
            <group rotation={[0, 0, 0]}>
              <mesh position={[20, 0, 0]} onClick={() => onPlanetSelect?.('heart')}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshStandardMaterial
                  color="#ff6b9d"
                  emissive="#ff1166"
                  emissiveIntensity={0.2}
                  metalness={0.2}
                  roughness={0.6}
                />
              </mesh>
            </group>

            {/* Water Planet */}
            <group rotation={[0, Math.PI / 2, 0]}>
              <mesh position={[20, 0, 0]} onClick={() => onPlanetSelect?.('water')}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshStandardMaterial
                  color="#4fc3f7"
                  emissive="#0099cc"
                  emissiveIntensity={0.2}
                  metalness={0.7}
                  roughness={0.2}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            </group>

            {/* Lightning Planet */}
            <group rotation={[0, Math.PI, 0]}>
              <mesh position={[20, 0, 0]} onClick={() => onPlanetSelect?.('lightning')}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshStandardMaterial
                  color="#ffeb3b"
                  emissive="#ffcc00"
                  emissiveIntensity={0.4}
                  metalness={0.3}
                  roughness={0.3}
                />
              </mesh>
            </group>

            {/* Darkness Planet */}
            <group rotation={[0, -Math.PI / 2, 0]}>
              <mesh position={[20, 0, 0]} onClick={() => onPlanetSelect?.('darkness')}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshStandardMaterial
                  color="#9c27b0"
                  emissive="#660099"
                  emissiveIntensity={0.3}
                  metalness={0.4}
                  roughness={0.7}
                />
              </mesh>
            </group>

            {/* Stars */}
            {[...Array(100)].map((_, i) => {
              const seed = i * 137.508;
              const x = (Math.sin(seed) * 100);
              const y = (Math.cos(seed * 2.3) * 100);
              const z = (Math.sin(seed * 1.7) * 100);
              return (
                <mesh key={i} position={[x, y, z]}>
                  <sphereGeometry args={[0.1, 4, 4]} />
                  <meshBasicMaterial color="white" />
                </mesh>
              );
            })}
          </>
        );

        const ThreeScene = () => (
          <Canvas
            camera={{ position: [0, 15, 35], fov: 60 }}
            style={{ background: 'transparent', width: '100%', height: '100%' }}
            dpr={quality === 'high' ? 2 : 1}
            gl={{
              antialias: quality === 'high',
              alpha: true,
              preserveDrawingBuffer: false,
            }}
          >
            <Suspense fallback={null}>
              <PlanetSystem onPlanetSelect={onPlanetSelect} />
            </Suspense>
          </Canvas>
        );

        setThreeComponents(() => ThreeScene);
      } catch (error) {
        console.error('Pure3DPlanets: Failed to load React Three Fiber:', error);
      }
    };

    loadThree();

    return () => {
      isMounted = false;
    };
  }, [isClient, quality, onPlanetSelect]);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing...
        </div>
      </div>
    );
  }

  if (!ThreeComponents) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Engine...
        </div>
      </div>
    );
  }

  return <ThreeComponents />;
}
