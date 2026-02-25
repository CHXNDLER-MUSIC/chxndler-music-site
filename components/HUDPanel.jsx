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
import SoulStarJournal from "@/components/SoulStarJournal";
import { supabaseClient } from "@/lib/supabaseClient";
import { logHeartcoinTransaction } from "@/utils/heartcoins";
import { useProfile } from "@/contexts/ProfileContext";
import { useAudio } from "@/app/providers/AudioProvider";
import { useHeartcoinBalance } from "@/providers/HeartcoinBalanceProvider";
// 2D fallback hologram
// 2D HUD removed per request; 3D only
// 3D planet system (requires three/r3f/drei installed)
// IMPORTANT: Do NOT import at module scope — older @react-three/fiber versions
// are incompatible with React 19 and can crash on evaluation. We lazy-load it
// only after probing availability, and fall back gracefully.

// ═══════════════════════════════════════════════════════════════════
// FEATURE FLAG: Set to true to re-enable the 3D planet system.
// When false, no Three.js Canvas or WebGL context will be created.
// ═══════════════════════════════════════════════════════════════════
const ENABLE_PLANETS = false;

import { playerStore } from "@/store/usePlayerStore";

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
import SimpleWaveform from "@/components/SimpleWaveform";
import WaveformVisualizer, { ELEMENT_COLORS } from "@/components/WaveformVisualizer";
import DevErrorLogger from "@/components/DevErrorLogger";
// 3D Planetarium system with Three.js
const Pure3DPlanets = ENABLE_PLANETS
  ? dynamic(() => import("@/components/planetarium/Pure3DPlanets"), {
      ssr: false,
      loading: () => null // No loading placeholder - prevents flash of wrong background
    })
  : null;
// Flat world map (toggle alternative to 3D planets)
const FlatWorldMap = dynamic(() => import("@/components/FlatWorldMap"), {
  ssr: false,
  loading: () => null
});
import { DEBUG_MEDIA, dlog, dwarn } from "@/lib/debug";
import { ElementIcon as OptimizedElementIcon } from "@/lib/elementIcons";
import { sfx } from "@/lib/sfx";
import { usePlanetRewardsContext } from "@/components/PlanetRewardsProvider";
import { useFocusElementOfDay } from "@/hooks/useFocusElementOfDay";

// Use system font stack to avoid network font fetches during build

// Constants to prevent recreating URLs on every render
import { getCardImageUrl } from '@/lib/supabaseCardUrl';

const DEFAULT_COVER = '/covers/CHXNDLER.webp';
const DEFAULT_CARD = getCardImageUrl('CHXNDLER');
const FALLBACK_COVER = '/elements/logo.webp';

const ElementIcon = React.memo(function ElementIcon({ name, size = 18, glow = true }) {
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
});

const HUDPanel = React.memo(function HUDPanel({
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
  showHUD = false, // current blue display state
  beamColor = 'blue', // current beam color
  shouldOpenJournal = false, // flag to automatically open journal
  onJournalOpened, // callback when journal is opened
  onJournalCompleted, // callback when journal is completed with HeartCoins awarded
  onBeamColorChange, // callback to change beam color
  todaysPrompt, // today's soul prompt (server-fetched)
}) {
  // Use unified audio system for play/pause controls
  const audioManager = useAudio();

  // Planet rewards system for element planet clicks
  const planetRewards = usePlanetRewardsContext();

  // Get the element of the day for camera focus
  const { focusElement } = useFocusElementOfDay();

  // Profile context (journal open state, refresh)
  const { profile, refreshProfile, setIsJournalOpen } = useProfile();

  // Temporary kill-switch to disable 3D planets for performance testing
  // Set to true to disable. You can also override at runtime by setting
  // localStorage.DISABLE_3D_PLANETS = '0' and refreshing.
  // Enable 3D planets by default so they appear in the HUD
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
  // Toggle between 3D planet system and flat world map
  const [showFlatMap, setShowFlatMap] = useState(false);
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
  // Move it slightly higher (more negative) per request
  const STORE_POPOVER_Y_OFFSET = -260; // move popover up higher
  // Dynamic spacing for song selector so it doesn't overlap the cover
  const coverRef = useRef(null);
  const [oneLinerRight, setOneLinerRight] = useState(inConsole ? 108 : 140);
  // Audio progress tracking
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  // Lightweight animation tick to force re-render while audio is playing
  // Ensures the HUD progress bar advances even if underlying events are throttled
  const [animTick, setAnimTick] = useState(0);
  useEffect(() => {
    let rafId = null;
    let active = true;
    const loop = () => {
      if (!active) return;
      // Nudge a re-render; calculation reads currentTime/duration directly each render
      setAnimTick((t) => (t + 1) % 1000000);
      rafId = requestAnimationFrame(loop);
    };
    // Only tick when audio is actively playing to avoid unnecessary renders
    if (audioManager?.playing) {
      rafId = requestAnimationFrame(loop);
    }
    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [audioManager?.playing]);
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
  // Venmo popup state
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);
  // Position lyrics popover relative to its anchor; smaller negative means less high
  const LYRICS_POPOVER_Y_OFFSET = -100; // bring it higher up

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
  const [clickedElements, setClickedElements] = useState(new Set());
  
  // Saved profile state for HUD display
  const [savedProfileName, setSavedProfileName] = useState('');
  const [savedProfileElement, setSavedProfileElement] = useState('');

  // Planet reward error toast state
  const [planetRewardError, setPlanetRewardError] = useState(null);
  const planetRewardErrorTimeoutRef = useRef(null);

  // Handler for planet selection that intercepts element planets for rewards
  const ELEMENT_PLANETS = ['heart', 'water', 'lightning', 'darkness'];
  const handlePlanetSelectWithRewards = React.useCallback((planetId) => {
    const pid = String(planetId).toLowerCase();
    // Element planets: only today's element is clickable; others do nothing
    if (ELEMENT_PLANETS.includes(pid)) {
      if (pid !== planetRewards.elementOfDay) return;
      if (planetRewards.claimedToday) return;
      if (planetRewards.isClaimingReward || planetRewards.cooldownActive) return;

      planetRewards.claimPlanetReward(pid).then((reward) => {
        if (!reward && planetRewards.error) {
          // Show error toast
          setPlanetRewardError(planetRewards.error);
          if (planetRewardErrorTimeoutRef.current) {
            clearTimeout(planetRewardErrorTimeoutRef.current);
          }
          planetRewardErrorTimeoutRef.current = setTimeout(() => {
            setPlanetRewardError(null);
            planetRewards.clearError();
          }, 3000);
        }
      }).catch(() => {});
      return; // Block downstream song selection when element clicked
    }
    // Non-element interactions continue to route through original handler
    onSongChange?.(planetId, { preserveBlueDisplay: true });
  }, [planetRewards, onSongChange]);

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
  const [brandActiveTab, setBrandActiveTab] = useState('chxndler'); // 'chxndler' or 'believe'
  const brandScrollRef = useRef(null);

  // SOUL SKY popover state (similar to other popovers)
  const [showSoulSkyPopover, setShowSoulSkyPopover] = useState(false);
  const starsBtnRef = useRef(null);
  const [soulSkyPopoverPos, setSoulSkyPopoverPos] = useState(null);
  const [questionResponse, setQuestionResponse] = useState('');
  const [showBeamEffect, setShowBeamEffect] = useState(false);
  const [isCasting, setIsCasting] = useState(false); // For "Cast into the Stars" orb animation
  const [showJournalView, setShowJournalView] = useState(false);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalCompletedToday, setJournalCompletedToday] = useState(false);
  // Soul Star Journal modal state
  const [showSoulStarJournal, setShowSoulStarJournal] = useState(false);
  const [dailySoulPrompt, setDailySoulPrompt] = useState(todaysPrompt || null);
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
  // Use centralized balance state for real-time updates
  const { balance: heartcoinBalanceFromHook, refetchBalance } = useHeartcoinBalance();
  const heartCoinsCount = heartcoinBalanceFromHook; // Alias for backwards compatibility
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
      image: getCardImageUrl('CHXNDLER'),
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
      image: getCardImageUrl('HEART'),
      description: 'This is the emotional core. These songs don\'t just want — they feel. Love isn\'t clean here — it\'s messy, soft, and intense.',
      collected: true
    },
    {
      id: 1,
      name: 'ALWAYS ON MY MIND',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('ALWAYS ON MY MIND'),
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 2,
      name: 'ALWAYS ON MY MIND (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('ALWAYS ON MY MIND (ACOUSTIC)'),
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 3,
      name: 'ALWAYS ON MY MIND (REMIX)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('ALWAYS ON MY MIND (REMIX)'),
      description: 'Some voices never fade — they just guide you from within.',
      collected: false
    },
    {
      id: 4,
      name: 'BABY',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('BABY'),
      description: 'A chaotic, messy, romantic ride through the magic of a first date.',
      collected: availableSongs.includes('BABY')
    },
    {
      id: 5,
      name: 'BE MY BEE',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('BE MY BEE'),
      description: 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      collected: availableSongs.includes('BE MY BEE')
    },
    {
      id: 6,
      name: 'BE MY BEE (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('BE MY BEE (ACOUSTIC)'),
      description: 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      collected: false
    },
    {
      id: 7,
      name: 'COLLIDE',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('COLLIDE'),
      description: 'Two souls crash into each other in a cosmic dance of fate.',
      collected: availableSongs.includes('COLLIDE')
    },
    {
      id: 8,
      name: 'COLORS OF OUR HOME',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('COLORS OF OUR HOME'),
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME')
    },
    {
      id: 9,
      name: 'COLORS OF OUR HOME (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('COLORS OF OUR HOME (ACOUSTIC)'),
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME (ACOUSTIC)')
    },
    {
      id: 10,
      name: 'COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)'),
      description: 'A journey from isolation to connection in a world full of color.',
      collected: availableSongs.includes('COLORS OF OUR HOME (BLUMA Game Soundtrack)')
    },
    {
      id: 11,
      name: 'I MIGHT FALL IN LOVE WITH YOU',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU'),
      description: 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      collected: false
    },
    {
      id: 12,
      name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)'),
      description: 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      collected: false
    },
    {
      id: 13,
      name: 'LITTLE BLACK HEART',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('LITTLE BLACK HEART'),
      description: 'Are you afraid to live or afraid to die?',
      collected: false
    },
    {
      id: 14,
      name: 'LITTLE BLACK HEART (ACOUSTIC)',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('LITTLE BLACK HEART (ACOUSTIC)'),
      description: 'Are you afraid to live or afraid to die?',
      collected: false
    },
    {
      id: 15,
      name: 'LOVE ME',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('LOVE ME'),
      description: 'If I gave it all away for the dream and never made it — would you still love me?',
      collected: false
    },
    {
      id: 16,
      name: 'LOVE ME (ACOUSTIC)',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('LOVE ME (ACOUSTIC)'),
      description: 'If I gave it all away for the dream and never made it — would you still love me?',
      collected: false
    },
    {
      id: 17,
      name: 'SOMEBODY TO LOVE',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('SOMEBODY TO LOVE'),
      description: 'You want to give real love — not the kind they expect, but the kind you know. Too bad they\'re not the one.',
      collected: false
    },
    {
      id: 18,
      name: 'TIENES UN AMIGO',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('TIENES UN AMIGO'),
      description: 'No galaxy too far, no accent too strong — friendship always finds a way.',
      collected: false
    },
    {
      id: 19,
      name: "WE'RE JUST FRIENDS",
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl("WE'RE JUST FRIENDS"),
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS")
    },
    {
      id: 20,
      name: "WE'RE JUST FRIENDS (ACOUSTIC)",
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl("WE'RE JUST FRIENDS (ACOUSTIC)"),
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: false
    },
    {
      id: 21,
      name: "WE'RE JUST FRIENDS (DMVRCO REMIX)",
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl("WE'RE JUST FRIENDS (DMVRCO REMIX)"),
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS (DMVRCO Remix)")
    },
    {
      id: 22,
      name: "WE'RE JUST FRIENDS (MICKEY JAS REMIX)",
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl("WE'RE JUST FRIENDS (MICKEY JAS REMIX)"),
      description: 'Unspoken feelings blur the lines between friendship and something more.',
      collected: availableSongs.includes("WE'RE JUST FRIENDS (mickey jas Remix)")
    },
    {
      id: 23,
      name: 'PINK MOON',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('PINK MOON'),
      description: 'Lost in the static, the pink moon guides me home.',
      collected: false
    },

    // WATER TYPE CARDS
    {
      id: 23.5,
      name: 'WATER',
      type: 'WATER',
      rarity: 'Rare',
      image: getCardImageUrl('WATER'),
      description: 'These songs carry waves of emotion — not explosive, but steady, like a tide that pulls you out and then leaves you still',
      collected: true
    },
    {
      id: 24,
      name: 'LETTING GO',
      type: 'WATER',
      rarity: 'Common',
      image: getCardImageUrl('LETTING GO'),
      description: 'Letting go of expectations — theirs and yours — to finally be free.',
      collected: false
    },
    {
      id: 25,
      name: 'OCEAN GIRL',
      type: 'WATER',
      rarity: 'Common',
      image: getCardImageUrl('OCEAN GIRL'),
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL')
    },
    {
      id: 26,
      name: 'OCEAN GIRL (ACOUSTIC)',
      type: 'WATER',
      rarity: 'Common',
      image: getCardImageUrl('OCEAN GIRL (ACOUSTIC)'),
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL (ACOUSTIC)')
    },
    {
      id: 27,
      name: 'OCEAN GIRL (REMIX)',
      type: 'WATER',
      rarity: 'Common',
      image: getCardImageUrl('OCEAN GIRL (REMIX)'),
      description: 'A love that moves like the sea — you let go and trust to always come back to you.',
      collected: availableSongs.includes('OCEAN GIRL (REMIX)')
    },

    // LIGHTNING TYPE CARDS
    {
      id: 27.5,
      name: 'LIGHTNING',
      type: 'LIGHTNING',
      rarity: 'Rare',
      image: getCardImageUrl('LIGHTNING'),
      description: 'Lightning is the electric jolt of feeling alive. These tracks buzz. You move fast, crash hard, and maybe regret nothing.',
      collected: true
    },
    {
      id: 28,
      name: 'AMERICAN DREAM',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('AMERICAN DREAM'),
      description: 'The American Dream isn\'t where we live — it\'s where our dreams go to die.',
      collected: false
    },
    {
      id: 29,
      name: 'BLUE',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('BLUE'),
      description: 'You were the match to ignite the ash in my heart.',
      collected: false
    },
    {
      id: 30,
      name: 'BLUE (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('BLUE (ACOUSTIC)'),
      description: 'You were the match to ignite the ash in my heart.',
      collected: false
    },
    {
      id: 31,
      name: 'BRAIN FREEZE',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('BRAIN FREEZE'),
      description: 'A rush of emotion and chaos from chasing summer highs.',
      collected: availableSongs.includes('BRAIN FREEZE')
    },
    {
      id: 32,
      name: 'FEELING THIS',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('FEELING THIS'),
      description: 'When chaos feels like connection, and that\'s enough for tonight.',
      collected: false
    },
    {
      id: 33,
      name: 'GAME BOY HEART',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('GAME BOY HEART'),
      description: 'A nostalgic escape into an 8-bit dreamworld where your heart lives free.',
      collected: availableSongs.includes('GAME BOY HEART')
    },
    {
      id: 34,
      name: 'HOME',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('HOME'),
      description: 'A journey through the stars to fill the void—only to find home was within all along',
      collected: false
    },
    {
      id: 35,
      name: 'HOME (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('HOME (ACOUSTIC)'),
      description: 'A journey through the stars to fill the void—only to find home was within all along',
      collected: false
    },
    {
      id: 36,
      name: 'HOUSE PARTY',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('HOUSE PARTY'),
      description: 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      collected: availableSongs.includes('HOUSE PARTY')
    },
    {
      id: 37,
      name: 'HOUSE PARTY (ACOUSTIC)',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('HOUSE PARTY (ACOUSTIC)'),
      description: 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      collected: false
    },
    {
      id: 38,
      name: 'KID FOREVER',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('KID FOREVER'),
      description: 'Live fearlessly in the land your daydreams call home.',
      collected: availableSongs.includes('KID FOREVER')
    },
    {
      id: 39,
      name: 'POKÉMON',
      type: 'LIGHTNING',
      rarity: 'Common',
      image: getCardImageUrl('POKEMON'),
      description: 'Some dreams don\'t fade — they evolve with you.',
      collected: availableSongs.includes('POKÉMON')
    },

    // DARKNESS TYPE CARDS
    {
      id: 39.5,
      name: 'DARKNESS',
      type: 'DARKNESS',
      rarity: 'Rare',
      image: getCardImageUrl('DARKNESS'),
      description: 'Darkness isn\'t evil — it\'s vulnerability in disguise. These songs explore what\'s not said, what we hide, or what we want but don\'t admit.',
      collected: true
    },
    {
      id: 40,
      name: 'ALONE',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('ALONE'),
      description: 'Lost in a sea of strangers under the city\'s glittering glow.',
      collected: false
    },
    {
      id: 41,
      name: 'ALONE (ACOUSTIC)',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('ALONE (ACOUSTIC)'),
      description: 'Lost in a sea of strangers under the city\'s glittering glow.',
      collected: false
    },
    {
      id: 42,
      name: 'CHEERLEADER',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('CHEERLEADER'),
      description: 'Wanting the person you love most to be cheering in the crowd.',
      collected: false
    },
    {
      id: 43,
      name: 'MR. BRIGHTSIDE',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('MR. BRIGHTSIDE'),
      description: 'When love turns to doubt and every glance feels like betrayal.',
      collected: false
    },
    {
      id: 44,
      name: 'PARIS',
      type: 'DARKNESS',
      rarity: 'Common',
      image: getCardImageUrl('PARIS'),
      description: 'A love affair with self-destruction — poison dressed up as romance.',
      collected: availableSongs.includes('PARIS')
    },

    // SPECIAL CHXNDLER CARD
    {
      id: 45,
      name: 'CHXNDLER',
      type: 'HEART',
      rarity: 'Common',
      image: getCardImageUrl('CHXNDLER'),
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

  // Heart coins balance is now provided by HeartcoinBalanceProvider via useHeartcoinBalance hook
  // This enables real-time updates and celebration triggers when balance increases

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

  // Track if user has seen Welcome modal before (no auto-open here; Start flow controls it)
  const WELCOME_MODAL_LS_KEY = 'heartverse:welcome_modal_seen';
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const hasSeen = window.localStorage.getItem(WELCOME_MODAL_LS_KEY) === 'true';
        setHasSeenWelcomeModal(hasSeen);
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
  // Inline heart-coin confirmation state (replaces item text area)
  const [storeConfirming, setStoreConfirming] = useState(false);
  const [storeConfirmingIndex, setStoreConfirmingIndex] = useState(null);
  const [storeConfirmProcessing, setStoreConfirmProcessing] = useState(false);
  const [storeConfirmError, setStoreConfirmError] = useState('');
  
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
      image: '/store/beanie-front-pink.webp',
      url: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
      price: '$30',
      heartcoins: 20,
      description: "For the ones who wear their hearts out loud and aren't afraid to stand out."
    },
    {
      id: 'hat',
      title: 'HAT',
      image: '/store/hat.webp',
      url: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
      price: '$30',
      heartcoins: 20,
      description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to."
    },
    {
      id: 'bracelet',
      title: 'BRACELET',
      image: '/store/bracelet.webp',
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
        // Position top to align with bottom of profile bar (64px)
        const TOP_INSET = 0; // extend up to profile bar bottom
        let top = Math.max(64, rect.top + TOP_INSET); // ensure it doesn't go above profile bar
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
      // Update profiles table only - do NOT send updated_at (breaks public_profiles_table view)
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          name: profileName.trim(),
          element: selectedElement,
          profile_complete: true
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
        if (process.env.NODE_ENV === "development") {
          if (process.env.NODE_ENV !== "production") console.log('Profile completed successfully!');
        }
      }
    } catch (error) {
      console.error('Exception completing profile:', error);
    }
  }

  async function openIdenticalPopover(){
    try { sfx.play('click', 0.4); } catch {}
    // Anchor position (identical to Join Us popover)
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
      if (process.env.NODE_ENV !== "production") console.warn('Failed to position identical popover:', e);
    }
    setShowIdenticalPopup(true);
  }

  async function openElementPopover(){
    try { sfx.play('click', 0.4); } catch {}
    // Anchor position (identical to other popups)
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
      if (process.env.NODE_ENV !== "production") console.warn('Failed to position element popover:', e);
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
        if (process.env.NODE_ENV !== "production") console.warn('Failed to find refs for Soul Sky positioning');
      }
    } catch(e) {
      if (process.env.NODE_ENV !== "production") console.warn('Failed to position Soul Sky popover:', e);
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
          const TOP_INSET = 0; // keep resize calc consistent with profile bar bottom
          let top = Math.max(64, rect.top + TOP_INSET); // ensure it doesn't go above profile bar
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
    // Keep the blue display open when showing brand popover
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
        
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.warn('Error handling openStoreCards event:', err);
      }
    };

    window.addEventListener('openStoreCards', handleOpenStoreCards);
    return () => window.removeEventListener('openStoreCards', handleOpenStoreCards);
  }, [showStorePopover]);

  // Listen for openStore event from hamburger menu
  useEffect(() => {
    const handleOpenStore = (e) => {
      try {
        // If store popover is already open, just switch to MERCH tab
        if (showStorePopover) {
          setStoreActiveTab('MERCH');
        } else {
          // Otherwise open store popover and set MERCH tab
          setStoreActiveTab('MERCH');
          openStorePopover();
        }
        
      } catch (error) {
        console.error('Error handling openStore event:', error);
      }
    };

    window.addEventListener('openStore', handleOpenStore);
    return () => window.removeEventListener('openStore', handleOpenStore);
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
    // Change beam color to pink when store button is clicked
    // try { onBeamColorChange?.('pink'); } catch {}
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

  // Reset STORE popover UI state when closing so it reopens fresh
  useEffect(() => {
    if (showStorePopover) return;
    try { setStoreActiveTab('MERCH'); } catch {}
    try {
      const idx = products.findIndex(p => String(p.id) === 'necklace');
      setStoreIndex(idx >= 0 ? idx : 0);
    } catch {}
    try { setBeanieFlipped(false); } catch {}
    try { setPatchFlipped(false); } catch {}
    try { setBeanieHovered(false); } catch {}
    try { setPatchHovered(false); } catch {}
    try { setShowHeartCoinStorePopup(false); } catch {}
    // Optional: reset scroll position
    try { if (storeScrollRef.current) storeScrollRef.current.scrollTop = 0; } catch {}
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
    if (shouldOpenJournal && !showSoulStarJournal) {
      try {
        // Open the Soul Star Journal modal directly (not the Soul Sky popover)
        setShowSoulStarJournal(true);
        onJournalOpened?.();
      } catch {}
    }
  }, [shouldOpenJournal, showSoulStarJournal, onJournalOpened]);

  // Sync journal open state to ProfileContext so the light beam stays visible
  useEffect(() => {
    setIsJournalOpen(showSoulStarJournal);
  }, [showSoulStarJournal, setIsJournalOpen]);

  // Check if journal was completed today on mount and when user changes
  useEffect(() => {
    const checkJournalCompletion = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check for existing HeartCoin transaction for journal completion today
        const { data: transactions, error } = await supabaseClient
          .from('heartcoin_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('reason', 'Completed journal reflection')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);

        if (error) {
          console.error('Error checking journal completion:', error);
          return;
        }

        setJournalCompletedToday(transactions && transactions.length > 0);
      } catch (error) {
        console.error('Error checking journal completion:', error);
      }
    };

    checkJournalCompletion();
  }, []);

  // Keep prompt in sync if prop changes
  useEffect(() => {
    setDailySoulPrompt(todaysPrompt || null);
  }, [todaysPrompt]);

  const [animationTime, setAnimationTime] = useState(0);
  // Volume popover (HUD waveform controls)
  const [showHudVolumePopover, setShowHudVolumePopover] = useState(false);
  const hudVolRef = useRef(null);
  const hudVolBtnRef = useRef(null);
  const [hudPopoverPos, setHudPopoverPos] = useState(null);
  // Direct ref to the currently tracked audio element for live reads during render
  const liveAudioRef = useRef(null);
  // Progress bar ref for seeking
  const progressBarRef = useRef(null);
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
    window.addEventListener('scroll', updatePos, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, { capture: true });
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
    // If unified audio provider is active, skip legacy DOM listeners
    try {
      if (typeof window !== 'undefined' && (window).__UNIFIED_AUDIO_ACTIVE) {
        return;
      }
    } catch {}
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

  // Sync HUD progress with unified audio provider
  useEffect(() => {
    try { setDuration(audioManager?.duration || 0); } catch {}
  }, [audioManager?.duration]);
  useEffect(() => {
    try { setProgress(audioManager?.currentTime || 0); } catch {}
  }, [audioManager?.currentTime]);

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

  // Close volume popover when blue display closes
  useEffect(() => {
    if (!showHUD) {
      setShowHudVolumePopover(false);
    }
  }, [showHUD]);

  // Animation loop for smooth cursor movement when playing
  useEffect(() => {
    let animationId;
    let frameCount = 0;

    const animate = () => {
      setAnimationTime(Date.now());

      // Find audio element - try liveAudioRef first, then search DOM
      let a = liveAudioRef.current;
      if (!a) {
        const allAudio = document.querySelectorAll('audio');
        for (const el of allAudio) {
          if (!el.paused || el.currentTime > 0) {
            a = el;
            break;
          }
        }
        if (!a && allAudio.length > 0) {
          a = allAudio[0];
        }
      }

      if (a) {
        const newTime = a.currentTime;
        const newDur = a.duration;

        // Update duration if it's valid (helps with initial load and track changes)
        if (isFinite(newDur) && newDur > 0) {
          setDuration(prevDur => {
            if (Math.abs(newDur - prevDur) > 0.1) { // Update if difference > 100ms
              return newDur;
            }
            return prevDur;
          });
        }

        // Update progress (both playing and paused states for seek support)
        setProgress(prevTime => {
          if (Math.abs(newTime - prevTime) > 0.01) { // Update if difference > 10ms
            return newTime;
          }
          return prevTime;
        });

        // Debug logging every 60 frames (1 second at 60fps) when playing
        frameCount++;
        if (frameCount % 60 === 0 && DEBUG_MEDIA && !a.paused) {
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

  // Progress bar click handler (unified audio)
  const handleProgressClick = (e) => {
    if (!duration) {
      if (DEBUG_MEDIA) dlog('HUDPanel: cannot seek — missing duration');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = Math.max(0, Math.min(duration, percentage * duration));
    if (DEBUG_MEDIA) dlog('HUDPanel: seeking (unified)', { seekTime, percent: percentage * 100 });
    try { audioManager.seek(seekTime); } catch {}
    try { sfx.play('click', 0.3); } catch {}
  };

  // Toggle play/pause using unified audio system
  const handlePlayPause = () => {
    // Play flip sound when starting playback, pause sound when pausing
    try { 
      if (audioManager?.playing) {
        sfx.play('pause', 0.6);
      } else {
        sfx.play('flip', 0.6);
      }
    } catch {}
    
    // Use the unified audio system for all play/pause operations
    try {
      audioManager.togglePlayPause();
    } catch (err) {
      console.error('Failed to toggle play/pause via unified audio system:', err);
      
      // Fallback to legacy DOM-based approach if unified system fails
      const audioSelector = !currentId ? 'audio[data-ambient="1"]' : 'audio[data-audio-player="1"]';
      const a = document.querySelector(audioSelector);
      
      if (a) {
        try {
          if (a.paused) {
            try { a.muted = false; } catch {}
            a.play().catch(() => {});
          } else {
            a.pause();
          }
        } catch {}
      }
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
  const baseSongs = songs && songs.length ? songs : buildPlanetSongs().hudSongs;

  // Time-locked tracks config
  const TIME_LOCKED_TRACKS = {
    "mr-brightside": {
      unlockDate: "2026-02-27T12:00:00-05:00", // Feb 27, 2026 12PM EST
      earlyAccessTiers: ["guide"],
    },
  };

  const resolvedSongs = baseSongs.map(s => {
    const config = TIME_LOCKED_TRACKS[s.id];
    if (!config) return s;
    const now = Date.now();
    const unlock = new Date(config.unlockDate).getTime();
    if (now >= unlock) return s;
    const tier = (profile?.tier || "wanderer").toLowerCase();
    if (config.earlyAccessTiers.includes(tier)) return s;
    return { ...s, locked: true, unlockDate: config.unlockDate };
  });
  
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
      aria-label="CHXNDLER HUD"
      ref={inConsole ? containerRef : undefined}
    >
      <DevErrorLogger />
      <div className="w-full h-full flex items-end justify-center" style={{ overflow: 'visible' }}>
          <motion.div
            className={`relative rounded-2xl hud-panel-breathing`}
            // Remove hover glow/scale for the entire HUD display per request
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={inConsole
              // Let the blue display grow to fill the portal slot from the profile bar to the button baseline
              ? { width: '100%', height: '100%', maxHeight: 'none', transform: 'perspective(1200px) rotateX(6deg)', transformOrigin: 'center', marginTop: 0, willChange: 'opacity, transform', contain: 'layout', backfaceVisibility: 'hidden', overflow: 'visible' }
              // Keep previous cap for non-console usage
              : { maxHeight: '350px', transform: 'perspective(1200px) rotateX(6deg)', marginTop: 0, willChange: 'opacity, transform', contain: 'layout', backfaceVisibility: 'hidden', overflow: 'visible' }
            }
          >
          {/* Background removed: keep HUD box transparent */}
        {/* Single blue outline wrapping the HUD content (amped glow) */}
        <div className={`relative rounded-2xl ${inConsole ? 'pt-0 pb-2 px-1' : 'pt-0 pb-4 px-4'}`} style={{
          background: 'transparent',
          boxShadow: 'none',
          willChange: 'opacity, transform',
          contain: 'layout',
          overflow: 'visible',
          height: '100%'
        }}>
          {/* Blue background overlay removed */}
          {/* 3D planets / Flat map — align to full blue display width (outside inner padding) */}
          {!disable3DPlanets && (
          <div
            ref={planetRef}
            className="absolute inset-x-0"
            // Position 3D display higher within blue HUD area; allow only top bleed on homepage
            style={{
              // Fade only the 3D layer when beam-only mode is active
              opacity: contentOpacity,
              // Move the 3D planet system higher
              top: 0,
              height: '300px',
              pointerEvents: 'none', // Let clicks pass through to elements below
              zIndex: 5 // Lower z-index so it doesn't block cover art
            }}
          >
            {/* Toggle button: 3D Planets <-> Flat Map */}
            <button
              type="button"
              onClick={() => { try { sfx.play('click', 0.5); } catch {} setShowFlatMap(prev => !prev); }}
              aria-label={showFlatMap ? 'Switch to 3D planets' : 'Switch to flat map'}
              title={showFlatMap ? '3D Planets' : 'World Map'}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 50,
                pointerEvents: 'auto',
                background: 'rgba(0, 20, 30, 0.7)',
                border: '1px solid rgba(61, 245, 255, 0.4)',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(61, 245, 255, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(61, 245, 255, 0.8)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(61, 245, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(61, 245, 255, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(61, 245, 255, 0.15)';
              }}
            >
              {showFlatMap ? (
                /* Globe icon - switch back to 3D */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DF5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              ) : (
                /* Map icon - switch to flat map */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DF5FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              )}
              <span style={{ color: '#3DF5FF', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                {showFlatMap ? '3D' : 'MAP'}
              </span>
            </button>

            <div className="w-full h-full" style={{ pointerEvents: showFlatMap ? 'auto' : 'none', minHeight: '300px' }}>
              {showFlatMap ? (
                /* Flat World Map view */
                <FlatWorldMap />
              ) : ENABLE_PLANETS && Pure3DPlanets ? (
                /* 3D Planet System view */
                <ErrorBoundary
                  key={preferRaw3D ? 'raw' : 'r3f'}
                  fallback={<div className="w-full h-full flex items-center justify-center text-red-400">3D Error - Check Console</div>}
                  onError={(e)=>{
                    const emsg = String((e && (e.message||e.name)) || '');
                    console.error('Pure3DPlanets Error:', emsg, e);
                    if (String(e?.name||'').includes('IndexSizeError')) {
                      try { if (DEBUG_MEDIA) dwarn('Disabling 3D due to IndexSizeError'); } catch {}
                    }
                    if (emsg.includes('ReactCurrentOwner') || emsg.includes('Cannot read properties of undefined')) {
                      // Switch to raw 3D fallback; keep 3D enabled
                      setPreferRaw3D(true);
                      if (process.env.NODE_ENV !== "production") console.warn('Switched to Raw3D due to React compatibility issue:', emsg);
                    }
                    setThreeFailed(emsg || 'Render error');
                    // Do not disable can3D here; fallback may still work
                  }}
                >
                  {/* Show 3D planets using Three.js */}
                  <Pure3DPlanets
                    songs={resolvedSongs || []}
                    songsByElement={{}}
                    zoomLevel={1}
                    onPlanetSelect={handlePlanetSelectWithRewards}
                    onSongChange={onSongChange}
                    quality="high"
                    focusElement={focusElement}
                    focusSongId={currentId || null}
                    glowingElement={planetRewards.elementOfDay || null}
                    glowActive={!planetRewards.claimedToday}
                    hasClaimedElementOfDay={planetRewards.claimedToday}
                    isClaimingReward={planetRewards.isClaimingReward}
                    onDailyPlanetClick={planetRewards.claimPlanetReward}
                  />
                </ErrorBoundary>
              ) : null}
              </div>
          </div>
          )}
          {/* Background removed for transparent HUD */}
          {/* Cover art moved into right column above the song list */}
          {/* Holographic beam overlays removed */}
          {/* Bloom layers removed */}
          <div
              className={`relative ${inConsole ? 'py-2 px-1' : 'p-4'}`}
              style={{
                // Keep this wrapper always visible so cover art never flashes with 3D
                opacity: 1,
                transition: 'opacity 240ms ease',
                // Let clicks pass through to 3D canvas below; individual children set pointerEvents: auto
                pointerEvents: 'none',
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
                transform: 'translateZ(0)',
                // Ensure this wrapper (containing cover art) is above the 3D planets layer (z-index: 5)
                zIndex: 10
              }}
              ref={innerRef}
            >
            {/* Darkening glass gradient background overlay - improvement #7 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 100%)',
                borderRadius: 'inherit',
                zIndex: -1
              }}
            />
            
            {/* Floating holographic dust particles - improvement #9 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -10, clipPath: 'inset(0)' }}>
              <div className="holo-particle holo-particle-1"></div>
              <div className="holo-particle holo-particle-2"></div>
              <div className="holo-particle holo-particle-3"></div>
              <div className="holo-particle holo-particle-4"></div>
              <div className="holo-particle holo-particle-5"></div>
              <div className="holo-particle holo-particle-6"></div>
              <div className="holo-particle holo-particle-7"></div>
              <div className="holo-particle holo-particle-8"></div>
              <div className="holo-particle holo-particle-9"></div>
              <div className="holo-particle holo-particle-10"></div>
            </div>


          
          {/* Cover section at bottom right corner - using CoverHologram for pop-out functionality */}
          <div ref={coverRef} className="absolute hud-cover-pos" style={{
            // Align flush to the right, above the player area
            bottom: 44,
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
            // Ensure this sits above the 3D planet layer (higher z-index)
            zIndex: 20,
            // Ensure pointer events work on cover art
            pointerEvents: 'auto'
          }}>
            {(() => {
              // Derive the display track robustly: prefer prop 'track', then lookup by currentId/active
              const displayTrack = (() => {
                try {
                  if (track && track.cover) return track;
                  const id = currentId || active;
                  if (!id) return undefined;
                  const found = resolvedSongs?.find?.(s => s.id === id);
                  return (found && found.cover) ? found : undefined;
                } catch { return undefined; }
              })();

              // On homepage (no currentId), always show the CHXNDLER brand cover
              if (!currentId) {
                const src = DEFAULT_COVER;
                const title = 'CHXNDLER';
                const trackingSong = 'chxndler_home';
                return (
                  <div
                    className="cover-art-glow"
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                    style={{
                      pointerEvents: joinAlienOpen ? 'none' : 'auto',
                      overflow: 'visible',
                      position: 'relative',
                      transform: 'translateY(12px)' // Nudge icon down
                    }}
                  >
                    <CoverHologram key={trackingSong} src={src} title={title} slug={trackingSong} inline={true} size={110} />
                  </div>
                );
              }
              // When a track is selected, show using robustly resolved data
              if (displayTrack && displayTrack.cover) {
                const src = displayTrack.cover;
                const title = displayTrack?.title || 'Unknown';
                const trackingSong = (displayTrack?.slug || currentId || active || 'unknown');
                return (
                  <div
                    className="cover-art-glow"
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {}; try { const a = hoverCoverRef.current; if (a && a.readyState >= 2) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
                    style={{
                      pointerEvents: joinAlienOpen ? 'none' : 'auto',
                      overflow: 'visible',
                      position: 'relative',
                      transform: 'translateY(12px)' // Nudge icon down
                    }}
                  >
                    <CoverHologram key={trackingSong} src={src} title={title} slug={trackingSong} inline={true} size={110} />
                  </div>
                );
              }
              return null;
            })()}
            
          </div>

          {/* Waveform Media Player - positioned below dropdown with proper spacing */}
          <div ref={playerRef} className="absolute" style={{
            left: inConsole ? 4 : 4, // Match dropdown left position
            right: oneLinerRight + 2, // Match dropdown right position
            // Adjust height to allow internal bottom buffer
            height: '60px',
            // Position player at the bottom of the blue display
            bottom: -16,
            overflow: 'visible'
          }}>
            <div className="hud-waveform-player" style={{ margin: 0, borderRadius: '10px', paddingBottom: 10, position: 'relative', overflow: 'visible' }}>
              <div className="flex flex-wrap items-start gap-3 pt-0 pr-2 pl-2 pb-0" style={{ overflow: 'visible' }}>
                <div className="controls-row flex items-start justify-start gap-4 w-full" style={{ paddingTop: 4, overflow: 'visible' }}>
                <div className="hud-main-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, overflow: 'visible' }}>
                {/* Top controls: Play/Pause with Lyrics immediately to the right */}
                {(() => {
                  const isHome = !currentId;
                  const currentSong = resolvedSongs.find(s => s.id === active);
                  const slug = isHome ? 'homepage' : (currentSong?.id || active || 'homepage');
                  const hasLyrics = isHome ? true : !!(currentSong && (currentSong.hasLyrics !== false));
                  const lyricsTitle = isHome ? 'Lyrics for CHXNDLER' : `Lyrics for ${currentSong?.title || 'current track'}`;
                  const lyricsAria = isHome ? 'View lyrics for CHXNDLER' : `View lyrics for ${currentSong?.title || 'current track'}`;

                  // Define streaming URLs at top level to avoid closure issues
                  const CHXNDLER_SPOTIFY_PROFILE = 'https://open.spotify.com/artist/6O2eoUA8ZWY0lwjsa3E3Yo?si=7gxP4bNnQ1ax1ODrZ6RvtA';
                  const CHXNDLER_APPLE_PROFILE = 'https://music.apple.com/us/artist/chxndler/1660901437';
                  const CHXNDLER_YOUTUBE_CHANNEL = 'https://www.youtube.com/@chxndlerthealien/videos';

                  const spotifyUrl = isHome ? CHXNDLER_SPOTIFY_PROFILE : (currentSong?.spotify || CHXNDLER_SPOTIFY_PROFILE);
                  const appleUrl = isHome ? CHXNDLER_APPLE_PROFILE : (currentSong?.apple || CHXNDLER_APPLE_PROFILE);
                  const youtubeUrl = isHome ? CHXNDLER_YOUTUBE_CHANNEL : (currentSong?.youtube || CHXNDLER_YOUTUBE_CHANNEL);

                  const isSpotifyProfile = isHome || !currentSong?.spotify;
                  const isAppleProfile = isHome || !currentSong?.apple;
                  const isYouTubeProfile = isHome || !currentSong?.youtube;

                  const isElementPlanet = ELEMENT_PLANETS.includes(String(active).toLowerCase());
                  const isCenterPlanet = String(active).toLowerCase() === 'center';
                  return (
                    <>
                      {/* Controls positioned above waveform */}
                      <div className="hud-top-controls" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: -38,
                        zIndex: 6,
                        borderRadius: '8px',
                        padding: '4px 2px',
                        backgroundColor: 'transparent',
                        pointerEvents: 'auto'
                      }}>
                      <button
                        onClick={handlePlayPause}
                        className="hud-play-btn-enhanced"
                        aria-label={audioManager.playing ? "Pause" : "Play"}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        style={{ marginTop: 1, width: 36, height: 36 }}
                        data-tour-id="music-power-button"
                      >
                        {audioManager.playing ? (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                          </svg>
                        ) : (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 4v16l12-8z"/>
                          </svg>
                      )}
                      </button>
                      {(isCenterPlanet || isElementPlanet) ? (
                        <div
                          className="lyrics-btn-unavailable-hud"
                          style={{ marginTop: 1 }}
                          title={isCenterPlanet ? "Lyrics not available for Heartverse" : "Lyrics not available for elemental planets"}
                          aria-disabled="true"
                          data-id="lyrics"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <rect x="5" y="5" width="14" height="10" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                            <circle cx="8" cy="16" r="1.2" fill="currentColor" />
                            <circle cx="6.2" cy="18" r="1.1" fill="currentColor" />
                            <rect x="10" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                            <rect x="13.6" y="8" width="2.4" height="4.4" rx="0.8" ry="0.8" fill="currentColor" />
                          </svg>
                        </div>
                      ) : hasLyrics ? (
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

                      {/* Streaming: Spotify, Apple, YouTube moved left into top controls */}
                      {isCenterPlanet ? (
                        <div className="spotify-btn-unavailable-hud" style={{ marginTop: 1 }} title="Spotify not available for Heartverse">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </div>
                      ) : (
                        <a
                          href={spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-button-id="spotify"
                          className="spotify-btn-waveform-hud"
                          style={{ marginTop: 1, width: 32, height: 32, flexShrink: 0, pointerEvents: 'auto', order: 3 }}
                          title={isSpotifyProfile ? "Open CHXNDLER on Spotify" : "Open on Spotify"}
                          aria-label={isSpotifyProfile ? "Open CHXNDLER on Spotify" : `Open ${currentSong?.title || 'current track'} on Spotify`}
                          data-song={currentSong?.title || ''}
                          data-slug={currentSong?.id || ''}
                          data-id="sp"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try { sfx.play('join-aliens', 0.9); } catch {}
                            try {
                              const { toSpotifyEmbed } = require('@/lib/spotify');
                              const embed = toSpotifyEmbed(spotifyUrl);
                              if (embed) { setSpEmbedUrl(embed); setShowSpotifyPopover(true); }
                              else { window.open(spotifyUrl, '_blank', 'noopener,noreferrer'); }
                            } catch {
                              window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                        </a>
                      )}

                      {(isCenterPlanet || isElementPlanet) && !currentSong?.apple ? (
                        <div className="apple-btn-unavailable-hud" style={{ marginTop: 1 }} title={isCenterPlanet ? "Apple Music not available for Heartverse" : "Apple Music not available for elemental planets"}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" role="img" aria-label="Music notes" style={{ display: 'block' }}>
                            <ellipse cx="7.5" cy="18.2" rx="3.2" ry="3.4" />
                            <ellipse cx="16.5" cy="16" rx="3.2" ry="3.4" />
                            <rect x="9" y="6" width="2" height="11" rx="1" />
                            <rect x="18" y="4" width="2" height="11" rx="1" />
                            <path d="M11 6 L20 4 L20 6.5 L11 8.5 Z" />
                          </svg>
                        </div>
                      ) : (
                        <a
                          href={appleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-button-id="apple-music"
                          className="apple-btn-waveform-hud"
                          style={{ marginTop: 1, overflow: 'hidden', width: 32, height: 32, maxWidth: 32, maxHeight: 32, flexShrink: 0, pointerEvents: 'auto', order: 4, contain: 'strict' }}
                          title="Open Apple Music"
                          aria-label={isAppleProfile ? "Open CHXNDLER on Apple Music" : `Open ${currentSong?.title || 'current track'} on Apple Music`}
                          data-song={currentSong?.title || ''}
                          data-slug={currentSong?.id || ''}
                          data-id="am"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try { sfx.play('join-aliens', 0.9); } catch {}
                            try {
                              const { toAppleEmbed } = require('@/lib/apple');
                              const embed = toAppleEmbed(appleUrl);
                              if (embed) { setAmEmbedUrl(embed); setShowApplePopover(true); }
                              else { window.open(appleUrl, '_blank', 'noopener,noreferrer'); }
                            } catch {
                              window.open(appleUrl, '_blank', 'noopener,noreferrer');
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
                      )}

                      {(isCenterPlanet || isElementPlanet) && !currentSong?.youtube ? (
                        <div className="youtube-btn-unavailable-hud" title={isCenterPlanet ? "YouTube not available for Heartverse" : "YouTube not available for elemental planets"} style={{ marginTop: 1 }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <path d="M10 8l6 4-6 4z" fill="currentColor" opacity="0.55" />
                          </svg>
                        </div>
                      ) : (
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-button-id="youtube"
                          className="youtube-btn-waveform-hud"
                          style={{ marginTop: 1, width: 32, height: 32, flexShrink: 0, pointerEvents: 'auto', order: 5 }}
                          title={isYouTubeProfile ? "Open CHXNDLER on YouTube" : `Open ${currentSong?.title || 'current track'} on YouTube`}
                          aria-label={isYouTubeProfile ? "Open CHXNDLER on YouTube" : `Open ${currentSong?.title || 'current track'} on YouTube`}
                          data-song={currentSong?.title || ''}
                          data-slug={currentSong?.id || ''}
                          data-id="yt"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try { sfx.play('join-aliens', 0.9); } catch {}
                            // For channel URLs (homepage), always open directly - can't embed channels
                            if (isYouTubeProfile) {
                              window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
                              return;
                            }
                            // For video links, try embed popover
                            try {
                              const { toYouTubeEmbed } = require('@/lib/youtube');
                              const embed = toYouTubeEmbed(youtubeUrl);
                              if (embed) { setYtEmbedUrl(embed); setShowYouTubePopover(true); }
                              else { window.open(youtubeUrl, '_blank', 'noopener,noreferrer'); }
                            } catch {
                              window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M10 8l6 4-6 4z" />
                          </svg>
                        </a>
                      )}
                      {/* Volume button - MUST be last in row */}
                      <button
                        data-button-id="volume-control"
                        className="hud-volume-btn"
                        style={{ marginTop: 1, width: 32, height: 32, flexShrink: 0, pointerEvents: 'auto', touchAction: 'manipulation', order: 99 }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                        onTouchStart={(e) => {
                          // Prevent touch events from propagating to underlying elements
                          e.stopPropagation();
                        }}
                        onTouchEnd={(e) => {
                          // Handle touch end to ensure proper button activation
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Close any open popovers that might have been triggered by accident
                          setShowApplePopover(false);
                          setShowSpotifyPopover(false);
                          setShowYouTubePopover(false);
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
                        aria-label="Adjust Volume"
                        title="Adjust Volume"
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
                      {/* Connector line removed - track bar moved below controls */}

                      {/* Enhanced glowing track line pinned to the bottom of blue display */}
                      {(() => {
                        try {
                          const a = liveAudioRef?.current;
                          // Try to find any audio element if liveAudioRef isn't set
                          let audioEl = a;
                          if (!audioEl) {
                            // Find first audio element that's playing or has progress
                            const allAudio = document.querySelectorAll('audio');
                            for (const el of allAudio) {
                              if (!el.paused || el.currentTime > 0) {
                                audioEl = el;
                                break;
                              }
                            }
                            // Fallback to any audio element
                            if (!audioEl && allAudio.length > 0) {
                              audioEl = allAudio[0];
                            }
                          }

                          // Get values from multiple sources
                          const amDur = audioManager?.duration;
                          const amTime = audioManager?.currentTime;
                          const elDur = audioEl?.duration;
                          const elTime = audioEl?.currentTime;

                          // Use whichever source has valid values
                          const liveDur = (isFinite(elDur) && elDur > 0) ? elDur
                            : (isFinite(amDur) && amDur > 0) ? amDur
                            : (isFinite(duration) && duration > 0) ? duration
                            : 0;
                          const liveTime = (isFinite(elTime) && elTime >= 0) ? elTime
                            : (isFinite(amTime) && amTime >= 0) ? amTime
                            : (isFinite(progress) && progress >= 0) ? progress
                            : 0;
                          const pct = liveDur > 0 ? Math.max(0, Math.min(100, (liveTime / liveDur) * 100)) : 0;

                          // Get element-based color for enhanced glow
                          const TRACK_ELEMENT_COLORS = {
                            heart: "#FC54AF",
                            water: "#38B6FF",
                            lightning: "#F2EF1D",
                            darkness: "#FFFFFF"
                          };
                          const currentSong = resolvedSongs.find(s => s.id === active);
                          const element = currentSong?.icon || 'heart';
                          const elementColor = TRACK_ELEMENT_COLORS[element] || '#38B6FF';

                          return (
                            <>
                            {/* Subtle ambient glow behind the track bar */}
                            <div
                              style={{
                                position: 'absolute',
                                // Stay contained within the blue display
                                left: 0,
                                right: 0,
                                // Ambient glow below the controls container
                                bottom: -26,
                                height: 20,
                                borderRadius: 9999,
                                background: 'radial-gradient(ellipse 100% 100%, rgba(25,227,255,0.25) 0%, rgba(25,227,255,0.1) 50%, transparent 80%)',
                                filter: 'blur(8px)',
                                pointerEvents: 'none',
                                zIndex: 99
                              }}
                            />
                            <div
                              className="hud-enhanced-track"
                              style={{
                                position: 'absolute',
                                // Stay contained within the blue display
                                left: 0,
                                right: 0,
                                // Track bar below the controls container
                                bottom: -26,
                                height: 14,
                                borderRadius: 9999,
                                background: 'rgba(20,20,25,0.9)',
                                border: '1px solid rgba(25,227,255,0.6)',
                                boxShadow: `
                                  0 0 8px rgba(25,227,255,0.6),
                                  0 0 16px rgba(25,227,255,0.4),
                                  inset 0 0 4px rgba(25,227,255,0.3)
                                `,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                                zIndex: 100
                              }}
                              onMouseDown={(e) => { e.stopPropagation(); }}
                              onPointerDown={(e) => { e.stopPropagation(); }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  const ne = e.nativeEvent;
                                  if (ne && typeof ne.stopImmediatePropagation === 'function') {
                                    ne.stopImmediatePropagation();
                                  }
                                } catch {}
                                if (process.env.NODE_ENV !== "production") console.log('CLICKED AT', e.clientX);

                                // Try multiple ways to get the audio element
                                let audioEl = liveAudioRef?.current;
                                if (!audioEl) {
                                  // Try to get from unified audio manager
                                  try {
                                    audioEl = audioManager.getCurrentAudio?.();
                                  } catch {}
                                }
                                if (!audioEl) {
                                  // Try to find in DOM
                                  audioEl = document.querySelector('audio[src*="tracks"]');
                                }

                                // Try multiple ways to get duration
                                let dur = liveDur;
                                if (!dur && audioEl) {
                                  dur = audioEl.duration;
                                }
                                if (!dur) {
                                  dur = duration;
                                }

                                if (!audioEl) {
                                  console.error('No audio element found');
                                  alert('No audio element found');
                                  return;
                                }
                                if (!dur || dur <= 0) {
                                  console.error('No valid duration');
                                  alert('No valid duration');
                                  return;
                                }

                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                                const newTime = ratio * dur;

                                if (process.env.NODE_ENV !== "production") console.log('Seeking to', newTime, 'seconds (', ratio * 100, '%)');
                                audioEl.currentTime = newTime;
                                try { sfx.play('click', 0.3); } catch {}
                              }}
                              title={`Click to seek`}
                            >
                              {/* Progress fill - glowing light that fills as song progresses */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: `linear-gradient(90deg, ${elementColor}aa, ${elementColor}dd, ${elementColor}aa)`,
                                  borderRadius: 9999,
                                  boxShadow: `
                                    0 0 6px ${elementColor}88,
                                    0 0 12px ${elementColor}55,
                                    inset 0 0 4px rgba(255,255,255,0.4)
                                  `,
                                  // Avoid lag: update instantly; RAF drives smoothness
                                  transition: 'none',
                                  pointerEvents: 'none',
                                  minWidth: pct > 0 ? '3px' : '0',
                                  zIndex: 10
                                }}
                              />

                              {/* Progress handle/cursor - shows current position */}
                              {pct > 0 && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: `${pct}%`,
                                    transform: 'translateX(-50%) translateY(-50%)',
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle, white 40%, ${elementColor})`,
                                    boxShadow: `
                                      0 0 6px ${elementColor},
                                      0 0 12px ${elementColor}aa,
                                      0 1px 3px rgba(0,0,0,0.4)
                                    `,
                                    // Avoid lag: update instantly; RAF drives smoothness
                                    transition: 'none',
                                    pointerEvents: 'none',
                                    zIndex: 15
                                  }}
                                />
                              )}
                            </div>
                            </>
                          );
                        } catch {
                          return null;
                        }
                      })()}
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
                        const applyVol = (newVol) => {
                          setVolume(newVol);
                          if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                          try { localStorage.setItem(VOLUME_STORAGE_KEY, String(newVol)); } catch {};
                          // Apply to all audio elements
                          const a = liveAudioRef.current; if (a) a.volume = newVol;
                          const mediaPlayer = document.querySelector('audio[data-audio-player="1"]'); if (mediaPlayer) mediaPlayer.volume = newVol;
                          try { audioManager.setVolume(newVol); } catch {}
                          playVol();
                        };
                        if (e.key === 'ArrowUp') { e.preventDefault(); applyVol(Math.max(0, Math.min(1, volume + 0.05))); }
                        else if (e.key === 'ArrowDown') { e.preventDefault(); applyVol(Math.max(0, Math.min(1, volume - 0.05))); }
                      }}
                      onPointerDown={(e) => {
                        const el = e.currentTarget;
                        const playVol = () => { const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()); const last = hudVolumeSfxLastRef.current || 0; if (now - last > 120) { hudVolumeSfxLastRef.current = now; try { sfx.play('volume', 0.28); } catch {} } };
                        const applyFromClientY = (clientY) => {
                          const rect = el.getBoundingClientRect();
                          const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                          const pct = rect.height > 0 ? (1 - (y / rect.height)) : 0;
                          const newVol = Math.max(0, Math.min(1, pct));
                          // Update state and localStorage even if no audio element
                          setVolume(newVol);
                          if (newVol > 0) lastNonZeroVolumeRef.current = newVol;
                          try { localStorage.setItem(VOLUME_STORAGE_KEY, String(newVol)); } catch {}
                          // Apply to all audio elements
                          const a = liveAudioRef.current; if (a) a.volume = newVol;
                          const mediaPlayer = document.querySelector('audio[data-audio-player="1"]'); if (mediaPlayer) mediaPlayer.volume = newVol;
                          try { audioManager.setVolume(newVol); } catch {}
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
                                src="/elements/binder.webp"
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
                        <div style={{ position: 'absolute', left: '50%', top: savedProfileElement ? '22px' : '12px', transform: 'translateX(-50%)' }}>
                          <button
                            type="button"
                            aria-label="HEARTVERSE Code"
                            title="HEARTVERSE Code"
                            onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                            onClick={() => {
                              try { sfx.play('click.mp3', 0.4); } catch {}
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
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: 'center', opacity: 0.95 }}>
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
                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
                                  Text a Friend
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.85 }}>
                                  Share the Heartverse with someone special
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try { sfx.play('click', 0.4); } catch {}

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
                                  padding: '8px 14px',
                                  fontSize: 14,
                                  fontWeight: 700,
                                  background: dailyInviteDone ? 'rgba(76,175,80,0.6)' : 'rgba(33,150,243,0.6)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  textShadow: '0 0 8px rgba(0,0,0,0.5)',
                                  minWidth: '70px'
                                }}
                              >
                                {dailyInviteDone ? '♡ +5' : 'SHARE'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Open Journal Quest */}
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
                              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
                                Open Journal
                              </div>
                              <div style={{ fontSize: 13, opacity: 0.85 }}>
                                Cast your soul star into the universe
                              </div>
                            </div>
                            <div
                              style={{
                                padding: '8px 14px',
                                fontSize: 14,
                                fontWeight: 700,
                                background: journalCompletedToday ? 'rgba(76,175,80,0.6)' : 'rgba(128,128,128,0.3)',
                                color: journalCompletedToday ? '#00FF00' : '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                transition: 'all 0.2s ease',
                                textShadow: journalCompletedToday ? '0 0 8px #00FF00' : '0 0 8px rgba(0,0,0,0.5)',
                                minWidth: '90px',
                                textAlign: 'center'
                              }}
                            >
                              {journalCompletedToday ? 'COMPLETED' : 'PENDING'}
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
                                  We believe being your <span style={{ color: '#0099FF !important', textShadow: '0 0 5px #0099FF, 0 0 10px #0099FF, 0 0 15px #0099FF, 0 0 20px #0099FF', fontWeight: 'inherit !important', WebkitTextFillColor: '#0099FF !important', textFillColor: '#0099FF !important', filter: 'drop-shadow(0 0 3px #0099FF)' }}>truest self</span> is the beginning of freedom.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 2, color: '#fff' }}>
                                  We believe <span style={{ color: '#FFD700 !important', textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700, 0 0 20px #FFD700', fontWeight: 'inherit !important', WebkitTextFillColor: '#FFD700 !important', textFillColor: '#FFD700 !important', filter: 'drop-shadow(0 0 3px #FFD700)' }}>passion</span> is sacred and should be pursued loudly.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 2, color: '#fff' }}>
                                  We believe <span style={{ color: '#FF1493 !important', textShadow: '0 0 5px #FF1493, 0 0 10px #FF1493, 0 0 15px #FF1493, 0 0 20px #FF1493', fontWeight: 'inherit !important', WebkitTextFillColor: '#FF1493 !important', textFillColor: '#FF1493 !important', filter: 'drop-shadow(0 0 3px #FF1493)' }}>love</span> is the force that connects every soul.
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
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setWandererFlipped(v => !v); } }}
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
                                  src="/elements/wanderer.webp"
                                  alt="The Wanderer"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(25,227,255,0.9)) drop-shadow(0 0 28px rgba(25,227,255,0.55))' }}
                                />
                                <div className="neon-blue" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#19E3FF' }}>The Wanderer</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#19E3FF' }}>
                                  <span className="neon-blue heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>0–4</span>
                                  <img src="/elements/heart-coin.webp" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
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
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setDreamerFlipped(v => !v); } }}
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
                                  src="/elements/dreamer.webp"
                                  alt="The Dreamer"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(255,212,0,0.9)) drop-shadow(0 0 28px rgba(255,212,0,0.55))' }}
                                />
                                <div className="neon-yellow" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#FFD400' }}>The Dreamer</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#FFD400' }}>
                                  <span className="neon-yellow heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>5–24</span>
                                  <img src="/elements/heart-coin.webp" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
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
                            onClick={() => { try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { sfx.play('flip', 0.45); } catch {}; setLoverFlipped(v => !v); } }}
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
                                  src="/elements/lover.webp"
                                  alt="The Lover"
                                  width={56}
                                  height={56}
                                  style={{ display: 'block', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(33,150,243,0.95)) drop-shadow(0 0 28px rgba(33,150,243,0.55))' }}
                                />
                                <div className="neon-pink" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.02em', color: '#FF4FD8' }}>The Lover</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#2196F3' }}>
                                  <span className="neon-pink heart-tier-range" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.02em' }}>25+</span>
                                  <img src="/elements/heart-coin.webp" alt="HEART" width={26} height={26} className="heart-tier-icon heart-coin-glow" style={{ display: 'block', width: 26, height: 26, objectFit: 'contain', transform: 'translateY(0.5px) scale(1.08)' }} />
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
                        src="/elements/heart-coin.webp"
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
                              } else {
                                // Empty slot: open HeartCoin modal on CARDS tab
                                try { sfx.play('click', 0.4); } catch {}
                                try { setShowBookPopover(false); } catch {}
                                try {
                                  window.dispatchEvent(new CustomEvent('openHeartCoinCards', {
                                    detail: {
                                      source: 'binder_empty_slot'
                                    }
                                  }));
                                } catch {}
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

                      {/* Pagination Navigation */}
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '12px',
                        zIndex: 1
                      }}>
                        {/* Page indicator */}
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'rgba(255,255,255,0.8)',
                          textShadow: '0 0 8px rgba(33,150,243,0.4)'
                        }}>
                          1 / 6
                        </div>
                        
                        {/* Right arrow button */}
                        <button
                          style={{
                            position: 'absolute',
                            right: '0px',
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(252,84,175,0.15)',
                            border: '2px solid rgba(252,84,175,0.4)',
                            borderRadius: '50%',
                            color: '#FC54AF',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            backdropFilter: 'blur(4px)'
                          }}
                          onMouseEnter={(e) => {
                            try { sfx.play('hover', 0.35); } catch {}
                            e.currentTarget.style.backgroundColor = 'rgba(252,84,175,0.25)';
                            e.currentTarget.style.borderColor = 'rgba(252,84,175,0.7)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(252,84,175,0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(252,84,175,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(252,84,175,0.4)';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => {
                            try { sfx.play('click', 0.4); } catch {}
                            // Future: handle page navigation
                          }}
                        >
                          ›
                        </button>
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
                        width: '280px',
                        height: '420px',
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
                        
                      </div>

                      {/* Card Display */}
                      {filteredCards.length > 0 && (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 20px 8px 20px'
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
                                {/* Card and Count Layout - side by side */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 16
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

                                  {/* Card Count positioned to the right of image */}
                                  <div style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#2196F3',
                                    textAlign: 'left',
                                    marginTop: '0px',
                                    textShadow: '0 0 8px rgba(33,150,243,0.5)'
                                  }}>
                                    {currentCardIndex + 1} of {filteredCards.length} {card.type}
                                  </div>
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
                        marginTop: -150
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
                        background: 'transparent',
                        border: '1px solid rgba(29,185,84,0.6)',
                        boxShadow: '0 0 32px rgba(29,185,84,0.35)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        // Slightly higher on the screen
                        marginTop: -150
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
                        // Move higher on screen
                        marginTop: -250
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
                          color: storeActiveTab === 'MERCH' ? '#FF00CC' : '#fff',
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
                          color: storeActiveTab === 'CARDS' ? '#FF00CC' : '#fff',
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
                                        onError={(e)=>{ try { e.currentTarget.src = '/elements/logo.webp'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/patch-inverse.png'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/elements/logo.webp'; } catch {} }}
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
                                        src={'/store/beanie-front-pink.webp'}
                                        alt={item.title}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/elements/logo.webp'; } catch {} }}
                                      />
                                    </div>
                                    {/* Back */}
                                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                      <img
                                        src={'/store/beanie-back-pink.webp'}
                                        alt={`${item.title} back`}
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e)=>{ try { e.currentTarget.src = '/elements/logo.webp'; } catch {} }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img src={item.image || '/elements/logo.webp'} alt={item.title} style={{ display: 'block', width: 104, height: 104, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(33,150,243,0.35)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }} onError={(e)=>{ try { e.currentTarget.src = '/elements/logo.webp'; } catch {} }} />
                              )}
                              {/* Price directly under the image (show $ price and HEART coins side by side) */}
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFB9E1', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {/* Cash price */}
                                <span 
                                  onClick={item.price === '$3' ? () => {
                                    try { sfx.play('click.mp3', 0.5); } catch {}
                                    setShowVenmoPopup(true);
                                  } : undefined}
                                  style={{
                                    cursor: item.price === '$3' ? 'pointer' : 'default',
                                    transition: 'all 300ms ease'
                                  }}
                                  onMouseEnter={item.price === '$3' ? (e) => {
                                    try { sfx.play('hover', 0.3); } catch {}
                                    e.target.style.textShadow = '0 0 15px #FFB9E1, 0 0 25px #FFB9E1';
                                    e.target.style.transform = 'scale(1.05)';
                                  } : undefined}
                                  onMouseLeave={item.price === '$3' ? (e) => {
                                    e.target.style.textShadow = 'none';
                                    e.target.style.transform = 'scale(1)';
                                  } : undefined}
                                >{item.price}</span>
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
                                      // Replace the item text with inline confirmation instead of separate popup
                                      setStoreConfirmError('');
                                      setStoreConfirming(true);
                                      setStoreConfirmingIndex(storeIndex);
                                    }}
                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                                  >
                                    <img
                                      src="/elements/heart-coin.webp"
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
                              {storeConfirming && storeConfirmingIndex === storeIndex ? (
                                <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(252,84,175,0.4)', background: 'rgba(252,84,175,0.12)', boxShadow: 'inset 0 0 12px rgba(252,84,175,0.18)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#FFD9EF', textShadow: '0 0 10px rgba(33,150,243,0.85)' }}>{item.title}</div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                      <img src="/elements/heart-coin.webp" alt="Heart Coin" width={18} height={18} style={{ width: 18, height: 18, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(252,84,175,0.65))' }} />
                                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>{heartCoinsCount}</span>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#FFC1E6', marginTop: 6 }}>
                                    {(() => {
                                      try { return localStorage.getItem('heartverse_username') || 'Wanderer'; } catch { return 'Wanderer'; }
                                    })()} — You own {heartCoinsCount} Heart Coins
                                  </div>
                                  {storeConfirmError ? (
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#FF6B6B', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.35)', padding: '6px 8px', borderRadius: 8, textAlign: 'center' }}>
                                      {storeConfirmError}
                                    </div>
                                  ) : null}
                                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <button
                                      disabled={storeConfirmProcessing}
                                      onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                                      onClick={async () => {
                                        if (storeConfirmProcessing) return;
                                        setStoreConfirmProcessing(true);
                                        setStoreConfirmError('');
                                        try {
                                          // Get current session for user ID
                                          const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
                                          if (sessionError || !session?.user) {
                                            throw new Error('Authentication required');
                                          }
                                          
                                          // Call the RPC with correct parameters
                                          const { data, error } = await supabaseClient.rpc('purchase_item_with_heartcoins', {
                                            p_user_id: session.user.id,
                                            p_item_slug: item.id,
                                            p_cost: item.heartcoins
                                          });
                                          
                                          if (error) {
                                            console.error('RPC Error:', error);
                                            
                                            // Check if it's an insufficient funds error
                                            if (error.message?.includes('Not enough HeartCoins') || error.message?.includes('Insufficient HeartCoins')) {
                                              setStoreConfirmError('Not enough HeartCoins for this purchase.');
                                            } else {
                                              setStoreConfirmError('Purchase failed. Please try again.');
                                            }
                                          } else {
                                            try { sfx.play('success', 0.7); } catch {}
                                            // Refresh heartcoin balance after successful purchase using centralized provider
                                            await refetchBalance();
                                            // Brief success flash then close confirmation
                                            setTimeout(() => {
                                              setStoreConfirming(false);
                                              setStoreConfirmingIndex(null);
                                            }, 800);
                                          }
                                        } catch (e) {
                                          setStoreConfirmError('Network error. Please try again.');
                                        } finally {
                                          setStoreConfirmProcessing(false);
                                        }
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(242,239,29,0.7)',
                                        background: storeConfirmProcessing ? 'rgba(128,128,128,0.4)' : 'linear-gradient(135deg,#F2EF1D,#FFC700)',
                                        color: storeConfirmProcessing ? '#DDD' : '#000',
                                        fontWeight: 800,
                                        cursor: storeConfirmProcessing ? 'not-allowed' : 'pointer',
                                        boxShadow: storeConfirmProcessing ? 'none' : '0 6px 18px rgba(242,239,29,0.35)'
                                      }}
                                    >
                                      {storeConfirmProcessing ? 'Processing...' : 'CONFIRM'}
                                    </button>
                                    <button
                                      disabled={storeConfirmProcessing}
                                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                      onClick={() => { setStoreConfirming(false); setStoreConfirmingIndex(null); setStoreConfirmError(''); try { sfx.play('close', 0.35); } catch {} }}
                                      style={{
                                        padding: '10px 12px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(255,255,255,0.35)',
                                        background: 'transparent',
                                        color: '#FFC1E6',
                                        fontWeight: 700,
                                        cursor: storeConfirmProcessing ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FFD9EF', textShadow: '0 0 10px rgba(33,150,243,0.9)' }}>HEARTCOIN</div>
                                  <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>Choose your connection method.</div>
                                  
                                  {/* Authentication Options */}
                                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button
                                      style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        background: '#FC54AF',
                                        color: '#000',
                                        fontWeight: 600,
                                        fontSize: 12,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => { e.target.style.filter = 'brightness(1.1)'; }}
                                      onMouseLeave={(e) => { e.target.style.filter = 'brightness(1)'; }}
                                    >
                                      CONNECT with Google
                                    </button>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#fff', opacity: 0.7 }}>
                                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                                      <span>OR</span>
                                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      <input
                                        type="tel"
                                        placeholder="Phone"
                                        style={{
                                          padding: '6px 8px',
                                          borderRadius: 6,
                                          border: '1px solid rgba(255,255,255,0.2)',
                                          background: 'rgba(0,0,0,0.3)',
                                          color: '#fff',
                                          fontSize: 11
                                        }}
                                      />
                                      <input
                                        type="email"
                                        placeholder="Email"
                                        style={{
                                          padding: '6px 8px',
                                          borderRadius: 6,
                                          border: '1px solid rgba(255,255,255,0.2)',
                                          background: 'rgba(0,0,0,0.3)',
                                          color: '#fff',
                                          fontSize: 11
                                        }}
                                      />
                                    </div>
                                    
                                    <button
                                      style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        background: 'rgba(252,84,175,0.2)',
                                        border: '1px solid rgba(252,84,175,0.6)',
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      CONNECT
                                    </button>
                                  </div>
                                </>
                              )}
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
                      top: '30%',
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
                        src="/elements/heart-coin.webp"
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
                              '✓' : 
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
                        top: (lyricsPopoverPos && lyricsPopoverPos.top) || 64,
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
                      <div className="lyrics-content-enhanced" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 18, color: '#F6F4A9', textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(246,244,169,0.6)', paddingTop: '8px', paddingBottom: '8px' }}>{lyricsContent || 'No lyrics available.'}</div>
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
                              if (process.env.NODE_ENV !== "production") console.log('Name saved:', profileName);
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
                        ].map((element) => {
                          const isClicked = clickedElements.has(element.id);
                          return (
                          <button
                            key={element.id}
                            onClick={() => {
                              setSelectedElement(element.id);
                              setSelectedElementData(element);
                              setClickedElements(prev => new Set(prev).add(element.id));
                              try { sfx.play('flip', 0.4); } catch {}
                            }}
                            onMouseEnter={() => {
                              try { sfx.play('change-channel', 0.3); } catch {}
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
                              color: selectedElement === element.id ? element.color : '#FFFFFF',
                              textShadow: selectedElement === element.id ? 
                                `0 0 10px ${element.color}` : 
                                `0 0 5px ${element.color}60`
                            }}>
                              {!isClicked ? (
                                // Show only icon initially
                                <img 
                                  src={element.icon} 
                                  alt={element.name}
                                  style={{ 
                                    width: 32, 
                                    height: 32, 
                                    filter: selectedElement === element.id ? 
                                      `drop-shadow(0 0 8px ${element.color}) brightness(1.2)` : 
                                      `drop-shadow(0 0 4px ${element.color}60)`
                                  }}
                                  onError={(e) => {
                                    // Fallback to emoji if PNG fails to load
                                    e.target.outerHTML = `<span style="font-size: 24px; filter: ${selectedElement === element.id ? `drop-shadow(0 0 8px ${element.color})` : `drop-shadow(0 0 4px ${element.color}60)`}">${element.emoji}</span>`;
                                  }}
                                />
                              ) : (
                                // Show "ELEMENT awakens." text after click
                                <div style={{
                                  fontSize: '8px',
                                  textAlign: 'center',
                                  fontWeight: '900',
                                  letterSpacing: '0.5px',
                                  lineHeight: 1.2
                                }}>
                                  {element.name}<br/>awakens.
                                </div>
                              )}
                            </div>
                          </button>
                        );
                        })}
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
                              // Save complete profile to database (do NOT send updated_at)
                              const { error } = await supabaseClient
                                .from('profiles')
                                .update({
                                  name: profileName.trim(),
                                  element: selectedElement,
                                  profile_complete: true
                                })
                                .eq('id', currentProfileId);

                              if (error) {
                                console.error('Profile completion error:', error);
                                alert('Failed to complete profile. Please try again.');
                                return;
                              }

                              if (process.env.NODE_ENV !== "production") console.log('Profile completed successfully:', { name: profileName, element: selectedElement });
                              
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
                              if (process.env.NODE_ENV !== "production") console.log('Profile setup completed successfully!')
                              
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
                    {/* Journal button in the top-left corner */}
                    <button
                      aria-label="Open Journal"
                      title="Journal"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(255,255,0,0.95), 0 0 42px rgba(255,255,0,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,0,0.85), 0 0 32px rgba(255,255,0,0.35)'; } catch {} }}
                      onClick={() => { 
                        try { sfx.play('click', 0.4); } catch {}; 
                        // Open the Soul Star Journal modal
                        setShowSoulStarJournal(true);
                      }}
                      style={{
                        position: 'absolute',
                        top: 10, left: 10,
                        width: 60, height: 30, borderRadius: 15,
                        background: 'rgba(255,255,0,0.15)',
                        border: '2px solid rgba(255,255,0,0.6)',
                        color: '#FFFF00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        zIndex: 10,
                        boxShadow: '0 0 16px rgba(255,255,0,0.85), 0 0 32px rgba(255,255,0,0.35)',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      JOURNAL
                    </button>

                    {/* Close button in the top-right corner */}
                    <button
                      aria-label="Close Soul Sky"
                      title="Close"
                      onMouseEnter={(e) => { try { sfx.play('hover', 0.4); } catch {}; try { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 26px rgba(255,255,0,0.95), 0 0 42px rgba(255,255,0,0.65)'; } catch {} }}
                      onMouseLeave={(e) => { try { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,255,0,0.85), 0 0 32px rgba(255,255,0,0.35)'; } catch {} }}
                      onClick={() => {
                        try { sfx.play('close', 0.4); } catch {};
                        setShowSoulSkyPopover(false);
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
                    
                    {showJournalView ? (
                      /* Journal Log View */
                      <div>
                        <div className="lyrics-header" style={{ color: '#FFFF00', textShadow: '0 0 8px rgba(255,255,0,0.6)', fontSize: '12px' }}>
                          JOURNAL LOG
                        </div>
                        <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                          {journalEntries.length === 0 ? (
                            <div style={{ 
                              color: '#FFFF00', 
                              fontSize: '11px', 
                              textAlign: 'center',
                              opacity: 0.7,
                              fontStyle: 'italic' 
                            }}>
                              No journal entries yet. Create your first entry by using the Soul Sky interface.
                            </div>
                          ) : (
                            journalEntries.map((entry, index) => (
                              <div key={index} style={{
                                marginBottom: '20px',
                                padding: '15px',
                                border: '1px solid rgba(255,255,0,0.3)',
                                borderRadius: '8px',
                                background: 'rgba(255,255,0,0.05)'
                              }}>
                                <div style={{ 
                                  color: '#FFD700', 
                                  fontSize: '10px', 
                                  fontWeight: 'bold',
                                  marginBottom: '10px',
                                  textShadow: '0 0 4px rgba(255,215,0,0.6)'
                                }}>
                                  {entry.date}
                                </div>
                                
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontWeight: 'bold' }}>INTENTION: </span>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontStyle: 'italic' }}>{entry.intention}</span>
                                </div>
                                
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontWeight: 'bold' }}>PROMPT: </span>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontStyle: 'italic' }}>{entry.reflection}</span>
                                </div>
                                
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontWeight: 'bold' }}>VISION: </span>
                                  <span style={{ color: '#FFFF00', fontSize: '10px', fontStyle: 'italic' }}>{entry.vision}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Normal Soul Sky View */
                      <div>
                        {/* Section header */}
                        <div className="lyrics-header" style={{ color: '#FFFF00', textShadow: '0 0 8px rgba(255,255,0,0.6)', fontSize: '12px' }}>
                          SOUL STAR
                        </div>
                    <div style={{ marginBottom: '15px' }}>
                      <div className="lyrics-content-enhanced" style={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.4, 
                        fontSize: 12, 
                        color: '#FFFF00', 
                        textShadow: '0 0 2px rgba(255,255,0,0.8), 0 0 8px rgba(255,255,0,0.6)',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontWeight: 'bold', fontStyle: 'normal' }}>INTENTION:</span> <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>"The universe is not only stranger than we imagine, it is stranger than we can imagine." - J.B.S. Haldane</span>
                      </div>
                      <div className="lyrics-content-enhanced" style={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.2, 
                        fontSize: 12, 
                        color: '#FFFF00', 
                        textShadow: '0 0 2px rgba(255,255,0,0.8), 0 0 8px rgba(255,255,0,0.6)'
                      }}>
                        <span style={{ fontWeight: 'bold', fontStyle: 'normal' }}>REFLECTION:</span> <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>What constellation would you create if you could arrange the stars in the sky, and what story would it tell?</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '-4px', marginBottom: '0' }}>
                      <textarea
                          value={questionResponse}
                          onChange={(e) => setQuestionResponse(e.target.value)}
                          placeholder="Share your cosmic vision..."
                          style={{
                            width: '100%',
                            minHeight: '1.3rem',
                            padding: '6px',
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
                        onClick={async () => {
                          // Prevent double clicks and check valid state
                          if (isCasting || !questionResponse.trim() || journalCompletedToday) return;

                          // Phase 1: Start the orb animation immediately
                          setIsCasting(true);

                          // Wait for orb animation to complete (1200ms total)
                          // Phase 1 (0-300ms): glow + scale down
                          // Phase 2 (300-1200ms): shoot upward + fade out
                          await new Promise(resolve => setTimeout(resolve, 1200));

                          // Phase 2: After animation, run the existing cast/submit logic
                          // Create complete journal entry (always works)
                          const journalEntry = {
                            date: new Date().toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }),
                            intention: "Find peace in the present moment",
                            reflection: "What constellation would you create if you could arrange the stars in the sky, and what story would it tell?",
                            vision: questionResponse.trim()
                          };

                          // Add to journal entries
                          setJournalEntries(prev => [journalEntry, ...prev]);

                          // Mark journal as completed
                          setJournalCompletedToday(true);

                          // Try to award HeartCoins if user is logged in
                          try {
                            const { data: { user } } = await supabaseClient.auth.getUser();
                            if (user) {
                              await logHeartcoinTransaction(supabaseClient, {
                                user_id: user.id,
                                amount: 1,
                                reason: 'DAILY_REFLECTION',
                                description: 'Completed journal reflection',
                                transaction_type: 'bonus',
                                metadata: {
                                  response: questionResponse.trim(),
                                  date: new Date().toISOString().split('T')[0]
                                }
                              });
                              try { await refreshProfile(); } catch {}

                              // Notify parent component of journal completion
                              onJournalCompleted?.();

                              // Refresh heart coins display
                              if (typeof fetchHeartCoins === 'function') {
                                fetchHeartCoins();
                              }
                            }
                          } catch (error) {
                            console.error('Failed to award HeartCoins for journal completion:', error);
                          }

                          try {
                            const audio = new Audio('/audio/star.mp3');
                            audio.volume = 0.7;
                            audio.play().catch(() => {});
                          } catch {}

                          setShowBeamEffect(true);

                          // Re-enable UI and clear after existing animation
                          setTimeout(() => {
                            setShowBeamEffect(false);
                            setQuestionResponse('');
                            setIsCasting(false);
                          }, 4000);
                        }}
                        disabled={!questionResponse.trim() || journalCompletedToday || isCasting}
                        style={{
                          padding: '12px 40px',
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid rgba(255,215,0,0.6)',
                          borderRadius: '8px',
                          color: journalCompletedToday ? '#00FF00' : (isCasting ? '#FFE066' : (questionResponse.trim() ? '#FFD700' : 'rgba(255,255,255,0.5)')),
                          cursor: (questionResponse.trim() && !journalCompletedToday && !isCasting) ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease',
                          fontSize: '16px',
                          fontWeight: '600',
                          textShadow: journalCompletedToday ? '0 0 10px #00FF00, 0 0 20px rgba(0,255,0,0.6)' : (isCasting ? '0 0 12px rgba(255,224,102,1), 0 0 24px rgba(255,215,0,0.8)' : (questionResponse.trim() ? '0 0 8px rgba(255,215,0,1), 0 0 16px rgba(255,223,0,0.8), 0 0 24px rgba(255,215,0,0.6)' : 'none')),
                          boxShadow: journalCompletedToday ? '0 0 20px rgba(0,255,0,0.6), 0 0 40px rgba(0,255,0,0.4)' : (questionResponse.trim() ? '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,223,0,0.4), inset 0 1px rgba(255,255,255,0.2)' : 'none'),
                          marginBottom: 0
                        }}
                      >
{journalCompletedToday ? "YOUR SOUL STAR SHINES ABOVE" : (isCasting ? 'Casting…' : 'Cast into the Stars')}
                      </button>

                      {/* StarCastOrb: Glowing orb animation when casting */}
                      {isCasting && (
                        <motion.div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            // Heartverse colors: pink/yellow/blue blend
                            background: 'radial-gradient(circle, rgba(255,230,150,1) 0%, rgba(255,182,193,0.9) 40%, rgba(135,206,250,0.7) 70%, transparent 100%)',
                            boxShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,182,193,0.6), 0 0 60px rgba(135,206,250,0.4)',
                            pointerEvents: 'none',
                            zIndex: 10
                          }}
                          initial={{
                            x: '-50%',
                            y: '-50%',
                            scale: 1,
                            opacity: 1
                          }}
                          animate={{
                            // Phase 1 (0-300ms): glow intensifies, scale down slightly (collapse)
                            // Phase 2 (300-1200ms): shoot upward, fade out
                            scale: [1, 0.7, 0.7, 0.3],
                            y: ['-50%', '-50%', '-400%', '-800%'],
                            opacity: [1, 1, 0.9, 0],
                            boxShadow: [
                              '0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,182,193,0.6), 0 0 60px rgba(135,206,250,0.4)',
                              '0 0 40px rgba(255,215,0,1), 0 0 60px rgba(255,182,193,0.8), 0 0 80px rgba(135,206,250,0.6)',
                              '0 0 30px rgba(255,215,0,0.8), 0 0 50px rgba(255,182,193,0.5), 0 0 70px rgba(135,206,250,0.3)',
                              '0 0 10px rgba(255,215,0,0.3), 0 0 20px rgba(255,182,193,0.2), 0 0 30px rgba(135,206,250,0.1)'
                            ]
                          }}
                          transition={{
                            duration: 1.2,
                            times: [0, 0.25, 0.3, 1], // Phase 1: 0-300ms, Phase 2: 300-1200ms
                            ease: ['easeIn', 'easeIn', 'easeOut']
                          }}
                        />
                      )}

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

                    </div>
                  </div>
                    )}
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
                    {/* Tab Navigation */}
                    <div style={{
                      display: 'flex',
                      borderBottom: '1px solid rgba(242,239,29,0.3)',
                      marginBottom: '12px'
                    }}>
                      <button
                        onClick={() => {
                          try { sfx.play('click.mp3', 0.4); } catch {}
                          setBrandActiveTab('believe');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: brandActiveTab === 'believe' ? 'rgba(242,239,29,0.2)' : 'transparent',
                          border: 'none',
                          color: brandActiveTab === 'believe' ? '#F2EF1D' : 'rgba(242,239,29,0.7)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          borderBottom: brandActiveTab === 'believe' ? '2px solid #F2EF1D' : '2px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          try { sfx.play('hover', 0.25); } catch {}
                          if (brandActiveTab !== 'believe') {
                            e.target.style.color = 'rgba(242,239,29,0.9)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (brandActiveTab !== 'believe') {
                            e.target.style.color = 'rgba(242,239,29,0.7)';
                          }
                        }}
                      >
                        WE BELIEVE
                      </button>
                      <button
                        onClick={() => {
                          try { sfx.play('click.mp3', 0.4); } catch {}
                          setBrandActiveTab('chxndler');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: brandActiveTab === 'chxndler' ? 'rgba(242,239,29,0.2)' : 'transparent',
                          border: 'none',
                          color: brandActiveTab === 'chxndler' ? '#F2EF1D' : 'rgba(242,239,29,0.7)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          borderBottom: brandActiveTab === 'chxndler' ? '2px solid #F2EF1D' : '2px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          try { sfx.play('hover', 0.25); } catch {}
                          if (brandActiveTab !== 'chxndler') {
                            e.target.style.color = 'rgba(242,239,29,0.9)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (brandActiveTab !== 'chxndler') {
                            e.target.style.color = 'rgba(242,239,29,0.7)';
                          }
                        }}
                      >
                        CHXNDLER
                      </button>
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
                      {brandActiveTab === 'chxndler' ? (
                        brandLoading ? (
                          <div style={{ fontSize: 16, opacity: .99, color: '#F2EF1D', textShadow: '0 0 4px rgba(242,239,29,0.8), 0 0 8px rgba(242,239,29,0.4)' }}>Loading…</div>
                        ) : brandError ? (
                          <div style={{ fontSize: 16, color: '#ff7b7b' }}>{brandError}</div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 12, color: '#F2EF1D', textShadow: '0 0 3px rgba(242,239,29,0.85), 0 0 6px rgba(242,239,29,0.35)', textTransform: 'none' }}>{brandContent || ''}</div>
                        )
                      ) : (
                        <div style={{ 
                          padding: '12px',
                          background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(25,227,255,0.08))',
                          border: '1px solid rgba(33,150,243,0.4)',
                          borderRadius: '12px',
                          boxShadow: '0 0 25px rgba(33,150,243,0.25), 0 8px 32px rgba(0,0,0,0.3)'
                        }}>
                          <div style={{ 
                            fontSize: 18, 
                            fontWeight: 800, 
                            color: '#FFFFFF', 
                            marginBottom: 16,
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
                                marginBottom: 8,
                                textShadow: '0 0 8px rgba(25,227,255,0.4)'
                              }}>
                                We Believe
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc', color: '#F2EF1D' }}>
                                <li style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
                                  We believe being your <span style={{ color: '#0099FF', textShadow: '0 0 8px #0099FF', fontWeight: 600 }}>truest self</span> is the beginning of freedom.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
                                  We believe <span style={{ color: '#FFD700', textShadow: '0 0 8px #FFD700', fontWeight: 600 }}>passion</span> is sacred and should be pursued loudly.
                                </li>
                                <li style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>
                                  We believe <span style={{ color: '#FF1493', textShadow: '0 0 8px #FF1493', fontWeight: 600 }}>love</span> is the force that connects every soul.
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
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

        {/* Song selector and Media Player positioned outside content opacity container to avoid beamOnly blocking */}
        <div className="absolute" style={{ 
          left: inConsole ? 4 : 4,
          bottom: 100, // Position above the player controls within the blue display
          // Reserve dynamic space to the right so the dropdown never overlaps the cover
          right: oneLinerRight + 2, // Reduced padding to screen edge
          maxWidth: 'none',
          zIndex: 99999,  // Highest z-index to ensure it's above everything
          pointerEvents: 'auto', // Explicitly enable pointer events
          position: 'absolute', // Explicit positioning to avoid any layout conflicts
          overflow: 'visible' // Ensure waveform can overflow below
        }}>
            {/* Song dropdown only (outer container removed) */}
            <SongDropdown
              items={resolvedSongs}
              initialActiveId={active || resolvedSongs[0]?.id}
              currentId={currentId}
              onChange={(id) => {
                // Block time-locked tracks
                const item = resolvedSongs.find(s => s.id === id);
                if (item?.locked) return;

                // IMMEDIATELY close blue display when song is selected from dropdown
                onCloseBlueDisplay?.();

                setActive(id);

                // Load the selected track into the audio provider for play/pause button
                try {
                  audioManager.selectTrack(id);
                } catch (error) {
                  if (DEBUG_MEDIA) dwarn('HUDPanel: failed to load track into audio provider', error);
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
        // Don't modify blue display state when it's already active
        const blueDisplayActive = beamColor === 'blue' && (beamEnabled || showHUD);
        if (!blueDisplayActive) {
          try { onOpenBlueDisplay?.(); } catch {}
        }
        // If blue display is already active, leave it as-is
      }} />
      
      {/* Venmo Popup */}
      {showVenmoPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}
        onClick={() => setShowVenmoPopup(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 200, 255, 0.1))',
            border: '2px solid #00FFFF',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.1)',
            position: 'relative',
            animation: 'venmoPopupGlow 2s ease-in-out infinite alternate'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                try { sfx.play('close.mp3', 0.3); } catch {}
                setShowVenmoPopup(false);
              }}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid #00FFFF',
                borderRadius: '50%',
                color: '#00FFFF',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 300ms ease',
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)'
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.3); } catch {}
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)';
              }}
            >
              ×
            </button>

            {/* Title */}
            <h2 style={{
              color: '#F2EF1D',
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textShadow: '0 0 20px #F2EF1D, 0 0 30px #F2EF1D',
              letterSpacing: '0.1em'
            }}>
              SUPPORT THE SIGNAL
            </h2>
            
            {/* Description */}
            <p style={{
              color: '#ffffff',
              fontSize: '16px',
              marginBottom: '25px',
              lineHeight: '1.5'
            }}>
              Send $3 via Venmo to support the HEARTVERSE
            </p>
            
            {/* Venmo Username */}
            <p style={{
              color: '#F2EF1D',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '30px',
              textShadow: '0 0 15px #F2EF1D',
              letterSpacing: '0.05em'
            }}>
              @chxndlerthealien
            </p>
            
            {/* VENMO Button */}
            <button
              onClick={() => {
                try { sfx.play('click.mp3', 0.5); } catch {}
                const venmoUrl = `venmo://paycharge?txn=pay&recipients=chxndlerthealien&amount=3&note=${encodeURIComponent('Supporting the HEARTVERSE signal')}`;
                const webVenmoUrl = `https://venmo.com/u/chxndlerthealien?txn=pay&amount=3&note=${encodeURIComponent('Supporting the HEARTVERSE signal')}`;
                
                // Try to open the Venmo app first, then fallback to web
                window.open(venmoUrl, '_blank');
                setTimeout(() => {
                  window.open(webVenmoUrl, '_blank');
                }, 1500);
                
                setShowVenmoPopup(false);
              }}
              style={{
                padding: '16px 32px',
                background: 'transparent',
                border: '3px solid #F2EF1D',
                borderRadius: '12px',
                color: '#F2EF1D',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 300ms ease',
                boxShadow: '0 0 30px rgba(242, 239, 29, 0.6)',
                width: '100%',
                textShadow: '0 0 15px #F2EF1D',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.3); } catch {}
                e.target.style.transform = 'scale(1.05)';
                e.target.style.background = 'rgba(242, 239, 29, 0.1)';
                e.target.style.boxShadow = '0 0 50px rgba(242, 239, 29, 0.8), inset 0 0 20px rgba(242, 239, 29, 0.2)';
                e.target.style.textShadow = '0 0 25px #F2EF1D, 0 0 35px #F2EF1D';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.background = 'transparent';
                e.target.style.boxShadow = '0 0 30px rgba(242, 239, 29, 0.6)';
                e.target.style.textShadow = '0 0 15px #F2EF1D';
              }}
            >
              Send via Venmo
            </button>
          </div>
          
          {/* Add CSS keyframes for glow animation */}
          <style jsx>{`
            @keyframes venmoPopupGlow {
              0% {
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.1);
              }
              100% {
                box-shadow: 0 0 60px rgba(0, 255, 255, 0.8), inset 0 0 30px rgba(0, 255, 255, 0.2);
              }
            }
          `}</style>
        </div>
      )}

      {/* Soul Star Journal Modal */}
      <SoulStarJournal
        isOpen={showSoulStarJournal}
        onClose={() => setShowSoulStarJournal(false)}
        prompt={dailySoulPrompt}
        openWelcomeHome={() => {
          if (process.env.NODE_ENV !== "production") console.log('🎯 HUDPanel openWelcomeHome called, setting showWelcomeHomeModal to true');
          setShowWelcomeHomeModal(true);
        }}
      />

      {/* Planet Reward Error Toast */}
      {planetRewardError && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9998] px-6 py-3 rounded-xl"
          style={{
            background: 'rgba(220, 38, 38, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 100, 100, 0.4)',
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
            animation: 'toastFadeIn 0.3s ease-out',
          }}
        >
          <p className="text-white text-sm font-medium">{planetRewardError}</p>
          <style jsx>{`
            @keyframes toastFadeIn {
              from { opacity: 0; transform: translateX(-50%) translateY(20px); }
              to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </motion.section>
  );
});

export default HUDPanel;
