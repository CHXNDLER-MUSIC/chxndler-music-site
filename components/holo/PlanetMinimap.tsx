"use client";

import React from "react";
import { sfx } from "@/lib/sfx";

interface ElementPosition {
  code: "heart" | "water" | "lightning" | "darkness";
  label: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
}

interface Song {
  id: string;
  title: string;
  [key: string]: any;
}

interface PlanetMinimapProps {
  currentMainId?: string | null;
  hoverId?: string | null;
  songs?: Song[];
  onClose?: () => void;
}

// Element configurations matching PlanetSystemRaw.tsx ACTUAL positions - MORE SPREAD OUT
const ELEMENTS: ElementPosition[] = [
  { code: "water",     label: "Water", position: [35, 0, 0],   color: "#38B6FF", glowColor: "#38B6FF" },
  { code: "lightning", label: "Lightning", position: [0, 35, 0],  color: "#F2EF1D", glowColor: "#F2EF1D" },
  { code: "heart",     label: "Heart", position: [-35, 0, 0],   color: "#FC54AF", glowColor: "#FC54AF" },
  { code: "darkness",  label: "Darkness", position: [0, -35, 0],  color: "#6A4C93", glowColor: "#6A4C93" },
];

export default function PlanetMinimap({ currentMainId, hoverId, songs = [], onClose }: PlanetMinimapProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleClose = () => {
    sfx.play('close', 0.8);
    if (onClose) {
      onClose();
    }
  };

  // Distribute songs among elements (3 songs per element)
  const songsPerElement = React.useMemo(() => {
    const distribution: { [key: string]: Song[] } = {
      water: [],
      lightning: [],
      heart: [],
      darkness: []
    };

    // Distribute songs evenly among elements
    songs.forEach((song, index) => {
      const elementKeys = Object.keys(distribution);
      const elementKey = elementKeys[index % elementKeys.length];
      if (distribution[elementKey].length < 3) {
        distribution[elementKey].push(song);
      }
    });

    return distribution;
  }, [songs]);

  // Convert 3D positions to 2D minimap coordinates
  const convertTo2D = (position: [number, number, number]): { x: number; y: number } => {
    const [x, y, z] = position;
    // Scale down and center in minimap (240px minimap size)
    const scale = 3.0;
    return {
      x: 120 + (x * scale), // Center at 120px + scaled X
      y: 120 + (y * scale) - (z * scale)  // Center at 120px + Y offset - inverted scaled Z
    };
  };

  // Calculate true geometric center of the 4 elemental planets
  const centerPosition = React.useMemo(() => {
    const center2D = convertTo2D([0, 0, 0]); // Should be the true center
    return center2D;
  }, []);

  return (
    <div className={`fixed top-4 right-4 z-50 bg-black/60 backdrop-blur-sm border-2 border-cyan-400/50 rounded-lg transition-all duration-300 ${
      isCollapsed ? 'w-12 h-12' : 'w-60 h-60'
    }`}>
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-1 right-1 z-10 w-6 h-6 bg-cyan-400/20 hover:bg-cyan-400/40 border border-cyan-400/50 rounded text-cyan-400 text-xs font-bold transition-colors duration-200 flex items-center justify-center"
        title="Close minimap"
      >
        −
      </button>
      
      {!isCollapsed && (
        <div className="relative w-full h-full p-2">
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
            CENTER
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
          const orbitRadius = 15; // TIGHTER orbits - matches PlanetSystemRaw.tsx
          const elementSongs = songsPerElement[element.code] || [];
          
          return elementSongs.map((song, i) => {
            const angle = (i / Math.max(elementSongs.length, 3)) * Math.PI * 2;
            const x = element.position[0] + Math.cos(angle) * orbitRadius;
            const y = element.position[1] + Math.sin(angle) * orbitRadius * 0.3;
            const z = element.position[2] + Math.sin(angle) * orbitRadius * 0.5;
            
            const pos2D = convertTo2D([x, y, z]);
            
            return (
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
                title={song.title} // Simple tooltip
              >
                {/* Advanced tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[8px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  {song.title}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/80"></div>
                </div>
              </div>
            );
          });
        })}

        {/* Orbit paths for each elemental planet */}
        {ELEMENTS.map((element) => {
          const elementPos2D = convertTo2D(element.position);
          const orbitRadiusScaled = 15 * 3.0; // TIGHTER orbit rings
          
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
      )}
      
      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}