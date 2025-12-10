'use client';

import { useEffect, useState, useRef } from 'react';
import { CARD_CELEBRATION_EVENT, type CardCelebrationDetail } from '@/utils/cardCelebration';

export default function CardCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [cardImage, setCardImage] = useState('');
  const [cardName, setCardName] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio instance once
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/heart-coin.mp3'); // Using the same sound for now
    }

    const handleCelebration = (event: CustomEvent<CardCelebrationDetail>) => {
      const { cardImage: celebrationCardImage, cardName: celebrationCardName } = event.detail;
      
      // Only celebrate if we have a card image and name
      if (!celebrationCardImage || !celebrationCardName) return;

      // Set the card data to display
      setCardImage(celebrationCardImage);
      setCardName(celebrationCardName);

      // Play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ alignItems: 'center', paddingBottom: '10vh' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />
      
      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop">
        {/* Glowing background circle */}
        <div className="absolute w-64 h-64 bg-purple-500/30 rounded-full blur-xl" />
        
        {/* Card image */}
        <img 
          src={cardImage} 
          alt={cardName} 
          className="w-48 h-48 relative z-10 rounded-lg object-cover"
        />
        
        {/* Text */}
        <p className="text-white font-bold text-xl mt-4 relative z-10">
          {cardName} Purchased!
        </p>
      </div>
    </div>
  );
}