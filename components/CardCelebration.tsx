'use client';

import { useEffect, useState } from 'react';
import { CARD_CELEBRATION_EVENT, type CardCelebrationDetail } from '@/utils/cardCelebration';

export default function CardCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [cardImage, setCardImage] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    const handleCelebration = (event: CustomEvent<CardCelebrationDetail>) => {
      const { cardImage: celebrationCardImage, cardName: celebrationCardName } = event.detail;
      
      // Only celebrate if we have a card image and name
      if (!celebrationCardImage || !celebrationCardName) return;

      // Set the card data to display
      setCardImage(celebrationCardImage);
      setCardName(celebrationCardName);

      // Show celebration
      setIsVisible(true);

      // Hide after 3 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    };

    // Add event listener
    window.addEventListener(CARD_CELEBRATION_EVENT, handleCelebration as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(CARD_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none" style={{ padding: '4vh 2rem' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />
      
      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop w-full max-w-sm justify-center" style={{ minHeight: 'fit-content', maxHeight: '92vh' }}>
        {/* Glowing background circle */}
        <div className="absolute w-40 h-40 bg-purple-500/30 rounded-full blur-xl" />
        
        {/* Card image */}
        <img 
          src={cardImage} 
          alt={cardName} 
          className="w-40 relative z-10 rounded-lg object-cover"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite',
            maxHeight: '60vh',
            height: 'auto',
            aspectRatio: '5/7'
          }}
        />
        
        {/* Text */}
        <p className="text-white font-bold text-lg mt-3 relative z-10 text-center">
          {cardName}
        </p>
      </div>
    </div>
  );
}
