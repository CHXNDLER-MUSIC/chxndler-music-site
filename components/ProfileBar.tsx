"use client";

import { useState, useEffect, useRef } from 'react';
import { useUIState } from '@/lib/use-ui-state';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import { ActivePanel } from '@/types/ActivePanel';
import BinderModal from '@/components/BinderModal';
import BadgesModal from '@/components/BadgesModal';
import HeartCoinButton from '@/components/HeartCoinButton';
import HoloStarsButton from '@/components/HoloStarsButton';
import ElementalButton from '@/components/ElementalButton';
import { sfx } from '@/lib/sfx';
import { track as trackAnalytics } from '@/lib/analytics';
import { createPortal } from 'react-dom';
import QuestList from '@/components/QuestList';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';
import { useUIStore } from '@/store/useUIStore';
import JoinUsPopup from '@/components/JoinUsPopup';
import WelcomeHomeModal from '@/components/WelcomeHomeModal';
import GlowingHamburgerMenu from '@/components/GlowingHamburgerMenu';
import JourneyModal from '@/components/JourneyModal';
import SoulStarJournal from '@/components/SoulStarJournal';
import ProfilePopover from '@/components/ProfilePopover';
import AuthButton from '@/components/AuthButton';

interface Profile {
  id: string;
  name: string | null;
  element: string | null;
  hearts?: number | null;
  phone?: string | null;
  email?: string | null;
  profile_complete?: boolean | null;
}

const ELEMENTS = [
  { name: 'heart', label: 'Heart', color: '#FF69B4', innerGlow: '#FF1493' },
  { name: 'water', label: 'Water', color: '#00BFFF', innerGlow: '#0080FF' },
  { name: 'lightning', label: 'Lightning', color: '#FFD700', innerGlow: '#FFFF00' },
  { name: 'darkness', label: 'Darkness', color: '#9400D3', innerGlow: '#FFFFFF' }
];


interface ProfileBarProps {
  onCodeClick?: () => void;
  onDigitalBinderClick?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onOpenJournal?: () => void;
  onJournalCompleted?: () => void;
  onBeamColorChange?: (color: string) => void;
  savedAlienName?: string; // Name from HUD signup flow
  savedAlienElement?: string; // Element from HUD signup flow
  profileRefreshTrigger?: number; // Increment this to trigger profile refresh
  onOpenHeartCoin?: () => void;
  // Wrapper visibility conditions to avoid hook count mismatch
  _wrapperHydrated?: boolean;
  _wrapperHasEnteredHeartverse?: boolean;
}

export default function ProfileBar({
  onCodeClick,
  onDigitalBinderClick, 
  onCloseBlueDisplay,
  onOpenBlueDisplay,
  onOpenJournal,
  onJournalCompleted,
  onBeamColorChange,
  savedAlienName,
  savedAlienElement,
  profileRefreshTrigger = 0,
  onOpenHeartCoin,
  _wrapperHydrated = true,
  _wrapperHasEnteredHeartverse = true
}: ProfileBarProps) {
  // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS
  // Use global UI state for profile bar visibility
  const { hasEnteredHeartverse } = useUIState();
  // Use ProfileContext for profile data
  const { profile: contextProfile, loading, updateProfile, refreshProfile, isJournalOpen, setIsJournalOpen } = useProfile();
  // Use UI store for name prompt
  const { openNamePrompt, openElementSelection } = useUIStore();
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  const [journalCompletedToday, setJournalCompletedToday] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showLoginTooltip, setShowLoginTooltip] = useState(false);
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  
  // Single active panel state
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  
  // Preselected card state for opening binder with specific card
  const [preselectedCard, setPreselectedCard] = useState<string | null>(null);
  
  // Code popout state
  const [isCodePopoutOpen, setIsCodePopoutOpen] = useState(false);
  
  // Chxndler popout state
  const [isChxndlerPopoutOpen, setIsChxndlerPopoutOpen] = useState(false);
  const [chxndlerActiveTab, setChxndlerActiveTab] = useState<"CHXNDLER" | "WE BELIEVE" | "ELEMENTS">("CHXNDLER");
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [heartElementFlipped, setHeartElementFlipped] = useState(false);

  // Heart popover states
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const [heartPopoverPos, setHeartPopoverPos] = useState<{left: number, top: number, width?: number, height?: number} | null>(null);

  // Respond to profile refresh trigger
  useEffect(() => {
    if (profileRefreshTrigger > 0) {
      console.log('Profile refresh trigger activated, refreshing profile...');
      refreshProfile();
    }
  }, [profileRefreshTrigger, refreshProfile]);

  // Listen for direct profile refresh events
  useEffect(() => {
    const handleDirectProfileRefresh = () => {
      if (process.env.NODE_ENV === "development") {
        console.log('ProfileBar: Direct profile refresh event received');
      }
      refreshProfile();
    };

    window.addEventListener('auth:profile-updated', handleDirectProfileRefresh);
    window.addEventListener('profile:force-refresh', handleDirectProfileRefresh);

    return () => {
      window.removeEventListener('auth:profile-updated', handleDirectProfileRefresh);
      window.removeEventListener('profile:force-refresh', handleDirectProfileRefresh);
    };
  }, [refreshProfile]);

  // Debug profile changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log('ProfileBar: contextProfile changed:', {
        name: contextProfile?.name,
        element: contextProfile?.element,
        profile_complete: contextProfile?.profile_complete,
        loading: loading,
        currentUser: currentUser?.id
      });
    }
  }, [contextProfile, loading, currentUser]);


  // Check if journal was completed today
  const checkJournalCompletion = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return false;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check for journal entry with soul_star content for today
      const { data: journalEntries, error } = await supabaseBrowser
        .from('soul_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      if (error) {
        console.error('Error checking journal completion:', error);
        return false;
      }

      // Journal is completed if there's an entry with soul_star content
      return journalEntries && journalEntries.length > 0 && journalEntries[0].soul_star && journalEntries[0].soul_star.trim().length > 0;
    } catch (error) {
      console.error('Error checking journal completion:', error);
      return false;
    }
  };

  // Load completion status on mount and when profile changes
  useEffect(() => {
    if (contextProfile?.id) {
      // Start fresh each session - only mark as completed when user submits in this session
      setJournalCompletedToday(false);
    }
  }, [contextProfile?.id, profileRefreshTrigger]);
  
  // Check journal completion status when journal opens/closes
  useEffect(() => {
    if (contextProfile?.id && !isJournalOpen) {
      // When journal closes, only keep completion state if it was marked during submission
      // Don't re-check database since we want session-based completion tracking
    }
  }, [isJournalOpen, contextProfile?.id]);

  // Track authentication state
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setCurrentUser(user);
    };

    getUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log('ProfileBar: Auth state changed:', { event, userId: session?.user?.id });
      setCurrentUser(session?.user ?? null);
      
      // If user just signed in, force a profile refresh to ensure UI updates
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('ProfileBar: User signed in, forcing profile refresh...');
        setTimeout(() => {
          refreshProfile();
        }, 500); // Small delay to ensure database is ready
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  // Handler for when journal gets completed
  const handleJournalCompleted = async () => {
    // Refresh profile data to get updated HeartCoin balance
    await refreshProfile();
    // Mark as completed since we know the journal was just submitted
    setJournalCompletedToday(true);
    // Notify parent component
    onJournalCompleted?.();
  };

  
  // Note: hasEnteredHeartverse check is handled by ProfileBarWrapper

  // Panel toggle function
  const togglePanel = (panelKey: ActivePanel) => {
    if (activePanel === panelKey) {
      // Same panel clicked, close it
      setActivePanel(null);
    } else {
      // Different panel clicked, open it
      setActivePanel(panelKey);
      
      // Track panel opening with events_v2
      try {
        import('@/lib/analytics').then(({ trackEvent }) => {
          trackEvent(`${panelKey}_click`, { 
            source: 'profile_bar',
            userId: profile?.id || null
          });
        }).catch(() => {});
      } catch {}
    }
  };

  // Element mapping for icons
  const getElementIcon = (element: string | null) => {
    const iconMap: Record<string, string> = {
      'heart': '/elements/heart.webp',
      'water': '/elements/water.webp', 
      'lightning': '/elements/lightning.webp',
      'darkness': '/elements/darkness.webp'
    };
    return iconMap[element || ''] || '/elements/elementals.webp';
  };

  async function updateElement(element: string) {
    try {
      // Play flip sound when selecting an element
      sfx.play('flip', 0.8);
      
      const res = await fetch('/api/profile/element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_element: element }),
        credentials: 'include'
      });
      
      if (res.ok) {
        // Use ProfileContext to update the profile
        await updateProfile({ element });
        // Also refresh profile to make sure UI is in sync
        await refreshProfile();
        setElementDropdownOpen(false);
      }
    } catch (error) {
      console.error('Failed to update element:', error);
    }
  }

  const openHeartPopover = () => {
    try { sfx.play('click', 0.4); } catch {}
    try {
      const r = heartBtnRef.current?.getBoundingClientRect?.();
      if (r && typeof window !== 'undefined') {
        let top = r.bottom + 8;
        top = Math.max(8, top);
        let height = Math.max(240, Math.min(560, window.innerHeight * 0.46));
        // Position from center of the button
        let left = r.left + r.width/2;
        // Account for popover width (around 300px) to prevent overflow
        left = Math.max(150, Math.min(left, window.innerWidth - 150));
        setHeartPopoverPos({ left, top, height });
      }
    } catch {}
    setShowHeartPopover(true);
  };

  // Close heart popover on outside click / Escape  
  useEffect(() => {
    if (!showHeartPopover) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const withinBtn = heartBtnRef.current && t && heartBtnRef.current.contains(t);
      const dialog = document.querySelector('[aria-label="HEART PROFILE"]');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinBtn && !withinDialog) { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowHeartPopover(false); 
      }
    };
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowHeartPopover(false); 
      } 
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHeartPopover]);

  // Close quest modal on outside click / Escape
  useEffect(() => {
    if (!showQuests) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const dialog = document.querySelector('.quest-hologram-container');
      const withinDialog = dialog && t && dialog.contains(t);
      if (!withinDialog) { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowQuests(false); 
      }
    };
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        try { sfx.play('close', 0.4); } catch {}; 
        setShowQuests(false); 
      } 
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showQuests]);

  // Close login tooltip on outside click / Escape
  useEffect(() => {
    if (!showLoginTooltip) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const tooltip = document.querySelector('[data-tooltip="login-tooltip"]');
      const nameButton = document.querySelector('[data-name-button]');
      const withinTooltip = tooltip && t && tooltip.contains(t);
      const withinNameButton = nameButton && t && nameButton.contains(t);
      if (!withinTooltip && !withinNameButton) {
        setShowLoginTooltip(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLoginTooltip(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showLoginTooltip]);

  // Listen for openBinderCard events to open binder with specific card
  useEffect(() => {
    const handleOpenBinderCard = (event: CustomEvent) => {
      try {
        const { cardTitle } = event.detail;
        if (cardTitle) {
          // Convert song title to the format used in BinderModal songCollection
          const normalizedTitle = cardTitle.toUpperCase();
          setPreselectedCard(normalizedTitle);
          setActivePanel('binder');
        }
      } catch (err) {
        console.warn('Error handling openBinderCard event:', err);
      }
    };

    window.addEventListener('openBinderCard', handleOpenBinderCard as EventListener);
    return () => window.removeEventListener('openBinderCard', handleOpenBinderCard as EventListener);
  }, []);

  const currentElement = contextProfile?.element || savedAlienElement || null;
  // Show balance as soon as profile is available; don't wait on currentUser state
  const heartCoins = contextProfile?.heartcoin_balance ?? 0;
  
  // Debug heart coins calculation
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log('ProfileBar: HeartCoins calculation:', {
        hasCurrentUser: !!currentUser,
        hasContextProfile: !!contextProfile,
        heartcoin_balance: contextProfile?.heartcoin_balance,
        heartcoin_total: contextProfile?.heartcoin_total,
        calculatedHeartCoins: heartCoins,
        profileId: contextProfile?.id,
        profileName: contextProfile?.name
      });
    }
  }, [currentUser, contextProfile, heartCoins]);

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/40 backdrop-blur-lg border-b border-white/20">
        <div className="flex items-center justify-between h-full px-6">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
            <div className="w-24 h-4 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Add a manual refresh function for debugging
  const forceRefreshProfile = async () => {
    console.log('ProfileBar: Manual profile refresh triggered');
    await refreshProfile();
    
    // Also fetch directly from API for comparison
    try {
      const response = await fetch('/api/debug-heartcoins');
      const debugData = await response.json();
      console.log('ProfileBar: Debug API data:', debugData);
    } catch (error) {
      console.error('ProfileBar: Error fetching debug data:', error);
    }
  };
  
  const currentElementData = ELEMENTS.find(e => e.name === currentElement) || ELEMENTS[0];

  // Check wrapper visibility conditions AFTER all hooks are called
  if (!_wrapperHydrated || !_wrapperHasEnteredHeartverse) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[300] h-16 bg-black/40 backdrop-blur-lg border-b border-white/20 transition-opacity duration-500 ease-in-out"
    >
      <div className="relative h-full">
        {/* Hamburger Menu - Far Top Left */}
        <div className="absolute top-2 left-1 z-10">
            <GlowingHamburgerMenu
            onItemClick={(label) => {
              console.log(`Menu item clicked: ${label}`);
              
              switch (label) {
                case "THE CODE":
                  setIsCodePopoutOpen(true);
                  onCodeClick?.();
                  break;
                case "JOURNEY":
                case "MY JOURNEY":
                  try { onCloseBlueDisplay?.(); } catch {}
                  setIsJourneyModalOpen(true);
                  break;
                case "JOURNAL":
                  try { onCloseBlueDisplay?.(); } catch {}
                  try { onBeamColorChange?.('yellow'); } catch {}
                  setIsJournalOpen(true);
                  break;
                case "BINDER":
                  try { onCloseBlueDisplay?.(); } catch {}
                  togglePanel('binder');
                  onDigitalBinderClick?.();
                  break;
                case "BADGES":
                  try { onCloseBlueDisplay?.(); } catch {}
                  togglePanel('badges');
                  break;
                case "ABOUT":
                  try { onCloseBlueDisplay?.(); } catch {}
                  setIsChxndlerPopoutOpen(true);
                  break;
                case "STORE":
                  try { onCloseBlueDisplay?.(); } catch {}
                  // Open HeartCoinButton modal directly on USE tab with CARDS sub-tab
                  setActivePanel('heartcoins');
                  // Store the initial tab preference for HeartCoinButton
                  if (typeof window !== 'undefined') {
                    (window as any).heartCoinInitialTab = 'USE';
                    (window as any).heartCoinInitialUseTab = 'CARDS';
                  }
                  break;
              }
            }}
          />
        </div>

        {/* Main Flex Layout */}
        <div className="flex items-center justify-between h-full pl-16 sm:pl-20 pr-2 min-w-0">
          {/* Left Side */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Auth Button - Clickable */}
            <div className="relative ml-3">
              <AuthButton />
            </div>

          </div>


          {/* Right Side */}
          <div className="flex items-center flex-shrink-0 mr-0 space-x-2">



            {/* Heart Coin Button with Count */}
            <div className="flex items-center space-x-0.5">
              <HeartCoinButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
                onOpenJournal={onOpenJournal}
                heartCoins={heartCoins}
                isActive={activePanel === 'heartcoins'}
                onClick={() => togglePanel('heartcoins')}
                journalCompleted={journalCompletedToday}
                onJournalCompleted={handleJournalCompleted}
                onHeartCoinsChange={(newAmount) => {
                  // Update through ProfileContext
                  updateProfile({ heartcoin_balance: newAmount });
                }}
                onClose={() => setActivePanel(null)}
              />
              
              {/* Heart Coin Count */}
              <span 
                className="font-bold text-lg"
                style={{ 
                  color: '#FFFFFF',
                  textShadow: `
                    0 0 5px #FFFFFF,
                    0 0 10px #FFFFFF,
                    0 0 15px #FFFFFF,
                    0 0 20px #FFFFFF,
                    0 0 25px #FFFFFF,
                    0 0 30px #FFFFFF
                  `,
                  filter: 'brightness(1.5)',
                  letterSpacing: '0.05em'
                }}
              >
                {heartCoins}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Panel Modals - Conditional rendering based on activePanel */}

      {activePanel === 'binder' && (
        <BinderModal 
          open={true} 
          onClose={() => {
            setActivePanel(null);
            setPreselectedCard(null); // Reset preselected card when closing
            try { onOpenBlueDisplay?.(); } catch {}
          }} 
          preselectedCard={preselectedCard}
          onOpenHeartCoin={onOpenHeartCoin}
        />
      )}

      {activePanel === 'badges' && (
        <div 
          className="fixed inset-x-0 z-[250] animate-in fade-in duration-300" 
          style={{ top: '64px', bottom: '0' }} // Position below the profile bar
        >
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => {
              setActivePanel(null);
              try { onOpenBlueDisplay?.(); } catch {}
            }}
          />
          <div className="relative h-full flex items-start justify-center pt-8">
            <div 
              className="w-full max-w-4xl mx-4 rounded-2xl p-6 backdrop-blur-md border-2 border-[#FC54AF]/60 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)] animate-in slide-in-from-top-4 zoom-in-95 fade-in duration-500 animate-pulse"
              style={{ 
                maxHeight: 'calc(100vh - 120px)', 
                overflow: 'auto',
                transform: 'scale(1.02)',
                transition: 'transform 0.3s ease-out',
                animationDuration: '1s',
                animationIterationCount: '2'
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <BadgesModal 
                open={true} 
                embedded={true}
                onClose={() => {
                  setActivePanel(null);
                  try { onOpenBlueDisplay?.(); } catch {}
                }} 
              />
            </div>
          </div>
        </div>
      )}


      {/* Code Popout - HEARTVERSE CODE */}
      {isCodePopoutOpen && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '120px'
          }}
        >
          <div
            className="code-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '35vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              position: 'relative'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(33,150,243,0.6) 0%, rgba(33,150,243,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(33,150,243,0.4) 0%, rgba(33,150,243,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setIsCodePopoutOpen(false);
              // Show blue display when closing code popup
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
              background: 'rgba(0,255,255,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div 
            className="text-center mb-3"
            style={{ 
              color: '#FFFFFF !important', 
              textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            HEARTVERSE CODE
          </div>
          
          {/* Thin blue neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />
          <div 
            className="text-center mb-4"
            style={{ 
              fontSize: 18, 
              color: '#FFFFFF !important', 
              textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)',
              fontWeight: 'bold'
            }}
          >
            We Believe
          </div>
          
          <div 
            className="text-left space-y-3"
            style={{ 
              fontSize: 14, 
              color: '#FFFFFF !important', 
              textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
            }}
          >
            <div className="flex items-start">
              <span className="mr-3" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
              <span>We believe being your <span style={{ color: '#0099FF !important', textShadow: '0 0 5px #0099FF, 0 0 10px #0099FF, 0 0 15px #0099FF, 0 0 20px #0099FF', fontWeight: 'inherit !important', WebkitTextFillColor: '#0099FF !important', textFillColor: '#0099FF !important', filter: 'drop-shadow(0 0 3px #0099FF)' }}>truest self</span> is the beginning of freedom.</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
              <span>We believe <span style={{ color: '#FFD700 !important', textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700, 0 0 20px #FFD700', fontWeight: 'inherit !important', WebkitTextFillColor: '#FFD700 !important', textFillColor: '#FFD700 !important', filter: 'drop-shadow(0 0 3px #FFD700)' }}>passion</span> is sacred and should be pursued loudly.</span>
            </div>
            <div className="flex items-start">
              <span className="mr-3" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
              <span>We believe <span style={{ color: '#FF1493 !important', textShadow: '0 0 5px #FF1493, 0 0 10px #FF1493, 0 0 15px #FF1493, 0 0 20px #FF1493', fontWeight: 'inherit !important', WebkitTextFillColor: '#FF1493 !important', textFillColor: '#FF1493 !important', filter: 'drop-shadow(0 0 3px #FF1493)' }}>love</span> is the force that connects every soul.</span>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Chxndler Popout */}
      {isChxndlerPopoutOpen && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '250px'
          }}
        >
          <div
            className="chxndler-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '40vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,105,180,0.55)',
              boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              position: 'relative'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,105,180,0.6) 0%, rgba(255,105,180,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,105,180,0.4) 0%, rgba(255,105,180,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setIsChxndlerPopoutOpen(false);
              // Show blue display when closing chxndler popup
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
              textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
              background: 'rgba(255,105,180,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div 
            className="text-center mb-3"
            style={{ 
              color: '#FFFFFF !important', 
              textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.5)', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ABOUT
          </div>
          
          {/* Tabs */}
          <div className="flex justify-center mb-4">
            <div className="flex bg-black/30 rounded-lg p-1">
              <button
                onClick={() => setChxndlerActiveTab("CHXNDLER")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  chxndlerActiveTab === "CHXNDLER"
                    ? "bg-pink-500/20 text-pink-300 border border-pink-400/50"
                    : "text-white/70 hover:text-white"
                }`}
                style={{
                  textShadow: chxndlerActiveTab === "CHXNDLER" ? '0 0 8px rgba(255,105,180,0.8)' : 'none',
                  boxShadow: chxndlerActiveTab === "CHXNDLER" ? '0 0 15px rgba(255,105,180,0.3)' : 'none'
                }}
              >
                CHXNDLER
              </button>
              <button
                onClick={() => setChxndlerActiveTab("WE BELIEVE")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  chxndlerActiveTab === "WE BELIEVE"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                    : "text-white/70 hover:text-white"
                }`}
                style={{
                  textShadow: chxndlerActiveTab === "WE BELIEVE" ? '0 0 8px rgba(0,255,255,0.8)' : 'none',
                  boxShadow: chxndlerActiveTab === "WE BELIEVE" ? '0 0 15px rgba(0,255,255,0.3)' : 'none'
                }}
              >
                WE BELIEVE
              </button>
              <button
                onClick={() => setChxndlerActiveTab("ELEMENTS")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  chxndlerActiveTab === "ELEMENTS"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-400/50"
                    : "text-white/70 hover:text-white"
                }`}
                style={{
                  textShadow: chxndlerActiveTab === "ELEMENTS" ? '0 0 8px rgba(139,92,246,0.8)' : 'none',
                  boxShadow: chxndlerActiveTab === "ELEMENTS" ? '0 0 15px rgba(139,92,246,0.3)' : 'none'
                }}
              >
                ELEMENTS
              </button>
            </div>
          </div>
          
          {/* Thin pink neon line */}
          <div 
            className="w-full h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />
          
          {/* Tab Content */}
          {chxndlerActiveTab === "CHXNDLER" && (
            <div className="text-center px-2">
              {/* Description */}
              <div 
                style={{ 
                  fontSize: 15, 
                  color: '#FFFFFF !important', 
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                  lineHeight: 1.5,
                  marginTop: '20px'
                }}
              >
                CHXNDLER is an alien from the Heartverse, exploring Earth in search of love. They create dreamy electronic pop to understand what it means to be human. Their music becomes a signal carried through the cosmos, guiding wanderers, dreamers, and lovers toward a place to call home.
              </div>
            </div>
          )}
          
          {chxndlerActiveTab === "WE BELIEVE" && (
            <>
              {/* We Believe Content */}
              <div 
                className="text-left space-y-3"
                style={{ 
                  fontSize: 15, 
                  color: '#FFFFFF !important', 
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                }}
              >
                <div className="flex items-start">
                  <span className="mr-2" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
                  <span>We believe being your <span style={{ color: '#0099FF !important', textShadow: '0 0 5px #0099FF, 0 0 10px #0099FF, 0 0 15px #0099FF, 0 0 20px #0099FF', fontWeight: 'inherit !important' }}>truest self</span> is the beginning of freedom.</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
                  <span>We believe <span style={{ color: '#FFD700 !important', textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700, 0 0 20px #FFD700', fontWeight: 'inherit !important' }}>passion</span> is sacred and should be pursued loudly.</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2" style={{ color: '#FF1493 !important', textShadow: '0 0 8px rgba(255,20,147,0.9), 0 0 15px rgba(255,20,147,0.7)' }}>♥</span>
                  <span>We believe <span style={{ color: '#FF1493 !important', textShadow: '0 0 5px #FF1493, 0 0 10px #FF1493, 0 0 15px #FF1493, 0 0 20px #FF1493', fontWeight: 'inherit !important' }}>love</span> is the force that connects every soul.</span>
                </div>
              </div>
            </>
          )}
          
          {chxndlerActiveTab === "ELEMENTS" && (
            <div className="text-center px-2">
              {/* Elements Description */}
              <div 
                style={{ 
                  fontSize: 11, 
                  color: '#FFFFFF !important', 
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)', 
                  lineHeight: 1.4,
                  marginBottom: '16px'
                }}
              >
                The Elements shape the Heartverse. Each one carries its own energy, guiding souls on their journey.
              </div>
              
              {/* Elements Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 px-2">
                {[
                  { name: 'HEART', color: '#FF6B9D', icon: '/elements/heart.webp', subtitle: 'LOVE AND CONNECTION' },
                  { name: 'WATER', color: '#4A90E2', icon: '/elements/water.webp', subtitle: 'flow and adaptability' },
                  { name: 'LIGHTNING', color: '#FFD700', icon: '/elements/lightning.webp', subtitle: 'passion and courage' },
                  { name: 'DARKNESS', color: '#8B5CF6', icon: '/elements/darkness.webp', subtitle: 'mystery and transformation' }
                ].map((element) => (
                  <div
                    key={element.name}
                    className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-200 hover:scale-105 ${element.name === 'HEART' ? 'cursor-pointer' : ''}`}
                    style={{
                      borderColor: `${element.color}60`,
                      background: `${element.color}10`,
                      boxShadow: `0 0 10px ${element.color}30`
                    }}
                    onClick={element.name === 'HEART' ? () => {
                      try { sfx.play('flip', 0.8); } catch {}
                      setHeartElementFlipped(!heartElementFlipped);
                    } : undefined}
                  >
                    <div 
                      className="w-6 h-6 rounded-lg mb-1 overflow-hidden"
                      style={{
                        background: `${element.color}20`
                      }}
                    >
                      <img
                        src={element.icon}
                        alt={element.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div 
                      className="text-xs font-bold"
                      style={{
                        color: element.color,
                        textShadow: `0 0 8px ${element.color}80`,
                        fontSize: '10px'
                      }}
                    >
                      {element.name}
                    </div>
                    {/* Only show subtitle for non-HEART elements or when HEART is flipped */}
                    {(element.name !== 'HEART' || heartElementFlipped) && (
                      <div 
                        className="text-xs text-white/70"
                        style={{ fontSize: '9px' }}
                      >
                        {element.name === 'HEART' && heartElementFlipped ? 'LOVE AND CONNECTION' : element.subtitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      )}




      {/* Hologram base glow - wider and stronger */}
      {showHeartPopover && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '40px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(33,150,243,0.7) 0%, rgba(33,150,243,0.4) 30%, rgba(33,150,243,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>,
        document.body
      )}
      
      {/* Heart Coin Modal - holographic popup */}
      {showHeartPopover && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '40px'
          }}
        >
          <div
            className="heart-coin-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '28vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(33,150,243,0.6) 0%, rgba(33,150,243,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(33,150,243,0.4) 0%, rgba(33,150,243,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setShowHeartPopover(false);
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
              background: 'rgba(0,255,255,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div 
            className="text-center mb-2"
            style={{ 
              color: '#00FFFF', 
              textShadow: '0 0 8px rgba(0,255,255,0.6)', 
              fontSize: '16px',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            MANAGE YOUR HEART COINS ♥
          </div>
          
          {/* Thin blue neon line */}
          <div 
            className="w-full h-px mb-2"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)',
              flexShrink: 0
            }}
          />
          <div 
            className="text-center mb-3"
            style={{ 
              whiteSpace: 'pre-wrap' as const, 
              lineHeight: 1.1, 
              fontSize: 12, 
              color: '#00FFFF', 
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(0,255,255,0.6)',
              flexShrink: 0
            }}
          >
            HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.
          </div>

          {/* Heart Coin Stats */}
          <div className="flex-1 flex items-center justify-between">
            {/* Balance Display */}
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full border-2 border-cyan-400/60 overflow-hidden"
                style={{
                  background: 'rgba(0,255,255,0.1)',
                  boxShadow: '0 0 15px rgba(0,255,255,0.3)',
                }}
              >
                <img
                  src="/elements/heart-coin.webp"
                  alt="Heart Coin"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <div>
                <div 
                  className="text-xs mb-1"
                  style={{ 
                    color: '#FFFFFF', 
                    textShadow: '0 0 4px rgba(255,255,255,0.7)' 
                  }}
                >
                  BALANCE
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ 
                    color: '#FF69B4', 
                    textShadow: '0 0 8px rgba(255,105,180,0.8)' 
                  }}
                >
                  {heartCoins}
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => {
                try { sfx.play('click', 0.8); } catch {}
                // TODO: Open store popup
                console.log("Open store popup");
              }}
              className="px-4 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded text-sm transition-all duration-200"
              style={{
                boxShadow: '0 0 10px rgba(236, 72, 153, 0.3)',
                textShadow: '0 0 4px rgba(236, 72, 153, 0.6)'
              }}
            >
              USE MY HEARTS
            </button>
          </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quest List Modal */}
      {showQuests && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[2147483648] flex items-center justify-center"
          style={{
            paddingTop: '40px'
          }}
        >
          <div
            className="quest-hologram-container"
            style={{
              width: 'min(92vw, 800px)',
              height: '70vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF',
              position: 'relative',
              overflow: 'auto'
            }}
          >
            {/* Quest List Content */}
            <QuestList 
              onBack={() => setShowQuests(false)}
              onOpenStore={() => {
                setShowQuests(false);
                // TODO: Open store popup
                console.log("Open store popup from quest list");
              }}
              onOpenBlueDisplay={onOpenBlueDisplay}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Login Tooltip - Rendered outside profile bar */}
      {(!currentUser || !contextProfile) && showLoginTooltip && typeof window !== 'undefined' && createPortal(
        <div 
          data-tooltip="login-tooltip"
          className="fixed top-20 left-1/2 -translate-x-1/2 rounded-lg bg-black/90 px-4 py-3 text-sm text-white shadow-xl z-[9999] whitespace-nowrap"
          style={{
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 45px rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px)',
            fontWeight: '600'
          }}
        >
          You need to{" "}
          <button
            onClick={() => {
              try { sfx.play('click.mp3', 0.5); } catch {}
              setShowLoginTooltip(false);
              setShowWelcomeHome(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowLoginTooltip(false);
                setShowWelcomeHome(true);
              }
            }}
            className="underline font-semibold text-pink-200 hover:text-pink-50 focus:outline-none focus:ring-1 focus:ring-pink-400 rounded px-1 transition-colors"
          >
            log in
          </button>{" "}
          to create your ALIEN name.
          
          {/* Tooltip arrow pointing up to profile bar */}
          <div className="absolute left-1/2 top-[-8px] -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-transparent border-b-white/80"
               style={{
                 filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))'
               }}></div>
        </div>,
        document.body
      )}

      {/* Sign In Popup for unauthenticated users */}
      <JoinUsPopup 
        isOpen={showSignInPopup} 
        onClose={() => setShowSignInPopup(false)} 
      />

      {/* Soul Star Journal - Triggered by hamburger menu JOURNAL option */}
      <SoulStarJournal 
        isOpen={isJournalOpen} 
        onClose={() => setIsJournalOpen(false)}
        onJournalCompleted={handleJournalCompleted}
      />

      {/* Journey Modal - Triggered by hamburger menu JOURNEY option */}
      <JourneyModal 
        open={isJourneyModalOpen} 
        onClose={() => {
          setIsJourneyModalOpen(false);
          try { onOpenBlueDisplay?.(); } catch {}
        }} 
      />

      {/* Welcome Home Modal */}
      <WelcomeHomeModal 
        open={showWelcomeHome} 
        onClose={() => setShowWelcomeHome(false)} 
      />

    </div>
  );
}
