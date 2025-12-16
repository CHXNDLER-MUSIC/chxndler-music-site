'use client';

import React, { useMemo, useEffect } from 'react';
import { PlanetSystemV2 } from './PlanetSystemV2';
import { PlanetPositionsProvider, usePlanetPositions } from './planet-positions-context';

interface WorldPlanetariumProps {
  worldId?: string;
  className?: string;
  onPlanetSelect?: (planetId: string) => void;
  style?: React.CSSProperties;
}

// Internal component that uses the context
function WorldPlanetariumInner({ 
  worldId, 
  className = "w-full h-[500px]", 
  onPlanetSelect,
  style,
  activePlanetId
}: WorldPlanetariumProps & { activePlanetId?: string }) {
  const { setActivePlanetId } = usePlanetPositions();

  // Set initial active planet when worldId changes
  useEffect(() => {
    if (activePlanetId) {
      setActivePlanetId(activePlanetId);
    }
  }, [activePlanetId, setActivePlanetId]);

  return (
    <div 
      className={className}
      style={{ 
        position: 'relative',
        pointerEvents: 'none', // Allow UI interactions to pass through
        ...style 
      }}
    >
      <PlanetSystemV2 
        initialActivePlanet={activePlanetId}
        onPlanetSelect={onPlanetSelect}
        worldId={worldId}
      />
    </div>
  );
}

export function WorldPlanetarium({ 
  worldId, 
  className, 
  onPlanetSelect,
  style
}: WorldPlanetariumProps) {
  
  // World-to-planet mapping for highlighting
  const activePlanetId = useMemo(() => {
    if (!worldId) return undefined;
    
    // Map world IDs to planet IDs
    switch (worldId) {
      case 'heart':
      case 'heartverse':
        return 'HEART';
      case 'water':
      case 'ocean':
        return 'WATER';  
      case 'lightning':
      case 'electric':
        return 'LIGHTNING';
      case 'darkness':
      case 'shadow':
        return 'DARKNESS';
      case 'center':
      case 'core':
        return 'CENTER';
      default:
        return undefined;
    }
  }, [worldId]);

  return (
    <PlanetPositionsProvider>
      <WorldPlanetariumInner
        worldId={worldId}
        className={className}
        onPlanetSelect={onPlanetSelect}
        style={style}
        activePlanetId={activePlanetId}
      />
    </PlanetPositionsProvider>
  );
}