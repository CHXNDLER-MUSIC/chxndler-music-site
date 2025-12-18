'use client';

import dynamic from 'next/dynamic';
import { useSongs } from '@/hooks/useSongs';

// Dynamically import 3D planets to avoid SSR issues with Three.js
const Pure3DPlanets = dynamic(() => import('@/components/planetarium/Pure3DPlanets'), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center text-cyan-400">Loading 3D planets...</div>
});

export default function TestPlanetsPage() {
  const { songs, songsByElement, loading } = useSongs();

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          3D Planets Test Page
        </h1>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3D Planet Solar System
          </h2>

          <div className="h-[500px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-cyan-400">Loading songs...</div>
            ) : (
              <Pure3DPlanets
                songs={songs}
                songsByElement={songsByElement}
                zoomLevel={1}
                onPlanetSelect={(planetId) => console.log('Selected planet:', planetId)}
                quality="high"
              />
            )}
          </div>

          <div className="mt-6 text-sm text-gray-400">
            <p><strong>Controls:</strong></p>
            <ul className="list-disc ml-6 mt-2">
              <li>Drag to orbit the camera around the planets</li>
              <li>Scroll wheel to zoom in/out</li>
              <li>Click on planets to select them</li>
              <li>Auto-rotation is enabled</li>
            </ul>
            <p className="mt-4"><strong>Songs loaded:</strong> {songs.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}