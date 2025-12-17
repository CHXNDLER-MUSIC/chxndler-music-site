'use client';

import { useState, useEffect } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface ClientOnly3DCanvasProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
  showStats?: boolean;
}

export default function ClientOnly3DCanvas(props: ClientOnly3DCanvasProps) {
  const [CanvasComponent, setCanvasComponent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isMounted = true;

    const loadCanvas = async () => {
      try {
        // Wait for client to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted) return;

        // Import Canvas separately to avoid SSR issues
        const { Canvas } = await import('@react-three/fiber');
        const { Stats } = await import('@react-three/drei');
        const { Suspense } = await import('react');
        
        if (!isMounted) return;

        // Create a simple 3D component without the complex scene
        const Simple3DCanvas = ({ songs, songsByElement, zoomLevel, onPlanetSelect, quality, showStats }: ClientOnly3DCanvasProps) => {
          return (
            <Canvas
              camera={{ 
                position: [0, 10, 25], 
                fov: 60, 
                near: 0.1, 
                far: 1000 
              }}
              gl={{ 
                antialias: quality === 'high',
                powerPreference: "high-performance",
                alpha: false,
                stencil: false,
                depth: true
              }}
              dpr={quality === 'high' ? Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) : 1}
              style={{ background: 'transparent' }}
            >
              <Suspense fallback={null}>
                {/* Simple lighting */}
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                
                {/* Center Planet */}
                <mesh position={[0, 0, 0]} onClick={() => onPlanetSelect?.('center')}>
                  <sphereGeometry args={[3, 32, 32]} />
                  <meshStandardMaterial 
                    color={0xffaa00}
                    emissive={0xffaa00}
                    emissiveIntensity={0.3}
                  />
                </mesh>
                
                {/* Element planets */}
                <mesh position={[0, 0, 18]} onClick={() => onPlanetSelect?.('heart')}>
                  <sphereGeometry args={[2, 24, 24]} />
                  <meshStandardMaterial 
                    color={0xff6b9d}
                    emissive={0xff6b9d}
                    emissiveIntensity={0.3}
                  />
                </mesh>
                
                <mesh position={[18, 0, 0]} onClick={() => onPlanetSelect?.('water')}>
                  <sphereGeometry args={[2, 24, 24]} />
                  <meshStandardMaterial 
                    color={0x4fc3f7}
                    emissive={0x4fc3f7}
                    emissiveIntensity={0.3}
                  />
                </mesh>
                
                <mesh position={[0, 0, -18]} onClick={() => onPlanetSelect?.('lightning')}>
                  <sphereGeometry args={[2, 24, 24]} />
                  <meshStandardMaterial 
                    color={0xffeb3b}
                    emissive={0xffeb3b}
                    emissiveIntensity={0.3}
                  />
                </mesh>
                
                <mesh position={[-18, 0, 0]} onClick={() => onPlanetSelect?.('darkness')}>
                  <sphereGeometry args={[2, 24, 24]} />
                  <meshStandardMaterial 
                    color={0x9c27b0}
                    emissive={0x9c27b0}
                    emissiveIntensity={0.3}
                  />
                </mesh>
              </Suspense>
              {showStats && <Stats />}
            </Canvas>
          );
        };

        if (isMounted) {
          setCanvasComponent(() => Simple3DCanvas);
        }
      } catch (error) {
        console.error('Failed to load 3D Canvas:', error);
        // Don't set error state, just leave CanvasComponent as null
      }
    };

    loadCanvas();

    return () => {
      isMounted = false;
    };
  }, [mounted]);

  if (!mounted || !CanvasComponent) {
    return null; // Return nothing instead of loading state
  }

  return <CanvasComponent {...props} />;
}