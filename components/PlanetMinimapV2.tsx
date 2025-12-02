'use client';

import React, { useState, useMemo } from 'react';
import { usePlanetPositions } from './planet-positions-context';

interface TooltipInfo {
  x: number;
  y: number;
  content: string;
}

export function PlanetMinimapV2() {
  const { positions, activePlanetId, setActivePlanetId } = usePlanetPositions();
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const mapSize = 260;
  const mapScale = 8; // Scale factor to map 3D coordinates to 2D minimap

  const worldToMap = (worldX: number, worldZ: number) => {
    const mapX = (worldX / mapScale) * (mapSize / 2) + mapSize / 2;
    const mapY = (-worldZ / mapScale) * (mapSize / 2) + mapSize / 2; // Flip Z for top-down view
    return { x: mapX, y: mapY };
  };

  const planetPositions = useMemo(() => {
    const result: Array<{
      id: string;
      x: number;
      y: number;
      planet: any;
      size: number;
      color: string;
    }> = [];

    positions.forEach((position, id) => {
      const mapPos = worldToMap(position.x, position.z);
      let size = 4;
      let color = '#6b7280';

      switch (position.data.kind) {
        case 'center':
          size = 12;
          color = '#f59e0b';
          break;
        case 'element':
          size = 8;
          color = '#3b82f6';
          break;
        case 'song':
          size = 6;
          color = position.data.released ? '#10b981' : '#6b7280';
          break;
      }

      result.push({
        id,
        x: mapPos.x,
        y: mapPos.y,
        planet: position.data,
        size,
        color,
      });
    });

    return result;
  }, [positions]);

  const handlePlanetHover = (
    e: React.MouseEvent,
    planet: { id: string; planet: any } | null
  ) => {
    if (planet) {
      setActivePlanetId(planet.id);
      
      let typeLabel = '';
      switch (planet.planet.kind) {
        case 'center':
          typeLabel = 'Center Planet';
          break;
        case 'element':
          typeLabel = 'Element Planet';
          break;
        case 'song':
          typeLabel = planet.planet.released ? 'Released Song' : 'Unreleased Song';
          break;
      }

      setTooltip({
        x: e.clientX + 10,
        y: e.clientY - 10,
        content: `${planet.planet.name} (${typeLabel})`
      });
    } else {
      setActivePlanetId(null);
      setTooltip(null);
    }
  };

  return (
    <div className="relative">
      <div className="text-xs text-gray-400 mb-2 font-medium">
        Galaxy Map
      </div>
      
      <div className="relative">
        <svg
          width={mapSize}
          height={mapSize}
          className="bg-gray-900 rounded-lg border border-gray-700"
          onMouseLeave={() => handlePlanetHover({} as React.MouseEvent, null)}
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgb(55, 65, 81)"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Center crosshairs */}
          <g opacity="0.4">
            <line
              x1={mapSize / 2}
              y1="0"
              x2={mapSize / 2}
              y2={mapSize}
              stroke="rgb(75, 85, 99)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1={mapSize / 2}
              x2={mapSize}
              y2={mapSize / 2}
              stroke="rgb(75, 85, 99)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </g>
          
          {/* Planet dots */}
          {planetPositions.map((planet) => (
            <g key={planet.id}>
              {/* Glow effect for active planet */}
              {activePlanetId === planet.id && (
                <circle
                  cx={planet.x}
                  cy={planet.y}
                  r={planet.size + 3}
                  fill={planet.color}
                  opacity="0.4"
                />
              )}
              
              {/* Planet dot */}
              <circle
                cx={planet.x}
                cy={planet.y}
                r={planet.size}
                fill={planet.color}
                stroke={activePlanetId === planet.id ? '#ffffff' : 'transparent'}
                strokeWidth="1"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={(e) => handlePlanetHover(e, planet)}
              />
              
              {/* Planet name label for larger planets */}
              {(planet.planet.kind === 'center' || planet.planet.kind === 'element') && (
                <text
                  x={planet.x}
                  y={planet.y + planet.size + 12}
                  textAnchor="middle"
                  className="text-[8px] fill-gray-300 pointer-events-none"
                  opacity="0.8"
                >
                  {planet.planet.name.split(' ')[0]}
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="mt-3 text-[10px] text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Center</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Element</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Released Song</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span>Unreleased Song</span>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}