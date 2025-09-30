// components/CoverHologram.tsx
"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cockpit } from "@/config/ui";
import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";

// Generate purchase URL based on song title
const getPurchaseUrl = (title: string) => {
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Map of song slugs to their Stripe purchase URLs
  const purchaseUrls: Record<string, string> = {
    'ocean-girl': 'https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k',
    'chxndler': 'https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k', // Default/home
    // Add more songs as needed
    // 'song-slug': 'https://buy.stripe.com/your-stripe-url',
  };
  
  // Return specific URL or default
  return purchaseUrls[slug] || purchaseUrls['ocean-girl'];
};

export default function CoverHologram({ src, title, inline = false, size = 168, onCardOpen }: { src: string; title: string; inline?: boolean; size?: number; onCardOpen?: () => void }) {
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeCoverRef = useRef(null);
  const flipCoverRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleClick = () => {
    // Play flip sound when opening the card
    try { 
      const a = flipCoverRef.current; 
      if (a && a.readyState >= 2) { 
        a.currentTime = 0; 
        a.volume = 0.6; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    setShowCard(true);
    // Call the analytics callback when card opens
    if (onCardOpen) {
      onCardOpen();
    }
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
      className={`cover-hologram-container ${inline ? 'relative' : 'absolute left-1/2 z-30 -translate-x-1/2'} ${cockpit.cover.glass} rounded-2xl cursor-pointer`}
      style={inline ? { 
        width: size + 16, // Add padding to size
      } : { 
        top: "calc(50% + 90px)", 
        transform: "translateX(-50%)",
        width: "280px"
      }}
      initial={{ opacity: 0, y: 20, rotateX: -8 }}
      animate={{ opacity: inline ? 1 : cockpit.cover.hologramOpacity, y: 0, rotateX: inline ? 0 : -cockpit.cover.tilt }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: [
          "inset 0 0 40px rgba(255,255,255,0.08), 0 0 28px rgba(25,227,255,0.35)",
          "inset 0 0 40px rgba(255,255,255,0.12), 0 0 40px rgba(25,227,255,0.8), 0 0 60px rgba(25,227,255,0.6), 0 0 80px rgba(25,227,255,0.4)"
        ]
      }}
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
      <div className="cover-hologram-inner p-2">
        <Image
          src={src}
          alt={`${title} cover`}
          width={size}
          height={size}
          className="cover-hologram-image rounded-xl object-cover select-none w-full h-auto transition-all duration-300"
          priority
        />
        {/* Blue fill overlay */}
        <div className="blue-fill-overlay absolute inset-2 rounded-xl pointer-events-none bg-[#19E3FF]/0 transition-all duration-300" />
      </div>
      {!inline && <div className="px-3 pb-3 text-center text-xs text-white/70">{title}</div>}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl border-2 border-[#19E3FF]/60 transition-all duration-300"
        style={{
          boxShadow: "inset 0 0 40px rgba(255,255,255,0.08), 0 0 28px rgba(25,227,255,0.35)",
        }}
      />
      
      {showCard && mounted ? createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
          style={{ padding: 0 }}
          onClick={() => {
            try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
            setShowCard(false);
          }}
        >
          {/* Card modal positioned above light beam */}
          <div
            className="card-anchored"
            style={{
              position: 'fixed',
              bottom: '45vh', // Position above light beam area
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto'
            }}
            onClick={(e)=> e.stopPropagation()}
          >
            <div
              className="relative rounded-2xl p-4 card-modal"
              style={{ paddingBottom: '0px', paddingTop: '32px' }}
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
                    try { const a = flipCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
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
                        src={src.replace('/cover/', '/card/')}
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
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="ocean-cta-wrap relative">
                <a
                  href={getPurchaseUrl(title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ocean"
                  title="Collect this card"
                  onClick={(e) => {
                    try { e.preventDefault(); } catch {}
                    
                    // Play click sound
                    try { sfx.play('click', 0.7); } catch {}
                    
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
                  <span className="btn-label" style={{ whiteSpace: 'nowrap' }}>COLLECT CARD</span>
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
        </div>,
        document.body
      ) : null}
      
      <style jsx>{`
        /* Cover Hologram Hover Effects */
        .cover-hologram-container {
          animation: coverPulse 3s ease-in-out infinite;
          transition: transform 0.3s ease !important;
          will-change: transform;
        }
        
        .cover-hologram-container:hover {
          animation: none;
        }
        
        .cover-hologram-container:hover .blue-fill-overlay {
          background-color: rgba(25, 227, 255, 0.2);
          mix-blend-mode: overlay;
        }
        
        .cover-hologram-container:hover .cover-hologram-image {
          filter: brightness(1.1) contrast(1.1) saturate(1.2);
        }
        
        .cover-hologram-container:hover > div[aria-hidden] {
          border-color: rgba(25, 227, 255, 1);
        }
        
        @keyframes coverPulse {
          0%, 100% {
            box-shadow: 0 0 28px rgba(25, 227, 255, 0.35);
          }
          50% {
            box-shadow: 0 0 35px rgba(25, 227, 255, 0.5);
          }
        }
        
        .card-modal{
          max-width: min(45vw, 280px);
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
          background: radial-gradient(100% 100% at 50% 20%, rgba(255,255,210,0.95), #F2EF1D);
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 0 20px rgba(242,239,29,.55), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -8px 16px rgba(0,0,0,.22);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow:hidden;
          white-space: nowrap;
        }
        .btn-ocean:hover{
          transform: translateZ(0) scale(1.05);
          box-shadow:
            0 0 36px rgba(242,239,29,.95),
            0 0 80px rgba(242,239,29,.55),
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: oceanGlow 1.8s ease-in-out infinite;
        }
        .btn-ocean:active{ transform: scale(.98); }
        @keyframes oceanGlow {
          0%, 100% { box-shadow: 0 0 36px rgba(242,239,29,.95), 0 0 80px rgba(242,239,29,.55), inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28); }
          50% { box-shadow: 0 0 52px rgba(242,239,29,1), 0 0 110px rgba(242,239,29,.7), inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3); }
        }
        .btn-ripple{ position:absolute; inset:-10%; border-radius:inherit; pointer-events:none; opacity:0;
          background: radial-gradient(closest-side, rgba(255,255,255,.85), rgba(242,239,29,.45) 40%, rgba(242,239,29,0) 60%);
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
      <audio ref={flipCoverRef} src="/audio/flip.mp3" preload="auto" />
    </motion.div>
  );
}
