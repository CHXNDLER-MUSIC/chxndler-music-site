'use client';

import React, { useState, useEffect } from 'react';
import { SolarSystemCanvas } from './SolarSystemCanvas';
import type { SongWithElement } from '@/hooks/useSongs';

interface ClientOnly3DProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

export default function ClientOnly3D(props: ClientOnly3DProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing 3D Scene...
        </div>
      </div>
    );
  }

  return (
    <SolarSystemCanvas
      songs={props.songs}
      songsByElement={props.songsByElement}
      zoomLevel={props.zoomLevel}
      onPlanetSelect={props.onPlanetSelect}
      showStats={false}
      quality={props.quality}
    />
  );
}