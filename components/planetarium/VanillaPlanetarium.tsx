'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSongs, type SongWithElement } from '@/hooks/useSongs';

interface VanillaPlanetariumProps {
  zoomLevel: number;
  initialActivePlanet?: string;
  onPlanetSelect?: (planetId: string) => void;
  worldId?: string;
}

// Detect device quality
const getDeviceQuality = (): 'low' | 'high' => {
  if (typeof window === 'undefined') return 'high';
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasLowRAM = 'deviceMemory' in navigator && (navigator as any).deviceMemory < 4;
  const hasSlowCPU = 'hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4;
  
  return (isMobile || hasLowRAM || hasSlowCPU) ? 'low' : 'high';
};

function AnimatedSolarSystem({ onPlanetSelect, songs, zoomLevel }: { 
  onPlanetSelect?: (planetId: string) => void;
  songs: any[];
  zoomLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const animate = () => {
      setRotation(prev => prev + 0.01);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 500;

    // Clear with space gradient
    const gradient = ctx.createRadialGradient(250, 250, 0, 250, 250, 250);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 500);

    const centerX = 250;
    const centerY = 250;

    // Draw center sun with animated glow
    const glowIntensity = Math.sin(rotation * 3) * 0.3 + 0.7;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 20 + glowIntensity * 10;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 * zoomLevel, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw animated orbiting planets with elemental symbols
    const planets = [
      { id: 'heart', color: '#ff6b9d', baseAngle: 0, distance: 90, speed: 1, size: 25, symbol: '❤️' },
      { id: 'water', color: '#4fc3f7', baseAngle: Math.PI / 2, distance: 90, speed: 0.8, size: 25, symbol: '💧' },
      { id: 'lightning', color: '#ffeb3b', baseAngle: Math.PI, distance: 90, speed: 1.2, size: 25, symbol: '⚡' },
      { id: 'darkness', color: '#9c27b0', baseAngle: 3 * Math.PI / 2, distance: 90, speed: 0.9, size: 25, symbol: '🌙' }
    ];

    // Draw orbit paths
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 90 * zoomLevel, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    planets.forEach((planet, index) => {
      const angle = planet.baseAngle + rotation * planet.speed;
      const distance = planet.distance * zoomLevel;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      // Planet base circle with glow
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(x, y, planet.size * zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Planet border
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, planet.size * zoomLevel, 0, Math.PI * 2);
      ctx.stroke();

      // Element symbol
      ctx.font = `${Math.floor(24 * zoomLevel)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(planet.symbol, x, y);
      ctx.shadowBlur = 0;
    });

    // Draw animated stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const starX = (i * 37) % 500;
      const starY = (i * 51) % 500;
      const twinkle = Math.sin(rotation + i * 0.1) * 0.5 + 0.5;
      
      ctx.globalAlpha = twinkle * 0.8;
      ctx.beginPath();
      ctx.arc(starX, starY, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  }, [rotation, zoomLevel]);

  return (
    <canvas 
      ref={canvasRef}
      width={500} 
      height={500}
      className="w-full h-full cursor-pointer"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = 500 / rect.width;
        const scaleY = 500 / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const centerX = 250;
        const centerY = 250;
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distFromCenter < 35 * zoomLevel) {
          onPlanetSelect?.('center');
        } else if (distFromCenter > 60 * zoomLevel && distFromCenter < 120 * zoomLevel) {
          const angle = Math.atan2(y - centerY, x - centerX);
          let planetId = 'heart';
          
          if (angle >= -Math.PI/4 && angle < Math.PI/4) planetId = 'heart';
          else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) planetId = 'water';
          else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) planetId = 'lightning';
          else planetId = 'darkness';
          
          onPlanetSelect?.(planetId);
        }
      }}
    />
  );
}

export default function VanillaPlanetarium({ 
  zoomLevel, 
  initialActivePlanet, 
  onPlanetSelect, 
  worldId
}: VanillaPlanetariumProps) {
  const { songs, songsByElement, loading: songsLoading, error: songsError } = useSongs();
  const [quality] = useState<'low' | 'high'>(getDeviceQuality());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (process.env.NODE_ENV !== "production") console.log('VanillaPlanetarium mounted on client');
  }, []);

  if (process.env.NODE_ENV !== "production") console.log('VanillaPlanetarium render:', { 
    songsLoading, 
    songsError: songsError?.slice(0, 50), 
    songsCount: songs.length,
    isClient
  });

  if (songsError) {
    return (
      <div className="w-full h-[500px] bg-red-900 rounded flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h3 className="font-bold mb-2">Planetarium Error</h3>
          <p className="text-sm">{songsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] relative overflow-hidden bg-gray-900 border border-gray-700 rounded">
      {/* Animated Solar System */}
      <AnimatedSolarSystem
        onPlanetSelect={onPlanetSelect}
        songs={songs}
        zoomLevel={zoomLevel}
      />

      {/* Overlay info */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-lg px-4 py-2 pointer-events-none">
        <div className="text-white text-sm font-medium">
          🌌 Heartverse Solar System
        </div>
        <div className="text-gray-300 text-xs">
          Songs: {songs.length} | Zoom: {Math.round(zoomLevel * 100)}% | Quality: {quality.toUpperCase()}
        </div>
      </div>
    </div>
  );
}