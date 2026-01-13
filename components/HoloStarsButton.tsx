"use client";
import React, { useRef } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import SharedButton from "@/components/SharedButton";
import SoulStarJournal from "@/components/SoulStarJournal";

export default function HoloStarsButton({
  onClick,
  label = "JOURNAL",
  isActive = false,
  autoOpen = false,
  onJournalCompleted,
  onBeamColorChange,
  prompt,
}: {
  onClick?: () => void;
  label?: string;
  isActive?: boolean;
  autoOpen?: boolean;
  onJournalCompleted?: () => void;
  onBeamColorChange?: (color: string) => void;
  prompt?: any;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const { isJournalOpen, setIsJournalOpen } = useProfile();

  // Handle opening the unified journal
  const handleActivate = () => {
    try { 
      const a = sfxRef.current; 
      if (a) { 
        a.currentTime = 0; 
        a.volume = 0.95; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    // Open the unified journal without changing beam color
    // This allows the journal to open while keeping the blue display active
    setIsJournalOpen(true);
    
    if (typeof onClick === "function") { 
      try { onClick(); } catch {} 
    }
  };

  // Handle closing the journal
  const handleCloseJournal = () => {
    setIsJournalOpen(false);
    if (typeof onClick === "function") { 
      try { onClick(); } catch {} 
    }
  };

  return (
    <>
      <SharedButton
        data-tour-id="stars"
        variant="stars"
        aria-label={label}
        onClick={handleActivate}
        onHoverSound={() => sfx.play('hover', 0.35)}
        className="custom-stars-style"
      >
        <img src="/elements/journal.webp" alt="Stars" className="star-image" />
      </SharedButton>

      {/* Unified Soul Star Journal */}
      <SoulStarJournal
        isOpen={isJournalOpen}
        onClose={handleCloseJournal}
        prompt={prompt}
        openWelcomeHome={() => window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'))}
      />

      <audio ref={sfxRef} src="/audio/star.mp3" preload="auto" playsInline />
      
      <style jsx>{`
        .custom-stars-style {
          width: 90px;
          height: 50px;
          border-radius: 12px;
          font-size: 32px;
          color: inherit !important;
          background: transparent !important;
          border: none;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 !important;
          text-shadow: none;
          box-shadow: none;
          overflow: hidden;
        }
        
        .star-image {
          width: 90%;
          height: 90%;
          object-fit: contain;
          border-radius: 8px;
          filter: 
            drop-shadow(0 0 12px #FFFF00) 
            drop-shadow(0 0 24px #FFFF00) 
            drop-shadow(0 0 36px #FFD700) 
            drop-shadow(0 0 48px #FFFF00) 
            brightness(1.3) 
            saturate(1.5) !important;
          opacity: 1 !important;
          border: 2px solid #FFFF00;
          box-sizing: border-box;
          background: transparent !important;
          color: initial !important;
          transition: filter 0.3s ease;
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.8),
            0 0 40px rgba(255, 255, 0, 0.6),
            0 0 60px rgba(255, 255, 0, 0.4);
        }
        
        @media (max-width: 768px) {
          .custom-stars-style {
            width: 70px;
            height: 70px;
            font-size: 28px;
          }
        }
        
        @media (max-width: 480px) {
          .custom-stars-style {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
        }
        
        .custom-stars-style:hover {
          transform: scale(1.1);
          text-shadow: none;
          box-shadow: none;
        }
        
        .custom-stars-style:hover .star-image {
          filter: 
            drop-shadow(0 0 20px #FFFF00) 
            drop-shadow(0 0 40px #FFFF00) 
            drop-shadow(0 0 60px #FFD700) 
            drop-shadow(0 0 80px #FFFF00) 
            brightness(1.5) 
            saturate(2) !important;
          border-color: #FFD700;
          border-width: 4px;
          box-shadow: 
            0 0 30px rgba(255, 255, 0, 1),
            0 0 60px rgba(255, 255, 0, 0.8),
            0 0 90px rgba(255, 255, 0, 0.6),
            0 0 120px rgba(255, 255, 0, 0.4);
        }
        
        .custom-stars-style:active {
          transform: scale(0.95);
        }
      `}</style>
    </>
  );
}
