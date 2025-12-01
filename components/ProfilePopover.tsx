"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { useTour } from '@/contexts/TourContext';
import { supabaseClient } from '@/lib/supabaseClient';
import { elementIcons } from '@/lib/elementIcons';
import { sfx } from '@/lib/sfx';

interface Badge {
  id: string;
  badge_name: string;
  icon_url: string | null;
  description: string | null;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: Badge;
}

interface Relic {
  id: string;
  relic_name: string;
  icon_url: string | null;
  description: string | null;
}

interface UserRelic {
  id: string;
  relic_id: string;
  earned_at: string;
  relics: Relic;
}

interface AvailableImage {
  id: string;
  url: string;
  name: string;
  type: 'element' | 'badge' | 'relic';
}

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
}

export default function ProfilePopover({ isOpen, onClose, anchorElement }: ProfilePopoverProps) {
  const { profile, user, updateProfile, refreshProfile } = useProfile();
  const { start: startTour } = useTour();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [editedName, setEditedName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [availableImages, setAvailableImages] = useState<AvailableImage[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userRelics, setUserRelics] = useState<UserRelic[]>([]);
  const [showElementMenu, setShowElementMenu] = useState(false);
  const [showRelicsModal, setShowRelicsModal] = useState(false);
  const [showElementInfo, setShowElementInfo] = useState(false);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize form state when profile changes
  useEffect(() => {
    if (profile) {
      setSelectedImageUrl(profile.profile_image_url || getElementImageUrl(profile.element));
      setEditedName(profile.name || '');
    }
  }, [profile]);

  // Fetch unlocked badges and relics when component opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUnlockedItems();
    }
  }, [isOpen, user]);

  // Close on escape key and outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showElementInfo) {
          setShowElementInfo(false);
        } else if (showRelicsModal) {
          setShowRelicsModal(false);
        } else if (showElementMenu) {
          setShowElementMenu(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        if (showElementInfo) {
          setShowElementInfo(false);
        } else if (showRelicsModal) {
          setShowRelicsModal(false);
        } else if (showElementMenu) {
          setShowElementMenu(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, showElementMenu, showRelicsModal, showElementInfo]);

  // Helper to get element image URL
  const getElementImageUrl = (element: string | null): string => {
    if (!element) return elementIcons.heart; // Default to heart
    return elementIcons[element as keyof typeof elementIcons] || elementIcons.heart;
  };

  // Get all 4 element options for the selection menu
  const getAllElements = () => {
    return [
      { name: 'heart', url: elementIcons.heart, label: 'Heart' },
      { name: 'water', url: elementIcons.water, label: 'Water' },
      { name: 'lightning', url: elementIcons.lightning, label: 'Lightning' },
      { name: 'darkness', url: elementIcons.darkness, label: 'Darkness' }
    ];
  };

  // Handle cycling through elements
  const cycleToNextElement = () => {
    const elements = getAllElements();
    setCurrentElementIndex((prev) => (prev + 1) % elements.length);
    try { sfx.play('click', 0.4); } catch {}
  };

  // Get current element data for display
  const getCurrentElementData = () => {
    const elements = getAllElements();
    return elements[currentElementIndex];
  };

  // Get element information including descriptions
  const getElementInfo = (elementName: string) => {
    const elementData: Record<string, { 
      title: string; 
      subtitle: string; 
      description: string; 
      icon: string;
      color: string;
    }> = {
      heart: {
        title: 'Heart',
        subtitle: 'love and connection',
        description: 'HEART holds warmth, love, and deep connection. It represents bonds, empathy, and healing. These songs are intimate, emotional, and nurturing, creating safe spaces where vulnerability becomes strength and relationships flourish.',
        icon: elementIcons.heart,
        color: '#FF6B9D'
      },
      water: {
        title: 'Water',
        subtitle: 'flow and adaptability', 
        description: 'WATER holds flow, adaptability, and emotional depth. It represents intuition, dreams, and the subconscious. These songs are fluid, dreamy, and reflective, moving like currents through different moods and states of being.',
        icon: elementIcons.water,
        color: '#4A90E2'
      },
      lightning: {
        title: 'Lightning',
        subtitle: 'passion and courage',
        description: 'LIGHTNING holds energy, passion, and awakening. It represents breakthroughs, inspiration, and sudden clarity. These songs are fast, alive, and electric, striking with intensity and capturing the rush of change when everything shifts at once.',
        icon: elementIcons.lightning,
        color: '#FFD700'
      },
      darkness: {
        title: 'Darkness',
        subtitle: 'mystery and transformation',
        description: 'DARKNESS holds mystery, depth, and transformation. It represents the unknown, introspection, and shadow work. These songs are haunting, powerful, and transformative, embracing the beauty found in life\'s deeper, more complex emotions.',
        icon: elementIcons.darkness,
        color: '#8B5CF6'
      }
    };

    return elementData[elementName] || elementData.heart;
  };

  // Fetch user's unlocked badges and relics
  const fetchUnlockedItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch unlocked badges
      const { data: badgeData, error: badgeError } = await supabaseClient
        .from('user_badges')
        .select(`
          id,
          badge_id,
          earned_at,
          badges (
            id,
            badge_name,
            icon_url,
            description
          )
        `)
        .eq('user_id', user.id);

      if (badgeError) {
        console.error('Error fetching user badges:', badgeError);
      } else {
        setUserBadges(badgeData || []);
      }

      // Fetch unlocked relics (if table exists)
      try {
        const { data: relicData, error: relicError } = await supabaseClient
          .from('user_relics')
          .select(`
            id,
            relic_id,
            earned_at,
            relics (
              id,
              relic_name,
              icon_url,
              description
            )
          `)
          .eq('user_id', user.id);

        if (relicError) {
          console.error('Error fetching user relics:', relicError);
          setUserRelics([]);
        } else {
          setUserRelics(relicData || []);
        }
      } catch (error) {
        // Table might not exist, that's okay
        console.log('user_relics table not found, skipping relics');
        setUserRelics([]);
      }

      // Build available images array
      buildAvailableImages(badgeData || [], []);
    } catch (error) {
      console.error('Error fetching unlocked items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build the list of available images for selection
  const buildAvailableImages = (badges: UserBadge[], relics: UserRelic[]) => {
    const images: AvailableImage[] = [];

    // Add current user's element image
    if (profile?.element) {
      const elementUrl = getElementImageUrl(profile.element);
      images.push({
        id: `element-${profile.element}`,
        url: elementUrl,
        name: `${profile.element.charAt(0).toUpperCase()}${profile.element.slice(1)} Element`,
        type: 'element'
      });
    }

    // Add unlocked badges
    badges.forEach((userBadge) => {
      if (userBadge.badges?.icon_url) {
        images.push({
          id: `badge-${userBadge.badges.id}`,
          url: userBadge.badges.icon_url,
          name: userBadge.badges.badge_name,
          type: 'badge'
        });
      }
    });

    // Add unlocked relics
    relics.forEach((userRelic) => {
      if (userRelic.relics?.icon_url) {
        images.push({
          id: `relic-${userRelic.relics.id}`,
          url: userRelic.relics.icon_url,
          name: userRelic.relics.relic_name,
          type: 'relic'
        });
      }
    });

    setAvailableImages(images);
  };

  // Handle saving changes
  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      // Update profile with new name and profile_image_url
      const updates: any = {};
      
      if (editedName.trim() !== profile.name) {
        updates.name = editedName.trim();
      }
      
      if (selectedImageUrl !== (profile.profile_image_url || getElementImageUrl(profile.element))) {
        updates.profile_image_url = selectedImageUrl;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabaseClient
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
          return;
        }

        // Refresh profile context
        await refreshProfile();
        
        try {
          sfx.play('success', 0.6);
        } catch {}
      }

      onClose();
    } catch (error) {
      console.error('Error saving profile changes:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle starting the guided tour
  const handleStartTour = () => {
    try {
      sfx.play('click', 0.6);
    } catch {}
    
    onClose();
    startTour();
  };

  // Handle sign out
  const handleSignOut = async () => {
    try { sfx.play('click', 0.8); } catch {}
    
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('Successfully signed out');
        onClose();
        // Redirect to home page after sign out
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Hologram base glow */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          pointerEvents: 'none',
          paddingTop: '200px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Profile Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          marginTop: '-160px'
        }}
      >
        <div
          className="profile-hologram-container"
          style={{
            width: 'min(92vw, 500px)',
            minHeight: 'auto',
            padding: '20px 24px 24px 24px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative'
          }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />

          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgba(0,255,255,0.2)',
              border: '1px solid rgba(0,255,255,0.6)',
              color: '#00FFFF',
              boxShadow: '0 0 10px rgba(0,255,255,0.3)',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
          
          {/* Checkmark confirmation button - Top Right */}
          {(editedName.trim() !== profile?.name || selectedImageUrl !== (profile?.profile_image_url || getElementImageUrl(profile?.element))) && (
            <button
              onClick={handleSave}
              disabled={saving || !editedName.trim()}
              className="absolute top-4 right-16 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{
                background: 'rgba(0,255,0,0.2)',
                border: '1px solid rgba(0,255,0,0.6)',
                color: '#00FF00',
                boxShadow: '0 0 10px rgba(0,255,0,0.3)',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              title="Save changes"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 12l5 5L20 7"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Header */}
          <div 
            className="text-center mb-4"
            style={{ 
              color: '#00FFFF', 
              textShadow: '0 0 8px rgba(0,255,255,0.6)', 
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            PROFILE
          </div>
          
          {/* Thin cyan neon line */}
          <div 
            className="w-full h-px mb-6"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          {/* SELECTED IMAGE Section */}
          <div className="mb-6">
            <h3 
              className="text-sm mb-3 font-semibold"
              style={{ 
                color: '#00FFFF', 
                textShadow: '0 0 4px rgba(0,255,255,0.6)' 
              }}
            >
              SELECTED IMAGE
            </h3>
            
            {/* Current Profile Image - Clickable */}
            <div className="flex justify-center mb-4 relative">
              <button 
                onClick={() => {
                  setShowElementMenu(!showElementMenu);
                  try { sfx.play('click', 0.4); } catch {}
                }}
                className="w-20 h-20 rounded-full border-2 border-cyan-400/60 overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"
                style={{
                  background: 'rgba(0,255,255,0.1)',
                  boxShadow: '0 0 20px rgba(0,255,255,0.4)'
                }}
                title="Click to change element"
              >
                <img
                  src={selectedImageUrl || getElementImageUrl(profile?.element)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getElementImageUrl(profile?.element);
                  }}
                />
              </button>

              {/* View Relics Button - Small Circle */}
              <button
                onClick={() => {
                  setShowRelicsModal(true);
                  try { sfx.play('click', 0.6); } catch {}
                }}
                className="absolute w-10 h-10 rounded-full border-2 border-cyan-400/60 bg-cyan-400/10 hover:border-cyan-400/80 hover:bg-cyan-400/20 transition-all duration-200 hover:scale-110 flex items-center justify-center overflow-hidden"
                style={{
                  left: 'calc(50% + 50px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 15px rgba(0,255,255,0.3)'
                }}
                title="View Relics"
              >
                <img
                  src="/relics.webp"
                  alt="Relics"
                  className="w-6 h-6 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '🏛️';
                      parent.style.fontSize = '14px';
                    }
                  }}
                />
              </button>

              {/* Element Selection Menu */}
              {showElementMenu && (
                <div 
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50"
                  style={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(0,255,255,0.6)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 25px rgba(0,255,255,0.3)',
                    backdropFilter: 'blur(12px)',
                    padding: '12px'
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {getAllElements().map((element) => (
                      <button
                        key={element.name}
                        onClick={() => {
                          setSelectedImageUrl(element.url);
                          setShowElementMenu(false);
                          try { sfx.play('join', 0.6); } catch {}
                        }}
                        className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 ${
                          selectedImageUrl === element.url
                            ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]'
                            : 'border-white/30 hover:border-cyan-400/60'
                        }`}
                        title={element.label}
                      >
                        <img
                          src={element.url}
                          alt={element.label}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* PROFILE INFO Section */}
          <div className="space-y-4">
            <h3 
              className="text-sm mb-3 font-semibold"
              style={{ 
                color: '#00FFFF', 
                textShadow: '0 0 4px rgba(0,255,255,0.6)' 
              }}
            >
              PROFILE INFO
            </h3>
            
            {/* Display Name */}
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Name:</span>
              <span 
                className="font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                }}
              >
                {profile?.name || 'Unknown'}
              </span>
            </div>

            {/* Element */}
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Element:</span>
              <button
                onClick={() => {
                  if (profile?.element) {
                    // Set the current element index to match the user's element
                    const elements = getAllElements();
                    const userElementIndex = elements.findIndex(el => el.name === profile.element);
                    if (userElementIndex !== -1) {
                      setCurrentElementIndex(userElementIndex);
                    }
                    setShowElementInfo(!showElementInfo);
                    try { sfx.play('click', 0.4); } catch {}
                  }
                }}
                className="font-bold transition-all duration-200 hover:scale-105 cursor-pointer"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)',
                  background: 'none',
                  border: 'none'
                }}
                title={profile?.element ? "Click to view element details" : undefined}
              >
                {profile?.element ? profile.element.charAt(0).toUpperCase() + profile.element.slice(1) : 'None'}
              </button>
            </div>

            {/* HeartCoins */}
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">HeartCoins:</span>
              <span 
                className="font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                }}
              >
                {profile?.heartcoin_balance || 0}
              </span>
            </div>

            {/* Streak */}
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Daily Streak:</span>
              <span 
                className="font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                }}
              >
                {(profile as any)?.streak_days || 0} days
              </span>
            </div>
          </div>

          {/* Element Info Display */}
          {showElementInfo && profile?.element && (
            <div className="mt-6 p-4 rounded-lg border-2 border-opacity-60 bg-opacity-20 relative"
              style={{
                borderColor: getElementInfo(getCurrentElementData().name).color,
                backgroundColor: `${getElementInfo(getCurrentElementData().name).color}20`,
                boxShadow: `0 0 20px ${getElementInfo(getCurrentElementData().name).color}40`
              }}
            >
              {/* Close button - Top Right */}
              <button
                onClick={() => {
                  setShowElementInfo(false);
                  try { sfx.play('close', 0.6); } catch {}
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgba(0,255,255,0.2)',
                  border: '1px solid rgba(0,255,255,0.6)',
                  color: '#00FFFF',
                  boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>

              {/* Main Headers */}
              <div className="text-center mb-6">
                <h2 
                  className="text-lg font-bold mb-2"
                  style={{ 
                    color: '#8B5CF6', 
                    textShadow: '0 0 8px rgba(139,92,246,0.6)',
                    letterSpacing: '0.1em'
                  }}
                >
                  THE ELEMENTS OF THE HEARTVERSE
                </h2>
                <h3 
                  className="text-base font-semibold"
                  style={{ 
                    color: '#FFFFFF', 
                    textShadow: '0 0 4px rgba(255,255,255,0.6)' 
                  }}
                >
                  EXPLORE EACH ELEMENT'S POWER
                </h3>
              </div>

              {/* Thin separator line */}
              <div 
                className="w-full h-px mb-6"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8) 20%, rgba(139,92,246,1) 50%, rgba(139,92,246,0.8) 80%, transparent)',
                  boxShadow: '0 0 4px rgba(139,92,246,0.6)'
                }}
              />

              {/* Header with element icon and title - Clickable */}
              <button 
                onClick={cycleToNextElement}
                className="flex items-center space-x-3 mb-4 w-full text-left hover:scale-105 transition-all duration-200 cursor-pointer"
                title="Click to cycle through elements"
              >
                <div className="w-12 h-12 rounded-lg border-2 overflow-hidden"
                  style={{
                    borderColor: getElementInfo(getCurrentElementData().name).color,
                    backgroundColor: `${getElementInfo(getCurrentElementData().name).color}30`
                  }}
                >
                  <img
                    src={getElementInfo(getCurrentElementData().name).icon}
                    alt={getElementInfo(getCurrentElementData().name).title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold"
                    style={{
                      color: getElementInfo(getCurrentElementData().name).color,
                      textShadow: `0 0 8px ${getElementInfo(getCurrentElementData().name).color}60`
                    }}
                  >
                    {getElementInfo(getCurrentElementData().name).title} = {getElementInfo(getCurrentElementData().name).subtitle}
                  </h3>
                </div>
              </button>

              {/* Description */}
              <p className="text-sm leading-relaxed text-white/90 mb-4">
                {getElementInfo(getCurrentElementData().name).description}
              </p>

              {/* All Elements Grid */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-semibold text-cyan-400 mb-3 text-center">
                  ALL ELEMENTS
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {getAllElements().map((element, index) => {
                    const elementData = getElementInfo(element.name);
                    const isCurrentlyViewed = getCurrentElementData().name === element.name;
                    const isUserElement = profile?.element === element.name;
                    
                    return (
                      <button
                        key={element.name}
                        onClick={() => {
                          setCurrentElementIndex(index);
                          try { sfx.play('click', 0.4); } catch {}
                        }}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105 cursor-pointer ${
                          isCurrentlyViewed 
                            ? 'shadow-lg' 
                            : 'opacity-60 hover:opacity-80'
                        }`}
                        style={{
                          borderColor: isCurrentlyViewed ? elementData.color : 'rgba(255,255,255,0.3)',
                          backgroundColor: isCurrentlyViewed ? `${elementData.color}30` : 'rgba(0,0,0,0.3)',
                          boxShadow: isCurrentlyViewed ? `0 0 15px ${elementData.color}60` : 'none'
                        }}
                        title={`View ${element.label} element info`}
                      >
                        <img
                          src={element.url}
                          alt={element.label}
                          className="w-full h-full object-cover"
                        />
                        {isUserElement && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-lg"
                            title="Your current element"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ALIGN Button */}
              <button
                onClick={() => {
                  // Handle align functionality here - for now just play sound
                  try { sfx.play('success', 0.8); } catch {}
                }}
                className="mt-4 w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.15))',
                  border: '1px solid rgba(139,92,246,0.6)',
                  color: '#8B5CF6',
                  textShadow: '0 0 8px rgba(139,92,246,0.6)',
                  boxShadow: '0 0 15px rgba(139,92,246,0.3)'
                }}
                title="Align with this element's energy"
              >
                ALIGN
              </button>
            </div>
          )}


          {/* Start Tour Button */}
          <div className="mt-6 pt-4" style={{
            borderTop: '1px solid rgba(0,255,255,0.2)'
          }}>
            <button
              onClick={handleStartTour}
              className="w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,255,0.25), rgba(0,255,255,0.15))',
                border: '1px solid rgba(0,255,255,0.5)',
                color: '#00FFFF',
                textShadow: '0 0 8px rgba(0,255,255,0.7)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(0,255,255,0.3)'
              }}
              title="Take a guided tour of the Heartverse"
            >
              ✨ Start Tour
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(255,80,80,0.25), rgba(255,80,80,0.15))',
                border: '1px solid rgba(255,80,80,0.5)',
                color: '#FF5050',
                textShadow: '0 0 8px rgba(255,80,80,0.7)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,80,80,0.2)',
                fontSize: '14px'
              }}
              title="Sign out of your account"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Relics Modal */}
      {showRelicsModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 2147483649,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowRelicsModal(false)}
        >
          <div
            className="relative"
            style={{
              width: 'min(95vw, 600px)',
              minHeight: 'auto',
              padding: '24px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(0,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#00FFFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowRelicsModal(false);
                try { sfx.play('close', 0.8); } catch {}
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{
                background: 'rgba(0,255,255,0.2)',
                border: '1px solid rgba(0,255,255,0.6)',
                color: '#00FFFF',
                boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>

            {/* Header */}
            <div 
              className="text-center mb-6"
              style={{ 
                color: '#00FFFF', 
                textShadow: '0 0 8px rgba(0,255,255,0.6)', 
                fontSize: '20px',
                fontWeight: 'bold'
              }}
            >
              RELICS COLLECTION
            </div>

            {/* Thin cyan neon line */}
            <div 
              className="w-full h-px mb-6"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(0,255,255,0.6)'
              }}
            />

            {/* Relics Grid - Greyed out containers */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border-2 border-white/20 bg-black/40 flex items-center justify-center relative overflow-hidden"
                  style={{
                    filter: 'grayscale(100%)',
                    opacity: 0.4
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <div className="text-white/30 text-lg">🏛️</div>
                  <div 
                    className="absolute bottom-1 right-1 text-xs text-white/20"
                    style={{ fontSize: '10px' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>

            {/* Info text */}
            <div className="text-center text-white/60">
              <p className="text-sm mb-2">No relics discovered yet</p>
              <p className="text-xs text-white/40">
                Complete special missions and explore the Heartverse to unlock ancient relics
              </p>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}