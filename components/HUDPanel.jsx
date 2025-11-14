/* @refresh skip */
"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import LoginModal from "@/components/LoginModal";
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
const DEFAULT_COVER = 'https://ik.imagekit.io/CHXNDLER/cover/chxndler.png?updatedAt=1762361376662';
const DEFAULT_CARD = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910';
const FALLBACK_COVER = 'https://ik.imagekit.io/CHXNDLER/cover/chxndler.png?updatedAt=1762361376662';

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
  // Temporary kill-switch to disable 3D planets for performance testing
  // Set to true to disable. You can also override at runtime by setting
  // localStorage.DISABLE_3D_PLANETS = '0' and refreshing.
  const DISABLE_3D_PLANETS_DEFAULT = true;
  const disable3DPlanets = (() => {
    try {
      if (typeof window !== 'undefined') {
        const ls = window.localStorage.getItem('DISABLE_3D_PLANETS');
        if (ls === '0') return false;
        if (ls === '1') return true;
      }
    } catch {}
    return DISABLE_3D_PLANETS_DEFAULT;
  })();
  /* debug removed */ ({ 
    currentId, 
    showAll: !currentId, 
    songsLength: songs?.length, 
    trackTitle: track?.title 
  });
  
  const hoverCoverRef = useRef(null);
  const clickCoverRef = useRef(null);
  const closeCoverRef = useRef(null);
  const [active, setActive] = useState((songs && songs[0]?.id) || undefined);
  const [loginOpen, setLoginOpen] = useState(false);
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
  const STORE_POPOVER_Y_OFFSET = -190; // move popover down slightly
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

  // HEART coin tiers popout
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const heartBtnRef = useRef(null);
  const [heartPopoverPos, setHeartPopoverPos] = useState(null);
  // Selected HEART tier details view (null shows tier cards)
  const [heartTierDetails, setHeartTierDetails] = useState(null);
  // Wanderer flip state within HEART popover (circular button flip like store items)
  const [wandererFlipped, setWandererFlipped] = useState(false);
  const [wandererHovered, setWandererHovered] = useState(false);
  // Dreamer/Lover flip + hover state to match Wanderer behavior
  const [dreamerFlipped, setDreamerFlipped] = useState(false);
  const [dreamerHovered, setDreamerHovered] = useState(false);
  const [loverFlipped, setLoverFlipped] = useState(false);
  const [loverHovered, setLoverHovered] = useState(false);
  // Position heart popover similar to lyrics popover
  const HEART_POPOVER_Y_OFFSET = -40;

  // SOFIA element badge (left of SOFIA in HEART popover header)
  const [sofiaElement, setSofiaElement] = useState('water');
  const [sofiaPickerOpen, setSofiaPickerOpen] = useState(false);
  const sofiaGroupRef = useRef(null);
  const SOFIA_ELEMENT_LS_KEY = 'sofia:element';
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(SOFIA_ELEMENT_LS_KEY);
        if (saved) setSofiaElement(saved);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SOFIA_ELEMENT_LS_KEY, String(sofiaElement));
      }
    } catch {}
  }, [sofiaElement]);
  useEffect(() => {
    if (!sofiaPickerOpen) return;
    const onDocClick = (e) => {
      try {
        if (!sofiaGroupRef.current) return;
        if (!sofiaGroupRef.current.contains(e.target)) setSofiaPickerOpen(false);
      } catch {}
    };
    const onKey = (e) => { if (e.key === 'Escape') setSofiaPickerOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [sofiaPickerOpen]);

  const openHeartPopover = () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = heartBtnRef.current?.getBoundingClientRect?.();
      const wrapper = innerRef.current?.parentElement || null; // outer HUD blue display wrapper (padding box)
      if (wrapper && typeof window !== 'undefined') {
        const rect = wrapper.getBoundingClientRect();
        const cs = window.getComputedStyle(wrapper);
        const pl = parseFloat(cs.paddingLeft || '0') || 0;
        const pr = parseFloat(cs.paddingRight || '0') || 0;
        let leftEdge = rect.left + pl;
        let rightEdge = rect.right - pr;
        // Very slightly wider than the blue display on both sides (match lyrics)
        const HORIZONTAL_EXPAND = 12;
        leftEdge = Math.max(8, leftEdge - HORIZONTAL_EXPAND);
        rightEdge = Math.min((typeof window !== 'undefined' ? window.innerWidth : rightEdge), rightEdge + HORIZONTAL_EXPAND) - 8 + 8;
        const width = Math.max(0, rightEdge - leftEdge);
        // Match lyrics: bring top down to shorten popover height
        const TOP_INSET = 136;
        let top = rect.top + TOP_INSET;
        top = Math.max(8, top);
        const height = Math.max(100, rect.height - TOP_INSET);
        setHeartPopoverPos({ left: leftEdge, top, width, height });
      } else if (r) {
        let top = r.bottom + 8 + HEART_POPOVER_Y_OFFSET;
        top = Math.max(8, top);
        let height = Math.max(240, Math.min(560, (typeof window !== 'undefined' ? window.innerHeight * 0.46 : 340)));
        setHeartPopoverPos({ left: r.left + r.width/2, top, height });
      }
    } catch {}
    setHeartTierDetails(null);
    setShowHeartPopover(true);
  };

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
      price: '$5',
      description: 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.'
    },
    {
      id: 'patch',
      title: 'PATCH',
      image: '/store/patch.png',
      url: 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C',
      price: '$5',
      description: 'Stitch this into your world as a quiet reminder that this isn’t just music, it’s a community.'
    },
    {
      id: 'necklace',
      title: 'NECKLACE',
      image: '/store/necklace.png',
      url: 'https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K',
      price: '$15',
      description: 'A symbol of love, connection, and everything this world stands for. It’s a keepsake for the people who found home here.'
    },
    {
      id: 'beanie',
      title: 'BEANIE',
      image: '/store/beanie-front.png',
      url: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
      price: '$30',
      description: 'For the ones who wear their hearts out loud and aren’t afraid to stand out.'
    },
    {
      id: 'sticker',
      title: 'STICKER',
      image: '/store/sticker.png',
      url: 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F',
      price: '$5',
      description: 'A simple reminder that you’re part of something bigger. Remember you’re not alone in this story.'
    },
    {
      id: 'hat',
      title: 'HAT',
      image: '/store/hat.png',
      url: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
      price: '$25',
      description: 'A classic you’ll wear everywhere. It’s lowkey, but it says everything it needs to.'
    },
    {
      id: 'button',
      title: 'BUTTON',
      image: '/store/button.png',
      url: 'https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J',
      price: '$5',
      description: 'A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.'
    },
    {
      id: 'keychain',
      title: 'KEYCHAIN',
      image: '/store/keychain.png',
      url: 'https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H',
      price: '$5',
      description: 'A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you’re connected, always.'
    },
    {
      id: 'pick',
      title: 'PICK',
      image: '/store/pick.png',
      url: 'https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O',
      price: '5',
      description: 'A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.'
    },
    {
      id: 'bracelet',
      title: 'BRACELET',
      image: '/store/bracelet.png',
      url: 'https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N',
      price: '10',
      description: 'A HEARTVERSE charm that connects you to the Aliens who feel deeply and walk the world with open hearts.'
    },
    {
      id: 'house-party-poster',
      title: 'HOUSE PARTY POSTER',
      image: '/store/house-party-poster.png',
      url: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
      price: '$25',
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
    document.addEventListener('touchstart', onDocDown, { passive: true });
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

  // Recalculate HEART coin popover alignment on resize while open
  useEffect(() => {
    if (!showHeartPopover) return;
    const recalc = () => {
      try {
        const wrapper = innerRef.current?.parentElement || null;
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
          const TOP_INSET = 136;
          let top = rect.top + TOP_INSET;
          top = Math.max(8, top);
          const height = Math.max(100, rect.height - TOP_INSET);
          setHeartPopoverPos({ left: leftEdge, top, width, height });
        }
      } catch {}
    };
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [showHeartPopover]);

  // Close HEART coin popover on outside click / Escape
  useEffect(() => {
    if (!showHeartPopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = heartBtnRef.current && t && heartBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="HEARTVERSE TIERS"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowHeartPopover(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHeartPopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHeartPopover]);

  // Reset HEART popover UI state when closing
  useEffect(() => {
    if (!showHeartPopover) {
      try { setHeartTierDetails(null); } catch {}
      try { setWandererFlipped(false); setWandererHovered(false); } catch {}
    }
  }, [showHeartPopover]);

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
    document.addEventListener('touchstart', onDocDown, { passive: true });
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
    document.addEventListener('touchstart', onDocDown, { passive: true });
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
      
      // Load saved volume only for the main player (not ambient on homepage)
      // Avoid overwriting ambient space-music volume with a previously saved main-player value (often 0)
      try {
        const isAmbient = a && a.getAttribute('data-ambient') === '1';
        if (!isAmbient) {
          const saved = (typeof window !== 'undefined') ? localStorage.getItem(VOLUME_STORAGE_KEY) : null;
          if (saved != null) {
            const v = parseFloat(saved);
            if (!isNaN(v) && v >= 0 && v <= 1) {
              a.volume = v;
              setVolume(v);
              if (v > 0) lastNonZeroVolumeRef.current = v;
            }
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

  // Persist volume to localStorage when it changes, but ONLY for the main player.
  // Avoid saving ambient (space-music.mp3) fades to 0 which would mute the main player later.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const a = liveAudioRef.current;
      const isAmbient = !!(a && a.getAttribute && a.getAttribute('data-ambient') === '1');
      if (!isAmbient) {
        localStorage.setItem(
          VOLUME_STORAGE_KEY,
          String(Math.max(0, Math.min(1, volume)))
        );
      }
    } catch {}
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
    document.addEventListener('touchstart', onDocDown, { passive: true });
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
              ? { width: '100%', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 0, willChange: 'opacity, transform', contain: 'layout paint', backfaceVisibility: 'hidden' }
              : { transform: 'perspective(1200px) rotateX(6deg)', marginTop: 0, willChange: 'opacity, transform', contain: 'layout paint', backfaceVisibility: 'hidden' }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl ${inConsole ? 'p-2' : 'p-4'}`} style={{
          background: 'transparent',
          boxShadow: 'none',
          willChange: 'opacity, transform',
          contain: 'layout paint'
        }}>
          {/* Overlay frame to visually lower the blue panel top to match song listing */}
          <div
            className="absolute inset-x-0 rounded-2xl pointer-events-none"
            style={{
              bottom: 0,
              // Raise the top edge further for a taller dashboard (bottom unchanged)
              top: `calc(var(--hud-y, 0px) + ${inConsole ? 92 : 112}px)`,
              // Keep the overlay subtle but with a touch more blue
              background: 'linear-gradient(180deg, rgba(25,227,255,0.08), rgba(25,227,255,0.04))',
              // Constrain glow inside the blue display bounds and keep it soft
              boxShadow: 'inset 0 0 40px rgba(25,227,255,0.16), inset 0 0 80px rgba(25,227,255,0.10)',
              border: '1px solid rgba(25,227,255,0.45)'
            }}
            aria-hidden
          />
          {/* 3D planets — align to full blue display width (outside inner padding) */}
          {!disable3DPlanets && (
          <div
            ref={planetRef}
            className="absolute inset-x-0"
            // Position 3D display higher within blue HUD area; allow only top bleed on homepage
            style={{ 
              // Fade only the 3D layer when beam-only mode is active
              opacity: contentOpacity,
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
          )}
          {/* Background removed for transparent HUD */}
          {/* Cover art moved into right column above the song list */}
          {/* Holographic beam overlays removed */}
          {/* Bloom layers removed */}
          <div
              className={`relative ${inConsole ? 'p-2' : 'p-4'}`}
              style={{ 
                // Keep this wrapper always visible so cover art never flashes with 3D
                opacity: 1, 
                transition: 'opacity 240ms ease', 
                pointerEvents: 'auto', 
                minHeight: inConsole ? 380 : 480,
                width: '100%',
                height: '100%',
                // Allow hover-scaled UI (e.g., CHXNDLER button) to extend visually
                // beyond this wrapper without being clipped. Individual children
                // like the cover art still manage their own overflow.
                overflow: 'visible',
                // Create an isolated stacking context to prevent compositing flicker on iOS
                isolation: 'isolate',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)'
              }}
              ref={innerRef}
            >


          
          {/* Cover section at bottom right corner - using CoverHologram for pop-out functionality */}
          <div ref={coverRef} className="absolute hud-cover-pos" style={{ 
            // Align flush to the right and sit at the bottom edge
            bottom: 0, 
            right: 0, 
            width: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-end',
            // Slightly larger gap so the button isn't attached to the cover
            gap: 4,
            justifyContent: 'flex-end',
            // Stabilize rendering on iOS Safari to prevent flicker when repainting
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            willChange: 'auto',
            // Keep layout containment without clipping painted children
            contain: 'layout',
            // Allow the brand button to render outside its normal box (no cutoffs)
            overflow: 'visible',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            // Ensure this sits above the 3D planet layer
            zIndex: 5
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
                // Adjust vertical alignment to match the Music dropdown height
                marginTop: -3,
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
              // On homepage (no currentId), always show the CHXNDLER brand cover
              if (!currentId) {
                const src = DEFAULT_COVER;
                const title = 'CHXNDLER';
                const trackingSong = 'chxndler_home';
                return (
                  <div
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                    style={{ pointerEvents: joinAlienOpen ? 'none' : 'auto', overflow: 'visible' }}
                  >
                    <CoverHologram src={src} title={title} slug={trackingSong} inline={true} size={92} />
                  </div>
                );
              }
              // When a track is selected, show only if it has an explicit cover
              if (track && track.cover) {
                const src = track.cover;
                const title = track?.title || 'Unknown';
                const trackingSong = (track?.slug || active || 'unknown');
                return (
                  <div
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                    style={{ pointerEvents: joinAlienOpen ? 'none' : 'auto', overflow: 'visible' }}
                  >
                    <CoverHologram src={src} title={title} slug={trackingSong} inline={true} size={92} />
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Waveform Media Player - positioned below dropdown with proper spacing */}
          <div ref={playerRef} className="absolute" style={{ 
            left: inConsole ? 0 : 2, // Shift very slightly more to the left
            right: oneLinerRight - 4, // Extend 4px further to the right
            // Adjust height to allow internal bottom buffer
            height: '60px',
            // Keep player snug to the blue display; slightly lower
            // Move the visual nudge into the bottom offset so it stays inside the overflow-hidden blue display
            bottom: 'calc(var(--hud-player-bottom-offset, 0px) + 6px)'
          }}>
            <div className="hud-waveform-player" style={{ margin: 0, borderRadius: '10px', paddingBottom: 6 }}>
              <div className="flex flex-wrap items-start gap-3 pt-0 pr-2 pl-2 pb-0">
                <div className="controls-row flex items-start justify-start gap-4 w-full" style={{ paddingTop: 4 }}>
                <div className="hud-main-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                {/* Top controls: Play/Pause with Lyrics immediately to the right */}
                {(() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const slug = isHome ? 'homepage' : (currentSong?.id || '');
                  const hasLyrics = isHome ? true : !!(currentSong && (currentSong.hasLyrics !== false));
                  const lyricsTitle = isHome ? 'Lyrics for CHXNDLER' : `Lyrics for ${currentSong?.title || 'current track'}`;
                  const lyricsAria = isHome ? 'View lyrics for CHXNDLER' : `View lyrics for ${currentSong?.title || 'current track'}`;
                  return (
                    <div className="hud-top-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      {hasLyrics ? (
                        <button
                          ref={lyricsBtnRef}
                          type="button"
                          className="hud-lyrics-btn"
                          style={{ marginTop: 1 }}
                          title={lyricsTitle}
                          aria-label={lyricsAria}
                          data-id="lyrics"
                          data-song={isHome ? 'CHXNDLER' : (currentSong?.title || '')}
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
                      ) : (
                        <div
                          className="lyrics-btn-unavailable-hud"
                          style={{ marginTop: 1 }}
                          title={`Lyrics not available for ${currentSong?.title || 'current track'}`}
                          aria-disabled="true"
                          data-id="lyrics"
                          data-song={currentSong?.title || ''}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                            <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                            <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                            <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                            <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                          </svg>
                        </div>
                      )}
                      {/* Store (gem) button placed to the right of Lyrics */}
                      <button
                        type="button"
                        ref={storeBtnRef}
                        className="gem-btn-waveform-hud"
                        style={{ marginTop: 1 }}
                        title="Open Store"
                        data-id="store"
                        data-song={isHome ? 'CHXNDLER' : (currentSong?.title || '')}
                        aria-haspopup="dialog"
                        aria-expanded={showStorePopover}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onClick={() => {
                          try {
                            const songSlug = isHome ? 'homepage' : (slug || active || 'unknown');
                            const songTitle = isHome ? 'CHXNDLER' : (currentSong?.title || track?.title || 'Unknown');
                            trackAnalytics('store_button_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, location: isHome ? 'hud_store_button_home' : 'hud_store_button' } });
                          } catch {}
                          if (showStorePopover) { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); return; }
                          openStorePopover();
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="currentColor"
                          aria-hidden
                          style={{
                            display: 'block',
                            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.85)) drop-shadow(0 0 16px rgba(255,255,255,0.55))'
                          }}
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.61C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                      {/* HEART coin button to the right of Store */}
                      <button
                        type="button"
                        ref={heartBtnRef}
                        className="heart-coin-btn-waveform-hud"
                        style={{ marginTop: 1 }}
                        title="HEART Coin"
                        aria-label="HEART Coin"
                        data-id="heart-coin"
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onClick={() => {
                          try { sfx.play('click', 0.4); } catch {}
                          try {
                            const songSlug = isHome ? 'homepage' : (slug || active || 'unknown');
                            const songTitle = isHome ? 'CHXNDLER' : (currentSong?.title || track?.title || 'Unknown');
                            trackAnalytics('heart_coin_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, location: isHome ? 'hud_heart_coin_home' : 'hud_heart_coin' } });
                          } catch {}
                          if (showHeartPopover) { setShowHeartPopover(false); return; }
                          openHeartPopover();
                        }}
                      >
                        <img src="/elements/heart-coin.png" alt="HEART Coin" />
                      </button>

                      {/* Streaming: Spotify, Apple, YouTube moved left into top controls */}
                      {(() => {
                        const spotifyUrl = currentSong?.spotify;
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
                        }
                        return (
                          <div className="spotify-btn-unavailable-hud" style={{ marginTop: 1 }} title={(!currentId) ? 'Spotify not available on homepage' : `No Spotify link available for ${currentSong?.title || 'current track'}`}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.5">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </div>
                        );
                      })()}

                      {(() => {
                        const appleUrl = currentSong?.apple;
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
                              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" role="img" aria-label="Music notes" style={{ display: 'block' }}>
                                <ellipse cx="7.5" cy="18.2" rx="3.2" ry="3.4" />
                                <ellipse cx="16.5" cy="16" rx="3.2" ry="3.4" />
                                <rect x="9" y="6" width="2" height="11" rx="1" />
                                <rect x="18" y="4" width="2" height="11" rx="1" />
                                <path d="M11 6 L20 4 L20 6.5 L11 8.5 Z" />
                              </svg>
                            </a>
                          );
                        }
                        return (
                          <div className="apple-btn-unavailable-hud" style={{ marginTop: 1 }} title={(!currentId) ? 'Apple Music not available on homepage' : `No Apple Music link available for ${currentSong?.title || 'current track'}`}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" role="img" aria-label="Music notes" style={{ display: 'block' }}>
                              <ellipse cx="7.5" cy="18.2" rx="3.2" ry="3.4" />
                              <ellipse cx="16.5" cy="16" rx="3.2" ry="3.4" />
                              <rect x="9" y="6" width="2" height="11" rx="1" />
                              <rect x="18" y="4" width="2" height="11" rx="1" />
                              <path d="M11 6 L20 4 L20 6.5 L11 8.5 Z" />
                            </svg>
                          </div>
                        );
                      })()}

                      {(() => {
                        if (!currentId) {
                          return (
                            <div className="youtube-btn-unavailable-hud" title="YouTube not available on homepage" style={{ marginTop: 1 }}>
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                                <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                              </svg>
                            </div>
                          );
                        }
                        if (!currentSong?.youtube) {
                          return (
                            <div className="youtube-btn-unavailable-hud" title={`No YouTube link available for ${currentSong?.title || 'current track'}`} style={{ marginTop: 1 }}>
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                                <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                              </svg>
                            </div>
                          );
                        }
                        return (
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
                            onClick={(e) => {
                              try { e.preventDefault(); } catch {}
                              try { sfx.play('join-aliens', 0.9); } catch {}
                              try {
                                const { toYouTubeEmbed } = require('@/lib/youtube');
                                const embed = toYouTubeEmbed(currentSong.youtube);
                                if (embed) { setYtEmbedUrl(embed); setShowYouTubePopover(true); }
                                else { window.open(currentSong.youtube, '_blank', 'noopener,noreferrer'); }
                              } catch {
                                try { window.open(currentSong.youtube, '_blank', 'noopener,noreferrer'); } catch {}
                              }
                            }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M10 8l6 4-6 4z" />
                            </svg>
                          </a>
                        );
                      })()}
                      {/* Removed duplicate HEART coin button placed after YouTube */}
                    </div>
                  );
                })()}
                {/* Volume + Waveform row directly under Play/Pause */}
                <div className="hud-volume-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div 
                    className="hud-volume"
                    role="group" 
                    aria-label="Volume"
                    ref={hudVolRef}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}
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
                  </div>
                  {/* Compact waveform placed directly to the right of Volume */}
                  <div className="hud-mini-wave flex items-center" style={{ marginTop: 2 }}>
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
                        position: 'relative',
                        border: `1px solid ${(() => {
                          const currentSong = resolvedSongs.find(s => s.id === active);
                          const elementColor = currentSong?.color || '#19E3FF';
                          const r = parseInt(elementColor.slice(1, 3), 16);
                          const g = parseInt(elementColor.slice(3, 5), 16);
                          const b = parseInt(elementColor.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, 0.25)`;
                        })()}`,
                        width: 200,
                        height: 18,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.3)'
                      }}
                      onMouseEnter={(e) => {
                        try { sfx.play('hover', 0.3); } catch {}
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementColor = currentSong?.color || '#19E3FF';
                        const r = parseInt(elementColor.slice(1, 3), 16);
                        const g = parseInt(elementColor.slice(3, 5), 16);
                        const b = parseInt(elementColor.slice(5, 7), 16);
                        e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.45)`;
                        e.currentTarget.style.boxShadow = `0 0 10px rgba(${r}, ${g}, ${b}, 0.25)`;
                      }}
                      onMouseLeave={(e) => {
                        const currentSong = resolvedSongs.find(s => s.id === active);
                        const elementColor = currentSong?.color || '#19E3FF';
                        const r = parseInt(elementColor.slice(1, 3), 16);
                        const g = parseInt(elementColor.slice(3, 5), 16);
                        const b = parseInt(elementColor.slice(5, 7), 16);
                        e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <svg className="w-full h-full" viewBox="0 0 400 18" preserveAspectRatio="none" style={{ background: 'transparent' }}>
                        <defs>
                          {(() => {
                            const currentSong = resolvedSongs.find(s => s.id === active);
                            const elementColor = currentSong?.color || '#19E3FF';
                            const hexToRgba = (hex, alpha) => {
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                            };
                            return (
                              <>
                                <linearGradient id="miniUnplayed" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor={hexToRgba(elementColor, 0.25)} />
                                  <stop offset="50%" stopColor={hexToRgba(elementColor, 0.35)} />
                                  <stop offset="100%" stopColor={hexToRgba(elementColor, 0.25)} />
                                </linearGradient>
                                <linearGradient id="miniPlayed" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor={hexToRgba(elementColor, 0.8)} />
                                  <stop offset="50%" stopColor={hexToRgba(elementColor, 1)} />
                                  <stop offset="100%" stopColor={hexToRgba(elementColor, 0.8)} />
                                </linearGradient>
                              </>
                            );
                          })()}
                        </defs>
                        {(() => {
                          const currentSong = resolvedSongs.find(s => s.id === active);
                          const elementColor = currentSong?.color || '#19E3FF';
                          const a = liveAudioRef.current;
                          const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                          const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                          const progressRatio = liveDur > 0 ? (liveTime / liveDur) : 0;
                          const progressX = progressRatio * 400;
                          const centerY = 9; // half of 18
                          return (
                            <>
                              {/* Background track as a single faint line */}
                              <line x1="0" y1={centerY} x2="400" y2={centerY} stroke={elementColor} strokeWidth="1.2" opacity="0.45" />
                              {/* Played portion: multi-layer glow for brightness */}
                              <line x1="0" y1={centerY} x2={progressX} y2={centerY} stroke={elementColor} strokeWidth="10" opacity="0.16" strokeLinecap="round" />
                              <line x1="0" y1={centerY} x2={progressX} y2={centerY} stroke={elementColor} strokeWidth="6" opacity="0.28" strokeLinecap="round" />
                              <line x1="0" y1={centerY} x2={progressX} y2={centerY} stroke={elementColor} strokeWidth="2" opacity="0.98" strokeLinecap="round" />
                            </>
                          );
                        })()}
                      </svg>
                      {/* JOIN US button inside waveform container, neon pink, bottom-center */}
                      <button
                        type="button"
                        className="join-us-waveform-hud"
                        title="Join Us"
                        onClick={(e) => { e.stopPropagation(); try { sfx.play('click', 0.45); } catch {}; try { trackAnalytics('join_us_clicked', { location: 'hud_waveform' }); } catch {}; setLoginOpen(true); }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      >
                        JOIN US
                      </button>
                    </div>
                  </div>
                </div>
                </div>

                {/* Slide Lyrics, Store, and HEART coin to the left (before streaming icons) */}
                {(() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  if (isHome) {
                      // Homepage: lyrics popover for CHXNDLER + YouTube disabled
                      // Also show the Store (gem) button as ACTIVE on homepage
                      return (
                        <>
                          {/* Lyrics button moved next to Play/Pause in hud-top-controls */}
                          {/* Store button moved next to Lyrics in hud-top-controls */}
                          {/* HEART coin button moved next to Store in hud-top-controls */}
                        </>
                      );
                  }
                  const slug = currentSong?.id;
                  if (!slug) return null;
                  const hasLyrics = currentSong && (currentSong.hasLyrics !== false);
                  return (
                    <>
                      {/* Lyrics button moved next to Play/Pause in hud-top-controls */}
                      {/* Store button moved next to Lyrics in hud-top-controls */}
                      {/* HEART coin button moved next to Store in hud-top-controls */}
                    </>
                  );
                })()}
                {/* Streaming controls render in hud-top-controls above */}

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

                {typeof document !== 'undefined' && showHeartPopover && heartPopoverPos ? require('react-dom').createPortal(
                  <div
                    role="dialog"
                    aria-label="HEARTVERSE TIERS"
                    className="heart-hologram"
                    style={{
                      position: 'fixed',
                      left: (heartPopoverPos && heartPopoverPos.left) || 0,
                      top: (heartPopoverPos && heartPopoverPos.top) || 0,
                      transform: (heartPopoverPos && heartPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      padding: '14px 16px 16px 16px',
                      borderRadius: 14,
                      background: 'radial-gradient(140% 160% at 50% 0%, rgba(25,227,255,0.28), rgba(14,168,208,0.22) 35%, rgba(6,40,55,0.35) 100%)',
                      border: '1px solid rgba(25,227,255,0.45)',
                      boxShadow: '0 18px 46px rgba(0,0,0,0.35), 0 0 26px rgba(25,227,255,0.35)',
                      backdropFilter: 'blur(8px) saturate(1.15)',
                      color: '#fff',
                      zIndex: 2147483647,
                      width: (heartPopoverPos && heartPopoverPos.width) ? heartPopoverPos.width : 'min(98vw, 1400px)',
                      height: (heartPopoverPos && heartPopoverPos.height) ? heartPopoverPos.height : '42vh',
                      overflowY: 'hidden',
                      overflowX: 'hidden'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHeartPopover(false); } }}
                  >
                    {/* Close button in the top-right corner (pink accent) */}
                    <button
                      aria-label="Close"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(0,0,0,0.35)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = 'none'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowHeartPopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div style={{ paddingRight: 6, paddingTop: 0, marginTop: -8 }}>
                      {/* User summary above HEARTVERSE TIERS */}
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '4px 2px 10px 2px',
                          borderBottom: '1px solid rgba(252,84,175,0.25)'
                        }}
                      >
                        {/* Left: Element badge + SOFIA (with picker) */}
                        <div
                          ref={sofiaGroupRef}
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            marginLeft: 6
                          }}
                        >
                          {/* Clickable badge */}
                          <button
                            type="button"
                            aria-label="Change element"
                            onClick={() => { try { sfx.play('click', 0.4); } catch {}; setSofiaPickerOpen(v => !v); }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 9999,
                              background: 'radial-gradient(72% 72% at 30% 30%, rgba(25,227,255,0.28) 0%, rgba(25,227,255,0.08) 60%, rgba(25,227,255,0.04) 100%)',
                              border: '1px solid rgba(25,227,255,0.5)',
                              boxShadow: '0 0 12px rgba(25,227,255,0.5)',
                              backdropFilter: 'blur(2px)',
                              cursor: 'pointer',
                              transition: 'transform 120ms ease',
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <ElementIcon name={sofiaElement} size={18} glow={true} />
                          </button>
                          {/* SOFIA label */}
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              letterSpacing: '.02em',
                              color: '#FC54AF',
                              textShadow: '0 0 12px rgba(252,84,175,0.35)'
                            }}
                          >
                            SOFIA
                          </div>
                          {/* Small element picker popover */}
                          {sofiaPickerOpen ? (
                            <div
                              role="menu"
                              style={{
                                position: 'absolute',
                                top: 36,
                                left: 0,
                                display: 'inline-flex',
                                gap: 8,
                                padding: '6px 8px',
                                borderRadius: 10,
                                background: 'rgba(5,10,18,0.7)',
                                border: '1px solid rgba(25,227,255,0.25)',
                                boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 0 18px rgba(25,227,255,0.25)',
                                zIndex: 20,
                              }}
                            >
                              {['water','lightning','darkness','heart'].map((el) => (
                                <button
                                  key={el}
                                  role="menuitem"
                                  onClick={() => { try { sfx.play('click', 0.4); } catch {}; setSofiaElement(el); setSofiaPickerOpen(false); }}
                                  title={el}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius: 9999,
                                    border: `1px solid ${sofiaElement === el ? 'rgba(252,84,175,0.8)' : 'rgba(25,227,255,0.35)'}`,
                                    background: 'radial-gradient(72% 72% at 30% 30%, rgba(25,227,255,0.18) 0%, rgba(25,227,255,0.06) 60%, rgba(25,227,255,0.03) 100%)',
                                    boxShadow: sofiaElement === el ? '0 0 12px rgba(252,84,175,0.6)' : '0 0 8px rgba(25,227,255,0.3)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <ElementIcon name={el} size={16} glow={true} />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {/* Center: THE DREAMER */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: '.02em',
                            color: '#19E3FF',
                            textShadow: '0 0 14px rgba(25,227,255,0.5)'
                          }}
                        >
                          THE DREAMER
                        </div>
                        {/* Right: heart coin + 32 */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginRight: 20 }}>
                          <img
                            src="/elements/heart-coin.png"
                            alt="HEART Coin"
                            width={36}
                            height={36}
                            style={{ display: 'block', width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(252,84,175,0.45))' }}
                          />
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#d3168c' }}>32</span>
                        </div>
                      </div>
                      {/* Header / Hero */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 8px 2px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 13, opacity: 0.8 }}>Choose your path. Earn HEARTS. Unlock deeper access.</div>
                        </div>
                      </div>
                      
                      {/* Tiers: interactive cards or details view */}
                      {heartTierDetails ? (
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => { try { sfx.play('hover', 0.3); } catch {}; setHeartTierDetails(null); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 8,
                              padding: '6px 10px', borderRadius: 10,
                              background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)',
                              cursor: 'pointer', fontSize: 12
                            }}
                          >
                            <span aria-hidden>←</span>
                            <span>Back to tiers</span>
                          </button>
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div
                              style={{ fontSize: 16, fontWeight: 900, letterSpacing: '.02em' }}
                              className={heartTierDetails === 'wanderer' ? 'neon-blue' : heartTierDetails === 'dreamer' ? 'neon-yellow' : 'neon-pink'}
                            >
                              {heartTierDetails === 'wanderer' && 'The Wanderer (0–4 HEARTS)'}
                              {heartTierDetails === 'dreamer' && 'The Dreamer (5–24 HEARTS)'}
                              {heartTierDetails === 'lover' && 'The Lover (25+ HEARTS)'}
                            </div>
                            <div
                              style={{ fontSize: 12, opacity: 0.95 }}
                              className={heartTierDetails === 'wanderer' ? 'neon-blue' : heartTierDetails === 'dreamer' ? 'neon-yellow' : 'neon-pink'}
                            >
                              {heartTierDetails === 'wanderer' && 'You’ve just arrived in the Heartverse — drawn here by the signal.'}
                              {heartTierDetails === 'dreamer' && 'You’re part of the crew now — traveling through sound and starlight.'}
                              {heartTierDetails === 'lover' && 'You’ve reached the center — the pulse that powers it all.'}
                            </div>
                            <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 12, lineHeight: 1.45 }}>
                              {heartTierDetails === 'wanderer' && (
                                <>
                                  <li>Public songs</li>
                                  <li>Stories</li>
                                  <li>Your own Heartverse profile</li>
                                  <li><span style={{ fontWeight: 800 }}>Goal:</span> start collecting HEARTS and begin your journey.</li>
                                </>
                              )}
                              {heartTierDetails === 'dreamer' && (
                                <>
                                  <li><span style={{ fontWeight: 800 }}>Access:</span> hidden songs, early demos, private livestreams, exclusive CHXNDLER cards.</li>
                                  <li><span style={{ fontWeight: 800 }}>Goal:</span> keep exploring and deepen your connection.</li>
                                </>
                              )}
                              {heartTierDetails === 'lover' && (
                                <>
                                  <li><span style={{ fontWeight: 800 }}>Access:</span> The Vault, unreleased music, early merch drops, rare CHXNDLER cards.</li>
                                  <li><span style={{ fontWeight: 800 }}>Goal:</span> shape the future of the Heartverse.</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'stretch',
                            gap: 16
                          }}
                        >
                          {/* Wanderer - circular flip button (keeps shape, store-like animation) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Wanderer (0–4 HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.25); } catch {}; setWandererHovered(true); }}
                            onMouseLeave={() => { setWandererHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'wanderer', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'wanderer', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 128,
                              height: 128,
                              position: 'relative',
                              borderRadius: '50%',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(0,180,255,0.34), rgba(0,180,255,0.16) 46%, rgba(0,60,90,0.35) 100%)',
                              border: '2px solid rgba(0,180,255,0.85)',
                              boxShadow: wandererHovered ? '0 0 18px rgba(0,180,255,0.85), 0 0 36px rgba(0,180,255,0.55), inset 0 0 18px rgba(0,180,255,0.35)' : '0 0 10px rgba(0,180,255,0.65), 0 0 26px rgba(0,180,255,0.45), inset 0 0 12px rgba(0,180,255,0.25)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              perspective: 700,
                              transition: 'transform .12s ease, box-shadow .18s ease',
                              transform: wandererHovered ? 'translateZ(0) scale(1.05)' : 'none'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                transition: 'transform 0.7s ease-in-out',
                                transformStyle: 'preserve-3d',
                                transform: wandererFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                              }}
                            >
                              {/* Front */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {/* Wanderer icon (PNG) */}
                                <img
                                  src="/elements/the-wanderer.png"
                                  alt="The Wanderer"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(25,227,255,0.9)) drop-shadow(0 0 28px rgba(25,227,255,0.55))' }}
                                />
                                <div className="neon-blue" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em', color: '#19E3FF' }}>The Wanderer</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#19E3FF' }}>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                  <span className="neon-blue heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>0–4</span>
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                                <div style={{ textAlign: 'center', color: '#19E3FF' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-blue">You’ve just arrived — drawn by the signal.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 14, textAlign: 'left', margin: '6px auto 0', width: '90%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>Public songs</li>
                                    <li>Stories</li>
                                    <li>Your Heartverse profile</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Dreamer - circular flip button (mirrors Wanderer behavior) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Dreamer (5–24 HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.25); } catch {}; setDreamerHovered(true); }}
                            onMouseLeave={() => { setDreamerHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'dreamer', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'dreamer', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 128,
                              height: 128,
                              position: 'relative',
                              borderRadius: '50%',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(255,212,0,0.36), rgba(255,212,0,0.18) 46%, rgba(90,80,0,0.32) 100%)',
                              border: '2px solid rgba(255,212,0,0.95)',
                              boxShadow: dreamerHovered ? '0 0 18px rgba(255,212,0,0.95), 0 0 36px rgba(255,212,0,0.60), inset 0 0 18px rgba(255,212,0,0.35)' : '0 0 10px rgba(255,212,0,0.70), 0 0 26px rgba(255,212,0,0.45), inset 0 0 12px rgba(255,212,0,0.25)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              perspective: 700,
                              transition: 'transform .12s ease, box-shadow .18s ease',
                              transform: dreamerHovered ? 'translateZ(0) scale(1.05)' : 'none'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                transition: 'transform 0.7s ease-in-out',
                                transformStyle: 'preserve-3d',
                                transform: dreamerFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                              }}
                            >
                              {/* Front */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <img
                                  src="/elements/the-dreamer.png"
                                  alt="The Dreamer"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(255,212,0,0.9)) drop-shadow(0 0 28px rgba(255,212,0,0.55))' }}
                                />
                                <div className="neon-yellow" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em', color: '#FFD400' }}>The Dreamer</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#FFD400' }}>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                  <span className="neon-yellow heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>5–24</span>
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                                <div style={{ textAlign: 'center', color: '#FFD400' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-yellow">Traveling through sound and starlight.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 14, textAlign: 'left', margin: '6px auto 0', width: '90%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>Hidden songs</li>
                                    <li>Early demos</li>
                                    <li>Private livestreams</li>
                                    <li>Exclusive CHXNDLER cards</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Lover - circular flip button (mirrors Wanderer behavior) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Lover (25+ HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.28); } catch {}; setLoverHovered(true); }}
                            onMouseLeave={() => { setLoverHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'lover', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'lover', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 128,
                              height: 128,
                              position: 'relative',
                              borderRadius: '50%',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(255,79,216,0.38), rgba(255,79,216,0.18) 46%, rgba(90,0,60,0.32) 100%)',
                              border: '2px solid rgba(255,79,216,0.95)',
                              boxShadow: loverHovered ? '0 0 18px rgba(255,79,216,0.95), 0 0 36px rgba(255,79,216,0.60), inset 0 0 18px rgba(255,79,216,0.35)' : '0 0 10px rgba(255,79,216,0.65), 0 0 28px rgba(255,79,216,0.50), inset 0 0 12px rgba(255,79,216,0.28)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              perspective: 700,
                              transition: 'transform .12s ease, box-shadow .18s ease',
                              transform: loverHovered ? 'translateZ(0) scale(1.05)' : 'none'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                transition: 'transform 0.7s ease-in-out',
                                transformStyle: 'preserve-3d',
                                transform: loverFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                              }}
                            >
                              {/* Front */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(0deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <img
                                  src="/elements/the-lover.png"
                                  alt="The Lover"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(252,84,175,0.95)) drop-shadow(0 0 28px rgba(252,84,175,0.55))' }}
                                />
                                <div className="neon-pink" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em', color: '#FF4FD8' }}>The Lover</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#FC54AF' }}>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                  <span className="neon-pink heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>25+</span>
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                                <div style={{ textAlign: 'center', color: '#FF4FD8' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-pink">At the center — the pulse that powers it all.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 14, textAlign: 'left', margin: '6px auto 0', width: '90%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>The Vault</li>
                                    <li>Unreleased music</li>
                                    <li>Early merch drops</li>
                                    <li>Rare CHXNDLER cards</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END heart popover */}

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
                      background: 'transparent',
                      backdropFilter: 'none',
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
                      padding: '12px 14px 14px 14px', borderRadius: 14,
                      background: 'rgba(20,3,14,0.9)',
                      border: '1px solid rgba(252,84,175,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(252,84,175,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFD9EF',
                      zIndex: 2147483647,
                      width: (storePopoverPos && storePopoverPos.width) ? storePopoverPos.width : 'min(92vw, 560px)',
                      maxHeight: '72vh',
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
                    {/* HEART coin indicator in top-right (click to open HEART popout) */}
                    <button
                      aria-label="HEART Coin tiers"
                      title="HEART Coin tiers"
                      onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      onClick={() => { 
                        try { sfx.play('click', 0.4); } catch {}; 
                        try { trackAnalytics('heart_coin_clicked', { song_slug: String(active || currentId || 'store'), payload: { song_title: track?.title || 'Unknown', location: 'store_header_icon' } }); } catch {}
                        if (showHeartPopover) { setShowHeartPopover(false); return; }
                        openHeartPopover();
                      }}
                      style={{
                        position: 'absolute', top: 8, right: 52, width: 38, height: 38,
                        border: 'none', background: 'transparent', padding: 0, cursor: 'pointer'
                      }}
                    >
                      <img
                        src="/elements/heart-coin.png"
                        alt=""
                        className="heart-coin-glow"
                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </button>
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
                                        onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/patch-inverse.png'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }}
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
                                        onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/beanie-back.png'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img src={item.image || 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'} alt={item.title} style={{ display: 'block', width: 104, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(252,84,175,0.35)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }} onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }} />
                              )}
                              {/* Price directly under the image (show HEART coin icon when applicable) */}
                              <div style={{ fontSize: 18, fontWeight: 700, color: '#FFB9E1' }}>
                                {item.price ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {((item && (item.id === 'pick' || item.id === 'bracelet')) || String(item.price).toUpperCase().includes('HEART')) ? (
                                      <button
                                        type="button"
                                        aria-label="HEART Coin tiers"
                                        title="HEART Coin tiers"
                                        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                        onClick={() => {
                                          try { sfx.play('click', 0.35); } catch {};
                                          try { trackAnalytics('heart_coin_clicked', { song_slug: String(active || currentId || 'store'), payload: { song_title: track?.title || 'Unknown', location: 'store_price_icon' } }); } catch {}
                                          if (showHeartPopover) { setShowHeartPopover(false); return; }
                                          openHeartPopover();
                                        }}
                                        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                                      >
                                        <img
                                          src="/elements/heart-coin.png"
                                          alt="HEART Coin"
                                          width={28}
                                          height={28}
                                          className="heart-coin-glow"
                                          style={{ display: 'inline-block', width: 28, height: 28, objectFit: 'contain' }}
                                        />
                                      </button>
                                    ) : null}
                                    <span>{item.price}</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFD9EF', textShadow: '0 0 10px rgba(252,84,175,0.9)' }}>{item.title}</div>
                              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{item.description}</div>
                              {/* Details only; actions moved to bottom bar */}
                            </div>
                          </div>
                          {/* Bottom controls: arrows with Add to Collection centered */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
                            <button
                              aria-label="Previous item"
                              className="store-arrow-btn"
                              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                              onClick={() => { setStoreIndex((i) => (i - 1 + products.length) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                              style={{
                                width: 36, height: 36, borderRadius: 999,
                                background: 'linear-gradient(135deg,#ff76c8,#ff3ea5)',
                                border: '1px solid rgba(255,255,255,0.5)', color: '#fff',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(255, 62, 165, 0.45)'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6l-6 6 6 6"/></svg>
                            </button>
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
                            <button
                              aria-label="Next item"
                              className="store-arrow-btn"
                              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                              onClick={() => { setStoreIndex((i) => (i + 1) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                              style={{
                                width: 36, height: 36, borderRadius: 999,
                                background: 'linear-gradient(135deg,#ff76c8,#ff3ea5)',
                                border: '1px solid rgba(255,255,255,0.5)', color: '#fff',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(255, 62, 165, 0.45)'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 6l6 6-6 6"/></svg>
                            </button>
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
                        src="/cockpit/chxndler-picture.png"
                        alt="CHXNDLER"
                        style={{
                          display: 'block',
                          // Slightly smaller than full width and centered
                          width: '78%',
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
                {/* Compact waveform moved inline near Volume; removed large block */}
                
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

                // Defer planet visibility changes to the warp sequence
                try { playerStore.getState().setMain(id); } catch {}

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

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </motion.section>
  );
}
