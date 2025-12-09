"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useProfile } from '@/contexts/ProfileContext';
import { sfx } from '@/lib/sfx';
import WelcomeHomeModal from '@/components/WelcomeHomeModal';
import ProfilePopover from '@/components/ProfilePopover';
import { useUIStore } from '@/store/useUIStore';
import { ElementIcon } from '@/lib/elementIcons';

export default function AuthButton() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { openNamePrompt, openElementSelection } = useUIStore();

  // Debug log auth and profile states
  useEffect(() => {
    console.log('DEBUG AuthButton state:', {
      browser: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      hasUser: !!user,
      userId: user?.id,
      hasProfile: !!profile,
      profileName: profile?.name,
      profileElement: profile?.element,
      profileComplete: profile?.profile_complete,
      authLoading,
      profileLoading,
      timestamp: new Date().toISOString()
    });
  }, [user, profile, authLoading, profileLoading]);

  // Get button display info
  const getButtonDisplayInfo = () => {
    // Loading state - but only show briefly
    if ((authLoading || profileLoading) && user === undefined) {
      return { text: 'Loading...', mode: 'loading' as const };
    }

    // Mode A: Not logged in
    if (!user) {
      return { text: 'LOG IN', mode: 'login' as const };
    }

    // Mode C: Logged in but missing name or profile is incomplete
    if (!profile?.name || !profile?.profile_complete) {
      return { text: 'Finish setup', mode: 'setup' as const };
    }

    // Mode B: Complete profile - show name (icon will be separate)
    return { 
      text: profile.name, 
      mode: 'profile' as const 
    };
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
    try { sfx.play('click', 0.4); } catch {}

    if (authLoading || profileLoading) return;

    switch (buttonMode) {
      case 'login':
        // Mode A: Not logged in - show Welcome Home modal
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
        setShowProfilePopover(!showProfilePopover);
        break;
    }
  };

  const { text: displayName, mode: buttonMode } = getButtonDisplayInfo();
  const currentElement = profile?.element || null;

  return (
    <>
      {/* Single unified clickable button containing both icon and text */}
      <button 
        ref={buttonRef}
        onClick={handleButtonClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !authLoading && !profileLoading) {
            e.preventDefault();
            handleButtonClick();
          }
        }}
        disabled={authLoading || profileLoading}
        className="flex items-center font-medium text-lg relative flex-shrink-0 transition-all duration-200 cursor-pointer bg-transparent border-none focus:outline-none disabled:opacity-50 rounded"
        style={{ 
          color: getUsernameColor(currentElement),
          filter: 'brightness(1.2)',
          padding: '0',
          background: 'transparent',
          transition: 'all 0.3s ease'
        }}
        title={
          buttonMode === 'login' 
            ? "Click to log in and join the Heartverse"
            : buttonMode === 'setup'
            ? "Click to complete your profile setup"
            : "Click to view your profile"
        }
        onMouseEnter={(e) => {
          if (!authLoading && !profileLoading) {
            try { sfx.play('hover', 0.8); } catch {}
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!authLoading && !profileLoading) {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {/* Profile Image - only show when user has complete profile */}
        {buttonMode === 'profile' && currentElement && (
          <div className="mr-2">
            <ElementIcon 
              name={currentElement} 
              alt={currentElement} 
              width={24} 
              height={24}
              className="w-6 h-6 object-cover"
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
        onClose={() => setShowProfilePopover(false)}
        anchorElement={buttonRef.current}
      />
    </>
  );
}