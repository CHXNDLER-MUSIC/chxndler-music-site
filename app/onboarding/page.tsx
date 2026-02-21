"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useProfile } from "@/contexts/ProfileContext";
import { useAudio } from "@/app/providers/AudioProvider";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";
import type { Element } from "@/lib/planets";
import { ELEMENT_COLORS } from "@/lib/planets";

// Element data
const ELEMENTS: { key: Element; name: string; label: string; description: string; icon: string }[] = [
  { key: "heart", name: "HEART", label: "Heart", description: "Love, passion, and connection", icon: "/elements/heart.webp" },
  { key: "lightning", name: "LIGHTNING", label: "Lightning", description: "Energy, power, and innovation", icon: "/elements/lightning.webp" },
  { key: "water", name: "WATER", label: "Water", description: "Flow, adaptability, and depth", icon: "/elements/water.webp" },
  { key: "darkness", name: "DARKNESS", label: "Darkness", description: "Mystery, introspection, and rebirth", icon: "/elements/darkness.webp" },
];

// Element sound mappings
const ELEMENT_SOUNDS: Record<Element, string> = {
  heart: '/audio/heart-pulse.mp3',
  lightning: '/audio/lightning-spark.mp3',
  water: '/audio/water-ripple.mp3',
  darkness: '/audio/shadow-glow.mp3',
};

type OnboardingStep = 'name' | 'element' | 'celebration' | 'tourPrompt' | 'welcome';

// Wrapper component for Suspense boundary (required for useSearchParams)
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #020016, #0a0020)' }}>
      <div style={{ color: '#00FFFF', fontSize: '18px' }}>Loading...</div>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audio = useAudio();
  const { profile, refreshProfile, updateProfile } = useProfile();

  // Always start at step 1 (name) - no localStorage restoration
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState("");
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warpTriggered, setWarpTriggered] = useState(false);
  const [heartcoinAwarded, setHeartcoinAwarded] = useState(false);

  // Track which cards are flipped
  const [flippedCards, setFlippedCards] = useState<Set<Element>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<Element | null>(null);

  // User ID fetched directly from auth (more reliable than profile context)
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Ref for audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if entry=start to trigger warp
  const entryMode = searchParams.get('entry');

  // Fetch user ID directly from Supabase auth on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          if (process.env.NODE_ENV !== "production") console.log('[Onboarding] User ID fetched:', session.user.id);
        } else {
          if (process.env.NODE_ENV !== "production") console.log('[Onboarding] No session found, redirecting to login');
          router.push('/login');
        }
      } catch (err) {
        console.error('[Onboarding] Error fetching user:', err);
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  // Trigger warp on mount if entry=start
  useEffect(() => {
    if (entryMode === 'start' && !warpTriggered) {
      setWarpTriggered(true);
      // Dispatch planet:warp event to trigger warp to Heartverse center
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('planet:warp', {
          detail: { element: 'center', isCenterPlanet: true, isOnboarding: true }
        }));
      }, 500);
    }
  }, [entryMode, warpTriggered]);

  // Preload heart.mp3 as the onboarding audio track
  useEffect(() => {
    if (audio?.preloadTrack) {
      audio.preloadTrack('heart');
    }
  }, [audio]);

  // Play you-are-home.mp3 when entering onboarding
  useEffect(() => {
    const audio = new Audio('/tracks/you-are-home.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => {});
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Pre-fill name from profile if exists
  useEffect(() => {
    if (profile?.name && !name) {
      // Don't prefill auto-generated names
      const trimmedName = profile.name.trim().toLowerCase();
      const autoNames = ['alien', 'heartverse wanderer', 'wanderer'];
      if (!autoNames.includes(trimmedName) && !profile.email?.split('@')[0]?.toLowerCase().includes(trimmedName)) {
        setName(profile.name);
      }
    }
  }, [profile?.name, profile?.email, name]);

  // Handle name submission
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!userId) {
      setError("Not authenticated. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Play sound
      const audio = new Audio('/audio/join-alien.mp3');
      audio.play().catch(() => {});

      if (process.env.NODE_ENV !== "production") console.log('[Onboarding] Saving name for user:', userId);

      // Save name to profile (but don't complete yet)
      const { error: updateError } = await supabaseBrowser
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', userId);

      if (updateError) throw updateError;

      if (process.env.NODE_ENV !== "production") console.log('[Onboarding] Name saved, moving to element selection');

      // Move to element selection
      setStep('element');
    } catch (e: any) {
      console.error('[Onboarding] Error saving name:', e);
      setError(e?.message || "Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  // Handle card click
  const handleCardClick = (elementKey: Element) => {
    // Play element sound
    const soundUrl = ELEMENT_SOUNDS[elementKey];
    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      audio.play().catch(() => {});
    }

    // Toggle flip
    setFlippedCards(prev => {
      if (prev.has(elementKey)) {
        return new Set();
      } else {
        return new Set([elementKey]);
      }
    });

    setSelectedElement(elementKey);
  };

  // Handle card hover
  const handleCardHover = (elementKey: Element | null) => {
    if (elementKey && hoveredCard !== elementKey) {
      const audio = new Audio('/audio/change-channel.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
    setHoveredCard(elementKey);
  };

  // Handle align (element confirmation)
  const handleAlign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement) return;

    const selectedElementData = ELEMENTS.find(el => el.key === selectedElement);
    if (!selectedElementData) return;

    setLoading(true);
    setError(null);

    try {
      // Play alignment sound
      const audio = new Audio('/audio/alien-wave.mp3');
      audio.volume = 0.8;
      audio.play().catch(() => {});

      // Call RPC to align element and award first coin
      const { data, error: rpcError } = await supabaseBrowser.rpc('align_element_and_award_first_coin', {
        p_name: name.trim(),
        p_element: selectedElementData.label
      });

      if (rpcError) throw rpcError;

      // Refresh profile
      await refreshProfile();

      // Check if HeartCoin was awarded
      if (data?.awarded === true) {
        setHeartcoinAwarded(true);
        // Trigger celebration
        triggerHeartCoinCelebration(1);
        // Show celebration step briefly
        setStep('celebration');
        // Auto-advance to welcome after 3 seconds
        setTimeout(() => {
          // After celebration, show tour prompt
          setStep('tourPrompt');
        }, 3000);
      } else {
        // No coin awarded (already completed before), skip to welcome
        setStep('welcome');
      }
    } catch (e: any) {
      setError(e?.message || "Failed to align element");
    } finally {
      setLoading(false);
    }
  };

  // Handle enter heartverse (final step)
  const handleEnterHeartverse = () => {
    // Dispatch event
    window.dispatchEvent(new CustomEvent('heartverse:entered'));
    // Navigate to main heartverse
    router.push('/');
  };

  // Handle skipping tour now (mark as seen to avoid prompt) and enter
  const handleSkipTourAndEnter = async () => {
    try {
      await updateProfile({ has_seen_tour: true });
    } catch {}
    router.push('/');
  };

  // Get element color
  const getElementColor = (key: Element) => {
    return key === 'darkness' ? '#FFFFFF' : ELEMENT_COLORS[key];
  };

  // Common hologram container styles
  const hologramContainerStyle = {
    width: 'min(92vw, 500px)',
    padding: '16px 24px 20px 24px',
    borderRadius: 18,
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(0,255,255,0.55)',
    boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
    backdropFilter: 'blur(12px) saturate(140%)',
    color: '#00FFFF',
    position: 'relative' as const,
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #020016, #0a0020)' }}>
        <div style={{ color: '#00FFFF', fontSize: '18px', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #020016, #0a0020)' }}>
      {/* Base glow */}
      <div
        className="fixed flex justify-center pointer-events-none"
        style={{
          zIndex: 1,
          left: 0,
          right: 0,
          top: '20%',
          bottom: '20%',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(0,255,255,0.5) 0%, rgba(0,255,255,0.2) 40%, transparent 80%)',
            filter: 'blur(100px)'
          }}
        />
      </div>

      {/* Step 1: Choose Alien Name */}
      {step === 'name' && (
        <div style={hologramContainerStyle} className="z-10">
          <div
            className="text-center mb-1"
            style={{
              color: '#FF69B4',
              textShadow: '0 0 12px rgba(255,105,180,0.8), 0 0 20px rgba(255,105,180,0.4)',
              fontSize: '22px',
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}
          >
            Welcome to the Heartverse
          </div>

          <div
            className="text-center mb-3"
            style={{
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.6)',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Choose your Alien name
          </div>

          <div
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          {error && (
            <div className="mb-3 rounded-md bg-red-50/10 border border-red-200/40 p-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleNameSubmit} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={loading}
              className="block w-full rounded-md border px-3 py-3 text-sm shadow-sm focus:outline-none disabled:opacity-50"
              style={{
                border: '1px solid rgba(0,255,255,0.4)',
                background: 'rgba(0,0,0,0.3)',
                color: '#00FFFF',
                textShadow: '0 0 4px rgba(0,255,255,0.6)',
                backdropFilter: 'blur(4px)',
                fontSize: '16px'
              }}
              maxLength={50}
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50"
              style={{
                background: 'rgba(0,255,255,0.15)',
                border: '1px solid rgba(0,255,255,0.5)',
                color: '#00FFFF',
                textShadow: '0 0 8px rgba(0,255,255,0.8)',
                boxShadow: loading || !name.trim() ? 'none' : '0 0 15px rgba(0,255,255,0.4)'
              }}
            >
              {loading ? "SAVING..." : "CONFIRM"}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Choose Element Affinity */}
      {step === 'element' && (
        <div style={{ ...hologramContainerStyle, width: 'min(92vw, 600px)' }} className="z-10">
          <style>{`
            .element-card-container { perspective: 1000px; }
            .element-card {
              position: relative; width: 100%; height: 100%;
              transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
              transform-style: preserve-3d;
            }
            .element-card.flipped { transform: rotateY(180deg); }
            .element-card.hovered:not(.flipped) { transform: scale(1.05); }
            .element-card.hovered.flipped { transform: rotateY(180deg) scale(1.05); }
            .element-card-face {
              position: absolute; top: 0; left: 0; width: 100%; height: 100%;
              backface-visibility: hidden; -webkit-backface-visibility: hidden;
              border-radius: 0.5rem; display: flex; flex-direction: column;
              align-items: center; justify-content: center; padding: 8px;
            }
            .element-card-front { background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); }
            .element-card-back { background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); transform: rotateY(180deg); }
          `}</style>

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

          <div
            className="w-full h-px mb-2"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          <p className="text-xs mb-2 text-center" style={{ color: '#FFFFFF', textShadow: '0 0 4px rgba(255,255,255,0.6)' }}>
            You can change this later
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50/10 border border-red-200/40 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAlign} className="space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-1">
              {ELEMENTS.map((element) => {
                const isFlipped = flippedCards.has(element.key);
                const isHovered = hoveredCard === element.key;
                const isSelected = selectedElement === element.key;
                const elementColor = getElementColor(element.key);

                return (
                  <div key={element.key} className="element-card-container" style={{ height: '90px' }}>
                    <button
                      type="button"
                      onClick={() => !loading && handleCardClick(element.key)}
                      onMouseEnter={() => !loading && handleCardHover(element.key)}
                      onMouseLeave={() => handleCardHover(null)}
                      disabled={loading}
                      className={`element-card ${isFlipped ? 'flipped' : ''} ${isHovered ? 'hovered' : ''}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: `2px solid ${isSelected ? elementColor : isHovered ? `${elementColor}80` : 'rgba(0,255,255,0.3)'}`,
                        borderRadius: '0.5rem',
                        background: 'transparent',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: isHovered || isSelected ? `0 0 20px ${elementColor}60, 0 0 40px ${elementColor}30` : 'none',
                        padding: 0
                      }}
                    >
                      <div className="element-card-face element-card-front" style={{ background: isSelected ? `${elementColor}20` : isHovered ? `${elementColor}10` : 'rgba(0,0,0,0.2)' }}>
                        <img
                          src={element.icon}
                          alt={element.name}
                          className="w-14 h-14"
                          style={{
                            filter: isHovered || isSelected ? `drop-shadow(0 0 8px ${elementColor})` : 'drop-shadow(0 0 2px #00FFFF)',
                            transition: 'filter 0.3s ease'
                          }}
                        />
                      </div>
                      <div className="element-card-face element-card-back" style={{ background: isSelected ? `${elementColor}25` : `${elementColor}15` }}>
                        <div className="font-bold text-lg mb-1" style={{ color: elementColor, textShadow: `0 0 10px ${elementColor}` }}>
                          {element.name}
                        </div>
                        <div className="text-xs text-center px-2" style={{ color: elementColor, opacity: 0.9 }}>
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
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              style={(() => {
                const buttonColor = selectedElement ? getElementColor(selectedElement) : '#00FFFF';
                return {
                  background: `${buttonColor}15`,
                  border: `1px solid ${buttonColor}80`,
                  color: buttonColor,
                  textShadow: `0 0 8px ${buttonColor}`,
                  boxShadow: loading || !selectedElement ? 'none' : `0 0 15px ${buttonColor}66`
                };
              })()}
            >
              {loading ? "ALIGNING..." : "ALIGN"}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: HeartCoin Celebration (brief, auto-advances) */}
      {step === 'celebration' && (
        <div className="z-10 flex flex-col items-center">
          <div className="text-center mb-4" style={{ color: '#FF69B4', fontSize: '24px', fontWeight: 'bold', textShadow: '0 0 20px rgba(255,105,180,0.8)' }}>
            First HeartCoin Earned!
          </div>
          <img
            src="/elements/heart-coin.webp"
            alt="HeartCoin"
            className="w-32 h-32"
            style={{ animation: 'pulse 1s ease-in-out infinite' }}
          />
          <p className="mt-4 text-white text-lg">+1 HeartCoin</p>
        </div>
      )}

      {/* Step 4: Tour Prompt */}
      {step === 'tourPrompt' && (
        <div style={hologramContainerStyle} className="z-10">
          <div
            className="text-center mb-3"
            style={{
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.6)',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            Let me show you around
          </div>

          <div
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(0,255,255,0.6)'
            }}
          />

          <p className="text-center text-white/80 text-sm mb-4">
            I can guide you through the key controls of your ship.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleEnterHeartverse}
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition"
              style={{
                background: 'rgba(252,84,175,0.2)',
                border: '1px solid rgba(252,84,175,0.6)',
                color: '#FC54AF',
                textShadow: '0 0 8px rgba(252,84,175,0.8)',
                boxShadow: '0 0 15px rgba(252,84,175,0.4)'
              }}
            >
              Let me show you around
            </button>

            <button
              onClick={handleSkipTourAndEnter}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Relic Welcome Home */}
      {step === 'welcome' && (
        <div style={hologramContainerStyle} className="z-10">
          <div
            className="text-center mb-2"
            style={{
              color: '#FF69B4',
              textShadow: '0 0 12px rgba(255,105,180,0.8)',
              fontSize: '20px',
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}
          >
            Welcome Home, {name || 'Wanderer'}
          </div>

          <div
            className="w-full h-px mb-4"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
              boxShadow: '0 0 4px rgba(255,105,180,0.6)'
            }}
          />

          {/* Relic Image */}
          <div className="flex justify-center mb-4">
            <img
              src="/relics/wanderer.webp"
              alt="Wanderer Relic"
              className="w-40 h-40 object-contain"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(255,105,180,0.6))',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          </div>

          <p className="text-center text-white/80 text-sm mb-4">
            Your journey in the Heartverse begins. Collect HeartCoins, discover relics, and explore the cosmos.
          </p>

          <button
            onClick={handleEnterHeartverse}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition"
            style={{
              background: 'rgba(255,105,180,0.2)',
              border: '1px solid rgba(255,105,180,0.6)',
              color: '#FF69B4',
              textShadow: '0 0 8px rgba(255,105,180,0.8)',
              boxShadow: '0 0 15px rgba(255,105,180,0.4)'
            }}
          >
            ENTER THE HEARTVERSE
          </button>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
