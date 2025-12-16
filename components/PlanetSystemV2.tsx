'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PlanetPositionsProvider } from './planet-positions-context';
import { PlanetMinimapV2 } from './PlanetMinimapV2';

interface PlanetSystemV2Props {
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

// Dynamic import with complete SSR isolation
const ClientPlanetScene = dynamic(
  () => import('./planetarium/ClientPlanetScene'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        Loading 3D Scene...
      </div>
    )
  }
);

export function PlanetSystemV2({ 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: PlanetSystemV2Props = {}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <PlanetPositionsProvider>
        <div className="relative w-full h-[500px]">
          <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
            Loading 3D Scene...
          </div>
        </div>
        <div className="mt-3">
          <PlanetMinimapV2 />
        </div>
      </PlanetPositionsProvider>
    );
  }

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px] overflow-hidden">
        {/* Zoom controls */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors pointer-events-auto"
          >
            Zoom In
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors pointer-events-auto"
          >
            Zoom Out
          </button>
        </div>

        <ClientPlanetScene 
          zoomLevel={zoomLevel} 
          initialActivePlanet={initialActivePlanet}
          onPlanetSelect={onPlanetSelect}
          worldId={worldId}
        />
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}