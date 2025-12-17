'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface SimpleThreeSceneProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality?: 'low' | 'high';
  showStats?: boolean;
}

export default function SimpleThreeScene({ 
  songs, 
  songsByElement, 
  zoomLevel, 
  onPlanetSelect,
  quality = 'high',
  showStats = false
}: SimpleThreeSceneProps) {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [rotation, setRotation] = useState(0);
  
  useEffect(() => {
    if (!mounted) return;
    
    const animate = () => {
      setRotation(prev => prev + 0.005); // Slow rotation
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a simple solar system visualization
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw center planet with glow effect
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 * zoomLevel, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = `${16 * zoomLevel}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('🌟 Center Planet', centerX, centerY + 50 * zoomLevel);

    // Draw orbiting planets with animation
    const planets = [
      { id: 'heart', color: '#ff6b9d', angle: 0, distance: 80, name: '💖 Heart' },
      { id: 'water', color: '#4fc3f7', angle: Math.PI / 2, distance: 80, name: '💧 Water' },
      { id: 'lightning', color: '#ffeb3b', angle: Math.PI, distance: 80, name: '⚡ Lightning' },
      { id: 'darkness', color: '#9c27b0', angle: 3 * Math.PI / 2, distance: 80, name: '🌙 Darkness' }
    ];

    planets.forEach((planet, index) => {
      const animatedAngle = planet.angle + rotation + (index * 0.1); // Different speeds per planet
      const distance = planet.distance * zoomLevel;
      const x = centerX + Math.cos(animatedAngle) * distance;
      const y = centerY + Math.sin(animatedAngle) * distance;

      // Draw orbit path with dashed line
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, distance, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw planet with glow
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(x, y, 20 * zoomLevel, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw planet label
      ctx.fillStyle = '#ffffff';
      ctx.font = `${12 * zoomLevel}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, x, y + 35 * zoomLevel);
    });

    // Draw stars in background
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 1.5;
      
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  }, [mounted, songs.length, zoomLevel, rotation]);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Initializing Simple Scene...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
        onClick={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          // Check if clicked near center
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          
          if (distFromCenter < 40) {
            onPlanetSelect?.('center');
            console.log('Clicked center planet');
          } else if (distFromCenter > 60 && distFromCenter < 120) {
            // Determine which planet was clicked based on angle
            const angle = Math.atan2(y - centerY, x - centerX);
            let planetId = 'heart';
            
            if (angle >= -Math.PI/4 && angle < Math.PI/4) planetId = 'heart';
            else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) planetId = 'water';
            else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) planetId = 'lightning';
            else planetId = 'darkness';
            
            onPlanetSelect?.(planetId);
            console.log('Clicked planet:', planetId);
          }
        }}
      />
      
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur rounded-lg px-4 py-2">
        <div className="text-white text-sm font-medium">
          🌌 Simple 2D Solar System
        </div>
        <div className="text-gray-300 text-xs">
          Click planets to interact
        </div>
      </div>
    </div>
  );
}