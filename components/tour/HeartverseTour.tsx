'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetId?: string; // data-tour-id attribute value
  position?: 'top' | 'bottom' | 'left' | 'right';
  showNext?: boolean;
  showPrevious?: boolean;
  showSkip?: boolean;
  action?: 'open-menu' | 'close-menu' | 'open-heartcoins' | 'click-tab' | 'open-signal'; // Special actions to perform
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  closeTour: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'intro',
    title: 'Welcome aboard',
    content: 'This is your Heartverse spaceship. I\'ll show you the key controls so you can explore, reflect, and collect.',
    showNext: true,
    showPrevious: false,
    showSkip: true,
  },
  {
    id: 'hamburger',
    title: 'Main controls',
    content: 'Tap this menu to open the main controls of your ship. From here you can jump between codes, journeys, your journal, and more.',
    targetId: 'hamburger',
    position: 'bottom',
    action: 'open-menu',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'about',
    title: 'ABOUT',
    content: 'ABOUT tells you who CHXNDLER is, the story of the Heartverse, and the vision behind this world.',
    targetId: 'menu-about',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'journey',
    title: 'Journey',
    content: 'Journey is your main path through the Heartverse. New songs, chapters, and experiences appear here as you travel.',
    targetId: 'menu-journey',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'journal',
    title: 'Journal',
    content: 'Journal is your reflection space. Each day you can set an intention, answer a question, and record how you feel. This is how you earn Soul badges and grow over time.',
    targetId: 'menu-journal',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'binder',
    title: 'Binder',
    content: 'The Binder is where all your collected song cards live. Each card connects to a track or story in the Heartverse, and some unlock secret content.',
    targetId: 'menu-binder',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'badges',
    title: 'Badges',
    content: 'Badges are your achievements. You can earn them by reflecting, attending livestreams, sending Heart Coins, and exploring different parts of the ship.',
    targetId: 'menu-badges',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'signal',
    title: 'Signal',
    content: 'Signal is how the Heartverse talks to you. Think of it like transmissions from the ship. It might notify you about daily reflections, new releases, or special events.',
    targetId: 'menu-signal',
    position: 'right',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins',
    title: 'Heart Coins',
    content: 'Heart Coins are the energy of this world. You can earn them by listening, reflecting, joining events, and connecting with others. Later you will be able to use them for special rewards.',
    targetId: 'heartcoins',
    position: 'bottom',
    action: 'close-menu',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-earn',
    title: 'Earn Heart Coins',
    content: 'The Earn tab shows you how to collect Heart Coins through daily quests and bonus activities.',
    targetId: 'heartcoins-earn-tab',
    position: 'bottom',
    action: 'open-heartcoins',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-daily',
    title: 'Daily Quests',
    content: 'Daily quests refresh every day and give you ways to earn Heart Coins through simple activities like tapping your element or journaling.',
    targetId: 'heartcoins-daily-quests-tab',
    position: 'bottom',
    action: 'click-tab',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-bonus',
    title: 'Bonus Quests',
    content: 'Bonus quests offer extra ways to earn Heart Coins through special challenges and activities.',
    targetId: 'heartcoins-bonus-quests-tab',
    position: 'bottom',
    action: 'click-tab',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-use',
    title: 'Use Heart Coins',
    content: 'The Use tab lets you spend your Heart Coins on merchandise and trading cards.',
    targetId: 'heartcoins-use-tab',
    position: 'bottom',
    action: 'click-tab',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-merch',
    title: 'Merchandise',
    content: 'Browse and purchase CHXNDLER merchandise using your Heart Coins.',
    targetId: 'heartcoins-merch-tab',
    position: 'bottom',
    action: 'click-tab',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'heartcoins-cards',
    title: 'Trading Cards',
    content: 'Collect unique trading cards from the Heartverse using your Heart Coins.',
    targetId: 'heartcoins-cards-tab',
    position: 'bottom',
    action: 'click-tab',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'song-dropdown',
    title: 'Music Library',
    content: 'This is your music portal. Here you can choose any song from the Heartverse to listen to and experience.',
    targetId: 'song-dropdown',
    position: 'top',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'signal-streaming',
    title: 'Live Chat',
    content: 'Connect with other aliens in real-time during CHXNDLER Signal streams. This is your community space to share the experience together.',
    targetId: 'signal-streaming',
    position: 'right',
    action: 'open-signal',
    showNext: true,
    showPrevious: true,
    showSkip: true,
  },
  {
    id: 'outro',
    title: 'You are ready',
    content: 'That is the core of your ship. You can explore freely now, and you can always restart this tour from your profile if you ever want a refresher.',
    showNext: false,
    showPrevious: false,
    showSkip: false,
  },
];

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children, onMenuAction }: { 
  children: React.ReactNode;
  onMenuAction?: (action: 'open-menu' | 'close-menu') => void;
}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsActive(false);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    if (onMenuAction) {
      onMenuAction('close-menu');
    }
  }, [onMenuAction]);

  const closeTour = useCallback(() => {
    setIsActive(false);
    if (onMenuAction) {
      onMenuAction('close-menu');
    }
  }, [onMenuAction]);

  // Handle step actions
  useEffect(() => {
    if (isActive) {
      try {
        const step = tourSteps[currentStep];
        if (step?.action) {
          console.log(`Tour: Executing action "${step.action}" for step "${step.id}"`);
          
          if (step.action === 'open-menu' || step.action === 'close-menu') {
            if (onMenuAction) {
              onMenuAction(step.action);
            }
        } else if (step.action === 'open-heartcoins') {
          // First close the hamburger menu, then click the heart coins button
          setTimeout(() => {
            try {
              if (onMenuAction) {
                onMenuAction('close-menu');
              }
              
              // Wait for menu to close, then try to find and open heart coins
              const attemptHeartCoinsOpen = (attempts = 0) => {
                if (attempts > 5) {
                  console.error('Tour: Could not find Heart Coins button after 5 attempts');
                  return;
                }
                
                const heartCoinsButton = document.querySelector('[data-tour-id="heartcoins"]');
                
                if (heartCoinsButton && heartCoinsButton.offsetParent) {
                  // Element exists and is visible
                  console.log(`Tour: Found Heart Coins button, attempt ${attempts + 1}`);
                  try {
                    (heartCoinsButton as HTMLElement).click();
                    console.log('Tour: Heart Coins button clicked successfully');
                  } catch (error) {
                    console.error('Tour: Error clicking Heart Coins button:', error);
                  }
                } else {
                  // Element not found or not visible, retry
                  console.log(`Tour: Heart Coins button not ready, retrying... attempt ${attempts + 1}`);
                  setTimeout(() => attemptHeartCoinsOpen(attempts + 1), 200);
                }
              };
              
              // Start attempting to open heart coins after menu closes
              setTimeout(() => attemptHeartCoinsOpen(0), 500);
              
            } catch (error) {
              console.error('Tour: Error in open-heartcoins action:', error);
            }
          }, 100);
        } else if (step.action === 'click-tab') {
          // Click the specific tab element with retry logic
          setTimeout(() => {
            const attemptTabClick = (attempts = 0) => {
              if (attempts > 3) {
                console.error(`Tour: Could not find tab element ${step.targetId} after 3 attempts`);
                return;
              }
              
              try {
                const tabElement = document.querySelector(`[data-tour-id="${step.targetId}"]`);
                
                if (tabElement && tabElement.offsetParent) {
                  // Element exists and is visible
                  console.log(`Tour: Clicking tab element: ${step.targetId}, attempt ${attempts + 1}`);
                  (tabElement as HTMLElement).click();
                  console.log(`Tour: Tab ${step.targetId} clicked successfully`);
                } else {
                  // Element not found or not visible, retry
                  console.log(`Tour: Tab element ${step.targetId} not ready, retrying... attempt ${attempts + 1}`);
                  setTimeout(() => attemptTabClick(attempts + 1), 250);
                }
              } catch (error) {
                console.error(`Tour: Error clicking tab element ${step.targetId}:`, error);
                // Still retry in case it was a temporary error
                if (attempts < 3) {
                  setTimeout(() => attemptTabClick(attempts + 1), 250);
                }
              }
            };
            
            attemptTabClick(0);
          }, 400); // Increased initial delay
        } else if (step.action === 'open-signal') {
          // Open the signal popout first
          setTimeout(() => {
            if (onMenuAction) {
              onMenuAction('close-menu'); // Close hamburger menu first
            }
            // Wait for menu to close, then open signal
            setTimeout(() => {
              // This should trigger the pink beam/signal display
              const signalEvent = new CustomEvent('openSignal');
              window.dispatchEvent(signalEvent);
            }, 500);
          }, 100);
        }
        }
      } catch (error) {
        console.error('Tour: Error in step action handling:', error);
      }
    }
  }, [currentStep, isActive, onMenuAction]);

  const value: TourContextType = {
    isActive,
    currentStep,
    steps: tourSteps,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    closeTour,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && <TourOverlay />}
    </TourContext.Provider>
  );
}

export function useHeartverseTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useHeartverseTour must be used within a TourProvider');
  }
  return context;
}

function TourOverlay() {
  const { currentStep, steps, nextStep, previousStep, skipTour, closeTour } = useHeartverseTour();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  const currentStepData = steps[currentStep];

  useEffect(() => {
    try {
      if (currentStepData?.targetId) {
      // For menu items, add a delay to allow menu to render
      const isMenuStep = currentStepData.id === 'about' || 
                        currentStepData.id === 'journey' || 
                        currentStepData.id === 'journal' || 
                        currentStepData.id === 'binder' || 
                        currentStepData.id === 'badges' || 
                        currentStepData.id === 'signal';
                        
      // For Heart Coins modal elements, add delay to allow modal to render
      const isHeartCoinsStep = currentStepData.id.startsWith('heartcoins-') && 
                               currentStepData.id !== 'heartcoins';
                               
      // For signal elements, add delay to allow signal popout to render
      const isSignalStep = currentStepData.id === 'signal-streaming';
      
      const findElementAndPosition = (attempts = 0) => {
        console.log(`Tour: Looking for element with data-tour-id="${currentStepData.targetId}", attempt ${attempts + 1}`);
        const element = document.querySelector(`[data-tour-id="${currentStepData.targetId}"]`) as HTMLElement;
        console.log(`Tour: Element found:`, element);
        
        // If element not found and it's a special step, retry up to 5 times with 100ms delays
        if (!element && (isMenuStep || isHeartCoinsStep || isSignalStep) && attempts < 5) {
          console.log(`Tour: Element not found, retrying in 100ms...`);
          setTimeout(() => findElementAndPosition(attempts + 1), 100);
          return;
        }
        
        if (!element && (isMenuStep || isHeartCoinsStep || isSignalStep)) {
          console.error(`Tour: Could not find element after ${attempts + 1} attempts`);
        }
        
        setTargetElement(element);

        if (element) {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
          
          let top = rect.top + scrollTop;
          let left = rect.left + scrollLeft;

          // Position tooltip based on preferred position
          switch (currentStepData.position) {
            case 'bottom':
              top += rect.height + 20;
              left += rect.width / 2;
              break;
            case 'top':
              top -= 20;
              left += rect.width / 2;
              break;
            case 'right':
              // For menu items, position to the right of the entire dropdown menu
              if (isMenuStep) {
                // Get the hamburger menu element to calculate its actual width
                const hamburgerMenu = document.querySelector('[data-tour-id="hamburger"]')?.closest('.absolute') as HTMLElement;
                const viewportWidth = window.innerWidth;
                
                let menuWidth = 320; // Default fallback width
                if (hamburgerMenu) {
                  const menuRect = hamburgerMenu.getBoundingClientRect();
                  menuWidth = menuRect.width;
                }
                
                // Position tooltip to the right of the menu with additional margin
                // Use the larger of: menu width + 50px margin, or 50% viewport width
                left = Math.max(menuWidth + 50, viewportWidth * 0.5);
                top = rect.top + scrollTop + (rect.height / 2);
                
                console.log(`Tour: Positioning menu step at left: ${left}, menu width: ${menuWidth}, viewport width: ${viewportWidth}`);
              } else {
                top += rect.height / 2;
                left += rect.width + 20;
              }
              break;
            case 'left':
              top += rect.height / 2;
              left -= 20;
              break;
            default:
              top += rect.height + 20;
              left += rect.width / 2;
          }

          setTooltipPosition({ top, left });

          // Scroll element into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (!isMenuStep) {
          // For non-menu steps, clear target element if not found
          setTargetElement(null);
        }
      };

      // Start finding the element
      if (isMenuStep) {
        // Add small delay for menu steps to allow menu animation
        setTimeout(() => findElementAndPosition(0), 150);
      } else if (isHeartCoinsStep) {
        // Add delay for Heart Coins modal elements to allow modal to render
        setTimeout(() => findElementAndPosition(0), 400);
      } else if (isSignalStep) {
        // Add delay for signal popout elements to allow popout to render
        setTimeout(() => findElementAndPosition(0), 800);
      } else {
        findElementAndPosition(0);
      }
      } else {
        setTargetElement(null);
      }
    } catch (error) {
      console.error('Tour: Error in element positioning:', error);
      setTargetElement(null);
    }
  }, [currentStep, currentStepData]);

  const handleAction = (action: 'next' | 'previous' | 'skip' | 'close') => {
    switch (action) {
      case 'next':
        if (currentStep === steps.length - 1) {
          closeTour();
        } else {
          nextStep();
        }
        break;
      case 'previous':
        previousStep();
        break;
      case 'skip':
        skipTour();
        break;
      case 'close':
        closeTour();
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => handleAction('close')} />
      
      {/* Highlight for target element */}
      {targetElement && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top + window.scrollY - 8,
            left: targetElement.getBoundingClientRect().left + window.scrollX - 8,
            width: targetElement.getBoundingClientRect().width + 16,
            height: targetElement.getBoundingClientRect().height + 16,
            background: 'transparent',
            border: '2px solid rgb(34, 197, 94)',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgb(34, 197, 94, 0.5), inset 0 0 20px rgb(34, 197, 94, 0.1)',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={`absolute pointer-events-auto bg-gray-900/95 backdrop-blur-lg border border-green-500/30 rounded-2xl p-6 max-w-xs sm:max-w-sm shadow-2xl ${
          !currentStepData.targetId ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={
          currentStepData.targetId
            ? {
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                transform: currentStepData.position === 'left' ? 'translateX(-100%)' :
                          currentStepData.position === 'top' ? 'translate(-50%, -100%)' :
                          currentStepData.position === 'bottom' ? 'translateX(-50%)' :
                          (currentStepData.position === 'right' && 
                           (currentStepData.id === 'about' || 
                            currentStepData.id === 'journey' || 
                            currentStepData.id === 'journal' || 
                            currentStepData.id === 'binder' || 
                            currentStepData.id === 'badges' || 
                            currentStepData.id === 'signal' ||
                            currentStepData.id === 'signal-streaming')) ? 'translateY(-50%)' :
                          'none',
              }
            : {}
        }
      >
        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 to-blue-500/20 blur-sm -z-10" />
        
        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex justify-between items-center">
            <div className="text-green-400 text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </div>
            <button
              onClick={() => handleAction('close')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            {currentStepData.title}
          </h3>

          {/* Content */}
          <p className="text-gray-200 leading-relaxed">
            {currentStepData.content}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {currentStepData.showPrevious && (
              <button
                onClick={() => handleAction('previous')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            )}

            {currentStepData.showNext && (
              <button
                onClick={() => handleAction('next')}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-colors flex-1"
              >
                {currentStep === steps.length - 1 ? 'Start exploring' : 'Next'}
              </button>
            )}

            {currentStepData.showSkip && (
              <button
                onClick={() => handleAction('skip')}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Skip tour
              </button>
            )}

            {currentStep === steps.length - 1 && (
              <button
                onClick={() => handleAction('close')}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-colors flex-1"
              >
                Start exploring
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}