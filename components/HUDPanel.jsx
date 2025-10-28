/* @refresh skip */
"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
// 2D fallback hologram
// 2D HUD removed per request; 3D only
// 3D planet system (requires three/r3f/drei installed)
// IMPORTANT: Do NOT import at module scope — older @react-three/fiber versions
// are incompatible with React 19 and can crash on evaluation. We lazy-load it
// only after probing availability, and fall back gracefully.
import { playerStore } from "@/store/usePlayerStore";
import { track as trackAnalytics, storeClickData, generateClickId } from "@/lib/analytics";

// We import the 3D system directly and only render on client via this client component

class ErrorBoundary extends React.Component { 
  constructor(props){ super(props); this.state = { hasError:false }; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(err, info){ try { this.props.onError && this.props.onError(err); } catch {} }
  render(){ return this.state.hasError ? this.props.fallback : this.props.children; }
}
// Song list removed in favor of dropdown-only selector
import CoverCard from "@/components/CoverCard";
import CoverHologram from "@/components/CoverHologram";
import { buildPlanetSongs } from "@/lib/planets";
import SongDropdown from "@/components/SongDropdown";
import DevErrorLogger from "@/components/DevErrorLogger";
// Lazy-load 3D systems on client only to avoid early evaluation issues
// Prefer R3F-based system when compatible; otherwise fall back to raw Three.js
const PlanetSystem = dynamic(() => import("@/components/holo/PlanetSystem"), { ssr: false });
const PlanetSystemRaw = dynamic(() => import("@/components/holo/PlanetSystemRaw"), { ssr: false });
import { DEBUG_MEDIA, dlog, dwarn } from "@/lib/debug";
import { ElementIcon as OptimizedElementIcon } from "@/lib/elementIcons";
import { sfx } from "@/lib/sfx";

// Use system font stack to avoid network font fetches during build

// Constants to prevent recreating URLs on every render
const DEFAULT_COVER = '/cover/chxndler.png';
const DEFAULT_CARD = '/card/chxndler.png';
const FALLBACK_COVER = '/cover/chxndler.png';

function ElementIcon({ name, size = 18, glow = true }) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  
  // Map names to icon keys
  let iconKey = null;
  if (n.includes("chxndler")) iconKey = "chxndler";
  else if (n.includes("heart")) iconKey = "heart";
  else if (n.includes("lightning") || n.includes("electric")) iconKey = "lightning";
  else if (n.includes("dark")) iconKey = "darkness";
  else if (n.includes("water") || n.includes("air")) iconKey = "water";
  else if (n.includes("earth") || n.includes("fire")) iconKey = "heart"; // fallbacks
  else iconKey = "heart"; // default fallback

  // Element colors (match system hues)
  const colorFor = (key) => {
    if (!key) return "#38B6FF";
    const k = String(key).toLowerCase();
    if (k.includes("chxndler")) return "#19E3FF"; // brand cyan
    if (k.includes("water")) return "#38B6FF";      // cyan
    if (k.includes("heart")) return "#FC54AF";      // bright pink
    if (k.includes("lightning") || k.includes("electric")) return "#FFC700"; // deeper yellow
    if (k.includes("earth")) return "#F2EF1D";     // reuse neon yellow
    if (k.includes("air")) return "#8BF9FF";       // light cyan
    if (k.includes("dark")) return "#000000";      // deep black
    return "#38B6FF";
  };
  const clr = colorFor(n);
  // Outer halo uses same color except for darkness which would be invisible — use cyan halo to sell hologram
  const outer = (n.includes("dark")) ? "#19E3FF" : clr;
  const glowFilter = glow ? `saturate(1.2) brightness(1.08) drop-shadow(0 0 6px ${outer}) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 34px ${outer})` : 'none';
  
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent:'center', pointerEvents:'none' }}>
      <OptimizedElementIcon 
        name={iconKey} 
        alt="Element" 
        width={size} 
        height={size}
        style={{
          objectFit: 'contain',
          display:'block',
          background: 'transparent',
          filter: glowFilter,
        }}
      />
    </span>
  );
}

export default function HUDPanel({
  title = "OCEAN GIRL",
  subtitle = "Love flows back like tide.",
  songs,
  onSongChange,
  inConsole = false,
  track,
  currentId,
  holoPop = false,
  playing = false,
  showAllPlanets = false,
  hidePlanetsUntilPlaying = false,
  beamOnly = false,
  beamEnabled = undefined, // optional external control for beam fade (true/false)
  joinAlienOpen = false, // disable cover art interaction when pink display is open
}) {
  console.log('🌍 HUDPanel: Component rendering with props:', { 
    currentId, 
    showAll: !currentId, 
    songsLength: songs?.length, 
    trackTitle: track?.title 
  });
  
  const hoverCoverRef = useRef(null);
  const clickCoverRef = useRef(null);
  const closeCoverRef = useRef(null);
  const [active, setActive] = useState((songs && songs[0]?.id) || undefined);
  const containerRef = useRef(null);
  const baseW = 320; // design width for console-fit (reduced from 380)
  const baseH = 340; // design height for console-fit
  const [scale, setScale] = useState(1);
  const [hoverId, setHoverId] = useState(null);
  const [can3D, setCan3D] = useState(false);
  const [preferRaw3D, setPreferRaw3D] = useState(false);
  // Remove problematic component state that causes React CurrentOwner issues
  const [threeFailed, setThreeFailed] = useState(null);
  const [mounted, setMounted] = useState(false);
  // Beam fade: allow external control; default to fade-in on mount
  const [beamOpacity, setBeamOpacity] = useState(0);
  // Refs for dynamic planet placement above player
  const innerRef = useRef(null);
  const planetRef = useRef(null);
  const playerRef = useRef(null);
  const [planetBottom, setPlanetBottom] = useState(56);
  // Vertical offset to raise/lower the Store (Gem) popover relative to its anchor
  // Move it slightly lower (less negative) per request
  const STORE_POPOVER_Y_OFFSET = -172; // was -188
  // Dynamic spacing for song selector so it doesn't overlap the cover
  const coverRef = useRef(null);
  const [oneLinerRight, setOneLinerRight] = useState(inConsole ? 108 : 140);
  // Audio progress tracking
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const lastNonZeroVolumeRef = useRef(1.0);
  const hudVolumeSfxLastRef = useRef(0);
  const VOLUME_STORAGE_KEY = 'mediaPlayer:volume';
  // Lyrics popover state
  const [showLyricsPopover, setShowLyricsPopover] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState(null);
  const [lyricsContent, setLyricsContent] = useState('');
  const lyricsBtnRef = useRef(null);
  const [lyricsPopoverPos, setLyricsPopoverPos] = useState(null);
  const lyricsScrollRef = useRef(null);
  const lyricsLastScrollAtRef = useRef(0);
  // Position lyrics popover relative to its anchor; smaller negative means less high
  const LYRICS_POPOVER_Y_OFFSET = -40; // bring it further down compared to before

  // Brand (CHXNDLER) popover state
  const [showBrandPopover, setShowBrandPopover] = useState(false);
  const brandBtnRef = useRef(null);
  const [brandPopoverPos, setBrandPopoverPos] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState(null);
  const [brandContent, setBrandContent] = useState('');
  const brandScrollRef = useRef(null);
  const brandLastScrollAtRef = useRef(0);
  // Lift the CHXNDLER popover higher above its anchor
  const BRAND_POPOVER_Y_OFFSET = 200; // pixels to shift upward when positioning

  // YouTube popout state (waveform HUD)
  const [showYouTubePopover, setShowYouTubePopover] = useState(false);
  const [showSpotifyPopover, setShowSpotifyPopover] = useState(false);
  const [spEmbedUrl, setSpEmbedUrl] = useState(null);
  const [ytEmbedUrl, setYtEmbedUrl] = useState('');
  const [showApplePopover, setShowApplePopover] = useState(false);
  const [amEmbedUrl, setAmEmbedUrl] = useState(null);

  // Storefront (Gem) popover state
  const [showStorePopover, setShowStorePopover] = useState(false);
  const storeBtnRef = useRef(null);
  const [storePopoverPos, setStorePopoverPos] = useState(null);
  const [storeIndex, setStoreIndex] = useState(0);
  const storeScrollRef = useRef(null);
  const storeLastScrollAtRef = useRef(0);
  // Store-specific UI state: flip animations
  const [beanieFlipped, setBeanieFlipped] = useState(false);
  const [patchFlipped, setPatchFlipped] = useState(false);
  const [beanieHovered, setBeanieHovered] = useState(false);
  const [patchHovered, setPatchHovered] = useState(false);
  const products = [
    {
      id: 'pin',
      title: 'PIN',
      image: '/store/pin.png',
      url: 'https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B',
      price: '$5.00 USD',
      description: 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.'
    },
    {
      id: 'patch',
      title: 'PATCH',
      image: '/store/patch.png',
      url: 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C',
      price: '$5.00 USD',
      description: 'Stitch this into your world as a quiet reminder that this isn’t just music, it’s a community.'
    },
    {
      id: 'necklace',
      title: 'NECKLACE',
      image: '/store/necklace.png',
      url: 'https://buy.stripe.com/6oU3cw3OVfZH3oZ9554gg0D',
      price: '$15.00 USD',
      description: 'A symbol of love, connection, and everything this world stands for. It’s a keepsake for the people who found home here.'
    },
    {
      id: 'beanie',
      title: 'BEANIE',
      image: '/store/beanie-front.png',
      url: 'https://buy.stripe.com/3cI3cw3OV8xf0cN2GH4gg0E',
      price: '$30.00 USD',
      description: 'For the ones who wear their hearts out loud and aren’t afraid to stand out.'
    },
    {
      id: 'sticker',
      title: 'STICKER',
      image: '/store/sticker.png',
      url: 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F',
      price: '$5.00 USD',
      description: 'A simple reminder that you’re part of something bigger. Remember you’re not alone in this story.'
    },
    {
      id: 'hat',
      title: 'HAT',
      image: '/store/hat.png',
      url: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
      price: '$25.00 USD',
      description: 'A classic you’ll wear everywhere. It’s lowkey, but it says everything it needs to.'
    },
    {
      id: 'button',
      title: 'BUTTON',
      image: '/store/button.png',
      url: 'https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J',
      price: '$5.00 USD',
      description: 'A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.'
    },
    {
      id: 'keychain',
      title: 'KEYCHAIN',
      image: '/store/keychain.png',
      url: 'https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H',
      price: '$5.00 USD',
      description: 'A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you’re connected, always.'
    },
    {
      id: 'house-party-poster',
      title: 'HOUSE PARTY POSTER',
      image: '/store/house-party-poster.png',
      url: 'https://buy.stripe.com/dRmfZi0CJ4gZ3oZ2GH4gg0G',
      price: '$20.00 USD',
      description: 'This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.'
    }
  ];

  async function openLyricsPopover(slug){
    try { sfx.play('click', 0.4); } catch {}
    // Anchor position
    try {
      const r = lyricsBtnRef.current?.getBoundingClientRect?.();
      const wrapper = innerRef.current?.parentElement || null; // outer HUD blue display wrapper (padding box)
      // Position the popover to match the blue display's vertical bounds
      if (wrapper && typeof window !== 'undefined') {
        const rect = wrapper.getBoundingClientRect();
        const cs = window.getComputedStyle(wrapper);
        const pl = parseFloat(cs.paddingLeft || '0') || 0;
        const pr = parseFloat(cs.paddingRight || '0') || 0;
        let leftEdge = rect.left + pl;
        let rightEdge = rect.right - pr;
        // Very slightly wider than the blue display on both sides
        const HORIZONTAL_EXPAND = 12; // px to grow on each side
        leftEdge = Math.max(8, leftEdge - HORIZONTAL_EXPAND);
        rightEdge = Math.min((typeof window !== 'undefined' ? window.innerWidth : rightEdge), rightEdge + HORIZONTAL_EXPAND) - 8 + 8;
        const width = Math.max(0, rightEdge - leftEdge);
        // Bring the top down more while keeping the bottom aligned to blue display bottom; this also shortens the popover
        const TOP_INSET = 136; // slightly lower + shorter
        let top = rect.top + TOP_INSET;
        top = Math.max(8, top);
        const height = Math.max(100, rect.height - TOP_INSET);
        setLyricsPopoverPos({ left: leftEdge, top, width, height });
      } else if (r) {
        let top = r.bottom + 8 + LYRICS_POPOVER_Y_OFFSET;
        top = Math.max(8, top);
        // Slightly shorter default for fallback path as well
        let height = Math.max(240, Math.min(560, (typeof window !== 'undefined' ? window.innerHeight * 0.46 : 340)));
        setLyricsPopoverPos({ left: r.left + r.width/2, top, height });
      }
    } catch {}
    setShowLyricsPopover(true);
    setLyricsLoading(true);
    setLyricsError(null);
    setLyricsContent('');
    try{
      const res = await fetch(`/api/lyrics/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data?.error || `Lyrics not found (${res.status})`);
      }
      const data = await res.json();
      setLyricsContent(String(data?.content || 'No lyrics available.'));
    } catch(e){
      setLyricsError((e && (e.message||e.name)) || 'Failed to load lyrics');
    } finally {
      setLyricsLoading(false);
    }
  }

  // Recalculate popover alignment to blue display on resize while open
  useEffect(() => {
    if (!showLyricsPopover) return;
    const recalc = () => {
      try {
        const r = lyricsBtnRef.current?.getBoundingClientRect?.();
        const wrapper = innerRef.current?.parentElement || null;
        // Keep the same vertical alignment to the blue display as initial calculation
        if (wrapper && typeof window !== 'undefined') {
          const rect = wrapper.getBoundingClientRect();
          const cs = window.getComputedStyle(wrapper);
          const pl = parseFloat(cs.paddingLeft || '0') || 0;
          const pr = parseFloat(cs.paddingRight || '0') || 0;
          let leftEdge = rect.left + pl;
          let rightEdge = rect.right - pr;
          const HORIZONTAL_EXPAND = 12;
          leftEdge = Math.max(8, leftEdge - HORIZONTAL_EXPAND);
          rightEdge = Math.min((typeof window !== 'undefined' ? window.innerWidth : rightEdge), rightEdge + HORIZONTAL_EXPAND) - 8 + 8;
          const width = Math.max(0, rightEdge - leftEdge);
          const TOP_INSET = 136; // keep resize calc consistent
          let top = rect.top + TOP_INSET;
          top = Math.max(8, top);
          const height = Math.max(100, rect.height - TOP_INSET);
          setLyricsPopoverPos({ left: leftEdge, top, width, height });
        }
      } catch {}
    };
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [showLyricsPopover]);

  // Open brand popover anchored to the brand button
  const openBrandPopover = async () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = brandBtnRef.current?.getBoundingClientRect?.();
      const wrapper = innerRef.current?.parentElement || null; // outer HUD blue display wrapper (padding box)
      if (wrapper && typeof window !== 'undefined') {
        const rect = wrapper.getBoundingClientRect();
        const cs = window.getComputedStyle(wrapper);
        const pl = parseFloat(cs.paddingLeft || '0') || 0;
        const pr = parseFloat(cs.paddingRight || '0') || 0;
        const leftEdge = rect.left + pl;
        const rightEdge = rect.right - pr;
        const width = Math.max(0, rightEdge - leftEdge);
        const idealTop = r ? (r.bottom - BRAND_POPOVER_Y_OFFSET) : (rect.top + 8);
        const top = Math.max(16, idealTop);
        setBrandPopoverPos({ left: leftEdge, top, width });
      } else if (r) {
        const idealTop = r.bottom - BRAND_POPOVER_Y_OFFSET;
        const top = Math.max(16, idealTop);
        setBrandPopoverPos({ left: r.left + r.width/2, top });
      }
    } catch {}
    setShowBrandPopover(true);
    setBrandLoading(true);
    setBrandError(null);
    setBrandContent('');
    try {
      const res = await fetch(`/api/lyrics/${encodeURIComponent('chxndler')}`);
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data?.error || `Content not found (${res.status})`);
      }
      const data = await res.json();
      setBrandContent(String(data?.content || ''));
    } catch(e){
      setBrandError((e && (e.message||e.name)) || 'Failed to load content');
    } finally {
      setBrandLoading(false);
    }
  };

  // Close Brand popover on outside click / Escape
  useEffect(() => {
    if (!showBrandPopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = brandBtnRef.current && t && brandBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="CHXNDLER"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowBrandPopover(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowBrandPopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showBrandPopover]);

  // Close YouTube popover on Escape
  useEffect(() => {
    if (!showYouTubePopover) return;
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowYouTubePopover(false); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [showYouTubePopover]);

  useEffect(() => {
    if (!showSpotifyPopover) return;
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowSpotifyPopover(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSpotifyPopover]);

  useEffect(() => {
    if (!showApplePopover) return;
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowApplePopover(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showApplePopover]);

  // Open Store (Gem) popover anchored to the gem button
  const openStorePopover = async () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = storeBtnRef.current?.getBoundingClientRect?.();
      const wrapper = innerRef.current?.parentElement || null; // outer HUD blue display wrapper (padding box)
      if (wrapper && typeof window !== 'undefined') {
        const rect = wrapper.getBoundingClientRect();
        const cs = window.getComputedStyle(wrapper);
        const pl = parseFloat(cs.paddingLeft || '0') || 0;
        const pr = parseFloat(cs.paddingRight || '0') || 0;
        const leftEdge = rect.left + pl;
        const rightEdge = rect.right - pr;
        const width = Math.max(0, rightEdge - leftEdge);
        // Raise the store container so it sits higher relative to the HUD
        let top = r ? (r.bottom + STORE_POPOVER_Y_OFFSET) : (rect.top + STORE_POPOVER_Y_OFFSET);
        top = Math.max(8, top);
        setStorePopoverPos({ left: leftEdge, top, width });
      } else if (r) {
        // Centered fallback position; also raise
        let top = r.bottom + STORE_POPOVER_Y_OFFSET;
        top = Math.max(8, top);
        setStorePopoverPos({ left: r.left + r.width/2, top });
      }
    } catch {}
    // Ensure NECKLACE is the first item shown when opening the store
    try {
      const idx = products.findIndex(p => String(p.id) === 'necklace');
      setStoreIndex(idx >= 0 ? idx : 0);
    } catch {}
    setShowStorePopover(true);
  };

  // Close Store popover on outside click / Escape
  useEffect(() => {
    if (!showStorePopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = storeBtnRef.current && t && storeBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="Storefront"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showStorePopover]);

  // Reset store item flips/hover when cycling items so they always start on the front
  useEffect(() => {
    try { setBeanieFlipped(false); } catch {}
    try { setPatchFlipped(false); } catch {}
    try { setBeanieHovered(false); } catch {}
    try { setPatchHovered(false); } catch {}
  }, [storeIndex]);

  // Recalculate store popover alignment to blue display on resize while open
  useEffect(() => {
    if (!showStorePopover) return;
    const recalc = () => {
      try {
        const r = storeBtnRef.current?.getBoundingClientRect?.();
        const wrapper = innerRef.current?.parentElement || null;
        if (wrapper && typeof window !== 'undefined') {
          const rect = wrapper.getBoundingClientRect();
          const cs = window.getComputedStyle(wrapper);
          const pl = parseFloat(cs.paddingLeft || '0') || 0;
          const pr = parseFloat(cs.paddingRight || '0') || 0;
          const leftEdge = rect.left + pl;
          const rightEdge = rect.right - pr;
          const width = Math.max(0, rightEdge - leftEdge);
          // Keep raised position on resize as well
          let top = r ? (r.bottom + STORE_POPOVER_Y_OFFSET) : (rect.top + STORE_POPOVER_Y_OFFSET);
          top = Math.max(8, top);
          setStorePopoverPos({ left: leftEdge, top, width });
        }
      } catch {}
    };
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [showStorePopover]);

  // Recalculate brand popover alignment to blue display on resize while open
  useEffect(() => {
    if (!showBrandPopover) return;
    const recalc = () => {
      try {
        const r = brandBtnRef.current?.getBoundingClientRect?.();
        const wrapper = innerRef.current?.parentElement || null;
        if (wrapper && typeof window !== 'undefined') {
          const rect = wrapper.getBoundingClientRect();
          const cs = window.getComputedStyle(wrapper);
          const pl = parseFloat(cs.paddingLeft || '0') || 0;
          const pr = parseFloat(cs.paddingRight || '0') || 0;
          const leftEdge = rect.left + pl;
          const rightEdge = rect.right - pr;
          const width = Math.max(0, rightEdge - leftEdge);
          const idealTop = r ? (r.bottom - BRAND_POPOVER_Y_OFFSET) : (rect.top + 8);
          const top = Math.max(16, idealTop);
          setBrandPopoverPos({ left: leftEdge, top, width });
        }
      } catch {}
    };
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('resize', recalc);
    };
  }, [showBrandPopover]);

  // Play subtle scroll SFX while scrolling brand popover (rate-limited)
  useEffect(() => {
    if (!showBrandPopover) return;
    const el = brandScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const last = brandLastScrollAtRef.current || 0;
      if (now - last > 260) {
        brandLastScrollAtRef.current = now;
        try { sfx.play('scroll', 0.28); } catch {}
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { try { el.removeEventListener('scroll', onScroll); } catch {} };
  }, [showBrandPopover]);
  const [animationTime, setAnimationTime] = useState(0);
  // Volume popover (HUD waveform controls)
  const [showHudVolumePopover, setShowHudVolumePopover] = useState(false);
  const hudVolRef = useRef(null);
  const hudVolBtnRef = useRef(null);
  const [hudPopoverPos, setHudPopoverPos] = useState(null);
  // Direct ref to the currently tracked audio element for live reads during render
  const liveAudioRef = useRef(null);
  useEffect(() => {
    if (typeof beamEnabled === 'boolean') {
      const t = setTimeout(() => setBeamOpacity(beamEnabled ? 1 : 0), 10);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setBeamOpacity(1), 10);
      return () => clearTimeout(t);
    }
  }, [beamEnabled]);
  // Content fade (instead of hard hide when beamOnly)
  // Always show song selection dropdown even when beamOnly is true
  const [contentOpacity, setContentOpacity] = useState(beamOnly ? 0 : 1);
  useEffect(() => { setContentOpacity(beamOnly ? 0 : 1); }, [beamOnly]);
  

  // Runtime probe: ensure WebGL exists and that React internals needed by R3F are present
  useEffect(() => {
    let mounted = true;
    // Add more defensive error handling for React Three Fiber compatibility
    try {
      const c = document.createElement('canvas');
      const gl = c && (c.getContext('webgl') || c.getContext('experimental-webgl'));
      if (!gl) {
        setCan3D(false);
        setThreeFailed('WebGL unavailable');
        return () => { mounted = false; };
      }
      // Probe for React internals used by dev JSX runtime that some R3F versions rely on
      const hasReactInternals = !!(React && (React).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED);
      if (!hasReactInternals) {
        // Fall back to raw Three.js renderer to avoid ReactCurrentOwner crashes
        setPreferRaw3D(true);
      }
      // Enable 3D with additional safety
      setTimeout(() => {
        if (mounted) {
          setCan3D(true);
          setThreeFailed(null);
        }
      }, 100);
    } catch (err) {
      setCan3D(false);
      setThreeFailed(`WebGL/React error: ${err.message}`);
    }
    return () => { mounted = false; };
  }, []);

  // Close Lyrics popover on outside click / Escape
  useEffect(() => {
    if (!showLyricsPopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = lyricsBtnRef.current && t && lyricsBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="Lyrics"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showLyricsPopover]);

  // Play subtle scroll SFX while scrolling lyrics (rate-limited)
  useEffect(() => {
    if (!showLyricsPopover) return;
    const el = lyricsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const last = lyricsLastScrollAtRef.current || 0;
      if (now - last > 260) {
        lyricsLastScrollAtRef.current = now;
        try { sfx.play('scroll', 0.28); } catch {}
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { try { el.removeEventListener('scroll', onScroll); } catch {} };
  }, [showLyricsPopover]);

  useEffect(() => {
    const updatePos = () => {
      if (showHudVolumePopover && hudVolBtnRef.current) {
        const r = hudVolBtnRef.current.getBoundingClientRect();
        setHudPopoverPos({ left: r.left + r.width/2, top: r.bottom + 8 });
      }
    };
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [showHudVolumePopover]);
  // Bridge to 3D store available if installed

  // Mark mounted for any client-only adjustments; panel is imported with ssr:false
  useEffect(() => { setMounted(true); }, []);


  // Measure cover width and reserve that space for the song selector
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;

    const computeRight = () => {
      try {
        const rect = el.getBoundingClientRect();
        const width = rect?.width || el.offsetWidth || 0;
        // Account for the negative right offset so we only reserve the area overlapping the panel
        const overflow = Math.abs(inConsole ? -8 : -16);
        const gap = 12; // small gap so text never touches the cover
        const right = Math.max(0, Math.round((width - overflow) + gap));
        setOneLinerRight(right || (inConsole ? 108 : 140));
      } catch {
        // Fallback to previous/static value on any measurement issue
        setOneLinerRight((r) => r || (inConsole ? 108 : 140));
      }
    };

    // Initial compute and observe changes
    computeRight();
    let ro;
    try {
      ro = new ResizeObserver(() => computeRight());
      ro.observe(el);
    } catch {}
    window.addEventListener('resize', computeRight);
    return () => {
      try { ro && ro.disconnect(); } catch {}
      window.removeEventListener('resize', computeRight);
    };
  }, [inConsole]);

  // Audio progress tracking - track ambient audio on homepage, main player when song selected
  useEffect(() => {
    const findAndConnectAudio = () => {
      // On homepage (no currentId), track ambient audio for space-music.mp3
      // When a song is selected (currentId exists), track main player
      const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
      const a = document.querySelector(audioSelector);
      
      if (DEBUG_MEDIA) dlog('HUDPanel: finding audio element', { selector: audioSelector, element: a, currentId });
      if (!a) {
        // Try again in a moment if audio element not found
        setTimeout(findAndConnectAudio, 100);
        return;
      }
      if (DEBUG_MEDIA) dlog('HUDPanel: found audio element, connecting listeners');

      // Store ref for live cursor position calculations
      liveAudioRef.current = a;
      
      // Load saved volume and apply to audio element
      try {
        const saved = (typeof window !== 'undefined') ? localStorage.getItem(VOLUME_STORAGE_KEY) : null;
        if (saved != null) {
          const v = parseFloat(saved);
          if (!isNaN(v) && v >= 0 && v <= 1) {
            a.volume = v;
            setVolume(v);
            if (v > 0) lastNonZeroVolumeRef.current = v;
          }
        }
      } catch {}
      
      const onTimeUpdate = () => { 
        if (DEBUG_MEDIA) dlog('HUDPanel: timeupdate', a.currentTime);
        setProgress(a.currentTime); 
      };
      const onDurationChange = () => { 
        if (DEBUG_MEDIA) dlog('HUDPanel: durationchange', a.duration);
        setDuration(a.duration || 0); 
      };
      const onVolumeChange = () => { 
        const v = Math.max(0, Math.min(1, a.volume));
        setVolume(v); 
        if (v > 0) lastNonZeroVolumeRef.current = v;
      };
      // Update progress immediately on seek events (works even when paused)
      const onSeek = () => { 
        try { setProgress(isFinite(a.currentTime) ? a.currentTime : 0); } catch {}
      };
      
      // Track play/pause state for button display
      const onPlay = () => {
        if (DEBUG_MEDIA) dlog('HUDPanel: audio playing');
        // Update playing state to reflect the actual audio state
        if (!currentId) {
          // For ambient audio, we need to update the parent playing state
          // This will make the button show "pause" when space-music.mp3 is playing
          // Note: This is handled by the parent component's playing prop
        }
      };
      const onPause = () => {
        if (DEBUG_MEDIA) dlog('HUDPanel: audio paused');
        // Update playing state to reflect the actual audio state
        if (!currentId) {
          // For ambient audio, we need to update the parent playing state
          // This will make the button show "play" when space-music.mp3 is paused
          // Note: This is handled by the parent component's playing prop
        }
      };
      
      // Set initial values
      if (a.duration) setDuration(a.duration);
      if (!isNaN(a.currentTime)) setProgress(a.currentTime);
      
      a.addEventListener('timeupdate', onTimeUpdate);
      a.addEventListener('durationchange', onDurationChange);
      a.addEventListener('volumechange', onVolumeChange);
      a.addEventListener('loadedmetadata', onDurationChange);
      a.addEventListener('seeking', onSeek);
      a.addEventListener('seeked', onSeek);
      a.addEventListener('play', onPlay);
      a.addEventListener('pause', onPause);
      
      return () => {
        // Clear live ref when disconnecting
        if (liveAudioRef.current === a) liveAudioRef.current = null;
        a.removeEventListener('timeupdate', onTimeUpdate);
        a.removeEventListener('durationchange', onDurationChange);
        a.removeEventListener('volumechange', onVolumeChange);
        a.removeEventListener('loadedmetadata', onDurationChange);
        a.removeEventListener('seeking', onSeek);
        a.removeEventListener('seeked', onSeek);
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPause);
      };
    };
    
    if (mounted) {
      return findAndConnectAudio();
    }
  }, [mounted, currentId]); // Re-run when currentId changes to switch between ambient and main player

  // Persist volume to localStorage when it changes
  useEffect(() => {
    try { if (typeof window !== 'undefined') localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.max(0, Math.min(1, volume)))); } catch {}
  }, [volume]);

  // Close HUD volume popover on outside click / Escape
  useEffect(() => {
    const onDocDown = (e) => {
      const t = e.target;
      if (hudVolRef.current && t && !hudVolRef.current.contains(t)) {
        try { sfx.play('close', 0.4); } catch {}
        setShowHudVolumePopover(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHudVolumePopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Animation loop for smooth cursor movement when playing
  useEffect(() => {
    let animationId;
    let frameCount = 0;
    
    const animate = () => {
      setAnimationTime(Date.now());
      
      // Update progress more frequently when playing for smoother cursor movement
      // Use the connected audio element directly (set in findAndConnectAudio)
      const a = liveAudioRef.current;
      
      if (a && !a.paused) {
        const newTime = a.currentTime;
        
        // Only update if time has actually changed to avoid unnecessary re-renders
        setProgress(prevTime => {
          if (Math.abs(newTime - prevTime) > 0.005) { // Update if difference > 5ms
            return newTime;
          }
          return prevTime;
        });
        
        // Debug logging every 60 frames (1 second at 60fps) when playing
        frameCount++;
        if (frameCount % 60 === 0 && DEBUG_MEDIA) {
          dlog('HUDPanel Animation Loop (Playing):', {
            audioType: !currentId ? 'ambient' : 'main',
            currentTime: newTime.toFixed(2),
            duration: a.duration?.toFixed(2) || 'unknown',
            progress: a.duration > 0 ? ((newTime / a.duration) * 100).toFixed(1) : 0,
            cursor: a.duration > 0 ? `${((newTime / a.duration) * 100).toFixed(1)}%` : '0%',
            readyState: a.readyState
          });
        }
      }
      
      // Continue animation loop
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [playing, currentId]); // React to playing state changes and currentId changes

  // Progress bar click handler
  const handleProgressClick = (e) => {
    // Track ambient audio on homepage, main player when song selected
    const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
    const a = document.querySelector(audioSelector);
    if (DEBUG_MEDIA) dlog('HUDPanel: progress click', { selector: audioSelector, hasAudio: !!a, duration, currentId });
    if (!a || !duration) {
      if (DEBUG_MEDIA) dlog('HUDPanel: cannot seek — missing audio or duration');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;
    if (DEBUG_MEDIA) dlog('HUDPanel: seeking', { seekTime, percent: percentage * 100, audioType: !currentId ? 'ambient' : 'main' });
    a.currentTime = seekTime;
    try { sfx.play('click', 0.3); } catch {}
  };

  // Toggle play/pause
  const handlePlayPause = () => {
    try { sfx.play('click', 0.6); } catch {}
    
    // Track ambient audio on homepage, main player when song selected
    const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
    const a = document.querySelector(audioSelector);
    
    if (!a) {
      if (DEBUG_MEDIA) dlog('HUDPanel: no audio element found for play/pause', { selector: audioSelector, currentId });
      return;
    }
    
    if (!currentId) {
      // Homepage: directly toggle ambient (space-music.mp3)
      try {
        if (a.paused) {
          // Clear user-paused flag and try to resume ambient
          try { window.dispatchEvent(new CustomEvent('ambient:userPlay')); } catch {}
          try { a.muted = false; } catch {}
          a.play().catch(() => {});
        } else {
          // Pause ambient and mark as user-paused to prevent auto-resume
          a.pause();
          try { window.dispatchEvent(new CustomEvent('ambient:userPause')); } catch {}
        }
      } catch {}
      return;
    } else {
      // When a song is selected, prefer the MediaPlayer's toggle API to keep
      // internal state machine, timers, and audio coordinator in sync.
      try {
        const api = (window || {});
        if (api && typeof api.mainPlayerToggle === 'function') {
          api.mainPlayerToggle();
          return;
        }
      } catch {}

      // Fallback: directly toggle the audio element
      try {
        if (a.paused) {
          // Ensure unmuted before attempting play
          try { a.muted = false; } catch {}
          a.play().catch(() => {});
        } else {
          a.pause();
        }
      } catch {}
    }
  };

  // Measure container and compute a stable scale before first paint to avoid flicker.
  useLayoutEffect(() => {
    if (!inConsole) return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0, raf2 = 0;
    const measure = () => {
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      // If layout hasn't stabilized yet (very small box), retry next frame.
      if (w < 100 || h < 60) { raf2 = requestAnimationFrame(measure); return; }
      const s = Math.min(w / baseW, h / baseH);
      setScale(s > 0 ? s : 1);
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    // Run after layout but before paint
    raf = requestAnimationFrame(measure);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); cancelAnimationFrame(raf2); };
  }, [inConsole]);

  // Sync active planet with externally playing song id (when provided)
  useEffect(() => {
    if (!currentId) return;
    const exists = songs.some(s => s.id === currentId);
    if (exists && currentId !== active) setActive(currentId);
  }, [currentId, songs]);

  // Fallback: if songs not provided, build from tracks
  const resolvedSongs = songs && songs.length ? songs : buildPlanetSongs().hudSongs;
  
  // Initialize player store with holoSongs for 3D planet system
  useEffect(() => {
    const planetData = buildPlanetSongs();
    if (planetData.holoSongs && planetData.holoSongs.length > 0) {
      playerStore.getState().initSongs(planetData.holoSongs);
    }
  }, []);

  // Planet visibility is orchestrated by DashboardApp:
  // - It enables planets on home after Start/landing.
  // - It hides planets during song selection until playback begins.
  // Avoid forcing planetsVisible=true here based solely on !currentId,
  // which could re-show planets briefly during selection transitions.

  // Dynamically place planet container directly above the media player
  useLayoutEffect(() => {
    let measureTimeout;
    const measure = () => {
      // Throttle measurements to prevent excessive updates
      clearTimeout(measureTimeout);
      measureTimeout = setTimeout(() => {
        try {
          const inner = innerRef.current;
          const player = playerRef.current;
          if (!inner || !player) return;
          const ir = inner.getBoundingClientRect();
          const pr = player.getBoundingClientRect();
          // Reduce the gap so the 3D display extends to the media player
          // Pull the planet system closer to the player (less bottom buffer)
          const gap = -28; // px space between planet and player (negative = overlap slightly)
          const b = Math.max(0, ir.bottom - pr.top + gap);
          // Only update if there's a significant change to prevent micro-adjustments
          setPlanetBottom(prev => Math.abs(prev - b) > 2 ? b : prev);
        } catch {}
      }, 100); // 100ms throttle
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    if (innerRef.current) ro.observe(innerRef.current);
    if (playerRef.current) ro.observe(playerRef.current);
    window.addEventListener('resize', measure);
    return () => { 
      clearTimeout(measureTimeout);
      try { ro.disconnect(); } catch {}; 
      window.removeEventListener('resize', measure); 
    };
  }, [inConsole]);

  return (
    <motion.section
      className={
        `relative ${inConsole ? 'w-full h-full mx-0 mt-0' : 'mx-auto w-[400px] mt-[10vh]'} `
      }
      /* Remove entrance animation to prevent flash-disappear on some devices */
      initial={false}
      animate={undefined}
      transition={undefined}
      aria-label="Spaceship HUD"
      ref={inConsole ? containerRef : undefined}
    >
      <DevErrorLogger />
      <div className="w-full h-full flex items-end justify-center">
          <motion.div
            className={`relative rounded-2xl`}
            // Remove hover glow/scale for the entire HUD display per request
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={inConsole
              ? { width: '100%', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 0 }
              : { transform: 'perspective(1200px) rotateX(6deg)', marginTop: 0 }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl ${inConsole ? 'p-2' : 'p-4'}`} style={{
          background: 'transparent',
          boxShadow: 'none'
        }}>
          {/* Overlay frame to visually lower the blue panel top to match song listing */}
          <div
            className="absolute inset-x-0 rounded-2xl pointer-events-none"
            style={{
              bottom: 0,
              // Raise the top edge further for a taller dashboard (bottom unchanged)
              top: `calc(var(--hud-y, 0px) + ${inConsole ? 92 : 112}px)`,
              background: 'rgba(25,227,255,0.25)',
              boxShadow: '0 0 50px rgba(25,227,255,0.20), 0 0 70px rgba(25,227,255,0.35), 0 0 24px rgba(25,227,255,0.50)',
              border: '1px solid rgba(25,227,255,0.60)'
            }}
            aria-hidden
          />
          {/* 3D planets — align to full blue display width (outside inner padding) */}
          <div
            ref={planetRef}
            className="absolute inset-x-0"
            // Position 3D display higher within blue HUD area; allow only top bleed on homepage
            style={{ 
              // Move the 3D planet system higher
              top: `calc(${inConsole ? 44 : 64}px + var(--hud-y, 0px)${!currentId ? ' - 18px' : ''})`, 
              bottom: planetBottom,
              pointerEvents: 'none' // Allow clicks to pass through to elements below
            }}
          >
            <div className="w-full h-full" style={{ pointerEvents: 'none' }}>
                <ErrorBoundary 
                  key={preferRaw3D ? 'raw' : 'r3f'}
                  fallback={null} 
                  onError={(e)=>{ 
                    const emsg = String((e && (e.message||e.name)) || '');
                    if (String(e?.name||'').includes('IndexSizeError')) { 
                      try { if (DEBUG_MEDIA) dwarn('Disabling 3D due to IndexSizeError'); } catch {} 
                    }
                    if (emsg.includes('ReactCurrentOwner')) {
                      // Switch to raw 3D fallback; keep 3D enabled
                      setPreferRaw3D(true);
                    }
                    setThreeFailed(emsg || 'Render error'); 
                    // Do not disable can3D here; fallback may still work
                  }}
                >
                  {/* Show all planets on homepage (no currentId), and focus when a song is selected */}
                  {preferRaw3D ? (
                    <PlanetSystemRaw showAll={showAllPlanets || !currentId} hideUntilPlaying={!!hidePlanetsUntilPlaying} onSongChange={onSongChange} />
                  ) : (
                    <PlanetSystem showAll={showAllPlanets || !currentId} hideUntilPlaying={!!hidePlanetsUntilPlaying} onSongChange={onSongChange} />
                  )}
                </ErrorBoundary>
              </div>
          </div>
          {/* Background removed for transparent HUD */}
          {/* Cover art moved into right column above the song list */}
          {/* Holographic beam overlays removed */}
          {/* Bloom layers removed */}
          <div
              className={`relative ${inConsole ? 'p-2' : 'p-4'}`}
              style={{ 
                opacity: contentOpacity, 
                transition: 'opacity 240ms ease', 
                pointerEvents: contentOpacity > 0.01 ? 'auto' : 'none', 
                minHeight: inConsole ? 380 : 480,
                width: '100%',
                height: '100%'
              }}
              ref={innerRef}
            >


          
          {/* Cover section at bottom right corner - using CoverHologram for pop-out functionality */}
          <div ref={coverRef} className="absolute" style={{ 
            // Nudge slightly higher and align to the right edge
            bottom: inConsole ? -6 : -18, 
            right: inConsole ? 0 : 0, 
            width: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-end',
            // Slightly larger gap so the button isn't attached to the cover
            gap: 4,
            justifyContent: 'flex-end' 
          }}>
            {/* Brand button above the cover art */}
            <button
              type="button"
              aria-label="CHXNDLER"
              title="CHXNDLER"
              className="brand-cover-btn"
              style={{
                pointerEvents: joinAlienOpen ? 'none' : 'auto',
                // Slightly reduce height to feel tighter
                height: 44,
                // Inline-flex to vertically center text within fixed height
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                // Let width size to content; tighten padding to narrow button
                boxSizing: 'border-box',
                // Tighter horizontal padding to reduce width
                padding: '0 3px 0 3px',
                // Pull the button up a touch so the top border moves slightly higher
                marginTop: -7,
                // Add a small space below the button so it doesn't attach to the cover
                marginBottom: 0,
                marginRight: 2,
                borderRadius: 12,
                border: '2px solid rgba(25,227,255,0.80)',
                background: 'rgba(25,227,255,0.15)',
                color: '#F2EF1D',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                // Slightly smaller font to further reduce width
                fontSize: 14,
                lineHeight: 1,
                // Tighter, stronger glow close to the letters
                textShadow: '0 0 6px rgba(242,239,29,1), 0 0 10px rgba(242,239,29,0.95), 0 0 16px rgba(242,239,29,0.8)',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 0 20px rgba(25,227,255,0.35)'
              }}
              ref={brandBtnRef}
              onMouseEnter={() => { 
                try { sfx.play('hover', 0.35); } catch {}
                try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.35; a.play().catch(()=>{}); } } catch {}
              }}
              onClick={() => { 
                // Track brand button click to server analytics
                try {
                  const slug = (!currentId ? 'chxndler_home' : (track?.slug || active || 'unknown'));
                  const title = (!currentId ? 'CHXNDLER Home' : (track?.title || 'Unknown'));
                  trackAnalytics('chxndler_button_clicked', { song_slug: String(slug || ''), payload: { song_title: title, location: 'hud_brand_button' } });
                } catch {}
                // Also store a local click record so analytics UI can show counts without server
                try {
                  const id = generateClickId();
                  const ts = Date.now();
                  storeClickData({
                    id,
                    timestamp: ts,
                    element: {
                      tagName: 'button',
                      className: 'brand-cover-btn',
                      id: '',
                      textContent: 'CHXNDLER',
                      role: 'button',
                      ariaLabel: 'CHXNDLER',
                      dataId: 'brand',
                    },
                    position: { x: 0, y: 0, screenX: 0, screenY: 0 },
                    viewport: { width: (typeof window!== 'undefined'? window.innerWidth:0), height: (typeof window!== 'undefined'? window.innerHeight:0) },
                    page: { url: (typeof window!== 'undefined'? window.location.href:''), title: (typeof document!== 'undefined'? document.title:'') },
                    userAgent: (typeof navigator!== 'undefined'? navigator.userAgent:'unknown'),
                    enhancedLabel: '⭐ CHXNDLER Button',
                  });
                } catch {}
                if (showBrandPopover) { try { sfx.play('close', 0.4); } catch {}; setShowBrandPopover(false); return; }
                openBrandPopover();
              }}
              data-id="brand"
            >
              CHXNDLER
            </button>
            {(() => {
              const src = (!currentId ? DEFAULT_COVER : (track?.cover || DEFAULT_COVER));
              const title = (!currentId ? 'CHXNDLER' : (track?.title || 'Unknown'));
              const trackingSong = (!currentId ? 'chxndler_home' : (track?.slug || active || 'unknown'));
              const trackingTitle = (!currentId ? 'CHXNDLER Home' : (track?.title || 'Unknown'));
              
              
              return (
                <div
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                  style={{
                    pointerEvents: joinAlienOpen ? 'none' : 'auto'
                  }}
                >
                  <CoverHologram 
                    src={src} 
                    title={title} 
                    slug={trackingSong}
                    inline={true} 
                    size={92}
                  />
                </div>
              );
            })()}
          </div>

          {/* Waveform Media Player - positioned below dropdown with proper spacing */}
          <div ref={playerRef} className="absolute" style={{ 
            left: inConsole ? 0 : 2, // Shift very slightly more to the left
            right: oneLinerRight - 4, // Extend 4px further to the right
            // Adjust height to allow internal bottom buffer
            height: '60px',
            // Keep player snug to the blue display; slightly lower
            bottom: 'var(--hud-player-bottom-offset, 0px)',
            // Nudge the entire container down a bit more
            transform: 'translateY(6px)'
          }}>
            <div className="hud-waveform-player" style={{ margin: 0, borderRadius: '10px', paddingBottom: 6 }}>
              <div className="flex flex-wrap items-start gap-3 pt-0 pr-2 pl-2 pb-0">
                <div className="controls-row flex items-center gap-4 w-full" style={{ paddingTop: 4 }}>
                <button 
                  onClick={handlePlayPause}
                  className="hud-play-btn-enhanced"
                  aria-label={playing ? "Pause" : "Play"}
                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                  style={{ marginTop: 1 }}
                >
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4v16l12-8z"/>
                    </svg>
                  )}
                </button>
                
                {/* Spotify button positioned directly next to play/pause */}
                {(() => {
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const spotifyUrl = currentSong?.spotify;
                  
                  // Only show clickable Spotify button when a song is selected (currentId exists)
                  // On homepage (!currentId), always show disabled button
                  if (currentId && spotifyUrl) {
                    return (
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spotify-btn-waveform-hud"
                        style={{ marginTop: 1 }}
                        title="Open on Spotify"
                        aria-label={`Open ${currentSong?.title || 'current track'} on Spotify`}
                        data-song={currentSong?.title || ''}
                        data-slug={currentSong?.id || ''}
                        data-id="sp"
                        onClick={(e) => {
                          try { e.preventDefault(); } catch {}
                          try { sfx.play('join-aliens', 0.9); } catch {}
                          try {
                            const { toSpotifyEmbed } = require('@/lib/spotify');
                            const embed = toSpotifyEmbed(spotifyUrl);
                            if (embed) { setSpEmbedUrl(embed); setShowSpotifyPopover(true); }
                            else { window.open(spotifyUrl, '_blank', 'noopener,noreferrer'); }
                          } catch {
                            try { window.open(spotifyUrl, '_blank', 'noopener,noreferrer'); } catch {}
                          }
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </a>
                    );
                  } else {
                    // Show disabled button on homepage or when no Spotify link available
                    const isHomepage = !currentId;
                    const titleText = isHomepage 
                      ? 'Spotify not available on homepage' 
                      : `No Spotify link available for ${currentSong?.title || 'current track'}`;
                    
                    return (
                      <div 
                        className="spotify-btn-unavailable-hud"
                        style={{ marginTop: 1 }}
                        title={titleText}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.5">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                    );
                  }
                })()}

                {/* Apple Music button positioned directly next to Spotify */}
                {(() => {
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const appleUrl = currentSong?.apple;

                  // Only show clickable Apple button when a song is selected (currentId exists)
                  // On homepage (!currentId), always show disabled button
                  if (currentId && appleUrl) {
                    return (
                      <a
                        href={appleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-btn-waveform-hud"
                        style={{ marginTop: 1 }}
                        title="Open on Apple Music"
                        aria-label={`Open ${currentSong?.title || 'current track'} on Apple Music`}
                        data-song={currentSong?.title || ''}
                        data-slug={currentSong?.id || ''}
                        data-id="am"
                        onClick={(e) => {
                          try { e.preventDefault(); } catch {}
                          try { sfx.play('join-aliens', 0.9); } catch {}
                          try {
                            const { toAppleEmbed } = require('@/lib/apple');
                            const embed = toAppleEmbed(appleUrl);
                            if (embed) { setAmEmbedUrl(embed); setShowApplePopover(true); }
                            else { window.open(appleUrl, '_blank', 'noopener,noreferrer'); }
                          } catch {
                            try { window.open(appleUrl, '_blank', 'noopener,noreferrer'); } catch {}
                          }
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="22"
                          height="22"
                          fill="currentColor"
                          role="img"
                          aria-label="Music notes"
                          style={{ display: 'block' }}
                        >
                          <ellipse cx="7.5" cy="18.2" rx="3.2" ry="3.4" />
                          <ellipse cx="16.5" cy="16" rx="3.2" ry="3.4" />
                          <rect x="9" y="6" width="2" height="11" rx="1" />
                          <rect x="18" y="4" width="2" height="11" rx="1" />
                          <path d="M11 6 L20 4 L20 6.5 L11 8.5 Z" />
                        </svg>
                      </a>
                    );
                  } else {
                    // Show disabled button on homepage or when no Apple link available
                    const isHomepage = !currentId;
                    const titleText = isHomepage 
                      ? 'Apple Music not available on homepage' 
                      : `No Apple Music link available for ${currentSong?.title || 'current track'}`;

                    return (
                      <div 
                        className="apple-btn-unavailable-hud"
                        style={{ marginTop: 1 }}
                        title={titleText}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="22"
                          height="22"
                          fill="currentColor"
                          role="img"
                          aria-label="Music notes"
                          style={{ display: 'block' }}
                        >
                          <ellipse cx="7.5" cy="18.2" rx="3.2" ry="3.4" />
                          <ellipse cx="16.5" cy="16" rx="3.2" ry="3.4" />
                          <rect x="9" y="6" width="2" height="11" rx="1" />
                          <rect x="18" y="4" width="2" height="11" rx="1" />
                          <path d="M11 6 L20 4 L20 6.5 L11 8.5 Z" />
                        </svg>
                      </div>
                    );
                  }
                })()}

                {/* YouTube button moved to Gem's original position */}
                {(() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  if (isHome) {
                    return (
                      <div className="youtube-btn-unavailable-hud" title="YouTube not available on homepage" style={{ marginTop: 1 }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
                          <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                        </svg>
                      </div>
                    );
                  }
                  const slug = currentSong?.id;
                  if (!slug) return null;
                  return currentSong?.youtube ? (
                    <a
                      href={currentSong.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="youtube-btn-waveform-hud"
                      style={{ marginTop: 1 }}
                      title={`Open ${currentSong.title} on YouTube`}
                      aria-label={`Open ${currentSong.title} on YouTube`}
                      data-song={currentSong.title}
                      data-slug={currentSong.id}
                      data-id="yt"
                      onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      onClick={(e) => {
                        try { e.preventDefault(); } catch {}
                        try { sfx.play('click', 0.4); } catch {}
                        // Pause site audio while video plays
                        try {
                          const a = document.querySelector('audio[data-audio-player="1"]');
                          if (a && a.pause) a.pause();
                        } catch {}
                        // Build embeddable URL
                        const toEmbed = (url) => {
                          try {
                            const u = new URL(url);
                            const host = u.hostname.replace(/^www\./, '');
                            if (host === 'youtu.be') {
                              const id = u.pathname.slice(1);
                              if (id) return `https://www.youtube.com/embed/${id}`;
                            }
                            if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
                              if (u.pathname === '/watch') {
                                const id = u.searchParams.get('v');
                                if (id) return `https://www.youtube.com/embed/${id}`;
                              }
                              if (u.pathname.startsWith('/shorts/')) {
                                const id = u.pathname.split('/')[2];
                                if (id) return `https://www.youtube.com/embed/${id}`;
                              }
                              if (u.pathname.startsWith('/embed/')) {
                                return `https://${host}/embed/${u.pathname.split('/')[2]}`;
                              }
                              if (u.pathname.startsWith('/live/')) {
                                const id = u.pathname.split('/')[2];
                                if (id) return `https://www.youtube.com/embed/${id}`;
                              }
                            }
                          } catch {}
                          return null;
                        };
                        const embed = toEmbed(currentSong.youtube);
                        if (embed) {
                          setYtEmbedUrl(`${embed}?autoplay=1&rel=0`);
                          setShowYouTubePopover(true);
                        } else {
                          try { window.open(currentSong.youtube, '_blank', 'noopener,noreferrer'); } catch {}
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M10 8l6 4-6 4z" fill="currentColor" />
                      </svg>
                    </a>
                  ) : (
                    <div className="youtube-btn-unavailable-hud" title={`No YouTube link available for ${currentSong?.title || 'current track'}`} style={{ marginTop: 1 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
                        <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                      </svg>
                    </div>
                  );
                })()}

                {/* Volume control next to Spotify icon */}
                <div 
                  className="hud-volume"
                  role="group" 
                  aria-label="Volume"
                  ref={hudVolRef}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', marginTop: 1 }}
                >
                  <button
                    className="hud-volume-btn"
                    onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                    onClick={() => {
                      try { sfx.play('click', 0.4); } catch {}
                      // Only open/close dropdown; do not change volume on click
                      setShowHudVolumePopover(v => {
                        const next = !v;
                        if (next && hudVolBtnRef.current) {
                          const r = hudVolBtnRef.current.getBoundingClientRect();
                          setHudPopoverPos({ left: r.left + r.width/2, top: r.bottom + 8 });
                        }
                        if (!next) { try { sfx.play('close', 0.4); } catch {} }
                        return next;
                      });
                    }}
                    aria-label="Volume"
                    title="Volume"
                    ref={hudVolBtnRef}
                  >
                    {volume === 0 ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        {/* Speaker base */}
                        <polygon points="4,10 8,10 13,6 13,18 8,14 4,14" fill="currentColor" />
                        {/* Mute X overlay */}
                        <line x1="15" y1="9" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="21" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm10.5 3c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3 9v6h4l5 5V4L7 9H3zm10.5 3c0-1.77-.77-3.29-2-4.3v8.6c1.23-1.01 2-2.53 2-4.3zM19 12c0-3.04-1.72-5.64-4.25-6.92l-.75 1.86C16 8.2 17.5 9.96 17.5 12s-1.5 3.8-3.5 4.06l.75 1.86C17.28 17.64 19 15.04 19 12z"/>
                      </svg>
                    )}
                  </button>
                  {null}
                {(() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  if (isHome) {
                      // Homepage: lyrics popover for CHXNDLER + YouTube disabled
                      // Also show the Store (gem) button as ACTIVE on homepage
                      return (
                        <>
                          <button
                            ref={lyricsBtnRef}
                            type="button"
                            className="hud-lyrics-btn"
                            style={{ marginTop: 1 }}
                            title="Lyrics for CHXNDLER"
                            aria-label="View lyrics for CHXNDLER"
                            data-id="lyrics"
                            data-song="CHXNDLER"
                            aria-haspopup="dialog"
                            aria-expanded={showLyricsPopover}
                            onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                            onClick={() => {
                              if (showLyricsPopover) { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); return; }
                              openLyricsPopover('homepage');
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                              <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                              <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                              <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                              <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                              <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                            </svg>
                          </button>
                          {/* YouTube is already rendered in the main controls row; don't duplicate here on homepage */}
                          {/* Gem (store) button should be active on homepage too */}
                          <button
                            type="button"
                            ref={storeBtnRef}
                            className="gem-btn-waveform-hud"
                            style={{ marginTop: 1 }}
                            title="Open Store"
                            data-id="store"
                            data-song="CHXNDLER"
                            aria-haspopup="dialog"
                            aria-expanded={showStorePopover}
                            onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                            onClick={() => {
                              // Track store button click on homepage
                              try {
                                const songSlug = 'homepage';
                                const songTitle = 'CHXNDLER';
                                trackAnalytics('store_button_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, location: 'hud_store_button_home' } });
                              } catch {}
                              if (showStorePopover) { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); return; }
                              openStorePopover();
                            }}
                          >
                            <img
                              src="/elements/store.png"
                              alt="Store"
                              width="16"
                              height="16"
                              style={{
                                display: 'block',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 4px #FF3EA5) drop-shadow(0 0 10px #FF3EA5) drop-shadow(0 0 16px #FF3EA5)'
                              }}
                            />
                          </button>
                        </>
                      );
                  }
                  const slug = currentSong?.id;
                  if (!slug) return null;
                  return (
                    <>
                      <button
                        ref={lyricsBtnRef}
                        type="button"
                        className="hud-lyrics-btn"
                        style={{ marginTop: 1 }}
                        title={`Lyrics for ${currentSong?.title || 'current track'}`}
                        aria-label={`View lyrics for ${currentSong?.title || 'current track'}`}
                        data-id="lyrics"
                        data-song={currentSong?.title || ''}
                        aria-haspopup="dialog"
                        aria-expanded={showLyricsPopover}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onClick={() => {
                          if (showLyricsPopover) { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); return; }
                          openLyricsPopover(slug);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                          <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                          <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                          <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                          <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                        </svg>
                      </button>
                      {/* Gem (store) button moved to YouTube's original position */}
                      <button
                        type="button"
                        ref={storeBtnRef}
                        className="gem-btn-waveform-hud"
                        style={{ marginTop: 1 }}
                        title="Open Store"
                        data-id="store"
                        data-song={currentSong?.title || ''}
                        aria-haspopup="dialog"
                        aria-expanded={showStorePopover}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onClick={() => {
                          // Track store button click within Music analytics with song context
                          try {
                            const songSlug = slug || active || 'unknown';
                            const songTitle = currentSong?.title || track?.title || 'Unknown';
                            trackAnalytics('store_button_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, location: 'hud_store_button' } });
                          } catch {}
                          if (showStorePopover) { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); return; }
                          openStorePopover();
                        }}
                      >
                        <img
                          src="/elements/store.png"
                          alt="Store"
                          width="16"
                          height="16"
                          style={{
                            display: 'block',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 4px #FF3EA5) drop-shadow(0 0 10px #FF3EA5) drop-shadow(0 0 16px #FF3EA5)'
                          }}
                        />
                      </button>
                    </>
                  );
                })()}
                </div>

                {typeof document !== 'undefined' && showHudVolumePopover && hudPopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Adjust volume"
                    style={{
                      position: 'fixed', left: hudPopoverPos.left, top: hudPopoverPos.top, transform: 'translateX(-50%)',
                      padding: '10px 10px', borderRadius: 12,
                      background: 'rgba(3,10,20,0.86)',
                      border: '1px solid rgba(25,227,255,0.5)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 22px rgba(25,227,255,0.55)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2147483647
                    }}
                  >
                    <div
                      role="slider"
                      aria-orientation="vertical"
                      aria-label="Volume"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(volume * 100)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        const playVol = () => { const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()); const last = hudVolumeSfxLastRef.current || 0; if (now - last > 150) { hudVolumeSfxLastRef.current = now; try { sfx.play('volume', 0.32); } catch {} } };
                        if (e.key === 'ArrowUp') { e.preventDefault(); const a = liveAudioRef.current; if (!a) return; a.volume = Math.max(0, Math.min(1, volume + 0.05)); playVol(); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); const a = liveAudioRef.current; if (!a) return; a.volume = Math.max(0, Math.min(1, volume - 0.05)); playVol(); }
                      }}
                      onPointerDown={(e) => {
                        const a = liveAudioRef.current; if (!a) return;
                        const el = e.currentTarget;
                        const playVol = () => { const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()); const last = hudVolumeSfxLastRef.current || 0; if (now - last > 120) { hudVolumeSfxLastRef.current = now; try { sfx.play('volume', 0.28); } catch {} } };
                        const applyFromClientY = (clientY) => {
                          const rect = el.getBoundingClientRect();
                          const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                          const pct = rect.height > 0 ? (1 - (y / rect.height)) : 0;
                          const newVol = Math.max(0, Math.min(1, pct));
                          a.volume = newVol; setVolume(newVol);
                          if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                          playVol();
                        };
                        try { el.setPointerCapture?.(e.pointerId); } catch {}
                        e.preventDefault(); playVol();
                        applyFromClientY(e.clientY);
                        const onMove = (ev) => applyFromClientY(ev.clientY);
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp, { once: true });
                      }}
                      style={{ position: 'relative', width: 28, height: 120, cursor: 'pointer', touchAction: 'none', overflow: 'hidden', borderRadius: 12 }}
                    >
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12, background: 'rgba(0,0,0,0.82)', boxShadow: 'inset 0 0 22px rgba(25,227,255,0.60), inset 0 0 44px rgba(25,227,255,0.36)' }} />
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.round(volume*100)}%`, background: 'linear-gradient(180deg, #9FEAFF 0%, #19E3FF 100%)', borderRadius: '0 0 12px 12px', boxShadow: '0 0 60px rgba(25,227,255,1), 0 0 120px rgba(25,227,255,1), 0 0 180px rgba(25,227,255,0.95)' }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#19E3FF', textShadow: '0 0 10px rgba(25,227,255,0.7)' }}>{Math.round(volume * 100)}%</div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showApplePopover && amEmbedUrl ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Apple Music Player"
                    onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowApplePopover(false); }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'transparent',
                      // no dim or blur for Apple overlay
                      zIndex: 2147483647,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{
                        position: 'relative',
                        width: 'min(88vw, 420px)',
                        background: 'transparent', // remove black fill
                        border: '1px solid rgba(255,59,48,0.6)',
                        boxShadow: '0 0 32px rgba(255,59,48,0.35)', // remove heavy dark drop shadow
                        borderRadius: 14,
                        overflow: 'hidden',
                        // Slightly higher on the screen
                        marginTop: -210
                      }}
                    >
                      <button
                        aria-label="Close"
                        title="Close"
                        onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(255,255,255,0.7)'; } catch {} }}
                        onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = 'none'; } catch {} }}
                        onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowApplePopover(false); }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.5)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.5)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                          <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
                        </svg>
                      </button>
                      <iframe
                        src={amEmbedUrl}
                        title="Apple Music player"
                        allow="autoplay *; encrypted-media *; clipboard-write"
                        loading="lazy"
                        width="100%"
                        height={(() => { try { return require('@/lib/apple').appleEmbedHeight(amEmbedUrl); } catch { return 360; } })()}
                        style={{ border: 'none', display: 'block' }}
                      />
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showSpotifyPopover && spEmbedUrl ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Spotify Player"
                    onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowSpotifyPopover(false); }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(2px)',
                      zIndex: 2147483647,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{
                        position: 'relative',
                        width: 'min(88vw, 420px)',
                        background: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(29,185,84,0.6)',
                        boxShadow: '0 18px 46px rgba(0,0,0,0.55), 0 0 32px rgba(29,185,84,0.35)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        // Slightly higher on the screen
                        marginTop: -160
                      }}
                    >
                      <button
                        aria-label="Close"
                        title="Close"
                        onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(255,255,255,0.7)'; } catch {} }}
                        onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = 'none'; } catch {} }}
                        onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowSpotifyPopover(false); }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.5)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.5)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                          <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
                        </svg>
                      </button>
                      <iframe
                        src={spEmbedUrl}
                        title="Spotify player"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        width="100%"
                        height={spEmbedUrl ? (() => { try { return require('@/lib/spotify').spotifyEmbedHeight(spEmbedUrl); } catch { return undefined } })() : undefined}
                        style={{ border: 'none', display: 'block' }}
                      />
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showYouTubePopover && ytEmbedUrl ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="YouTube Player"
                    className="yt-overlay"
                    onClick={() => setShowYouTubePopover(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'transparent',
                      backdropFilter: 'none',
                      zIndex: 2147483647,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      className="yt-popover"
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{
                        position: 'relative',
                        width: 'min(84vw, 660px)',
                        aspectRatio: '16 / 9',
                        background: 'rgba(3,10,20,0.92)',
                        border: '1px solid rgba(25,227,255,0.6)',
                        boxShadow: '0 18px 46px rgba(0,0,0,0.55), 0 0 32px rgba(25,227,255,0.45)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        // Move a bit lower on screen
                        marginTop: -168
                      }}
                    >
                      <button
                        aria-label="Close"
                        title="Close"
                        onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(25,227,255,0.8)'; } catch {} }}
                        onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(25,227,255,0.35)'; } catch {} }}
                        onClick={() => setShowYouTubePopover(false)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.5)',
                          color: '#19E3FF',
                          border: '1px solid rgba(25,227,255,0.6)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 16px rgba(25,227,255,0.35)'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                          <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
                        </svg>
                      </button>
                      <iframe
                        src={ytEmbedUrl}
                        title="YouTube player"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                      />
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showStorePopover && storePopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Storefront"
                    className="lyrics-popover-hud"
                    ref={storeScrollRef}
                    style={{
                      position: 'fixed',
                      left: (storePopoverPos && storePopoverPos.left) || 0,
                      top: (storePopoverPos && storePopoverPos.top) || 0,
                      transform: (storePopoverPos && storePopoverPos.width) ? 'scale(1.04)' : 'translateX(-50%) scale(1.04)',
                      transformOrigin: 'top center',
                      padding: '12px 14px 22px 14px', borderRadius: 14,
                      background: 'rgba(20,3,14,0.9)',
                      border: '1px solid rgba(252,84,175,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(252,84,175,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFD9EF',
                      zIndex: 2147483647,
                      width: (storePopoverPos && storePopoverPos.width) ? storePopoverPos.width : 'min(92vw, 560px)',
                      maxHeight: '83vh',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      overscrollBehavior: 'contain'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); }
                      if (e.key === 'ArrowRight') { setStoreIndex((i) => (i + 1) % products.length); try { sfx.play('close', 0.45); } catch {} }
                      if (e.key === 'ArrowLeft') { setStoreIndex((i) => (i - 1 + products.length) % products.length); try { sfx.play('close', 0.45); } catch {} }
                    }}
                  >
                    {/* Pink close button in the top-right corner */}
                    <button
                      aria-label="Close store"
                      title="Close store"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(252,84,175,0.95), 0 0 42px rgba(252,84,175,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(252,84,175,0.75), 0 0 32px rgba(252,84,175,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(252,84,175,0.85)',
                        color: '#FF3EA5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(252,84,175,0.75), 0 0 32px rgba(252,84,175,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {(() => {
                      const item = products[Math.max(0, Math.min(products.length - 1, storeIndex))] || products[0];
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <div style={{ fontWeight: 800, letterSpacing: '0.04em', color: '#FFC1E6', textShadow: '0 0 12px rgba(252,84,175,0.9), 0 0 24px rgba(252,84,175,0.55)' }}>
                              The HEARTVERSE Collection
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 12, alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              {/* Product image. For PATCH and BEANIE, allow front/back flip like the card animation */}
                              {item.id === 'patch' ? (
                                <div
                                  role="button"
                                  aria-label="Flip patch"
                                  title="Flip patch"
                                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {}; setPatchHovered(true); }}
                                  onMouseLeave={() => { setPatchHovered(false); }}
                                  onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setPatchFlipped(v => !v); }}
                                  style={{
                                    width: 104,
                                    height: 104,
                                    position: 'relative',
                                    borderRadius: 10,
                                    border: '1px solid rgba(252,84,175,0.35)',
                                    boxShadow: patchHovered ? '0 8px 24px rgba(0,0,0,0.45)' : '0 6px 18px rgba(0,0,0,0.35)',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    perspective: 600,
                                    transition: 'transform .12s ease, box-shadow .18s ease, filter .18s ease',
                                    transform: patchHovered ? 'translateZ(0) scale(1.05)' : 'none'
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      transition: 'transform 0.7s ease-in-out',
                                      transformStyle: 'preserve-3d',
                                      transform: patchFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                    }}
                                  >
                                    {/* Front */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                                      <img
                                        src={'/store/patch.png'}
                                        alt={item.title}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/card/chxndler.png'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/patch-inverse.png'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/card/chxndler.png'; } catch {} }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : item.id === 'beanie' ? (
                                <div
                                  role="button"
                                  aria-label="Flip beanie"
                                  title="Flip beanie"
                                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {}; setBeanieHovered(true); }}
                                  onMouseLeave={() => { setBeanieHovered(false); }}
                                  onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setBeanieFlipped(v => !v); }}
                                  style={{
                                    width: 104,
                                    height: 104,
                                    position: 'relative',
                                    borderRadius: 10,
                                    border: '1px solid rgba(252,84,175,0.35)',
                                    boxShadow: beanieHovered ? '0 8px 24px rgba(0,0,0,0.45)' : '0 6px 18px rgba(0,0,0,0.35)',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    perspective: 600,
                                    transition: 'transform .12s ease, box-shadow .18s ease, filter .18s ease',
                                    transform: beanieHovered ? 'translateZ(0) scale(1.05)' : 'none'
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      transition: 'transform 0.7s ease-in-out',
                                      transformStyle: 'preserve-3d',
                                      transform: beanieFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                    }}
                                  >
                                    {/* Front */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}>
                                      <img
                                        src={'/store/beanie-front.png'}
                                        alt={item.title}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/card/chxndler.png'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/beanie-back.png'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/card/chxndler.png'; } catch {} }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img src={item.image || '/card/chxndler.png'} alt={item.title} style={{ display: 'block', width: 104, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(252,84,175,0.35)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }} onError={(e)=>{ try { e.currentTarget.src = '/card/chxndler.png'; } catch {} }} />
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <button
                                  aria-label="Previous item"
                                  className="store-arrow-btn"
                                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                                  onClick={() => { setStoreIndex((i) => (i - 1 + products.length) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                                  style={{
                                    width: 28, height: 28, borderRadius: 999,
                                    background: 'linear-gradient(135deg,#ff76c8,#ff3ea5)',
                                    border: '1px solid rgba(255,255,255,0.5)', color: '#fff',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 16px rgba(255, 62, 165, 0.45)'
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6l-6 6 6 6"/></svg>
                                </button>
                                <button
                                  aria-label="Next item"
                                  className="store-arrow-btn"
                                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                                  onClick={() => { setStoreIndex((i) => (i + 1) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                                  style={{
                                    width: 28, height: 28, borderRadius: 999,
                                    background: 'linear-gradient(135deg,#ff76c8,#ff3ea5)',
                                    border: '1px solid rgba(255,255,255,0.5)', color: '#fff',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 16px rgba(255, 62, 165, 0.45)'
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 6l6 6-6 6"/></svg>
                                </button>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFD9EF', textShadow: '0 0 10px rgba(252,84,175,0.9)' }}>{item.title}</div>
                              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{item.description}</div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFB9E1' }}>{item.price || ''}</div>
                                {item.url ? (
                                  <a
                                    className="store-add-btn"
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-id="store-item"
                                    data-item-id={item.id}
                                    onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                                    onClick={() => {
                                      try { sfx.play('join', 0.75); } catch {}
                                      // Track merch item click with song context
                                      try {
                                        const songSlug = (typeof slug !== 'undefined' && slug) ? slug : (active || 'unknown');
                                        const songTitle = currentSong?.title || track?.title || 'Unknown';
                                        trackAnalytics('store_item_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, item_id: item.id, item_title: item.title, location: 'hud_store_item' } });
                                      } catch {}
                                      // Store local click for analytics UI fallback
                                      try {
                                        const id = generateClickId();
                                        const ts = Date.now();
                                        storeClickData({
                                          id,
                                          timestamp: ts,
                                          element: {
                                            tagName: 'a',
                                            className: 'store-add-btn',
                                            id: '',
                                            textContent: 'Add to Collection',
                                            role: 'link',
                                            ariaLabel: `Add ${item.title} to collection`,
                                            dataId: 'store-item',
                                          },
                                          position: { x: 0, y: 0, screenX: 0, screenY: 0 },
                                          viewport: { width: (typeof window!== 'undefined'? window.innerWidth:0), height: (typeof window!== 'undefined'? window.innerHeight:0) },
                                          page: { url: (typeof window!== 'undefined'? window.location.href:''), title: (typeof document!== 'undefined'? document.title:'') },
                                          userAgent: (typeof navigator!== 'undefined'? navigator.userAgent:'unknown'),
                                          enhancedLabel: `🛍️ Store: ${item.title}`,
                                        });
                                      } catch {}
                                    }}
                                    style={{
                                      padding: '6px 10px', borderRadius: 999,
                                      background: 'linear-gradient(135deg,#ff3ea5,#ff76c8)',
                                      border: '1px solid rgba(255,255,255,0.6)', color: '#fff', fontWeight: 700,
                                      boxShadow: '0 6px 18px rgba(255, 62, 165, 0.45)', textDecoration: 'none'
                                    }}
                                  >
                                    Add to Collection
                                  </a>
                                ) : null}
                               </div>
                             </div>
                           </div>
                          {/* Removed helper hint per request */}
                        </div>
                      );
                    })()}
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showLyricsPopover && lyricsPopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="Lyrics"
                    className="lyrics-popover-hud holo-scrollbar-yellow"
                    ref={lyricsScrollRef}
                    style={{
                      position: 'fixed',
                      left: (lyricsPopoverPos && lyricsPopoverPos.left) || 0,
                      top: (lyricsPopoverPos && lyricsPopoverPos.top) || 0,
                      transform: (lyricsPopoverPos && lyricsPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      // Tighten vertical padding so the bottom sits higher
                      padding: '10px 14px 14px 14px', borderRadius: 14,
                      background: 'rgba(3,10,20,0.9)',
                      border: '1px solid rgba(242,239,29,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(242,239,29,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#F2EF1D',
                      zIndex: 2147483647,
                      width: (lyricsPopoverPos && lyricsPopoverPos.width) ? lyricsPopoverPos.width : 'min(98vw, 1400px)',
                      // Fix height to the blue display area; slightly shorter fallback
                      height: (lyricsPopoverPos && lyricsPopoverPos.height) ? lyricsPopoverPos.height : '42vh',
                      overflow: 'auto'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); } }}
                  >
                    {/* Obvious yellow close button in the top-right corner */}
                    <button
                      aria-label="Close lyrics"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(242,239,29,0.95), 0 0 42px rgba(242,239,29,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(242,239,29,0.75), 0 0 32px rgba(242,239,29,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowLyricsPopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(242,239,29,0.85)',
                        color: '#F2EF1D',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(242,239,29,0.75), 0 0 32px rgba(242,239,29,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {lyricsLoading ? (
                      <div style={{ fontSize: 18, opacity: .99, color: '#F2EF1D', textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>Loading…</div>
                    ) : lyricsError ? (
                      <div style={{ fontSize: 18, color: '#ff7b7b' }}>{lyricsError}</div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 18, color: '#F2EF1D', textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>{lyricsContent || 'No lyrics available.'}</div>
                    )}
                    {null}
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showBrandPopover && brandPopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="CHXNDLER"
                    className="lyrics-popover-hud holo-scrollbar-yellow"
                    style={{
                      position: 'fixed',
                      left: (brandPopoverPos && brandPopoverPos.left) || 0,
                      top: (brandPopoverPos && brandPopoverPos.top) || 0,
                      transform: (brandPopoverPos && brandPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      // Tighter top and bottom padding to pull content higher and tighten bottom
                      padding: '8px 14px 10px 14px', borderRadius: 14,
                      background: 'rgba(3,10,20,0.9)',
                      border: '1px solid rgba(242,239,29,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(242,239,29,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#F2EF1D',
                      zIndex: 2147483647,
                      width: (brandPopoverPos && brandPopoverPos.width) ? brandPopoverPos.width : 'min(92vw, 520px)',
                      maxHeight: '75vh',
                      display: 'flex',
                      flexDirection: 'column',
                      // Allow inner child to be the scroll container
                      minHeight: 0
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowBrandPopover(false); } }}
                  >
                    {/* Obvious yellow close button in the top-right corner */}
                    <button
                      aria-label="Close CHXNDLER"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(242,239,29,0.95), 0 0 42px rgba(242,239,29,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(242,239,29,0.75), 0 0 32px rgba(242,239,29,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowBrandPopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(242,239,29,0.85)',
                        color: '#F2EF1D',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(242,239,29,0.75), 0 0 32px rgba(242,239,29,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {/* Removed top CHXNDLER logo per request */}
                    {/* Brand photo near the top; reduce top margin to move higher */}
                    <div style={{ margin: '0 0 8px 0' }}>
                      <img
                        src="/chxndler-picture.png"
                        alt="CHXNDLER"
                        style={{
                          display: 'block',
                          // Slightly smaller than full width and centered
                          width: '92%',
                          margin: '0 auto',
                          height: 'auto',
                          borderRadius: 10,
                          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                          border: '1px solid rgba(242,239,29,0.35)'
                        }}
                      />
                    </div>
                    {/* Scrollable content area */}
                    <div
                      className="holo-scrollbar-yellow"
                      ref={brandScrollRef}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                        touchAction: 'pan-y'
                      }}
                      tabIndex={0}
                    >
                      {brandLoading ? (
                        <div style={{ fontSize: 16, opacity: .99, color: '#F2EF1D', textShadow: '0 0 4px rgba(242,239,29,0.8), 0 0 8px rgba(242,239,29,0.4)' }}>Loading…</div>
                      ) : brandError ? (
                        <div style={{ fontSize: 16, color: '#ff7b7b' }}>{brandError}</div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 16, color: '#F2EF1D', textShadow: '0 0 3px rgba(242,239,29,0.85), 0 0 6px rgba(242,239,29,0.35)' }}>{brandContent || ''}</div>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}
                </div>
                {/* Waveform visualization (moved below controls and aligned left) */}
                <div className="basis-full flex justify-start" style={{ marginTop: -2 }}>
                  <div 
                    className="waveform-container"
                    onClick={handleProgressClick}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const hoverX = e.clientX - rect.left;
                      const hoverPercentage = (hoverX / rect.width) * 100;
                      e.currentTarget.style.setProperty('--hover-position', `${hoverPercentage}%`);
                    }}
                    style={{
                      // Get current song's element color for border styling
                      border: `1px solid ${(() => {
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementColor = currentSong?.color || '#19E3FF';
                        const r = parseInt(elementColor.slice(1, 3), 16);
                        const g = parseInt(elementColor.slice(3, 5), 16);
                        const b = parseInt(elementColor.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, 0.2)`;
                      })()}`,
                      width: '100%',
                      maxWidth: 420,
                      minWidth: 240,
                      // Create internal gap below waveform within blue player by using margin
                      marginBottom: 6,
                    }}
                    onMouseEnter={(e) => {
                      try { sfx.play('hover', 0.35); } catch {}
                      const currentSong = resolvedSongs.find(s => s.id === active);
                      const elementColor = currentSong?.color || '#19E3FF';
                      const r = parseInt(elementColor.slice(1, 3), 16);
                      const g = parseInt(elementColor.slice(3, 5), 16);
                      const b = parseInt(elementColor.slice(5, 7), 16);
                      e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                      e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
                      e.currentTarget.style.boxShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      const currentSong = resolvedSongs.find(s => s.id === active);
                      const elementColor = currentSong?.color || '#19E3FF';
                      const r = parseInt(elementColor.slice(1, 3), 16);
                      const g = parseInt(elementColor.slice(3, 5), 16);
                      const b = parseInt(elementColor.slice(5, 7), 16);
                      e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                      e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* SVG Waveform using smooth curves */}
                    <svg 
                      className="w-full h-full" 
                      viewBox="0 0 400 32" 
                      preserveAspectRatio="none"
                      style={{ background: 'transparent' }}
                    >
                      {/* Background grid for audio visualization */}
                      <defs>
                        {(() => {
                          // Get current song's element color
                          const currentSong = resolvedSongs.find(s => s.id === active);
                          const elementColor = currentSong?.color || '#19E3FF'; // fallback to default cyan
                          
                          // Convert hex to rgba for gradients
                          const hexToRgba = (hex, alpha) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };
                          
                          return (
                            <>
                              <pattern id="audio-grid" width="10" height="5" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 5" fill="none" stroke={hexToRgba(elementColor, 0.08)} strokeWidth="0.3"/>
                              </pattern>
                              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={hexToRgba(elementColor, 0.8)}/>
                                <stop offset="50%" stopColor={hexToRgba(elementColor, 1)}/>
                                <stop offset="100%" stopColor={hexToRgba(elementColor, 0.8)}/>
                              </linearGradient>
                              <linearGradient id="unplayedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={hexToRgba(elementColor, 0.25)}/>
                                <stop offset="50%" stopColor={hexToRgba(elementColor, 0.35)}/>
                                <stop offset="100%" stopColor={hexToRgba(elementColor, 0.25)}/>
                              </linearGradient>
                            </>
                          );
                        })()}
                      </defs>
                      <rect width="100%" height="100%" fill="url(#audio-grid)" />
                      
                      {/* Generate realistic sound wave data */}
                      {(() => {
                        // Create consistent waveform based on current song
                        const seed = (active || 'default').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                        const waveformData = Array.from({ length: 200 }, (_, i) => {
                          // Create realistic audio frequency components
                          const bassLine = Math.sin((i + seed) * 0.02) * 0.4;           // Bass frequencies
                          const melody = Math.sin((i + seed) * 0.08 + 2) * 0.3;         // Mid frequencies  
                          const percussion = Math.sin((i + seed) * 0.2 + 4) * 0.25;     // High frequencies
                          const vocals = Math.sin((i + seed) * 0.12 + 1) * 0.35;        // Vocal range
                          const harmonics = Math.sin((i + seed) * 0.4 + 5) * 0.15;      // Harmonics
                          
                          // Create natural audio envelope (songs typically start/end quieter)
                          const fadeIn = Math.min(1, i / 15);
                          const fadeOut = Math.min(1, (200 - i) / 25);
                          const envelope = Math.min(fadeIn, fadeOut);
                          
                          // Add musical dynamics
                          const dynamics = Math.sin((i / 200) * Math.PI * 2.5) * 0.4 + 0.6;
                          
                          // Combine all elements for realistic audio appearance
                          const amplitude = Math.abs(bassLine + melody + percussion + vocals + harmonics) * envelope * dynamics;
                          
                          return Math.max(0.05, Math.min(0.9, amplitude));
                        });
                        
                        // Use live audio values for perfect sync with cursor overlay
                        const a = liveAudioRef.current;
                        const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                        const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                        const progressRatio = liveDur > 0 ? (liveTime / liveDur) : 0;
                        const progressX = progressRatio * 400;
                        
                        return (
                          <>
                            {/* Unplayed waveform */}
                            <path
                              d={`M 0 16 ${waveformData.map((amp, i) => {
                                const x = (i / (waveformData.length - 1)) * 400;
                                const y1 = 16 - (amp * 12); // Top of wave
                                const y2 = 16 + (amp * 12); // Bottom of wave
                                return `L ${x} ${y1} L ${x} ${y2}`;
                              }).join(' ')} L 400 16`}
                              fill="none"
                              stroke="url(#unplayedGradient)"
                              strokeWidth="1.5"
                              opacity="0.7"
                            />
                            
                            {/* Played portion of waveform with enhanced glow */}
                            <clipPath id="playedClip">
                              <rect x="0" y="0" width={progressX} height="32" />
                            </clipPath>
                            <path
                              d={`M 0 16 ${waveformData.map((amp, i) => {
                                const x = (i / (waveformData.length - 1)) * 400;
                                const y1 = 16 - (amp * 12);
                                const y2 = 16 + (amp * 12);
                                return `L ${x} ${y1} L ${x} ${y2}`;
                              }).join(' ')} L 400 16`}
                              fill="none"
                              stroke="url(#waveGradient)"
                              strokeWidth="2"
                              opacity="1"
                              clipPath="url(#playedClip)"
                              style={{
                                filter: 'drop-shadow(0 0 4px rgba(25,227,255,0.6))',
                              }}
                            />
                            
                            {/* Current position indicator */}
                            {progressRatio > 0 && (() => {
                              // Get current song's element color for progress indicator
                              const currentSong = resolvedSongs.find(s => s.id === active);
                              const elementColor = currentSong?.color || '#19E3FF';
                              
                              // Convert hex to rgba
                              const hexToRgba = (hex, alpha) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                              };
                              
                              return (
                                <g>
                                  {/* Progress dot and pulse removed: element icon now serves as the playhead */}
                                </g>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </svg>
                    
                    {/* Element icon cursor positioned above progress */}
                      <div
                        className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none z-10 hud-cursor-transition"
                        style={{
                          left: `${(() => {
                          // Prefer live audio element values; fall back to local state
                          const a = liveAudioRef.current;
                          const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                          const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                          const progressPercent = liveDur > 0 ? (liveTime / liveDur) * 100 : 0;
                          const leftPos = Math.max(0, Math.min(100, progressPercent));

                          // Debug logging for cursor movement
                          if (playing && liveTime > 0 && DEBUG_MEDIA) {
                            dlog('🎯 HUDPanel Cursor Position:', {
                              usingLive: !!a,
                              progress: liveTime.toFixed(3),
                              duration: liveDur.toFixed(3),
                              progressPercent: progressPercent.toFixed(3),
                              leftPos: leftPos.toFixed(3),
                              playing
                            });
                          }

                          return leftPos;
                        })()}%`,
                        transform: 'translateX(-50%)',
                        width: '32px',
                        // Remove transition while playing to avoid cursor lagging behind
                        transition: playing ? 'none' : 'left 0.25s ease',
                        willChange: 'left',
                      }}
                    >
                      {/* Element icon at cursor position */}
                      {(() => {
                        // Use CHXNDLER element when in home mode (no specific song selected)
                          if (!currentId) {
                            const elementIcon = 'chxndler';
                            const elementColor = '#19E3FF';
                          
                          // Convert hex to rgba
                          const hexToRgba = (hex, alpha) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };
                          
                            return (
                              <img
                                src={`/elements/${elementIcon}.png`}
                                alt="CHXNDLER element"
                                className="brightness-150 saturate-125"
                                style={{
                                  width: '1.8rem',
                                  height: '1.8rem',
                                  filter: `drop-shadow(0 0 14px ${hexToRgba(elementColor, 1)}) drop-shadow(0 0 32px ${hexToRgba(elementColor, 0.8)}) drop-shadow(0 0 64px ${hexToRgba(elementColor, 0.35)})`,
                                }}
                                onError={(e) => {
                                  e.target.src = '/elements/music.png';
                                  try { e.target.style.filter = 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))'; } catch {}
                                }}
                              />
                            );
                          }
                        
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementIcon = currentSong?.icon;
                        const elementColor = currentSong?.color || '#19E3FF';
                        if (!elementIcon) return null;
                        
                        // Convert hex to rgba
                        const hexToRgba = (hex, alpha) => {
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };
                        
                          return (
                            <img
                              src={`/elements/${elementIcon}.png`}
                              alt={`${currentSong?.title || 'Current song'} element`}
                              className="brightness-150 saturate-125"
                              style={{
                                width: '1.8rem',
                                height: '1.8rem',
                                filter: elementIcon === 'music'
                                  ? 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))'
                                  : `drop-shadow(0 0 14px ${hexToRgba(elementColor, 1)}) drop-shadow(0 0 32px ${hexToRgba(elementColor, 0.8)}) drop-shadow(0 0 64px ${hexToRgba(elementColor, 0.35)})`,
                              }}
                              onError={(e) => {
                                e.target.src = '/elements/music.png';
                                try { e.target.style.filter = 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))'; } catch {}
                              }}
                            />
                          );
                        })()}
                      </div>
                  </div>
                </div>
                
                {/* Time display */}
              </div>
            </div>
          </div>
        </div>

        {/* Song selector positioned outside content opacity container to avoid beamOnly blocking */}
        <div className="absolute" style={{ 
          left: inConsole ? 6 : 8, 
          bottom: 'calc(80px - 24px + 44px)', // Move dropdown very slightly lower (-4px)
          // Reserve dynamic space to the right so the dropdown never overlaps the cover
          right: oneLinerRight + 4, // Slightly wider than current (~8px wider)
          maxWidth: 'none',
          zIndex: 99999,  // Highest z-index to ensure it's above everything
          pointerEvents: 'auto', // Explicitly enable pointer events
          position: 'absolute' // Explicit positioning to avoid any layout conflicts
        }}>
            <SongDropdown
              items={resolvedSongs}
              initialActiveId={active || resolvedSongs[0]?.id}
              currentId={currentId}
              onChange={(id) => {
                setActive(id);

                // Focus the selected planet immediately in the HUD
                try {
                  playerStore.getState().setMain(id, true);
                  playerStore.getState().setPlanetDisplayMode('single');
                  playerStore.getState().setPlanetsVisible(true);
                  console.log('🎵 HUDPanel: Focused main planet', id);
                } catch (error) {
                  console.error('Failed to focus planet:', error);
                }

                // Stop ambient space music when switching songs
                try {
                  const ambient = document.querySelector('audio[data-ambient="1"]');
                  if (ambient) {
                    ambient.pause();
                    ambient.currentTime = 0;
                  }
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to stop ambient audio', error);
                }
                // Also stop welcome VO immediately if present
                try {
                  const intro = document.querySelector('audio[data-intro="1"]');
                  if (intro) {
                    intro.pause();
                    intro.currentTime = 0;
                  }
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to stop intro VO', error);
                }
                
                onSongChange?.(id);
                // Stay in place; DashboardApp.onSongChange handles switch without spotlight/route
              }}
            />
          </div>

      {/* styles moved to app/globals.css to avoid styled-jsx in this module */}
      {/* brand button styles moved to app/globals.css */}
      <audio ref={hoverCoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={clickCoverRef} src="/audio/click.mp3" preload="auto" />
      <audio ref={closeCoverRef} src="/audio/close.mp3" preload="auto" />
        </div>
      </motion.div>
      </div>

    </motion.section>
  );
}
