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
  height = 18,
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
        cursor: onProgressClick ? 'pointer' : 'default',
        marginTop: '8px',
        marginBottom: '4px'
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
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Cyan container border for track bar */}
        <rect 
          x="1" 
          y={centerY - 7} 
          width="98" 
          height="14" 
          fill="none" 
          rx="7" 
          ry="7"
          stroke="#00FFFF"
          strokeWidth="1.5"
        />
        
        {/* Full white bar with bright glow */}
        <line 
          x1="5" 
          y1={centerY} 
          x2="95" 
          y2={centerY} 
          stroke="#FFFFFF" 
          strokeWidth="6" 
          opacity="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#waveformGlow)" 
        />
        {/* Additional bright line for visibility */}
        <line 
          x1="5" 
          y1={centerY} 
          x2="95" 
          y2={centerY} 
          stroke="#FFFFFF" 
          strokeWidth="3" 
          opacity="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Current position indicator heart - always visible */}
        <path 
          d={`M ${Math.max(5, progressX)} ${centerY + 2} 
              L ${Math.max(5, progressX) - 2} ${centerY - 1.2}
              C ${Math.max(5, progressX) - 2} ${centerY - 3}, ${Math.max(5, progressX) - 0.5} ${centerY - 3}, ${Math.max(5, progressX) - 0.5} ${centerY - 1.8}
              C ${Math.max(5, progressX) - 0.5} ${centerY - 1.2}, ${Math.max(5, progressX)} ${centerY - 0.7}, ${Math.max(5, progressX)} ${centerY - 0.7}
              C ${Math.max(5, progressX)} ${centerY - 0.7}, ${Math.max(5, progressX) + 0.5} ${centerY - 1.2}, ${Math.max(5, progressX) + 0.5} ${centerY - 1.8}
              C ${Math.max(5, progressX) + 0.5} ${centerY - 3}, ${Math.max(5, progressX) + 2} ${centerY - 3}, ${Math.max(5, progressX) + 2} ${centerY - 1.2}
              L ${Math.max(5, progressX)} ${centerY + 2} Z`}
          fill="#FFFFFF" 
          stroke={elementColor} 
          strokeWidth="1" 
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