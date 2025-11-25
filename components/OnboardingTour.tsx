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
    id: "code",
    selector: "[data-tour-id='code'], [data-tour-id='beliefs']",
    title: "This is the CODE",
    body: "These are the Heartverse beliefs that guide your journey."
  },
  {
    id: "heartcoins",
    selector: "[data-tour-id='heartcoins']",
    title: "Heart Coins",
    body: "Heart Coins are your cosmic energy. Earn them by exploring, connecting, and showing up."
  },
  {
    id: "binder",
    selector: "[data-tour-id='binder'], [data-tour-id='cards']",
    title: "Binder",
    body: "Your Binder holds all CHXNDLER cards you collect. Some unlock by tier, others are rare drops."
  },
  {
    id: "stars",
    selector: "[data-tour-id='stars'], [data-tour-id='journal']",
    title: "Soul Star Journal",
    body: "Your Soul Star Journal is where you reflect, grow, and complete your daily elemental prompts."
  },
  {
    id: "badges",
    selector: "[data-tour-id='badges']",
    title: "Badges",
    body: "Badges honor your milestones as an Alien. They track streaks, community actions, and discoveries."
  }
];

interface OnboardingTourProps {
  active: boolean;
  onFinish: (completed: boolean) => void;
  onSkip?: () => void;
  endModalVisible?: boolean;
  onRestartFromEnd?: () => void;
}

export default function OnboardingTour({ active, onFinish, onSkip, endModalVisible, onRestartFromEnd }: OnboardingTourProps) {
  const { updateProfile } = useProfile();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Current step
  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Position bubble relative to target element
  const positionBubble = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position - try to place above the element
    let top = rect.top - 20; // 20px gap above element
    let left = rect.left + rect.width / 2; // Center horizontally on element

    // Adjust if bubble would go off-screen
    const bubbleWidth = 320; // Estimated bubble width
    const bubbleHeight = 120; // Estimated bubble height

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
  };

  // Find target element and set up highlighting
  const setupStep = (step: TourStep) => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    // Find target element
    const element = document.querySelector(step.selector) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Add highlight class
      element.classList.add('tour-highlight');
      
      // Position bubble
      positionBubble(element);

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
    } else {
      console.warn(`Tour target not found: ${step.selector}`);
      setTargetElement(null);
      setBubblePosition(null);
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
    
    // Remove overlay class from body
    document.body.classList.remove('tour-active');
    
    // Notify parent
    setTimeout(() => {
      onFinish(completed);
    }, 300);
  };

  // Setup tour when active
  useEffect(() => {
    if (active) {
      // Add overlay class to body
      document.body.classList.add('tour-active');
      
      // Setup first step
      setupStep(currentStep);
      
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
    }
  }, [currentStepIndex, active]);

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
          background: 'radial-gradient(120% 120% at 50% -10%, rgba(0,0,0,0.45), rgba(0,0,0,0.65))',
          backdropFilter: 'blur(6px)'
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
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: `radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.6) 50%, transparent 51%), radial-gradient(1.5px 1.5px at 70% 60%, rgba(255,255,255,0.5) 50%, transparent 51%), radial-gradient(1.2px 1.2px at 40% 80%, rgba(255,255,255,0.35) 50%, transparent 51%)` }} />
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
              {currentStep.title}
            </h3>

            {/* Body */}
            <p className="text-white/90 mb-6 leading-relaxed">
              {currentStep.body}
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

        .tour-highlight::after {
          content: '';
          position: absolute;
          inset: -10px;
          pointer-events: none;
          background-image:
            radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.7) 50%, transparent 52%),
            radial-gradient(1.5px 1.5px at 80% 40%, rgba(255,255,255,0.55) 50%, transparent 52%),
            radial-gradient(1.8px 1.8px at 60% 75%, rgba(255,255,255,0.5) 50%, transparent 52%);
          animation: twinkle 2.6s ease-in-out infinite;
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
          0%, 100% { opacity: 0.8; transform: translateY(0px); }
          50% { opacity: 0.4; transform: translateY(1px); }
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
