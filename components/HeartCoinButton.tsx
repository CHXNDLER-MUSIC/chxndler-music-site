"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { sfx } from "@/lib/sfx";
import Image from "next/image";
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseBrowser } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { useBonusQuests } from '@/hooks/useBonusQuests';
import { useElementOfDayClaim } from '@/hooks/useElementOfDayClaim';
import { useUserCards } from "@/hooks/useUserCards";
import { useBinderSlots } from "@/hooks/useBinderSlots";
import { BonusQuestWithCompletion } from '@/types/bonusQuests';
import { useMerchItems } from '@/hooks/useMerchItems';
import { useMerchPurchase } from '@/hooks/useMerchPurchase';
import { MerchItem } from '@/types/merch';
import TiltSpinCard from '@/components/TiltSpinCard';
import { usePlanetRewardsContext } from '@/components/PlanetRewardsProvider';
import { getElementalPlanetImage } from '@/lib/elementalPlanets';
import { ELEMENT_COLORS, Element } from '@/lib/planets';
import { triggerMerchCelebration } from '@/utils/merchCelebration';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';
import { triggerElementCardCelebration } from '@/utils/elementCardCelebration';
import { triggerCardCelebration } from '@/utils/cardCelebration';

// Get basePath from env (supports deployments with basePath like /cockpit)
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

// Element of the Day bonus quest ID - completion happens in ElementOfDay modal, not here
const ELEMENT_OF_DAY_BONUS_QUEST_ID = '4c24a82f-92ba-44f4-9386-d8c6438498bd';

// Helper function to convert MerchItem to StoreItem for backward compatibility
const merchItemToStoreItem = (merchItem: MerchItem): StoreItem => {
  // Special-case: beanie back image should use profile_url_2 when available
  const backImage = merchItem.slug === 'beanie'
    ? ((merchItem as any).profile_url_2 || merchItem.image_url_2)
    : merchItem.image_url_2;

  return {
    id: merchItem.slug,
    slug: merchItem.slug,
    title: merchItem.name,
    description: merchItem.description || '',
    image: merchItem.image_url || '',
    image2: backImage || undefined,
    priceUsd: merchItem.cost_usd || 0,
    priceHeartCoins: merchItem.price_heartcoins,
    cost: merchItem.price_heartcoins,
    physicalCost: merchItem.price_heartcoins,
    stripeUrl: merchItem.stripe_url || '',
    is_released: merchItem.is_active,
    min_tier: merchItem.min_tier || 'wanderer'
  };
};

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
  kind: 'merch' | 'card_physical';  // Type of purchase
  merchItemId?: string;     // For merch: The actual database UUID
  cardId?: string;          // For cards: The card UUID
  clientSlug: string;       // For logging/debugging
  quantity: number;
  uiCost: number;           // The cost shown to user (for display only - server is authoritative)
  source: 'MERCH' | 'CARDS';
  itemName: string;         // For display in confirm modal
  idempotencyKey: string;   // Generated ONCE when draft is created, reused on confirm
  image?: string;           // Item image URL for celebration
  orderId?: string;         // For card_physical: Order ID returned from purchase API
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
  const { elementOfDay, songOfDayTitle, songOfDaySlug } = usePlanetRewardsContext();
  const { isClaimed: isElementOfDayClaimed } = useElementOfDayClaim();

  // New hooks for database-driven merch
  const { items: merchItems, loading: merchLoading, error: merchError } = useMerchItems('physical');
  const { purchaseWithHeartCoins, updateShipping, isProcessing, error: purchaseError, clearError } = useMerchPurchase();
  
  // Convert MerchItems to StoreItems for backward compatibility
  const PHYSICAL_ITEMS = useMemo(() =>
    merchItems.map(merchItemToStoreItem),
    [merchItems]
  );

  // Quests hook - returns ALL quests (DAILY + BONUS categories)
  const { quests: allQuests, status: questsStatus, errorMessage: questsError, isLoggedIn, completeQuest, refetchQuests } = useBonusQuests();

  // Derive daily and bonus quests from allQuests via memoization
  // Use "dailyQuestItems" to avoid conflict with the existing "dailyQuests" UI state
  const dailyQuestItems = useMemo(() =>
    (allQuests || []).filter(q => q.category === 'DAILY'),
    [allQuests]
  );

  const bonusQuestItems = useMemo(() =>
    (allQuests || []).filter(q => q.category === 'BONUS'),
    [allQuests]
  );

  // Loading state derived from hook status
  const dailyQuestsLoading = questsStatus === 'loading';

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EARN' | 'USE'>('EARN');
  const [activeUseTab, setActiveUseTab] = useState<'MERCH' | 'CARDS'>('MERCH');
  const [activeEarnTab, setActiveEarnTab] = useState<'DAILY QUESTS' | 'BONUS QUESTS'>('DAILY QUESTS');
  const [selectedCardElement, setSelectedCardElement] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  // Target card ID for navigation - set when opening from COLLECT CARD button
  // This ensures we navigate to the correct card AFTER filteredCards is updated
  const [targetCardId, setTargetCardId] = useState<string | null>(null);
  const [showPhysicalForm, setShowPhysicalForm] = useState(false);
  const [showPhysicalConfirm, setShowPhysicalConfirm] = useState(false);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [currentMerchIndex, setCurrentMerchIndex] = useState(0);
  // Enlarged merch modal state - single source of truth for merch selection
  // Use full MerchItem object so confirm payload and UI stay in sync
  const [activeMerchItem, setActiveMerchItem] = useState<MerchItem | null>(null);
  const [showEnlargedConfirm, setShowEnlargedConfirm] = useState(false);
  
  const [inviteFriendShared, setInviteFriendShared] = useState(false);
  const [elementSongReturned, setElementSongReturned] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [processingQuestId, setProcessingQuestId] = useState<string | null>(null);
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
  // Shipping status: idle, saving, success, error
  const [shippingStatus, setShippingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [shippingAttempted, setShippingAttempted] = useState(false); // Track if user tried to submit with missing fields
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
  // Separate in-flight ref for card purchases to avoid cross-interference with merch
  const cardPurchaseInFlightRef = useRef(false);
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

  // Listen for journalCompleted event to immediately update local state
  useEffect(() => {
    const handleJournalCompleted = () => {
      setDailyQuests(prev => ({ ...prev, journalEntry: true }));
    };
    window.addEventListener('journalCompleted', handleJournalCompleted);
    return () => {
      window.removeEventListener('journalCompleted', handleJournalCompleted);
    };
  }, []);

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

  // Ref to track if we're currently auto-navigating to a card (prevents index reset race condition)
  const isAutoNavigatingRef = useRef(false);

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
      // Set white beam when opening via hamburger menu
      try { onBeamColorChange?.('white'); } catch {}
      setOpen(true);
    } else if (!isActive && open && !isFromCollectCard) {
      // Only auto-close if not opened from collect card button
      setOpen(false);
      setIsFromHamburger(false);
      setIsFromCollectCard(false);
    }
  }, [isActive, open, isFromCollectCard, onBeamColorChange]);

  // Listen for close-heartcoin-modal event
  useEffect(() => {
    const handleCloseModal = () => {
      console.log('[HeartCoinButton] Received close-heartcoin-modal event');
      setOpen(false);
    };
    window.addEventListener('close-heartcoin-modal', handleCloseModal);
    return () => window.removeEventListener('close-heartcoin-modal', handleCloseModal);
  }, []);

  // Listen for element-of-day-claimed event to mark daily quest as completed
  useEffect(() => {
    const handleElementClaimed = (e: CustomEvent) => {
      console.log('[HeartCoinButton] Element of day claimed:', e.detail);
      // Find the TAP_ELEMENT_OF_DAY quest and mark it as completed
      const elementQuest = dailyQuestItems.find(q => q.quest_key === 'TAP_ELEMENT_OF_DAY');
      if (elementQuest) {
        setCompletedQuests(prev => new Set(prev).add(elementQuest.id));
      }
      // Refetch quests to get updated completion status from server
      refetchQuests();
    };
    window.addEventListener('element-of-day-claimed', handleElementClaimed as EventListener);
    return () => window.removeEventListener('element-of-day-claimed', handleElementClaimed as EventListener);
  }, [dailyQuestItems, refetchQuests]);

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

  // Listen for closeHeartCoinModal event (e.g., when login button is clicked)
  useEffect(() => {
    const handleCloseHeartCoinModal = () => {
      if (open) {
        setOpen(false);
        setIsFromHamburger(false);
        setIsFromCollectCard(false);
        setTargetCardId(null);
        try { onClose?.(); } catch {}
      }
    };

    window.addEventListener('closeHeartCoinModal', handleCloseHeartCoinModal);
    return () => window.removeEventListener('closeHeartCoinModal', handleCloseHeartCoinModal);
  }, [open, onClose]);

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
      if (activeMerchItem) return;
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
  }, [open, activeTab, activeUseTab, PHYSICAL_ITEMS.length, activeMerchItem]);

  // Mobile swipe navigation for MERCH items (← / → via swipe)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number | null>(null);

  const handleMerchTouchStart = (e: React.TouchEvent) => {
    if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH' || activeMerchItem) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleMerchTouchEnd = (e: React.TouchEvent) => {
    if (!open || activeTab !== 'USE' || activeUseTab !== 'MERCH' || activeMerchItem) return;
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
      // Reset to "All Cards" when element changes so user can navigate all cards
      if (selectedSong && !availableSongs.includes(selectedSong)) {
        setSelectedSong('');
      }

      // Reset rarity if it's not available in the selected element
      if (selectedRarity && !availableRarities.includes(selectedRarity)) {
        setSelectedRarity('');
      }
      // Reset card index when element changes, but NOT during auto-navigation from COLLECT CARD
      // The auto-navigate effect will set the correct index in that case
      if (!isAutoNavigatingRef.current) {
        setCurrentCardIndex(0);
      }
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
    
    // Note: We don't filter by song/card name - the dropdown navigates to cards instead of filtering

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
  }, [cards, selectedCardElement, selectedRarity]);

  // Navigate to target card after filteredCards is updated
  // This effect runs AFTER the filter cards effect, ensuring we navigate to the correct index
  useEffect(() => {
    if (!targetCardId || filteredCards.length === 0) return;

    const cardIndex = filteredCards.findIndex(card => card.id === targetCardId);
    if (cardIndex >= 0) {
      setCurrentCardIndex(cardIndex);
      // Clear targetCardId after successful navigation
      setTargetCardId(null);
    }
  }, [targetCardId, filteredCards]);

  // Auto-navigate to selected card when opened from COLLECT CARD button
  useEffect(() => {
    // Only run when opened from collect card button with a selected song
    if (!isFromCollectCard || !selectedSong || cards.length === 0) return;

    // Find the card by matching name (case-insensitive)
    const normalizedSelectedSong = selectedSong.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedCard = cards.find(card => {
      const cardName = (card.card_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cardName === normalizedSelectedSong;
    });

    if (matchedCard && matchedCard.element && matchedCard.id) {
      // Set flag to prevent the element-change effect from resetting the card index
      isAutoNavigatingRef.current = true;

      // Auto-select the card's element
      const elementUpper = matchedCard.element.toUpperCase();
      if (selectedCardElement !== elementUpper) {
        setSelectedCardElement(elementUpper);
      }

      // Set the target card ID - the navigation effect will find the correct index
      // after filteredCards is updated by the filter cards effect
      setTargetCardId(matchedCard.id);

      // Clear the auto-navigating flag after a tick to allow state updates to complete
      setTimeout(() => {
        isAutoNavigatingRef.current = false;
      }, 0);

      // Only clear selectedSong to prevent re-running, but keep isFromCollectCard
      // so the modal doesn't auto-close (see isActive useEffect)
      setSelectedSong('');
    }
  }, [isFromCollectCard, selectedSong, cards, selectedCardElement]);

  // Pre-load cards when the modal opens (not just when CARDS tab is active)
  // This ensures cards are ready when user navigates to CARDS tab
  useEffect(() => {
    if (open && cards.length === 0) {
      fetchCards();
    }
  }, [open, cards.length, fetchCards]);

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
  const [showCardConfirm, setShowCardConfirm] = useState<'digital' | 'physical' | null>(null);
  const [cardPurchaseStep, setCardPurchaseStep] = useState<'confirm' | 'shipping' | 'done'>('confirm');
  const [pendingPhysicalOrderId, setPendingPhysicalOrderId] = useState<string | null>(null);
  const [cardShippingAttempted, setCardShippingAttempted] = useState(false);
  const [isEnlargedCardFlipped, setIsEnlargedCardFlipped] = useState(false);
  const [cardRotation, setCardRotation] = useState(0); // For 360° spin mode
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false); // For smooth flip transition
  const [merchRotation, setMerchRotation] = useState(0); // For merch 360° spin mode
  const [isMerchAnimatingFlip, setIsMerchAnimatingFlip] = useState(false); // For merch flip transition
  // activeMerchItem state is declared earlier for effect ordering
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [isSubmittingPhrase, setIsSubmittingPhrase] = useState(false);
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle');
  // Hook to allow explicit user_cards refresh after purchases
  const { cards: ownedCards, refresh: refreshUserCards } = useUserCards(profile?.id);
  // Hook to check if user has empty binder slots for digital card purchases
  const { hasEmptySlot } = useBinderSlots(profile?.id);

  // Check if a card is already owned by the user (digital)
  const isCardOwned = useCallback((cardId?: string) => {
    if (!cardId || !ownedCards?.length) return false;
    return ownedCards.some(uc => uc.card_id === cardId);
  }, [ownedCards]);

  // State for secret phrase quest
  const [secretPhraseInputVisible, setSecretPhraseInputVisible] = useState<string | null>(null);
  const [secretPhraseValue, setSecretPhraseValue] = useState("");
  const [secretPhraseLoading, setSecretPhraseLoading] = useState(false);
  
  // State for automatic text box after check-in
  const [showAutoTextBox, setShowAutoTextBox] = useState(false);
  const [autoTextValue, setAutoTextValue] = useState("");
  const [attendLivestreamConfirming, setAttendLivestreamConfirming] = useState(false);
  const [phraseValidationResult, setPhraseValidationResult] = useState<'correct' | 'incorrect' | 'already' | null>(null);
  // Daily secret phrase redemption - prevent duplicates and track status
  const [isRedeemingPhrase, setIsRedeemingPhrase] = useState(false);
  const [phraseStatus, setPhraseStatus] = useState<'idle'|'success'|'already'|'incorrect'|'error'>('idle');

  // Check if today's secret phrase has already been redeemed on mount
  useEffect(() => {
    const checkTodayRedemption = async () => {
      if (!profile?.id) return;

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Query secret_phrase_redemptions joined with secret_phrases
        // to check if user has redeemed today's phrase
        const { data, error } = await supabaseBrowser
          .from('secret_phrase_redemptions')
          .select(`
            id,
            secret_phrases!inner (
              active_date
            )
          `)
          .eq('user_id', profile.id)
          .eq('secret_phrases.active_date', today)
          .limit(1);

        if (error) {
          console.warn('Error checking today redemption:', error);
          return;
        }

        // If we found a redemption for today, set status to 'already'
        if (data && data.length > 0) {
          setPhraseStatus('already');
        }
      } catch (err) {
        console.warn('Error in checkTodayRedemption:', err);
      }
    };

    checkTodayRedemption();
  }, [profile?.id]);

  // Helper function to check if quest is completed (either from DB or local state)
  const isQuestCompleted = (quest: any) => {
    // For Element of Day quest, check the dedicated claim status
    if (quest.quest_key === 'TAP_ELEMENT_OF_DAY') {
      return isElementOfDayClaimed || quest.completed_today > 0 || completedQuests.has(quest.id);
    }
    // For daily quests, check completed_today or local state
    if (quest.quest_key === 'JOURNAL_ENTRY_OF_DAY') {
      return dailyQuests.journalEntry || quest.completed_today > 0 || completedQuests.has(quest.id);
    }
    // For other daily quests, check completed_today
    if (quest.completed_today !== undefined) {
      return quest.completed_today > 0 || completedQuests.has(quest.id);
    }
    // For one-time quests
    return (quest.times_completed > 0 && quest.max_total_completions === 1) || completedQuests.has(quest.id);
  };

  // Redeem secret phrase via Supabase RPC (daily secret phrase)
  const redeemDailySecretPhrase = async (phrase: string): Promise<{ status: string; reward?: number; payload?: any }> => {
    // Normalize to match backend: trim, collapse spaces, lowercase
    const cleaned = phrase.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!cleaned) return { status: 'invalid' };

    try {
      const { data, error } = await supabaseBrowser.rpc('redeem_daily_secret_phrase', {
        input_phrase: cleaned,
      });

      if (error) {
        const status = (error as any)?.status ?? (error as any)?.statusCode;
        const code = (error as any)?.code as string | undefined;
        console.error('Secret phrase RPC error:', {
          status,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code,
        });

        // Error mapping per requirements
        if (code === 'P0003' || status === 409 || code === '23505') {
          return { status: 'already_redeemed' };
        }
        if (code === 'P0002') {
          return { status: 'invalid' };
        }
        if (code === 'P0001') {
          return { status: 'not_authenticated' };
        }
        return { status: 'error' };
      }

      const row = Array.isArray(data) ? data[0] : data;

      try {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.debug('[secret-phrase]', {
            ok: true,
            day: row?.active_date ?? row?.activeDate ?? row?.day ?? null,
            reward: row?.reward ?? row?.granted_amount ?? 0,
          });
        }
      } catch {}

      return {
        status: 'success',
        reward: row?.reward ?? row?.granted_amount ?? 0,
        payload: row,
      };
    } catch (error: any) {
      console.error('Error redeeming daily secret phrase:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
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
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
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
    // Prevent re-clicks while processing
    if (processingQuestId === quest.id) return;

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

      // Mark as processing and completed locally immediately
      setProcessingQuestId(quest.id);
      setCompletedQuests(prev => new Set(prev).add(quest.id));

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
          // Show success message (hook already refreshed profile if heartcoins were awarded)
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
        // Remove from completed if it actually failed
        setCompletedQuests(prev => {
          const next = new Set(prev);
          next.delete(quest.id);
          return next;
        });
        setCheckInMessage(result.message);
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing bonus quest:', error);
      // Remove from completed on error
      setCompletedQuests(prev => {
        const next = new Set(prev);
        next.delete(quest.id);
        return next;
      });
      setCheckInMessage('An error occurred while completing the quest');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    } finally {
      setProcessingQuestId(null);
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
    const phraseLower = phraseTrimmed.toLowerCase();
    setSecretPhraseLoading(true);

    try {
      const { data, error } = await supabaseBrowser.rpc(
        'redeem_daily_secret_phrase',
        { input_phrase: phraseLower }
      );

      if (error) {
        const status = (error as any)?.status ?? (error as any)?.statusCode;
        const code = (error as any)?.code as string | undefined;
        console.error('Secret phrase RPC error:', {
          status,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code,
        });

        if (code === 'P0002') {
          setCheckInMessage('Incorrect secret phrase for today.');
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Incorrect secret phrase for today.', type: 'error' } })); } catch {}
        } else if (code === 'P0003' || status === 409 || code === '23505') {
          setCheckInMessage('Already checked in!');
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Already checked in!', type: 'success' } })); } catch {}
        } else if (code === 'P0001') {
          setCheckInMessage('Log in to redeem.');
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Log in to redeem.', type: 'error' } })); } catch {}
          // Prompt login modal
          try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openWelcomeHomeModal')); } catch {}
        } else {
          setCheckInMessage('Failed to redeem secret phrase');
        }
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
        return;
      }

      // Normalize RPC response shape (array or single object)
      const result = (Array.isArray(data) ? data[0] : data) as { reward?: number; granted_amount?: number; day?: string; active_date?: string } | null;
      const reward = result?.reward ?? result?.granted_amount ?? 0;

      setSecretPhraseValue('');
      setSecretPhraseInputVisible(null);
      setCheckInMessage(`Secret phrase accepted! +${reward} HeartCoins`);
      setStatusType('success');
      setShowCheckInSuccess(true);

      // dev-only debug
      try {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.debug('[secret-phrase]', { ok: true, day: result?.active_date ?? (result as any)?.day ?? null, reward });
        }
      } catch {}

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
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Redeemed +${reward} HeartCoins`, type: 'success' } })); } catch {}
    } catch (error: any) {
      console.error('Secret phrase quest error:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
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
    // Prevent re-clicks while processing
    if (processingQuestId === quest.id) return;

    try {
      // Mark as processing immediately
      setProcessingQuestId(quest.id);
      // Mark as completed locally immediately to update UI
      setCompletedQuests(prev => new Set(prev).add(quest.id));
      setInviteFriendShared(false); // Reset the shared state

      try { sfx.play('card-ding', 0.8); } catch {}
      const result = await completeQuest(quest);

      if (result.success) {
        // Check if this was already completed today (no new coins awarded)
        const alreadyCompleted = result.alreadyCompleted === true;

        if (alreadyCompleted) {
          // Already completed today - show soft toast, no coin animation
          setCheckInMessage('Already completed today');
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('toast:show', {
                detail: { message: 'Already completed today', type: 'success' }
              }));
            }
          } catch {}
          setStatusType('success');
        } else {
          // NEW completion - hook already refreshed profile when heartcoin_awarded was true
          setCheckInMessage(`Quest completed! +1 Heart Coin earned`);
          setStatusType('success');
        }

        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      } else {
        // Remove from completed if it actually failed
        setCompletedQuests(prev => {
          const next = new Set(prev);
          next.delete(quest.id);
          return next;
        });
        // Show toast for actual errors
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('toast:show', {
              detail: { message: result.message || 'Quest failed. Try again.', type: 'error' }
            }));
          }
        } catch {}
        setCheckInMessage(result.message || 'Quest failed. Try again.');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 2500);
      }
    } catch (error: any) {
      // Remove from completed on error
      setCompletedQuests(prev => {
        const next = new Set(prev);
        next.delete(quest.id);
        return next;
      });
      // Show toast for error
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Quest failed. Try again.', type: 'error' }
          }));
        }
      } catch {}
      setCheckInMessage('Quest failed. Try again.');
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 2500);
    } finally {
      setProcessingQuestId(null);
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
    // Close the HeartCoin display and open the journal popout
    setOpen(false);
    onClose?.();
    window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
    setTimeout(() => {
      try {
        setIsJournalOpen(true);
        onOpenJournal?.();
        window.dispatchEvent(new CustomEvent('openJournalModal'));
      } catch {}
    }, 150);
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

  // Confirm handler for DIGITAL card purchases via Supabase RPC
  // Accepts an optional card to support confirm from non-enlarged view
  const handleConfirmCardPurchase = async (targetCard?: Card) => {
    console.log('[CARD PURCHASE] Confirm clicked', {
      card: (targetCard || enlargedCard)?.card_name,
      cardId: (targetCard || enlargedCard)?.id,
      type: showCardConfirm,
      cost: showCardConfirm === 'digital' ? (enlargedCard?.digitalCost || 5) : (enlargedCard?.physicalCost || 20),
      heartCoins,
      isPurchasing,
      inFlightRef: cardPurchaseInFlightRef.current,
    });

    const selectedCard = targetCard || enlargedCard;
    const selectedCardId = selectedCard?.id;
    console.log('[CARD PURCHASE] selectedCardId', selectedCardId);

    // Guards with logs for every early return
    if (isPurchasing) {
      console.warn('[CARD PURCHASE] GUARD: isPurchasing already true');
      console.warn('[CARD PURCHASE] blocked: isPurchasing');
      return;
    }
    if (cardPurchaseInFlightRef.current) {
      console.warn('[CARD PURCHASE] GUARD: cardPurchaseInFlightRef already true');
      console.warn('[CARD PURCHASE] blocked: inFlightRef');
      return;
    }
    if (!profile?.id) {
      console.warn('[CARD PURCHASE] GUARD: missing profile/user');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Please log in to buy cards', type: 'error' } })); } catch {}
      return;
    }
    if (!selectedCardId) {
      console.warn('[CARD PURCHASE] GUARD: missing selectedCardId');
      console.warn('[CARD PURCHASE] blocked: missing selectedCardId');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'No card selected', type: 'error' } })); } catch {}
      return;
    }
    if (showCardConfirm !== 'digital' && !targetCard) {
      console.warn('[CARD PURCHASE] GUARD: confirm type is not digital');
      return;
    }
    const cost = selectedCard?.digitalCost || 5;
    if (heartCoins == null) {
      console.warn('[CARD PURCHASE] GUARD: missing balance in UI');
    }
    if ((profile?.heartcoin_balance ?? heartCoins ?? 0) < cost) {
      console.warn('[CARD PURCHASE] GUARD: insufficient balance', { balance: profile?.heartcoin_balance ?? heartCoins ?? 0, cost });
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Insufficient HeartCoins', type: 'error' } })); } catch {}
      return;
    }

    // Set in-flight BEFORE any async work and ensure reset in finally
    cardPurchaseInFlightRef.current = true;
    setIsPurchasing(true);
    console.log('[CARD PURCHASE] In-flight set TRUE');

    try {
      // Log Supabase URL for debugging
      console.log('[CARD PURCHASE] supabaseUrl', (supabaseBrowser as any)?.rest?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL);

      // Manual purchase flow (RPC function may not exist)
      const userId = profile.id;
      const currentBalance = profile.heartcoin_balance ?? heartCoins ?? 0;

      // Double-check balance
      if (currentBalance < cost) {
        console.error('[CARD PURCHASE] Balance check failed', { currentBalance, cost });
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Insufficient HeartCoins', type: 'error' } })); } catch {}
        return;
      }

      // Step 1: Grant card ownership by inserting into user_cards
      const { error: userCardError } = await supabaseBrowser
        .from('user_cards')
        .insert({
          user_id: userId,
          card_id: selectedCardId,
          source: 'purchase'
        });

      if (userCardError) {
        // Check if it's a duplicate (user already owns card)
        if (userCardError.code === '23505') {
          console.log('[CARD PURCHASE] User already owns this card');
          try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'You already own this card!', type: 'info' } })); } catch {}
          return;
        }
        console.error('[CARD PURCHASE] Failed to grant card ownership:', userCardError);
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Purchase failed - could not grant card', type: 'error' } })); } catch {}
        return;
      }

      // Step 2: Deduct HeartCoins from balance
      const newBalance = currentBalance - cost;
      const { error: balanceError } = await supabaseBrowser
        .from('profiles')
        .update({ heartcoin_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (balanceError) {
        console.error('[CARD PURCHASE] Failed to deduct balance:', balanceError);
        // Try to rollback - delete the user_card we just created
        await supabaseBrowser.from('user_cards').delete().eq('user_id', userId).eq('card_id', selectedCardId);
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Purchase failed - balance update error', type: 'error' } })); } catch {}
        return;
      }

      // Step 3: Log the transaction
      await supabaseBrowser
        .from('heartcoin_transactions')
        .insert({
          user_id: userId,
          amount: -cost,
          transaction_type: 'purchase',
          description: `Purchased digital card: ${selectedCard?.card_name || 'Card'}`,
          metadata: {
            card_id: selectedCardId,
            card_name: selectedCard?.card_name,
            purchase_type: 'digital_card'
          }
        });

      console.log('[CARD PURCHASE] Manual purchase success', { newBalance });

      // Update local UI balance
      setHeartCoins(newBalance);
      onHeartCoinsChange?.(newBalance);

      // Kick off refreshes from single source of truth
      const refreshes: Promise<any>[] = [];
      try { refreshes.push(refreshProfile()); } catch {}
      try { if (typeof refreshUserCards === 'function') refreshes.push(refreshUserCards()); } catch {}
      // Fire-and-forget binder/public views to re-query if they listen
      try { window.dispatchEvent(new CustomEvent('userCards:refresh')); } catch {}
      try { window.dispatchEvent(new CustomEvent('binder:refresh')); } catch {}

      // Begin refresh before closing modal (avoid closing too early)
      try { await Promise.race([Promise.allSettled(refreshes), new Promise(res => setTimeout(res, 300))]); } catch {}

      // Close confirm and modal state after starting refresh
      setShowCardConfirm(null);
      setCardPurchaseStep('confirm');
      setEnlargedCard(null);

      // Play card-ding sound before celebration
      try { sfx.play('card-ding', 0.8); } catch {}

      // Trigger card celebration, then open binder after celebration ends (3 seconds)
      const cardImage = selectedCard?.artwork_url || selectedCard?.image_url || '';
      const cardName = selectedCard?.card_name || 'Card';
      if (cardImage) {
        triggerCardCelebration(cardImage, cardName);
        // Open binder after celebration ends (3 seconds)
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('openBinderModal')); } catch {}
        }, 3000);
      } else {
        // No image, just open binder immediately
        try { window.dispatchEvent(new CustomEvent('openBinderModal')); } catch {}
      }
    } catch (err: any) {
      console.error('[CARD PURCHASE] Unexpected error', err);
      const message = err?.message || 'Unexpected error during purchase';
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, type: 'error' } })); } catch {}
    } finally {
      // Always reset flags so it can't fail silently
      cardPurchaseInFlightRef.current = false;
      setIsPurchasing(false);
      console.log('[CARD PURCHASE] In-flight reset FALSE');
    }
  };

  // Step 1: Physical card purchase - create order, deduct HeartCoins, get orderId
  // Called when user clicks "CONFIRM" on physical card (before shipping form)
  const handlePhysicalCardConfirm = async () => {
    console.log('[CARD PURCHASE] Physical confirm clicked', {
      card: enlargedCard?.card_name,
      cardId: enlargedCard?.id,
      cost: enlargedCard?.physicalCost || 20,
      heartCoins,
      isPurchasing,
      inFlightRef: cardPurchaseInFlightRef.current,
    });

    const selectedCard = enlargedCard;
    const selectedCardId = selectedCard?.id;

    // Guards
    if (isPurchasing) {
      console.warn('[CARD PURCHASE] GUARD: isPurchasing already true');
      return;
    }
    if (cardPurchaseInFlightRef.current) {
      console.warn('[CARD PURCHASE] GUARD: cardPurchaseInFlightRef already true');
      return;
    }
    if (!profile?.id) {
      console.warn('[CARD PURCHASE] GUARD: missing profile/user');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Please log in to buy cards', type: 'error' } })); } catch {}
      return;
    }
    if (!selectedCardId) {
      console.warn('[CARD PURCHASE] GUARD: missing selectedCardId');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'No card selected', type: 'error' } })); } catch {}
      return;
    }

    // Set in-flight BEFORE any async work
    cardPurchaseInFlightRef.current = true;
    setIsPurchasing(true);
    console.log('[CARD PURCHASE] Physical card in-flight set TRUE');

    try {
      const purchaseUrl = `${basePath}/api/cards/purchase-physical`;
      console.log('[CARD PURCHASE] Calling', purchaseUrl);
      const response = await fetch(purchaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: selectedCardId })
      });

      // Handle 404 specifically - indicates route doesn't exist
      if (response.status === 404) {
        console.error('[CARD PURCHASE] API route not found (404)', purchaseUrl);
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `API route not found: ${purchaseUrl}`, type: 'error' } })); } catch {}
        return;
      }

      const result = await response.json();
      console.log('[CARD PURCHASE] API response:', result);

      // Check for failure: HTTP error OR ok:false in response
      if (!response.ok || result.ok === false) {
        const errorMsg = result.error || `Purchase failed (${response.status})`;
        console.error('[CARD PURCHASE] Physical purchase failed:', errorMsg);
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: errorMsg, type: 'error' } })); } catch {}
        return;
      }

      // Extract order_id - handle array (Supabase RPC result) or string
      const rawOrderId = result?.order_id;

      let extractedOrderId: string | undefined;

      if (Array.isArray(rawOrderId)) {
        const first = rawOrderId[0];
        if (typeof first === 'string') {
          extractedOrderId = first;
        } else if (first && typeof first === 'object') {
          extractedOrderId = first.id || first.order_id;
        }
      } else if (typeof rawOrderId === 'string') {
        extractedOrderId = rawOrderId;
      }

      if (!extractedOrderId) {
        console.error('[CARD PURCHASE] INVALID order_id from purchase result', result);
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Order creation failed - invalid order ID', type: 'error' } })); } catch {}
        return;
      }

      setPendingPhysicalOrderId(extractedOrderId);
      const newBalance = result.new_balance as number | undefined;
      const cost = selectedCard?.physicalCost || 20;
      console.log('[CARD PURCHASE] order_id:', extractedOrderId);
      console.log('[CARD PURCHASE] cost:', cost);
      console.log('[CARD PURCHASE] new_balance:', newBalance);

      // Update local balance
      if (typeof newBalance === 'number') {
        setHeartCoins(newBalance);
        onHeartCoinsChange?.(newBalance);
      }

      // Play success sound
      try { sfx.play('card-ding', 0.8); } catch {}

      // Refresh profile to update HeartCoin balance
      try { await refreshProfile(); } catch {}

      // Create purchaseDraft with orderId for shipping step
      const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      setPurchaseDraft({
        kind: 'card_physical',
        cardId: selectedCardId,
        clientSlug: selectedCard?.card_name || 'card',
        quantity: 1,
        uiCost: typeof cost === 'number' ? cost : (selectedCard?.physicalCost || 0),
        source: 'CARDS',
        itemName: selectedCard?.card_name || 'Physical Card',
        idempotencyKey,
        image: selectedCard?.artwork_url,
        orderId: extractedOrderId  // Store orderId for shipping step
      });

      // Transition to shipping step
      setCardPurchaseStep('shipping');
      console.log('[CARD PURCHASE] Transitioned to shipping step with orderId:', extractedOrderId);

      // Success toast
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Order created! Please provide shipping details.`, type: 'success' } })); } catch {}

    } catch (err: any) {
      console.error('[CARD PURCHASE] Unexpected error:', err);
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: err?.message || 'Unexpected error', type: 'error' } })); } catch {}
    } finally {
      cardPurchaseInFlightRef.current = false;
      setIsPurchasing(false);
      console.log('[CARD PURCHASE] Physical card in-flight reset FALSE');
    }
  };

  // Step 2: Submit shipping for physical card order
  // Called when user clicks "CONFIRM SHIPPING" after order is created
  const handleConfirmCardShipping = async () => {
    console.log('[CARD SHIPPING] Confirm shipping clicked');

    // Must have purchaseDraft with orderId
    if (!purchaseDraft || purchaseDraft.kind !== 'card_physical' || !purchaseDraft.orderId) {
      console.error('[CARD SHIPPING] No purchaseDraft or orderId available');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'No order to update', type: 'error' } })); } catch {}
      return;
    }

    // Validate shipping form
    if (!shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country) {
      console.warn('[CARD SHIPPING] GUARD: missing shipping fields');
      setCardShippingAttempted(true);
      try { sfx.play('scroll', 0.5); } catch {}
      return;
    }

    setShippingStatus('saving');

    console.log('FINAL shipping order_id', pendingPhysicalOrderId, typeof pendingPhysicalOrderId);

    if (!pendingPhysicalOrderId) {
      console.error('[CARD SHIPPING] No pendingPhysicalOrderId');
      setShippingStatus('error');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'No order ID available', type: 'error' } })); } catch {}
      return;
    }

    try {
      const shippingUrl = `${basePath}/api/cards/updateShipping`;
      const response = await fetch(shippingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingPhysicalOrderId,
          full_name: shippingForm.full_name,
          address_line1: shippingForm.address_line1,
          address_line2: shippingForm.address_line2 || null,
          city: shippingForm.city,
          state: shippingForm.state,
          zip: shippingForm.zip,
          country: shippingForm.country || 'United States'
        })
      });

      const result = await response.json();
      console.log('[CARD SHIPPING] API response:', result);

      if (!response.ok || !result.success) {
        console.error('[CARD SHIPPING] Shipping update failed:', result.error);
        setShippingStatus('error');
        try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: result.error || 'Shipping update failed', type: 'error' } })); } catch {}
        return;
      }

      console.log('[CARD SHIPPING] Shipping submitted for order:', pendingPhysicalOrderId);
      setShippingStatus('success');

      // Play success sound
      try { sfx.play('card-ding', 0.8); } catch {}

      // Trigger card celebration
      const cardImage = purchaseDraft.image || enlargedCard?.artwork_url || enlargedCard?.image_url || '';
      const cardName = purchaseDraft.itemName || enlargedCard?.card_name || 'Card';
      if (cardImage) {
        triggerCardCelebration(cardImage, cardName);
      }

      // Success toast
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Shipping submitted! ${purchaseDraft.itemName} is on its way!`, type: 'success' } })); } catch {}

      // Clear state after celebration ends (3 seconds)
      setTimeout(() => {
        setShowCardConfirm(null);
        setCardPurchaseStep('confirm');
        setEnlargedCard(null);
        setPurchaseDraft(null);
        setPendingPhysicalOrderId(null);
        setShippingStatus('idle');
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
      }, 3000);

    } catch (err: any) {
      console.error('[CARD SHIPPING] Unexpected error:', err);
      setShippingStatus('error');
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: err?.message || 'Unexpected error', type: 'error' } })); } catch {}
    }
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
      const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }));
      setPurchaseDraft({
        kind: 'merch',
        merchItemId: merchItem.id,
        clientSlug: merchItem.slug,
        quantity: 1,
        uiCost: merchItem.price_heartcoins,
        source: 'MERCH',
        itemName: merchItem.name,
        idempotencyKey,
        image: merchItem.image_url || '',
      });
      currentIdempotencyKeyRef.current = idempotencyKey;
      handleConfirmPurchase();
    }
  };

  // ============================================================
  // MAIN PURCHASE HANDLER - SINGLE FUNCTION FOR API CALL
  // This is the ONLY place where purchaseWithHeartCoins is called
  // ============================================================
  const handleConfirmPurchase = async (item?: MerchItem) => {
    // Entry log for debugging silent exits
    console.log('[PURCHASE] handleConfirmPurchase ENTER', {
      isPurchasing,
      inFlightRef: purchaseInFlightRef.current,
      itemId: item?.id || null,
      itemName: item?.name || null,
      currentStep: step,
    });

    // If we're in confirm step, just transition to shipping form (no purchase yet)
    if (step === 'confirm') {
      console.log('[PURCHASE] Transitioning to shipping form');

      // Build and set purchaseDraft from the item for the shipping step
      if (item) {
        const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }));

        setPurchaseDraft({
          kind: 'merch',
          merchItemId: item.id,
          clientSlug: item.slug,
          quantity: 1,
          uiCost: item.price_heartcoins,
          source: 'MERCH',
          itemName: item.name,
          idempotencyKey,
          image: item.image_url || '',
        });
        currentIdempotencyKeyRef.current = idempotencyKey;
        setShowHeartCoinPurchase(true);
      }

      setStep('shipping');
      setShippingAttempted(false); // Reset so button starts as "CONFIRM SHIPPING"
      // Close enlarged modal but keep purchaseDraft visible for shipping
      setActiveMerchItem(null);
      setShowEnlargedConfirm(false);
      return;
    }

    // CRITICAL: Synchronous ref check FIRST - prevents double-submit
    if (purchaseInFlightRef.current) {
      console.warn('[PURCHASE] BLOCKED: Purchase already in flight (ref check in handleConfirmPurchase)');
      return;
    }

    // Also check state
    if (isPurchasing) {
      console.warn('[PURCHASE] BLOCKED: isPurchasing state is true');
      return;
    }

    if (!profile) {
      console.error('[PURCHASE] No profile');
      return;
    }

    if (!item && !purchaseDraft) {
      console.error('[PURCHASE] No item or purchaseDraft available');
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

    // Build payload: prefer explicit item, fallback to draft
    let idempotencyKey = currentIdempotencyKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }));
    const chosen = item ? { id: item.id, slug: item.slug, name: item.name } : null;
    const merchItemId = item?.id || purchaseDraft!.merchItemId;
    const quantity = 1;
    const clientSlug = chosen?.slug || purchaseDraft?.clientSlug;
    const itemName = chosen?.name || purchaseDraft?.itemName;
    currentIdempotencyKeyRef.current = idempotencyKey;

    console.log('[PURCHASE] calling API payload', {
      merchItemId,
      quantity,
      idempotencyKey,
      clientSlug,
      itemName,
      userBalance: profile.heartcoin_balance,
    });

    try {
      // ============================================================
      // SINGLE API CALL - purchaseWithHeartCoins has its own ref guard
      // ============================================================
      const purchaseResult = await purchaseWithHeartCoins({ merchItemId, quantity, clientSlug, idempotencyKey });
      console.log('[PURCHASE] API returned', purchaseResult);

      if (purchaseResult && purchaseResult.success) {
        console.log('[PURCHASE] Success, order created:', purchaseResult.order_id);

        setCurrentOrderId(purchaseResult.order_id || null);
        setStep('shipping');
        setShippingAttempted(false); // Reset so button starts as "CONFIRM SHIPPING"

        // Play success sound
        try { sfx.play('card-ding', 0.8); } catch {}

        // Refresh profile to update HeartCoin balance (authoritative from DB)
        await refreshProfile();
        console.log('[PURCHASE] Profile refreshed; new balance from Supabase');

        // Success toast and inventory refresh event
        try {
          const name = itemName || 'item';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Purchased ${name}`, type: 'success' } }));
        } catch {}
        try { window.dispatchEvent(new CustomEvent('inventory:refresh')); } catch {}

        // Close enlarged modal but keep purchaseDraft visible for shipping
        setActiveMerchItem(null);
        setShowEnlargedConfirm(false);
        // Keep purchaseDraft and showHeartCoinPurchase so shipping form displays in same spot
        // setPurchaseDraft(null);  // Don't clear - needed for shipping display
        // setShowHeartCoinPurchase(false);  // Don't clear - keeps the display visible
        currentIdempotencyKeyRef.current = null;

      } else {
        // Error is handled by the hook; show toast and subtle inline message
        console.error('[PURCHASE] Failed:', purchaseError);
        try {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: purchaseError || 'Purchase failed', type: 'error' } }));
        } catch {}
        setCheckInMessage(purchaseError || 'Purchase failed');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
      }
    } catch (err: any) {
      console.error('[PURCHASE] Unexpected error:', err);
      const message = err?.message || 'Purchase failed unexpectedly';
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, type: 'error' } })); } catch {}
      setCheckInMessage(message);
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
    if (!profile?.id) return;

    // Validate shipping form
    if (!shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country) {
      setCheckInMessage("Please fill in all required shipping fields");
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
      return;
    }

    // CRITICAL: Synchronous ref check FIRST - prevents double-submit
    if (purchaseInFlightRef.current) {
      console.warn('[PURCHASE] BLOCKED: Purchase already in flight');
      return;
    }

    // Also check state
    if (isPurchasing || isProcessing) {
      console.warn('[PURCHASE] BLOCKED: isPurchasing or isProcessing state is true');
      return;
    }

    if (!purchaseDraft) {
      console.error('[PURCHASE] No purchaseDraft available');
      return;
    }

    purchaseInFlightRef.current = true;
    setIsPurchasing(true);
    console.log('[SHIPPING] Making purchase with shipping info');

    // Clear any previous errors
    clearError();

    // Build purchase payload
    let idempotencyKey = currentIdempotencyKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }));
    const merchItemId = purchaseDraft.merchItemId;
    const quantity = 1;
    const clientSlug = purchaseDraft.clientSlug;
    const itemName = purchaseDraft.itemName;
    currentIdempotencyKeyRef.current = idempotencyKey;

    try {
      // Step 1: Make the purchase
      console.log('[SHIPPING] Calling purchase API');
      const purchaseResult = await purchaseWithHeartCoins({ merchItemId, quantity, clientSlug, idempotencyKey });
      console.log('[SHIPPING] Purchase API returned', purchaseResult);

      if (!purchaseResult || !purchaseResult.success) {
        console.error('[SHIPPING] Purchase failed:', purchaseError);
        try {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: purchaseError || 'Purchase failed', type: 'error' } }));
        } catch {}
        setCheckInMessage(purchaseError || 'Purchase failed');
        setStatusType('error');
        setTimeout(() => {
          setCheckInMessage("");
          setStatusType('idle');
        }, 3000);
        return;
      }

      const orderId = purchaseResult.order_id;
      console.log('[PURCHASE] orders.id', orderId);
      setCurrentOrderId(orderId);

      // Refresh profile to update HeartCoin balance
      await refreshProfile();

      // Step 2: Update shipping info
      console.log('[SHIPPING] using orders.id', orderId);
      setShippingStatus('saving');
      const updateResult = await updateShipping({
        orderId: orderId,
        shipping_full_name: shippingForm.full_name,
        shipping_address_line1: shippingForm.address_line1,
        shipping_address_line2: shippingForm.address_line2 || undefined,
        shipping_city: shippingForm.city,
        shipping_state: shippingForm.state,
        shipping_zip: shippingForm.zip,
        shipping_country: shippingForm.country || 'United States'
      });

      if (updateResult) {
        console.log('[SHIPPING] Shipping saved for order:', orderId);
        setShippingStatus('success');

        // Play success sound
        try { sfx.play('card-ding', 0.8); } catch {}

        // Success toast
        try {
          const name = itemName || 'item';
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Purchased ${name}!`, type: 'success' } }));
        } catch {}
        try { window.dispatchEvent(new CustomEvent('inventory:refresh')); } catch {}

        // Trigger merch celebration
        try {
          triggerMerchCelebration(purchaseDraft.itemName || 'item', purchaseDraft.image || '');
        } catch {}

        // Show success message
        setCheckInMessage("Shipping info saved successfully.");
        setStatusType('success');

        // Delay cleanup to show success message
        setTimeout(() => {
          // Success behaviour - clear all purchase/shipping state
          setStep('confirm');
          setCurrentOrderId(null);
          setPurchaseDraft(null);
          setShowHeartCoinPurchase(false);
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
          setShippingStatus('idle');
          currentIdempotencyKeyRef.current = null;

          // Close the modal
          setOpen(false);
          setCheckInMessage("");
          setStatusType('idle');
        }, 2000);

      } else {
        // Shipping update failed but purchase succeeded
        console.error('[SHIPPING] Shipping update failed but purchase succeeded');
        setShippingStatus('error');
        setCheckInMessage("Purchase complete, but shipping info failed to save. Please retry.");
        setStatusType('error');
        // Do NOT clear currentOrderId - user needs it for retry
        // Do NOT reset purchaseInFlightRef here - allow retry
      }
    } catch (err: any) {
      console.error('[SHIPPING] Unexpected error:', err);
      const message = err?.message || 'Purchase failed unexpectedly';
      try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, type: 'error' } })); } catch {}
      setCheckInMessage(message);
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
    } finally {
      purchaseInFlightRef.current = false;
      setIsPurchasing(false);
      console.log('[SHIPPING] In-flight ref reset to FALSE');
    }
  };

  const resetPurchaseFlow = () => {
    setStep('confirm');
    setCurrentOrderId(null);
    setShippingStatus('idle');
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

  // Retry shipping function - only retries shipping, does NOT re-run purchase
  const retryShipping = async () => {
    if (!currentOrderId) {
      console.error('[SHIPPING] No order ID for retry');
      return;
    }

    // Validate shipping form
    if (!shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country) {
      setCheckInMessage("Please fill in all required shipping fields");
      setStatusType('error');
      setTimeout(() => {
        setCheckInMessage("");
        setStatusType('idle');
      }, 3000);
      return;
    }

    console.log('[SHIPPING] using orders.id', currentOrderId);
    setShippingStatus('saving');
    clearError();

    try {
      const updateResult = await updateShipping({
        orderId: currentOrderId,
        shipping_full_name: shippingForm.full_name,
        shipping_address_line1: shippingForm.address_line1,
        shipping_address_line2: shippingForm.address_line2 || undefined,
        shipping_city: shippingForm.city,
        shipping_state: shippingForm.state,
        shipping_zip: shippingForm.zip,
        shipping_country: shippingForm.country || 'United States'
      });

      if (updateResult) {
        console.log('[SHIPPING] Shipping saved for order:', currentOrderId);
        setShippingStatus('success');

        // Play success sound
        try { sfx.play('card-ding', 0.8); } catch {}

        // Success message
        setCheckInMessage("Shipping info saved successfully.");
        setStatusType('success');

        // Delay cleanup to show success message
        setTimeout(() => {
          // Clear all purchase/shipping state
          setStep('confirm');
          setCurrentOrderId(null);
          setPurchaseDraft(null);
          setShowHeartCoinPurchase(false);
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
          setShippingStatus('idle');
          currentIdempotencyKeyRef.current = null;

          // Close the modal
          setOpen(false);
          setCheckInMessage("");
          setStatusType('idle');
        }, 2000);

      } else {
        console.error('[SHIPPING] Retry failed');
        setShippingStatus('error');
        setCheckInMessage("Shipping info failed to save. Please retry.");
        setStatusType('error');
      }
    } catch (err: any) {
      console.error('[SHIPPING] Retry error:', err);
      setShippingStatus('error');
      setCheckInMessage(err?.message || "Shipping info failed to save. Please retry.");
      setStatusType('error');
    }
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
      const res = await fetch(`${basePath}/api/redeem-secret-phrase`, {
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
        className="flex items-center gap-1 p-2 rounded-lg transition-all duration-200 h-16 pointer-events-auto relative z-10"
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
          className="fixed inset-0 z-[2147483647] flex items-start justify-center pointer-events-none"
          style={{
            paddingTop: '80px'
          }}
        >
          <div
            className="heartcoin-hologram-container pointer-events-auto"
            style={{
              width: 'min(92vw, 550px)',
              height: '50vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 -8px 25px rgba(255,255,255,0.4), 0 -4px 15px rgba(255,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,255,255,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FFFFFF',
              position: 'relative',
              overflowY: 'auto',
              overflowX: 'clip'
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
              // Clear any active merch selection to prevent stale state
              setActiveMerchItem(null);
              try { onClose?.(); } catch {}
              try { onBeamColorChange?.('off'); } catch {}
            }}
            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
            className="absolute top-2 right-4 text-white hover:text-gray-200 cursor-pointer w-8 h-8 rounded-full border border-white/80 flex items-center justify-center transition-transform duration-200 hover:scale-110"
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
            <span
              className="text-lg font-bold mb-2 cursor-pointer hover:scale-105 transition-transform duration-200 inline-block"
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
            </span>
            
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
            <div className="mb-1 flex-1 min-h-0 flex flex-col gap-0.5 overflow-visible">
              {dailyQuestsLoading ? (
                <div className="text-center text-white py-4">Loading daily quests...</div>
              ) : dailyQuestItems.length === 0 ? (
                <div className="text-center text-white/60 py-4">No daily quests available</div>
              ) : (
                dailyQuestItems.map((quest, index) => (
                  <div key={quest.id} className="flex flex-col px-2 pt-0.5 pb-1 rounded border border-white/30 bg-white/10 flex-1 relative overflow-visible">
                    <div className="absolute top-1 right-1 flex items-center" style={{
                      color: isQuestCompleted(quest) ? '#666' : '#90EE90',
                      textShadow: isQuestCompleted(quest) ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90'
                    }}>
                      {quest.quest_key === 'TAP_ELEMENT_OF_DAY' ? (
                        <>
                          <span className="text-base font-bold">+</span>
                          <img
                            src="/elements/relics.webp"
                            alt="Relic"
                            className="w-10 h-10 ml-1"
                            style={{
                              filter: isQuestCompleted(quest)
                                ? 'grayscale(0.6) brightness(0.5)'
                                : 'drop-shadow(0 0 8px yellow) drop-shadow(0 0 16px yellow)',
                              opacity: isQuestCompleted(quest) ? 0.5 : 1,
                              transition: 'filter 0.3s ease, opacity 0.3s ease'
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-base font-bold">+{quest.reward_heartcoins || 1}</span>
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-10 h-10 ml-1" />
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-10">
                        <div className="text-base font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                          {quest.quest_key === 'TAP_ELEMENT_OF_DAY' ? (
                            <>
                              <img
                                src="/elements/elementals.webp"
                                alt=""
                                className="w-8 h-8"
                                style={{ filter: 'drop-shadow(0 0 8px cyan) drop-shadow(0 0 16px cyan)' }}
                              />
                              Element of the Day
                            </>
                          ) : quest.quest_key === 'LISTEN_SONG_OF_DAY' ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div
                                    className="absolute inset-0 rounded-full animate-pulse"
                                    style={{
                                      background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, transparent 70%)',
                                      transform: 'scale(1.6)',
                                      filter: 'blur(4px)'
                                    }}
                                  />
                                  <img
                                    src="/elements/music.webp"
                                    alt=""
                                    className="w-10 h-10 relative"
                                  />
                                </div>
                                Song of the Day
                              </div>
                              {songOfDayTitle && (
                                <div className="text-sm font-normal ml-10" style={{
                                  color: elementOfDay === 'heart' ? '#FF69B4'
                                    : elementOfDay === 'lightning' ? '#FFD700'
                                    : elementOfDay === 'water' ? '#1E90FF'
                                    : elementOfDay === 'darkness' ? '#8B0082'
                                    : '#FFFFFF',
                                  textShadow: elementOfDay === 'heart' ? '0 0 8px #FF69B4'
                                    : elementOfDay === 'lightning' ? '0 0 8px #FFD700'
                                    : elementOfDay === 'water' ? '0 0 8px #1E90FF'
                                    : elementOfDay === 'darkness' ? '0 0 8px #8B0082'
                                    : '0 0 8px #FFFFFF'
                                }}>
                                  {songOfDayTitle}
                                </div>
                              )}
                            </div>
                          ) : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY' ? (
                            <>
                              <div className="relative">
                                <div
                                  className="absolute inset-0 rounded-full animate-pulse"
                                  style={{
                                    background: 'radial-gradient(circle, rgba(255,255,0,1) 0%, rgba(255,255,0,0.6) 40%, transparent 70%)',
                                    transform: 'scale(1.6)',
                                    filter: 'blur(4px)'
                                  }}
                                />
                                <img
                                  src="/elements/journal.webp"
                                  alt=""
                                  className="w-10 h-10 relative"
                                />
                              </div>
                              Journal Entry of the Day
                            </>
                          ) : (
                            <>{index + 1}. {quest.title}</>
                          )}
                        </div>
                        <div className="text-sm" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                          {quest.quest_key === 'TAP_ELEMENT_OF_DAY'
                            ? 'Unlock a surprise reward such as boosts, relics, or a binder slot.'
                            : quest.description}
                        </div>
                      </div>
                    </div>
                    {/* Special rendering for TAP_ELEMENT_OF_DAY */}
                    {quest.quest_key === 'TAP_ELEMENT_OF_DAY' && (
                      <div className="mt-2 mb-0 flex flex-col items-center overflow-visible">
                        {!isLoggedIn ? (
                          <button
                            onClick={() => {
                              try { sfx.play('click', 0.8); } catch {}
                              // Close heart coin display first
                              setOpen(false);
                              onClose?.();
                              window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                              // Then open WELCOME HOME modal
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                              }, 150);
                            }}
                            className="text-center py-3 px-4 rounded-lg border border-[#4ECDC4]/40 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              background: 'rgba(78,205,196,0.1)',
                              color: '#4ECDC4',
                              textShadow: '0 0 8px rgba(78,205,196,0.5)'
                            }}
                          >
                            <span className="text-sm font-bold">Log in to complete</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isQuestCompleted(quest)}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              // Guard: if already completed, don't process again
                              if (isQuestCompleted(quest)) {
                                console.log('[HeartCoinButton] Quest already completed, skipping');
                                return;
                              }

                              const targetElement = elementOfDay || 'heart';
                              console.log('[HeartCoinButton] Element image clicked for quest:', quest.id);
                              try { sfx.play('click', 0.8); } catch {}

                              // ========== ELEMENT OF THE DAY: TRIGGER WARP THEN OPEN MODAL ==========
                              // Quest completion happens in the ElementOfDay modal, not here
                              if (quest.id === ELEMENT_OF_DAY_BONUS_QUEST_ID) {
                                console.log('[HeartCoinButton] Element of Day quest - triggering warp then opening modal');
                                // Close the HeartCoin popup first
                                setOpen(false);
                                try { onClose?.(); } catch {}

                                // Dispatch planet:warp event to trigger warp visual effect
                                setTimeout(() => {
                                  console.log('[HeartCoinButton] Dispatching planet:warp event for element:', targetElement);
                                  window.dispatchEvent(new CustomEvent('planet:warp', {
                                    detail: {
                                      element: targetElement,
                                      isDailyElement: true,
                                      isCenterPlanet: false
                                    }
                                  }));

                                  // After warp effect completes (~3500ms), show element of day modal
                                  const WARP_DURATION_MS = 3500;
                                  setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('elementOfDay:open'));
                                  }, WARP_DURATION_MS);
                                }, 150); // Let popup close first

                                return; // Don't complete quest here - it will be completed in the ElementOfDay modal
                              }

                              // ========== VISUAL EFFECTS ==========
                              // Close the popup first - call onClose to notify parent
                              setOpen(false);
                              try { onClose?.(); } catch {}
                              // Also dispatch event to close any HeartCoin modals
                              window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                              // Delay to let heart coin display close before warp
                              setTimeout(() => {
                                // Dispatch planet:warp event FIRST to trigger warp animation
                                console.log('[HeartCoinButton] Dispatching planet:warp event');
                                window.dispatchEvent(new CustomEvent('planet:warp', {
                                  detail: { element: targetElement }
                                }));
                                // After warp effect, open the 3D planet view
                                setTimeout(() => {
                                  if (onOpenBlueDisplay) {
                                    console.log('[HeartCoinButton] Calling onOpenBlueDisplay');
                                    onOpenBlueDisplay();
                                  } else {
                                    window.dispatchEvent(new CustomEvent('open-blue-display'));
                                  }
                                  // After blue display opens, show Element of the Day modal
                                  setTimeout(() => {
                                    console.log('[HeartCoinButton] Showing Element of the Day modal');
                                    window.dispatchEvent(new CustomEvent('element-of-day:show', {
                                      detail: { element: targetElement }
                                    }));
                                  }, 1500); // Wait for blue display to fully open
                                }, 3000); // Wait for warp animation to complete
                              }, 150); // Let heart coin display close first
                            }}
                            className={`flex items-center transition-transform overflow-visible ${isQuestCompleted(quest) ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                            onMouseEnter={() => { if (!isQuestCompleted(quest)) { try { sfx.play('hover', 0.5); } catch {} } }}
                            style={{ pointerEvents: isQuestCompleted(quest) ? 'none' : 'auto', zIndex: 10, overflow: 'visible' }}
                          >
                            <div className="relative overflow-visible" style={{ overflow: 'visible' }}>
                              {/* Glow background */}
                              {!isQuestCompleted(quest) && (
                                <div
                                  className="absolute inset-0 rounded-full animate-pulse"
                                  style={{
                                    background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.3) 40%, transparent 70%)',
                                    transform: 'scale(1.8)',
                                    filter: 'blur(8px)'
                                  }}
                                />
                              )}
                              <img
                                src={getElementIcon(elementOfDay || 'heart')}
                                alt={`${elementOfDay || 'heart'} element`}
                                className="w-12 h-12 rounded-full object-cover relative"
                                style={{
                                  filter: isQuestCompleted(quest) ? 'grayscale(0.6) brightness(0.5)' : 'none',
                                  opacity: isQuestCompleted(quest) ? 0.5 : 1,
                                  transition: 'filter 0.3s ease, opacity 0.3s ease'
                                }}
                              />
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                    {/* Button for other quests */}
                    {quest.quest_key !== 'TAP_ELEMENT_OF_DAY' && (
                      <div className="mt-2 flex justify-center">
                        <button
                          onClick={() => {
                            // If not logged in, close heart coin display and open WELCOME HOME modal
                            if (!isLoggedIn) {
                              try { sfx.play('click', 0.8); } catch {}
                              // Close heart coin display first
                              setOpen(false);
                              onClose?.();
                              window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                              // Then open WELCOME HOME modal
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                              }, 150);
                              return;
                            }
                            if (quest.quest_key === 'JOURNAL_ENTRY_OF_DAY') {
                              handleJournalEntry();
                            } else if (quest.quest_key === 'LISTEN_SONG_OF_DAY') {
                              console.log('[LISTEN BUTTON] Clicked! songOfDaySlug:', songOfDaySlug);
                              try { sfx.play('click', 0.6); } catch {}

                              // Close the HeartCoin popup first (notify parent to close)
                              onClose?.();
                              // Close the HeartCoin modal
                              setOpen(false);
                              window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                              // Warp to the song of the day with full visual warp effect
                              // Song will play AFTER warp completes via pendingTrackPlay mechanism
                              if (songOfDaySlug) {
                                console.log('[LISTEN BUTTON] Dispatching song:warp-request with slug:', songOfDaySlug);
                                setTimeout(() => {
                                  // Dispatch song:warp-request to trigger warp sequence (camera + visual effect)
                                  // Song plays after warp completes via pendingTrackPlay in onSongChange
                                  window.dispatchEvent(new CustomEvent('song:warp-request', {
                                    detail: { songSlug: songOfDaySlug, source: 'daily-quest', autoPlay: false }
                                  }));
                                  console.log('[LISTEN BUTTON] Warp request dispatched!');
                                }, 300);
                              } else {
                                console.log('[LISTEN BUTTON] ERROR: songOfDaySlug is null/undefined');
                              }
                            }
                          }}
                          disabled={isLoggedIn && isQuestCompleted(quest)}
                          onMouseEnter={() => { try { sfx.play('hover', 0.5); } catch {} }}
                          className="px-5 py-2 text-xs rounded border font-bold transition-all duration-200 pointer-events-auto relative z-10 min-w-[140px] hover:scale-105"
                          style={(() => {
                            // Get element color for LISTEN_SONG_OF_DAY button
                            const songElementColor = quest.quest_key === 'LISTEN_SONG_OF_DAY' && elementOfDay
                              ? ELEMENT_COLORS[elementOfDay as Element] || '#4ECDC4'
                              : '#4ECDC4';
                            // Convert hex to rgba for background
                            const hexToRgba = (hex: string, alpha: number) => {
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              return `rgba(${r},${g},${b},${alpha})`;
                            };
                            return {
                              background: !isLoggedIn
                                ? 'rgba(78,205,196,0.2)'
                                : isQuestCompleted(quest)
                                  ? 'rgba(0,255,0,0.1)'
                                  : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                    ? 'rgba(255,255,0,0.15)'
                                    : 'rgba(255,255,255,0.15)',
                              color: !isLoggedIn
                                ? '#4ECDC4'
                                : isQuestCompleted(quest)
                                  ? '#00FF00'
                                  : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                    ? '#FFFF00'
                                    : '#FFFFFF',
                              borderColor: !isLoggedIn
                                ? '#4ECDC4'
                                : isQuestCompleted(quest)
                                  ? '#00FF00'
                                  : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                    ? '#FFFF00'
                                    : '#FFFFFF',
                              textShadow: !isLoggedIn
                                ? '0 0 8px rgba(78,205,196,0.5)'
                                : isQuestCompleted(quest)
                                  ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                                  : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                    ? '0 0 8px rgba(255,255,0,0.5)'
                                    : '0 0 8px rgba(255,255,255,0.5)',
                              boxShadow: !isLoggedIn
                                ? 'none'
                                : isQuestCompleted(quest)
                                  ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)'
                                  : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                    ? '0 0 10px rgba(255,255,0,0.3)'
                                    : 'none'
                            };
                          })()}
                        >
                          {!isLoggedIn
                            ? 'Log in to complete'
                            : isQuestCompleted(quest)
                              ? (quest.quest_key === 'JOURNAL_ENTRY_OF_DAY' ? 'REFLECTED' : 'COMPLETED')
                              : quest.quest_key === 'JOURNAL_ENTRY_OF_DAY'
                                ? 'REFLECT'
                                : quest.quest_key === 'LISTEN_SONG_OF_DAY'
                                  ? 'LISTEN'
                                  : 'COMPLETE'
                          }
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Bonus Quests Tab Content */}
          {activeEarnTab === 'BONUS QUESTS' && (
            <div>
              {questsStatus === 'loading' ? (
                <div className="text-center text-white py-4">Loading bonus quests...</div>
              ) : questsStatus === 'error' ? (
                <div className="text-center text-red-400/70 py-4 text-sm">
                  Unable to load bonus quests
                </div>
              ) : bonusQuestItems.length === 0 ? (
                <div className="text-center text-white/60 py-4">No bonus quests available</div>
              ) : (
                bonusQuestItems.map((quest, index) => (
                  <div key={quest.id} className={`flex flex-col px-2 py-1 rounded border border-white/30 bg-white/10 relative ${index < bonusQuestItems.length - 1 ? 'mb-0.5' : ''}`}>
                    {/* HeartCoin reward - top right */}
                    <div className="absolute top-1 right-1">
                      {quest.quest_key === 'LISTEN_ELEMENT_SONG' ? (
                        <div className="flex items-center" style={{
                          color: isQuestCompleted(quest) ? '#666' : '#90EE90',
                          textShadow: isQuestCompleted(quest) ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90'
                        }}>
                          <span className="text-base font-bold">+</span>
                          <img
                            src={`/cards/${(profile?.element || 'HEART').toUpperCase()}.webp`}
                            alt="Element Card"
                            className="w-10 h-10 ml-0.5 object-contain"
                            style={{ filter: 'drop-shadow(0 0 4px white)' }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center" style={{
                          color: (isQuestCompleted(quest) && quest.quest_key !== 'INVITE_FRIEND') ? '#666' : '#90EE90',
                          textShadow: (isQuestCompleted(quest) && quest.quest_key !== 'INVITE_FRIEND') ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90'
                        }}>
                          <span className="text-base font-bold">
                            {quest.quest_key === 'INVITE_FRIEND'
                              ? 'Daily +1'
                              : (quest.reward_notes || `+${quest.reward_heartcoins}`)}
                          </span>
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-10 h-10 ml-1" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-10">
                        {quest.quest_key === 'ATTEND_LIVESTREAM' && showAutoTextBox ? (
                          phraseValidationResult ? (
                            <div className="text-xs font-bold flex items-center h-8" style={{
                              color: (phraseValidationResult === 'correct' || phraseValidationResult === 'already') ? '#00FF00' : '#FF69B4',
                              textShadow: (phraseValidationResult === 'correct' || phraseValidationResult === 'already') ? '0 0 8px #00FF00, 0 0 16px #00FF00' : '0 0 8px #FF69B4'
                            }}>
                              {phraseValidationResult === 'correct' ? 'PASSWORD ACCEPTED' : phraseValidationResult === 'already' ? 'CHECKED IN' : 'INCORRECT'}
                            </div>
                          ) : (
                            <textarea
                              value={autoTextValue}
                              onChange={(e) => setAutoTextValue(e.target.value)}
                              placeholder="ENTER PASSWORD"
                              className="w-full h-8 px-2 py-1 text-xs rounded border bg-black/20 text-white placeholder-white/60 border-white/30 focus:border-white/60 focus:outline-none resize-none"
                              autoFocus
                              style={{ maxWidth: '200px' }}
                              disabled={isRedeemingPhrase || phraseStatus === 'success' || phraseStatus === 'already'}
                            />
                          )
                        ) : (
                          <>
                            <div className="text-base font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                              {quest.quest_key === 'ATTEND_LIVESTREAM' ? (
                                <>
                                  <div className="relative">
                                    <div
                                      className="absolute inset-0 rounded-full animate-pulse"
                                      style={{
                                        background: 'radial-gradient(circle, rgba(255,0,255,1) 0%, rgba(255,0,255,0.6) 40%, transparent 70%)',
                                        transform: 'scale(1.6)',
                                        filter: 'blur(4px)'
                                      }}
                                    />
                                    <img src="/elements/antennas.webp" alt="" className="w-10 h-10 relative" />
                                  </div>
                                  {quest.title}
                                </>
                              ) : quest.quest_key === 'INVITE_FRIEND' ? (
                                <>
                                  <div className="relative">
                                    <div
                                      className="absolute inset-0 rounded-full animate-pulse"
                                      style={{
                                        background: 'radial-gradient(circle, rgba(78,205,196,1) 0%, rgba(78,205,196,0.6) 40%, transparent 70%)',
                                        transform: 'scale(1.6)',
                                        filter: 'blur(4px)'
                                      }}
                                    />
                                    <img src="/elements/merch.webp" alt="" className="w-10 h-10 relative" />
                                  </div>
                                  Invite an Alien
                                </>
                              ) : quest.quest_key === 'LISTEN_ELEMENT_SONG' ? (
                                <>
                                  <div className="relative">
                                    <div
                                      className="absolute inset-0 rounded-full animate-pulse"
                                      style={{
                                        background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, transparent 70%)',
                                        transform: 'scale(1.6)',
                                        filter: 'blur(4px)'
                                      }}
                                    />
                                    <img
                                      src={getElementIcon(profile?.element || 'heart')}
                                      alt=""
                                      className="w-10 h-10 rounded-full object-cover relative"
                                    />
                                  </div>
                                  {quest.title}
                                </>
                              ) : (
                                <>{index + 1}. {quest.title}</>
                              )}
                            </div>
                            <div className="text-sm" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                              {quest.quest_key === 'INVITE_FRIEND'
                                ? 'Invite a friend into the Heartverse. Share the signal.'
                                : quest.description}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-0.5 flex justify-center">
                      <button
                        onClick={() => {
                          // Play click sound for all button interactions
                          try { sfx.play('click', 0.6); } catch {}

                          // If not logged in, close popout and open welcome home modal for login
                          if (!isLoggedIn) {
                            setOpen(false);
                            onClose?.();
                            try { onBeamColorChange?.('cyan'); } catch {}
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                            }, 150);
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
                                // Redeem the secret phrase via RPC (prevent duplicates and map errors)
                                if (isRedeemingPhrase) return;
                                setIsRedeemingPhrase(true);
                                setSecretPhraseLoading(true);
                                (async () => {
                                  // Normalize phrase: trim, collapse spaces, lowercase
                                  const inputPhrase = autoTextValue.trim().replace(/\s+/g, ' ').toLowerCase();
                                  try {
                                    const { data, error } = await supabaseBrowser.rpc('redeem_daily_secret_phrase', { input_phrase: inputPhrase });
                                    if (error) {
                                      const status = (error as any)?.status ?? (error as any)?.statusCode;
                                      const code = (error as any)?.code;
                                      console.error('Secret phrase RPC error:', {
                                        status,
                                        message: (error as any)?.message,
                                        details: (error as any)?.details,
                                        hint: (error as any)?.hint,
                                        code,
                                      });

                                      if (code === 'P0003' || status === 409 || code === '23505') {
                                        setPhraseStatus('already');
                                        setPhraseValidationResult('already');
                                        try { sfx.play('click', 0.7); } catch {}
                                        setCheckInMessage('Already checked in!');
                                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Already checked in!', type: 'success' } })); } catch {}
                                        setStatusType('success');
                                      } else if (code === 'P0002') {
                                        setPhraseStatus('incorrect');
                                        setPhraseValidationResult('incorrect');
                                        try { sfx.play('change-channel', 0.6); } catch {}
                                        setCheckInMessage('Incorrect secret phrase for today.');
                                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Incorrect secret phrase for today.', type: 'error' } })); } catch {}
                                        setStatusType('error');
                                      } else if (code === 'P0001') {
                                        setPhraseStatus('error');
                                        setPhraseValidationResult('incorrect');
                                        setCheckInMessage('Log in to redeem.');
                                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Log in to redeem.', type: 'error' } })); } catch {}
                                        // Prompt login modal
                                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openWelcomeHomeModal')); } catch {}
                                        setStatusType('error');
                                      } else {
                                        setPhraseStatus('error');
                                        setPhraseValidationResult('incorrect');
                                        try { sfx.play('change-channel', 0.6); } catch {}
                                        setCheckInMessage('Something went wrong. Try again.');
                                        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Something went wrong. Try again.', type: 'error' } })); } catch {}
                                        setStatusType('error');
                                      }
                                      return;
                                    }

                                    const row = Array.isArray(data) ? data[0] : data;
                                    const reward = row?.granted_amount || row?.reward || 0;
                                    setPhraseStatus('success');
                                    setPhraseValidationResult('correct');
                                    setAutoTextValue('');
                                    try { sfx.play('click', 0.7); } catch {}
                                    // Trigger HeartCoin celebration with the reward amount
                                    if (reward > 0) {
                                      triggerHeartCoinCelebration(reward);
                                    }
                                    setCheckInMessage(`Secret phrase accepted! +${reward} HeartCoins`);
                                    setStatusType('success');
                                    setShowCheckInSuccess(true);
                                    // dev-only debug
                                    try {
                                      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
                                        console.debug('[secret-phrase]', { ok: true, day: row?.active_date ?? (row as any)?.day ?? null, reward });
                                      }
                                    } catch {}
                                    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: `Redeemed +${reward} HeartCoins`, type: 'success' } })); } catch {}
                                    await refreshProfile();
                                    await refetchQuests();
                                  } catch (error: any) {
                                    console.error('Error redeeming ATTEND_LIVESTREAM phrase:', {
                                      message: error?.message,
                                      details: error?.details,
                                      hint: error?.hint,
                                      code: error?.code,
                                    });
                                    setPhraseStatus('error');
                                    setPhraseValidationResult('incorrect');
                                    setCheckInMessage('Something went wrong. Try again.');
                                    setStatusType('error');
                                  } finally {
                                    setIsRedeemingPhrase(false);
                                    setSecretPhraseLoading(false);
                                    setTimeout(() => {
                                      setShowCheckInSuccess(false);
                                      setCheckInMessage("");
                                      setStatusType('idle');
                                      // Reset back to default state (show title/description)
                                      setShowAutoTextBox(false);
                                      setAutoTextValue("");
                                      setAttendLivestreamConfirming(false);
                                      setPhraseValidationResult(null);
                                      setPhraseStatus('idle');
                                    }, 3000);
                                  }
                                })();
                              }
                            } else {
                              // First click - show the secret phrase input
                              setShowAutoTextBox(true);
                              setAutoTextValue("");
                              setAttendLivestreamConfirming(true);
                              setPhraseValidationResult(null);
                              setPhraseStatus('idle');
                            }
                          } else if (quest.quest_key === 'SECRET_PHRASE') {
                            if (secretPhraseInputVisible === quest.id) {
                              handleSecretPhraseQuest(quest);
                            } else {
                              setSecretPhraseInputVisible(quest.id);
                              setSecretPhraseValue('');
                            }
                          } else if (quest.quest_key === 'LISTEN_ELEMENT_SONG') {
                            // RETURN HOME: Close panel and warp to user's element planet
                            const userElement = profile?.element?.toLowerCase() || 'heart';
                            const userId = profile?.id;

                            // Element audio file paths
                            const elementAudioPaths: Record<string, string> = {
                              darkness: '/tracks/darkness.MP3',
                              heart: '/tracks/heart.MP3',
                              lightning: '/tracks/LIGHTNING.MP3',
                              water: '/tracks/WATER.MP3',
                              center: '/tracks/center.MP3'
                            };
                            const audioPath = elementAudioPaths[userElement] || `/tracks/${userElement}.MP3`;

                            // Play channel change sound before warp
                            try { sfx.play('change-channel', 0.7); } catch {}

                            // Close the heart coin popup
                            setOpen(false);
                            try { onClose?.(); } catch {}

                            // Grant the user their element's digital card (like a free purchase)
                            const grantElementCard = async () => {
                              if (!userId) return;
                              try {
                                // Find the element card in the cards table
                                // Look for a card matching the user's element (prioritize digital cards)
                                const { data: elementCard, error: cardError } = await supabaseBrowser
                                  .from('cards')
                                  .select('id, card_name')
                                  .ilike('element', userElement)
                                  .order('is_digital', { ascending: false, nullsFirst: false })
                                  .limit(1)
                                  .maybeSingle();

                                if (cardError) {
                                  console.error('[RETURN HOME] Error finding element card:', cardError);
                                  return;
                                }

                                if (!elementCard) {
                                  console.warn('[RETURN HOME] No element card found for:', userElement);
                                  return;
                                }

                                // Grant the card to the user (upsert to avoid duplicates)
                                const { error: grantError } = await supabaseBrowser
                                  .from('user_cards')
                                  .upsert(
                                    { user_id: userId, card_id: elementCard.id, source: 'element_journey' },
                                    { onConflict: 'user_id,card_id', ignoreDuplicates: true }
                                  );

                                if (grantError) {
                                  console.error('[RETURN HOME] Error granting element card:', grantError);
                                } else {
                                  console.log('[RETURN HOME] Granted element card:', elementCard.card_name);
                                }
                              } catch (err) {
                                console.error('[RETURN HOME] Error in grantElementCard:', err);
                              }
                            };

                            // Wait for sound to play, then trigger warp (blue display opens after warp)
                            setTimeout(() => {
                              // Dispatch planet:warp event to trigger warp effect
                              window.dispatchEvent(new CustomEvent('planet:warp', {
                                detail: {
                                  element: userElement,
                                  isDailyElement: false,
                                  isCenterPlanet: userElement === 'center',
                                  audioPath: audioPath
                                }
                              }));

                              // After warp effect completes (~3500ms), open blue display and grant card
                              setTimeout(async () => {
                                try { onOpenBlueDisplay?.(); } catch {}

                                // Grant the element card when arriving at the planet
                                await grantElementCard();

                                // Then trigger element card celebration after blue display opens
                                setTimeout(() => {
                                  setElementSongReturned(true);
                                  const userName = profile?.name || undefined;
                                  triggerElementCardCelebration(userElement, userName, () => {
                                    // Open binder after celebration ends
                                    window.dispatchEvent(new CustomEvent('openBinderModal'));
                                  });
                                }, 500); // Small delay after blue display opens
                              }, 3500); // Wait for warp effect to complete
                            }, 300); // Wait for channel change sound
                          } else {
                            handleBonusQuestComplete(quest);
                          }
                        }}
                        onMouseEnter={(e) => {
                          try { sfx.play('hover', 0.3); } catch {}
                          if (!isLoggedIn) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(78,205,196,0.8), 0 0 40px rgba(78,205,196,0.4)';
                            e.currentTarget.style.textShadow = '0 0 10px #4ECDC4, 0 0 20px #4ECDC4';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoggedIn) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.textShadow = '0 0 8px rgba(78,205,196,0.5)';
                          }
                        }}
                        disabled={
                          isLoggedIn && (
                            processingQuestId === quest.id ||
                            (!quest.can_complete && !inviteFriendShared && quest.quest_key !== 'LISTEN_ELEMENT_SONG') ||
                            (isQuestCompleted(quest) && quest.quest_key !== 'LISTEN_ELEMENT_SONG') ||
                            (quest.quest_key === 'SECRET_PHRASE' && secretPhraseLoading) ||
                            (quest.quest_key === 'ATTEND_LIVESTREAM' && (secretPhraseLoading || isRedeemingPhrase || phraseStatus === 'success' || phraseStatus === 'already'))
                          )
                        }
                        className="px-4 py-1 text-xs rounded border font-bold transition-all duration-200 min-w-[120px] hover:scale-105"
                        style={{
                          background: !isLoggedIn
                            ? 'rgba(78,205,196,0.2)'
                            : (isQuestCompleted(quest) && quest.quest_key !== 'LISTEN_ELEMENT_SONG') || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? 'rgba(0,255,0,0.2)'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? 'rgba(0,255,0,0.2)'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? 'rgba(0,0,0,0.3)'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                  ? 'rgba(0,0,0,0.3)'
                                  : quest.quest_key === 'LISTEN_ELEMENT_SONG'
                                    ? `rgba(${parseInt(ELEMENT_COLORS[(profile?.element?.toLowerCase() || 'heart') as Element]?.slice(1,3), 16)},${parseInt(ELEMENT_COLORS[(profile?.element?.toLowerCase() || 'heart') as Element]?.slice(3,5), 16)},${parseInt(ELEMENT_COLORS[(profile?.element?.toLowerCase() || 'heart') as Element]?.slice(5,7), 16)},0.15)`
                                    : quest.can_complete
                                      ? 'rgba(255,255,255,0.1)'
                                      : 'rgba(100,100,100,0.3)',
                          color: !isLoggedIn
                            ? '#4ECDC4'
                            : (isQuestCompleted(quest) && quest.quest_key !== 'LISTEN_ELEMENT_SONG') || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? '#00FF00'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? '#00FF00'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? '#F2EF1D'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || phraseValidationResult === 'already')
                                  ? '#00FF00'
                                  : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                    ? '#F2EF1D'
                                    : quest.quest_key === 'ATTEND_LIVESTREAM'
                                      ? '#FF69B4'
                                      : quest.quest_key === 'LISTEN_ELEMENT_SONG'
                                        ? ELEMENT_COLORS[(profile?.element?.toLowerCase() || 'heart') as Element]
                                        : quest.quest_key === 'INVITE_FRIEND'
                                          ? '#00FFFF'
                                          : quest.can_complete
                                            ? '#FFFFFF'
                                            : '#666',
                          borderColor: !isLoggedIn
                            ? '#4ECDC4'
                            : (isQuestCompleted(quest) && quest.quest_key !== 'LISTEN_ELEMENT_SONG') || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? '#00FF00'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? '#00FF00'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? '#F2EF1D'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || phraseValidationResult === 'already')
                                  ? '#00FF00'
                                  : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                    ? '#F2EF1D'
                                    : quest.quest_key === 'ATTEND_LIVESTREAM'
                                      ? '#FF69B4'
                                      : quest.quest_key === 'LISTEN_ELEMENT_SONG'
                                        ? ELEMENT_COLORS[(profile?.element?.toLowerCase() || 'heart') as Element]
                                        : quest.quest_key === 'INVITE_FRIEND'
                                          ? '#00FFFF'
                                          : quest.can_complete
                                            ? 'rgba(255,255,255,0.6)'
                                            : 'rgba(100,100,100,0.6)',
                          borderWidth: isQuestCompleted(quest) || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? '2px'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? '2px'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? '2px'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || phraseValidationResult === 'already' || attendLivestreamConfirming)
                                  ? '2px'
                                  : '1px',
                          textShadow: !isLoggedIn
                            ? '0 0 8px rgba(78,205,196,0.5)'
                            : isQuestCompleted(quest) || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? '0 0 10px #F2EF1D'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || phraseValidationResult === 'already')
                                  ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                                  : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                    ? '0 0 10px #F2EF1D'
                                    : quest.quest_key === 'ATTEND_LIVESTREAM'
                                      ? '0 0 10px #FF69B4'
                                      : quest.quest_key === 'INVITE_FRIEND'
                                        ? '0 0 10px #00FFFF'
                                        : 'none',
                          boxShadow: !isLoggedIn
                            ? 'none'
                            : isQuestCompleted(quest) || (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete)
                            ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                            : quest.quest_key === 'LISTEN_ELEMENT_SONG' && elementSongReturned
                              ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                              : quest.quest_key === 'INVITE_FRIEND' && inviteFriendShared
                                ? '0 0 20px rgba(242,239,29,0.8), inset 0 0 10px rgba(242,239,29,0.2)'
                                : quest.quest_key === 'ATTEND_LIVESTREAM' && (phraseValidationResult === 'correct' || phraseValidationResult === 'already')
                                  ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                                  : quest.quest_key === 'ATTEND_LIVESTREAM' && attendLivestreamConfirming
                                    ? '0 0 20px rgba(242,239,29,0.8), inset 0 0 10px rgba(242,239,29,0.2)'
                                    : 'none',
                          cursor: !isLoggedIn ? 'pointer' : 'default'
                        }}
                      >
                        {!isLoggedIn
                          ? 'Log in to complete'
                          : quest.quest_key === 'ATTEND_LIVESTREAM' && isQuestCompleted(quest)
                            ? 'CHECKED IN'
                            : quest.quest_key === 'INVITE_FRIEND' && (isQuestCompleted(quest) || !quest.can_complete)
                              ? 'SIGNAL SENT'
                              : isQuestCompleted(quest)
                                ? 'COMPLETED'
                                : quest.quest_key === 'ATTEND_LIVESTREAM'
                                ? (phraseStatus === 'already'
                                    ? 'CHECKED IN'
                                    : phraseStatus === 'success'
                                      ? 'PASSWORD ACCEPTED'
                                      : (attendLivestreamConfirming ? 'CONFIRM' : 'CHECK IN'))
                                : quest.quest_key === 'INVITE_FRIEND'
                                  ? (inviteFriendShared ? 'CONFIRM' : 'SEND SIGNAL')
                                  : quest.quest_key === 'SECRET_PHRASE'
                                    ? (secretPhraseInputVisible === quest.id
                                        ? (secretPhraseLoading ? 'SUBMITTING...' : 'SUBMIT')
                                        : 'ENTER PHRASE')
                                  : quest.quest_key === 'LISTEN_ELEMENT_SONG'
                                    ? (elementSongReturned ? 'RETURNED' : 'RETURN HOME')
                                    : 'COMPLETE'}
                      </button>
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !secretPhraseLoading) {
                              e.preventDefault();
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
                    <div className={`px-2 ${step === 'shipping' ? 'pb-2' : 'pb-20'}`}>
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
                              
                              {/* Item Title + Image OR User/Cost Display OR Shipping Form */}
                              {/* Use purchaseDraft as source of truth for showing purchase mode */}
                              {purchaseDraft && showHeartCoinPurchase ? (
                                /* Container for purchase/shipping flow */
                                <div className="flex flex-col items-center h-full w-full max-w-xs">
                                  {/* Item Title - at very top */}
                                  <div className="text-white/70 text-sm mb-2" style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}>
                                    {purchaseDraft?.itemName?.toUpperCase()}
                                  </div>

                                  {/* Conditional: Show User/Cost when confirming, or Shipping Form when step is shipping */}
                                  {step === 'shipping' ? (
                                    /* Shipping Form - replaces User/Cost display */
                                    <div className="flex flex-col items-center w-full px-2">
                                      <div className="space-y-2 w-full">
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
                                            placeholder="Country"
                                            value={shippingForm.country}
                                            onChange={(e) => setShippingForm({...shippingForm, country: e.target.value})}
                                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                                          />
                                        </div>

                                        {/* CONFIRM SHIPPING button - directly below form fields */}
                                        {(() => {
                                          const missingRequired = !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country;
                                          const showMissing = missingRequired && shippingAttempted && shippingStatus !== 'error' && shippingStatus !== 'saving' && !isProcessing;
                                          return (
                                            <button
                                              className={`w-full mt-4 px-4 py-3 rounded border transition-colors text-center font-bold text-lg ${(isProcessing || shippingStatus === 'saving') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                              style={{
                                                backgroundColor: showMissing ? 'rgba(255,255,0,0.2)' : shippingStatus === 'error' ? 'rgba(255,165,0,0.2)' : 'rgba(0,255,0,0.2)',
                                                borderColor: showMissing ? 'rgba(255,255,0,0.6)' : shippingStatus === 'error' ? 'rgba(255,165,0,0.6)' : 'rgba(0,255,0,0.6)',
                                                color: showMissing ? '#FFFF00' : shippingStatus === 'error' ? '#FFB347' : '#90EE90',
                                                textShadow: showMissing ? '0 0 4px rgba(255,255,0,0.8)' : shippingStatus === 'error' ? '0 0 4px rgba(255,179,71,0.8)' : '0 0 4px rgba(144,238,144,0.8)',
                                                boxShadow: showMissing ? '0 0 8px rgba(255,255,0,0.3)' : shippingStatus === 'error' ? '0 0 8px rgba(255,165,0,0.3)' : '0 0 8px rgba(0,255,0,0.3)'
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (missingRequired) {
                                                  console.log('[SHIPPING] CONFIRM clicked with missing fields - playing scroll sound');
                                                  setShippingAttempted(true);
                                                  try { sfx.play('scroll', 0.5); } catch {}
                                                  return;
                                                }
                                                if (shippingStatus === 'error') {
                                                  console.log('[SHIPPING] RETRY SHIPPING clicked');
                                                  retryShipping();
                                                } else {
                                                  console.log('[SHIPPING] CONFIRM SHIPPING clicked');
                                                  handleConfirmShipping();
                                                }
                                              }}
                                              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                            >
                                              {shippingStatus === 'saving' ? 'Saving...' :
                                               shippingStatus === 'error' ? 'RETRY SHIPPING' :
                                               isProcessing ? 'Processing...' :
                                               showMissing ? 'MISSING INFORMATION' : 'CONFIRM SHIPPING'}
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  ) : (
                                    /* User/Cost Display - shown when step is 'confirm' */
                                    <>
                                      {/* User Section - below title */}
                                      <div className="flex flex-col items-center pt-2">
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
                                      </div>
                                    </>
                                  )}
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
                                      className="w-36 h-36 -mt-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
                                      onMouseEnter={() => {
                                        try { sfx.play('hover', 0.3); } catch {}
                                      }}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        const clicked = merchItems[currentMerchIndex];
                                        if (clicked) {
                                          console.log('[MERCH] Tile clicked', { id: clicked.id, name: clicked.name });
                                          setActiveMerchItem(clicked);
                                        }
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
                                      className={`absolute left-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 hover:scale-125 transition-all duration-200 ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      style={{ boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}
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
                                      className={`absolute right-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 hover:scale-125 transition-all duration-200 ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      style={{ boxShadow: '0 0 8px rgba(255,255,255,0.3)' }}
                                      aria-label="Next item"
                                    >
                                      <span className="text-white text-sm font-bold">→</span>
                                    </button>
                                  </div>
                                  {/* Page Indicator Dots */}
                                  <div className="mt-2 flex justify-center items-center gap-1.5">
                                    {PHYSICAL_ITEMS.map((_, index) => (
                                      <button
                                        key={index}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!isPurchasing) {
                                            try { sfx.play('click', 0.4); } catch {}
                                            setCurrentMerchIndex(index);
                                          }
                                        }}
                                        disabled={isPurchasing}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                          index === currentMerchIndex
                                            ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                                            : 'bg-white/30 hover:bg-white/50'
                                        } ${isPurchasing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                      />
                                    ))}
                                  </div>
                                  
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

                  {/* Bottom description (removed PAY WITH button) - Only show when NOT in heart coin purchase mode */}
                  {activeUseTab === 'MERCH' && PHYSICAL_ITEMS[currentMerchIndex] && !purchaseDraft && (
                    <div className="absolute left-6 right-6 bottom-0" style={{ lineHeight: '1.3' }}>
                      <div className="text-xs text-white/90" style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}>
                        {PHYSICAL_ITEMS[currentMerchIndex].description}
                      </div>
                    </div>
                  )}

                  {/* CONFIRM button for heart coin purchase - only show when NOT in shipping step (shipping form has its own button) */}
                  {activeUseTab === 'MERCH' && purchaseDraft && showHeartCoinPurchase && step !== 'shipping' && (
                    <div className="absolute left-6 right-6 bottom-4">
                      {(
                        /* Check balance against purchaseDraft.uiCost (server is authoritative for actual deduction) */
                        (profile?.id ? heartCoins : 0) >= (purchaseDraft.uiCost || 0) ? (
                          <button
                            className={`w-full px-4 py-3 rounded border transition-colors text-center font-bold text-lg ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{
                              backgroundColor: 'rgba(0,255,0,0.2)',
                              borderColor: 'rgba(0,255,0,0.6)',
                              color: '#90EE90',
                              textShadow: '0 0 4px rgba(144,238,144,0.8)',
                              boxShadow: '0 0 8px rgba(0,255,0,0.3)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Single entrypoint: handler manages in-flight guard & logging
                              console.log('[PURCHASE] CONFIRM clicked, calling handler from bottom confirm');
                              handleConfirmPurchase();
                            }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            disabled={isPurchasing || isProcessing}
                          >
                            {isPurchasing || isProcessing ? 'Processing...' : 'CONFIRM'}
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
                        )
                      )}
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

                          {/* Show loading spinner while cards are fetching */}
                          {isLoadingCards ? (
                            <div className="flex flex-col items-center justify-center py-8">
                              <div className="w-8 h-8 border-2 border-white/30 border-t-pink-500 rounded-full animate-spin mb-2" />
                              <div className="text-white/70 text-sm" style={{ textShadow: '0 0 4px rgba(255,255,255,0.4)' }}>
                                Loading cards...
                              </div>
                            </div>
                          ) : (
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
                          )}
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
                            
                            {/* Card Navigator Dropdown */}
                            <select
                              value={currentCardIndex}
                              onChange={(e) => {
                                try { sfx.play('song-select', 0.6); } catch {}
                                setCurrentCardIndex(parseInt(e.target.value, 10));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              onInput={() => {
                                // Play song-select sound when cycling through options
                                try { sfx.play('song-select', 0.5); } catch {}
                              }}
                              onKeyDown={(e) => {
                                // Play song-select sound when cycling through options with arrow keys
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  try { sfx.play('song-select', 0.5); } catch {}
                                }
                              }}
                              className="bg-black/90 border border-white/40 rounded px-3 py-1 text-white text-sm flex-1 hover:scale-105 transition-transform duration-200 cursor-pointer"
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              }}
                            >
                              {filteredCards.map((card, index) => (
                                <option
                                  key={card.id || index}
                                  value={index}
                                  style={{ backgroundColor: '#1a1a1a', color: 'white' }}
                                >
                                  {card.card_name || `Card ${index + 1}`}
                                </option>
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
                                <div className="relative w-full h-full flex flex-col">
                                  {/* Single Card Display */}
                            <div key={card.id} className="flex flex-col items-center text-center max-w-full h-full" onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}>

                              {/* Card Image with Navigation Arrows */}
                              <div className="flex items-center justify-center gap-4 mb-4">
                                {/* Left Arrow - Always visible */}
                                <button
                                  onClick={() => {
                                    try { sfx.play('change-channel', 0.8); } catch {}
                                    setCurrentCardIndex(prev =>
                                      prev > 0 ? prev - 1 : filteredCards.length - 1
                                    );
                                  }}
                                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                  className={`w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border-2 ${
                                    filteredCards.length > 1
                                      ? 'text-white hover:text-yellow-400 border-white/30 hover:border-yellow-400/60 hover:scale-125'
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
                                <div
                                  className="w-32 h-44 rounded-lg border-2 border-yellow-500/80 overflow-hidden relative cursor-pointer hover:border-yellow-400/90 transition-all duration-200 hover:scale-105"
                                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                >
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
                                  try { sfx.play('change-channel', 0.8); } catch {}
                                  setCurrentCardIndex(prev =>
                                    prev < filteredCards.length - 1 ? prev + 1 : 0
                                  );
                                }}
                                onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                                className={`w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border-2 ${
                                  filteredCards.length > 1
                                    ? 'text-white hover:text-yellow-400 border-white/30 hover:border-yellow-400/60 hover:scale-125'
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

                              {/* Card Index Indicator Dots - below image */}
                              <div className="flex justify-center items-center gap-1.5 mb-2">
                                {filteredCards.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      try { sfx.play('click', 0.4); } catch {}
                                      setCurrentCardIndex(index);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                      index === currentCardIndex
                                        ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                                        : 'bg-white/30 hover:bg-white/50'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Card Details - Below Image */}
                              <div className="w-full max-w-md flex-1 flex flex-col justify-end">
                                {/* Description - only show when no form is active */}
                                {!showPhysicalForm && !showDigitalForm && !showPhysicalConfirm && (
                                  <p
                                    className="text-sm mb-1 leading-relaxed text-center max-w-lg mx-auto"
                                    style={{
                                      color: '#FFFFFF',
                                      textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                    }}
                                  >
                                    {card.description}
                                  </p>
                                )}

                                {/* User/Cost display - show when digital or physical form is active */}
                                {(showDigitalForm || showPhysicalForm) && (
                                  <div className="text-center mb-3">
                                    {/* User and Cost - Stacked Layout */}
                                    <div className="mb-2">
                                      {/* User Row: User | Heart Coin | Balance */}
                                      <div className="flex items-center justify-center gap-3 mb-3">
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
                                          {showDigitalForm ? card.digitalCost : card.physicalCost}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Confirm button - only show when a form is active, above purchase buttons */}
                                {(showDigitalForm || showPhysicalForm) && (
                                  showDigitalForm && isCardOwned(card?.id) ? (
                                    <button
                                      className="w-full px-4 py-2 rounded border transition-colors mb-3 cursor-not-allowed"
                                      style={{
                                        backgroundColor: 'rgba(234,179,8,0.8)',
                                        borderColor: 'rgba(234,179,8,0.6)',
                                        color: '#000000',
                                        textShadow: '0 0 4px rgba(234,179,8,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => {
                                        try { sfx.play('pause', 0.6); } catch {}
                                      }}
                                    >
                                      ALREADY COLLECTED
                                    </button>
                                  ) : showDigitalForm && !profile?.id ? (
                                    /* Not logged in - prompt to log in */
                                    <button
                                      className="w-full px-4 py-2 rounded border transition-colors mb-3 cursor-pointer hover:scale-105"
                                      style={{
                                        backgroundColor: 'rgba(239,68,68,0.2)',
                                        borderColor: 'rgba(239,68,68,0.6)',
                                        color: '#FF6B6B',
                                        textShadow: '0 0 4px rgba(239,68,68,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        // Close heart coin display first
                                        setOpen(false);
                                        onClose?.();
                                        window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                                        // Then open WELCOME HOME modal
                                        setTimeout(() => {
                                          window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                                        }, 150);
                                      }}
                                    >
                                      Log in to earn HeartCoins
                                    </button>
                                  ) : showDigitalForm && heartCoins < card.digitalCost ? (
                                    /* Logged in but insufficient coins */
                                    <>
                                      <button
                                        className="w-full px-4 py-2 rounded border transition-colors mb-1 cursor-not-allowed opacity-50"
                                        style={{
                                          backgroundColor: 'rgba(255,0,0,0.2)',
                                          borderColor: 'rgba(255,0,0,0.6)',
                                          color: '#FF6B6B',
                                          textShadow: '0 0 4px rgba(255,107,107,0.5)',
                                          fontWeight: 'bold'
                                        }}
                                        disabled
                                        onClick={() => {
                                          try { sfx.play('error', 0.6); } catch {}
                                        }}
                                      >
                                        CONFIRM
                                      </button>
                                      <div className="text-red-400 text-xs mb-3 text-center" style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>
                                        Not enough HeartCoins
                                      </div>
                                    </>
                                  ) : showDigitalForm && !hasEmptySlot ? (
                                    /* No empty binder slot - disabled CONFIRM with red message */
                                    <>
                                      <button
                                        className="w-full px-4 py-2 rounded border transition-colors mb-1 cursor-not-allowed opacity-50"
                                        style={{
                                          backgroundColor: 'rgba(156,163,175,0.2)',
                                          borderColor: 'rgba(156,163,175,0.6)',
                                          color: '#9CA3AF',
                                          textShadow: '0 0 4px rgba(156,163,175,0.5)',
                                          fontWeight: 'bold'
                                        }}
                                        disabled
                                        onClick={() => {
                                          try { sfx.play('error', 0.6); } catch {}
                                        }}
                                      >
                                        CONFIRM
                                      </button>
                                      <div className="text-red-400 text-xs mb-3 text-center" style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>
                                        Complete Element of the Day to unlock binder slot
                                      </div>
                                    </>
                                  ) : (
                                    /* Logged in + sufficient coins + has binder slot - normal flow */
                                    <button
                                      className="w-full px-4 py-2 rounded border transition-colors mb-3"
                                      style={{
                                        backgroundColor: 'rgba(0,255,0,0.2)',
                                        borderColor: 'rgba(0,255,0,0.6)',
                                        color: '#90EE90',
                                        textShadow: '0 0 4px rgba(144,238,144,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        if (showDigitalForm) {
                                          // Trigger the unified digital purchase handler with this card
                                          handleConfirmCardPurchase(card);
                                        } else {
                                          console.warn('[CARD PURCHASE] GUARD: physical confirm clicked in list view, no handler here');
                                          try { window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Physical purchase flow coming soon', type: 'info' } })); } catch {}
                                        }
                                      }}
                                    >
                                      CONFIRM
                                    </button>
                                  )
                                )}


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
                        onClick={() => {
                          if (shippingStatus === 'error') {
                            retryShipping();
                          } else {
                            handleConfirmShipping();
                          }
                        }}
                        disabled={isProcessing || shippingStatus === 'saving' || !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country}
                        className={`w-full mt-4 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          isProcessing || shippingStatus === 'saving' || !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country
                            ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                            : shippingStatus === 'error'
                              ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:scale-[1.02]'
                              : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
                        }`}
                        style={!isProcessing && shippingStatus !== 'saving' && shippingForm.full_name && shippingForm.address_line1 && shippingForm.city && shippingForm.state && shippingForm.zip && shippingForm.country && shippingStatus !== 'error' ? {
                          boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                        } : {}}
                      >
                        {shippingStatus === 'saving' ? 'Saving...' :
                         shippingStatus === 'error' ? 'RETRY SHIPPING' :
                         isProcessing ? 'Processing...' : 'CONFIRM SHIPPING'}
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
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center z-50 rounded-lg py-2"
              onClick={() => {
                setEnlargedCard(null);
                setCardRotation(0);
                setShowCardConfirm(null);
                setCardPurchaseStep('confirm');
              }}
            >
              {/* Close Button - positioned in top left of modal overlay, hidden during shipping */}
              {!(showCardConfirm === 'physical' && cardPurchaseStep === 'shipping') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try { sfx.play('close', 0.7); } catch {}
                    setEnlargedCard(null);
                    setIsEnlargedCardFlipped(false);
                    setCardRotation(0);
                    setShowCardConfirm(null);
                    setCardPurchaseStep('confirm');
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                  className="absolute top-3 left-3 w-7 h-7 bg-transparent border-2 border-white rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-200 z-10 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  style={{ textShadow: '0 0 8px rgba(255,255,255,0.9)', boxShadow: '0 0 12px rgba(255,255,255,0.6)' }}
                >
                  ×
                </button>
              )}

              {/* Spacer to push content to center */}
              <div className="flex-1" />

              {/* Main content row: Digital button | Card | Physical button */}
              <div className="flex items-center justify-center gap-2 w-full px-2">
                {/* Digital Purchase Button - left of card */}
                {!showCardConfirm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      try { sfx.play('click', 0.6); } catch {}
                      setShowCardConfirm('digital');
                    }}
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                    className="px-1 py-2 rounded border border-yellow-500/60 bg-yellow-500/20 hover:bg-yellow-500/40 hover:scale-110 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(255,215,0,0.7)] transition-all duration-200 text-white font-semibold text-xs flex flex-col items-center gap-1 whitespace-nowrap z-20"
                    style={{ textShadow: '0 0 4px rgba(255,215,0,0.6)', boxShadow: '0 0 12px rgba(255,215,0,0.3)' }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold">{enlargedCard.digitalCost || 5}</span>
                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                    </div>
                    <span>DIGITAL</span>
                  </button>
                )}

                <div
                  className="relative w-56 flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Show confirmation view or normal view */}
                {showCardConfirm ? (
                  /* Confirmation View */
                  <div className="flex flex-col items-center justify-center h-[320px] gap-6">
                    {/* Card Title */}
                    <div
                      className="text-xl font-bold text-white text-center uppercase"
                      style={{ textShadow: '0 0 10px rgba(255,255,255,0.8)' }}
                    >
                      {enlargedCard.card_name}
                    </div>

                    {/* Purchase Type, User Balance and Cost - hidden during shipping step */}
                    {!(showCardConfirm === 'physical' && cardPurchaseStep === 'shipping') && (
                      <>
                        <div
                          className="text-sm text-white/70 uppercase"
                          style={{ textShadow: '0 0 6px rgba(255,255,255,0.5)' }}
                        >
                          {showCardConfirm === 'digital' ? 'DIGITAL' : 'PHYSICAL'}
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <span className="text-sm opacity-70">YOU</span>
                          <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                          <span
                            className="text-lg font-bold"
                            style={{ textShadow: '0 0 8px rgba(255,215,0,0.8)' }}
                          >
                            {heartCoins}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <span className="text-sm opacity-70">COST</span>
                          <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                          <span
                            className="text-lg font-bold"
                            style={{ textShadow: '0 0 8px rgba(255,215,0,0.8)' }}
                          >
                            {showCardConfirm === 'digital' ? (enlargedCard.digitalCost || 5) : (enlargedCard.physicalCost || 20)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Confirm Button - or Shipping Form for physical cards */}
                    {showCardConfirm === 'physical' && cardPurchaseStep === 'shipping' ? (
                      /* Shipping Form for physical card purchase */
                      <div className="w-full space-y-2">
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
                            placeholder="Country"
                            value={shippingForm.country}
                            onChange={(e) => setShippingForm({...shippingForm, country: e.target.value})}
                            className="px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-white/50 text-sm"
                          />
                        </div>

                        {/* CONFIRM SHIPPING button */}
                        {(() => {
                          const missingRequired = !shippingForm.full_name || !shippingForm.address_line1 || !shippingForm.city || !shippingForm.state || !shippingForm.zip || !shippingForm.country;
                          const showMissing = missingRequired && cardShippingAttempted && shippingStatus !== 'error' && shippingStatus !== 'saving' && !isProcessing;
                          return (
                            <button
                              className={`w-full mt-3 px-4 py-3 rounded border transition-colors text-center font-bold text-lg ${(isProcessing || shippingStatus === 'saving') ? 'opacity-50 cursor-not-allowed' : ''}`}
                              style={{
                                backgroundColor: showMissing ? 'rgba(255,255,0,0.2)' : shippingStatus === 'error' ? 'rgba(255,165,0,0.2)' : 'rgba(0,255,0,0.2)',
                                borderColor: showMissing ? 'rgba(255,255,0,0.6)' : shippingStatus === 'error' ? 'rgba(255,165,0,0.6)' : 'rgba(0,255,0,0.6)',
                                color: showMissing ? '#FFFF00' : shippingStatus === 'error' ? '#FFB347' : '#90EE90',
                                textShadow: showMissing ? '0 0 4px rgba(255,255,0,0.8)' : shippingStatus === 'error' ? '0 0 4px rgba(255,179,71,0.8)' : '0 0 4px rgba(144,238,144,0.8)',
                                boxShadow: showMissing ? '0 0 8px rgba(255,255,0,0.3)' : shippingStatus === 'error' ? '0 0 8px rgba(255,165,0,0.3)' : '0 0 8px rgba(0,255,0,0.3)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (missingRequired) {
                                  console.log('[CARD SHIPPING] CONFIRM clicked with missing fields - playing scroll sound');
                                  setCardShippingAttempted(true);
                                  try { sfx.play('scroll', 0.5); } catch {}
                                  return;
                                }
                                if (shippingStatus === 'error') {
                                  console.log('[CARD SHIPPING] RETRY clicked');
                                  handleConfirmCardShipping();
                                } else {
                                  console.log('[CARD SHIPPING] CONFIRM SHIPPING clicked - calling handleConfirmCardShipping');
                                  handleConfirmCardShipping();
                                }
                              }}
                              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            >
                              {shippingStatus === 'saving' ? 'Saving...' :
                               shippingStatus === 'error' ? 'RETRY SHIPPING' :
                               isProcessing ? 'Processing...' :
                               showMissing ? 'MISSING INFORMATION' : 'CONFIRM SHIPPING'}
                            </button>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Normal Confirm Button */
                      <>
                        {/* Check if digital card is already owned */}
                        {showCardConfirm === 'digital' && isCardOwned(enlargedCard?.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              try { sfx.play('pause', 0.6); } catch {}
                            }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            className="px-8 py-3 rounded border transition-all duration-200 text-black font-bold text-lg border-yellow-500/60 bg-yellow-500/80 cursor-not-allowed"
                            style={{ textShadow: '0 0 8px rgba(234,179,8,0.8)', boxShadow: '0 0 15px rgba(234,179,8,0.4)' }}
                          >
                            ALREADY COLLECTED
                          </button>
                        ) : showCardConfirm === 'digital' && !profile?.id ? (
                          /* Not logged in - prompt to log in */
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              try { sfx.play('click', 0.8); } catch {}
                              // Close heart coin display first
                              setOpen(false);
                              onClose?.();
                              window.dispatchEvent(new CustomEvent('close-heartcoin-modal'));
                              // Then open WELCOME HOME modal
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
                              }, 150);
                            }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            className="px-8 py-3 rounded border transition-all duration-200 text-white font-bold text-lg border-red-500/60 bg-red-500/20 hover:bg-red-500/40 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] cursor-pointer hover:scale-110"
                            style={{ textShadow: '0 0 8px rgba(239,68,68,0.8)', boxShadow: '0 0 15px rgba(239,68,68,0.4)' }}
                          >
                            Log in to earn HeartCoins
                          </button>
                        ) : showCardConfirm === 'digital' && heartCoins < (enlargedCard?.digitalCost || 5) ? (
                          /* Logged in but insufficient coins */
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try { sfx.play('error', 0.6); } catch {}
                              }}
                              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                              disabled
                              className="px-8 py-3 rounded border transition-all duration-200 text-white font-bold text-lg border-red-500/60 bg-red-500/20 cursor-not-allowed opacity-50"
                              style={{ textShadow: '0 0 8px rgba(239,68,68,0.5)', boxShadow: '0 0 15px rgba(239,68,68,0.2)' }}
                            >
                              CONFIRM
                            </button>
                            <div className="text-red-400 text-xs mt-2" style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>
                              Not enough HeartCoins
                            </div>
                          </>
                        ) : showCardConfirm === 'digital' && !hasEmptySlot ? (
                          /* No empty binder slot - disabled CONFIRM with red message */
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try { sfx.play('error', 0.6); } catch {}
                              }}
                              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                              disabled
                              className="px-8 py-3 rounded border transition-all duration-200 text-white font-bold text-lg border-gray-500/60 bg-gray-500/20 cursor-not-allowed opacity-50"
                              style={{ textShadow: '0 0 8px rgba(156,163,175,0.5)', boxShadow: '0 0 15px rgba(156,163,175,0.2)' }}
                            >
                              CONFIRM
                            </button>
                            <div className="text-red-400 text-xs mt-2" style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>
                              Complete Element of the Day to unlock binder slot
                            </div>
                          </>
                        ) : (
                          /* Logged in + sufficient coins + has binder slot - normal flow */
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              try { sfx.play('click', 0.6); } catch {}
                              // Digital purchase confirm handler
                              if (showCardConfirm === 'digital') {
                                handleConfirmCardPurchase();
                              } else {
                                // Physical card - Step 1: create order, get orderId, then transition to shipping
                                console.log('[CARD PURCHASE] Physical confirm clicked - calling handlePhysicalCardConfirm');
                                handlePhysicalCardConfirm();
                              }
                            }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            className="px-8 py-3 rounded border transition-all duration-200 text-white font-bold text-lg hover:scale-110 border-green-500/60 bg-green-500/20 hover:bg-green-500/40 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.8)]"
                            style={{ textShadow: '0 0 8px rgba(34,197,94,0.8)', boxShadow: '0 0 15px rgba(34,197,94,0.4)' }}
                          >
                            CONFIRM
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* Normal View - Card only (buttons are positioned absolutely in modal) */
                  <TiltSpinCard
                    style={{ animation: 'cardPulse 2s ease-in-out infinite' }}
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
                      className="absolute inset-0 w-full h-full rounded-3xl shadow-2xl object-contain pointer-events-none"
                      style={{
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
                      className="absolute inset-0 w-full h-full rounded-3xl shadow-2xl object-contain pointer-events-none"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: `rotateY(${cardRotation + 180}deg)`,
                        transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      }}
                      draggable={false}
                    />
                  </TiltSpinCard>
                )}
              </div>

                {/* Physical Purchase Button - right of card */}
                {!showCardConfirm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      try { sfx.play('click', 0.6); } catch {}
                      setShowCardConfirm('physical');
                    }}
                    onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                    className="px-1 py-2 rounded border border-green-500/60 bg-green-500/20 hover:bg-green-500/40 hover:scale-110 hover:border-green-400 hover:shadow-[0_0_25px_rgba(34,197,94,0.7)] transition-all duration-200 text-white font-semibold text-xs flex flex-col items-center gap-1 whitespace-nowrap z-20"
                    style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)', boxShadow: '0 0 12px rgba(34,197,94,0.3)' }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold">{enlargedCard.physicalCost || 20}</span>
                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                    </div>
                    <span>PHYSICAL</span>
                  </button>
                )}
              </div>

              {/* Spacer to push content to center */}
              <div className="flex-1" />
            </div>
          )}

          {/* Enlarged Merchandise Modal */}
          {activeMerchItem && (
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
              onClick={() => {
                setActiveMerchItem(null);
                setMerchRotation(0);
                setShowEnlargedConfirm(false);
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

              {/* Close Button - positioned in top left of modal overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  try { sfx.play('close', 0.7); } catch {}
                  setActiveMerchItem(null);
                  setMerchRotation(0);
                  setShowEnlargedConfirm(false);
                }}
                onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                className="absolute top-3 left-3 w-7 h-7 bg-transparent border-2 border-white rounded-full flex items-center justify-center text-white text-sm font-bold transition-all duration-200 z-10 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                style={{ textShadow: '0 0 8px rgba(255,255,255,0.9)', boxShadow: '0 0 12px rgba(255,255,255,0.6)' }}
              >
                ×
              </button>

              <div
                className="relative w-64 mx-4 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Show confirmation view or normal view */}
                {showEnlargedConfirm ? (
                  /* Confirmation View */
                  <div className="flex flex-col items-center justify-center h-[320px] gap-6">
                    {/* Item Name */}
                    <div
                      className="text-xl font-bold text-white text-center uppercase"
                      style={{ textShadow: '0 0 10px rgba(255,255,255,0.8)' }}
                    >
                      {activeMerchItem.name}
                    </div>

                    {/* User Balance */}
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-sm opacity-70">YOU</span>
                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                      <span
                        className="text-lg font-bold"
                        style={{ textShadow: '0 0 8px rgba(255,215,0,0.8)' }}
                      >
                        {heartCoins}
                      </span>
                    </div>

                    {/* Cost */}
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-sm opacity-70">COST</span>
                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-6 h-6" />
                      <span
                        className="text-lg font-bold"
                        style={{ textShadow: '0 0 8px rgba(255,215,0,0.8)' }}
                      >
                        {activeMerchItem.price_heartcoins}
                      </span>
                    </div>

                    {/* Confirm Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try { sfx.play('click', 0.6); } catch {}
                        if (!activeMerchItem) return;
                        // Single entrypoint: handler manages idempotency and logging
                        handleConfirmPurchase(activeMerchItem);
                      }}
                      disabled={isPurchasing || heartCoins < (activeMerchItem?.price_heartcoins || 0)}
                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                      className={`px-8 py-3 rounded border transition-all duration-200 text-white font-bold text-lg hover:scale-110 ${
                        !isPurchasing && heartCoins >= (activeMerchItem?.price_heartcoins || 0)
                          ? 'border-green-500/60 bg-green-500/20 hover:bg-green-500/40 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.8)]'
                          : 'border-red-500/60 bg-red-500/20 cursor-not-allowed opacity-70 hover:shadow-[0_0_30px_rgba(239,68,68,0.8)]'
                      }`}
                      style={!isPurchasing && heartCoins >= (activeMerchItem?.price_heartcoins || 0)
                        ? { textShadow: '0 0 8px rgba(34,197,94,0.8)', boxShadow: '0 0 15px rgba(34,197,94,0.4)' }
                        : { textShadow: '0 0 8px rgba(239,68,68,0.8)', boxShadow: '0 0 15px rgba(239,68,68,0.4)' }
                      }
                    >
                      {isPurchasing ? 'Processing...' : 'CONFIRM'}
                    </button>

                    {/* Not enough coins message */}
                    {heartCoins < (activeMerchItem?.price_heartcoins || 0) && (
                      <div className="text-red-400 text-xs" style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>Not enough Heart Coins</div>
                    )}
                  </div>
                ) : (
                  /* Normal View - Image with buttons */
                  <>
                    {/* PAY WITH HeartCoin button - above image */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try { sfx.play('click', 0.6); } catch {}
                        setShowEnlargedConfirm(true);
                      }}
                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                      className="-mb-12 px-6 py-3 rounded border border-yellow-500/60 bg-yellow-500/20 hover:bg-yellow-500/40 hover:scale-110 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(255,215,0,0.7)] transition-all duration-200 text-white font-semibold text-sm flex items-center gap-2 whitespace-nowrap z-20 relative"
                      style={{ textShadow: '0 0 4px rgba(255,215,0,0.6)', boxShadow: '0 0 12px rgba(255,215,0,0.3)' }}
                    >
                      PAY WITH
                      <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-5 h-5" />
                      {activeMerchItem.price_heartcoins}
                    </button>

                    {/* TiltSpinCard wrapper for 3D rotation - with floating animation */}
                    <TiltSpinCard
                      className="relative w-full h-[360px] hover:scale-110 transition-all duration-200 cursor-pointer group hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                      style={{ perspective: '1000px', animation: 'merchFloat 2.5s ease-in-out infinite' }}
                      maxRotateX={10}
                      sensitivity={0.3}
                      returnDuration={400}
                      enableSpin={true}
                      spinSensitivity={0.8}
                      onRotationChange={setMerchRotation}
                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
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
                        className="absolute inset-0 w-full h-full group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: `rotateY(${merchRotation}deg)`,
                          transition: isMerchAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                          filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))',
                        }}
                      >
                        {/* Merchandise Image - Front */}
                        <img
                          src={activeMerchItem.image_url}
                          alt={activeMerchItem.name}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          style={{
                            filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.3))',
                            backfaceVisibility: 'hidden',
                          }}
                          draggable={false}
                        />
                        {/* Merchandise Image - Back */}
                        <img
                          src={(activeMerchItem.slug === 'beanie' ? ((activeMerchItem as any).profile_url_2 || activeMerchItem.image_url_2) : activeMerchItem.image_url_2) || activeMerchItem.image_url}
                          alt={`${activeMerchItem.name} back`}
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

                    {/* PAY WITH USD button - below image */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try { sfx.play('click', 0.6); } catch {}
                        // Open Stripe checkout in new tab
                        if (activeMerchItem.stripe_url) {
                          window.open(activeMerchItem.stripe_url, '_blank');
                        }
                      }}
                      onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                      className="-mt-10 px-6 py-3 rounded border border-green-500/60 bg-green-500/20 hover:bg-green-500/40 hover:scale-110 hover:border-green-400 hover:shadow-[0_0_25px_rgba(34,197,94,0.7)] transition-all duration-200 text-white font-semibold text-sm flex items-center gap-2 whitespace-nowrap z-20 relative"
                      style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)', boxShadow: '0 0 12px rgba(34,197,94,0.3)' }}
                    >
                      PAY WITH ${activeMerchItem.cost_usd || 0}
                    </button>
                  </>
                )}
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
