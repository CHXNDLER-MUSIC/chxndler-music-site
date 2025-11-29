"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';

const TrackProgressBar = ({ 
  audioRef, 
  selectedSong, 
  currentTime, 
  duration 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const progressBarRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);

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

  // Sync with audio element
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDragging) {
        setLocalCurrentTime(audio.currentTime || 0);
      }
    };

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setLocalDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);

    // Initial sync
    updateTime();
    updateDuration();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audioRef, isDragging]);

  // Use props as fallback if local state isn't available
  const effectiveCurrentTime = localCurrentTime || currentTime || 0;
  const effectiveDuration = localDuration || duration || 0;
  const progressPercentage = effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0;

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
    return (percentage / 100) * effectiveDuration;
  }, [effectiveDuration]);

  const handleMouseMove = useCallback((e) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const time = (percentage / 100) * effectiveDuration;
    
    setHoverPosition(percentage);
    setHoverTime(time);
  }, [effectiveDuration]);

  const handleClick = useCallback((e) => {
    if (isDragging) return;
    
    const newTime = getTimeFromPosition(e.clientX);
    const audio = audioRef?.current;
    
    if (audio && effectiveDuration > 0) {
      audio.currentTime = newTime;
      setLocalCurrentTime(newTime);
    }
  }, [audioRef, effectiveDuration, getTimeFromPosition, isDragging]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartProgress.current = progressPercentage;
    
    const handleMouseMove = (moveEvent) => {
      const newTime = getTimeFromPosition(moveEvent.clientX);
      setLocalCurrentTime(newTime);
      
      // Update hover position for visual feedback
      if (progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setHoverPosition(percentage);
        setHoverTime(newTime);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      const audio = audioRef?.current;
      if (audio) {
        audio.currentTime = localCurrentTime;
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [audioRef, getTimeFromPosition, progressPercentage, localCurrentTime]);

  const currentColor = getCurrentColor();
  
  return (
    <div className="absolute w-full z-20" style={{ top: '-24px' }}>
      <div 
        ref={progressBarRef}
        className="relative w-full h-[3px] cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
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
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
          style={{ 
            width: `${Math.min(progressPercentage, 100)}%`,
            backgroundColor: currentColor,
            boxShadow: selectedSong?.element === 'DARKNESS' 
              ? `0 0 8px ${currentColor}, 0 0 16px ${currentColor}80, 0 0 24px ${currentColor}40`
              : `0 0 8px ${currentColor}80, 0 0 16px ${currentColor}40, 0 0 24px ${currentColor}20`,
            height: '3px'
          }}
        />
        
        {/* Progress knob */}
        <div 
          className="absolute top-1/2 w-3 h-3 rounded-full transition-all duration-150 pointer-events-none"
          style={{ 
            left: `${Math.min(progressPercentage, 100)}%`,
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