"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { RELIC_CELEBRATION_EVENT } from "./RelicCelebration";

const HEARTVERSE_COLOR = "#FC54AF";
const WARP_DURATION_MS = 3500; // Wait for warp effect to complete before showing modal

// Type for the next claimable story relic from RPC
interface NextStoryRelic {
  relic_id: string;
  story_key: string;
  required_heartcoins: number;
  relic_label: string;
  relic_image_url: string | null;
}

// Story relic display names
const STORY_RELIC_LABELS: Record<string, string> = {
  wanderer: 'Wanderer',
  dreamer: 'Dreamer',
  lover: 'Lover',
};

export default function HeartverseWelcomeModal() {
  // TEMPORARILY HIDDEN - return null to disable this modal
  return null;

  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string>("Wanderer");
  const [claimed, setClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [alreadyHasRelic, setAlreadyHasRelic] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Story relic claiming state
  const [nextStoryRelic, setNextStoryRelic] = useState<NextStoryRelic | null>(null);
  const [heartcoinBalance, setHeartcoinBalance] = useState<number>(0);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play hover sound
  const handleHover = useCallback(() => {
    if (claimed || isClaiming || alreadyHasRelic) return;
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/audio/hover.mp3");
      hoverAudioRef.current.volume = 0.5;
    }
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  }, [claimed, isClaiming, alreadyHasRelic]);

  // Play click sound
  const playClickSound = useCallback(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio("/audio/click.mp3");
      clickAudioRef.current.volume = 0.5;
    }
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  }, []);

  // Play welcome sound when modal appears
  const playWelcomeSound = useCallback(() => {
    if (!welcomeAudioRef.current) {
      welcomeAudioRef.current = new Audio("/audio/alien-wave.MP3");
      welcomeAudioRef.current.volume = 0.6;
    }
    welcomeAudioRef.current.currentTime = 0;
    welcomeAudioRef.current.play().catch(() => {});
  }, []);

  // Fetch the next claimable story relic using the RPC
  const fetchNextStoryRelic = useCallback(async () => {
    try {
      const { data, error } = await supabaseBrowser.rpc('get_next_claimable_story_relic');

      if (error) {
        console.error('[HeartverseWelcome] Error fetching next story relic:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
          raw: error,
        });
        setNextStoryRelic(null);
        return;
      }

      console.log('[HeartverseWelcome] Next claimable story relic:', data);

      if (data) {
        setNextStoryRelic(data);
        setAlreadyHasRelic(false);
        setClaimed(false);
      } else {
        // No more story relics to claim - all claimed or none available
        setNextStoryRelic(null);
        setAlreadyHasRelic(true);
      }
    } catch (err) {
      console.error('[HeartverseWelcome] Error fetching next story relic:', err);
      setNextStoryRelic(null);
    }
  }, []);

  // Fetch heartcoin balance from profile
  const fetchHeartcoinBalance = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabaseBrowser
        .from('profiles')
        .select('heartcoin_balance')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[HeartverseWelcome] Error fetching heartcoin balance:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
          raw: error,
        });
        return;
      }

      setHeartcoinBalance(profile?.heartcoin_balance ?? 0);
    } catch (err) {
      console.error('[HeartverseWelcome] Error fetching heartcoin balance:', err);
    }
  }, []);

  // Fetch user profile and auth state
  const fetchUserData = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      if (!session?.user?.id) {
        setIsLoggedIn(false);
        // Try localStorage fallback for username
        const storedName = localStorage.getItem('heartverse_username');
        setUsername(storedName || 'Wanderer');
        return;
      }

      setIsLoggedIn(true);

      // Fetch next claimable story relic and heartcoin balance in parallel
      await Promise.all([
        fetchNextStoryRelic(),
        fetchHeartcoinBalance(session.user.id),
      ]);

      // Fetch profile name
      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();

      if (profile?.name) {
        setUsername(profile.name);
      } else {
        const storedName = localStorage.getItem('heartverse_username');
        setUsername(storedName || 'Wanderer');
      }
    } catch (err) {
      console.error('[HeartverseWelcome] Error fetching user data:', err);
      const storedName = localStorage.getItem('heartverse_username');
      setUsername(storedName || 'Wanderer');
    }
  }, [fetchNextStoryRelic, fetchHeartcoinBalance]);

  // Listen for planet:warp event with isCenterPlanet
  useEffect(() => {
    const handleWarp = async (e: CustomEvent<{ element: string; isCenterPlanet?: boolean; isOnboarding?: boolean }>) => {
      if (e.detail?.isCenterPlanet) {
        console.log('[HeartverseWelcome] Received center planet warp event');

        // Skip showing this modal if user is in onboarding flow (no name set)
        // The name prompt modal will be shown instead
        if (e.detail?.isOnboarding) {
          console.log('[HeartverseWelcome] Skipping modal - user is in onboarding flow');
          return;
        }

        // Wait for warp effect to complete
        await new Promise(resolve => setTimeout(resolve, WARP_DURATION_MS));

        // Fetch user data and check relic status
        await fetchUserData();

        setIsOpen(true);
        playWelcomeSound();
      }
    };

    window.addEventListener('planet:warp' as any, handleWarp);
    return () => {
      window.removeEventListener('planet:warp' as any, handleWarp);
    };
  }, [fetchUserData, playWelcomeSound]);

  // Listen for direct open event (used after onboarding completes to show welcome without warp)
  useEffect(() => {
    const handleShowWelcome = async () => {
      console.log('[HeartverseWelcome] Received heartverse:showWelcome event');
      await fetchUserData();
      setIsOpen(true);
      playWelcomeSound();
    };

    window.addEventListener('heartverse:showWelcome', handleShowWelcome);
    return () => {
      window.removeEventListener('heartverse:showWelcome', handleShowWelcome);
    };
  }, [fetchUserData, playWelcomeSound]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle clicking on the relics image to claim the story relic
  const handleImageClick = useCallback(async () => {
    // Loading guard - prevent double clicks
    if (isClaiming) return;

    // Only allow clicking if there's a claimable relic
    if (claimed || !nextStoryRelic) return;

    // Check auth
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'Please log in to claim your relic.', type: 'error' }
      }));
      return;
    }

    playClickSound();
    setIsClaiming(true);

    try {
      // Claim the wanderer relic via RPC
      const { data, error } = await supabaseBrowser.rpc('claim_wanderer_relic');

      console.log('[HeartverseWelcome] Claim wanderer relic result:', data, error);

      if (error) {
        console.error('[HeartverseWelcome] RPC error:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
          raw: error,
        });

        // Build a meaningful error message
        const errorMessage = error?.message || (error as any)?.details || 'Failed to claim relic. Please try again.';
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: errorMessage, type: 'error' }
        }));
        return;
      }

      if (data?.ok === true) {
        setClaimed(true);
        const relicLabel = STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key;
        console.log(`[HeartverseWelcome] ${relicLabel} Relic awarded!`);

        // Show success toast
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Wanderer Relic claimed!', type: 'success' }
        }));

        // Refresh UI state
        window.dispatchEvent(new CustomEvent('profile:force-refresh'));
        window.dispatchEvent(new CustomEvent('relics:refresh'));

        // Close modal after brief delay
        setTimeout(() => {
          setIsOpen(false);

          // Dispatch relic celebration event
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent(RELIC_CELEBRATION_EVENT, {
                detail: {
                  element: 'heart',
                  rewardKey: nextStoryRelic.story_key,
                  relicLabel: `${relicLabel} Relic`,
                  relicImageUrl: nextStoryRelic.relic_image_url || '/elements/relics.webp',
                  relicKind: 'story',
                },
              })
            );
          }, 500);

          // After celebration, refetch to get the next relic (if any)
          setTimeout(() => {
            fetchNextStoryRelic();
          }, 2000);
        }, 300);

      } else if (data?.ok === false && data?.reason === 'NOT_CLAIMABLE') {
        // Not unlocked yet - user doesn't have enough heartcoins
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Not unlocked yet', type: 'info' }
        }));
        // Refresh the relic state to update UI
        await fetchNextStoryRelic();
      } else if (data?.ok === false && data?.reason === 'ALREADY_CLAIMED') {
        setClaimed(true);
        setAlreadyHasRelic(true);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'You already have this relic!', type: 'info' }
        }));
        // Refresh to get the next relic
        await fetchNextStoryRelic();
      } else {
        console.warn('[HeartverseWelcome] Unexpected claim response:', data);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Failed to claim relic. Please try again.', type: 'error' }
        }));
      }
    } catch (err) {
      console.error('[HeartverseWelcome] Error claiming relic:', err);
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'An unexpected error occurred.', type: 'error' }
      }));
    } finally {
      setIsClaiming(false);
    }
  }, [claimed, isClaiming, nextStoryRelic, playClickSound, fetchNextStoryRelic]);

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 2147483647, background: "rgba(0,0,0,0.6)" }}
        onClick={handleClose}
      />

      {/* Pulsing glow animation styles */}
      <style>{`
        @keyframes heartversePulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 25px ${HEARTVERSE_COLOR}) drop-shadow(0 0 50px ${HEARTVERSE_COLOR}80);
          }
          50% {
            transform: scale(1.06);
            filter: drop-shadow(0 0 40px ${HEARTVERSE_COLOR}) drop-shadow(0 0 70px ${HEARTVERSE_COLOR}90);
          }
        }
        @keyframes heartverseGlow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.2);
          }
        }
        @keyframes heartverseShimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>

      {/* Modal Content */}
      <div
        className="fixed left-1/2 top-1/2 flex flex-col items-center justify-center pointer-events-auto"
        style={{
          zIndex: 2147483648,
          transform: "translate(-50%, -50%)",
          width: "min(90vw, 400px)",
          padding: "32px 24px",
          borderRadius: 24,
          background: "rgba(0,0,0,0.92)",
          border: `2px solid ${HEARTVERSE_COLOR}80`,
          boxShadow: `0 0 60px ${HEARTVERSE_COLOR}40, 0 0 120px ${HEARTVERSE_COLOR}20`,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          onMouseEnter={() => {
            if (!hoverAudioRef.current) {
              hoverAudioRef.current = new Audio("/audio/hover.mp3");
              hoverAudioRef.current.volume = 0.5;
            }
            hoverAudioRef.current.currentTime = 0;
            hoverAudioRef.current.play().catch(() => {});
          }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>

        {/* Welcome text */}
        <div
          className="text-center mb-6"
          style={{
            color: HEARTVERSE_COLOR,
            textShadow: `0 0 16px ${HEARTVERSE_COLOR}90`,
            fontSize: "24px",
            fontWeight: "bold",
            letterSpacing: "0.05em",
          }}
        >
          Welcome Home, {username}
        </div>

        {/* Relics image with glow and pulse */}
        <div className="relative mb-6" style={{ overflow: "visible" }}>
          <button
            onClick={handleImageClick}
            onMouseEnter={handleHover}
            disabled={claimed || isClaiming || !nextStoryRelic || isLoggedIn === false}
            aria-disabled={isClaiming}
            className="relative transition-transform hover:scale-105"
            style={{
              width: 160,
              height: 160,
              background: "none",
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              overflow: "visible",
              cursor: (claimed || isClaiming || !nextStoryRelic || isLoggedIn === false) ? "default" : "pointer",
              pointerEvents: isClaiming ? "none" : "auto",
            }}
            aria-label={!nextStoryRelic ? "All story relics claimed" : `Claim ${STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key} Relic`}
          >
            {/* Pulsing glow behind the image - only when claimable */}
            {!claimed && nextStoryRelic && isLoggedIn !== false && !isClaiming && (
              <div
                style={{
                  position: "absolute",
                  inset: -30,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${HEARTVERSE_COLOR}70 0%, ${HEARTVERSE_COLOR}35 40%, transparent 70%)`,
                  animation: "heartverseGlow 2.5s ease-in-out infinite",
                }}
              />
            )}
            {/* The relics image with pulse animation when claimable, dimmed when locked */}
            <img
              src={nextStoryRelic?.relic_image_url || "/elements/relics.webp"}
              alt={nextStoryRelic ? `${STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key} Relic` : "Story Relic"}
              style={{
                position: "relative",
                zIndex: 10,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                animation: (claimed || !nextStoryRelic || isLoggedIn === false || isClaiming) ? "none" : "heartversePulse 2.5s ease-in-out infinite",
                opacity: (claimed || !nextStoryRelic || isClaiming) ? 0.5 : 1,
                filter: (claimed || !nextStoryRelic || isClaiming) ? "grayscale(0.5) brightness(0.6)" : "none",
                transition: "opacity 0.3s ease, filter 0.3s ease",
              }}
            />
          </button>
        </div>

        {/* Claim label when relic is available */}
        {nextStoryRelic && !claimed && isLoggedIn === true && !isClaiming && (
          <div
            className="text-center mb-4"
            style={{
              color: HEARTVERSE_COLOR,
              fontSize: "14px",
              fontWeight: "bold",
              textShadow: `0 0 8px ${HEARTVERSE_COLOR}60`,
            }}
          >
            Claim your {STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key} relic
          </div>
        )}

        {/* Claiming in progress indicator */}
        {isClaiming && (
          <div
            className="text-center mb-4"
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "14px",
            }}
          >
            Claiming...
          </div>
        )}

        {/* Login prompt for non-logged-in users */}
        {isLoggedIn === false && (
          <button
            onClick={() => {
              playClickSound();
              setIsOpen(false);
              // Open the Welcome Home (login) modal after a brief delay
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
              }, 150);
            }}
            onMouseEnter={handleHover}
            className="text-center mb-4 cursor-pointer transition-all duration-200 hover:scale-105 bg-transparent border-none"
            style={{
              color: HEARTVERSE_COLOR,
              fontSize: "14px",
              fontWeight: "bold",
              textShadow: `0 0 8px ${HEARTVERSE_COLOR}60`,
            }}
          >
            Log in to claim this relic
          </button>
        )}

        {/* Progress label when no relic is claimable (locked state) */}
        {!nextStoryRelic && isLoggedIn === true && !claimed && !isClaiming && (
          <div
            className="text-center mb-4"
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "14px",
            }}
          >
            {(() => {
              // Determine progress label based on heartcoin balance
              if (heartcoinBalance < 5) {
                return "Earn 5 HeartCoins to unlock Dreamer";
              } else if (heartcoinBalance < 25) {
                return "Earn 25 HeartCoins to unlock Lover";
              } else {
                return "All story relics claimed";
              }
            })()}
          </div>
        )}

        {/* Just claimed indicator */}
        {claimed && (
          <div
            className="text-center mb-4"
            style={{
              color: "rgba(144,238,144,0.9)",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Relic claimed!
          </div>
        )}

        {/* Description text */}
        <div
          className="text-center px-4"
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "16px",
            lineHeight: 1.7,
            textShadow: "0 0 6px rgba(255,255,255,0.2)",
          }}
        >
          A space for the ones who feel different.
          <br />
          Built from songs, stories, and signals.
          <br />
          It opens as you do.
        </div>
      </div>
    </>,
    document.body
  );
}
