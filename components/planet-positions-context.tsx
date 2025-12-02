'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Planet } from './planet-data';

export interface PlanetPosition {
  x: number;
  y: number;
  z: number;
  data: Planet;
}

export interface PlanetPositionsContextType {
  positions: Map<string, PlanetPosition>;
  activePlanetId: string | null;
  setPositions: (positions: Map<string, PlanetPosition>) => void;
  setActivePlanetId: (planetId: string | null) => void;
  updatePosition: (planetId: string, position: PlanetPosition) => void;
}

const PlanetPositionsContext = createContext<PlanetPositionsContextType | null>(null);

export function PlanetPositionsProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<Map<string, PlanetPosition>>(new Map());
  const [activePlanetId, setActivePlanetId] = useState<string | null>(null);

  const updatePosition = (planetId: string, position: PlanetPosition) => {
    setPositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(planetId, position);
      return newPositions;
    });
  };

  const value: PlanetPositionsContextType = {
    positions,
    activePlanetId,
    setPositions,
    setActivePlanetId,
    updatePosition,
  };

  return (
    <PlanetPositionsContext.Provider value={value}>
      {children}
    </PlanetPositionsContext.Provider>
  );
}

export function usePlanetPositions() {
  const context = useContext(PlanetPositionsContext);
  if (!context) {
    throw new Error('usePlanetPositions must be used within a PlanetPositionsProvider');
  }
  return context;
}