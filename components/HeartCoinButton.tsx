"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { sfx } from "@/lib/sfx";
import Image from "next/image";
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseBrowser } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { useBonusQuests } from '@/hooks/useBonusQuests';
import { BonusQuestWithCompletion } from '@/types/bonusQuests';
import { useMerchItems } from '@/hooks/useMerchItems';
import { useMerchPurchase } from '@/hooks/useMerchPurchase';
import { MerchItem } from '@/types/merch';
import TiltSpinCard from '@/components/TiltSpinCard';
import { usePlanetRewardsContext } from '@/components/PlanetRewardsProvider';
import { getElementalPlanetImage } from '@/lib/elementalPlanets';

// Helper function to convert MerchItem to StoreItem for backward compatibility
const merchItemToStoreItem = (merchItem: MerchItem): StoreItem => ({
  id: merchItem.slug,
  slug: merchItem.slug,
  title: merchItem.name,
  description: merchItem.description || '',
  image: merchItem.image_url || '',
  image2: merchItem.image_url_2 || undefined,
  priceUsd: merchItem.cost_usd || 0,
  priceHeartCoins: merchItem.price_heartcoins,
  cost: merchItem.price_heartcoins,
  physicalCost: merchItem.price_heartcoins,
  stripeUrl: merchItem.stripe_url || '',
  is_released: merchItem.is_active,
  min_tier: merchItem.min_tier || 'wanderer'
});

// Store item interface
interface StoreItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  image2?: string;
  priceUsd: number;
  priceHeartCoins: number;
  cost?: number;
  stripeUrl: string;
  is_released?: boolean;
  min_tier?: string;
}

// Card interface for Supabase data
interface Card {
  id: string;
  card_name: string;
  element: string;
  rarity: string;
  artwork_url: string;
  description: string;
  is_released: boolean;
  min_tier: string;
  digitalCost?: number;
  physicalCost?: number;
}

// Purchase draft - captures exact item info at moment of "PAY WITH" click
// This prevents stale state bugs where the displayed item changes after click
interface PurchaseDraft {
  merchItemId: string;      // The actual database UUID
  clientSlug: string;       // For logging/debugging
  quantity: number;
  uiCost: number;           // The cost shown to user (for display only - server is authoritative)
  source: 'MERCH' | 'CARDS';
  itemName: string;         // For display in confirm modal
  idempotencyKey: string;   // Generated ONCE when draft is created, reused on confirm
}

// Physical store items - now loaded dynamically from database
// This hardcoded array is replaced by the dynamic PHYSICAL_ITEMS computed in the component
const LEGACY_PHYSICAL_ITEMS: StoreItem[] = [
  {
    id: 'necklace',
    slug: 'necklace',
    title: 'Necklace',
    description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/necklace.png',
    priceUsd: 18,
    priceHeartCoins: 12,
    cost: 12,
    physicalCost: 12,
    stripeUrl: 'https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'pin',
    slug: 'pin',
    title: 'PIN',
    description: 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/pin.png',
    priceUsd: 4.5,
    priceHeartCoins: 3,
    cost: 3,
    physicalCost: 3,
    stripeUrl: 'https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'patch',
    slug: 'patch',
    title: 'PATCH',
    description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/patch.png',
    image2: 'https://ik.imagekit.io/CHXNDLER/STORE/patch-inverse.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    cost: 4,
    physicalCost: 4,
    stripeUrl: 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'sticker',
    slug: 'sticker',
    title: 'Sticker',
    description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/sticker.png',
    priceUsd: 3,
    priceHeartCoins: 2,
    cost: 2,
    physicalCost: 2,
    stripeUrl: 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'hat',
    slug: 'hat',
    title: 'Hat',
    description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/hat.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    cost: 20,
    physicalCost: 20,
    stripeUrl: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'keychain',
    slug: 'keychain',
    title: 'Keychain',
    description: 'A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you\'re connected, always.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/keychain.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    cost: 4,
    physicalCost: 4,
    stripeUrl: 'https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'house-party-poster',
    slug: 'house-party-poster',
    title: 'House Party Poster',
    description: 'This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/house-party-poster.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    cost: 20,
    physicalCost: 20,
    stripeUrl: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'beanie',
    slug: 'beanie',
    title: 'Beanie',
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/beanie-front.png',
    image2: 'https://ik.imagekit.io/CHXNDLER/STORE/beanie-back.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    cost: 20,
    physicalCost: 20,
    stripeUrl: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'button',
    slug: 'button',
    title: 'Button',
    description: 'A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/button.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    cost: 4,
    physicalCost: 4,
    stripeUrl: 'https://buy.stripe.com/6oU14oclr8xfbdd4gg0J',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'bracelet',
    slug: 'bracelet',
    title: 'Bracelet',
    description: "A reminder you wear on your wrist that you're growing, healing, and finding your place. It's a quiet symbol that you belong here, with the ones who feel deeply and love endlessly.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/bracelet.png',
    priceUsd: 24,
    priceHeartCoins: 16,
    cost: 16,
    physicalCost: 16,
    stripeUrl: 'https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'pick',
    slug: 'pick',
    title: 'Pick',
    description: 'Your reminder to follow your passion wherever it leads. A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/pick.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    cost: 4,
    physicalCost: 4,
    stripeUrl: 'https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O',
    is_released: true,
    min_tier: 'wanderer'
  }
];

// Legacy array for fallback - actual PHYSICAL_ITEMS is now computed dynamically from database
const ALL_STORE_ITEMS = [...LEGACY_PHYSICAL_ITEMS];


type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
  onOpenJournal?: () => void;
  onOpenBinder?: () => void;
  heartCoins?: number;
  onHeartCoinsChange?: (newAmount: number) => void;
  // UI state prop from parent; do not forward to DOM
  isActive?: boolean;
  // Journal completion tracking
  journalCompleted?: boolean;
  onJournalCompleted?: () => void;
  // Modal close callback
  onClose?: () => void;
  onBeamColorChange?: (color: string) => void;
};

export default function HeartCoinButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onOpenJournal, onOpenBinder, heartCoins: externalHeartCoins = 0, onHeartCoinsChange, isActive = false, journalCompleted = false, onJournalCompleted, onClose, onBeamColorChange, ...restProps }: Props) {
  const { profile, refreshProfile, setIsJournalOpen } = useProfile();
  const { elementOfDay } = usePlanetRewardsContext();

  // New hooks for database-driven merch
  const { items: merchItems, loading: merchLoading, error: merchError } = useMerchItems('physical');
  const { purchaseWithHeartCoins, updateShipping, isProcessing, error: purchaseError, clearError } = useMerchPurchase();
  
  // Convert MerchItems to StoreItems for backward compatibility
  const PHYSICAL_ITEMS = useMemo(() => 
    merchItems.map(merchItemToStoreItem), 
    [merchItems]
  );
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EARN' | 'USE'>('EARN');
  const [activeUseTab, setActiveUseTab] = useState<'MERCH' | 'CARDS'>('MERCH');
  const [activeEarnTab, setActiveEarnTab] = useState<'DAILY QUESTS' | 'BONUS QUESTS'>('DAILY QUESTS');
  const [selectedCardElement, setSelectedCardElement] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showPhysicalForm, setShowPhysicalForm] = useState(false);
  const [showPhysicalConfirm, setShowPhysicalConfirm] = useState(false);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [currentMerchIndex, setCurrentMerchIndex] = useState(0);
  // Enlarged merch modal state (must be defined before effects referencing it)
  const [enlargedMerchItem, setEnlargedMerchItem] = useState<StoreItem | null>(null);
  
  const [inviteFriendShared, setInviteFriendShared] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });
  
  // Purchase flow states
  const [step, setStep] = useState<'confirm' | 'shipping' | 'done'>('confirm');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [shippingForm, setShippingForm] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    country: ''
  });
  const [heartCoins, setHeartCoins] = useState(0);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showHeartCoinPurchase, setShowHeartCoinPurchase] = useState(false);

  // Purchase draft - captures exact item info at moment of "PAY WITH" click
  // This is the SINGLE SOURCE OF TRUTH for what we're purchasing
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft | null>(null);

  // ============================================================
  // DOUBLE-SUBMIT PREVENTION (React StrictMode, Fast Refresh, rapid clicks)
  // ============================================================
  // useRef for SYNCHRONOUS check - not affected by React's async state batching
  // This ref is checked immediately and blocks duplicate calls before any async work
  const purchaseInFlightRef = useRef(false);
  // useState for UI reactivity (button disabled state, showing "PROCESSING...")
  const [isPurchasing, setIsPurchasing] = useState(false);
  // Store idempotencyKey in ref to ensure it's stable across re-renders
  // This prevents regeneration during StrictMode double-invocation
  const currentIdempotencyKeyRef = useRef<string | null>(null);
  const [heartCoinPayToggled, setHeartCoinPayToggled] = useState(false);
  const [dailyQuests, setDailyQuests] = useState({
    elementTapped: false,
    journalEntry: journalCompleted,
    friendInvited: false,
    friendInviteConfirm: false,
    checkedIn: false
  });
  
  // Cards state
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Update journal completion state when external prop changes
  useEffect(() => {
    setDailyQuests(prev => ({ ...prev, journalEntry: journalCompleted }));
  }, [journalCompleted]);

  // Update local state when external heartCoins change or profile loads
  useEffect(() => {
    // If no profile (not logged in), always show 0
    if (!profile?.id) {
      setHeartCoins(0);
      return;
    }
    // Prefer profile balance over external prop
    const currentBalance = profile?.heartcoin_balance ?? externalHeartCoins;
    setHeartCoins(currentBalance);
  }, [externalHeartCoins, profile?.heartcoin_balance, profile?.id]);

  // Keyboard navigation for merch items
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation when MERCH tab is active and modal is open
      // Disable navigation while purchase is in progress
      if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH' || isPurchasing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        try { sfx.play('click', 0.6); } catch {}
        setCurrentMerchIndex(prev => prev > 0 ? prev - 1 : PHYSICAL_ITEMS.length - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        try { sfx.play('click', 0.6); } catch {}
        setCurrentMerchIndex(prev => prev < PHYSICAL_ITEMS.length - 1 ? prev + 1 : 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeTab, activeUseTab, sfx, isPurchasing]);

  // Check for initial tab preference from hamburger menu
  const [isFromHamburger, setIsFromHamburger] = useState(false);
  
  // Track if modal was opened via collect card button to prevent automatic closing
  const [isFromCollectCard, setIsFromCollectCard] = useState(false);
  
  // State for toggling HeartCoins description text
  const [showHeartCoinsInfo, setShowHeartCoinsInfo] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).priceHeartCoinsInitialTab) {
      setActiveTab((window as any).priceHeartCoinsInitialTab);
      setIsFromHamburger(true);
      // Check for initial USE sub-tab preference
      if ((window as any).priceHeartCoinsInitialUseTab) {
        setActiveUseTab((window as any).priceHeartCoinsInitialUseTab);
        // Clear the USE tab preference after using it
        delete (window as any).priceHeartCoinsInitialUseTab;
      }
      // Check for selected card filter
      if ((window as any).priceHeartCoinsSelectedCard) {
        setSelectedSong((window as any).priceHeartCoinsSelectedCard);
        // Clear the selected card after using it
        delete (window as any).priceHeartCoinsSelectedCard;
      }
      // Clear the main tab preference after using it
      delete (window as any).priceHeartCoinsInitialTab;
      // Clear the store flag after using it
      delete (window as any).priceHeartCoinsFromStore;
    }
  }, [open]); // Run when modal opens

  // Open modal when isActive becomes true (for hamburger menu integration)
  useEffect(() => {
    if (isActive && !open) {
      setOpen(true);
    } else if (!isActive && open && !isFromCollectCard) {
      // Only auto-close if not opened from collect card button
      setOpen(false);
      setIsFromHamburger(false);
      setIsFromCollectCard(false);
    }
  }, [isActive, open, isFromCollectCard]);

  // Listen for openHeartCoinCards event from collect card button
  useEffect(() => {
    const handleOpenHeartCoinCards = (e: CustomEvent) => {
      try {
        // Don't override tab settings if this is from the STORE menu
        if (typeof window !== 'undefined' && (window as any).priceHeartCoinsFromStore) {
          // Just open the modal, don't change tab settings
          setOpen(true);
          return;
        }
        
        // Set the modal to open with USE tab and CARDS sub-tab
        setActiveTab('USE');
        setActiveUseTab('CARDS');
        
        // Set the selected song filter if provided
        if (e.detail?.cardTitle) {
          setSelectedSong(e.detail.cardTitle);
        }
        
        // Mark as opened from collect card and open the modal
        setIsFromCollectCard(true);
        setOpen(true);
        
        // Track the event
        try {
          track('heartcoin_opened_from_collect', { 
            song_slug: e.detail?.songSlug || 'unknown',
            payload: { 
              song_title: e.detail?.cardTitle || 'Unknown',
              card_image: e.detail?.cardSrc,
              source: 'collect_card_button'
            } 
          });
        } catch {}
      } catch (err) {
        console.warn('Error handling openHeartCoinCards event:', err);
      }
    };

    window.addEventListener('openHeartCoinCards', handleOpenHeartCoinCards as EventListener);
    return () => window.removeEventListener('openHeartCoinCards', handleOpenHeartCoinCards as EventListener);
  }, []);

  // Fetch cards from Supabase
  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    try {
      // Select all to avoid column-mismatch errors if gating columns are missing
      const { data, error } = await supabaseBrowser
        .from('cards')
        .select('*')
        .order('card_name');

      if (error) throw error;

      // Normalize records: provide safe defaults for optional/gating fields
      const cardsWithCosts = (data || []).map((card: any) => ({
        ...card,
        // Default gating to permissive if absent so cards render instead of all-blurred
        is_released: card?.is_released ?? true,
        min_tier: card?.min_tier ?? 'wanderer',
        // Add default costs if not in database
        digitalCost:
          card?.digitalCost ??
          (card?.rarity?.toLowerCase() === 'legendary'
            ? 50
            : card?.rarity?.toLowerCase() === 'rare'
            ? 5
            : 5),
        physicalCost:
          card?.physicalCost ??
          (card?.rarity?.toLowerCase() === 'legendary'
            ? 75
            : card?.rarity?.toLowerCase() === 'rare'
            ? 20
            : 20),
      }));

      setCards(cardsWithCosts);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  // Keyboard navigation for MERCH items (← / → keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH') return;
      // Only in main MERCH view (not enlarged modal)
      if (enlargedMerchItem) return;
      // Ignore when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!PHYSICAL_ITEMS || PHYSICAL_ITEMS.length === 0) return;
      e.preventDefault();
      try { sfx.play('click', 0.6); } catch {}
      setCurrentMerchIndex(prev => {
        const len = PHYSICAL_ITEMS.length;
        if (e.key === 'ArrowLeft') {
          return prev > 0 ? prev - 1 : len - 1;
        } else {
          return prev < len - 1 ? prev + 1 : 0;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeTab, activeUseTab, PHYSICAL_ITEMS.length, enlargedMerchItem]);

  // Mobile swipe navigation for MERCH items (← / → via swipe)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number | null>(null);

  const handleMerchTouchStart = (e: React.TouchEvent) => {
    if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH' || enlargedMerchItem) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleMerchTouchEnd = (e: React.TouchEvent) => {
    if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH' || enlargedMerchItem) return;
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const startTime = touchStartTimeRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchStartTimeRef.current = null;
    if (startX == null || startY == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = startTime ? Date.now() - startTime : 0;
    // Only treat as horizontal swipe if horizontal movement dominates and exceeds threshold
    const SWIPE_DIST = 40;
    const SWIPE_TIME = 800; // ms (optional time threshold)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_DIST && dt < SWIPE_TIME) {
      try { sfx.play('click', 0.6); } catch {}
      setCurrentMerchIndex(prev => {
        const len = PHYSICAL_ITEMS.length;
        if (dx < 0) {
          // swipe left -> next item
          return prev < len - 1 ? prev + 1 : 0;
        } else {
          // swipe right -> previous item
          return prev > 0 ? prev - 1 : len - 1;
        }
      });
    }
  };

  // Get unique rarities for filter dropdown
  const availableRarities = useMemo(() => {
    const rarities = new Set<string>();
    
    cards.forEach(card => {
      // If an element is selected, only include rarities from that element
      if (selectedCardElement && selectedCardElement !== 'all') {
        if (card.element?.toLowerCase() !== selectedCardElement.toLowerCase()) {
          return; // Skip cards that don't match the selected element
        }
      }
      
      if (card.rarity) {
        rarities.add(card.rarity);
      }
    });
    
    return Array.from(rarities);
  }, [cards, selectedCardElement]);

  // Get unique songs for filter dropdown
  const availableSongs = useMemo(() => {
    const songs = new Set<string>();
    
    cards.forEach(card => {
      // If an element is selected, only include songs from that element
      if (selectedCardElement && selectedCardElement !== 'all') {
        if (card.element?.toLowerCase() !== selectedCardElement.toLowerCase()) {
          return; // Skip cards that don't match the selected element
        }
      }
      
      if (card.card_name) {
        // Keep full card name including variations like "(ACOUSTIC)", "(REMIX)"
        songs.add(card.card_name);
      }
    });
    
    return Array.from(songs);
  }, [cards, selectedCardElement]);

  // Reset song and rarity filters when element changes
  useEffect(() => {
    if (selectedCardElement && selectedCardElement !== 'all') {
      // If no song selected or song not available, select element card or first available song
      if (!selectedSong || !availableSongs.includes(selectedSong)) {
        const elementName = selectedCardElement.charAt(0).toUpperCase() + selectedCardElement.slice(1).toLowerCase();
        // Try to select the element card first, otherwise select first available song
        if (availableSongs.includes(elementName)) {
          setSelectedSong(elementName);
        } else if (availableSongs.length > 0) {
          setSelectedSong(availableSongs[0]);
        }
      }

      // Reset rarity if it's not available in the selected element
      if (selectedRarity && !availableRarities.includes(selectedRarity)) {
        setSelectedRarity('');
      }
      // Reset card index when element changes
      setCurrentCardIndex(0);
    }
  }, [selectedCardElement, availableSongs, availableRarities, selectedSong, selectedRarity]);

  // Filter cards based on selected element and rarity
  useEffect(() => {
    let filtered = cards;
    
    // Filter by element
    if (selectedCardElement && selectedCardElement !== 'all') {
      filtered = filtered.filter(card => 
        card.element?.toLowerCase() === selectedCardElement.toLowerCase()
      );
    }
    
    // Filter by song
    if (selectedSong && selectedSong.trim() !== '') {
      filtered = filtered.filter(card => {
        return card.card_name?.toLowerCase() === selectedSong.toLowerCase();
      });
    }
    
    // Filter by rarity
    if (selectedRarity && selectedRarity.trim() !== '') {
      filtered = filtered.filter(card => 
        card.rarity?.toLowerCase() === selectedRarity.toLowerCase()
      );
    }
    
    // Sort cards to show element cards first (cards whose name matches the element)
    if (selectedCardElement && selectedCardElement !== 'all') {
      filtered.sort((a, b) => {
        // Element card names: "Lightning", "Water", "Heart", "Darkness"
        const elementName = selectedCardElement.charAt(0).toUpperCase() + selectedCardElement.slice(1).toLowerCase();
        const aIsElementCard = a.card_name?.toLowerCase() === elementName.toLowerCase();
        const bIsElementCard = b.card_name?.toLowerCase() === elementName.toLowerCase();

        // If a is the element card but b isn't, a comes first
        if (aIsElementCard && !bIsElementCard) return -1;
        // If b is the element card but a isn't, b comes first
        if (!aIsElementCard && bIsElementCard) return 1;
        // Otherwise, maintain current order
        return 0;
      });
    }
    
    setFilteredCards(filtered);
  }, [cards, selectedCardElement, selectedRarity, selectedSong]);

  // Load cards when the modal opens and CARDS tab is active
  useEffect(() => {
    if (open && (activeTab === 'USE' && activeUseTab === 'CARDS') && cards.length === 0) {
      fetchCards();
    }
  }, [open, activeTab, activeUseTab, cards.length, fetchCards]);

  // Keyboard navigation for card cycling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when viewing cards in the CARDS tab
      if (!open || activeTab !== 'USE' || activeUseTab !== 'CARDS' || !selectedCardElement || filteredCards.length <= 1) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          try { sfx.play('flip', 0.8); } catch {}
          setCurrentCardIndex(prev => 
            prev > 0 ? prev - 1 : filteredCards.length - 1
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          try { sfx.play('flip', 0.8); } catch {}
          setCurrentCardIndex(prev => 
            prev < filteredCards.length - 1 ? prev + 1 : 0
          );
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, activeTab, activeUseTab, selectedCardElement, filteredCards.length, sfx]);

  // Helper function to check if card should be blurred based on release status and user tier
  const shouldBlurCard = (card: Card): boolean => {
    // Treat missing gating fields as visible to prevent accidental full blur
    const isReleased = (card as any)?.is_released;
    const minTier = (card as any)?.min_tier;

    // Special case: if min_tier is 'dreamer' and user is 'dreamer', show even if unreleased
    if (minTier?.toLowerCase() === 'dreamer' && profile?.tier?.toLowerCase() === 'dreamer') {
      return false;
    }

    // Only blur if the field exists and is explicitly false
    if (isReleased === false) return true;

    // Otherwise show the card
    return false;
  };

  // Get card counts for each element
  const getElementCardCounts = () => {
    const counts: { [key: string]: number } = {
      lightning: 0,
      darkness: 0, 
      water: 0,
      heart: 0
    };
    
    cards.forEach(card => {
      if (card.element?.toLowerCase() in counts) {
        counts[card.element.toLowerCase()]++;
      }
    });
    
    return counts;
  };

  // Helper: after coin-related changes, refresh profile from server
  const updateHeartCoins = async (_newAmount: number) => {
    try { await refreshProfile(); } catch {}
    onHeartCoinsChange?.(_newAmount);
  };
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [enlargedCard, setEnlargedCard] = useState<Card | null>(null);
  const [isEnlargedCardFlipped, setIsEnlargedCardFlipped] = useState(false);
  const [cardRotation, setCardRotation] = useState(0); // For 360° spin mode
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false); // For smooth flip transition
  const [merchRotation, setMerchRotation] = useState(0); // For merch 360° spin mode
  const [isMerchAnimatingFlip, setIsMerchAnimatingFlip] = useState(false); // For merch flip transition
  // enlargedMerchItem state is declared earlier for effect ordering
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [isSubmittingPhrase, setIsSubmittingPhrase] = useState(false);
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle');
  
  // State for secret phrase quest
  const [secretPhraseInputVisible, setSecretPhraseInputVisible] = useState<string | null>(null);
  const [secretPhraseValue, setSecretPhraseValue] = useState("");
  const [secretPhraseLoading, setSecretPhraseLoading] = useState(false);
  
  // State for automatic text box after check-in
  const [showAutoTextBox, setShowAutoTextBox] = useState(false);
  const [autoTextValue, setAutoTextValue] = useState("");
  const [attendLivestreamConfirming, setAttendLivestreamConfirming] = useState(false);
  const [phraseValidationResult, setPhraseValidationResult] = useState<'correct' | 'incorrect' | null>(null);
  
  // Bonus quests hook
  const { quests: bonusQuests, status: bonusQuestsStatus, errorMessage: bonusQuestsError, isLoggedIn, completeQuest, refetchQuests } = useBonusQuests();
  
  // Helper function to check if quest is completed (either from DB or local state)
  const isQuestCompleted = (quest: any) => {
    return (quest.times_completed > 0 && quest.max_total_completions === 1) || completedQuests.has(quest.id);
  };

  // Redeem secret phrase via Supabase RPC (for ATTEND_LIVESTREAM quest)
  const redeemAttendLivestreamPhrase = async (phrase: string): Promise<{ status: string; reward?: number }> => {
    const trimmed = phrase.trim().toLowerCase();
    if (!trimmed) return { status: 'invalid' };

    try {
      const { data, error } = await supabaseBrowser.rpc("redeem_daily_secret_phrase", {
        p_phrase: trimmed
      });

      if (error) {
        console.error("SECRET_PHRASE RPC error:", error);
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('not authenticated')) {
          return { status: 'not_authenticated' };
        } else if (msg.includes('invalid phrase')) {
          return { status: 'invalid' };
        } else if (msg.includes('already redeemed')) {
          return { status: 'already_redeemed' };
        }
        return { status: 'error' };
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        status: 'success',
        reward: row?.granted_amount || 0
      };
    } catch (error) {
      console.error('Error redeeming ATTEND_LIVESTREAM phrase:', error);
      return { status: 'error' };
    }
  };

  // Get today's element (rotate daily)
  const getTodaysElement = () => {
    const elements = ['heart', 'lightning', 'water', 'darkness'];
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return elements[dayOfYear % elements.length];
  };

  const todaysElement = getTodaysElement();

  // Reset expanded merch when modal closes

  // Inject card animation keyframes when enlarged card is shown
  useEffect(() => {
    if (enlargedCard && typeof document !== 'undefined') {
      const existingStyle = document.querySelector('#card-pulse-keyframes');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'card-pulse-keyframes';
        style.innerHTML = `
          @keyframes cardPulse {
            0%, 100% { 
              transform: scale(1);
              filter: saturate(1.06) contrast(1.06) brightness(1.04) drop-shadow(0 0 15px rgba(255, 215, 0, 0.6));
            }
            50% { 
              transform: scale(1.02);
              filter: saturate(1.1) brightness(1.08) contrast(1.08) drop-shadow(0 0 25px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 50px rgba(255, 215, 0, 0.6));
            }
          }
        `;
        document.head.appendChild(style);
      }
      return () => {
        const styleElement = document.querySelector('#card-pulse-keyframes');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [enlargedCard]);


  // Handle bonus quest completion
  const handleBonusQuestComplete = async (quest: BonusQuestWithCompletion) => {
    try {
      // Special flow for INVITE_FRIEND: trigger share first, then record completion
      if (quest.quest_key === 'INVITE_FRIEND') {
        const text = "I thought of you. I think this world could feel like home for you too. https://chxndler.world";

        const performShare = async () => {
          // Prefer native share sheet if available
          if (typeof navigator !== 'undefined' && (navigator as any).share) {
            try {
              await (navigator as any).share({ text });
              return true;
            } catch (err) {
              // If user cancels share, don't record completion
              console.warn('Share canceled or failed:', err);
              return false;
            }
          }

          // Mobile SMS intent fallback
          try {
            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile) {
              const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
              window.open(smsUrl, '_blank');
              return true;
            }
          } catch {}

          // Fallback to clipboard with alert/prompt UX
          try {
            await navigator.clipboard.writeText(text);
            alert("Invite message copied! Paste it into your messaging app.");
            return true;
          } catch {
            // Last resort: prompt for manual copy
            const copied = window.prompt("Copy this message to share:", text);
            return !!copied; // treat as success if prompt shown
          }
        };

        const shared = await performShare();
        if (!shared) {
          // User didn't complete sharing; do not record completion
          setCheckInMessage('Invite not sent');
          setStatusType('error');
          setTimeout(() => {
            setCheckInMessage("");
            setStatusType('idle');
          }, 2500);
          return;
        }
        
        // Mark as shared but don't complete the quest yet
        try { sfx.play('change-channel', 0.6); } catch {}
        setInviteFriendShared(true);
        setCheckInMessage('Message sent! Click CONFIRM to complete the quest');
        setStatusType('success');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
        return; // Don't complete the quest yet
      }

      const result = await completeQuest(quest);

      if (result.success) {
        // For ATTEND_LIVESTREAM quest, skip heart coin award and just show the secret phrase input
        if (quest.quest_key === 'ATTEND_LIVESTREAM') {
          // Don't award heart coins yet - that happens when the secret phrase is validated
          setShowAutoTextBox(true);
          setAutoTextValue("");
          setAttendLivestreamConfirming(true);
          setPhraseValidationResult(null);
          // Still show success message but don't award coins
          setCheckInMessage('Enter the secret phrase to complete the quest');
          setStatusType('success');
          setShowCheckInSuccess(true);
        } else {
          // Award heart coins for other quests using existing system
          if (result.rewards?.heartcoins) {
            await updateHeartCoins(heartCoins + result.rewards.heartcoins);
          }
          // Show success message
          setCheckInMessage(result.message);
          setStatusType('success');
          setShowCheckInSuccess(true);
        }

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowCheckInSuccess(false);
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);

        try { sfx.play('click', 0.7); } catch {}
      } else {
        setCheckInMessage(result.message);
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing bonus quest:', error);
      setCheckInMessage('An error occurred while completing the quest');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    }
  };

  // Handle secret phrase quest completion
  const handleSecretPhraseQuest = async (quest: BonusQuestWithCompletion) => {
    if (!secretPhraseValue.trim()) {
      setCheckInMessage('Please enter a secret phrase');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 2000);
      return;
    }

    const phraseTrimmed = secretPhraseValue.trim();
    setSecretPhraseLoading(true);

    try {
      const { data, error } = await supabaseBrowser.rpc(
        'redeem_secret_phrase',
        { p_phrase: phraseTrimmed }
      );

      if (error) {
        console.error('Secret phrase RPC error:', error);
        setCheckInMessage('Failed to redeem secret phrase');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
        return;
      }

      // Normalize RPC response shape (array or single object)
      const result = (Array.isArray(data) ? data[0] : data) as { status?: string; awarded?: number; reward?: number } | null;
      const status = result?.status;

      if (status === 'success' || status === 'redeemed') {
        const reward = result?.awarded ?? result?.reward ?? 0;
        setSecretPhraseValue('');
        setSecretPhraseInputVisible(null);
        setCheckInMessage(`Secret phrase accepted! +${reward} HeartCoins`);
        setStatusType('success');
        setShowCheckInSuccess(true);

        // Refresh profile to update HeartCoins balance
        await refreshProfile();

        // Also refresh quests to update completion status
        await refetchQuests();

        setTimeout(() => {
          setShowCheckInSuccess(false);
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);

        try { sfx.play('click', 0.7); } catch {}
      } else if (status === 'already_redeemed' || status === 'already_checked_in') {
        setCheckInMessage('Already checked in');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      } else if (status === 'invalid' || status === 'incorrect') {
        setCheckInMessage('Incorrect secret phrase');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      } else if (status === 'not_authenticated') {
        setCheckInMessage('Please log in to redeem');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      } else {
        // Unknown status
        console.warn('Unknown secret phrase status:', result);
        setCheckInMessage('Failed to redeem secret phrase');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Secret phrase quest error:', error);
      setCheckInMessage('Failed to redeem secret phrase');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    } finally {
      setSecretPhraseLoading(false);
    }
  };

  // Handle bonus quest confirm step for invite friend
  const handleBonusQuestConfirm = async (quest: BonusQuestWithCompletion) => {
    try {
      try { sfx.play('card-ding', 0.8); } catch {}
      const result = await completeQuest(quest);
      
      if (result.success) {
        // Award heart coins using existing system
        if (result.rewards?.heartcoins && profile) {
          await updateHeartCoins(heartCoins + result.rewards.heartcoins);
        }
        
        setCheckInMessage(`Quest completed! +${quest.reward_heartcoins} Heart Coins earned`);
        setStatusType('success');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
        setInviteFriendShared(false); // Reset the shared state
        setCompletedQuests(prev => new Set(prev).add(quest.id)); // Mark as completed locally
      } else {
        setCheckInMessage(result.message || 'Failed to complete quest');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error confirming bonus quest:', error);
      setCheckInMessage('Failed to confirm quest completion');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 2500);
    }
  };

  const getElementIcon = (element: string) => {
    // Use planet textures for element icons
    return getElementalPlanetImage(element) || `/textures/planet_${element}.webp`;
  };

  const handleElementTap = () => {
    if (!dailyQuests.elementTapped) {
      try { sfx.play('click', 0.8); } catch {}
      updateHeartCoins(heartCoins + 1);
      setDailyQuests(prev => ({ ...prev, elementTapped: true }));
      
      // Close heart coin display and open blue display
      setOpen(false);
      setIsFromCollectCard(false);
      try { onOpenBlueDisplay?.(); } catch {}
    }
  };

  const handleJournalEntry = () => {
    try { sfx.play('click', 0.6); } catch {}
    if (!dailyQuests.journalEntry) {
      // Only close the HeartCoin display and open the journal popout
      setOpen(false);
      setTimeout(() => {
        try {
          setIsJournalOpen(true);
          onOpenJournal?.();
        } catch {}
      }, 150);
    }
  };

  const handleUseHeartCoins = (e?: React.MouseEvent) => {
    try { sfx.play('click', 0.8); } catch {}
    
    // Prevent event bubbling that might trigger other handlers
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Close heart coin display
    setOpen(false);
    setIsFromCollectCard(false);
    
    // Open store popover with CARDS tab (where users can spend HeartCoins)
    window.dispatchEvent(new CustomEvent('openStoreCards', {
      detail: {
        source: 'heartcoins_button',
        openTab: 'CARDS'
      }
    }));
    
    // Don't call onOpenBlueDisplay here - let the store open instead
  };

  // Store functionality
  const handleSelectItem = (item: StoreItem) => {
    setSelectedItem(item);
    setShowItemDetail(true);
    resetPurchaseFlow();
    try { sfx.play('click', 0.6); } catch {}
  };

  const handleBackToStore = () => {
    setShowItemDetail(false);
    setSelectedItem(null);
    resetPurchaseFlow();
    try { sfx.play('close', 0.4); } catch {}
  };

  // DEPRECATED: Old handler that looked up by slug - kept for backwards compat
  const handlePurchaseWithHeartCoins = async (item: StoreItem) => {
    console.warn('[PURCHASE] handlePurchaseWithHeartCoins is deprecated, use handleConfirmPurchase');
    // Redirect to new flow by setting purchaseDraft
    const merchItem = merchItems.find(m => m.slug === item.slug);
    if (merchItem) {
      setPurchaseDraft({
        merchItemId: merchItem.id,
        clientSlug: merchItem.slug,
        quantity: 1,
        uiCost: merchItem.price_heartcoins,
        source: 'MERCH',
        itemName: merchItem.name,
      });
      handleConfirmPurchase();
    }
  };

  // ============================================================
  // MAIN PURCHASE HANDLER - SINGLE FUNCTION FOR API CALL
  // This is the ONLY place where purchaseWithHeartCoins is called
  // ============================================================
  const handleConfirmPurchase = async () => {
    // ============================================================
    // CRITICAL: Synchronous ref check FIRST - prevents double-submit
    // This check is NOT affected by React's async state batching
    // ============================================================
    if (purchaseInFlightRef.current) {
      console.warn('[PURCHASE] BLOCKED: Purchase already in flight (ref check in handleConfirmPurchase)');
      return;
    }

    // Also check state (belt and suspenders)
    if (isPurchasing) {
      console.warn('[PURCHASE] BLOCKED: isPurchasing state is true');
      return;
    }

    if (!profile) {
      console.error('[PURCHASE] No profile');
      return;
    }

    if (!purchaseDraft) {
      console.error('[PURCHASE] No purchaseDraft available');
      return;
    }

    // ============================================================
    // SET REF IMMEDIATELY - before any async work
    // This is the key to preventing StrictMode/FastRefresh duplicates
    // ============================================================
    purchaseInFlightRef.current = true;
    setIsPurchasing(true);
    console.log('[PURCHASE] In-flight ref set to TRUE');

    // Clear any previous errors
    clearError();

    // Use idempotencyKey from draft - generated once when PAY WITH was clicked
    // Also store in ref to ensure stability
    const { idempotencyKey, merchItemId, quantity, clientSlug } = purchaseDraft;
    currentIdempotencyKeyRef.current = idempotencyKey;

    console.log('[PURCHASE] handleConfirmPurchase calling API (SINGLE CALL)', {
      idempotencyKey,
      merchItemId,
      quantity,
      userBalance: profile.heartcoin_balance,
    });

    try {
      // ============================================================
      // SINGLE API CALL - purchaseWithHeartCoins has its own ref guard
      // ============================================================
      const purchaseResult = await purchaseWithHeartCoins({
        merchItemId,
        quantity,
        clientSlug,
        idempotencyKey,
      });

      if (purchaseResult && purchaseResult.success) {
        console.log('[PURCHASE] Success, order created:', purchaseResult.order_id);

        setCurrentOrderId(purchaseResult.order_id || null);
        setStep('shipping');

        // Play success sound
        try { sfx.play('card-ding', 0.8); } catch {}

        // Refresh profile to update HeartCoin balance (authoritative from DB)
        await refreshProfile();
        console.log('[PURCHASE] Profile refreshed; new balance from Supabase');

        // Clear purchaseDraft after successful purchase
        setPurchaseDraft(null);
        setShowHeartCoinPurchase(false);
        currentIdempotencyKeyRef.current = null;

      } else {
        // Error is handled by the hook, but we can show it in our UI
        console.error('[PURCHASE] Failed:', purchaseError);
        setCheckInMessage(purchaseError || "Purchase failed");
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      }
    } catch (err) {
      console.error('[PURCHASE] Unexpected error:', err);
      setCheckInMessage("Purchase failed unexpectedly");
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    } finally {
      // ============================================================
      // CRITICAL: Always reset both ref AND state in finally block
      // ============================================================
      purchaseInFlightRef.current = false;
      setIsPurchasing(false);
      console.log('[PURCHASE] In-flight ref reset to FALSE');
    }
  };

  const handleConfirmShipping = async () => {
    if (!currentOrderId || !profile?.id) return;

    // Clear any previous errors
    clearError();

    // Use the new shipping update hook
    const updateResult = await updateShipping({
      orderId: currentOrderId,
      fullName: shippingForm.full_name,
      addressLine1: shippingForm.address_line1,
      addressLine2: shippingForm.address_line2,
      city: shippingForm.city,
      state: shippingForm.state,
      zip: shippingForm.zip,
      country: shippingForm.country || 'United States'
    });

    if (updateResult) {
      console.log('Shipping update successful:', updateResult);

      // Success behaviour
      setStep('confirm');
      setCurrentOrderId(null);
      setShippingForm({
        full_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        county: '',
        country: ''
      });

      // Play success sound
      try { 
        const audio = new Audio('/audio/card-ding.mp3');
        audio.volume = 0.6;
        audio.play(); 
      } catch {}

      // Close the modal and show success message
      setOpen(false);
      setCheckInMessage("Order confirmed! Your artifact is on its way through the Heartverse.");
      setStatusType('success');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);

    } else {
      // Error is handled by the hook
      setCheckInMessage(purchaseError || "Failed to update shipping information");
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    }
  };

  const resetPurchaseFlow = () => {
    setStep('confirm');
    setCurrentOrderId(null);
    setShippingForm({
      full_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      county: '',
      country: ''
    });
  };



  const handleInviteFriend = () => {
    if (dailyQuests.friendInviteConfirm) return; // Already complete
    
    try { sfx.play('click', 0.8); } catch {}
    
    if (!dailyQuests.friendInvited) {
      // First click - send the invite
      const text = "I thought of you. I think this world could feel like home for you too. https://chxndler.world";
      
      const markMessageSent = () => {
        setDailyQuests(prev => ({ ...prev, friendInvited: true }));
      };
      
      if (navigator.share) {
        navigator.share({
          text: text
        }).then(() => {
          markMessageSent();
        }).catch(console.error);
      } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(text).then(() => {
          alert("Invite message copied to clipboard! You can now paste it in your messaging app.");
          markMessageSent();
        }).catch(() => {
          // Manual fallback
          prompt("Copy this message to share:", text);
          markMessageSent();
        });
      }
    } else {
      // Second click - confirm and award HeartCoin
      updateHeartCoins(heartCoins + 1);
      setDailyQuests(prev => ({ ...prev, friendInviteConfirm: true }));
    }
  };


  const determineContext = () => {
    // You can extend this logic based on your app's routing or state
    // For now, defaulting to 'global' - you can customize this based on your needs
    return 'global';
  };

  const handleCheckIn = async () => {
    if (!secretPhrase.trim()) return;

    setIsSubmittingPhrase(true);
    setStatusType('idle');
    setCheckInMessage('');

    try {
      const context = determineContext();
      const res = await fetch('/api/redeem-secret-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, phrase: secretPhrase }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        try { sfx.play('click', 0.8); } catch {}
        setStatusType('success');
        setCheckInMessage(data.message || 'Signal accepted. You earned your reward.');
        setDailyQuests(prev => ({ ...prev, checkedIn: true }));
        setShowCheckInSuccess(true);
        setShowCheckInModal(false);
        setSecretPhrase('');
        
        // Update local heart coins if new balance is provided
        if (data.newHeartcoinBalance !== undefined) {
          setHeartCoins(data.newHeartcoinBalance);
          onHeartCoinsChange?.(data.newHeartcoinBalance);
        } else if (data.rewardHeartCoins) {
          // Fallback: add to current amount
          const newAmount = heartCoins + data.rewardHeartCoins;
          setHeartCoins(newAmount);
          onHeartCoinsChange?.(newAmount);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setShowCheckInSuccess(false), 3000);
      } else {
        setStatusType('error');
        setCheckInMessage(data.message || 'That signal is not active right now.');
      }
    } catch (err) {
      console.error('Check-in error:', err);
      setStatusType('error');
      setCheckInMessage('Something glitched in the Heartverse. Try again in a moment.');
    } finally {
      setIsSubmittingPhrase(false);
    }
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('button', 0.8); } catch {}
      try { onBeamColorChange?.('white'); } catch {}
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        data-tour-id="heartcoin-button"
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="flex items-center gap-1 p-2 rounded-lg transition-all duration-200 h-16"
        style={{
          transition: 'all 0.3s ease',
          ...restProps.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.filter = 'drop-shadow(0 0 15px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 30px rgba(0, 255, 255, 0.4))';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          const img = e.currentTarget.querySelector('img');
          if (img) {
            img.style.filter = 'none';
          }
        }}
        {...restProps}
      >
        <img
          src="/elements/heart-coin.webp"
          alt="Heart Coins"
          className="w-16 h-16 object-cover rounded"
          style={{
            objectFit: 'cover'
          }}
          draggable={false}
        />
        <span className="text-white text-xl font-semibold">
          {profile?.id ? heartCoins : 0}
        </span>
      </button>
      
      
      {/* Heart Coins Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-start justify-center"
          style={{
            paddingTop: '80px'
          }}
        >
          <div
            className="heartcoin-hologram-container"
            style={{
              width: 'min(85vw, 500px)',
              height: '50vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(255,255,255,0.4), 0 -4px 15px rgba(255,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden auto',
              overflowX: 'hidden'
            }}
        >
          {/* Soft bottom glow */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 40%, transparent 80%)',
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
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />

          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setOpen(false);
              setIsFromHamburger(false);
              setIsFromCollectCard(false);
              setEnlargedCard(null);
              setIsEnlargedCardFlipped(false);
              try { onClose?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-white hover:text-gray-200 cursor-pointer w-8 h-8 rounded-full border border-white/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,255,255,0.8), 0 0 25px rgba(255,255,255,0.5), 0 0 35px rgba(255,255,255,0.3)',
              textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 15px rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          
          {/* Removed Heart Coin Balance from top-left per request */}
          
          {/* Header */}
          <div className="text-center mb-0.5 mt-2">
            <div 
              className="text-lg font-bold mb-2 cursor-pointer hover:scale-105 transition-transform duration-200"
              style={{ 
                color: '#FFFFFF', 
                textShadow: '0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.6), 0 0 36px rgba(255,255,255,0.3)', 
                fontSize: '20px'
              }}
              onClick={() => {
                try { sfx.play('click', 0.6); } catch {}
                setShowHeartCoinsInfo(!showHeartCoinsInfo);
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
              }}
            >
              HeartCoins
            </div>
            
            {/* Tabs arranged in a 2x2 grid: EARN/USE (top), MERCH/CARDS (bottom) */}
            <div className="grid grid-cols-2 gap-1 pl-1 pr-4">
              {/* EARN */}
              <button
                data-tour-id="heartcoins-earn-tab"
                onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveTab('EARN'); }}
                className="w-full py-1.5 text-lg rounded border transition-all duration-200"
                style={{
                  background: activeTab === 'EARN'
                    ? 'linear-gradient(135deg, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                  color: '#FFFFFF',
                  borderColor: activeTab === 'EARN' ? '#00FFFF' : 'rgba(255,255,255,0.6)',
                  textShadow: activeTab === 'EARN' ? '0 0 8px rgba(0,255,255,1), 0 0 16px rgba(0,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
                  boxShadow: activeTab === 'EARN' ? '0 0 15px rgba(0,255,255,0.8), 0 0 30px rgba(0,255,255,0.6)' : 'none',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  try { sfx.play('hover', 0.3); } catch {}
                  if (activeTab !== 'EARN') {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'EARN') {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }
                }}
              >
                EARN
              </button>

              {/* USE */}
              <button
                data-tour-id="heartcoins-use-tab"
                onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveTab('USE'); }}
                className="w-full py-1.5 text-lg rounded border transition-all duration-200"
                style={{
                  background: activeTab === 'USE'
                    ? 'linear-gradient(135deg, rgba(255,105,180,0.6) 0%, rgba(255,182,193,0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
                  color: '#FFFFFF',
                  borderColor: activeTab === 'USE' ? '#FF69B4' : 'rgba(255,255,255,0.6)',
                  textShadow: activeTab === 'USE' ? '0 0 8px rgba(255,255,255,1), 0 0 16px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.9)' : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
                  boxShadow: activeTab === 'USE' ? '0 0 15px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6)' : 'none',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  try { sfx.play('hover', 0.3); } catch {}
                  if (activeTab !== 'USE') {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'USE') {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }
                }}
              >
                USE
              </button>

              {/* Bottom tabs - conditional based on main tab */}
              {activeTab === 'USE' ? (
                <>
                  {/* MERCH (smaller, shorter, less glow) */}
                  <button
                    data-tour-id="heartcoins-merch-tab"
                    onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveUseTab('MERCH'); }}
                    className="w-full py-1 text-base rounded border transition-all duration-200"
                    style={{
                      background: activeUseTab === 'MERCH'
                        ? 'linear-gradient(135deg, rgba(255,105,180,0.45) 0%, rgba(255,182,193,0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                      color: '#FFFFFF',
                      borderColor: activeUseTab === 'MERCH' ? 'rgba(255,105,180,0.9)' : 'rgba(255,255,255,0.45)',
                      textShadow: activeUseTab === 'MERCH' ? '0 0 6px rgba(255,255,255,0.9)' : '0 1px 2px rgba(0,0,0,1)',
                      boxShadow: activeUseTab === 'MERCH' ? '0 0 10px rgba(255,105,180,0.5)' : 'none',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                    onMouseEnter={(e) => {
                      try { sfx.play('hover', 0.3); } catch {}
                      if (activeUseTab !== 'MERCH') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.3) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeUseTab !== 'MERCH') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                  >
                    MERCH
                  </button>

                  {/* CARDS (smaller, shorter, less glow) */}
                  <button
                    data-tour-id="heartcoins-cards-tab"
                    onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveUseTab('CARDS'); }}
                    className="w-full py-1 text-base rounded border transition-all duration-200"
                    style={{
                      background: activeUseTab === 'CARDS'
                        ? 'linear-gradient(135deg, rgba(255,105,180,0.45) 0%, rgba(255,182,193,0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                      color: '#FFFFFF',
                      borderColor: activeUseTab === 'CARDS' ? 'rgba(255,105,180,0.9)' : 'rgba(255,255,255,0.45)',
                      textShadow: activeUseTab === 'CARDS' ? '0 0 6px rgba(255,255,255,0.9)' : '0 1px 2px rgba(0,0,0,1)',
                      boxShadow: activeUseTab === 'CARDS' ? '0 0 10px rgba(255,105,180,0.5)' : 'none',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                    onMouseEnter={(e) => {
                      try { sfx.play('hover', 0.3); } catch {}
                      if (activeUseTab !== 'CARDS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.3) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeUseTab !== 'CARDS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                  >
                    CARDS
                  </button>
                </>
              ) : (
                <>
                  {/* DAILY QUESTS (when EARN is active) */}
                  <button
                    data-tour-id="heartcoins-daily-quests-tab"
                    onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveEarnTab('DAILY QUESTS'); }}
                    className="w-full py-1 text-base rounded border transition-all duration-200"
                    style={{
                      background: activeEarnTab === 'DAILY QUESTS'
                        ? 'linear-gradient(135deg, rgba(0,255,255,0.35) 0%, rgba(0,255,255,0.5) 100%)'
                        : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                      color: '#FFFFFF',
                      borderColor: activeEarnTab === 'DAILY QUESTS' ? 'rgba(0,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                      textShadow: activeEarnTab === 'DAILY QUESTS' ? '0 0 6px rgba(255,255,255,0.9)' : '0 1px 2px rgba(0,0,0,1)',
                      boxShadow: activeEarnTab === 'DAILY QUESTS' ? '0 0 10px rgba(0,255,255,0.5)' : 'none',
                      fontWeight: 700,
                      fontSize: '11px'
                    }}
                    onMouseEnter={(e) => {
                      try { sfx.play('hover', 0.3); } catch {}
                      if (activeEarnTab !== 'DAILY QUESTS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.3) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeEarnTab !== 'DAILY QUESTS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                  >
                    DAILY QUESTS
                  </button>

                  {/* BONUS QUESTS (when EARN is active) */}
                  <button
                    data-tour-id="heartcoins-bonus-quests-tab"
                    onClick={() => { try { sfx.play('click', 0.6); } catch {} ; setActiveEarnTab('BONUS QUESTS'); }}
                    className="w-full py-1 text-base rounded border transition-all duration-200"
                    style={{
                      background: activeEarnTab === 'BONUS QUESTS'
                        ? 'linear-gradient(135deg, rgba(0,255,255,0.35) 0%, rgba(0,255,255,0.5) 100%)'
                        : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
                      color: '#FFFFFF',
                      borderColor: activeEarnTab === 'BONUS QUESTS' ? 'rgba(0,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                      textShadow: activeEarnTab === 'BONUS QUESTS' ? '0 0 6px rgba(255,255,255,0.9)' : '0 1px 2px rgba(0,0,0,1)',
                      boxShadow: activeEarnTab === 'BONUS QUESTS' ? '0 0 10px rgba(0,255,255,0.5)' : 'none',
                      fontWeight: 700,
                      fontSize: '11px'
                    }}
                    onMouseEnter={(e) => {
                      try { sfx.play('hover', 0.3); } catch {}
                      if (activeEarnTab !== 'BONUS QUESTS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.3) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeEarnTab !== 'BONUS QUESTS') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                  >
                    BONUS QUESTS
                  </button>
                </>
              )}
            </div>
            
            {/* Thin pink neon line */}
            <div 
              className="w-full h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8) 20%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,255,255,0.6)'
              }}
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'EARN' && (
            <>

          {/* Show HeartCoins info when title is clicked, otherwise show quests */}
          {showHeartCoinsInfo ? (
            <div 
              className="text-center p-4 rounded-lg"
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              <div 
                className="text-base mb-3"
                style={{ 
                  color: '#FFFFFF', 
                  textShadow: '0 0 4px rgba(255,255,255,0.8)', 
                  fontSize: '14px',
                  fontWeight: 'bold',
                  lineHeight: 1.4
                }}
              >
                HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.
              </div>
              <div 
                className="text-sm mb-3"
                style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '14px',
                  lineHeight: 1.4
                }}
              >
                Complete quests. Attend community events. Engage with the Heartverse.
              </div>
              <div 
                className="text-sm"
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '14px',
                  lineHeight: 1.4
                }}
              >
                Use your HeartCoins to unlock collectibles and cards, and deepen your place in the community.
              </div>
            </div>
          ) : (
            <div className="flex flex-col max-h-[70vh] min-h-0">

          {/* Daily Quests Tab Content */}
          {activeEarnTab === 'DAILY QUESTS' && (
            <div className="mb-4 flex-1 min-h-0 flex flex-col gap-2">
            {/* Element of the Day */}
            <div className="flex items-center justify-between p-2 rounded border border-white/30 bg-white/10 flex-1 min-h-0">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                  1. Tap the Element of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                  Receive a random reward: HeartCoins, relics, or binder slot unlocks.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleElementTap}
                  disabled={dailyQuests.elementTapped}
                  className="flex items-center space-x-1"
                >
                  <img
                    src={getElementIcon(elementOfDay || 'heart')}
                    alt={`${elementOfDay || 'heart'} element`}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{
                      filter: dailyQuests.elementTapped ? 'grayscale(1)' : 'drop-shadow(0 0 8px rgba(255,215,0,0.8))'
                    }}
                  />
                </button>
                <span className="text-sm flex items-center" style={{ color: dailyQuests.elementTapped ? '#666' : '#90EE90', textShadow: dailyQuests.elementTapped ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' }}>
                  {dailyQuests.elementTapped ? '✓ +1' : '+1'}
                  <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6 ml-1" />
                </span>
              </div>
            </div>

            {/* Journal Entry */}
            <div className="flex items-center justify-between p-2 rounded border border-white/30 bg-white/10 flex-1 min-h-0">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                  2. Journal Entry of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                  Answer today's journal prompt to earn one HEART coin.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleJournalEntry}
                  disabled={dailyQuests.journalEntry}
                  className="px-2 py-1 text-xs rounded border transition-colors"
                  style={{
                    background: dailyQuests.journalEntry ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.1)',
                    color: dailyQuests.journalEntry ? '#00FF00' : '#FFFFFF',
                    borderColor: dailyQuests.journalEntry ? '#00FF00' : 'rgba(255,255,255,0.6)',
                    textShadow: dailyQuests.journalEntry ? '0 0 8px #00FF00, 0 0 16px #00FF00' : 'none',
                    boxShadow: dailyQuests.journalEntry ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)' : 'none'
                  }}
                >
                  {dailyQuests.journalEntry ? 'COMPLETED' : 'OPEN JOURNAL'}
                </button>
                <span className="text-sm flex items-center" style={{ color: dailyQuests.journalEntry ? '#666' : '#90EE90', textShadow: dailyQuests.journalEntry ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' }}>
                  {dailyQuests.journalEntry ? '✓ +1' : '+1'}
                  <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6 ml-1" />
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Bonus Quests Tab Content */}
          {activeEarnTab === 'BONUS QUESTS' && (
            <div className="mb-4">
              {bonusQuestsStatus === 'loading' ? (
                <div className="text-center text-white py-4">Loading bonus quests...</div>
              ) : bonusQuestsStatus === 'error' ? (
                <div className="text-center text-red-400/70 py-4 text-sm">
                  Unable to load bonus quests
                </div>
              ) : bonusQuests.length === 0 ? (
                <div className="text-center text-white/60 py-4">No bonus quests available</div>
              ) : (
                bonusQuests.map((quest, index) => (
                  <div key={quest.id} className="flex items-center justify-between mb-2 p-2 rounded border border-white/30 bg-white/10">
                    <div className="flex-1 mr-4">
                      {quest.quest_key === 'ATTEND_LIVESTREAM' && showAutoTextBox ? (
                        phraseValidationResult ? (
                          <div className="text-xs font-bold flex items-center h-8" style={{ 
                            color: '#FF69B4', 
                            textShadow: '0 0 8px #FF69B4'
                          }}>
                            {phraseValidationResult === 'correct' ? 'CORRECT' : 'INCORRECT'}
                          </div>
                        ) : (
                          <textarea
                            value={autoTextValue}
                            onChange={(e) => setAutoTextValue(e.target.value)}
                            placeholder="ENTER SECRET PHRASE"
                            className="w-full h-8 px-2 py-1 text-xs rounded border bg-black/20 text-white placeholder-white/60 border-white/30 focus:border-white/60 focus:outline-none resize-none"
                            autoFocus
                            style={{ maxWidth: '200px' }}
                          />
                        )
                      ) : (
                        <>
                          <div className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                            {index + 1}. {quest.title}
                          </div>
                          <div className="text-[10px]" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                            {quest.description}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          // Play click sound for all button interactions
                          try { sfx.play('click', 0.6); } catch {}

                          // If not logged in, open welcome home modal for login
                          if (!isLoggedIn) {
                            window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                            return;
                          }

                          if (quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared) {
                            handleBonusQuestConfirm(quest);
                          } else if (quest.quest_key === 'ATTEND_LIVESTREAM') {
                            if (attendLivestreamConfirming) {
                              // If text box is empty, go back to showing title/description
                              if (!autoTextValue.trim()) {
                                setShowAutoTextBox(false);
                                setAutoTextValue("");
                                setAttendLivestreamConfirming(false);
                                setPhraseValidationResult(null);
                              } else {
                                // Redeem the secret phrase via RPC
                                setSecretPhraseLoading(true);
                                redeemAttendLivestreamPhrase(autoTextValue).then(async (result) => {
                                  const status = result.status;

                                  if (status === 'success' || status === 'redeemed') {
                                    // Success - phrase accepted and coins awarded
                                    setPhraseValidationResult('correct');
                                    try { sfx.play('click', 0.7); } catch {}
                                    setCheckInMessage(`Secret phrase accepted! +${result.reward || 0} HeartCoins`);
                                    setStatusType('success');
                                    setShowCheckInSuccess(true);

                                    // Refresh profile to update HeartCoin balance
                                    await refreshProfile();
                                    await refetchQuests();

                                    // Clear UI after success
                                    setTimeout(() => {
                                      setShowAutoTextBox(false);
                                      setAutoTextValue("");
                                      setAttendLivestreamConfirming(false);
                                      setShowCheckInSuccess(false);
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                    }, 3000);
                                  } else if (status === 'already_redeemed' || status === 'already_checked_in') {
                                    // Already redeemed - show "Already checked in"
                                    setPhraseValidationResult('incorrect');
                                    try { sfx.play('change-channel', 0.6); } catch {}
                                    setCheckInMessage('Already checked in');
                                    setStatusType('error');
                                    setTimeout(() => {
                                      setPhraseValidationResult(null);
                                      setAutoTextValue("");
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                    }, 2500);
                                  } else if (status === 'invalid' || status === 'incorrect') {
                                    // Invalid phrase
                                    setPhraseValidationResult('incorrect');
                                    try { sfx.play('change-channel', 0.6); } catch {}
                                    setCheckInMessage('Incorrect phrase');
                                    setStatusType('error');
                                    setTimeout(() => {
                                      setPhraseValidationResult(null);
                                      setAutoTextValue("");
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                    }, 2000);
                                  } else if (status === 'not_authenticated') {
                                    // Not logged in
                                    setPhraseValidationResult('incorrect');
                                    setCheckInMessage('Please log in');
                                    setStatusType('error');
                                    setTimeout(() => {
                                      setPhraseValidationResult(null);
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                    }, 2500);
                                  } else {
                                    // Unknown error
                                    setPhraseValidationResult('incorrect');
                                    try { sfx.play('change-channel', 0.6); } catch {}
                                    setCheckInMessage('Something went wrong');
                                    setStatusType('error');
                                    setTimeout(() => {
                                      setPhraseValidationResult(null);
                                      setAutoTextValue("");
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                    }, 2500);
                                  }
                                }).finally(() => {
                                  setSecretPhraseLoading(false);
                                });
                              }
                            } else {
                              // First click - show the secret phrase input
                              setShowAutoTextBox(true);
                              setAutoTextValue("");
                              setAttendLivestreamConfirming(true);
                              setPhraseValidationResult(null);
                            }
                          } else if (quest.quest_key === 'SECRET_PHRASE') {
                            if (secretPhraseInputVisible === quest.id) {
                              handleSecretPhraseQuest(quest);
                            } else {
                              setSecretPhraseInputVisible(quest.id);
                              setSecretPhraseValue('');
                            }
                          } else {
                            handleBonusQuestComplete(quest);
                          }
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        disabled={isLoggedIn && ((!quest.can_complete && !inviteFriendShared) || isQuestCompleted(quest) || (quest.quest_key === 'SECRET_PHRASE' && secretPhraseLoading))}
                        className="px-2 py-1 text-xs rounded border transition-colors font-bold hover:opacity-80"
                        style={{
                          background: !isLoggedIn
                            ? 'rgba(78,205,196,0.2)'
                            : isQuestCompleted(quest)
                            ? 'rgba(0,255,0,0.2)'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? 'rgba(0,0,0,0.3)'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                ? 'rgba(0,0,0,0.3)'
                                : quest.can_complete
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(100,100,100,0.3)',
                          color: !isLoggedIn
                            ? '#4ECDC4'
                            : isQuestCompleted(quest)
                            ? '#00FF00'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? '#F2EF1D'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && phraseValidationResult === 'correct'
                                ? '#00FF00'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                  ? '#F2EF1D'
                                  : quest.can_complete
                                    ? '#FFFFFF'
                                    : '#666',
                          borderColor: !isLoggedIn
                            ? '#4ECDC4'
                            : isQuestCompleted(quest)
                            ? '#00FF00'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? '#F2EF1D'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && phraseValidationResult === 'correct'
                                ? '#00FF00'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                  ? '#F2EF1D'
                                  : quest.can_complete
                                    ? 'rgba(255,255,255,0.6)'
                                    : 'rgba(100,100,100,0.6)',
                          borderWidth: isQuestCompleted(quest)
                            ? '2px'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? '2px'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || attendLivestreamConfirming)
                                ? '2px'
                                : '1px',
                          textShadow: !isLoggedIn
                            ? '0 0 8px rgba(78,205,196,0.5)'
                            : isQuestCompleted(quest)
                            ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? '0 0 10px #F2EF1D'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && phraseValidationResult === 'correct'
                                ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                  ? '0 0 10px #F2EF1D'
                                  : 'none',
                          boxShadow: !isLoggedIn
                            ? 'none'
                            : isQuestCompleted(quest)
                            ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                            : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                              ? '0 0 20px rgba(242,239,29,0.8), inset 0 0 10px rgba(242,239,29,0.2)'
                              : quest.quest_key === 'ATTEND_LIVESTREAM' && phraseValidationResult === 'correct'
                                ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                  ? '0 0 20px rgba(242,239,29,0.8), inset 0 0 10px rgba(242,239,29,0.2)'
                                  : 'none',
                          cursor: !isLoggedIn ? 'pointer' : 'default'
                        }}
                      >
                        {!isLoggedIn
                          ? 'Log in to complete'
                          : (isQuestCompleted(quest)
                            ? 'COMPLETED' 
                            : quest.quest_key === 'ATTEND_LIVESTREAM' 
                              ? (phraseValidationResult === 'correct' ? 'COMPLETED' : attendLivestreamConfirming ? 'CONFIRM' : 'CHECK IN')
                              : quest.quest_key === 'INVITE_FRIEND' 
                                ? (inviteFriendShared ? 'CONFIRM' : 'INVITE FRIEND')
                                : quest.quest_key === 'SECRET_PHRASE'
                                  ? (secretPhraseInputVisible === quest.id 
                                      ? (secretPhraseLoading ? 'SUBMITTING...' : 'SUBMIT')
                                      : 'ENTER PHRASE')
                                : 'COMPLETE')}
                      </button>
                      <span className="text-sm flex items-center" style={{ 
                        color: isQuestCompleted(quest) ? '#666' : '#90EE90', 
                        textShadow: isQuestCompleted(quest) ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' 
                      }}>
                        {quest.reward_notes || `+${quest.reward_heartcoins}`}
                        <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6 ml-1" />
                      </span>
                    </div>
                    {/* Secret phrase input field */}
                    {quest.quest_key === 'SECRET_PHRASE' && secretPhraseInputVisible === quest.id && (
                      <div className="mt-2 border-t border-white/20 pt-2">
                        <input
                          type="text"
                          value={secretPhraseValue}
                          onChange={(e) => setSecretPhraseValue(e.target.value)}
                          placeholder="Enter secret phrase"
                          className="w-full px-2 py-1 text-xs rounded border bg-black/20 text-white placeholder-white/60 border-white/30 focus:border-white/60 focus:outline-none"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !secretPhraseLoading) {
                              handleSecretPhraseQuest(quest);
                            }
                          }}
                          autoFocus
                          disabled={secretPhraseLoading}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          
          {/* Success message */}
          {showCheckInSuccess && (
            <div 
              className="text-center py-2 mb-2 rounded border border-green-400/60"
              style={{
                background: 'rgba(0,255,0,0.1)',
                color: '#90EE90',
                textShadow: '0 0 4px rgba(144,238,144,0.8)'
              }}
            >
              {checkInMessage}
              <br />
              <span className="text-sm font-bold">You received +5 HEART COINS</span>
            </div>
          )}
          
            </div>
          )}
            </>
          )}

          {/* USE Tab Content */}
          {activeTab === 'USE' && (
            <div className="pl-1 pr-2 pb-2 pt-0">
              {!showItemDetail ? (
                <>
                  {/* Sub-tabs moved into header grid (MERCH/CARDS) */}

                  

                  {/* MERCH Tab Content */}
                  {activeUseTab === 'MERCH' && (
                    <div className="px-2 pb-20">
                      {/* Loading state */}
                      {merchLoading && (
                        <div className="text-center py-8">
                          <div className="text-white/70 text-sm">Loading merchandise...</div>
                        </div>
                      )}
                      
                      {/* Error state */}
                      {merchError && !merchLoading && (
                        <div className="text-center py-8">
                          <div className="text-red-400 text-sm">Failed to load merchandise</div>
                          <div className="text-white/50 text-xs mt-1">{merchError}</div>
                        </div>
                      )}
                      
                      {/* Current Item Display - only show if we have items */}
                      {!merchLoading && !merchError && (
                        <div className="mb-2">
                          {PHYSICAL_ITEMS[currentMerchIndex] && (
                          <div 
                            className="rounded-lg pl-4 pr-1 pt-2 pb-4 transition-all duration-200"
                            onTouchStart={handleMerchTouchStart}
                            onTouchEnd={handleMerchTouchEnd}
                          >
                            {/* Image and Title with Navigation */}
                            <div className="flex items-start gap-1 mb-3">
                              {/* Left spacer (kept for layout balance) */}
                              <div className="flex-1" />
                              
                              {/* Item Title + Image OR User/Cost Display */}
                              {/* Use purchaseDraft as source of truth for showing purchase mode */}
                              {purchaseDraft && showHeartCoinPurchase ? (
                                /* User at top, Cost positioned above CONFIRM button */
                                <div className="flex flex-col items-center h-full">
                                  {/* User Section - at top */}
                                  <div className="flex flex-col items-center pt-4">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="font-bold text-white text-xl"
                                        style={{
                                          textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                        }}
                                      >
                                        User
                                      </div>
                                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-12 h-12" />
                                      <div 
                                        className="text-2xl font-bold"
                                        style={{ 
                                          color: '#FFFFFF', 
                                          textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                        }}
                                      >
                                        {profile?.id ? heartCoins : 0}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Spacer to push Cost section down */}
                                  <div className="flex-1" />

                                  {/* Cost Section - positioned near bottom, above CONFIRM */}
                                  {/* IMPORTANT: Render from purchaseDraft to ensure consistency */}
                                  <div className="flex flex-col items-center pb-8">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="font-bold text-white text-xl"
                                        style={{
                                          textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                        }}
                                      >
                                        Cost
                                      </div>
                                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-12 h-12" />
                                      <div
                                        className="text-2xl font-bold"
                                        style={{
                                          color: '#FFFFFF',
                                          textShadow: '0 0 6px rgba(255,255,255,0.8)'
                                        }}
                                      >
                                        {purchaseDraft?.uiCost ?? 0}
                                      </div>
                                    </div>
                                    {/* Show item name from purchaseDraft for clarity */}
                                    <div className="text-white/70 text-sm mt-2" style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}>
                                      {purchaseDraft?.itemName?.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Normal Item Display */
                                <div className="flex flex-col items-center">
                                  <div 
                                    className="text-center text-white font-bold text-lg mb-1"
                                    style={{ textShadow: '0 0 6px rgba(255,255,255,0.6)' }}
                                  >
                                    {PHYSICAL_ITEMS[currentMerchIndex].title.toUpperCase()}
                                  </div>
                                  <div className="relative flex items-center justify-center">
                                    <div 
                                      className="w-28 h-28 -mt-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
                                      onMouseEnter={() => {
                                        try { sfx.play('hover', 0.3); } catch {}
                                      }}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        setEnlargedMerchItem(PHYSICAL_ITEMS[currentMerchIndex]);
                                      }}
                                    >
                                      <img
                                        src={PHYSICAL_ITEMS[currentMerchIndex].image}
                                        alt={PHYSICAL_ITEMS[currentMerchIndex].title}
                                        className="w-full h-full object-cover rounded"
                                      />
                                    </div>
                                    {/* Navigation arrows - positioned independently */}
                                    {/* Disabled while purchase is in progress */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPurchasing) return;
                                        try { sfx.play('click', 0.6); } catch {}
                                        setCurrentMerchIndex(prev => prev > 0 ? prev - 1 : PHYSICAL_ITEMS.length - 1);
                                      }}
                                      onMouseEnter={(e) => { e.stopPropagation(); try { sfx.play('hover', 0.3); } catch {} }}
                                      disabled={isPurchasing}
                                      className={`absolute flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 hover:scale-110 transition-all duration-200 ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      style={{ left: '-40px', top: '50%', transform: 'translateY(-50%)', boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}
                                      aria-label="Previous item"
                                    >
                                      <span className="text-white text-sm font-bold">←</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPurchasing) return;
                                        try { sfx.play('click', 0.6); } catch {}
                                        setCurrentMerchIndex(prev => prev < PHYSICAL_ITEMS.length - 1 ? prev + 1 : 0);
                                      }}
                                      onMouseEnter={(e) => { e.stopPropagation(); try { sfx.play('hover', 0.3); } catch {} }}
                                      disabled={isPurchasing}
                                      className={`absolute flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 hover:scale-110 transition-all duration-200 ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      style={{ right: '-40px', top: '50%', transform: 'translateY(-50%)', boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}
                                      aria-label="Next item"
                                    >
                                      <span className="text-white text-sm font-bold">→</span>
                                    </button>
                                  </div>
                                  {/* Item index moved near description below */}
                                  
                                  {/* PAY WITH $ button moved to bottom action bar */}
                                </div>
                              )}
                              
                              {/* Right spacer (kept for layout balance) */}
                              <div className="flex-1" />
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom description and index above action bar - Only show when NOT in heart coin purchase mode */}
                  {activeUseTab === 'MERCH' && PHYSICAL_ITEMS[currentMerchIndex] && !purchaseDraft && (
                    <div className="absolute left-6 right-6 bottom-16" style={{ lineHeight: '1.3' }}>
                      <div className="text-center text-white/70 text-xs mb-1" style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}>
                        {currentMerchIndex + 1} of {PHYSICAL_ITEMS.length}
                      </div>
                      <div className="text-xs text-white/90" style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}>
                        {PHYSICAL_ITEMS[currentMerchIndex].description}
                      </div>
                    </div>
                  )}

                  {/* CONFIRM button for heart coin purchase - renders from purchaseDraft */}
                  {activeUseTab === 'MERCH' && purchaseDraft && showHeartCoinPurchase && (
                    <div className="absolute left-6 right-6 bottom-16">
                      {/* Check balance against purchaseDraft.uiCost (server is authoritative for actual deduction) */}
                      {(profile?.id ? heartCoins : 0) >= (purchaseDraft.uiCost || 0) ? (
                        <button
                          className={`w-full px-4 py-3 rounded border transition-colors text-center font-bold text-lg ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{
                            backgroundColor: 'rgba(0,255,0,0.2)',
                            borderColor: 'rgba(0,255,0,0.6)',
                            color: '#90EE90',
                            textShadow: '0 0 4px rgba(144,238,144,0.8)',
                            boxShadow: '0 0 8px rgba(0,255,0,0.3)'
                          }}
                          onClick={() => {
                            // ============================================================
                            // CRITICAL: Synchronous ref check FIRST
                            // This prevents double-submit from StrictMode/FastRefresh
                            // ============================================================
                            if (purchaseInFlightRef.current) {
                              console.warn('[PURCHASE] BLOCKED in onClick: ref already true');
                              return;
                            }
                            if (isPurchasing) {
                              console.warn('[PURCHASE] BLOCKED in onClick: state already true');
                              return;
                            }
                            if (!purchaseDraft) {
                              console.error('[PURCHASE] No purchaseDraft available');
                              return;
                            }
                            // Do NOT set state here - handleConfirmPurchase does it
                            // Just log and call the handler
                            console.log('[PURCHASE] CONFIRM clicked, calling handler', {
                              idempotencyKey: purchaseDraft.idempotencyKey,
                              merchItemId: purchaseDraft.merchItemId,
                            });
                            handleConfirmPurchase();
                          }}
                          onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                          disabled={isPurchasing || isProcessing}
                        >
                          {isPurchasing || isProcessing ? 'PROCESSING...' : 'CONFIRM'}
                        </button>
                      ) : (
                        <button
                          className="w-full px-4 py-3 rounded border transition-colors cursor-not-allowed text-center font-bold text-lg"
                          style={{
                            backgroundColor: 'rgba(255,0,0,0.2)',
                            borderColor: 'rgba(255,0,0,0.6)',
                            color: '#FF6B6B',
                            textShadow: '0 0 4px rgba(255,107,107,0.8)',
                            boxShadow: '0 0 8px rgba(255,0,0,0.3)'
                          }}
                          disabled
                        >
                          NOT ENOUGH ❤️
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bottom action bar for MERCH payments */}
                  {activeUseTab === 'MERCH' && PHYSICAL_ITEMS[currentMerchIndex] && (
                    <div className="absolute left-6 right-6 bottom-4 flex gap-2">
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.6); } catch {}
                          window.open(PHYSICAL_ITEMS[currentMerchIndex].stripeUrl, '_blank');
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                        className="flex-1 px-4 py-3 rounded border border-white/60 bg-white/20 hover:bg-white/30 transition-all duration-200 text-white font-semibold text-xs whitespace-nowrap"
                        style={{ textShadow: '0 0 4px rgba(255,255,255,0.6)', boxShadow: '0 0 8px rgba(255,255,255,0.2)' }}
                      >
                        PAY WITH ${PHYSICAL_ITEMS[currentMerchIndex].priceUsd % 1 === 0 ? PHYSICAL_ITEMS[currentMerchIndex].priceUsd.toFixed(0) : PHYSICAL_ITEMS[currentMerchIndex].priceUsd.toFixed(1)}
                      </button>
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.6); } catch {}
                          // Get the CURRENT displayed MerchItem at this exact moment
                          const currentMerchItem = merchItems[currentMerchIndex];

                          // Toggle off if already showing for this item
                          if (purchaseDraft && purchaseDraft.merchItemId === currentMerchItem?.id) {
                            console.log('[PURCHASE] Toggling off purchaseDraft');
                            setPurchaseDraft(null);
                            setShowHeartCoinPurchase(false);
                            return;
                          }

                          // Create purchaseDraft from CURRENT displayed item - this is the source of truth
                          if (currentMerchItem) {
                            // Generate idempotencyKey ONCE here - reused on confirm, never regenerated
                            const idempotencyKey = crypto.randomUUID();
                            const draft: PurchaseDraft = {
                              merchItemId: currentMerchItem.id,  // Use .id NOT .merch_item_id
                              clientSlug: currentMerchItem.slug,
                              quantity: 1,
                              uiCost: currentMerchItem.price_heartcoins,
                              source: 'MERCH',
                              itemName: currentMerchItem.name,
                              idempotencyKey,  // Stored on draft, not regenerated on confirm
                            };
                            console.log('[PURCHASE] PAY WITH clicked, draft created', {
                              idempotencyKey: draft.idempotencyKey,
                              merchItemId: draft.merchItemId,
                              itemName: draft.itemName,
                            });
                            setPurchaseDraft(draft);
                            setSelectedItem(PHYSICAL_ITEMS[currentMerchIndex]);
                            setShowHeartCoinPurchase(true);
                          }
                        }}
                        onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                        disabled={isPurchasing}
                        className={`flex-1 px-4 py-3 rounded border cursor-pointer transition-all duration-200 text-white font-semibold flex items-center justify-center gap-1 text-xs whitespace-nowrap ${
                          isPurchasing ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          purchaseDraft && purchaseDraft.merchItemId === merchItems[currentMerchIndex]?.id
                            ? 'border-yellow-400 bg-yellow-500/40 shadow-[0_0_20px_rgba(255,215,0,0.6)]'
                            : 'border-yellow-500/60 bg-yellow-500/20 hover:bg-yellow-500/30'
                        }`}
                      >
                        PAY WITH
                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-4 h-4" />
                        {PHYSICAL_ITEMS[currentMerchIndex].priceHeartCoins}
                      </button>
                    </div>
                  )}

                  {/* CARDS Tab Content */}
                  {activeUseTab === 'CARDS' && (
                    <div>
                      {!selectedCardElement ? (
                        <>
                          
                          <div 
                            className="text-center mb-3"
                            style={{ 
                              color: '#FFFFFF', 
                              fontSize: '14px',
                              textShadow: '0 0 4px rgba(255,255,255,0.6)',
                              marginTop: '8px'
                            }}
                          >
                            SELECT AN ELEMENT TO VIEW CARDS
                          </div>

                          <div className="grid grid-cols-2 gap-1 justify-center place-items-center mx-auto" style={{ marginTop: '4px' }}>
                            {['lightning', 'darkness', 'water', 'heart'].map((element, index) => {
                              const elementCounts = getElementCardCounts();
                              const count = elementCounts[element] || 0;
                              return (
                                <div
                                  key={element}
                                  className="text-center cursor-pointer group w-20"
                                  onMouseEnter={() => {
                                    try { sfx.play('change-channel', 0.5); } catch {}
                                  }}
                                  onClick={() => {
                                    try { sfx.play('click', 0.7); } catch {}
                                    setSelectedCardElement(element.toUpperCase());
                                    // Filter to show the element card (e.g., "Lightning" card for lightning element)
                                    const elementCardName = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
                                    setSelectedSong(elementCardName);
                                    setSelectedRarity('');
                                    setCurrentCardIndex(0);
                                  }}
                                >
                                  <div 
                                    className={`w-full h-20 rounded-lg relative overflow-hidden transition-all duration-300 group-hover:scale-105`}
                                  >
                                    <img
                                      src={`/elements/${element}.webp`}
                                      alt={`${element} Card`}
                                      className="w-full h-full object-cover rounded-lg"
                                      draggable={false}
                                    />
                                    {/* Show card count for this element */}
                                    <div 
                                      className="absolute top-1 right-1 bg-black/70 rounded px-1 py-0.5"
                                      style={{ 
                                        color: '#FFFFFF', 
                                        textShadow: '0 0 4px rgba(255,255,255,0.6)',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {count}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        /* Card Detail View */
                        <div>
                          {/* Navigation Header with Filter */}
                          <div className="flex items-center gap-3 mb-2">
                            {/* Back button */}
                            <button
                              onClick={() => {
                                try { sfx.play('close', 0.6); } catch {}
                                setSelectedCardElement(null);
                                setSelectedRarity('');
                                setSelectedSong('');
                                setCurrentCardIndex(0);
                              }}
                              className="flex items-center text-white hover:text-gray-300 transition-colors"
                              style={{ fontSize: '14px' }}
                            >
                              <span className="mr-2" style={{ 
                                fontSize: '24px',
                                textShadow: '0 0 10px #00ffff, 0 0 20px #00bfff, 0 0 30px #00bfff',
                                filter: 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.8))'
                              }}>←</span>
                            </button>
                            
                            {/* Song Filter */}
                            <select
                              value={selectedSong}
                              onChange={(e) => {
                                try { sfx.play('change-channel', 0.6); } catch {}
                                setSelectedSong(e.target.value);
                                setCurrentCardIndex(0); // Reset to first card when filter changes
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              onInput={() => {
                                // Play hover sound when cycling through options
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              onKeyDown={(e) => {
                                // Play hover sound when cycling through options with arrow keys
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  try { sfx.play('hover', 0.3); } catch {}
                                }
                              }}
                              className="bg-black/60 border border-white/40 rounded px-3 py-1 text-white text-sm flex-1 hover:scale-105 transition-transform duration-200"
                            >
                              {availableSongs.map(song => (
                                <option key={song} value={song}>{song}</option>
                              ))}
                            </select>
                          </div>


                          {/* Card display */}
                          {isLoadingCards ? (
                            <div className="text-center text-white py-4">Loading cards...</div>
                          ) : filteredCards.length === 0 ? (
                            <div className="text-center text-white py-4">No cards found for this selection.</div>
                          ) : (
                            (() => {
                              const card = filteredCards[currentCardIndex];
                              if (!card) return null;
                              
                              return (
                                <div className="relative w-full">
                                  {/* Single Card Display */}
                            <div key={card.id} className="flex flex-col items-center text-center max-w-full" onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}>

                              {/* Card Image with Navigation Arrows */}
                              <div className="flex items-center justify-center gap-4 mb-4">
                                {/* Left Arrow - Always visible */}
                                <button
                                  onClick={() => {
                                    try { sfx.play('flip', 0.8); } catch {}
                                    setCurrentCardIndex(prev =>
                                      prev > 0 ? prev - 1 : filteredCards.length - 1
                                    );
                                  }}
                                  className={`w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border-2 ${
                                    filteredCards.length > 1
                                      ? 'text-white hover:text-yellow-400 border-white/30 hover:border-yellow-400/60'
                                      : 'text-white/30 border-white/10 cursor-default'
                                  }`}
                                  style={{
                                    textShadow: filteredCards.length > 1 ? '0 0 10px #00ffff, 0 0 20px #00bfff, 0 0 30px #00bfff' : 'none',
                                    filter: filteredCards.length > 1 ? 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.8))' : 'none'
                                  }}
                                >
                                  <span style={{ fontSize: '20px' }}>←</span>
                                </button>
                                
                                {/* Card Image */}
                                <div className="w-32 h-44 rounded-lg border-2 border-yellow-500/80 overflow-hidden relative cursor-pointer hover:border-yellow-400/90 transition-all duration-200 hover:scale-105">
                                <img
                                  src={card.artwork_url || `/cards/${card.card_name}.webp`}
                                  alt={card.card_name}
                                  className={`w-full h-full object-cover ${shouldBlurCard(card) ? 'filter blur-sm opacity-60' : ''}`}
                                  onClick={() => {
                                    if (!shouldBlurCard(card)) {
                                      try { sfx.play('click', 0.8); } catch {}
                                      setEnlargedCard(card);
                                      setIsEnlargedCardFlipped(false);
                                    }
                                  }}
                                />
                                {shouldBlurCard(card) && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold bg-black/70 px-2 py-1 rounded">
                                      {!card.is_released ? 'UNRELEASED' : 'LOCKED'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Right Arrow - Always visible */}
                              <button
                                onClick={() => {
                                  try { sfx.play('flip', 0.8); } catch {}
                                  setCurrentCardIndex(prev =>
                                    prev < filteredCards.length - 1 ? prev + 1 : 0
                                  );
                                }}
                                className={`w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border-2 ${
                                  filteredCards.length > 1
                                    ? 'text-white hover:text-yellow-400 border-white/30 hover:border-yellow-400/60'
                                    : 'text-white/30 border-white/10 cursor-default'
                                }`}
                                style={{
                                  textShadow: filteredCards.length > 1 ? '0 0 10px #00ffff, 0 0 20px #00bfff, 0 0 30px #00bfff' : 'none',
                                  filter: filteredCards.length > 1 ? 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.8))' : 'none'
                                }}
                              >
                                <span style={{ fontSize: '20px' }}>→</span>
                              </button>
                            </div>

                              {/* Card Details - Below Image */}
                              <div className="w-full max-w-md">
                                {!showPhysicalForm && !showDigitalForm ? (
                                  <>
                                    {/* Description - Below Image */}
                                    <p
                                      className="text-sm mb-3 leading-relaxed text-center max-w-lg mx-auto"
                                      style={{
                                        color: '#FFFFFF',
                                        textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                      }}
                                    >
                                      {card.description}
                                    </p>

                                    {/* Purchase buttons - In normal flow */}
                                    <div className="flex justify-center gap-4 pb-2">
                                      <button
                                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-colors text-sm font-semibold hover:scale-105 whitespace-nowrap flex-1 max-w-[180px] ${
                                          showDigitalForm
                                            ? 'border-blue-400/80 bg-blue-400/30'
                                            : 'border-blue-500/60 bg-blue-500/20 hover:bg-blue-500/30'
                                        }`}
                                        style={{
                                          color: showDigitalForm ? '#87CEEB' : '#00BFFF',
                                          textShadow: showDigitalForm
                                            ? '0 0 6px rgba(135,206,235,0.8)'
                                            : '0 0 4px rgba(0,191,255,0.8)',
                                          boxShadow: showDigitalForm ? '0 0 15px rgba(0,191,255,0.4)' : 'none'
                                        }}
                                        onMouseEnter={() => {
                                          try { sfx.play('hover', 0.3); } catch {}
                                        }}
                                        onClick={() => {
                                          try { sfx.play('click', 0.7); } catch {}
                                          setShowDigitalForm(!showDigitalForm);
                                          setShowPhysicalForm(false);
                                          setShowPhysicalConfirm(false);
                                        }}
                                      >
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-5 h-5 flex-shrink-0" />
                                        <span>{card.digitalCost} DIGITAL</span>
                                      </button>

                                      <button
                                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-colors text-sm font-semibold hover:scale-105 whitespace-nowrap flex-1 max-w-[180px] ${
                                          showPhysicalForm || showPhysicalConfirm
                                            ? 'border-purple-400/80 bg-purple-400/30'
                                            : 'border-purple-500/60 bg-purple-500/20 hover:bg-purple-500/30'
                                        }`}
                                        style={{
                                          color: showPhysicalForm || showPhysicalConfirm ? '#E6E6FA' : '#DA70D6',
                                          textShadow: showPhysicalForm || showPhysicalConfirm
                                            ? '0 0 6px rgba(230,230,250,0.8)'
                                            : '0 0 4px rgba(218,112,214,0.8)',
                                          boxShadow: showPhysicalForm || showPhysicalConfirm ? '0 0 15px rgba(218,112,214,0.4)' : 'none'
                                        }}
                                        onMouseEnter={() => {
                                          try { sfx.play('hover', 0.3); } catch {}
                                        }}
                                        onClick={() => {
                                          try { sfx.play('click', 0.7); } catch {}
                                          setShowPhysicalForm(!showPhysicalForm);
                                          setShowPhysicalConfirm(false);
                                          setShowDigitalForm(false);
                                        }}
                                      >
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-5 h-5 flex-shrink-0" />
                                        <span>{card.physicalCost} PHYSICAL</span>
                                      </button>
                                    </div>
                                  </>
                                ) : showPhysicalConfirm ? (
                                  /* Physical Purchase Confirmation */
                                  <div className="text-center">
                                    {/* User and Cost - Side by Side */}
                                    <div className="flex justify-between items-start mb-2">
                                      {/* User Section */}
                                      <div className="flex flex-col items-center flex-1">
                                        <div 
                                          className="font-bold text-white text-lg mb-1"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          User
                                        </div>
                                        
                                        {/* Current Heart Coins */}
                                        <div className="flex flex-col items-center space-y-1">
                                          <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-12 h-12" />
                                          <div 
                                            className="text-xl font-bold"
                                            style={{ 
                                              color: '#FFFFFF', 
                                              textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                            }}
                                          >
                                            {profile?.id ? heartCoins : 0}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Cost Section */}
                                      <div className="flex flex-col items-center flex-1">
                                        <div 
                                          className="font-bold text-white text-lg mb-1"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          Cost
                                        </div>
                                        
                                        <div className="flex flex-col items-center space-y-1">
                                          <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-12 h-12" />
                                          <div 
                                            className="text-xl font-bold"
                                            style={{ 
                                              color: '#FFFFFF', 
                                              textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                            }}
                                          >
                                            {card.physicalCost || 'undefined'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div 
                                      className="text-sm mb-4"
                                      style={{ 
                                        color: heartCoins >= card.physicalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: heartCoins >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)'
                                      }}
                                    >
                                      {(profile?.id ? heartCoins : 0) >= card.physicalCost 
                                        ? '' 
                                        : ''}
                                    </div>

                                    <button 
                                      className="w-full px-4 py-2 rounded border transition-colors mb-2"
                                      style={{ 
                                        backgroundColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.2)' 
                                          : 'rgba(255,0,0,0.2)',
                                        borderColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.6)' 
                                          : 'rgba(255,0,0,0.6)',
                                        color: (profile?.id ? heartCoins : 0) >= card.physicalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      disabled={(profile?.id ? heartCoins : 0) < card.physicalCost}
                                      onClick={async () => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        if ((profile?.id ? heartCoins : 0) >= card.physicalCost) {
                                          // Find the matching PHYSICAL_ITEM
                                          const physicalItem = PHYSICAL_ITEMS.find(item => 
                                            item.title.toLowerCase() === card.card_name.toLowerCase() ||
                                            item.slug.toLowerCase() === card.card_name.toLowerCase().replace(/\s+/g, '-')
                                          );
                                          
                                          if (physicalItem) {
                                            try {
                                              // Purchase the item first
                                              await handlePurchaseWithHeartCoins(physicalItem);
                                              
                                              // Play success sound
                                              try { 
                                                const audio = new Audio('/audio/card-ding.mp3');
                                                audio.volume = 0.6;
                                                audio.play(); 
                                              } catch {}
                                              
                                              // Set selected item for shipping form
                                              setSelectedItem(physicalItem);
                                              
                                              // Transition to shipping step
                                              setShowPhysicalConfirm(false);
                                              setShowPhysicalForm(false);
                                              setStep('shipping');
                                            } catch (error) {
                                              console.error('Purchase failed:', error);
                                              // Don't show form if purchase fails
                                            }
                                          } else {
                                            // Fallback to old behavior if no physical item found
                                            setShowPhysicalConfirm(false);
                                            setShowPhysicalForm(true);
                                          }
                                        }
                                      }}
                                    >
                                      CONFIRM
                                    </button>

                                  </div>
                                ) : showPhysicalForm ? (
                                  /* Physical Purchase Form */
                                  <div className="text-center">
                                    {/* User and Cost - Stacked Layout */}
                                    <div className="mb-3">
                                      {/* User Row: User | Heart Coin | Balance */}
                                      <div className="flex items-center justify-center gap-3 mb-4">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          User
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {profile?.id ? heartCoins : 0}
                                        </div>
                                      </div>
                                      
                                      {/* Cost Row: Cost | Heart Coin | Price */}
                                      <div className="flex items-center justify-center gap-3">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          Cost
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {card.physicalCost}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Message */}
                                    <div 
                                      className="text-sm mb-4"
                                      style={{ 
                                        color: heartCoins >= card.physicalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: heartCoins >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)'
                                      }}
                                    >
                                      {(profile?.id ? heartCoins : 0) >= card.physicalCost 
                                        ? '' 
                                        : ''}
                                    </div>

                                    <button 
                                      className="w-full px-4 py-2 rounded border transition-colors"
                                      style={{ 
                                        backgroundColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.2)' 
                                          : 'rgba(255,0,0,0.2)',
                                        borderColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.6)' 
                                          : 'rgba(255,0,0,0.6)',
                                        color: (profile?.id ? heartCoins : 0) >= card.physicalCost ? '#90EE90' : '#FF6B6B',
                                        textShadow: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      disabled={(profile?.id ? heartCoins : 0) < card.physicalCost}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        // Handle physical purchase logic here
                                        console.log('Physical purchase confirmed');
                                      }}
                                    >
                                      CONFIRM
                                    </button>
                                  </div>
                                ) : showDigitalForm ? (
                                  /* Digital Purchase Form */
                                  <div className="text-center">
                                    {/* User and Cost - Stacked Layout */}
                                    <div className="mb-3">
                                      {/* User Row: User | Heart Coin | Balance */}
                                      <div className="flex items-center justify-center gap-3 mb-4">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          User
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {profile?.id ? heartCoins : 0}
                                        </div>
                                      </div>
                                      
                                      {/* Cost Row: Cost | Heart Coin | Price */}
                                      <div className="flex items-center justify-center gap-3">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          Cost
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {card.digitalCost}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Message */}
                                    <div 
                                      className="text-sm mb-2"
                                      style={{ 
                                        color: heartCoins >= card.digitalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: heartCoins >= card.digitalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)'
                                      }}
                                    >
                                      {(profile?.id ? heartCoins : 0) >= card.digitalCost 
                                        ? '' 
                                        : ''}
                                    </div>

                                    <button 
                                      className="w-full px-4 py-2 rounded border transition-colors"
                                      style={{ 
                                        backgroundColor: (profile?.id ? heartCoins : 0) >= card.digitalCost 
                                          ? 'rgba(0,255,0,0.2)' 
                                          : 'rgba(255,0,0,0.2)',
                                        borderColor: (profile?.id ? heartCoins : 0) >= card.digitalCost 
                                          ? 'rgba(0,255,0,0.6)' 
                                          : 'rgba(255,0,0,0.6)',
                                        color: (profile?.id ? heartCoins : 0) >= card.digitalCost ? '#90EE90' : '#FF6B6B',
                                        textShadow: (profile?.id ? heartCoins : 0) >= card.digitalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      disabled={(profile?.id ? heartCoins : 0) < card.digitalCost}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        // Handle digital purchase logic here
                                        console.log('Digital purchase confirmed');
                                      }}
                                    >
                                      CONFIRM
                                    </button>
                                  </div>
                                ) : showPhysicalConfirm ? (
                                  /* Physical Purchase Form - Same as Digital */
                                  <div className="text-center">
                                    {/* User and Cost - Stacked Layout */}
                                    <div className="mb-3">
                                      {/* User Row: User | Heart Coin | Balance */}
                                      <div className="flex items-center justify-center gap-3 mb-4">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          User
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {profile?.id ? heartCoins : 0}
                                        </div>
                                      </div>
                                      
                                      {/* Cost Row: Cost | Heart Coin | Price */}
                                      <div className="flex items-center justify-center gap-3">
                                        <div 
                                          className="font-bold text-white text-lg"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          Cost
                                        </div>
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-xl font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                          }}
                                        >
                                          {card.physicalCost}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Message */}
                                    <div 
                                      className="text-sm mb-4"
                                      style={{ 
                                        color: heartCoins >= card.physicalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: heartCoins >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)'
                                      }}
                                    >
                                      {(profile?.id ? heartCoins : 0) >= card.physicalCost 
                                        ? '' 
                                        : ''}
                                    </div>

                                    <button 
                                      className="w-full px-4 py-2 rounded border transition-colors"
                                      style={{ 
                                        backgroundColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.2)' 
                                          : 'rgba(255,0,0,0.2)',
                                        borderColor: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? 'rgba(0,255,0,0.6)' 
                                          : 'rgba(255,0,0,0.6)',
                                        color: (profile?.id ? heartCoins : 0) >= card.physicalCost ? '#90EE90' : '#FF6B6B',
                                        textShadow: (profile?.id ? heartCoins : 0) >= card.physicalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      disabled={(profile?.id ? heartCoins : 0) < card.physicalCost}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        // Handle physical purchase logic here
                                        console.log('Physical purchase confirmed');
                                      }}
                                    >
                                      CONFIRM
                                    </button>
                                  </div>
                                ) : null}

                              </div>
                            </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : selectedItem && (
                <>
                  <div className="flex items-center mb-4">
                    <button
                      onClick={handleBackToStore}
                      className="mr-3 text-white hover:text-gray-200 transition-colors"
                    >
                      ← Back
                    </button>
                    <div className="font-semibold text-white">{selectedItem.title}</div>
                  </div>
                  
                  {step === 'confirm' && (
                    <div className="text-center mb-4">
                      <div className="relative w-32 h-32 mx-auto mb-3">
                        <Image
                          src={selectedItem.image}
                          alt={selectedItem.title}
                          fill
                          className="object-contain rounded-lg"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-lg font-bold text-[#F2EF1D]">{selectedItem.priceHeartCoins}</span>
                        <img
                          src="/elements/heart-coin.webp"
                          alt="Heart Coin"
                          className="w-6 h-6 object-contain"
                          style={{
                            filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                          }}
                        />
                      </div>
                      
                      <div className="text-xs text-white/80 mb-4">
                        Your balance: {profile?.id ? (profile?.heartcoin_balance || 0) : 0} Heart Coins
                      </div>
                      
                      {(profile?.id ? (profile?.heartcoin_balance || 0) : 0) >= selectedItem.priceHeartCoins ? (
                        <button
                          onClick={() => handlePurchaseWithHeartCoins(selectedItem)}
                          disabled={isProcessing}
                          className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                            isProcessing
                              ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                              : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
                          }`}
                          style={!isProcessing ? {
                            boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                          } : {}}
                        >
                          {isProcessing ? 'Processing...' : 'CONFIRM'}
                        </button>
                      ) : (
                        <div className="text-sm text-red-400 bg-red-400/20 px-3 py-2 rounded border border-red-400/40">
                          You need {selectedItem.priceHeartCoins - (profile?.id ? (profile?.heartcoin_balance || 0) : 0)} more Heart Coins
                        </div>
                      )}
                    </div>
                  )}
                  
                  {step === 'shipping' && (
                    <div className="text-center mb-4">
                      <div className="text-sm text-green-400 mb-4">
                        Purchase successful! Please provide shipping details:
                      </div>
                      
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={shippingForm.full_name}
                          onChange={(e) => setShippingForm({...shippingForm, full_name: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Address Line 1"
                          value={shippingForm.address_line1}
                          onChange={(e) => setShippingForm({...shippingForm, address_line1: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Address Line 2 (Optional)"
                          value={shippingForm.address_line2}
                          onChange={(e) => setShippingForm({...shippingForm, address_line2: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={shippingForm.city}
                            onChange={(e) => setShippingForm({...shippingForm, city: e.target.value})}
                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={shippingForm.state}
                            onChange={(e) => setShippingForm({...shippingForm, state: e.target.value})}
                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="ZIP Code"
                            value={shippingForm.zip}
                            onChange={(e) => setShippingForm({...shippingForm, zip: e.target.value})}
                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="County"
                            value={shippingForm.county}
                            onChange={(e) => setShippingForm({...shippingForm, county: e.target.value})}
                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Country"
                          value={shippingForm.country}
                          onChange={(e) => setShippingForm({...shippingForm, country: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                        />
                      </div>
                      
                      <button
                        onClick={handleConfirmShipping}
                        disabled={isProcessing || !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country}
                        className={`w-full mt-4 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          isProcessing || !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country
                            ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                            : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
                        }`}
                        style={!isProcessing && shippingForm.full_name && shippingForm.address_line1 && shippingForm.city && shippingForm.state && shippingForm.zip && shippingForm.country ? {
                          boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                        } : {}}
                      >
                        {isProcessing ? 'Processing...' : 'CONFIRM SHIPPING'}
                      </button>
                    </div>
                  )}
                  
                  {step === 'done' && (
                    <div className="text-center mb-4">
                      <div className="text-green-400 text-lg font-semibold mb-4">
                        Order Complete! 🎉
                      </div>
                      <div className="text-sm text-white/80 mb-4">
                        Your {selectedItem.title} has been ordered and will be shipped to the address provided.
                      </div>
                      <div className="text-xs text-white/60 mb-4">
                        You'll receive an email confirmation and tracking information once your order ships.
                      </div>
                      <button
                        onClick={handleBackToStore}
                        className="px-6 py-2 bg-white/20 border border-white/40 rounded text-white hover:bg-white/30 transition-all duration-200 text-sm"
                      >
                        Back to Store
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}


          
          {/* Enlarged Card Modal - positioned within heart coin modal */}
          {enlargedCard && (
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
              onClick={() => {
                setEnlargedCard(null);
                setCardRotation(0);
              }}
            >
              <div
                className="relative w-56 mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* TiltSpinCard wrapper for 360° drag-to-spin interaction */}
                <TiltSpinCard
                  className="relative w-full h-[320px]"
                  maxRotateX={10}
                  sensitivity={0.3}
                  returnDuration={400}
                  enableSpin={true}
                  spinSensitivity={0.8}
                  onRotationChange={setCardRotation}
                  onClick={() => {
                    // Play flip sound
                    try {
                      sfx.play('flip', 0.8);
                    } catch {
                      // Fallback to native Audio
                      try {
                        const audio = new Audio('/audio/flip.mp3');
                        audio.volume = 0.8;
                        audio.play();
                      } catch {}
                    }
                    // Animate flip
                    setIsAnimatingFlip(true);
                    setCardRotation(prev => prev + 180);
                    setTimeout(() => setIsAnimatingFlip(false), 500);
                  }}
                >
                  {/* Front of card - rotates with cardRotation */}
                  <img
                    src={enlargedCard.artwork_url || `/cards/${enlargedCard.card_name}.webp`}
                    alt={enlargedCard.card_name}
                    className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain pointer-events-none"
                    style={{
                      filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))',
                      backfaceVisibility: 'hidden',
                      transform: `rotateY(${cardRotation}deg)`,
                      transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    }}
                    draggable={false}
                  />
                  {/* Back of card - offset by 180° */}
                  <img
                    src="/cards/BACK.webp"
                    alt="Card back"
                    className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain pointer-events-none"
                    style={{
                      filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))',
                      backfaceVisibility: 'hidden',
                      transform: `rotateY(${cardRotation + 180}deg)`,
                      transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    }}
                    draggable={false}
                  />
                </TiltSpinCard>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try { sfx.play('close', 0.7); } catch {}
                    setEnlargedCard(null);
                    setIsEnlargedCardFlipped(false);
                    setCardRotation(0); // Reset rotation when closing
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-200 z-10"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Enlarged Merchandise Modal */}
          {enlargedMerchItem && (
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
              onClick={() => {
                setEnlargedMerchItem(null);
                setMerchRotation(0);
              }}
            >
              {/* Pulsing animation keyframes */}
              <style jsx>{`
                @keyframes merchFloat {
                  0%, 100% {
                    transform: translateY(0px);
                  }
                  50% {
                    transform: translateY(-8px);
                  }
                }
              `}</style>
              <div
                className="relative w-64 mx-4"
                style={{
                  animation: 'merchFloat 2.5s ease-in-out infinite',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* TiltSpinCard wrapper for 3D rotation - no visible styling */}
                <TiltSpinCard
                  className="relative w-full h-[320px]"
                  style={{ perspective: '1000px' }}
                  maxRotateX={10}
                  sensitivity={0.3}
                  returnDuration={400}
                  enableSpin={true}
                  spinSensitivity={0.8}
                  onRotationChange={setMerchRotation}
                  onClick={() => {
                    // Play flip sound and animate
                    sfx.play('flip', 0.8);
                    setIsMerchAnimatingFlip(true);
                    setMerchRotation(prev => prev + 180);
                    setTimeout(() => setIsMerchAnimatingFlip(false), 500);
                  }}
                >
                  {/* 3D container for images - this spins */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateY(${merchRotation}deg)`,
                      transition: isMerchAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    }}
                  >
                    {/* Merchandise Image - Front */}
                    <img
                      src={enlargedMerchItem.image}
                      alt={enlargedMerchItem.title}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{
                        filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))',
                        backfaceVisibility: 'hidden',
                      }}
                      draggable={false}
                    />
                    {/* Merchandise Image - Back */}
                    <img
                      src={enlargedMerchItem.image2 || enlargedMerchItem.image}
                      alt={`${enlargedMerchItem.title} back`}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{
                        filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                      draggable={false}
                    />
                  </div>
                </TiltSpinCard>

                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try { sfx.play('close', 0.7); } catch {}
                    setEnlargedMerchItem(null);
                    setMerchRotation(0);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-200 z-10"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          </div>
        </div>
      )}

      {/* MERCH Tab Content */}
      {activeTab === 'USE' && activeUseTab === 'MERCH' && (
        <div className="pl-1 pr-4 pb-2 pt-0">
          <div 
            className="text-base text-center mb-3"
            style={{ 
              color: '#FFFFFF', 
              textShadow: '0 0 4px rgba(255,255,255,0.8)', 
              fontSize: '12px',
              lineHeight: 1.2,
              paddingTop: '8px',
              display: 'none'
            }}
          >
            Trade your HEART coins for collectibles that reflect your journey.
          </div>

          {/* Merch Items Display */}
          <div className="max-h-80 overflow-y-auto" style={{ display: 'none' }}>
            <div className="flex flex-col items-center justify-center gap-3">
              {/* Physical Item Display */}
              <div className="w-full max-w-md">
                <div className="relative" style={{ display: 'none' }}>
                  <img
                    src={PHYSICAL_ITEMS[currentMerchIndex].image}
                    alt={PHYSICAL_ITEMS[currentMerchIndex].title}
                    className="w-full h-48 object-cover rounded-lg border-2 border-white/30"
                  />
                </div>
                
                <div className="text-center mt-3">
                  <h3 className="text-lg font-bold text-white mb-2">
                    {PHYSICAL_ITEMS[currentMerchIndex].title.toUpperCase()}
                  </h3>
                  <p className="text-sm text-white/70 mb-3 px-2">
                    {PHYSICAL_ITEMS[currentMerchIndex].description.toUpperCase()}
                  </p>
                  
                  <div className="flex justify-between items-center mb-3 px-4">
                    <div className="flex items-center gap-1">
                      <img
                        src="/elements/heart-coin.webp"
                        alt="Heart Coin"
                        className="w-4 h-4"
                      />
                      <span className="text-[#F2EF1D] font-bold">
                        {PHYSICAL_ITEMS[currentMerchIndex].priceHeartCoins}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm">
                      ${PHYSICAL_ITEMS[currentMerchIndex].cost}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handlePurchaseWithHeartCoins(PHYSICAL_ITEMS[currentMerchIndex])}
                    disabled={isProcessing || (profile?.id ? heartCoins : 0) < PHYSICAL_ITEMS[currentMerchIndex].priceHeartCoins}
                    className="w-full py-2 px-4 rounded-lg font-bold text-sm bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Add to Collection'}
                  </button>
                </div>
              </div>

              {/* Navigation */}
              {PHYSICAL_ITEMS.length > 1 && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentMerchIndex(prev => prev === 0 ? PHYSICAL_ITEMS.length - 1 : prev - 1)}
                    className="p-2 rounded-full border-2 border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {PHYSICAL_ITEMS.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMerchIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentMerchIndex
                            ? 'bg-[#F2EF1D] shadow-[0_0_8px_rgba(242,239,29,0.8)]'
                            : 'bg-white/30 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentMerchIndex(prev => prev === PHYSICAL_ITEMS.length - 1 ? 0 : prev + 1)}
                    className="p-2 rounded-full border-2 border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



    </>
  );
}
