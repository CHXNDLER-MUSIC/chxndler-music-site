"use client";

import React from "react";

type Element = "heart" | "water" | "lightning" | "darkness";

interface WaveformVisualizerProps {
  element: Element;
  progress: number; // 0-1 ratio of current position
  duration: number; // total duration in seconds
  currentTime: number; // current time in seconds
  onProgressClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  width?: string;
  height?: number;
  className?: string;
}

const ELEMENT_COLORS = {
  heart: {
    stroke: "#FC54AF",
    glow: "rgba(252, 84, 175, 0.9)"
  },
  water: {
    stroke: "#38B6FF",
    glow: "rgba(56, 182, 255, 0.9)"
  },
  lightning: {
    stroke: "#F2EF1D",
    glow: "rgba(242, 239, 29, 0.9)"
  },
  darkness: {
    stroke: "#FFFFFF",
    glow: "rgba(255, 255, 255, 0.7)"
  }
};

export default function WaveformVisualizer({
  element,
  progress,
  duration,
  currentTime,
  onProgressClick,
  width = "100%",
  height = 10,
  className = ""
}: WaveformVisualizerProps) {
  const elementColor = ELEMENT_COLORS[element]?.stroke || '#FFFFFF';
  
  // Calculate progress ratio
  const liveDur = (duration && isFinite(duration) && duration > 0) ? duration : 0;
  const liveTime = (currentTime && isFinite(currentTime) && currentTime >= 0) ? currentTime : 0;
  const progressRatio = liveDur > 0 ? (liveTime / liveDur) : (progress || 0);
  const progressX = Math.max(0, Math.min(100, progressRatio * 100));
  
  // Always show at least the background track even with no progress
  const showTrack = true;
  const centerY = height / 2;

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onProgressClick) {
      onProgressClick(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverPercentage = (hoverX / rect.width) * 100;
    e.currentTarget.style.setProperty('--hover-position', `${hoverPercentage}%`);
  };

  return (
    <div 
      className={`waveform ${className}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width,
        height,
        cursor: onProgressClick ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' fill='%23${elementColor.slice(1)}' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E") 12 12, pointer` : 'default',
        marginTop: '-2px',
        marginBottom: '-2px'
      }}
    >
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 100 ${height}`} 
        preserveAspectRatio="none" 
        style={{ background: 'transparent' }}
      >
        <defs>
          <linearGradient id="miniUnplayed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hexToRgba(elementColor, 0.25)} />
            <stop offset="50%" stopColor={hexToRgba(elementColor, 0.35)} />
            <stop offset="100%" stopColor={hexToRgba(elementColor, 0.25)} />
          </linearGradient>
          <linearGradient id="miniPlayed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hexToRgba(elementColor, 0.8)} />
            <stop offset="50%" stopColor={hexToRgba(elementColor, 1)} />
            <stop offset="100%" stopColor={hexToRgba(elementColor, 0.8)} />
          </linearGradient>
          <filter id="waveformGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="2" result="innerGlow"/>
            <feGaussianBlur stdDeviation="6" result="outerGlow"/>
            <feMerge>
              <feMergeNode in="outerGlow"/>
              <feMergeNode in="outerGlow"/>
              <feMergeNode in="innerGlow"/>
              <feMergeNode in="innerGlow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background track (unplayed portion) */}
        <line
          x1="2"
          y1={centerY}
          x2="98"
          y2={centerY}
          stroke="url(#miniUnplayed)"
          strokeWidth="6"
          opacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Played portion - outer neon glow */}
        {progressX > 2 && (
          <line
            x1="2"
            y1={centerY}
            x2={Math.max(2, progressX)}
            y2={centerY}
            stroke={elementColor}
            strokeWidth="12"
            opacity="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />
        )}

        {/* Played portion - main glow bar */}
        {progressX > 2 && (
          <line
            x1="2"
            y1={centerY}
            x2={Math.max(2, progressX)}
            y2={centerY}
            stroke={elementColor}
            strokeWidth="8"
            opacity="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#waveformGlow)"
          />
        )}

        {/* Played portion - inner bright core */}
        {progressX > 2 && (
          <line
            x1="2"
            y1={centerY}
            x2={Math.max(2, progressX)}
            y2={centerY}
            stroke="#FFFFFF"
            strokeWidth="4"
            opacity="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Current position indicator heart - always visible with enhanced visibility */}
        <path 
          d={`M ${Math.max(2, progressX)} ${centerY + 4} 
              L ${Math.max(2, progressX) - 1.5} ${centerY - 1}
              C ${Math.max(2, progressX) - 1.5} ${centerY - 4}, ${Math.max(2, progressX) - 0.3} ${centerY - 4}, ${Math.max(2, progressX) - 0.3} ${centerY - 2.5}
              C ${Math.max(2, progressX) - 0.3} ${centerY - 1.8}, ${Math.max(2, progressX)} ${centerY - 1}, ${Math.max(2, progressX)} ${centerY - 1}
              C ${Math.max(2, progressX)} ${centerY - 1}, ${Math.max(2, progressX) + 0.3} ${centerY - 1.8}, ${Math.max(2, progressX) + 0.3} ${centerY - 2.5}
              C ${Math.max(2, progressX) + 0.3} ${centerY - 4}, ${Math.max(2, progressX) + 1.5} ${centerY - 4}, ${Math.max(2, progressX) + 1.5} ${centerY - 1}
              L ${Math.max(2, progressX)} ${centerY + 4} Z`}
          fill="#FFFFFF" 
          stroke="none" 
          strokeWidth="0" 
          opacity="1" 
          filter="url(#waveformGlow)" 
        />
      </svg>
    </div>
  );
}

// Export the types for use in other components
export type { Element, WaveformVisualizerProps };
export { ELEMENT_COLORS };