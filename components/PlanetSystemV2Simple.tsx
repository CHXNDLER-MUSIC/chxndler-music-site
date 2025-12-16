'use client';

// Compatibility wrapper for existing imports
// This file maintains the same export name while using the new planetarium module structure
import React from 'react';
import { PlanetScene } from './planetarium/PlanetScene';

export function PlanetSystemV2() {
  return <PlanetScene />;
}