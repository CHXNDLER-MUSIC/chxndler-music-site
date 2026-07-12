"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useProfile } from '@/contexts/ProfileContext';
import { useUIState } from '@/lib/use-ui-state';
import { sfx } from '@/lib/sfx';
import WelcomeHomeModal from '@/components/WelcomeHomeModal';
import ProfilePopover from '@/components/ProfilePopover';
import { useUIStore } from '@/store/useUIStore';
import { ElementIcon, elementIcons } from '@/lib/elementIcons';

export default function AuthButton() {
  const { user, loading: authLoading, clearSession } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const hasEnteredHeartverse = useUIState((state) => state.hasEnteredHeartverse);
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showRelicsOnOpen, setShowRelicsOnOpen] = useState(false);
  const [showMerchOnOpen, setShowMerchOnOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { openNamePrompt, openElementSelection } = useUIStore();

  // Debug log auth and profile states
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.log('🔧 AuthButton state:', {
      browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      hasUser: !!user,
      userId: user?.id,
      hasProfile: !!profile,
      profileName: profile?.name,
      profileElement: profile?.element,
      profileComplete: profile?.profile_complete,
      authLoading,
      profileLoading,
      hasEnteredHeartverse,
      isDimmed: !hasEnteredHeartverse,
      isDisabled: !hasEnteredHeartverse && (authLoading || profileLoading),
      timestamp: new Date().toISOString()
    });
  }, [user, profile, authLoading, profileLoading, hasEnteredHeartverse]);

  // Debug keyboard shortcut to clear session (Ctrl+Alt+C)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.altKey && e.key === 'c') {
          console.log('DEBUG: Clearing session via keyboard shortcut');
          clearSession();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [clearSession]);

  // Listen for openProfilePopover event (triggered after relic/merch celebration)
  useEffect(() => {
    const handleOpenProfile = (event: Event) => {
      // Only open if user has a complete profile
      if (user && profile?.profile_complete) {
        const customEvent = event as CustomEvent<{ showRelics?: boolean; showMerch?: boolean }>;
        const shouldShowRelics = customEvent.detail?.showRelics ?? false;
        const shouldShowMerch = customEvent.detail?.showMerch ?? false;
        setShowRelicsOnOpen(shouldShowRelics);
        setShowMerchOnOpen(shouldShowMerch);
        // Ensure other displays (e.g., HeartCoin) close before opening profile
        try { window.dispatchEvent(new CustomEvent('closeHeartCoinModal')); } catch {}
        // Immediately signal cyan beam (will close other displays via DashboardApp)
        try { window.dispatchEvent(new CustomEvent('profilePopoverToggle', { detail: { open: true } })); } catch {}
        // Small delay to allow close animations to start before opening profile
        setTimeout(() => {
          setShowProfilePopover(true);
        }, 150);
      }
    };

    window.addEventListener('openProfilePopover', handleOpenProfile);
    return () => window.removeEventListener('openProfilePopover', handleOpenProfile);
  }, [user, profile?.profile_complete]);

  // Listen for closeProfilePopover event (triggered when hamburger menu opens)
  useEffect(() => {
    const handleCloseProfile = () => {
      setShowProfilePopover(false);
      window.dispatchEvent(new CustomEvent('profilePopoverToggle', { detail: { open: false } }));
    };

    window.addEventListener('closeProfilePopover', handleCloseProfile);
    return () => window.removeEventListener('closeProfilePopover', handleCloseProfile);
  }, []);

  // Get button display info
  const getButtonDisplayInfo = () => {
    // Mode A: Not logged in - only say LOG IN once we're sure there's no session
    if (!user) {
      if (authLoading) {
        return { text: 'Loading...', mode: 'loading' as const };
      }
      return { text: 'LOG IN', mode: 'login' as const };
    }

    // From here on a session exists (verifyOtp already established it). Never
    // fall back to 'LOG IN' again while `user` is set — a still-loading or
    // not-yet-created profile row (e.g. the DB trigger racing a brand-new
    // signup) is not an invalid session, just a momentary state. Signing the
    // user out here was destroying valid sessions and forcing re-verification.
    if (profileLoading || !profile) {
      return { text: 'Setting up...', mode: 'loading' as const };
    }

    // Mode C: Logged in but missing name or profile is incomplete
    if (!profile.name || !profile.profile_complete) {
      return { text: 'Finish setup', mode: 'setup' as const };
    }

    // Mode B: Complete profile - show name (icon will be separate)
    return { text: profile.name, mode: 'profile' as const };
  };

  // Get username text color based on element
  const getUsernameColor = (element: string | null) => {
    switch (element) {
      case 'heart': return '#FF69B4'; // Pink
      case 'water': return '#00BFFF'; // Blue
      case 'lightning': return '#FFD700'; // Yellow
      case 'darkness': return '#FFFFFF'; // White
      default: return '#FFFFFF';
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    if (process.env.NODE_ENV !== "production") console.log('AuthButton: Click handler called', { buttonMode, authLoading, profileLoading, hasEnteredHeartverse });
    try { sfx.play('click', 0.4); } catch {}

    // Only disable clicks before entering Heartverse
    if (!hasEnteredHeartverse && (authLoading || profileLoading)) {
      if (process.env.NODE_ENV !== "production") console.log('AuthButton: Click blocked due to loading state before Heartverse entry');
      return;
    }

    switch (buttonMode) {
      case 'login':
        // Mode A: Not logged in - close any open modals first, then show Welcome Home modal
        window.dispatchEvent(new CustomEvent('closeHeartCoinModal'));
        setShowWelcomeHome(true);
        break;
        
      case 'setup':
        // Mode C: Logged in but profile incomplete - restart onboarding flow
        if (!profile?.name) {
          // Missing name - open name prompt
          openNamePrompt();
        } else if (!profile?.element) {
          // Missing element - open element selection
          openElementSelection();
        } else {
          // Profile might exist but incomplete - try name prompt first
          openNamePrompt();
        }
        break;
        
      case 'profile':
        // Mode B: Complete profile - show profile popover
        const nextOpen = !showProfilePopover;
        if (nextOpen) {
          // Close other displays first (e.g., HeartCoin) before opening profile
          try { window.dispatchEvent(new CustomEvent('closeHeartCoinModal')); } catch {}
          // Immediately signal cyan beam (will close other displays via DashboardApp)
          try { window.dispatchEvent(new CustomEvent('profilePopoverToggle', { detail: { open: true } })); } catch {}
          setTimeout(() => {
            setShowProfilePopover(true);
          }, 150);
        } else {
          setShowProfilePopover(false);
          window.dispatchEvent(new CustomEvent('profilePopoverToggle', { detail: { open: false } }));
        }
        break;
    }
  };

  const { text: displayName, mode: buttonMode } = getButtonDisplayInfo();
  const currentElement = profile?.element || null;
  
  // Single source of truth for dimming: ONLY before entering Heartverse
  const isDimmed = !hasEnteredHeartverse;
  const isDisabled = !hasEnteredHeartverse && (authLoading || profileLoading);

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.6), 0 0 25px rgba(255, 255, 255, 0.4);
          }
        }
      `}</style>

      {/* Single unified clickable button containing both icon and text */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
            e.preventDefault();
            handleButtonClick();
          }
        }}
        disabled={isDisabled}
        className={`flex items-center font-medium text-xl relative flex-shrink-0 transition-all duration-200 cursor-pointer bg-transparent border-none focus:outline-none rounded pointer-events-auto ${
          isDimmed ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
        style={{
          color: getUsernameColor(currentElement),
          filter: 'brightness(1.2)',
          padding: '12px 18px',
          background: 'transparent',
          transition: 'all 0.3s ease',
          animation: buttonMode === 'login' && !isDimmed ? 'pulse 2s ease-in-out infinite' : 'none'
        }}
        title={
          buttonMode === 'login'
            ? "Click to log in and join the Heartverse"
            : buttonMode === 'setup'
            ? "Click to complete your profile setup"
            : buttonMode === 'loading'
            ? "Setting up your Heartverse profile..."
            : "Click to view your profile"
        }
        onMouseEnter={(e) => {
          if (!isDisabled && hasEnteredHeartverse) {
            try { sfx.play('hover', 0.8); } catch {}
            e.currentTarget.style.transform = 'scale(1.4)';
            e.currentTarget.style.textShadow = '0 0 10px rgba(255,255,255,1), 0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,255,255,0.8), 0 0 80px rgba(255,255,255,0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && hasEnteredHeartverse) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.textShadow = '';
          }
        }}
      >
        {/* Profile Image - only show when user has complete profile */}
        {buttonMode === 'profile' && currentElement && (
          <div className="mr-2">
            <img
              src={profile?.profile_image_url || elementIcons[currentElement as keyof typeof elementIcons] || elementIcons.heart}
              alt={currentElement}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                // Fallback to element icon if profile image fails to load
                const target = e.target as HTMLImageElement;
                target.src = elementIcons[currentElement as keyof typeof elementIcons] || elementIcons.heart;
              }}
            />
          </div>
        )}
        
        {/* Username/Login Text */}
        <span>
          {displayName}
        </span>
      </button>

      {/* Welcome Home Modal */}
      <WelcomeHomeModal 
        open={showWelcomeHome} 
        onClose={() => setShowWelcomeHome(false)} 
      />

      {/* Profile Popover */}
      <ProfilePopover
        isOpen={showProfilePopover}
        onClose={() => {
          setShowProfilePopover(false);
          setShowRelicsOnOpen(false);
          setShowMerchOnOpen(false);
          window.dispatchEvent(new CustomEvent('profilePopoverToggle', { detail: { open: false } }));
        }}
        anchorElement={buttonRef.current}
        showRelicsOnOpen={showRelicsOnOpen}
        showMerchOnOpen={showMerchOnOpen}
      />
    </>
  );
}
