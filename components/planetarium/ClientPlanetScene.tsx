'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

interface ClientPlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

// Dynamic import for Vanilla Planetarium
const RuntimePlanetScene = dynamic(
  () => import('./VanillaPlanetarium'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading Planetarium...
        </div>
      </div>
    )
  }
);

export default function ClientPlanetScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: ClientPlanetSceneProps) {
  const [use3D, setUse3D] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Try to load 3D scene, only fallback if there's an actual error
    // Removing automatic timeout to give 3D more chance to load
    console.log('ClientPlanetScene: Attempting to load 3D scene...');
  }, []);

  // Get the active planet name based on worldId
  const getActivePlanetName = (worldId?: string) => {
    switch (worldId) {
      case 'heart': return 'Heart Planet';
      case 'water': return 'Water Planet';
      case 'lightning': return 'Lightning Planet';
      case 'darkness': return 'Darkness Planet';
      default: return 'Center Planet';
    }
  };

  const activePlanetName = getActivePlanetName(worldId);

  // Try 3D scene first, fall back to 2D if error
  if (use3D && !error) {
    return (
      <Suspense fallback={
        <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
            Loading 3D Scene...
          </div>
        </div>
      }>
        <RuntimePlanetScene 
          zoomLevel={zoomLevel}
          initialActivePlanet={initialActivePlanet}
          onPlanetSelect={onPlanetSelect}
          worldId={worldId}
        />
      </Suspense>
    );
  }

  // 2D fallback
  if (error || !use3D) {
    return (
      <div className="h-[500px] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-lg overflow-hidden relative">
        {/* Starfield background */}
        <div className="absolute inset-0">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: Math.random() * 0.8 + 0.2
              }}
            />
          ))}
        </div>

        {/* Central planet system */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Center planet */}
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
            
            {/* Orbiting planets - positioned at 90-degree intervals with element-specific shapes */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
              <div className="relative w-40 h-40">
                {/* Heart Planet - Top (0°) */}
                <div className={`absolute w-4 h-4 shadow-md rounded ${
                  worldId === 'heart' ? 'bg-red-500 shadow-red-500/50 scale-150' : 'bg-red-400 shadow-red-400/50'
                }`} 
                style={{
                  top: '0px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  clipPath: 'polygon(50% 15%, 65% 40%, 100% 40%, 75% 65%, 85% 90%, 50% 75%, 15% 90%, 25% 65%, 0% 40%, 35% 40%)'
                }} />
                
                {/* Water Planet - Right (90°) */}
                <div className={`absolute w-4 h-5 shadow-md ${
                  worldId === 'water' ? 'bg-blue-500 shadow-blue-500/50 scale-150' : 'bg-blue-400 shadow-blue-400/50'
                }`} 
                style={{
                  top: '50%',
                  right: '0px',
                  transform: 'translateY(-50%)',
                  borderRadius: '50% 50% 50% 0'
                }} />
                
                {/* Lightning Planet - Bottom (180°) */}
                <div className={`absolute w-4 h-4 shadow-md ${
                  worldId === 'lightning' ? 'bg-yellow-500 shadow-yellow-500/50 scale-150' : 'bg-yellow-400 shadow-yellow-400/50'
                }`}
                style={{
                  bottom: '0px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  clipPath: 'polygon(30% 0%, 50% 30%, 40% 30%, 70% 100%, 45% 60%, 55% 60%)'
                }} />
                
                {/* Darkness Planet - Left (270°) */}
                <div className={`absolute w-4 h-4 shadow-md ${
                  worldId === 'darkness' ? 'bg-purple-500 shadow-purple-500/50 scale-150' : 'bg-purple-400 shadow-purple-400/50'
                }`}
                style={{
                  top: '50%',
                  left: '0px',
                  transform: 'translateY(-50%)',
                  clipPath: 'polygon(50% 0%, 80% 20%, 100% 60%, 70% 100%, 30% 100%, 0% 60%, 20% 20%)'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Active planet info */}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-lg px-4 py-2">
          <div className="text-white text-sm font-medium">Active: {activePlanetName}</div>
          <div className="text-gray-300 text-xs">Zoom: {Math.round(zoomLevel * 100)}%</div>
        </div>

        {/* Temporary notice */}
        <div className="absolute top-4 right-4 bg-yellow-500/20 backdrop-blur rounded-lg px-3 py-1">
          <div className="text-yellow-200 text-xs">2D View (3D Loading...)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] bg-gray-800 rounded flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
        Loading 3D Scene...
      </div>
    </div>
  );
}