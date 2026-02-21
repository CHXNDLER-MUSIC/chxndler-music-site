'use client';

import { useState, useEffect } from 'react';

export default function SimpleTest3D() {
  const [ThreeComponent, setThreeComponent] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.log('SimpleTest3D: Setting isClient to true');
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    const loadThree = async () => {
      try {
        if (process.env.NODE_ENV !== "production") console.log('SimpleTest3D: Loading React Three Fiber...');
        
        const [
          { Canvas },
          drei,
          react
        ] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei'),
          import('react')
        ]);
        
        if (process.env.NODE_ENV !== "production") console.log('SimpleTest3D: Three.js imports loaded successfully');
        
        if (!isMounted) return;

        const SimpleScene = () => (
          <Canvas camera={{ position: [0, 0, 5] }}>
            <react.Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              
              {/* Central Planet */}
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial color="#ffaa00" />
              </mesh>
              
              {/* Orbiting Planet */}
              <mesh position={[4, 0, 0]}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshStandardMaterial color="#ff6b9d" />
              </mesh>
              
              <drei.OrbitControls />
            </react.Suspense>
          </Canvas>
        );

        if (process.env.NODE_ENV !== "production") console.log('SimpleTest3D: Setting Three component');
        setThreeComponent(() => SimpleScene);
      } catch (error) {
        console.error('SimpleTest3D: Failed to load Three.js:', error);
      }
    };

    loadThree();

    return () => {
      isMounted = false;
    };
  }, [isClient]);

  if (process.env.NODE_ENV !== "production") console.log('SimpleTest3D render:', { isClient, hasComponent: !!ThreeComponent });

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

  if (!ThreeComponent) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D...
        </div>
      </div>
    );
  }

  return <ThreeComponent />;
}