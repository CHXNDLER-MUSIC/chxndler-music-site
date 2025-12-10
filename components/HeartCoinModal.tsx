"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useProfile } from '@/contexts/ProfileContext';
import HeartversePopup from "@/components/HeartversePopup";
import PopoutShell from "@/components/PopoutShell";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenJournal?: () => void;
  initialTab?: 'earn' | 'use';
};

type StoreItem = {
  name: string;
  image: string;
  image2?: string;
  stripeUrl: string;
  description: string;
  cost: number;
  heartCoin: number;
};

const storeItems: StoreItem[] = [
  {
    name: "PIN",
    image: "/store/pin.webp",
    stripeUrl: "https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B",
    description: "A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.",
    cost: 4.5,
    heartCoin: 3
  },
  {
    name: "PATCH",
    image: "/store/patch.webp",
    image2: "/store/patch-inverse.webp",
    stripeUrl: "https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C",
    description: "Stitch this into your world as a quiet reminder that this isn't just music, it's a community.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "Sticker",
    image: "/store/sticker.webp",
    stripeUrl: "https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F",
    description: "A simple reminder that you're part of something bigger. Remember you're not alone in this story.",
    cost: 3,
    heartCoin: 2
  },
  {
    name: "Hat",
    image: "/store/hat.webp",
    stripeUrl: "https://buy.stripe.com/6oU28s717aFn1gR1CD4gg0I",
    description: "A classic you'll wear everywhere. It's lowkey, but it says everything it needs to.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Keychain",
    image: "/store/keychain.webp",
    stripeUrl: "https://buy.stripe.com/8x214o99faFn0cN5ST4gg0H",
    description: "A small piece of the HEARTVERSE to carry everywhere. A quiet reminder that you're connected, always.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "House Party Poster",
    image: "/store/house-party-poster.webp",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "This poster captures the night the HEARTVERSE came alive. Hang it up and remember when you joined the story.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Necklace",
    image: "/store/necklace.webp",
    stripeUrl: "https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K",
    description: "A symbol of love, connection, and everything this world stands for. It's a keepsake for the people who found home here.",
    cost: 18,
    heartCoin: 12
  },
  {
    name: "Beanie",
    image: "/store/beanie-front.webp",
    image2: "/store/beanie-back.webp",
    stripeUrl: "https://buy.stripe.com/dRm8wQetz14N5x71CD4gg0L",
    description: "For the ones who wear their hearts out loud and aren't afraid to stand out.",
    cost: 30,
    heartCoin: 20
  },
  {
    name: "Button",
    image: "/store/button.webp",
    stripeUrl: "https://buy.stripe.com/6oU14oclr8xfbVvbdd4gg0J",
    description: "A symbol of unity, curiosity, and courage for those who feel deeply and dream beyond the ordinary.",
    cost: 6,
    heartCoin: 4
  },
  {
    name: "Bracelet",
    image: "/store/bracelet.webp",
    stripeUrl: "https://buy.stripe.com/aFa8wQ2KR8xf6Bbftt4gg0N",
    description: "A reminder you wear on your wrist that you're growing, healing, and finding your place. It's a quiet symbol that you belong here, with the ones who feel deeply and love endlessly.",
    cost: 24,
    heartCoin: 16
  },
  {
    name: "Pick",
    image: "/store/pick.webp",
    stripeUrl: "https://buy.stripe.com/4gM9AUadj9Bj2kVgxx4gg0O",
    description: "Your reminder to follow your passion wherever it leads. A glow in the dark pick made for the dreamers and late night creators who carry music like a heartbeat through the dark.",
    cost: 6,
    heartCoin: 4
  }
];

export default function HeartCoinModal({ open, onClose, onOpenJournal, initialTab = 'earn' }: Props) {
  const { profile, loading: profileLoading } = useProfile();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [enlargedItem, setEnlargedItem] = useState<StoreItem | null>(null);
  const [enlargedImageIndex, setEnlargedImageIndex] = useState(0);
  const [enlargedCard, setEnlargedCard] = useState<any>(null);
  const [isEnlargedCardFlipped, setIsEnlargedCardFlipped] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

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
      // Refresh profile to update balance
      window.location.reload();
    } catch (error: any) {
      console.error('Purchase error:', error);
      setError(error?.message || `Failed to purchase ${item.name}`);
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(storeItems.length / itemsPerPage);
  const currentItems = storeItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <HeartversePopup 
      isOpen={open} 
      onClose={onClose} 
      title=""
    >
      <div className="relative">
        {/* Tabs */}
        <div className="flex border-b border-white/20 mb-6">
          <button
            onClick={() => setActiveTab('earn')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              activeTab === 'earn'
                ? 'text-[#F2EF1D] border-b-2 border-[#F2EF1D]'
                : 'text-white hover:text-white'
            }`}
            style={{
              textShadow: activeTab === 'earn' 
                ? '0 0 8px rgba(242,239,29,0.8), 0 0 15px rgba(242,239,29,0.6), 0 2px 4px rgba(0,0,0,0.8)' 
                : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
              backgroundColor: activeTab === 'earn' ? 'rgba(242,239,29,0.1)' : 'rgba(0,0,0,0.3)',
              borderRadius: '8px 8px 0 0'
            }}
          >
            EARN
          </button>
          <button
            onClick={() => setActiveTab('use')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              activeTab === 'use'
                ? 'text-[#F2EF1D] border-b-2 border-[#F2EF1D]'
                : 'text-white hover:text-white'
            }`}
            style={{
              textShadow: activeTab === 'use' 
                ? '0 0 8px rgba(242,239,29,0.8), 0 0 15px rgba(242,239,29,0.6), 0 2px 4px rgba(0,0,0,0.8)' 
                : '0 2px 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)',
              backgroundColor: activeTab === 'use' ? 'rgba(242,239,29,0.1)' : 'rgba(0,0,0,0.3)',
              borderRadius: '8px 8px 0 0'
            }}
          >
            USE
          </button>
        </div>

        {activeTab === 'earn' ? (
          <div>
            <div className="text-center mb-6">
              <p className="text-white/80 text-sm">
                HeartCoins are the energy of the Heartverse. You earn them by exploring, connecting and showing up.
              </p>
            </div>
            
            {/* Daily Quests and Bonus Quests Tabs */}
            <div className="flex border-b border-white/10 mb-4">
              <button className="px-4 py-2 font-bold text-xs text-[#4ECDC4] border-b-2 border-[#4ECDC4] bg-[#4ECDC4]/10 rounded-t">
                DAILY QUESTS
              </button>
              <button className="px-4 py-2 font-bold text-xs text-white/60 hover:text-white/80 bg-black/20 rounded-t">
                BONUS QUESTS
              </button>
            </div>

            {/* Daily Quest Items */}
            <div className="space-y-4">
              {/* Element of the Day Quest */}
              <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <img src="/elements/earth.webp" alt="Element" className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">1. Tap the Element of the Day</h3>
                      <p className="text-white/60 text-xs">Receive a random reward: HeartCoins, relics, or binder slot unlocks.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#4ECDC4] text-sm flex items-center">
                      +1 <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Journal Entry Quest */}
              <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">2. Journal Entry of the Day</h3>
                      <p className="text-white/60 text-xs">Answer today's journal prompt to earn one HEART coin.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (onOpenJournal) {
                          onClose(); // Close the HeartCoin modal first
                          setTimeout(() => {
                            onOpenJournal(); // Then open the journal
                          }, 150);
                        }
                      }}
                      className="px-3 py-1 text-xs rounded border transition-colors bg-rgba(255,255,255,0.1) text-white hover:bg-white/20"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        borderColor: 'rgba(255,255,255,0.6)',
                        textShadow: 'none',
                      }}
                    >
                      OPEN JOURNAL
                    </button>
                    <span className="text-[#4ECDC4] text-sm flex items-center">
                      +1 <img src="/elements/heart-coin.webp" alt="HeartCoin" className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'use' ? (
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
            
            {/* Store Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
          {currentItems.map((item, index) => (
            <div key={index} className="text-center space-y-4 p-4 bg-black/20 rounded-lg transition-all duration-300">
              <h3 className="text-lg font-bold text-white tracking-wider">
                {item.name.toUpperCase()}
              </h3>
              
              {/* Item Images */}
              <div className="relative h-48 w-full flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => {
                    setEnlargedItem(item);
                    setEnlargedImageIndex(0);
                  }}
                />
                {item.image2 && (
                  <img
                    src={item.image2}
                    alt={`${item.name} alternative view`}
                    className="max-h-full max-w-full object-contain rounded-lg absolute top-0 left-0 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    onClick={() => {
                    setEnlargedItem(item);
                    setEnlargedImageIndex(0);
                  }}
                  />
                )}
              </div>
              
              {/* Description - Hidden for cleaner look */}
              {false && (
                <div className="text-white/80 text-xs leading-relaxed px-2 break-words">
                  {item.description.toUpperCase()}
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
                    <span className="text-sm font-bold text-[#F2EF1D]">{item.heartCoin}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => handlePurchase(item.stripeUrl)}
                  className="px-3 py-2 rounded-lg font-bold text-sm text-green-400 hover:bg-green-500/20 hover:scale-105 transition-all duration-200"
                >
                  PAY WITH ${item.cost % 1 === 0 ? item.cost.toFixed(0) : item.cost.toFixed(1)}
                </button>
              </div>
              
              {/* Add to Collection Button */}
              <button
                onClick={() => handleHeartCoinPurchase(item)}
                disabled={modalLoading || !profile || (profile.heartcoin_balance || 0) < item.heartCoin}
                className={`w-full py-2 px-4 rounded-lg font-bold text-xs transition-all duration-200 ${
                  modalLoading || !profile || (profile.heartcoin_balance || 0) < item.heartCoin
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)]'
                }`}
                style={
                  modalLoading || !profile || (profile.heartcoin_balance || 0) < item.heartCoin
                    ? undefined
                    : {
                        boxShadow: '0 0 15px rgba(242,239,29,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                      }
                }
              >
                {modalLoading ? 'Purchasing...' : 'Add to Collection'}
              </button>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={handlePrevPage}
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
                          className="max-w-full max-h-[70vh] object-contain rounded-lg"
                          style={{
                            animation: 'merchPulse 2.5s ease-in-out infinite',
                          }}
                        />
                        
                        {/* Navigation arrows - only show if multiple images */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => setEnlargedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={() => setEnlargedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
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
                  setEnlargedCard(null);
                  setIsEnlargedCardFlipped(false);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 z-10"
              >
                ×
              </button>
              
              {/* Card Image */}
              <div className="flex items-center justify-center w-full h-full">
                <div className="relative max-w-full max-h-full">
                  <div 
                    className="relative w-full cursor-pointer"
                    onClick={() => setIsEnlargedCardFlipped(!isEnlargedCardFlipped)}
                    style={{
                      perspective: '1000px',
                      height: '70vh',
                      maxWidth: '400px'
                    }}
                  >
                    <div
                      className="relative w-full h-full transition-transform duration-700"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isEnlargedCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Front of card */}
                      <img
                        src={enlargedCard.artwork_url || `/cards/${enlargedCard.card_name || enlargedCard.cards?.card_name}.webp`}
                        alt={enlargedCard.card_name || enlargedCard.cards?.card_name || 'Card'}
                        className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain"
                        style={{
                          animation: 'merchPulse 2.5s ease-in-out infinite',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg)'
                        }}
                      />
                      
                      {/* Back of card */}
                      <img
                        src="/cards/back.webp"
                        alt="Card back"
                        className="absolute inset-0 w-full h-full rounded-lg border-4 border-yellow-500/80 shadow-2xl object-contain"
                        style={{
                          animation: 'merchPulse 2.5s ease-in-out infinite',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      />
                    </div>
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
