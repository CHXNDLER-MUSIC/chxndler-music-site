"use client";

import { useEffect, useState, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { sfx } from "@/lib/sfx";

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  body: string;
  requiresMenuOpen?: boolean;
  requiresMenuClosed?: boolean;
}

// ENHANCED SAFE TARGET RESOLVER - Never throws, includes debug logging
function getTarget(selector: string): HTMLElement | null {
  try {
    const el = selector ? document.querySelector(selector) as HTMLElement : null;
    if (process.env.NODE_ENV !== "production") console.log("STEP TARGET:", selector, el ? "✅ FOUND" : "❌ NOT FOUND");
    if (!el) {
      if (process.env.NODE_ENV !== "production") console.warn("TOUR: target not found:", selector);
    }
    return el;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("TOUR: target selector error:", selector, error);
    return null;
  }
}

// UPDATED STEPS ARRAY WITH CORRECT ORDER AND NEW MUSIC DROPDOWN STEP
export const TOUR_STEPS: TourStep[] = [
  // Step 0: Intro (no target)
  {
    id: "intro",
    selector: "",
    title: "Welcome aboard",
    body: "Welcome to your Heartverse spaceship. I'll show you the key controls so you can explore, reflect, collect, and connect."
  },
  
  // Step 1: Hamburger (opens menu for subsequent steps)
  {
    id: "hamburger",
    selector: "[data-tour-id='hamburger']",
    title: "Main control panel",
    body: "Tap here to open your main control panel.",
    requiresMenuOpen: true
  },
  
  // Step 2: ABOUT (menu must be open)
  {
    id: "menu-about",
    selector: "[data-tour-id='menu-about']",
    title: "ABOUT",
    body: "Learn the story of CHXNDLER and the Heartverse.",
    requiresMenuOpen: true
  },
  
  // Step 3: My Journey (menu must be open)
  {
    id: "menu-journey",
    selector: "[data-tour-id='menu-journey']",
    title: "My Journey",
    body: "Your personal storyline through the Heartverse.",
    requiresMenuOpen: true
  },
  
  // Step 4: Binder (menu must be open)
  {
    id: "menu-binder",
    selector: "[data-tour-id='menu-binder']",
    title: "Binder",
    body: "Your collected song cards live here.",
    requiresMenuOpen: true
  },
  
  // Step 5: Badges (menu must be open)
  {
    id: "menu-badges",
    selector: "[data-tour-id='menu-badges']",
    title: "Badges",
    body: "Your achievements as you explore the Heartverse.",
    requiresMenuOpen: true
  },
  
  // Step 6: Journal (menu must be open)
  {
    id: "menu-journal",
    selector: "[data-tour-id='menu-journal']",
    title: "Journal",
    body: "Your daily reflection lives here.",
    requiresMenuOpen: true
  },
  
  // Step 7: Heart Coins (close menu first)
  {
    id: "heartcoins",
    selector: "[data-tour-id='heartcoin-button']",
    title: "Heart Coins",
    body: "The energy of this world. Earn them by exploring, reflecting, and connecting.",
    requiresMenuClosed: true
  },
  
  // Step 8: Music Power Button (menu stays closed)
  {
    id: "music-dropdown",
    selector: "[data-tour-id='music-power-button']",
    title: "Music",
    body: "Choose a track to listen to here.",
    requiresMenuClosed: true
  },
  
  // Step 9: Signal (menu stays closed, targets pink signal button)
  {
    id: "signal",
    selector: "[data-tour-id='signal-button']",
    title: "Signal",
    body: "Join live moments, chat with other Aliens, and feel the pulse of the community.",
    requiresMenuClosed: true
  },
  
  // Step 10: Outro (no target)
  {
    id: "outro",
    selector: "",
    title: "You are ready",
    body: "Explore freely. You can restart this tour anytime in your profile."
  }
];

interface OnboardingTourProps {
  active: boolean;
  onFinish: (completed: boolean) => void;
  onSkip?: () => void;
  endModalVisible?: boolean;
  onRestartFromEnd?: () => void;
  onMenuToggle?: (open: boolean) => void;
}

export default function OnboardingTour({ 
  active, 
  onFinish, 
  onSkip, 
  endModalVisible, 
  onRestartFromEnd, 
  onMenuToggle 
}: OnboardingTourProps) {
  const { updateProfile } = useProfile();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<{ cx: number; cy: number; r: number } | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Current step with safety check
  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/heart-coin.mp3');
    }
  }, []);

  // Play heart coin sound
  const playHeartCoinSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  // DEBUG: Log step changes with special signal step handling
  useEffect(() => {
    if (active) {
      if (process.env.NODE_ENV !== "production") console.log("TOUR STEP:", currentStepIndex, currentStep?.id || 'unknown');
      
      // Special handling for signal step (Step 9)
      if (currentStep?.id === 'signal') {
        if (process.env.NODE_ENV !== "production") console.log("🎯 SIGNAL STEP ACTIVATED - Looking for pink antennas button");
        
        // Double-check the signal button exists after a delay
        setTimeout(() => {
          const signalBtn = getTarget('[data-tour-id="signal-button"]');
          if (signalBtn) {
            if (process.env.NODE_ENV !== "production") console.log("✅ Signal button found:", signalBtn);
          } else {
            if (process.env.NODE_ENV !== "production") console.warn("❌ Signal button NOT FOUND - may be covered by menu or not rendered");
          }
        }, 500);
      }
    }
  }, [currentStepIndex, active, currentStep]);

  // Force menu open with retry logic
  const forceMenuOpen = (callback: () => void) => {
    if (process.env.NODE_ENV !== "production") console.log('🔥 FORCING MENU OPEN');
    
    if (onMenuToggle) {
      onMenuToggle(true);
    }
    
    // Try DOM manipulation as fallback
    const hamburgerButton = getTarget('[data-tour-id="hamburger"]');
    if (hamburgerButton) {
      try {
        (hamburgerButton as HTMLButtonElement).click();
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.warn('Could not click hamburger button:', e);
      }
    }
    
    // Wait for menu animation and retry if needed
    let attempts = 0;
    const checkMenuOpen = () => {
      const menuPanel = getTarget('[data-tour-id="nav-panel"]');
      if (menuPanel && menuPanel.offsetParent !== null) {
        if (process.env.NODE_ENV !== "production") console.log('✅ Menu is now open');
        callback();
      } else if (attempts < 5) {
        attempts++;
        if (process.env.NODE_ENV !== "production") console.log(`🔄 Menu not open yet, retrying... attempt ${attempts}`);
        setTimeout(checkMenuOpen, 150);
      } else {
        if (process.env.NODE_ENV !== "production") console.warn('⚠️ Could not open menu after 5 attempts, proceeding anyway');
        callback();
      }
    };
    
    setTimeout(checkMenuOpen, 100);
  };

  // Force menu closed
  const forceMenuClosed = (callback: () => void) => {
    if (process.env.NODE_ENV !== "production") console.log('🔥 FORCING MENU CLOSED');
    
    if (onMenuToggle) {
      onMenuToggle(false);
    }
    
    // Wait for close animation
    setTimeout(callback, 150);
  };

  // Safe element positioning that handles menu elements specially
  const positionBubble = (element: HTMLElement | null, step: TourStep) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const bubbleWidth = 150; // Narrower bubble
    const bubbleHeight = 180;
    
    // If no element, center the tooltip (ERROR-PROOF TARGETING)
    if (!element) {
      if (process.env.NODE_ENV !== "production") console.warn(`⚠️ No target element found for step "${step.id}", showing centered tooltip`);
      setBubblePosition({
        top: viewportHeight / 2 - bubbleHeight / 2,
        left: viewportWidth / 2 - bubbleWidth / 2
      });
      
      // Set default overlay background for centered steps
      if (overlayRef.current) {
        overlayRef.current.style.background = 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))';
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    
    // Special positioning for hamburger step - places tooltip near the X button
    if (step.id === 'hamburger') {
      // Position the bubble close to the X button (hamburger element)
      // Place it to the right and slightly below the X button
      const marginRight = 20; // Space from the X button
      const marginDown = 10; // Slight downward offset

      let left = rect.right + marginRight;
      let top = rect.top + marginDown;

      // Ensure tooltip doesn't go off-screen on the right
      const maxLeft = viewportWidth - bubbleWidth - 16;
      if (left > maxLeft) {
        left = maxLeft;
      }

      // Ensure tooltip doesn't go off-screen at the top
      top = Math.max(20, top);

      setBubblePosition({ top, left });

      // Update spotlight for hamburger button (the X)
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.max(60, Math.ceil(Math.hypot(rect.width, rect.height) * 0.8));
      spotlightRef.current = { cx, cy, r };

      if (overlayRef.current) {
        const gradient = `radial-gradient(${r}px ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.6) 100%)`;
        overlayRef.current.style.background = gradient;
      }
      return;
    }

    // Special positioning for menu items - places tooltip to the RIGHT of menu
    if (step.id.startsWith('menu-')) {
      // Directly select the nav-panel dropdown by its data-tour-id
      const menuDropdown = document.querySelector('[data-tour-id="nav-panel"]') as HTMLElement;

      if (menuDropdown) {
        const dropdownRect = menuDropdown.getBoundingClientRect();

        // Position to the right of the menu with spacing to avoid overlap
        const marginFromMenu = viewportWidth <= 768 ? 16 : 28;
        let left = dropdownRect.right + marginFromMenu;

        // Ensure tooltip doesn't go off-screen on the right
        const maxLeft = viewportWidth - bubbleWidth - 16;
        if (left > maxLeft) {
          left = maxLeft;
        }

        // Vertically align with the target element within the menu
        const top = Math.max(20, Math.min(element.getBoundingClientRect().top, viewportHeight - bubbleHeight - 20));

        setBubblePosition({ top, left });

        // Update spotlight for menu dropdown
        const cx = dropdownRect.left + dropdownRect.width / 2;
        const cy = dropdownRect.top + dropdownRect.height / 2;
        const r = Math.max(80, Math.ceil(Math.hypot(dropdownRect.width, dropdownRect.height) * 0.6));
        spotlightRef.current = { cx, cy, r };

        if (overlayRef.current) {
          const gradient = `radial-gradient(${r}px ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.6) 100%)`;
          overlayRef.current.style.background = gradient;
        }
        return;
      }
    }
    
    // Special positioning for Music and Signal steps - position to the LEFT of the target
    if (step.id === 'music-dropdown' || step.id === 'signal') {
      // Position to the left of the element
      let left = rect.left - bubbleWidth - 20;
      let top = rect.top + (rect.height / 2) - (bubbleHeight / 2);

      // If not enough space on left, position below
      if (left < 20) {
        left = rect.left + (rect.width / 2) - (bubbleWidth / 2);
        top = rect.bottom + 20;
      }

      // Keep within viewport bounds
      left = Math.max(20, Math.min(left, viewportWidth - bubbleWidth - 20));
      top = Math.max(20, Math.min(top, viewportHeight - bubbleHeight - 20));

      setBubblePosition({ top, left });

      // Update spotlight for the target element
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.max(50, Math.ceil(Math.hypot(rect.width, rect.height) * 0.7));
      spotlightRef.current = { cx, cy, r };

      if (overlayRef.current) {
        const gradient = `radial-gradient(${r}px ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.6) 100%)`;
        overlayRef.current.style.background = gradient;
      }
      return;
    }

    // Default positioning - try to place above or below the element
    let top = rect.top - bubbleHeight - 20;
    let left = rect.left + (rect.width / 2) - (bubbleWidth / 2);

    // If not enough space above, place below
    if (top < 20) {
      top = rect.bottom + 20;
    }

    // Keep within viewport bounds
    left = Math.max(20, Math.min(left, viewportWidth - bubbleWidth - 20));
    top = Math.max(20, Math.min(top, viewportHeight - bubbleHeight - 20));

    setBubblePosition({ top, left });

    // Update spotlight for overlay
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.max(60, Math.ceil(Math.hypot(rect.width, rect.height) * 0.8));
    spotlightRef.current = { cx, cy, r };
    
    if (overlayRef.current) {
      const gradient = `radial-gradient(${r}px ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.6) 100%)`;
      overlayRef.current.style.background = gradient;
    }
  };

  // Setup step with menu state management and safe targeting
  const setupStep = (step: TourStep, retryCount = 0) => {
    if (process.env.NODE_ENV !== "production") console.log(`🎯 Setting up step "${step.id}", attempt ${retryCount + 1}`);

    // Clear any existing timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (menuOpenTimeoutRef.current) {
      clearTimeout(menuOpenTimeoutRef.current);
      menuOpenTimeoutRef.current = null;
    }

    // Handle intro/outro steps (no target)
    if (!step.selector) {
      setTargetElement(null);
      const bubbleWidth = 150;
      const bubbleHeight = 180;
      setBubblePosition({
        top: window.innerHeight / 2 - bubbleHeight / 2,
        left: window.innerWidth / 2 - bubbleWidth / 2
      });
      if (overlayRef.current) {
        overlayRef.current.style.background = 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))';
      }
      return;
    }

    // MENU OPEN/CLOSE LOGIC
    const setupStepElement = () => {
      // Try to find the target element
      const element = getTarget(step.selector);
      
      if (element) {
        if (process.env.NODE_ENV !== "production") console.log(`✅ Found element for step "${step.id}"`);
        setTargetElement(element);
        
        // Remove previous highlights
        document.querySelectorAll('.tour-highlight, .tour-highlight-no-spin').forEach(el => {
          el.classList.remove('tour-highlight', 'tour-highlight-no-spin');
        });
        
        // Add GLOWING HIGHLIGHT to current element (reusing same styles)
        // Use non-spinning highlight for signal and music steps
        if (step.id === 'signal' || step.id === 'music-dropdown') {
          element.classList.add('tour-highlight-no-spin');
        } else {
          element.classList.add('tour-highlight');
        }
        
        // Position the bubble
        positionBubble(element, step);

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        if (process.env.NODE_ENV !== "production") console.warn(`⚠️ Element not found for step "${step.id}" with selector "${step.selector}"`);
        
        // Retry for menu items (they may not be rendered yet)
        if (step.id.startsWith('menu-') && retryCount < 8) {
          if (process.env.NODE_ENV !== "production") console.log(`🔄 Retrying step "${step.id}" in 200ms...`);
          retryTimeoutRef.current = setTimeout(() => setupStep(step, retryCount + 1), 200);
          return;
        }
        
        // ERROR-PROOF TARGETING: Show centered tooltip and continue
        if (process.env.NODE_ENV !== "production") console.log(`📍 Using fallback positioning for step "${step.id}"`);
        setTargetElement(null);
        positionBubble(null, step);
      }
    };

    // Handle menu state requirements
    if (step.requiresMenuOpen) {
      forceMenuOpen(setupStepElement);
    } else if (step.requiresMenuClosed) {
      // CRITICAL: Close menu before Signal/HeartCoin/Music steps to make top-right buttons visible
      if (process.env.NODE_ENV !== "production") console.log(`🔥 CLOSING MENU for step "${step.id}" to expose top-right buttons`);
      forceMenuClosed(setupStepElement);
    } else {
      // No menu requirement, setup immediately
      setTimeout(setupStepElement, 100);
    }
  };

  // Cleanup current step
  const cleanupCurrentStep = () => {
    // Clear timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (menuOpenTimeoutRef.current) {
      clearTimeout(menuOpenTimeoutRef.current);
      menuOpenTimeoutRef.current = null;
    }

    // Remove highlights
    document.querySelectorAll('.tour-highlight, .tour-highlight-no-spin').forEach(el => {
      el.classList.remove('tour-highlight', 'tour-highlight-no-spin');
    });
  };

  // Handle next step
  const handleNext = () => {
    // Play click sound when Next button is clicked
    sfx.play('click', 0.6);

    if (currentStepIndex < TOUR_STEPS.length - 1) {
      cleanupCurrentStep();
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Play heart coin sound when completing the tour
      playHeartCoinSound();
      handleFinish(true);
    }
  };

  // Handle skip tour
  const handleSkip = async () => {
    if (onSkip) return onSkip();
    handleFinish(false);
  };

  // Handle tour completion/skip
  const handleFinish = async (completed: boolean) => {
    try {
      await updateProfile({ has_seen_tour: true });
    } catch (error) {
      console.error("Error updating profile after tour:", error);
    }

    cleanupCurrentStep();
    setIsVisible(false);
    document.body.classList.remove('tour-active');
    document.body.style.removeProperty('overflow');
    
    if (completed) {
      onFinish(completed);
    } else {
      setTimeout(() => onFinish(completed), 300);
    }
  };

  // Setup tour when active
  useEffect(() => {
    if (active) {
      setCurrentStepIndex(0);
      document.body.classList.add('tour-active');
      
      if (currentStep) {
        setupStep(currentStep);
      }
      
      setIsVisible(true);
    } else {
      cleanupCurrentStep();
      document.body.classList.remove('tour-active');
      setIsVisible(false);
    }

    return () => {
      cleanupCurrentStep();
      document.body.classList.remove('tour-active');
    };
  }, [active]);

  // Update step when index changes (STEP CHANGE HANDLER)
  useEffect(() => {
    if (active && currentStep) {
      setupStep(currentStep);
    }
  }, [currentStepIndex, active]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (targetElement && isVisible && currentStep) {
        positionBubble(targetElement, currentStep);
      }
    };

    if (active) {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [active, targetElement, isVisible, currentStep]);

  if (!active && !endModalVisible) {
    return null;
  }

  // Safety check: if no current step and tour is active, don't render
  if (!currentStep && active) {
    if (process.env.NODE_ENV !== "production") console.warn(`No step found at index ${currentStepIndex}`);
    return null;
  }

  return (
    <>
      {/* Dim overlay */}
      <div
        ref={overlayRef}
        className={`tour-overlay fixed inset-0 transition-opacity duration-300 ${
          isVisible && active ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          zIndex: 2147483647,
          pointerEvents: isVisible ? 'auto' : 'none',
          background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))'
        }}
      />

      {/* Speech bubble */}
      {active && bubblePosition && (
        <div
          className={`tour-bubble fixed transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
          }`}
          style={{
            zIndex: 2147483648,
            top: bubblePosition.top,
            left: bubblePosition.left,
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
        >
          <div
            className="relative rounded-2xl p-4"
            style={{
              width: '150px',
              background: `linear-gradient(180deg, rgba(252,84,175,0.18), rgba(252,84,175,0.12))`,
              border: '1px solid rgba(252,84,175,0.35)',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(252,84,175,0.45), 0 0 80px rgba(252,84,175,0.25), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -6px 14px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Skip button - top right */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors duration-200 text-xs"
            >
              ✕
            </button>

            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-70 tour-sparkles" style={{
                backgroundImage: `
                  radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 52%),
                  radial-gradient(1.5px 1.5px at 70% 60%, rgba(252,84,175,0.6) 50%, transparent 52%),
                  radial-gradient(1.2px 1.2px at 40% 80%, rgba(56,182,255,0.5) 50%, transparent 52%),
                  radial-gradient(1.8px 1.8px at 85% 20%, rgba(255,255,255,0.7) 50%, transparent 52%)
                `
              }} />
            </div>

            {/* Title */}
            <h3
              className="text-base font-bold text-white mb-2 pr-4"
              style={{
                fontFamily: 'OrbitronLocal, InterLocal, system-ui, sans-serif',
                letterSpacing: '0.04em',
                textShadow: '0 0 15px rgba(252,84,175,0.65)',
              }}
            >
              {currentStep?.title || 'Loading...'}
            </h3>

            {/* Body */}
            <p className="text-white/90 text-sm mb-4 leading-relaxed whitespace-pre-line">
              {currentStep?.body || 'Loading tour content...'}
            </p>

            {/* Next button - full width */}
            <button
              onClick={handleNext}
              className="w-full px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))`,
                border: '1px solid rgba(252,84,175,0.5)',
                boxShadow: `0 4px 8px rgba(0,0,0,0.3), 0 0 15px rgba(252,84,175,0.45), inset 0 1px 0 rgba(255,255,255,0.2)`,
                textShadow: '0 0 8px rgba(252,84,175,0.9)',
              }}
            >
              {isLastStep ? 'Got it!' : 'Next'}
            </button>

            {/* Step indicator - smaller dots */}
            <div className="flex justify-center mt-3 gap-1 flex-wrap">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    index === currentStepIndex
                      ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50'
                      : index < currentStepIndex
                        ? 'bg-cyan-400/60'
                        : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* End of Tour modal */}
      {endModalVisible && (
        <div className={`fixed inset-0 flex items-center justify-center transition-opacity duration-300 ${endModalVisible ? 'opacity-100' : 'opacity-0'}`} style={{ zIndex: 2147483649 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-4 rounded-2xl p-8 text-center" style={{ zIndex: 2147483650,
            background: 'linear-gradient(180deg, rgba(252,84,175,0.18), rgba(252,84,175,0.12))',
            border: '1px solid rgba(252,84,175,0.35)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(252,84,175,0.5)'
          }}>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ textShadow: '0 0 18px rgba(252,84,175,0.7)' }}>Welcome Home</h2>
            <p className="text-white/90 mb-8">Your Heartverse journey begins now.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => onFinish(true)} className="px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105" style={{
                background: 'linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))',
                border: '1px solid rgba(252,84,175,0.5)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(252,84,175,0.45)'
              }}>Start Exploring</button>
              <button onClick={() => onRestartFromEnd && onRestartFromEnd()} className="px-6 py-2 rounded-lg font-semibold text-white/90 hover:text-white transition-all duration-200 border" style={{
                borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)'
              }}>Restart Tour</button>
            </div>
          </div>
        </div>
      )}

      {/* HIGHLIGHT STYLING - Reused glowing effect for all highlighted elements */}
      <style jsx global>{`
        /* Body class when tour is active */
        .tour-active {
          overflow: hidden;
        }

        /* 🔥 GLOWING HIGHLIGHT EFFECT - Applied to all tour targets */
        .tour-highlight {
          z-index: 2147483647 !important;
          animation: tourGlow 2.2s ease-in-out infinite !important;
          border-radius: inherit !important;
          box-shadow:
            0 0 0 3px rgba(252,84,175,0.7) !important,
            0 0 24px rgba(252,84,175,0.9) !important,
            0 0 48px rgba(252,84,175,0.7) !important,
            0 0 96px rgba(252,84,175,0.5) !important;
        }

        /* Ensure tour highlight is visible above all other elements */
        .tour-highlight,
        .tour-highlight *,
        .tour-highlight-no-spin,
        .tour-highlight-no-spin * {
          pointer-events: auto !important;
          isolation: isolate !important;
        }

        /* 🔥 NO-SPIN HIGHLIGHT - Same glow but no spinning animation (for Signal step) */
        .tour-highlight-no-spin {
          z-index: 2147483647 !important;
          animation: tourGlow 2.2s ease-in-out infinite !important;
          border-radius: inherit !important;
          box-shadow:
            0 0 0 3px rgba(252,84,175,0.7) !important,
            0 0 24px rgba(252,84,175,0.9) !important,
            0 0 48px rgba(252,84,175,0.7) !important,
            0 0 96px rgba(252,84,175,0.5) !important;
        }

        /* No sparkle animation for no-spin variant */
        .tour-highlight-no-spin::after {
          display: none !important;
        }

        .tour-highlight::after {
          content: '';
          position: absolute;
          inset: -15px;
          pointer-events: none;
          background-image:
            radial-gradient(3px 3px at 15% 25%, rgba(255,255,255,0.9) 50%, transparent 52%),
            radial-gradient(2px 2px at 85% 35%, rgba(252,84,175,0.8) 50%, transparent 52%),
            radial-gradient(2.5px 2.5px at 70% 80%, rgba(56,182,255,0.7) 50%, transparent 52%),
            radial-gradient(1.5px 1.5px at 25% 75%, rgba(242,239,29,0.6) 50%, transparent 52%),
            radial-gradient(3.2px 3.2px at 90% 15%, rgba(255,255,255,0.8) 50%, transparent 52%),
            radial-gradient(1.8px 1.8px at 40% 20%, rgba(252,84,175,0.5) 50%, transparent 52%),
            radial-gradient(2.2px 2.2px at 60% 45%, rgba(56,182,255,0.4) 50%, transparent 52%),
            radial-gradient(1.3px 1.3px at 10% 60%, rgba(255,255,255,0.6) 50%, transparent 52%);
          animation: twinkle 2.2s ease-in-out infinite;
        }

        /* 🔥 PULSING GLOW ANIMATION */
        @keyframes tourGlow {
          0%, 100% {
            box-shadow:
              0 0 0 3px rgba(252,84,175,0.7),
              0 0 24px rgba(252,84,175,0.9),
              0 0 48px rgba(252,84,175,0.7),
              0 0 96px rgba(252,84,175,0.5);
            filter: brightness(1.12) saturate(1.12);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(252,84,175,0.9),
              0 0 36px rgba(252,84,175,1.0),
              0 0 72px rgba(252,84,175,0.85),
              0 0 140px rgba(252,84,175,0.65);
            filter: brightness(1.22) saturate(1.22);
          }
        }

        @keyframes twinkle {
          0% { opacity: 0.9; transform: translateY(0px) rotate(0deg) scale(1); }
          25% { opacity: 0.6; transform: translateY(-1px) rotate(90deg) scale(1.1); }
          50% { opacity: 0.3; transform: translateY(1px) rotate(180deg) scale(0.9); }
          75% { opacity: 0.7; transform: translateY(-0.5px) rotate(270deg) scale(1.05); }
          100% { opacity: 0.9; transform: translateY(0px) rotate(360deg) scale(1); }
        }

        @keyframes tourSparkle {
          0%, 100% { opacity: 0.7; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.3; transform: scale(1.2) rotate(180deg); }
        }

        .tour-sparkles {
          animation: tourSparkle 3.5s ease-in-out infinite;
        }

        /* Ensure bubble is above everything */
        .tour-bubble {
          z-index: 301;
        }

        /* Smooth transitions for all tour elements */
        .tour-overlay,
        .tour-bubble {
          transition: all 300ms ease;
        }
      `}</style>
    </>
  );
}
