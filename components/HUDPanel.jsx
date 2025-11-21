/* @refresh skip */
"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import LoginModal from "@/components/LoginModal";
import WelcomeHomeModal from "@/components/WelcomeHomeModal";
import SharedButton from "@/components/SharedButton";
import HeartverseButton from "@/components/HeartverseButton";
import { supabaseClient } from "@/lib/supabaseClient";
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
const FALLBACK_COVER = '/elements/logo.png';

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
    if (k.includes("heart")) return "#2196F3";      // bright pink
    if (k.includes("lightning") || k.includes("electric")) return "#FFC700"; // deeper yellow
    if (k.includes("earth")) return "#F2EF1D";     // reuse neon yellow
    if (k.includes("air")) return "#8BF9FF";       // light cyan
    if (k.includes("dark")) return "#FFFFFF";      // white
    return "#38B6FF";
  };
  const clr = colorFor(n);
  // Outer halo uses same color for all elements
  const outer = clr;
  const glowFilter = glow ? `saturate(1.2) brightness(1.08) drop-shadow(0 0 6px ${outer}) drop-shadow(0 0 16px ${outer}) drop-shadow(0 0 34px ${outer})` : 'none';
  
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent:'center', pointerEvents:'none' }}>
      <OptimizedElementIcon 
        name={iconKey} 
        alt="Element" 
        width={size} 
        height={size}
        style={{
          objectFit: 'cover',
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
  onNameSaved, // callback when user saves their name in signup flow
  onElementSaved, // callback when user saves their element in signup flow
  onCloseBlueDisplay, // callback to close the blue display
  onOpenBlueDisplay, // callback to open the blue display
  shouldOpenJournal = false, // flag to automatically open journal
  onJournalOpened, // callback when journal is opened
}) {
  // Temporary kill-switch to disable 3D planets for performance testing
  // Set to true to disable. You can also override at runtime by setting
  // localStorage.DISABLE_3D_PLANETS = '0' and refreshing.
  const DISABLE_3D_PLANETS_DEFAULT = false;
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
  const STORE_POPOVER_Y_OFFSET = -210; // move popover up slightly
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

  // Welcome Home button ref
  const joinUsBtnRef = useRef(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSubmissionMessage, setProfileSubmissionMessage] = useState('');
  const [welcomeBackProfile, setWelcomeBackProfile] = useState(null); // Tracks existing profile for button text
  
  // Profile setup modal state
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupStep, setProfileSetupStep] = useState(1); // 1: name, 2: element
  const [profileName, setProfileName] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [currentProfileId, setCurrentProfileId] = useState(null);
  
  // New identical popup state
  const [showIdenticalPopup, setShowIdenticalPopup] = useState(false);
  const [identicalPopoverPos, setIdenticalPopoverPos] = useState(null);
  const identicalScrollRef = useRef(null);
  
  // Element selection popup state
  const [showElementPopup, setShowElementPopup] = useState(false);
  const [elementPopoverPos, setElementPopoverPos] = useState(null);
  const elementScrollRef = useRef(null);
  const [selectedElementData, setSelectedElementData] = useState(null);
  
  // Saved profile state for HUD display
  const [savedProfileName, setSavedProfileName] = useState('');
  const [savedProfileElement, setSavedProfileElement] = useState('');
  
  // Expose function globally for testing (can be removed later)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.openIdenticalPopup = openIdenticalPopover;
      window.showIdenticalPopup = () => {
        openIdenticalPopover();
      };
    }
  }, []);


  // Brand (CHXNDLER) popover state
  const [showBrandPopover, setShowBrandPopover] = useState(false);
  const brandBtnRef = useRef(null);
  const [brandPopoverPos, setBrandPopoverPos] = useState(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState(null);
  const [brandContent, setBrandContent] = useState('');
  const brandScrollRef = useRef(null);

  // SOUL SKY popover state (similar to other popovers)
  const [showSoulSkyPopover, setShowSoulSkyPopover] = useState(false);
  const starsBtnRef = useRef(null);
  const [soulSkyPopoverPos, setSoulSkyPopoverPos] = useState(null);
  const [questionResponse, setQuestionResponse] = useState('');
  const [showStarAnimation, setShowStarAnimation] = useState(false);
  const [showBeamEffect, setShowBeamEffect] = useState(false);
  const soulSkyScrollRef = useRef(null);
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

  // PROFILE popout
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const heartBtnRef = useRef(null);
  const [heartPopoverPos, setHeartPopoverPos] = useState(null);
  // Selected HEART tier details view (null shows tier cards)
  const [heartTierDetails, setHeartTierDetails] = useState(null);
  // Heart Coin details popover (separate from main profile popover)
  const [showHeartCoinPopover, setShowHeartCoinPopover] = useState(false);
  const [heartCoinPopoverPos, setHeartCoinPopoverPos] = useState(null);
  const heartCoinRef = useRef(null);
  // Wanderer flip state within HEART popover (circular button flip like store items)
  const [wandererFlipped, setWandererFlipped] = useState(false);
  const [wandererHovered, setWandererHovered] = useState(false);
  // Dreamer/Lover flip + hover state to match Wanderer behavior
  const [dreamerFlipped, setDreamerFlipped] = useState(false);
  const [dreamerHovered, setDreamerHovered] = useState(false);
  const [loverFlipped, setLoverFlipped] = useState(false);
  const [loverHovered, setLoverHovered] = useState(false);
  // HEARTVERSE code display state
  const [showHeartverseCode, setShowHeartverseCode] = useState(false);
  // HeartCoins functionality state
  const [showHeartCoinsContent, setShowHeartCoinsContent] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [heartCoinsCount, setHeartCoinsCount] = useState(0); // Fetched from database
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showWelcomeHomeModal, setShowWelcomeHomeModal] = useState(false);
  const [hasSeenWelcomeModal, setHasSeenWelcomeModal] = useState(false);
  const [checkInPhrase, setCheckInPhrase] = useState('');
  const [dailyElementTapped, setDailyElementTapped] = useState(false);
  const [dailyJournalDone, setDailyJournalDone] = useState(false);
  const [dailyInviteDone, setDailyInviteDone] = useState(false);
  // Digital binder popover state
  const [showBookPopover, setShowBookPopover] = useState(false);
  // Full collection view state
  const [showFullCollection, setShowFullCollection] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [cardNameFilter, setCardNameFilter] = useState('');
  // Collection view mode: 'elements' shows the 4 element cards, 'filtered' shows filtered collection
  const [collectionViewMode, setCollectionViewMode] = useState('elements');
  
  // Binder card popup state
  const [showCardPopup, setShowCardPopup] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  
  // Digital binder cards - CHXNDLER card as first slot
  const binderCards = [
    {
      id: 'chxndler',
      title: 'CHXNDLER',
      image: 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      rarity: 'legendary',
      type: 'brand'
    },
    null, // Empty slot
    null  // Empty slot
  ];

  // Available songs that show in dropdown (these should NOT be blurry)
  const availableSongs = [
    'GAME BOY HEART', 'KID FOREVER', 'BRAIN FREEZE', "WE'RE JUST FRIENDS (mickey jas Remix)", 'BE MY BEE',
    "WE'RE JUST FRIENDS", 'PARIS', 'POKÉMON', 'HOUSE PARTY', "WE'RE JUST FRIENDS (DMVRCO Remix)",
    'BABY', 'OCEAN GIRL', 'OCEAN GIRL (ACOUSTIC)', 'OCEAN GIRL (REMIX)', 'COLORS OF OUR HOME (BLUMA Game Soundtrack)',
    'COLORS OF OUR HOME (ACOUSTIC)', 'COLORS OF OUR HOME', 'COLLIDE'
  ];

  // Card collection data using actual song covers
  const allCards = [
    // HEART TYPE CARDS
    {
      id: 0,
      name: 'HEART',
      type: 'HEART',
      rarity: 'Rare',
      image: 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      description: 'This is the emotional core. These songs don\'t just want — they feel. Love isn\'t clean here — it\'s messy, soft, and intense.',
      collected: true
    },
    {
      id: 1,
      name: 'ALWAYS ON MY MIND',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind.png?updatedAt=1762388345883',
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 2,
      name: 'ALWAYS ON MY MIND (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/cover/ALWAYS%20ON%20MY%20MIND%20(ACOUSTIC).png?updatedAt=1763058363705',
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 3,
      name: 'ALWAYS ON MY MIND (REMIX)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind-remix.png?updatedAt=1762388342107',
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 4,
      name: 'BABY',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/baby.png?updatedAt=1762388345192',
      description: 'A chaotic, messy, romantic ride through the magic of a first date.',
      collected: availableSongs.includes('BABY')
    },
    {
      id: 5,
      name: 'BE MY BEE',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee.png?updatedAt=1762388342848',
      description: 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      collected: availableSongs.includes('BE MY BEE')
    },
    {
      id: 6,
      name: 'BE MY BEE (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee-acoustic.png?updatedAt=1762388342912',
      description: 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      collected: false
    },
    {
      id: 7,
      name: 'COLLIDE',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/collide.png?updatedAt=1762388347054',
      description: 'Two souls crash into each other in a cosmic dance of fate.',
      collected: availableSongs.includes('COLLIDE')
    },
    {
      id: 8,
      name: 'COLORS OF OUR HOME',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20.png',
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME')
    },
    {
      id: 9,
      name: 'COLORS OF OUR HOME (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763055064803',
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME (ACOUSTIC)')
    },
    {
      id: 10,
      name: 'COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME (BLUMA Game Soundtrack)')
    },
    {
      id: 11,
      name: 'I MIGHT FALL IN LOVE WITH YOU',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/i-might-fall-in-love-with-you.png?updatedAt=1762388340663',
      description: 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      collected: false
    },
    {
      id: 12,
      name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/I%20MIGHT%20FALL%20IN%20LOVE%20WITH%20YOU%20(ACOUSTIC).png?updatedAt=1763055066309',
      description: 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      collected: false
    },
    {
      id: 13,
      name: 'LITTLE BLACK HEART',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/little-black-heart.png?updatedAt=1762388346814',
      description: 'Are you afraid to live or afraid to die?',
      collected: false
    },
    {
      id: 14,
      name: 'LITTLE BLACK HEART (ACOUSTIC)',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/LITTLE%20BLACK%20HEART%20(ACOUSTIC).png?updatedAt=1763055066090',
      description: 'Are you afraid to live or afraid to die?',
      collected: false
    },
    {
      id: 15,
      name: 'LOVE ME',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/love-me.png?updatedAt=1762388339563',
      description: 'If I gave it all away for the dream and never made it — would you still love me?',
      collected: false
    },
    {
      id: 16,
      name: 'LOVE ME (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/love-me-acoustic.png?updatedAt=1762388330787',
      description: 'If I gave it all away for the dream and never made it — would you still love me?',
      collected: false
    },
    {
      id: 17,
      name: 'SOMEBODY TO LOVE',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/somebody-to-love.png?updatedAt=1762388347148',
      description: 'You want to give real love — not the kind they expect, but the kind you know. Too bad they\'re not the one.',
      collected: false
    },
    {
      id: 18,
      name: 'TIENES UN AMIGO',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/tienes-un-amigo.png?updatedAt=1762388343639',
      description: 'No galaxy too far, no accent too strong — friendship always finds a way.',
      collected: false
    },
    {
      id: 19,
      name: "WE'RE JUST FRIENDS",
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends.png?updatedAt=1762388347233',
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS")
    },
    {
      id: 20,
      name: "WE'RE JUST FRIENDS (ACOUSTIC)",
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-acoustic.png?updatedAt=1762388340285',
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: false
    },
    {
      id: 21,
      name: "WE'RE JUST FRIENDS (DMVRCO REMIX)",
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-dmvrco-remix.png?updatedAt=1762388345669',
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS (DMVRCO Remix)")
    },
    {
      id: 22,
      name: "WE'RE JUST FRIENDS (MICKEY JAS REMIX)",
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-mickey-jas-remix.png?updatedAt=1762388346859',
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS (mickey jas Remix)")
    },
    {
      id: 23,
      name: 'PINK MOON',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/pink-moon.png?updatedAt=1762388347173',
      description: 'Lost in the static, the pink moon guides me home.',
      collected: false
    },

    // WATER TYPE CARDS
    {
      id: 23.5,
      name: 'WATER',
      type: 'WATER',
      rarity: 'Rare',
      image: 'https://ik.imagekit.io/CHXNDLER/card/WATER.png',
      description: 'These songs carry waves of emotion — not explosive, but steady, like a tide that pulls you out and then leaves you still',
      collected: true
    },
    {
      id: 24,
      name: 'LETTING GO',
      type: 'WATER',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/letting-go.png?updatedAt=1762388344472',
      description: 'Letting go of expectations — theirs and yours — to finally be free.',
      collected: false
    },
    {
      id: 25,
      name: 'OCEAN GIRL',
      type: 'WATER',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl.png?updatedAt=1762388343942',
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL')
    },
    {
      id: 26,
      name: 'OCEAN GIRL (ACOUSTIC)',
      type: 'WATER',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-acoustic.png?updatedAt=1762388344386',
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL (ACOUSTIC)')
    },
    {
      id: 27,
      name: 'OCEAN GIRL (REMIX)',
      type: 'WATER',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-remix.png?updatedAt=1762388346301',
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL (REMIX)')
    },

    // LIGHTNING TYPE CARDS
    {
      id: 27.5,
      name: 'LIGHTNING',
      type: 'LIGHTNING',
      rarity: 'Rare',
      image: 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png',
      description: 'Lightning is the electric jolt of feeling alive. These tracks buzz. You move fast, crash hard, and maybe regret nothing.',
      collected: true
    },
    {
      id: 28,
      name: 'AMERICAN DREAM',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/american-dream.png?updatedAt=1762388346126',
      description: 'The American Dream isn\'t where we live — it\'s where our dreams go to die.',
      collected: false
    },
    {
      id: 29,
      name: 'BLUE',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/blue.png?updatedAt=1762388346777',
      description: 'You were the match to ignite the ash in my heart.',
      collected: false
    },
    {
      id: 30,
      name: 'BLUE (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/BLUE%20(ACOUSTIC).png?updatedAt=1763055066119',
      description: 'You were the match to ignite the ash in my heart.',
      collected: false
    },
    {
      id: 31,
      name: 'BRAIN FREEZE',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/brain-freeze.png?updatedAt=1762388347224',
      description: 'A rush of emotion and chaos from chasing summer highs.',
      collected: availableSongs.includes('BRAIN FREEZE')
    },
    {
      id: 32,
      name: 'FEELING THIS',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/feeling-this.png?updatedAt=1762388347289',
      description: 'When chaos feels like connection, and that\'s enough for tonight.',
      collected: false
    },
    {
      id: 33,
      name: 'GAME BOY HEART',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/game-boy-heart.png?updatedAt=1762388346348',
      description: 'A nostalgic escape into an 8-bit dreamworld where your heart lives free.',
      collected: availableSongs.includes('GAME BOY HEART')
    },
    {
      id: 34,
      name: 'HOME',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/home.png?updatedAt=1762388345590',
      description: 'A journey through the stars to fill the void—only to find home was within all along',
      collected: false
    },
    {
      id: 35,
      name: 'HOME (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/home-acoustic.png?updatedAt=1762388344295',
      description: 'A journey through the stars to fill the void—only to find home was within all along',
      collected: false
    },
    {
      id: 36,
      name: 'HOUSE PARTY',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/HOUSE%20PARTY.png?updatedAt=1763055601783',
      description: 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      collected: availableSongs.includes('HOUSE PARTY')
    },
    {
      id: 37,
      name: 'HOUSE PARTY (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/house-party-acoustic.png?updatedAt=1762388343028',
      description: 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      collected: false
    },
    {
      id: 38,
      name: 'KID FOREVER',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/kid-forever.png?updatedAt=1762388339589',
      description: 'Live fearlessly in the land your daydreams call home.',
      collected: availableSongs.includes('KID FOREVER')
    },
    {
      id: 39,
      name: 'POKÉMON',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/pokemon.png?updatedAt=1762388341960',
      description: 'Some dreams don\'t fade — they evolve with you.',
      collected: availableSongs.includes('POKÉMON')
    },

    // DARKNESS TYPE CARDS
    {
      id: 39.5,
      name: 'DARKNESS',
      type: 'DARKNESS',
      rarity: 'Rare',
      image: 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      description: 'Darkness isn\'t evil — it\'s vulnerability in disguise. These songs explore what\'s not said, what we hide, or what we want but don\'t admit.',
      collected: true
    },
    {
      id: 40,
      name: 'ALONE',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/alone.png?updatedAt=1762388342410',
      description: 'Lost in a sea of strangers under the city\'s glittering glow.',
      collected: false
    },
    {
      id: 41,
      name: 'ALONE (ACOUSTIC)',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/ALONE%20(ACOUSTIC).png?updatedAt=1763054836196',
      description: 'Lost in a sea of strangers under the city\'s glittering glow.',
      collected: false
    },
    {
      id: 42,
      name: 'CHEERLEADER',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/cheerleader.png?updatedAt=1762388346177',
      description: 'Wanting the person you love most to be cheering in the crowd.',
      collected: false
    },
    {
      id: 43,
      name: 'MR. BRIGHTSIDE',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/mr.brightside.png?updatedAt=1762388346700',
      description: 'When love turns to doubt and every glance feels like betrayal.',
      collected: false
    },
    {
      id: 44,
      name: 'PARIS',
      type: 'DARKNESS',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/paris.png?updatedAt=1762388344978',
      description: 'A love affair with self-destruction — poison dressed up as romance.',
      collected: availableSongs.includes('PARIS')
    },

    // SPECIAL CHXNDLER CARD
    {
      id: 45,
      name: 'CHXNDLER',
      type: 'HEART',
      rarity: 'Common',
      image: 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      description: 'The artist himself, heart of the HEARTVERSE.',
      collected: true // Always collected
    }
  ];

  // Filter cards based on selected filters
  const filteredCards = allCards.filter(card => {
    const rarityMatch = selectedRarity === 'all' || card.rarity === selectedRarity;
    const typeMatch = selectedType === 'all' || card.type === selectedType;
    const nameMatch = cardNameFilter === '' || card.name.toLowerCase().includes(cardNameFilter.toLowerCase());
    return rarityMatch && typeMatch && nameMatch;
  });

  // Reset card index if out of bounds when filters change
  useEffect(() => {
    if (currentCardIndex >= filteredCards.length && filteredCards.length > 0) {
      setCurrentCardIndex(0);
    }
  }, [filteredCards.length, currentCardIndex]);

  // Fetch heart coins directly from Supabase
  useEffect(() => {
    async function fetchHeartCoins() {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }

        if (!session?.user) {
          console.log('💰 No user session, skipping heart coins fetch');
          return;
        }

        // Fetch heart coins directly from Supabase
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('heart_coins_current')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          return;
        }

        console.log('💰 Heart coins fetched:', profile?.heart_coins_current || 0);
        setHeartCoinsCount(profile?.heart_coins_current || 0);
        
      } catch (error) {
        console.error('Error fetching heart coins:', error);
      }
    }

    fetchHeartCoins();
  }, []);

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

  // Check if user has seen welcome modal before
  const WELCOME_MODAL_LS_KEY = 'heartverse:welcome_modal_seen';
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const hasSeen = window.localStorage.getItem(WELCOME_MODAL_LS_KEY) === 'true';
        setHasSeenWelcomeModal(hasSeen);
        
        // Show welcome modal automatically on first visit
        if (!hasSeen) {
          // Add a small delay to ensure the component is fully mounted
          setTimeout(() => {
            setShowWelcomeHomeModal(true);
          }, 1000);
        }
      }
    } catch {}
  }, []);
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
    // Reset all flip states to original position
    setWandererFlipped(false);
    setDreamerFlipped(false);
    setLoverFlipped(false);
    setShowHeartPopover(true);
  };

  const openHeartCoinPopover = () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = heartCoinRef.current?.getBoundingClientRect?.();
      if (r) {
        let left = r.left + r.width / 2;
        let top = r.bottom - 200; // Move container higher up by 200px
        top = Math.max(8, top);
        let height = Math.max(200, Math.min(400, (typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300)));
        setHeartCoinPopoverPos({ left, top, height });
      }
    } catch {}
    setShowHeartCoinPopover(true);
  };

  // Storefront (Gem) popover state
  const [showStorePopover, setShowStorePopover] = useState(false);
  const storeBtnRef = useRef(null);
  const [storePopoverPos, setStorePopoverPos] = useState(null);
  const [storeIndex, setStoreIndex] = useState(0);
  const [storeActiveTab, setStoreActiveTab] = useState('MERCH');
  const storeScrollRef = useRef(null);
  const storeLastScrollAtRef = useRef(0);
  // Store-specific UI state: flip animations
  const [beanieFlipped, setBeanieFlipped] = useState(false);
  const [patchFlipped, setPatchFlipped] = useState(false);
  const [beanieHovered, setBeanieHovered] = useState(false);
  const [patchHovered, setPatchHovered] = useState(false);
  
  // Heart coin store popup state
  const [showHeartCoinStorePopup, setShowHeartCoinStorePopup] = useState(false);
  
  const products = [
    {
      id: 'necklace',
      title: 'NECKLACE',
      image: '/store/necklace.png',
      url: 'https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K',
      price: '$18',
      heartcoins: 12,
      description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here."
    },
    {
      id: 'pick',
      title: 'PICK',
      image: '/store/pick.png',
      url: 'https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O',
      price: '$6',
      heartcoins: 4,
      description: 'A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.'
    },
    {
      id: 'keychain',
      title: 'KEYCHAIN',
      image: '/store/keychain.png',
      url: 'https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H',
      price: '$6',
      heartcoins: 4,
      description: "A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you're connected, always."
    },
    {
      id: 'patch',
      title: 'PATCH',
      image: '/store/patch.png',
      url: 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C',
      price: '$6',
      heartcoins: 4,
      description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community."
    },
    {
      id: 'button',
      title: 'BUTTON',
      image: '/store/button.png',
      url: 'https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J',
      price: '$5',
      heartcoins: 3,
      description: 'A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.'
    },
    {
      id: 'pin',
      title: 'PIN',
      image: '/store/pin.png',
      url: 'https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B',
      price: '$5',
      heartcoins: 3,
      description: 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.'
    },
    {
      id: 'sticker',
      title: 'STICKER',
      image: '/store/sticker.png',
      url: 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F',
      price: '$3',
      heartcoins: 2,
      description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story."
    },
    {
      id: 'house-party-poster',
      title: 'HOUSE PARTY POSTER',
      image: '/store/house-party-poster.png',
      url: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
      price: '$30',
      heartcoins: 20,
      description: 'This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.'
    },
    {
      id: 'beanie',
      title: 'BEANIE',
      image: '/store/beanie-front.png',
      url: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
      price: '$30',
      heartcoins: 20,
      description: "For the ones who wear their hearts out loud and aren't afraid to stand out."
    },
    {
      id: 'hat',
      title: 'HAT',
      image: '/store/hat.png',
      url: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
      price: '$30',
      heartcoins: 20,
      description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to."
    },
    {
      id: 'bracelet',
      title: 'BRACELET',
      image: '/store/bracelet.png',
      url: 'https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N',
      price: '$24',
      heartcoins: 16,
      description: 'A HEARTVERSE charm that connects you to the Aliens who feel deeply and walk the world with open hearts.'
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



  async function completeProfile() {
    if (!currentProfileId || !profileName.trim() || !selectedElement) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          name: profileName.trim(),
          element: selectedElement,
          profile_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProfileId);

      if (error) {
        console.error('Error completing profile:', error);
        // Could show error message here
      } else {
        try { sfx.play('success', 0.8); } catch {}
        setShowProfileSetup(false);
        // Reset state
        setProfileName('');
        setSelectedElement('');
        setCurrentProfileId(null);
        setProfileSetupStep(1);
        
        // Show completion message somewhere or trigger celebration
        console.log('Profile completed successfully!');
      }
    } catch (error) {
      console.error('Exception completing profile:', error);
    }
  }

  async function openIdenticalPopover(){
    try { sfx.play('click', 0.4); } catch {}
    // Anchor position (identical to Join Us popover)
    try {
      const r = joinUsBtnRef.current?.getBoundingClientRect?.();
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
        const TOP_INSET = 136; // same as lyrics popup
        let top = rect.top + TOP_INSET;
        top = Math.max(8, top);
        const height = Math.max(100, rect.height - TOP_INSET);
        setIdenticalPopoverPos({ left: leftEdge, top, width, height });
      } else if (r) {
        let top = r.bottom + 8 + LYRICS_POPOVER_Y_OFFSET;
        top = Math.max(8, top);
        let height = Math.max(240, Math.min(560, (typeof window !== 'undefined' ? window.innerHeight * 0.46 : 340)));
        setIdenticalPopoverPos({ left: r.left + r.width/2, top, height });
      }
    } catch(e) {
      console.warn('Failed to position identical popover:', e);
    }
    setShowIdenticalPopup(true);
  }

  async function openElementPopover(){
    try { sfx.play('click', 0.4); } catch {}
    // Anchor position (identical to other popups)
    try {
      const r = joinUsBtnRef.current?.getBoundingClientRect?.();
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
        const TOP_INSET = 136; // same as lyrics popup
        let top = rect.top + TOP_INSET;
        top = Math.max(8, top);
        const height = Math.max(100, rect.height - TOP_INSET);
        setElementPopoverPos({ left: leftEdge, top, width, height });
      } else if (r) {
        let top = r.bottom + 8 + LYRICS_POPOVER_Y_OFFSET;
        top = Math.max(8, top);
        let height = Math.max(240, Math.min(560, (typeof window !== 'undefined' ? window.innerHeight * 0.46 : 340)));
        setElementPopoverPos({ left: r.left + r.width/2, top, height });
      }
    } catch(e) {
      console.warn('Failed to position element popover:', e);
    }
    setShowElementPopup(true);
  }

  async function openSoulSkyPopover(){
    try { sfx.play('click', 0.4); } catch {}
    // Position similar to lyrics popover
    try {
      const r = starsBtnRef.current?.getBoundingClientRect?.();
      const wrapper = innerRef.current?.parentElement || null; // outer HUD blue display wrapper (padding box)
      // Position the popover to match the blue display's vertical bounds
      if (r && wrapper) {
        const rect = wrapper.getBoundingClientRect();
        // Get padding on blue display
        const cs = typeof window !== 'undefined' ? window.getComputedStyle(wrapper) : null;
        const pt = parseFloat(cs?.paddingTop || '0');
        const pr = parseFloat(cs?.paddingRight || '0');
        const pb = parseFloat(cs?.paddingBottom || '0');
        const pl = parseFloat(cs?.paddingLeft || '0');
        // Position to align with blue display content area
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
        const bottom = rect.bottom - pb - 8;
        const height = Math.max(0, bottom - top);
        setSoulSkyPopoverPos({left: leftEdge, top, width, height});
      } else {
        console.warn('Failed to find refs for Soul Sky positioning');
      }
    } catch(e) {
      console.warn('Failed to position Soul Sky popover:', e);
    }
    setShowSoulSkyPopover(true);
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

  // Recalculate PROFILE popover alignment on resize while open
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

  // Close PROFILE popover on outside click / Escape
  useEffect(() => {
    if (!showHeartPopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = heartBtnRef.current && t && heartBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="PROFILE"]');
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

  // Close Heart Coin popover on outside click / Escape
  useEffect(() => {
    if (!showHeartCoinPopover) return;
    const onDocDown = (e) => {
      const t = e.target;
      const withinBtn = heartCoinRef.current && t && heartCoinRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="HEART COIN DETAILS"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { try { sfx.play('close', 0.4); } catch {}; setShowHeartCoinPopover(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHeartCoinPopover(false); } };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHeartCoinPopover]);

  // Listen for openStoreCards event from CoverHologram
  useEffect(() => {
    const handleOpenStoreCards = (e) => {
      try {
        // If store popover is already open, just switch to CARDS tab
        if (showStorePopover) {
          setStoreActiveTab('CARDS');
        } else {
          // Otherwise open store popover and set CARDS tab
          setStoreActiveTab('CARDS');
          openStorePopover();
        }
        
        // Track the event
        try {
          const { songSlug, songTitle, cardSrc } = e.detail || {};
          track('store_cards_opened_from_collect', { 
            song_slug: songSlug || 'unknown',
            payload: { 
              song_title: songTitle || 'Unknown',
              card_image: cardSrc,
              source: 'collect_button'
            } 
          });
        } catch {}
      } catch (err) {
        console.warn('Error handling openStoreCards event:', err);
      }
    };

    window.addEventListener('openStoreCards', handleOpenStoreCards);
    return () => window.removeEventListener('openStoreCards', handleOpenStoreCards);
  }, [showStorePopover]);

  // Reset PROFILE popover UI state when closing
  useEffect(() => {
    if (!showHeartPopover) {
      try { setHeartTierDetails(null); } catch {}
      try { setWandererFlipped(false); setWandererHovered(false); } catch {}
      try { setShowHeartverseCode(false); } catch {}
    }
  }, [showHeartPopover]);
  
  // Close book popover on outside click / Escape
  useEffect(() => {
    if (!showBookPopover) return;
    const onDocDown = (e) => {
      const dialog = document.querySelector('[aria-label="Digital Binder"]');
      const withinDialog = dialog && e.target && dialog.contains(e.target);
      if (!withinDialog) setShowBookPopover(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowBookPopover(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showBookPopover]);

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
    // Default to MERCH tab when opening store
    setStoreActiveTab('MERCH');
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

  // Auto-open journal when shouldOpenJournal is true
  useEffect(() => {
    if (shouldOpenJournal && !showSoulSkyPopover) {
      try {
        openSoulSkyPopover();
        onJournalOpened?.();
      } catch {}
    }
  }, [shouldOpenJournal, showSoulSkyPopover, onJournalOpened]);

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
                // Make button width match cover art container width (92px)
                width: 92,
                boxSizing: 'border-box',
                // Center text with minimal padding since width is fixed
                padding: '0 4px 0 4px',
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
                // Smaller font to make text pop out less
                fontSize: 11,
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
                  const slug = isHome ? 'homepage' : (currentSong?.id || active || 'homepage');
                  const hasLyrics = isHome ? true : !!(currentSong && (currentSong.hasLyrics !== false));
                  const lyricsTitle = isHome ? 'Lyrics for CHXNDLER' : `Lyrics for ${currentSong?.title || 'current track'}`;
                  const lyricsAria = isHome ? 'View lyrics for CHXNDLER' : `View lyrics for ${currentSong?.title || 'current track'}`;
                  return (
                    <>
                      {/* Waveform positioned above play/pause button */}
                      <div className="hud-mini-wave flex items-center justify-center" style={{ marginBottom: 8, marginLeft: -8 }}>
                        <div 
                          className="waveform"
                          onClick={handleProgressClick}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const hoverX = e.clientX - rect.left;
                            const hoverPercentage = (hoverX / rect.width) * 100;
                            e.currentTarget.style.setProperty('--hover-position', `${hoverPercentage}%`);
                          }}
                          style={{
                            position: 'relative',
                            border: 'none',
                            width: `calc((100vw - ${(inConsole ? 6 : 8) + (oneLinerRight + 4) + 32}px) * 0.85)`, // 85% of dropdown width
                            height: 18,
                            borderRadius: 0,
                            background: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            try { sfx.play('hover', 0.3); } catch {}
                            // No border styling needed for invisible container
                          }}
                          onMouseLeave={(e) => {
                            // No border styling needed for invisible container
                          }}
                        >
                          <svg className="w-full h-full" viewBox="0 0 100 18" preserveAspectRatio="none" style={{ background: 'transparent' }}>
                            <defs>
                              {(() => {
                                const currentSong = resolvedSongs.find(s => s.id === active);
                                const elementColor = '#FFFFFF'; // Use white for waveform gradient
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
                              const elementColor = '#FFFFFF'; // Use white for waveform line
                              const a = liveAudioRef.current;
                              const liveDur = (a && isFinite(a.duration) && a.duration > 0) ? a.duration : (isFinite(duration) && duration > 0 ? duration : 0);
                              const liveTime = (a && isFinite(a.currentTime) && a.currentTime >= 0) ? a.currentTime : (isFinite(progress) && progress >= 0 ? progress : 0);
                              const progressRatio = liveDur > 0 ? (liveTime / liveDur) : 0;
                              const progressX = progressRatio * 100;
                              const centerY = 9; // half of 18
                              return (
                                <>
                                  {/* Background track as a thick rounded line */}
                                  <line x1="0" y1={centerY} x2="100" y2={centerY} stroke={elementColor} strokeWidth="8" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
                                  {/* Played portion: single clean rounded bar */}
                                  <line x1="0" y1={centerY} x2={progressX} y2={centerY} stroke={elementColor} strokeWidth="8" opacity="1" strokeLinecap="round" strokeLinejoin="round" />
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                      <div className="hud-top-controls" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -12, marginLeft: -8 }}>
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
                      {/* WELCOME HOME button positioned below LYRICS */}
                      <HeartverseButton
                        ref={joinUsBtnRef}
                        label="WELCOME HOME"
                        style={{ position: 'absolute', left: '8px', top: '70px', paddingLeft: '32px', paddingRight: '32px', minWidth: '180px' }}
                        title="Welcome Home"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          try { sfx.play('click', 0.45); } catch {}; 
                          try { trackAnalytics('welcome_home_clicked', { location: 'hud_controls' }); } catch {}; 
                          // Close any open HUD popovers when opening welcome home modal
                          setShowHudVolumePopover(false);
                          setShowLyricsPopover(false);
                          setShowApplePopover(false);
                          setShowHeartPopover(false);
                          setShowHeartCoinPopover(false);
                          setShowIdenticalPopup(false);
                          setShowElementPopup(false);
                          // Close blue display when opening welcome home modal
                          try { onCloseBlueDisplay?.(); } catch {}
                          // Always show welcome home modal when button is clicked
                          setShowWelcomeHomeModal(true);
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      />
                      {/* STARS button */}
                      <HeartverseButton
                        ref={starsBtnRef}
                        variant="stars"
                        label=""
                        icon={
                          <img 
                            src="/elements/star.png" 
                            alt="Journal" 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              filter: 'invert(1) brightness(0)' 
                            }} 
                          />
                        }
                        style={{ position: 'absolute', left: '220px', top: '70px', paddingLeft: '16px', paddingRight: '16px', minWidth: '60px' }}
                        title="Stars"
                        aria-haspopup="dialog"
                        aria-expanded={showSoulSkyPopover}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          try { sfx.play('click', 0.45); } catch {}; 
                          try { trackAnalytics('stars_clicked', { location: 'hud_controls' }); } catch {}; 
                          if (showSoulSkyPopover) { 
                            try { sfx.play('close', 0.4); } catch {}; 
                            setShowSoulSkyPopover(false); 
                            return; 
                          }
                          openSoulSkyPopover(); 
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                      />
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
                      {/* Volume button moved to the right of YouTube */}
                      <button
                        className="hud-volume-btn"
                        style={{ marginTop: 1 }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onClick={() => {
                          try { sfx.play('click', 0.4); } catch {}
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
                            <polygon points="4,10 8,10 13,6 13,18 8,14 4,14" fill="currentColor" />
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
                    </>
                  );
                })()}
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

                {typeof document !== 'undefined' && showHudVolumePopover && hudPopoverPos ? createPortal(
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

                {typeof document !== 'undefined' && showHeartPopover && heartPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="PROFILE"
                    className="heart-hologram"
                    style={{
                      position: 'fixed',
                      left: (heartPopoverPos && heartPopoverPos.left) || 0,
                      top: (heartPopoverPos && heartPopoverPos.top) || 0,
                      transform: (heartPopoverPos && heartPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      padding: '14px 16px 16px 16px',
                      borderRadius: 14,
                      background: 'radial-gradient(140% 160% at 50% 0%, rgba(25,227,255,0.15), rgba(14,168,208,0.10) 35%, rgba(6,40,55,0.85) 100%)',
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
                      {/* User summary above PROFILE */}
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          padding: '4px 2px 10px 2px',
                          borderBottom: '1px solid rgba(33,150,243,0.25)'
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
                              width: 36,
                              height: 36,
                              borderRadius: 9999,
                              background: 'radial-gradient(72% 72% at 30% 30%, rgba(25,227,255,0.28) 0%, rgba(25,227,255,0.08) 60%, rgba(25,227,255,0.04) 100%)',
                              border: '1px solid rgba(25,227,255,0.5)',
                              boxShadow: '0 0 12px rgba(25,227,255,0.5)',
                              backdropFilter: 'blur(2px)',
                              cursor: 'pointer',
                              transition: 'transform 120ms ease',
                              padding: 0,
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <ElementIcon name={sofiaElement} size={36} glow={true} />
                          </button>
                          {/* SOFIA label */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                                letterSpacing: '.02em',
                                color: '#2196F3',
                                textShadow: '0 0 12px rgba(33,150,243,0.35)'
                              }}
                            >
                              SOFIA
                            </div>
                            {/* Book button below SOFIA */}
                            <button
                              type="button"
                              aria-label="Digital Binder"
                              title="Digital Binder"
                              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                              onClick={() => {
                                try { sfx.play('click', 0.4); } catch {}
                                setShowBookPopover(!showBookPopover);
                              }}
                              style={{
                                width: 30,
                                height: 30,
                                padding: 0,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(25,227,255,0.15))',
                                border: '1px solid rgba(33,150,243,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                boxShadow: '0 0 12px rgba(33,150,243,0.3), 0 0 24px rgba(33,150,243,0.15), 0 0 36px rgba(25,227,255,0.1)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(33,150,243,0.25), rgba(25,227,255,0.25))';
                                e.currentTarget.style.borderColor = 'rgba(33,150,243,0.6)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 0 18px rgba(33,150,243,0.45), 0 0 36px rgba(33,150,243,0.25), 0 0 48px rgba(25,227,255,0.15)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(25,227,255,0.15))';
                                e.currentTarget.style.borderColor = 'rgba(33,150,243,0.4)';
                                e.currentTarget.style.transform = 'scale(1.0)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(33,150,243,0.3), 0 0 24px rgba(33,150,243,0.15), 0 0 36px rgba(25,227,255,0.1)';
                              }}
                            >
                              <img
                                src="/elements/binder.png"
                                alt="Binder"
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                  borderRadius: '50%'
                                }}
                              />
                            </button>
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
                                    border: `1px solid ${sofiaElement === el ? 'rgba(33,150,243,0.8)' : 'rgba(25,227,255,0.35)'}`,
                                    background: 'radial-gradient(72% 72% at 30% 30%, rgba(25,227,255,0.18) 0%, rgba(25,227,255,0.06) 60%, rgba(25,227,255,0.03) 100%)',
                                    boxShadow: sofiaElement === el ? '0 0 12px rgba(33,150,243,0.6)' : '0 0 8px rgba(25,227,255,0.3)',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                >
                                  <ElementIcon name={el} size={28} glow={true} />
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
                            top: '8px',
                            transform: 'translateX(-50%)',
                            fontSize: 22,
                            fontWeight: 900,
                            letterSpacing: '.02em',
                            color: '#19E3FF',
                            textShadow: '0 0 14px rgba(25,227,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            try { sfx.play('click', 0.4); } catch {}
                            if (showHeartverseCode) {
                              setShowHeartverseCode(false);
                            }
                          }}
                          onMouseEnter={(e) => {
                            try { sfx.play('hover', 0.25); } catch {}
                            e.target.style.textShadow = '0 0 20px rgba(25,227,255,0.8), 0 0 30px rgba(25,227,255,0.4)';
                            e.target.style.transform = 'translateX(-50%) scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textShadow = '0 0 14px rgba(25,227,255,0.5)';
                            e.target.style.transform = 'translateX(-50%) scale(1.0)';
                          }}
                        >
                          {savedProfileName ? savedProfileName : 'THE DREAMER'}
                        </div>
                        {/* Element display positioned under the name */}
                        {savedProfileElement && (
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '32px',
                            transform: 'translateX(-50%)',
                            fontSize: 10,
                            fontWeight: 700,
                            color: savedProfileElement === 'water' ? '#0099FF' : 
                                   savedProfileElement === 'lightning' ? '#00FFFF' : 
                                   savedProfileElement === 'darkness' ? '#FFFFFF' : 
                                   savedProfileElement === 'heart' ? '#FF69B4' : '#00FFFF',
                            textShadow: `0 0 8px ${savedProfileElement === 'water' ? '#0099FF' : 
                                                    savedProfileElement === 'lightning' ? '#00FFFF' : 
                                                    savedProfileElement === 'darkness' ? '#FFFFFF' : 
                                                    savedProfileElement === 'heart' ? '#FF69B4' : '#00FFFF'}`,
                            letterSpacing: '1px'
                          }}>
                            {savedProfileElement.toUpperCase()} ALIEN
                          </div>
                        )}
                        {/* THE CODE button positioned under THE DREAMER */}
                        <div style={{ position: 'absolute', left: '50%', top: savedProfileElement ? '52px' : '42px', transform: 'translateX(-50%)' }}>
                          <button
                            type="button"
                            aria-label="HEARTVERSE Code"
                            title="HEARTVERSE Code"
                            onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                            onClick={() => {
                              try { sfx.play('click', 0.4); } catch {}
                              setShowHeartverseCode(!showHeartverseCode);
                            }}
                            style={{
                              padding: '6px 16px',
                              borderRadius: 8,
                              background: '#FFFFFF',
                              border: '1px solid rgba(255,255,255,0.8)',
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: 'none'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = '#FFFFFF';
                              e.target.style.borderColor = 'rgba(255,255,255,1.0)';
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = 'none';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = '#FFFFFF';
                              e.target.style.borderColor = 'rgba(255,255,255,0.8)';
                              e.target.style.transform = 'scale(1.0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            THE CODE
                          </button>
                        </div>
                      </div>
                      {/* Header / Hero */}
                      {!showHeartverseCode && !showHeartCoinsContent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 2px 8px 2px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 14, opacity: 0.8 }}>Choose your path. Earn HEARTS. Unlock deeper access.</div>
                          </div>
                        </div>
                      )}

                      {/* HeartCoins Content Display */}
                      {!showHeartverseCode && showHeartCoinsContent && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '6px 2px 8px 2px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.4, marginBottom: 16 }}>
                              HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Your HeartCoin count</div>
                            <div style={{ 
                              fontSize: 32, 
                              fontWeight: 800, 
                              color: '#d3168c', 
                              textShadow: '0 0 16px rgba(211,22,140,0.8), 0 0 32px rgba(211,22,140,0.4)', 
                              filter: 'drop-shadow(0 0 8px rgba(211,22,140,0.6))',
                              letterSpacing: '0.02em'
                            }}>
                              ♡ {heartCoinsCount}
                            </div>
                          </div>
                          
                          {/* Daily Quests Section */}
                          <div style={{ 
                            width: '100%', 
                            padding: '16px 12px',
                            borderTop: '1px solid rgba(33,150,243,0.3)',
                            marginTop: '8px'
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center', opacity: 0.9 }}>
                              Daily Quests
                            </div>
                            
                            {/* Text a Friend Quest */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: 'rgba(33,150,243,0.1)',
                              borderRadius: '8px',
                              border: '1px solid rgba(33,150,243,0.2)',
                              marginBottom: '8px'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                                  Text a Friend
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>
                                  Share the Heartverse with someone special
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try { sfx.play('click', 0.4); } catch {}
                                  try { trackAnalytics('daily_invite_clicked', { location: 'heartcoins_popup' }); } catch {}
                                  
                                  const message = "I thought of you. I think this world could feel like home for you too.\nhttps://chxndler.world";
                                  
                                  // Try native share first, fallback to SMS
                                  if (typeof navigator !== 'undefined' && navigator.share) {
                                    navigator.share({
                                      text: message
                                    }).catch(() => {
                                      // Fallback to SMS
                                      window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                                    });
                                  } else {
                                    // Fallback to SMS
                                    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                                  }
                                  
                                  // Mark as done
                                  setDailyInviteDone(true);
                                }}
                                onMouseEnter={(e) => { 
                                  try { sfx.play('hover', 0.3); } catch {} 
                                  e.currentTarget.style.background = 'rgba(33,150,243,0.8)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => { 
                                  e.currentTarget.style.background = dailyInviteDone ? 'rgba(76,175,80,0.6)' : 'rgba(33,150,243,0.6)';
                                  e.currentTarget.style.transform = 'scale(1.0)';
                                }}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: dailyInviteDone ? 'rgba(76,175,80,0.6)' : 'rgba(33,150,243,0.6)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  textShadow: '0 0 8px rgba(0,0,0,0.5)',
                                  minWidth: '60px'
                                }}
                              >
                                {dailyInviteDone ? '♡ +5' : 'SHARE'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HEARTVERSE Code Display */}
                      {showHeartverseCode && (
                        <div style={{ 
                          position: 'absolute',
                          bottom: '6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 'calc(100% - 16px)',
                          maxWidth: '400px',
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(25,227,255,0.08))',
                          border: '1px solid rgba(33,150,243,0.4)',
                          boxShadow: '0 0 25px rgba(33,150,243,0.25), 0 8px 32px rgba(0,0,0,0.3)',
                          zIndex: 100
                        }}>
                          <div style={{ 
                            fontSize: 18, 
                            fontWeight: 800, 
                            color: '#FFFFFF', 
                            marginBottom: 4,
                            textAlign: 'center',
                            letterSpacing: '0.02em',
                            textShadow: '0 0 12px rgba(33,150,243,0.5)'
                          }}>
                            HEARTVERSE CODE
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* We Believe Section */}
                            <div>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 700, 
                                color: '#19E3FF', 
                                marginBottom: 4,
                                textShadow: '0 0 8px rgba(25,227,255,0.4)'
                              }}>
                                We Believe
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 8, listStyle: 'disc' }}>
                                <li style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 2, color: '#fff' }}>
                                  We believe being your <span style={{ color: '#00FFFF !important', textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF', fontWeight: 'inherit !important', WebkitTextFillColor: '#00FFFF !important', textFillColor: '#00FFFF !important' }}>truest self</span> is the beginning of freedom.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 2, color: '#fff' }}>
                                  We believe <span style={{ color: '#FFFF00', textShadow: '0 0 10px #FFFF00, 0 0 20px #FFFF00, 0 0 30px #FFFF00' }}>passion</span> is sacred and should be pursued loudly.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 2, color: '#fff' }}>
                                  We believe <span style={{ color: '#FF1493', textShadow: '0 0 10px #FF1493, 0 0 20px #FF1493, 0 0 30px #FF1493' }}>love</span> is the force that connects every soul.
                                </li>
                              </ul>
                            </div>

                          </div>
                        </div>
                      )}
                      
                      {/* PROFILE: interactive cards or details view */}
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
                            <span>Back to profile</span>
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
                      ) : !showHeartverseCode && !showHeartCoinsContent ? (
                        <div
                          style={{
                            marginTop: 4,
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'stretch',
                            gap: 16
                          }}
                        >
                          {/* Wanderer - vertical capsule flip button (tall rounded badge) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Wanderer (0–4 HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.25); } catch {}; setWandererHovered(true); }}
                            onMouseLeave={() => { setWandererHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'wanderer', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'wanderer', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 110,
                              height: 160,
                              position: 'relative',
                              borderRadius: '24px',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(0,180,255,0.34), rgba(0,180,255,0.16) 46%, rgba(0,60,90,0.35) 100%)',
                              border: '2px solid rgba(0,180,255,0.85)',
                              boxShadow: wandererHovered ? '0 0 18px rgba(0,180,255,0.85), 0 0 36px rgba(0,180,255,0.55), 0 0 50px rgba(0,180,255,0.05), inset 0 0 18px rgba(0,180,255,0.35)' : '0 0 10px rgba(0,180,255,0.65), 0 0 26px rgba(0,180,255,0.45), 0 0 40px rgba(0,180,255,0.05), inset 0 0 12px rgba(0,180,255,0.25)',
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
                                <div className="neon-blue" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#19E3FF' }}>The Wanderer</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#19E3FF' }}>
                                  <span className="neon-blue heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>0–4</span>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                                <div style={{ textAlign: 'center', color: '#19E3FF' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-blue">You have just arrived, drawn by the signal.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 4, textAlign: 'left', margin: '6px auto 0', width: '95%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>Released songs</li>
                                    <li>CHXNDLER card</li>
                                    <li>Entry into the HEARTVERSE</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Dreamer - vertical capsule flip button (tall rounded badge) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Dreamer (5–24 HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.25); } catch {}; setDreamerHovered(true); }}
                            onMouseLeave={() => { setDreamerHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'dreamer', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'dreamer', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 110,
                              height: 160,
                              position: 'relative',
                              borderRadius: '24px',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(255,212,0,0.36), rgba(255,212,0,0.18) 46%, rgba(90,80,0,0.32) 100%)',
                              border: '2px solid rgba(255,212,0,0.95)',
                              boxShadow: dreamerHovered ? '0 0 18px rgba(255,212,0,0.95), 0 0 36px rgba(255,212,0,0.60), 0 0 50px rgba(255,212,0,0.05), inset 0 0 18px rgba(255,212,0,0.35)' : '0 0 10px rgba(255,212,0,0.70), 0 0 26px rgba(255,212,0,0.45), 0 0 40px rgba(255,212,0,0.05), inset 0 0 12px rgba(255,212,0,0.25)',
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
                                <div className="neon-yellow" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#FFD400' }}>The Dreamer</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#FFD400' }}>
                                  <span className="neon-yellow heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>5–24</span>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                                <div style={{ textAlign: 'center', color: '#FFD400' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-yellow">You begin to awaken to the magic.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 4, textAlign: 'left', margin: '6px auto 0', width: '95%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>Unreleased songs</li>
                                    <li>Physical CHXNDLER cards</li>
                                    <li>Exclusive merch</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Lover - vertical capsule flip button (tall rounded badge) */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="The Lover (25+ HEARTS)"
                            onMouseEnter={() => { try { sfx.play('hover', 0.28); } catch {}; setLoverHovered(true); }}
                            onMouseLeave={() => { setLoverHovered(false); }}
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'lover', style: 'flip' }); } catch {} }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); try { trackAnalytics('heart_tier_clicked', { tier: 'lover', style: 'flip' }); } catch {} } }}
                            style={{
                              width: 110,
                              height: 160,
                              position: 'relative',
                              borderRadius: '24px',
                              background: 'radial-gradient(120% 140% at 50% 28%, rgba(255,79,216,0.38), rgba(255,79,216,0.18) 46%, rgba(90,0,60,0.32) 100%)',
                              border: '2px solid rgba(255,79,216,0.95)',
                              boxShadow: loverHovered ? '0 0 18px rgba(255,79,216,0.95), 0 0 36px rgba(255,79,216,0.60), 0 0 50px rgba(255,79,216,0.05), inset 0 0 18px rgba(255,79,216,0.35)' : '0 0 10px rgba(255,79,216,0.65), 0 0 28px rgba(255,79,216,0.50), 0 0 40px rgba(255,79,216,0.05), inset 0 0 12px rgba(255,79,216,0.28)',
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
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(33,150,243,0.95)) drop-shadow(0 0 28px rgba(33,150,243,0.55))' }}
                                />
                                <div className="neon-pink" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#FF4FD8' }}>The Lover</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#2196F3' }}>
                                  <span className="neon-pink heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>25+</span>
                                  <img src="/elements/heart-coin.png" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
                                </div>
                              </div>
                              {/* Back */}
                              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                                <div style={{ textAlign: 'center', color: '#FF4FD8' }}>
                                  <div style={{ fontSize: 10, lineHeight: 1.2, opacity: 0.95, marginTop: 4 }} className="neon-pink">The ones who feel the HEARTVERSE beating inside them.</div>
                                  <ul style={{ listStyle: 'disc', paddingLeft: 4, textAlign: 'left', margin: '6px auto 0', width: '95%', fontSize: 10, lineHeight: 1.3 }}>
                                    <li>Direct line to CHXNDLER</li>
                                    <li>Private concert</li>
                                    <li>Limited edition merch</li>
                                    <li>Rare CHXNDLER cards</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END heart popover */}
                
                {/* Heart Coin Details Popover */}
                {typeof document !== 'undefined' && showHeartCoinPopover && heartCoinPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="HEART COIN DETAILS"
                    className="heart-hologram"
                    style={{
                      position: 'fixed',
                      left: (heartCoinPopoverPos && heartCoinPopoverPos.left) || 0,
                      top: (heartCoinPopoverPos && heartCoinPopoverPos.top) || 0,
                      transform: 'translateX(-50%)',
                      padding: '16px',
                      borderRadius: 14,
                      background: 'radial-gradient(140% 160% at 50% 0%, rgba(33,150,243,0.15), rgba(208,14,104,0.10) 35%, rgba(55,6,35,0.85) 100%)',
                      border: '1px solid rgba(33,150,243,0.45)',
                      boxShadow: '0 18px 46px rgba(0,0,0,0.35), 0 0 26px rgba(33,150,243,0.35)',
                      backdropFilter: 'blur(8px) saturate(1.15)',
                      color: '#fff',
                      zIndex: 2147483647,
                      width: 'min(95vw, 320px)',
                      height: (heartCoinPopoverPos && heartCoinPopoverPos.height) || 'auto',
                      overflowY: 'auto',
                      overflowX: 'hidden'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHeartCoinPopover(false); } }}
                  >
                    {/* Close button */}
                    <button
                      aria-label="Close"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(0,0,0,0.35)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = 'none'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowHeartCoinPopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(33,150,243,0.8), rgba(208,14,104,0.6))',
                        border: '1px solid rgba(33,150,243,0.6)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>

                    {/* Header with heart coin icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 40 }}>
                      <img
                        src="/elements/heart-coin.png"
                        alt="HEART Coin"
                        width={32}
                        height={32}
                        className="heart-coin-glow"
                        style={{ display: 'block', width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(33,150,243,0.6))' }}
                      />
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#2196F3', textShadow: '0 0 10px rgba(33,150,243,0.7)' }}>
                          HEART Coins
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                          Your current balance: 32
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                      <p style={{ margin: '0 0 12px 0' }}>
                        HEART Coins are earned by purchasing merch from the store. Use them to unlock exclusive content and advance through profile tiers.
                      </p>
                      
                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 800, color: '#FFB9E1' }}>How to earn:</h4>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                          <li>Purchase merch items (varies by item)</li>
                          <li>Special events and promotions</li>
                          <li>Community participation</li>
                        </ul>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 800, color: '#FFB9E1' }}>Tier progression:</h4>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ color: '#19E3FF', fontWeight: 800 }}>Wanderer</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>0-4 HEARTS</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ color: '#FFD400', fontWeight: 800 }}>Dreamer</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>5-24 HEARTS</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#2196F3', fontWeight: 800 }}>Lover</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>25+ HEARTS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END Heart Coin Details popover */}
                
                {/* Digital Binder Popover */}
                {typeof document !== 'undefined' && showBookPopover ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Digital Binder"
                    style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'min(90vw, 600px)',
                      height: 'min(60vh, 400px)',
                      background: 'radial-gradient(140% 160% at 50% 0%, rgba(33,150,243,0.25), rgba(14,168,208,0.18) 35%, rgba(60,20,45,0.55) 100%)',
                      border: '1px solid rgba(33,150,243,0.5)',
                      borderRadius: 16,
                      boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(33,150,243,0.3)',
                      backdropFilter: 'blur(12px) saturate(1.2)',
                      color: '#fff',
                      zIndex: 2147483647,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <button
                      aria-label="Close Digital Binder"
                      onClick={() => setShowBookPopover(false)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.background = 'rgba(252,84,175,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 32,
                        height: 32,
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 16,
                        color: '#FC54AF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                        textShadow: '0 0 8px rgba(252,84,175,0.6)'
                      }}
                    >
                      ×
                    </button>
                    
                    {/* Header */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: 4,
                      paddingTop: 2
                    }}>
                      <h2 style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: '#2196F3',
                        textShadow: '0 0 12px rgba(33,150,243,0.6)',
                        margin: 0,
                        marginBottom: 6
                      }}>
                        HEARTVERSE BINDER
                      </h2>
                      <p style={{
                        fontSize: 13,
                        opacity: 0.8,
                        margin: 0,
                        marginBottom: 2,
                        color: '#fff'
                      }}>
                        Your personal archive of Heartverse memories.
                      </p>
                      <p style={{
                        fontSize: 11,
                        opacity: 0.6,
                        margin: 0,
                        color: '#fff',
                        lineHeight: 1.4
                      }}>
                        Collect cards, earn badges, and discover hidden collectibles as you explore this world.
                      </p>
                    </div>
                    
                    {/* Trading Card Album Content */}
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(33,150,243,0.03), rgba(25,227,255,0.02))',
                      borderRadius: 12,
                      padding: '8px',
                      position: 'relative',
                      overflow: 'auto'
                    }}>
                      {/* Hologram pattern overlay */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 11px)',
                        borderRadius: 12,
                        pointerEvents: 'none'
                      }} />
                      
                      {/* Collection stats */}
                      <div style={{
                        marginBottom: 6,
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#FC54AF',
                          margin: 0,
                          marginBottom: 4,
                          textShadow: '0 0 8px rgba(252,84,175,0.4)'
                        }}>
                          CHXNDLER Card Collection
                        </h3>
                        <p style={{
                          fontSize: 12,
                          opacity: 0.7,
                          margin: 0,
                          marginBottom: 8,
                          color: '#fff'
                        }}>
                          {(() => {
                            const collectedCount = binderCards.filter(card => card !== null).length;
                            const totalCount = allCards.length;
                            return `${collectedCount} of ${totalCount} cards collected`;
                          })()}
                        </p>
                      </div>

                      {/* FULL COLLECTION Button */}
                      <div style={{
                        marginBottom: 6,
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <button
                          aria-label="View Full Collection"
                          title="View Full Collection"
                          onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                          onClick={() => {
                            try { sfx.play('click', 0.4); } catch {}
                            setShowFullCollection(true);
                            setCurrentCardIndex(0);
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#FC54AF',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textShadow: '0 0 8px rgba(252,84,175,0.6)',
                            boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 2px 8px rgba(255,255,255,0.2)',
                            filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.7))'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.95))';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 0 25px rgba(255,255,255,0.9), 0 0 50px rgba(255,255,255,0.5), 0 4px 12px rgba(255,255,255,0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                            e.currentTarget.style.transform = 'translateY(0px)';
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 2px 8px rgba(255,255,255,0.2)';
                          }}
                        >
                          FULL COLLECTION
                        </button>
                      </div>
                      
                      {/* Card slots grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                        gap: '8px',
                        maxWidth: '700px',
                        margin: '0 auto',
                        position: 'relative',
                        zIndex: 1,
                        '@media (max-width: 768px)': {
                          gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                          gap: '6px'
                        }
                      }}>
                        {binderCards.map((card, index) => (
                          <div
                            key={index}
                            style={{
                              aspectRatio: '2.5/3.5',
                              background: card ? 
                                'radial-gradient(circle at 30% 40%, rgba(25,227,255,0.15), rgba(33,150,243,0.08) 60%, rgba(255,212,0,0.06) 100%)' :
                                'radial-gradient(circle at 30% 40%, rgba(33,150,243,0.08), rgba(25,227,255,0.06) 60%, rgba(255,212,0,0.04) 100%)',
                              border: card ? 
                                '2px solid rgba(25,227,255,0.6)' :
                                '2px dashed rgba(33,150,243,0.3)',
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              cursor: card ? 'pointer' : 'default',
                              transition: 'all 0.3s ease',
                              minHeight: '120px',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (card) {
                                try { sfx.play('hover', 0.35); } catch {}
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.borderColor = 'rgba(25,227,255,0.8)';
                              } else {
                                e.currentTarget.style.borderColor = 'rgba(252,84,175,0.6)';
                                e.currentTarget.style.background = 'radial-gradient(circle at 30% 40%, rgba(252,84,175,0.12), rgba(25,227,255,0.08) 60%, rgba(255,212,0,0.06) 100%)';
                                e.currentTarget.style.transform = 'scale(1.02)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.borderColor = card ? 
                                'rgba(25,227,255,0.6)' :
                                'rgba(252,84,175,0.3)';
                              if (!card) {
                                e.currentTarget.style.background = 'radial-gradient(circle at 30% 40%, rgba(252,84,175,0.08), rgba(25,227,255,0.06) 60%, rgba(255,212,0,0.04) 100%)';
                              }
                            }}
                            onClick={() => {
                              if (card) {
                                try { sfx.play('click', 0.4); } catch {}
                                setSelectedCard(card);
                                setShowCardPopup(true);
                              }
                            }}
                          >
                            {card ? (
                              // Card content
                              <>
                                <img
                                  src={card.image}
                                  alt={card.title}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '10px',
                                    filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
                                    transition: 'filter 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.filter = 'brightness(1.3) contrast(1.2) saturate(1.3) drop-shadow(0 0 15px rgba(25,227,255,0.8))';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.filter = 'brightness(1.1) contrast(1.05) saturate(1.1)';
                                  }}
                                />
                                {/* Card overlay with title */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                  color: '#fff',
                                  padding: '8px 4px 4px',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  textAlign: 'center',
                                  textShadow: '0 0 8px rgba(25,227,255,0.8)'
                                }}>
                                  {card.title}
                                </div>
                              </>
                            ) : (
                              // Empty slot content
                              <>
                                {/* Shimmer effect for empty slots */}
                                <div style={{
                                  position: 'absolute',
                                  top: '-50%',
                                  left: '-50%',
                                  width: '200%',
                                  height: '200%',
                                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                                  animation: 'shimmer 3s ease-in-out infinite',
                                  borderRadius: '12px'
                                }} />
                                
                                {/* Empty state content */}
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '8px',
                                  opacity: 0.6,
                                  zIndex: 1
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    border: '2px dashed rgba(33,150,243,0.4)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <span style={{
                                      fontSize: '18px',
                                      color: 'rgba(33,150,243,0.5)'
                                    }}>
                                      +
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: '10px',
                                    color: 'rgba(255,255,255,0.5)',
                                    textAlign: 'center',
                                    fontWeight: 500
                                  }}>
                                    Empty Slot
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END Digital Binder popover */}
                
                {/* Card Popup Modal */}
                {typeof document !== 'undefined' && showCardPopup && selectedCard ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Card Details"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(4px)',
                      zIndex: 2147483648,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20
                    }}
                    onClick={() => setShowCardPopup(false)}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '320px',
                        height: '480px',
                        background: 'radial-gradient(140% 160% at 50% 0%, rgba(25,227,255,0.25), rgba(33,150,243,0.18) 35%, rgba(20,60,85,0.55) 100%)',
                        border: '2px solid rgba(25,227,255,0.6)',
                        borderRadius: 16,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 30px rgba(25,227,255,0.4)',
                        backdropFilter: 'blur(12px) saturate(1.2)',
                        padding: 20,
                        overflow: 'hidden'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Close button */}
                      <button
                        aria-label="Close Card Popup"
                        onClick={() => setShowCardPopup(false)}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: 16,
                          color: '#19E3FF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 'bold',
                          zIndex: 10,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(25,227,255,0.2)';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(0,0,0,0.6)';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        ×
                      </button>

                      {/* Card display area */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Card image with tilt effect */}
                        <div style={{
                          position: 'relative',
                          width: '240px',
                          height: '336px',
                          perspective: '800px',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            transformStyle: 'preserve-3d',
                            transform: 'rotateX(8deg) rotateY(-8deg)',
                            transition: 'transform 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'rotateX(4deg) rotateY(-4deg) scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'rotateX(8deg) rotateY(-8deg) scale(1)';
                          }}>
                            <img
                              src={selectedCard.image}
                              alt={selectedCard.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                filter: 'brightness(1.1) contrast(1.05) saturate(1.2) drop-shadow(0 8px 20px rgba(25,227,255,0.4)) drop-shadow(0 4px 12px rgba(33,150,243,0.3))',
                                transition: 'filter 0.3s ease'
                              }}
                            />
                            
                            {/* Holographic sheen effect */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(25,227,255,0.1) 100%)',
                              borderRadius: '12px',
                              pointerEvents: 'none',
                              opacity: 0.6
                            }} />
                          </div>
                        </div>

                        {/* Floating particles effect around card */}
                        <div style={{
                          position: 'absolute',
                          inset: -10,
                          pointerEvents: 'none',
                          overflow: 'hidden'
                        }}>
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              style={{
                                position: 'absolute',
                                width: '3px',
                                height: '3px',
                                background: i % 2 === 0 ? '#19E3FF' : '#2196F3',
                                borderRadius: '50%',
                                left: `${15 + (i * 12)}%`,
                                top: `${10 + (i * 10)}%`,
                                animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`,
                                filter: 'blur(0.5px)',
                                opacity: 0.8
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      
                        {/* Card info */}
                        <div style={{
                          textAlign: 'center',
                          color: '#fff'
                        }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#19E3FF',
                            textShadow: '0 0 12px rgba(25,227,255,0.6)',
                            marginBottom: '4px'
                          }}>
                            {selectedCard.title}
                          </h3>
                          <div style={{
                            fontSize: '12px',
                            opacity: 0.8,
                            color: '#CFF7FF'
                          }}>
                            {selectedCard.rarity?.toUpperCase()} • {selectedCard.type?.toUpperCase()}
                          </div>
                        </div>
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END Card Popup Modal */}

                {/* Full Collection Modal */}
                {typeof document !== 'undefined' && showFullCollection ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Full Card Collection"
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.8)',
                      backdropFilter: 'blur(8px)',
                      zIndex: 2147483648,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20
                    }}
                    onClick={() => setShowFullCollection(false)}
                  >
                    <div
                      style={{
                        width: 'min(90vw, 700px)',
                        height: 'min(80vh, 600px)',
                        background: 'radial-gradient(140% 160% at 50% 0%, rgba(33,150,243,0.3), rgba(14,168,208,0.2) 35%, rgba(60,20,45,0.6) 100%)',
                        border: '1px solid rgba(33,150,243,0.5)',
                        borderRadius: 20,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(33,150,243,0.3)',
                        backdropFilter: 'blur(12px)',
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header with close button */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px 20px 0 20px'
                      }}>
                        <h2 style={{
                          fontSize: 24,
                          fontWeight: 900,
                          color: '#2196F3',
                          textShadow: '0 0 12px rgba(33,150,243,0.6)',
                          margin: 0
                        }}>
                          FULL COLLECTION
                        </h2>
                        <button
                          aria-label="Close Full Collection"
                          onClick={() => setShowFullCollection(false)}
                          style={{
                            width: 32,
                            height: 32,
                            border: 'none',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 'bold'
                          }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Filters */}
                      <div style={{
                        display: 'flex',
                        gap: 12,
                        padding: '0 20px 20px 20px',
                        alignItems: 'center'
                      }}>
                        <select
                          value={selectedRarity}
                          onChange={(e) => {
                            setSelectedRarity(e.target.value);
                            setCurrentCardIndex(0);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid rgba(33,150,243,0.4)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="all">RARITY</option>
                          <option value="Common">Common</option>
                          <option value="Rare">Rare</option>
                          <option value="Legendary">Legendary</option>
                        </select>
                        
                        <select
                          value={selectedType}
                          onChange={(e) => {
                            setSelectedType(e.target.value);
                            setCurrentCardIndex(0);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid rgba(33,150,243,0.4)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="all">ELEMENT</option>
                          <option value="HEART">HEART</option>
                          <option value="WATER">WATER</option>
                          <option value="LIGHTNING">LIGHTNING</option>
                          <option value="DARKNESS">DARKNESS</option>
                        </select>
                        
                        <span style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginLeft: 'auto'
                        }}>
                          {currentCardIndex + 1} of {filteredCards.length}
                        </span>
                      </div>

                      {/* Card Display */}
                      {filteredCards.length > 0 && (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 20px 20px 20px'
                        }}>
                          {(() => {
                            const card = filteredCards[currentCardIndex];
                            return (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 16,
                                maxWidth: '100%'
                              }}>
                                {/* Card Image */}
                                <div style={{
                                  position: 'relative',
                                  aspectRatio: '2.5/3.5',
                                  width: '200px',
                                  background: 'radial-gradient(circle at 30% 40%, rgba(33,150,243,0.1), rgba(25,227,255,0.08) 60%, rgba(255,212,0,0.06) 100%)',
                                  border: `2px solid ${card.rarity === 'Legendary' ? '#FFD700' : card.rarity === 'Rare' ? '#3498DB' : '#95A5A6'}`,
                                  borderRadius: 12,
                                  overflow: 'hidden',
                                  boxShadow: `0 0 20px ${card.rarity === 'Legendary' ? 'rgba(255,215,0,0.3)' : card.rarity === 'Rare' ? 'rgba(52,152,219,0.3)' : 'rgba(149,165,166,0.3)'}`
                                }}>
                                  <img
                                    src={card.image}
                                    alt={card.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      filter: card.collected ? 'none' : 'blur(8px) grayscale(0.7) brightness(0.6)',
                                      transition: 'filter 0.3s ease'
                                    }}
                                  />
                                  {!card.collected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      background: 'rgba(0,0,0,0.8)',
                                      color: '#fff',
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      textShadow: '0 0 4px rgba(0,0,0,0.8)'
                                    }}>
                                      UNRELEASED
                                    </div>
                                  )}
                                </div>

                                {/* Card Info */}
                                <div style={{
                                  textAlign: 'center',
                                  maxWidth: '300px'
                                }}>
                                  <h3 style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    margin: 0,
                                    marginBottom: 4,
                                    color: '#2196F3'
                                  }}>
                                    {card.name}
                                  </h3>
                                  <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    justifyContent: 'center',
                                    marginBottom: 8
                                  }}>
                                    <span style={{
                                      fontSize: 12,
                                      padding: '2px 8px',
                                      borderRadius: 10,
                                      background: card.rarity === 'Legendary' ? 'rgba(255,215,0,0.2)' : card.rarity === 'Rare' ? 'rgba(52,152,219,0.2)' : 'rgba(149,165,166,0.2)',
                                      color: card.rarity === 'Legendary' ? '#FFD700' : card.rarity === 'Rare' ? '#3498DB' : '#95A5A6'
                                    }}>
                                      {card.rarity}
                                    </span>
                                    <span style={{
                                      fontSize: 12,
                                      padding: '2px 8px',
                                      borderRadius: 10,
                                      background: 'rgba(33,150,243,0.2)',
                                      color: '#2196F3'
                                    }}>
                                      {card.type}
                                    </span>
                                  </div>
                                  <p style={{
                                    fontSize: 14,
                                    opacity: 0.8,
                                    margin: 0,
                                    lineHeight: 1.4
                                  }}>
                                    {card.description}
                                  </p>
                                </div>

                                {/* Navigation */}
                                <div style={{
                                  display: 'flex',
                                  gap: 16,
                                  alignItems: 'center'
                                }}>
                                  <button
                                    onClick={() => {
                                      try { sfx.play('click', 0.3); } catch {}
                                      setCurrentCardIndex(prev => prev > 0 ? prev - 1 : filteredCards.length - 1);
                                    }}
                                    disabled={filteredCards.length <= 1}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: '50%',
                                      border: '1px solid rgba(33,150,243,0.4)',
                                      background: 'rgba(33,150,243,0.1)',
                                      color: '#2196F3',
                                      cursor: filteredCards.length > 1 ? 'pointer' : 'not-allowed',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 18,
                                      opacity: filteredCards.length > 1 ? 1 : 0.5
                                    }}
                                  >
                                    ←
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      try { sfx.play('click', 0.3); } catch {}
                                      setCurrentCardIndex(prev => prev < filteredCards.length - 1 ? prev + 1 : 0);
                                    }}
                                    disabled={filteredCards.length <= 1}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: '50%',
                                      border: '1px solid rgba(33,150,243,0.4)',
                                      background: 'rgba(33,150,243,0.1)',
                                      color: '#2196F3',
                                      cursor: filteredCards.length > 1 ? 'pointer' : 'not-allowed',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 18,
                                      opacity: filteredCards.length > 1 ? 1 : 0.5
                                    }}
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {filteredCards.length === 0 && (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.6
                        }}>
                          <p>No cards match the selected filters.</p>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}
                {/* END Full Collection Modal */}

                {typeof document !== 'undefined' && showApplePopover && amEmbedUrl ? createPortal(
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

                {typeof document !== 'undefined' && showSpotifyPopover && spEmbedUrl ? createPortal(
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

                {typeof document !== 'undefined' && showYouTubePopover && ytEmbedUrl ? createPortal(
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

                {typeof document !== 'undefined' && showStorePopover && storePopoverPos ? createPortal(
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
                      border: '1px solid rgba(33,150,243,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(33,150,243,0.45)',
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
                    {/* Pink close button in the top-right corner */}
                    <button
                      aria-label="Close store"
                      title="Close store"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(33,150,243,0.95), 0 0 42px rgba(33,150,243,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(33,150,243,0.75), 0 0 32px rgba(33,150,243,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowStorePopover(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(33,150,243,0.85)',
                        color: '#FF3EA5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(33,150,243,0.75), 0 0 32px rgba(33,150,243,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {/* Tab Navigation */}
                    <div style={{ 
                      display: 'flex', 
                      gap: 4, 
                      marginBottom: 8, 
                      paddingLeft: 4 
                    }}>
                      <button
                        onClick={() => setStoreActiveTab('MERCH')}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid rgba(252,84,175,0.4)',
                          background: storeActiveTab === 'MERCH' ? 'rgba(252,84,175,0.3)' : 'rgba(0,0,0,0.3)',
                          color: storeActiveTab === 'MERCH' ? '#FC54AF' : '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        MERCH
                      </button>
                      <button
                        onClick={() => {
                          setStoreActiveTab('CARDS');
                          // Dispatch event to open digital binder full collection
                          try {
                            window.dispatchEvent(new Event('openDigitalBinder'));
                          } catch {}
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid rgba(252,84,175,0.4)',
                          background: storeActiveTab === 'CARDS' ? 'rgba(252,84,175,0.3)' : 'rgba(0,0,0,0.3)',
                          color: storeActiveTab === 'CARDS' ? '#FC54AF' : '#fff',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        CARDS
                      </button>
                    </div>

                    {(() => {
                      const item = products[Math.max(0, Math.min(products.length - 1, storeIndex))] || products[0];
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                          {/* Tab Content */}
                          {storeActiveTab === 'MERCH' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                <div style={{ fontWeight: 800, letterSpacing: '0.04em', color: '#FFC1E6', textShadow: '0 0 12px rgba(33,150,243,0.9), 0 0 24px rgba(33,150,243,0.55)' }}>
                                  The HEARTVERSE Collection
                                </div>
                              </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 12, alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              {/* Navigation arrows above product image */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                              </div>
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
                                    border: '1px solid rgba(33,150,243,0.35)',
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
                                    border: '1px solid rgba(33,150,243,0.35)',
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
                                <img src={item.image || 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'} alt={item.title} style={{ display: 'block', width: 104, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(33,150,243,0.35)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }} onError={(e)=>{ try { e.currentTarget.src = 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910'; } catch {} }} />
                              )}
                              {/* Price directly under the image (show $ price and HEART coins side by side) */}
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFB9E1', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {/* Cash price */}
                                <span>{item.price}</span>
                                {/* Separator */}
                                <span style={{ color: '#FFB9E1', opacity: 0.6 }}>|</span>
                                {/* HeartCoin price */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    type="button"
                                    aria-label="PROFILE"
                                    title="PROFILE"
                                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                    onClick={() => {
                                      try { sfx.play('click', 0.35); } catch {};
                                      try { trackAnalytics('heart_coin_clicked', { song_slug: String(active || currentId || 'store'), payload: { song_title: track?.title || 'Unknown', location: 'store_price_icon' } }); } catch {}
                                      setShowHeartCoinStorePopup(true);
                                    }}
                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                                  >
                                    <img
                                      src="/elements/heart-coin.png"
                                      alt="HEART Coin"
                                      width={22}
                                      height={22}
                                      className="heart-coin-glow"
                                      style={{ display: 'inline-block', width: 22, height: 22, objectFit: 'contain' }}
                                    />
                                  </button>
                                  <span style={{ fontSize: 14 }}>{item.heartcoins}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFD9EF', textShadow: '0 0 10px rgba(33,150,243,0.9)' }}>{item.title}</div>
                              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{item.description}</div>
                              {/* Controls moved directly under description */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                            <button
                              aria-label="Previous item"
                              className="store-arrow-btn"
                              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                              onClick={() => { setStoreIndex((i) => (i - 1 + products.length) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                              style={{
                                width: 36, height: 36, borderRadius: 999,
                                background: 'transparent',
                                border: '2px solid #ff3ea5', color: '#ff3ea5',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 15px rgba(255, 62, 165, 0.6)'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="store-add-btn"
                                data-id="store-collection"
                                data-item-id={item.id}
                                onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                                onClick={() => {
                                  try { sfx.play('join', 0.75); } catch {}
                                  // Dispatch event to open collection panel
                                  try {
                                    const songSlug = (typeof slug !== 'undefined' && slug) ? slug : (active || 'unknown');
                                    const songTitle = currentSong?.title || track?.title || 'Unknown';
                                    window.dispatchEvent(new CustomEvent('openCollectionPanel', {
                                      detail: {
                                        songSlug,
                                        songTitle,
                                        itemId: item.id,
                                        itemTitle: item.title,
                                        cardSrc: item.image
                                      }
                                    }));
                                    trackAnalytics('store_collection_clicked', { song_slug: String(songSlug || ''), payload: { song_title: songTitle, item_id: item.id, item_title: item.title, location: 'hud_store_collection' } });
                                  } catch {}
                                }}
                                style={{
                                  padding: '6px 10px', borderRadius: 999,
                                  background: 'linear-gradient(135deg,#ff3ea5,#ff76c8)',
                                  border: '1px solid rgba(255,255,255,0.6)', color: '#fff', fontWeight: 700,
                                  boxShadow: '0 6px 18px rgba(255, 62, 165, 0.45)', cursor: 'pointer',
                                  fontSize: 12
                                }}
                              >
                                Add to Collection
                              </button>
                            </div>
                            <button
                              aria-label="Next item"
                              className="store-arrow-btn"
                              onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                              onClick={() => { setStoreIndex((i) => (i + 1) % products.length); try { sfx.play('click', 0.35); } catch {} }}
                              style={{
                                width: 36, height: 36, borderRadius: 999,
                                background: 'transparent',
                                border: '2px solid #ff3ea5', color: '#ff3ea5',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 15px rgba(255, 62, 165, 0.6)'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                            </button>
                          </div>
                          {/* Missing closing divs for the nested structure */}
                          </div>
                          </div>
                          {/* Removed helper hint per request */}
                          </>
                          )}
                          
                        </div>
                      );
                    })()}
                  </div>,
                  document.body
                ) : null}

                {/* Heart Coin Store Popup */}
                {typeof document !== 'undefined' && showHeartCoinStorePopup && showStorePopover ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Heart Coin Information"
                    style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'min(90vw, 400px)',
                      padding: '20px',
                      borderRadius: 18,
                      background: 'rgba(0,0,0,0.85)',
                      border: '1px solid rgba(255,105,180,0.55)',
                      boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
                      backdropFilter: 'blur(12px) saturate(140%)',
                      color: '#FF69B4',
                      zIndex: 2147483648,
                      animation: 'fadeIn 0.3s ease-out'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowHeartCoinStorePopup(false); } }}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => {
                        try { sfx.play('close', 0.4); } catch {}
                        setShowHeartCoinStorePopup(false);
                      }}
                      className="absolute top-3 right-3 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
                      style={{ 
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        fontSize: '16px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,105,180,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,105,180,0.1)',
                        color: '#FF69B4',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(255,105,180,0.8)',
                        textShadow: '0 0 8px rgba(255,105,180,0.8)',
                        backdropFilter: 'blur(2px)'
                      }}
                    >
                      ×
                    </button>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div 
                        style={{ 
                          fontSize: '18px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#FF69B4', 
                          textShadow: '0 0 8px rgba(255,105,180,0.6)' 
                        }}
                      >
                        HEART COINS
                      </div>
                      
                      {/* Thin pink neon line */}
                      <div 
                        style={{
                          width: '100%',
                          height: '1px',
                          background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
                          boxShadow: '0 0 4px rgba(255,105,180,0.6)',
                          marginBottom: '16px'
                        }}
                      />
                    </div>

                    {/* User Info Section */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      {/* Element Icon */}
                      <div style={{ marginBottom: '12px' }}>
                        <img
                          src={`/elements/${(() => {
                            try {
                              const userProgress = JSON.parse(localStorage.getItem('heartverse_user_progress') || '{}');
                              return userProgress.element || 'heart';
                            } catch {
                              return 'heart';
                            }
                          })()}.png`}
                          alt="Your Element"
                          style={{
                            width: '48px',
                            height: '48px',
                            filter: 'drop-shadow(0 0 8px rgba(255,105,180,0.8))'
                          }}
                        />
                      </div>
                      
                      {/* User Name */}
                      <div 
                        style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#FFB6C1',
                          textShadow: '0 0 4px rgba(255,182,193,0.6)',
                          marginBottom: '16px'
                        }}
                      >
                        {(() => {
                          try {
                            return localStorage.getItem('heartverse_username') || 'Wanderer';
                          } catch {
                            return 'Wanderer';
                          }
                        })()}
                      </div>
                    </div>

                    {/* Heart Coin Balance */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', gap: '12px' }}>
                      <img
                        src="/elements/heart-coin.png"
                        alt="Heart Coin"
                        style={{
                          width: '40px',
                          height: '40px',
                          filter: 'drop-shadow(0 0 8px rgba(255,105,180,0.8))'
                        }}
                      />
                      <div 
                        style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#FFFFFF',
                          textShadow: '0 0 8px rgba(255,255,255,0.8)'
                        }}
                      >
                        {heartCoinsCount}
                      </div>
                    </div>

                    {/* Current Item Info */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div 
                        style={{
                          fontSize: '14px',
                          color: '#FFB6C1',
                          marginBottom: '8px'
                        }}
                      >
                        Current Item Price:
                      </div>
                      <div 
                        style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#FF69B4',
                          textShadow: '0 0 6px rgba(255,105,180,0.8)'
                        }}
                      >
                        {(() => {
                          const item = products[Math.max(0, Math.min(products.length - 1, storeIndex))] || products[0];
                          return `${item.heartcoins} Heart Coins`;
                        })()}
                      </div>
                    </div>

                    {/* Purchase Status */}
                    <div style={{ textAlign: 'center' }}>
                      {(() => {
                        const item = products[Math.max(0, Math.min(products.length - 1, storeIndex))] || products[0];
                        const canAfford = heartCoinsCount >= item.heartcoins;
                        return (
                          <div 
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              background: canAfford ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
                              border: `1px solid ${canAfford ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.4)'}`,
                              color: canAfford ? '#90EE90' : '#FF6B6B'
                            }}
                          >
                            {canAfford ? 
                              '✓ You can purchase this item!' : 
                              `✗ You need ${item.heartcoins - heartCoinsCount} more Heart Coins`
                            }
                          </div>
                        );
                      })()}
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showLyricsPopover && lyricsPopoverPos ? (() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  return createPortal(
                    <div
                      role="dialog"
                      aria-label="Lyrics"
                      className="lyrics-popover-hud holo-scrollbar-yellow lyrics-modal-enhanced"
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
                        overflow: 'auto',
                        // Fade-in and float animations
                        animation: 'lyricsModalFadeIn 0.25s ease-out, lyricsModalFloat 6s ease-in-out infinite alternate'
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
                      {/* Moving glow background */}
                      <div className="lyrics-glow-bg"></div>
                      {/* Section header */}
                      <div className="lyrics-header">
                        LYRICS — {isHome ? 'CHXNDLER' : (currentSong?.title || 'UNKNOWN')}
                      </div>
                    {lyricsLoading ? (
                      <div style={{ fontSize: 18, opacity: .99, color: '#F2EF1D', textShadow: '0 0 12px rgba(242,239,29,1), 0 0 26px rgba(242,239,29,0.75)' }}>Loading…</div>
                    ) : lyricsError ? (
                      <div style={{ fontSize: 18, color: '#ff7b7b' }}>{lyricsError}</div>
                    ) : (
                      <div className="lyrics-content-enhanced" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 18, color: '#F6F4A9', textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(246,244,169,0.6)' }}>{lyricsContent || 'No lyrics available.'}</div>
                    )}
                    {null}
                    </div>,
                    document.body
                  );
                })() : null}


                {/* Profile Setup Modal */}
                {typeof document !== 'undefined' && showProfileSetup ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Profile Setup"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(0, 0, 0, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2147483647,
                      backdropFilter: 'blur(8px)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: 'min(90vw, 500px)',
                        background: 'rgba(3,10,20,0.95)',
                        border: '2px solid #00FFFF',
                        borderRadius: 16,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,255,0.4)',
                        backdropFilter: 'blur(12px)',
                        padding: 30,
                        color: '#FFFFFF'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Close button */}
                      <button
                        aria-label="Close profile setup"
                        onClick={() => setShowProfileSetup(false)}
                        style={{
                          position: 'absolute',
                          top: 15,
                          right: 15,
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'rgba(0,0,0,0.6)',
                          borderRadius: 16,
                          color: '#00FFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>

                      {/* Step 1: Name Input */}
                      {profileSetupStep === 1 && (
                        <div style={{ textAlign: 'center' }}>
                          <h2 style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: '#00FFFF',
                            textShadow: '0 0 12px rgba(0,255,255,0.6)',
                            marginBottom: 10
                          }}>
                            WELCOME TO THE HEARTVERSE
                          </h2>
                          <p style={{
                            color: '#FFFFFF',
                            marginBottom: 30,
                            fontSize: 16,
                            lineHeight: 1.5
                          }}>
                            What shall we call you, alien?
                          </p>
                          
                          <input
                            type="text"
                            placeholder="Enter your name"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '15px',
                              fontSize: 16,
                              background: 'rgba(0,0,0,0.3)',
                              border: '2px solid rgba(0,255,255,0.5)',
                              borderRadius: 8,
                              color: '#FFFFFF',
                              marginBottom: 20,
                              textAlign: 'center'
                            }}
                            onFocus={(e) => e.target.style.border = '2px solid #00FFFF'}
                            onBlur={(e) => e.target.style.border = '2px solid rgba(0,255,255,0.5)'}
                          />

                          <button
                            onClick={() => {
                              if (profileName.trim()) {
                                setProfileSetupStep(2);
                                try { sfx.play('click', 0.4); } catch {}
                              }
                            }}
                            disabled={!profileName.trim()}
                            style={{
                              width: '100%',
                              padding: '15px',
                              fontSize: 16,
                              fontWeight: 'bold',
                              background: profileName.trim() ? 'transparent' : 'rgba(0,0,0,0.5)',
                              border: `2px solid ${profileName.trim() ? '#00FFFF' : 'rgba(255,255,255,0.3)'}`,
                              borderRadius: 8,
                              color: profileName.trim() ? '#00FFFF' : 'rgba(255,255,255,0.5)',
                              cursor: profileName.trim() ? 'pointer' : 'not-allowed',
                              boxShadow: profileName.trim() ? '0 0 20px rgba(0,255,255,0.5)' : 'none',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            CONTINUE
                          </button>
                        </div>
                      )}

                      {/* Step 2: Element Selection */}
                      {profileSetupStep === 2 && (
                        <div style={{ textAlign: 'center' }}>
                          <h2 style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: '#00FFFF',
                            textShadow: '0 0 12px rgba(0,255,255,0.6)',
                            marginBottom: 10
                          }}>
                            CHOOSE YOUR ELEMENT
                          </h2>
                          <p style={{
                            color: '#FFFFFF',
                            marginBottom: 30,
                            fontSize: 16,
                            lineHeight: 1.5
                          }}>
                            Which cosmic element calls to your soul, {profileName}?
                          </p>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '20px',
                            marginBottom: 30,
                            flexWrap: 'wrap'
                          }}>
                            {[
                              { id: 'water', icon: '/water.png', name: 'WATER', color: '#0099FF' },
                              { id: 'lightning', icon: '/lightning.png', name: 'LIGHTNING', color: '#00FFFF' },
                              { id: 'darkness', icon: '/darkness.png', name: 'DARKNESS', color: '#FFFFFF' },
                              { id: 'heart', icon: '/heart.png', name: 'HEART', color: '#FF69B4' }
                            ].map((element) => (
                              <button
                                key={element.id}
                                onClick={() => {
                                  setSelectedElement(element.id);
                                  try { sfx.play('hover', 0.4); } catch {}
                                }}
                                style={{
                                  position: 'relative',
                                  width: '80px',
                                  height: '80px',
                                  padding: '0',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                {/* Star background */}
                                <div style={{
                                  position: 'absolute',
                                  top: '0',
                                  left: '0',
                                  width: '100%',
                                  height: '100%',
                                  background: selectedElement === element.id ? 
                                    `radial-gradient(circle, ${element.color}20, ${element.color}10)` : 
                                    'rgba(0,0,0,0.4)',
                                  border: `3px solid ${element.color}`,
                                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                  boxShadow: selectedElement === element.id ? 
                                    `0 0 25px ${element.color}, 0 0 40px ${element.color}60, inset 0 0 20px ${element.color}30` : 
                                    `0 0 15px ${element.color}80, inset 0 0 10px ${element.color}20`,
                                  transition: 'all 0.3s ease'
                                }} />
                                
                                {/* Content on top */}
                                <div style={{
                                  position: 'relative',
                                  zIndex: 1,
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                  color: selectedElement === element.id ? element.color : '#FFFFFF',
                                  textShadow: selectedElement === element.id ? 
                                    `0 0 10px ${element.color}` : 
                                    `0 0 5px ${element.color}60`
                                }}>
                                  <img src={element.icon} alt={element.name} style={{ 
                                    width: '32px', 
                                    height: '32px',
                                    filter: selectedElement === element.id ? 
                                      `drop-shadow(0 0 8px ${element.color}) brightness(1.2)` : 
                                      `drop-shadow(0 0 4px ${element.color}60)`
                                  }} />
                                  <span style={{ 
                                    fontSize: '8px', 
                                    textAlign: 'center',
                                    fontWeight: '900',
                                    letterSpacing: '0.5px'
                                  }}>{element.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 15 }}>
                            <button
                              onClick={() => {
                                setProfileSetupStep(1);
                                try { sfx.play('click', 0.3); } catch {}
                              }}
                              style={{
                                flex: 1,
                                padding: '15px',
                                fontSize: 14,
                                background: 'transparent',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderRadius: 8,
                                color: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer'
                              }}
                            >
                              BACK
                            </button>
                            <button
                              onClick={completeProfile}
                              disabled={!selectedElement}
                              style={{
                                flex: 2,
                                padding: '15px',
                                fontSize: 16,
                                fontWeight: 'bold',
                                background: selectedElement ? 'transparent' : 'rgba(0,0,0,0.5)',
                                border: `2px solid ${selectedElement ? '#00FFFF' : 'rgba(255,255,255,0.3)'}`,
                                borderRadius: 8,
                                color: selectedElement ? '#00FFFF' : 'rgba(255,255,255,0.5)',
                                cursor: selectedElement ? 'pointer' : 'not-allowed',
                                boxShadow: selectedElement ? '0 0 20px rgba(0,255,255,0.5)' : 'none',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              COMPLETE PROFILE
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}

                {/* Identical Popup - Same styling as Welcome Home */}
                {typeof document !== 'undefined' && showIdenticalPopup && identicalPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Identical Popup"
                    className="lyrics-popover-hud holo-scrollbar-yellow lyrics-modal-enhanced"
                    ref={identicalScrollRef}
                    style={{
                      position: 'fixed',
                      left: (identicalPopoverPos && identicalPopoverPos.left) || 0,
                      top: (identicalPopoverPos && identicalPopoverPos.top) || 0,
                      transform: (identicalPopoverPos && identicalPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      padding: '10px 14px 14px 14px', 
                      borderRadius: 14,
                      background: 'rgba(3,10,20,0.9)',
                      border: '1px solid rgba(33,150,243,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(33,150,243,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#2196F3',
                      zIndex: 2147483647,
                      width: (identicalPopoverPos && identicalPopoverPos.width) ? identicalPopoverPos.width : 'min(98vw, 1400px)',
                      height: (identicalPopoverPos && identicalPopoverPos.height) ? identicalPopoverPos.height : '42vh',
                      overflow: 'auto',
                      animation: 'lyricsModalFadeIn 0.25s ease-out, lyricsModalFloat 6s ease-in-out infinite alternate'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowIdenticalPopup(false); } }}
                  >
                    {/* Pink close button in the top-right corner */}
                    <button
                      aria-label="Close identical popup"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(0,255,255,0.95), 0 0 42px rgba(0,255,255,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(0,255,255,0.75), 0 0 32px rgba(0,255,255,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowIdenticalPopup(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(0,255,255,0.85)',
                        color: '#00FFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(0,255,255,0.75), 0 0 32px rgba(0,255,255,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {/* Moving glow background */}
                    <div className="lyrics-glow-bg"></div>
                    {/* Section header */}
                    <div className="lyrics-header" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)', fontSize: '12px' }}>
                      WELCOME! ♥
                    </div>
                    <div className="lyrics-content-enhanced" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.2, fontSize: 14, color: '#00FFFF', textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,255,255,0.6)', marginTop: '-4px' }}>
                      What should we call you?
                    </div>
                    {/* Sign-in options - Same structure as original */}
                    <div className="relative mt-1">
                      <div className="flex flex-col gap-3">
                        {/* Name input */}
                        <div>
                          <label className="block text-sm font-medium text-white/90 text-center mb-2">
                            NAME
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your name..."
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#00FFFF] focus:outline-none text-center"
                            autoFocus
                          />
                        </div>
                        
                        {/* Action button */}
                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-3 text-sm font-medium text-[#00FFFF] transition"
                          style={{
                            border: '2px solid #00FFFF',
                            boxShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.6)'
                          }}
                          onMouseEnter={(e) => {
                            try { sfx.play('hover', 0.4); } catch {}
                            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,255,1), 0 0 60px rgba(0,255,255,0.8), 0 0 100px rgba(0,255,255,0.6)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.6)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          onClick={() => {
                            if (profileName.trim()) {
                              try { sfx.play('click', 0.6); } catch {}
                              // Save the name (could update database here)
                              console.log('Name saved:', profileName);
                              setSavedProfileName(profileName); // Persist the name
                              if (onNameSaved) onNameSaved(profileName); // Notify parent component
                              setShowIdenticalPopup(false);
                              // After a brief delay, show element selection
                              setTimeout(() => {
                                openElementPopover();
                              }, 500);
                            }
                          }}
                          disabled={!profileName.trim()}
                        >
                          {profileName.trim() ? 'ALIEN NAME' : 'ENTER YOUR NAME'}
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body
                ) : null}

                {/* Element Selection Popup - Identical styling */}
                {typeof document !== 'undefined' && showElementPopup && elementPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Element Selection"
                    className="lyrics-popover-hud holo-scrollbar-yellow lyrics-modal-enhanced"
                    ref={elementScrollRef}
                    style={{
                      position: 'fixed',
                      left: (elementPopoverPos && elementPopoverPos.left) || 0,
                      top: (elementPopoverPos && elementPopoverPos.top) || 0,
                      transform: (elementPopoverPos && elementPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      padding: '10px 14px 14px 14px', 
                      borderRadius: 14,
                      background: 'rgba(3,10,20,0.9)',
                      border: '1px solid rgba(33,150,243,0.55)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(33,150,243,0.45)',
                      backdropFilter: 'blur(8px)',
                      color: '#2196F3',
                      zIndex: 2147483647,
                      width: (elementPopoverPos && elementPopoverPos.width) ? elementPopoverPos.width : 'min(98vw, 1400px)',
                      height: (elementPopoverPos && elementPopoverPos.height) ? elementPopoverPos.height : '42vh',
                      overflow: 'auto',
                      animation: 'lyricsModalFadeIn 0.25s ease-out, lyricsModalFloat 6s ease-in-out infinite alternate'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowElementPopup(false); } }}
                  >
                    {/* Close button */}
                    <button
                      aria-label="Close element selection"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(0,255,255,0.95), 0 0 42px rgba(0,255,255,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1.0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(0,255,255,0.75), 0 0 32px rgba(0,255,255,0.45)'; } catch {} }}
                      onClick={() => { try { sfx.play('close', 0.4); } catch {}; setShowElementPopup(false); }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        background: 'rgba(0,0,0,0.35)',
                        border: '2px solid rgba(0,255,255,0.85)',
                        color: '#00FFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 18px rgba(0,255,255,0.75), 0 0 32px rgba(0,255,255,0.45)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    {/* Moving glow background */}
                    <div className="lyrics-glow-bg"></div>
                    {/* Section header */}
                    <div className="lyrics-header" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)', fontSize: '12px' }}>
                      LET'S PICK AN ELEMENT ♥
                    </div>
                    <div className="lyrics-content-enhanced" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.2, fontSize: 14, color: '#00FFFF', textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,255,255,0.6)', marginTop: '-4px' }}>
                      Which cosmic element calls to your soul, {profileName}?
                    </div>
                    {/* Element selection */}
                    <div className="relative mt-3">
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: 20,
                        flexWrap: 'wrap'
                      }}>
                        {[
                          { 
                            id: 'water', 
                            name: 'WATER', 
                            color: '#0099FF', 
                            icon: '/water.png',
                            emoji: '💧',
                            description: 'Water = emotional truth and authenticity'
                          },
                          { 
                            id: 'lightning', 
                            name: 'LIGHTNING', 
                            color: '#00FFFF', 
                            icon: '/lightning.png',
                            emoji: '⚡️',
                            description: 'Lightning = passion and courage'
                          },
                          { 
                            id: 'darkness', 
                            name: 'DARKNESS', 
                            color: '#FFFFFF', 
                            icon: '/darkness.png',
                            emoji: '🌑',
                            description: 'Darkness = honesty about pain, imperfection, and inner worlds'
                          },
                          { 
                            id: 'heart', 
                            name: 'HEART', 
                            color: '#FF69B4', 
                            icon: '/heart.png',
                            emoji: '🩷',
                            description: 'Heart = love and connection'
                          }
                        ].map((element) => (
                          <button
                            key={element.id}
                            onClick={() => {
                              setSelectedElement(element.id);
                              setSelectedElementData(element);
                              try { sfx.play('hover', 0.4); } catch {}
                            }}
                            style={{
                              position: 'relative',
                              width: '70px',
                              height: '70px',
                              padding: '0',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {/* Star background */}
                            <div style={{
                              position: 'absolute',
                              top: '0',
                              left: '0',
                              width: '100%',
                              height: '100%',
                              background: selectedElement === element.id ? 
                                `radial-gradient(circle, ${element.color}20, ${element.color}10)` : 
                                'rgba(0,0,0,0.4)',
                              border: `3px solid ${element.color}`,
                              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                              boxShadow: selectedElement === element.id ? 
                                `0 0 25px ${element.color}, 0 0 40px ${element.color}60, inset 0 0 20px ${element.color}30` : 
                                `0 0 15px ${element.color}80, inset 0 0 10px ${element.color}20`,
                              transition: 'all 0.3s ease'
                            }} />
                            
                            {/* Content on top */}
                            <div style={{
                              position: 'relative',
                              zIndex: 1,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              color: selectedElement === element.id ? element.color : '#FFFFFF',
                              textShadow: selectedElement === element.id ? 
                                `0 0 10px ${element.color}` : 
                                `0 0 5px ${element.color}60`
                            }}>
                              <img 
                                src={element.icon} 
                                alt={element.name}
                                style={{ 
                                  width: 28, 
                                  height: 28, 
                                  filter: selectedElement === element.id ? 
                                    `drop-shadow(0 0 8px ${element.color}) brightness(1.2)` : 
                                    `drop-shadow(0 0 4px ${element.color}60)`
                                }}
                                onError={(e) => {
                                  // Fallback to emoji if PNG fails to load
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              <span 
                                style={{ 
                                  fontSize: 20, 
                                  display: 'none',
                                  filter: selectedElement === element.id ? 
                                    `drop-shadow(0 0 8px ${element.color})` : 
                                    `drop-shadow(0 0 4px ${element.color}60)`
                                }}
                              >
                                {element.emoji}
                              </span>
                              <span style={{ 
                                fontSize: '7px', 
                                textAlign: 'center',
                                fontWeight: '900',
                                letterSpacing: '0.5px'
                              }}>
                                {element.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Element description display */}
                      {selectedElementData && (
                        <div style={{
                          marginTop: 20,
                          padding: 16,
                          background: 'rgba(0,0,0,0.4)',
                          border: `2px solid ${selectedElementData.color}`,
                          borderRadius: 12,
                          textAlign: 'center'
                        }}>
                          <div style={{
                            color: selectedElementData.color,
                            fontSize: 14,
                            fontWeight: 'bold',
                            marginBottom: 8,
                            textShadow: `0 0 8px ${selectedElementData.color}40`
                          }}>
                            {selectedElementData.name}
                          </div>
                          <div style={{
                            color: '#FFFFFF',
                            fontSize: 12,
                            lineHeight: 1.4,
                            fontStyle: 'italic'
                          }}>
                            {selectedElementData.description}
                          </div>
                        </div>
                      )}

                      {/* Complete Profile button */}
                      {selectedElement && (
                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center rounded-lg bg-transparent px-4 py-3 text-sm font-medium text-[#00FFFF] transition"
                          style={{
                            border: '2px solid #00FFFF',
                            boxShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.6)'
                          }}
                          onMouseEnter={(e) => {
                            try { sfx.play('hover', 0.4); } catch {}
                            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,255,1), 0 0 60px rgba(0,255,255,0.8), 0 0 100px rgba(0,255,255,0.6)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.6)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          onClick={async () => {
                            try { sfx.play('click', 0.8); } catch {}
                            
                            // Validate required fields
                            if (!currentProfileId || !profileName.trim() || !selectedElement) {
                              alert('Please ensure all profile fields are completed.');
                              return;
                            }
                            
                            try {
                              // Save complete profile to database
                              const { error } = await supabaseClient
                                .from('profiles')
                                .update({ 
                                  name: profileName.trim(),
                                  element: selectedElement,
                                  profile_complete: true,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', currentProfileId);

                              if (error) {
                                console.error('Profile completion error:', error);
                                alert('Failed to complete profile. Please try again.');
                                return;
                              }

                              console.log('Profile completed successfully:', { name: profileName, element: selectedElement });
                              
                              // Play success sound
                              try { sfx.play('success', 0.8); } catch {}
                              
                              // Update the HUD display with saved profile info
                              setSavedProfileName(profileName);
                              setSavedProfileElement(selectedElement);
                              
                              // Update the parent component with the completed profile
                              if (onNameSaved) onNameSaved(profileName);
                              if (onElementSaved) onElementSaved(selectedElement);
                              
                              // Close the popup and reset state
                              setShowElementPopup(false);
                              setProfileName('');
                              setSelectedElement('');
                              setCurrentProfileId(null);
                              
                              // Optional: Show success message or trigger confetti
                              console.log('Profile setup completed successfully!')
                              
                            } catch (err) {
                              console.error('Unexpected error:', err);
                              alert('An unexpected error occurred. Please try again.');
                            }
                          }}
                        >
                          COMPLETE PROFILE
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showSoulSkyPopover && soulSkyPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="Soul Sky"
                    ref={soulSkyScrollRef}
                    className="lyrics-popover-hud holo-scrollbar-yellow lyrics-modal-enhanced"
                    style={{
                      position: 'fixed',
                      left: (soulSkyPopoverPos && soulSkyPopoverPos.left) || 0,
                      top: (soulSkyPopoverPos && soulSkyPopoverPos.top) || 0,
                      transform: (soulSkyPopoverPos && soulSkyPopoverPos.width) ? 'none' : 'translateX(-50%)',
                      // Tighten vertical padding so the bottom sits higher
                      padding: '10px 14px 14px 14px',
                      borderRadius: 14,
                      background: 'rgba(0, 0, 20, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255,255,255,0.4)',
                      boxShadow: '0 0 30px rgba(255,255,255,0.3), 0 0 50px rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      zIndex: 2147483647,
                      width: (soulSkyPopoverPos && soulSkyPopoverPos.width) ? soulSkyPopoverPos.width : 'min(98vw, 1400px)',
                      // Fix height to the blue display area; slightly shorter fallback
                      height: (soulSkyPopoverPos && soulSkyPopoverPos.height) ? soulSkyPopoverPos.height : '42vh',
                      overflow: 'auto',
                      // Fade-in and float animations
                      animation: 'lyricsModalFadeIn 0.25s ease-out, lyricsModalFloat 6s ease-in-out infinite alternate'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { try { sfx.play('close', 0.4); } catch {}; setShowSoulSkyPopover(false); } }}
                  >
                    {/* Obvious close button in the top-right corner */}
                    <button
                      aria-label="Close Soul Sky"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(255,255,0,0.95), 0 0 42px rgba(255,255,0,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,0,0.85), 0 0 32px rgba(255,255,0,0.35)'; } catch {} }}
                      onClick={() => { 
                        try { sfx.play('close', 0.4); } catch {}; 
                        setShowSoulSkyPopover(false);
                        setShowStarAnimation(false);
                        setShowBeamEffect(false);
                        setQuestionResponse('');
                      }}
                      style={{
                        position: 'absolute',
                        top: 10, right: 10,
                        width: 30, height: 30, borderRadius: 15,
                        background: 'rgba(255,255,0,0.15)',
                        border: '2px solid rgba(255,255,0,0.6)',
                        color: '#FFFF00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        zIndex: 10,
                        boxShadow: '0 0 16px rgba(255,255,0,0.85), 0 0 32px rgba(255,255,0,0.35)',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      ×
                    </button>

                    {/* Moving glow background */}
                    <div className="lyrics-glow-bg"></div>
                    {/* Section header */}
                    <div className="lyrics-header" style={{ color: '#FFFF00', textShadow: '0 0 8px rgba(255,255,0,0.6)', fontSize: '12px' }}>
                      SOUL STAR
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <div className="lyrics-content-enhanced" style={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.4, 
                        fontSize: 12, 
                        color: '#FFFF00', 
                        textShadow: '0 0 2px rgba(255,255,0,0.8), 0 0 8px rgba(255,255,0,0.6)',
                        marginBottom: '15px'
                      }}>
                        <span style={{ fontWeight: 'bold', fontStyle: 'normal' }}>INTENTION:</span> <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>"The universe is not only stranger than we imagine, it is stranger than we can imagine." - J.B.S. Haldane</span>
                      </div>
                      
                      <div className="lyrics-content-enhanced" style={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.4, 
                        fontSize: 12, 
                        color: '#FFFF00', 
                        textShadow: '0 0 2px rgba(255,255,0,0.8), 0 0 8px rgba(255,255,0,0.6)'
                      }}>
                        <span style={{ fontWeight: 'bold', fontStyle: 'normal' }}>REFLECTION:</span> <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>What constellation would you create if you could arrange the stars in the sky, and what story would it tell?</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', marginBottom: '8px' }}>
                      <textarea
                          value={questionResponse}
                          onChange={(e) => setQuestionResponse(e.target.value)}
                          placeholder="Share your cosmic vision..."
                          style={{
                            width: '100%',
                            minHeight: '1.5rem',
                            padding: '8px',
                            background: 'rgba(0,0,20,0.6)',
                            border: '1px solid rgba(255,255,0,0.6)',
                            borderRadius: '8px',
                            color: '#FFFF00',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            boxShadow: '0 0 10px rgba(255,255,0,0.3)',
                            '::placeholder': { color: 'rgba(255,255,0,0.7)' }
                          }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                    <button
                        className="cast-stars-button"
                        onClick={() => {
                          if (questionResponse.trim()) {
                            try { 
                              const audio = new Audio('/audio/join-alien.mp3');
                              audio.volume = 0.7;
                              audio.play().catch(() => {});
                            } catch {}
                            setShowStarAnimation(true);
                            setShowBeamEffect(true);
                            // Star animation will appear for a few seconds
                            setTimeout(() => {
                              setShowStarAnimation(false);
                              setShowBeamEffect(false);
                              setQuestionResponse('');
                            }, 4000);
                          }
                        }}
                        disabled={!questionResponse.trim()}
                        style={{
                          padding: '12px 40px',
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid rgba(255,215,0,0.6)',
                          borderRadius: '8px',
                          color: questionResponse.trim() ? '#FFD700' : 'rgba(255,255,255,0.5)',
                          cursor: questionResponse.trim() ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease',
                          fontSize: '16px',
                          fontWeight: '600',
                          textShadow: questionResponse.trim() ? '0 0 8px rgba(255,215,0,1), 0 0 16px rgba(255,223,0,0.8), 0 0 24px rgba(255,215,0,0.6)' : 'none',
                          boxShadow: questionResponse.trim() ? '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,223,0,0.4), inset 0 1px rgba(255,255,255,0.2)' : 'none'
                        }}
                      >
                        Cast into the Stars
                      </button>

                      {/* Yellow beam effect */}
                      {showBeamEffect && (
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: '-200px',
                          width: '100px',
                          height: '150px',
                          transform: 'translateX(-50%)',
                          clipPath: 'polygon(45% 100%, 95% 0%, 5% 0%)',
                          background: 'linear-gradient(180deg, rgba(255,255,0,0.3), rgba(255,255,0,0.1) 30%, rgba(255,255,0,0.05) 70%, rgba(255,255,0,0) 100%)',
                          filter: 'blur(4px)',
                          mixBlendMode: 'screen',
                          animation: 'beamPulse 2s ease-in-out infinite',
                          zIndex: 4,
                          pointerEvents: 'none'
                        }} />
                      )}

                      {/* Star animation overlay */}
                      {showStarAnimation && (
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#FFFFFF',
                          textShadow: '0 0 20px rgba(255,255,255,0.8)',
                          animation: 'starBirth 3s ease-out forwards',
                          zIndex: 5,
                          textAlign: 'center'
                        }}>
                          ✨ Your constellation shines above ✨
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                ) : null}

                {typeof document !== 'undefined' && showBrandPopover && brandPopoverPos ? createPortal(
                  <div
                    role="dialog"
                    aria-label="CHXNDLER"
                    className="lyrics-popover-hud holo-scrollbar-yellow"
                    style={{
                      position: 'fixed',
                      left: (brandPopoverPos && brandPopoverPos.left) || 0,
                      top: (brandPopoverPos && brandPopoverPos.top) || 0,
                      transform: (brandPopoverPos && brandPopoverPos.width) ? 'none' : 'translateX(-50%)',
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
                
                // Let DashboardApp.onSongChange handle the complete warp sequence
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
      <WelcomeHomeModal open={showWelcomeHomeModal} onClose={() => {
        setShowWelcomeHomeModal(false);
        // Mark that user has seen the welcome modal
        setHasSeenWelcomeModal(true);
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(WELCOME_MODAL_LS_KEY, 'true');
          }
        } catch {}
        // Open the blue display (power button) when closing the welcome modal
        try { onOpenBlueDisplay?.(); } catch {}
      }} />
    </motion.section>
  );
}
