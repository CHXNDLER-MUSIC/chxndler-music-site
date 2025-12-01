"use client";

import { useEffect, useState, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    selector: "", // No selector for intro step
    title: "Welcome aboard",
    body: "This is your Heartverse spaceship. I'll show you the key controls so you can explore, reflect, and collect."
  },
  {
    id: "hamburger",
    selector: "[data-tour-id='hamburger']",
    title: "Main controls",
    body: "Tap this menu to open the main controls of your ship. From here you can jump between codes, journeys, your journal, and more."
  },
  {
    id: "menu-about",
    selector: "[data-tour-id='menu-about']",
    title: "ABOUT",
    body: "ABOUT tells you who CHXNDLER is, the story of the Heartverse, and the vision behind this world."
  },
  {
    id: "menu-journey",
    selector: "[data-tour-id='menu-journey']",
    title: "My Journey",
    body: "Journey is your main path through the Heartverse. New songs, chapters, and experiences appear here as you travel."
  },
  {
    id: "menu-journal",
    selector: "[data-tour-id='menu-journal']",
    title: "Journal",
    body: "Journal is your reflection space. Each day you can set an intention, answer a question, and record how you feel. This is how you earn Soul badges and grow over time."
  },
  {
    id: "menu-binder",
    selector: "[data-tour-id='menu-binder']",
    title: "Binder",
    body: "The Binder is where all your collected song cards live. Each card connects to a track or story in the Heartverse, and some unlock secret content."
  },
  {
    id: "menu-badges",
    selector: "[data-tour-id='menu-badges']",
    title: "Badges",
    body: "Badges are your achievements. You can earn them by reflecting, attending livestreams, sending Heart Coins, and exploring different parts of the ship."
  },
  {
    id: "heartcoins",
    selector: "[data-tour-id='heartcoins']",
    title: "Heart Coins",
    body: "Heart Coins are the energy of this world. You can earn them by listening, reflecting, joining events, and connecting with others. Later you will be able to use them for special rewards."
  },
  {
    id: "signal-streaming",
    selector: "[data-tour-id='signal-streaming']",
    title: "Signal for Streaming",
    body: "Connect to live streams and join the Heartverse community. This is where you can chat with other aliens and join live events."
  },
  {
    id: "outro",
    selector: "", // No selector for outro step
    title: "You are ready",
    body: "That is the core of your ship. You can explore freely now, and you can always restart this tour from your profile if you ever want a refresher."
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

export default function OnboardingTour({ active, onFinish, onSkip, endModalVisible, onRestartFromEnd, onMenuToggle }: OnboardingTourProps) {
  const { updateProfile } = useProfile();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<{ cx: number; cy: number; r: number } | null>(null);

  // Current step with safety check
  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Position bubble relative to target element
  const positionBubble = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const currentStepId = currentStep?.id || '';
    const bubbleWidth = 320; // Estimated bubble width
    const bubbleHeight = 120; // Estimated bubble height
    
    // Special positioning for menu items - place to the right of the menu
    if (currentStepId.startsWith('menu-')) {
      // Force menu to be open for menu steps
      if (onMenuToggle) {
        onMenuToggle(true);
      }
      
      // Wait a bit for menu to open, then position
      setTimeout(() => {
        const hamburgerContainer = document.querySelector('[data-tour-id="hamburger"]')?.closest('.fixed');
        const menuDropdown = hamburgerContainer?.querySelector('.absolute');
        
        if (menuDropdown) {
          // Menu is open, position to the right of the dropdown
          const dropdownRect = menuDropdown.getBoundingClientRect();
          const targetRect = element.getBoundingClientRect();
          
          // Position tooltip to the right of the dropdown, vertically aligned with the target menu item
          const top = targetRect.top + (targetRect.height / 2) - (bubbleHeight / 2);
          const left = dropdownRect.right + 16; // Small gap from dropdown edge
          
          setBubblePosition({ 
            top: Math.max(20, Math.min(top, viewportHeight - bubbleHeight - 20)), 
            left: Math.min(left, viewportWidth - bubbleWidth - 20)
          });
        } else {
          // Fallback: menu not open, position based on hamburger button
          const hamburgerRect = document.querySelector('[data-tour-id="hamburger"]')?.getBoundingClientRect();
          if (hamburgerRect) {
            const top = hamburgerRect.top + (hamburgerRect.height / 2) - (bubbleHeight / 2);
            const left = hamburgerRect.right + 260; // Position to the right where menu would be
            
            setBubblePosition({ 
              top: Math.max(20, Math.min(top, viewportHeight - bubbleHeight - 20)), 
              left: Math.min(left, viewportWidth - bubbleWidth - 20)
            });
          } else {
            // Final fallback: center the tooltip
            setBubblePosition({ 
              top: viewportHeight / 2 - bubbleHeight / 2, 
              left: viewportWidth / 2 - bubbleWidth / 2
            });
          }
        }
      }, 300); // Increased wait time for menu animation
      return;
    }
    
    // Calculate position - try to place above the element
    let top = rect.top - 20; // 20px gap above element
    let left = rect.left + rect.width / 2; // Center horizontally on element

    // Keep horizontal position in viewport
    if (left - bubbleWidth / 2 < 20) {
      left = bubbleWidth / 2 + 20;
    } else if (left + bubbleWidth / 2 > viewportWidth - 20) {
      left = viewportWidth - bubbleWidth / 2 - 20;
    }

    // If not enough space above, place below
    if (top - bubbleHeight < 20) {
      top = rect.bottom + 20;
    }

    // Final viewport bounds check
    top = Math.max(20, Math.min(top, viewportHeight - bubbleHeight - 20));

    setBubblePosition({ top, left });

    // Compute spotlight center and radius for the overlay
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.max(120, Math.ceil(Math.hypot(rect.width, rect.height) * 0.8));
    spotlightRef.current = { cx, cy, r };
    // Apply dynamic radial-gradient to create a "hole" around the target
    if (overlayRef.current) {
      const g = `radial-gradient(${r}px ${r}px at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.6) 100%)`;
      overlayRef.current.style.background = g;
    }
  };

  // Find target element and set up highlighting
  const setupStep = (step: TourStep) => {
    // Handle intro/outro steps that don't have selectors
    if (!step.selector) {
      setTargetElement(null);
      setBubblePosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 });
      // Fallback overlay background for centered steps
      if (overlayRef.current) {
        overlayRef.current.style.background = 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))';
      }
      return;
    }

    // Handle menu opening for menu steps
    if (step.id === 'hamburger') {
      // For hamburger step, open menu using multiple methods
      console.log('Tour: Opening menu for hamburger step');
      
      // Method 1: Use state management
      if (onMenuToggle) {
        onMenuToggle(true);
      }
      
      // Method 2: Direct DOM manipulation as fallback
      setTimeout(() => {
        const hamburgerButton = document.querySelector('[data-tour-id="hamburger"]') as HTMLElement;
        if (hamburgerButton && !document.querySelector('.absolute.top-20')) {
          console.log('Tour: Menu not open, clicking hamburger button directly');
          hamburgerButton.click();
        }
      }, 100);
      
    } else if (step.id.startsWith('menu-')) {
      // For menu item steps, ensure menu is open using multiple methods
      console.log(`Tour: Opening menu for step ${step.id}`);
      
      // Method 1: Use state management
      if (onMenuToggle) {
        onMenuToggle(true);
      }
      
      // Method 2: Direct DOM manipulation as fallback
      setTimeout(() => {
        const hamburgerButton = document.querySelector('[data-tour-id="hamburger"]') as HTMLElement;
        const menuDropdown = document.querySelector('.absolute.top-20');
        
        if (hamburgerButton && !menuDropdown) {
          console.log('Tour: Menu not open for menu step, clicking hamburger button directly');
          hamburgerButton.click();
        }
      }, 50);
      
      // Method 3: Keep trying every 100ms until menu is visible
      const ensureMenuOpen = setInterval(() => {
        const menuDropdown = document.querySelector('.absolute.top-20');
        if (!menuDropdown) {
          const hamburgerButton = document.querySelector('[data-tour-id="hamburger"]') as HTMLElement;
          if (hamburgerButton) {
            console.log('Tour: Menu still not open, retrying...');
            hamburgerButton.click();
          }
        } else {
          clearInterval(ensureMenuOpen);
        }
      }, 200);
      
      // Clean up after 3 seconds
      setTimeout(() => clearInterval(ensureMenuOpen), 3000);
      
    } else if (step.id === 'heartcoins') {
      // Close menu for Heart Coins step
      if (onMenuToggle) {
        console.log('Tour: Closing menu for heartcoins step');
        onMenuToggle(false);
      }
    }

    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    // Helper function to find and setup the element
    const findAndSetupElement = (retryCount = 0) => {
      // Find target element
      console.log(`Tour: Looking for element with selector "${step.selector}", attempt ${retryCount + 1}`);
      
      // Debug: Check if menu is open
      const menuContainer = document.querySelector('[data-tour-id="hamburger"]')?.closest('.fixed');
      const menuDropdown = menuContainer?.querySelector('.absolute');
      console.log('Tour: Menu container found:', !!menuContainer);
      console.log('Tour: Menu dropdown found:', !!menuDropdown);
      if (menuDropdown) {
        console.log('Tour: Menu dropdown rect:', menuDropdown.getBoundingClientRect());
        console.log('Tour: Menu dropdown children:', Array.from(menuDropdown.querySelectorAll('[data-tour-id]')).map(el => el.getAttribute('data-tour-id')));
      }
      
      // Debug: List all elements with data-tour-id
      const allTourElements = document.querySelectorAll('[data-tour-id]');
      console.log('Tour: All elements with data-tour-id:', Array.from(allTourElements).map(el => el.getAttribute('data-tour-id')));
      
      const element = document.querySelector(step.selector) as HTMLElement;
      console.log('Tour: Target element found:', !!element);
      if (element) {
        setTargetElement(element);
        
        // Add highlight class
        element.classList.add('tour-highlight');
        
        // Position bubble
        positionBubble(element);

        // Don't trigger popout for menu items, just highlight them
        if (!step.id.startsWith('menu-') && step.id !== 'hamburger') {
          setTimeout(() => {
            triggerButtonPopout(step.id);
          }, 500);
        }

        // Add click listener to target element
        const handleElementClick = () => {
          if (currentStepIndex < TOUR_STEPS.length - 1) {
            handleNext();
          } else {
            handleFinish(true);
          }
        };
        element.addEventListener('click', handleElementClick);

        // Store cleanup function on element
        (element as any).__tourCleanup = () => {
          element.removeEventListener('click', handleElementClick);
          element.classList.remove('tour-highlight');
        };
      } else if (retryCount < 8) {
        // Retry finding the element after a short delay (up to 8 times, with longer delays for menu items)
        console.warn(`Tour target not found on attempt ${retryCount + 1}: ${step.selector}, retrying...`);
        const delay = step.id.startsWith('menu-') ? 300 * (retryCount + 1) : 100 * (retryCount + 1);
        setTimeout(() => findAndSetupElement(retryCount + 1), delay);
      } else {
        console.warn(`Tour target not found after ${retryCount + 1} attempts: ${step.selector}`);
        setTargetElement(null);
        setBubblePosition(null);
        // Fallback overlay background - more translucent
        if (overlayRef.current) {
          overlayRef.current.style.background = 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))';
        }
      }
    };

    // Start the element finding process
    if (step.id.startsWith('menu-')) {
      // Add a larger delay for menu items to allow menu to fully open and render
      setTimeout(() => findAndSetupElement(), 400);
    } else {
      findAndSetupElement();
    }
  };

  // Trigger the actual popout for each button
  const triggerButtonPopout = (stepId: string) => {
    const element = document.querySelector(`[data-tour-id="${stepId}"]`) as HTMLElement;
    if (element) {
      // Simulate a click on the button to trigger its popout
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(clickEvent);
    }
  };

  // Cleanup current step
  const cleanupCurrentStep = () => {
    if (targetElement) {
      const cleanup = (targetElement as any).__tourCleanup;
      if (cleanup) cleanup();
      delete (targetElement as any).__tourCleanup;
    }
    
    // Remove all tour highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    // Only close popouts if we're not transitioning to another menu step
    const nextStepIndex = currentStepIndex + 1;
    const nextStep = TOUR_STEPS[nextStepIndex];
    const currentStepIsMenu = currentStep?.id === 'hamburger' || currentStep?.id?.startsWith('menu-');
    const nextStepIsMenu = nextStep?.id === 'hamburger' || nextStep?.id?.startsWith('menu-');
    
    // Don't close popouts if transitioning from hamburger to menu or between menu items
    if (!(currentStepIsMenu && nextStepIsMenu)) {
      closeOpenPopouts();
    }
  };

  // Close any open button popouts
  const closeOpenPopouts = () => {
    // Look for close buttons in open popouts and click them
    const closeButtons = document.querySelectorAll('[class*="hologram-container"] button svg[viewBox="0 0 24 24"]');
    closeButtons.forEach(svg => {
      const closeButton = svg.closest('button') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    });
    
    // Also try to close the SoulSky popover specifically
    const soulSkyCloseButton = document.querySelector('.lyrics-popover-hud button[style*="close"]');
    if (soulSkyCloseButton) {
      (soulSkyCloseButton as HTMLButtonElement).click();
    }

    // Look for any visible popout panels and trigger their close
    const popoutPanels = document.querySelectorAll('[style*="z-index: 2147483647"]');
    popoutPanels.forEach(panel => {
      const closeBtn = panel.querySelector('button');
      if (closeBtn && closeBtn.textContent?.includes('×')) {
        closeBtn.click();
      }
    });
  };

  // Handle next step
  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      cleanupCurrentStep();
      setCurrentStepIndex(prev => prev + 1);
    } else {
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
      // Always set has_seen_tour to true whether completed or skipped
      await updateProfile({ has_seen_tour: true });
    } catch (error) {
      console.error("Error updating profile after tour:", error);
    }

    // Clean up
    cleanupCurrentStep();
    
    // Fade out
    setIsVisible(false);
    
    // Remove overlay class from body immediately
    document.body.classList.remove('tour-active');
    
    // Force remove any tour-related styles that might persist
    document.body.style.removeProperty('overflow');
    
    // Notify parent immediately for end modal, with delay for regular completion
    if (completed) {
      onFinish(completed);
    } else {
      setTimeout(() => {
        onFinish(completed);
      }, 300);
    }
  };

  // Setup tour when active
  useEffect(() => {
    if (active) {
      // Always start from the first step when (re)activating
      setCurrentStepIndex(0);
    }

    if (active) {
      // Add overlay class to body
      document.body.classList.add('tour-active');
      
      // Setup first step
      if (currentStep) {
        setupStep(currentStep);
      }
      
      // Fade in
      setIsVisible(true);
    } else {
      // Cleanup when deactivated
      cleanupCurrentStep();
      document.body.classList.remove('tour-active');
      setIsVisible(false);
    }

    return () => {
      cleanupCurrentStep();
      document.body.classList.remove('tour-active');
    };
  }, [active]);

  // Update step when index changes
  useEffect(() => {
    if (active && currentStep) {
      setupStep(currentStep);
      
      // Ensure menu stays open for menu steps with aggressive state management
      if (currentStep.id === 'hamburger' || currentStep.id.startsWith('menu-')) {
        if (onMenuToggle) {
          // Set menu open immediately
          onMenuToggle(true);
          
          // Keep forcing it open every 100ms while on menu steps
          const keepMenuOpen = setInterval(() => {
            onMenuToggle(true);
          }, 100);
          
          // Clean up interval when step changes
          return () => clearInterval(keepMenuOpen);
        }
      }
    }
  }, [currentStepIndex, active, onMenuToggle]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (targetElement && isVisible) {
        positionBubble(targetElement);
      }
    };

    if (active) {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [active, targetElement, isVisible]);

  if (!active && !endModalVisible) {
    return null;
  }

  // Safety check: if no current step and tour is active, don't render
  if (!currentStep && active) {
    console.warn(`No step found at index ${currentStepIndex}`);
    return null;
  }

  return (
    <>
      {/* Dim overlay */}
      <div
        ref={overlayRef}
        className={`tour-overlay fixed inset-0 z-[300] transition-opacity duration-300 ${
          isVisible && active ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
          background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0.25), rgba(0,0,0,0.45))'
        }}
      />

      {/* Speech bubble */}
      {active && bubblePosition && (
        <div
          className={`tour-bubble fixed z-[301] transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
          }`}
            style={{
              top: bubblePosition.top,
              left: bubblePosition.left,
              transform: 'translateX(-50%)',
              pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
          <div
            className="relative max-w-sm rounded-2xl p-6"
            style={{
              background: `linear-gradient(180deg, rgba(252,84,175,0.18), rgba(252,84,175,0.12))`,
              border: '1px solid rgba(252,84,175,0.35)',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(252,84,175,0.45), 0 0 80px rgba(252,84,175,0.25), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -6px 14px rgba(0,0,0,0.4)`,
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 opacity-70 tour-sparkles" style={{ 
                backgroundImage: `
                  radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 52%), 
                  radial-gradient(1.5px 1.5px at 70% 60%, rgba(252,84,175,0.6) 50%, transparent 52%), 
                  radial-gradient(1.2px 1.2px at 40% 80%, rgba(56,182,255,0.5) 50%, transparent 52%),
                  radial-gradient(1.8px 1.8px at 85% 20%, rgba(255,255,255,0.7) 50%, transparent 52%),
                  radial-gradient(1.3px 1.3px at 15% 75%, rgba(242,239,29,0.5) 50%, transparent 52%),
                  radial-gradient(2.2px 2.2px at 60% 15%, rgba(252,84,175,0.4) 50%, transparent 52%)
                ` 
              }} />
            </div>
            {/* Title */}
            <h3 
              className="text-xl font-bold text-white mb-3"
              style={{
                fontFamily: 'OrbitronLocal, InterLocal, system-ui, sans-serif',
                letterSpacing: '0.06em',
                textShadow: '0 0 15px rgba(252,84,175,0.65)',
              }}
            >
              {currentStep?.title || 'Loading...'}
            </h3>

            {/* Body */}
            <p className="text-white/90 mb-6 leading-relaxed">
              {currentStep?.body || 'Loading tour content...'}
            </p>

            {/* Controls */}
            <div className="flex justify-between items-center">
              {/* Skip button */}
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white transition-colors duration-200 text-sm underline"
              >
                Skip Tour
              </button>

              {/* Next button */}
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))`,
                  border: '1px solid rgba(252,84,175,0.5)',
                  boxShadow: `0 4px 8px rgba(0,0,0,0.3), 0 0 15px rgba(252,84,175,0.45), inset 0 1px 0 rgba(255,255,255,0.2)`,
                  textShadow: '0 0 8px rgba(252,84,175,0.9)',
                }}
              >
                {isLastStep ? 'Got it!' : 'Next'}
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center mt-4 space-x-2">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
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
        <div className={`fixed inset-0 z-[320] flex items-center justify-center transition-opacity duration-300 ${endModalVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-[321] w-full max-w-md mx-4 rounded-2xl p-8 text-center" style={{
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

      <style jsx global>{`
        /* Body class when tour is active */
        .tour-active {
          overflow: hidden;
        }

        /* Highlight effect for tour targets */
        .tour-highlight {
          position: relative !important;
          z-index: 310 !important;
          animation: tourGlow 2.2s ease-in-out infinite !important;
          border-radius: 12px !important;
          box-shadow:
            0 0 0 3px rgba(252,84,175,0.7) !important,
            0 0 24px rgba(252,84,175,0.9) !important,
            0 0 48px rgba(252,84,175,0.7) !important,
            0 0 96px rgba(252,84,175,0.5) !important;
        }

        /* Ensure tour highlight is visible above profile bar */
        .tour-highlight, 
        .tour-highlight * {
          pointer-events: auto !important;
          isolation: isolate !important;
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

        /* Pulsing glow animation */
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
