"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

// TypeScript interfaces for shipping and orders
interface ShippingInfo {
  fullName: string;
  streetAddress: string;
  apartmentUnit: string;
  city: string;
  state: string;
  zipCode: string;
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

export default function BinderModal({ open, onClose }: Props) {
  const { profile, updateProfile } = useProfile();
  const [cardOpen, setCardOpen] = useState(false);
  const [showFullCollection, setShowFullCollection] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('All');
  const [selectedCardName, setSelectedCardName] = useState<string>('All');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<{name: string, image: string, rarity: string, element: string} | null>(null);
  const [preselectedCard, setPreselectedCard] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Purchase flow state machine
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'digital' | 'physical' | null>(null);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'insufficient' | 'confirm-digital' | 'physical-form' | 'success'>('idle');

  // Full song collection data structure
  const songCollection = [
    { name: 'MR. BRIGHTSIDE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'CHEERLEADER (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'MAKE BELIEVE', element: '', rarity: 'Common' },
    { name: 'ALONE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'ALONE (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common' },
    { name: 'LITTLE BLACK HEART (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common' },
    { name: 'LITTLE BLACK HEART', element: 'DARKNESS', rarity: 'Common' },
    { name: 'AMERICAN DREAM', element: 'DARKNESS', rarity: 'Common' },
    { name: 'PARIS', element: 'DARKNESS', rarity: 'Common' },
    { name: 'PINK MOON', element: 'DARKNESS', rarity: 'Common' },
    { name: 'ALWAYS ON MY MIND', element: 'HEART', rarity: 'Common' },
    { name: 'ALWAYS ON MY MIND (REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'BE MY BEE', element: 'HEART', rarity: 'Common' },
    { name: 'BE MY BEE (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'CHEERLEADER', element: 'HEART', rarity: 'Common' },
    { name: 'COLLIDE', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME (BLUMA Game Soundtrack)', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME', element: 'HEART', rarity: 'Common' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU', element: 'HEART', rarity: 'Common' },
    { name: 'LOVE ME', element: 'HEART', rarity: 'Common' },
    { name: 'LOVE ME (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'SOMEBODY TO LOVE', element: 'HEART', rarity: 'Common' },
    { name: 'TIENES UN AMIGO', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (DMVRCO REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (mickey jas REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'BABY', element: 'HEART', rarity: 'Common' },
    { name: 'BLUE (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'BLUE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'BRAIN FREEZE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'FEELING THIS', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'GAME BOY HEART', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOME', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOME (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOUSE PARTY', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOUSE PARTY (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'KID FOREVER', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'POKÉMON', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'LETTING GO', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL (ACOUSTIC)', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL (REMIX)', element: 'WATER', rarity: 'Common' },
    { name: 'WATER', element: 'WATER', rarity: 'Rare' },
    { name: 'HEART', element: 'HEART', rarity: 'Rare' },
    { name: 'LIGHTNING', element: 'LIGHTNING', rarity: 'Rare' },
    { name: 'DARKNESS', element: 'DARKNESS', rarity: 'Rare' },
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common' },
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
    zipCode: ''
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
      name: song.name,
      rarity: song.rarity,
      element: song.element,
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
    if (hasEnoughBalance(type)) {
      if (type === 'digital') {
        setPurchaseState('confirm-digital');
      } else {
        setPurchaseState('physical-form');
        // Prefill shipping form if user has previous orders
        prefillShippingForm();
      }
    } else {
      setPurchaseState('insufficient');
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
    // TODO: Implement HeartCoin earning popout
    console.log('Open HeartCoin earning popout');
    resetPurchaseState();
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
            zipCode: latestOrder.postal_code || ''
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
        country: 'US',
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

  // Reset purchase state when navigating cards
  useEffect(() => {
    resetPurchaseState();
  }, [currentCardIndex, selectedElement]);

  // Arrow key navigation
  useEffect(() => {
    if (!showFullCollection || !selectedElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cards = getFilteredCards();
      if (cards.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => prev > 0 ? prev - 1 : cards.length - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => prev < cards.length - 1 ? prev + 1 : 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullCollection, selectedElement, selectedRarity]);

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
            height: '45vh',
            padding: '10px 14px 14px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,105,180,0.55)',
            boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#FF69B4',
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
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => {
                try { sfx.play('click', 0.6); } catch {}
                setShowFullCollection(!showFullCollection);
                setSelectedElement(null);
                setSelectedCardName('All');
                setPreselectedCard(null);
                setCurrentCardIndex(0);
              }}
              className="px-3 py-1 text-[10px] font-bold rounded border border-pink-400/60 hover:border-pink-400/80 transition-all duration-200"
              style={{
                background: 'rgba(255,105,180,0.1)',
                color: '#FFB6C1',
                textShadow: '0 0 4px rgba(255,182,193,0.8)',
                boxShadow: '0 0 8px rgba(255,105,180,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,105,180,0.2)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255,105,180,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,105,180,0.1)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255,105,180,0.3)';
              }}
            >
              {showFullCollection ? 'BACK TO BINDER' : 'FULL COLLECTION'}
            </button>
            <div 
              className="absolute left-1/2 transform -translate-x-1/2"
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              DIGITAL CARD BINDER
            </div>
            <div className="w-32"></div>
          </div>
          
          {/* Thin pink neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />

          {/* Back button and filters positioned in same row */}
          {selectedElement && (
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => {
                  try { sfx.play('click', 0.6); } catch {}
                  setSelectedElement(null);
                  setSelectedCardName('All');
                  setPreselectedCard(null);
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

          {/* Card info positioned after filters - only show when purchase state is idle */}
          {selectedElement && purchaseState === 'idle' && (() => {
            const cards = getFilteredCards();
            const currentCard = cards[currentCardIndex];
            
            if (!currentCard) {
              return null;
            }

            return (
              <div className="text-center mb-4">
                {/* Card name title */}
                <div 
                  className="mb-1 font-bold"
                  style={{ 
                    color: getElementColor(currentCard.element), 
                    textShadow: `0 0 8px ${getElementColor(currentCard.element)}80`,
                    fontSize: '14px'
                  }}
                >
                  {currentCard.name}
                </div>
                
                {/* Element info */}
                {currentCard.element && (
                  <div 
                    className="mb-1"
                    style={{ 
                      color: '#FFB6C1', 
                      textShadow: '0 0 4px rgba(255,182,193,0.6)',
                      fontSize: '9px'
                    }}
                  >
                    Element: <span style={{ 
                      color: getElementColor(currentCard.element),
                      textShadow: `0 0 4px ${getElementColor(currentCard.element)}80`
                    }}>{currentCard.element}</span>
                  </div>
                )}
                
                {/* Rarity info */}
                <div 
                  className="mb-1"
                  style={{ 
                    color: currentCard.rarity === 'Rare' ? '#FF69B4' : '#87CEEB',
                    textShadow: '0 0 4px currentColor',
                    fontSize: '9px'
                  }}
                >
                  ★ {currentCard.rarity.toUpperCase()} ★
                </div>
                
                {/* 1-liner text */}
                {getCardOneLiner(currentCard.name) && (
                  <div 
                    className="text-xs mb-2 italic leading-tight"
                    style={{ 
                      color: '#E6E6FA', 
                      textShadow: '0 0 2px rgba(230,230,250,0.6)',
                      fontSize: '8px'
                    }}
                  >
                    {getCardOneLiner(currentCard.name)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Card layout with image on left side */}
          {selectedElement && (() => {
            const cards = getFilteredCards();
            const currentCard = cards[currentCardIndex];
            
            if (!currentCard) {
              return null;
            }

            return (
              <>
                <div className="flex items-center gap-0 mb-1 -mt-32">
                {/* Left navigation arrow */}
                {cards.length > 1 && (
                  <button
                    onClick={() => {
                      try { sfx.play('click', 0.5); } catch {}
                      setCurrentCardIndex(prev => prev > 0 ? prev - 1 : cards.length - 1);
                    }}
                    className="w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200 -mt-1"
                    style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                )}
                
                {/* Card image in the center */}
                <div className="flex-shrink-0">
                  <img
                    src={currentCard.image}
                    alt={currentCard.name}
                    className="w-24 h-auto rounded-lg cursor-pointer transition-transform duration-300 hover:scale-110"
                    style={{
                      boxShadow: '0 0 15px rgba(255,105,180,0.6), 0 0 30px rgba(255,105,180,0.3)',
                      border: '2px solid rgba(255,105,180,0.6)',
                    }}
                    draggable={false}
                    onClick={() => {
                      try { sfx.play('click', 0.8); } catch {}
                      setPreselectedCard(currentCard.name);
                      setSelectedCard(currentCard);
                      setCardOpen(true);
                    }}
                  />
                  
                  {/* Card count info below image */}
                  {cards.length > 1 && (
                    <div 
                      className="text-center mt-2"
                      style={{ 
                        color: '#FFB6C1', 
                        textShadow: '0 0 4px rgba(255,182,193,0.6)',
                        fontSize: '10px'
                      }}
                    >
                      {currentCardIndex + 1} of {cards.length}
                    </div>
                  )}
                </div>
                
                {/* Right navigation arrow */}
                {cards.length > 1 && (
                  <button
                    onClick={() => {
                      try { sfx.play('click', 0.5); } catch {}
                      setCurrentCardIndex(prev => prev < cards.length - 1 ? prev + 1 : 0);
                    }}
                    className="w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200 ml-4"
                    style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                )}
                  
                {/* Text content to the right of arrow */}
                <div className="flex-1 min-w-0 ml-1">
                  {(() => {
                    const cards = getFilteredCards();
                    const currentCard = cards[currentCardIndex];
                    
                    if (!currentCard) {
                      return null;
                    }

                    return (
                      <div className="flex flex-col justify-start">
                        {/* Show COLLECTED indicator */}
                        {isCardOwned(currentCard.name) && (
                          <div className="mb-2">
                            <div 
                              className="inline-block px-3 py-1 rounded-full border-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                              style={{
                                borderColor: '#10B981',
                                boxShadow: '0 0 15px rgba(16,185,129,0.4), 0 0 30px rgba(16,185,129,0.2)',
                              }}
                            >
                              <span 
                                className="text-green-300 text-xs font-bold tracking-wider"
                                style={{ 
                                  textShadow: '0 0 8px rgba(16,185,129,0.8), 0 0 16px rgba(16,185,129,0.4)',
                                  fontSize: '11px'
                                }}
                              >
                                ✓ COLLECTED
                              </span>
                            </div>
                          </div>
                        )}
                        
                        
                      </div>
                    );
                  })()
                  }
                </div>
              </div>
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

                    return (
                      <div
                        key={`slot-${index}`}
                        className={`rounded-lg border p-2 backdrop-blur-sm transition-all duration-300 ${
                          hasCard 
                            ? 'border-white/10 bg-black/40 cursor-pointer hover:scale-105' 
                            : 'border-white/5 bg-black/20 cursor-default'
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
                          }
                        }}
                        style={{
                          boxShadow: hasCard 
                            ? '0 0 15px rgba(255,105,180,0.3)' 
                            : '0 0 5px rgba(255,105,180,0.1)',
                        }}
                      >
                        <div className="relative">
                          {hasCard && collectedCard?.cards ? (
                            <>
                              <img
                                src={getCardImage(collectedCard.cards.card_name, collectedCard.cards.element)}
                                alt={collectedCard.cards.card_name}
                                className="w-full h-16 object-cover rounded mb-1"
                                draggable={false}
                              />
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                                  <path d="M20 6L9 17l-5-5"/>
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-16 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded mb-1 border-2 border-dashed border-pink-400/30 flex items-center justify-center">
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
                        {hasCard && collectedCard?.cards ? (
                          <>
                            <p className="text-[10px] font-semibold leading-tight" style={{ color: '#FF69B4' }}>
                              {collectedCard.cards.card_name}
                            </p>
                            <p className="text-[8px] opacity-70 flex justify-between items-center" style={{ color: '#FFB6C1' }}>
                              <span>{collectedCard.cards.element}</span>
                              <span className="uppercase tracking-wide opacity-60" style={{ color: getElementColor(collectedCard.cards.element) }}>
                                {collectedCard.cards.rarity}
                              </span>
                            </p>
                            {getCardOneLiner(collectedCard.cards.card_name) && (
                              <p className="text-[7px] italic opacity-60 leading-tight mt-0.5" style={{ color: '#E6E6FA' }}>
                                {getCardOneLiner(collectedCard.cards.card_name)}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-[8px] uppercase tracking-wide opacity-40" style={{ color: '#FFB6C1' }}>
                              Slot {index + 1}
                            </p>
                            <p className="text-[10px] font-semibold leading-tight opacity-40" style={{ color: '#FF69B4' }}>
                              No Card
                            </p>
                          </>
                        )}
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
                            setPreselectedCard(element.toUpperCase());
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
                {/* State A: Default view - Show HeartCoin balance */}
                {purchaseState === 'idle' && (
                  <div className="mt-2">
                    {/* HeartCoin balance */}
                    <div 
                      className="text-center mb-2 text-xs"
                      style={{ 
                        color: '#FFB6C1', 
                        textShadow: '0 0 4px rgba(255,182,193,0.6)'
                      }}
                    >
                      You have {profile?.heartcoin_balance || 0} HeartCoins
                    </div>
                    
                    {/* Purchase buttons */}
                    <div className="flex justify-center gap-2">
                      {/* Digital option */}
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.6); } catch {}
                          handlePurchaseClick('digital');
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
                          {digitalCost}
                        </span>
                        <span 
                          className="text-pink-200 font-medium text-xs"
                          style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                        >
                          DIGITAL
                        </span>
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
                )}

                {/* State B: Not enough HeartCoins */}
                {purchaseState === 'insufficient' && selectedPurchaseType && (
                  <div className="mt-2">
                    <div 
                      className="text-center mb-2 text-xs p-2 rounded"
                      style={{ 
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#FCA5A5'
                      }}
                    >
                      <div className="mb-1">You have {profile?.heartcoin_balance || 0} HeartCoins.</div>
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
                      <div className="mb-1">This costs {getCost(selectedPurchaseType)} HeartCoins.</div>
                      <div>You have {profile?.heartcoin_balance || 0} HeartCoins and will have {(profile?.heartcoin_balance || 0) - getCost(selectedPurchaseType)} after this purchase.</div>
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

                {/* State D: Physical shipping form */}
                {purchaseState === 'physical-form' && selectedPurchaseType === 'physical' && (
                  <div className="mt-2">
                    {/* Header */}
                    <div 
                      className="text-center mb-2 text-xs font-bold"
                      style={{ 
                        color: '#FF69B4',
                        textShadow: '0 0 4px rgba(255,105,180,0.6)'
                      }}
                    >
                      Ship a physical {currentCard.name} card
                    </div>
                    <div 
                      className="text-center mb-3 text-xs"
                      style={{ 
                        color: '#FFB6C1',
                        textShadow: '0 0 4px rgba(255,182,193,0.6)'
                      }}
                    >
                      Enter your mailing details so we can send your card.
                    </div>

                    {/* Error display */}
                    {Object.keys(shippingErrors).length > 0 && (
                      <div 
                        className="text-center mb-2 text-xs p-2 rounded"
                        style={{ 
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#FCA5A5'
                        }}
                      >
                        Please fill in all required fields
                      </div>
                    )}

                    {/* Shipping form */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Full name - spans 2 columns */}
                      <div className="col-span-2">
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
                      </div>

                      {/* Street address - spans 2 columns */}
                      <div className="col-span-2">
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
                      </div>

                      {/* Apartment/unit - spans 2 columns */}
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Apartment or unit (optional)"
                          value={shippingForm.apartmentUnit}
                          onChange={(e) => updateShippingField('apartmentUnit', e.target.value)}
                          className="w-full px-2 py-1 rounded border border-pink-400/40 bg-black/40 text-pink-200 text-xs placeholder-pink-300/60"
                          style={{ 
                            boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                            textShadow: '0 0 4px rgba(255,182,193,0.6)'
                          }}
                        />
                      </div>

                      {/* City */}
                      <div>
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
                      </div>

                      {/* State */}
                      <div>
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
                      </div>

                      {/* ZIP code - spans 2 columns */}
                      <div className="col-span-2">
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
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handlePhysicalPurchase}
                        className="px-3 py-1 rounded border border-green-400/60 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 text-xs text-green-300"
                        style={{ textShadow: '0 0 4px rgba(34,197,94,0.6)' }}
                      >
                        Confirm Physical Purchase
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
        </div>
      </div>

        {/* Card Display Modal */}
        {cardOpen && (
          <div 
            className="fixed inset-0 z-[2147483648] flex items-center justify-center p-4"
            style={{ paddingTop: '40vh' }}
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setCardOpen(false);
            }}
          >
            
            {/* Card container */}
            <div 
              className="relative z-10"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 'min(70vw, 200px)',
                maxHeight: '40vh',
              }}
            >
              {/* Card image */}
              <img
                src={selectedCard?.image || "https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"}
                alt={selectedCard?.name || "CHXNDLER Card"}
                className="w-full h-auto rounded-lg shadow-2xl"
                style={{
                  boxShadow: '0 0 40px rgba(255,105,180,0.8), 0 0 80px rgba(255,105,180,0.5), 0 0 120px rgba(255,105,180,0.3)',
                  border: '2px solid rgba(255,105,180,0.6)',
                }}
                draggable={false}
              />
              
              {/* Holographic shimmer effect */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                  animation: 'shimmer 4s ease-in-out infinite',
                }}
              />
              
              {/* Close button */}
              <button
                onClick={() => {
                  try { sfx.play('close', 0.8); } catch {}
                  setCardOpen(false);
                }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200"
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

      </>
  );
}