"use client";
import React, { useRef, useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import SharedButton from "@/components/SharedButton";

export default function HoloStarsButton({
  onClick,
  label = "JOURNAL",
  isActive = false,
  autoOpen = false,
}: {
  onClick?: () => void;
  label?: string;
  isActive?: boolean;
  autoOpen?: boolean;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const [questionResponse, setQuestionResponse] = useState("");
  const [showSoulSky, setShowSoulSky] = useState(false);
  const [showSoulStarText, setShowSoulStarText] = useState(false);

  // Auto-open modal when autoOpen is true
  useEffect(() => {
    if (autoOpen) {
      handleActivate();
    }
  }, [autoOpen]);

  function handleActivate() {
    try { 
      const a = sfxRef.current; 
      if (a) { 
        a.currentTime = 0; 
        a.volume = 0.95; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    // Start black sky warp transition
    setShowModal(true);
    
    if (typeof onClick === "function") { 
      try { onClick(); } catch {} 
    }
  }

  function handleSendResponse() {
    if (!questionResponse.trim()) return;
    
    setShowSoulSky(true);
    setShowStarAnimation(true);
    setQuestionResponse("");
    
    // Show soul star text in button after a delay
    setTimeout(() => {
      setShowSoulStarText(true);
    }, 2000);
    
    // Hide modal after animation
    setTimeout(() => {
      setShowModal(false);
      setShowStarAnimation(false);
      setShowSoulSky(false);
      if (typeof onClick === "function") { 
        try { onClick(); } catch {} 
      }
    }, 5000);
  }

  return (
    <>
      <SharedButton
        variant="stars"
        aria-label={label}
        onClick={handleActivate}
        onHoverSound={() => sfx.play('hover', 0.35)}
        className={`custom-stars-style ${showSoulStarText ? 'soul-star-text' : ''}`}
      >
        {showSoulStarText ? "Your soul star shines above." : "⭐"}
      </SharedButton>
      
      <style jsx>{`
        .custom-stars-style {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          font-size: 24px;
          color: #FFFF00;
          background: transparent !important;
          border: none;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          text-shadow: none;
          box-shadow: none;
        }
        
        .soul-star-text {
          width: auto;
          min-width: 200px;
          height: auto;
          border-radius: 25px;
          font-size: 0.8rem;
          padding: 0.75rem 1.5rem;
          white-space: nowrap;
          text-align: center;
          animation: soulStarGlow 2s ease-in-out infinite alternate;
        }
        
        @media (max-width: 768px) {
          .soul-star-text {
            min-width: 150px;
            font-size: 0.7rem;
            padding: 0.5rem 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .soul-star-text {
            min-width: 120px;
            font-size: 0.6rem;
            padding: 0.4rem 0.8rem;
          }
        }
        
        .custom-stars-style:hover {
          transform: scale(1.1);
          text-shadow: none;
          box-shadow: none;
        }
        
        .custom-stars-style:active {
          transform: scale(0.95);
        }

        .warp-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .warp-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          animation: warpToBlack 1s ease-out forwards;
        }
        
        .modal-container {
          position: relative;
          z-index: 10000;
          max-width: 90vw;
          width: 100%;
          max-width: 500px;
          padding: 2rem;
        }
        
        .soul-sky-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .soul-sky-header h1 {
          font-size: clamp(2rem, 8vw, 4rem);
          color: #FFFF00;
          text-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF00;
          font-weight: bold;
          letter-spacing: 0.2em;
          margin: 0;
          animation: soulSkyGlow 2s ease-in-out infinite alternate;
        }
        
        .question-modal {
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #FFD700;
          border-radius: 1rem;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
          animation: modalFadeIn 1s ease-out 1s both;
          position: relative;
        }
        
        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #FFFF00;
          font-size: 2rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
          text-shadow: 
            0 0 10px #FFFF00,
            0 0 20px #FFFF00,
            0 0 30px #FFFF00;
          z-index: 10;
        }
        
        .close-button:hover {
          transform: scale(1.1);
          text-shadow: 
            0 0 15px #FFFF00,
            0 0 25px #FFFF00,
            0 0 35px #FFFF00,
            0 0 45px #FFFF00;
        }
        
        .solsky-header {
          margin-bottom: 2rem;
        }
        
        .daily-intention {
          color: #FFFF00;
          font-size: clamp(0.9rem, 3vw, 1.1rem);
          margin-bottom: 1rem;
          text-align: center;
          font-style: italic;
          text-shadow: 0 0 8px #FFFF00;
          letter-spacing: 0.02em;
        }
        
        .solsky-header h1 {
          color: #FFFF00;
          font-size: clamp(1.8rem, 6vw, 2.5rem);
          margin: 0 0 1rem 0;
          text-shadow: 0 0 15px #FFFF00;
          font-weight: bold;
          letter-spacing: 0.1em;
        }
        
        .question-modal h2 {
          color: #FFFF00;
          font-size: clamp(1.3rem, 4vw, 1.6rem);
          margin-bottom: 1.5rem;
          text-shadow: 0 0 10px #FFFF00;
        }
        
        .cosmic-vision-section {
          margin-bottom: 1.5rem;
        }
        
        .cosmic-vision-label {
          display: block;
          color: #FFFF00;
          font-size: 1rem;
          margin-bottom: 0.5rem;
          text-align: left;
          font-weight: 500;
        }
        
        .response-area {
          width: 100%;
          min-height: 20px;
          height: 20px;
          max-height: 40px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #FFFF00;
          border-radius: 0.5rem;
          color: #FFFF00;
          padding: 0.5rem;
          font-size: 0.9rem;
          resize: vertical;
          font-family: inherit;
        }
        
        .response-area::placeholder {
          color: rgba(255, 255, 0, 0.6);
        }
        
        .response-area:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
          border-color: #FFFF00;
        }
        
        .send-button {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          color: #000;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }
        
        .send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        }
        
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .star-animation-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }
        
        .forming-star {
          font-size: 4rem;
          animation: starFormation 5s ease-out forwards;
        }
        
        @keyframes warpToBlack {
          0% {
            background: radial-gradient(circle at center, transparent 0%, transparent 40%, #000 100%);
          }
          100% {
            background: #000;
          }
        }
        
        @keyframes modalFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes soulSkyGlow {
          0% {
            text-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF00;
          }
          100% {
            text-shadow: 0 0 30px #FFFF00, 0 0 60px #FFFF00, 0 0 80px #FFFF00;
          }
        }
        
        @keyframes starFormation {
          0% {
            transform: scale(0.1) rotate(0deg);
            opacity: 0;
            filter: brightness(1);
          }
          25% {
            transform: scale(1) rotate(90deg);
            opacity: 1;
            filter: brightness(3) drop-shadow(0 0 20px #FFD700);
          }
          50% {
            transform: scale(1.5) rotate(180deg);
            filter: brightness(5) drop-shadow(0 0 40px #FFD700) drop-shadow(0 0 60px #FFF);
          }
          75% {
            transform: scale(1.2) rotate(270deg) translateY(-50px);
            filter: brightness(4) drop-shadow(0 0 30px #FFD700);
          }
          100% {
            transform: scale(0.3) rotate(360deg) translateY(-200px) translateX(100px);
            opacity: 0.2;
            filter: brightness(2) drop-shadow(0 0 10px #FFD700);
          }
        }
        
        @keyframes soulStarGlow {
          0% {
            text-shadow: 
              0 0 10px #FFFF00,
              0 0 20px #FFFF00,
              0 0 30px #FFFF00;
            box-shadow: 
              0 0 20px rgba(255, 255, 0, 0.6),
              0 0 40px rgba(255, 255, 0, 0.4);
          }
          100% {
            text-shadow: 
              0 0 15px #FFFF00,
              0 0 30px #FFFF00,
              0 0 45px #FFFF00,
              0 0 60px #FFFF00;
            box-shadow: 
              0 0 30px rgba(255, 255, 0, 0.8),
              0 0 60px rgba(255, 255, 0, 0.6),
              0 0 80px rgba(255, 255, 0, 0.4);
          }
        }
      `}</style>
      
      <audio ref={sfxRef} src="/audio/star.mp3" preload="auto" playsInline />

      {/* Black Sky Warp & Modal */}
      {showModal && (
        <div className="warp-overlay">
          <div className="warp-background" />
          <div className="modal-container">
            {!showStarAnimation && (
              <div className="question-modal">
                <button 
                  className="close-button"
                  onClick={() => {
                    setShowModal(false);
                    if (typeof onClick === "function") { 
                      try { onClick(); } catch {} 
                    }
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="solsky-header">
                  <div className="daily-intention">Intention: Find peace in the present moment</div>
                  <h1>SolSky</h1>
                  <h2>Reflection: Share your cosmic vision</h2>
                </div>
                <div className="cosmic-vision-section">
                  <label className="cosmic-vision-label">Share your cosmic vision</label>
                  <textarea
                    value={questionResponse}
                    onChange={(e) => setQuestionResponse(e.target.value)}
                    placeholder="Share your cosmic vision..."
                    className="response-area"
                  />
                </div>
                <button 
                  onClick={handleSendResponse}
                  className="send-button"
                  disabled={!questionResponse.trim()}
                >
                  Send
                </button>
              </div>
            )}

            {showSoulSky && showStarAnimation && (
              <div className="soul-sky-header">
                <h1>SOUL SKY</h1>
              </div>
            )}

            {showStarAnimation && (
              <div className="star-animation-container">
                <div className="forming-star">✨</div>
              </div>
            )}
          </div>

        </div>
      )}
    </>
  );
}