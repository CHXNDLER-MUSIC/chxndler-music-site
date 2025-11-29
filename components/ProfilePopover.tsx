"use client";

import React, { useState, useEffect, useRef } from 'react';
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

  // Position popover relative to anchor element
  useEffect(() => {
    if (isOpen && anchorElement && popoverRef.current) {
      const rect = anchorElement.getBoundingClientRect();
      const popover = popoverRef.current;
      
      // Position below the anchor element
      const top = rect.bottom + 8;
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 16));
      
      popover.style.position = 'fixed';
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.zIndex = '9999';
    }
  }, [isOpen, anchorElement]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorElement &&
        !anchorElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorElement]);

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

  return (
    <div
      ref={popoverRef}
      className="bg-black/90 border-2 border-white/20 rounded-2xl p-6 backdrop-blur-md shadow-2xl"
      style={{
        width: '420px',
        maxHeight: '500px',
        boxShadow: '0 0 30px rgba(255, 255, 255, 0.1), 0 0 60px rgba(0, 255, 255, 0.2)'
      }}
    >
      <div className="flex h-full">
        {/* Left Side - Profile Image Selection */}
        <div className="flex-1 pr-4">
          <h3 className="text-white font-semibold mb-3 text-sm">Profile Image</h3>
          
          {/* Current Profile Image */}
          <div className="mb-4">
            <div 
              className="w-16 h-16 rounded-full border-2 border-cyan-400/60 overflow-hidden mx-auto"
              style={{
                background: 'rgba(0,255,255,0.1)',
                boxShadow: selectedImageUrl ? '0 0 20px rgba(0,255,255,0.4)' : 'none'
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
            <div className="text-white/60 text-center text-xs">Loading available images...</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
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
                <div className="col-span-3 text-white/40 text-xs text-center py-2">
                  No unlocked images available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Name & Tour */}
        <div className="flex-1 pl-4 border-l border-white/20">
          {/* Save Button - Top Right */}
          <div className="flex justify-end mb-3">
            <button
              onClick={handleSave}
              disabled={saving || (!editedName.trim() && selectedImageUrl === (profile?.profile_image_url || getElementImageUrl(profile?.element)))}
              className="w-8 h-8 rounded-full bg-green-600/30 border border-green-500/50 text-green-300 hover:bg-green-600/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
              title="Save changes"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" className="text-green-300">
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
          </div>

          {/* Name Section */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2 text-sm">Name</h3>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 bg-black/40 border border-white/30 rounded-lg text-white placeholder-white/50 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
              maxLength={50}
            />
          </div>

          {/* Tour Section */}
          <div>
            <div className="text-white/70 text-xs mb-2">
              Want a quick tour around the ship?
            </div>
            <button
              onClick={handleStartTour}
              className="w-full px-3 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                boxShadow: '0 0 10px rgba(236, 72, 153, 0.2)',
                textShadow: '0 0 4px rgba(236, 72, 153, 0.4)'
              }}
            >
              Start Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}