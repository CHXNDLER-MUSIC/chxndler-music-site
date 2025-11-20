"use client";

import React, { useRef, useState, useEffect } from "react";
import { track } from "@/lib/analytics";

export default function TwitchEmbed({ visible = true, channel = "chxndlerthealien" } = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [streamStatus, setStreamStatus] = useState('unknown'); // 'online', 'offline', 'unknown'
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [scrambledTime, setScrambledTime] = useState("0:00");
  const [isScrambling, setIsScrambling] = useState(false);
  const iframeRef = useRef(null);
  const countdownRef = useRef(null);
  const scrambleRef = useRef(null);

  // Calculate time until specific target date: 11/28/25 12:00:00
  const getTimeUntilTargetDate = () => {
    const now = new Date();
    // Target date: November 28, 2025 at 12:00:00 (noon)
    const targetDate = new Date('2025-11-28T12:00:00');
    
    // Calculate difference in seconds
    const diffMs = targetDate.getTime() - now.getTime();
    
    // If target date has passed, return 0
    if (diffMs <= 0) {
      return 0;
    }
    
    return Math.floor(diffMs / 1000);
  };

  useEffect(() => {
    if (visible) {
      try {
        track('twitch_embed_viewed', { payload: { channel } });
      } catch {}
    }
  }, [visible, channel]);

  // Check actual stream status - show offline by default for immediate feedback
  const checkStreamStatus = async () => {
    // Always show offline message immediately when component loads
    // This ensures users see the "Signal Lost" message right away
    setStreamStatus('offline');
    setIsOffline(true);
    startCountdown();
    
    try {
      // Optional: Try to check if stream might be live
      // But always default to offline for better UX
      const response = await fetch(`https://www.twitch.tv/${channel}`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      // Even if request succeeds, keep showing offline state
      // User can manually try to reconnect if they think stream is live
      console.log('Stream status check completed - keeping offline state for user control');
      
    } catch (error) {
      console.log('Stream status check failed - showing offline state');
    }
  };

  // Initialize stream status when component becomes visible
  useEffect(() => {
    if (visible) {
      checkStreamStatus();
      // No need for periodic checking - always show offline state
      // User can manually reconnect using the "Try Reconnect Now" button
    }
  }, [visible, channel]);

  // Scrambling effect for numbers
  const scrambleNumber = (targetTime) => {
    setIsScrambling(true);
    let scrambleCount = 0;
    const maxScrambles = 8; // Number of scramble iterations
    
    scrambleRef.current = setInterval(() => {
      if (scrambleCount < maxScrambles) {
        // Generate random scrambled time format
        const randomDays = Math.floor(Math.random() * 99);
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        const randomSeconds = Math.floor(Math.random() * 60);
        
        // Create scrambled display with random numbers
        const scrambledDisplay = `${randomDays}d ${randomHours}h ${randomMinutes}m ${randomSeconds}s`;
        setScrambledTime(scrambledDisplay);
        scrambleCount++;
      } else {
        // Show actual time
        setScrambledTime(formatTimeRemaining(targetTime));
        setIsScrambling(false);
        clearInterval(scrambleRef.current);
      }
    }, 50); // Fast scrambling
  };

  // Countdown timer for reconnection
  const startCountdown = () => {
    const initialTime = getTimeUntilTargetDate();
    setTimeRemaining(initialTime);
    setScrambledTime(formatTimeRemaining(initialTime));
    
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          // Target date reached! Try to reconnect
          setIsOffline(false);
          setIsLoading(true);
          clearInterval(countdownRef.current);
          if (scrambleRef.current) clearInterval(scrambleRef.current);
          return 0;
        }
        
        // Trigger scramble effect every second
        scrambleNumber(newTime);
        return newTime;
      });
    }, 1000);
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (scrambleRef.current) {
        clearInterval(scrambleRef.current);
      }
    };
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Don't automatically set offline to false - let the status check handle it
    try {
      track('twitch_embed_loaded', { payload: { channel } });
    } catch {}
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    try {
      track('twitch_embed_error', { payload: { channel } });
    } catch {}
  };

  const openTwitchInNewTab = () => {
    try {
      window.open(`https://www.twitch.tv/${channel}`, '_blank', 'noopener,noreferrer');
      track('twitch_embed_external_click', { payload: { channel } });
    } catch {}
  };

  // Format time remaining for display (supports days, hours, minutes)
  const formatTimeRemaining = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else {
      return `${minutes}m ${secs}s`;
    }
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className="text-white text-center mb-4">
          <p className="mb-2">Stream unavailable</p>
          <p className="text-sm opacity-75">Click below to open Twitch</p>
        </div>
        <button
          onClick={openTwitchInNewTab}
          className="text-white bg-[#9146FF]/30 ring-2 ring-[#9146FF] rounded-lg px-4 py-2 hover:bg-[#9146FF]/40 transition-all duration-200 shadow-[0_0_20px_rgba(145,70,255,0.5)]"
        >
          Open on Twitch
        </button>
      </div>
    );
  }

  // Only show offline message if we've confirmed the stream is actually offline
  if (isOffline && streamStatus === 'offline') {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ width: '100%', height: '400px' }}>
        <div className="text-center">
          {/* Neon "Signal Lost" message */}
          <div className="mb-6">
            <h2 
              className="text-4xl md:text-6xl font-bold tracking-wider mb-4"
              style={{
                color: '#FF073A',
                textShadow: `
                  0 0 5px #FF073A,
                  0 0 10px #FF073A,
                  0 0 15px #FF073A,
                  0 0 20px #FF073A,
                  0 0 35px #FF073A,
                  0 0 40px #FF073A
                `,
                animation: 'neonFlicker 2s infinite alternate'
              }}
            >
              SIGNAL LOST
            </h2>
            <div 
              className="text-2xl md:text-3xl font-mono tracking-wide"
              style={{
                color: isScrambling ? '#FF00FF' : '#00FFFF',
                textShadow: isScrambling ? `
                  0 0 5px #FF00FF,
                  0 0 10px #FF00FF,
                  0 0 15px #FF00FF,
                  0 0 20px #FF00FF
                ` : `
                  0 0 5px #00FFFF,
                  0 0 10px #00FFFF,
                  0 0 15px #00FFFF,
                  0 0 20px #00FFFF
                `,
                animation: isScrambling ? 'neonScramble 0.1s infinite' : 'neonPulse 1.5s infinite',
                transition: 'all 0.05s ease'
              }}
            >
              Reconnecting in {scrambledTime}
            </div>
          </div>
          
          {/* Optional manual reconnect button */}
          <button
            onClick={() => {
              setIsOffline(false);
              setIsLoading(true);
              checkStreamStatus(); // Recheck status immediately
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
              }
              if (scrambleRef.current) {
                clearInterval(scrambleRef.current);
              }
            }}
            className="text-white bg-[#9146FF]/30 ring-2 ring-[#9146FF] rounded-lg px-6 py-3 hover:bg-[#9146FF]/40 transition-all duration-200 shadow-[0_0_20px_rgba(145,70,255,0.5)]"
          >
            Try Reconnect Now
          </button>
        </div>

        <style jsx>{`
          @keyframes neonFlicker {
            0%, 100% {
              text-shadow: 
                0 0 5px #FF073A,
                0 0 10px #FF073A,
                0 0 15px #FF073A,
                0 0 20px #FF073A,
                0 0 35px #FF073A,
                0 0 40px #FF073A;
            }
            50% {
              text-shadow: 
                0 0 2px #FF073A,
                0 0 5px #FF073A,
                0 0 8px #FF073A,
                0 0 12px #FF073A,
                0 0 20px #FF073A,
                0 0 25px #FF073A;
            }
          }
          
          @keyframes neonPulse {
            0%, 100% {
              text-shadow: 
                0 0 5px #00FFFF,
                0 0 10px #00FFFF,
                0 0 15px #00FFFF,
                0 0 20px #00FFFF;
            }
            50% {
              text-shadow: 
                0 0 2px #00FFFF,
                0 0 5px #00FFFF,
                0 0 8px #00FFFF,
                0 0 12px #00FFFF;
            }
          }
          
          @keyframes neonScramble {
            0%, 20%, 40%, 60%, 80%, 100% {
              text-shadow: 
                0 0 5px #FF00FF,
                0 0 10px #FF00FF,
                0 0 15px #FF00FF,
                0 0 20px #FF00FF;
            }
            10%, 30%, 50%, 70%, 90% {
              text-shadow: 
                0 0 3px #FF00FF,
                0 0 7px #FF00FF,
                0 0 12px #FF00FF,
                0 0 17px #FF00FF;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ width: '100%', height: '400px' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg z-10">
          <div className="text-white text-sm">Loading stream...</div>
        </div>
      )}
      
      {/* Twitch chat iframe - positioned at top, half height */}
      <div style={{ height: '33%' }} className="mb-2">
        <iframe
          src={`https://www.twitch.tv/embed/${channel}/chat?parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&darkpopout`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          style={{
            borderRadius: '8px',
            border: '1px solid #FC54AF66',
            background: 'rgba(0,0,0,0.8)'
          }}
          title={`${channel} Twitch Chat`}
        />
      </div>
      
      {/* Twitch embed iframe - video player */}
      <div className="relative" style={{ height: '67%' }}>
        <iframe
          ref={iframeRef}
          src={`https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=false&muted=true`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            borderRadius: '8px',
            border: '1px solid #FC54AF66',
            background: 'rgba(0,0,0,0.8)'
          }}
          title={`${channel} Twitch Stream`}
          allow="autoplay; fullscreen"
        />
        
        {/* Stream overlay controls */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={openTwitchInNewTab}
            className="text-xs text-white bg-[#9146FF]/80 hover:bg-[#9146FF] px-2 py-1 rounded transition-all duration-200 backdrop-blur-sm"
            title="Open on Twitch"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}