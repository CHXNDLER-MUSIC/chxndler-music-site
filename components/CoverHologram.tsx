// components/CoverHologram.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cockpit } from "@/config/ui";
import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export default function CoverHologram({ src, title }: { src: string; title: string }) {
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const closeCoverRef = useRef(null);
  
  const handleClick = () => {
    setShowCard(true);
  };

  // Reset flip state when modal closes
  useEffect(() => {
    if (!showCard) {
      setCardFlipped(false);
    }
  }, [showCard]);

  // Listen for Escape key
  useEffect(() => {
    if (!showCard) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowCard(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCard]);

  return (
    <motion.div
      className={`absolute left-1/2 z-30 -translate-x-1/2 ${cockpit.cover.glass} rounded-2xl cursor-pointer hover:scale-105 transition-transform duration-200 w-[280px]`}
      style={{ 
        top: "calc(50% + 90px)", 
        transform: "translateX(-50%)"
      }}
      initial={{ opacity: 0, y: 20, rotateX: -8 }}
      animate={{ opacity: cockpit.cover.hologramOpacity, y: 0, rotateX: -cockpit.cover.tilt }}
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${title} card`}
    >
      <div className="p-2">
        <Image
          src={src}
          alt={`${title} cover`}
          width={168}
          height={168}
          className="rounded-xl object-cover select-none w-full h-auto"
          priority
        />
      </div>
      <div className="px-3 pb-3 text-center text-xs text-white/70">{title}</div>
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl"
        style={{
          boxShadow: "inset 0 0 40px rgba(255,255,255,0.08), 0 0 28px rgba(125,200,255,0.22)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
      
      {showCard ? (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
          style={{ padding: 0 }}
          onClick={() => {
            try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
            setShowCard(false);
          }}
        >
          {/* Anchor the card so its bottom exactly touches the bottom of the pink display */}
          <div
            className="card-anchored"
            style={{
              position: 'fixed',
              // Exactly align the card bottom to the blue display bottom
              bottom: 'calc(var(--display-touch-top) - 4px)',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0 5vw 0 5vw',
              width: 'var(--display-width)',
              display: 'flex',
              // Align card to the bottom edge of this anchored container
              alignItems: 'flex-end',
              // Center the card horizontally on screen
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
            onClick={(e)=> e.stopPropagation()}
          >
            <div
              className="relative rounded-2xl p-4 card-modal"
              style={{ paddingBottom: '0px' }}
            >
            <div className="tilt-wrap">
              <div className="card-frame">
                <div 
                  className="card-flip-container"
                  style={{
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => { 
                    setCardFlipped(!cardFlipped); 
                  }}
                >
                  <div 
                    className="card-flip-inner"
                    style={{
                      transition: 'transform 0.7s ease-in-out',
                      transformStyle: 'preserve-3d',
                      transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side */}
                    <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                      <img
                        src={src}
                        alt={title}
                        className="tilt-img"
                        onError={(e)=>{
                          e.currentTarget.src = '/card/chxndler.png';
                        }}
                      />
                    </div>
                    {/* Back side */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <img
                        src="/card/back.png"
                        alt="Card back"
                        className="tilt-img"
                      />
                    </div>
                  </div>
                </div>
                <span className="frame-sheen" aria-hidden />
              </div>
            </div>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="ocean-cta-wrap relative">
                <a
                  href="https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ocean"
                  title="Collect this card"
                  onClick={(e) => {
                    try { e.preventDefault(); } catch {}
                    
                    // Track collect card button click
                    try {
                      track('collect_card_clicked', { 
                        song_slug: title?.toLowerCase().replace(/\s+/g, '-'),
                        card_src: src,
                        payload: { 
                          song_title: title,
                          card_image: src,
                          stripe_url: e.currentTarget.href 
                        } 
                      });
                    } catch {}
                    
                    try {
                      const el = e.currentTarget;
                      el.classList.remove('is-rippling');
                      void el.offsetWidth;
                      el.classList.add('is-rippling');
                      setTimeout(() => { window.open(el.href, '_blank', 'noopener,noreferrer'); }, 520);
                    } catch { window.open((e.currentTarget || {}).href, '_blank', 'noopener,noreferrer'); }
                  }}
                >
                  <span className="btn-label">COLLECT CARD</span>
                  <span className="btn-ripple" aria-hidden />
                </a>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
                setShowCard(false);
              }}
              className="absolute -top-3 -right-3 rounded-full bg-[#19E3FF] text-black font-bold w-8 h-8 shadow-[0_0_20px_rgba(25,227,255,0.8)]"
              title="Close"
            >×</button>
            </div>
          </div>
        </div>
      ) : null}
      
      <style jsx>{`
        .card-modal{
          max-width: min(60vw, 320px);
          background: rgba(25,227,255,0.45);
          box-shadow: 0 0 60px rgba(25,227,255,0.45), inset 0 0 0 1px rgba(25,227,255,0.35);
        }
        .tilt-wrap{ perspective: 1200px; transform-style: preserve-3d; }
        .card-frame{
          position:relative; border-radius: 16px; padding: 8px; background: transparent;
          outline: 1px solid rgba(25,227,255,.4);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 36px rgba(25,227,255,.35);
        }
        .tilt-img{
          width: 100%; height: auto; display:block; object-fit: contain;
          transform: rotateX(10deg) rotateY(-10deg) translateZ(0);
          filter: saturate(1.06) contrast(1.06) brightness(1.04)
            drop-shadow(0 0 18px rgba(25,227,255,0.55)) drop-shadow(0 0 36px rgba(25,227,255,0.35));
          animation: tiltPulse 3s ease-in-out infinite;
          border-radius: 14px;
        }
        .frame-sheen{ position:absolute; inset: 6px; border-radius: 12px; pointer-events:none;
          background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0) 60%);
          mix-blend-mode: screen; opacity:.6;
        }
        .tilt-img:hover{ animation-duration: 2.2s; }
        @keyframes tiltPulse{
          0%,100% { transform: rotateX(9deg) rotateY(-9deg) scale(1); }
          50%      { transform: rotateX(13deg) rotateY(-13deg) scale(1.04); }
        }
        .ocean-cta-wrap{ position:relative; }
        .btn-ocean{
          position:relative; display:inline-grid; place-items:center;
          padding: 8px 12px; border-radius: 10px; font-weight:800; letter-spacing:.06em; font-size: 12px;
          color:#001014; text-transform:uppercase; font-family: InterLocal, system-ui, sans-serif;
          background: radial-gradient(100% 100% at 50% 20%, rgba(210,255,255,0.95), #19E3FF);
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 0 20px rgba(25,227,255,.55), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 16px rgba(0,0,0,.22);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow:hidden;
        }
        .btn-ocean:hover{
          transform: translateZ(0) scale(1.05);
          box-shadow:
            0 0 36px rgba(25,227,255,.95),
            0 0 80px rgba(25,227,255,.55),
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: oceanGlow 1.8s ease-in-out infinite;
        }
        .btn-ocean:active{ transform: scale(.98); }
        @keyframes oceanGlow {
          0%, 100% { box-shadow: 0 0 36px rgba(25,227,255,.95), 0 0 80px rgba(25,227,255,.55), inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28); }
          50% { box-shadow: 0 0 52px rgba(25,227,255,1), 0 0 110px rgba(25,227,255,.7), inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3); }
        }
        .btn-ripple{ position:absolute; inset:-10%; border-radius:inherit; pointer-events:none; opacity:0;
          background: radial-gradient(closest-side, rgba(255,255,255,.85), rgba(25,227,255,.45) 40%, rgba(25,227,255,0) 60%);
          filter: blur(1px);
        }
        .btn-ocean.is-rippling .btn-ripple{ animation: og-ripple 520ms ease-out 1; }
        @keyframes og-ripple{
          0% { opacity:.7; transform: scale(.5); }
          60% { opacity:.25; transform: scale(1.6); }
          100% { opacity:0; transform: scale(2.2); }
        }
      `}</style>
      
      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
    </motion.div>
  );
}
