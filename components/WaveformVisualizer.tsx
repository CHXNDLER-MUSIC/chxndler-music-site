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
        border: 'none',
        width,
        height,
        borderRadius: 0,
        background: 'transparent',
        cursor: onProgressClick ? 'pointer' : 'default'
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
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background track as a thick rounded line */}
        <line 
          x1="0" 
          y1={centerY} 
          x2="100" 
          y2={centerY} 
          stroke={elementColor} 
          strokeWidth="8" 
          opacity="0.35" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#waveformGlow)" 
        />
        
        {/* Played portion: single clean rounded bar with glow */}
        <line 
          x1="0" 
          y1={centerY} 
          x2={progressX} 
          y2={centerY} 
          stroke={elementColor} 
          strokeWidth="8" 
          opacity="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#waveformGlow)" 
        />
      </svg>
    </div>
  );
}

// Export the types for use in other components
export type { Element, WaveformVisualizerProps };
export { ELEMENT_COLORS };