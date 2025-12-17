'use client';

import React from 'react';
import Pure3DPlanets from './Pure3DPlanets';
import { useSongs } from '@/hooks/useSongs';

interface ClientPlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

const getDeviceQuality = (): 'low' | 'high' => {
  if (typeof window === 'undefined') return 'high';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasLowRAM = 'deviceMemory' in navigator && (navigator as any).deviceMemory < 4;
  const hasSlowCPU = 'hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4;

  return (isMobile || hasLowRAM || hasSlowCPU) ? 'low' : 'high';
};

export default function ClientPlanetScene({
  zoomLevel,
  initialActivePlanet,
  onPlanetSelect,
  worldId
}: ClientPlanetSceneProps) {
  const { songs, songsByElement, loading, error } = useSongs();
  const quality = getDeviceQuality();

  if (error) {
    return (
      <div className="w-full h-full bg-red-900/50 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">Error Loading Planets</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <Pure3DPlanets
      songs={songs}
      songsByElement={songsByElement}
      zoomLevel={zoomLevel}
      onPlanetSelect={onPlanetSelect}
      quality={quality}
    />
  );
}