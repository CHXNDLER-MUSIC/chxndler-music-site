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
  
  const [allRelics, setAllRelics] = useState<Relic[]>([]);
  
  // Debug allRelics state changes
  useEffect(() => {
    console.log('🔄 allRelics state updated:', allRelics);
    console.log('📊 allRelics length:', allRelics.length);
    if (allRelics.length > 0) {
      console.log('📷 First 3 relics with icon_url:', allRelics.slice(0, 3).map(r => ({ 
        id: r.id, 
        name: r.relic_name, 
        has_icon: !!r.icon_url,
        icon_url: r.icon_url 
      })));
    }
  }, [allRelics]);

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
  }, [isOpen, onClose, showElementMenu, showRelicsModal, showElementInfo, showRelicsInline]);

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
    console.log('🔍 Fetching relics from database...');
    try {
      const { data: relicsData, error: relicsError } = await supabaseClient
        .from('relics')
        .select('id, label, image_url, code')
        .eq('kind', 'RELIC')
        .order('rarity', { ascending: false });

      if (relicsError) {
        console.error('❌ Error fetching relics:', relicsError);
        setAllRelics([]);
      } else {
        // Transform the data to match our Relic interface
        const transformedRelics = relicsData?.map(relic => ({
          id: relic.id,
          relic_name: relic.label,
          icon_url: relic.image_url,
          description: relic.code
        })) || [];
        
        console.log('✅ Fetched relics data:', transformedRelics);
        console.log('📊 Number of relics found:', transformedRelics.length);
        setAllRelics(transformedRelics);
      }
    } catch (error) {
      console.log('⚠️ Relics table not found or error:', error);
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
        supabaseClient
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
        supabaseClient
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
          
          {/* View Relics Button - Positioned below close button */}
          <button
            onClick={() => {
              setShowRelicsInline(!showRelicsInline);
              try { sfx.play('click', 0.6); } catch {}
            }}
            className="absolute top-16 right-4 w-10 h-10 rounded-full border-2 border-pink-400/60 bg-pink-400/10 hover:border-pink-400/80 hover:bg-pink-400/20 transition-all duration-200 hover:scale-110 flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: 'inset 0 0 15px rgba(255, 20, 147, 0.4)'
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
          <div className="text-center mb-6">
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

          {/* Top section with Profile Image and Header */}
          <div className="flex items-start justify-between mb-4">
            {/* Profile Image - Left */}
            <div className="flex-shrink-0">
              {/* Current Profile Image - Clickable */}
              <div className="relative">
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
            
            {/* Username and Element - Right of image */}
            <div className="flex-1 ml-4">
              <div 
                className="text-left"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)', 
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}
              >
                {profile?.name || 'Unknown'}
              </div>
              
              {/* Element */}
              <div className="flex items-center mt-2">
                <span className="text-white/80 text-base mr-2">ELEMENT:</span>
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
                  className="font-bold transition-all duration-200 hover:scale-105 cursor-pointer flex items-center"
                  style={{ 
                    color: profile?.element ? getElementInfo(profile.element).color : '#00FFFF', 
                    textShadow: profile?.element ? `0 0 8px ${getElementInfo(profile.element).color}60` : '0 0 8px rgba(0,255,255,0.6)',
                    background: 'none',
                    border: 'none'
                  }}
                  title={profile?.element ? "Click to view element details" : undefined}
                >
                  {profile?.element && (
                    <img
                      src={getElementImageUrl(profile.element)}
                      alt={profile.element}
                      className="w-4 h-4 mr-2"
                      style={{ 
                        filter: `drop-shadow(0 0 4px ${getElementInfo(profile.element).color}60)` 
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  {profile?.element ? profile.element.toUpperCase() : 'NONE'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Profile Stats - Single Line */}
          <div className="flex items-center justify-center gap-8 mt-1 mb-3">
            {/* Daily Streak - Left */}
            <div className="flex items-center">
              <span className="text-white/80 text-sm mr-2">DAILY STREAK:</span>
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
            
            {/* Total Heart Coins - Right */}
            <div className="flex items-center">
              <span className="text-white/80 text-sm mr-2">TOTAL HEART COINS:</span>
              <span 
                className="font-bold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)' 
                }}
              >
                {profile?.heartcoin_total || 0}
              </span>
            </div>
          </div>
          
          {/* Thin cyan neon line */}
          <div 
            className="w-full h-px mb-3"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          {/* Profile Image Selection Menu - Inline */}
          {showElementMenu && (
            <div className="mt-4 mb-4 p-4 rounded-lg border border-cyan-400/60 bg-black/40">
              {/* Header */}
              <div 
                className="text-center mb-3 text-sm font-semibold"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 4px rgba(0,255,255,0.6)' 
                }}
              >
                CHOOSE YOUR PROFILE IMAGE
              </div>
              
              {/* Elements Section */}
              <div className="mb-3">
                <div 
                  className="text-center mb-2 text-xs"
                  style={{ 
                    color: '#00FFFF80', 
                    fontSize: '10px'
                  }}
                >
                  ELEMENTS
                </div>
                <div className="grid grid-cols-4 gap-2 justify-center max-w-xs mx-auto">
                  {getAllElements().map((element) => (
                    <button
                      key={element.name}
                      onClick={() => {
                        setSelectedImageUrl(element.url);
                        setShowElementMenu(false);
                        try { sfx.play('flip', 0.6); } catch {}
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
              <div className="mb-3">
                <div 
                  className="text-center mb-2 text-xs"
                  style={{ 
                    color: '#00FFFF80', 
                    fontSize: '10px'
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
                  }))).map((relic, i) => (
                    <button
                      key={`relic-${relic.id}`}
                      onClick={() => {
                        if (relic.icon_url) {
                          setSelectedImageUrl(relic.icon_url);
                          setShowElementMenu(false);
                          try { sfx.play('flip', 0.6); } catch {}
                        }
                      }}
                      disabled={!relic.icon_url}
                      className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedImageUrl === relic.icon_url
                          ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]'
                          : 'border-white/30 hover:border-cyan-400/60'
                      }`}
                      title={relic.relic_name || `Relic ${i + 1}`}
                    >
                      {relic.icon_url ? (
                        <img
                          src={relic.icon_url}
                          alt={relic.relic_name || `Relic ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
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
                    </button>
                  ))}
                </div>
              </div>
              
            </div>
          )}

          {/* Relics Collection Inline Display */}
          {showRelicsInline && (
            <div className="mt-6 p-4 rounded-lg border border-cyan-400/60 bg-black/40 relative">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowRelicsInline(false);
                  try { sfx.play('close', 0.6); } catch {}
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
                className="text-center mb-4"
                style={{ 
                  color: '#00FFFF', 
                  textShadow: '0 0 8px rgba(0,255,255,0.6)', 
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                RELICS COLLECTION
              </div>

              {/* Relics Grid / Expanded View - Inline */}
              {selectedRelicInline ? (
                <div className="mb-4 relative rounded-lg overflow-hidden border border-cyan-400/60" style={{ boxShadow: '0 0 15px rgba(0,255,255,0.25)' }}>
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
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 mb-4" style={{ maxWidth: '240px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {(allRelics.length > 0 ? allRelics.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                    id: `placeholder-${i}`,
                    relic_name: `Relic ${i + 1}`,
                    icon_url: null,
                    description: null
                  }))).map((relic, i) => {
                    const hasImage = Boolean(relic.icon_url);
                    return (
                      <button
                        type="button"
                        onClick={() => { if (hasImage) { setSelectedRelicInline(relic.icon_url!); try { sfx.play('click', 0.6); } catch {} } }}
                        key={`relic-inline-${relic.id}`}
                        className="aspect-square rounded-lg border border-white/20 bg-black/40 relative overflow-hidden transition-transform hover:scale-[1.03]"
                        style={{
                          minHeight: '44px',
                          opacity: hasImage ? 1 : 0.4,
                          filter: hasImage ? 'none' : 'grayscale(100%)'
                        }}
                        title={hasImage ? `View ${relic.relic_name}` : relic.relic_name || `Relic ${i + 1}`}
                      >
                        {hasImage ? (
                          <img
                            src={relic.icon_url!}
                            alt={relic.relic_name || `Relic ${i + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">🏛️</div>
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

              {/* Info text */}
              <div className="text-center">
                <p className="text-xs text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
                  Tap the Element of the Day to unlock ancient relics
                </p>
              </div>
            </div>
          )}

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
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 cursor-pointer ${
                          isCurrentlyViewed 
                            ? 'shadow-lg border-2' 
                            : 'opacity-60 hover:opacity-80 border-0'
                        }`}
                        style={{
                          backgroundColor: isCurrentlyViewed ? `${elementData.color}30` : 'rgba(0,0,0,0.3)',
                          borderColor: isCurrentlyViewed ? elementData.color : 'transparent',
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
                <div className="w-12 h-12 rounded-lg border-2 overflow-hidden flex-shrink-0"
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
                    const { error } = await supabaseClient
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
                    
                    try { sfx.play('success', 0.8); } catch {}
                    
                    // Close the element info panel
                    setShowElementInfo(false);
                  } catch (error) {
                    console.error('Error aligning with element:', error);
                  }
                }}
                disabled={saving || getCurrentElementData().name === profile?.element}
                className="mt-2 w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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


          {/* Start Tour Button */}
          <div className="mt-4 pt-3" style={{
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
              <div className="grid grid-cols-4 gap-4 mb-6">
                {(allRelics.length > 0 ? allRelics.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                  id: `placeholder-${i}`,
                  relic_name: `Relic ${i + 1}`,
                  icon_url: null,
                  description: null
                }))).map((relic, i) => {
                  const hasImage = Boolean(relic.icon_url);
                  return (
                    <button
                      type="button"
                      onClick={() => { if (hasImage) { setSelectedRelicModal(relic.icon_url!); try { sfx.play('click', 0.6); } catch {} } }}
                      key={`relic-modal-${relic.id}`}
                      className="aspect-square rounded-lg border-2 border-white/20 bg-black/40 relative overflow-hidden transition-transform hover:scale-[1.03]"
                      style={{
                        opacity: hasImage ? 1 : 0.4,
                        filter: hasImage ? 'none' : 'grayscale(100%)'
                      }}
                      title={hasImage ? `View ${relic.relic_name}` : relic.relic_name || `Relic ${i + 1}`}
                    >
                      {hasImage ? (
                        <img
                          src={relic.icon_url!}
                          alt={relic.relic_name || `Relic ${i + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-lg">🏛️</div>
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
              <p className="text-sm text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
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
