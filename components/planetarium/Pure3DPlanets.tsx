'use client';

import dynamic from 'next/dynamic';
import type { SongWithElement } from '@/hooks/useSongs';

export interface Pure3DPlanetsProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
}

const ThreeScene = dynamic(() => import('./ThreeScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
        Loading 3D Planets...
      </div>
    </div>
  ),
});

export default function Pure3DPlanets(props: Pure3DPlanetsProps) {
  return <ThreeScene {...props} />;
}
