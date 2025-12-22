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

        // Debug: Check current auth session
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        console.log('[UserCards] Debug:', {
          viewedUserId: userId,
          sessionExists: !!session,
          currentUserId: session?.user?.id ?? 'none (anon)',
        });

        // Fetch user profile from public_profiles_table (never query private profiles table)
        const profileResponse = await supabaseBrowser
          .from('public_profiles_table')
          .select('id, name, card_slots')
          .eq('id', userId)
          .maybeSingle();

        if (profileResponse.error) {
          console.error('[UserCards] Profile fetch error:', profileResponse.error);
          setUserProfile(null);
          setUserCards([]);
          setLoading(false);
          return;
        }

        // Handle case where profile doesn't exist in public_profiles_table
        if (!profileResponse.data) {
          setUserProfile(null);
          setUserCards([]);
          setLoading(false);
          return;
        }

        setUserProfile({
          id: profileResponse.data.id,
          name: profileResponse.data.name,
          card_slots: profileResponse.data.card_slots,
        });

        // Try fetching cards - use user_cards table with is_public = true filter
        // Only show cards that the user has explicitly marked as public
        try {
          console.log('[UserCards] Fetching public cards for viewedUserId:', userId);

          const cardsResponse = await supabaseBrowser
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
            .eq('is_public', true)
            .order('acquired_at', { ascending: true });

          if (cardsResponse.error) {
            console.error('[UserCards] Error fetching public cards:', {
              code: cardsResponse.error.code,
              message: cardsResponse.error.message,
              details: cardsResponse.error.details,
              hint: cardsResponse.error.hint,
            });
            // Show user-friendly error
            setError('Unable to load public cards. Please try again later.');
            setUserCards([]);
          } else {
            console.log('[UserCards] Fetched public cards count:', cardsResponse.data?.length ?? 0);
            setUserCards(cardsResponse.data || []);
          }
        } catch (err) {
          // If cards fetch fails for any reason, show error state
          console.error('[UserCards] Exception fetching public cards:', err);
          setError('Unable to load public cards. Please try again later.');
          setUserCards([]);
        }
      } catch (err) {
        // On any error, show empty state rather than error message
        console.error('[UserCards] Unexpected error:', err);
        setUserProfile(null);
        setUserCards([]);
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
      <div className={`text-center ${className}`}>
        <div className="text-red-400/80 text-sm mb-2">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-white/50 hover:text-white/80 underline transition-colors"
        >
          Refresh page
        </button>
      </div>
    );
  }

  // Handle case where profile doesn't exist
  if (!userProfile) {
    return (
      <div className={`text-center text-white/60 text-sm ${className}`}>
        No public cards yet.
      </div>
    );
  }

  // Handle case where user has no public cards
  if (userCards.length === 0) {
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
        <div className="text-center text-white/50 text-sm py-4">
          No public cards yet.
        </div>
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