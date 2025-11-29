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

// Element configurations matching PlanetSystemRaw.tsx ACTUAL positions - MORE SPREAD OUT
const ELEMENTS: ElementPosition[] = [
  { code: "water",     label: "🌊 Water", position: [35, 0, 0],   color: "#38B6FF", glowColor: "#38B6FF" },
  { code: "lightning", label: "⚡ Lightning", position: [0, 35, 0],  color: "#F2EF1D", glowColor: "#F2EF1D" },
  { code: "heart",     label: "💖 Heart", position: [-35, 0, 0],   color: "#FC54AF", glowColor: "#FC54AF" },
  { code: "darkness",  label: "🌑 Darkness", position: [0, -35, 0],  color: "#6A4C93", glowColor: "#6A4C93" },
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

  // Calculate true geometric center of the 4 elemental planets
  const centerPosition = React.useMemo(() => {
    const center2D = convertTo2D([0, 0, 0]); // Should be the true center
    return center2D;
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 w-40 h-40 bg-black/60 backdrop-blur-sm border-2 border-cyan-400/50 rounded-lg p-2">
      {/* Minimap background */}
      <div className="relative w-full h-full bg-gradient-radial from-blue-900/20 to-transparent rounded">
        
        {/* Center heart planet - positioned at TRUE geometric center */}
        <div 
          className="absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ 
            left: `${centerPosition.x}px`, 
            top: `${centerPosition.y}px`,
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

        {/* Orbiting song planets around each elemental planet */}
        {ELEMENTS.map((element) => {
          const songPlanetsPerElement = 3;
          const orbitRadius = 15; // TIGHTER orbits - matches PlanetSystemRaw.tsx
          const songPlanets = [];
          
          for (let i = 0; i < songPlanetsPerElement; i++) {
            const angle = (i / songPlanetsPerElement) * Math.PI * 2;
            const x = element.position[0] + Math.cos(angle) * orbitRadius;
            const y = element.position[1] + Math.sin(angle) * orbitRadius * 0.3;
            const z = element.position[2] + Math.sin(angle) * orbitRadius * 0.5;
            
            const pos2D = convertTo2D([x, y, z]);
            
            // Sample song names for each element
            const songNames = {
              water: ['Ocean Dreams', 'River Flow', 'Deep Currents'],
              lightning: ['Electric Storm', 'Thunder Strike', 'Power Surge'],
              heart: ['Love Song', 'Heartbeat', 'Emotional'],
              darkness: ['Shadow Dance', 'Midnight', 'Eclipse']
            };
            
            const songName = songNames[element.code]?.[i] || `${element.code} Song ${i + 1}`;

            songPlanets.push(
              <div
                key={`${element.code}-song-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-all duration-200 group"
                style={{
                  left: `${pos2D.x}px`,
                  top: `${pos2D.y}px`,
                  backgroundColor: element.color + "60",
                  border: `1px solid ${element.color}`,
                  boxShadow: `0 0 4px ${element.glowColor}30`,
                }}
                title={songName} // Simple tooltip
              >
                {/* Advanced tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[8px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  {songName}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/80"></div>
                </div>
              </div>
            );
          }
          
          return songPlanets;
        })}

        {/* Orbit paths for each elemental planet */}
        {ELEMENTS.map((element) => {
          const elementPos2D = convertTo2D(element.position);
          const orbitRadiusScaled = 15 * 2.5; // TIGHTER orbit rings
          
          return (
            <div
              key={`${element.code}-orbit`}
              className="absolute rounded-full border border-opacity-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${elementPos2D.x}px`,
                top: `${elementPos2D.y}px`,
                width: `${orbitRadiusScaled * 2}px`,
                height: `${orbitRadiusScaled * 2}px`,
                borderColor: element.color + "30",
              }}
            />
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