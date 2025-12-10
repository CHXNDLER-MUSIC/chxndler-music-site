"use client";

import React, { useState, useEffect } from 'react';
import { playerStore } from '@/store/usePlayerStore';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';

export default function DebugPage() {
  const [storeState, setStoreState] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const updateState = () => setStoreState(playerStore.getState());
    updateState();
    return playerStore.subscribe(updateState);
  }, []);
  
  if (!mounted) return <div>Loading...</div>;
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#000', color: '#0f0' }}>
      <h1>Debug Player Store State</h1>
      <pre>{JSON.stringify(storeState, null, 2)}</pre>
      
      <h2>Store Methods Test</h2>
      <button onClick={() => {
        setStoreState(playerStore.getState());
      }}>
        Refresh State
      </button>
      
      <button onClick={() => {
        playerStore.getState().setPlanetDisplayMode('all');
        playerStore.getState().setPlanetsVisible(true);
        setStoreState(playerStore.getState());
      }}>
        Force Show All Planets
      </button>
      
      <h2>HeartCoin Celebration Test</h2>
      <button onClick={() => triggerHeartCoinCelebration(1)} style={{ margin: '5px', padding: '10px' }}>
        Test +1 HeartCoin
      </button>
      <button onClick={() => triggerHeartCoinCelebration(5)} style={{ margin: '5px', padding: '10px' }}>
        Test +5 HeartCoins
      </button>
      <button onClick={() => triggerHeartCoinCelebration(10)} style={{ margin: '5px', padding: '10px' }}>
        Test +10 HeartCoins
      </button>
    </div>
  );
}
