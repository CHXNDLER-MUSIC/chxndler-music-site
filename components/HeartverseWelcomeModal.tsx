"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { RELIC_CELEBRATION_EVENT } from "./RelicCelebration";

const HEARTVERSE_COLOR = "#FC54AF";
const WARP_DURATION_MS = 3500; // Wait for warp effect to complete before showing modal

export default function HeartverseWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string>("Wanderer");
  const [claimed, setClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [alreadyHasRelic, setAlreadyHasRelic] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

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

  // Check if user already has the wanderer relic
  const checkExistingRelic = useCallback(async (userId: string) => {
    try {
      // First, find the wanderer relic by code
      const { data: relic } = await supabaseBrowser
        .from('relics')
        .select('id')
        .eq('code', 'wanderer')
        .maybeSingle();

      if (!relic) {
        console.log('[HeartverseWelcome] Wanderer relic not found in database');
        return;
      }

      // Check if user owns this relic
      const { data: existingRelic } = await supabaseBrowser
        .from('user_relics')
        .select('id')
        .eq('user_id', userId)
        .eq('relic_id', relic.id)
        .limit(1);

      if (existingRelic && existingRelic.length > 0) {
        setAlreadyHasRelic(true);
        setClaimed(true);
      }
    } catch (err) {
      console.error('[HeartverseWelcome] Error checking existing relic:', err);
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

      // Check if user already has the relic
      await checkExistingRelic(session.user.id);

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
  }, [checkExistingRelic]);

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

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle clicking on the relics image to claim the heartverse relic
  const handleImageClick = useCallback(async () => {
    if (claimed || isClaiming || alreadyHasRelic) return;

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
      // Award the wanderer relic via API
      const awardRes = await fetch('/api/award-relic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, relicCode: 'wanderer' }),
      });
      const awardData = await awardRes.json();

      if (awardRes.ok && awardData.success) {
        setClaimed(true);
        console.log('[HeartverseWelcome] Wanderer Relic awarded!');

        // Show success toast
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Welcome home! Wanderer Relic awarded.', type: 'success' }
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
                  rewardKey: 'wanderer',
                  relicLabel: 'Wanderer Relic',
                  relicImageUrl: '/elements/relics.webp',
                  relicKind: 'achievement',
                },
              })
            );
          }, 500);
        }, 300);

      } else {
        console.warn('[HeartverseWelcome] Award relic error:', awardData);

        // Check if already owned
        if (awardData.error?.includes('already') || awardData.message?.includes('already')) {
          setClaimed(true);
          setAlreadyHasRelic(true);
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'You already have this relic!', type: 'info' }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Failed to claim relic. Please try again.', type: 'error' }
          }));
        }
      }
    } catch (err) {
      console.error('[HeartverseWelcome] Error claiming relic:', err);
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'An unexpected error occurred.', type: 'error' }
      }));
    } finally {
      setIsClaiming(false);
    }
  }, [claimed, isClaiming, alreadyHasRelic, playClickSound]);

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
            disabled={claimed || isClaiming || alreadyHasRelic || isLoggedIn === false}
            className="relative transition-transform hover:scale-105"
            style={{
              width: 160,
              height: 160,
              background: "none",
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              overflow: "visible",
              cursor: (claimed || isClaiming || alreadyHasRelic || isLoggedIn === false) ? "default" : "pointer",
            }}
            aria-label={alreadyHasRelic ? "Already claimed" : "Claim Wanderer Relic"}
          >
            {/* Pulsing glow behind the image - only when not claimed */}
            {!claimed && !alreadyHasRelic && isLoggedIn !== false && (
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
            {/* The relics image with pulse animation */}
            <img
              src="/elements/relics.webp"
              alt="Wanderer Relic"
              style={{
                position: "relative",
                zIndex: 10,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                animation: (claimed || alreadyHasRelic || isLoggedIn === false) ? "none" : "heartversePulse 2.5s ease-in-out infinite",
                opacity: (claimed || alreadyHasRelic) ? 0.5 : 1,
                filter: (claimed || alreadyHasRelic) ? "grayscale(0.5) brightness(0.6)" : "none",
                transition: "opacity 0.3s ease, filter 0.3s ease",
              }}
            />
          </button>
        </div>

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

        {/* Already claimed indicator */}
        {alreadyHasRelic && (
          <div
            className="text-center mb-4"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "14px",
            }}
          >
            Relic already claimed
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
