"use client";

import { motion } from 'framer-motion';
import { useProfile } from '@/contexts/ProfileContext';

interface PhysicalCardConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardTitle: string;
  cardCost: number;
  cardImage?: string;
}

export default function PhysicalCardConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  cardTitle,
  cardCost,
  cardImage
}: PhysicalCardConfirmationModalProps) {
  const { profile } = useProfile();
  
  if (!isOpen) return null;

  const userBalance = profile?.heartcoin_balance || 0;
  const canAfford = userBalance >= cardCost;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with card info */}
        <div className="p-6 text-center border-b border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">PURCHASING PHYSICAL CARD:</h2>
          <h3 className="text-xl font-bold text-[#19E3FF] mb-4 tracking-wider">{cardTitle}</h3>
          
          {/* Card preview if available */}
          {cardImage && (
            <div className="flex justify-center mb-4">
              <img
                src={cardImage}
                alt={cardTitle}
                className="w-32 h-48 object-contain rounded-lg border border-white/20"
              />
            </div>
          )}
          
          <div className="text-sm text-gray-300 mb-4">
            Trade your HEART coins for collectibles and cards that reflect your journey.
          </div>
        </div>

        {/* Balance and Cost Display */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            {/* User Balance */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-400 mb-2">User</span>
              <div className="flex items-center gap-2">
                <img
                  src="/elements/heart-coin.webp"
                  alt="Heart Coin"
                  className="w-6 h-6"
                  style={{
                    filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                  }}
                />
                <span className="text-2xl font-bold text-[#F2EF1D]">{userBalance}</span>
              </div>
            </div>

            {/* Cost */}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-400 mb-2">COST</span>
              <div className="flex items-center gap-2">
                <img
                  src="/elements/heart-coin.webp"
                  alt="Heart Coin"
                  className="w-6 h-6"
                  style={{
                    filter: 'brightness(1.2) saturate(1.5) drop-shadow(0 0 4px #FC54AF)'
                  }}
                />
                <span className="text-2xl font-bold text-[#F2EF1D]">{cardCost}</span>
              </div>
            </div>
          </div>

          {/* Purchase status message */}
          <div className={`text-center p-3 rounded-lg mb-6 ${
            canAfford 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {canAfford ? (
              <span>✓ You can purchase this item!</span>
            ) : (
              <span>✗ You need {cardCost - userBalance} more Heart Coins</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-white bg-gray-600/20 border border-gray-600/40 hover:bg-gray-600/30 transition-all duration-200"
            >
              Cancel
            </button>
            
            <button
              onClick={onConfirm}
              disabled={!canAfford}
              className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-200 ${
                canAfford
                  ? 'bg-gradient-to-r from-[#4CAF50] to-[#45A049] text-white hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(76,175,80,0.6)]'
                  : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
              }`}
              style={canAfford ? {
                boxShadow: '0 0 15px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
              } : {}}
            >
              {canAfford ? 'CONFIRM' : 'INSUFFICIENT FUNDS'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}