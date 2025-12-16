'use client';

import React from 'react';
import { PlanetPositionsProvider } from './planet-positions-context';
import { PlanetMinimapV2 } from './PlanetMinimapV2';
import { PlanetScene } from './planetarium/PlanetScene';

interface PlanetSystemV2Props {
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export function PlanetSystemV2({ 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: PlanetSystemV2Props = {}) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [is3DLoaded, setIs3DLoaded] = React.useState(false);

  React.useEffect(() => {
    // Only load 3D components on client side
    setIs3DLoaded(true);
  }, []);

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px]">
        {/* Zoom controls */}
        {is3DLoaded && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
              className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
            >
              Zoom In
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.4))}
              className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
            >
              Zoom Out
            </button>
          </div>
        )}

        {is3DLoaded ? (
          <PlanetScene 
            zoomLevel={zoomLevel} 
            initialActivePlanet={initialActivePlanet}
            onPlanetSelect={onPlanetSelect}
            worldId={worldId}
          />
        ) : (
          <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
            Initializing 3D Engine...
          </div>
        )}
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}