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
  const [clickRipple, setClickRipple] = useState(null);
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
      // Create ripple effect at click position
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        setClickRipple({ position: clickX, timestamp: Date.now() });
        
        // Clear ripple after animation
        setTimeout(() => setClickRipple(null), 600);
      }
      
      // Immediate visual feedback
      setLocalCurrentTime(newTime);
      
      // Set audio time with error handling
      try {
        audio.currentTime = newTime;
      } catch (error) {
        console.warn('Seek error:', error);
        // Fallback: try again after a brief delay
        setTimeout(() => {
          try {
            audio.currentTime = newTime;
          } catch (retryError) {
            console.error('Seek retry failed:', retryError);
          }
        }, 100);
      }
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
      if (audio && effectiveDuration > 0) {
        try {
          audio.currentTime = localCurrentTime;
        } catch (error) {
          console.warn('Drag seek error:', error);
          // Fallback: try again after a brief delay
          setTimeout(() => {
            try {
              audio.currentTime = localCurrentTime;
            } catch (retryError) {
              console.error('Drag seek retry failed:', retryError);
            }
          }, 50);
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [audioRef, getTimeFromPosition, progressPercentage, localCurrentTime]);

  const currentColor = getCurrentColor();
  
  return (
    <div className="w-full z-20">
      <div 
        ref={progressBarRef}
        className="relative w-full h-[12px] cursor-pointer group flex items-center"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ padding: '4px 0' }}
      >
        {/* Background gray line with subtle glow */}
        <div 
          className="absolute left-0 right-0 top-1/2 rounded-full"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            height: '3px',
            transform: 'translateY(-50%)',
            boxShadow: 'inset 0 0 4px rgba(255, 255, 255, 0.1), 0 0 2px rgba(255, 255, 255, 0.1)'
          }}
        />
        
        {/* Progress fill with enhanced glow */}
        <div 
          className="absolute left-0 top-1/2 rounded-full transition-all duration-100"
          style={{ 
            width: `${Math.min(progressPercentage, 100)}%`,
            height: '3px',
            transform: 'translateY(-50%)',
            backgroundColor: currentColor,
            boxShadow: selectedSong?.element === 'DARKNESS' 
              ? `0 0 12px ${currentColor}, 0 0 24px ${currentColor}90, 0 0 36px ${currentColor}60, 0 0 48px ${currentColor}30`
              : `0 0 12px ${currentColor}90, 0 0 24px ${currentColor}60, 0 0 36px ${currentColor}40, 0 0 48px ${currentColor}20`,
            filter: 'brightness(1.1)'
          }}
        />
        
        {/* Progress knob with enhanced glow */}
        <div 
          className="absolute top-1/2 w-4 h-4 rounded-full transition-all duration-100 pointer-events-none"
          style={{ 
            left: `${Math.min(progressPercentage, 100)}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            backgroundColor: currentColor,
            boxShadow: selectedSong?.element === 'DARKNESS'
              ? `0 0 8px ${currentColor}, 0 0 16px ${currentColor}80, 0 0 24px ${currentColor}50, 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3)`
              : `0 0 8px ${currentColor}80, 0 0 16px ${currentColor}60, 0 0 24px ${currentColor}40, 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3)`,
            border: '2px solid rgba(255,255,255,0.4)',
            opacity: isHovering || isDragging ? 1 : 0.9,
            filter: 'brightness(1.2)',
            scale: isHovering || isDragging ? '1.2' : '1'
          }}
        />
        
        {/* Click ripple effect */}
        {clickRipple && (
          <div 
            className="absolute top-1/2 w-6 h-6 rounded-full pointer-events-none animate-ping opacity-75"
            style={{ 
              left: `${clickRipple.position}%`,
              transform: 'translateX(-50%) translateY(-50%)',
              backgroundColor: currentColor,
              animationDuration: '0.6s'
            }}
          />
        )}
        
        {/* Hover indicator and time tooltip */}
        {isHovering && !isDragging && (
          <>
            <div 
              className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-75 pointer-events-none"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                boxShadow: `0 0 12px rgba(255, 255, 255, 0.9), 0 0 24px ${currentColor}60, 0 2px 6px rgba(0, 0, 0, 0.4)`,
                border: '2px solid rgba(255,255,255,0.8)',
                opacity: 0.95,
                filter: 'brightness(1.3)'
              }}
            />
            <div 
              className="absolute -top-10 px-3 py-1 bg-black/90 text-white text-xs rounded-md backdrop-blur-sm pointer-events-none z-30 border border-white/20"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
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
