"use client";
import React, { useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

export default function HoloStarsButton({
  onClick,
  label = "STARS",
  isActive = false,
}: {
  onClick?: () => void;
  label?: string;
  isActive?: boolean;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const [questionResponse, setQuestionResponse] = useState("");
  const [showSoulSky, setShowSoulSky] = useState(false);

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
    
    // Hide modal after animation
    setTimeout(() => {
      setShowModal(false);
      setShowStarAnimation(false);
      setShowSoulSky(false);
    }, 5000);
  }

  return (
    <>
      <button
        type="button"
        className="stars-neon"
        aria-label={label}
        onClick={handleActivate}
        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
      >
        ⭐
      </button>
      
      <style jsx>{`
        .stars-neon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          font-size: 24px;
          color: #FFD700;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: 2px solid #FFD700;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          box-shadow: 
            0 0 0 1px rgba(255, 215, 0, 0.6),
            0 4px 16px rgba(255, 215, 0, 0.3),
            0 0 20px rgba(255, 215, 0, 0.2),
            inset 0 0 16px rgba(255, 223, 0, 0.3);
        }
        
        .stars-neon:hover {
          transform: scale(1.1);
          box-shadow: 
            0 0 0 2px rgba(255, 215, 0, 0.8),
            0 8px 32px rgba(255, 215, 0, 0.5),
            0 0 40px rgba(255, 215, 0, 0.4),
            inset 0 0 20px rgba(255, 223, 0, 0.5);
        }
        
        .stars-neon:active {
          transform: scale(0.95);
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
                <div className="solsky-header">
                  <h1>SolSky</h1>
                  <div className="divider"></div>
                </div>
                <h2>Question of the Day</h2>
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

          <style jsx>{`
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
              color: #00BFFF;
              text-shadow: 0 0 20px #00BFFF, 0 0 40px #00BFFF;
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
            }
            
            .solsky-header {
              margin-bottom: 2rem;
            }
            
            .solsky-header h1 {
              color: #FFD700;
              font-size: clamp(1.8rem, 6vw, 2.5rem);
              margin: 0 0 1rem 0;
              text-shadow: 0 0 15px #FFD700;
              font-weight: bold;
              letter-spacing: 0.1em;
            }
            
            .divider {
              width: 100%;
              height: 2px;
              background: linear-gradient(90deg, transparent, #FFD700, transparent);
              margin-bottom: 1.5rem;
              box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
            }
            
            .question-modal h2 {
              color: #FFD700;
              font-size: clamp(1.3rem, 4vw, 1.6rem);
              margin-bottom: 1.5rem;
              text-shadow: 0 0 10px #FFD700;
            }
            
            .cosmic-vision-section {
              margin-bottom: 1.5rem;
            }
            
            .cosmic-vision-label {
              display: block;
              color: #FFD700;
              font-size: 1rem;
              margin-bottom: 0.5rem;
              text-align: left;
              font-weight: 500;
            }
            
            .response-area {
              width: 100%;
              min-height: 60px;
              background: rgba(0, 0, 0, 0.8);
              border: 1px solid #FFD700;
              border-radius: 0.5rem;
              color: #FFD700;
              padding: 0.75rem;
              font-size: 1rem;
              resize: vertical;
              font-family: inherit;
            }
            
            .response-area::placeholder {
              color: rgba(255, 215, 0, 0.6);
            }
            
            .response-area:focus {
              outline: none;
              box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
              border-color: #FFD700;
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
                text-shadow: 0 0 20px #00BFFF, 0 0 40px #00BFFF;
              }
              100% {
                text-shadow: 0 0 30px #00BFFF, 0 0 60px #00BFFF, 0 0 80px #00BFFF;
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
          `}</style>
        </div>
      )}
    </>
  );
}