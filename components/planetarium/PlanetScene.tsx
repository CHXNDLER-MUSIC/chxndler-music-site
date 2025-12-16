'use client';

import React, { useState } from 'react';
import { PlanetPositionsProvider } from '../planet-positions-context';
import { PlanetMinimapV2 } from '../PlanetMinimapV2';
import { Planets } from './Planets';

export function PlanetScene() {
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <PlanetPositionsProvider>
      <div className="relative w-full h-[500px]">
        {/* Zoom controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <button
            onClick={() => {
              console.log('Zoom In clicked, current:', zoomLevel);
              setZoomLevel((z) => {
                const newZoom = Math.min(z + 0.2, 2);
                console.log('New zoom level:', newZoom);
                return newZoom;
              });
            }}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom In ({zoomLevel.toFixed(1)})
          </button>
          <button
            onClick={() => {
              console.log('Zoom Out clicked, current:', zoomLevel);
              setZoomLevel((z) => {
                const newZoom = Math.max(z - 0.2, 0.4);
                console.log('New zoom level:', newZoom);
                return newZoom;
              });
            }}
            className="rounded-xl bg-black/60 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            Zoom Out ({zoomLevel.toFixed(1)})
          </button>
        </div>

        <Planets zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
      </div>

      <div className="mt-3">
        <PlanetMinimapV2 />
      </div>
    </PlanetPositionsProvider>
  );
}