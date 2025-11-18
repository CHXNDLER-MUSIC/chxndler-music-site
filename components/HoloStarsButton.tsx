"use client";
import React, { useRef, useState } from "react";
import { BEAM_TOP_RATIO, BEAM_WIDTH_RATIO, BEAM_HEIGHT_RATIO, BEAM_LEFT_OFFSET_RATIO } from "@/lib/joinBeam";
import { sfx } from "@/lib/sfx";

export default function HoloStarsButton({
  onClick,
  size = 72,
  label = "Stars",
  iconSrc = "/elements/star-icon.svg", // You may need to create this icon
  isActive = false,
}: {
  onClick?: () => void;
  size?: number;
  label?: string;
  iconSrc?: string;
  isActive?: boolean;
}) {
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const [questionResponse, setQuestionResponse] = useState("");
  const [showSoulSky, setShowSoulSky] = useState(false);

  const hubColor = "#00BFFF"; // Neon blue color

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
      <div className="stars-wrap" style={{ width: size, height: size }}>
        <div className="beam" aria-hidden />
        <button
          type="button"
          className={`hub ${isActive ? "hub-active" : ""}`}
          aria-label={label}
          onClick={handleActivate as any}
          onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } }}
          style={{ width: size, height: size }}
        >
          <span className="hub-glyph" aria-hidden>
            <div className="star-icon">⭐</div>
          </span>
          <span className="sr-only">{label}</span>
        </button>
        
        <style jsx>{`
          .stars-wrap{ position: relative; }
          .beam{ position:absolute; left:-${Math.round(size*BEAM_LEFT_OFFSET_RATIO)}px; top:${Math.round(size*BEAM_TOP_RATIO)}px; width:${Math.round(size*BEAM_WIDTH_RATIO)}px; height:${Math.round(size*BEAM_HEIGHT_RATIO)}px; pointer-events:none; mix-blend-mode:screen;
            clip-path: polygon(50% 100%, 90% 0, 10% 0);
            background: linear-gradient(180deg, ${hubColor}12, ${hubColor}22 30%, ${hubColor}08 70%, ${hubColor}00 100%);
            filter: blur(6px);
          }
          .hub{
            position:relative; display:grid; place-items:center; border-radius:9999px;
            border:1px solid rgba(0,191,255,.4);
            background:
              radial-gradient(120% 100% at 50% -10%, rgba(0,191,255,.12), rgba(0,191,255,0) 42%),
              linear-gradient(180deg, #0a0a2a, #000 64%);
            box-shadow:
              0 16px 30px rgba(0,0,0,.6),
              0 0 20px ${hubColor}55,
              0 0 40px ${hubColor}22,
              inset 0 2px 0 rgba(0,191,255,.35),
              inset 0 -6px 14px rgba(0,0,0,.7);
            transition: transform 120ms ease, box-shadow 180ms ease, filter 180ms ease;
            animation: starsBasePulse 2.6s ease-in-out infinite;
          }
          .hub::before{ content:""; position:absolute; inset:-2px; border-radius:9999px; pointer-events:none; box-shadow: 0 0 0 1px rgba(0,191,255,.15) inset, 0 0 0 1px rgba(0,191,255,.1); }
          .hub::after{ content:""; position:absolute; left:16%; right:16%; top:10%; height:26%; border-radius:9999px; pointer-events:none; background:linear-gradient(180deg, rgba(0,191,255,.55), rgba(0,191,255,0)); filter: blur(1px); opacity:.85; }
          .hub:active{ transform: scale(.96); }
          .hub:hover{
            transform: scale(1.05);
            box-shadow:
              0 20px 38px rgba(0,0,0,.65),
              0 0 26px ${hubColor}CC,
              0 0 60px ${hubColor}77,
              inset 0 2px 0 rgba(0,191,255,.4),
              inset 0 -8px 18px rgba(0,0,0,.7);
            filter: brightness(1.04) saturate(1.08);
          }
          .star-icon{ 
            font-size: ${Math.round(size*0.5)}px; 
            filter: saturate(1.1) brightness(1.04) drop-shadow(0 0 6px ${hubColor}) drop-shadow(0 0 14px ${hubColor}); 
            transition: filter 180ms ease, transform 180ms ease; 
          }
          .hub:hover .star-icon{ transform: scale(1.06); filter: saturate(1.18) brightness(1.06) drop-shadow(0 0 10px ${hubColor}) drop-shadow(0 0 22px ${hubColor}) drop-shadow(0 0 36px ${hubColor}); }
          .hub-active .star-icon{ filter: saturate(1.3) brightness(1.15) drop-shadow(0 0 12px ${hubColor}) drop-shadow(0 0 24px ${hubColor}) drop-shadow(0 0 40px ${hubColor}); }
          .hub-active {
            animation: starsActivePulse 2.0s ease-in-out infinite;
            box-shadow:
              0 16px 32px rgba(0,0,0,.7),
              0 0 30px ${hubColor}CC,
              0 0 60px ${hubColor}88,
              0 0 100px ${hubColor}44,
              inset 0 2px 0 rgba(0,191,255,.4),
              inset 0 -6px 14px rgba(0,0,0,.7);
            filter: brightness(1.15) saturate(1.25);
          }
          
          @keyframes starsBasePulse {
            0%, 100% { 
              filter: brightness(1) saturate(1);
            }
            50% { 
              filter: brightness(1.08) saturate(1.1);
            }
          }
          
          @keyframes starsActivePulse {
            0%, 100% { 
              filter: brightness(1.15) saturate(1.25);
              box-shadow:
                0 16px 32px rgba(0,0,0,.7),
                0 0 30px ${hubColor}CC,
                0 0 60px ${hubColor}88,
                0 0 100px ${hubColor}44,
                inset 0 2px 0 rgba(0,191,255,.4),
                inset 0 -6px 14px rgba(0,0,0,.7);
            }
            50% { 
              filter: brightness(1.25) saturate(1.4);
              box-shadow:
                0 18px 36px rgba(0,0,0,.8),
                0 0 40px ${hubColor}FF,
                0 0 80px ${hubColor}BB,
                0 0 120px ${hubColor}66,
                inset 0 2px 0 rgba(0,191,255,.45),
                inset 0 -6px 14px rgba(0,0,0,.7);
            }
          }
        `}</style>
        <audio ref={sfxRef} src="/audio/star-click.mp3" preload="auto" playsInline />
      </div>

      {/* Black Sky Warp & Modal */}
      {showModal && (
        <div className="warp-overlay">
          <div className="warp-background" />
          <div className="modal-container">
            {showSoulSky && (
              <div className="soul-sky-header">
                <h1>SOUL SKY</h1>
              </div>
            )}
            
            {!showStarAnimation && (
              <div className="question-modal">
                <h2>Question of the Day</h2>
                <textarea
                  value={questionResponse}
                  onChange={(e) => setQuestionResponse(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="response-area"
                />
                <button 
                  onClick={handleSendResponse}
                  className="send-button"
                  disabled={!questionResponse.trim()}
                >
                  Send
                </button>
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
              border: 2px solid #00BFFF;
              border-radius: 1rem;
              padding: 2rem;
              text-align: center;
              box-shadow: 0 0 50px rgba(0, 191, 255, 0.3);
              animation: modalFadeIn 1s ease-out 1s both;
            }
            
            .question-modal h2 {
              color: #00BFFF;
              font-size: clamp(1.5rem, 5vw, 2rem);
              margin-bottom: 1.5rem;
              text-shadow: 0 0 10px #00BFFF;
            }
            
            .response-area {
              width: 100%;
              min-height: 120px;
              background: rgba(0, 0, 0, 0.8);
              border: 1px solid #00BFFF;
              border-radius: 0.5rem;
              color: white;
              padding: 1rem;
              font-size: 1rem;
              margin-bottom: 1.5rem;
              resize: vertical;
              font-family: inherit;
            }
            
            .response-area:focus {
              outline: none;
              box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
            }
            
            .send-button {
              background: linear-gradient(135deg, #00BFFF, #0080FF);
              border: none;
              color: white;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 0 20px rgba(0, 191, 255, 0.3);
            }
            
            .send-button:hover:not(:disabled) {
              transform: scale(1.05);
              box-shadow: 0 0 30px rgba(0, 191, 255, 0.5);
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