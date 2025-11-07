"use client";

import React, { useState, useEffect } from 'react';
import { playerStore } from '@/store/usePlayerStore';

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
    </div>
  );
}
