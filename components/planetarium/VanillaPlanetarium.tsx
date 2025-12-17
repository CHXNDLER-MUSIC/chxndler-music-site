'use client';

import React, { useState } from 'react';
import { useSongs, type SongWithElement } from '@/hooks/useSongs';
import { SolarSystemCanvas } from './SolarSystemCanvas';
import { SolarSystemUI } from './SolarSystemUI';

interface VanillaPlanetariumProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

// Detect device quality
const getDeviceQuality = (): 'low' | 'high' => {
  if (typeof window === 'undefined') return 'high';
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasLowRAM = 'deviceMemory' in navigator && (navigator as any).deviceMemory < 4;
  const hasSlowCPU = 'hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4;
  
  return (isMobile || hasLowRAM || hasSlowCPU) ? 'low' : 'high';
};

export default function VanillaPlanetarium({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId
}: VanillaPlanetariumProps) {
  // Fetch real songs data
  const { songs, songsByElement, loading: songsLoading, error: songsError } = useSongs();
  
  // UI state (separate from 3D scene)
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [quality, setQuality] = useState<'low' | 'high'>(() => getDeviceQuality());


  // Only render scene after songs are loaded
  const shouldRender = !songsLoading && songs.length > 0;

  // Loading state
  if (songsLoading) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading Heartverse Solar System...
        </div>
      </div>
    );
  }

  // Error state
  if (songsError) {
    return (
      <div className="w-full h-[500px] bg-red-900 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">Planetarium Error</h3>
          <p className="text-sm">{songsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] relative overflow-hidden">
      {/* UI Layer - Separated from Canvas */}
      <SolarSystemUI
        songs={songs}
        songsByElement={songsByElement}
        shouldRender={shouldRender}
        mapCollapsed={mapCollapsed}
        onMapToggle={() => setMapCollapsed(!mapCollapsed)}
        showStats={showStats}
        onStatsToggle={() => setShowStats(!showStats)}
        quality={quality}
        onQualityChange={setQuality}
      />
      
      {/* 3D Canvas Layer */}
      {shouldRender && (
        <SolarSystemCanvas
          songs={songs}
          songsByElement={songsByElement}
          zoomLevel={zoomLevel}
          onPlanetSelect={onPlanetSelect}
          showStats={showStats}
          quality={quality}
        />
      )}
    </div>
  );
}