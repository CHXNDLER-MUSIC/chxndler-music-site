"use client";

import { useState, useEffect, useRef } from 'react';
import { useUIState } from '@/lib/use-ui-state';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementIcon } from '@/lib/elementIcons';
import { ActivePanel } from '@/types/ActivePanel';
import BinderModal from '@/components/BinderModal';
import JourneyButton from '@/components/JourneyButton';
import BadgesButton from '@/components/BadgesButton';
import BinderButton from '@/components/BinderButton';
import HeartCoinButton from '@/components/HeartCoinButton';
import CodeButton from '@/components/CodeButton';
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
  profileRefreshTrigger = 0
}: ProfileBarProps) {
  // Use global UI state for profile bar visibility
  const { hasEnteredHeartverse } = useUIState();
  // Use ProfileContext for profile data
  const { profile: contextProfile, loading, updateProfile, refreshProfile } = useProfile();
  // Use UI store for name prompt
  const { openNamePrompt } = useUIStore();
  const [elementDropdownOpen, setElementDropdownOpen] = useState(false);
  const [journalCompletedToday, setJournalCompletedToday] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  const [nameButtonTooltip, setNameButtonTooltip] = useState('');
  const [showLoginTooltip, setShowLoginTooltip] = useState(false);

  // Check if journal was completed today
  const checkJournalCompletion = async () => {
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) return false;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check for existing HeartCoin transaction for journal completion today
      const { data: transactions, error } = await supabaseBrowser
        .from('heartcoin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('reason', 'Completed journal reflection')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) {
        console.error('Error checking journal completion:', error);
        return false;
      }

      return transactions && transactions.length > 0;
    } catch (error) {
      console.error('Error checking journal completion:', error);
      return false;
    }
  };

  // Load completion status on mount and when profile changes
  useEffect(() => {
    if (contextProfile?.id) {
      checkJournalCompletion().then(setJournalCompletedToday);
    }
  }, [contextProfile?.id, profileRefreshTrigger]);

  // Track authentication state
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setCurrentUser(user);
    };

    getUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handler for when journal gets completed
  const handleJournalCompleted = async () => {
    setJournalCompletedToday(true);
    // Notify parent component
    onJournalCompleted?.();
    // Refresh profile data to get updated HeartCoin balance
    const completed = await checkJournalCompletion();
    setJournalCompletedToday(completed);
  };

  // Handle name button click with authentication checks
  const handleNameButtonClick = () => {
    try { sfx.play('click', 0.4); } catch {}

    if (loading) return;

    // Case 1: Not logged in or no profile yet
    if (!currentUser || !contextProfile) {
      setShowLoginTooltip(true);
      return;
    }

    // Case 2: Logged in and profile exists
    // Open the name modal "What should we call you"
    openNamePrompt();
  };
  
  // IMPORTANT: Do not render anything until the user has entered
  // Guard before any loading UI to prevent initial flash on first load
  if (!hasEnteredHeartverse) {
    return null;
  }
  
  // Single active panel state
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Panel toggle function
  const togglePanel = (panelKey: ActivePanel) => {
    if (activePanel === panelKey) {
      // Same panel clicked, close it
      setActivePanel(null);
    } else {
      // Different panel clicked, open it
      setActivePanel(panelKey);
    }
  };

  // Heart popover states
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const [heartPopoverPos, setHeartPopoverPos] = useState<{left: number, top: number, width?: number, height?: number} | null>(null);

  // Element mapping for icons
  const getElementIcon = (element: string | null) => {
    const iconMap: Record<string, string> = {
      'heart': '/elements/heart.png',
      'water': '/elements/water.png', 
      'lightning': '/elements/lightning.png',
      'darkness': '/elements/darkness.png'
    };
    return iconMap[element || ''] || '/elements/elemental.png';
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

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between h-full px-6">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
            <div className="w-24 h-4 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentElement = contextProfile?.element || savedAlienElement || null;
  const displayName = contextProfile?.name || savedAlienName || 'ALIEN';
  const heartCoins = contextProfile?.heartcoin_balance || 0;
  const currentElementData = ELEMENTS.find(e => e.name === currentElement) || ELEMENTS[0];

  // Get username text color based on selected element
  const getUsernameColor = (element: string) => {
    switch (element) {
      case 'heart': return '#FF69B4'; // Pink
      case 'water': return '#00BFFF'; // Blue
      case 'lightning': return '#FFD700'; // Yellow
      case 'darkness': return '#FFFFFF'; // White
      default: return '#FFFFFF';
    }
  };



  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[200] h-16 bg-black/80 backdrop-blur-md border-b border-white/10 transition-opacity duration-500 ease-in-out"
    >
      <div className="relative h-full">
        {/* Elemental Button - Top Left */}
        <div className="absolute top-2 left-1 z-10">
          <ElementalButton 
            onHoverSound={() => sfx.play('hover', 0.8)}
            onCloseBlueDisplay={onCloseBlueDisplay}
            onOpenBlueDisplay={onOpenBlueDisplay}
            onBeamColorChange={onBeamColorChange}
            element={currentElement}
            onElementSelect={updateElement}
            isActive={activePanel === 'element'}
            onClick={() => togglePanel('element')}
          />
        </div>


        {/* Main Flex Layout */}
        <div className="flex items-center justify-between h-full pl-12 sm:pl-16 pr-2 min-w-0">
          {/* Left Side */}
          <div className="flex items-center min-w-0 overflow-hidden flex-1">
            {/* Username - Clickable */}
            <div className="relative">
              <button 
                data-name-button
                onClick={handleNameButtonClick}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !loading) {
                    e.preventDefault();
                    handleNameButtonClick();
                  }
                }}
                disabled={loading}
                className="font-medium text-lg relative flex-shrink-0 ml-2 transition-all duration-200 cursor-pointer bg-transparent border-none focus:outline-none disabled:opacity-50 rounded"
                style={{ 
                  color: getUsernameColor(currentElement),
                  textShadow: `
                    0 0 10px ${getUsernameColor(currentElement)},
                    0 0 20px ${getUsernameColor(currentElement)},
                    0 0 30px ${getUsernameColor(currentElement)}
                  `,
                  filter: 'brightness(1.2)',
                  padding: '8px 16px',
                  transition: 'all 0.3s ease'
                }}
                title={!currentUser ? "You need to log in to create your ALIEN name." : !contextProfile ? "Finish creating your Heartverse profile before editing your ALIEN name." : "Click to edit your name"}
                onMouseEnter={(e) => {
                  if (!loading) {
                    try { sfx.play('hover', 0.8); } catch {}
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.textShadow = `
                      0 0 15px ${getUsernameColor(currentElement)},
                      0 0 25px ${getUsernameColor(currentElement)},
                      0 0 35px ${getUsernameColor(currentElement)}
                    `;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.textShadow = `
                      0 0 10px ${getUsernameColor(currentElement)},
                      0 0 20px ${getUsernameColor(currentElement)},
                      0 0 30px ${getUsernameColor(currentElement)}
                    `;
                  }
                }}
              >
                {displayName}
              </button>

            </div>

            {/* Journey Button */}
            <div className="ml-2">
              <JourneyButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
                cumulativeHeartCoins={heartCoins}
                isActive={activePanel === 'journey'}
                onClick={() => togglePanel('journey')}
              />
            </div>
          </div>

          {/* Center - Code Button */}
          <div className="flex-shrink-0 -mr-3">
            <CodeButton 
              onHoverSound={() => sfx.play('hover', 0.8)}
              onCloseBlueDisplay={onCloseBlueDisplay}
              onOpenBlueDisplay={onOpenBlueDisplay}
              onBeamColorChange={onBeamColorChange}
              isActive={activePanel === 'code'}
              onClick={() => {
                togglePanel('code');
                // Call the onCodeClick callback if provided
                onCodeClick?.();
              }}
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center flex-shrink-0 mr-0">
            {/* Badges Button */}
            <div className="">
              <BadgesButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
                onBeamColorChange={onBeamColorChange}
                isActive={activePanel === 'badges'}
                onClick={() => togglePanel('badges')}
              />
            </div>

            {/* Digital Binder Button */}
            <div className="mr-2 -ml-6">
              <BinderButton 
                onHoverSound={() => sfx.play('hover', 0.8)}
                onCloseBlueDisplay={onCloseBlueDisplay}
                onOpenBlueDisplay={onOpenBlueDisplay}
                onBeamColorChange={onBeamColorChange}
                isActive={activePanel === 'binder'}
                onClick={() => togglePanel('binder')}
              />
            </div>

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
            try { onOpenBlueDisplay?.(); } catch {}
          }} 
        />
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
                  src="/elements/heart-coin.png"
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

      {/* Welcome Home Modal */}
      <WelcomeHomeModal 
        open={showWelcomeHome} 
        onClose={() => setShowWelcomeHome(false)} 
      />

      {/* Sign In Popup for unauthenticated users */}
      <JoinUsPopup 
        isOpen={showSignInPopup} 
        onClose={() => setShowSignInPopup(false)} 
      />

    </div>
  );
}
