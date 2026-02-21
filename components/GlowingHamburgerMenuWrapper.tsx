"use client";

import { useState, useEffect } from "react";
import { useLogOnChange } from "@/lib/useLogOnChange";
import GlowingHamburgerMenu from "./GlowingHamburgerMenu";
import CodeButton from "./CodeButton";
import ChxndlerButton from "./ChxndlerButton";
import CodeModal from "./CodeModal";
import JourneyModal from "./JourneyModal";
import BinderModal from "./BinderModal";
import BadgesButton from "./BadgesButton";
import HeartCoinButton from "./HeartCoinButton";
import SoulStarJournal from "./SoulStarJournal";
import WelcomeHomeModal from "./WelcomeHomeModal";
import { useUIState } from "@/lib/use-ui-state";
import { useTour } from "@/contexts/TourContext";
import { useMenuState } from "@/contexts/MenuStateContext";
import { useElementOfDayClaim, ElementOfDay } from "@/hooks/useElementOfDayClaim";

// Map element of day to beam color
const ELEMENT_TO_BEAM_COLOR: Record<NonNullable<ElementOfDay>, string> = {
  heart: 'pink',
  water: 'cyan',
  lightning: 'yellow',
  darkness: 'white'
};

interface GlowingHamburgerMenuWrapperProps {
  hidden?: boolean;
  onBeamColorChange?: (color: string) => void;
}

export default function GlowingHamburgerMenuWrapper({ hidden = false, onBeamColorChange }: GlowingHamburgerMenuWrapperProps) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [chxndlerOpen, setChxndlerOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [binderOpen, setBinderOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [heartCoinOpen, setHeartCoinOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [welcomeHomeOpen, setWelcomeHomeOpen] = useState(false);
  const [lastClickedItem, setLastClickedItem] = useState<string | null>(null);
  // Short-lived shield to swallow pointerup/clicks after selecting a menu item
  // Prevents click-through from triggering underlying UI (e.g., Live Stream button)
  const [clickShieldActive, setClickShieldActive] = useState(false);
  
  const { hasEnteredHeartverse } = useUIState();
  const tour = useTour();
  const { isMenuOpen, setMenuOpen } = useMenuState();
  const { element: elementOfDay } = useElementOfDayClaim();

  useLogOnChange('codeOpen state changed:', { codeOpen });

  // Welcome Home modal now opens only from explicit triggers (Start flow or specific actions)
  // Avoid auto-opening on initial load or generic "entered" events to prevent early popups.

  // Listen for modal trigger events from chat panel buttons
  useEffect(() => {
    const handleOpenBinderModal = () => {
      try { onBeamColorChange?.('pink-modal'); } catch {}
      setBinderOpen(true);
    };

    const handleOpenBadgesModal = () => {
      // Ensure badges popout uses the blue light beam
      try { onBeamColorChange?.('blue'); } catch {}
      setBadgesOpen(true);
    };

    const handleOpenHeartCoinModal = () => {
      try { onBeamColorChange?.('pink'); } catch {}
      setHeartCoinOpen(true);
    };

    const handleOpenWelcomeHomeModal = () => {
      setWelcomeHomeOpen(true);
    };

    const handleOpenJournalModal = () => {
      // IMPORTANT: Do NOT change beam color here because 'pink' triggers live stream
      // The journal modal will handle its own beam color internally
      setJournalOpen(true);
    };

    const handleOpenJourneyModal = () => {
      setJourneyOpen(true);
    };

    // Close all modals event (e.g., when live signal button is clicked)
    const handleCloseAllModals = () => {
      setBadgesOpen(false);
      setHeartCoinOpen(false);
      setJourneyOpen(false);
      setBinderOpen(false);
      setChxndlerOpen(false);
      setJournalOpen(false);
      setCodeOpen(false);
      setWelcomeHomeOpen(false);
    };

    window.addEventListener('openBinderModal', handleOpenBinderModal);
    window.addEventListener('openBadgesModal', handleOpenBadgesModal);
    window.addEventListener('openHeartCoinModal', handleOpenHeartCoinModal);
    window.addEventListener('openWelcomeHomeModal', handleOpenWelcomeHomeModal);
    window.addEventListener('openJournalModal', handleOpenJournalModal);
    window.addEventListener('openJourneyModal', handleOpenJourneyModal);
    window.addEventListener('closeAllModals', handleCloseAllModals);

    return () => {
      window.removeEventListener('openBinderModal', handleOpenBinderModal);
      window.removeEventListener('openBadgesModal', handleOpenBadgesModal);
      window.removeEventListener('openHeartCoinModal', handleOpenHeartCoinModal);
      window.removeEventListener('openWelcomeHomeModal', handleOpenWelcomeHomeModal);
      window.removeEventListener('openJournalModal', handleOpenJournalModal);
      window.removeEventListener('openJourneyModal', handleOpenJourneyModal);
      window.removeEventListener('closeAllModals', handleCloseAllModals);
    };
  }, [onBeamColorChange, elementOfDay]);

  const handleItemClick = (label: string) => {
    // CRITICAL: If opening JOURNAL, immediately close any live stream display first
    // This must happen BEFORE any other logic to prevent the Signal button from being triggered
    if (label === 'JOURNAL' || label === 'COMPLETED') {
      if (process.env.NODE_ENV !== "production") console.log('🚫 BLOCKING LIVE STREAM - Opening Journal instead');
      // Close live stream immediately by dispatching closeAllModals event
      try { window.dispatchEvent(new CustomEvent('closeAllModals')); } catch {}
      // Turn off beam immediately
      try { onBeamColorChange?.('off'); } catch {}
    }

    // Enable a brief click shield to prevent pointerup/click from re-targeting
    setClickShieldActive(true);

    // Add global event capture to block ALL pointer events during shield period
    const blockEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Capture all pointer/click/mouse events globally
    window.addEventListener('pointerup', blockEvent, true);
    window.addEventListener('pointerdown', blockEvent, true);
    window.addEventListener('click', blockEvent, true);
    window.addEventListener('mousedown', blockEvent, true);
    window.addEventListener('mouseup', blockEvent, true);
    window.addEventListener('touchend', blockEvent, true);
    window.addEventListener('touchstart', blockEvent, true);

    // Auto-disable shield and remove global blockers shortly after
    window.setTimeout(() => {
      setClickShieldActive(false);
      window.removeEventListener('pointerup', blockEvent, true);
      window.removeEventListener('pointerdown', blockEvent, true);
      window.removeEventListener('click', blockEvent, true);
      window.removeEventListener('mousedown', blockEvent, true);
      window.removeEventListener('mouseup', blockEvent, true);
      window.removeEventListener('touchend', blockEvent, true);
      window.removeEventListener('touchstart', blockEvent, true);
    }, 500);

    setLastClickedItem(label);
    // Do not close the hamburger menu immediately here.
    // GlowingHamburgerMenu already closes itself after a short delay
    // to prevent click-through to underlying UI. Closing here
    // synchronously can allow the click to land on elements below
    // (e.g., live stream popouts). Let the child handle the close.

    // Ensure we close all modals first to prevent conflicts
    setBadgesOpen(false);
    setHeartCoinOpen(false);
    setJourneyOpen(false);
    setBinderOpen(false);
    setChxndlerOpen(false);
    setJournalOpen(false);
    setCodeOpen(false);
    setWelcomeHomeOpen(false);
    
    // Use setTimeout to ensure state is cleared and click shield is active before opening new modal
    setTimeout(() => {
      switch (label) {
        case "ABOUT":
          try { onBeamColorChange?.('pink-modal'); } catch {}
          setChxndlerOpen(true);
          break;
        // Handle dynamic journey titles:
        case "JOURNEY":
        case "MY JOURNEY":
          try { onBeamColorChange?.('pink-modal'); } catch {}
          setJourneyOpen(true);
          break;
        case "BINDER":
          try { onBeamColorChange?.('pink-modal'); } catch {}
          setBinderOpen(true);
          break;
        case "JOURNAL":
        case "COMPLETED": {
          // IMPORTANT: Do NOT change beam color when opening journal from hamburger menu
          // because 'pink' beam color triggers the live stream display to open in DashboardApp
          // The journal modal will handle its own beam color internally
          // Just open the journal directly without any beam color changes
          setJournalOpen(true);
          break;
        }
        case "BADGES":
          // Only open badges if we specifically clicked badges
          if (label === "BADGES") {
            try { onBeamColorChange?.('blue'); } catch {}
            setBadgesOpen(true);
          }
          break;
        case "STORE":
          // Clear any existing tab preferences and set initial tab preference to USE tab and MERCH sub-tab for heart coin modal
          if (typeof window !== 'undefined') {
            // Clear any existing preferences first
            delete (window as any).priceHeartCoinsInitialTab;
            delete (window as any).priceHeartCoinsInitialUseTab;
            delete (window as any).priceHeartCoinsSelectedCard;
            
            // Set our preferences
            (window as any).priceHeartCoinsInitialTab = 'USE';
            (window as any).priceHeartCoinsInitialUseTab = 'MERCH';
            // Set a flag to indicate this is from the STORE menu
            (window as any).priceHeartCoinsFromStore = true;
          }
          try { onBeamColorChange?.('white'); } catch {}
          setHeartCoinOpen(true);
          break;
        case "CHXNDLER":
          setChxndlerOpen(true);
          break;
        case "SIGNAL":
          // Handle Signal functionality
          break;
        default:
          // No handler for this menu item
      }
    }, 50);
  };

  // Debug logging for wrapper environment when values change
  useLogOnChange("🍔 HAMBURGER WRAPPER:", { 
    hidden, 
    shouldShow: !hidden,
    browser: typeof navigator !== 'undefined' && navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
  });

  // Debug logging for modal states when values change
  useLogOnChange("🔔 Modal states:", { 
    journalOpen, 
    badgesOpen, 
    binderOpen, 
    heartCoinOpen,
    chxndlerOpen,
    codeOpen
  });

  return (
    <>
      <div style={{ 
        visibility: hidden ? 'hidden' : 'visible',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 0.3s ease'
      }}>
        <GlowingHamburgerMenu 
          onItemClick={handleItemClick}
          externalIsOpen={isMenuOpen}
          onMenuToggle={setMenuOpen}
        />
      </div>
      {/* Click shield: prevents pointer up/click from hitting underlying UI during menu close */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 100009,
          cursor: 'default',
          pointerEvents: clickShieldActive ? 'auto' : 'none',
          opacity: clickShieldActive ? 1 : 0,
          transition: 'opacity 0.1s ease'
        }}
        onPointerDown={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
        onPointerUp={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
        onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
        onMouseDown={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
        onMouseUp={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} }}
      />
      {/* Journal popout */}
      <SoulStarJournal
        isOpen={journalOpen}
        onClose={() => {
          setJournalOpen(false);
          try { onBeamColorChange?.('off'); } catch {}
        }}
        openWelcomeHome={() => setWelcomeHomeOpen(true)}
      />
      {/* Binder popout */}
      {binderOpen && (
        <BinderModal
          open={binderOpen}
          onClose={() => {
            setBinderOpen(false);
            try { onBeamColorChange?.('off'); } catch {}
          }}
        />
      )}
      {/* Badges popout */}
      <BadgesButton
        style={{ display: 'none' }}
        isActive={badgesOpen && lastClickedItem === "BADGES"}
        onClick={() => setBadgesOpen(false)}
        onBeamColorChange={onBeamColorChange}
      />
      {/* Direct Code Popup for ABOUT functionality */}
      {codeOpen && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
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
            {/* Close button */}
            <button
              onClick={() => setCodeOpen(false)}
              className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
              style={{ 
                fontSize: '16px',
                boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
                textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
                background: 'rgba(0,255,255,0.1)',
                backdropFilter: 'blur(2px)'
              }}
            >
              ×
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
                <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                <span>We believe being your <span style={{ color: '#0099FF !important', textShadow: '0 0 5px #0099FF, 0 0 10px #0099FF, 0 0 15px #0099FF, 0 0 20px #0099FF', fontWeight: 'inherit !important' }}>truest self</span> is the beginning of freedom.</span>
              </div>
              <div className="flex items-start">
                <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                <span>We believe <span style={{ color: '#FFD700 !important', textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFD700, 0 0 20px #FFD700', fontWeight: 'inherit !important' }}>passion</span> is sacred and should be pursued loudly.</span>
              </div>
              <div className="flex items-start">
                <span className="mr-3" style={{ color: '#FFFFFF !important', textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7)' }}>•</span>
                <span>We believe <span style={{ color: '#FF1493 !important', textShadow: '0 0 5px #FF1493, 0 0 10px #FF1493, 0 0 15px #FF1493, 0 0 20px #FF1493', fontWeight: 'inherit !important' }}>love</span> is the force that connects every soul.</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* JourneyModal for MY JOURNEY functionality */}
      <JourneyModal
        open={journeyOpen}
        onClose={() => setJourneyOpen(false)}
        onBeamColorChange={onBeamColorChange}
      />
      {/* Hidden ChxndlerButton to handle the modal functionality */}
      <ChxndlerButton
        style={{ display: 'none' }}
        open={chxndlerOpen}
        onOpenChange={(open) => {
          setChxndlerOpen(open);
          if (!open) {
            try { onBeamColorChange?.('off'); } catch {}
          }
        }}
        onOpenWelcomeHome={() => setWelcomeHomeOpen(true)}
      />
      {/* Hidden HeartCoinButton to handle the store modal functionality */}
      <HeartCoinButton
        data-tour-id="heartcoins"
        style={{ display: 'none' }}
        isActive={heartCoinOpen}
        onClose={() => {
          setHeartCoinOpen(false);
          try { onBeamColorChange?.('off'); } catch {}
        }}
        onOpenJournal={() => setJournalOpen(true)}
        onBeamColorChange={onBeamColorChange}
      />
      {/* Welcome Home Modal */}
      <WelcomeHomeModal
        open={welcomeHomeOpen}
        onClose={() => setWelcomeHomeOpen(false)}
      />
    </>
  );
}
