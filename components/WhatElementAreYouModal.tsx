"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUIStore } from "@/store/useUIStore";
import { useProfile as useNewProfile } from "@/hooks/useProfile";
import { useProfile } from "@/contexts/ProfileContext";
import { useAudio } from "@/app/providers/AudioProvider";
import type { Element } from "@/lib/planets";
import { ELEMENT_COLORS } from "@/lib/planets";
import { logHeartcoinTransaction } from "@/utils/heartcoins";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";

// Element sound mappings
const ELEMENT_SOUNDS: Record<Element, string> = {
  heart: '/audio/heart-pulse.mp3',
  lightning: '/audio/lightning-spark.mp3',
  water: '/audio/water-ripple.mp3',
  darkness: '/audio/shadow-glow.mp3',
};

const ELEMENTS: { key: Element; name: string; label: string; description: string; icon: string }[] = [
  { key: "heart", name: "HEART", label: "Heart", description: "Love, passion, and connection", icon: "/elements/heart.webp" },
  { key: "lightning", name: "LIGHTNING", label: "Lightning", description: "Energy, power, and innovation", icon: "/elements/lightning.webp" },
  { key: "water", name: "WATER", label: "Water", description: "Flow, adaptability, and depth", icon: "/elements/water.webp" },
  { key: "darkness", name: "DARKNESS", label: "Darkness", description: "Mystery, introspection, and rebirth", icon: "/elements/darkness.webp" },
];

export default function WhatElementAreYouModal() {
  const { showElementSelection, closeElementSelection, triggerProfileRefresh, openNamePrompt } = useUIStore();
  const { updateProfileNameAndElement, profile } = useProfile();
  const { completeOnboarding, refreshProfile } = useNewProfile();
  const audio = useAudio();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Track which cards are flipped (showing back side)
  const [flippedCards, setFlippedCards] = useState<Set<Element>>(new Set());
  // Track which card is being hovered
  const [hoveredCard, setHoveredCard] = useState<Element | null>(null);

  // Check authentication when modal opens
  // Uses getSession() to avoid AuthSessionMissingError when logged out
  useEffect(() => {
    const checkAuth = async () => {
      // Use getSession() first - does NOT throw when logged out
      const { data: { session } } = await supabaseClient.auth.getSession();
      // If no session, user is null - this is expected for logged-out users
      setCurrentUser(session?.user || null);
    };

    if (showElementSelection) {
      checkAuth();
      // Reset flipped cards when modal opens
      setFlippedCards(new Set());
      setHoveredCard(null);
    }
  }, [showElementSelection]);

  // Handle card click - flip the card and play element sound
  const handleCardClick = (elementKey: Element) => {
    // Play element-specific sound
    const soundUrl = ELEMENT_SOUNDS[elementKey];
    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      audio.play().catch(e => console.log('Element audio play failed:', e));
    }

    // Only one card can be flipped at a time
    // If clicking the same card that's already flipped, flip it back
    // Otherwise, flip the new card and unflip any others
    setFlippedCards(prev => {
      if (prev.has(elementKey)) {
        // Clicking same card - flip it back
        return new Set();
      } else {
        // Clicking new card - only this one should be flipped
        return new Set([elementKey]);
      }
    });

    // Select this element
    setSelectedElement(elementKey);
  };

  // Handle card hover
  const handleCardHover = (elementKey: Element | null) => {
    if (elementKey && hoveredCard !== elementKey) {
      // Play change-channel.mp3 sound on hover
      const audio = new Audio('/audio/change-channel.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Hover audio play failed:', e));
    }
    setHoveredCard(elementKey);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedElement) return;

    const selectedElementData = ELEMENTS.find(el => el.key === selectedElement);
    if (!selectedElementData) return;

    setLoading(true);
    setError(null);

    // Case a: No authenticated user
    if (!currentUser) {
      setError("You need to log in to create your ALIEN name before choosing your Element.");
      setLoading(false);
      return;
    }

    // Case b: Logged in user but no profile row
    if (!profile) {
      setError("Please complete your Heartverse profile and choose your ALIEN name first.");
      setLoading(false);
      return;
    }

    // Case c: Profile exists but no name
    const currentName = profile?.name;
    if (!currentName) {
      setError("Choose your ALIEN name before selecting an Element.");
      setLoading(false);
      return;
    }

    try {
      // Play alien-wave.mp3 sound when aligning
      const alienWaveAudio = new Audio('/audio/alien-wave.mp3');
      alienWaveAudio.volume = 0.8;
      alienWaveAudio.play().catch(e => console.log('Audio play failed:', e));

      // Save name and element to profiles table using ProfileContext
      console.log('🎯 Saving name and element to profiles table');
      await updateProfileNameAndElement(currentName, selectedElementData.label);

      // Refresh profile to get updated data
      await refreshProfile();

      console.log('Profile completed! Name:', currentName, 'Element:', selectedElementData.label);

      // Close element selection modal
      closeElementSelection();

      // Trigger profile refresh to update the UI
      triggerProfileRefresh();

      // Award first HeartCoin for profile completion
      console.log('🪙 Awarding first HeartCoin for profile completion');
      triggerHeartCoinCelebration(1);

      // Trigger warp to Heartverse center planet and play heart.mp3
      console.log('🚀 Triggering warp to Heartverse');

      // Dispatch warp event to center planet
      window.dispatchEvent(new CustomEvent('planet:warp', {
        detail: { element: 'center', isCenterPlanet: true, isOnboarding: true }
      }));

      // Play heart.mp3 track through audio manager
      setTimeout(() => {
        try {
          if (audio?.playTrack) {
            console.log('🎵 Playing heart.mp3');
            audio.playTrack('heart');
          }
        } catch (e) {
          console.log('Failed to play heart.mp3:', e);
        }
      }, 500);

      // Show welcome modal after warp completes
      setTimeout(() => {
        try {
          console.log('Dispatching heartverse:entered event');
          window.dispatchEvent(new CustomEvent('heartverse:entered'));

          // Show HeartverseWelcomeModal (Welcome home display with relics)
          console.log('Dispatching heartverse:showWelcome to show Welcome home modal');
          window.dispatchEvent(new CustomEvent('heartverse:showWelcome'));
        } catch {}
      }, 2500); // Wait for warp to complete
    } catch (e: any) {
      setError(e?.message || "Failed to save element selection");
    } finally {
      setLoading(false);
    }
  }

  if (!showElementSelection) return null;
  if (typeof document === 'undefined') return null;

  // Get element color for glow effects
  const getElementColor = (key: Element) => {
    return key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[key];
  };

  return createPortal(
    <>
      {/* Flip card animation styles */}
      <style>{`
        .element-card-container {
          perspective: 1000px;
        }

        .element-card {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
          transform-style: preserve-3d;
        }

        .element-card.flipped {
          transform: rotateY(180deg);
        }

        .element-card.hovered:not(.flipped) {
          transform: scale(1.05);
        }

        .element-card.hovered.flipped {
          transform: rotateY(180deg) scale(1.05);
        }

        .element-card-face {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px;
          box-sizing: border-box;
        }

        .element-card-front {
          background: rgba(0,0,0,0.2);
          backdrop-filter: blur(4px);
        }

        .element-card-back {
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          transform: rotateY(180deg);
        }

        @keyframes pulseGlow {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.2) saturate(1.3); }
        }

        .element-card.selected .element-card-face {
          animation: pulseGlow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Hologram base glow */}
      <div
        className="fixed flex justify-center"
        style={{
          zIndex: 2147483647,
          pointerEvents: 'none',
          left: 0,
          right: 0,
          top: 'var(--profile-bar-boundary, 64px)',
          bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
          alignItems: 'flex-start',
          paddingTop: '200px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>

      {/* Element Selection Modal */}
      <div
        className="fixed flex justify-center"
        style={{
          zIndex: 2147483648,
          left: 0,
          right: 0,
          top: 'var(--profile-bar-boundary, 64px)',
          bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
          alignItems: 'flex-start'
        }}
      >
        <div
          className="onboarding-hologram-container"
          style={{
            width: 'min(92vw, 600px)',
            height: '100%',
            padding: '12px 16px 8px 16px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
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
            background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Top bloom glow */}
        <div
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '20px',
            background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Header */}
        <div
          className="text-center mb-2"
          style={{
            color: '#00FFFF',
            textShadow: '0 0 8px rgba(0,255,255,0.6)',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Choose your Elemental affinity
        </div>

        {/* Thin cyan neon line */}
        <div
          className="w-full h-px mb-2"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <p className="relative text-xs mb-2 text-center" style={{ color: '#FFFFFF', textShadow: '0 0 4px rgba(255,255,255,0.6)' }}>
          You can change this later
        </p>

        {error && (
          <div className="relative mb-4 rounded-md bg-red-50/10 border border-red-200/40 p-3 text-sm text-red-200">
            <div className="mb-2">{error}</div>
            {error === "Choose your ALIEN name before selecting an Element." && (
              <button
                onClick={() => {
                  closeElementSelection();
                  openNamePrompt();
                }}
                className="mt-2 px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 rounded text-xs transition-all duration-200"
                style={{
                  boxShadow: '0 0 8px rgba(34, 211, 238, 0.3)',
                  textShadow: '0 0 4px rgba(34, 211, 238, 0.6)'
                }}
              >
                Choose Name
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 flex-1 flex flex-col">
          {/* Element Grid */}
          <div className="grid grid-cols-2 gap-2 mb-1 flex-1" style={{ gridAutoRows: '1fr' }}>
            {ELEMENTS.map((element) => {
              const isFlipped = flippedCards.has(element.key);
              const isHovered = hoveredCard === element.key;
              const isSelected = selectedElement === element.key;
              const elementColor = getElementColor(element.key);

              return (
                <div
                  key={element.key}
                  className="element-card-container"
                  style={{ minHeight: '90px', width: '100%', position: 'relative', flex: 1 }}
                >
                  <button
                    type="button"
                    onClick={() => !loading && handleCardClick(element.key)}
                    onMouseEnter={() => !loading && handleCardHover(element.key)}
                    onMouseLeave={() => handleCardHover(null)}
                    disabled={loading}
                    className={`element-card ${isFlipped ? 'flipped' : ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '2px solid',
                      borderColor: isSelected
                        ? elementColor
                        : isHovered
                          ? `${elementColor}80`
                          : 'rgba(0,255,255,0.3)',
                      borderRadius: '0.5rem',
                      background: 'transparent',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: isHovered || isSelected
                        ? `0 0 20px ${elementColor}60, 0 0 40px ${elementColor}30, inset 0 0 15px ${elementColor}20`
                        : 'none',
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {/* Front face - shows icon only */}
                    <div
                      className="element-card-face element-card-front"
                      style={{
                        background: isSelected
                          ? `${elementColor}20`
                          : isHovered
                            ? `${elementColor}10`
                            : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <img
                        src={element.icon}
                        alt={element.name}
                        className="w-14 h-14"
                        style={{
                          filter: isHovered || isSelected
                            ? `drop-shadow(0 0 8px ${elementColor}) drop-shadow(0 0 16px ${elementColor}80)`
                            : 'drop-shadow(0 0 2px #00FFFF)',
                          transition: 'filter 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Back face - shows name and description */}
                    <div
                      className="element-card-face element-card-back"
                      style={{
                        background: isSelected
                          ? `${elementColor}25`
                          : `${elementColor}15`,
                      }}
                    >
                      <div
                        className="font-bold text-lg mb-1"
                        style={{
                          color: elementColor,
                          textShadow: `0 0 10px ${elementColor}, 0 0 20px ${elementColor}80`
                        }}
                      >
                        {element.name}
                      </div>
                      <div
                        className="text-xs text-center px-2"
                        style={{
                          color: elementColor,
                          textShadow: `0 0 4px ${elementColor}60`,
                          opacity: 0.9
                        }}
                      >
                        {element.description}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedElement}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={(() => {
              const buttonColor = selectedElement ? getElementColor(selectedElement) : '#00FFFF';
              return {
                background: `${buttonColor}15`,
                border: `1px solid ${buttonColor}80`,
                color: buttonColor,
                textShadow: `0 0 8px ${buttonColor}, 0 0 16px ${buttonColor}99, 0 0 24px ${buttonColor}66`,
                boxShadow: loading || !selectedElement
                  ? 'none'
                  : `0 0 15px ${buttonColor}66, 0 0 25px ${buttonColor}33, 0 0 35px ${buttonColor}22`,
                transition: 'all 0.3s ease'
              };
            })()}
          >
            {loading ? "ALIGNING..." : "ALIGN"}
          </button>
        </form>
        </div>
      </div>
    </>,
    document.body
  );
}
