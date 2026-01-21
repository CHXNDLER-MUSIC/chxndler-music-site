"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ELEMENT_COLORS, type Element } from '@/lib/planets';
import { useAudio } from "@/app/providers/AudioProvider";

interface DashboardProgressBarProps {
  className?: string;
}

const DashboardProgressBar: React.FC<DashboardProgressBarProps> = ({ className = "" }) => {
  // Read time and duration directly from the unified audio context
  const audio = useAudio();
  const currentTime = audio.currentTime || 0;
  const duration = audio.duration || 0;
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [currentElement, setCurrentElement] = useState<Element>('water');
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Get element colors
  const elementColor = ELEMENT_COLORS[currentElement];

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Remove legacy DOM-audio polling; progress is now driven by AudioProvider

  // Determine current element based on playing track
  useEffect(() => {
    // This is a simplified element detection - you might want to enhance this
    // based on the actual track being played or other logic from your app
    const detectElement = () => {
      // For now, cycle through elements for visual variety
      const elements: Element[] = ['water', 'heart', 'lightning', 'darkness'];
      const index = Math.floor(Date.now() / 10000) % elements.length;
      setCurrentElement(elements[index]);
    };

    detectElement();
    const interval = setInterval(detectElement, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
    if (!progressBarRef.current || duration <= 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percentage / 100) * duration;
    
    // Seek via the unified audio context
    try { audio.seek(time); } catch {}
  }, [duration, audio]);

  // Don't render if no audio is playing
  if (duration <= 0) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Time display */}
      <div className="flex justify-between items-center mb-2 text-sm font-mono">
        <span className="text-white/80">
          {formatTime(currentTime)}
        </span>
        <span className="text-white/60">
          {formatTime(duration)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div 
        ref={progressBarRef}
        className="relative w-full h-2 bg-black/40 rounded-full cursor-pointer overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        {/* Filled progress portion with element-based glow */}
        <div 
          className="h-full rounded-full"
          style={{ 
            width: `${progressPercentage}%`,
            background: `linear-gradient(90deg, ${elementColor}, ${elementColor}dd)`,
            boxShadow: `
              0 0 8px ${elementColor}80,
              0 0 16px ${elementColor}40,
              0 0 24px ${elementColor}20
            `,
          }}
        />
        
        {/* Progress handle */}
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full border border-white/60"
          style={{
            left: `${progressPercentage}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            background: `radial-gradient(circle, ${elementColor}, ${elementColor}cc)`,
            boxShadow: `
              0 0 6px ${elementColor}aa,
              0 0 12px ${elementColor}60,
              0 1px 3px rgba(0,0,0,0.3)
            `,
          }}
        />
        
        {/* Hover indicator */}
        {isHovering && (
          <>
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-75 pointer-events-none border border-white/40"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                boxShadow: `
                  0 0 8px rgba(255, 255, 255, 0.6),
                  0 0 16px rgba(255, 255, 255, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.4)
                `,
              }}
            />
            {/* Hover timestamp */}
            <div 
              className="absolute -top-10 px-3 py-1.5 bg-black/90 text-white text-xs rounded-lg backdrop-blur-sm border border-white/20 pointer-events-none font-mono"
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
  );
};

export default DashboardProgressBar;
