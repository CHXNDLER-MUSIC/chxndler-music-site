"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sfx } from '@/lib/sfx';
import { useProfile } from '@/contexts/ProfileContext';
import Image from 'next/image';

interface StoreItem {
  id: string;
  title: string;
  description: string;
  image: string;
  priceUsd: number;
  priceHeartCoins: number;
  stripeUrl: string;
}

interface StoreModalProps {
  item: StoreItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (item: StoreItem) => void;
}

// Sample store items - replace with your actual items
const SAMPLE_ITEMS: Record<string, StoreItem> = {
  'baby': {
    id: 'baby',
    title: 'Baby',
    description: 'Digital collectible card from the Heartverse collection.',
    image: '/card/baby.png',
    priceUsd: 3,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a'
  },
  'ocean-girl': {
    id: 'ocean-girl',
    title: 'Ocean Girl',
    description: 'Digital collectible card from the Heartverse collection.',
    image: '/card/ocean-girl.png',
    priceUsd: 3,
    priceHeartCoins: 20,
    stripeUrl: 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00'
  }
};

export default function StoreModal({ item, isOpen, onClose, onPurchaseSuccess }: StoreModalProps) {
  const { profile, refreshProfile } = useProfile();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwned, setIsOwned] = useState(false);

  // Reset states when modal opens/closes or item changes
  useEffect(() => {
    if (!isOpen || !item) {
      setShowConfirmation(false);
      setIsProcessing(false);
      setIsStripeLoading(false);
      setError(null);
      setIsOwned(false);
    } else {
      // TODO: Check if user already owns this item
      // This would require an API call to check user_items table
      setIsOwned(false);
    }
  }, [isOpen, item]);

  // Handle Stripe checkout
  const handleStripeCheckout = async () => {
    if (!item) return;
    
    setIsStripeLoading(true);
    setError(null);
    
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          itemTitle: item.title,
          priceUsd: item.priceUsd,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.url) {
        // Redirect to Stripe checkout
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      setError('Failed to redirect to payment. Please try again.');
    } finally {
      setIsStripeLoading(false);
    }
  };

  // Handle HeartCoin redemption confirmation
  const handleHeartCoinConfirmation = () => {
    try {
      sfx.play('click', 0.6);
    } catch {}
    
    setShowConfirmation(true);
    setError(null);
  };

  // Cancel HeartCoin redemption
  const handleCancelRedemption = () => {
    try {
      sfx.play('close', 0.4);
    } catch {}
    
    setShowConfirmation(false);
    setError(null);
  };

  // Execute HeartCoin redemption
  const handleConfirmRedemption = async () => {
    if (!item || !profile) return;
    
    setIsProcessing(true);
    setError(null);
    
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
        try {
          sfx.play('click', 0.7);
        } catch {}
        
        setIsOwned(true);
        setShowConfirmation(false);
        
        // Refresh profile to update HeartCoin balance
        await refreshProfile();
        
        // Notify parent component
        onPurchaseSuccess?.(item);
        
      } else if (response.status === 400 && result.error?.includes('insufficient')) {
        // Insufficient HeartCoins
        setError(`You need ${item.priceHeartCoins} HeartCoins but only have ${profile.heartcoin_balance || 0}.`);
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('HeartCoin purchase error:', error);
      setError('Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle close
  const handleClose = () => {
    try {
      sfx.play('close', 0.4);
    } catch {}
    onClose();
  };

  if (!isOpen || !item) return null;

  const hasEnoughHeartCoins = profile && (profile.heartcoin_balance || 0) >= item.priceHeartCoins;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md bg-black/90 backdrop-blur-lg border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-pink-500/20 hover:bg-pink-500/40 text-pink-500 flex items-center justify-center transition-all duration-200"
        >
          ×
        </button>

        {/* Item image */}
        <div className="p-6 pb-4">
          <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4">
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Title and description */}
        <div className="px-6 pb-4">
          <h2 className="text-xl font-bold text-[#19E3FF] mb-2 text-center">{item.title}</h2>
          <p className="text-sm text-[#9EEBFF] text-center">{item.description}</p>
        </div>

        {/* Price row */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-400">${item.priceUsd}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#F2EF1D]">{item.priceHeartCoins}</span>
              <img
                src="/elements/heart-coin.png"
                alt="Heart Coin"
                className="w-6 h-6 object-contain"
                style={{
                  filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 pb-4">
            <div className="text-sm text-red-400 bg-red-400/20 px-3 py-2 rounded border border-red-400/40 text-center">
              {error}
            </div>
          </div>
        )}

        {/* Confirmation area for HeartCoin redemption */}
        {showConfirmation && (
          <div className="px-6 pb-4">
            <div className="bg-[#F2EF1D]/10 border border-[#F2EF1D]/30 rounded-lg p-4 text-center">
              <p className="text-[#F2EF1D] mb-4">
                Spend {item.priceHeartCoins} HeartCoins to add this item to your collection?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleCancelRedemption}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedemption}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    isProcessing
                      ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                      : 'bg-[#F2EF1D] hover:bg-[#E6E318] text-black'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showConfirmation && (
          <div className="px-6 pb-6">
            {isOwned ? (
              <div className="text-center">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-6 rounded-lg font-bold bg-gray-600 text-gray-300 cursor-not-allowed mb-3"
                >
                  Owned
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Navigate to binder or collection view
                    try { sfx.play('click', 0.6); } catch {}
                  }}
                  className="text-[#19E3FF] hover:text-[#9EEBFF] text-sm transition-colors"
                >
                  View in Binder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Buy with $ button */}
                <button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={isStripeLoading}
                  onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                  className={`w-full py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                    isStripeLoading
                      ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                      : 'bg-green-500 hover:bg-green-600 hover:scale-[1.02] text-white'
                  }`}
                >
                  {isStripeLoading ? 'Redirecting...' : `Buy with $${item.priceUsd}`}
                </button>

                {/* Redeem HeartCoins button */}
                <button
                  type="button"
                  onClick={handleHeartCoinConfirmation}
                  disabled={!hasEnoughHeartCoins || !profile}
                  onMouseEnter={() => { try { sfx.play('hover', 0.45); } catch {} }}
                  className={`w-full py-3 px-6 rounded-lg font-bold transition-all duration-200 ${
                    hasEnoughHeartCoins && profile
                      ? 'bg-gradient-to-r from-[#F2EF1D] to-[#FFC700] text-black hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(242,239,29,0.8)]'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                  style={hasEnoughHeartCoins && profile ? {
                    boxShadow: '0 0 20px rgba(242,239,29,0.6), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -8px 16px rgba(0,0,0,0.22)'
                  } : {}}
                >
                  Redeem {item.priceHeartCoins} HeartCoins
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Hook to use the store modal
export function useStoreModal() {
  const [currentItem, setCurrentItem] = useState<StoreItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Listen for openStoreCards events
  useEffect(() => {
    const handleOpenStore = (event: CustomEvent) => {
      const { songSlug, songTitle } = event.detail || {};
      
      // Try to find the item in our store
      const item = SAMPLE_ITEMS[songSlug] || SAMPLE_ITEMS[songTitle?.toLowerCase()?.replace(/\s+/g, '-')];
      
      if (item) {
        setCurrentItem(item);
        setIsOpen(true);
      }
    };

    window.addEventListener('openStoreCards', handleOpenStore as EventListener);
    
    return () => {
      window.removeEventListener('openStoreCards', handleOpenStore as EventListener);
    };
  }, []);

  const openStore = (item: StoreItem) => {
    setCurrentItem(item);
    setIsOpen(true);
  };

  const closeStore = () => {
    setIsOpen(false);
    // Don't clear currentItem immediately to allow for exit animation
    setTimeout(() => setCurrentItem(null), 300);
  };

  return {
    currentItem,
    isOpen,
    openStore,
    closeStore,
  };
}