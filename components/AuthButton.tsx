"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabaseClient } from '@/lib/supabaseClient';
import { sfx } from '@/lib/sfx';
import WelcomeHomeModal from '@/components/WelcomeHomeModal';
import ProfilePopover from '@/components/ProfilePopover';
import { useUIStore } from '@/store/useUIStore';

interface ProfileData {
  id: string;
  name: string | null;
  element: string | null;
}

export default function AuthButton() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { openNamePrompt, openElementSelection } = useUIStore();

  // Fetch profile data when user changes
  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('id, name, element')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('AuthButton: Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('AuthButton: Error in fetchProfile:', error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  // Get button display info
  const getButtonDisplayInfo = () => {
    // Loading state
    if (authLoading || profileLoading) {
      return { text: 'Loading...', mode: 'loading' as const };
    }

    // Mode A: Not logged in
    if (!user) {
      return { text: 'Log in', mode: 'login' as const };
    }

    // Mode C: Logged in but missing name
    if (!profile?.name) {
      return { text: 'Finish setup', mode: 'setup' as const };
    }

    // Mode B1: Logged in with name but no element - show name only
    if (!profile?.element) {
      return { text: profile.name, mode: 'setup' as const };
    }

    // Mode B2: Logged in with complete profile - show name and element
    const elementName = profile.element.charAt(0).toUpperCase() + profile.element.slice(1);
    return { 
      text: `${profile.name} • ${elementName}`, 
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
        className="font-medium text-lg relative flex-shrink-0 ml-3 transition-all duration-200 cursor-pointer bg-transparent border-none focus:outline-none disabled:opacity-50 rounded"
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
        {displayName}
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