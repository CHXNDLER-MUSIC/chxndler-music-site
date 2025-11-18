"use client";

import React, { useState } from "react";
import PlanetSystem from "@/components/holo/PlanetSystem";
import HeartverseSystemWrapper from "@/components/holo/HeartverseSystemWrapper";

export default function TestPlanets() {
  const [showHeartverse, setShowHeartverse] = useState(false);
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: 9999,
      background: 'rgba(0,0,0,0.9)',
      pointerEvents: 'auto'
    }}>
      {/* Toggle button */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setShowHeartverse(false)}
          style={{
            padding: '8px 16px',
            background: !showHeartverse ? '#19E3FF' : 'rgba(25,227,255,0.3)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Original System
        </button>
        <button
          onClick={() => setShowHeartverse(true)}
          style={{
            padding: '8px 16px',
            background: showHeartverse ? '#FC54AF' : 'rgba(252,84,175,0.3)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Heartverse System
        </button>
      </div>

      {/* Display the selected system */}
      {showHeartverse ? (
        <HeartverseSystemWrapper 
          showAll={true} 
          hideUntilPlaying={false}
          onSongClick={(songId) => {
            console.log('Song clicked:', songId);
          }}
        />
      ) : (
        <div style={{ pointerEvents: 'none' }}>
          <PlanetSystem showAll={true} hideUntilPlaying={false} />
        </div>
      )}
    </div>
  );
}
