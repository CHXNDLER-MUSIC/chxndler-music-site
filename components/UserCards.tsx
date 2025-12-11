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
            .from('profiles')
            .select('id, name, card_slots')
            .eq('id', userId)
            .single(),
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
                min_tier
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

        if (cardsResponse.error) {
          console.error('Error fetching user cards:', cardsResponse.error);
          setError(`Failed to load user cards: ${cardsResponse.error.message}`);
          return;
        }

        setUserProfile({
          id: profileResponse.data.id,
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

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <img 
            src="/elements/binder.webp" 
            alt="Card Binder" 
            className="w-5 h-5"
          />
          <h3 className="text-white/90 text-sm font-bold uppercase tracking-wider">
            {userProfile?.name || 'User'} Collection
          </h3>
        </div>
      )}

      {/* Card Grid */}
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-4 gap-2 flex-1">
          {Array.from({ length: maxCards }, (_, index) => {
            const collectedCard = userCards[index];
            const hasCard = !!collectedCard?.cards;
            const cardSlots = userProfile?.card_slots ?? 0;
            const isSlotUnlocked = index < cardSlots;
            
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
                    ? '2px solid #00BFFF60'
                    : isSlotUnlocked
                      ? '2px dashed #00BFFF40'
                      : '2px solid #333',
                  boxShadow: hasCard ? '0 0 8px #00BFFF30' : 'none'
                }}
                onClick={() => {
                  if (hasCard) {
                    handleCardClick(collectedCard.cards);
                  }
                }}
              >
                {hasCard ? (
                  <img
                    src={`/cards/${collectedCard.cards.card_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')}.webp`}
                    alt={collectedCard.cards.card_name}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      // Fallback image if card image doesn't exist
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
        {userCards.length > maxCards && (
          <button
            onClick={() => {
              try { 
                sfx.play('click', 0.4); 
              } catch {}
              // This could trigger opening the full binder modal
            }}
            className="flex items-center justify-center w-6 h-8 rounded transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(0, 191, 255, 0.1)',
              border: '1px solid #00BFFF40',
              color: '#00BFFF',
              boxShadow: '0 0 4px #00BFFF20'
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
      
      {/* Card Stats */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
        <div className="text-xs text-white/60">
          Collected: {userCards.length} cards
        </div>
        <div className="text-xs text-white/60">
          Slots: {userProfile?.card_slots || 0}
        </div>
      </div>
    </div>
  );
}