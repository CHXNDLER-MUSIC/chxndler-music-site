"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { playerStore } from '@/store/usePlayerStore';
import { audioCoordinator } from '@/lib/audio-coordinator';

interface SpotifyProgressBarProps {
  className?: string;
  style?: React.CSSProperties;
}

const SpotifyProgressBar: React.FC<SpotifyProgressBarProps> = ({ 
  className = "",
  style = {}
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [currentSong, setCurrentSong] = useState(null);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const animationFrameRef = useRef<number>();

  // Element colors matching the existing system
  const elementColors = {
    heart: "#FC54AF",
    water: "#38B6FF", 
    lightning: "#F2EF1D",
    darkness: "#FFFFFF"
  };

  // Get current element color based on song
  const getCurrentElementColor = useCallback(() => {
    if (!currentSong?.icon) return elementColors.heart;
    const element = String(currentSong.icon).toLowerCase();
    return elementColors[element as keyof typeof elementColors] || elementColors.heart;
  }, [currentSong]);

  // Update progress continuously while playing
  const updateProgress = useCallback(() => {
    if (isDragging) return;
    
    try {
      const coordinator = audioCoordinator.getState?.();
      const audio = coordinator?.currentAudio;
      
      if (audio && !audio.paused && audio.duration && isFinite(audio.duration)) {
        setCurrentTime(audio.currentTime || 0);
        setDuration(audio.duration);
        setIsPlaying(!audio.paused);
      }
    } catch (error) {
      // Silently handle errors
    }
    
    if (isPlaying && !isDragging) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isDragging, isPlaying]);

  // Listen to player store changes and audio events
  useEffect(() => {
    const unsubscribe = playerStore.subscribe(() => {
      const state = playerStore.getState();
      if (state.songs && state.mainId) {
        const song = state.songs.find(s => s.id === state.mainId);
        if (song) {
          setCurrentSong(song);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Set up audio event listeners and progress tracking
  useEffect(() => {
    const setupAudioListeners = () => {
      try {
        const coordinator = audioCoordinator.getState?.();
        const audio = coordinator?.currentAudio;
        
        if (!audio) return;

        const handleTimeUpdate = () => {
          if (!isDragging) {
            setCurrentTime(audio.currentTime || 0);
          }
        };

        const handleDurationChange = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        const handlePlay = () => {
          setIsPlaying(true);
        };

        const handlePause = () => {
          setIsPlaying(false);
        };

        const handleLoadedMetadata = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime || 0);
          }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        // Initial sync
        handleLoadedMetadata();
        setIsPlaying(!audio.paused);

        return () => {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('durationchange', handleDurationChange);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
        };
      } catch (error) {
        // Silently handle setup errors
      }
    };

    const cleanup = setupAudioListeners();
    
    return () => {
      if (cleanup) cleanup();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentSong, isDragging]);

  // Start animation loop when playing
  useEffect(() => {
    if (isPlaying && !isDragging) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isDragging, updateProgress]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentElementColor = getCurrentElementColor();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return (percentage / 100) * duration;
  }, [duration]);

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
    if (isDragging) return;
    
    const newTime = getTimeFromPosition(e.clientX);
    
    try {
      const coordinator = audioCoordinator.getState?.();
      const audio = coordinator?.currentAudio;
      
      if (audio && duration > 0) {
        audio.currentTime = newTime;
        setCurrentTime(newTime);
      }
    } catch (error) {
      // Silently handle click errors
    }
  }, [getTimeFromPosition, duration, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newTime = getTimeFromPosition(moveEvent.clientX);
      setCurrentTime(newTime);
      
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
      
      try {
        const coordinator = audioCoordinator.getState?.();
        const audio = coordinator?.currentAudio;
        if (audio) {
          audio.currentTime = currentTime;
        }
      } catch (error) {
        // Silently handle seek errors
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [getTimeFromPosition, duration, currentTime]);

  // Don't render if no song is playing or no duration
  if (!currentSong || !duration) {
    return null;
  }

  return (
    <div 
      className={`spotify-progress-bar ${className}`}
      style={{
        width: '100%',
        padding: '8px 0',
        ...style
      }}
    >
      {/* Time displays */}
      <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#B3B3B3' }}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Progress bar */}
      <div 
        ref={progressBarRef}
        className="relative w-full h-1 cursor-pointer group rounded-full"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
      >
        {/* Progress fill */}
        <div 
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
          style={{ 
            width: `${Math.min(progressPercentage, 100)}%`,
            backgroundColor: currentElementColor,
            boxShadow: `0 0 6px ${currentElementColor}80, 0 0 12px ${currentElementColor}40`,
          }}
        />
        
        {/* Progress handle */}
        <div 
          className="absolute top-1/2 w-3 h-3 rounded-full transition-all duration-150 pointer-events-none"
          style={{ 
            left: `${Math.min(progressPercentage, 100)}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            backgroundColor: currentElementColor,
            boxShadow: `0 0 4px ${currentElementColor}, 0 2px 4px rgba(0,0,0,0.3)`,
            border: '2px solid white',
            opacity: isHovering || isDragging ? 1 : 0,
            scale: isHovering || isDragging ? 1 : 0.8
          }}
        />
        
        {/* Hover indicator */}
        {isHovering && !isDragging && (
          <>
            <div 
              className="absolute top-1/2 w-3 h-3 bg-white rounded-full transition-all duration-75 pointer-events-none"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%) translateY(-50%)',
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.8)'
              }}
            />
            {/* Hover time tooltip */}
            <div 
              className="absolute -top-8 px-2 py-1 bg-black text-white text-xs rounded backdrop-blur-sm pointer-events-none z-50"
              style={{ 
                left: `${hoverPosition}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontSize: '11px'
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

export default SpotifyProgressBar;