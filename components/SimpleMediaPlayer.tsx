// components/SimpleMediaPlayer.tsx
"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { glow } from "@/config/ui";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";
import { useAudioGate } from "./AudioGateWrapper";

// Song element icon mapping
const SONG_ELEMENTS: { [key: string]: string } = {
  'alone': '/elements/darkness.webp',      // darkness for "Alone"
  'baby': '/elements/heart.webp',          // no baby icon asset; use heart
  'be-my-bee': '/elements/heart.webp',     // heart for "Be My Bee" (love theme)  
  'ocean-girl': '/elements/water.webp',    // water for "Ocean Girl"
  'night-drive': '/elements/lightning.webp', // lightning for energy/drive
  'starlight': '/elements/lightning.webp', // lightning for celestial energy
  'horizon': '/elements/water.webp',       // water for "Sun meets sea"
  'afterglow': '/elements/lightning.webp', // lightning for glow/energy
  'midnight': '/elements/darkness.webp',   // darkness for "Midnight"
  'tidal': '/elements/water.webp',         // water for "Tidal"
  'drift': '/elements/water.webp',         // water for "Waves of weightless time"
};

function getSongIcon(title: string): string {
  const songId = title.toLowerCase().replace(/\s+/g, '-');
  return SONG_ELEMENTS[songId] || '/elements/music.webp'; // default to music icon
}

function getSongElement(title: string): Element {
  const songId = title.toLowerCase().replace(/\s+/g, '-');
  
  // Map song IDs to elements (matching the MediaPlayer logic)
  if (songId.includes("ocean") || songId.includes("tide") || songId.includes("tidal") || songId.includes("drift") || songId.includes("horizon")) return "water";
  if (songId.includes("baby") || songId.includes("be-my-bee")) return "heart";
  if (songId.includes("night-drive") || songId.includes("starlight") || songId.includes("afterglow")) return "lightning";
  if (songId.includes("alone") || songId.includes("midnight")) return "darkness";
  
  return "water"; // default fallback
}

function getSongElementColor(title: string): string {
  const element = getSongElement(title);
  return ELEMENT_COLORS[element];
}

export default function MediaPlayer({
  title,
  progress,   // 0..1
  onToggle,
  isPlaying,
  slug,
  is_released = true,
  min_tier = 'wanderer',
}: {
  title: string;
  progress: number;
  onToggle: () => void;
  isPlaying: boolean;
  slug?: string;
  is_released?: boolean;
  min_tier?: string;
}) {
  // Check audio gating
  const gateResult = useAudioGate({
    title,
    slug,
    is_released,
    min_tier: min_tier as any
  });

  const elementColor = getSongElementColor(title);
  const iconSrc = getSongIcon(title);
  const isDefaultMusicIcon = iconSrc.endsWith('/elements/music.webp');
  const [animationTime, setAnimationTime] = useState(0);

  // Handle gated play attempt
  const handleToggle = () => {
    if (!gateResult.allowed) {
      console.log('Audio playback blocked:', gateResult.reason);
      return;
    }
    onToggle();
  };
  
  // Generate realistic audio waveform data
  const generateWaveform = (songTitle: string, length: number = 200) => {
    // Use song title as seed for consistent waveform per song
    const seed = songTitle.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    return Array.from({ length }, (_, i) => {
      // Create realistic audio frequency components
      const bassLine = Math.sin((i + seed) * 0.01) * 0.4;           // Bass frequencies
      const melody = Math.sin((i + seed) * 0.05 + 2) * 0.3;         // Mid frequencies  
      const percussion = Math.sin((i + seed) * 0.15 + 4) * 0.2;     // High frequencies
      const vocals = Math.sin((i + seed) * 0.08 + 1) * 0.25;        // Vocal range
      const harmonics = Math.sin((i + seed) * 0.3 + 5) * 0.1;       // Harmonics
      
      // Create natural audio envelope (songs typically start/end quieter)
      const fadeIn = Math.min(1, i / 20);
      const fadeOut = Math.min(1, (length - i) / 30);
      const envelope = Math.min(fadeIn, fadeOut);
      
      // Add some natural variation like dynamics in music
      const dynamics = Math.sin((i / length) * Math.PI * 3) * 0.3 + 0.7; // Musical dynamics
      
      // Combine all elements for realistic audio appearance
      const amplitude = Math.abs(bassLine + melody + percussion + vocals + harmonics) * envelope * dynamics;
      
      return Math.max(0.02, Math.min(0.95, amplitude));
    });
  };
  
  const waveformData = generateWaveform(title);
  
  // Animation loop for playing state
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationFrame: number;
    const animate = () => {
      setAnimationTime(prev => (prev + 1) % 1000); // Keep numbers small, cycle every 1000 frames
      if (isPlaying) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,680px)] backdrop-blur-md rounded-2xl p-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className={`rounded-xl px-3 py-2 transition-all duration-200 ${
            gateResult.allowed 
              ? "bg-white/10 hover:bg-white/20" 
              : "bg-red-500/20 cursor-not-allowed opacity-60"
          }`}
          aria-label={
            !gateResult.allowed 
              ? gateResult.reason || "Locked"
              : isPlaying ? "Pause" : "Play"
          }
          title={!gateResult.allowed ? gateResult.reason : undefined}
        >
          {!gateResult.allowed ? "🔒" : isPlaying ? "⏸" : "▶️"}
        </button>
        <div className="flex-1">
          <div className="text-white/90 text-sm truncate">
            {title}
          </div>
          {!gateResult.allowed && (
            <div className="text-red-300 text-xs mt-1 truncate">
              {gateResult.reason}
            </div>
          )}
          <div 
            className="mt-2 h-16 w-full relative overflow-hidden rounded-lg bg-black outline-none ring-0 border-0" 
            style={{ 
              boxShadow: 'none',
              border: 'none !important',
              outline: 'none !important'
            }}
          >
            {/* Simple progress bar without SVG */}
            <div 
              className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2"
              style={{
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              <div 
                className="h-full bg-white rounded-full" 
                style={{ 
                  width: `${progress * 100}%`,
                  filter: 'none',
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                }}
              />
            </div>
            
            {/* Time cursor with element icon */}
            <div
              className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none z-10"
              style={{
                left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                transform: 'translateX(-50%)',
                width: '32px',
              }}
            >
              {/* Vertical cursor line removed per design */}
              
              {/* Element-shaped cursor icon */}
              <img
                src={iconSrc}
                alt={`${title} element`}
                className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform w-[3rem] h-[3rem] min-w-[3rem] min-h-[3rem] brightness-150 saturate-125"
                style={{
                  filter: 'none'
                }}
              />
              
              {/* Time display */}
              <div 
                className="absolute -bottom-6 text-xs font-mono px-2 py-1 rounded"
                style={{ 
                  background: `${elementColor}22`,
                  color: elementColor,
                }}
              >
                {Math.floor(progress * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
