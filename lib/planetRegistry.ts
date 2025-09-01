import * as THREE from 'three';

export type PlanetEntry = {
  id: string;
  ringIndex: number;
  getWorldPosition: () => THREE.Vector3;
  getAngle: () => number; // current theta used for orbital placement
  addPhase: (delta: number) => void; // gently nudges phase toward separation
};

const entries = new Map<string, PlanetEntry>();

export function registerPlanet(e: PlanetEntry) {
  entries.set(e.id, e);
}

export function unregisterPlanet(id: string) {
  entries.delete(id);
}

export function getEntriesByRing(): Map<number, PlanetEntry[]> {
  const byRing = new Map<number, PlanetEntry[]>();
  for (const e of entries.values()) {
    if (!byRing.has(e.ringIndex)) byRing.set(e.ringIndex, []);
    byRing.get(e.ringIndex)!.push(e);
  }
  return byRing;
}

