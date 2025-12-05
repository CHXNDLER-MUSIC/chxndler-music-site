"use client";

import { useState } from 'react';
import PhysicalCardConfirmationModal from './PhysicalCardConfirmationModal';
import ShippingInfoModal from './ShippingInfoModal';
import { useProfile } from '@/contexts/ProfileContext';

interface CardPurchaseFlowProps {
  cardTitle: string;
  cardImage?: string;
  digitalCost: number;
  physicalCost: number;
  onDigitalPurchase?: () => void;
  onPhysicalPurchaseComplete?: (shippingData: any) => void;
}

export default function CardPurchaseFlow({
  cardTitle,
  cardImage,
  digitalCost = 25,
  physicalCost = 35,
  onDigitalPurchase,
  onPhysicalPurchaseComplete
}: CardPurchaseFlowProps) {
  const { profile } = useProfile();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  const userBalance = profile?.heartcoin_balance || 159; // Default to 159 as shown in image

  const handleDigitalClick = () => {
    if (onDigitalPurchase) {
      onDigitalPurchase();
    }
  };

  const handlePhysicalClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmPhysical = () => {
    setShowConfirmation(false);
    setShowShipping(true);
  };

  const handleShippingSubmit = (shippingData: any) => {
    setShowShipping(false);
    if (onPhysicalPurchaseComplete) {
      onPhysicalPurchaseComplete(shippingData);
    }
  };

  const handleCloseModals = () => {
    setShowConfirmation(false);
    setShowShipping(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-[#19E3FF]/60 rounded-lg text-white">
      {/* Card Information */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-[#19E3FF] mb-2">{cardTitle}</h3>
        <div className="text-sm text-gray-300">
          Trade your HEART coins for collectibles and cards that reflect your journey.
        </div>
      </div>

      {/* Balance and Cost Display */}
      <div className="flex justify-center gap-8 mb-6">
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

        {/* Cost (example showing 12 as in image) */}
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
            <span className="text-2xl font-bold text-[#F2EF1D]">12</span>
          </div>
        </div>
      </div>

      {/* Purchase Status */}
      <div className="text-center p-3 rounded-lg mb-6 bg-green-500/10 border border-green-500/30">
        <span className="text-green-400">You can purchase this item!</span>
      </div>

      {/* Purchase Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDigitalClick}
          className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-200"
          style={{
            boxShadow: '0 0 15px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
          }}
        >
          {digitalCost} DIGITAL
        </button>
        
        <button
          onClick={handlePhysicalClick}
          className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-[#4CAF50] to-[#45A049] text-white hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(76,175,80,0.6)] transition-all duration-200"
          style={{
            boxShadow: '0 0 15px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -4px 8px rgba(0,0,0,0.2)'
          }}
        >
          {physicalCost} PHYSICAL
        </button>
      </div>

      {/* Modals */}
      <PhysicalCardConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCloseModals}
        onConfirm={handleConfirmPhysical}
        cardTitle={cardTitle}
        cardCost={physicalCost}
        cardImage={cardImage}
      />

      <ShippingInfoModal
        isOpen={showShipping}
        onClose={handleCloseModals}
        onSubmit={handleShippingSubmit}
        cardTitle={cardTitle}
        cardCost={physicalCost}
      />
    </div>
  );
}