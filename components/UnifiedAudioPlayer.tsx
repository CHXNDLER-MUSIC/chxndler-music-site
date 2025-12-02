"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { songs } from "@/data/songs";
import { TRACKS, type TrackKey } from "@/contexts/AudioManagerContext";
import SongDropdown from "./SongDropdown";

// Map song IDs to track keys
const SONG_TRACK_MAP: Record<string, TrackKey> = {
  "baby": "BABY",
  "be-my-bee": "BE_MY_BEE",
  "ocean-girl": "OCEAN_GIRL",
  "colors-home": "COLORS_HOME",
  "game-boy-heart": "GAME_BOY_HEART",
  "house-party": "HOUSE_PARTY",
  "kid-forever": "KID_FOREVER",
  "paris": "PARIS",
  "pokemon": "POKEMON",
  "we're-just-friends": "WJF",
};

// Element mapping for visual consistency
const ELEMENT_MAP: Record<string, string> = {
  "ocean-girl": "water",
  "alone": "darkness", 
  "baby": "heart",
  "be-my-bee": "heart",
  "night-drive": "lightning",
  "starlight": "lightning",
  "horizon": "water",
  "afterglow": "lightning", 
  "midnight": "darkness",
  "tidal": "water",
  "drift": "water",
};

// Helper to get track URL from song ID
function getTrackUrlFromSongId(songId: string): string {
  const trackKey = SONG_TRACK_MAP[songId];
  if (trackKey && TRACKS[trackKey]) {
    // Prefer opus, fallback to mp3
    return TRACKS[trackKey].opus || TRACKS[trackKey].mp3 || "";
  }
  // Fallback: try direct path
  return `/tracks/${songId}.mp3`;
}

// Brand colors for the glowing progress bar
const BRAND_COLORS = {
  pink: "#FC54AF",
  blue: "#38B6FF", 
  yellow: "#F2EF1D"
};

interface UnifiedAudioPlayerProps {
  initialTrackId?: string;
}

export default function UnifiedAudioPlayer({ initialTrackId }: UnifiedAudioPlayerProps) {
  // Audio element reference
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // React state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId || songs[0]?.id || "");
  
  // Progress bar reference for click handling
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Get current track info
  const currentTrack = songs.find(song => song.id === selectedTrackId) || songs[0];
  const currentTrackUrl = getTrackUrlFromSongId(selectedTrackId);
  
  // Calculate progress (0-1)
  const progress = duration > 0 ? currentTime / duration : 0;

  // Handle track change from dropdown
  const handleTrackChange = useCallback((newTrackId: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const wasPlaying = isPlaying;
    
    // Pause current audio
    audio.pause();
    setIsPlaying(false);
    
    // Set new track
    setSelectedTrackId(newTrackId);
    const newUrl = getTrackUrlFromSongId(newTrackId);
    audio.src = newUrl;
    
    // Reset time
    audio.currentTime = 0;
    setCurrentTime(0);
    
    // Load and potentially start playing
    audio.load();
    if (wasPlaying) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [isPlaying]);

  // Handle play/pause button
  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [isPlaying]);

  // Handle progress bar click for seeking
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar || duration <= 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Initialize audio source when component mounts or track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.src = currentTrackUrl;
    audio.load();
  }, [currentTrackUrl]);

  // Prepare dropdown items for SongDropdown component
  const dropdownItems = songs.map(song => ({
    id: song.id,
    title: song.title,
    slug: song.id,
    icon: ELEMENT_MAP[song.id] || "music",
  }));

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,680px)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
      
      {/* Main player container */}
      <div className="backdrop-blur-xl bg-[rgba(8,26,32,0.85)] rounded-2xl p-4 border border-[#19E3FF]/40 shadow-[0_0_25px_rgba(25,227,255,0.2)]">
        <div className="flex flex-col gap-4">
          
          {/* Track Dropdown using existing SongDropdown component */}
          <div className="w-full">
            <SongDropdown 
              items={dropdownItems}
              initialActiveId={selectedTrackId}
              currentId={selectedTrackId}
              onChange={handleTrackChange}
            />
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-4">
            
            {/* Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[#19E3FF]/20 to-[#38B6FF]/20 border-2 border-[#19E3FF]/60 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#19E3FF]/30 hover:border-[#19E3FF] hover:shadow-lg hover:shadow-[#19E3FF]/40 hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(25, 227, 255, 0.3))'
              }}
            >
              {isPlaying ? (
                <div className="w-4 h-4 flex gap-1">
                  <div className="w-1.5 h-full bg-white rounded-sm"></div>
                  <div className="w-1.5 h-full bg-white rounded-sm"></div>
                </div>
              ) : (
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[#CFF7FF] font-semibold text-base truncate">
                {currentTrack.title}
              </div>
              <div className="text-[#9EEBFF]/80 text-sm truncate">
                {currentTrack.oneLiner}
              </div>
            </div>

            {/* Time Display */}
            <div className="text-[#19E3FF] text-sm font-mono bg-[#19E3FF]/10 px-3 py-1 rounded-md border border-[#19E3FF]/30">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Custom Glowing Progress Bar */}
          <div className="w-full">
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="relative w-full h-3 bg-black/40 rounded-full cursor-pointer overflow-hidden border border-[#19E3FF]/20 hover:border-[#19E3FF]/60 transition-all duration-200"
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#19E3FF]/10 to-transparent"></div>
              
              {/* Progress Fill with Gradient */}
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-75 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: `linear-gradient(90deg, ${BRAND_COLORS.pink} 0%, ${BRAND_COLORS.blue} 50%, ${BRAND_COLORS.yellow} 100%)`,
                  boxShadow: `
                    0 0 12px ${BRAND_COLORS.blue}60,
                    0 0 20px ${BRAND_COLORS.pink}40,
                    0 0 30px ${BRAND_COLORS.yellow}30,
                    inset 0 1px 0 rgba(255,255,255,0.2)
                  `
                }}
              />
              
              {/* Circular Handle */}
              <div
                className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white transition-all duration-75 ease-out shadow-lg"
                style={{
                  left: `${progress * 100}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                  background: `radial-gradient(circle, ${BRAND_COLORS.blue}, ${BRAND_COLORS.pink})`,
                  boxShadow: `
                    0 0 12px ${BRAND_COLORS.blue}80,
                    0 0 20px ${BRAND_COLORS.pink}60,
                    0 2px 8px rgba(0,0,0,0.3),
                    inset 0 1px 2px rgba(255,255,255,0.3)
                  `
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}