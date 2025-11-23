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
    id: "beliefs",
    selector: "[data-tour-id='beliefs']",
    title: "Beliefs shape the Heartverse",
    body: "This is your inner code and values. You can always come back and change them as you grow."
  },
  {
    id: "heartcoins",
    selector: "[data-tour-id='heartcoins']",
    title: "These are your Heart Coins",
    body: "You earn Heart Coins by listening, exploring and showing up. They unlock new parts of the Heartverse."
  },
  {
    id: "cards",
    selector: "[data-tour-id='cards']",
    title: "Your CHXNDLER cards live here",
    body: "These are your cosmic collectibles. Songs and stories you unlock along your journey."
  },
  {
    id: "journal",
    selector: "[data-tour-id='journal']",
    title: "This is your Soul Star Journal",
    body: "Each day you receive an intention and reflection. You can write from your heart and cast your words into the stars."
  },
  {
    id: "badges",
    selector: "[data-tour-id='badges']",
    title: "These are your Heartverse badges",
    body: "You earn badges by listening, collecting, returning and supporting. They tell the story of who you are becoming."
  }
];

interface OnboardingTourProps {
  active: boolean;
  onFinish: (completed: boolean) => void;
}

export default function OnboardingTour({ active, onFinish }: OnboardingTourProps) {
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

  if (!active || !currentStep) {
    return null;
  }

  return (
    <>
      {/* Dim overlay */}
      <div
        ref={overlayRef}
        className={`tour-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      />

      {/* Speech bubble */}
      {bubblePosition && (
        <div
          className={`tour-bubble fixed z-[301] transition-all duration-300 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
            transform: 'translateX(-50%)',
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
        >
          <div
            className="relative max-w-sm rounded-2xl border border-cyan-400/30 shadow-2xl p-6"
            style={{
              background: `
                linear-gradient(180deg, rgba(25,227,255,0.15), rgba(25,227,255,0.08)),
                radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.06), rgba(255,255,255,0) 42%)
              `,
              backdropFilter: 'blur(16px)',
              boxShadow: `
                0 20px 40px rgba(0,0,0,0.6),
                0 0 40px rgba(25,227,255,0.4),
                0 0 80px rgba(25,227,255,0.2),
                inset 0 2px 0 rgba(255,255,255,0.2),
                inset 0 -6px 14px rgba(0,0,0,0.4)
              `,
            }}
          >
            {/* Title */}
            <h3 
              className="text-xl font-bold text-white mb-3"
              style={{
                fontFamily: 'OrbitronLocal, InterLocal, system-ui, sans-serif',
                letterSpacing: '0.06em',
                textShadow: '0 0 15px rgba(25,227,255,0.6)',
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
                className="text-white/60 hover:text-white/80 transition-colors duration-200 text-sm underline"
              >
                Skip tour
              </button>

              {/* Next button */}
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200
                         hover:scale-105 active:scale-95"
                style={{
                  background: `
                    linear-gradient(135deg, rgba(25,227,255,0.8), rgba(25,227,255,0.6)),
                    radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.1), rgba(255,255,255,0) 42%)
                  `,
                  border: '1px solid rgba(25,227,255,0.4)',
                  boxShadow: `
                    0 4px 8px rgba(0,0,0,0.3),
                    0 0 15px rgba(25,227,255,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.2)
                  `,
                  textShadow: '0 0 8px rgba(25,227,255,0.8)',
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

      <style jsx global>{`
        /* Body class when tour is active */
        .tour-active {
          overflow: hidden;
        }

        /* Highlight effect for tour targets */
        .tour-highlight {
          position: relative !important;
          z-index: 310 !important;
          animation: tourGlow 2s ease-in-out infinite !important;
          border-radius: 12px !important;
          box-shadow: 
            0 0 0 3px rgba(25,227,255,0.6) !important,
            0 0 20px rgba(25,227,255,0.8) !important,
            0 0 40px rgba(25,227,255,0.6) !important,
            0 0 80px rgba(25,227,255,0.4) !important;
        }

        /* Pulsing glow animation */
        @keyframes tourGlow {
          0%, 100% {
            box-shadow: 
              0 0 0 3px rgba(25,227,255,0.6),
              0 0 20px rgba(25,227,255,0.8),
              0 0 40px rgba(25,227,255,0.6),
              0 0 80px rgba(25,227,255,0.4);
            filter: brightness(1.1) saturate(1.1);
          }
          50% {
            box-shadow: 
              0 0 0 4px rgba(25,227,255,0.8),
              0 0 30px rgba(25,227,255,1.0),
              0 0 60px rgba(25,227,255,0.8),
              0 0 120px rgba(25,227,255,0.6);
            filter: brightness(1.2) saturate(1.2);
          }
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