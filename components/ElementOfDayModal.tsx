"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ElementType } from "@/lib/planetConfig";
import { RELIC_CELEBRATION_EVENT } from "./RelicCelebration";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Hardcoded bonus quest ID and key for Element of the Day
const BONUS_QUEST_ID = '4c24a82f-92ba-44f4-9386-d8c6438498bd';
const BONUS_QUEST_KEY = 'TAP_ELEMENT_OF_DAY';

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
  const [awardedRelicId, setAwardedRelicId] = useState<string | null>(null);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const alienWaveAudioRef = useRef<HTMLAudioElement | null>(null);
  const elementSoundRef = useRef<HTMLAudioElement | null>(null);

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

  // On mount: check if user already completed this bonus quest today
  useEffect(() => {
    const checkBonusQuestCompletion = async () => {
      try {
        // Check if completion exists today using completed_date (date field)
        const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data: completions, error } = await supabaseBrowser
          .from('user_bonus_quest_completions')
          .select('id')
          .eq('bonus_quest_id', BONUS_QUEST_ID)
          .eq('completed_date', todayDate)
          .limit(1);

        // RLS handles user_id filtering automatically

        if (error) {
          console.error('[ElementOfDayModal] Error checking bonus quest completion:', error);
          return;
        }

        if (completions && completions.length > 0) {
          console.log('[ElementOfDayModal] Bonus quest already completed today:', completions[0]);
          setElementQuestCompleted(true);
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

  // Handle clicking on the element image to claim reward
  // Element of Day click -> claim_daily_checkin RPC + complete_bonus_quest RPC
  const handleImageClick = useCallback(async () => {
    // Guard against double-submit or already completed
    if (!data || claimed || isCompletingElementQuest || elementQuestCompleted) return;

    // ========== AUTH CHECK - Must be authenticated before any RPC calls ==========
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user?.id) {
      console.error('[ElementOfDayModal] No authenticated session');
      // Show toast prompting login
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'Please log in to claim your reward.', type: 'error' }
      }));
      return;
    }
    const userId = session.user.id;
    console.log('[ElementOfDayModal] Authenticated user:', userId);

    // Play element-specific sound
    playElementSound(data.element);

    // Stop pulsing by marking as claimed
    setClaimed(true);
    setIsCompletingElementQuest(true);

    let relicIdAwarded: string | null = null;

    try {
      // ========== 1. CALL claim_daily_checkin RPC ==========
      console.log('[ElementOfDayModal] Calling claim_daily_checkin with:', { p_source: 'element_of_day' });

      const { data: checkinResult, error: checkinError } = await supabaseBrowser.rpc(
        'claim_daily_checkin',
        { p_source: 'element_of_day' }
      );

      if (checkinError) {
        console.error('[ElementOfDayModal] claim_daily_checkin error', {
          message: checkinError.message,
          details: checkinError.details,
          hint: checkinError.hint,
          code: checkinError.code,
        });
        // Don't return - still try bonus quest
      } else {
        console.log('[ElementOfDayModal] claim_daily_checkin success:', checkinResult);

        // Dispatch event so QuestList can update its UI
        window.dispatchEvent(
          new CustomEvent('element-of-day-claimed', {
            detail: {
              element: data.element,
              checkinDate: checkinResult?.checkin_date_ny,
              dailyStreak: checkinResult?.daily_streak_current,
              alreadyCheckedIn: checkinResult?.already_checked_in,
            },
          })
        );

        // Trigger profile refresh to update daily_streak_current in UI
        window.dispatchEvent(new CustomEvent('profile:force-refresh'));
      }

      // ========== 2. AWARD RELIC FIRST (to get relic ID for details) ==========
      if (data.rewardKey) {
        console.log('[ElementOfDayModal] Attempting to award relic:', data.rewardKey, 'to user:', userId);
        try {
          const response = await fetch('/api/award-relic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              relicCode: data.rewardKey,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            console.error('[ElementOfDayModal] award-relic API error:', result);
          } else {
            console.log('[ElementOfDayModal] Relic awarded successfully:', result);
            relicIdAwarded = result.relicId || result.userRelicId || null;
            setAwardedRelicId(relicIdAwarded);
            // Dispatch events to refresh relics collection and boosts (after boost is created)
            window.dispatchEvent(new CustomEvent('relics:refresh'));
            window.dispatchEvent(new CustomEvent('boosts:refresh'));
          }
        } catch (relicErr) {
          console.error('[ElementOfDayModal] Error awarding relic:', relicErr);
        }
      } else {
        console.log('[ElementOfDayModal] No rewardKey set for today - skipping relic award');
      }

      // ========== 3. COMPLETE BONUS QUEST via canonical RPC ==========
      const questDetails = {
        quest_key: BONUS_QUEST_KEY,
        source: 'element_of_day',
        element: data.element,
        awarded_relic_id: relicIdAwarded,
      };

      console.log('[ElementOfDayModal] Completing bonus quest via RPC:', {
        p_user_id: userId,
        p_details: questDetails,
      });

      const { data: rpcResult, error: rpcError } = await supabaseBrowser
        .rpc('complete_bonus_quest', {
          p_user_id: userId,
          p_details: questDetails,
        });

      if (rpcError) {
        console.error('[ElementOfDayModal] Error completing bonus quest via RPC:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        // Mark as completed locally even on error to prevent repeated attempts
        setElementQuestCompleted(true);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Failed to complete quest. Please try again.', type: 'error' }
        }));
      } else {
        console.log('[ElementOfDayModal] Bonus quest RPC result:', rpcResult);
        setElementQuestCompleted(true);

        // ========== 4. CHECK did_insert FOR TOAST MESSAGE ==========
        if (rpcResult?.ok && rpcResult?.did_insert) {
          // Newly completed - show success
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Reward claimed.', type: 'success' }
          }));

          // ========== 5. REFRESH PROFILE CONTEXT (for binder_slots changes) ==========
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));

          // ========== 6. REFRESH BOOSTS (if applicable) ==========
          window.dispatchEvent(new CustomEvent('boosts:refresh'));
        } else if (rpcResult?.did_insert === false) {
          // Already completed today
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Already claimed today.', type: 'info' }
          }));
        } else {
          // Fallback success case
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Reward claimed.', type: 'success' }
          }));
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));
          window.dispatchEvent(new CustomEvent('boosts:refresh'));
        }
      }

    } catch (err) {
      console.error('[ElementOfDayModal] Unexpected error:', err);
    } finally {
      // Reset the in-flight guard
      setIsCompletingElementQuest(false);
    }

    // Close modal after brief delay
    setTimeout(() => {
      setIsOpen(false);

      // Dispatch relic celebration event after 1 second (only if we had a rewardKey)
      setTimeout(() => {
        if (data.rewardKey) {
          window.dispatchEvent(
            new CustomEvent(RELIC_CELEBRATION_EVENT, {
              detail: {
                element: data.element,
                rewardKey: data.rewardKey,
                relicLabel: data.relicLabel,
                relicImageUrl: data.relicImageUrl,
                relicKind: data.relicKind,
              },
            })
          );
        }

        // Reset state after celebration starts
        setTimeout(() => {
          setData(null);
          setClaimed(false);
        }, 100);
      }, 1000); // Wait 1 second before relic celebration
    }, 300);
  }, [data, claimed, isCompletingElementQuest, elementQuestCompleted, playElementSound]);

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

  // Debug: log config to verify image path
  console.log('[ElementOfDayModal] Rendering with element:', data.element, 'normalized:', normalizedElement, 'config:', config);

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
          top: "var(--profile-bar-boundary, 64px)",
          bottom: "calc(var(--light-beam-boundary, 200px) + var(--beam-height, 68px))",
        }}
      >
        <div
          className="relative pointer-events-auto flex flex-col justify-center"
          style={{
            width: "calc(var(--display-width) + 32px)",
            maxWidth: "90vw",
            height: "100%",
            padding: "24px",
            borderRadius: 20,
            background: "rgba(0,0,0,0.85)",
            border: `2px solid ${elementColor}80`,
            boxShadow: `0 0 40px ${elementColor}50, 0 0 80px ${elementColor}30`,
            overflow: "visible",
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
            className="text-center mb-4"
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
            className="w-full h-px mb-6"
            style={{
              background: `linear-gradient(90deg, transparent, ${elementColor}80 20%, ${elementColor} 50%, ${elementColor}80 80%, transparent)`,
              boxShadow: `0 0 8px ${elementColor}60`,
            }}
          />

          {/* Element Image with glow and pulse - clickable */}
          <div className="flex justify-center mb-6" style={{ overflow: "visible" }}>
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
              {/* Pulsing glow behind the image - only when not claimed/completed */}
              {!claimed && !elementQuestCompleted && (
                <div
                  style={{
                    position: "absolute",
                    inset: -20,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${elementColor}60 0%, ${elementColor}30 40%, transparent 70%)`,
                    animation: "glowPulse 2s ease-in-out infinite",
                  }}
                />
              )}
              {/* The element image with pulse animation - stops when claimed/completed */}
              <img
                src={config?.icon}
                alt={config?.name}
                style={{
                  position: "relative",
                  zIndex: 10,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  animation: (claimed || elementQuestCompleted) ? "none" : "elementPulse 2s ease-in-out infinite",
                  opacity: (claimed || elementQuestCompleted) ? 0.5 : 1,
                  transition: "opacity 0.3s ease",
                }}
              />
            </button>
          </div>

          {/* Element Name */}
          <div
            className="text-center mb-3"
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
