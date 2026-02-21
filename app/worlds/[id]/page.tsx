'use client';

import { WorldPlanetarium } from '@/components/WorldPlanetarium';
import { useParams } from 'next/navigation';

export default function WorldPage() {
  const params = useParams();
  const worldId = params.id as string;

  const handlePlanetSelect = (planetId: string) => {
    if (process.env.NODE_ENV !== "production") console.log(`Planet selected: ${planetId} in world: ${worldId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            World: {worldId}
          </h1>
          <p className="text-gray-400">
            Explore the {worldId} planetary system
          </p>
        </div>

        {/* Main planetarium view */}
        <div className="relative">
          <WorldPlanetarium 
            worldId={worldId}
            onPlanetSelect={handlePlanetSelect}
            className="w-full h-[600px] rounded-lg overflow-hidden"
            style={{ 
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
          
          {/* UI overlay that should not be blocked */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
              <div className="font-semibold">World Info</div>
              <div>ID: {worldId}</div>
              <div>Interactive: Yes</div>
            </div>
          </div>
        </div>

        {/* Test controls */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['heart', 'water', 'lightning', 'darkness'].map((world) => (
            <button
              key={world}
              onClick={() => window.location.href = `/worlds/${world}`}
              className={`p-4 rounded-lg border transition-colors ${
                worldId === world
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold capitalize">{world} World</div>
              <div className="text-sm opacity-70">
                {world === worldId ? 'Current' : 'Visit'}
              </div>
            </button>
          ))}
        </div>

        {/* Mobile-specific test section */}
        <div className="mt-8 lg:hidden">
          <h2 className="text-xl font-semibold text-white mb-4">Mobile Test</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-3">
              Test touch interactions and UI responsiveness:
            </p>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                Mobile Test Button 1
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors">
                Mobile Test Button 2
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}