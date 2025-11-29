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

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Helper to get element image URL
  const getElementImageUrl = (element: string | null): string => {
    if (!element) return elementIcons.heart; // Default to heart
    return elementIcons[element as keyof typeof elementIcons] || elementIcons.heart;
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
            
            {/* Current Profile Image */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-20 h-20 rounded-full border-2 border-cyan-400/60 overflow-hidden"
                style={{
                  background: 'rgba(0,255,255,0.1)',
                  boxShadow: '0 0 20px rgba(0,255,255,0.4)'
                }}
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
              </div>
            </div>

            {/* Available Images Grid */}
            {loading ? (
              <div 
                className="text-center text-xs"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 4px rgba(0,255,255,0.6)' 
                }}
              >
                Loading available images...
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 justify-items-center">
                {availableImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedImageUrl(image.url);
                      try { sfx.play('click', 0.4); } catch {}
                    }}
                    className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                      selectedImageUrl === image.url
                        ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    title={image.name}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
                {availableImages.length === 0 && (
                  <div 
                    className="col-span-4 text-xs text-center py-2"
                    style={{ 
                      color: '#00FFFF', 
                      opacity: 0.6,
                      textShadow: '0 0 4px rgba(0,255,255,0.6)' 
                    }}
                  >
                    No unlocked images available
                  </div>
                )}
              </div>
            )}
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
              <span 
                className="font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                }}
              >
                {profile?.element ? profile.element.charAt(0).toUpperCase() + profile.element.slice(1) : 'None'}
              </span>
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

          {/* RELICS Section */}
          <div className="space-y-3">
            <h3 
              className="text-sm mb-3 font-semibold"
              style={{ 
                color: '#00FFFF', 
                textShadow: '0 0 4px rgba(0,255,255,0.6)' 
              }}
            >
              RELICS
            </h3>
            
            <div className="text-center py-4 text-white/60">
              <div className="text-2xl mb-2">🏛️</div>
              <p className="text-sm">You have no relics yet</p>
              <p className="text-xs text-white/40 mt-1">Complete special missions to earn relics</p>
            </div>

          {/* Start Tour Button */}
          <div className="mt-6 pt-4" style={{
            borderTop: '1px solid rgba(0,255,255,0.2)'
          }}>
            <button
              onClick={handleStartTour}
              className="w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
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
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}