"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useProfile } from '@/contexts/ProfileContext';
import HeartversePopup from "@/components/HeartversePopup";
import PopoutShell from "@/components/PopoutShell";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTab?: 'use' | 'cards';
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

export default function HeartCoinModal({ open, onClose, initialTab = 'use' }: Props) {
  const { profile, loading: profileLoading } = useProfile();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [enlargedItem, setEnlargedItem] = useState<StoreItem | null>(null);
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
            onClick={() => setActiveTab('use')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              activeTab === 'use'
                ? 'text-[#F2EF1D] border-b-2 border-[#F2EF1D]'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            USE
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              activeTab === 'cards'
                ? 'text-[#F2EF1D] border-b-2 border-[#F2EF1D]'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            CARDS
          </button>
        </div>

        {activeTab === 'use' ? (
          <div>
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
                  onClick={() => setEnlargedItem(item)}
                />
                {item.image2 && (
                  <img
                    src={item.image2}
                    alt={`${item.name} alternative view`}
                    className="max-h-full max-w-full object-contain rounded-lg absolute top-0 left-0 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    onClick={() => setEnlargedItem(item)}
                  />
                )}
              </div>
              
              {/* Description */}
              <div className="text-white/80 text-xs leading-relaxed px-2 break-words">
                {item.description.toUpperCase()}
              </div>
              
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
                onClick={() => handlePurchase(item.stripeUrl)}
                className="w-full py-2 px-4 rounded-lg font-bold text-xs bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(242,239,29,0.6)] transition-all duration-200"
                style={{
                  boxShadow: '0 0 15px rgba(242,239,29,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
                }}
              >
                Add to Collection
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
        ) : (
          /* Cards Tab */
          <div className="text-center text-white/60">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">YOUR CARDS</h3>
              <p className="text-sm">Your collected cards from the HEARTVERSE.</p>
            </div>

            {/* Cards Grid */}
            {profileLoading || (!profileLoading && !profile) ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#F2EF1D] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Loading cards...</h3>
              </div>
            ) : profile?.cards && profile.cards.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {profile.cards.map((userCard) => (
                  <div 
                    key={userCard.id} 
                    className="group relative bg-black/30 rounded-lg p-3 hover:bg-black/40 transition-all duration-300 hover:scale-[1.02]"
                  >
                    {/* Card Image Placeholder */}
                    <div className="aspect-[3/4] bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg mb-2 flex items-center justify-center border border-white/20">
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-1 bg-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-xs text-white/40">CARD</div>
                      </div>
                    </div>
                    
                    {/* Card Info */}
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white truncate mb-1">
                        {userCard.cards?.card_name || 'Unknown Card'}
                      </h4>
                      
                      {/* Element & Rarity */}
                      <div className="flex justify-between items-center text-xs">
                        {userCard.cards?.element && (
                          <span className="px-2 py-1 bg-white/10 rounded text-white/70 capitalize">
                            {userCard.cards.element}
                          </span>
                        )}
                        {userCard.cards?.rarity && (
                          <span className="px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded text-yellow-200 capitalize">
                            {userCard.cards.rarity}
                          </span>
                        )}
                      </div>
                      
                      {/* Acquired Date */}
                      <div className="text-xs text-white/40 mt-1">
                        Acquired {new Date(userCard.acquired_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Cards Yet</h3>
                <p className="text-sm text-white/60">
                  Start your collection by exploring the HEARTVERSE and completing quests.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enlarged Item Modal */}
      {enlargedItem && (
        <PopoutShell
          title=""
          onClose={() => setEnlargedItem(null)}
          compact={true}
        >
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full">
              <img
                src={enlargedItem.image}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{
                  animation: 'merchPulse 2.5s ease-in-out infinite',
                }}
              />
              
              {/* Secondary Image Overlay */}
              {enlargedItem.image2 && (
                <img
                  src={enlargedItem.image2}
                  alt=""
                  className="absolute inset-0 max-w-full max-h-full object-contain rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    animation: 'merchPulse 2.5s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          </div>
        </PopoutShell>
      )}
    </HeartversePopup>
  );
}
