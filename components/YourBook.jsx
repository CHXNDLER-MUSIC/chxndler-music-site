"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoverCard from './CoverCard';
import { sfx } from '@/lib/sfx';

export default function YourBook({ isOpen, onClose }) {
  const [enlargedCard, setEnlargedCard] = useState(null);
  
  // CHXNDLER starter card that should always be present
  const starterCard = {
    id: 'chxndler-starter',
    src: '/logo/CHXNDLER_Logo.png',
    label: 'CHXNDLER',
    isStarter: true
  };

  // Sample blank cards for future expansion - only 3 blank spots
  const blankCards = Array(3).fill(null).map((_, index) => ({
    id: `blank-${index}`,
    src: null,
    label: `Card ${index + 2}`,
    isBlank: true
  }));

  const allCards = [starterCard, ...blankCards];

  const handleClose = () => {
    sfx.play('click', 0.6);
    onClose();
  };

  const handleCardClick = (cardOrData) => {
    // Handle if this is called from CoverCard onClick with card data
    if (cardOrData && typeof cardOrData === 'object' && cardOrData.image) {
      sfx.play('flip', 0.5);
      setEnlargedCard({
        src: cardOrData.image,
        label: cardOrData.name,
        id: 'card-image'
      });
      return;
    }
    
    // Handle original card click logic
    if (cardOrData.isBlank) {
      sfx.play('click', 0.4);
      return;
    }
    sfx.play('flip', 0.5);
    setEnlargedCard(cardOrData);
  };

  const handleCloseEnlarged = () => {
    sfx.play('click', 0.4);
    setEnlargedCard(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          
          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl backdrop-blur-md border border-white/15 bg-white/10"
            style={{
              boxShadow: '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
            }}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none" 
              style={{
                background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
                mixBlendMode: 'screen'
              }} 
            />
            
            <div className="relative p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[0.12em] text-white drop-shadow">
                  YOUR BOOK
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Cards Grid - 4 cards in a 2x2 layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-2xl mx-auto">
                {allCards.map((card) => (
                  <div key={card.id} className="flex flex-col items-center">
                    {card.isBlank ? (
                      <div
                        className="relative rounded-[12px] overflow-hidden cursor-pointer group"
                        style={{ 
                          width: 120, 
                          height: 120,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                          border: '1px dashed rgba(255,255,255,0.3)'
                        }}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white/50 border-dashed rounded-full flex items-center justify-center group-hover:border-white/80 transition-colors">
                            <svg className="w-3 h-3 text-white/50 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div>
                        <CoverCard 
                          src={card.src}
                          label=""
                          size={130}
                          trackSlug={card.isStarter ? 'chxndler' : null}
                          onClick={handleCardClick}
                        />
                      </div>
                    )}
                    <span className="mt-2 text-[10px] tracking-wide text-cyan-100/90 text-center">
                      {card.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer info */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-white/60 text-sm text-center">
                  Collect digital cards as you explore the Heartverse
                </p>
              </div>
            </div>
          </motion.div>

          {/* Enlarged Card Modal */}
          <AnimatePresence>
            {enlargedCard && (
              <motion.div
                className="absolute inset-0 z-10 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Backdrop */}
                <motion.div
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleCloseEnlarged}
                />
                
                {/* Enlarged Card */}
                <motion.div
                  className="relative z-10 rounded-3xl overflow-hidden"
                  style={{
                    width: '300px',
                    height: '300px',
                    boxShadow: '0 0 60px rgba(252,84,175,0.4), 0 0 120px rgba(56,182,255,0.3)'
                  }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                >
                  <img
                    src={enlargedCard.src}
                    alt={enlargedCard.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 rounded-3xl border-2 border-white/20" />
                  
                  {/* Close button */}
                  <button
                    onClick={handleCloseEnlarged}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white transition-colors flex items-center justify-center"
                    aria-label="Close enlarged view"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Card label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg text-center">{enlargedCard.label}</h3>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}