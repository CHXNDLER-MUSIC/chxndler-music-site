// components/MediaPlayer.tsx
"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { glow } from "@/config/ui";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";

// Song element icon mapping
const SONG_ELEMENTS: { [key: string]: string } = {
  'alone': '/elements/darkness.png',      // darkness for "Alone"
  'baby': '/elements/baby.png',           // baby icon for "Baby" track
  'be-my-bee': '/elements/heart.png',     // heart for "Be My Bee" (love theme)  
  'ocean-girl': '/elements/water.png',    // water for "Ocean Girl"
  'night-drive': '/elements/lightning.png', // lightning for energy/drive
  'starlight': '/elements/lightning.png', // lightning for celestial energy
  'horizon': '/elements/water.png',       // water for "Sun meets sea"
  'afterglow': '/elements/lightning.png', // lightning for glow/energy
  'midnight': '/elements/darkness.png',   // darkness for "Midnight"
  'tidal': '/elements/water.png',         // water for "Tidal"
  'drift': '/elements/water.png',         // water for "Waves of weightless time"
};

function getSongIcon(title: string): string {
  const songId = title.toLowerCase().replace(/\s+/g, '-');
  return SONG_ELEMENTS[songId] || '/elements/music.png'; // default to music icon
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
}: {
  title: string;
  progress: number;
  onToggle: () => void;
  isPlaying: boolean;
}) {
  const elementColor = getSongElementColor(title);
  const iconSrc = getSongIcon(title);
  const isDefaultMusicIcon = iconSrc.endsWith('/elements/music.png');
  const [animationTime, setAnimationTime] = useState(0);
  
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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,680px)] ${glow.ring} backdrop-blur-md rounded-2xl border border-white/10 p-3`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: "rgba(25,227,255,0.45)" }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶️"}
        </button>
        <div className="flex-1">
          <div className="text-white/90 text-sm truncate">{title}</div>
          <div className="mt-2 h-16 w-full relative overflow-hidden rounded-lg bg-gradient-to-b from-black/30 to-black/10 border border-white/5">
            {/* Audio Waveform using SVG for smooth curves */}
            <svg 
              className="w-full h-full" 
              viewBox="0 0 800 100" 
              preserveAspectRatio="none"
              style={{ background: 'transparent' }}
            >
              {/* Background grid lines for audio feel */}
              <defs>
                <pattern id="grid" width="20" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Background waveform (faint) */}
              <path
                d={`M 0 50 ${waveformData.map((amp, i) => {
                  const x = (i / (waveformData.length - 1)) * 800;
                  const y1 = 50 - (amp * 35);
                  const y2 = 50 + (amp * 35);
                  return `L ${x} ${y1} L ${x} ${y2}`;
                }).join(' ')} L 800 50`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.8"
                opacity="0.8"
              />
              
              {/* Played portion as a thin glowing light beam */}
              {/* Outer glow */}
              <line
                x1="0"
                y1="50"
                x2={`${progress * 800}`}
                y2="50"
                stroke={elementColor}
                strokeWidth="7"
                opacity="0.22"
                strokeLinecap="round"
              />
              {/* Core beam */}
              <line
                x1="0"
                y1="50"
                x2={`${progress * 800}`}
                y2="50"
                stroke={elementColor}
                strokeWidth="1.6"
                opacity="0.95"
                strokeLinecap="round"
              />
              
              {/* Animated indicator removed: element icon now serves as the playhead */}
            </svg>
            
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
                className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform w-[2rem] h-[2rem] min-w-[2rem] min-h-[2rem] brightness-150 saturate-125"
                style={{
                  filter: isDefaultMusicIcon
                    ? 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))'
                    : `drop-shadow(0 0 14px ${elementColor}) drop-shadow(0 0 32px ${elementColor}AA) drop-shadow(0 0 64px ${elementColor}55)`
                }}
              />
              
              {/* Time display */}
              <div 
                className="absolute -bottom-6 text-xs font-mono px-2 py-1 rounded"
                style={{ 
                  background: `${elementColor}22`,
                  color: elementColor,
                  border: `1px solid ${elementColor}44`,
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
