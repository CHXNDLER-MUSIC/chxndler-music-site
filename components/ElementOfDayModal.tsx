"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ElementType } from "@/lib/planetConfig";
import { RELIC_CELEBRATION_EVENT } from "./RelicCelebration";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface ElementOfDayData {
  element: ElementType;
  intention: string | null;
  rewardKey: string | null;
  relicLabel: string | null;
  relicImageUrl: string | null;
  relicKind: string | null;
}

const ELEMENT_CONFIG: Record<ElementType, { name: string; color: string; icon: string; sound: string }> = {
  heart: { name: "HEART", color: "#FC54AF", icon: "/elements/heart.webp", sound: "/audio/heart-pulse.MP3" },
  water: { name: "WATER", color: "#38B6FF", icon: "/elements/water.webp", sound: "/audio/water-ripple.MP3" },
  lightning: { name: "LIGHTNING", color: "#F2EF1D", icon: "/elements/lightning.webp", sound: "/audio/lightning-spark.MP3" },
  darkness: { name: "DARKNESS", color: "#FFFFFF", icon: "/elements/darkness.webp", sound: "/audio/shadow-glow.MP3" },
};

export default function ElementOfDayModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ElementOfDayData | null>(null);
  const [claimed, setClaimed] = useState(false);
  // Bonus quest state
  const [isCompletingElementQuest, setIsCompletingElementQuest] = useState(false);
  const [elementQuestCompleted, setElementQuestCompleted] = useState(false);
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const alienWaveAudioRef = useRef<HTMLAudioElement | null>(null);
  const elementSoundRef = useRef<HTMLAudioElement | null>(null);
  const starAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play hover sound when hovering over the element
  const handleElementHover = useCallback(() => {
    if (claimed || elementQuestCompleted) return;
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/audio/hover.mp3");
      hoverAudioRef.current.volume = 0.5;
    }
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  }, [claimed, elementQuestCompleted]);

  // Play click sound when clicking the element
  const playClickSound = useCallback(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio("/audio/click.mp3");
      clickAudioRef.current.volume = 0.5;
    }
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  }, []);

  // Play alien-wave.mp3 when modal appears
  const playAlienWaveSound = useCallback(() => {
    if (!alienWaveAudioRef.current) {
      alienWaveAudioRef.current = new Audio("/audio/alien-wave.MP3");
      alienWaveAudioRef.current.volume = 0.6;
    }
    alienWaveAudioRef.current.currentTime = 0;
    alienWaveAudioRef.current.play().catch(() => {});
  }, []);

  // Play element-specific sound when clicking the element image
  const playElementSound = useCallback((element: ElementType) => {
    const config = ELEMENT_CONFIG[element];
    if (!config?.sound) return;

    elementSoundRef.current = new Audio(config.sound);
    elementSoundRef.current.volume = 0.7;
    elementSoundRef.current.play().catch(() => {});
  }, []);

  // Play star sound when clicking the element image
  const playStarSound = useCallback(() => {
    if (!starAudioRef.current) {
      starAudioRef.current = new Audio("/audio/star.mp3");
      starAudioRef.current.volume = 0.7;
    }
    starAudioRef.current.currentTime = 0;
    starAudioRef.current.play().catch(() => {});
  }, []);

  // Check auth status when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const checkAuth = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      setIsLoggedIn(!!session?.user?.id);
    };

    checkAuth();
  }, [isOpen]);

  // Helper: Check if user has claimed element-of-day today using canonical view
  const checkClaimedStatus = useCallback(async (): Promise<boolean> => {
    try {
      // Must be logged in to have claimed
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) {
        console.log('[ElementOfDayModal] checkClaimedStatus: No session, returning false');
        return false;
      }

      // Use the canonical backend view for claimed status
      // Filter by user_id in case view doesn't have RLS
      const { data, error } = await supabaseBrowser
        .from('user_today_element_status')
        .select('claimed_today')
        .eq('user_id', session.user.id)
        .maybeSingle();

      console.log('[ElementOfDayModal] checkClaimedStatus response:', { data, error, userId: session.user.id });

      if (error) {
        console.error('[ElementOfDayModal] Error checking claim status from view:', error);
        return false; // On error, default to not claimed
      }

      // If no row exists, user hasn't claimed
      if (!data) {
        console.log('[ElementOfDayModal] checkClaimedStatus: No row found, returning false');
        return false;
      }

      const result = !!data.claimed_today;
      console.log('[ElementOfDayModal] checkClaimedStatus: claimed_today =', data.claimed_today, '-> returning', result);
      return result;
    } catch (err) {
      console.error('[ElementOfDayModal] Exception in checkClaimedStatus:', err);
      return false;
    }
  }, []);

  // On mount: check if user already claimed today's element
  useEffect(() => {
    const checkDailyElementClaim = async () => {
      const isClaimed = await checkClaimedStatus();
      console.log('[ElementOfDayModal] Initial claim check:', isClaimed);
      setClaimed(isClaimed);
      setElementQuestCompleted(isClaimed);
    };

    checkDailyElementClaim();
  }, [checkClaimedStatus]);

  // Listen for 'elementOfDay:open' event from HeartCoinButton
  useEffect(() => {
    const handleOpenEvent = async () => {
      console.log('[ElementOfDayModal] Received elementOfDay:open event');
      try {
        // Check if already claimed today using correct schema
        const isClaimed = await checkClaimedStatus();
        console.log('[ElementOfDayModal] Claim check on open:', isClaimed);
        setClaimed(isClaimed);
        setElementQuestCompleted(isClaimed);

        // Fetch element of day data from API
        const res = await fetch('/api/element-of-day');
        if (res.ok) {
          const apiData = await res.json();
          console.log('[ElementOfDayModal] Fetched from API:', apiData);
          const eventData: ElementOfDayData = {
            element: apiData.element || 'heart',
            intention: apiData.intentionOfDay || null,
            rewardKey: apiData.relicKey || null,
            relicLabel: apiData.relicLabel || null,
            relicImageUrl: apiData.relicImageUrl || null,
            relicKind: apiData.relicKind || null,
          };
          setData(eventData);
          setIsOpen(true);
          // Note: claimed state is already set above from DB check - don't override
          // Play alien-wave sound when modal appears
          playAlienWaveSound();
        } else {
          console.error('[ElementOfDayModal] Failed to fetch element of day data');
        }
      } catch (err) {
        console.error('[ElementOfDayModal] Error fetching element of day:', err);
      }
    };

    window.addEventListener('elementOfDay:open', handleOpenEvent);
    return () => {
      window.removeEventListener('elementOfDay:open', handleOpenEvent);
    };
  }, [playAlienWaveSound, checkClaimedStatus]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setClaimed(false);
  }, []);

  // Handle clicking "Log in to claim Relic" - close modal and open welcome home
  const handleLoginClick = useCallback(() => {
    playClickSound();
    setIsOpen(false);
    setData(null);
    // Open Welcome Home modal after a brief delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openWelcomeHomeModal'));
    }, 100);
  }, [playClickSound]);

  // Handle clicking on the element image to claim Element of the Day relic
  const handleImageClick = useCallback(async () => {
    console.log('[ElementOfDayModal] handleImageClick called!');
    console.log('[ElementOfDayModal] Guard check: data=', !!data, 'claimed=', claimed, 'isCompletingElementQuest=', isCompletingElementQuest, 'elementQuestCompleted=', elementQuestCompleted);

    // Loading guard - prevent double-submit or already completed
    if (!data || claimed || isCompletingElementQuest || elementQuestCompleted) {
      console.log('[ElementOfDayModal] Guard clause triggered - returning early');
      return;
    }

    // ========== AUTH CHECK ==========
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user?.id) {
      console.error('[ElementOfDayModal] No authenticated session');
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'Please log in to claim your relic.', type: 'error' }
      }));
      return;
    }
    console.log('[ElementOfDayModal] Authenticated user:', session.user.id);

    // Play sounds
    playStarSound();
    playElementSound(data.element);

    setIsCompletingElementQuest(true);

    try {
      // ========== CLAIM DAILY ELEMENT RPC ==========
      const { data: rpcData, error } = await supabaseBrowser.rpc('claim_daily_element');

      if (error) {
        console.error('[ElementOfDayModal] claim_daily_element failed', error);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: error.message || 'Failed to claim relic. Please try again.', type: 'error' }
        }));
        setIsCompletingElementQuest(false);
        return;
      }

      console.log('[ElementOfDayModal] claim_daily_element response:', rpcData);

      // Handle response based on success status - use RPC response directly, don't refetch
      if (rpcData?.success === true) {
        // Successfully claimed - update UI from RPC response
        setClaimed(true);
        setElementQuestCompleted(true);

        // Success toast with heartcoin info if available
        const heartcoinMsg = rpcData?.awarded_heartcoins
          ? `Relic claimed! +${rpcData.awarded_heartcoins} HeartCoins`
          : 'Relic claimed!';
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: heartcoinMsg, type: 'success' }
        }));

        // Dispatch refresh events for profile (heartcoin_balance + streak), boosts, and claims
        window.dispatchEvent(new CustomEvent('profile:refresh'));
        window.dispatchEvent(new CustomEvent('boosts:refresh'));
        window.dispatchEvent(new CustomEvent('element-of-day-claimed', {
          detail: { element: data.element, source: 'modal' }
        }));

        // Close modal after brief delay
        setTimeout(() => {
          setIsOpen(false);
          setTimeout(() => {
            setData(null);
            setClaimed(false);
          }, 100);
        }, 300);
      } else if (rpcData?.already_claimed === true) {
        // Already claimed today - update UI from RPC response
        setClaimed(true);
        setElementQuestCompleted(true);

        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Already claimed today!', type: 'info' }
        }));
      } else {
        // Unexpected response format or success=false without already_claimed
        console.warn('[ElementOfDayModal] Unexpected response:', rpcData);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: rpcData?.message || 'Unable to claim relic.', type: 'error' }
        }));
      }

    } catch (err) {
      console.error('[ElementOfDayModal] claim_daily_element unexpected error:', err);
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'An unexpected error occurred.', type: 'error' }
      }));
    } finally {
      setIsCompletingElementQuest(false);
    }
  }, [data, claimed, isCompletingElementQuest, elementQuestCompleted, playStarSound, playElementSound]);

  // Listen for 'element-of-day:show' event (existing event)
  useEffect(() => {
    const handleShow = async (e: CustomEvent<ElementOfDayData>) => {
      console.log('[ElementOfDayModal] Received event:', e.detail);
      if (e.detail?.element) {
        // Check if already claimed today using correct schema
        const isClaimed = await checkClaimedStatus();
        console.log('[ElementOfDayModal] Claim check on show:', isClaimed);
        setClaimed(isClaimed);
        setElementQuestCompleted(isClaimed);

        // Always fetch the latest data from API to ensure intention is available
        try {
          const res = await fetch('/api/element-of-day');
          if (res.ok) {
            const apiData = await res.json();
            console.log('[ElementOfDayModal] Fetched from API:', apiData);
            const eventData: ElementOfDayData = {
              element: e.detail.element,
              intention: apiData.intentionOfDay || e.detail.intention || null,
              rewardKey: apiData.relicKey || e.detail.rewardKey || null,
              relicLabel: apiData.relicLabel || e.detail.relicLabel || null,
              relicImageUrl: apiData.relicImageUrl || e.detail.relicImageUrl || null,
              relicKind: apiData.relicKind || e.detail.relicKind || null,
            };
            setData(eventData);
            setIsOpen(true);
            // Play alien-wave sound when modal appears
            playAlienWaveSound();
            return;
          }
        } catch (err) {
          console.warn('[ElementOfDayModal] Failed to fetch from API:', err);
        }

        // Fallback to event data if API fails
        setData(e.detail);
        setIsOpen(true);
        // Play alien-wave sound when modal appears
        playAlienWaveSound();
      }
    };

    window.addEventListener("element-of-day:show" as any, handleShow);
    return () => {
      window.removeEventListener("element-of-day:show" as any, handleShow);
    };
  }, [playAlienWaveSound, checkClaimedStatus]);

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

  if (!isOpen || !data) return null;
  if (typeof document === "undefined") return null;

  // Normalize element to lowercase to match ELEMENT_CONFIG keys
  const normalizedElement = (data.element || 'heart').toLowerCase() as ElementType;
  const config = ELEMENT_CONFIG[normalizedElement];
  const elementColor = config?.color || "#FC54AF";

  return createPortal(
    <>
      {/* Backdrop - transparent, no dimming */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 2147483647 }}
        onClick={handleClose}
      />

      {/* Pulsing glow animation styles - only when not claimed */}
      <style>{`
        @keyframes elementPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 20px ${elementColor}) drop-shadow(0 0 40px ${elementColor}80);
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 35px ${elementColor}) drop-shadow(0 0 60px ${elementColor}90);
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
      `}</style>

      {/* Modal Content - fills space from profile bar to top of light beam */}
      <div
        className="fixed left-0 right-0 flex items-stretch justify-center pointer-events-none"
        style={{
          zIndex: 2147483648,
          top: "calc(var(--profile-bar-boundary, 64px) - 24px)",
          bottom: "calc(var(--light-beam-boundary, 200px) + var(--beam-height, 68px))",
        }}
      >
        <div
          className="relative pointer-events-auto flex flex-col items-center"
          style={{
            width: "calc(var(--display-width) + 32px)",
            maxWidth: "90vw",
            height: "100%",
            padding: "24px",
            paddingTop: "32px",
            borderRadius: 20,
            background: "rgba(0,0,0,0.85)",
            border: `2px solid ${elementColor}80`,
            boxShadow: `0 0 40px ${elementColor}50, 0 0 80px ${elementColor}30`,
            overflow: "hidden",
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

          {/* Header */}
          <div
            className="text-center mb-2"
            style={{
              color: elementColor,
              textShadow: `0 0 12px ${elementColor}80`,
              fontSize: "18px",
              fontWeight: "bold",
              letterSpacing: "0.15em",
            }}
          >
            ELEMENT OF THE DAY
          </div>

          {/* Decorative line */}
          <div
            className="w-full h-px mb-3"
            style={{
              background: `linear-gradient(90deg, transparent, ${elementColor}80 20%, ${elementColor} 50%, ${elementColor}80 80%, transparent)`,
              boxShadow: `0 0 8px ${elementColor}60`,
            }}
          />

          {/* Element Image - static display, not clickable */}
          <div className="flex justify-center mb-4" style={{ overflow: "visible" }}>
            <div
              className="relative"
              style={{
                width: 140,
                height: 140,
                background: "none",
                backgroundColor: "transparent",
                padding: 0,
                overflow: "visible",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* The element image - no animations, full brightness */}
              <img
                src={config?.icon}
                alt={config?.name}
                style={{
                  position: "relative",
                  zIndex: 10,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  animation: "none",
                  opacity: 1,
                  filter: "none",
                }}
              />
            </div>
          </div>

          {/* Element Name */}
          <div
            className="text-center mb-1"
            style={{
              color: elementColor,
              textShadow: `0 0 16px ${elementColor}90`,
              fontSize: "28px",
              fontWeight: "bold",
              letterSpacing: "0.1em",
            }}
          >
            {config?.name}
          </div>

          {/* Intention text directly under element name */}
          {data.intention && (
            <div
              className="text-center px-4 mb-4"
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "16px",
                lineHeight: 1.6,
                textShadow: "0 0 8px rgba(255,255,255,0.3)",
              }}
            >
              {data.intention}
            </div>
          )}

          {/* Completed indicator - only show when logged in AND claimed */}
          {isLoggedIn && elementQuestCompleted && (
            <div
              className="text-center mt-2"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "14px",
              }}
            >
              Claimed today
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}
