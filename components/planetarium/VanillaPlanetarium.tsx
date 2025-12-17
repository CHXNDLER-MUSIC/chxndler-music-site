'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSongs, type SongWithElement } from '@/hooks/useSongs';
import { SolarSystemUI } from './SolarSystemUI';

// Dynamic import to prevent SSR issues with React Three Fiber
const DynamicSolarSystemCanvas = dynamic(
  () => import('./SolarSystemCanvas'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Heartverse...
        </div>
      </div>
    )
  }
);

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
  const [isClient, setIsClient] = useState(false);
  
  // Fetch real songs data
  const { songs, songsByElement, loading: songsLoading, error: songsError } = useSongs();
  
  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window !== 'undefined') {
      setIsClient(true);
    }
  }, []);
  
  // Loading state - temporarily bypass for testing
  if (false && songsLoading) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading Heartverse Solar System...
        </div>
      </div>
    );
  }
  
  if (!isClient) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Heartverse...
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
    <div className="w-full h-[500px] relative overflow-hidden bg-gray-900 border border-gray-700 rounded">
      {/* 3D Canvas Layer - Only render on client */}
      <SolarSystemCanvas
        songs={songs}
        songsByElement={songsByElement}
        zoomLevel={zoomLevel}
        onPlanetSelect={onPlanetSelect}
        quality={getDeviceQuality()}
        showStats={false}
      />

      {/* Simple overlay */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-lg px-4 py-2 pointer-events-none">
        <div className="text-white text-sm font-medium">
          🌌 3D Heartverse Solar System
        </div>
        <div className="text-gray-300 text-xs">
          Songs: {songs.length} | Zoom: {Math.round(zoomLevel * 100)}%
        </div>
      </div>
    </div>
  );
}