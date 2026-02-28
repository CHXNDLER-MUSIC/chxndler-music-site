"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardTier, ProfileTier, isCardLocked, getCardGateState, getTierDisplayName } from "@/types/card";
import type { CardGateState } from "@/utils/cardGating";
import PopoutShell from "@/components/PopoutShell";
import { triggerCardCelebration } from "@/utils/cardCelebration";
import { suppressBadgeCelebrations } from "@/utils/celebrationQueue";
import { supabaseBrowser } from "@/lib/supabase-browser";
import TiltSpinCard from "@/components/TiltSpinCard";
import { useUserCards } from "@/hooks/useUserCards";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { useBinderSlots, BinderSlot, TOTAL_SLOTS } from "@/hooks/useBinderSlots";
import { isValidUuid, fetchStarterCardId } from "@/lib/cardUtils";

// Guest mode defaults (when user is not authenticated)
const GUEST_DEFAULT_SLOTS = 2;

// Add keyframes for pulsing animation
const pulseKeyframes = `
  @keyframes pulseGlow {
    0% {
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    100% {
      box-shadow: 0 4px 25px rgba(0,0,0,0.4), 0 0 10px rgba(255,255,255,0.1);
    }
  }
  
  @keyframes tiltPulse {
    0%, 100% { 
      transform: rotateX(9deg) rotateY(-9deg) scale(1);
      filter: saturate(1.06) contrast(1.06) brightness(1.04) drop-shadow(0 0 18px rgba(25,227,255,0.55)) drop-shadow(0 0 36px rgba(25,227,255,0.35));
    }
    50% { 
      transform: rotateX(13deg) rotateY(-13deg) scale(1.04);
      filter: saturate(1.1) brightness(1.08) contrast(1.08) drop-shadow(0 0 26px rgba(25,227,255,1)) drop-shadow(0 0 52px rgba(25,227,255,0.8)) drop-shadow(0 0 96px rgba(25,227,255,0.6));
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-8px) rotate(0.5deg);
    }
    66% {
      transform: translateY(4px) rotate(-0.5deg);
    }
  }

  @keyframes cardPulse {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  @keyframes slotUnlock {
    0% {
      transform: scale(1);
      box-shadow: 0 0 3px rgba(255,105,180,0.1);
      border-color: rgba(255,255,255,0.05);
    }
    30% {
      transform: scale(1.15);
      box-shadow: 0 0 30px rgba(255,105,180,0.9), 0 0 60px rgba(255,105,180,0.6), 0 0 90px rgba(147,51,234,0.4);
      border-color: rgba(255,105,180,0.8);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 25px rgba(255,105,180,0.8), 0 0 50px rgba(255,105,180,0.5);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 8px rgba(255,105,180,0.3), 0 0 14px rgba(255,105,180,0.15);
      border-color: rgba(255,255,255,0.1);
    }
  }

  @keyframes unlockShimmer {
    0% {
      background-position: -100% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes guestEmptySlotGlow {
    0%, 100% {
      box-shadow: 0 0 8px rgba(255,105,180,0.3), 0 0 16px rgba(255,105,180,0.15);
      border-color: rgba(255,105,180,0.4);
    }
    50% {
      box-shadow: 0 0 16px rgba(255,105,180,0.6), 0 0 28px rgba(255,105,180,0.35), 0 0 40px rgba(147,51,234,0.2);
      border-color: rgba(255,105,180,0.7);
    }
  }
`;

type Props = {
  open: boolean;
  onClose: () => void;
  preselectedCard?: string | null;
  preselectedElement?: string | null;
  pulsingCards?: boolean;
  onOpenHeartCoin?: () => void;
};

// TypeScript interfaces for shipping and orders
interface ShippingInfo {
  fullName: string;
  streetAddress: string;
  apartmentUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PhysicalCardOrder {
  id?: string;
  user_id: string;
  card_key: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  cost_heartcoins: number;
  status: string;
  created_at?: string;
}

export default function BinderModal({ open, onClose, preselectedCard, preselectedElement, pulsingCards = false, onOpenHeartCoin }: Props) {
  const { profile, updateProfile, refreshProfile } = useProfile();
  const { cards: ownedCards } = useUserCards(profile?.id);
  const {
    slots: binderSlots,
    refresh: refreshBinderSlots,
    totalOwnedCards,
    unlockedSlotsCount,
    cardsInSlots,
    hasEmptySlot,
    firstEmptySlotIndex,
    displayUnlockedSlots
  } = useBinderSlots(profile?.id);
  const [cardOpen, setCardOpen] = useState(false);
  const [showFullCollection, setShowFullCollection] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('All');
  const [selectedCardName, setSelectedCardName] = useState<string>('All');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<{name: string, image: string, rarity: string, element: string} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardRotation, setCardRotation] = useState(0);
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [hoveredLockedSlot, setHoveredLockedSlot] = useState<number | null>(null);
  const [newlyUnlockedSlots, setNewlyUnlockedSlots] = useState<Set<number>>(new Set());
  const [prevUnlockedCount, setPrevUnlockedCount] = useState<number>(displayUnlockedSlots);
  const [starterCardId, setStarterCardId] = useState<string | null>(null);

  // Fetch the canonical starter card ID on mount
  useEffect(() => {
    fetchStarterCardId().then((id) => {
      if (id) setStarterCardId(id);
    });
  }, []);

  // Binder pagination constants - use fixed TOTAL_SLOTS
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(TOTAL_SLOTS / PAGE_SIZE));

  // Debug: Log card counts to identify discrepancy
  useEffect(() => {
    if (open && profile?.id) {
      const assignedCards = binderSlots.filter(s => s.card_id !== null);
      const unassignedDigital = (ownedCards || []).filter(
        c => c.slot_index === null && (c.is_digital === true || c.is_digital === null)
      );
      // Get slot indices from binderSlots view
      const viewSlotIndices = assignedCards.map(s => s.slot_index);
      // Get slot indices from ownedCards
      const ownedSlotData = (ownedCards || []).map(c => ({
        name: c.cards?.card_name,
        slot_index: c.slot_index,
        is_digital: c.is_digital
      }));
      // Find cards that have slot_index but aren't in the view
      const missingFromView = (ownedCards || []).filter(
        c => c.slot_index !== null && !viewSlotIndices.includes(c.slot_index)
      );
      if (process.env.NODE_ENV !== "production") console.log('[Binder Debug]', {
        totalOwnedCards,
        ownedCardsLength: ownedCards?.length || 0,
        binderSlotsWithCards: assignedCards.length,
        viewSlotIndices,
        ownedSlotData,
        missingFromView: missingFromView.map(c => ({ name: c.cards?.card_name, slot: c.slot_index, is_digital: c.is_digital }))
      });
    }
  }, [open, profile?.id, ownedCards, binderSlots, totalOwnedCards]);

  // Build a complete slot map: assigned cards + unassigned digital cards filling empty slots
  const allSlots: BinderSlot[] = useMemo(() => {
    // Start with slots that have assigned cards from binderSlots view
    const slotMap = new Map<number, BinderSlot>();

    // Add cards that have slot assignments from the view
    for (const slot of binderSlots) {
      if (slot.card_id) {
        slotMap.set(slot.slot_index, slot);
      }
    }

    // Get slot indices that the view returned
    const viewSlotIndices = new Set(binderSlots.filter(s => s.card_id !== null).map(s => s.slot_index));

    // Add cards from ownedCards that have slot_index but aren't in the view
    // (This handles cases where the view is limited but cards have valid slot assignments)
    for (const card of (ownedCards || [])) {
      if (card.slot_index !== null && !viewSlotIndices.has(card.slot_index) && card.cards) {
        slotMap.set(card.slot_index, {
          user_id: card.user_id,
          slot_index: card.slot_index,
          is_unlocked: true,
          card_id: card.card_id,
          card_name: card.cards.card_name,
          artwork_url: card.cards.artwork_url || null,
          element: card.cards.element,
          rarity: card.cards.rarity,
          is_starter: card.cards.is_starter || null
        });
      }
    }

    // Collect card_ids already placed in slots to prevent duplicates
    // (handles race condition where binderSlots and ownedCards refresh at different times)
    const placedCardIds = new Set<string>();
    for (const [, slot] of slotMap) {
      if (slot.card_id) placedCardIds.add(slot.card_id);
    }

    // Find unassigned digital cards from ownedCards (those with slot_index === null)
    // Skip any card that's already placed in a slot to prevent duplicates
    const unassignedCards = (ownedCards || []).filter(
      c => c.slot_index === null && (c.is_digital === true || c.is_digital === null) && c.cards
        && !placedCardIds.has(c.card_id)
    );

    // Assign unassigned cards to empty slots (starting from slot 1, slot 0 is CHXNDLER default)
    let nextEmptySlot = 1;
    for (const card of unassignedCards) {
      // Find next empty slot
      while (slotMap.has(nextEmptySlot) && nextEmptySlot < TOTAL_SLOTS) {
        nextEmptySlot++;
      }
      if (nextEmptySlot >= TOTAL_SLOTS) break;

      // Create a BinderSlot from the owned card
      slotMap.set(nextEmptySlot, {
        user_id: card.user_id,
        slot_index: nextEmptySlot,
        is_unlocked: true,
        card_id: card.card_id,
        card_name: card.cards.card_name,
        artwork_url: card.cards.artwork_url || null,
        element: card.cards.element,
        rarity: card.cards.rarity,
        is_starter: card.cards.is_starter || null
      });
      nextEmptySlot++;
    }

    // Build full slots array for all TOTAL_SLOTS
    const result: BinderSlot[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (i === 0 && !slotMap.has(0)) {
        // Slot 0: Default CHXNDLER card (use fetched starter card ID when available)
        result.push({
          user_id: profile?.id || '',
          slot_index: 0,
          is_unlocked: true,
          card_id: starterCardId || 'chxndler-default',
          card_name: 'CHXNDLER',
          artwork_url: getCardImageUrl('CHXNDLER'),
          element: 'ALL',
          rarity: 'Common',
          is_starter: true
        });
      } else if (slotMap.has(i)) {
        result.push(slotMap.get(i)!);
      } else {
        // Empty slot
        result.push({
          user_id: profile?.id || '',
          slot_index: i,
          is_unlocked: true,
          card_id: null,
          card_name: null,
          artwork_url: null,
          element: null,
          rarity: null,
          is_starter: null
        });
      }
    }

    return result;
  }, [binderSlots, ownedCards, profile?.id, starterCardId]);

  // Generate visible slots for the current page from the complete slot map
  const visibleSlots: BinderSlot[] = useMemo(() => {
    const startIndex = pageIndex * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, TOTAL_SLOTS);
    return allSlots.slice(startIndex, endIndex);
  }, [pageIndex, allSlots]);

  // Preview slots for logged-out state (guest mode)
  // All slots are now unlocked
  const previewSlots: BinderSlot[] = useMemo(() => {
    const PAGE_SIZE = 6;
    const startIndex = pageIndex * PAGE_SIZE;

    return Array.from({ length: PAGE_SIZE }, (_, i) => {
      const slotIndex = startIndex + i;

      // First slot on page 1: CHXNDLER preview card
      if (pageIndex === 0 && slotIndex === 0) {
        return {
          user_id: '', slot_index: slotIndex, is_unlocked: true,
          card_id: starterCardId || 'chxndler-preview', card_name: 'CHXNDLER',
          artwork_url: getCardImageUrl('CHXNDLER'),
          element: 'ALL', rarity: 'Common', is_starter: true
        };
      }

      // All other slots: Empty and unlocked
      return {
        user_id: '', slot_index: slotIndex, is_unlocked: true,
        card_id: null, card_name: null, artwork_url: null,
        element: null, rarity: null, is_starter: null
      };
    });
  }, [pageIndex, starterCardId]);
  // Purchase flow state machine
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'digital' | 'physical' | null>(null);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'insufficient' | 'digital-preview' | 'confirm-digital' | 'confirm-physical' | 'physical-form' | 'success'>('idle');
  

  // Full song collection data structure
  const songCollection = [
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'MR. BRIGHTSIDE', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'CHEERLEADER (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'MAKE BELIEVE', element: '', rarity: 'Common', is_released: false, min_tier: 'wanderer' as CardTier },
    { name: 'ALONE', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'ALONE (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'LITTLE BLACK HEART (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'dreamer' as CardTier },
    { name: 'LITTLE BLACK HEART', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'dreamer' as CardTier },
    { name: 'AMERICAN DREAM', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'PARIS', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'PINK MOON', element: 'DARKNESS', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'ALWAYS ON MY MIND', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'ALWAYS ON MY MIND (REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BE MY BEE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BE MY BEE (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'CHEERLEADER', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'COLLIDE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'dreamer' as CardTier },
    { name: 'COLORS OF OUR HOME (BLUMA Game Soundtrack)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'COLORS OF OUR HOME (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'COLORS OF OUR HOME', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'I MIGHT FALL IN LOVE WITH YOU', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'LOVE ME', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'LOVE ME (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'SOMEBODY TO LOVE', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'lover' as CardTier },
    { name: 'TIENES UN AMIGO', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'WE\'RE JUST FRIENDS', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'WE\'RE JUST FRIENDS (ACOUSTIC)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'WE\'RE JUST FRIENDS (DMVRCO REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'WE\'RE JUST FRIENDS (mickey jas REMIX)', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BABY', element: 'HEART', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BLUE (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BLUE', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'BRAIN FREEZE', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'FEELING THIS', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'dreamer' as CardTier },
    { name: 'GAME BOY HEART', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'HOME', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'HOME (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'HOUSE PARTY', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'HOUSE PARTY (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'KID FOREVER', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'POKÉMON', element: 'LIGHTNING', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'LETTING GO', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'OCEAN GIRL', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'OCEAN GIRL (ACOUSTIC)', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'OCEAN GIRL (REMIX)', element: 'WATER', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
    { name: 'WATER', element: 'WATER', rarity: 'Rare', is_released: true, min_tier: 'lover' as CardTier },
    { name: 'HEART', element: 'HEART', rarity: 'Rare', is_released: true, min_tier: 'lover' as CardTier },
    { name: 'LIGHTNING', element: 'LIGHTNING', rarity: 'Rare', is_released: true, min_tier: 'lover' as CardTier },
    { name: 'DARKNESS', element: 'DARKNESS', rarity: 'Rare', is_released: true, min_tier: 'lover' as CardTier },
  ];
  
  const elements = ['LIGHTNING', 'DARKNESS', 'WATER', 'HEART'];
  const rarities = ['All', 'Common', 'Rare'];
  
  // Card costs
  const digitalCost = 5;
  const physicalCost = 20;

  // Shipping form state
  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    streetAddress: '',
    apartmentUnit: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [shippingErrors, setShippingErrors] = useState<{[key: string]: string}>({});
  
  const getElementColor = (element: string) => {
    const elementColors: { [key: string]: string } = {
      'LIGHTNING': '#FFD700', // Gold
      'DARKNESS': '#FFFFFF', // White
      'WATER': '#1E90FF', // Dodger blue
      'HEART': '#FF69B4', // Hot pink
      'ALL': '#FFFFFF' // White for special cards
    };
    return elementColors[element] || '#FFFFFF';
  };

  const isCardOwned = (cardName: string) => {
    if (!ownedCards) return false;
    return ownedCards.some(cardRow => cardRow.cards.card_name === cardName);
  };

  // Helper to get user's owned cards in the format expected by getCardGateState
  const getUserCards = () => {
    if (!ownedCards) return [];
    return ownedCards.map(cardRow => ({
      user_id: profile?.id || '',
      card_id: cardRow.cards.id || '',
      card_name: cardRow.cards.card_name
    }));
  };

  // Helper to get card gate state
  const getCardState = (card: any): CardGateState => {
    const cardData = {
      id: card.id || card.name,
      card_name: card.name || card.card_name,
      is_released: card.is_released ?? true,
      min_tier: card.min_tier || 'wanderer'
    };
    
    const profileData = profile ? {
      id: profile.id,
      tier: profile.tier || profile.journey_tag || 'wanderer'
    } : null;
    
    const userCards = getUserCards();
    return getCardGateState(cardData, profileData, userCards);
  };

  const getCardOneLiner = (songName: string) => {
    const oneLiners: { [key: string]: string } = {
      'CHXNDLER': 'The artist behind every heartbeat, every moment, every song.',
      'MR. BRIGHTSIDE': 'When love turns to doubt and every glance feels like betrayal.',
      'CHEERLEADER (ACOUSTIC)': 'Wanting the person you love most to be cheering in the crowd.',
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      'MAKE BELIEVE': 'Make believe',
      'LITTLE BLACK HEART (ACOUSTIC)': 'Are you afraid to live or afraid to die?',
      'LITTLE BLACK HEART': 'Are you afraid to live or afraid to die?',
      'ALONE': 'Lost in a sea of strangers under the city\'s glittering glow.',
      'ALONE (ACOUSTIC)': 'Lost in a sea of strangers under the city\'s glittering glow.',
      'AMERICAN DREAM': 'The American Dream isn\'t where we live — it\'s where our dreams go to die.',
      'PARIS': 'A love affair with self-destruction — poison dressed up as romance.',
      'PINK MOON': 'Lost in the static, the pink moon guides me home.',
      'ALWAYS ON MY MIND': 'Some voices never fade — they just guide you from within.',
      'ALWAYS ON MY MIND (REMIX)': 'Some voices never fade — they just guide you from within.',
      'BE MY BEE': 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      'BE MY BEE (ACOUSTIC)': 'You buzzed like love on a first date… but the sting brought you back to Earth.',
      'CHEERLEADER': 'Wanting the person you love most to be cheering in the crowd.',
      'COLLIDE': 'Two souls crash into each other in a cosmic dance of fate.',
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': 'A journey from isolation to connection in a world full of color.',
      'COLORS OF OUR HOME (ACOUSTIC)': 'A journey from isolation to connection in a world full of color.',
      'COLORS OF OUR HOME': 'A journey from isolation to connection in a world full of color.',
      'I MIGHT FALL IN LOVE WITH YOU': 'Falling into warm sweaters, slow mornings, and a love that feels like home.',
      'LOVE ME': 'If I gave it all away for the dream and never made it — would you still love me?',
      'LOVE ME (ACOUSTIC)': 'If I gave it all away for the dream and never made it — would you still love me?',
      'SOMEBODY TO LOVE': 'You want to give real love — not the kind they expect, but the kind you know. Too bad they\'re not the one.',
      'TIENES UN AMIGO': 'No galaxy too far, no accent too strong — friendship always finds a way.',
      'WE\'RE JUST FRIENDS': 'Unspoken feelings blur the lines between friendship and something more.',
      'WE\'RE JUST FRIENDS (ACOUSTIC)': 'Unspoken feelings blur the lines between friendship and something more.',
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': 'Unspoken feelings blur the lines between friendship and something more.',
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': 'Unspoken feelings blur the lines between friendship and something more.',
      'BABY': 'A chaotic, messy, romantic ride through the magic of a first date.',
      'BLUE (ACOUSTIC)': 'You were the match to ignite the ash in my heart.',
      'BLUE': 'You were the match to ignite the ash in my heart.',
      'BRAIN FREEZE': 'A rush of emotion and chaos from chasing summer highs.',
      'FEELING THIS': 'When chaos feels like connection, and that\'s enough for tonight.',
      'GAME BOY HEART': 'A nostalgic escape into an 8-bit dreamworld where your heart lives free.',
      'HOME': 'A journey through the stars to fill the void—only to find home was within all along',
      'HOME (ACOUSTIC)': 'A journey through the stars to fill the void—only to find home was within all along',
      'HOUSE PARTY': 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      'HOUSE PARTY (ACOUSTIC)': 'A crowded room, an unspoken crush, and the quiet realization that we\'re all aliens in disguise.',
      'KID FOREVER': 'Live fearlessly in the land your daydreams call home.',
      'POKÉMON': 'Some dreams don\'t fade — they evolve with you.',
      'LETTING GO': 'Letting go of expectations — theirs and yours — to finally be free.',
      'OCEAN GIRL': 'A love that moves like the sea — you let go and trust to always come back to you.',
      'OCEAN GIRL (ACOUSTIC)': 'A love that moves like the sea — you let go and trust to always come back to you.',
      'OCEAN GIRL (REMIX)': 'A love that moves like the sea — you let go and trust to always come back to you.',
      'WATER': 'These songs carry waves of emotion — not explosive, but steady, like a tide that pulls you out and then leaves you still',
      'HEART': 'This is the emotional core. These songs don\'t just want — they feel. Love isn\'t clean here — it\'s messy, soft, and intense.',
      'LIGHTNING': 'Lightning is the electric jolt of feeling alive. These tracks buzz. You move fast, crash hard, and maybe regret nothing.',
      'DARKNESS': 'Darkness isn\'t evil — it\'s vulnerability in disguise. These songs explore what\'s not said, what we hide, or what we want but don\'t admit.',
    };
    return oneLiners[songName] || '';
  };
  
  const getCardImage = (songName: string, element: string) => {
    const songImages: { [key: string]: string } = {
      'ALWAYS ON MY MIND': getCardImageUrl('HEART'),
      'ALWAYS ON MY MIND (REMIX)': getCardImageUrl('ALWAYS ON MY MIND (REMIX)'),
      'ALONE': getCardImageUrl('DARKNESS'),
      'ALONE (ACOUSTIC)': getCardImageUrl('DARKNESS'),
      'AMERICAN DREAM': getCardImageUrl('AMERICAN DREAM'),
      'BABY': getCardImageUrl('BABY'),
      'BE MY BEE': getCardImageUrl('BE MY BEE'),
      'BE MY BEE (ACOUSTIC)': getCardImageUrl('BE MY BEE (ACOUSTIC)'),
      'BLUE (ACOUSTIC)': getCardImageUrl('BLUE (ACOUSTIC)'),
      'BLUE': getCardImageUrl('BLUE'),
      'BRAIN FREEZE': getCardImageUrl('BRAIN FREEZE'),
      'CHEERLEADER (ACOUSTIC)': getCardImageUrl('HEART'),
      'CHEERLEADER': getCardImageUrl('CHEERLEADER'),
      'COLLIDE': getCardImageUrl('COLLIDE'),
      'COLORS OF OUR HOME': getCardImageUrl('COLORS OF OUR HOME'),
      'COLORS OF OUR HOME (ACOUSTIC)': getCardImageUrl('COLORS OF OUR HOME (ACOUSTIC)'),
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': getCardImageUrl('COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)'),
      'FEELING THIS': getCardImageUrl('FEELING THIS'),
      'GAME BOY HEART': getCardImageUrl('GAME BOY HEART'),
      'HOME': getCardImageUrl('HOME'),
      'HOME (ACOUSTIC)': getCardImageUrl('HOME (ACOUSTIC)'),
      'HOUSE PARTY': getCardImageUrl('HOUSE PARTY'),
      'HOUSE PARTY (ACOUSTIC)': getCardImageUrl('HOUSE PARTY (ACOUSTIC)'),
      'I MIGHT FALL IN LOVE WITH YOU': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU'),
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)'),
      'KID FOREVER': getCardImageUrl('KID FOREVER'),
      'LETTING GO': getCardImageUrl('LETTING GO'),
      'LITTLE BLACK HEART': getCardImageUrl('LITTLE BLACK HEART'),
      'LITTLE BLACK HEART (ACOUSTIC)': getCardImageUrl('LITTLE BLACK HEART (ACOUSTIC)'),
      'LOVE ME': getCardImageUrl('LOVE ME'),
      'LOVE ME (ACOUSTIC)': getCardImageUrl('LOVE ME (ACOUSTIC)'),
      'MAKE BELIEVE': getCardImageUrl('CHXNDLER'),
      'MR. BRIGHTSIDE': getCardImageUrl('MR. BRIGHTSIDE'),
      'OCEAN GIRL': getCardImageUrl('OCEAN GIRL'),
      'OCEAN GIRL (ACOUSTIC)': getCardImageUrl('OCEAN GIRL (ACOUSTIC)'),
      'OCEAN GIRL (REMIX)': getCardImageUrl('OCEAN GIRL (REMIX)'),
      'PARIS': getCardImageUrl('PARIS'),
      'PINK MOON': getCardImageUrl('PINK MOON'),
      'POKÉMON': getCardImageUrl('POKEMON'),
      'SOMEBODY TO LOVE': getCardImageUrl('SOMEBODY TO LOVE'),
      'TIENES UN AMIGO': getCardImageUrl('TIENES UN AMIGO'),
      'WE\'RE JUST FRIENDS': getCardImageUrl("WE'RE JUST FRIENDS"),
      'WE\'RE JUST FRIENDS (ACOUSTIC)': getCardImageUrl("WE'RE JUST FRIENDS (ACOUSTIC)"),
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': getCardImageUrl("WE'RE JUST FRIENDS (DMVRCO REMIX)"),
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': getCardImageUrl("WE'RE JUST FRIENDS (MICKEY JAS REMIX)"),
      'CHXNDLER': getCardImageUrl('CHXNDLER'),
      'WATER': getCardImageUrl('WATER'),
      'HEART': getCardImageUrl('HEART'),
      'LIGHTNING': getCardImageUrl('LIGHTNING'),
      'DARKNESS': getCardImageUrl('DARKNESS'),
    };

    return songImages[songName] || getCardImageUrl('CHXNDLER');
  };

  const getFilteredCards = () => {
    if (!selectedElement) return [];
    
    let filteredSongs = songCollection;
    
    // Filter by element first (include global 'ALL' cards in every tab)
    filteredSongs = filteredSongs.filter(song => song.element === selectedElement || song.element === 'ALL');
    
    // Then filter by specific card name if not showing all
    if (selectedCardName !== 'All' && selectedCardName) {
      filteredSongs = filteredSongs.filter(song => song.name === selectedCardName);
    }
    
    // Convert to card format with images
    let cards = filteredSongs.map(song => ({
      id: song.name, // Use name as ID for now
      title: song.name,
      card_name: song.name,
      rarity: song.rarity,
      element: song.element,
      image_url: getCardImage(song.name, song.element),
      is_released: song.is_released,
      min_tier: song.min_tier,
      // Legacy fields for compatibility
      name: song.name,
      image: getCardImage(song.name, song.element)
    }));
    
    // Move preselected card to first position if it exists in the filtered results
    if (preselectedCard) {
      const preselectedIndex = cards.findIndex(card => card.name === preselectedCard);
      if (preselectedIndex > 0) {
        const preselectedCardObj = cards.splice(preselectedIndex, 1)[0];
        cards.unshift(preselectedCardObj);
      }
    } else {
      // Move the element's representative card (same name as element) to first position
      // e.g., "DARKNESS" card should be first when viewing DARKNESS element
      const elementCardIndex = cards.findIndex(card => card.name.toUpperCase() === selectedElement.toUpperCase());
      if (elementCardIndex > 0) {
        const elementCard = cards.splice(elementCardIndex, 1)[0];
        cards.unshift(elementCard);
      }
    }

    return cards;
  };

  const getAvailableCardNames = () => {
    if (!selectedElement) return [];
    
    // Get all cards that belong to the selected element
    const elementCards = songCollection
      .filter(song => song.element === selectedElement || song.element === 'ALL')
      .map(song => song.name);
    
    return elementCards;
  };

  // Temporary debug to print final card names rendered in Binder (owned subset for the current element)
  useEffect(() => {
    try {
      if (!selectedElement) return;
      const names = (ownedCards || [])
        .filter(c => c.cards && (c.cards.element === selectedElement || c.cards.element === 'ALL'))
        .map(c => c.cards.card_name);
      if (process.env.NODE_ENV !== "production") console.debug('[CardDataDebug] Binder owned names for element', selectedElement, ':', names);
    } catch {}
  }, [ownedCards, selectedElement]);

  // In-flight guard for purchases to prevent double submission
  const purchaseInFlightRef = useRef(false);

  // Auto-assign unassigned digital cards to empty binder slots when modal opens
  const autoAssignInProgress = useRef(false);
  useEffect(() => {
    if (!open || !profile?.id || !ownedCards?.length || autoAssignInProgress.current) return;

    const assignUnassignedCards = async () => {
      // Collect card_ids already in binder slots to avoid re-assigning
      const slotsCardIds = new Set(
        binderSlots.filter(s => s.card_id).map(s => s.card_id!)
      );

      // Find digital cards without slot assignments that aren't already in a binder slot
      const unassignedCards = ownedCards.filter(
        c => (c.is_digital === true || c.is_digital === null) && c.slot_index === null
          && !slotsCardIds.has(c.card_id)
      );

      if (unassignedCards.length === 0) {
        if (process.env.NODE_ENV !== "production") console.log('[Binder] No unassigned digital cards to auto-assign');
        return;
      }

      if (process.env.NODE_ENV !== "production") console.log('[Binder] Found', unassignedCards.length, 'unassigned digital cards, auto-assigning to slots...');

      // Get occupied slot indices from binderSlots
      const occupiedSlots = new Set(
        binderSlots.filter(s => s.card_id !== null).map(s => s.slot_index)
      );

      // Find empty slots (start from 1, slot 0 is reserved for CHXNDLER default)
      const emptySlots: number[] = [];
      for (let i = 1; i < TOTAL_SLOTS && emptySlots.length < unassignedCards.length; i++) {
        if (!occupiedSlots.has(i)) {
          emptySlots.push(i);
        }
      }

      if (emptySlots.length === 0) {
        if (process.env.NODE_ENV !== "production") console.log('[Binder] No empty slots available for auto-assignment');
        return;
      }

      autoAssignInProgress.current = true;

      // Assign each unassigned card to an empty slot
      for (let i = 0; i < Math.min(unassignedCards.length, emptySlots.length); i++) {
        const card = unassignedCards[i];
        const slotIndex = emptySlots[i];

        try {
          const { error } = await supabaseBrowser
            .from('user_cards')
            .update({ slot_index: slotIndex, is_digital: true })
            .eq('id', card.id);

          if (error) {
            console.error('[Binder] Failed to assign card to slot:', error);
          } else {
            if (process.env.NODE_ENV !== "production") console.log('[Binder] Assigned card', card.cards?.card_name, 'to slot', slotIndex);
          }
        } catch (e) {
          console.error('[Binder] Error assigning card:', e);
        }
      }

      // Refresh binder slots to reflect changes
      await refreshBinderSlots();
      autoAssignInProgress.current = false;
    };

    assignUnassignedCards();
  }, [open, profile?.id, ownedCards, binderSlots, refreshBinderSlots]);

  // Helper functions for purchase flow
  const getCost = (type: 'digital' | 'physical') => {
    return type === 'digital' ? digitalCost : physicalCost;
  };



  const handlePurchaseClick = (type: 'digital' | 'physical') => {
    // For digital cards, check if there's an empty binder slot available
    if (type === 'digital' && !hasEmptySlot) {
      // No empty slot available - show message and don't proceed
      try { sfx.play('error', 0.6); } catch {}
      alert('Complete Element of the day to unlock binder slot');
      return;
    }

    setSelectedPurchaseType(type);
    if (type === 'digital') {
      // Always show digital preview for digital purchases
      setPurchaseState('digital-preview');
    } else {
      // For physical purchases, show confirmation first
      setPurchaseState('confirm-physical');
    }
  };

  const handleConfirmPurchase = async () => {
    // DEFENSIVE GUARD: Block duplicate requests
    if (purchaseInFlightRef.current) {
      if (process.env.NODE_ENV !== "production") console.warn('[BINDER PURCHASE] Blocked: purchase already in-flight');
      return;
    }
    if (!selectedPurchaseType || !profile) return;

    const cost = getCost(selectedPurchaseType);
    const cards = getFilteredCards();
    const currentCard = cards[currentCardIndex];

    if (!currentCard) return;

    // The songCollection is hardcoded without database IDs, so we MUST
    // look up the canonical UUID from Supabase by card_name at purchase time.
    const { data: cardRow, error: lookupError } = await supabaseBrowser
      .from('cards')
      .select('id')
      .eq('card_name', currentCard.name)
      .maybeSingle();

    if (lookupError || !cardRow?.id) {
      console.error('[BINDER PURCHASE] Card lookup failed:', { name: currentCard.name, lookupError });
      alert('Could not find this card. Please try again.');
      return;
    }

    // Runtime guard: ensure cardId is always a string
    const cardId = String(cardRow.id).trim();

    if (!isValidUuid(cardId)) {
      console.error('[BINDER PURCHASE] Invalid card UUID from database:', { cardId: String(cardId), length: String(cardId).length });
      alert('Purchase failed: invalid card ID. Please refresh and try again.');
      return;
    }

    // Set in-flight BEFORE any async work
    purchaseInFlightRef.current = true;
    if (process.env.NODE_ENV !== "production") console.log('[BINDER PURCHASE] In-flight set TRUE');

    try {
      let response;

      if (selectedPurchaseType === 'digital') {
        const digitalArgs: { p_card_id: string } = { p_card_id: cardId };

        if (process.env.NODE_ENV !== "production") console.log('[BINDER PURCHASE] sending RPC with validated args:', {
          cardId,
          cardName: currentCard.name,
          argsJson: JSON.stringify(digitalArgs),
        });

        // Use digital card RPC with validated args (no spread, no dynamic keys)
        response = await supabaseBrowser.rpc('purchase_digital_card', digitalArgs);
      } else {
        // For physical cards, validate shipping first
        if (!validateShippingForm()) {
          return;
        }

        // Suppress badge celebrations during physical card purchase
        // This prevents unrelated badges from celebrating when profile refreshes
        suppressBadgeCelebrations(10000);

        // Use new physical card RPC
        response = await supabaseBrowser.rpc('purchase_physical_card_with_heartcoins', {
          p_card_id: cardId,
          p_full_name: shippingForm.fullName,
          p_address_line1: shippingForm.streetAddress,
          p_address_line2: shippingForm.apartmentUnit || null,
          p_city: shippingForm.city,
          p_state: shippingForm.state,
          p_zip: shippingForm.zipCode,
          p_country: shippingForm.country,
        });
      }

      if (response?.error) {
        const errorMessage = response.error.message || 'Purchase failed';

        if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
          setPurchaseState('insufficient');
          return;
        } else if (errorMessage.includes('NO_AVAILABLE_SLOT')) {
          // User needs to unlock more binder slots
          alert('Unlock a binder slot to buy more cards.');
          resetPurchaseState();
          return;
        } else {
          throw new Error(errorMessage);
        }
      }

      // Refresh profile to update HeartCoin balance
      await updateProfile({});

      // Refresh binder slots to show the newly purchased card
      await refreshBinderSlots();

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('binder:refresh'));

      setPurchaseState('success');
      try { sfx.play('card-ding', 0.8); } catch {}

      // Trigger card celebration with the purchased card
      triggerCardCelebration(getCardImageUrl(currentCard.card_name || 'CHXNDLER'), currentCard.card_name);
      
      // Reset after 2 seconds
      setTimeout(() => {
        resetPurchaseState();
      }, 2000);
    } catch (error) {
      try { sfx.play('error', 0.8); } catch {}
      console.error('Purchase failed:', error);

      // Check if it's an insufficient funds error
      if (error instanceof Error && error.message.includes('INSUFFICIENT_FUNDS')) {
        setPurchaseState('insufficient');
      } else {
        resetPurchaseState();
      }
    } finally {
      // Always reset in-flight flag
      purchaseInFlightRef.current = false;
      if (process.env.NODE_ENV !== "production") console.log('[BINDER PURCHASE] In-flight reset FALSE');
    }
  };

  const resetPurchaseState = () => {
    setSelectedPurchaseType(null);
    setPurchaseState('idle');
    setShippingErrors({});
    // Keep shipping form data for user convenience - don't clear it
  };

  const handlePhysicalConfirm = () => {
    // After physical confirmation, show shipping form
    setPurchaseState('physical-form');
    // Prefill shipping form if user has previous orders
    prefillShippingForm();
  };

  const openHeartCoinPopout = () => {
    try { sfx.play('click', 0.4); } catch {}
    if (onOpenHeartCoin) {
      onOpenHeartCoin();
    } else {
      if (process.env.NODE_ENV !== "production") console.warn('Heart coin trigger not available');
    }
  };

  // Shipping form validation
  const validateShippingForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!shippingForm.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!shippingForm.streetAddress.trim()) {
      errors.streetAddress = 'Street address is required';
    }
    if (!shippingForm.city.trim()) {
      errors.city = 'City is required';
    }
    if (!shippingForm.state.trim()) {
      errors.state = 'State is required';
    }
    if (!shippingForm.zipCode.trim()) {
      errors.zipCode = 'ZIP code is required';
    }
    if (!shippingForm.country.trim()) {
      errors.country = 'Country is required';
    }
    
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Prefill shipping form from previous orders
  const prefillShippingForm = async () => {
    if (!profile?.id) return;
    
    try {
      // Fetch the latest shipping info from user's previous orders
      const response = await fetch(`/api/physical-orders?user_id=${profile.id}&latest=true`);
      
      if (response.ok) {
        const latestOrder = await response.json();
        if (latestOrder) {
          setShippingForm({
            fullName: latestOrder.full_name || '',
            streetAddress: latestOrder.address_line1 || '',
            apartmentUnit: latestOrder.address_line2 || '',
            city: latestOrder.city || '',
            state: latestOrder.state || '',
            zipCode: latestOrder.postal_code || '',
            country: latestOrder.country || ''
          });
        }
      }
    } catch (error) {
      console.error('Error prefilling shipping form:', error);
    }
  };

  // Handle physical purchase with shipping
  const handlePhysicalPurchase = async () => {
    if (!selectedPurchaseType || selectedPurchaseType !== 'physical' || !profile) return;
    
    // Validate form
    if (!validateShippingForm()) {
      try { sfx.play('error', 0.6); } catch {}
      return;
    }
    
    const cost = getCost('physical');
    const cards = getFilteredCards();
    const currentCard = cards[currentCardIndex];
    
    if (!currentCard) return;

    // Suppress badge celebrations during physical card purchase
    // This prevents unrelated badges from celebrating when profile refreshes
    suppressBadgeCelebrations(10000);

    // The RPC will handle balance verification

    try {
      // Create physical order
      const orderData: Omit<PhysicalCardOrder, 'id' | 'created_at'> = {
        user_id: profile.id,
        card_key: currentCard.name,
        full_name: shippingForm.fullName,
        address_line1: shippingForm.streetAddress,
        address_line2: shippingForm.apartmentUnit || null,
        city: shippingForm.city,
        state: shippingForm.state,
        postal_code: shippingForm.zipCode,
        country: shippingForm.country,
        cost_heartcoins: cost,
        status: 'pending'
      };
      
      // Insert into physical_card_orders table via API
      const orderResponse = await fetch('/api/physical-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      
      if (!orderResponse.ok) {
        throw new Error('Failed to create physical order');
      }
      
      // TODO: Add card to user_cards table via API

      // Refresh profile and binder slots to get updated balance and counts
      await Promise.all([
        refreshProfile(),
        refreshBinderSlots()
      ]);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('binder:refresh'));

      setPurchaseState('success');
      try { sfx.play('card-ding', 0.8); } catch {}
      
      // Reset after 3 seconds
      setTimeout(() => {
        resetPurchaseState();
      }, 3000);
      
    } catch (error) {
      try { sfx.play('error', 0.8); } catch {}
      console.error('Physical purchase failed:', error);
      resetPurchaseState();
    }
  };

  // Update shipping form field
  const updateShippingField = (field: keyof ShippingInfo, value: string) => {
    setShippingForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (shippingErrors[field]) {
      setShippingErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Set authentication based on profile
  useEffect(() => {
    if (profile) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [profile]);

  // Detect when slots are unlocked and trigger animation
  useEffect(() => {
    if (displayUnlockedSlots > prevUnlockedCount) {
      // New slots have been unlocked - add them to the animation set
      const newSlots = new Set<number>();
      for (let i = prevUnlockedCount; i < displayUnlockedSlots; i++) {
        newSlots.add(i);
      }
      setNewlyUnlockedSlots(newSlots);

      // Play unlock sound
      try { sfx.play('card-ding', 0.7); } catch {}

      // Clear the animation after it completes (1.2s)
      const timer = setTimeout(() => {
        setNewlyUnlockedSlots(new Set());
      }, 1200);

      return () => clearTimeout(timer);
    }
    setPrevUnlockedCount(displayUnlockedSlots);
  }, [displayUnlockedSlots, prevUnlockedCount]);

  // Inject keyframes when component mounts and pulsingCards is true
  useEffect(() => {
    if (pulsingCards && typeof document !== 'undefined') {
      // Check if keyframes already exist to avoid duplication
      const existingStyle = document.querySelector('#binder-pulse-keyframes');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'binder-pulse-keyframes';
        style.innerHTML = pulseKeyframes;
        document.head.appendChild(style);
      }
      // Cleanup on unmount
      return () => {
        const styleElement = document.querySelector('#binder-pulse-keyframes');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [pulsingCards]);

  // Handle preselected card when modal opens
  useEffect(() => {
    if (open && preselectedCard) {
      // Keep showing binder view, don't auto-expand to full collection
      setShowFullCollection(false);
      setSelectedCardName(preselectedCard);
    }
  }, [open, preselectedCard]);

  // Handle preselected element when modal opens
  useEffect(() => {
    if (open && preselectedElement) {
      // Set the element and automatically show the full collection filtered by element
      setSelectedElement(preselectedElement);
      setShowFullCollection(true);
      // Set to 'All' to show all cards of the selected element
      setSelectedCardName('All');
      // Element card will be first in getFilteredCards() results
      setCurrentCardIndex(0);
    }
  }, [open, preselectedElement]);

  // Reset purchase state when navigating cards
  useEffect(() => {
    resetPurchaseState();
  }, [currentCardIndex, selectedElement]);

  // Helper function to find next unlocked card index
  const findNextUnlockedCard = (currentIndex: number, direction: 'prev' | 'next') => {
    const cards = getFilteredCards();
    if (cards.length <= 1) return currentIndex;
    
    let nextIndex = currentIndex;
    const maxAttempts = cards.length; // Prevent infinite loop
    let attempts = 0;
    
    do {
      if (direction === 'prev') {
        nextIndex = nextIndex > 0 ? nextIndex - 1 : cards.length - 1;
      } else {
        nextIndex = nextIndex < cards.length - 1 ? nextIndex + 1 : 0;
      }
      attempts++;
      
      const cardData = {
        name: cards[nextIndex].name,
        element: cards[nextIndex].element,
        rarity: cards[nextIndex].rarity,
        is_released: cards[nextIndex].is_released ?? true,
        min_tier: cards[nextIndex].min_tier || 'wanderer'
      };
      
      const profileData = profile ? {
        id: profile.id,
        tier: profile.tier || profile.journey_tag || 'wanderer'
      } : null;
      
      const userCards = getUserCards();
      const gateState = getCardGateState(cardData, profileData, userCards);
      
      // Stop if we find an unlocked card or if we've tried all cards
      if (gateState === 'owned' || gateState === 'available' || attempts >= maxAttempts) {
        break;
      }
    } while (attempts < maxAttempts);
    
    return nextIndex;
  };

  // Reset flip state when card closes
  useEffect(() => {
    if (!cardOpen) {
      setIsCardFlipped(false);
    }
  }, [cardOpen]);

  // Arrow key navigation
  useEffect(() => {
    if (!showFullCollection || !selectedElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cards = getFilteredCards();
      if (cards.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'prev'));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'next'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullCollection, selectedElement, selectedRarity, profile]);

  if (!open) return null;

  return (
    <>
      {/* Inject pulsing animation styles */}
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
      
      <PopoutShell
        title="DIGITAL CARD BINDER"
        subtitle={`CARDS COLLECTED: ${profile?.id ? Math.max(1, totalOwnedCards) : 1}`}
        minWidth={'min(96vw, 440px)'}
        maxHeight={'calc(100vh - 8vh - var(--light-beam-boundary) - var(--beam-height) - 16px)'}
        onClose={() => {
          try { sfx.play('close', 0.8); } catch {}
          onClose();
        }}
        pageIndicator={!showFullCollection ? `${pageIndex + 1} / ${totalPages}` : undefined}
        compact
        fullOverlay={cardOpen && selectedCard ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md" style={{ padding: '16px 40px', overflow: 'hidden' }}>
            {/* Large card display - fills entire container */}
            <div
              className="relative flex items-center justify-center w-full h-full"
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            >
              {/* Back arrow - positioned at top left */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  try { sfx.play('close', 0.8); } catch {}
                  setCardOpen(false);
                  setIsCardFlipped(false);
                  setCardRotation(0);
                  setIsAnimatingFlip(false);
                }}
                onMouseEnter={() => {
                  try { sfx.play('hover', 0.3); } catch {}
                }}
                className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-200 transition-all duration-200 z-20"
                style={{
                  background: 'rgba(255,105,180,0.1)',
                  border: '2px solid #FF69B4',
                  boxShadow: '0 0 20px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6), 0 0 40px rgba(255,105,180,0.4)',
                  textShadow: '0 0 10px rgba(255,105,180,0.8)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* TiltSpinCard wrapper for drag-to-spin interaction */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: '100%',
                  height: '100%',
                  animation: 'cardPulse 3s ease-in-out infinite',
                }}
              >
                <TiltSpinCard
                  className="relative flex items-center justify-center"
                  maxRotateX={10}
                  sensitivity={0.3}
                  returnDuration={400}
                  enableSpin={true}
                  spinSensitivity={0.8}
                  onRotationChange={setCardRotation}
                  onClick={() => {
                    // Play flip sound and animate 180° flip
                    try { sfx.play('flip', 0.45); } catch {}
                    setIsAnimatingFlip(true);
                    setCardRotation(prev => prev + 180);
                    setTimeout(() => setIsAnimatingFlip(false), 500);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '24px',
                  }}
                >
                  {/* Card container - contain within binder popout bounds */}
                  <div
                    className="relative"
                    style={{
                      maxHeight: '90%',
                      maxWidth: '85%'
                    }}
                  >
                    {/* Front of card - rotates with cardRotation */}
                    <img
                      src={selectedCard?.image || getCardImageUrl(selectedCard?.name || 'CHXNDLER')}
                      alt={selectedCard?.name || "Card"}
                      className="rounded-2xl pointer-events-none"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: `rotateY(${cardRotation}deg)`,
                        transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                      draggable={false}
                      onError={(e) => {
                        const objectKey = selectedCard?.name || 'CHXNDLER';
                        if (process.env.NODE_ENV !== "production") console.warn('[CardImage] Failed to load card image', { objectKey, attemptedUrl: e.currentTarget.src });
                        const fallback = getCardImageUrl('CHXNDLER');
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />

                    {/* Back of card - fills same container as front */}
                    <img
                      src={getCardImageUrl('BACK')}
                      alt="Card Back"
                      className="absolute top-0 left-0 rounded-2xl pointer-events-none"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: `rotateY(${cardRotation + 180}deg)`,
                        transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                      draggable={false}
                    />
                  </div>
                </TiltSpinCard>
              </div>
            </div>
          </div>
        ) : undefined}
      >
          {/* Normal content - hidden but maintains size when card is open */}
          <div style={{ visibility: cardOpen ? 'hidden' : 'visible' }}>


          {/* Dynamic Content - Binder Cards or Full Collection */}
          <div className="relative flex-shrink-0" style={{ maxHeight: '100%' }}>
            {!showFullCollection ? (
              // Unified Binder Slot Rendering - All Pages
              <div className="relative">
                {/* Left navigation arrow */}
                {pageIndex > 0 && (
                  <div
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        try { sfx.play('click', 0.7); } catch {}
                        setPageIndex(prev => Math.max(0, prev - 1));
                      }}
                      onMouseEnter={(e) => {
                        try { sfx.play('hover', 0.3); } catch {}
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      style={{
                        boxShadow: '0 0 15px rgba(255,105,180,0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                      </svg>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 place-items-center pl-6 pr-10 mt-1 pb-5 gap-x-3 gap-y-1">
                  {/* Render slots from the view - 6 per page */}
                  {(profile?.id ? visibleSlots : previewSlots).map((slot, idx) => {
                    const isLocked = !slot.is_unlocked;
                    const hasCard = !!slot.card_id;
                    const isEmpty = slot.is_unlocked && !slot.card_id;
                    const isNewlyUnlocked = newlyUnlockedSlots.has(slot.slot_index);
                    const isHovered = hoveredLockedSlot === slot.slot_index;

                    return (
                      <div
                        key={`slot-${slot.slot_index}`}
                        className={`relative rounded-lg border transition-all duration-300 w-[5.75rem] aspect-[5/7] bg-black/30 ${
                          isLocked
                            ? 'border-white/5 cursor-default'
                            : hasCard
                            ? 'border-white/10 cursor-pointer hover:scale-105'
                            : 'border-white/10 cursor-pointer hover:scale-105'
                        }`}
                        onMouseEnter={() => {
                          if (isLocked) {
                            setHoveredLockedSlot(slot.slot_index);
                          } else {
                            try { sfx.play('hover', 0.3); } catch {}
                          }
                        }}
                        onMouseLeave={() => {
                          if (isLocked) {
                            setHoveredLockedSlot(null);
                          }
                        }}
                        onClick={() => {
                          if (isLocked) {
                            // Do nothing for locked slots
                            return;
                          }
                          if (hasCard && slot.card_name) {
                            // Open expanded card view
                            try { sfx.play('card-ding', 0.8); } catch {}
                            setSelectedCard({
                              name: slot.card_name,
                              image: getCardImageUrl(slot.card_name),
                              rarity: slot.rarity || 'Common',
                              element: slot.element || 'ALL'
                            });
                            setCardRotation(0);
                            setCardOpen(true);
                          } else if (isEmpty) {
                            // Empty slot: open HeartCoin modal with CARDS tab
                            try { sfx.play('click', 0.4); } catch {}
                            try {
                              window.dispatchEvent(new CustomEvent('openHeartCoinCards', {
                                detail: { source: 'binder_empty_slot' }
                              }));
                            } catch {}
                          }
                        }}
                        style={{
                          boxShadow: hasCard
                            ? '0 0 15px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6), 0 0 45px rgba(255,105,180,0.4)'
                            : isEmpty
                            ? '0 0 8px rgba(255,105,180,0.3), 0 0 14px rgba(255,105,180,0.15)'
                            : '0 0 3px rgba(255,105,180,0.1)',
                          border: hasCard ? '2px solid rgba(255,105,180,0.6)' : isEmpty ? '2px dotted rgba(255,105,180,0.5)' : undefined,
                          animation: isNewlyUnlocked
                            ? 'slotUnlock 1.2s ease-out forwards'
                            : (isEmpty && !profile?.id)
                              ? 'guestEmptySlotGlow 2s ease-in-out infinite'
                              : undefined
                        }}
                      >
                        <div className="relative w-full h-full overflow-hidden rounded-lg">
                          {hasCard && slot.card_name ? (
                            /* Card with artwork */
                            <div className="relative w-full h-full">
                              <img
                                src={getCardImageUrl(slot.card_name)}
                                alt={slot.card_name}
                                className="w-full h-full object-contain transition-all duration-300"
                                draggable={false}
                                onError={(e) => {
                                  const objectKey = slot.card_name;
                                  if (process.env.NODE_ENV !== "production") console.warn('[CardImage] Failed to load card image', { objectKey, attemptedUrl: e.currentTarget.src });
                                  const fallback = getCardImageUrl('CHXNDLER');
                                  if (e.currentTarget.src !== fallback) {
                                    e.currentTarget.src = fallback;
                                  }
                                }}
                              />
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              </div>
                            </div>
                          ) : isLocked ? (
                            /* Locked slot */
                            <div className="w-full h-full bg-gradient-to-br from-pink-500/5 to-purple-500/5 flex items-center justify-center">
                              <div
                                className="text-xs font-bold text-center"
                                style={{
                                  color: 'rgba(255,105,180,0.4)',
                                  textShadow: '0 0 4px rgba(255,105,180,0.3)',
                                  fontSize: '10px',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="16"
                                  height="16"
                                  fill="currentColor"
                                  style={{ margin: '0 auto 2px' }}
                                >
                                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                                LOCKED
                              </div>

                              {/* Tooltip on hover */}
                              {isHovered && (
                                <div
                                  className="absolute z-50 pointer-events-none"
                                  style={{
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: '8px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <div
                                    className="px-3 py-2 rounded-lg text-xs font-medium"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(147,51,234,0.95) 0%, rgba(236,72,153,0.95) 100%)',
                                      color: 'white',
                                      boxShadow: '0 4px 20px rgba(147,51,234,0.4), 0 0 30px rgba(236,72,153,0.3)',
                                      border: '1px solid rgba(255,255,255,0.2)',
                                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                      animation: 'fadeIn 0.2s ease-out'
                                    }}
                                  >
                                    Claim Element of the Day to unlock
                                  </div>
                                  {/* Tooltip arrow */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '-6px',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      width: 0,
                                      height: 0,
                                      borderLeft: '6px solid transparent',
                                      borderRight: '6px solid transparent',
                                      borderTop: '6px solid rgba(192,62,143,0.95)'
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Empty unlocked slot */
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center">
                              <div
                                className="text-xs font-bold"
                                style={{
                                  color: '#FFB6C1',
                                  textShadow: '0 0 4px rgba(255,182,193,0.6)',
                                  fontSize: '8px'
                                }}
                              >
                                EMPTY
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right navigation arrow */}
                {pageIndex < totalPages - 1 && (
                  <div
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        try { sfx.play('click', 0.7); } catch {}
                        setPageIndex(prev => Math.min(totalPages - 1, prev + 1));
                      }}
                      onMouseEnter={(e) => {
                        try { sfx.play('hover', 0.3); } catch {}
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      style={{
                        boxShadow: '0 0 15px rgba(255,105,180,0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Full Collection View
              <>
                {!selectedElement ? (
                  // Element Selection
                  <>
                    <div 
                      className="text-center mb-2"
                      style={{ 
                        color: '#FFB6C1', 
                        fontSize: '14px',
                        textShadow: '0 0 4px rgba(255,182,193,0.6)',
                        marginTop: '-12px'
                      }}
                    >
                      SELECT AN ELEMENT TO VIEW CARDS
                    </div>
                    <div className="grid grid-cols-4 gap-1 justify-center place-items-center mx-auto" style={{ marginTop: '-8px' }}>
                      {elements.map((element) => (
                        <div
                          key={element}
                          className="text-center cursor-pointer group w-20"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedElement(element);
                            setShowFullCollection(true);
                            // Set to 'All' to show all cards of this element, not just one specific card
                            setSelectedCardName('All');
                            // Element card will be first in getFilteredCards() results
                            setCurrentCardIndex(0);
                          }}
                          onMouseEnter={() => {
                            try { sfx.play('change-channel', 0.5); } catch {}
                          }}
                        >
                          <div 
                            className={`w-full aspect-square rounded-lg relative overflow-hidden transition-all duration-300 group-hover:scale-105`}
                          >
                            <img
                              src={`/elements/${element}.webp`}
                              alt={`${element} Card`}
                              className="w-full h-full object-cover rounded-lg"
                              draggable={false}
                            />
                            
                            {/* Show song count for this element */}
                            <div 
                              className="absolute top-1 right-1 bg-black/70 rounded px-1 py-0.5"
                              style={{ 
                                color: '#FFB6C1', 
                                textShadow: '0 0 4px rgba(255,182,193,0.6)',
                                fontSize: '8px',
                                fontWeight: 'bold'
                              }}
                            >
                              {songCollection.filter(song => song.element === element || song.element === 'ALL').length}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // Individual Element Card View
                  <>
                  <div className="flex flex-col h-full overflow-hidden" style={{ maxHeight: '100%' }}>
                    {/* Back Button and Element Filter */}
                    <div className="flex items-center gap-3 mb-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.7); } catch {}
                          setSelectedElement(null);
                          setCurrentCardIndex(0);
                        }}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.3); } catch {}
                        }}
                        className="flex items-center gap-2 text-pink-200 hover:text-white transition-colors duration-200 text-sm"
                      >
                        <span style={{ 
                          fontSize: '24px', 
                          textShadow: '0 0 10px #ff69b4, 0 0 20px #ff1493, 0 0 30px #ff1493',
                          filter: 'drop-shadow(0 0 5px rgba(255, 105, 180, 0.8))'
                        }}>←</span>
                      </button>
                      
                      {/* Element Selector */}
                      <select
                        value={selectedElement || ''}
                        onChange={(e) => {
                          try { sfx.play('click', 0.5); } catch {}
                          setSelectedElement(e.target.value);
                          setCurrentCardIndex(0);
                        }}
                        className="bg-gray-800/80 border border-pink-400/50 rounded px-2 py-1 text-pink-200 text-xs flex-1"
                        style={{ fontSize: '12px' }}
                      >
                        {elements.map(element => (
                          <option key={element} value={element}>{element}</option>
                        ))}
                      </select>
                    </div>

                    {/* Card Display Area with Navigation */}
                    {getFilteredCards().length > 0 && (
                      <div className="relative flex flex-col flex-1" style={{ height: 'calc(100% - 40px)', minHeight: 0 }}>
                        {/* Card and Navigation Row */}
                        <div className="relative flex items-center justify-center flex-1 min-h-0">
                          {/* Left Arrow */}
                          {getFilteredCards().length > 1 && (
                            <button
                              onClick={() => {
                                try { sfx.play('click', 0.5); } catch {}
                                setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'prev'));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200"
                            >
                              ←
                            </button>
                          )}

                          {/* Card Display */}
                          <div className="text-center flex flex-col items-center">
                            <div
                              className="relative w-32 h-44 mx-auto rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105"
                              onClick={() => {
                                const currentCard = getFilteredCards()[currentCardIndex];
                                if (currentCard) {
                                  try { sfx.play('card-ding', 0.8); } catch {}
                                  setSelectedCard({
                                    name: currentCard.name,
                                    image: getCardImageUrl(currentCard.name),
                                    rarity: currentCard.rarity,
                                    element: currentCard.element
                                  });
                                  setCardRotation(0);
                                  setCardOpen(true);
                                }
                              }}
                            >
                              <img
                                src={getCardImageUrl(getFilteredCards()[currentCardIndex]?.name)}
                                alt={getFilteredCards()[currentCardIndex]?.name || 'Card'}
                                className="w-full h-full object-cover rounded-lg"
                                draggable={false}
                              />
                            </div>

                            {/* Card Counter */}
                            <div className="text-xs text-pink-200 mt-1">
                              {currentCardIndex + 1} of {getFilteredCards().length}
                            </div>
                          </div>

                          {/* Right Arrow */}
                          {getFilteredCards().length > 1 && (
                            <button
                              onClick={() => {
                                try { sfx.play('click', 0.5); } catch {}
                                setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'next'));
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.3); } catch {}
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200"
                            >
                              →
                            </button>
                          )}
                        </div>

                        {/* Card Description - anchored to bottom */}
                        <div
                          className="text-sm text-white/90 px-4 py-2 text-center mt-auto"
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            lineHeight: '1.4'
                          }}
                        >
                          {getCardOneLiner(getFilteredCards()[currentCardIndex]?.name || '')}
                        </div>
                      </div>
                    )}

                    {/* No Cards Message */}
                    {getFilteredCards().length === 0 && (
                      <div className="text-center text-pink-300 text-sm">
                        No cards found for {selectedElement} {selectedRarity !== 'All' ? `(${selectedRarity})` : ''}
                      </div>
                    )}
                  </div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Purchase Flow - positioned at bottom of popup */}
          {selectedElement && getFilteredCards()[currentCardIndex] && (
            <div>

              {/* State B: Not enough HeartCoins */}
              {purchaseState === 'insufficient' && selectedPurchaseType === 'digital' && (
                <div className="mt-2">
                  <div 
                    className="text-center mb-2 text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#FCA5A5'
                    }}
                  >
                    <div className="mb-1">{selectedPurchaseType === 'digital' ? 'Digital' : 'Physical'} costs {getCost(selectedPurchaseType)} HeartCoins.</div>
                    <div>You need {getCost(selectedPurchaseType) - (profile?.heartcoin_balance || 0)} more HeartCoins.</div>
                  </div>
                  
                  {/* Disabled button and earn more link */}
                  <div className="flex flex-col gap-2 items-center">
                    <button
                      disabled
                      className="flex items-center gap-1 px-2 py-1 rounded border border-red-400/40 bg-red-500/10 text-xs opacity-60 cursor-not-allowed"
                    >
                      <span className="text-red-300 text-xs">NOT ENOUGH HEARTCOINS</span>
                    </button>
                    <button
                      onClick={openHeartCoinPopout}
                      className="text-xs text-blue-300 hover:text-blue-200 underline"
                      style={{ textShadow: '0 0 4px rgba(147,197,253,0.6)' }}
                    >
                      Earn more HeartCoins
                    </button>
                    <button
                      onClick={resetPurchaseState}
                      className="text-xs text-pink-300 hover:text-pink-200"
                      style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* State C: Confirm digital purchase */}
              {purchaseState === 'confirm-digital' && selectedPurchaseType === 'digital' && (
                <div className="mt-2">
                  <div 
                    className="text-center mb-3 text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#86EFAC'
                    }}
                  >
                    <div className="mb-1">Confirm purchase of {getFilteredCards()[currentCardIndex]?.name} {selectedPurchaseType.toUpperCase()}.</div>
                    <div>This will cost {getCost(selectedPurchaseType)} HeartCoins.</div>
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleConfirmPurchase}
                      className="px-3 py-1 rounded border border-green-400/60 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 text-xs text-green-300"
                      style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                    >
                      Confirm Purchase
                    </button>
                    <button
                      onClick={resetPurchaseState}
                      className="px-3 py-1 rounded border border-pink-400/60 bg-pink-500/10 hover:bg-pink-500/20 transition-all duration-200 text-xs text-pink-300"
                      style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* State D: Confirm physical purchase */}
              {purchaseState === 'confirm-physical' && selectedPurchaseType === 'physical' && (
                <div className="mt-2">
                  <div 
                    className="text-center mb-3 text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#86EFAC'
                    }}
                  >
                    <div className="mb-1">Confirm purchase of {getFilteredCards()[currentCardIndex]?.name} {selectedPurchaseType.toUpperCase()}.</div>
                    <div>This will cost {getCost(selectedPurchaseType)} HeartCoins.</div>
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handlePhysicalConfirm}
                      className="px-3 py-1 rounded border border-green-400/60 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 text-xs text-green-300"
                      style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                    >
                      Confirm Purchase
                    </button>
                    <button
                      onClick={resetPurchaseState}
                      className="px-3 py-1 rounded border border-pink-400/60 bg-pink-500/10 hover:bg-pink-500/20 transition-all duration-200 text-xs text-pink-300"
                      style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* State E: Shipping form for physical purchases */}
              {purchaseState === 'physical-form' && selectedPurchaseType === 'physical' && (
                <div className="mt-2">
                  <div 
                    className="text-center mb-3 text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#86EFAC'
                    }}
                  >
                    <div className="mb-1">Shipping Information for {getFilteredCards()[currentCardIndex]?.name}</div>
                    <div>Please provide your shipping address below.</div>
                  </div>
                  
                  {/* Shipping form */}
                  <div className="space-y-3 p-3 bg-black/20 rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={shippingForm.fullName}
                          onChange={(e) => updateShippingField('fullName', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                        />
                        {shippingErrors.fullName && (
                          <div className="text-red-400 text-xs mt-1">{shippingErrors.fullName}</div>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Country"
                          value={shippingForm.country}
                          onChange={(e) => updateShippingField('country', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                        />
                        {shippingErrors.country && (
                          <div className="text-red-400 text-xs mt-1">{shippingErrors.country}</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={shippingForm.streetAddress}
                        onChange={(e) => updateShippingField('streetAddress', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                      />
                      {shippingErrors.streetAddress && (
                        <div className="text-red-400 text-xs mt-1">{shippingErrors.streetAddress}</div>
                      )}
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        placeholder="Apartment, suite, unit (optional)"
                        value={shippingForm.apartmentUnit}
                        onChange={(e) => updateShippingField('apartmentUnit', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <input
                          type="text"
                          placeholder="City"
                          value={shippingForm.city}
                          onChange={(e) => updateShippingField('city', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                        />
                        {shippingErrors.city && (
                          <div className="text-red-400 text-xs mt-1">{shippingErrors.city}</div>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="State"
                          value={shippingForm.state}
                          onChange={(e) => updateShippingField('state', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                        />
                        {shippingErrors.state && (
                          <div className="text-red-400 text-xs mt-1">{shippingErrors.state}</div>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="ZIP Code"
                          value={shippingForm.zipCode}
                          onChange={(e) => updateShippingField('zipCode', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-green-400/60 focus:outline-none text-white placeholder-white/60"
                        />
                        {shippingErrors.zipCode && (
                          <div className="text-red-400 text-xs mt-1">{shippingErrors.zipCode}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-2 mt-3">
                    <button
                      onClick={handlePhysicalPurchase}
                      className="px-3 py-1 rounded border border-green-400/60 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 text-xs text-green-300"
                      style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                    >
                      Complete Order
                    </button>
                    <button
                      onClick={resetPurchaseState}
                      className="px-3 py-1 rounded border border-pink-400/60 bg-pink-500/10 hover:bg-pink-500/20 transition-all duration-200 text-xs text-pink-300"
                      style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* State F: Purchase successful */}
              {purchaseState === 'success' && selectedPurchaseType && (
                <div className="mt-2">
                  <div 
                    className="text-center text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#86EFAC'
                    }}
                  >
                    {selectedPurchaseType === 'physical' ? (
                      <>
                        <div className="mb-1">✓ Order received</div>
                        <div className="mb-1">Your {getFilteredCards()[currentCardIndex]?.name} physical card is on its way to you.</div>
                        <div className="text-xs">You can update your address later by contacting support if needed.</div>
                      </>
                    ) : (
                      <>
                        <div className="mb-1">✓ Purchased!</div>
                        <div>{getFilteredCards()[currentCardIndex]?.name} has been added to your binder.</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

      </PopoutShell>

      {/* Element Name Display - positioned on right side */}
      {showFullCollection && selectedElement && getFilteredCards().length > 0 && getFilteredCards()[currentCardIndex] && (
        <div
          className="fixed z-[100004]"
          style={{
            right: '5vw',
            bottom: '35vh',
            pointerEvents: 'none'
          }}
        >
          <div 
            className="text-center font-bold"
            style={{
              color: getElementColor(getFilteredCards()[currentCardIndex].element),
              textShadow: `0 0 12px ${getElementColor(getFilteredCards()[currentCardIndex].element)}, 0 0 24px ${getElementColor(getFilteredCards()[currentCardIndex].element)}80`,
              fontSize: 'clamp(24px, 5vw, 48px)',
              fontWeight: 900,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transform: 'rotate(-5deg)',
              filter: `drop-shadow(0 0 20px ${getElementColor(getFilteredCards()[currentCardIndex].element)}80)`
            }}
          >
            {getFilteredCards()[currentCardIndex].element}
          </div>
        </div>
      )}


      </>
  );
}
