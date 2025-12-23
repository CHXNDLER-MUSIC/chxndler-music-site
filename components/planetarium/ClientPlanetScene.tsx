'use client';

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Pure3DPlanets from './Pure3DPlanets';
import { useSongs } from '@/hooks/useSongs';
import { useFocusElementOfDay } from '@/hooks/useFocusElementOfDay';
import { useElementOfDayClaim } from '@/hooks/useElementOfDayClaim';
import { useAudio } from '@/app/providers/AudioProvider';
import { playerStore } from '@/store/usePlayerStore';

interface ClientPlanetSceneProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

const getDeviceQuality = (): 'low' | 'high' => {
  if (typeof window === 'undefined') return 'high';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasLowRAM = 'deviceMemory' in navigator && (navigator as any).deviceMemory < 4;
  const hasSlowCPU = 'hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4;

  return (isMobile || hasLowRAM || hasSlowCPU) ? 'low' : 'high';
};

export default function ClientPlanetScene({
  zoomLevel,
  initialActivePlanet,
  onPlanetSelect,
  worldId
}: ClientPlanetSceneProps) {
  const { songs, songsByElement, loading, error } = useSongs();
  const { focusElement } = useFocusElementOfDay();
  const { loading: eodLoading, element, isClaimed, claim, intention, rewardKey, relicLabel, relicImageUrl } = useElementOfDayClaim();
  const [optimisticClaimed, setOptimisticClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const quality = getDeviceQuality();
  const audioManager = useAudio();

  // Subscribe to playerStore.mainId for dropdown → camera focus
  // When a song is selected via dropdown, mainId changes and we pass it to Pure3DPlanets
  const focusSongId = useSyncExternalStore(
    playerStore.subscribe,
    () => playerStore.getState().mainId,
    () => null // Server-side fallback
  );

  // Handle song/element track changes from planet warp
  const handleSongChange = useCallback(async (trackId: string) => {
    console.log('[ClientPlanetScene] handleSongChange called with:', trackId);
    try {
      // Use selectTrack which handles stopping current music, playing warp SFX, and auto-playing
      await audioManager.selectTrack(trackId);
    } catch (err) {
      console.error('[ClientPlanetScene] Failed to select track:', err);
    }
  }, [audioManager]);

  console.log('ClientPlanetScene render:', { loading, error: error?.message, songsCount: songs.length, quality });

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Planets...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-red-900/50 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">Error Loading Planets</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  console.log('ClientPlanetScene rendering Pure3DPlanets with:', { songs: songs.length, quality, glowingElement, intention });

  // Prefer element_of_day from DB; fallback to focus element source if needed
  const glowingElement = useMemo(() => element ?? focusElement ?? null, [element, focusElement]);
  const hasClaimed = useMemo(() => isClaimed || optimisticClaimed, [isClaimed, optimisticClaimed]);

  const handleDailyPlanetClick = useCallback(async () => {
    if (!glowingElement || hasClaimed || isClaiming) return null;
    setIsClaiming(true);
    // Optimistically stop glowing
    setOptimisticClaimed(true);
    try {
      const resp = await claim();
      const elemLabel = (glowingElement || '').toUpperCase();
      if (!resp) {
        // Error path
        setOptimisticClaimed(false);
        if (typeof window !== 'undefined') {
          try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Couldn’t claim reward`, type: 'error' } })); } catch {}
        }
        return null;
      }
      if (resp.already_claimed) {
        // Keep claimed, show already claimed toast
        if (typeof window !== 'undefined') {
          try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Already claimed today`, type: 'info' } })); } catch {}
        }
        return resp;
      }
      if (resp.ok) {
        // Modal is now shown from Pure3DPlanets after warp effect
        // Just log success here
        console.log('[ClientPlanetScene] Successfully claimed element of day reward');
        return resp;
      }
      // Not ok and not already claimed: revert
      setOptimisticClaimed(false);
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Couldn’t claim reward`, type: 'error' } })); } catch {}
      }
      return resp;
    } finally {
      setIsClaiming(false);
    }
  }, [glowingElement, hasClaimed, isClaiming, claim]);

  return (
    <Pure3DPlanets
      songs={songs}
      songsByElement={songsByElement}
      zoomLevel={zoomLevel}
      onPlanetSelect={onPlanetSelect}
      onSongChange={handleSongChange}
      quality={quality}
      focusElement={focusElement}
      // Focus Planet on Warp: pass mainId from playerStore so dropdown selection triggers camera focus
      focusSongId={focusSongId}
      // Element of the Day glow and click
      glowingElement={glowingElement}
      glowActive={!!glowingElement}
      hasClaimedElementOfDay={hasClaimed}
      isClaimingReward={isClaiming}
      onDailyPlanetClick={handleDailyPlanetClick}
      intentionOfDay={intention}
      rewardKey={rewardKey}
      relicLabel={relicLabel}
      relicImageUrl={relicImageUrl}
    />
  );
}
