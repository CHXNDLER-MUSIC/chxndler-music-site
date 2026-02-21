'use client';

import React, { useState, useEffect, useRef } from 'react';

interface RuntimePlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export default function RuntimePlanetScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: RuntimePlanetSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAndRenderThreeJS = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Starting dynamic imports...');
        
        // Dynamically import all Three.js dependencies
        const [
          { Canvas },
          { createRoot },
          PlanetsModule,
          CameraRigModule,
          LightsModule,
          { PlanetPositionsProvider }
        ] = await Promise.all([
          import('@react-three/fiber'),
          import('react-dom/client'),
          import('./Planets'),
          import('./CameraRig'),
          import('./Lights'),
          import('../planet-positions-context')
        ]);
        
        if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Dynamic imports completed');

        if (!mounted) {
          if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Component unmounted, aborting');
          return;
        }

        const { Planets } = PlanetsModule;
        const { CameraRig } = CameraRigModule;
        const { Lights } = LightsModule;
        
        if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Destructured components successfully');

        // Create the React element wrapped with PlanetPositionsProvider
        const planetElement = React.createElement(
          PlanetPositionsProvider,
          {},
          React.createElement(
            Canvas,
            {
              camera: { position: [0, 10, 25], fov: 60 },
              dpr: [1, 1.5],
              performance: { min: 0.5 },
              gl: { 
                powerPreference: 'high-performance',
                antialias: false,
                alpha: false
              },
              style: { 
                pointerEvents: 'auto',
                zIndex: 1,
                width: '100%',
                height: '100%'
              }
            },
            [
              React.createElement(Lights, { key: 'lights' }),
              React.createElement(Planets, {
                key: 'planets',
                zoomLevel,
                initialActivePlanet,
                onPlanetSelect,
                worldId
              }),
              React.createElement(CameraRig, { key: 'camera' })
            ]
          )
        );
        
        if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Created React element with provider');

        // Render using React 18 createRoot
        if (containerRef.current && mounted) {
          if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Rendering to DOM');
          const root = createRoot(containerRef.current);
          root.render(planetElement);
          setLoading(false);
          if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Successfully rendered!');

          // Cleanup function
          return () => {
            if (process.env.NODE_ENV !== "production") console.log('RuntimePlanetScene: Cleaning up');
            root.unmount();
          };
        }

      } catch (error) {
        console.error('Failed to load Three.js scene:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    loadAndRenderThreeJS();

    return () => {
      mounted = false;
    };
  }, [zoomLevel, initialActivePlanet, onPlanetSelect, worldId]);

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        Loading 3D Scene...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-red-400">
        Error loading 3D scene: {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[500px]"
      style={{ position: 'relative' }}
    />
  );
}