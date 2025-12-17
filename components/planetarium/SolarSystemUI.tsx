'use client';

import React, { useState } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface SolarSystemUIProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  shouldRender: boolean;
  mapCollapsed: boolean;
  onMapToggle: () => void;
  showStats?: boolean;
  onStatsToggle?: () => void;
  quality: 'low' | 'high';
  onQualityChange: (quality: 'low' | 'high') => void;
}

export const SolarSystemUI = React.memo(({ 
  songs, 
  songsByElement, 
  shouldRender,
  mapCollapsed,
  onMapToggle,
  showStats = false,
  onStatsToggle,
  quality,
  onQualityChange
}: SolarSystemUIProps) => {
  return (
    <>
      {/* Info Bar */}
      <div className="absolute top-0 left-0 z-10 bg-purple-500 text-white p-2 text-sm pointer-events-none min-w-[320px]">
        Interactive Planetarium - Drag to orbit • Scroll to zoom • {songs.length} Songs
      </div>
      
      {/* Performance Controls */}
      <div className="absolute top-0 left-4 z-10 flex gap-2 mt-12">
        {onStatsToggle && (
          <button
            onClick={onStatsToggle}
            className={`px-3 py-1 text-xs rounded ${
              showStats 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Stats
          </button>
        )}
        <button
          onClick={() => onQualityChange(quality === 'high' ? 'low' : 'high')}
          className={`px-3 py-1 text-xs rounded ${
            quality === 'high'
              ? 'bg-blue-600 text-white'
              : 'bg-orange-600 text-white'
          }`}
        >
          {quality === 'high' ? 'High' : 'Low'} Quality
        </button>
      </div>

      {/* 2D Mini-Map - Collapsible, Top Right */}
      {shouldRender && (
        <div className="absolute top-20 right-4 z-20 bg-black bg-opacity-90 backdrop-blur rounded-lg border border-gray-700 shadow-lg transition-all duration-300">
          <div 
            className="text-white text-xs font-mono p-3 font-bold cursor-pointer hover:bg-gray-800 flex items-center justify-between"
            onClick={onMapToggle}
          >
            <span>🗺️ SYSTEM MAP</span>
            <span className={`transition-transform duration-300 ${mapCollapsed ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
          
          {!mapCollapsed && (
            <div className="p-4 pt-0">
              <div className="relative w-36 h-36 border border-gray-500 rounded-full bg-gradient-radial from-gray-800 via-gray-900 to-black overflow-hidden">
                {/* Orbital rings for visual reference */}
                <div className="absolute inset-4 border border-gray-700 border-opacity-30 rounded-full"></div>
                <div className="absolute inset-8 border border-gray-700 border-opacity-20 rounded-full"></div>
                <div className="absolute inset-12 border border-gray-700 border-opacity-10 rounded-full"></div>
                
                {/* Center planet */}
                <div 
                  className="absolute w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  title="Heartverse Core"
                />
                
                {/* Element planets */}
                <div 
                  className="absolute w-1.5 h-1.5 bg-pink-500 rounded-full shadow-md shadow-pink-500/50"
                  style={{
                    top: '20%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  title="Heart Planet"
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-blue-500 rounded-full shadow-md shadow-blue-500/50"
                  style={{
                    top: '50%',
                    right: '20%',
                    transform: 'translate(50%, -50%)'
                  }}
                  title="Water Planet"
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-md shadow-yellow-500/50"
                  style={{
                    bottom: '20%',
                    left: '50%',
                    transform: 'translate(-50%, 50%)'
                  }}
                  title="Lightning Planet"
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-purple-500 rounded-full shadow-md shadow-purple-500/50"
                  style={{
                    top: '50%',
                    left: '20%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  title="Darkness Planet"
                />

                {/* Song planets as small dots */}
                {Object.entries(songsByElement).map(([elementKey, songs]) => {
                  const elementConfigs = {
                    heart: { color: 'bg-pink-400', centerX: 50, centerY: 30, baseAngle: 0 },
                    water: { color: 'bg-blue-400', centerX: 70, centerY: 50, baseAngle: Math.PI / 2 },
                    lightning: { color: 'bg-yellow-400', centerX: 50, centerY: 70, baseAngle: Math.PI },
                    darkness: { color: 'bg-purple-400', centerX: 30, centerY: 50, baseAngle: 3 * Math.PI / 2 }
                  };

                  const element = elementConfigs[elementKey as keyof typeof elementConfigs];
                  if (!element || songs.length === 0) return null;

                  return songs.map((song, songIndex) => {
                    // Distribute songs in rings around their element planet
                    const songsPerRing = Math.ceil(Math.sqrt(songs.length));
                    const ringIndex = Math.floor(songIndex / songsPerRing);
                    const positionInRing = songIndex % songsPerRing;
                    
                    const angle = element.baseAngle + (positionInRing / songsPerRing) * Math.PI - Math.PI/2;
                    const radius = 6 + ringIndex * 4; // Closer orbits around element planets
                    const x = element.centerX + radius * Math.cos(angle);
                    const y = element.centerY + radius * Math.sin(angle);

                    return (
                      <div
                        key={song.id}
                        className={`absolute w-1 h-1 rounded-full transition-all duration-300 ${
                          song.is_released ? element.color : 'bg-gray-500'
                        } ${song.is_released ? 'shadow-sm animate-pulse' : 'opacity-70'}`}
                        style={{
                          left: `${Math.max(2, Math.min(98, x))}%`,
                          top: `${Math.max(2, Math.min(98, y))}%`,
                          transform: 'translate(-50%, -50%)',
                          animationDuration: song.is_released ? '2s' : undefined
                        }}
                        title={`${song.title} (${song.is_released ? 'Released' : 'Unreleased'})`}
                      />
                    );
                  });
                })}
              </div>
              
              <div className="text-gray-400 text-xs mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                    <span>Core</span>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-1 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-pink-400 rounded-full"></div>
                      <span>Heart</span>
                    </div>
                    <span className="text-gray-500">{songsByElement.heart?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span>Water</span>
                    </div>
                    <span className="text-gray-500">{songsByElement.water?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                      <span>Lightning</span>
                    </div>
                    <span className="text-gray-500">{songsByElement.lightning?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                      <span>Darkness</span>
                    </div>
                    <span className="text-gray-500">{songsByElement.darkness?.length || 0}</span>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-1 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                      <span>Released</span>
                    </div>
                    <span className="text-gray-500">{songs.filter(s => s.is_released).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      <span>Unreleased</span>
                    </div>
                    <span className="text-gray-500">{songs.filter(s => !s.is_released).length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
});

SolarSystemUI.displayName = 'SolarSystemUI';