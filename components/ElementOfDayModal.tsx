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
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const alienWaveAudioRef = useRef<HTMLAudioElement | null>(null);
  const elementSoundRef = useRef<HTMLAudioElement | null>(null);

  // Play hover sound when hovering over the element
  const handleElementHover = useCallback(() => {
    if (claimed) return;
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/audio/hover.mp3");
      hoverAudioRef.current.volume = 0.5;
    }
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  }, [claimed]);

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

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setClaimed(false);
  }, []);

  // Handle clicking on the element image to claim reward
  // Element of Day click -> claim_daily_checkin RPC
  const handleImageClick = useCallback(async () => {
    if (!data || claimed) return;

    // Play element-specific sound
    playElementSound(data.element);

    // Stop pulsing by marking as claimed
    setClaimed(true);

    // Call claim_daily_checkin RPC to record the check-in
    try {
      const { data: session } = await supabaseBrowser.auth.getSession();
      if (session?.session?.user) {
        const { data: rpcResult, error: rpcError } = await supabaseBrowser.rpc(
          'claim_daily_checkin',
          { p_source: 'element_of_day' }
        );

        if (rpcError) {
          console.error('[ElementOfDayModal] claim_daily_checkin RPC error:', rpcError);
        } else {
          console.log('[ElementOfDayModal] claim_daily_checkin RPC success:', rpcResult);

          // Dispatch event so QuestList can update its UI
          window.dispatchEvent(
            new CustomEvent('element-of-day-claimed', {
              detail: {
                element: data.element,
                checkinDate: rpcResult?.checkin_date_ny,
                dailyStreak: rpcResult?.daily_streak_current,
                alreadyCheckedIn: rpcResult?.already_checked_in,
              },
            })
          );

          // Award the relic to user's collection if there's a rewardKey
          // Always attempt to award - the API handles duplicates gracefully
          if (data.rewardKey) {
            console.log('[ElementOfDayModal] Attempting to award relic:', data.rewardKey, 'to user:', session.session.user.id);
            try {
              const response = await fetch('/api/award-relic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: session.session.user.id,
                  relicCode: data.rewardKey,
                }),
              });
              const result = await response.json();
              if (!response.ok) {
                console.error('[ElementOfDayModal] award-relic API error:', result);
              } else {
                console.log('[ElementOfDayModal] Relic awarded successfully:', result);
                // Dispatch event to refresh relics collection
                window.dispatchEvent(new CustomEvent('relics:refresh'));
              }
            } catch (relicErr) {
              console.error('[ElementOfDayModal] Error awarding relic:', relicErr);
            }
          } else {
            console.log('[ElementOfDayModal] No rewardKey set for today - skipping relic award');
          }

          // Trigger profile refresh to update daily_streak_current in UI
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));
        }
      } else {
        console.log('[ElementOfDayModal] User not logged in, skipping daily check-in');
      }
    } catch (err) {
      console.error('[ElementOfDayModal] Error calling claim_daily_checkin:', err);
    }

    // Close modal after brief delay
    setTimeout(() => {
      setIsOpen(false);

      // Dispatch relic celebration event after 1 second
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
  }, [data, claimed, playElementSound]);

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

  const config = ELEMENT_CONFIG[data.element];
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
              className="relative cursor-pointer transition-transform hover:scale-105"
              style={{
                width: 140,
                height: 140,
                background: "none",
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
                overflow: "visible",
              }}
              aria-label="Claim reward"
            >
              {/* Pulsing glow behind the image - only when not claimed */}
              {!claimed && (
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
              {/* The element image with pulse animation - stops when claimed */}
              <img
                src={config?.icon}
                alt={config?.name}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  animation: claimed ? "none" : "elementPulse 2s ease-in-out infinite",
                  opacity: claimed ? 0.5 : 1,
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

        </div>
      </div>
    </>,
    document.body
  );
}
