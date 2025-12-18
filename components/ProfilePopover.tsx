"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { useTour } from '@/contexts/TourContext';
import { supabaseBrowser } from '@/lib/supabase-browser';
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
  
  const [allRelics, setAllRelics] = useState<Relic[]>([]);
  

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
  const [showRelicsInline, setShowRelicsInline] = useState(false);
  const [selectedRelicInline, setSelectedRelicInline] = useState<string | null>(null);
  const [selectedRelicModal, setSelectedRelicModal] = useState<string | null>(null);
  const [showElementInfo, setShowElementInfo] = useState(false);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Helper to render user's JOURNEY label
  const getJourneyDisplay = () => {
    const j = (profile?.journey || 'wanderer').toString().toLowerCase();
    switch (j) {
      case 'lover':
        return { label: 'LOVER', color: '#FF6B9D' };
      case 'dreamer':
        return { label: 'DREAMER', color: '#FFD700' };
      default:
        return { label: 'WANDERER', color: '#00FFFF' };
    }
  };

  // Initialize form state when profile changes
  useEffect(() => {
    if (profile) {
      setSelectedImageUrl(profile.profile_image_url || getElementImageUrl(profile.element));
      setEditedName(profile.name || '');
    }
  }, [profile]);

  // Focus name input when entering edit mode
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Fetch unlocked badges and relics when component opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUnlockedItems();
    }
  }, [isOpen, user]);

  // Reset editing state when popover closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditingName(false);
      if (profile) {
        setEditedName(profile.name || '');
      }
    }
  }, [isOpen, profile]);

  // Close on escape key and outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isEditingName) {
          setEditedName(profile?.name || '');
          setIsEditingName(false);
        } else if (showElementInfo) {
          setShowElementInfo(false);
        } else if (showRelicsInline) {
          setShowRelicsInline(false);
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
        } else if (showRelicsInline) {
          setShowRelicsInline(false);
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
  }, [isOpen, onClose, showElementMenu, showRelicsModal, showElementInfo, showRelicsInline, isEditingName, profile]);

  // Helper to get element image URL
  const getElementImageUrl = (element: string | null): string => {
    if (!element) return elementIcons.heart; // Default to heart
    return elementIcons[element as keyof typeof elementIcons] || elementIcons.heart;
  };

  // Get all 4 core element options for the selection menu
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
        color: '#00BFFF'
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
        color: '#A855F7'
      }
    };

    return elementData[elementName] || elementData.heart;
  };

  // Fetch all relics from database
  const fetchAllRelics = async () => {
    try {
      const { data: relicsData, error: relicsError } = await supabaseBrowser
        .from('relics')
        .select('id, label, image_url, code')
        .eq('kind', 'RELIC')
        .order('rarity', { ascending: false });

      if (relicsError) {
        console.error('Error fetching relics:', relicsError);
        setAllRelics([]);
      } else {
        // Transform the data to match our Relic interface
        const transformedRelics = relicsData?.map(relic => ({
          id: relic.id,
          relic_name: relic.label,
          icon_url: relic.image_url,
          description: relic.code
        })) || [];

        // Reorder specific relics to desired positions
        // Positions are 1-based in UI, convert to 0-based indices for array
        const norm = (s?: string | null) => (s || '').toLowerCase();
        const includesCI = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase());

        const isWallpaperN = (r: Relic, n: number) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          const reName = new RegExp(`wallpaper\\s*-?\\s*${n}(?!\\d)`, 'i');
          const reUrl = new RegExp(`wallpaper-${n}\\.`, 'i');
          return reName.test(name) || reUrl.test(url);
        };
        const isAlienBlue = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          return (includesCI(name, 'alien') && includesCI(name, 'blue')) || includesCI(url, 'alien-blue') || includesCI(url, 'alien - blue');
        };
        const isPhone1 = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          const reName = /phone\s*-?\s*1(?!\d)/i;
          return reName.test(name) || includesCI(url, 'phone-1');
        };

        // Planet detectors (by name or URL)
        const isPlanetHeart = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          return (includesCI(name, 'planet') && includesCI(name, 'heart')) || includesCI(url, 'planet_heart');
        };
        const isPlanetWater = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          return (includesCI(name, 'planet') && includesCI(name, 'water')) || includesCI(url, 'planet_water');
        };
        const isPlanetLightning = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          return (includesCI(name, 'planet') && includesCI(name, 'lightning')) || includesCI(url, 'planet_lightning');
        };

        type Pred = (r: Relic) => boolean;
        const desired: Array<{ pred: Pred; index: number }> = [
          // Planets at positions 1,2,3
          { pred: isPlanetHeart, index: 0 },              // position 1
          { pred: isPlanetWater, index: 1 },              // position 2
          { pred: isPlanetLightning, index: 2 },          // position 3
          // Wallpapers
          { pred: (r) => isWallpaperN(r, 3), index: 4 },  // position 5
          { pred: (r) => isWallpaperN(r, 4), index: 5 },  // position 6
          { pred: (r) => isWallpaperN(r, 2), index: 6 },  // position 7
          { pred: (r) => isWallpaperN(r, 5), index: 8 },  // position 9
          // Phone wallpaper and Alien Blue
          { pred: isPhone1, index: 9 },                   // position 10
          { pred: isAlienBlue, index: 14 },               // position 15
        ];

        const pool: Relic[] = [...transformedRelics];
        const result: (Relic | null)[] = new Array(pool.length).fill(null);

        // Place specified items first
        for (const { pred, index } of desired) {
          if (index < 0 || index >= result.length) continue;
          const foundIdx = pool.findIndex(pred);
          if (foundIdx !== -1) {
            result[index] = pool.splice(foundIdx, 1)[0];
          }
        }

        // Fill remaining positions with the rest in original order
        let p = 0;
        for (let i = 0; i < result.length; i++) {
          if (result[i] == null && p < pool.length) {
            result[i] = pool[p++];
          }
        }

        setAllRelics(result.filter((x): x is Relic => x !== null));
      }
    } catch (error) {
      console.log('Relics table not found, skipping');
      setAllRelics([]);
    }
  };

  // Fetch user's unlocked badges and relics
  const fetchUnlockedItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all relics and unlocked badges/relics in parallel
      const [badgeResult, relicResult] = await Promise.all([
        supabaseBrowser
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
          .eq('user_id', user.id),
        supabaseBrowser
          .from('user_relics')
          .select(`
            id,
            relic_id,
            earned_at,
            relics (
              id,
              label,
              image_url,
              code
            )
          `)
          .eq('user_id', user.id)
      ]);

      // Handle badges
      if (badgeResult.error) {
        console.error('Error fetching user badges:', badgeResult.error);
        setUserBadges([]);
      } else {
        setUserBadges(badgeResult.data || []);
      }

      // Handle relics
      if (relicResult.error) {
        if (!relicResult.error.message?.includes('relation') && !relicResult.error.message?.includes('does not exist')) {
          console.error('Error fetching user relics:', relicResult.error);
        }
        setUserRelics([]);
      } else {
        // Transform the user relics data to match our interface
        const transformedUserRelics = relicResult.data?.map(userRelic => ({
          id: userRelic.id,
          relic_id: userRelic.relic_id,
          earned_at: userRelic.earned_at,
          relics: {
            id: userRelic.relics.id,
            relic_name: userRelic.relics.label,
            icon_url: userRelic.relics.image_url,
            description: userRelic.relics.code
          }
        })) || [];
        
        setUserRelics(transformedUserRelics);
      }

      // Fetch all relics for the grid display
      await fetchAllRelics();

      // Build available images array
      buildAvailableImages(badgeResult.data || [], relicResult.data || []);
    } catch (error) {
      console.error('Error fetching unlocked items:', error);
      setUserRelics([]);
      setUserBadges([]);
      setAllRelics([]);
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

  // Handle saving name changes
  const handleSaveName = async () => {
    if (!profile || !user || !editedName.trim()) return;
    if (editedName.trim() === profile.name) {
      // No change, just exit edit mode
      setIsEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabaseBrowser
        .from('profiles')
        .update({
          name: editedName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile name:', error);
        return;
      }

      // Play flip sound
      try { sfx.play('flip', 0.6); } catch {}

      // Refresh profile context
      await refreshProfile();

      // Exit edit mode
      setIsEditingName(false);
    } catch (error) {
      console.error('Error saving name:', error);
    } finally {
      setSaving(false);
    }
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
        try { sfx.play('flip', 0.6); } catch {}
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabaseBrowser
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
      const { error } = await supabaseBrowser.auth.signOut();
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

  const handleDownload = (url: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      const name = url.split('/')?.pop() || 'relic.webp';
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      try { sfx.play('click', 0.6); } catch {}
    } catch (e) {
      console.error('Download failed:', e);
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
          paddingTop: '220px'
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
        className="fixed inset-0 flex items-start justify-center"
        style={{
          zIndex: 2147483648,
          paddingTop: '80px'
        }}
      >
        <div
          className="profile-hologram-container"
          style={{
            width: 'min(92vw, 500px)',
            minHeight: '440px',
            padding: '16px 24px 18px 24px',
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
            onMouseEnter={() => {
              try { sfx.play('hover', 0.3); } catch {}
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgba(0,255,255,0.2)',
              border: '1px solid rgba(0,255,255,0.6)',
              color: '#00FFFF',
              boxShadow: '0 0 10px rgba(0,255,255,0.3)',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
          
          {/* View Relics Button - Positioned below close button */}
          <button
            onClick={() => {
              setShowRelicsInline(!showRelicsInline);
              setShowElementMenu(false); // Close element menu when opening relics display
              try { sfx.play('click', 0.6); } catch {}
            }}
            onMouseEnter={() => {
              try { sfx.play('hover', 0.3); } catch {}
            }}
            className="absolute top-[85vh] right-4 w-10 h-10 rounded-full border-2 border-yellow-400/60 bg-yellow-400/10 hover:border-yellow-400/80 hover:bg-yellow-400/20 transition-all duration-200 hover:scale-110 flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: 'inset 0 0 15px rgba(255, 193, 7, 0.4)'
            }}
            title="View Relics"
          >
            <img
              src="/elements/relics.webp"
              alt="Relics"
              className="absolute inset-0 w-full h-full object-cover"
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
          
          {/* PROFILE Header */}
          <div className="text-center mb-2">
            <h1 
              className="text-2xl font-bold"
              style={{ 
                color: '#00FFFF', 
                textShadow: '0 0 12px rgba(0,255,255,0.8)', 
                letterSpacing: '0.1em'
              }}
            >
              PROFILE
            </h1>
          </div>

          {/* Thin cyan neon line under PROFILE title */}
          <div 
            className="w-full h-px mb-3"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          {/* Top section with Profile Image and Header */}
          <div className="flex items-start justify-between mb-4">
            {/* Profile Image - Left */}
            <div className="flex-shrink-0">
              {/* Current Profile Image - Clickable */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowElementMenu(!showElementMenu);
                    setShowRelicsInline(false); // Close relics display when opening profile menu
                    try { sfx.play('click', 0.4); } catch {}
                  }}
                  onMouseEnter={() => {
                    try { sfx.play('hover', 0.3); } catch {}
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

                {/* Checkmark confirmation button - Top Right of Image */}
                {(editedName.trim() !== profile?.name || selectedImageUrl !== (profile?.profile_image_url || getElementImageUrl(profile?.element))) && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !editedName.trim()}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{
                      background: 'rgba(0,255,0,0.2)',
                      border: '1px solid rgba(0,255,0,0.6)',
                      color: '#00FF00',
                      boxShadow: '0 0 10px rgba(0,255,0,0.3)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    title="Save changes"
                  >
                    {saving ? (
                      <div className="w-3 h-3 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" width="12" height="12">
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
              </div>


            </div>
            
            {/* Left side - Username, Journey, Element */}
            <div className="flex-1 ml-4">
              {/* Editable Name Field */}
              {isEditingName ? (
                <div className="relative flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName();
                      } else if (e.key === 'Escape') {
                        setEditedName(profile?.name || '');
                        setIsEditingName(false);
                      }
                    }}
                    className="text-left bg-transparent border-b-2 border-cyan-400/60 outline-none"
                    style={{
                      color: '#00FFFF',
                      textShadow: '0 0 8px rgba(0,255,255,0.6)',
                      fontSize: '28px',
                      fontWeight: 'bold',
                      width: '100%',
                      maxWidth: '200px'
                    }}
                    maxLength={30}
                  />
                  {/* Green Checkmark Button */}
                  <button
                    onClick={handleSaveName}
                    disabled={saving || !editedName.trim()}
                    onMouseEnter={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                    }}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(0,255,0,0.2)',
                      border: '2px solid rgba(0,255,0,0.7)',
                      color: '#00FF00',
                      boxShadow: '0 0 12px rgba(0,255,0,0.4)',
                    }}
                    title="Save name"
                  >
                    {saving ? (
                      <div className="w-3 h-3 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" width="14" height="14">
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 12l5 5L20 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    try { sfx.play('click', 0.4); } catch {}
                  }}
                  onMouseEnter={() => {
                    try { sfx.play('hover', 0.3); } catch {}
                  }}
                  className="text-left cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    color: '#00FFFF',
                    textShadow: '0 0 8px rgba(0,255,255,0.6)',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    background: 'none',
                    border: 'none',
                    padding: 0
                  }}
                  title="Click to edit name"
                >
                  {profile?.name || 'Unknown'}
                </button>
              )}

              {/* Journey label */}
              <div className="mt-1">
                {(() => {
                  const { label, color } = getJourneyDisplay();
                  return (
                    <div
                      className="text-lg font-semibold tracking-wide"
                      style={{
                        color,
                        textShadow: `0 0 6px ${color}80`,
                        letterSpacing: '0.06em'
                      }}
                    >
                      {label}
                    </div>
                  );
                })()}
              </div>
              
              {/* Element */}
              <div className="flex items-center mt-2">
                <button
                  onClick={() => {
                    if (profile?.element) {
                      // Close profile image menu if it's open
                      if (showElementMenu) {
                        setShowElementMenu(false);
                      }
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
                  onMouseEnter={() => {
                    try { sfx.play('hover', 0.3); } catch {}
                  }}
                  className="font-bold text-xl transition-all duration-200 hover:scale-105 cursor-pointer flex items-center"
                  style={{ 
                    color: profile?.element ? getElementInfo(profile.element).color : '#00FFFF', 
                    textShadow: profile?.element ? `0 0 8px ${getElementInfo(profile.element).color}60` : '0 0 8px rgba(0,255,255,0.6)',
                    background: 'none',
                    border: 'none'
                  }}
                  title={profile?.element ? "Click to view element details" : undefined}
                >
                  {profile?.element ? profile.element.toUpperCase() : 'NONE'}
                </button>
              </div>
            </div>
            
            {/* Right side - Relics button and stats */}
            <div className="flex flex-col items-center gap-2">
              {/* Relics button */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { setShowRelicsInline(true); try { sfx.play('click', 0.6); } catch {} }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowRelicsInline(true); try { sfx.play('click', 0.6); } catch {} } }}
                onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                className="w-16 h-16 transition-transform hover:scale-[1.08] flex items-center justify-center cursor-pointer select-none flex-shrink-0"
                style={{ background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                title="View your relics"
              >
                <img
                  src="/elements/relics.webp"
                  alt="Relics"
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Daily Streak and Heart Coins under relics */}
              <div className="flex flex-col gap-y-1 items-center">
                {/* Daily streak */}
                <div className="flex items-center">
                  <span className="text-white/80 text-sm mr-1">Daily Streak:</span>
                  <span 
                    className="font-bold text-sm"
                    style={{ 
                      color: '#00FFFF', 
                      textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                    }}
                  >
                    {profile?.daily_streak || 0}
                  </span>
                </div>
                {/* Total heartcoins */}
                <div className="flex items-center">
                  <span className="text-white/80 text-sm mr-1">Total HeartCoins:</span>
                  <span 
                    className="font-bold text-sm"
                    style={{ 
                      color: '#00FFFF', 
                      textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                    }}
                  >
                    {profile?.heartcoin_total || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          

          {/* Profile Image Selection Menu - Full Modal Overlay */}
          {showElementMenu && (
            <div 
              className="absolute inset-0 p-4 rounded-lg bg-black/90 backdrop-blur-md"
              style={{ 
                zIndex: 15,
                borderRadius: 18,
                border: '1px solid rgba(0,255,255,0.55)'
              }}
            >
              {/* Header - Top Position */}
              <div 
                className="text-center mb-3 text-lg font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)', 
                  letterSpacing: '0.05em'
                }}
              >
                CHOOSE YOUR PROFILE IMAGE
              </div>
              
              {/* Close button */}
              <button
                onClick={() => {
                  setShowElementMenu(false);
                  try { sfx.play('close', 0.6); } catch {}
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgba(0,255,255,0.2)',
                  border: '1px solid rgba(0,255,255,0.6)',
                  color: '#00FFFF',
                  boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
              
              {/* Elements Section */}
              <div className="mb-2">
                <div 
                  className="text-center mb-1 text-sm"
                  style={{ 
                    color: '#00FFFF', 
                    fontSize: '12px',
                    textShadow: '0 0 4px rgba(0,255,255,0.8)'
                  }}
                >
                  ELEMENTS
                </div>
                <div className="grid grid-cols-4 gap-2 justify-center max-w-xs mx-auto">
                  {getAllElements().map((element) => (
                    <button
                      key={element.name}
                      onClick={async () => {
                        if (!user) return;

                        // Update local state immediately
                        setSelectedImageUrl(element.url);
                        setShowElementMenu(false);
                        try { sfx.play('flip', 0.6); } catch {}

                        // Save element and profile image to Supabase
                        try {
                          const { error } = await supabaseBrowser
                            .from('profiles')
                            .update({
                              element: element.name,
                              profile_image_url: element.url,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', user.id);

                          if (error) {
                            console.error('Error updating element:', error);
                            return;
                          }

                          // Refresh profile context
                          await refreshProfile();
                        } catch (error) {
                          console.error('Error saving element:', error);
                        }
                      }}
                      className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 ${
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
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '?';
                            parent.style.color = '#666';
                            parent.style.fontSize = '12px';
                            parent.style.display = 'flex';
                            parent.style.alignItems = 'center';
                            parent.style.justifyContent = 'center';
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Relics Section */}
              <div className="mb-1">
                <div 
                  className="text-center mb-1 text-sm"
                  style={{ 
                    color: '#00FFFF', 
                    fontSize: '12px',
                    textShadow: '0 0 4px rgba(0,255,255,0.8)'
                  }}
                >
                  RELICS
                </div>
                <div className="grid grid-cols-4 gap-2 justify-center max-w-xs mx-auto">
                  {(allRelics.length > 0 ? allRelics.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                    id: `placeholder-${i}`,
                    relic_name: `Relic ${i + 1}`,
                    icon_url: null,
                    description: null
                  }))).map((relic, i) => {
                    const unlockedIds = new Set(userRelics.map(r => r.relic_id));
                    const isUnlocked = relic && relic.id ? unlockedIds.has(relic.id) : false;
                    const hasImage = Boolean(relic.icon_url);
                    return (
                      <button
                        key={`relic-${relic.id}`}
                        onClick={() => {
                          if (isUnlocked && relic.icon_url) {
                            setSelectedRelicInline(relic.icon_url);
                            setShowRelicsInline(true);
                            setShowElementMenu(false);
                            try { sfx.play('flip', 0.6); } catch {}
                          }
                        }}
                        disabled={!isUnlocked}
                        className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed ${
                            selectedImageUrl === relic.icon_url
                              ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]'
                              : 'border-white/30 hover:border-cyan-400/60'
                          }`}
                        title={isUnlocked ? (relic.relic_name || `Relic ${i + 1}`) : 'Locked'}
                      >
                        {hasImage ? (
                          <img
                            src={relic.icon_url!}
                            alt={relic.relic_name || `Relic ${i + 1}`}
                            className={`w-full h-full object-cover ${isUnlocked ? '' : 'grayscale'}`}
                            style={{ opacity: isUnlocked ? 1 : 0.5 }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement as HTMLElement | null;
                              if (parent) {
                                parent.innerHTML = '🏛️';
                                parent.style.color = '#666';
                                parent.style.fontSize = '8px';
                                parent.style.display = 'flex';
                                parent.style.alignItems = 'center';
                                parent.style.justifyContent = 'center';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">🏛️</div>
                        )}
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-semibold">
                            Locked
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
            </div>
          )}

          {/* Relics Collection - Full Overlay */}
          {showRelicsInline && (
            <div 
              className="absolute inset-0 p-4 rounded-lg bg-black/90 backdrop-blur-md"
              style={{ 
                zIndex: 15,
                borderRadius: 18,
                border: '1px solid rgba(0,255,255,0.55)'
              }}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowRelicsInline(false);
                  try { sfx.play('close', 0.6); } catch {}
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  background: 'rgba(0,255,255,0.2)',
                  border: '1px solid rgba(0,255,255,0.6)',
                  color: '#00FFFF',
                  boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>

              {/* Header */}
              <div 
                className="text-center mb-2"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)', 
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                RELICS COLLECTION
              </div>

              {/* Info text - moved below header */}
              <div className="text-center mb-2">
                <p className="text-sm text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
                  Tap the Element of the Day to unlock ancient relics
                </p>
              </div>

              {/* Relics Grid / Expanded View - Inline */}
              {selectedRelicInline ? (
                <div className="mb-4 relative rounded-lg overflow-hidden border border-cyan-400/60" style={{ boxShadow: '0 0 15px rgba(0,255,255,0.25)' }}>
                  {/* Controls above the image */}
                  <div className="flex items-center justify-end gap-2 p-2 border-b border-cyan-400/40 bg-black/40">
                    <button
                      onClick={() => handleDownload(selectedRelicInline)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        color: '#FFFFFF',
                        textShadow: '0 0 6px rgba(255,255,255,0.8)'
                      }}
                    >
                      ⬇ Download
                    </button>
                  </div>
                  <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                    <img
                      src={selectedRelicInline}
                      alt="Selected relic"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2">
                    <button
                      onClick={() => { setSelectedRelicInline(null); try { sfx.play('close', 0.6); } catch {} }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(0,255,255,0.15)',
                        border: '1px solid rgba(0,255,255,0.5)',
                        color: '#00FFFF'
                      }}
                    >
                      Back to Grid
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 mb-1" style={{ maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {(allRelics.length > 0 ? allRelics.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                    id: `placeholder-${i}`,
                    relic_name: `Relic ${i + 1}`,
                    icon_url: null,
                    description: null
                  }))).map((relic, i) => {
                    const unlockedIds = new Set(userRelics.map(r => r.relic_id));
                    const isUnlocked = relic && relic.id ? unlockedIds.has(relic.id) : false;
                    const hasImage = Boolean(relic.icon_url);
                    return (
                      <button
                        type="button"
                        onClick={() => { if (isUnlocked && hasImage) { setSelectedRelicInline(relic.icon_url!); try { sfx.play('click', 0.6); } catch {} } }}
                        key={`relic-inline-${relic.id}`}
                        className="aspect-square rounded-lg border border-white/20 bg-black/40 relative overflow-hidden transition-transform hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          minHeight: '68px'
                        }}
                        disabled={!isUnlocked}
                        title={isUnlocked ? (hasImage ? `View ${relic.relic_name}` : relic.relic_name || `Relic ${i + 1}`) : 'Locked'}
                      >
                        {hasImage ? (
                          <img
                            src={relic.icon_url!}
                            alt={relic.relic_name || `Relic ${i + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover ${isUnlocked ? '' : 'grayscale'}`}
                            style={{ opacity: isUnlocked ? 1 : 0.5 }}
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">🏛️</div>
                        )}
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-semibold">
                            Locked
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <div 
                          className="absolute bottom-0.5 right-0.5 text-xs text-white/40"
                          style={{ fontSize: '8px' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* Element Info Display - Full Overlay */}
          {showElementInfo && profile?.element && (
            <div 
              className="absolute inset-0 p-4 rounded-lg bg-black/90 backdrop-blur-md"
              style={{ 
                zIndex: 15,
                borderRadius: 18,
                border: '1px solid rgba(0,255,255,0.55)'
              }}
            >
              {/* Close button - Top Right */}
              <button
                onClick={() => {
                  setShowElementInfo(false);
                  try { sfx.play('close', 0.6); } catch {}
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
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
              <div className="text-center mb-2">
                <h2 
                  className="text-lg font-bold mb-0.5"
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

              {/* All Elements Grid - Moved to top */}
              <div className="mb-2">
                <div className="flex justify-center items-center gap-3">
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
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 cursor-pointer w-16 h-16 ${
                          isCurrentlyViewed 
                            ? 'border-2' 
                            : 'opacity-60 hover:opacity-80 border-0'
                        }`}
                        style={{
                          backgroundColor: isCurrentlyViewed ? 'transparent' : 'rgba(0,0,0,0.3)',
                          borderColor: isCurrentlyViewed ? elementData.color : 'transparent'
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
              
              {/* Thin separator line */}
              <div 
                className="w-full h-px mb-2"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8) 20%, rgba(139,92,246,1) 50%, rgba(139,92,246,0.8) 80%, transparent)',
                  boxShadow: '0 0 4px rgba(139,92,246,0.6)'
                }}
              />

              {/* Element Info Layout - Split with info on right */}
              <div className="flex gap-4 mb-2">
                {/* Left side - Element Icon */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={getElementInfo(getCurrentElementData().name).icon}
                    alt={getElementInfo(getCurrentElementData().name).title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Right side - Element Title and Description */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1"
                    style={{
                      color: getElementInfo(getCurrentElementData().name).color,
                      textShadow: `0 0 8px ${getElementInfo(getCurrentElementData().name).color}60`
                    }}
                  >
                    {getElementInfo(getCurrentElementData().name).title} = {getElementInfo(getCurrentElementData().name).subtitle}
                  </h3>
                  <p className="text-sm leading-normal text-white/90">
                    {getElementInfo(getCurrentElementData().name).description}
                  </p>
                </div>
              </div>


              {/* ALIGN Button */}
              <button
                onClick={async () => {
                  if (!profile || !user) return;
                  
                  const currentElement = getCurrentElementData();
                  
                  try {
                    // Update user's element in profile
                    const { error } = await supabaseBrowser
                      .from('profiles')
                      .update({
                        element: currentElement.name,
                        profile_image_url: currentElement.url,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id);

                    if (error) {
                      console.error('Error updating profile element:', error);
                      return;
                    }

                    // Refresh profile context and update local state
                    await refreshProfile();
                    setSelectedImageUrl(currentElement.url);
                    
                    try { sfx.play('star', 0.6); } catch {}
                    try { sfx.play('flip', 0.6); } catch {}
                    try { sfx.play('success', 0.8); } catch {}
                    
                    // Close the element info panel
                    setShowElementInfo(false);
                  } catch (error) {
                    console.error('Error aligning with element:', error);
                  }
                }}
                disabled={saving || getCurrentElementData().name === profile?.element}
                className="mt-1 w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${getElementInfo(getCurrentElementData().name).color}40, ${getElementInfo(getCurrentElementData().name).color}25)`,
                  border: `2px solid ${getElementInfo(getCurrentElementData().name).color}`,
                  color: getElementInfo(getCurrentElementData().name).color,
                  textShadow: `0 0 12px ${getElementInfo(getCurrentElementData().name).color}, 0 0 24px ${getElementInfo(getCurrentElementData().name).color}80`,
                  boxShadow: `0 0 20px ${getElementInfo(getCurrentElementData().name).color}70`
                }}
                title={getCurrentElementData().name === profile?.element ? "Already aligned with this element" : "Align with this element's energy"}
              >
                {saving ? 'ALIGNING...' : (getCurrentElementData().name === profile?.element ? 'ALIGNED' : 'ALIGN')}
              </button>
            </div>
          )}


          {/* Start Tour Button - Only show when relics, element menu, and element info are not displayed */}
          {!showRelicsInline && !showElementMenu && !showElementInfo && (
            <div className="mt-4 pt-3" style={{
              borderTop: '1px solid rgba(0,255,255,0.2)'
            }}>
              <button
                onClick={handleStartTour}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
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
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
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
          )}
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
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
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
                fontSize: '22px',
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

            {/* Relics Grid / Expanded View - Modal */}
            {selectedRelicModal ? (
              <div className="mb-6 relative rounded-lg overflow-hidden border-2 border-cyan-400/60" style={{ boxShadow: '0 0 18px rgba(0,255,255,0.25)' }}>
                <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                  <img
                    src={selectedRelicModal}
                    alt="Selected relic"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/25 pointer-events-none" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <button
                    onClick={() => { setSelectedRelicModal(null); try { sfx.play('close', 0.6); } catch {} }}
                    className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: 'rgba(0,255,255,0.15)',
                      border: '1px solid rgba(0,255,255,0.5)',
                      color: '#00FFFF'
                    }}
                  >
                    Back to Grid
                  </button>
                  <button
                    onClick={() => selectedRelicModal && handleDownload(selectedRelicModal)}
                    className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      color: '#FFFFFF',
                      textShadow: '0 0 6px rgba(255,255,255,0.8)'
                    }}
                  >
                    ⬇ Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 mb-6">
                {(allRelics.length > 0 ? allRelics.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                  id: `placeholder-${i}`,
                  relic_name: `Relic ${i + 1}`,
                  icon_url: null,
                  description: null
                }))).map((relic, i) => {
                  const unlockedIds = new Set(userRelics.map(r => r.relic_id));
                  const isUnlocked = relic && relic.id ? unlockedIds.has(relic.id) : false;
                  const hasImage = Boolean(relic.icon_url);
                  return (
                    <button
                      type="button"
                      onClick={() => { if (isUnlocked && hasImage) { setSelectedRelicModal(relic.icon_url!); try { sfx.play('click', 0.6); } catch {} } }}
                      key={`relic-modal-${relic.id}`}
                      className="aspect-square rounded-lg border-2 border-white/20 bg-black/40 relative overflow-hidden transition-transform hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={!isUnlocked}
                      title={isUnlocked ? (hasImage ? `View ${relic.relic_name}` : relic.relic_name || `Relic ${i + 1}`) : 'Locked'}
                    >
                      {hasImage ? (
                        <img
                          src={relic.icon_url!}
                          alt={relic.relic_name || `Relic ${i + 1}`}
                          className={`absolute inset-0 w-full h-full object-cover ${isUnlocked ? '' : 'grayscale'}`}
                          style={{ opacity: isUnlocked ? 1 : 0.5 }}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-lg">🏛️</div>
                      )}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs text-white font-semibold">
                          Locked
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                      <div 
                        className="absolute bottom-1 right-1 text-xs text-white/40"
                        style={{ fontSize: '10px' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Info text */}
            <div className="text-center">
              <p className="text-base text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
                Tap the Element of the Day to unlock ancient relics
              </p>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
