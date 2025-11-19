"use client";

import { useState, useEffect } from "react";
import HeartverseButton from "@/components/HeartverseButton";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
};

export default function BinderButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [showFullCollection, setShowFullCollection] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('All');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Mock card data structure
  const elements = ['Lightning', 'Darkness', 'Water', 'Heart'];
  const rarities = ['All', 'Common', 'Rare', 'Legendary'];
  
  const mockCards = {
    Lightning: [
      { name: 'LIGHTNING', rarity: 'Rare', image: 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png' },
      { name: 'Thunder Strike', rarity: 'Common', image: 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png' },
      { name: 'Storm Lord', rarity: 'Legendary', image: 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png' },
    ],
    Darkness: [
      { name: 'DARKNESS', rarity: 'Rare', image: 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png' },
      { name: 'Shadow Void', rarity: 'Legendary', image: 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png' },
    ],
    Water: [
      { name: 'WATER', rarity: 'Common', image: 'https://ik.imagekit.io/CHXNDLER/card/WATER.png' },
      { name: 'Ocean Force', rarity: 'Legendary', image: 'https://ik.imagekit.io/CHXNDLER/card/WATER.png' },
    ],
    Heart: [
      { name: 'HEART', rarity: 'Rare', image: 'https://ik.imagekit.io/CHXNDLER/card/HEART.png' },
      { name: 'CHXNDLER', rarity: 'Rare', image: 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910' },
    ],
  };

  const getFilteredCards = () => {
    if (!selectedElement) return [];
    const cards = mockCards[selectedElement as keyof typeof mockCards] || [];
    if (selectedRarity === 'All') return cards;
    return cards.filter(card => card.rarity === selectedRarity);
  };

  // Arrow key navigation
  useEffect(() => {
    if (!showFullCollection || !selectedElement) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cards = getFilteredCards();
      if (cards.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => prev > 0 ? prev - 1 : cards.length - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        try { sfx.play('click', 0.5); } catch {}
        setCurrentCardIndex(prev => prev < cards.length - 1 ? prev + 1 : 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullCollection, selectedElement, selectedRarity]);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      // Close blue display first
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 w-12 h-10"
        style={{
          boxShadow: '0 0 20px rgba(252, 84, 175, 0.4), 0 0 40px rgba(252, 84, 175, 0.2)',
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.boxShadow = '0 0 30px rgba(252, 84, 175, 0.8), 0 0 50px rgba(252, 84, 175, 0.5), 0 0 70px rgba(252, 84, 175, 0.3)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(252, 84, 175, 0.4), 0 0 40px rgba(252, 84, 175, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/binder.png"
          alt="Binder"
          className="w-full h-full object-cover rounded"
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow - wider and stronger */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '400px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(252,84,175,0.7) 0%, rgba(252,84,175,0.4) 30%, rgba(252,84,175,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Binder Modal - holographic popup */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '300px'
          }}
        >
          <div
            className="binder-hologram-container"
            style={{
              width: 'min(92vw, 700px)',
              height: '35vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,105,180,0.55)',
              boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FF69B4',
              position: 'relative'
            }}
        >
          {/* Soft bottom glow pseudo element */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(252,84,175,0.6) 0%, rgba(252,84,175,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow - simulates hologram light rising through panel */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(252,84,175,0.4) 0%, rgba(252,84,175,0.2) 50%, transparent 100%)',
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
              // Show blue display when closing binder popup
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
          
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => {
                try { sfx.play('click', 0.6); } catch {}
                setShowFullCollection(!showFullCollection);
                setSelectedElement(null);
                setCurrentCardIndex(0);
              }}
              className="px-3 py-1 text-[10px] font-bold rounded border border-pink-400/60 hover:border-pink-400/80 transition-all duration-200"
              style={{
                background: 'rgba(255,105,180,0.1)',
                color: '#FFB6C1',
                textShadow: '0 0 4px rgba(255,182,193,0.8)',
                boxShadow: '0 0 8px rgba(255,105,180,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,105,180,0.2)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255,105,180,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,105,180,0.1)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255,105,180,0.3)';
              }}
            >
              {showFullCollection ? 'BACK TO BINDER' : 'FULL COLLECTION'}
            </button>
            <div 
              className="absolute left-1/2 transform -translate-x-1/2"
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              DIGITAL CARD BINDER
            </div>
            <div className="w-32"></div>
          </div>
          
          {/* Thin pink neon line */}
          <div 
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />
          <div 
            className="text-center mb-4"
            style={{ 
              whiteSpace: 'pre-wrap', 
              lineHeight: 1.2, 
              fontSize: 11, 
              color: '#FF69B4', 
              textShadow: '0 0 2px rgba(255,255,255,0.8), 0 0 8px rgba(255,105,180,0.6)', 
              marginTop: '-4px' 
            }}
          >
            Earn the cards that reflect your journey as you move through the Heartverse.
          </div>

          {/* Collection Progress */}
          <div 
            className="text-center mb-3"
            style={{ 
              color: '#FFB6C1', 
              textShadow: '0 0 4px rgba(255,182,193,0.8)', 
              fontSize: '12px',
              fontWeight: 'bold',
              marginTop: '-8px'
            }}
          >
            CARDS COLLECTED: 1/5
          </div>

          {/* Dynamic Content - Binder Slots or Full Collection */}
          <div className="relative mt-1">
            {!showFullCollection ? (
              // Binder Card Slots
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="text-center">
                    {index === 0 ? (
                      // First slot - Chxndler Card
                      <div 
                        className="w-full h-24 rounded border-2 border-pink-400/80 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10"
                        style={{
                          boxShadow: '0 0 15px rgba(255,105,180,0.5)',
                        }}
                        onClick={() => {
                          try { sfx.play('click', 0.8); } catch {}
                          setCardOpen(true);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 25px rgba(255,105,180,0.8), 0 0 40px rgba(255,105,180,0.5)';
                          e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(255,105,180,0.5)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img
                          src="https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"
                          alt="CHXNDLER Card"
                          className="w-full h-full object-cover rounded"
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
                        {/* Hover overlay with card details */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white text-xs">
                          <div className="font-bold mb-1" style={{ textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
                            CHXNDLER
                          </div>
                          <div className="text-pink-300 mb-1">★ RARE ★</div>
                          <div className="text-[10px] text-center px-1">
                            Original Artist Card
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Empty slots
                      <div 
                        className="w-full h-24 rounded border-2 border-dashed border-pink-400/40"
                        style={{
                          background: 'rgba(255,105,180,0.05)',
                          boxShadow: 'inset 0 0 10px rgba(255,105,180,0.1)',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Full Collection View
              <>
                {!selectedElement ? (
                  // Element Selection
                  <>
                    <div 
                      className="text-center mb-2"
                      style={{ 
                        color: '#FFB6C1', 
                        fontSize: '14px',
                        textShadow: '0 0 4px rgba(255,182,193,0.6)',
                        marginTop: '-12px'
                      }}
                    >
                      SELECT AN ELEMENT TO VIEW CARDS
                    </div>
                    <div className="grid grid-cols-4 gap-3 justify-center" style={{ marginTop: '-8px' }}>
                      {elements.map((element) => (
                        <div
                          key={element}
                          className="text-center cursor-pointer group max-w-16"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedElement(element);
                            setCurrentCardIndex(0);
                          }}
                        >
                          <div 
                            className="w-full h-28 rounded-lg border-2 border-pink-400/60 hover:border-pink-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105"
                            style={{
                              boxShadow: '0 0 15px rgba(255,105,180,0.3)',
                            }}
                          >
                            <img
                              src={`https://ik.imagekit.io/CHXNDLER/card/${element.toUpperCase()}.png`}
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
                            {/* Element name overlay */}
                            <div 
                              className="absolute bottom-1 left-1/2 transform -translate-x-1/2"
                              style={{ 
                                color: '#FFFFFF', 
                                textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.6)',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}
                            >
                              {element.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // Card View with Filters
                  <>
                    {/* Back and Filters */}
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => {
                          try { sfx.play('click', 0.6); } catch {}
                          setSelectedElement(null);
                          setCurrentCardIndex(0);
                        }}
                        className="flex items-center gap-2 text-pink-300 hover:text-pink-200 transition-colors text-xs"
                        style={{ textShadow: '0 0 4px rgba(255,182,193,0.6)' }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M19 12H5m7-7l-7 7 7 7"/>
                        </svg>
                        Back to Elements
                      </button>
                      
                      <select
                        value={selectedRarity}
                        onChange={(e) => {
                          setSelectedRarity(e.target.value);
                          setCurrentCardIndex(0);
                        }}
                        className="px-2 py-1 rounded border border-pink-400/60 bg-black/40 text-pink-200 text-xs"
                        style={{ 
                          boxShadow: '0 0 8px rgba(255,105,180,0.3)',
                          textShadow: '0 0 4px rgba(255,182,193,0.6)'
                        }}
                      >
                        {rarities.map(rarity => (
                          <option key={rarity} value={rarity} className="bg-black text-pink-200">
                            {rarity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Current Card Display */}
                    {(() => {
                      const cards = getFilteredCards();
                      const currentCard = cards[currentCardIndex];
                      
                      if (!currentCard) {
                        return (
                          <div 
                            className="text-center py-8"
                            style={{ 
                              color: '#FFB6C1', 
                              textShadow: '0 0 4px rgba(255,182,193,0.6)'
                            }}
                          >
                            No cards found for the selected filters
                          </div>
                        );
                      }

                      return (
                        <div className="text-center">
                          <div className="relative inline-block">
                            <img
                              src={currentCard.image}
                              alt={currentCard.name}
                              className="w-20 h-auto rounded-lg mx-auto"
                              style={{
                                boxShadow: '0 0 15px rgba(255,105,180,0.6), 0 0 30px rgba(255,105,180,0.3)',
                                border: '2px solid rgba(255,105,180,0.6)',
                              }}
                              draggable={false}
                            />
                            
                            {/* Navigation arrows */}
                            {cards.length > 1 && (
                              <>
                                <button
                                  onClick={() => {
                                    try { sfx.play('click', 0.5); } catch {}
                                    setCurrentCardIndex(prev => prev > 0 ? prev - 1 : cards.length - 1);
                                  }}
                                  className="absolute left-[-30px] top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200"
                                  style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                                >
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                    <path d="M15 18l-6-6 6-6"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    try { sfx.play('click', 0.5); } catch {}
                                    setCurrentCardIndex(prev => prev < cards.length - 1 ? prev + 1 : 0);
                                  }}
                                  className="absolute right-[-30px] top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/20 transition-all duration-200"
                                  style={{ boxShadow: '0 0 8px rgba(255,105,180,0.4)' }}
                                >
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                    <path d="M9 18l6-6-6-6"/>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Card Info */}
                          <div className="mt-3">
                            <div 
                              className="text-sm font-bold mb-1"
                              style={{ 
                                color: '#FFFFFF', 
                                textShadow: '0 0 6px rgba(255,255,255,0.8)'
                              }}
                            >
                              {currentCard.name}
                            </div>
                            <div 
                              className="text-xs"
                              style={{ 
                                color: currentCard.rarity === 'Legendary' ? '#FFD700' :
                                       currentCard.rarity === 'Rare' ? '#FF69B4' : '#87CEEB',
                                textShadow: '0 0 4px currentColor'
                              }}
                            >
                              ★ {currentCard.rarity.toUpperCase()} ★
                            </div>
                            {cards.length > 1 && (
                              <div 
                                className="text-[10px] mt-1"
                                style={{ 
                                  color: '#FFB6C1', 
                                  textShadow: '0 0 4px rgba(255,182,193,0.6)'
                                }}
                              >
                                {currentCardIndex + 1} of {cards.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Card Display Modal */}
      {cardOpen && (
        <div 
          className="fixed inset-0 z-[2147483648] flex items-center justify-center p-4"
          onClick={() => {
            try { sfx.play('close', 0.8); } catch {}
            setCardOpen(false);
          }}
        >
          {/* Background overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Card container */}
          <div 
            className="relative z-10"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(90vw, 280px)',
              maxHeight: '60vh',
            }}
          >
            {/* Card image */}
            <img
              src="https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"
              alt="CHXNDLER Card"
              className="w-full h-auto rounded-lg shadow-2xl"
              style={{
                boxShadow: '0 0 40px rgba(255,105,180,0.8), 0 0 80px rgba(255,105,180,0.5), 0 0 120px rgba(255,105,180,0.3)',
                border: '2px solid rgba(255,105,180,0.6)',
              }}
              draggable={false}
            />
            
            {/* Holographic shimmer effect */}
            <div 
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                animation: 'shimmer 4s ease-in-out infinite',
              }}
            />
            
            {/* Close button */}
            <button
              onClick={() => {
                try { sfx.play('close', 0.8); } catch {}
                setCardOpen(false);
              }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/80 flex items-center justify-center text-pink-200 hover:text-white hover:bg-pink-500/30 transition-all duration-200"
              style={{
                boxShadow: '0 0 15px rgba(255,105,180,0.6)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </>
  );
}