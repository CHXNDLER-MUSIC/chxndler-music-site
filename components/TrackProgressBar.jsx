"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAudio } from "@/app/providers/AudioProvider";

const TrackProgressBar = ({ 
  selectedSong 
}) => {
  // Use unified audio provider instead of separate audioRef
  const audioManager = useAudio();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const progressBarRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);
  
  // Get values from unified audio provider
  const currentTime = audioManager.currentTime || 0;
  const duration = audioManager.duration || 0;

  // Element colors matching your spec
  const elementColors = {
    HEART: "#FC54AF",
    WATER: "#38B6FF", 
    LIGHTNING: "#F2EF1D",
    DARKNESS: "#FFFFFF" // Use white for darkness for visibility
  };

  // Get current element color
  const getCurrentColor = () => {
    if (!selectedSong?.element) return elementColors.HEART;
    return elementColors[selectedSong.element] || elementColors.HEART;
  };

  // Calculate progress using unified audio provider values
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = useCallback((clientX) => {
    if (!progressBarRef.current) return 0;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return (percentage / 100) * duration;
  }, [duration]);

  const handleMouseMove = useCallback((e) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percentage / 100) * duration;
    
    setHoverPosition(percentage);
    setHoverTime(time);
  }, [duration]);

  const handleClick = useCallback((e) => {
    if (isDragging) return;
    
    const newTime = getTimeFromPosition(e.clientX);
    
    if (duration > 0) {
      // Use unified audio provider's seek method
      audioManager.seek(newTime);
    }
  }, [duration, getTimeFromPosition, isDragging, audioManager]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    if (!progressBarRef.current || duration <= 0) return;

    setIsDragging(true);

    const seekFromX = (clientX) => {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const newTime = (percentage / 100) * duration;
      setDragPosition(percentage);
      setHoverTime(newTime);
      audioManager.seek(newTime);
    };

    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}

    seekFromX(e.clientX);

    const onMove = (moveEvent) => seekFromX(moveEvent.clientX);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, [duration, audioManager]);

  const currentColor = getCurrentColor();
  
  return (
    <div className="w-full z-20">
      <div 
        ref={progressBarRef}
        className="relative w-full h-[3px] cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { if (!isDragging) setIsHovering(false); }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        {/* Background gray line */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            height: '3px'
          }}
        />
        
        {/* Progress fill with glow */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${isDragging ? '' : 'transition-all duration-200'}`}
          style={{
            width: `${isDragging ? dragPosition : Math.min(progressPercentage, 100)}%`,
            backgroundColor: currentColor,
            boxShadow: selectedSong?.element === 'DARKNESS' 
              ? `0 0 8px ${currentColor}, 0 0 16px ${currentColor}80, 0 0 24px ${currentColor}40`
              : `0 0 8px ${currentColor}80, 0 0 16px ${currentColor}40, 0 0 24px ${currentColor}20`,
            height: '3px'
          }}
        />
        
        {/* Progress knob - follows drag position when dragging */}
        <div
          className={`absolute top-1/2 w-3 h-3 rounded-full pointer-events-none ${isDragging ? 'scale-125' : 'transition-all duration-150'}`}
          style={{
            left: `${isDragging ? dragPosition : Math.min(progressPercentage, 100)}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            backgroundColor: currentColor,
            boxShadow: selectedSong?.element === 'DARKNESS'
              ? `0 0 6px ${currentColor}, 0 0 12px ${currentColor}60, 0 2px 4px rgba(0,0,0,0.3)`
              : `0 0 6px ${currentColor}60, 0 0 12px ${currentColor}30, 0 2px 4px rgba(0,0,0,0.3)`,
            border: '1px solid rgba(255,255,255,0.3)',
            opacity: isHovering || isDragging ? 1 : 0.8
          }}
        />
        
        {/* Hover indicator and time tooltip */}
        {isHovering && !isDragging && (
          <>
            <div 
              className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-75 pointer-events-none opacity-90"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            />
            <div 
              className="absolute -top-8 px-2 py-1 bg-black/80 text-white text-xs rounded backdrop-blur-sm pointer-events-none z-30"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap'
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

export default TrackProgressBar;
