"use client";

import React from "react";

interface ElementPosition {
  code: "heart" | "water" | "lightning" | "darkness";
  label: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
}

interface PlanetMinimapProps {
  currentMainId?: string | null;
  hoverId?: string | null;
}

// Element configurations matching PlanetSystem.tsx - UPDATED POSITIONS
const ELEMENTS: ElementPosition[] = [
  { code: "heart",     label: "💖 Heart", position: [25, 0, 0],   color: "#FC54AF", glowColor: "#FC54AF" },
  { code: "water",     label: "🌊 Water", position: [0, 0, 25],   color: "#38B6FF", glowColor: "#38B6FF" },
  { code: "lightning", label: "⚡ Lightning", position: [-25, 0, 0],  color: "#F2EF1D", glowColor: "#F2EF1D" },
  { code: "darkness",  label: "🌑 Darkness", position: [0, -25, 0],  color: "#6A4C93", glowColor: "#6A4C93" },
];

export default function PlanetMinimap({ currentMainId, hoverId }: PlanetMinimapProps) {
  // Convert 3D positions to 2D minimap coordinates
  const convertTo2D = (position: [number, number, number]): { x: number; y: number } => {
    const [x, y, z] = position;
    // Scale down and center in minimap (assuming 160px minimap size)
    const scale = 2.5;
    return {
      x: 80 + (x * scale), // Center at 80px + scaled X
      y: 80 + (y * scale) - (z * scale)  // Center at 80px + Y offset - inverted scaled Z
    };
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-40 h-40 bg-black/60 backdrop-blur-sm border-2 border-cyan-400/50 rounded-lg p-2">
      {/* Minimap background */}
      <div className="relative w-full h-full bg-gradient-radial from-blue-900/20 to-transparent rounded">
        
        {/* Center heart planet */}
        <div 
          className="absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ 
            left: "50%", 
            top: "50%",
            backgroundColor: "#FC54AF60",
            borderColor: "#FC54AF",
            boxShadow: "0 0 12px #FC54AF"
          }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white" style={{textShadow: "0 0 4px black"}}>
            💖 CENTER
          </div>
        </div>

        {/* Elemental planets */}
        {ELEMENTS.map((element) => {
          const pos2D = convertTo2D(element.position);
          
          return (
            <div
              key={element.code}
              className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                left: `${pos2D.x}px`,
                top: `${pos2D.y}px`,
                backgroundColor: element.color + "80",
                border: `2px solid ${element.color}`,
                boxShadow: `0 0 10px ${element.glowColor}60`,
              }}
            >
              {/* Element full label */}
              <div 
                className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-white whitespace-nowrap"
                style={{ 
                  filter: "drop-shadow(0 0 3px black)",
                  color: element.color
                }}
              >
                {element.label}
              </div>
            </div>
          );
        })}

        {/* Grid lines for reference */}
        <div className="absolute inset-0 opacity-20">
          {/* Horizontal center line */}
          <div 
            className="absolute w-full h-px bg-cyan-400/40"
            style={{ top: "50%" }}
          />
          {/* Vertical center line */}
          <div 
            className="absolute h-full w-px bg-cyan-400/40"
            style={{ left: "50%" }}
          />
        </div>

        {/* Minimap label */}
        <div className="absolute -bottom-2 left-0 text-[10px] text-cyan-400/90 font-mono font-bold">
          PLANET MAP
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-0 right-0 text-[8px] text-green-400/70 font-mono">
          ● ACTIVE
        </div>
      </div>
    </div>
  );
}