"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import Image from "next/image";
import { useProfile } from '@/contexts/ProfileContext';

// Store item interface
interface StoreItem {
  id: string;
  title: string;
  description: string;
  image: string;
  priceUsd: number;
  priceHeartCoins: number;
  stripeUrl: string;
  is_released?: boolean;
  min_tier?: string;
}

// Digital collectible cards
const DIGITAL_ITEMS: StoreItem[] = [
  {
    id: 'baby',
    title: 'Baby',
    description: 'Digital collectible card from the Heartverse collection.',
    image: '/card/baby.png',
    priceUsd: 3,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'ocean-girl',
    title: 'Ocean Girl',
    description: 'Digital collectible card from the Heartverse collection.',
    image: '/card/ocean-girl.png',
    priceUsd: 3,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00',
    is_released: true,
    min_tier: 'wanderer'
  },
  {
    id: 'somebody-to-love',
    title: 'Somebody to Love',
    description: 'Digital collectible card from the Heartverse collection.',
    image: '/card/somebody-to-love.png',
    priceUsd: 5,
    priceHeartCoins: 30,
    stripeUrl: 'https://buy.stripe.com/example',
    is_released: true,
    min_tier: 'lover'
  }
];

// Physical store items
const PHYSICAL_ITEMS: StoreItem[] = [
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
    id: 'beanie',
    title: 'Beanie',
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    image: 'https://ik.imagekit.io/CHXNDLER/STORE/beanie-front.png',
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
const ALL_STORE_ITEMS = [...DIGITAL_ITEMS, ...PHYSICAL_ITEMS];

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
};

export default function HeartCoinButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, onOpenJournal, onOpenBinder, heartCoins: externalHeartCoins = 0, onHeartCoinsChange, isActive = false, journalCompleted = false, onJournalCompleted, ...restProps }: Props) {
  const { profile, refreshProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'EARN' | 'USE' | 'SEND'>('EARN');
  const [heartCoins, setHeartCoins] = useState(externalHeartCoins);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dailyQuests, setDailyQuests] = useState({
    elementTapped: false,
    journalEntry: journalCompleted,
    friendInvited: false,
    friendInviteConfirm: false,
    checkedIn: false
  });

  // Update journal completion state when external prop changes
  useEffect(() => {
    setDailyQuests(prev => ({ ...prev, journalEntry: journalCompleted }));
  }, [journalCompleted]);

  // Update local state when external heartCoins change
  useEffect(() => {
    setHeartCoins(externalHeartCoins);
  }, [externalHeartCoins]);

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

  // Get today's element (rotate daily)
  const getTodaysElement = () => {
    const elements = ['heart', 'lightning', 'water', 'darkness'];
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return elements[dayOfYear % elements.length];
  };

  const todaysElement = getTodaysElement();

  const getElementIcon = (element: string) => {
    return `/elements/${element}.png`;
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
      try { onOpenJournal?.(); } catch {}
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
          src="/elements/heart-coin.png"
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
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Heart Coins Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '240px'
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
              border: '1px solid rgba(255,105,180,0.55)',
              boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FF69B4',
              position: 'relative',
              overflow: 'auto'
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
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,105,180,0.6) 0%, rgba(255,105,180,0.3) 40%, transparent 80%)',
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
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,105,180,0.4) 0%, rgba(255,105,180,0.2) 50%, transparent 100%)',
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
              try { onOpenBlueDisplay?.(); } catch {}
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

          
          {/* Heart Coin Balance - Top Left */}
          <div className="absolute top-3 left-4 flex items-center space-x-2">
            <img
              src="/elements/heart-coin.png"
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
                {heartCoins}
              </div>
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center mb-3 mt-2">
            <div 
              className="text-lg font-bold mb-2"
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '16px'
              }}
            >
              HEART COINS
            </div>
            
            {/* Tabs */}
            <div className="flex justify-start ml-2 mb-2 space-x-1">
              {(['EARN', 'USE', 'SEND'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    try { sfx.play('click', 0.6); } catch {}
                    setActiveTab(tab);
                  }}
                  className="px-2 py-1 text-[10px] rounded border transition-all duration-200"
                  style={{
                    background: activeTab === tab 
                      ? 'linear-gradient(135deg, rgba(255,105,180,0.4) 0%, rgba(255,105,180,0.6) 100%)'
                      : 'linear-gradient(135deg, rgba(255,105,180,0.1) 0%, rgba(255,105,180,0.2) 100%)',
                    color: activeTab === tab ? '#FFB6C1' : 'rgba(255,182,193,0.7)',
                    borderColor: activeTab === tab ? 'rgba(255,105,180,0.8)' : 'rgba(255,105,180,0.4)',
                    textShadow: activeTab === tab ? '0 0 6px rgba(255,105,180,0.8)' : 'none',
                    boxShadow: activeTab === tab ? '0 0 10px rgba(255,105,180,0.5), 0 0 20px rgba(255,105,180,0.3)' : 'none',
                    fontWeight: 700,
                    fontSize: '9px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,105,180,0.2) 0%, rgba(255,105,180,0.35) 100%)';
                      e.currentTarget.style.color = 'rgba(255,182,193,0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,105,180,0.1) 0%, rgba(255,105,180,0.2) 100%)';
                      e.currentTarget.style.color = 'rgba(255,182,193,0.7)';
                    }
                  }}
                >
                  {tab} HEART COINS
                </button>
              ))}
            </div>
            
            {/* Thin pink neon line */}
            <div 
              className="w-full h-px mb-2"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,105,180,0.6)'
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
                  color: '#FFB6C1', 
                  textShadow: '0 0 4px rgba(255,182,193,0.8)', 
                  fontSize: '14px',
                  lineHeight: 1.3
                }}
              >
                Heart coins are the energy of the Heartverse. You earn them by exploring, connecting and showing up.
              </div>

          {/* Section 1 - Daily Quests */}
          <div className="mb-4">
            <div 
              className="text-sm font-bold mb-2"
              style={{ 
                color: '#FFD700', 
                textShadow: '0 0 4px rgba(255,215,0,0.8)' 
              }}
            >
              ⭐ SECTION 1 — DAILY QUESTS
            </div>
            
            {/* Element of the Day */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  1. Tap the Element of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Touch the glowing planet to receive one HEART coin.
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
                  <img src="/elements/heart-coin.png" alt="HeartCoin" className="w-6 h-6 ml-1" />
                </span>
              </div>
            </div>

            {/* Journal Entry */}
            <div className="flex items-center justify-between mb-1 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  2. Journal Entry of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Answer today's journal prompt to earn one HEART coin.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleJournalEntry}
                  disabled={dailyQuests.journalEntry}
                  className="px-2 py-1 text-xs rounded border transition-colors"
                  style={{
                    background: dailyQuests.journalEntry ? 'rgba(0,255,0,0.1)' : 'rgba(255,105,180,0.1)',
                    color: dailyQuests.journalEntry ? '#00FF00' : '#FFB6C1',
                    borderColor: dailyQuests.journalEntry ? '#00FF00' : 'rgba(255,105,180,0.6)',
                    textShadow: dailyQuests.journalEntry ? '0 0 8px #00FF00, 0 0 16px #00FF00' : 'none',
                    boxShadow: dailyQuests.journalEntry ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)' : 'none'
                  }}
                >
                  {dailyQuests.journalEntry ? 'COMPLETED' : 'OPEN JOURNAL'}
                </button>
                <span className="text-sm flex items-center" style={{ color: dailyQuests.journalEntry ? '#666' : '#90EE90', textShadow: dailyQuests.journalEntry ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' }}>
                  {dailyQuests.journalEntry ? '✓ +1' : '+1'}
                  <img src="/elements/heart-coin.png" alt="HeartCoin" className="w-6 h-6 ml-1" />
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 - Bonus Quests */}
          <div className="mb-4">
            <div 
              className="text-sm font-bold mb-2"
              style={{ 
                color: '#FFD700', 
                textShadow: '0 0 4px rgba(255,215,0,0.8)' 
              }}
            >
              ⭐ SECTION 2 — BONUS QUESTS
            </div>
            
            {/* Invite a Friend */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  1. Invite a Friend
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Share the Heartverse with someone you love. When they join, you both earn HEART coins.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInviteFriend}
                  disabled={dailyQuests.friendInviteConfirm}
                  className="px-2 py-1 text-xs rounded border transition-colors"
                  style={{
                    background: dailyQuests.friendInviteConfirm 
                      ? 'rgba(0,255,0,0.1)' 
                      : dailyQuests.friendInvited 
                        ? 'rgba(255,193,7,0.3)'
                        : 'rgba(255,105,180,0.1)',
                    color: dailyQuests.friendInviteConfirm 
                      ? '#00FF00' 
                      : dailyQuests.friendInvited 
                        ? '#FFD700'
                        : '#FFB6C1',
                    borderColor: dailyQuests.friendInviteConfirm 
                      ? '#00FF00' 
                      : dailyQuests.friendInvited 
                        ? '#FFD700'
                        : 'rgba(255,105,180,0.6)',
                    textShadow: dailyQuests.friendInviteConfirm 
                      ? '0 0 8px #00FF00, 0 0 16px #00FF00' 
                      : dailyQuests.friendInvited 
                        ? '0 0 8px #FFD700, 0 0 16px #FFD700'
                        : 'none',
                    boxShadow: dailyQuests.friendInviteConfirm 
                      ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)' 
                      : dailyQuests.friendInvited 
                        ? '0 0 10px rgba(255,215,0,0.4), 0 0 20px rgba(255,215,0,0.2)'
                        : 'none'
                  }}
                >
                  {dailyQuests.friendInviteConfirm 
                    ? 'COMPLETE' 
                    : dailyQuests.friendInvited 
                      ? 'CONFIRM' 
                      : 'INVITE A FRIEND'}
                </button>
                <span className="text-xs" style={{ color: '#90EE90' }}>
                  (1 MAX per day)
                </span>
              </div>
            </div>


            {/* Attend Live Show */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10 relative">
              <div className="flex-1">
                {showCheckInModal ? (
                  <div>
                    <div className="text-xs font-bold mb-2" style={{ color: '#FFB6C1' }}>
                      Secret Phrase
                    </div>
                    <div className="text-[10px] mb-2" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                      Enter the secret phrase from the show:
                    </div>
                    <input
                      type="text"
                      value={secretPhrase}
                      onChange={(e) => setSecretPhrase(e.target.value)}
                      className="w-full p-2 bg-black/60 border border-pink-400/40 rounded text-white text-xs"
                      placeholder="Enter secret phrase..."
                      style={{
                        boxShadow: '0 0 10px rgba(255,105,180,0.3)'
                      }}
                    />
                    {statusType !== 'idle' && checkInMessage && (
                      <div 
                        className="text-center text-xs mt-2 p-2 rounded border"
                        style={{ 
                          color: statusType === 'success' ? '#90EE90' : '#FF6B6B',
                          borderColor: statusType === 'success' ? 'rgba(144,238,144,0.4)' : 'rgba(255,107,107,0.4)',
                          backgroundColor: statusType === 'success' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
                          textShadow: statusType === 'success' ? '0 0 4px rgba(144,238,144,0.8)' : '0 0 4px rgba(255,107,107,0.8)'
                        }}
                      >
                        {checkInMessage}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                      2. Attend a Livestream or Live Show
                    </div>
                    <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                      Check in at a CHXNDLER show to receive bonus HEART coins.
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {showCheckInModal && !dailyQuests.checkedIn ? (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={handleCheckIn}
                      disabled={isSubmittingPhrase || !secretPhrase.trim()}
                      className="px-2 py-1 text-xs rounded border border-pink-400/60 hover:border-pink-400/80 transition-colors"
                      style={{
                        background: isSubmittingPhrase || !secretPhrase.trim() ? 'rgba(100,100,100,0.3)' : 'rgba(255,105,180,0.1)',
                        color: isSubmittingPhrase || !secretPhrase.trim() ? '#666' : '#FFB6C1',
                      }}
                    >
                      {isSubmittingPhrase ? 'CHECKING...' : 'SUBMIT'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCheckInModal(false);
                        setSecretPhrase("");
                        setCheckInMessage("");
                        setStatusType('idle');
                      }}
                      className="px-2 py-1 text-xs rounded border border-gray-400/60 hover:border-gray-400/80 transition-colors"
                      style={{
                        background: 'rgba(100,100,100,0.1)',
                        color: '#999',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowCheckInModal(true);
                      setStatusType('idle');
                      setCheckInMessage('');
                    }}
                    disabled={dailyQuests.checkedIn}
                    className="px-2 py-1 text-xs rounded border transition-colors"
                    style={{
                      background: dailyQuests.checkedIn ? 'rgba(0,255,0,0.1)' : 'rgba(255,105,180,0.1)',
                      color: dailyQuests.checkedIn ? '#00FF00' : '#FFB6C1',
                      borderColor: dailyQuests.checkedIn ? '#00FF00' : 'rgba(255,105,180,0.6)',
                      textShadow: dailyQuests.checkedIn ? '0 0 8px #00FF00, 0 0 16px #00FF00' : 'none',
                      boxShadow: dailyQuests.checkedIn ? '0 0 10px rgba(0,255,0,0.4), 0 0 20px rgba(0,255,0,0.2)' : 'none'
                    }}
                  >
                    {dailyQuests.checkedIn ? 'CHECKED IN' : 'CHECK IN'}
                  </button>
                )}
                <span className="text-sm flex items-center" style={{ color: dailyQuests.checkedIn ? '#666' : '#90EE90', textShadow: dailyQuests.checkedIn ? 'none' : '0 0 8px #90EE90, 0 0 16px #90EE90, 0 0 24px #90EE90' }}>
                  {dailyQuests.checkedIn ? '✓ +1-5' : '+1-5'} 
                  <img src="/elements/heart-coin.png" alt="HeartCoin" className="w-6 h-6 ml-1" />
                </span>
              </div>

            </div>
          </div>
          
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
            <div className="p-4">
              {!showItemDetail ? (
                <>
                  <div 
                    className="text-base text-center mb-4"
                    style={{ 
                      color: '#FFB6C1', 
                      textShadow: '0 0 4px rgba(255,182,193,0.8)', 
                      fontSize: '14px',
                      lineHeight: 1.3
                    }}
                  >
                    Spend your Heart coins on digital collectibles and special items.
                  </div>
                  
                  {/* Digital Collectibles Section */}
                  <div className="mb-6">
                    <div 
                      className="text-sm font-bold mb-3"
                      style={{ 
                        color: '#00BFFF', 
                        textShadow: '0 0 4px rgba(0,191,255,0.8)' 
                      }}
                    >
                      💎 DIGITAL COLLECTIBLES
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {DIGITAL_ITEMS.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="flex items-center gap-3 p-2 rounded-lg border border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20 cursor-pointer transition-all duration-200"
                          style={{
                            boxShadow: '0 0 8px rgba(0,191,255,0.2)'
                          }}
                        >
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-blue-300 text-sm truncate">{item.title}</div>
                            <div className="text-xs text-blue-200/80 truncate">{item.description}</div>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-[#F2EF1D]">
                            <span>{item.priceHeartCoins}</span>
                            <img
                              src="/elements/heart-coin.png"
                              alt="Heart Coin"
                              className="w-4 h-4 object-contain"
                              style={{
                                filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Physical Store Items Section */}
                  <div>
                    <div 
                      className="text-sm font-bold mb-3"
                      style={{ 
                        color: '#FF69B4', 
                        textShadow: '0 0 4px rgba(255,105,180,0.8)' 
                      }}
                    >
                      🛍️ HEARTVERSE COLLECTION
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {PHYSICAL_ITEMS.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => window.open(item.stripeUrl, '_blank')}
                          className="flex items-center gap-3 p-2 rounded-lg border border-pink-500/30 bg-pink-900/10 hover:bg-pink-900/20 cursor-pointer transition-all duration-200"
                          style={{
                            boxShadow: '0 0 8px rgba(252,84,175,0.2)'
                          }}
                        >
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-pink-300 text-sm truncate">{item.title}</div>
                            <div className="text-xs text-pink-200/80 truncate">{item.description}</div>
                          </div>
                          <div className="flex flex-col items-end text-xs">
                            <div className="flex items-center gap-1 font-bold text-green-400 mb-1">
                              <span>${item.priceUsd % 1 === 0 ? item.priceUsd.toFixed(0) : item.priceUsd.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-[#F2EF1D]">
                              <span>{item.priceHeartCoins}</span>
                              <img
                                src="/elements/heart-coin.png"
                                alt="Heart Coin"
                                className="w-3 h-3 object-contain"
                                style={{
                                  filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 2px #FC54AF)'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : selectedItem && (
                <>
                  <div className="flex items-center mb-4">
                    <button
                      onClick={handleBackToStore}
                      className="mr-3 text-pink-300 hover:text-pink-200 transition-colors"
                    >
                      ← Back
                    </button>
                    <div className="font-semibold text-pink-300">{selectedItem.title}</div>
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
                    <p className="text-sm text-pink-200 mb-4">{selectedItem.description}</p>
                    
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-lg font-bold text-[#F2EF1D]">{selectedItem.priceHeartCoins}</span>
                      <img
                        src="/elements/heart-coin.png"
                        alt="Heart Coin"
                        className="w-6 h-6 object-contain"
                        style={{
                          filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                        }}
                      />
                    </div>
                    
                    <div className="text-xs text-pink-200/80 mb-4">
                      Your balance: {profile?.heartcoin_balance || 0} Heart Coins
                    </div>
                    
                    {(profile?.heartcoin_balance || 0) >= selectedItem.priceHeartCoins ? (
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
                        You need {selectedItem.priceHeartCoins - (profile?.heartcoin_balance || 0)} more Heart Coins
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SEND Tab Content */}
          {activeTab === 'SEND' && (
            <div className="p-4">
              <div 
                className="text-base text-center mb-4"
                style={{ 
                  color: '#FFB6C1', 
                  textShadow: '0 0 4px rgba(255,182,193,0.8)', 
                  fontSize: '14px',
                  lineHeight: 1.3
                }}
              >
                Share Heart coins with friends and spread the love across the Heartverse.
              </div>
              
              <div className="text-center">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { sfx.play('click', 0.8); } catch {}
                    // Placeholder: dispatch a custom event for a future send flow
                    window.dispatchEvent(new CustomEvent('openSendHeartCoins'));
                  }}
                  className="px-4 py-2 text-sm rounded border transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(252,84,175,0.20) 0%, rgba(255,105,180,0.30) 100%)',
                    color: '#FF69B4',
                    borderColor: 'rgba(255,105,180,0.60)',
                    textShadow: '0 0 6px rgba(255,105,180,0.85)',
                    boxShadow: '0 0 10px rgba(255,105,180,0.45), 0 0 20px rgba(255,105,180,0.25)',
                    fontWeight: 700
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(252,84,175,0.30) 0%, rgba(255,105,180,0.40) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255,105,180,0.65), 0 0 25px rgba(255,105,180,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(252,84,175,0.20) 0%, rgba(255,105,180,0.30) 100%)';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(255,105,180,0.45), 0 0 20px rgba(255,105,180,0.25)';
                  }}
                >
                  SEND HEART COINS
                </button>
              </div>
            </div>
          )}
          
          </div>
        </div>
      )}



    </>
  );
}
