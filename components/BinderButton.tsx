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
  const [selectedCard, setSelectedCard] = useState<{name: string, image: string, rarity: string, element: string} | null>(null);

  // Full song collection data structure
  const songCollection = [
    { name: 'MR. BRIGHTSIDE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'CHEERLEADER (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'MAKE BELIEVE', element: '', rarity: 'Common' },
    { name: 'ALONE', element: 'DARKNESS', rarity: 'Common' },
    { name: 'ALONE (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common' },
    { name: 'LITTLE BLACK HEART (ACOUSTIC)', element: 'DARKNESS', rarity: 'Common' },
    { name: 'LITTLE BLACK HEART', element: 'DARKNESS', rarity: 'Common' },
    { name: 'AMERICAN DREAM', element: 'DARKNESS', rarity: 'Common' },
    { name: 'PARIS', element: 'DARKNESS', rarity: 'Common' },
    { name: 'PINK MOON', element: 'DARKNESS', rarity: 'Common' },
    { name: 'ALWAYS ON MY MIND', element: 'HEART', rarity: 'Common' },
    { name: 'ALWAYS ON MY MIND (REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'BE MY BEE', element: 'HEART', rarity: 'Common' },
    { name: 'BE MY BEE (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'CHEERLEADER', element: 'HEART', rarity: 'Common' },
    { name: 'COLLIDE', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME (BLUMA Game Soundtrack)', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'COLORS OF OUR HOME', element: 'HEART', rarity: 'Common' },
    { name: 'I MIGHT FALL IN LOVE WITH YOU', element: 'HEART', rarity: 'Common' },
    { name: 'LOVE ME', element: 'HEART', rarity: 'Common' },
    { name: 'LOVE ME (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'SOMEBODY TO LOVE', element: 'HEART', rarity: 'Common' },
    { name: 'TIENES UN AMIGO', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (ACOUSTIC)', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (DMVRCO REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'WE\'RE JUST FRIENDS (mickey jas REMIX)', element: 'HEART', rarity: 'Common' },
    { name: 'BABY', element: 'HEART', rarity: 'Common' },
    { name: 'BLUE (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'BLUE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'BRAIN FREEZE', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'FEELING THIS', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'GAME BOY HEART', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOME', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOME (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOUSE PARTY', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'HOUSE PARTY (ACOUSTIC)', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'KID FOREVER', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'POKÉMON', element: 'LIGHTNING', rarity: 'Common' },
    { name: 'LETTING GO', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL (ACOUSTIC)', element: 'WATER', rarity: 'Common' },
    { name: 'OCEAN GIRL (REMIX)', element: 'WATER', rarity: 'Common' },
    { name: 'WATER', element: 'WATER', rarity: 'Rare' },
    { name: 'HEART', element: 'HEART', rarity: 'Rare' },
    { name: 'LIGHTNING', element: 'LIGHTNING', rarity: 'Rare' },
    { name: 'DARKNESS', element: 'DARKNESS', rarity: 'Rare' },
    { name: 'CHXNDLER', element: 'ALL', rarity: 'Common' },
  ];
  
  const elements = ['LIGHTNING', 'DARKNESS', 'WATER', 'HEART'];
  const rarities = ['All', 'Common', 'Rare'];
  
  const getCardImage = (songName: string, element: string) => {
    const songImages: { [key: string]: string } = {
      'ALWAYS ON MY MIND': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'ALWAYS ON MY MIND (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/always-on-my-mind-remix.png?updatedAt=1762388342107',
      'ALONE': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'ALONE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
      'AMERICAN DREAM': 'https://ik.imagekit.io/CHXNDLER/card/american-dream.png?updatedAt=1762388346126',
      'BABY': 'https://ik.imagekit.io/CHXNDLER/card/baby.png?updatedAt=1762388345192',
      'BE MY BEE': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee.png?updatedAt=1762388342848',
      'BE MY BEE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/be-my-bee-acoustic.png?updatedAt=1762388342912',
      'BLUE (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/BLUE%20(ACOUSTIC).png?updatedAt=1763055066119',
      'BLUE': 'https://ik.imagekit.io/CHXNDLER/card/blue.png?updatedAt=1762388346777',
      'BRAIN FREEZE': 'https://ik.imagekit.io/CHXNDLER/card/brain-freeze.png?updatedAt=1762388347224',
      'CHEERLEADER (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'CHEERLEADER': 'https://ik.imagekit.io/CHXNDLER/card/cheerleader.png?updatedAt=1762388346177',
      'COLLIDE': 'https://ik.imagekit.io/CHXNDLER/card/collide.png?updatedAt=1762388347054',
      'COLORS OF OUR HOME': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20.png?updatedAt=1763055065493',
      'COLORS OF OUR HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763055064803',
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': 'https://ik.imagekit.io/CHXNDLER/card/colors-of-our-home-bluma.png?updatedAt=1762388344204',
      'FEELING THIS': 'https://ik.imagekit.io/CHXNDLER/card/feeling-this.png?updatedAt=1762388347289',
      'GAME BOY HEART': 'https://ik.imagekit.io/CHXNDLER/card/game-boy-heart.png?updatedAt=1762388346348',
      'HOME': 'https://ik.imagekit.io/CHXNDLER/card/home.png?updatedAt=1762388345590',
      'HOME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/home-acoustic.png?updatedAt=1762388344295',
      'HOUSE PARTY': 'https://ik.imagekit.io/CHXNDLER/card/HOUSE%20PARTY.png?updatedAt=1763055601783',
      'HOUSE PARTY (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/house-party-acoustic.png?updatedAt=1762388343028',
      'I MIGHT FALL IN LOVE WITH YOU': 'https://ik.imagekit.io/CHXNDLER/card/i-might-fall-in-love-with-you.png?updatedAt=1762388340663',
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/I%20MIGHT%20FALL%20IN%20LOVE%20WITH%20YOU%20(ACOUSTIC).png?updatedAt=1763055066309',
      'KID FOREVER': 'https://ik.imagekit.io/CHXNDLER/card/kid-forever.png?updatedAt=1762388339589',
      'LETTING GO': 'https://ik.imagekit.io/CHXNDLER/card/letting-go.png?updatedAt=1762388344472',
      'LITTLE BLACK HEART': 'https://ik.imagekit.io/CHXNDLER/card/little-black-heart.png?updatedAt=1762388346814',
      'LITTLE BLACK HEART (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/LITTLE%20BLACK%20HEART%20(ACOUSTIC).png?updatedAt=1763055066090',
      'LOVE ME': 'https://ik.imagekit.io/CHXNDLER/card/love-me.png?updatedAt=1762388339563',
      'LOVE ME (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/love-me-acoustic.png?updatedAt=1762388330787',
      'MAKE BELIEVE': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'MR. BRIGHTSIDE': 'https://ik.imagekit.io/CHXNDLER/card/mr.brightside.png?updatedAt=1762388346700',
      'OCEAN GIRL': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl.png?updatedAt=1762388343942',
      'OCEAN GIRL (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-acoustic.png?updatedAt=1762388344386',
      'OCEAN GIRL (REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/ocean-girl-remix.png?updatedAt=1762388346301',
      'PARIS': 'https://ik.imagekit.io/CHXNDLER/card/paris.png?updatedAt=1762388344978',
      'PINK MOON': 'https://ik.imagekit.io/CHXNDLER/card/pink-moon.png?updatedAt=1762388347173',
      'POKÉMON': 'https://ik.imagekit.io/CHXNDLER/card/pokemon.png?updatedAt=1762388341960',
      'SOMEBODY TO LOVE': 'https://ik.imagekit.io/CHXNDLER/card/somebody-to-love.png?updatedAt=1762388347148',
      'TIENES UN AMIGO': 'https://ik.imagekit.io/CHXNDLER/card/tienes-un-amigo.png?updatedAt=1762388343639',
      'WE\'RE JUST FRIENDS': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends.png?updatedAt=1762388347233',
      'WE\'RE JUST FRIENDS (ACOUSTIC)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-acoustic.png?updatedAt=1762388340285',
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-dmvrco-remix.png?updatedAt=1762388345669',
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': 'https://ik.imagekit.io/CHXNDLER/card/we\'re-just-friends-mickey-jas-remix.png?updatedAt=1762388346859',
      'CHXNDLER': 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
      'WATER': 'https://ik.imagekit.io/CHXNDLER/card/WATER.png',
      'HEART': 'https://ik.imagekit.io/CHXNDLER/card/HEART.png',
      'LIGHTNING': 'https://ik.imagekit.io/CHXNDLER/card/LIGHTNING.png',
      'DARKNESS': 'https://ik.imagekit.io/CHXNDLER/card/DARKNESS.png',
    };
    
    return songImages[songName] || 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910';
  };

  const getFilteredCards = () => {
    if (!selectedElement) return [];
    
    let filteredSongs = songCollection;
    
    // Filter by element
    filteredSongs = filteredSongs.filter(song => song.element === selectedElement);
    
    // Filter by rarity
    if (selectedRarity !== 'All') {
      filteredSongs = filteredSongs.filter(song => song.rarity === selectedRarity);
    }
    
    // Convert to card format with images
    return filteredSongs.map(song => ({
      name: song.name,
      rarity: song.rarity,
      element: song.element,
      image: getCardImage(song.name, song.element)
    }));
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
        className="p-1 rounded-lg transition-all duration-200 w-14 h-12"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/binder.png"
          alt="Binder"
          className="w-full h-full object-cover rounded"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(252, 84, 175, 0.8)) drop-shadow(0 0 16px rgba(252, 84, 175, 0.4))'
          }}
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
            CARDS COLLECTED: {songCollection.length}/{songCollection.length}
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
                        className="w-full h-32 rounded border-2 border-pink-400/80 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10"
                        style={{
                          boxShadow: '0 0 15px rgba(255,105,180,0.5)',
                        }}
                        onClick={() => {
                          try { sfx.play('click', 0.8); } catch {}
                          setSelectedCard({
                            name: 'CHXNDLER',
                            image: 'https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910',
                            rarity: 'Common',
                            element: 'ALL'
                          });
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
                        className="w-full h-32 rounded border-2 border-dashed border-pink-400/40"
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
                          className="text-center cursor-pointer group max-w-24"
                          onClick={() => {
                            try { sfx.play('click', 0.7); } catch {}
                            setSelectedElement(element);
                            setCurrentCardIndex(0);
                          }}
                        >
                          <div 
                            className="w-full h-36 rounded-lg border-2 border-pink-400/60 hover:border-pink-400/80 relative overflow-hidden transition-all duration-300 group-hover:scale-105"
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
                            {/* Show song count for this element */}
                            <div 
                              className="absolute top-1 right-1 bg-black/70 rounded px-1 py-0.5"
                              style={{ 
                                color: '#FFB6C1', 
                                textShadow: '0 0 4px rgba(255,182,193,0.6)',
                                fontSize: '8px',
                                fontWeight: 'bold'
                              }}
                            >
                              {songCollection.filter(song => song.element === element).length}
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
                      <div className="flex items-center gap-4">
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
                      
                      <div></div>
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
                        <div className="text-center -mt-20">
                          <div className="relative inline-block">
                            <img
                              src={currentCard.image}
                              alt={currentCard.name}
                              className="w-32 h-auto rounded-lg mx-auto cursor-pointer transition-transform duration-300 hover:scale-110"
                              style={{
                                boxShadow: '0 0 15px rgba(255,105,180,0.6), 0 0 30px rgba(255,105,180,0.3)',
                                border: '2px solid rgba(255,105,180,0.6)',
                              }}
                              draggable={false}
                              onClick={() => {
                                try { sfx.play('click', 0.8); } catch {}
                                setSelectedCard(currentCard);
                                setCardOpen(true);
                              }}
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
                                textShadow: '0 0 6px rgba(255,255,255,0.8)',
                                fontSize: '11px'
                              }}
                            >
                              {currentCard.name}
                            </div>
                            <div 
                              className="text-xs mb-1"
                              style={{ 
                                color: currentCard.rarity === 'Rare' ? '#FF69B4' : '#87CEEB',
                                textShadow: '0 0 4px currentColor',
                                fontSize: '10px'
                              }}
                            >
                              ★ {currentCard.rarity.toUpperCase()} ★
                            </div>
                            {currentCard.element && (
                              <div 
                                className="text-[9px] mb-1"
                                style={{ 
                                  color: '#FFB6C1', 
                                  textShadow: '0 0 4px rgba(255,182,193,0.6)'
                                }}
                              >
                                Element: {currentCard.element}
                              </div>
                            )}
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
          style={{ paddingTop: '40vh' }}
          onClick={() => {
            try { sfx.play('close', 0.8); } catch {}
            setCardOpen(false);
          }}
        >
          
          {/* Card container */}
          <div 
            className="relative z-10"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(70vw, 200px)',
              maxHeight: '40vh',
            }}
          >
            {/* Card image */}
            <img
              src={selectedCard?.image || "https://ik.imagekit.io/CHXNDLER/card/chxndler.png?updatedAt=1762388337910"}
              alt={selectedCard?.name || "CHXNDLER Card"}
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