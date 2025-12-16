'use client';

import { PlanetSystemV2 } from '@/components/PlanetSystemV2';

export default function TestPlanetsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          PlanetSystemV2 Test Page
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3D Planet System with Linked Minimap
          </h2>
          
          <PlanetSystemV2 />
          
          <div className="mt-6 text-sm text-gray-400">
            <p><strong>Controls:</strong></p>
            <ul className="list-disc ml-6 mt-2">
              <li>Drag to orbit the camera around the planets</li>
              <li>Scroll wheel to zoom in/out</li>
              <li>Use zoom buttons for fine control</li>
              <li>Hover over planets in the minimap to highlight them in 3D</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}