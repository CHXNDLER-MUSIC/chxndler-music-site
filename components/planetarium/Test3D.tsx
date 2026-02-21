'use client';

import { useEffect, useState } from 'react';

export default function Test3D() {
  const [mounted, setMounted] = useState(false);
  const [ThreeComponent, setThreeComponent] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isMounted = true;

    const loadThree = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted) return;

        if (process.env.NODE_ENV !== "production") console.log('Loading Three.js components...');
        const { Canvas } = await import('@react-three/fiber');
        if (process.env.NODE_ENV !== "production") console.log('Three.js loaded successfully!');
        
        if (!isMounted) return;

        const TestCanvas = () => (
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={'orange'} />
            </mesh>
          </Canvas>
        );

        setThreeComponent(() => TestCanvas);
      } catch (error) {
        console.error('Failed to load Three.js:', error);
      }
    };

    loadThree();

    return () => {
      isMounted = false;
    };
  }, [mounted]);

  if (!mounted) {
    return <div>Mounting...</div>;
  }

  if (!ThreeComponent) {
    return <div>Loading 3D...</div>;
  }

  return (
    <div className="w-full h-full">
      <ThreeComponent />
    </div>
  );
}