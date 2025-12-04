'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { playerStore } from '@/store/usePlayerStore';
import { useSongs } from '@/hooks/useSongs';
import { AUDIO_ASSETS_BY_SLUG } from '@/data/audioAssets';
import { SONG_ELEMENT_MAPPING } from '@/data/songElements';
import SongList from '@/components/holo/SongList';
import HoloAudioBridge from '@/components/holo/HoloAudioBridge';

// No 3D rendering needed in this panel - it's handled by the main dashboard

export default function HoloPanel() {
  const { songs: supabaseSongs, loading } = useSongs();

  // Convert Supabase songs to the format expected by the planet system
  const holoSongs = React.useMemo(() => {
    return supabaseSongs.map(song => {
      const asset = AUDIO_ASSETS_BY_SLUG[song.slug];
      const element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
      
      return {
        id: song.id,
        title: song.title,
        slug: song.slug,
        status: song.is_released ? 'released' : 'coming_soon',
        planet: {
          element: element,
          radius: 0.7,
          color: element === 'heart' ? '#FC54AF' : 
                 element === 'water' ? '#38B6FF' :
                 element === 'lightning' ? '#F2EF1D' : '#6A4C93',
          orbitRadius: element === 'heart' ? 5.5 : 
                      element === 'water' ? 6.5 :
                      element === 'lightning' ? 7.0 : 6.0,
          orbitSpeed: 0.5,
          tilt: 0.2
        },
        audioSrc: asset?.src,
        coverSrc: asset?.cover
      };
    });
  }, [supabaseSongs]);

  // Initialize songs when they're loaded
  useEffect(() => {
    if (holoSongs.length > 0) {
      playerStore.getState().initSongs(holoSongs);
    }
  }, [holoSongs]);

  const [storeSnap, setStoreSnap] = React.useState(() => playerStore.getState());
  React.useEffect(() => playerStore.subscribe(() => setStoreSnap(playerStore.getState())), []);
  const { mainId, songs } = storeSnap as any;
  const main = songs.find((s) => s.id === mainId);

  return (
    <section
      className="relative mx-auto mt-2 w-[min(1150px,95vw)] rounded-2xl holo-panel"
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
            // In the Holo panel standalone route, delegate to the 3D audio bridge
            // by updating the player store selection directly. The bridge will
            // handle warp -> join -> song sequencing.
            try {
              playerStore.getState().setMain(id);
              playerStore.getState().setPlanetDisplayMode('single');
              playerStore.getState().setPlanetsVisible(true);
            } catch {}
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
