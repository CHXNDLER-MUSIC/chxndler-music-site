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
  
  // Debug: log the generated slug to see what's happening
  console.log(`🎵 Getting purchase URL for title: "${title}" -> slug: "${slug}"`);
  
  // Map of song slugs to their Stripe purchase URLs
  const purchaseUrls: Record<string, string> = {
    'chxndler': 'https://buy.stripe.com/cNi14oetz6p76Bbgxx4gg0k',
    'alone': 'https://buy.stripe.com/dRmfZiclr5l3e3Ddll4gg0i',
    'always-on-my-mind': 'https://buy.stripe.com/9B6cN61GN28R0cN5ST4gg04',
    'baby': 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
    'be-my-bee': 'https://buy.stripe.com/7sY9AU1GN00J4t3ftt4gg0l',
    'be-my-bee-acoustic': 'https://buy.stripe.com/eVq4gA7173cV6Bb0yz4gg07',
    'brain-freeze': 'https://buy.stripe.com/8x2aEYfxD00JcZza994gg0h',
    'collide': 'https://buy.stripe.com/7sY3cw5X3fZH0cN0yz4gg05',
    'colors-of-our-home': 'https://buy.stripe.com/5kQ00k2KRfZH9Nn1CD4gg0j',
    'game-boy-heart': 'https://buy.stripe.com/aFa8wQ2KR5l32kV6WX4gg0m',
    'i-might-fall-in-love-with-you': 'https://buy.stripe.com/aFa8wQdpv7tb1gR1CD4gg0c',
    'kid-forever': 'https://buy.stripe.com/00wfZibhnfZH4t3dll4gg0g',
    'letting-go': 'https://buy.stripe.com/3cI9AU85b00J9Nna994gg0d',
    'mrbrightside': 'https://buy.stripe.com/8x25kEetz8xf0cN8114gg02',
    'ocean-girl': 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00',
    'ocean-girl-acoustic': 'https://buy.stripe.com/aFaeVeclr28R3oZftt4gg09',
    'ocean-girl-remix': 'https://buy.stripe.com/dRmeVeetz8xf0cNchh4gg08',
    'somebody-to-love': 'https://buy.stripe.com/4gM00kgBH4gZaRr1CD4gg0e',
    'tienes-un-amigo': 'https://buy.stripe.com/cNibJ2gBH3cV8Jjgxx4gg0f',
    'were-just-friends': 'https://buy.stripe.com/14A14o99fbJrbVv8114gg0b',
    'were-just-friends-mickey-jas-remix': 'https://buy.stripe.com/aFa5kE3OV14N3oZchh4gg06',
    'were-just-friends-dmvrco-remix': 'https://buy.stripe.com/28EdRa0CJ5l38Jj9554gg03',
    // New mappings from user-provided paylinks
    'were-just-friends-acoustic': 'https://buy.stripe.com/6oU5kE99f9BjgbL6WX4gg0n',
    'love-me-acoustic': 'https://buy.stripe.com/bJecN6adjcNv6Bb3KL4gg0o',
    'love-me': 'https://buy.stripe.com/eVq3cwadj8xf3oZ0yz4gg0p',
    'home-acoustic': 'https://buy.stripe.com/28E3cw3OV14N3oZbdd4gg0q',
    'house-party-acoustic': 'https://buy.stripe.com/3cI14oetzbJr7Ff0yz4gg0r',
    'house-party': 'https://buy.stripe.com/bJe28sdpv5l31gR0yz4gg0s',
    'pink-moon': 'https://buy.stripe.com/bJecN6adjcNv6Bb3KL4gg0o',
    'blue': 'https://buy.stripe.com/14AcN6clrdRz1gRbdd4gg0x',
    'american-dream': 'https://buy.stripe.com/4gM9AUbhneVD3oZbdd4gg0w',
    'always-on-my-mind-remix': 'https://buy.stripe.com/dRm9AUetz3cV0cNepp4gg0A',
    'cheerleader': 'https://buy.stripe.com/cNi5kEadj5l37Ff2GH4gg0y',
    'paris': 'https://buy.stripe.com/28E3cw3OV3cV0cN1CD4gg0z',
    'pokmon': 'https://buy.stripe.com/7sY4gA5X35l39Nn0yz4gg0v', // POKÉMON (diacritic-stripped slug)
    'pokemon': 'https://buy.stripe.com/7sY4gA5X35l39Nn0yz4gg0v', // Safety alias
    'feeling-this': 'https://buy.stripe.com/28EcN6fxD7tb3oZ2GH4gg0u',
  };
  
  // Return specific URL or log error and fallback
  const url = purchaseUrls[slug];
  if (!url) {
    console.error(`🎵 No purchase URL found for slug: "${slug}" (title: "${title}"). Available slugs:`, Object.keys(purchaseUrls));
    console.error(`🎵 Falling back to chxndler URL`);
    return purchaseUrls['chxndler'];
  }
  return url;
};

export default function CoverHologram({ src, title, slug, inline = false, size = 180, onCardOpen }: { src: string; title: string; slug?: string; inline?: boolean; size?: number; onCardOpen?: () => void }) {
  const [showCard, setShowCard] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasRealCard, setHasRealCard] = useState(false);
  // ELEMENT popover state
  const [showElementsPopover, setShowElementsPopover] = useState(false);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [elementsContent, setElementsContent] = useState('');
  const elementBtnRef = useRef<HTMLButtonElement | null>(null);
  const [elementsPopoverPos, setElementsPopoverPos] = useState<{ left: number; top: number; width?: number } | null>(null);
  const closeCoverRef = useRef(null);
  // Plays when opening the card from the cover art
  const openDingRef = useRef(null);
  // Plays when flipping the card front/back
  const flipCoverRef = useRef(null);
  // Plays a subtle sound when scrolling elements popover
  const scrollAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastScrollSoundRef = useRef<number>(0);

  // Compute a preferred card image path based on slugified title/slug.
  const computedCardSrc = (() => {
    // Prefer explicit slug when provided; else derive a diacritic-safe slug from title
    const safeFromTitle = title
      .toLowerCase()
      .normalize('NFD')
      // Remove combining diacritics (e.g., é -> e)
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'\"]/g, '')
      .replace(/[()]/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const s = (slug && slug.toLowerCase()) || safeFromTitle;
    return `/card/${s}.png`;
  })();

  useEffect(() => {
    setMounted(true);
    // Check if a real card exists by trying to load the computed card image
    const img = new window.Image();
    img.onload = () => setHasRealCard(true);
    img.onerror = () => {
      // Fallback: try the simple cover->card replacement as a backup
      const fallback = src.replace('/cover/', '/card/');
      if (fallback !== src) {
        const img2 = new window.Image();
        img2.onload = () => setHasRealCard(true);
        img2.onerror = () => {
          // Final fallback: try a diacritic-safe title-based path (e.g., POKÉMON -> /card/pokemon.png)
          const asciiFromTitle = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[’'\"]/g, '')
            .replace(/[()]/g, ' ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          const lastTry = `/card/${asciiFromTitle}.png`;
          const img3 = new window.Image();
          img3.onload = () => setHasRealCard(true);
          img3.onerror = () => setHasRealCard(false);
          img3.src = lastTry;
        };
        img2.src = fallback;
      } else {
        setHasRealCard(false);
      }
    };
    img.src = computedCardSrc;
  }, [src, slug, title]);
  
  const handleClick = () => {
    // Play card ding when opening the card (do not play flip)
    try { 
      const a = openDingRef.current; 
      if (a && a.readyState >= 2) { 
        a.currentTime = 0; 
        a.volume = 0.6; 
        a.play().catch(()=>{}); 
      } 
    } catch {}
    
    // Track cover art click immediately when the cover is clicked
    try {
      const norm = (slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      track('cover_art_clicked', {
        song_slug: norm,
        payload: { song_title: title, cover_src: src },
      });
    } catch {}

    setShowCard(true);
    // Preserve optional callback for external hooks (no tracking here anymore)
    try { if (onCardOpen) onCardOpen(); } catch {}
  };

  // Reset flip state when modal closes
  useEffect(() => {
    if (!showCard) {
      setCardFlipped(false);
      setShowElementsPopover(false);
    }
  }, [showCard]);

  // Listen for Escape key
  useEffect(() => {
    if (!showCard) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowCard(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCard]);

  // Close Elements popover on outside click / Escape
  useEffect(() => {
    if (!showElementsPopover) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const withinBtn = elementBtnRef.current && t && elementBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="Elements"]');
      const withinDialog = dialog && t && (dialog as HTMLElement).contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [showElementsPopover]);

  return (
    <motion.div
      className={`cover-hologram-container ${hovered ? 'hovered' : ''} ${inline ? 'relative' : 'absolute left-1/2 z-30 -translate-x-1/2'} rounded-2xl cursor-pointer border-2 border-[#19E3FF]/80 bg-cyan-400/10 backdrop-blur-xl shadow-[0_0_18px_rgba(25,227,255,0.35)]`}
      style={inline ? { 
        // Make the cover touch the sides of the blue box: no extra padding compensation
        width: size,
      } : { 
        top: "calc(50% + 90px)", 
        transform: "translateX(-50%)",
        width: "360px"
      }}
      initial={{ opacity: 0, y: 20, rotateX: -8 }}
      animate={{ opacity: inline ? 1 : cockpit.cover.hologramOpacity, y: 0, rotateX: inline ? 0 : -cockpit.cover.tilt }}
      // Let CSS control hover grow speed (snappy like dropdown)
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
      onClick={handleClick}
      onMouseEnter={() => { setHovered(true); try { sfx.play('hover', 0.35); } catch {} }}
      onMouseLeave={() => setHovered(false)}
      role="button"
      // Help analytics identify cover art context reliably
      data-song={title}
      data-slug={(slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${title} card`}
    >
      <div className="cover-hologram-inner p-0.5">
        <Image
          src={src}
          alt={`${title} cover`}
          width={size}
          height={size}
          className="cover-hologram-image rounded-2xl object-cover select-none w-full h-auto transition-all duration-150"
          // Mirror attributes onto the image for robust targeting
          data-song={title}
          data-slug={(slug && slug.toLowerCase()) || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
          priority
        />
      </div>
      {!inline && <div className="px-3 pb-3 text-center text-xs text-white/70">{title}</div>}
      
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
                  onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                  onClick={() => { 
                    // Flip the card and play flip sound regardless of card availability;
                    // the front image already falls back to cover if a card image is missing.
                    try { const a = flipCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.45; a.play().catch(()=>{}); } } catch {}
                    setCardFlipped((v) => !v); 
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
                        src={computedCardSrc}
                        alt={title}
                        className="tilt-img"
                        onError={(e)=>{
                          // If computed card doesn't exist, fall back to legacy mapping, then to cover
                          const fallback = src.replace('/cover/', '/card/');
                          if (fallback && fallback !== src) {
                            e.currentTarget.onerror = () => { e.currentTarget.src = src; };
                            e.currentTarget.src = fallback;
                          } else {
                            e.currentTarget.src = src;
                          }
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
            {hasRealCard && (
              <>
                {/* Elements button in top-left within the blue border area */}
                <div className="absolute top-1 left-2 z-10">
                  <button
                    ref={elementBtnRef}
                    type="button"
                    className="btn-element"
                    title="Elements"
                    aria-label="Elements"
                    onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                    onClick={async () => {
                      try { sfx.play('click', 0.6); } catch {}
                      if (showElementsPopover) { setShowElementsPopover(false); return; }
                      // Position popover under this button
                      try {
                        const r = elementBtnRef.current?.getBoundingClientRect();
                        if (r) setElementsPopoverPos({ left: Math.round(r.left + r.width/2), top: r.bottom + 8 });
                      } catch {}
                      // Load content if not already loaded
                      setElementsLoading(true);
                      setElementsError(null);
                      setElementsContent('');
                      try {
                        const res = await fetch('/api/elements');
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || `Failed to load ELEMENTS.md`);
                        setElementsContent(String(data?.content || ''));
                      } catch (e: any) {
                        setElementsError(e?.message || 'Failed to load ELEMENTS.md');
                      } finally {
                        setElementsLoading(false);
                        setShowElementsPopover(true);
                      }
                    }}
                  >
                    <Image
                      src="/elements/elementals.png?v=20241027"
                      alt=""
                      fill
                      sizes="34px"
                      className="btn-element-icon"
                      aria-hidden
                      style={{ objectFit: 'cover' }}
                    />
                    <span className="sr-only">Elements</span>
                  </button>
                </div>

                {/* Centered Collect Card button */}
                <div className="absolute top-[5px] left-1/2 transform -translate-x-1/2 z-10">
                  <div className="buttons-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="ocean-cta-wrap relative">
                      <a
                        href={getPurchaseUrl(title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ocean"
                        title="Collect this card"
                        aria-label={`Collect Card: ${title}`}
                        data-song={title}
                        data-slug={title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                        onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                        onClick={(e) => {
                          try { e.preventDefault(); } catch {}
                          try { sfx.play('click', 0.7); } catch {}
                          try {
                            track('collect_card_clicked', { 
                              song_slug: title?.toLowerCase().replace(/\s+/g, '-'),
                              card_src: src,
                              payload: { song_title: title, card_image: src, stripe_url: e.currentTarget.href } 
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
                </div>
              </>
            )}
            <button
              type="button"
              aria-label="Close"
              onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
              onClick={() => {
                try { const a = closeCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); } } catch {}
                setShowCard(false);
              }}
              onMouseOver={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(25,227,255,1)'; } catch {} }}
              onMouseOut={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(25,227,255,0.8)'; } catch {} }}
              className="absolute -top-3 -right-3 rounded-full bg-[#19E3FF] text-black font-bold w-8 h-8 shadow-[0_0_20px_rgba(25,227,255,0.8)] transition-transform"
              title="Close"
            >×</button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Elements Popover (portal-rendered) */}
      {typeof document !== 'undefined' && showElementsPopover && elementsPopoverPos ? createPortal(
        <div
          role="dialog"
          aria-label="Elements"
          className="elements-popover holo-scrollbar-yellow"
          style={{
            position: 'fixed',
            left: '50%',
            top: (elementsPopoverPos.top - 16),
            transform: 'translateX(-50%)',
            padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(3,10,20,0.86)',
            border: '1px solid rgba(25,227,255,0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 22px rgba(25,227,255,0.55)',
            backdropFilter: 'blur(8px)',
            color: '#F2EF1D',
            zIndex: 2147483647,
            width: 'min(92vw, 560px)',
            maxWidth: 'min(92vw, 560px)',
            maxHeight: '72vh',
            overflowY: 'auto'
          } as any}
          onClick={(e) => e.stopPropagation()}
          onScroll={() => {
            try {
              const now = Date.now();
              if (now - lastScrollSoundRef.current > 260) {
                const a = scrollAudioRef.current as any;
                if (a) {
                  a.currentTime = 0;
                  a.volume = 0.25;
                  a.play().catch(() => {});
                }
                lastScrollSoundRef.current = now;
              }
            } catch {}
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); } }}
        >
          {/* Close (X) button at top-right */}
          <button
            aria-label="Close"
            title="Close"
            onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
            onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowElementsPopover(false); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '1px solid rgba(25,227,255,0.6)',
              background: 'rgba(0,0,0,0.5)',
              color: '#19E3FF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(25,227,255,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseOver={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(25,227,255,0.75)'; } catch {} }}
            onMouseOut={(e)=>{ try { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(25,227,255,0.35)'; } catch {} }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
            </svg>
          </button>

          {/* Header image at the top of the Elements popout */}
          <div style={{ marginBottom: 12 }}>
            <img
              src="/elements/elementals.png?v=20241027"
              alt="Elementals"
              style={{
                display: 'block',
                width: '36%',
                maxWidth: 200,
                margin: '0 auto',
                height: 'auto',
                borderRadius: 0,
                boxShadow: 'none',
                background: 'transparent'
              }}
            />
          </div>

          {elementsLoading ? (
            <div style={{ fontSize: 16 }}>Loading…</div>
          ) : elementsError ? (
            <div style={{ fontSize: 16, color: '#ff7b7b' }}>{elementsError}</div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 16, textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>
              {elementsContent || 'No elements content available.'}
            </div>
          )}
        </div>,
        document.body
      ) : null}

      <style jsx>{`
        /* Cover Hologram Hover Effects */
        .cover-hologram-container {
          /* Grow the whole container (image + border) on hover */
          transition: scale .15s ease, box-shadow .2s ease !important;
          will-change: transform;
          transform-origin: 50% 50%;
          box-shadow: none;
          scale: 1;
        }
        /* Scale the entire container for a cohesive grow */
        .cover-hologram-container:hover,
        .cover-hologram-container.hovered {
          scale: 1.08;
        }
        .cover-hologram-container:hover,
        .cover-hologram-container.hovered {
          box-shadow:
            0 0 52px rgba(25,227,255,.9),
            0 0 90px rgba(25,227,255,.7),
            0 0 140px rgba(25,227,255,0.5),
            0 0 200px rgba(25,227,255,0.3) !important;
        }
        
        .cover-hologram-image {
          filter: brightness(1.1) contrast(1.05) saturate(1.1);
          transition: filter .15s ease;
        }
        .cover-hologram-container:hover .cover-hologram-image,
        .cover-hologram-container.hovered .cover-hologram-image {
          filter: brightness(1.6) contrast(1.4) saturate(1.8) 
            drop-shadow(0 0 20px rgba(25,227,255,1)) 
            drop-shadow(0 0 40px rgba(25,227,255,0.8)) 
            drop-shadow(0 0 80px rgba(25,227,255,0.6))
            drop-shadow(0 0 120px rgba(25,227,255,0.4));
        }
        
        .cover-glow-frame {
          box-shadow: inset 0 0 40px rgba(255,255,255,0.08);
          border-color: rgba(25, 227, 255, 0.6);
        }
        .cover-hologram-container:hover .cover-glow-frame,
        .cover-hologram-container.hovered .cover-glow-frame {
          border-color: rgba(25, 227, 255, 1);
          box-shadow:
            inset 0 0 80px rgba(255,255,255,0.2),
            0 0 52px rgba(25,227,255,.9),
            0 0 90px rgba(25,227,255,.7),
            0 0 140px rgba(25,227,255,0.5),
            0 0 200px rgba(25,227,255,0.3);
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
        /* Hover grow + glow on the card, similar to COLLECT CARD button */
        .card-flip-container{ transition: transform .12s ease, box-shadow .18s ease, filter .18s ease; will-change: transform; }
        .card-flip-container:hover{ transform: translateZ(0) scale(1.05); }
        .card-frame:hover{
          box-shadow:
            0 0 52px rgba(25,227,255,.9),
            0 0 90px rgba(25,227,255,.7),
            0 0 140px rgba(25,227,255,0.5),
            0 0 200px rgba(25,227,255,0.3),
            inset 0 0 0 1px rgba(255,255,255,.12);
          outline-color: rgba(25,227,255,.75);
        }
        .card-frame:hover .tilt-img{
          filter: saturate(1.1) brightness(1.08) contrast(1.08)
            drop-shadow(0 0 26px rgba(25,227,255,1))
            drop-shadow(0 0 52px rgba(25,227,255,.8))
            drop-shadow(0 0 96px rgba(25,227,255,.6));
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
        .buttons-row{ position: relative; justify-content: center; }
        .btn-ocean{
          position:relative; display:inline-grid; place-items:center;
          padding: 5px 12px; border-radius: 10px; font-weight:800; letter-spacing:.06em; font-size: 12px; line-height: 1.1;
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
        /* Elements popover: no entrance animation, stronger scrollbar */
        .elements-popover { animation: none !important; transition: none !important; }
        .elements-popover::-webkit-scrollbar { width: 18px; }
        .elements-popover::-webkit-scrollbar-thumb {
          box-shadow:
            0 0 18px rgba(242,239,29,0.8),
            0 0 36px rgba(242,239,29,0.5),
            inset 0 0 10px rgba(255,255,255,0.22);
        }
        /* ELEMENT button icon styles */
        .btn-element{
          position: relative; display:inline-grid; place-items:center;
          width: 34px; height: 34px; border-radius: 50%; font-weight:800; letter-spacing:.06em; font-size: 15px; line-height: 1.1;
          color:#001014; text-transform:none; font-family: InterLocal, system-ui, sans-serif;
          background: transparent; /* fill entirely with elementals.png */
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 0 20px rgba(25,227,255,.55); /* remove inner insets so image fully reads */
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease;
          overflow: visible; /* allow icon/glow to sit on top of the button without clipping */
          z-index: 12;
        }
        .btn-element-icon{ 
          position: absolute; 
          inset: 0; 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          display: block; 
          pointer-events: none; 
          transform: scale(1.08); /* slightly overfill so art sits on top of circular border */
        }
        .btn-element:hover{
          transform: scale(1.05);
          box-shadow:
            0 0 36px rgba(25,227,255,.95),
            0 0 80px rgba(25,227,255,.55),
            inset 0 2px 0 rgba(255,255,255,.7),
            inset 0 -10px 18px rgba(0,0,0,.28);
          filter: saturate(1.08) brightness(1.07);
          animation: elementGlow 1.8s ease-in-out infinite;
        }
        .btn-element:active{ transform: scale(.98); }
        @keyframes elementGlow {
          0%, 100% {
            box-shadow: 0 0 36px rgba(25,227,255,.95), 0 0 80px rgba(25,227,255,.55), inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 18px rgba(0,0,0,.28);
          }
          50% {
            box-shadow: 0 0 52px rgba(25,227,255,1), 0 0 110px rgba(25,227,255,.7), inset 0 2px 0 rgba(255,255,255,.75), inset 0 -12px 20px rgba(0,0,0,.3);
          }
        }
      `}</style>

      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
      <audio ref={openDingRef} src="/audio/card-ding.mp3" preload="auto" />
      <audio ref={flipCoverRef} src="/audio/flip.mp3" preload="auto" />
      <audio ref={scrollAudioRef} src="/audio/scroll.mp3" preload="auto" />
    </motion.div>
  );
}
