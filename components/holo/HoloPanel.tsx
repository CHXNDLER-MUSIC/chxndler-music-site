'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { playerStore } from '@/store/usePlayerStore';
import { buildPlanetSongs } from '@/lib/planets';
import SongList from '@/components/holo/SongList';
import HoloAudioBridge from '@/components/holo/HoloAudioBridge';

// WebGL scene must remain client-only
const PlanetSystem = dynamic(() => import('@/components/holo/PlanetSystem'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-cyan-300/70">
      Loading hologram…
    </div>
  ),
});

export default function HoloPanel() {
  // Initialize songs once on mount
  useEffect(() => {
    const { holoSongs } = buildPlanetSongs();
    console.log('🎵 HoloPanel: Initializing songs', { count: holoSongs.length, holoSongs });
    playerStore.getState().initSongs(holoSongs);
  }, []);

  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { mainId, songs } = storeSnap as any;
  const main = songs.find((s) => s.id === mainId);

  return (
    <section
      className="relative mx-auto mt-6 w-[min(1150px,95vw)] rounded-2xl holo-panel"
      aria-label="Holographic cockpit dashboard"
    >
      <div className="scanlines pointer-events-none" aria-hidden />
      <div className="relative p-4 md:p-6">
        {/* Hidden audio bridge for the /holo route */}
        <div className="hidden">
          <HoloAudioBridge />
        </div>

        {/* Song List - positioned below the clipped 3D display */}
        <div className="mt-16 h-[200px] md:h-[240px] lg:h-[280px] rounded-xl bg-black/30 backdrop-blur-md ring-1 ring-cyan-400/20 p-2" style={{ pointerEvents: 'auto' }}>
          <SongList onSongChange={(id) => {
            // Handle song selection from the song list
            // This could trigger navigation or player updates if needed
          }} />
        </div>
      </div>

      {/* Full-width cyan underglow to sell the hologram panel */}
      <div
        className="pointer-events-none absolute inset-x-[-20px] -bottom-2 h-16 mix-blend-screen opacity-80"
        style={{
          background:
            'radial-gradient(70% 120% at 50% 100%, rgba(61,245,255,.42), rgba(61,245,255,0) 70%)',
          filter: 'blur(12px)',
        }}
        aria-hidden
      />
    </section>
  );
}
