"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { useTour } from '@/contexts/TourContext';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { elementIcons } from '@/lib/elementIcons';
import { sfx } from '@/lib/sfx';
import { MerchItem } from '@/types/merch';
import { TiltSpinCard } from '@/components/TiltSpinCard';
import { fetchActiveBoosts as fetchActiveBoostsFromDB, type ActiveBoost } from '@/lib/boosts';

interface Badge {
  id: string;
  badge_name: string;
  icon_url: string | null;
  description: string | null;
  category?: string | null;
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
  obtained_at: string;
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
  showRelicsOnOpen?: boolean;
  showMerchOnOpen?: boolean;
}

export default function ProfilePopover({ isOpen, onClose, anchorElement, showRelicsOnOpen, showMerchOnOpen }: ProfilePopoverProps) {
  const { profile, user, updateProfile, refreshProfile } = useProfile();
  const { start: startTour } = useTour();
  
  const [allRelics, setAllRelics] = useState<Relic[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [allMerch, setAllMerch] = useState<MerchItem[]>([]);
  const [userMerchDates, setUserMerchDates] = useState<Record<string, string>>({});
  const [unlockedMerchColors, setUnlockedMerchColors] = useState<Record<string, string[]>>({});


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [editedName, setEditedName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [availableImages, setAvailableImages] = useState<AvailableImage[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userRelics, setUserRelics] = useState<UserRelic[]>([]);
  const [showElementMenu, setShowElementMenu] = useState(false);
  const [profileImageTab, setProfileImageTab] = useState<'elements' | 'relics' | 'badges'>('elements');
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<string>('soul');
  const [showRelicsModal, setShowRelicsModal] = useState(false);
  const [showRelicsInline, setShowRelicsInline] = useState(false);
  const [selectedRelicInline, setSelectedRelicInline] = useState<string | null>(null);
  const [selectedRelicModal, setSelectedRelicModal] = useState<string | null>(null);
  const [showMerchInline, setShowMerchInline] = useState(false);
  const [selectedMerchInline, setSelectedMerchInline] = useState<MerchItem | null>(null);
  const [selectedMerchColor, setSelectedMerchColor] = useState<string | null>(null);
  const [merchRotation, setMerchRotation] = useState(0);
  const [merchShowBack, setMerchShowBack] = useState(false);
  const [relicRotationInline, setRelicRotationInline] = useState(0);
  const [relicRotationModal, setRelicRotationModal] = useState(0);
  const [showElementInfo, setShowElementInfo] = useState(false);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [totalSoulStars, setTotalSoulStars] = useState(0);
  const [selectedBoostPopup, setSelectedBoostPopup] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Helper to render user's JOURNEY label
  // Prefer live coin totals to infer tier to avoid DB sync issues
  const getJourneyDisplay = () => {
    // Derive tier from total coins first; fallback to stored journey
    const totalCoins =
      (typeof profile?.heartcoin_total === 'number' ? profile?.heartcoin_total : undefined) ??
      (typeof profile?.total_heartcoins_earned === 'number' ? profile?.total_heartcoins_earned : undefined) ??
      (typeof profile?.heartcoin_balance === 'number' ? profile?.heartcoin_balance : 0);

    let tier: 'wanderer' | 'dreamer' | 'lover' | string = 'wanderer';
    if (totalCoins >= 25) tier = 'lover';
    else if (totalCoins >= 5) tier = 'dreamer';
    else tier = (profile?.journey || 'wanderer').toString().toLowerCase();

    switch (tier) {
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

  // Listen for relics:refresh event to update collection after Element of Day claim
  useEffect(() => {
    const handleRelicsRefresh = () => {
      if (user) {
        console.log('[ProfilePopover] Received relics:refresh event, refetching...');
        fetchUnlockedItems();
      }
    };
    window.addEventListener('relics:refresh', handleRelicsRefresh);
    return () => window.removeEventListener('relics:refresh', handleRelicsRefresh);
  }, [user]);

  // Fetch active boosts from user_active_boosts table
  useEffect(() => {
    if (!isOpen || !user) {
      setActiveBoosts([]);
      return;
    }

    const loadActiveBoosts = async () => {
      const boosts = await fetchActiveBoostsFromDB(user.id);
      setActiveBoosts(boosts);
    };

    loadActiveBoosts();
  }, [isOpen, user]);

  // Listen for boosts:refresh event to update UI after boost consumption
  useEffect(() => {
    if (!user) return;

    const handleBoostsRefresh = async () => {
      console.log('[ProfilePopover] Received boosts:refresh event, refetching...');
      const boosts = await fetchActiveBoostsFromDB(user.id);
      setActiveBoosts(boosts);
    };

    window.addEventListener('boosts:refresh', handleBoostsRefresh);
    return () => window.removeEventListener('boosts:refresh', handleBoostsRefresh);
  }, [user]);

  // Fetch total soul stars when popover opens
  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    const fetchTotalSoulStars = async () => {
      try {
        const { data, error } = await supabaseBrowser
          .from('soul_journal_entries')
          .select('stars_count')
          .eq('user_id', user.id);

        if (error) {
          console.warn('Failed to fetch soul stars:', error);
          return;
        }

        // Sum up all stars_count from user's journal entries
        const total = data?.reduce((sum, entry) => sum + (entry.stars_count || 0), 0) || 0;
        setTotalSoulStars(total);
      } catch (err) {
        console.warn('Error fetching soul stars:', err);
      }
    };

    fetchTotalSoulStars();
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

  // Auto-open relics collection when showRelicsOnOpen is true
  useEffect(() => {
    if (isOpen && showRelicsOnOpen) {
      setShowRelicsInline(true);
    }
  }, [isOpen, showRelicsOnOpen]);

  // Auto-open merch collection when showMerchOnOpen is true
  useEffect(() => {
    if (isOpen && showMerchOnOpen) {
      setShowMerchInline(true);
    }
  }, [isOpen, showMerchOnOpen]);

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
        } else if (showMerchInline) {
          setShowMerchInline(false);
          setSelectedMerchInline(null);
          setMerchRotation(0);
          setMerchShowBack(false);
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
        } else if (showMerchInline) {
          setShowMerchInline(false);
          setSelectedMerchInline(null);
          setMerchRotation(0);
          setMerchShowBack(false);
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
  }, [isOpen, onClose, showElementMenu, showRelicsModal, showElementInfo, showRelicsInline, showMerchInline, isEditingName, profile]);

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
        const isDarknessPlanet = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          return (includesCI(name, 'darkness') && includesCI(name, 'planet')) || includesCI(url, 'darkness') || includesCI(url, 'planet_darkness');
        };
        const isLogo2 = (r: Relic) => {
          const name = norm(r.relic_name);
          const url = norm(r.icon_url);
          const reName = /logo\s*-?\s*2(?!\d)/i;
          return reName.test(name) || includesCI(url, 'logo-2') || includesCI(url, 'logo_2');
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
          // Swapped: Darkness Planet to position 4, Logo-2 to position 16
          { pred: isDarknessPlanet, index: 3 },           // position 4
          { pred: isLogo2, index: 15 },                   // position 16
          // Wallpapers 1-4 on row 2 (positions 5-8)
          { pred: (r) => isWallpaperN(r, 1), index: 4 },  // position 5
          { pred: (r) => isWallpaperN(r, 2), index: 5 },  // position 6
          { pred: (r) => isWallpaperN(r, 3), index: 6 },  // position 7
          { pred: (r) => isWallpaperN(r, 4), index: 7 },  // position 8
          // Wallpaper 5 on row 3
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

  // Fetch all badges from database
  const fetchAllBadges = async () => {
    try {
      const { data: badgesData, error: badgesError } = await supabaseBrowser
        .from('badges')
        .select('id, badge_name, icon_url, description, category')
        .order('badge_name', { ascending: true });

      if (badgesError) {
        console.error('Error fetching badges:', badgesError);
        setAllBadges([]);
      } else {
        setAllBadges(badgesData || []);
      }
    } catch (error) {
      console.log('Badges table not found, skipping');
      setAllBadges([]);
    }
  };

  // Fetch all merch items from database
  const fetchAllMerch = async () => {
    try {
      const response = await fetch('/api/merch/items');
      if (!response.ok) {
        console.error('Error fetching merch items');
        setAllMerch([]);
        return;
      }
      const data = await response.json();
      setAllMerch(data.data || []);
    } catch (error) {
      console.log('Error fetching merch items:', error);
      setAllMerch([]);
    }
  };

  // Fetch user's merch order dates and per-color unlock tracking
  const fetchUserMerchDates = async () => {
    if (!user) return;
    try {
      const { data: orders, error } = await supabaseBrowser
        .from('orders')
        .select('merch_item_id, item_id, created_at, selected_color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error fetching user orders:', error);
        return;
      }

      // Build a map of merch item ID to collection date
      const dateMap: Record<string, string> = {};
      // Build a map of merch item ID to array of unlocked color values
      const colorMap: Record<string, string[]> = {};
      orders?.forEach(order => {
        const merchId = order.merch_item_id || order.item_id;
        if (merchId && !dateMap[merchId]) {
          dateMap[merchId] = order.created_at;
        }
        // Track per-color unlocks
        if (merchId && order.selected_color) {
          if (!colorMap[merchId]) colorMap[merchId] = [];
          if (!colorMap[merchId].includes(order.selected_color)) {
            colorMap[merchId].push(order.selected_color);
          }
        }
      });
      setUserMerchDates(dateMap);
      setUnlockedMerchColors(colorMap);
    } catch (error) {
      console.log('Error fetching user merch dates:', error);
    }
  };

  // Fetch user's unlocked badges and relics
  const fetchUnlockedItems = async () => {
    if (!user) return;

    setLoading(true);
    console.log('[ProfilePopover] Fetching unlocked items for user:', user.id);

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
            obtained_at,
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
        console.error('[ProfilePopover] Error fetching user badges:', badgeResult.error);
        setUserBadges([]);
      } else {
        console.log('[ProfilePopover] Fetched user badges:', badgeResult.data?.length || 0);
        setUserBadges(badgeResult.data || []);
      }

      // Handle relics with detailed error logging
      if (relicResult.error) {
        console.error('[ProfilePopover] Error fetching user_relics:', {
          message: relicResult.error.message,
          code: relicResult.error.code,
          details: relicResult.error.details,
          hint: relicResult.error.hint,
        });

        // Check for RLS/permission denied errors
        if (
          relicResult.error.message?.toLowerCase().includes('permission') ||
          relicResult.error.message?.toLowerCase().includes('rls') ||
          relicResult.error.code === '42501' ||
          relicResult.error.code === 'PGRST301'
        ) {
          console.error('[ProfilePopover] RLS/Permission error on user_relics table - SELECT is blocked. All relics will show as locked. Check your Supabase RLS policies for user_relics.');
        }

        setUserRelics([]);
      } else {
        console.log('[ProfilePopover] Fetched user_relics:', relicResult.data?.length || 0, 'relic_ids:', relicResult.data?.map(r => r.relic_id));

        // Transform the user relics data to match our interface
        const transformedUserRelics = relicResult.data?.map(userRelic => ({
          id: userRelic.id,
          relic_id: userRelic.relic_id,
          obtained_at: userRelic.obtained_at,
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

      // Fetch all badges for the grid display
      await fetchAllBadges();

      // Fetch all merch items for the grid display
      await fetchAllMerch();

      // Fetch user's merch collection dates
      await fetchUserMerchDates();

      // Build available images array
      buildAvailableImages(badgeResult.data || [], relicResult.data || []);
    } catch (error) {
      console.error('[ProfilePopover] Unexpected error fetching unlocked items:', error);
      setUserRelics([]);
      setUserBadges([]);
      setAllRelics([]);
      setAllBadges([]);
      setAllMerch([]);
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
      // Only update profiles table - never public_profiles_table (it's a read-only view)
      const { error } = await supabaseBrowser
        .from('profiles')
        .update({
          name: editedName.trim()
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

  // Handle saving profile image changes ONLY
  const handleSave = async () => {
    if (!profile || !user) return;

    // Check if the selected image is different from current profile image
    const currentImageUrl = profile.profile_image_url || getElementImageUrl(profile.element);
    if (selectedImageUrl === currentImageUrl) {
      // No change, just close
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Log the exact update we're about to perform
      console.log('[handleSave] Updating profile image:', {
        table: 'profiles',
        id: user.id,
        profile_image_url: selectedImageUrl
      });

      // Update ONLY profile_image_url - no other fields
      const { data, error } = await supabaseBrowser
        .from('profiles')
        .update({ profile_image_url: selectedImageUrl })
        .eq('id', user.id)
        .select('id, profile_image_url');

      if (error) {
        console.error('[handleSave] Error updating profile_image_url:', error.code, error.message, error);
        return;
      }

      console.log('[handleSave] Profile image updated successfully:', data);

      // Refresh profile context to update UI immediately
      await refreshProfile();

      try { sfx.play('alien-wave', 0.6); } catch {}

      onClose();
    } catch (error) {
      console.error('[handleSave] Error saving profile image:', error);
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
        className="fixed flex items-end justify-center"
        style={{
          zIndex: 2147483647,
          pointerEvents: 'none',
          top: 'var(--profile-bar-boundary, 64px)',
          left: 0,
          right: 0,
          bottom: 'calc(var(--light-beam-boundary) + var(--beam-height))'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '150px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(0,255,255,0.5) 0%, rgba(0,255,255,0.3) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(80px)'
          }}
        />
      </div>

      {/* Profile Modal */}
      <div
        className="fixed flex items-start justify-center overflow-hidden"
        style={{
          zIndex: 2147483648,
          top: 'var(--profile-bar-boundary, 64px)',
          left: 0,
          right: 0,
          bottom: 'calc(var(--light-beam-boundary) + var(--beam-height))',
          paddingTop: '8px'
        }}
      >
        <div
          className="profile-hologram-container overflow-y-auto overflow-x-hidden flex flex-col"
          style={{
            width: 'min(92vw, 500px)',
            height: '100%',
            padding: '16px 24px 0px 24px',
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

          {/* PROFILE Header with underline */}
          <div className="text-center mb-1">
            <h1
              className="text-2xl font-bold inline-block pb-2"
              style={{
                color: '#00FFFF',
                textShadow: '0 0 12px rgba(0,255,255,0.8)',
                letterSpacing: '0.1em',
                borderBottom: '1px solid #00FFFF'
              }}
            >
              PROFILE
            </h1>
          </div>

          {/* Top section with Profile Image and Header */}
          <div className="flex items-start justify-between mb-1">
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

                {/* Checkmark confirmation button - Top Right of Image - ONLY show when image has changed */}
                {!isEditingName && selectedImageUrl !== (profile?.profile_image_url || getElementImageUrl(profile?.element)) && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
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
                      fontSize: '32px',
                      fontWeight: 'bold',
                      width: '100%',
                      maxWidth: '220px'
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
                  className="text-left cursor-pointer transition-all duration-200 hover:scale-[1.08]"
                  style={{
                    color: '#00FFFF',
                    textShadow: '0 0 8px rgba(0,255,255,0.6)',
                    fontSize: '32px',
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

              {/* Journey, Element, and BOOST row */}
              <div className="flex items-center justify-between w-full mt-0">
                {/* Left side - Journey and Element stacked */}
                <div className="flex flex-col">
                  {/* Journey label - clickable to open MY JOURNEY */}
                  {(() => {
                    const { label, color } = getJourneyDisplay();
                    return (
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.4); } catch {}
                          onClose();
                          window.dispatchEvent(new CustomEvent('openJourneyModal'));
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        className="text-xl font-semibold tracking-wide transition-all duration-200 hover:scale-105"
                        style={{
                          color,
                          textShadow: `0 0 6px ${color}80`,
                          letterSpacing: '0.06em',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })()}

                  {/* Element */}
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
                  className="font-bold text-xl transition-all duration-200 hover:scale-[1.12] cursor-pointer flex items-center"
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

                {/* Right side - BOOST Section */}
                <div
                  className="hidden flex flex-col items-center px-3 py-2 rounded-lg relative"
                  style={{
                    background: 'rgba(0,255,255,0.08)',
                    border: '1px solid rgba(0,255,255,0.4)',
                    minHeight: '60px'
                  }}
                >
                  <span
                    className="font-bold text-xs mb-1"
                    style={{
                      color: '#00FFFF',
                      textShadow: '0 0 10px rgba(0,255,255,0.8)',
                      letterSpacing: '0.1em'
                    }}
                  >
                    BOOST
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Listening Boost Icon */}
                    {(() => {
                      const listeningBoost = activeBoosts.find(b =>
                        b.boostKey === 'deep_focus' ||
                        b.boostKey === 'boost_listening' ||
                        b.boostKey === 'boost_deep_focus'
                      );
                      const isActive = !!listeningBoost;
                      return (
                        <img
                          src="/relics/listening_boost.webp"
                          alt="Listening Boost"
                          onClick={() => { sfx.play('flip'); setSelectedBoostPopup(selectedBoostPopup === 'listening' ? null : 'listening'); }}
                          className="w-8 h-8 object-contain cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(0,255,255,0.8))' : 'grayscale(100%) opacity(0.4)',
                            transition: 'filter 0.3s ease, transform 0.2s ease'
                          }}
                        />
                      );
                    })()}
                    {/* Streak Shield Icon (Center) */}
                    {(() => {
                      const streakBoost = activeBoosts.find(b =>
                        b.boostKey === 'streak_shield' ||
                        b.boostKey === 'boost_streak_shield'
                      );
                      const isActive = !!streakBoost;
                      return (
                        <img
                          src="/relics/streak_shield.webp"
                          alt="Streak Shield"
                          onClick={() => { sfx.play('flip'); setSelectedBoostPopup(selectedBoostPopup === 'streak' ? null : 'streak'); }}
                          className="w-10 h-10 object-contain cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(0,255,255,0.8))' : 'grayscale(100%) opacity(0.4)',
                            transition: 'filter 0.3s ease, transform 0.2s ease'
                          }}
                        />
                      );
                    })()}
                    {/* Reflection Boost Icon */}
                    {(() => {
                      const reflectionBoost = activeBoosts.find(b =>
                        b.boostKey === 'reflection_boost' ||
                        b.boostKey === 'boost_reflection'
                      );
                      const isActive = !!reflectionBoost;
                      return (
                        <img
                          src="/relics/reflection.webp"
                          alt="Reflection Boost"
                          onClick={() => { sfx.play('flip'); setSelectedBoostPopup(selectedBoostPopup === 'reflection' ? null : 'reflection'); }}
                          className="w-8 h-8 object-contain cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(0,255,255,0.8))' : 'grayscale(100%) opacity(0.4)',
                            transition: 'filter 0.3s ease, transform 0.2s ease'
                          }}
                        />
                      );
                    })()}
                  </div>
                  {/* Boost Popup */}
                  {selectedBoostPopup && (
                    <div
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-3 text-center"
                      style={{
                        background: 'rgba(0,20,40,0.95)',
                        border: '1px solid rgba(0,255,255,0.5)',
                        boxShadow: '0 0 20px rgba(0,255,255,0.3)',
                        minWidth: '160px'
                      }}
                      onClick={() => setSelectedBoostPopup(null)}
                    >
                      {selectedBoostPopup === 'listening' && (() => {
                        const boost = activeBoosts.find(b =>
                          b.boostKey === 'deep_focus' ||
                          b.boostKey === 'boost_listening' ||
                          b.boostKey === 'boost_deep_focus'
                        );
                        return (
                          <>
                            <div className="font-bold text-sm" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
                              Deep Focus
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'rgba(0,255,255,0.85)' }}>
                              2× Listen Rewards
                            </div>
                            <div className="text-xs mt-1" style={{ color: boost ? 'rgba(0,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
                              Uses left: {boost?.usesLeft ?? 0}
                            </div>
                          </>
                        );
                      })()}
                      {selectedBoostPopup === 'streak' && (() => {
                        const boost = activeBoosts.find(b =>
                          b.boostKey === 'streak_shield' ||
                          b.boostKey === 'boost_streak_shield'
                        );
                        return (
                          <>
                            <div className="font-bold text-sm" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
                              Streak Shield
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'rgba(0,255,255,0.85)' }}>
                              +1 Streak Protection
                            </div>
                            <div className="text-xs mt-1" style={{ color: boost ? 'rgba(0,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
                              Uses left: {boost?.usesLeft ?? 0}
                            </div>
                          </>
                        );
                      })()}
                      {selectedBoostPopup === 'reflection' && (() => {
                        const boost = activeBoosts.find(b =>
                          b.boostKey === 'reflection_boost' ||
                          b.boostKey === 'boost_reflection'
                        );
                        return (
                          <>
                            <div className="font-bold text-sm" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
                              Reflection Boost
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'rgba(0,255,255,0.85)' }}>
                              2× Journal Rewards
                            </div>
                            <div className="text-xs mt-1" style={{ color: boost ? 'rgba(0,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
                              Uses left: {boost?.usesLeft ?? 0}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Stats Row - Daily Streak, HeartCoins, Soul Stars */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-0 rounded-lg" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Daily Streak - Left */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255,100,50,0.8))' }}
                >
                  <path
                    d="M12 2C12 2 7 7 7 12C7 15.5 9 18 12 20C15 18 17 15.5 17 12C17 7 12 2 12 2Z"
                    fill="#FF6432"
                  />
                  <path
                    d="M12 6C12 6 9 9 9 12C9 14 10.5 16 12 17C13.5 16 15 14 15 12C15 9 12 6 12 6Z"
                    fill="#FFB830"
                  />
                </svg>
                <span
                  className="font-bold text-xl"
                  style={{
                    color: '#FF6432',
                    textShadow: '0 0 10px rgba(255,100,50,0.7)'
                  }}
                >
                  {profile?.daily_streak || 0}
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.5)'
                }}
              >
                Streak
              </span>
            </div>

            {/* Total HeartCoins - Center */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <img
                  src="/elements/heart-coin.webp"
                  alt="HeartCoin"
                  className="w-8 h-8 object-contain"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,157,0.8))' }}
                />
                <span
                  className="font-bold text-xl"
                  style={{
                    color: '#FF6B9D',
                    textShadow: '0 0 10px rgba(255,107,157,0.7)'
                  }}
                >
                  {profile?.heartcoin_total || 0}
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.5)'
                }}
              >
                HeartCoins Earned
              </span>
            </div>

            {/* Total Soul Stars - Right */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <img
                  src="/elements/soul-star.webp"
                  alt="Soul Star"
                  className="w-8 h-8 object-contain"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' }}
                />
                <span
                  className="font-bold text-xl"
                  style={{
                    color: '#A855F7',
                    textShadow: '0 0 10px rgba(168,85,247,0.7)'
                  }}
                >
                  {totalSoulStars}
                </span>
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.5)'
                }}
              >
                SoulStars
              </span>
            </div>
          </div>

          {/* Relics & Merch Buttons Row */}
          <div className="flex items-center justify-between px-2 py-1 mb-0 rounded-lg gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {/* Relics Button - Left */}
            <button
              onClick={() => { setShowRelicsInline(true); setShowMerchInline(false); try { sfx.play('click', 0.6); } catch {} }}
              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))',
                border: '1px solid rgba(255,215,0,0.5)',
                boxShadow: '0 0 12px rgba(255,215,0,0.3)'
              }}
            >
              <img
                src="/elements/relics.webp"
                alt="Relics"
                className="w-8 h-8 object-contain"
              />
              <span
                className="font-semibold text-sm"
                style={{
                  color: '#FFD700',
                  textShadow: '0 0 8px rgba(255,215,0,0.8)'
                }}
              >
                Relics
              </span>
            </button>

            {/* Merch Button - Right */}
            <button
              onClick={() => { setShowMerchInline(true); setShowRelicsInline(false); try { sfx.play('click', 0.6); } catch {} }}
              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))',
                border: '1px solid rgba(168,85,247,0.5)',
                boxShadow: '0 0 12px rgba(168,85,247,0.3)'
              }}
            >
              <img
                src="/elements/merch.webp"
                alt="Merch"
                className="w-8 h-8 object-contain"
              />
              <span
                className="font-semibold text-sm"
                style={{
                  color: '#A855F7',
                  textShadow: '0 0 8px rgba(168,85,247,0.8)'
                }}
              >
                Merch
              </span>
            </button>
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

              {/* Tab Navigation */}
              <div className="flex justify-center gap-4 mb-3">
                {(['elements', 'relics', 'badges'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setProfileImageTab(tab);
                      try { sfx.play('click', 0.4); } catch {}
                    }}
                    onMouseEnter={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                    }}
                    className="px-3 py-1 text-xs font-bold tracking-wider transition-all duration-200"
                    style={{
                      color: profileImageTab === tab
                        ? (tab === 'badges' ? '#FFD700' : '#00FFFF')
                        : 'rgba(255,255,255,0.5)',
                      textShadow: profileImageTab === tab
                        ? (tab === 'badges' ? '0 0 8px rgba(255,215,0,0.8)' : '0 0 8px rgba(0,255,255,0.8)')
                        : 'none',
                      borderBottom: profileImageTab === tab
                        ? (tab === 'badges' ? '2px solid #FFD700' : '2px solid #00FFFF')
                        : '2px solid transparent'
                    }}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Elements Section */}
              {profileImageTab === 'elements' && (
              <div className="mb-2">
                <div className="grid grid-cols-4 gap-2 justify-center max-w-xs mx-auto">
                  {getAllElements().map((element) => (
                    <button
                      key={element.name}
                      onClick={() => {
                        if (!user) return;

                        // Update local state only - save will happen when clicking green check
                        setSelectedImageUrl(element.url);
                        setShowElementMenu(false);
                        try { sfx.play('flip', 0.6); } catch {}
                      }}
                      onMouseEnter={() => {
                        try { sfx.play('hover', 0.3); } catch {}
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
              )}

              {/* Relics Section */}
              {profileImageTab === 'relics' && (
              <div className="mb-1">
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
                          if (!user || !isUnlocked || !relic.icon_url) return;

                          // Update local state only - save will happen when clicking green check
                          setSelectedImageUrl(relic.icon_url);
                          setShowElementMenu(false);
                          try { sfx.play('flip', 0.6); } catch {}
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        disabled={!isUnlocked}
                        className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed ${
                            selectedImageUrl === relic.icon_url
                              ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]'
                              : isUnlocked
                                ? 'border-cyan-400'
                                : 'border-white/30 hover:border-cyan-400/60'
                          }`}
                        style={isUnlocked && selectedImageUrl !== relic.icon_url ? { boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)' } : {}}
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
              )}

              {/* Badges Section */}
              {profileImageTab === 'badges' && (
              <div className="mb-1">
                {/* Badge Category Filters */}
                <div className="flex flex-col items-center gap-1 mb-3 max-w-xs mx-auto">
                  {/* Row 1 */}
                  <div className="flex justify-center gap-1">
                    {[
                      { id: 'soul', label: 'SOUL' },
                      { id: 'collector', label: 'COLLECTOR' },
                      { id: 'elemental-streak', label: 'ELEMENTAL' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setBadgeCategoryFilter(cat.id);
                          try { sfx.play('click', 0.4); } catch {}
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded transition-all duration-200"
                        style={{
                          background: badgeCategoryFilter === cat.id
                            ? 'rgba(255,215,0,0.3)'
                            : 'rgba(255,255,255,0.1)',
                          border: badgeCategoryFilter === cat.id
                            ? '1px solid #FFD700'
                            : '1px solid rgba(255,255,255,0.2)',
                          color: badgeCategoryFilter === cat.id
                            ? '#FFD700'
                            : 'rgba(255,255,255,0.6)',
                          textShadow: badgeCategoryFilter === cat.id
                            ? '0 0 6px rgba(255,215,0,0.6)'
                            : 'none'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* Row 2 */}
                  <div className="flex justify-center gap-1">
                    {[
                      { id: 'listening', label: 'LISTENING' },
                      { id: 'currency', label: 'CURRENCY' },
                      { id: 'community', label: 'COMMUNITY' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setBadgeCategoryFilter(cat.id);
                          try { sfx.play('click', 0.4); } catch {}
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded transition-all duration-200"
                        style={{
                          background: badgeCategoryFilter === cat.id
                            ? 'rgba(255,215,0,0.3)'
                            : 'rgba(255,255,255,0.1)',
                          border: badgeCategoryFilter === cat.id
                            ? '1px solid #FFD700'
                            : '1px solid rgba(255,255,255,0.2)',
                          color: badgeCategoryFilter === cat.id
                            ? '#FFD700'
                            : 'rgba(255,255,255,0.6)',
                          textShadow: badgeCategoryFilter === cat.id
                            ? '0 0 6px rgba(255,215,0,0.6)'
                            : 'none'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 justify-center max-w-xs mx-auto">
                  {(() => {
                    const filteredBadges = allBadges.length > 0
                      ? allBadges.filter(b => b.category === badgeCategoryFilter)
                      : [];
                    const displayBadges = filteredBadges.length > 0
                      ? filteredBadges.slice(0, 16)
                      : Array.from({ length: 8 }, (_, i) => ({
                          id: `placeholder-badge-${i}`,
                          badge_name: `Badge ${i + 1}`,
                          icon_url: null,
                          description: null,
                          category: null
                        }));
                    return displayBadges;
                  })().map((badge, i) => {
                    const unlockedBadgeIds = new Set(userBadges.map(b => b.badge_id));
                    const isUnlocked = badge && badge.id ? unlockedBadgeIds.has(badge.id) : false;
                    const hasImage = Boolean(badge.icon_url);
                    return (
                      <button
                        key={`badge-${badge.id}`}
                        onClick={() => {
                          if (!user || !isUnlocked || !badge.icon_url) return;

                          // Update local state only - save will happen when clicking green check
                          setSelectedImageUrl(badge.icon_url);
                          setShowElementMenu(false);
                          try { sfx.play('flip', 0.6); } catch {}
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        disabled={!isUnlocked}
                        className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed ${
                            selectedImageUrl === badge.icon_url
                              ? 'border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.6)]'
                              : isUnlocked
                                ? 'border-yellow-400'
                                : 'border-white/30 hover:border-yellow-400/60'
                          }`}
                        style={isUnlocked && selectedImageUrl !== badge.icon_url ? { boxShadow: '0 0 8px rgba(255,215,0,0.6), 0 0 16px rgba(255,215,0,0.3)' } : {}}
                        title={isUnlocked ? (badge.badge_name || `Badge ${i + 1}`) : 'Locked'}
                      >
                        {hasImage ? (
                          <img
                            src={badge.icon_url!}
                            alt={badge.badge_name || `Badge ${i + 1}`}
                            className={`w-full h-full object-cover ${isUnlocked ? '' : 'grayscale'}`}
                            style={{ opacity: isUnlocked ? 1 : 0.5 }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement as HTMLElement | null;
                              if (parent) {
                                parent.innerHTML = '🏆';
                                parent.style.color = '#666';
                                parent.style.fontSize = '8px';
                                parent.style.display = 'flex';
                                parent.style.alignItems = 'center';
                                parent.style.justifyContent = 'center';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">🏆</div>
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
              )}

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
              {selectedRelicInline ? (
                /* Fullscreen Enlarged Relic View */
                <div className="absolute inset-0 flex flex-col">
                  {/* Controls bar */}
                  <div className="flex items-center justify-between gap-2 p-3 bg-black/60">
                    <button
                      onClick={() => { setSelectedRelicInline(null); setRelicRotationInline(0); try { sfx.play('close', 0.6); } catch {} }}
                      onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
                      className="w-9 h-9 flex items-center justify-center rounded-md text-lg font-semibold transition-all hover:scale-110"
                      style={{
                        background: 'rgba(0,255,255,0.15)',
                        border: '1px solid rgba(0,255,255,0.5)',
                        color: '#00FFFF'
                      }}
                    >
                      ←
                    </button>
                    <button
                      onClick={() => handleDownload(selectedRelicInline)}
                      onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
                      className="px-4 py-2 rounded-md text-sm font-semibold transition-all hover:scale-110"
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
                  {/* Full image area */}
                  <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/80">
                    {/* Glow circle behind the image */}
                    <div className="absolute w-40 h-40 bg-[#00FFFF]/30 rounded-full blur-xl" style={{ zIndex: 0 }} />
                    <TiltSpinCard
                      className="relative w-full h-full animate-[pulse-float_3s_ease-in-out_infinite]"
                      style={{
                        animation: 'pulse-float 3s ease-in-out infinite',
                        zIndex: 1
                      }}
                      maxRotateX={10}
                      sensitivity={0.3}
                      returnDuration={400}
                      enableSpin={true}
                      spinSensitivity={0.8}
                      onRotationChange={(deg) => setRelicRotationInline(deg)}
                      onTap={() => {
                        setRelicRotationInline(prev => prev + 180);
                        try { sfx.play('click', 0.5); } catch {}
                      }}
                    >
                      <img
                        src={selectedRelicInline}
                        alt="Selected relic"
                        className="w-full h-full object-contain"
                        style={{
                          transform: `rotateY(${relicRotationInline}deg)`,
                          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: 'drop-shadow(0 0 15px rgba(0, 255, 255, 0.4))',
                        }}
                        draggable={false}
                      />
                    </TiltSpinCard>
                  </div>
                </div>
              ) : (
                <>
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

                  {/* Relics Grid */}
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
                        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                        key={`relic-inline-${relic.id}`}
                        className={`aspect-square rounded-lg bg-black/40 relative overflow-hidden transition-all hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed ${isUnlocked ? 'border border-cyan-400' : 'border border-white/20'}`}
                        style={{
                          minHeight: '68px',
                          ...(isUnlocked ? { boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)' } : {})
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
                </>
              )}

            </div>
          )}

          {/* Merch Collection - Full Overlay */}
          {showMerchInline && (
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
                  setShowMerchInline(false);
                  setSelectedMerchInline(null);
                  setMerchRotation(0);
                  setMerchShowBack(false);
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
                MERCH COLLECTION
              </div>

              {/* Info text - moved below header */}
              <div className="text-center mb-2">
                <p className="text-sm text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
                  Browse exclusive merchandise from the Heartverse
                </p>
              </div>

              {/* Merch Grid / Expanded View - Inline */}
              {selectedMerchInline ? (
                <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ borderRadius: 18, zIndex: 20, background: 'rgba(0,0,0,0.95)' }}>
                  {/* Compact header bar */}
                  <div className="flex items-center px-3 py-2 bg-black/80 border-b border-cyan-400/40 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedMerchInline(null); setSelectedMerchColor(null); setMerchRotation(0); setMerchShowBack(false); try { sfx.play('close', 0.6); } catch {} }}
                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: 'rgba(0,255,255,0.15)',
                        border: '1px solid rgba(0,255,255,0.5)',
                        color: '#00FFFF',
                        fontSize: '18px'
                      }}
                    >
                      ←
                    </button>
                    <div className="flex flex-col items-center flex-1">
                      <span
                        className="text-base font-bold text-center"
                        style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.8)' }}
                      >
                        {selectedMerchInline.name}
                      </span>
                      {userMerchDates[selectedMerchInline.id] && (
                        <span
                          className="text-[10px]"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          Collected: {new Date(userMerchDates[selectedMerchInline.id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {/* Color variant dots - top right (per-color unlock tracking) */}
                    {(() => {
                      // Fallback color variants for items without DB variant_options
                      const FALLBACK_COLORS: Record<string, Array<{ value: string; label: string; images: { main: string } }>> = {
                        bracelet: [
                          { value: 'pink', label: 'Pink', images: { main: '/store/bracelet-pink.webp' } },
                          { value: 'blue', label: 'Blue', images: { main: '/store/bracelet-blue.webp' } },
                          { value: 'yellow', label: 'Yellow', images: { main: '/store/bracelet-yellow.webp' } },
                        ],
                        beanie: [
                          { value: 'black', label: 'Black', images: { main: '/store/beanie-front-black.webp' } },
                          { value: 'blue', label: 'Blue', images: { main: '/store/beanie-front-blue.webp' } },
                          { value: 'pink', label: 'Pink', images: { main: '/store/beanie-front-pink.webp' } },
                        ],
                      };

                      // Try DB variant_options first
                      let colors: any[] | null = null;
                      const opts = selectedMerchInline.variant_options;
                      if (opts) {
                        let parsed = opts;
                        if (typeof parsed === 'string') {
                          try { parsed = JSON.parse(parsed); } catch { parsed = null; }
                        }
                        if (parsed && typeof parsed === 'object') {
                          const dbColors = (parsed as any).colors;
                          if (Array.isArray(dbColors) && dbColors.length > 0) colors = dbColors;
                        }
                      }
                      // Fallback for known items
                      if (!colors) {
                        colors = FALLBACK_COLORS[selectedMerchInline.slug] || null;
                      }
                      if (!colors || colors.length === 0) return <div className="w-8" />;

                      const dotColorMap: Record<string, string> = {
                        black: '#1a1a1a', blue: '#3b82f6', pink: '#ec4899',
                        yellow: '#fbbf24', red: '#ef4444', white: '#ffffff'
                      };

                      // Per-color unlock: check which colors user has purchased
                      const itemUnlockedColors = unlockedMerchColors[selectedMerchInline.id] || [];
                      // Default to first unlocked color (not first in list)
                      const firstUnlocked = colors.find((c: any) => itemUnlockedColors.includes(c.value))?.value;
                      const currentColor = selectedMerchColor || firstUnlocked || colors[0]?.value;

                      return (
                        <div className="flex items-center gap-1.5">
                          {colors.map((c: any) => {
                            const dotColor = dotColorMap[c.value?.toLowerCase()] || '#888';
                            const isSelected = currentColor === c.value;
                            const isColorUnlocked = itemUnlockedColors.includes(c.value);
                            return (
                              <button
                                key={c.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isColorUnlocked) return; // Locked colors not clickable
                                  try { sfx.play('click', 0.5); } catch {}
                                  setSelectedMerchColor(c.value);
                                }}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  !isColorUnlocked
                                    ? 'border-white/15 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-[#F2EF1D] ring-2 ring-[#F2EF1D]/50 scale-110 hover:scale-125'
                                      : 'border-white/40 hover:scale-125'
                                }`}
                                style={{
                                  backgroundColor: dotColor,
                                  opacity: isColorUnlocked ? 1 : 0.5,
                                  boxShadow: isSelected && isColorUnlocked ? `0 0 10px ${dotColor}` : 'none',
                                  filter: isColorUnlocked ? 'none' : 'grayscale(30%)',
                                }}
                                title={isColorUnlocked ? c.label : `${c.label} (Locked)`}
                                aria-label={isColorUnlocked ? `Select ${c.label}` : `${c.label} locked`}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Full-size image container */}
                  <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-black/80 p-2">
                    <TiltSpinCard
                      className="relative w-full h-full animate-[pulse-float_3s_ease-in-out_infinite]"
                      style={{
                        animation: 'pulse-float 3s ease-in-out infinite',
                        zIndex: 1
                      }}
                      maxRotateX={10}
                      sensitivity={0.3}
                      returnDuration={400}
                      enableSpin={true}
                      spinSensitivity={0.8}
                      onRotationChange={(rot: number) => {
                        setMerchRotation(rot);
                        // Update back/front based on rotation angle during drag
                        const showBack = Math.round(rot / 180) % 2 !== 0;
                        setMerchShowBack(showBack);
                      }}
                      onClick={() => {
                        try { sfx.play('flip', 0.8); } catch {}
                        setMerchRotation(prev => prev + 180);
                        // Swap image at animation midpoint (200ms into 400ms transition)
                        // when card is edge-on and invisible
                        setTimeout(() => setMerchShowBack(prev => !prev), 200);
                      }}
                    >
                      <img
                        src={(() => {
                          // Fallback color variants for items without DB variant_options
                          const FALLBACK_COLORS: Record<string, Array<{ value: string; images: { main: string; back?: string } }>> = {
                            bracelet: [
                              { value: 'pink', images: { main: '/store/bracelet-pink.webp' } },
                              { value: 'blue', images: { main: '/store/bracelet-blue.webp' } },
                              { value: 'yellow', images: { main: '/store/bracelet-yellow.webp' } },
                            ],
                            beanie: [
                              { value: 'black', images: { main: '/store/beanie-front-black.webp', back: '/store/beanie-back-black.webp' } },
                              { value: 'blue', images: { main: '/store/beanie-front-blue.webp', back: '/store/beanie-back-blue.webp' } },
                              { value: 'pink', images: { main: '/store/beanie-front-pink.webp', back: '/store/beanie-back-pink.webp' } },
                            ],
                          };

                          // Resolve effective color: explicit selection > first unlocked > first in list
                          let effectiveColor = selectedMerchColor;
                          if (!effectiveColor) {
                            // Build color list to find first unlocked
                            let allColors: any[] | null = null;
                            if (selectedMerchInline.variant_options) {
                              let parsed = selectedMerchInline.variant_options;
                              if (typeof parsed === 'string') {
                                try { parsed = JSON.parse(parsed); } catch { parsed = null; }
                              }
                              if (parsed && typeof parsed === 'object') {
                                const dbC = (parsed as any).colors;
                                if (Array.isArray(dbC) && dbC.length > 0) allColors = dbC;
                              }
                            }
                            if (!allColors) allColors = FALLBACK_COLORS[selectedMerchInline.slug] || null;
                            if (allColors && allColors.length > 0) {
                              const itemUnlocked = unlockedMerchColors[selectedMerchInline.id] || [];
                              const firstUnlocked = allColors.find((c: any) => itemUnlocked.includes(c.value));
                              effectiveColor = firstUnlocked?.value || null;
                            }
                          }

                          const isShowingBack = merchShowBack;

                          if (effectiveColor) {
                            // Try DB variant_options first
                            if (selectedMerchInline.variant_options) {
                              let opts = selectedMerchInline.variant_options;
                              if (typeof opts === 'string') {
                                try { opts = JSON.parse(opts); } catch { opts = null; }
                              }
                              const colors = (opts as any)?.colors;
                              if (Array.isArray(colors)) {
                                const match = colors.find((c: any) => c.value === effectiveColor);
                                if (match) {
                                  if (isShowingBack && match.images?.back) return match.images.back;
                                  if (match.images?.main || match.images?.front) return match.images.main || match.images.front;
                                }
                              }
                            }
                            // Fallback for known items
                            const fallback = FALLBACK_COLORS[selectedMerchInline.slug];
                            if (fallback) {
                              const match = fallback.find(c => c.value === effectiveColor);
                              if (match) {
                                if (isShowingBack && match.images.back) return match.images.back;
                                if (match.images.main) return match.images.main;
                              }
                            }
                          }
                          if (isShowingBack && selectedMerchInline.image_url_2) return selectedMerchInline.image_url_2;
                          return selectedMerchInline.image_url || '';
                        })()}
                        alt={selectedMerchInline.name}
                        className="w-full h-full object-contain"
                        style={{
                          transform: `rotateY(${merchRotation}deg)`,
                          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        draggable={false}
                      />
                    </TiltSpinCard>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 mb-1" style={{ maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {(allMerch.length > 0 ? allMerch.slice(0, 16) : Array.from({ length: 16 }, (_, i) => ({
                    id: `placeholder-${i}`,
                    name: `Merch ${i + 1}`,
                    slug: `merch-${i + 1}`,
                    description: null,
                    image_url: null,
                    image_url_2: null,
                    cost_usd: null,
                    price_heartcoins: 0,
                    stripe_url: null,
                    is_active: true,
                    min_tier: null,
                    category: 'physical' as const,
                    created_at: '',
                    updated_at: ''
                  }))).map((item, i) => {
                    const hasImage = Boolean(item.image_url);
                    const isUnlocked = Boolean(userMerchDates[item.id]);
                    return (
                      <button
                        type="button"
                        onClick={() => { if (isUnlocked && hasImage) { setSelectedMerchInline(item as MerchItem); try { sfx.play('click', 0.6); } catch {} } }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                        key={`merch-inline-${item.id}`}
                        className={`aspect-square rounded-lg bg-black/40 relative overflow-hidden transition-all hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed ${isUnlocked ? 'border border-cyan-400' : 'border border-white/20'}`}
                        style={{
                          minHeight: '82px',
                          ...(isUnlocked ? { boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)' } : {})
                        }}
                        disabled={!isUnlocked}
                        title={isUnlocked ? (hasImage ? `View ${item.name}` : item.name || `Merch ${i + 1}`) : 'Locked'}
                      >
                        {hasImage ? (
                          <img
                            src={item.image_url!}
                            alt={item.name || `Merch ${i + 1}`}
                            className={`absolute inset-0 w-full h-full object-contain p-1 ${isUnlocked ? '' : 'grayscale'}`}
                            style={{ opacity: isUnlocked ? 1 : 0.5 }}
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">🛍️</div>
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

              {/* Element Info Layout */}
              <div className="mb-2">
                <h3 className="text-lg font-bold mb-1 text-center"
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


              {/* ALIGN Button */}
              <button
                onClick={async () => {
                  if (!profile || !user) return;
                  
                  const currentElement = getCurrentElementData();
                  
                  try {
                    // Update user's element in profile (profiles table only)
                    const { error } = await supabaseBrowser
                      .from('profiles')
                      .update({
                        element: currentElement.name,
                        profile_image_url: currentElement.url
                      })
                      .eq('id', user.id);

                    if (error) {
                      console.error('Error updating profile element:', error);
                      return;
                    }

                    // Refresh profile context to update UI immediately
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


          {/* Buttons Container */}
          <div
            className="mt-0.5"
            style={{
              visibility: (showRelicsInline || showMerchInline || showElementMenu || showElementInfo) ? 'hidden' : 'visible'
            }}
          >
              {/* Start Tour Button */}
              <button
                onClick={handleStartTour}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
                className="w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95 mb-1"
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
                className="w-full px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,80,80,0.25), rgba(255,80,80,0.15))',
                  border: '1px solid rgba(255,80,80,0.5)',
                  color: '#FF5050',
                  textShadow: '0 0 8px rgba(255,80,80,0.7)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(255,80,80,0.2)',
                  fontSize: '13px'
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
            {selectedRelicModal ? (
              /* Fullscreen Enlarged Relic View - Modal */
              <div className="flex flex-col" style={{ minHeight: '400px' }}>
                {/* Controls bar */}
                <div className="flex items-center justify-between gap-3 p-3 bg-black/60 rounded-t-lg">
                  <button
                    onClick={() => { setSelectedRelicModal(null); setRelicRotationModal(0); try { sfx.play('close', 0.6); } catch {} }}
                    onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
                    className="w-10 h-10 flex items-center justify-center rounded-md text-xl font-semibold transition-all hover:scale-110"
                    style={{
                      background: 'rgba(0,255,255,0.15)',
                      border: '1px solid rgba(0,255,255,0.5)',
                      color: '#00FFFF'
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => selectedRelicModal && handleDownload(selectedRelicModal)}
                    onMouseEnter={() => { try { sfx.play('hover', 0.4); } catch {} }}
                    className="px-5 py-2.5 rounded-md text-base font-semibold transition-all hover:scale-110"
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
                {/* Full image area */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/80" style={{ minHeight: '350px' }}>
                  {/* Glow circle behind the image */}
                  <div className="absolute w-56 h-56 bg-[#00FFFF]/30 rounded-full blur-xl" style={{ zIndex: 0 }} />
                  <TiltSpinCard
                    className="relative w-full h-full animate-[pulse-float_3s_ease-in-out_infinite]"
                    style={{
                      animation: 'pulse-float 3s ease-in-out infinite',
                      zIndex: 1
                    }}
                    maxRotateX={10}
                    sensitivity={0.3}
                    returnDuration={400}
                    enableSpin={true}
                    spinSensitivity={0.8}
                    onRotationChange={(deg) => setRelicRotationModal(deg)}
                    onTap={() => {
                      setRelicRotationModal(prev => prev + 180);
                      try { sfx.play('click', 0.5); } catch {}
                    }}
                  >
                    <img
                      src={selectedRelicModal}
                      alt="Selected relic"
                      className="w-full h-full object-contain"
                      style={{
                        transform: `rotateY(${relicRotationModal}deg)`,
                        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                        filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.5))',
                      }}
                      draggable={false}
                    />
                  </TiltSpinCard>
                </div>
              </div>
            ) : (
              <>
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

                {/* Relics Grid */}
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
                      className={`aspect-square rounded-lg bg-black/40 relative overflow-hidden transition-all hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed ${isUnlocked ? 'border-2 border-cyan-400' : 'border-2 border-white/20'}`}
                      style={isUnlocked ? { boxShadow: '0 0 8px rgba(0,255,255,0.6), 0 0 16px rgba(0,255,255,0.3)' } : {}}
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

                {/* Info text */}
                <div className="text-center">
                  <p className="text-base text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.85)' }}>
                    Tap the Element of the Day to unlock ancient relics
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
