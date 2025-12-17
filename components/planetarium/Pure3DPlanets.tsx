'use client';

import { useEffect, useState } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface Pure3DPlanetsProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

export default function Pure3DPlanets(props: Pure3DPlanetsProps) {
  const [ThreeJS, setThreeJS] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let mounted = true;

    const loadThree = async () => {
      try {
        // Dynamic import to avoid SSR
        const [
          { Canvas },
          { OrbitControls },
          { Suspense },
        ] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei'),
          import('react')
        ]);

        if (!mounted) return;

        const ThreePlanetSystem = ({ songs, songsByElement, zoomLevel, onPlanetSelect, quality }: Pure3DPlanetsProps) => {
          return (
            <Canvas
              camera={{ position: [0, 15, 35], fov: 60 }}
              style={{ background: 'transparent' }}
              dpr={quality === 'high' ? 2 : 1}
              gl={{ 
                antialias: quality === 'high',
                alpha: true,
                preserveDrawingBuffer: false
              }}
            >
              <Suspense fallback={null}>
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
                <mesh 
                  position={[0, 0, 0]}
                  onClick={() => onPlanetSelect?.('center')}
                >
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
                  <mesh 
                    position={[20, 0, 0]}
                    onClick={() => onPlanetSelect?.('heart')}
                  >
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
                <group rotation={[0, Math.PI/2, 0]}>
                  <mesh 
                    position={[20, 0, 0]}
                    onClick={() => onPlanetSelect?.('water')}
                  >
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
                  <mesh 
                    position={[20, 0, 0]}
                    onClick={() => onPlanetSelect?.('lightning')}
                  >
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
                <group rotation={[0, -Math.PI/2, 0]}>
                  <mesh 
                    position={[20, 0, 0]}
                    onClick={() => onPlanetSelect?.('darkness')}
                  >
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
                {Array.from({ length: 200 }, (_, i) => (
                  <mesh 
                    key={i}
                    position={[
                      (Math.random() - 0.5) * 200,
                      (Math.random() - 0.5) * 200, 
                      (Math.random() - 0.5) * 200
                    ]}
                  >
                    <sphereGeometry args={[0.1, 4, 4]} />
                    <meshBasicMaterial color="white" />
                  </mesh>
                ))}
              </Suspense>
            </Canvas>
          );
        };

        setThreeJS(() => ThreePlanetSystem);
      } catch (error) {
        console.error('Failed to load Three.js:', error);
      }
    };

    // Delay loading to ensure client is ready
    const timer = setTimeout(loadThree, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isClient]);

  if (!isClient) {
    return null;
  }

  if (!ThreeJS) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Planets...
        </div>
      </div>
    );
  }

  return <ThreeJS {...props} />;
}