'use client';

import React from 'react';
import VanillaPlanetarium from './VanillaPlanetarium';

interface ClientPlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

export default function ClientPlanetScene({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId 
}: ClientPlanetSceneProps) {
  return (
    <VanillaPlanetarium 
      zoomLevel={zoomLevel}
      initialActivePlanet={initialActivePlanet}
      onPlanetSelect={onPlanetSelect}
      worldId={worldId}
    />
  );
}