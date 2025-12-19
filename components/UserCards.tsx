"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { sfx } from "@/lib/sfx";

// Types for user owned cards
type OwnedCardRow = {
  id: string;
  card_id: string;
  acquired_at: string;
  cards: {
    id: string;
    card_name: string;
    element: string;
    rarity: string;
    is_released?: boolean;
    min_tier?: string;
    artwork_url?: string;
  };
};

interface UserProfile {
  id: string;
  name: string | null;
  card_slots?: number | null;
}

type Props = {
  userId: string; // User ID to show cards for
  embedded?: boolean;
  className?: string;
  showTitle?: boolean;
  maxCards?: number; // Limit number of cards shown
  onCardClick?: (card: OwnedCardRow['cards']) => void;
};

export default function UserCards({ 
  userId, 
  embedded = true, 
  className = "", 
  showTitle = false,
  maxCards = 4,
  onCardClick
}: Props) {
  // State for user data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userCards, setUserCards] = useState<OwnedCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch user profile and cards
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userId) return;
        
        setLoading(true);
        setError(null);

        // Fetch user profile and cards in parallel
        const [profileResponse, cardsResponse] = await Promise.all([
          supabaseBrowser
            .from('public_profiles')
            .select('user_id, name, card_slots')
            .eq('user_id', userId)
            .maybeSingle(),
          supabaseBrowser
            .from('user_cards')
            .select(`
              id,
              card_id,
              acquired_at,
              cards (
                id,
                card_name,
                element,
                rarity,
                is_released,
                min_tier,
                artwork_url
              )
            `)
            .eq('user_id', userId)
            .order('acquired_at', { ascending: true })
        ]);

        if (profileResponse.error) {
          console.error('Error fetching user profile:', profileResponse.error);
          setError(`Failed to load user profile: ${profileResponse.error.message}`);
          return;
        }

        // Handle case where profile doesn't exist in public_profiles
        if (!profileResponse.data) {
          console.warn('Profile not found in public_profiles for user:', userId);
          setUserProfile(null);
          setUserCards([]);
          setLoading(false);
          return;
        }

        if (cardsResponse.error) {
          console.error('Error fetching user cards:', cardsResponse.error);
          setError(`Failed to load user cards: ${cardsResponse.error.message}`);
          return;
        }

        setUserProfile({
          id: profileResponse.data.user_id,
          name: profileResponse.data.name,
          card_slots: profileResponse.data.card_slots,
        });

        setUserCards(cardsResponse.data || []);
      } catch (err) {
        console.error('Error in fetchUserData:', err);
        setError(`Failed to fetch user data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    setCurrentPage(0); // Reset to first page when userId changes
  }, [userId]);

  const handleCardClick = (card: OwnedCardRow['cards']) => {
    try { 
      sfx.play('click', 0.6); 
    } catch {} 
    
    if (onCardClick) {
      onCardClick(card);
    }
  };

  if (loading) {
    return (
      <div className={`text-center text-white/60 ${className}`}>
        Loading cards...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center text-red-400 text-sm ${className}`}>
        Error loading cards: {error}
      </div>
    );
  }

  // Handle case where profile doesn't exist
  if (!userProfile) {
    return (
      <div className={`text-center text-white/60 text-sm ${className}`}>
        Profile not found
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <img 
            src="/elements/binder.webp" 
            alt="Card Binder" 
            className="w-5 h-5"
          />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#FF69B4' }}>
            CARD COLLECTION
          </h3>
        </div>
      )}

      {/* Card Grid */}
      <div className="flex items-center gap-2">
        {/* Left arrow button if not on first page */}
        {currentPage > 0 && (
          <button
            onClick={() => {
              try { 
                sfx.play('click', 0.4); 
              } catch {}
              setCurrentPage(currentPage - 1);
            }}
            onMouseEnter={() => {
              try { sfx.play('hover', 0.6); } catch {}
            }}
            className="flex items-center justify-center w-6 h-8 rounded transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255, 105, 180, 0.1)',
              border: '1px solid #FF69B440',
              color: '#FF69B4',
              boxShadow: '0 0 4px #FF69B420'
            }}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}

        <div className="grid grid-cols-4 gap-2 flex-1">
          {Array.from({ length: maxCards }, (_, index) => {
            const cardIndex = currentPage * maxCards + index;
            const collectedCard = userCards[cardIndex];
            const hasCard = !!collectedCard?.cards;
            const cardSlots = userProfile?.card_slots ?? 0;
            const isSlotUnlocked = cardIndex < cardSlots;
            
            return (
              <div
                key={index}
                className="relative aspect-[3/4] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105"
                style={{
                  background: hasCard 
                    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                    : isSlotUnlocked 
                      ? 'linear-gradient(135deg, #333 0%, #555 100%)'
                      : 'linear-gradient(135deg, #111 0%, #222 100%)',
                  border: hasCard 
                    ? '2px solid #FF69B460'
                    : isSlotUnlocked
                      ? '2px dashed #FF69B440'
                      : '2px solid #333',
                  boxShadow: hasCard ? '0 0 8px #FF69B430' : 'none'
                }}
                onClick={() => {
                  if (hasCard) {
                    handleCardClick(collectedCard.cards);
                  }
                }}
                onMouseEnter={() => {
                  if (hasCard) {
                    try { sfx.play('hover', 0.6); } catch {}
                  }
                }}
              >
                {hasCard ? (
                  <img
                    src={collectedCard.cards.artwork_url || '/cards/default-card.webp'}
                    alt={collectedCard.cards.card_name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      // Fallback image if card image doesn't exist
                      console.log('Card image failed to load:', e.currentTarget.src);
                      e.currentTarget.src = '/cards/default-card.webp';
                    }}
                  />
                ) : isSlotUnlocked ? (
                  <div className="text-center text-white/40 text-xs">
                    <div>+</div>
                    <div>SLOT</div>
                  </div>
                ) : (
                  <div className="text-center text-white/20 text-xs">
                    <div>🔒</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Right arrow button if user has more cards */}
        {userCards.length > (currentPage + 1) * maxCards && (
          <button
            onClick={() => {
              try { 
                sfx.play('click', 0.4); 
              } catch {}
              setCurrentPage(currentPage + 1);
            }}
            onMouseEnter={() => {
              try { sfx.play('hover', 0.6); } catch {}
            }}
            className="flex items-center justify-center w-6 h-8 rounded transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255, 105, 180, 0.1)',
              border: '1px solid #FF69B440',
              color: '#FF69B4',
              boxShadow: '0 0 4px #FF69B420'
            }}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        )}
      </div>
      
    </div>
  );
}