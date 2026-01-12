"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ElementType } from "@/lib/planetConfig";
import { RELIC_CELEBRATION_EVENT } from "./RelicCelebration";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Hardcoded bonus quest ID for Element of the Day
const BONUS_QUEST_ID = '4c24a82f-92ba-44f4-9386-d8c6438498bd';

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

  // On mount: check if user already completed this bonus quest today
  useEffect(() => {
    const checkBonusQuestCompletion = async () => {
      try {
        // Check if completion exists today using completed_at (timestamptz field)
        const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const todayStart = `${todayDate}T00:00:00.000Z`;
        const tomorrowStart = new Date(new Date(todayDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

        // Check user_bonus_quest_completions table - filter by date range on completed_at
        const { data: completions, error } = await supabaseBrowser
          .from('user_bonus_quest_completions')
          .select('id')
          .eq('bonus_quest_id', BONUS_QUEST_ID)
          .gte('completed_at', todayStart)
          .lt('completed_at', tomorrowStart)
          .limit(1);

        // RLS handles user_id filtering automatically

        if (error) {
          console.error('[ElementOfDayModal] Error checking bonus quest completion:', error);
        }

        console.log('[ElementOfDayModal] Bonus quest completions result:', completions, 'error:', error);

        if (completions && completions.length > 0) {
          console.log('[ElementOfDayModal] Bonus quest already completed today:', completions[0]);
          setElementQuestCompleted(true);
          return;
        }

        // Also check user_element_claims table (Element of Day uses this table)
        const { count: claimsCount, error: claimsError } = await supabaseBrowser
          .from('user_element_claims')
          .select('*', { count: 'exact', head: true })
          .eq('day', todayDate);

        console.log('[ElementOfDayModal] Element claims count:', claimsCount, 'error:', claimsError);

        if (claimsError) {
          console.error('[ElementOfDayModal] Error checking element claims:', claimsError);
          return;
        }

        if ((claimsCount ?? 0) > 0) {
          console.log('[ElementOfDayModal] Element already claimed today - setting elementQuestCompleted=true');
          setElementQuestCompleted(true);
        } else {
          console.log('[ElementOfDayModal] No claims found today - elementQuestCompleted stays false');
        }
      } catch (err) {
        console.error('[ElementOfDayModal] Error in checkBonusQuestCompletion:', err);
      }
    };

    checkBonusQuestCompletion();
  }, []);

  // Listen for 'elementOfDay:open' event from HeartCoinButton
  useEffect(() => {
    const handleOpenEvent = async () => {
      console.log('[ElementOfDayModal] Received elementOfDay:open event');
      try {
        // Check if already claimed today before showing
        const todayDate = new Date().toISOString().split('T')[0];
        const { count: claimsCount } = await supabaseBrowser
          .from('user_element_claims')
          .select('*', { count: 'exact', head: true })
          .eq('day', todayDate);

        if ((claimsCount ?? 0) > 0) {
          console.log('[ElementOfDayModal] Element already claimed today (on open)');
          setElementQuestCompleted(true);
          setClaimed(true);
        } else {
          // Reset state for fresh claim attempt
          setElementQuestCompleted(false);
          setClaimed(false);
        }

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
          setClaimed(false);
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
  }, [playAlienWaveSound]);

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

  // Handle clicking on the element image to select element
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
        detail: { message: 'Please log in to select your element.', type: 'error' }
      }));
      return;
    }
    console.log('[ElementOfDayModal] Authenticated user:', session.user.id);

    // Play sounds
    playStarSound();
    playElementSound(data.element);

    setIsCompletingElementQuest(true);

    try {
      // ========== SELECT USER ELEMENT RPC ==========
      const { data: rpcData, error } = await supabaseBrowser.rpc('select_user_element', {
        p_element: data.element
      });

      if (error) {
        // Enhanced error logging with message, details, and code
        console.error('[select_user_element] Error:', {
          message: error.message,
          details: error.details,
          code: error.code,
        });

        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Failed to select element. Please try again.', type: 'error' }
        }));
        return;
      }

      console.log('[select_user_element] Success:', rpcData);

      // Update local state
      setClaimed(true);
      setElementQuestCompleted(true);

      // Success toast
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'Element selected!', type: 'success' }
      }));

      // Dispatch profile:refresh event
      window.dispatchEvent(new CustomEvent('profile:refresh'));

      // Close modal after brief delay
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setData(null);
          setClaimed(false);
        }, 100);
      }, 300);

    } catch (err) {
      console.error('[select_user_element] Unexpected error:', err);
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
            setClaimed(false);
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
        setClaimed(false);
        // Play alien-wave sound when modal appears
        playAlienWaveSound();
      }
    };

    window.addEventListener("element-of-day:show" as any, handleShow);
    return () => {
      window.removeEventListener("element-of-day:show" as any, handleShow);
    };
  }, [playAlienWaveSound]);

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

  // Debug: log config and state to verify why click might not work
  console.log('[ElementOfDayModal] Rendering with element:', data.element, 'normalized:', normalizedElement, 'config:', config);
  console.log('[ElementOfDayModal] State: claimed=', claimed, 'elementQuestCompleted=', elementQuestCompleted, 'isCompletingElementQuest=', isCompletingElementQuest, 'isLoggedIn=', isLoggedIn);
  console.log('[ElementOfDayModal] Button disabled?', claimed || elementQuestCompleted || isCompletingElementQuest);

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

          {/* Element Image with glow and pulse - clickable, OR "Log in to claim Relic" if not logged in */}
          <div className="flex justify-center mb-4" style={{ overflow: "visible" }}>
            {isLoggedIn === false ? (
              /* Show "Log in to claim Relic" text when not logged in */
              <button
                onClick={handleLoginClick}
                onMouseEnter={handleElementHover}
                className="relative transition-transform hover:scale-105"
                style={{
                  width: 140,
                  height: 140,
                  background: "none",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: 0,
                  overflow: "visible",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Log in to claim Relic"
              >
                {/* Pulsing glow behind the text */}
                <div
                  style={{
                    position: "absolute",
                    inset: -20,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${elementColor}60 0%, ${elementColor}30 40%, transparent 70%)`,
                    animation: "glowPulse 2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
                {/* The login text with pulse animation */}
                <span
                  style={{
                    position: "relative",
                    zIndex: 10,
                    color: elementColor,
                    fontSize: "16px",
                    fontWeight: "bold",
                    textAlign: "center",
                    lineHeight: 1.3,
                    textShadow: `0 0 12px ${elementColor}, 0 0 24px ${elementColor}80`,
                    animation: "elementPulse 2s ease-in-out infinite",
                  }}
                >
                  Log in to<br />claim Relic
                </span>
              </button>
            ) : (
              /* Show element image when logged in */
              <button
                onClick={handleImageClick}
                onMouseEnter={handleElementHover}
                disabled={claimed || elementQuestCompleted || isCompletingElementQuest}
                className="relative transition-transform hover:scale-105"
                style={{
                  width: 140,
                  height: 140,
                  background: "none",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: 0,
                  overflow: "visible",
                  cursor: (claimed || elementQuestCompleted || isCompletingElementQuest) ? "default" : "pointer",
                }}
                aria-label={elementQuestCompleted ? "Already completed" : "Claim reward"}
              >
                {/* Pulsing glow behind the image - only when not claimed/completed/claiming */}
                {!claimed && !elementQuestCompleted && !isCompletingElementQuest && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -20,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${elementColor}60 0%, ${elementColor}30 40%, transparent 70%)`,
                      animation: "glowPulse 2s ease-in-out infinite",
                      pointerEvents: "none",
                    }}
                  />
                )}
                {/* The element image with pulse animation - stops when claimed/completed/claiming */}
                <img
                  src={config?.icon}
                  alt={config?.name}
                  style={{
                    position: "relative",
                    zIndex: 10,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    animation: (claimed || elementQuestCompleted || isCompletingElementQuest) ? "none" : "elementPulse 2s ease-in-out infinite",
                    opacity: (claimed || elementQuestCompleted || isCompletingElementQuest) ? 0.5 : 1,
                    filter: (claimed || elementQuestCompleted || isCompletingElementQuest) ? "grayscale(0.6) brightness(0.5)" : "none",
                    transition: "opacity 0.3s ease, filter 0.3s ease",
                  }}
                />
              </button>
            )}
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

          {/* Completed indicator */}
          {elementQuestCompleted && (
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
