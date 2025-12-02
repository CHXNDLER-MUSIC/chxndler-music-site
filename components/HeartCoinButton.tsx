"use client";

import { useState, useEffect, useMemo } from "react";
import { sfx } from "@/lib/sfx";
import Image from "next/image";
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseClient } from "@/lib/supabaseClient";
import { track } from "@/lib/analytics";
import { useBonusQuests } from '@/hooks/useBonusQuests';
import { BonusQuestWithCompletion } from '@/types/bonusQuests';

// Store item interface
interface StoreItem {
  id: string;
  title: string;
  description: string;
  image: string;
  image2?: string;
  priceUsd: number;
  priceHeartCoins: number;
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


// Physical store items
const PHYSICAL_ITEMS: StoreItem[] = [
  {
    id: 'necklace',
    title: 'Necklace',
    description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/necklace.png',
    priceUsd: 18,
    priceHeartCoins: 12,
    stripeUrl: 'https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'pin',
    title: 'PIN',
    description: 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/pin.png',
    priceUsd: 4.5,
    priceHeartCoins: 3,
    stripeUrl: 'https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'patch',
    title: 'PATCH',
    description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/patch.png',
    image2: 'https://ik.imagekit.io/CHXNDLER/STORE/patch-inverse.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    stripeUrl: 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'sticker',
    title: 'Sticker',
    description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/sticker.png',
    priceUsd: 3,
    priceHeartCoins: 2,
    stripeUrl: 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'hat',
    title: 'Hat',
    description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/hat.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'keychain',
    title: 'Keychain',
    description: 'A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you\'re connected, always.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/keychain.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    stripeUrl: 'https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'house-party-poster',
    title: 'House Party Poster',
    description: 'This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/house-party-poster.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'beanie',
    title: 'Beanie',
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/beanie-front.png',
    image2: 'https://ik.imagekit.io/CHXNDLER/STORE/beanie-back.png',
    priceUsd: 30,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'button',
    title: 'Button',
    description: 'A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/button.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    stripeUrl: 'https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'bracelet',
    title: 'Bracelet',
    description: "A reminder you wear on your wrist that you're growing, healing, and finding your place. It's a quiet symbol that you belong here, with the ones who feel deeply and love endlessly.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/bracelet.png',
    priceUsd: 24,
    priceHeartCoins: 16,
    stripeUrl: 'https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'pick',
    title: 'Pick',
    description: 'Your reminder to follow your passion wherever it leads. A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.',
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/pick.png',
    priceUsd: 6,
    priceHeartCoins: 4,
    stripeUrl: 'https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O',
    is_released: true,
    min_tier: 'wanderer'
  }
];

// Combine all items
const ALL_STORE_ITEMS = [...PHYSICAL_ITEMS];


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
};

export default function HeartCoinButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onOpenJournal, onOpenBinder, heartCoins: externalHeartCoins = 0, onHeartCoinsChange, isActive = false, journalCompleted = false, onJournalCompleted, onClose, ...restProps }: Props) {
  const { profile, refreshProfile, setIsJournalOpen } = useProfile();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EARN' | 'USE'>('EARN');
  const [activeUseTab, setActiveUseTab] = useState<'MERCH' | 'CARDS'>('MERCH');
  const [activeEarnTab, setActiveEarnTab] = useState<'DAILY QUESTS' | 'BONUS QUESTS'>('DAILY QUESTS');
  const [selectedCardElement, setSelectedCardElement] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [showPhysicalForm, setShowPhysicalForm] = useState(false);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [currentMerchIndex, setCurrentMerchIndex] = useState(0);
  const [flippedItems, setFlippedItems] = useState<Set<string>>(new Set());
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });
  const [heartCoins, setHeartCoins] = useState(0);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showHeartCoinPurchase, setShowHeartCoinPurchase] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Check for initial tab preference from hamburger menu
  const [isFromHamburger, setIsFromHamburger] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).heartCoinInitialTab) {
      setActiveTab((window as any).heartCoinInitialTab);
      setIsFromHamburger(true);
      // Check for initial USE sub-tab preference
      if ((window as any).heartCoinInitialUseTab) {
        setActiveUseTab((window as any).heartCoinInitialUseTab);
        // Clear the USE tab preference after using it
        delete (window as any).heartCoinInitialUseTab;
      }
      // Check for selected card filter
      if ((window as any).heartCoinSelectedCard) {
        setSelectedSong((window as any).heartCoinSelectedCard);
        // Clear the selected card after using it
        delete (window as any).heartCoinSelectedCard;
      }
      // Clear the main tab preference after using it
      delete (window as any).heartCoinInitialTab;
    }
  }, [open]); // Run when modal opens

  // Open modal when isActive becomes true (for hamburger menu integration)
  useEffect(() => {
    if (isActive && !open) {
      setOpen(true);
    } else if (!isActive && open) {
      setOpen(false);
      setIsFromHamburger(false);
    }
  }, [isActive, open]);

  // Listen for openHeartCoinCards event from collect card button
  useEffect(() => {
    const handleOpenHeartCoinCards = (e: CustomEvent) => {
      try {
        // Set the modal to open with USE tab and CARDS sub-tab
        setActiveTab('USE');
        setActiveUseTab('CARDS');
        
        // Set the selected song filter if provided
        if (e.detail?.cardTitle) {
          setSelectedSong(e.detail.cardTitle);
        }
        
        // Open the modal
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
  const fetchCards = async () => {
    setIsLoadingCards(true);
    try {
      const { data, error } = await supabaseClient
        .from('cards')
        .select('id, card_name, element, rarity, artwork_url, description, is_released, min_tier')
        .order('card_name');
      
      if (error) throw error;
      
      // Add default costs if not in database
      const cardsWithCosts = data.map(card => ({
        ...card,
        digitalCost: card.digitalCost || (card.rarity?.toLowerCase() === 'legendary' ? 50 : 
                     card.rarity?.toLowerCase() === 'rare' ? 25 : 20),
        physicalCost: card.physicalCost || (card.rarity?.toLowerCase() === 'legendary' ? 75 :
                      card.rarity?.toLowerCase() === 'rare' ? 35 : 30)
      }));
      
      setCards(cardsWithCosts);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setIsLoadingCards(false);
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
      // Reset song if it's not available in the selected element
      if (selectedSong && !availableSongs.includes(selectedSong)) {
        setSelectedSong('');
      }
      
      // Reset rarity if it's not available in the selected element  
      if (selectedRarity && !availableRarities.includes(selectedRarity)) {
        setSelectedRarity('');
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
    
    // Sort cards to show selected element cards first
    if (selectedCardElement && selectedCardElement !== 'all') {
      filtered.sort((a, b) => {
        const aIsSelectedElement = a.element?.toLowerCase() === selectedCardElement.toLowerCase();
        const bIsSelectedElement = b.element?.toLowerCase() === selectedCardElement.toLowerCase();
        
        // If a matches selected element but b doesn't, a comes first
        if (aIsSelectedElement && !bIsSelectedElement) return -1;
        // If b matches selected element but a doesn't, b comes first
        if (!aIsSelectedElement && bIsSelectedElement) return 1;
        // Otherwise, maintain current order
        return 0;
      });
    }
    
    setFilteredCards(filtered);
  }, [cards, selectedCardElement, selectedRarity, selectedSong]);

  // Load cards when the modal opens and CARDS tab is active
  useEffect(() => {
    if (open && activeTab === 'USE' && activeUseTab === 'CARDS' && cards.length === 0) {
      fetchCards();
    }
  }, [open, activeTab, activeUseTab]);

  // Helper function to check if card should be blurred based on release status and user tier
  const shouldBlurCard = (card: Card): boolean => {
    // Special case: if min_tier is 'dreamer' and user is 'dreamer', show even if unreleased
    if (card.min_tier?.toLowerCase() === 'dreamer' && profile?.tier?.toLowerCase() === 'dreamer') {
      return false;
    }
    
    // If card is not released, blur it
    if (!card.is_released) return true;
    
    // If card is released, show it (no tier restrictions for released cards)
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

  // Helper function to update heart coins
  const updateHeartCoins = async (newAmount: number) => {
    setHeartCoins(newAmount);
    onHeartCoinsChange?.(newAmount);
    
    // Update database
    try {
      const { data: { user } } = await import('@/lib/supabase-browser').then(m => m.supabaseBrowser.auth.getUser());
      if (user) {
        await fetch('/api/heart-coins/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: newAmount })
        });
      }
    } catch (error) {
      console.error('Failed to update heart coins in database:', error);
    }
  };
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [isSubmittingPhrase, setIsSubmittingPhrase] = useState(false);
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Bonus quests hook
  const { bonusQuests, loading: bonusQuestsLoading, error: bonusQuestsError, isLoggedIn, completeQuest } = useBonusQuests();

  // Get today's element (rotate daily)
  const getTodaysElement = () => {
    const elements = ['heart', 'lightning', 'water', 'darkness'];
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return elements[dayOfYear % elements.length];
  };

  const todaysElement = getTodaysElement();

  // Reset flip state when item changes
  useEffect(() => {
    setFlippedItems(new Set());
  }, [currentMerchIndex]);

  // Handle image flip for items with alternative images
  const handleImageFlip = (itemId: string) => {
    const currentItem = PHYSICAL_ITEMS[currentMerchIndex];
    // Only allow flip if the item has an alternative image
    if (currentItem.id === itemId && currentItem.image2) {
      try { sfx.play('flip', 0.8); } catch {}
      setFlippedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    }
  };

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
      }

      const result = await completeQuest(quest);

      if (result.success) {
        // Award heart coins using existing system
        if (result.rewards?.heartcoins) {
          await updateHeartCoins(heartCoins + result.rewards.heartcoins);
        }

        // Show success message
        setCheckInMessage(result.message);
        setStatusType('success');
        setShowCheckInSuccess(true);

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

  const getElementIcon = (element: string) => {
    return `/elements/${element}.webp`;
  };

  const handleElementTap = () => {
    if (!dailyQuests.elementTapped) {
      try { sfx.play('click', 0.8); } catch {}
      updateHeartCoins(heartCoins + 1);
      setDailyQuests(prev => ({ ...prev, elementTapped: true }));
      
      // Close heart coin display and open blue display
      setOpen(false);
      try { onOpenBlueDisplay?.(); } catch {}
    }
  };

  const handleJournalEntry = () => {
    if (!dailyQuests.journalEntry) {
      try { sfx.play('click', 0.8); } catch {}
      
      // Close heart coin display and open journal
      setOpen(false);
      try { 
        // Use the ProfileContext journal state to open the journal popup
        setIsJournalOpen(true);
        onOpenJournal?.(); 
      } catch {}
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
    try { sfx.play('click', 0.6); } catch {}
  };

  const handleBackToStore = () => {
    setShowItemDetail(false);
    setSelectedItem(null);
    try { sfx.play('close', 0.4); } catch {}
  };

  const handlePurchaseWithHeartCoins = async (item: StoreItem) => {
    if (!profile) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/purchase-item-with-heartcoins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          itemTitle: item.title,
          priceHeartCoins: item.priceHeartCoins,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Success! Update UI and profile
        try { sfx.play('click', 0.7); } catch {}
        
        // Update local heart coins state
        const newBalance = (profile.heartcoin_balance || 0) - item.priceHeartCoins;
        updateHeartCoins(newBalance);
        
        // Refresh profile to update HeartCoin balance
        await refreshProfile();
        
        // Show success and go back to store
        setTimeout(() => {
          handleBackToStore();
        }, 1500);
        
      } else if (response.status === 400 && result.error?.includes('insufficient')) {
        // Insufficient HeartCoins - handled in UI
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('HeartCoin purchase error:', error);
    } finally {
      setIsProcessing(false);
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
      try { sfx.play('click', 0.8); } catch {}
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        data-tour-id="heartcoins"
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 rounded-lg transition-all duration-200 w-14 h-12"
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
          className="w-full h-full object-cover rounded"
          style={{
            objectFit: 'cover'
          }}
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '250px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.2) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
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
              try { onOpenBlueDisplay?.(); } catch {}
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

          
          {/* Heart Coin Balance - Top Left */}
          <div className="absolute top-3 left-4 flex items-center space-x-2">
            <img
              src="/elements/heart-coin.webp"
              alt="Heart Coin"
              className="w-10 h-10"
            />
            <div className="flex items-center">
              <div 
                className="text-lg font-bold text-left leading-none"
                style={{ 
                  color: '#FFFFFF', 
                  textShadow: '0 0 8px rgba(255,255,255,0.8)' 
                }}
              >
                {profile?.id ? heartCoins : 0}
              </div>
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center mb-3 mt-2">
            <div 
              className="text-lg font-bold mb-2"
              style={{ 
                color: '#FFFFFF', 
                textShadow: '0 0 8px rgba(255,255,255,0.6)', 
                fontSize: '16px'
              }}
            >
              HEART COINS
            </div>
            
            {/* Tabs */}
            <div className="flex justify-center mb-2 space-x-1">
              {(['EARN', 'USE'] as const).map((tab) => (
                <button
                  key={tab}
                  data-tour-id={`heartcoins-${tab.toLowerCase()}-tab`}
                  onClick={() => {
                    try { sfx.play('click', 0.6); } catch {}
                    setActiveTab(tab);
                  }}
                  className="px-6 py-1.5 text-xs rounded border transition-all duration-200"
                  style={{
                    background: activeTab === tab 
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)',
                    color: activeTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                    borderColor: activeTab === tab ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                    textShadow: activeTab === tab ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                    boxShadow: activeTab === tab ? '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)' : 'none',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            {/* Thin pink neon line */}
            <div 
              className="w-full h-px mb-1"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8) 20%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,255,255,0.6)'
              }}
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'EARN' && (
            <>
              {/* Description Text */}
              <div 
                className="text-base text-center mb-3"
                style={{ 
                  color: '#FFFFFF', 
                  textShadow: '0 0 4px rgba(255,255,255,0.8)', 
                  fontSize: '14px',
                  lineHeight: 1.3
                }}
              >
                Heart coins are the energy of the Heartverse. You earn them by exploring, connecting and showing up.
              </div>

              {/* Earn Sub-tabs */}
              <div className="flex justify-center mb-3 space-x-3">
                {(['DAILY QUESTS', 'BONUS QUESTS'] as const).map((tab) => (
                  <button
                    key={tab}
                    data-tour-id={`heartcoins-${tab.toLowerCase().replace(' ', '-')}-tab`}
                    onClick={() => {
                      try { sfx.play('click', 0.6); } catch {}
                      setActiveEarnTab(tab);
                    }}
                    className="px-6 py-2 text-sm rounded border transition-all duration-200"
                    style={{
                      background: activeEarnTab === tab 
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)',
                      color: activeEarnTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                      borderColor: activeEarnTab === tab ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                      textShadow: activeEarnTab === tab ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                      boxShadow: activeEarnTab === tab ? '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)' : 'none',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                    onMouseEnter={(e) => {
                      if (activeEarnTab !== tab) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeEarnTab !== tab) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

          {/* Daily Quests Tab Content */}
          {activeEarnTab === 'DAILY QUESTS' && (
            <div className="mb-4">
            {/* Element of the Day */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-white/30 bg-white/10">
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
                    src={getElementIcon(todaysElement)} 
                    alt={`${todaysElement} element`}
                    className="w-8 h-8"
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
            <div className="flex items-center justify-between mb-1 p-2 rounded border border-white/30 bg-white/10">
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
              {bonusQuestsLoading ? (
                <div className="text-center text-white py-4">Loading bonus quests...</div>
              ) : bonusQuestsError ? (
                <div className="text-center text-red-400 py-4">Error loading quests: {bonusQuestsError}</div>
              ) : bonusQuests.length === 0 ? (
                <div className="text-center text-white/60 py-4">No bonus quests available</div>
              ) : (
                bonusQuests.map((quest, index) => (
                  <div key={quest.id} className="flex items-center justify-between mb-2 p-2 rounded border border-white/30 bg-white/10">
                    <div>
                      <div className="text-xs font-bold" style={{ color: '#FFFFFF' }}>
                        {index + 1}. {quest.title}
                      </div>
                      <div className="text-[10px]" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                        {quest.description}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBonusQuestComplete(quest)}
                        disabled={!isLoggedIn || !quest.can_complete || quest.times_completed >= (quest.max_total_completions || Infinity)}
                        className="px-2 py-1 text-xs rounded border transition-colors"
                        style={{
                          background: !isLoggedIn
                            ? 'rgba(100,100,100,0.3)'
                            : quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? 'rgba(0,255,0,0.1)' 
                            : quest.can_complete 
                              ? 'rgba(255,255,255,0.1)'
                              : 'rgba(100,100,100,0.3)',
                          color: !isLoggedIn
                            ? '#666'
                            : quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? '#00FF00' 
                            : quest.can_complete 
                              ? '#FFFFFF'
                              : '#666',
                          borderColor: !isLoggedIn
                            ? 'rgba(100,100,100,0.6)'
                            : quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? '#00FF00' 
                            : quest.can_complete 
                              ? 'rgba(255,255,255,0.6)'
                              : 'rgba(100,100,100,0.6)',
                          textShadow: !isLoggedIn
                            ? 'none'
                            : quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? '0 0 8px #00FF00, 0 0 16px #00FF00' 
                            : 'none',
                          boxShadow: !isLoggedIn
                            ? 'none'
                            : quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)' 
                            : 'none'
                        }}
                      >
                        {!isLoggedIn
                          ? 'Log in to complete this quest'
                          : (quest.times_completed > 0 && quest.max_total_completions === 1 
                            ? 'COMPLETED' 
                            : quest.quest_key === 'ATTEND_LIVESTREAM' 
                              ? 'CHECK IN'
                              : quest.quest_key === 'INVITE_FRIEND' 
                                ? 'INVITE FRIEND'
                                : 'COMPLETE')}
                      </button>
                      <span className="text-sm flex items-center" style={{ 
                        color: quest.times_completed > 0 && quest.max_total_completions === 1 ? '#666' : '#90EE90', 
                        textShadow: quest.times_completed > 0 && quest.max_total_completions === 1 ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' 
                      }}>
                        {quest.reward_notes || `+${quest.reward_heartcoins}`}
                        <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-6 h-6 ml-1" />
                      </span>
                    </div>
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
          
            </>
          )}

          {/* USE Tab Content */}
          {activeTab === 'USE' && (
            <div className="pl-1 pr-4 py-2">
              {!showItemDetail ? (
                <>
                  {/* Sub-tabs for USE */}
                  <div className="flex justify-center mb-1 space-x-3">
                    {(['MERCH', 'CARDS'] as const).map((tab) => (
                      <button
                        key={tab}
                        data-tour-id={`heartcoins-${tab.toLowerCase()}-tab`}
                        onClick={() => {
                          try { sfx.play('click', 0.6); } catch {}
                          setActiveUseTab(tab);
                        }}
                        className="px-10 py-1.5 text-sm rounded border transition-all duration-200"
                        style={{
                          background: activeUseTab === tab 
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.6) 100%)'
                            : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)',
                          color: activeUseTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                          borderColor: activeUseTab === tab ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                          textShadow: activeUseTab === tab ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                          boxShadow: activeUseTab === tab ? '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3)' : 'none',
                          fontWeight: 700,
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                          if (activeUseTab !== tab) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 100%)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeUseTab !== tab) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                          }
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div 
                    className="text-base text-center mb-1 -ml-4"
                    style={{ 
                      color: '#FFFFFF', 
                      textShadow: '0 0 4px rgba(255,255,255,0.8)', 
                      fontSize: '11px',
                      lineHeight: 1,
                      width: '100%',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Trade your HEART coins for collectibles and cards that reflect your journey.
                  </div>

                  {/* MERCH Tab Content */}
                  {activeUseTab === 'MERCH' && (
                    <div className="px-2">
                      
                      {/* Current Item Display */}
                      <div className="mb-2">
                        {PHYSICAL_ITEMS[currentMerchIndex] && (
                          <div 
                            className="rounded-lg px-4 pt-2 pb-4 transition-all duration-200"
                          >
                            {/* Image and Title with Navigation */}
                            <div className="flex items-start gap-1 mb-3">
                              {/* Left Arrow */}
                              <button
                                onClick={() => {
                                  try { sfx.play('click', 0.6); } catch {}
                                  setCurrentMerchIndex(prev => prev > 0 ? prev - 1 : PHYSICAL_ITEMS.length - 1);
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 transition-all duration-200 flex-shrink-0 mt-8 -ml-3"
                                style={{
                                  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
                                }}
                              >
                                <span className="text-white text-sm font-bold">←</span>
                              </button>
                              
                              {/* Item Image */}
                              <div className="flex flex-col items-center">
                                <div 
                                  className="relative w-28 h-28 flex-shrink-0 cursor-pointer transition-transform duration-200 hover:scale-105"
                                  onClick={() => handleImageFlip(PHYSICAL_ITEMS[currentMerchIndex].id)}
                                >
                                  <img
                                    src={
                                      flippedItems.has(PHYSICAL_ITEMS[currentMerchIndex].id) && PHYSICAL_ITEMS[currentMerchIndex].image2
                                        ? PHYSICAL_ITEMS[currentMerchIndex].image2
                                        : PHYSICAL_ITEMS[currentMerchIndex].image
                                    }
                                    alt={PHYSICAL_ITEMS[currentMerchIndex].title}
                                    className="w-full h-full object-cover rounded"
                                  />
                                  {/* Flip indicator for items with alternative images */}
                                  {PHYSICAL_ITEMS[currentMerchIndex].image2 && (
                                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">⟲</span>
                                    </div>
                                  )}
                                </div>
                                <div 
                                  className="text-xs text-white/80 mt-2 text-center"
                                  style={{
                                    textShadow: '0 0 4px rgba(255,255,255,0.4)'
                                  }}
                                >
                                  {currentMerchIndex + 1} of {PHYSICAL_ITEMS.length}
                                </div>
                              </div>
                              
                              {/* Right Arrow */}
                              <button
                                onClick={() => {
                                  try { sfx.play('click', 0.6); } catch {}
                                  setCurrentMerchIndex(prev => prev < PHYSICAL_ITEMS.length - 1 ? prev + 1 : 0);
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full border border-white/60 bg-white/10 hover:bg-white/20 transition-all duration-200 flex-shrink-0 mt-8"
                                style={{
                                  boxShadow: '0 0 8px rgba(255,255,255,0.3)'
                                }}
                              >
                                <span className="text-white text-sm font-bold">→</span>
                              </button>
                              
                              {/* Item Details */}
                              <div className="flex-1 ml-2">
                                {showHeartCoinPurchase ? (
                                  /* HeartCoin Purchase Confirmation */
                                  <div className="text-center">
                                    {/* User and Cost - Side by Side */}
                                    <div className="flex justify-between items-start mb-3">
                                      {/* User Section */}
                                      <div className="flex flex-col items-center flex-1">
                                        <div 
                                          className="font-bold text-white text-lg mb-3"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          {profile?.username || 'User'}
                                        </div>
                                        
                                        {/* Current Heart Coins */}
                                        <div className="flex flex-col items-center space-y-2">
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
                                          className="font-bold text-white text-lg mb-3"
                                          style={{
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                          }}
                                        >
                                          COST
                                        </div>
                                        
                                        <div className="flex flex-col items-center space-y-2">
                                          <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-12 h-12" />
                                          <div 
                                            className="text-xl font-bold"
                                            style={{ 
                                              color: '#FFFFFF', 
                                              textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                            }}
                                          >
                                            {selectedItem?.priceHeartCoins}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Message and Confirm Button */}
                                    {(profile?.id ? heartCoins : 0) >= (selectedItem?.priceHeartCoins || 0) ? (
                                      <>
                                        <div 
                                          className="text-sm mb-3"
                                          style={{ 
                                            color: '#90EE90', 
                                            textShadow: '0 0 4px rgba(144,238,144,0.8)'
                                          }}
                                        >
                                          You can purchase this item!
                                        </div>
                                        <button 
                                          className="w-full px-4 py-2 rounded border transition-colors"
                                          style={{ 
                                            backgroundColor: 'rgba(0,255,0,0.2)',
                                            borderColor: 'rgba(0,255,0,0.6)',
                                            color: '#90EE90',
                                            textShadow: '0 0 4px rgba(144,238,144,0.8)',
                                            fontWeight: 'bold'
                                          }}
                                          onClick={() => {
                                            if (selectedItem) {
                                              handlePurchaseWithHeartCoins(selectedItem);
                                            }
                                          }}
                                          disabled={isProcessing}
                                        >
                                          {isProcessing ? 'PROCESSING...' : 'CONFIRM'}
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <div 
                                          className="text-xs mb-3"
                                          style={{ 
                                            color: '#FF6B6B', 
                                            textShadow: '0 0 4px rgba(255,107,107,0.8)',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          You do not have enough heart coins
                                        </div>
                                        <button 
                                          className="w-full px-4 py-2 rounded border transition-colors cursor-not-allowed"
                                          style={{ 
                                            backgroundColor: 'rgba(255,0,0,0.2)',
                                            borderColor: 'rgba(255,0,0,0.6)',
                                            color: '#FF6B6B',
                                            textShadow: '0 0 4px rgba(255,107,107,0.8)',
                                            fontWeight: 'bold'
                                          }}
                                          disabled
                                        >
                                          CONFIRM
                                        </button>
                                      </>
                                    )}

                                    {/* Back Button */}
                                    <button 
                                      className="w-full px-4 py-1 rounded border border-gray-500/60 bg-gray-500/20 hover:bg-gray-500/30 transition-colors mt-2 text-white text-xs"
                                      onClick={() => {
                                        try { sfx.play('close', 0.4); } catch {}
                                        setShowHeartCoinPurchase(false);
                                        setSelectedItem(null);
                                      }}
                                    >
                                      BACK
                                    </button>
                                  </div>
                                ) : (
                                  /* Normal Item Details */
                                  <>
                                    <div 
                                      className="font-bold text-white text-lg mb-1"
                                      style={{
                                        textShadow: '0 0 4px rgba(255,255,255,0.6)'
                                      }}
                                    >
                                      {PHYSICAL_ITEMS[currentMerchIndex].title}
                                    </div>
                                    <div 
                                      className="text-xs text-white/90 mb-1"
                                      style={{
                                        textShadow: '0 0 2px rgba(255,255,255,0.4)',
                                        lineHeight: '1.3'
                                      }}
                                    >
                                      {PHYSICAL_ITEMS[currentMerchIndex].description}
                                    </div>
                                    
                                    {/* Buy Buttons */}
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => window.open(PHYSICAL_ITEMS[currentMerchIndex].stripeUrl, '_blank')}
                                        className="flex-1 px-3 py-1 rounded border border-white/60 bg-white/20 hover:bg-white/30 cursor-pointer transition-all duration-200 text-white font-semibold text-xs"
                                        style={{
                                          textShadow: '0 0 4px rgba(255,255,255,0.6)',
                                          boxShadow: '0 0 8px rgba(255,255,255,0.2)'
                                        }}
                                      >
                                        PAY WITH ${PHYSICAL_ITEMS[currentMerchIndex].priceUsd % 1 === 0 ? PHYSICAL_ITEMS[currentMerchIndex].priceUsd.toFixed(0) : PHYSICAL_ITEMS[currentMerchIndex].priceUsd.toFixed(1)}
                                      </button>
                                      <button
                                        onClick={() => {
                                          try { sfx.play('click', 0.6); } catch {}
                                          setSelectedItem(PHYSICAL_ITEMS[currentMerchIndex]);
                                          setShowHeartCoinPurchase(true);
                                        }}
                                        className="flex-1 px-3 py-1 rounded border border-yellow-500/60 bg-yellow-500/20 hover:bg-yellow-500/30 cursor-pointer transition-all duration-200 text-white font-semibold flex items-center justify-center gap-1 text-xs"
                                        style={{
                                          textShadow: '0 0 4px rgba(255,255,255,0.6)',
                                          boxShadow: '0 0 8px rgba(255,215,0,0.2)'
                                        }}
                                      >
                                        PAY WITH
                                        <img
                                          src="/elements/heart-coin.webp"
                                          alt="Heart Coin"
                                          className="w-4 h-4"
                                        />
                                        {PHYSICAL_ITEMS[currentMerchIndex].priceHeartCoins}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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

                          <div className="grid grid-cols-4 gap-2 justify-center px-2" style={{ marginTop: '4px' }}>
                            {['lightning', 'darkness', 'water', 'heart'].map((element, index) => {
                              const elementCounts = getElementCardCounts();
                              const count = elementCounts[element] || 0;
                              return (
                                <div
                                  key={element}
                                  className="text-center cursor-pointer group w-20"
                                  onClick={() => {
                                    try { sfx.play('click', 0.7); } catch {}
                                    setSelectedCardElement(element.toUpperCase());
                                    // Set the song filter to the specific element card (e.g., "LIGHTNING", "WATER", etc.)
                                    setSelectedSong(element.toUpperCase());
                                    setSelectedRarity('');
                                  }}
                                >
                                  <div 
                                    className="w-full h-28 rounded-lg border-2 border-white/60 hover:border-white/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105"
                                    style={{
                                      boxShadow: '0 0 15px rgba(255,255,255,0.3)',
                                    }}
                                  >
                                    <img
                                      src={`/cards/${element.toUpperCase()}.webp`}
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
                          {/* Back button */}
                          <div className="flex items-center mb-4">
                            <button
                              onClick={() => {
                                try { sfx.play('close', 0.6); } catch {}
                                setSelectedCardElement(null);
                                setSelectedRarity('');
                                setSelectedSong('');
                              }}
                              className="flex items-center text-white hover:text-gray-300 transition-colors"
                              style={{ fontSize: '14px' }}
                            >
                              <span className="mr-2">←</span>
                              Back to Elements
                            </button>
                          </div>

                          {/* Filter dropdowns */}
                          <div className="flex gap-2 mb-4">
                            <select 
                              value={selectedSong}
                              onChange={(e) => {
                                try { sfx.play('change', 0.6); } catch {}
                                setSelectedSong(e.target.value);
                              }}
                              className="bg-black/60 border border-white/40 rounded px-3 py-1 text-white text-sm flex-1"
                            >
                              {availableSongs.map(song => (
                                <option key={song} value={song}>{song}</option>
                              ))}
                            </select>
                            <select 
                              value={selectedRarity}
                              onChange={(e) => {
                                try { sfx.play('change', 0.6); } catch {}
                                setSelectedRarity(e.target.value);
                              }}
                              className="bg-black/60 border border-white/40 rounded px-3 py-1 text-white text-sm flex-1"
                            >
                              <option value="">All Rarities</option>
                              {availableRarities.map(rarity => (
                                <option key={rarity} value={rarity}>{rarity}</option>
                              ))}
                            </select>
                          </div>

                          {/* Card display */}
                          {isLoadingCards ? (
                            <div className="text-center text-white py-4">Loading cards...</div>
                          ) : filteredCards.length === 0 ? (
                            <div className="text-center text-white py-4">No cards found for this selection.</div>
                          ) : (
                            filteredCards.map(card => (
                            <div key={card.id} className="flex gap-2 max-w-full overflow-hidden">
                              {/* Card image */}
                              <div className="w-20 h-28 rounded-lg border-2 border-yellow-500/80 overflow-hidden flex-shrink-0 relative">
                                <img
                                  src={card.artwork_url || '/cards/CHXNDLER.webp'}
                                  alt={card.card_name}
                                  className={`w-full h-full object-cover ${shouldBlurCard(card) ? 'filter blur-sm opacity-60' : ''}`}
                                />
                                {shouldBlurCard(card) && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold bg-black/70 px-2 py-1 rounded">
                                      {!card.is_released ? 'UNRELEASED' : 'LOCKED'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Card details */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                {!showPhysicalForm && !showDigitalForm ? (
                                  <>
                                    <h2 
                                      className="text-base font-bold mb-1 truncate"
                                      style={{ 
                                        color: '#FFD700', 
                                        textShadow: '0 0 6px rgba(255,215,0,0.8)' 
                                      }}
                                    >
                                      {card.card_name}
                                    </h2>
                                    
                                    <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                                      <span 
                                        className="text-sm"
                                        style={{ 
                                          color: '#FFFFFF', 
                                          textShadow: '0 0 4px rgba(255,255,255,0.6)' 
                                        }}
                                      >
                                        Element: <span style={{ color: '#FFD700' }}>{card.element}</span>
                                      </span>
                                      
                                      <div className="flex items-center gap-1">
                                        <span className="text-blue-400">★</span>
                                        <span 
                                          className="text-sm font-bold"
                                          style={{ 
                                            color: '#00BFFF', 
                                            textShadow: '0 0 4px rgba(0,191,255,0.8)' 
                                          }}
                                        >
                                          {card.rarity}
                                        </span>
                                        <span className="text-blue-400">★</span>
                                      </div>
                                    </div>

                                    <p 
                                      className="text-xs mb-2 line-clamp-2"
                                      style={{ 
                                        color: '#FFFFFF', 
                                        textShadow: '0 0 4px rgba(255,255,255,0.6)' 
                                      }}
                                    >
                                      {card.description}
                                    </p>
                                  </>
                                ) : showPhysicalForm ? (
                                  /* Shipping Form */
                                  <div className="space-y-3">
                                    <h2 
                                      className="text-lg font-bold mb-4"
                                      style={{ 
                                        color: '#FFFFFF', 
                                        textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                      }}
                                    >
                                      Shipping Information
                                    </h2>

                                    <div>
                                      <input
                                        type="text"
                                        placeholder="FULL NAME"
                                        value={shippingInfo.fullName}
                                        onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        placeholder="STREET"
                                        value={shippingInfo.street}
                                        onChange={(e) => setShippingInfo({...shippingInfo, street: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        placeholder="CITY"
                                        value={shippingInfo.city}
                                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                        type="text"
                                        placeholder="STATE"
                                        value={shippingInfo.state}
                                        onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                      <input
                                        type="text"
                                        placeholder="ZIP"
                                        value={shippingInfo.zip}
                                        onChange={(e) => setShippingInfo({...shippingInfo, zip: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <input
                                        type="text"
                                        placeholder="COUNTRY"
                                        value={shippingInfo.country}
                                        onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                                        className="w-full p-2 bg-black/60 border border-white/40 rounded text-white text-sm placeholder-white/60"
                                        style={{
                                          boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                                        }}
                                      />
                                    </div>

                                    <button 
                                      className="w-full mt-4 px-4 py-2 rounded border border-green-500/60 bg-green-500/20 hover:bg-green-500/30 transition-colors"
                                      style={{ 
                                        color: '#90EE90', 
                                        textShadow: '0 0 4px rgba(144,238,144,0.8)',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => {
                                        try { sfx.play('click', 0.8); } catch {}
                                        // Handle confirm order logic here
                                        console.log('Order confirmed:', shippingInfo);
                                      }}
                                    >
                                      CONFIRM ORDER
                                    </button>
                                  </div>
                                ) : (
                                  /* Digital Purchase Form */
                                  <div className="text-center space-y-4">
                                    <h2 
                                      className="text-lg font-bold mb-4"
                                      style={{ 
                                        color: '#FFFFFF', 
                                        textShadow: '0 0 6px rgba(255,255,255,0.8)' 
                                      }}
                                    >
                                      {profile?.username || 'User'}
                                    </h2>

                                    {/* Current Heart Coins */}
                                    <div className="flex flex-col items-center space-y-2 mb-4">
                                      <div className="flex items-center gap-2">
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

                                    {/* Cost */}
                                    <div className="flex flex-col items-center space-y-2 mb-4">
                                      <div className="flex items-center gap-2">
                                        <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-8 h-8" />
                                        <div 
                                          className="text-lg font-bold"
                                          style={{ 
                                            color: '#FFFFFF', 
                                            textShadow: '0 0 4px rgba(255,255,255,0.6)' 
                                          }}
                                        >
                                          {card.digitalCost}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Message */}
                                    <div 
                                      className="text-sm mb-4"
                                      style={{ 
                                        color: heartCoins >= card.digitalCost ? '#90EE90' : '#FF6B6B', 
                                        textShadow: heartCoins >= card.digitalCost 
                                          ? '0 0 4px rgba(144,238,144,0.8)' 
                                          : '0 0 4px rgba(255,107,107,0.8)'
                                      }}
                                    >
                                      {(profile?.id ? heartCoins : 0) >= card.digitalCost 
                                        ? 'You can purchase this card!' 
                                        : 'You need more heart coins'}
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
                                )}

                                {/* Purchase buttons */}
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  <button 
                                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors text-sm ${
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
                                    onClick={() => {
                                      try { sfx.play('click', 0.7); } catch {}
                                      setShowDigitalForm(!showDigitalForm);
                                      setShowPhysicalForm(false);
                                    }}
                                  >
                                    <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-4 h-4" />{card.digitalCost} DIGITAL
                                  </button>
                                  
                                  <button 
                                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors text-sm ${
                                      showPhysicalForm 
                                        ? 'border-purple-400/80 bg-purple-400/30' 
                                        : 'border-purple-500/60 bg-purple-500/20 hover:bg-purple-500/30'
                                    }`}
                                    style={{ 
                                      color: showPhysicalForm ? '#E6E6FA' : '#DA70D6', 
                                      textShadow: showPhysicalForm 
                                        ? '0 0 6px rgba(230,230,250,0.8)' 
                                        : '0 0 4px rgba(218,112,214,0.8)',
                                      boxShadow: showPhysicalForm ? '0 0 15px rgba(218,112,214,0.4)' : 'none'
                                    }}
                                    onClick={() => {
                                      try { sfx.play('click', 0.7); } catch {}
                                      setShowPhysicalForm(!showPhysicalForm);
                                      setShowDigitalForm(false);
                                    }}
                                  >
                                    <img src="/elements/heart-coin.webp" alt="Heart Coin" className="w-4 h-4" />{card.physicalCost} PHYSICAL
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
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
                  
                  <div className="text-center mb-4">
                    <div className="relative w-32 h-32 mx-auto mb-3">
                      <Image
                        src={selectedItem.image}
                        alt={selectedItem.title}
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-white mb-4">{selectedItem.description}</p>
                    
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
                        {isProcessing ? 'Processing...' : `Purchase for ${selectedItem.priceHeartCoins} Heart Coins`}
                      </button>
                    ) : (
                      <div className="text-sm text-red-400 bg-red-400/20 px-3 py-2 rounded border border-red-400/40">
                        You need {selectedItem.priceHeartCoins - (profile?.id ? (profile?.heartcoin_balance || 0) : 0)} more Heart Coins
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          
          </div>
        </div>
      )}



    </>
  );
}
