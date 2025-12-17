'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface DynamicSolarSystemProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
  showStats?: boolean;
}

const SolarSystemCanvas = dynamic(() => import('./SolarSystemCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
        Loading 3D Solar System...
      </div>
    </div>
  )
});

export default function DynamicSolarSystem(props: DynamicSolarSystemProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing 3D Engine...
        </div>
      </div>
    );
  }

  return <SolarSystemCanvas {...props} />;
}