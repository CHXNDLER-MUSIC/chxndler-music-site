"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardTier, ProfileTier, isCardLocked, getCardGateState, getTierDisplayName } from "@/types/card";
import type { CardGateState } from "@/utils/cardGating";

type Props = {
  open: boolean;
  onClose: () => void;
  preselectedCard?: string | null;
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

export default function BinderModal({ open, onClose, preselectedCard }: Props) {
  const { profile, updateProfile } = useProfile();
  const [cardOpen, setCardOpen] = useState(false);
  const [showFullCollection, setShowFullCollection] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('All');
  const [selectedCardName, setSelectedCardName] = useState<string>('All');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<{name: string, image: string, rarity: string, element: string} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  // Purchase flow state machine
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'digital' | 'physical' | null>(null);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'insufficient' | 'digital-preview' | 'confirm-digital' | 'physical-form' | 'success'>('idle');

  // Full song collection data structure
  const songCollection = [
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
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common', is_released: true, min_tier: 'wanderer' as CardTier },
  ];
  
  const elements = ['LIGHTNING', 'DARKNESS', 'WATER', 'HEART'];
  const rarities = ['All', 'Common', 'Rare'];
  
  // Card costs
  const digitalCost = 20;
  const physicalCost = 30;

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
    if (!profile?.cards) return false;
    return profile.cards.some(cardRow => cardRow.cards.card_name === cardName);
  };

  // Helper to get user's owned cards in the format expected by getCardGateState
  const getUserCards = () => {
    if (!profile?.cards) return [];
    return profile.cards.map(cardRow => ({
      user_id: profile.id || '',
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
      'ALWAYS ON MY MIND': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'ALWAYS ON MY MIND (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind-remix.png?updatedAt=1762388342107',
      'ALONE': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'ALONE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'AMERICAN DREAM': 'https://ik.imagekit.io/CHXNDLER/card/american-dream.png?updatedAt=1762388346126',
      'BABY': 'https://ik.imagekit.io/CHXNDLER/card/baby.png?updatedAt=1762388345192',
      'BE MY BEE': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee.png?updatedAt=1762388342848',
      'BE MY BEE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee-acoustic.png?updatedAt=1762388342912',
      'BLUE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/BLUE%20(ACOUSTIC).png?updatedAt=1763055066119',
      'BLUE': 'https://ik.imagekit.io/CHXNDLER/card/blue.png?updatedAt=1762388346777',
      'BRAIN FREEZE': 'https://ik.imagekit.io/CHXNDLER/card/brain-freeze.png?updatedAt=1762388347224',
      'CHEERLEADER (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'CHEERLEADER': 'https://ik.imagekit.io/CHXNDLER/card/cheerleader.png?updatedAt=1762388346177',
      'COLLIDE': 'https://ik.imagekit.io/CHXNDLER/card/collide.png?updatedAt=1762388347054',
      'COLORS OF OUR HOME': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20.png?updatedAt=1763055065493',
      'COLORS OF OUR HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763055064803',
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
      'FEELING THIS': 'https://ik.imagekit.io/CHXNDLER/card/feeling-this.png?updatedAt=1762388347289',
      'GAME BOY HEART': 'https://ik.imagekit.io/CHXNDLER/card/game-boy-heart.png?updatedAt=1762388346348',
      'HOME': 'https://ik.imagekit.io/CHXNDLER/card/home.png?updatedAt=1762388345590',
      'HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/home-acoustic.png?updatedAt=1762388344295',
      'HOUSE PARTY': 'https://ik.imagekit.io/CHXNDLER/card/HOUSE%20PARTY.png?updatedAt=1763055601783',
      'HOUSE PARTY (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/house-party-acoustic.png?updatedAt=1762388343028',
      'I MIGHT FALL IN LOVE WITH YOU': 'https://ik.imagekit.io/CHXNDLER/card/i-might-fall-in-love-with-you.png?updatedAt=1762388340663',
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/I%20MIGHT%20FALL%20IN%20LOVE%20WITH%20YOU%20(ACOUSTIC).png?updatedAt=1763055066309',
      'KID FOREVER': 'https://ik.imagekit.io/CHXNDLER/card/kid-forever.png?updatedAt=1762388339589',
      'LETTING GO': 'https://ik.imagekit.io/CHXNDLER/card/letting-go.png?updatedAt=1762388344472',
      'LITTLE BLACK HEART': 'https://ik.imagekit.io/CHXNDLER/card/little-black-heart.png?updatedAt=1762388346814',
      'LITTLE BLACK HEART (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/LITTLE%20BLACK%20HEART%20(ACOUSTIC).png?updatedAt=1763055066090',
      'LOVE ME': 'https://ik.imagekit.io/CHXNDLER/card/love-me.png?updatedAt=1762388339563',
      'LOVE ME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/love-me-acoustic.png?updatedAt=1762388330787',
      'MAKE BELIEVE': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'MR. BRIGHTSIDE': 'https://ik.imagekit.io/CHXNDLER/card/mr.brightside.png?updatedAt=1762388346700',
      'OCEAN GIRL': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl.png?updatedAt=1762388343942',
      'OCEAN GIRL (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-acoustic.png?updatedAt=1762388344386',
      'OCEAN GIRL (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-remix.png?updatedAt=1762388346301',
      'PARIS': 'https://ik.imagekit.io/CHXNDLER/card/paris.png?updatedAt=1762388344978',
      'PINK MOON': 'https://ik.imagekit.io/CHXNDLER/card/pink-moon.png?updatedAt=1762388347173',
      'POKÉMON': 'https://ik.imagekit.io/CHXNDLER/card/pokemon.png?updatedAt=1762388341960',
      'SOMEBODY TO LOVE': 'https://ik.imagekit.io/CHXNDLER/card/somebody-to-love.png?updatedAt=1762388347148',
      'TIENES UN AMIGO': 'https://ik.imagekit.io/CHXNDLER/card/tienes-un-amigo.png?updatedAt=1762388343639',
      'WE\'RE JUST FRIENDS': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends.png?updatedAt=1762388347233',
      'WE\'RE JUST FRIENDS (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-acoustic.png?updatedAt=1762388340285',
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-dmvrco-remix.png?updatedAt=1762388345669',
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-mickey-jas-remix.png?updatedAt=1762388346859',
      'CHXNDLER': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'WATER': 'https://ik.imagekit.io/CHXNDLER/card/WATER.png',
      'HEART': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'LIGHTNING': 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png',
      'DARKNESS': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
    };
    
    return songImages[songName] || 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910';
  };

  const getFilteredCards = () => {
    if (!selectedElement) return [];
    
    let filteredSongs = songCollection;
    
    // Filter by element
    filteredSongs = filteredSongs.filter(song => song.element === selectedElement);
    
    // Filter by rarity
    if (selectedRarity !== 'All') {
      filteredSongs = filteredSongs.filter(song => song.rarity === selectedRarity);
    }
    
    // Filter by card name
    if (selectedCardName !== 'All') {
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
    }
    
    return cards;
  };

  const getAvailableCardNames = () => {
    if (!selectedElement) return [];
    
    let filteredSongs = songCollection;
    
    // Filter by element
    filteredSongs = filteredSongs.filter(song => song.element === selectedElement);
    
    // Filter by rarity if not 'All'
    if (selectedRarity !== 'All') {
      filteredSongs = filteredSongs.filter(song => song.rarity === selectedRarity);
    }
    
    // Return unique card names
    return ['All', ...filteredSongs.map(song => song.name)];
  };

  // Helper functions for purchase flow
  const getCost = (type: 'digital' | 'physical') => {
    return type === 'digital' ? digitalCost : physicalCost;
  };

  const hasEnoughBalance = (type: 'digital' | 'physical') => {
    const cost = getCost(type);
    return (profile?.heartcoin_balance || 0) >= cost;
  };

  const handlePurchaseClick = (type: 'digital' | 'physical') => {
    setSelectedPurchaseType(type);
    if (type === 'digital') {
      // Always show digital preview for digital purchases
      setPurchaseState('digital-preview');
    } else {
      // For physical purchases, always show the shipping form in the right panel
      setPurchaseState('physical-form');
      // Prefill shipping form if user has previous orders
      prefillShippingForm();
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPurchaseType || !profile) return;
    
    const cost = getCost(selectedPurchaseType);
    const cards = getFilteredCards();
    const currentCard = cards[currentCardIndex];
    
    if (!currentCard) return;
    
    try {
      // TODO: Add card to user_cards table via API
      // For now just update the profile balance
      await updateProfile({ 
        heartcoin_balance: (profile.heartcoin_balance || 0) - cost 
      });
      setPurchaseState('success');
      try { sfx.play('success', 0.8); } catch {}
      
      // Reset after 2 seconds
      setTimeout(() => {
        resetPurchaseState();
      }, 2000);
    } catch (error) {
      try { sfx.play('error', 0.8); } catch {}
      console.error('Purchase failed:', error);
      resetPurchaseState();
    }
  };

  const resetPurchaseState = () => {
    setSelectedPurchaseType(null);
    setPurchaseState('idle');
    setShippingErrors({});
    // Keep shipping form data for user convenience - don't clear it
  };

  const openHeartCoinPopout = () => {
    try { sfx.play('click', 0.4); } catch {}
    // Find and click the heart coin button in the HUD to trigger existing popup
    const heartCoinButton = document.querySelector('[data-heart-coin-trigger]') || 
                           document.querySelector('img[src*="heart-coin"]')?.parentElement;
    if (heartCoinButton && heartCoinButton instanceof HTMLElement) {
      heartCoinButton.click();
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
    
    // Verify balance again
    if ((profile.heartcoin_balance || 0) < cost) {
      try { sfx.play('error', 0.8); } catch {}
      setPurchaseState('insufficient');
      return;
    }
    
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
      
      // Update profile balance
      await updateProfile({ 
        heartcoin_balance: (profile.heartcoin_balance || 0) - cost 
      });
      
      setPurchaseState('success');
      try { sfx.play('success', 0.8); } catch {}
      
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

  // Handle preselected card when modal opens
  useEffect(() => {
    if (open && preselectedCard) {
      // Set to show full collection and filter to the specific card
      setShowFullCollection(true);
      setSelectedCardName(preselectedCard);
    }
  }, [open, preselectedCard]);

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
      {/* Hologram base glow - wider and stronger */}
      <div 
        className="fixed inset-0 z-[2147483646] flex items-center justify-center"
        style={{
          pointerEvents: 'none',
          paddingTop: '300px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(252,84,175,0.7) 0%, rgba(252,84,175,0.4) 30%, rgba(252,84,175,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Binder Modal - holographic popup */}
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{
          paddingTop: '300px'
        }}
      >
        <div
          className="binder-hologram-container"
          style={{
            width: 'min(92vw, 700px)',
            height: '38vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px 14px 0px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,105,180,0.55)',
            boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#FF69B4',
            position: 'relative',
            overflow: 'visible'
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
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(252,84,175,0.6) 0%, rgba(252,84,175,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(252,84,175,0.4) 0%, rgba(252,84,175,0.2) 50%, transparent 100%)',
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
            className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
              textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
              background: 'rgba(255,105,180,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div className="flex justify-center items-center mb-3 flex-shrink-0">
            <div 
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              DIGITAL CARD BINDER
            </div>
          </div>
          
          {/* Thin pink neon line */}
          <div 
            className="w-full h-px mb-4 flex-shrink-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />

          {/* Scrollable content container */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100% - 80px)' }}>

          {/* Card popup - fills entire content area when open */}
          {cardOpen && (
            <div className="flex flex-col items-center justify-center w-full h-full">
              {/* Large card display */}
              <div 
                className="relative flex items-center justify-center w-full h-full"
              >
                {/* Flippable Card */}
                <div 
                  className="rounded-lg shadow-2xl cursor-pointer"
                  style={{
                    width: 'min(320px, 70vw)',
                    height: 'min(480px, 80vh)',
                    boxShadow: '0 0 40px rgba(255,105,180,0.8), 0 0 80px rgba(255,105,180,0.5), 0 0 120px rgba(255,105,180,0.3)',
                    border: '2px solid rgba(255,105,180,0.6)',
                    perspective: '1000px'
                  }}
                  onClick={() => {
                    try { sfx.play('flip', 0.8); } catch {}
                    setIsCardFlipped(!isCardFlipped);
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      textAlign: 'center',
                      transition: 'transform 0.6s',
                      transformStyle: 'preserve-3d',
                      transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front of card */}
                    <img
                      src={selectedCard?.image || "https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"}
                      alt={selectedCard?.name || "Card"}
                      className="w-full h-full rounded-lg object-contain"
                      style={{
                        position: 'absolute',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                      }}
                      draggable={false}
                    />
                    
                    {/* Back of card */}
                    <img
                      src="https://ik.imagekit.io/CHXNDLER/card/back.png?updatedAt=1762388351170"
                      alt="Card Back"
                      className="w-full h-full rounded-lg object-contain"
                      style={{
                        position: 'absolute',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => {
                    try { sfx.play('close', 0.8); } catch {}
                    setCardOpen(false);
                    setIsCardFlipped(false);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200"
                  style={{
                    boxShadow: '0 0 15px rgba(255,105,180,0.6)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Normal content - only shown when card is not open */}
          {!cardOpen && (
            <>
          {/* Back button and filters positioned in same row */}
          {selectedElement && (
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => {
                  try { sfx.play('click', 0.6); } catch {}
                  setSelectedElement(null);
                  setSelectedCardName('All');
                  setCurrentCardIndex(0);
                }}
                className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors text-xs"
                style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 12H5m7-7l-7 7 7 7"/>
                </svg>
                Back to Elements
              </button>
              
              {/* Filters positioned to the right of back button */}
              <div className="flex items-center gap-3">
                {/* Card Name Filter */}
                <select
                  value={selectedCardName}
                  onChange={(e) => {
                    setSelectedCardName(e.target.value);
                    setCurrentCardIndex(0);
                  }}
                  className="px-2 py-1 rounded border border-pink-400/60 bg-black/40 text-pink-200 text-sm"
                  style={{ 
                    boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                    textShadow: '0 0 4px rgba(255,182,193,0.6)'
                  }}
                >
                  {getAvailableCardNames().map(cardName => (
                    <option key={cardName} value={cardName} className="bg-black text-pink-200">
                      {cardName}
                    </option>
                  ))}
                </select>
                
                {/* Rarity Filter - to the right of song filter */}
                <select
                  value={selectedRarity}
                  onChange={(e) => {
                    setSelectedRarity(e.target.value);
                    setSelectedCardName('All');
                    setCurrentCardIndex(0);
                  }}
                  className="px-2 py-1 rounded border border-pink-400/60 bg-black/40 text-pink-200 text-sm"
                  style={{ 
                    boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                    textShadow: '0 0 4px rgba(255,182,193,0.6)'
                  }}
                >
                  {rarities.map(rarity => (
                    <option key={rarity} value={rarity} className="bg-black text-pink-200">
                      {rarity}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Waveform track - positioned between filters and card layout */}
          {selectedElement && (() => {
            const cards = getFilteredCards();
            const currentCard = cards[currentCardIndex];
            if (!currentCard) return null;

            // Map element names to waveform element types
            const getWaveformElement = (elementName: string) => {
              switch(elementName.toLowerCase()) {
                case 'heart': return 'heart' as const;
                case 'water': return 'water' as const;
                case 'lightning': return 'lightning' as const;
                case 'darkness': return 'darkness' as const;
                default: return 'darkness' as const;
              }
            };

            return null;
          })()}

          {/* Card layout with image - positioned directly under Back to Elements */}
          {selectedElement && (() => {
            const cards = getFilteredCards();
            const currentCard = cards[currentCardIndex];
            
            if (!currentCard) {
              return null;
            }


            return (
              <>
                {/* Horizontal layout with card image and text */}
                <div className="flex flex-row items-start gap-2 w-full overflow-visible mb-4">
                  {/* Left navigation arrow */}
                  {cards.length > 1 && (
                    <button
                      onClick={() => {
                        try { sfx.play('click', 0.5); } catch {}
                        setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'prev'));
                      }}
                      className="w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200 mt-16"
                      style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                  )}
                  
                  {/* Card image with fixed width */}
                  <div className="flex-shrink-0 relative">
                    {(() => {
                      const gateState = getCardState(currentCard);
                      const isLocked = gateState === 'comingSoon' || gateState === 'lockedTier';
                      return (
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => {
                            try { sfx.play('click', 0.8); } catch {}
                            setSelectedCard(currentCard);
                            setCardOpen(true);
                          }}
                        >
                          <img
                            src={currentCard.image}
                            alt={currentCard.name}
                            className={
                              isLocked
                                ? "w-[120px] h-auto rounded-lg transition-all duration-300 blur-xl brightness-50 opacity-60"
                                : "w-[120px] h-auto rounded-lg transition-transform duration-300 hover:scale-110"
                            }
                            style={{
                              boxShadow: gateState === 'owned' 
                                ? '0 0 15px rgba(34,197,94,0.6), 0 0 30px rgba(34,197,94,0.3)'
                                : '0 0 15px rgba(255,105,180,0.6), 0 0 30px rgba(255,105,180,0.3)',
                              border: gateState === 'owned'
                                ? '2px solid rgba(34,197,94,0.6)'
                                : '2px solid rgba(255,105,180,0.6)',
                            }}
                            draggable={false}
                          />

                          {isLocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                              <div className={`px-3 py-1 rounded-xl bg-black/60 text-[11px] font-semibold tracking-wide backdrop-blur-md ${
                                gateState === 'comingSoon' 
                                  ? 'border border-pink-400/70 text-pink-100 shadow-[0_0_18px_rgba(252,84,175,0.7)]'
                                  : currentCard.min_tier === 'dreamer'
                                    ? 'border border-yellow-400/70 text-yellow-100 shadow-[0_0_18px_rgba(255,215,0,0.7)]'
                                    : currentCard.min_tier === 'lover'
                                      ? 'border border-pink-400/70 text-pink-100 shadow-[0_0_18px_rgba(252,84,175,0.7)]'
                                      : 'border border-pink-400/70 text-pink-100 shadow-[0_0_18px_rgba(252,84,175,0.7)]'
                              }`}>
                                {gateState === 'comingSoon'
                                  ? "Coming Soon"
                                  : `Reach ${getTierDisplayName(currentCard.min_tier)} to unlock`}
                              </div>
                            </div>
                          )}
                          
                          {gateState === 'owned' && (
                            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Card count info directly under the card image, left-aligned */}
                    {cards.length > 1 && (
                      <div 
                        className="mt-1 text-left"
                        style={{ 
                          color: '#FFB6C1', 
                          textShadow: '0 0 4px rgba(255,182,193,0.6)',
                          fontSize: '10px',
                          maxWidth: '120px'
                        }}
                      >
                        {currentCardIndex + 1} of {cards.length} {currentCard.element}
                      </div>
                    )}
                    
                    {/* HeartCoins text positioned to the right of card PNG */}
                    {(() => {
                      const gateState = getCardState(currentCard);
                      if (gateState === 'available') {
                        return null; // Removed HeartCoins balance display
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Right navigation arrow - positioned directly next to card */}
                  {cards.length > 1 && (
                    <button
                      onClick={() => {
                        try { sfx.play('click', 0.5); } catch {}
                        setCurrentCardIndex(prev => findNextUnlockedCard(prev, 'next'));
                      }}
                      className="w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200 ml-1 self-start mt-16"
                      style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  )}
                  
                  {/* Card info positioned to the right */}
                  {purchaseState === 'idle' ? (
                    <div className="flex flex-col text-left">
                      <h2 className="text-xl font-bold text-yellow-300 mb-1">
                        {currentCard.title}
                      </h2>
                      
                      {/* Element and rarity info - positioned between title and one-liner */}
                      <div className="flex items-center gap-3 mb-1 text-xs">
                        {currentCard.element && (
                          <div 
                            style={{ 
                              color: '#FFB6C1', 
                              textShadow: '0 0 4px rgba(255,182,193,0.6)'
                            }}
                          >
                            Element: <span style={{ 
                              color: getElementColor(currentCard.element),
                              textShadow: `0 0 4px ${getElementColor(currentCard.element)}80`
                            }}>{currentCard.element}</span>
                          </div>
                        )}
                        
                        <div 
                          style={{ 
                            color: currentCard.rarity === 'Rare' ? '#FF69B4' : '#87CEEB',
                            textShadow: '0 0 4px currentColor'
                          }}
                        >
                          ★ {currentCard.rarity.toUpperCase()} ★
                        </div>
                      </div>
                      
                      <p className="text-sm text-pink-200 opacity-90">
                        {getCardOneLiner(currentCard.name)}
                      </p>

                      {/* Purchase buttons positioned below text */}
                      {(() => {
                        const gateState = getCardState(currentCard);
                        
                        if (gateState === 'owned') {
                          return (
                            <div className="mt-4">
                              <div className="flex items-center gap-2 px-3 py-1 rounded border border-green-400/60 bg-green-500/10 text-xs text-green-300"
                                   style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                <span>In Collection</span>
                              </div>
                            </div>
                          );
                        }
                        
                        if (gateState === 'comingSoon') {
                          return (
                            <div className="mt-4">
                              <div className="px-3 py-1 rounded border border-gray-400/60 bg-gray-500/10 text-xs text-gray-300">
                                Song not released yet
                              </div>
                            </div>
                          );
                        }
                        
                        if (gateState === 'lockedTier') {
                          const isDreamerTier = currentCard.min_tier === 'dreamer';
                          const isLoverTier = currentCard.min_tier === 'lover';
                          return (
                            <div className="mt-4">
                              <div className={`px-3 py-1 rounded text-xs ${
                                isDreamerTier 
                                  ? 'border border-yellow-400/60 bg-yellow-500/10 text-yellow-300'
                                  : isLoverTier
                                    ? 'border border-pink-400/60 bg-pink-500/10 text-pink-300'
                                    : 'border border-yellow-400/60 bg-yellow-500/10 text-yellow-300'
                              }`}
                                   style={{ 
                                     textShadow: isDreamerTier 
                                       ? '0 0 4px rgba(234,179,8,0.6)' 
                                       : isLoverTier
                                         ? '0 0 4px rgba(255,182,193,0.6)'
                                         : '0 0 4px rgba(234,179,8,0.6)'
                                   }}>
                                Reach {getTierDisplayName(currentCard.min_tier)} to unlock
                              </div>
                            </div>
                          );
                        }
                        
                        // gateState === 'available' - show purchase buttons
                        return (
                        <div className="mt-4">
                          <div className="flex gap-2">
                            {/* Digital option */}
                            <button
                              onClick={() => {
                                try { sfx.play('click', 0.6); } catch {}
                                if (purchaseState !== 'digital-preview') {
                                  handlePurchaseClick('digital');
                                } else {
                                  if (hasEnoughBalance('digital')) {
                                    // Second click confirms purchase inline
                                    handleConfirmPurchase();
                                  } else {
                                    setSelectedPurchaseType('digital');
                                    setPurchaseState('insufficient');
                                  }
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded border bg-pink-500/10 transition-all duration-200 text-xs ${
                                (purchaseState === 'digital-preview' && hasEnoughBalance('digital'))
                                  ? 'border-green-400/60 hover:border-green-400/80 hover:bg-green-500/20'
                                  : 'border-pink-400/40 hover:border-pink-400/70 hover:bg-pink-500/20'
                              }`}
                              style={{
                                boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                              }}
                            >
                              <img
                                src="/elements/heart-coin.png"
                                alt="Heart Coin"
                                className="w-3 h-3"
                                draggable={false}
                              />
                              <span 
                                className="text-yellow-300 font-bold text-xs"
                                style={{ textShadow: '0 0 4px rgba(255,255,0,0.6)' }}
                              >
                                {digitalCost}
                              </span>
                              {(purchaseState === 'digital-preview' && hasEnoughBalance('digital')) ? (
                                <span 
                                  className="text-green-300 font-semibold text-xs"
                                  style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                                >
                                  CONFIRM
                                </span>
                              ) : (
                                <span 
                                  className="text-pink-200 font-medium text-xs"
                                  style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                                >
                                  DIGITAL
                                </span>
                              )}
                            </button>
                            
                            {/* Physical option */}
                            <button
                              onClick={() => {
                                try { sfx.play('click', 0.6); } catch {}
                                handlePurchaseClick('physical');
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-pink-400/40 hover:border-pink-400/70 bg-pink-500/10 hover:bg-pink-500/20 transition-all duration-200 text-xs"
                              style={{
                                boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                              }}
                            >
                              <img
                                src="/elements/heart-coin.png"
                                alt="Heart Coin"
                                className="w-3 h-3"
                                draggable={false}
                              />
                              <span 
                                className="text-yellow-300 font-bold text-xs"
                                style={{ textShadow: '0 0 4px rgba(255,255,0,0.6)' }}
                              >
                                {physicalCost}
                              </span>
                              <span 
                                className="text-pink-200 font-medium text-xs"
                                style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                              >
                                PHYSICAL
                              </span>
                            </button>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  ) : (selectedPurchaseType === 'physical' && (purchaseState === 'physical-form' || purchaseState === 'insufficient')) ? (
                    <div className="flex flex-col text-left">
                      {/* Error display */}
                      {(Object.keys(shippingErrors).length > 0 || purchaseState === 'insufficient') && (
                        <div 
                          className="text-center mb-2 text-xs p-2 rounded"
                          style={{ 
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#FCA5A5'
                          }}
                        >
                          {purchaseState === 'insufficient' 
                            ? 'Not enough HeartCoins to confirm. Please earn more or try again later.'
                            : 'Please fill in all required fields'}
                        </div>
                      )}

                      {/* Shipping form inputs */}
                      <div className="space-y-2 mb-3">
                        {/* Full name */}
                        <input
                          type="text"
                          placeholder="Full name *"
                          value={shippingForm.fullName}
                          onChange={(e) => updateShippingField('fullName', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.fullName ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.fullName ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />

                        {/* Street address */}
                        <input
                          type="text"
                          placeholder="Street address *"
                          value={shippingForm.streetAddress}
                          onChange={(e) => updateShippingField('streetAddress', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.streetAddress ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.streetAddress ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />

                        {/* City */}
                        <input
                          type="text"
                          placeholder="City *"
                          value={shippingForm.city}
                          onChange={(e) => updateShippingField('city', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.city ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.city ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />

                        {/* State */}
                        <input
                          type="text"
                          placeholder="State *"
                          value={shippingForm.state}
                          onChange={(e) => updateShippingField('state', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.state ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.state ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />

                        {/* ZIP Code */}
                        <input
                          type="text"
                          placeholder="ZIP code *"
                          value={shippingForm.zipCode}
                          onChange={(e) => updateShippingField('zipCode', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.zipCode ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.zipCode ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />

                        {/* Country */}
                        <input
                          type="text"
                          placeholder="Country *"
                          value={shippingForm.country}
                          onChange={(e) => updateShippingField('country', e.target.value)}
                          className={`w-full px-2 py-1 rounded border bg-black/40 text-pink-200 text-xs placeholder-pink-300/60 ${
                            shippingErrors.country ? 'border-red-400/60' : 'border-pink-400/40'
                          }`}
                          style={{ 
                            boxShadow: `0 0 8px ${shippingErrors.country ? 'rgba(239,68,68,0.3)' : 'rgba(255,105,180,0.3)'}`,
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handlePhysicalPurchase}
                          className="px-3 py-1 rounded border border-green-400/60 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 text-xs text-green-300"
                          style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                        >
                          CONFIRM
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
                  ) : purchaseState === 'digital-preview' && selectedPurchaseType === 'digital' ? (
                    <div className="flex flex-col text-left">
                      {/* Title: [user name] Heart Coin PNG [# of current heart coins] */}
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl font-bold text-yellow-300">
                          {profile?.display_name || profile?.username || 'User'}
                        </h2>
                        <img
                          src="/elements/heart-coin.png"
                          alt="Heart Coin"
                          className="w-5 h-5"
                          draggable={false}
                        />
                        <span 
                          className="text-yellow-300 font-bold text-xl"
                          style={{ textShadow: '0 0 4px rgba(255,255,0,0.6)' }}
                        >
                          {profile?.heartcoin_balance || 0}
                        </span>
                      </div>
                      
                      {/* Element: Heart Coin PNG then 20 */}
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <img
                          src="/elements/heart-coin.png"
                          alt="Heart Coin"
                          className="w-4 h-4"
                          draggable={false}
                        />
                        <span 
                          className="text-yellow-300 font-bold text-lg"
                          style={{ textShadow: '0 0 4px rgba(255,255,0,0.6)' }}
                        >
                          {digitalCost}
                        </span>
                      </div>

                      {/* Common rarity display */}
                      <div className="text-gray-300 text-sm mb-2">COMMON</div>
                      
                      {/* Check if user has enough heart coins */}
                      {hasEnoughBalance('digital') ? (
                        <div className="mt-4 text-xs text-green-300" style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}>
                          Click CONFIRM next to the Digital button to continue.
                        </div>
                      ) : (
                        /* Not enough heart coins */
                        <div className="mt-4">
                          <div className="text-red-300 font-bold text-sm mb-2">NOT ENOUGH HEART COINS</div>
                          <button
                            onClick={openHeartCoinPopout}
                            className="text-xs text-blue-300 hover:text-blue-200 underline"
                            style={{ textShadow: '0 0 4px rgba(147,197,253,0.6)' }}
                          >
                            EARN MORE HEART COINS
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                
                {/* Card count moved under card image */}
              </>
            );
          })()}



          <div className="flex justify-between items-center mb-4">            
            {!selectedElement && (
              <div 
                className="text-center flex-1"
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.2, 
                  fontSize: 9, 
                  color: '#FF69B4', 
                  textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(255,105,180,0.6)', 
                  marginTop: '-4px' 
                }}
              >
                Earn the cards that reflect your journey as you move through the Heartverse.
              </div>
            )}
          </div>



          {/* Dynamic Content - Binder Cards or Full Collection */}
          <div className="relative mt-1">
            {!showFullCollection ? (
              // User's Binder - Show 5 initial slots
              <div>
                <div className="grid gap-2 grid-cols-5">
                  {Array.from({ length: 5 }, (_, index) => {
                    // Check if there's a collected card for this slot
                    const collectedCard = profile?.cards?.[index];
                    const hasCard = !!collectedCard?.cards;
                    
                    // Show CHXNDLER card in first slot if no card is there
                    const isFirstSlotWithChxndler = index === 0 && !hasCard;

                    return (
                      <div
                        key={`slot-${index}`}
                        className={`rounded-lg border backdrop-blur-sm transition-all duration-300 ${
                          hasCard || isFirstSlotWithChxndler
                            ? 'border-white/10 cursor-pointer hover:scale-105' 
                            : 'border-white/5 cursor-default'
                        }`}
                        onClick={() => {
                          if (hasCard && collectedCard?.cards) {
                            try { sfx.play('click', 0.8); } catch {}
                            setSelectedCard({
                              name: collectedCard.cards.card_name,
                              image: getCardImage(collectedCard.cards.card_name, collectedCard.cards.element),
                              rarity: collectedCard.cards.rarity,
                              element: collectedCard.cards.element
                            });
                            setCardOpen(true);
                          } else if (isFirstSlotWithChxndler) {
                            try { sfx.play('click', 0.8); } catch {}
                            setSelectedCard({
                              name: 'CHXNDLER',
                              image: 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
                              rarity: 'Common',
                              element: 'ALL'
                            });
                            setCardOpen(true);
                          }
                        }}
                        style={{
                          boxShadow: hasCard || isFirstSlotWithChxndler
                            ? '0 0 15px rgba(255,105,180,0.3)' 
                            : '0 0 5px rgba(255,105,180,0.1)',
                        }}
                      >
                        <div className="relative">
                          {hasCard && collectedCard?.cards ? (
                            <>
                              {(() => {
                                // Create a card object to check gate state
                                const cardData = {
                                  id: collectedCard.cards.id,
                                  title: collectedCard.cards.card_name,
                                  card_name: collectedCard.cards.card_name,
                                  image_url: getCardImage(collectedCard.cards.card_name, collectedCard.cards.element),
                                  element: collectedCard.cards.element,
                                  rarity: collectedCard.cards.rarity,
                                  is_released: collectedCard.cards.is_released ?? true,
                                  min_tier: (collectedCard.cards.min_tier as CardTier) ?? 'wanderer'
                                };
                                const gateState = getCardState(cardData);
                                const isLocked = gateState === 'comingSoon' || gateState === 'lockedTier';
                                
                                return (
                                  <div className="relative w-full h-28">
                                    <img
                                      src={getCardImage(collectedCard.cards.card_name, collectedCard.cards.element)}
                                      alt={collectedCard.cards.card_name}
                                      className={
                                        isLocked
                                          ? "w-full h-28 object-cover rounded blur-xl brightness-50 opacity-60 transition-all duration-300"
                                          : "w-full h-28 object-cover rounded transition-all duration-300"
                                      }
                                      draggable={false}
                                    />
                                    {isLocked && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                        <div className={`px-2 py-1 rounded-lg bg-black/60 text-[9px] font-semibold tracking-wide backdrop-blur-md ${
                                          gateState === 'comingSoon'
                                            ? 'border border-pink-400/70 text-pink-100 shadow-[0_0_15px_rgba(252,84,175,0.7)]'
                                            : cardData.min_tier === 'dreamer'
                                              ? 'border border-yellow-400/70 text-yellow-100 shadow-[0_0_15px_rgba(255,215,0,0.7)]'
                                              : cardData.min_tier === 'lover'
                                                ? 'border border-pink-400/70 text-pink-100 shadow-[0_0_15px_rgba(252,84,175,0.7)]'
                                                : 'border border-pink-400/70 text-pink-100 shadow-[0_0_15px_rgba(252,84,175,0.7)]'
                                        }`}>
                                          {gateState === 'comingSoon'
                                            ? "Coming Soon"
                                            : `Reach ${getTierDisplayName(cardData.min_tier)} to unlock`}
                                        </div>
                                      </div>
                                    )}
                                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                                      <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                                        <path d="M20 6L9 17l-5-5"/>
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          ) : isFirstSlotWithChxndler ? (
                            <>
                              <img
                                src="https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"
                                alt="CHXNDLER"
                                className="w-full h-28 object-cover rounded"
                                draggable={false}
                              />
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500/80 rounded-full flex items-center justify-center">
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-28 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded mb-1 border-2 border-dashed border-pink-400/30 flex items-center justify-center">
                              <div 
                                className="text-xs font-bold text-center"
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
                    <div className="grid grid-cols-4 gap-2 justify-center px-2" style={{ marginTop: '-8px' }}>
                      {elements.map((element) => (
                        <div
                          key={element}
                          className="text-center cursor-pointer group w-20"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedElement(element);
                            setSelectedCardName('All');
                            // Set the element's representative card as preselected (e.g., "LIGHTNING" card for LIGHTNING element)
                            setCurrentCardIndex(0);
                          }}
                        >
                          <div 
                            className="w-full h-28 rounded-lg border-2 border-pink-400/60 hover:border-pink-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105"
                            style={{
                              boxShadow: '0 0 15px rgba(255,105,180,0.3)',
                            }}
                          >
                            <img
                              src={`https://ik.imagekit.io/CHXNDLER/card/${element.toUpperCase()}.png`}
                              alt={`${element} Card`}
                              className="w-full h-full object-cover rounded-lg"
                              draggable={false}
                            />
                            {/* Holographic effect */}
                            <div 
                              className="absolute inset-0 opacity-20"
                              style={{
                                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                                animation: 'shimmer 3s ease-in-out infinite'
                              }}
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
                              {songCollection.filter(song => song.element === element).length}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
          
          {/* Purchase Flow - positioned at bottom of popup */}
          {selectedElement && (() => {
            const cards = getFilteredCards();
            const currentCard = cards[currentCardIndex];
            
            if (!currentCard) {
              return null;
            }

            return (
              <div className="mt-2">

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
                      <div className="mb-1">Confirm purchase of {currentCard.name} {selectedPurchaseType.toUpperCase()}.</div>
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


                {/* State E: Purchase successful */}
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
                          <div className="mb-1">Your {currentCard.name} physical card is on its way to you.</div>
                          <div className="text-xs">You can update your address later by contacting support if needed.</div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1">✓ Purchased!</div>
                          <div>{currentCard.name} has been added to your binder.</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
            </>
          )}

          </div>
        </div>
      </div>

      {/* Element Name Display - positioned on right side */}
      {selectedElement && (() => {
        const cards = getFilteredCards();
        const currentCard = cards[currentCardIndex];
        
        if (!currentCard) {
          return null;
        }

        return (
          <div 
            className="fixed z-[2147483645]"
            style={{
              right: '5vw',
              bottom: '35vh',
              pointerEvents: 'none'
            }}
          >
            <div 
              className="text-center font-bold"
              style={{
                color: getElementColor(currentCard.element),
                textShadow: `0 0 12px ${getElementColor(currentCard.element)}, 0 0 24px ${getElementColor(currentCard.element)}80`,
                fontSize: 'clamp(24px, 5vw, 48px)',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transform: 'rotate(-5deg)',
                filter: `drop-shadow(0 0 20px ${getElementColor(currentCard.element)}80)`
              }}
            >
              {currentCard.element}
            </div>
          </div>
        );
      })()}


      </>
  );
}
