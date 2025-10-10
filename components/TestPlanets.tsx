"use client";

import React from "react";
import PlanetSystem from "@/components/holo/PlanetSystem";

export default function TestPlanets() {
  console.log("🚨🚨🚨 TestPlanets component rendering!");
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: 9999,
      background: 'rgba(0,0,0,0.8)',
      pointerEvents: 'none'
    }}>
      <PlanetSystem showAll={true} hideUntilPlaying={false} />
    </div>
  );
}