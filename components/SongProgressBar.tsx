"use client";
import React, { useState, useRef, useCallback } from 'react';

type Element = "HEART" | "WATER" | "LIGHTNING" | "DARKNESS";

interface SongProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  element: Element;
}

const SongProgressBar: React.FC<SongProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  element
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const elementColor = {
    HEART: "#FC54AF",
    WATER: "#38B6FF", 
    LIGHTNING: "#F2EF1D",
    DARKNESS: "#5C19FF",
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentElementColor = elementColor[element];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percentage / 100) * duration;
    
    setHoverPosition(percentage);
    setHoverTime(time);
  }, [duration]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percentage / 100) * duration;
    
    onSeek(time);
  }, [duration, onSeek]);

  return (
    <div className="mt-3 w-full">
      {/* Larger click target area */}
      <div
        ref={progressBarRef}
        className="relative w-full py-3 cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
      >
        {/* Visual track bar - thinner but with larger click area above */}
        <div
          className="relative w-full h-2 rounded-full overflow-visible"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 255, 255, 0.5)',
            boxShadow: `
              0 0 8px rgba(0, 255, 255, 0.3),
              inset 0 0 4px rgba(0, 255, 255, 0.1)
            `,
          }}
        >
        {/* Background track */}
        <div className="absolute inset-0 bg-gray-800/50 rounded-full" />
        
        {/* Filled progress portion with element-based glow */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-200"
          style={{
            width: `${progressPercentage}%`,
            background: `linear-gradient(90deg,
              ${currentElementColor}CC 0%,
              ${currentElementColor} 50%,
              ${currentElementColor}EE 100%
            )`,
            boxShadow: `
              0 0 12px ${currentElementColor},
              0 0 24px ${currentElementColor}80,
              0 0 36px ${currentElementColor}40,
              inset 0 0 8px rgba(255, 255, 255, 0.3),
              inset 0 1px 2px rgba(255, 255, 255, 0.4)
            `,
          }}
        />
        
        {/* Hover circle indicator */}
        {isHovering && (
          <>
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-75 pointer-events-none"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                boxShadow: `
                  0 0 8px rgba(255, 255, 255, 0.8),
                  0 0 16px rgba(255, 255, 255, 0.4),
                  0 2px 8px rgba(0, 0, 0, 0.3)
                `,
              }}
            />
            {/* Hover timestamp */}
            <div
              className="absolute -top-10 px-2 py-1 bg-black/80 text-white text-xs rounded backdrop-blur-sm pointer-events-none"
              style={{
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {formatTime(hoverTime)}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default SongProgressBar;