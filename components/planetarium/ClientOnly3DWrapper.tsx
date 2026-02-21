'use client';

import { useEffect, useState } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface ClientOnly3DWrapperProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
  showStats?: boolean;
}

export default function ClientOnly3DWrapper(props: ClientOnly3DWrapperProps) {
  const [SolarSystemCanvas, setSolarSystemCanvas] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.log('ClientOnly3DWrapper: Setting isClient to true');
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;

    const loadCanvas = async () => {
      try {
        if (process.env.NODE_ENV !== "production") console.log('ClientOnly3DWrapper: Loading SolarSystemCanvas...');
        const module = await import('./SolarSystemCanvas');
        
        if (!isMounted) return;
        
        if (process.env.NODE_ENV !== "production") console.log('ClientOnly3DWrapper: SolarSystemCanvas loaded successfully');
        setSolarSystemCanvas(() => module.default);
      } catch (error) {
        console.error('ClientOnly3DWrapper: Failed to load SolarSystemCanvas:', error);
      }
    };

    loadCanvas();

    return () => {
      isMounted = false;
    };
  }, [isClient]);

  if (process.env.NODE_ENV !== "production") console.log('ClientOnly3DWrapper render:', { isClient, hasCanvas: !!SolarSystemCanvas });

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing 3D Engine...
        </div>
      </div>
    );
  }

  if (!SolarSystemCanvas) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Planets...
        </div>
      </div>
    );
  }

  return <SolarSystemCanvas {...props} />;
}