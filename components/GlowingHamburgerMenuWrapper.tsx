"use client";

import { useState, useEffect } from "react";
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
  
  const { hasEnteredHeartverse } = useUIState();
  const tour = useTour();
  const { isMenuOpen, setMenuOpen } = useMenuState();

  useEffect(() => {
    console.log('codeOpen state changed to:', codeOpen);
  }, [codeOpen]);

  // Welcome Home modal now opens only from explicit triggers (Start flow or specific actions)
  // Avoid auto-opening on initial load or generic "entered" events to prevent early popups.

  const handleItemClick = (label: string) => {
    switch (label) {
      case "ABOUT":
        setChxndlerOpen(true);
        break;
      // Handle dynamic journey titles:
      case "JOURNEY":
      case "MY JOURNEY":
        setJourneyOpen(true);
        break;
      case "BINDER":
        setBinderOpen(true);
        break;
      case "JOURNAL":
      case "COMPLETED":
        setJournalOpen(true);
        break;
      case "BADGES":
        setBadgesOpen(true);
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
        setHeartCoinOpen(true);
        break;
      case "CHXNDLER":
        setChxndlerOpen(true);
        break;
      case "SIGNAL":
        // Handle Signal functionality
        console.log('Signal functionality not yet implemented');
        break;
      default:
        console.log(`No handler for menu item: ${label}`);
    }
  };

  // Debug logging for Chrome issue
  useEffect(() => {
    console.log("🍔 HAMBURGER WRAPPER:", { 
      hidden, 
      shouldShow: !hidden,
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
    });
  }, [hidden]);

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
      {/* Journal popout */}
      <SoulStarJournal 
        isOpen={journalOpen}
        onClose={() => setJournalOpen(false)}
      />
      {/* Binder popout */}
      {binderOpen && (
        <BinderModal 
          open={binderOpen}
          onClose={() => setBinderOpen(false)}
        />
      )}
      {/* Badges popout */}
      <BadgesButton
        style={{ display: 'none' }}
        isActive={badgesOpen}
        onClick={() => setBadgesOpen(false)}
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
      />
      {/* Hidden ChxndlerButton to handle the modal functionality */}
      <ChxndlerButton
        style={{ display: 'none' }}
        open={chxndlerOpen}
        onOpenChange={setChxndlerOpen}
        onOpenWelcomeHome={() => setWelcomeHomeOpen(true)}
      />
      {/* Hidden HeartCoinButton to handle the store modal functionality */}
      <HeartCoinButton
        data-tour-id="heartcoins"
        style={{ display: 'none' }}
        isActive={heartCoinOpen}
        onClose={() => setHeartCoinOpen(false)}
      />
      {/* Welcome Home Modal */}
      <WelcomeHomeModal
        open={welcomeHomeOpen}
        onClose={() => setWelcomeHomeOpen(false)}
      />
    </>
  );
}
