"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { sfx } from "@/lib/sfx";
import { useProfile } from '@/contexts/ProfileContext';
import HeartversePopup from "@/components/HeartversePopup";
import PopoutShell from "@/components/PopoutShell";
import { useBonusQuests } from '@/hooks/useBonusQuests';
import { BonusQuestWithCompletion } from '@/types/bonusQuests';
import { useMerchItems } from '@/hooks/useMerchItems';
import { useMerchPurchase } from '@/hooks/useMerchPurchase';
import { MerchItem } from '@/types/merch';
import TiltSpinCard from '@/components/TiltSpinCard';
import { usePlanetRewardsContext } from '@/components/PlanetRewardsProvider';
import { getElementalPlanetImage } from '@/lib/elementalPlanets';
import { triggerMerchCelebration } from '@/utils/merchCelebration';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenJournal?: () => void;
  onOpenWelcomeHome?: () => void;
  initialTab?: 'earn' | 'use' | 'merch' | 'cards';
  availableCards?: any[];
  currentCardIndex?: number;
  onCardNavigation?: (direction: 'prev' | 'next') => void;
};

type StoreItem = {
  name: string;
  image: string;
  image2?: string;
  stripeUrl: string;
  description: string;
  cost: number;
  heartCoin: number;
  merch_item_id: string; // UUID from merch_items table
};

type PendingPurchase = {
  merchItemId: string;
  name: string;
  cost: number;
  quantity: number;
  clientRequestId: string;
};

const storeItems: StoreItem[] = [
  {
    name: "PIN",
    image: "/store/pin.webp",
    stripeUrl: "https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B",
    description: "A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.",
    cost: 4.5,
    heartCoin: 3,
    merch_item_id: "2ebc68bd-b466-4c99-81b5-5465d98321fa"
  },
  {
    name: "PATCH",
    image: "/store/patch.webp",
    image2: "/store/patch-inverse.webp",
    stripeUrl: "https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C",
    description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community.",
    cost: 6,
    heartCoin: 4,
    merch_item_id: "b49e562c-31ba-4fd6-8157-7a1a683e5279"
  },
  {
    name: "Sticker",
    image: "/store/sticker.webp",
    stripeUrl: "https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F",
    description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story.",
    cost: 3,
    heartCoin: 2,
    merch_item_id: "b608657d-df9d-4a00-b94a-0d2b598fa73c"
  },
  {
    name: "Hat",
    image: "/store/hat.webp",
    stripeUrl: "https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I",
    description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to.",
    cost: 30,
    heartCoin: 20,
    merch_item_id: "6e8a6c59-a69e-40c7-afeb-8a3af62d7365"
  },
  {
    name: "Keychain",
    image: "/store/keychain.webp",
    stripeUrl: "https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H",
    description: "A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you're connected, always.",
    cost: 6,
    heartCoin: 4,
    merch_item_id: "8ad93b98-8dc8-46ed-8285-ce26a7028637"
  },
  {
    name: "House Party Poster",
    image: "/store/house-party-poster.webp",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.",
    cost: 30,
    heartCoin: 20,
    merch_item_id: "2582977b-1680-4567-a5bb-cd31c4e74135"
  },
  {
    name: "Necklace",
    image: "/store/necklace.webp",
    stripeUrl: "https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K",
    description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here.",
    cost: 18,
    heartCoin: 12,
    merch_item_id: "a0442c84-55c7-48cc-be79-5296360d9ca7"
  },
  {
    name: "Beanie",
    image: "/store/beanie-front.webp",
    image2: "/store/beanie-back.webp",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    cost: 30,
    heartCoin: 20,
    merch_item_id: "214c10af-ed40-4856-b3f5-6433db3c1428"
  },
  {
    name: "Button",
    image: "/store/button.webp",
    stripeUrl: "https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J",
    description: "A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.",
    cost: 6,
    heartCoin: 4,
    merch_item_id: "ebf2ea83-b65b-474b-9ac5-8891ffd3e28a"
  },
  {
    name: "Bracelet",
    image: "/store/bracelet.webp",
    stripeUrl: "https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N",
    description: "A reminder you wear on your wrist that you're growing, healing, and finding your place. It's a quiet symbol that you belong here, with the ones who feel deeply and love endlessly.",
    cost: 24,
    heartCoin: 16,
    merch_item_id: "c1d24372-294e-4cdf-adb7-3cb77bb1d68d"
  },
  {
    name: "Pick",
    image: "/store/pick.webp",
    stripeUrl: "https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O",
    description: "Your reminder to follow your passion wherever it leads. A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.",
    cost: 6,
    heartCoin: 4,
    merch_item_id: "8d40159b-fd70-47cc-b394-7c1fdc4e197f"
  }
];

export default function HeartCoinModal({ open, onClose, onOpenJournal, onOpenWelcomeHome, initialTab = 'earn', availableCards = [], currentCardIndex = 0, onCardNavigation }: Props) {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { quests: bonusQuests, status: questsStatus } = useBonusQuests();
  const questsLoading = questsStatus === 'loading';
  const { items: merchItems, loading: merchLoading } = useMerchItems('physical');
  const { purchaseWithHeartCoins, isProcessing } = useMerchPurchase();
  const { elementOfDay } = usePlanetRewardsContext();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeEarnTab, setActiveEarnTab] = useState<'DAILY QUESTS' | 'BONUS QUESTS'>('DAILY QUESTS');

  // Purchase confirmation states
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
  const isSubmittingRef = useRef(false);

  // Post-purchase shipping states (purchase already completed, awaiting shipping info)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [purchasedItemInfo, setPurchasedItemInfo] = useState<{ name: string; image: string; cost: number } | null>(null);
  
  // Shipping form states
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States'
  });

  // Form validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Track if user is in USE mode to show MERCH/CARDS sub-tabs
  const [isUseMode, setIsUseMode] = useState(initialTab === 'use' || initialTab === 'merch' || initialTab === 'cards');
  
  // Track if showing HeartCoin description
  const [showHeartCoinDescription, setShowHeartCoinDescription] = useState(false);

  // Secret phrase redemption states
  const [secretPhrase, setSecretPhrase] = useState("");
  const [secretPhraseLoading, setSecretPhraseLoading] = useState(false);
  const [secretPhraseMessage, setSecretPhraseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle setting the main tab - if USE is selected, default to MERCH
  const handleSetActiveTab = (tab: 'earn' | 'use' | 'merch' | 'cards') => {
    if (tab === 'use') {
      setIsUseMode(true);
      setActiveTab('merch'); // Default to MERCH when USE is clicked
    } else if (tab === 'earn') {
      setIsUseMode(false);
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  };
  const [enlargedItem, setEnlargedItem] = useState<StoreItem | null>(null);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState(0);
  const [enlargedCard, setEnlargedCard] = useState<any>(null);
  const [isEnlargedCardFlipped, setIsEnlargedCardFlipped] = useState(false);
  const [cardRotation, setCardRotation] = useState(0); // For 360° spin mode
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false); // For smooth flip transition
  // Toggle purchase preview (replaces card image with balance vs cost)
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<null | 'digital' | 'physical'>(null);
  // Physical card confirmation in enlarged card view (for 20 PHYSICAL button)
  const [showEnlargedCardConfirm, setShowEnlargedCardConfirm] = useState(false);

  // Element selection and internal cards state for CARDS tab
  const [selectedElement, setSelectedElement] = useState<'LIGHTNING' | 'WATER' | 'HEART' | 'DARKNESS' | null>(null);
  const [allCards, setAllCards] = useState<any[]>([]);
  const [internalCardIndex, setInternalCardIndex] = useState(0);
  // Ensure we only snap to the element's namesake card once per selection
  const [didInitElementIndex, setDidInitElementIndex] = useState(false);
  // Ordered list of cards for the selected element
  const [elementCards, setElementCards] = useState<any[]>([]);

  const itemsPerPage = 6;

  useEffect(() => {
    if (open) {
      handleSetActiveTab(initialTab);
      // Enable sfx when modal opens
      try { sfx.setEnabled(true); } catch {}
    }
  }, [open, initialTab]);

  // Fetch all cards when CARDS tab is active
  useEffect(() => {
    if (open && activeTab === 'cards' && allCards.length === 0) {
      const fetchCards = async () => {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAllCards(data);
        }
      };
      fetchCards();
    }
  }, [open, activeTab, allCards.length]);

  // Reset selected element when switching away from CARDS tab
  useEffect(() => {
    if (activeTab !== 'cards') {
      setSelectedElement(null);
      setInternalCardIndex(0);
      setDidInitElementIndex(false);
      setElementCards([]);
    }
  }, [activeTab]);

  // Build ordered element cards: ensure namesake card appears first, even if its element tag is missing
  const buildOrderedElementCards = (element: 'LIGHTNING' | 'WATER' | 'HEART' | 'VOID' | 'DARKNESS', cards: any[]) => {
    const normalize = (s: string) => (s || '').toUpperCase().trim().replace(/[^A-Z]/g, '');
    const elementUpper = element.toUpperCase();
    const elementNorm = normalize(element);
    const filtered = cards.filter(card => ((card.element || '').toUpperCase()) === elementUpper);

    console.log('[buildOrderedElementCards]', {
      element,
      elementNorm,
      totalCards: cards.length,
      filteredCount: filtered.length,
      filteredNames: filtered.map(c => c.card_name).slice(0, 10),
    });

    // Helper to get all possible name fields from a card
    const getCardNames = (card: any): string[] => {
      const names: string[] = [];
      if (card.card_name) names.push(normalize(card.card_name));
      if (card.title) names.push(normalize(card.title));
      if (card.name) names.push(normalize(card.name));
      if (card.cards?.card_name) names.push(normalize(card.cards.card_name));
      if (card.cards?.title) names.push(normalize(card.cards.title));
      return names;
    };

    // Helper to check if a card is the namesake (element card)
    const isNamesakeCard = (card: any): boolean => {
      const names = getCardNames(card);
      const isMatch = names.some(n => n === elementNorm);
      return isMatch;
    };

    // Find the namesake card from all cards (not just filtered)
    const namesake = cards.find(card => isNamesakeCard(card));
    console.log('[buildOrderedElementCards] namesake found:', namesake?.card_name || 'NONE');

    // Start with filtered list
    let ordered = [...filtered];

    // If there are no filtered cards but a namesake exists, show only the namesake
    if (ordered.length === 0) {
      console.log('[buildOrderedElementCards] No filtered cards, returning namesake only');
      return namesake ? [namesake] : [];
    }

    // ALWAYS put the namesake card first by explicitly separating it from others
    const namesakeInFiltered = ordered.find(c => isNamesakeCard(c));
    const otherCards = ordered.filter(c => !isNamesakeCard(c));

    console.log('[buildOrderedElementCards] namesakeInFiltered:', namesakeInFiltered?.card_name || 'NONE');
    console.log('[buildOrderedElementCards] otherCards:', otherCards.map(c => c.card_name));

    if (namesakeInFiltered) {
      // Namesake found in filtered list - put it first
      ordered = [namesakeInFiltered, ...otherCards];
      console.log('[buildOrderedElementCards] Put namesake first, new order:', ordered.map(c => c.card_name));
    } else if (namesake) {
      // Namesake not in filtered (different element tag) - prepend it
      ordered = [namesake, ...otherCards];
      console.log('[buildOrderedElementCards] Prepended namesake from all cards');
    } else {
      // No namesake found - synthesize an element card
      const synthetic = {
        id: `synthetic-${element}`,
        card_name: element,
        element: element,
        artwork_url: `/cards/${element}.webp`,
        card_description: undefined,
      } as any;
      ordered = [synthetic, ...otherCards];
      console.log('[buildOrderedElementCards] Created synthetic card');
    }

    // Deduplicate by id or by normalized name if id missing
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const deduped: any[] = [];
    for (const c of ordered) {
      const cid = c.id as string | undefined;
      const cname = (getCardNames(c)[0] || '');
      if (cid) {
        if (seenIds.has(cid)) continue;
        seenIds.add(cid);
      } else {
        if (seenNames.has(cname)) continue;
        seenNames.add(cname);
      }
      deduped.push(c);
    }

    return deduped;
  };

  // Use internal ordered element cards when selected, otherwise props
  const displayCards = selectedElement ? elementCards : availableCards;
  const displayCardIndex = selectedElement ? internalCardIndex : currentCardIndex;

  // Helper: find the index of the primary element card (e.g. WATER) within the filtered list
  const getPrimaryElementCardIndex = (element: 'LIGHTNING' | 'WATER' | 'HEART' | 'VOID' | 'DARKNESS') => {
    const normalize = (s: string) => (s || '').toUpperCase().trim().replace(/[^A-Z]/g, '');
    const elementNorm = normalize(element);
    const elementUpper = element.toUpperCase();
    const cardsForElement = allCards.filter(card => (card.element || '').toUpperCase() === elementUpper);
    if (cardsForElement.length === 0) return 0;

    // Helper to get all possible name fields from a card
    const getCardNames = (card: any): string[] => {
      const names: string[] = [];
      if (card.card_name) names.push(normalize(card.card_name));
      if (card.title) names.push(normalize(card.title));
      if (card.name) names.push(normalize(card.name));
      if (card.cards?.card_name) names.push(normalize(card.cards.card_name));
      if (card.cards?.title) names.push(normalize(card.cards.title));
      return names;
    };

    // Prefer exact normalized match (e.g., 'WATER', 'HEART')
    let idx = cardsForElement.findIndex(card => getCardNames(card).some(n => n === elementNorm));
    if (idx >= 0) return idx;

    // Next, prefer names that contain the element label (e.g., '💧 WATER')
    idx = cardsForElement.findIndex(card => getCardNames(card).some(n => n.includes(elementNorm)));
    return idx >= 0 ? idx : 0;
  };

  // Handle element selection
  const handleElementSelect = (element: 'LIGHTNING' | 'WATER' | 'HEART' | 'VOID' | 'DARKNESS') => {
    try { sfx.play('select', 0.5); } catch {}
    setSelectedElement(element);
    // Build & set ordered element cards immediately if available
    // buildOrderedElementCards puts the namesake card first (index 0)
    const orderedNow = buildOrderedElementCards(element, allCards);
    console.log('[Cards] handleElementSelect called:', {
      element,
      allCardsCount: allCards.length,
      orderedCount: orderedNow.length,
      firstCard: orderedNow[0]?.card_name || orderedNow[0]?.cards?.card_name || 'NONE',
      orderedList: orderedNow.map((c:any)=> c.card_name || c.cards?.card_name),
    });
    setElementCards(orderedNow);
    setDidInitElementIndex(false);
    // Set to index 0 since buildOrderedElementCards puts namesake first
    setInternalCardIndex(0);
  };

  // Handle dropdown change
  const handleElementDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'LIGHTNING' | 'WATER' | 'HEART' | 'VOID' | 'DARKNESS';
    setSelectedElement(value);
    // buildOrderedElementCards puts the namesake card first (index 0)
    const orderedNow = buildOrderedElementCards(value, allCards);
    setElementCards(orderedNow);
    setDidInitElementIndex(false);
    // Set to index 0 since buildOrderedElementCards puts namesake first
    setInternalCardIndex(0);
  };

  // After cards load for the selected element, snap to the element's namesake card once
  useEffect(() => {
    if (!selectedElement) return;
    if (didInitElementIndex) return;
    // Rebuild ordered list when cards first load/change
    // buildOrderedElementCards puts the namesake card first (index 0)
    const ordered = buildOrderedElementCards(selectedElement, allCards);
    try {
      console.log('[Cards] post-load build for element:', selectedElement, 'count:', ordered.length, 'first:', ordered[0]?.card_name || ordered[0]?.cards?.card_name);
    } catch {}
    setElementCards(ordered);
    if (ordered.length === 0) return;

    // Set to index 0 since buildOrderedElementCards puts namesake first
    if (internalCardIndex !== 0) setInternalCardIndex(0);
    setDidInitElementIndex(true);
  }, [selectedElement, allCards.length]);

  // Handle back to element selection
  const handleBackToElementSelection = () => {
    try { sfx.play('close', 0.5); } catch {}
    setSelectedElement(null);
    setInternalCardIndex(0);
    setSelectedPurchaseType(null);
  };

  // Helper function to count cards for a given element
  const getElementCardCount = (element: 'LIGHTNING' | 'WATER' | 'HEART' | 'DARKNESS') => {
    return allCards.filter(card => (card.element || '').toUpperCase() === element.toUpperCase()).length;
  };

  // Helper function to check if quest is completed (for daily quests, check can_complete)
  const isQuestCompleted = (quest: BonusQuestWithCompletion): boolean => {
    // For one-time quests (max_total_completions === 1), check if already completed
    if (quest.max_total_completions === 1 && quest.times_completed > 0) {
      return true;
    }
    // For daily repeatable quests like INVITE_FRIEND, check if cannot complete today
    if (quest.quest_key === 'INVITE_FRIEND' && !quest.can_complete) {
      return true;
    }
    return false;
  };

  // Form validation function
  const validateShippingForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!shippingInfo.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!shippingInfo.addressLine1.trim()) {
      errors.addressLine1 = 'Address is required';
    }

    if (!shippingInfo.city.trim()) {
      errors.city = 'City is required';
    }

    if (!shippingInfo.state.trim()) {
      errors.state = 'State is required';
    }

    if (!shippingInfo.zip.trim()) {
      errors.zip = 'ZIP code is required';
    }

    if (!shippingInfo.country.trim()) {
      errors.country = 'Country is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler for login button in bonus quests
  const handleLoginToComplete = () => {
    if (onOpenWelcomeHome) {
      onClose(); // Close the HeartCoin modal first
      setTimeout(() => {
        onOpenWelcomeHome(); // Then open the welcome home modal
      }, 150);
    }
  };

  // Handler for secret phrase redemption
  const handleRedeemSecretPhrase = async () => {
    const phraseTrimmed = secretPhrase.trim();

    if (!phraseTrimmed) {
      setSecretPhraseMessage({ type: 'error', text: 'Please enter a secret phrase' });
      return;
    }

    setSecretPhraseLoading(true);
    setSecretPhraseMessage(null);

    try {
      // Call the RPC using authenticated browser client
      const { data, error } = await supabaseBrowser.rpc('redeem_secret_phrase', {
        p_phrase: phraseTrimmed
      });

      if (error) {
        console.error('Secret phrase RPC error:', error);
        setSecretPhraseMessage({ type: 'error', text: error.message || 'Failed to redeem phrase' });
        return;
      }

      // Handle response statuses
      // Handle RPC response - may return single object or array
      const result = data?.[0] || data;
      const status = result?.status;

      if (status === 'success' || status === 'redeemed') {
        // Success - phrase accepted and coins awarded
        const reward = result?.awarded || result?.reward || 0;
        setSecretPhraseMessage({ type: 'success', text: `+${reward} HeartCoins` });
        setSecretPhrase(''); // Clear input
        // Trigger heartcoin celebration (plays sound + shows animation)
        triggerHeartCoinCelebration(reward);
        // Refresh profile to update HeartCoin balance
        await refreshProfile();
      } else if (status === 'already_redeemed' || status === 'already_checked_in') {
        // Already redeemed - show "Already checked in" (NOT "incorrect")
        setSecretPhraseMessage({ type: 'error', text: 'Already checked in' });
      } else if (status === 'invalid' || status === 'incorrect') {
        // Invalid phrase
        setSecretPhraseMessage({ type: 'error', text: 'Incorrect phrase' });
      } else if (status === 'not_authenticated') {
        // Not logged in
        setSecretPhraseMessage({ type: 'error', text: 'Please log in to redeem' });
        handleLoginToComplete();
      } else {
        // Unknown error
        console.error('Unknown RPC status:', result);
        setSecretPhraseMessage({ type: 'error', text: 'Something went wrong' });
      }
    } catch (err: any) {
      console.error('Secret phrase redemption error:', err);
      setSecretPhraseMessage({ type: 'error', text: err?.message || 'Failed to redeem phrase' });
    } finally {
      setSecretPhraseLoading(false);
    }
  };

  // Inject pulsing animation keyframes when enlarged item is shown
  useEffect(() => {
    if (enlargedItem && typeof document !== 'undefined') {
      const existingStyle = document.querySelector('#merch-pulse-keyframes');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'merch-pulse-keyframes';
        style.innerHTML = `
          @keyframes merchPulse {
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
        const styleElement = document.querySelector('#merch-pulse-keyframes');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [enlargedItem]);

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setModalLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setModalLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setModalLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback?profileSetup=1" },
      });
      if (error) throw error;
      setMessage("Check your email for a magic link.");
    } catch (e: any) {
      setError(e?.message || "Failed to send magic link");
    } finally {
      setModalLoading(false);
    }
  }

  async function signInWithPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setModalLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      setMessage("Check your phone for a verification code.");
    } catch (e: any) {
      setError(e?.message || "Failed to send SMS");
    } finally {
      setModalLoading(false);
    }
  }

  const handlePurchase = (stripeUrl: string) => {
    window.open(stripeUrl, '_blank');
  };

  // Purchase merch item immediately, then show shipping form
  const handleHeartCoinPurchaseConfirm = async (item: StoreItem) => {
    if (!profile) {
      setError("Please sign in to make purchases");
      return;
    }

    if ((profile.heartcoin_balance || 0) < item.heartCoin) {
      setError(`Insufficient HeartCoins! You need ${item.heartCoin} but only have ${profile.heartcoin_balance || 0}`);
      return;
    }

    // Prevent double-submit
    if (isSubmittingRef.current || modalLoading) {
      return;
    }

    isSubmittingRef.current = true;
    setModalLoading(true);
    setError(null);
    setMessage(null);

    // Create unique client request ID for idempotency
    const clientRequestId = crypto.randomUUID();

    console.log('[MERCH PURCHASE] Initiating immediate purchase:', {
      merchItemId: item.merch_item_id,
      name: item.name,
      cost: item.heartCoin,
      clientRequestId
    });

    try {
      // Make the purchase API call immediately
      const payload = {
        merchItemId: item.merch_item_id,
        quantity: 1,
        clientRequestId
      };

      const response = await fetch('/api/merch/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log('[MERCH PURCHASE] Purchase response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        console.error('[MERCH PURCHASE] Purchase API error:', result);
        setError(result.error || result.message || 'Purchase failed. Please try again.');
        return;
      }

      // Handle array return shape from TABLE-returning RPC
      const normalizedResult = Array.isArray(result) ? result[0] : result;

      if (!normalizedResult?.success && !normalizedResult?.order_id) {
        console.error('[MERCH PURCHASE] Purchase returned failure:', normalizedResult);
        setError(normalizedResult?.message || 'Purchase failed. Please try again.');
        return;
      }

      const orderId = normalizedResult.order_id || result.order_id;

      console.log('[MERCH PURCHASE] Purchase successful! Order ID:', orderId);

      // Refresh profile to get updated HeartCoin balance
      await refreshProfile();

      // Store order info and show shipping form
      setCompletedOrderId(orderId);
      setPurchasedItemInfo({
        name: item.name,
        image: item.image,
        cost: item.heartCoin
      });
      setShowShippingForm(true);
      setValidationErrors({});
      setMessage(`Purchase complete! Please enter your shipping details.`);

    } catch (error: any) {
      console.error('[MERCH PURCHASE] Purchase error:', error);
      setError(error?.message || `Failed to purchase ${item.name}`);
    } finally {
      setModalLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Confirm shipping info for already-completed purchase (new flow)
  // OR handle card purchases with the old flow (pendingPurchase)
  const handleConfirmPurchase = async () => {
    if (modalLoading) return; // in-flight guard

    // Double-submit protection
    if (isSubmittingRef.current) {
      console.warn('[MERCH PURCHASE] Double-submit prevented - already processing');
      return;
    }

    // Validate shipping form first
    if (!validateShippingForm()) {
      setError('Please fill in all required shipping information');
      return;
    }

    isSubmittingRef.current = true;
    setModalLoading(true);
    setError(null);
    setMessage(null);

    try {
      // NEW FLOW: Purchase already completed, just update shipping info
      if (completedOrderId && purchasedItemInfo) {
        console.log('[MERCH SHIPPING] Updating shipping for order:', completedOrderId);

        const response = await fetch('/api/merch/updateShipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: completedOrderId,
            fullName: shippingInfo.fullName,
            addressLine1: shippingInfo.addressLine1,
            addressLine2: shippingInfo.addressLine2,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zip: shippingInfo.zip,
            country: shippingInfo.country
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('[MERCH SHIPPING] Update shipping error:', result);
          setError(result.error || 'Failed to save shipping information. Please try again.');
          return;
        }

        console.log('[MERCH SHIPPING] Shipping info updated successfully');

        // Send confirmation email
        try {
          const emailResponse = await fetch('/api/orders/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: completedOrderId,
              shippingInfo: shippingInfo
            }),
          });

          const emailResult = await emailResponse.json();
          if (emailResult.emailSent) {
            console.log('Order confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }

        // Clear purchase state
        setShowShippingForm(false);
        setSelectedItem(null);
        setCompletedOrderId(null);
        setShippingInfo({
          fullName: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          zip: '',
          country: 'United States'
        });
        setValidationErrors({});
        setMessage(null);
        setError(null);

        // Trigger celebration with merch item image
        triggerMerchCelebration(purchasedItemInfo.name, purchasedItemInfo.image);

        // Clear purchased item info after triggering celebration
        setPurchasedItemInfo(null);

        return;
      }

      // OLD FLOW: Card purchases (pendingPurchase is set)
      if (!pendingPurchase || !profile) return;

      // Check if this is a card purchase
      const isCardPurchase = pendingPurchase.merchItemId === 'physical-card' ||
                            pendingPurchase.merchItemId === 'digital-card' ||
                            pendingPurchase.name.includes('(Physical)') ||
                            pendingPurchase.name.includes('(Digital)');

      let result;

      if (isCardPurchase) {
        // Use HeartCoin purchase API for cards
        const response = await fetch('/api/purchase-item-with-heartcoins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: pendingPurchase.merchItemId,
            itemTitle: pendingPurchase.name,
            priceHeartCoins: pendingPurchase.cost,
            isPhysical: true // Physical card purchase with shipping
          }),
        });

        result = await response.json();

        if (!response.ok) {
          console.error('Card purchase API error:', result);
          setError(result.error || 'Card purchase failed. Please try again.');
          return;
        }

        // For card purchases, the order ID is in result.data.id
        const orderId = result.data?.id;

        // Send confirmation email with shipping info
        if (orderId) {
          try {
            const emailResponse = await fetch('/api/orders/send-confirmation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: orderId,
                shippingInfo: shippingInfo
              }),
            });

            const emailResult = await emailResponse.json();
            if (emailResult.emailSent) {
              console.log('Card order confirmation email sent successfully');
            } else {
              console.warn('Card order confirmation email failed to send');
            }
          } catch (emailError) {
            console.error('Failed to send card confirmation email:', emailError);
          }
        }
      }

      // Success for card purchases
      const balanceInfo = result?.heartcoins_after != null
        ? ` Your new balance is ${result.heartcoins_after} HeartCoins.`
        : '';
      setMessage(`Successfully purchased ${pendingPurchase.name}!${balanceInfo} Your order has been placed and a confirmation email has been sent.`);

      // Refresh profile to get actual balance from backend
      await refreshProfile();

      // Clear purchase state
      setShowShippingForm(false);
      setSelectedItem(null);
      setPendingPurchase(null);
      setShippingInfo({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zip: '',
        country: 'United States'
      });
      setValidationErrors({});

    } catch (error: any) {
      console.error('[MERCH PURCHASE] Error:', error);
      setError(error?.message || 'An error occurred. Please try again.');
    } finally {
      setModalLoading(false);
      isSubmittingRef.current = false;
    }
  };


  const handleHeartCoinPurchase = async (item: StoreItem) => {
    if (!profile) {
      setError("Please sign in to make purchases");
      return;
    }

    if ((profile.heartcoin_balance || 0) < item.heartCoin) {
      setError(`Insufficient HeartCoins! You need ${item.heartCoin} but only have ${profile.heartcoin_balance || 0}`);
      return;
    }

    setModalLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Use the API route instead of direct RPC call
      const response = await fetch('/api/purchase-item-with-heartcoins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.name.toLowerCase().replace(/\s+/g, '_'),
          itemTitle: item.name,
          priceHeartCoins: item.heartCoin,
          isPhysical: false
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Purchase failed');
      }

      setMessage(`Successfully purchased ${item.name}!`);
      try { await refreshProfile(); } catch {}
      // Refresh profile to update balance
      window.location.reload();
    } catch (error: any) {
      console.error('Purchase error:', error);
      setError(error?.message || `Failed to purchase ${item.name}`);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle card purchase (digital/physical)
  const handleCardPurchase = async (cardType: 'digital' | 'physical') => {
    if (!profile) {
      setError("Please sign in to make purchases");
      return;
    }

    // Use filtered cards if an element is selected; otherwise use provided props
    const currentCard = selectedElement ? displayCards[displayCardIndex] : availableCards[currentCardIndex];
    if (!currentCard) {
      setError("No card selected");
      return;
    }

    // Determine cost based on type
    const digitalCost = 5; // 5 HeartCoins for digital
    const physicalCost = 15; // 15 HeartCoins for physical
    const cost = cardType === 'digital' ? digitalCost : physicalCost;

    if ((profile.heartcoin_balance || 0) < cost) {
      setError(`Insufficient HeartCoins! You need ${cost} but only have ${profile.heartcoin_balance || 0}`);
      return;
    }

    if (cardType === 'physical') {
      // For physical cards, we need shipping info
      setSelectedItem({
        name: `${currentCard.card_name || currentCard.cards?.card_name || 'Card'} (Physical)`,
        image: currentCard.artwork_url || `/cards/${currentCard.card_name || currentCard.cards?.card_name}.webp`,
        stripeUrl: '',
        description: currentCard.card_description || currentCard.cards?.card_description || 'Physical card',
        cost: 0,
        heartCoin: physicalCost,
        merch_item_id: currentCard.id || currentCard.card_id || 'physical-card'
      });
      setShowShippingForm(true);
      setError(null);
      setMessage(null);
      setValidationErrors({});
      setSelectedPurchaseType(null);
    } else {
      // Digital purchase - immediate
      setModalLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch('/api/merch/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchItemId: currentCard.id || currentCard.card_id || 'digital-card',
            quantity: 1
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Purchase failed');
        }

        // Send confirmation email for digital card purchase
        if (result.order_id) {
          try {
            const emailResponse = await fetch('/api/orders/send-confirmation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: result.order_id
              }),
            });

            const emailResult = await emailResponse.json();
            if (emailResult.emailSent) {
              console.log('Digital card confirmation email sent successfully');
            } else {
              console.warn('Digital card confirmation email failed to send');
            }
          } catch (emailError) {
            console.error('Failed to send digital card confirmation email:', emailError);
            // Don't fail the purchase if email fails
          }
        }

        setMessage(`Successfully purchased digital ${currentCard.card_name || currentCard.cards?.card_name || 'card'}! A confirmation email has been sent.`);

        // Trigger celebration for digital card purchase
        const cardName = currentCard.card_name || currentCard.cards?.card_name || 'Card';
        const cardImage = currentCard.artwork_url || `/cards/${cardName}.webp`;
        triggerMerchCelebration(`${cardName} (Digital)`, cardImage);

        try { await refreshProfile(); } catch {}
        // Refresh profile to update balance
        await refreshProfile();
        setSelectedPurchaseType(null);
      } catch (error: any) {
        console.error('Card purchase error:', error);
        setError(error?.message || `Failed to purchase card`);
      } finally {
        setModalLoading(false);
      }
    }
  };

  // Handle physical card purchase from enlarged card view (20 HeartCoins)
  // This follows the merch flow: purchase first, then show shipping form
  const handlePhysicalCardPurchaseConfirm = async () => {
    const physicalCardCost = 20; // 20 HeartCoins for physical card in enlarged view

    if (!profile) {
      setError("Please sign in to make purchases");
      return;
    }

    const currentCard = displayCards[displayCardIndex];
    if (!currentCard) {
      setError("No card selected");
      return;
    }

    if ((profile.heartcoin_balance || 0) < physicalCardCost) {
      setError(`Insufficient HeartCoins! You need ${physicalCardCost} but only have ${profile.heartcoin_balance || 0}`);
      return;
    }

    // Prevent double-submit
    if (isSubmittingRef.current || modalLoading) {
      return;
    }

    isSubmittingRef.current = true;
    setModalLoading(true);
    setError(null);
    setMessage(null);

    // Create unique client request ID for idempotency
    const clientRequestId = crypto.randomUUID();
    const cardName = currentCard.card_name || currentCard.cards?.card_name || 'Card';
    const cardImage = currentCard.artwork_url || `/cards/${cardName}.webp`;

    console.log('[PHYSICAL CARD PURCHASE] Initiating immediate purchase:', {
      cardName,
      cost: physicalCardCost,
      clientRequestId
    });

    try {
      // Make the purchase API call immediately (like merch flow)
      const payload = {
        merchItemId: currentCard.id || currentCard.card_id || 'physical-card',
        quantity: 1,
        idempotencyKey: clientRequestId,
        paymentType: 'heartcoins' as const,
        isPhysicalCard: true,
        cardName: cardName,
        heartCoinCost: physicalCardCost
      };

      const response = await fetch('/api/merch/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log('[PHYSICAL CARD PURCHASE] Purchase response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        console.error('[PHYSICAL CARD PURCHASE] Purchase API error:', result);
        setError(result.error || result.message || 'Purchase failed. Please try again.');
        return;
      }

      // Handle array return shape from TABLE-returning RPC
      const normalizedResult = Array.isArray(result) ? result[0] : result;

      if (!normalizedResult?.success && !normalizedResult?.order_id) {
        console.error('[PHYSICAL CARD PURCHASE] Purchase returned failure:', normalizedResult);
        setError(normalizedResult?.message || 'Purchase failed. Please try again.');
        return;
      }

      const orderId = normalizedResult.order_id || result.order_id;

      console.log('[PHYSICAL CARD PURCHASE] Purchase successful! Order ID:', orderId);

      // Refresh profile to get updated HeartCoin balance
      await refreshProfile();

      // Store order info and show shipping form (like merch flow)
      setCompletedOrderId(orderId);
      setPurchasedItemInfo({
        name: `${cardName} (Physical Card)`,
        image: cardImage,
        cost: physicalCardCost
      });

      // Close the enlarged card view and confirmation
      setEnlargedCard(null);
      setShowEnlargedCardConfirm(false);

      // Show the shipping form
      setShowShippingForm(true);
      setValidationErrors({});
      setMessage(`Purchase complete! Please enter your shipping details.`);

    } catch (error: any) {
      console.error('[PHYSICAL CARD PURCHASE] Purchase error:', error);
      setError(error?.message || `Failed to purchase ${cardName}`);
    } finally {
      setModalLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const totalPages = Math.ceil((merchItems.length || 0) / itemsPerPage);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const handlePrevCard = () => {
    try { sfx.play('flip', 0.8); } catch {}
    setIsEnlargedCardFlipped(false);
    setSelectedPurchaseType(null);

    // If element is selected, use internal navigation
    if (selectedElement && displayCards.length > 0) {
      setInternalCardIndex(prev =>
        prev <= 0 ? displayCards.length - 1 : prev - 1
      );
    } else if (availableCards.length > 1 && onCardNavigation) {
      onCardNavigation('prev');
    }
  };

  const handleNextCard = () => {
    try { sfx.play('flip', 0.8); } catch {}
    setIsEnlargedCardFlipped(false);
    setSelectedPurchaseType(null);

    // If element is selected, use internal navigation
    if (selectedElement && displayCards.length > 0) {
      setInternalCardIndex(prev =>
        prev >= displayCards.length - 1 ? 0 : prev + 1
      );
    } else if (availableCards.length > 1 && onCardNavigation) {
      onCardNavigation('next');
    }
  };

  return (
    <HeartversePopup 
      isOpen={open} 
      onClose={onClose} 
      title="HeartCoins"
      onTitleClick={() => setShowHeartCoinDescription(!showHeartCoinDescription)}
    >
      <div className="relative flex flex-col flex-1 h-full">
        {/* Top Level Tabs */}
        <div className="flex border-b border-white/20 mb-6">
          <button
            onClick={() => handleSetActiveTab('earn')}
            onMouseEnter={() => {
              try { 
                sfx.setEnabled(true);
                sfx.play('hover', 0.3); 
              } catch {}
            }}
            className={`px-4 py-3 font-bold text-sm transition-all duration-200 ${
              activeTab === 'earn'
                ? 'text-[#4ECDC4] border-b-2 border-[#4ECDC4]'
                : 'text-white hover:text-white'
            }`}
            style={{
              textShadow: activeTab === 'earn' 
                ? '0 0 8px rgba(78,205,196,0.8), 0 0 15px rgba(78,205,196,0.6), 0 2px 4px rgba(0,0,0,0.8)' 
                : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
              backgroundColor: activeTab === 'earn' ? 'rgba(78,205,196,0.1)' : 'rgba(0,0,0,0.3)',
              borderRadius: '8px 8px 0 0'
            }}
          >
            EARN
          </button>
          <button
            onClick={() => handleSetActiveTab('use')}
            onMouseEnter={() => {
              try { 
                sfx.setEnabled(true);
                sfx.play('hover', 0.3); 
              } catch {}
            }}
            className={`px-4 py-3 font-bold text-sm transition-all duration-200 ${
              isUseMode
                ? 'text-[#4ECDC4] border-b-2 border-[#4ECDC4]'
                : 'text-white hover:text-white'
            }`}
            style={{
              textShadow: isUseMode
                ? '0 0 8px rgba(78,205,196,0.8), 0 0 15px rgba(78,205,196,0.6), 0 2px 4px rgba(0,0,0,0.8)' 
                : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
              backgroundColor: isUseMode ? 'rgba(78,205,196,0.1)' : 'rgba(0,0,0,0.3)',
              borderRadius: '8px 8px 0 0'
            }}
          >
            USE
          </button>
        </div>

        {/* Sub Tabs */}
        {activeTab === 'earn' && (
          <div className="flex border-b border-white/10 mb-4">
            <button 
              onClick={() => setActiveEarnTab('DAILY QUESTS')}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
              }}
              className={`px-4 py-2 font-bold text-xs rounded-t transition-all duration-200 ${
                activeEarnTab === 'DAILY QUESTS'
                  ? 'text-[#4ECDC4] border-b-2 border-[#4ECDC4] bg-[#4ECDC4]/10'
                  : 'text-white/60 hover:text-white/80 bg-black/20'
              }`}
            >
              DAILY QUESTS
            </button>
            <button 
              onClick={() => setActiveEarnTab('BONUS QUESTS')}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
              }}
              className={`px-4 py-2 font-bold text-xs rounded-t transition-all duration-200 ${
                activeEarnTab === 'BONUS QUESTS'
                  ? 'text-[#4ECDC4] border-b-2 border-[#4ECDC4] bg-[#4ECDC4]/10'
                  : 'text-white/60 hover:text-white/80 bg-black/20'
              }`}
            >
              BONUS QUESTS
            </button>
          </div>
        )}

        {isUseMode && (
          <div className="flex border-b border-white/10 mb-4">
            <button
              onClick={() => setActiveTab('merch')}
              onMouseEnter={() => {
                try { 
                  sfx.setEnabled(true);
                  sfx.play('hover', 0.3); 
                } catch {}
              }}
              className={`px-4 py-2 font-bold text-xs rounded-t transition-all duration-200 ${
                activeTab === 'merch'
                  ? 'text-[#FC54AF] border-b-2 border-[#FC54AF] bg-[#FC54AF]/10'
                  : 'text-white/60 hover:text-white/80 bg-black/20'
              }`}
            >
              MERCH
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              onMouseEnter={() => {
                try { 
                  sfx.setEnabled(true);
                  sfx.play('hover', 0.3); 
                } catch {}
              }}
              className={`px-4 py-2 font-bold text-xs rounded-t transition-all duration-200 ${
                activeTab === 'cards'
                  ? 'text-[#4ECDC4] border-b-2 border-[#4ECDC4] bg-[#4ECDC4]/10'
                  : 'text-white/60 hover:text-white/80 bg-black/20'
              }`}
            >
              CARDS
            </button>
          </div>
        )}

        {activeTab === 'earn' ? (
          <div className="flex flex-col flex-1 min-h-0 h-full">
            <div className="text-center mb-4">
              {showHeartCoinDescription ? (
                <div className="text-white/80 text-sm leading-relaxed space-y-2">
                  <p>HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
                  <p>Complete quests. Attend community events. Engage with the Heartverse.</p>
                  <p>Use your HeartCoins to unlock collectibles and cards, and deepen your place in the community.</p>
                </div>
              ) : (
                <p className="text-white/80 text-sm">HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
              )}
            </div>

            {/* Quest Content */}
            {activeEarnTab === 'DAILY QUESTS' ? (
              <div className="flex flex-col flex-1 w-full gap-3 min-h-0 h-full">
                {/* Element of the Day Quest */}
                <div className="w-full bg-black/20 rounded-lg p-4 border border-white/10 flex-1">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <img src={getElementalPlanetImage(elementOfDay || 'heart') || '/textures/planet_heart.webp'} alt={`${elementOfDay || 'heart'} element`} className="w-8 h-8 rounded-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-xl mb-1">1. Tap the Element of the Day</h3>
                        <p className="text-white/60 text-base leading-relaxed">Receive a random reward: HeartCoins, relics, or binder slot unlocks.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <span className="text-[#4ECDC4] text-xl flex items-center font-bold">
                        +1 <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-8 h-8 ml-2" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Journal Entry Quest */}
                <div className="w-full bg-black/20 rounded-lg p-4 border border-white/10 flex-1">
                  <div className="flex items-start justify-between w-full h-full">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-xl mb-1">2. Journal Entry of the Day</h3>
                        <p className="text-white/60 text-base leading-relaxed">Answer today's journal prompt to earn one HEART coin.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <button
                        onClick={() => {
                          if (onOpenJournal) {
                            onClose(); // Close the HeartCoin modal first
                            setTimeout(() => {
                              onOpenJournal(); // Then open the journal
                            }, 200); // Slightly longer delay to ensure modal closes completely
                          }
                        }}
                        className="px-6 py-3 text-sm rounded border transition-colors bg-rgba(255,255,255,0.1) text-white hover:bg-white/20 font-bold min-w-[160px]"
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          borderColor: 'rgba(255,255,255,0.6)',
                          textShadow: 'none',
                        }}
                      >
                        OPEN JOURNAL
                      </button>
                      <span className="text-[#4ECDC4] text-xl flex items-center font-bold">
                        +1 <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-8 h-8 ml-2" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {questsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#F2EF1D] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-white/60 text-sm">Loading quests...</p>
                  </div>
                ) : bonusQuests.length > 0 ? (
                  bonusQuests.map((quest, index) => (
                    <div key={quest.id} className="flex flex-col p-3 rounded-lg border border-white/30 bg-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-bold text-white">
                            {index + 1}. {quest.title}
                          </div>
                          <div className="text-xs text-white/80">
                            {quest.description}
                          </div>
                        </div>
                        <span className="text-sm flex items-center" style={{
                          color: isQuestCompleted(quest) ? '#666' : '#90EE90',
                          textShadow: isQuestCompleted(quest) ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90'
                        }}>
                          {quest.reward_notes || `+${quest.reward_heartcoins}`}
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6 ml-1" />
                        </span>
                      </div>
                      <button
                        onClick={!profile ? handleLoginToComplete : undefined}
                        disabled={!!profile && isQuestCompleted(quest)}
                        className="mt-3 px-3 py-2 text-xs rounded border transition-colors font-bold w-full hover:opacity-80"
                        style={{
                          background: !profile
                            ? 'rgba(78,205,196,0.2)'
                            : isQuestCompleted(quest)
                            ? 'rgba(0,255,0,0.2)'
                            : 'rgba(255,255,255,0.1)',
                          color: !profile
                            ? '#4ECDC4'
                            : isQuestCompleted(quest)
                            ? '#00FF00'
                            : '#FFFFFF',
                          borderColor: !profile
                            ? '#4ECDC4'
                            : isQuestCompleted(quest)
                            ? '#00FF00'
                            : 'rgba(255,255,255,0.6)',
                          textShadow: !profile
                            ? '0 0 8px rgba(78,205,196,0.5)'
                            : isQuestCompleted(quest)
                            ? '0 0 8px #00FF00, 0 0 16px #00FF00'
                            : 'none',
                          boxShadow: !profile
                            ? 'none'
                            : isQuestCompleted(quest)
                            ? '0 0 15px rgba(0,255,0,0.6), inset 0 0 10px rgba(0,255,0,0.2)'
                            : 'none',
                          cursor: !profile ? 'pointer' : 'default'
                        }}
                      >
                        {!profile
                          ? 'Log in to complete'
                          : isQuestCompleted(quest)
                          ? 'COMPLETED'
                          : 'COMPLETE'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/60 text-sm">No bonus quests available</p>
                  </div>
                )}

                {/* Secret Phrase Redemption */}
                <div className="mt-6 p-4 rounded-lg border border-white/20 bg-black/20">
                  <div className="text-sm font-bold text-white mb-3">Secret Phrase</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={secretPhrase}
                      onChange={(e) => {
                        setSecretPhrase(e.target.value);
                        setSecretPhraseMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !secretPhraseLoading && secretPhrase.trim()) {
                          handleRedeemSecretPhrase();
                        }
                      }}
                      disabled={secretPhraseLoading || !profile}
                      placeholder={profile ? "Enter secret phrase..." : "Log in to redeem"}
                      className="flex-1 px-3 py-2 text-sm rounded bg-black/30 border border-white/20 text-white placeholder-white/40 focus:border-[#4ECDC4] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleRedeemSecretPhrase}
                      disabled={secretPhraseLoading || !profile || !secretPhrase.trim()}
                      className="px-4 py-2 text-xs rounded border transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: secretPhraseLoading || !profile || !secretPhrase.trim()
                          ? 'rgba(100,100,100,0.3)'
                          : 'rgba(78,205,196,0.2)',
                        color: secretPhraseLoading || !profile || !secretPhrase.trim()
                          ? '#666'
                          : '#4ECDC4',
                        borderColor: secretPhraseLoading || !profile || !secretPhrase.trim()
                          ? 'rgba(100,100,100,0.6)'
                          : '#4ECDC4',
                      }}
                    >
                      {secretPhraseLoading ? 'CHECKING...' : 'CONFIRM'}
                    </button>
                  </div>
                  {secretPhraseMessage && (
                    <div className={`mt-2 text-xs font-bold ${
                      secretPhraseMessage.type === 'success'
                        ? 'text-[#90EE90]'
                        : 'text-red-400'
                    }`} style={{
                      textShadow: secretPhraseMessage.type === 'success'
                        ? '0 0 8px #90EE90, 0 0 16px #90EE90'
                        : 'none'
                    }}>
                      {secretPhraseMessage.text}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : isUseMode && activeTab === 'merch' ? (
          <div>
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                {message}
              </div>
            )}

            {/* USE: Description toggle (exactly matches EARN copy) */}
            <div className="text-center mb-4">
              {showHeartCoinDescription ? (
                <div className="text-white/80 text-sm leading-relaxed space-y-2">
                  <p>HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
                  <p>Complete quests. Attend community events. Engage with the Heartverse.</p>
                  <p>Use your HeartCoins to unlock collectibles and cards, and deepen your place in the community.</p>
                </div>
              ) : (
                <p className="text-white/80 text-sm">HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
              )}
            </div>
            
            {/* Store Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
          {merchLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="w-8 h-8 border-2 border-[#F2EF1D] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-white/60 text-sm">Loading merch items...</p>
            </div>
          ) : merchItems.length > 0 ? (
            merchItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((item, index) => (
            <div key={index} className="text-center space-y-4 pt-4 px-4 pb-0 bg-black/20 rounded-lg transition-all duration-300">
              <h3 className="text-lg font-bold text-white tracking-wider">
                {item.name.toUpperCase()}
              </h3>
              
              {/* Item Images */}
              <div className="relative h-48 w-full flex items-center justify-center">
                <img
                  src={item.image_url || '/store/default.webp'}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => {
                    // Convert database item to StoreItem format for modal
                    const storeItem = {
                      name: item.name,
                      image: item.image_url || '/store/default.webp',
                      image2: (item as any).slug === 'beanie' ? ((item as any).profile_url_2 || (item as any).secondary_image_url) : (item as any).secondary_image_url,
                      stripeUrl: item.stripe_url || '',
                      description: item.description || '',
                      cost: item.price_usd || 0,
                      heartCoin: item.price_heartcoins || 0,
                      merch_item_id: item.id
                    };
                    setEnlargedItem(storeItem);
                    setEnlargedImageIndex(0);
                  }}
                />
                {item.secondary_image_url && (
                  <img
                    src={item.secondary_image_url}
                    alt={`${item.name} alternative view`}
                    className="max-h-full max-w-full object-contain rounded-lg absolute top-0 left-0 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    onClick={() => {
                      const storeItem = {
                        name: item.name,
                        image: item.image_url || '/store/default.webp',
                        image2: (item as any).slug === 'beanie' ? ((item as any).profile_url_2 || (item as any).secondary_image_url) : (item as any).secondary_image_url,
                        stripeUrl: item.stripe_url || '',
                        description: item.description || '',
                        cost: item.price_usd || 0,
                        heartCoin: item.price_heartcoins || 0,
                        merch_item_id: item.id
                      };
                      setEnlargedItem(storeItem);
                      setEnlargedImageIndex(0);
                    }}
                  />
                )}
              </div>
              
              {/* Description - Hidden for cleaner look */}
              {false && (
                <div className="text-white/80 text-xs leading-relaxed px-2 break-words">
                  {item.description?.toUpperCase()}
                </div>
              )}
              
              {/* Price and Heart Coins */}
              <div className="flex items-center justify-between w-full px-2">
                {/* Left side - User heart coins */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-white/80">USER</span>
                  <div className="flex items-center gap-1">
                    <img
                      src="/elements/heart-coin.webp"
                      alt="Heart Coin"
                      className="w-4 h-4 object-contain"
                      style={{
                        filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 2px #FC54AF)'
                      }}
                    />
                    <span className="text-sm font-bold text-[#F2EF1D]">{profile?.heartcoin_balance || 0}</span>
                  </div>
                </div>

                {/* Right side - Cost */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-white/80">COST</span>
                  <div className="flex items-center gap-1">
                    <img
                      src="/elements/heart-coin.webp"
                      alt="Heart Coin"
                      className="w-4 h-4 object-contain"
                      style={{
                        filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 2px #FC54AF)'
                      }}
                    />
                    <span className="text-sm font-bold text-[#F2EF1D]">{item.price_heartcoins || 0}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              {item.stripe_url && (
                <div className="flex justify-center">
                  <button
                    onClick={() => handlePurchase(item.stripe_url)}
                    onMouseEnter={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                    }}
                    className="px-3 py-2 rounded-lg font-bold text-sm text-green-400 hover:bg-green-500/20 hover:scale-105 transition-all duration-200"
                  >
                    PAY WITH ${item.price_usd ? (item.price_usd % 1 === 0 ? item.price_usd.toFixed(0) : item.price_usd.toFixed(1)) : '0'}
                  </button>
                </div>
              )}
              
              {/* Add to Collection Button */}
              <button
                onClick={() => {
                  // Convert database item to StoreItem format
                  const storeItem = {
                    name: item.name,
                    image: item.image_url || '/store/default.webp',
                    image2: item.secondary_image_url,
                    stripeUrl: item.stripe_url || '',
                    description: item.description || '',
                    cost: item.price_usd || 0,
                    heartCoin: item.price_heartcoins || 0,
                    merch_item_id: item.id
                  };
                  handleHeartCoinPurchaseConfirm(storeItem);
                }}
                onMouseEnter={() => {
                  if (!modalLoading && profile && (profile.heartcoin_balance || 0) >= (item.price_heartcoins || 0)) {
                    try { sfx.play('hover', 0.3); } catch {}
                  }
                }}
                disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < (item.price_heartcoins || 0)}
                className={`w-full py-2 px-4 rounded-lg font-bold text-xs transition-all duration-200 ${
                  modalLoading || !profile || (profile.heartcoin_balance || 0) < (item.price_heartcoins || 0)
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)]'
                }`}
                style={
                  modalLoading || !profile || (profile.heartcoin_balance || 0) < (item.price_heartcoins || 0)
                    ? undefined
                    : {
                        boxShadow: '0 0 15px rgba(242,239,29,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                      }
                }
              >
                {modalLoading ? 'Purchasing...' : 'Add to Collection'}
              </button>
            </div>
          ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-white/60 text-sm">No merch items available</p>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={handlePrevPage}
              onMouseEnter={() => {
                if (currentPage !== 0) {
                  try { sfx.play('hover', 0.3); } catch {}
                }
              }}
              disabled={currentPage === 0}
              className={`p-3 rounded-full border-2 transition-all duration-300 ${
                currentPage === 0
                  ? 'border-white/20 text-white/30 cursor-not-allowed'
                  : 'border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black hover:shadow-[0_0_15px_rgba(242,239,29,0.6)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentPage
                      ? 'bg-[#F2EF1D] shadow-[0_0_8px_rgba(242,239,29,0.8)]'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextPage}
              onMouseEnter={() => {
                if (currentPage !== totalPages - 1) {
                  try { sfx.play('hover', 0.3); } catch {}
                }
              }}
              disabled={currentPage === totalPages - 1}
              className={`p-3 rounded-full border-2 transition-all duration-300 ${
                currentPage === totalPages - 1
                  ? 'border-white/20 text-white/30 cursor-not-allowed'
                  : 'border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D] hover:text-black hover:shadow-[0_0_15px_rgba(242,239,29,0.6)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    ) : isUseMode && activeTab === 'cards' ? (
      <div className="flex flex-col h-full overflow-hidden">
        {/* USE: Description toggle (exactly matches EARN copy) */}
        <div className="text-center mb-4 flex-shrink-0">
          {showHeartCoinDescription ? (
            <div className="text-white/80 text-sm leading-relaxed space-y-2">
              <p>HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
              <p>Complete quests. Attend community events. Engage with the Heartverse.</p>
              <p>Use your HeartCoins to unlock collectibles and cards, and deepen your place in the community.</p>
            </div>
          ) : (
            <p className="text-white/80 text-sm">HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting, and showing up.</p>
          )}
        </div>
        {/* Show card view if an element is selected */}
        {selectedElement !== null ? (
          <div className="relative flex flex-col flex-1 overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex items-center gap-3 mb-6 relative z-30 flex-shrink-0">
              {/* Back Button */}
              <button
                onClick={handleBackToElementSelection}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(78,205,196,0.2)',
                  border: '2px solid #4ECDC4',
                  color: '#4ECDC4',
                  boxShadow: '0 0 10px rgba(78,205,196,0.4)',
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Card Name Dropdown - shows cards in selected element */}
              <div className="flex-1">
                <select
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-white/40"
                  value={displayCardIndex}
                  onChange={(e) => {
                    const newIndex = parseInt(e.target.value, 10);
                    setInternalCardIndex(newIndex);
                  }}
                >
                  {displayCards.map((card, index) => (
                    <option key={card.id || index} value={index}>
                      {card.card_name || card.cards?.card_name || `Card ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card Display with Arrows */}
            <div className="flex items-center justify-center gap-2" style={{ minHeight: '350px' }}>
              {/* LEFT ARROW */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevCard(); }}
                onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(78,205,196,0.2)',
                  border: '2px solid #4ECDC4',
                  color: '#4ECDC4',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(78,205,196,0.5), 0 0 30px rgba(78,205,196,0.3)',
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Current Card */}
              <div className="text-center flex-1 max-w-[280px]">
                <div
                  className="relative w-64 h-80 mx-auto cursor-pointer"
                  onClick={() => {
                    setEnlargedCard(displayCards[displayCardIndex]);
                    setIsEnlargedCardFlipped(false);
                  }}
                  style={{ perspective: '1000px' }}
                >
                  {selectedPurchaseType === null ? (
                    <img
                      src={displayCards[displayCardIndex]?.artwork_url || `/cards/${displayCards[displayCardIndex]?.card_name || displayCards[displayCardIndex]?.cards?.card_name}.webp`}
                      alt={displayCards[displayCardIndex]?.card_name || displayCards[displayCardIndex]?.cards?.card_name || 'Card'}
                      className="w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain hover:scale-105 transition-transform duration-300"
                      style={{ filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))' }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl flex flex-col items-center justify-center gap-4 bg-black/60">
                      <div className="text-center">
                        <div className="text-white/80 text-xs mb-2">Your Balance</div>
                        <div className="flex items-center justify-center gap-2 text-white text-xl font-bold">
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6" />
                          <span>{profile?.heartcoin_balance ?? 0}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-white/80 text-xs mb-2">Cost ({selectedPurchaseType === 'digital' ? 'Digital' : 'Physical'})</div>
                        <div className="flex items-center justify-center gap-2 text-[#4ECDC4] text-xl font-bold">
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6" />
                          <span>{selectedPurchaseType === 'digital' ? 5 : 15}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const type = selectedPurchaseType;
                            if (!type) return;
                            try { sfx.play('hover', 0.3); } catch {}
                            handleCardPurchase(type);
                          }}
                          className="px-4 py-2 rounded bg-[#4ECDC4] text-black font-bold text-xs hover:opacity-90"
                          disabled={selectedPurchaseType === 'digital'
                            ? (modalLoading || !profile || (profile.heartcoin_balance || 0) < 5)
                            : (modalLoading || !profile || (profile.heartcoin_balance || 0) < 15)}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPurchaseType(null); }}
                          className="px-4 py-2 rounded bg-white/10 border border-white/30 text-white font-bold text-xs hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="mt-4 space-y-6">
                  <p className="text-white/60 text-sm text-center">
                    {displayCardIndex + 1} of {displayCards.length}
                  </p>

                  {/* Card Description */}
                  <div className="text-center px-4">
                    <p className="text-white/80 text-sm leading-relaxed max-w-md mx-auto">
                      {displayCards[displayCardIndex]?.card_description ||
                       displayCards[displayCardIndex]?.cards?.card_description ||
                       "Lightning is the electric jolt of feeling alive. These tracks buzz. You move fast, crash hard, and maybe regret nothing."}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT ARROW - White Neon */}
              <button
                onClick={(e) => { e.stopPropagation(); handleNextCard(); }}
                onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  border: '2px solid white',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.5), 0 0 45px rgba(255,255,255,0.3)',
                  filter: 'drop-shadow(0 0 8px white)',
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Digital and Physical Buttons under the card */}
            <div className="mt-6">
              <div className="flex gap-4 w-full max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                      setSelectedPurchaseType(prev => prev === 'digital' ? null : 'digital');
                    }}
                    onMouseEnter={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                    }}
                    disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < 5}
                    className={`flex-1 px-8 py-4 rounded-lg font-bold text-sm transition-all duration-200 ${
                      modalLoading || !profile || (profile.heartcoin_balance || 0) < 5
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-[#4ECDC4] to-[#45b7b8] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(78,205,196,0.6)]'
                    }`}
                    style={
                      modalLoading || !profile || (profile.heartcoin_balance || 0) < 5
                        ? undefined
                        : {
                            boxShadow: '0 0 15px rgba(78,205,196,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                          }
                    }
                  >
                    DIGITAL (5 ♡)
                  </button>
                  
                  <button
                    onClick={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                      setSelectedPurchaseType(prev => prev === 'physical' ? null : 'physical');
                    }}
                    onMouseEnter={() => {
                      try { sfx.play('hover', 0.3); } catch {}
                    }}
                    disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < 15}
                    className={`flex-1 px-8 py-4 rounded-lg font-bold text-sm transition-all duration-200 ${
                      modalLoading || !profile || (profile.heartcoin_balance || 0) < 15
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-[#FC54AF] to-[#e91e63] text-white hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(252,84,175,0.6)]'
                    }`}
                    style={
                      modalLoading || !profile || (profile.heartcoin_balance || 0) < 15
                        ? undefined
                        : {
                            boxShadow: '0 0 15px rgba(252,84,175,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -4px 8px rgba(0,0,0,0.2)'
                          }
                    }
                  >
                    PHYSICAL (15 ♡)
                  </button>
              </div>
            </div>

            {/* Card Navigation Indicators */}
            {displayCards.length > 0 && (
              <div className="flex justify-center mt-6 gap-2">
                {displayCards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (selectedElement) {
                        setInternalCardIndex(index);
                      } else if (onCardNavigation) {
                        const direction = index > currentCardIndex ? 'next' : 'prev';
                        const steps = Math.abs(index - currentCardIndex);
                        for (let i = 0; i < steps; i++) {
                          setTimeout(() => onCardNavigation(direction), i * 100);
                        }
                      }
                    }}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === displayCardIndex
                        ? 'bg-[#F2EF1D] shadow-[0_0_8px_rgba(242,239,29,0.8)]'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Element Selection View */
          <div>
            <div className="text-center mb-6">
              <p className="text-white text-lg font-bold mb-6" style={{
                textShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 15px rgba(255,255,255,0.4)'
              }}>
                SELECT AN ELEMENT TO VIEW CARDS
              </p>
            </div>

            {/* Four Element Containers */}
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              {/* Lightning Element */}
              <div
                className="relative group cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleElementSelect('LIGHTNING'); }}
                onMouseEnter={() => {
                  try { sfx.play('change-channel', 0.5); } catch {}
                }}
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full border-2 border-yellow-500/40 flex items-center justify-center transition-all duration-300 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] hover:scale-105">
                  <img
                    src="/elements/lightning.webp"
                    alt="Lightning"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-yellow-400 font-bold text-sm">{getElementCardCount('LIGHTNING')}</span>
                </div>
              </div>

              {/* Darkness Element */}
              <div
                className="relative group cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleElementSelect('DARKNESS'); }}
                onMouseEnter={() => {
                  try { sfx.play('change-channel', 0.5); } catch {}
                }}
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-900/30 to-black/40 rounded-full border-2 border-purple-600/40 flex items-center justify-center transition-all duration-300 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-105">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-600 bg-gradient-to-br from-transparent to-purple-900/40" />
                </div>
                <div className="text-center mt-2">
                  <span className="text-purple-400 font-bold text-sm">{getElementCardCount('DARKNESS')}</span>
                </div>
              </div>

              {/* Water Element */}
              <div
                className="relative group cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleElementSelect('WATER'); }}
                onMouseEnter={() => {
                  try { sfx.play('change-channel', 0.5); } catch {}
                }}
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-full border-2 border-blue-400/40 flex items-center justify-center transition-all duration-300 hover:border-blue-300 hover:shadow-[0_0_20px_rgba(0,191,255,0.6)] hover:scale-105">
                  <img
                    src="/elements/water.webp"
                    alt="Water"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-blue-400 font-bold text-sm">{getElementCardCount('WATER')}</span>
                </div>
              </div>

              {/* Heart Element */}
              <div
                className="relative group cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleElementSelect('HEART'); }}
                onMouseEnter={() => {
                  try { sfx.play('change-channel', 0.5); } catch {}
                }}
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-full border-2 border-pink-500/40 flex items-center justify-center transition-all duration-300 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(255,105,180,0.6)] hover:scale-105">
                  <img
                    src="/elements/heart.webp"
                    alt="Heart"
                    className="w-12 h-12 object-contain"
                    draggable={false}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-pink-400 font-bold text-sm">{getElementCardCount('HEART')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    ) : null}
      </div>

      {/* Enlarged Item Modal */}
      {enlargedItem && (
        <div 
          className="fixed inset-0 z-[2147483647] bg-black bg-opacity-90"
          onClick={() => {
            setEnlargedItem(null);
            setEnlargedImageIndex(0);
          }}
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-hidden"
              style={{
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setEnlargedItem(null);
                  setEnlargedImageIndex(0);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 z-10"
              >
                ×
              </button>

              {/* PAY WITH Heartcoin Button - Above Image */}
              <div className="mb-4 flex justify-center">
                <button
                  onClick={() => {
                    handleHeartCoinPurchaseConfirm(enlargedItem);
                    setEnlargedItem(null);
                    setEnlargedImageIndex(0);
                  }}
                  onMouseEnter={() => {
                    if (!modalLoading && profile && (profile.heartcoin_balance || 0) >= (enlargedItem.heartCoin || 0)) {
                      try { sfx.play('hover', 0.3); } catch {}
                    }
                  }}
                  disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < (enlargedItem.heartCoin || 0)}
                  className={`flex items-center gap-2 py-3 px-6 rounded-lg font-bold text-sm transition-all duration-200 ${
                    modalLoading || !profile || (profile.heartcoin_balance || 0) < (enlargedItem.heartCoin || 0)
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)]'
                  }`}
                  style={
                    modalLoading || !profile || (profile.heartcoin_balance || 0) < (enlargedItem.heartCoin || 0)
                      ? undefined
                      : {
                          boxShadow: '0 0 15px rgba(242,239,29,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                        }
                  }
                >
                  <span>PAY WITH</span>
                  <img
                    src="/elements/heart-coin.webp"
                    alt="Heart Coin"
                    className="w-5 h-5 object-contain"
                    style={{
                      filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                    }}
                  />
                  <span>{enlargedItem.heartCoin || 0}</span>
                </button>
              </div>

              {/* Image Content */}
              <div className="flex items-center justify-center w-full h-full">
                <div className="relative max-w-full max-h-full">
                  {(() => {
                    const images = [enlargedItem.image, enlargedItem.image2].filter(Boolean);
                    const currentImage = images[enlargedImageIndex] || enlargedItem.image;
                    
                    return (
                      <>
                        <img
                          src={currentImage}
                          alt=""
                          className="max-w-full max-h-[70vh] object-contain rounded-lg transition-transform duration-500"
                          style={{
                            animation: 'merchPulse 2.5s ease-in-out infinite',
                            transform: enlargedImageIndex === 1 && enlargedItem.image2 ? 'rotateY(180deg) scaleX(-1)' : 'rotateY(0deg)',
                          }}
                        />
                        
                        {/* Navigation arrows - only show if multiple images */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => {
                                try { sfx.play('flip', 0.8); } catch {}
                                setEnlargedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={() => {
                                try { sfx.play('flip', 0.8); } catch {}
                                setEnlargedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            
                            {/* Image indicators */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                              {images.map((_, index) => (
                                <div
                                  key={index}
                                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    index === enlargedImageIndex
                                      ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                      : 'bg-white/30'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Card Modal */}
      {enlargedCard && (
        <div
          className="fixed inset-0 z-[2147483647] bg-black bg-opacity-90"
          onClick={() => {
            setEnlargedCard(null);
            setIsEnlargedCardFlipped(false);
            setCardRotation(0); // Reset rotation when closing
            setShowEnlargedCardConfirm(false); // Reset confirmation state
          }}
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              style={{
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setEnlargedCard(null);
                  setIsEnlargedCardFlipped(false);
                  setCardRotation(0); // Reset rotation when closing
                  setShowEnlargedCardConfirm(false); // Reset confirmation state
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 z-10"
              >
                ×
              </button>

              {/* Digital Purchase Button - ABOVE card */}
              {!showEnlargedCardConfirm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle digital purchase (use existing flow)
                    setSelectedPurchaseType('digital');
                    handleCardPurchase('digital');
                  }}
                  disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < 5}
                  className={`w-full max-w-md mx-auto py-2 px-8 rounded-lg flex items-center justify-center gap-2 text-white font-bold transition-all duration-200 shadow-lg mb-3 flex-shrink-0 ${
                    modalLoading || !profile || (profile.heartcoin_balance || 0) < 5
                      ? 'bg-gray-500 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/30'
                  }`}
                  style={{
                    boxShadow: modalLoading || !profile || (profile.heartcoin_balance || 0) < 5 ? undefined : '0 0 15px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <img src="/heartcoin.webp" alt="HeartCoin" className="w-5 h-5" />
                  <span>5 HEARTCOIN</span>
                  <span className="text-white/80">|</span>
                  <span className="text-cyan-200">DIGITAL</span>
                </button>
              )}

              {/* Card Image */}
              <div className="flex items-center justify-center w-full flex-1 min-h-0 overflow-hidden">
                <div className="relative max-w-full max-h-full">
                  <div
                    className="relative w-full"
                    style={{
                      height: '45vh',
                      maxWidth: '350px'
                    }}
                  >
                    {/* TiltSpinCard wrapper for 360° drag-to-spin interaction */}
                    <TiltSpinCard
                      className="relative w-full h-full"
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
                        src={displayCards[displayCardIndex]?.artwork_url || `/cards/${displayCards[displayCardIndex]?.card_name || displayCards[displayCardIndex]?.cards?.card_name}.webp`}
                        alt={displayCards[displayCardIndex]?.card_name || displayCards[displayCardIndex]?.cards?.card_name || 'Card'}
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
                    
                    {/* Navigation arrows - only show if multiple cards in current view */}
                    {displayCards.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevCard();
                          }}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-[#4ECDC4]/20 hover:bg-[#4ECDC4]/40 border-2 border-[#4ECDC4] rounded-full flex items-center justify-center text-[#4ECDC4] hover:text-white transition-all duration-200 shadow-[0_0_15px_rgba(78,205,196,0.4)]"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextCard();
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 border-2 border-white rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                          style={{
                            boxShadow: '0 0 15px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4), 0 0 45px rgba(255,255,255,0.2)',
                          }}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        {/* Card indicators */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                          {displayCards.map((_, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                index === displayCardIndex
                                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                  : 'bg-white/30'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical Purchase Button - BELOW card */}
              <div className="mt-3 flex-shrink-0">
                {!showEnlargedCardConfirm ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      try { sfx.play('click', 0.4); } catch {}
                      setShowEnlargedCardConfirm(true);
                    }}
                    disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < 20}
                    className={`w-full max-w-md mx-auto py-2 px-8 rounded-lg flex items-center justify-center gap-2 text-white font-bold transition-all duration-200 shadow-lg ${
                      modalLoading || !profile || (profile.heartcoin_balance || 0) < 20
                        ? 'bg-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-500/30'
                    }`}
                    style={{
                      boxShadow: modalLoading || !profile || (profile.heartcoin_balance || 0) < 20 ? undefined : '0 0 15px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <img src="/heartcoin.webp" alt="HeartCoin" className="w-5 h-5" />
                    <span>20 HEARTCOIN</span>
                    <span className="text-white/80">|</span>
                    <span className="text-amber-200">PHYSICAL</span>
                  </button>
                ) : (
                  /* Confirmation UI for physical card purchase */
                  <div className="bg-black/60 border border-amber-500/50 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <div className="text-amber-200 text-sm font-bold mb-2">CONFIRM PHYSICAL CARD PURCHASE</div>
                      <div className="text-white/80 text-xs">{displayCards[displayCardIndex]?.card_name || 'Card'}</div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div className="text-center flex-1">
                        <div className="text-white/60 text-xs mb-1">Your Balance</div>
                        <div className="flex items-center justify-center gap-2">
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-5 h-5" />
                          <span className="text-white font-bold">{profile?.heartcoin_balance ?? 0}</span>
                        </div>
                      </div>
                      <div className="text-white/40 text-lg">→</div>
                      <div className="text-center flex-1">
                        <div className="text-white/60 text-xs mb-1">Cost</div>
                        <div className="flex items-center justify-center gap-2">
                          <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-5 h-5" />
                          <span className="text-amber-300 font-bold">20</span>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-400 text-xs text-center mb-3 bg-red-500/10 border border-red-500/30 rounded p-2">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          try { sfx.play('close', 0.3); } catch {}
                          setShowEnlargedCardConfirm(false);
                          setError(null);
                        }}
                        className="flex-1 py-2 px-4 rounded-lg font-bold text-sm border border-white/30 text-white/80 hover:bg-white/10 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          try { sfx.play('click', 0.5); } catch {}
                          handlePhysicalCardPurchaseConfirm();
                        }}
                        disabled={modalLoading}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-200 ${
                          modalLoading
                            ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                        }`}
                        style={{
                          boxShadow: modalLoading ? undefined : '0 0 15px rgba(245, 158, 11, 0.4)',
                        }}
                      >
                        {modalLoading ? 'Processing...' : 'CONFIRM'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Shipping Information Form Modal */}
      {showShippingForm && (completedOrderId && purchasedItemInfo || pendingPurchase) && (
        <div
          className="fixed inset-0 z-[2147483648] bg-black bg-opacity-90"
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full my-8"
              style={{
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
              }}
            >
              <div className="text-center space-y-6">
                {/* Show purchased item image for new flow */}
                {purchasedItemInfo && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#4ECDC4]/20 rounded-full blur-xl" />
                      <img
                        src={purchasedItemInfo.image}
                        alt={purchasedItemInfo.name}
                        className="w-24 h-24 object-contain relative z-10"
                      />
                    </div>
                    <div className="mt-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                      <span className="text-green-400 text-xs font-bold">PURCHASE COMPLETE</span>
                    </div>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-4">
                  {purchasedItemInfo ? 'Enter Shipping Details' : 'Shipping Information'}
                </h3>
                <p className="text-white/80 text-sm">
                  {purchasedItemInfo
                    ? <>Your <strong>{purchasedItemInfo.name}</strong> is ready! Please provide your shipping address.</>
                    : <>Please provide your shipping details for: <strong>{pendingPurchase?.name}</strong> ({pendingPurchase?.cost} HeartCoins)</>
                  }
                </p>
                
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-white text-xs font-bold mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.fullName}
                      onChange={(e) => {
                        setShippingInfo(prev => ({ ...prev, fullName: e.target.value }));
                        if (validationErrors.fullName) {
                          setValidationErrors(prev => ({ ...prev, fullName: '' }));
                        }
                      }}
                      className={`w-full p-2 rounded bg-black/20 border text-white text-sm focus:border-[#4ECDC4] focus:outline-none ${
                        validationErrors.fullName ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {validationErrors.fullName && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white text-xs font-bold mb-2">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={shippingInfo.addressLine1}
                      onChange={(e) => {
                        setShippingInfo(prev => ({ ...prev, addressLine1: e.target.value }));
                        if (validationErrors.addressLine1) {
                          setValidationErrors(prev => ({ ...prev, addressLine1: '' }));
                        }
                      }}
                      className={`w-full p-2 rounded bg-black/20 border text-white text-sm focus:border-[#4ECDC4] focus:outline-none ${
                        validationErrors.addressLine1 ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Street address"
                    />
                    {validationErrors.addressLine1 && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.addressLine1}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white text-xs font-bold mb-2">Address Line 2</label>
                    <input
                      type="text"
                      value={shippingInfo.addressLine2}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, addressLine2: e.target.value }))}
                      className="w-full p-2 rounded bg-black/20 border border-white/20 text-white text-sm focus:border-[#4ECDC4] focus:outline-none"
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-white text-xs font-bold mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.city}
                        onChange={(e) => {
                          setShippingInfo(prev => ({ ...prev, city: e.target.value }));
                          if (validationErrors.city) {
                            setValidationErrors(prev => ({ ...prev, city: '' }));
                          }
                        }}
                        className={`w-full p-2 rounded bg-black/20 border text-white text-sm focus:border-[#4ECDC4] focus:outline-none ${
                          validationErrors.city ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="City"
                      />
                      {validationErrors.city && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white text-xs font-bold mb-2">State *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.state}
                        onChange={(e) => {
                          setShippingInfo(prev => ({ ...prev, state: e.target.value }));
                          if (validationErrors.state) {
                            setValidationErrors(prev => ({ ...prev, state: '' }));
                          }
                        }}
                        className={`w-full p-2 rounded bg-black/20 border text-white text-sm focus:border-[#4ECDC4] focus:outline-none ${
                          validationErrors.state ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="State"
                      />
                      {validationErrors.state && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.state}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-white text-xs font-bold mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.zip}
                        onChange={(e) => {
                          setShippingInfo(prev => ({ ...prev, zip: e.target.value }));
                          if (validationErrors.zip) {
                            setValidationErrors(prev => ({ ...prev, zip: '' }));
                          }
                        }}
                        className={`w-full p-2 rounded bg-black/20 border text-white text-sm focus:border-[#4ECDC4] focus:outline-none ${
                          validationErrors.zip ? 'border-red-500' : 'border-white/20'
                        }`}
                        placeholder="ZIP"
                      />
                      {validationErrors.zip && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.zip}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white text-xs font-bold mb-2">Country *</label>
                      <select
                        required
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full p-2 rounded bg-black/20 border border-white/20 text-white text-sm focus:border-[#4ECDC4] focus:outline-none"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowShippingForm(false);
                        setSelectedItem(null);
                        setPendingPurchase(null);
                        setCompletedOrderId(null);
                        setPurchasedItemInfo(null);
                        setValidationErrors({});
                        setMessage(null);
                        setError(null);
                        isSubmittingRef.current = false;
                      }}
                      className="flex-1 py-2 px-4 rounded-lg font-bold text-sm border border-gray-500 text-gray-300 hover:bg-gray-800 transition-all duration-200"
                    >
                      {purchasedItemInfo ? 'Skip for Now' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPurchase}
                      disabled={modalLoading}
                      className="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-200 bg-gradient-to-r from-[#4ECDC4] to-[#45b7b8] text-black hover:scale-[1.02] disabled:bg-gray-500 disabled:text-gray-300"
                      style={{
                        boxShadow: modalLoading ? undefined : '0 0 15px rgba(78, 205, 196, 0.4)'
                      }}
                    >
                      {modalLoading ? 'Processing...' : (purchasedItemInfo ? 'Confirm Shipping' : 'Confirm Purchase')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </HeartversePopup>
  );
}
