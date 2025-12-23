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

const ELEMENT_CONFIG: Record<ElementType, { name: string; color: string; icon: string }> = {
  heart: { name: "HEART", color: "#FC54AF", icon: "/elements/heart.webp" },
  water: { name: "WATER", color: "#38B6FF", icon: "/elements/water.webp" },
  lightning: { name: "LIGHTNING", color: "#F2EF1D", icon: "/elements/lightning.webp" },
  darkness: { name: "DARKNESS", color: "#FFFFFF", icon: "/elements/darkness.webp" },
};

export default function ElementOfDayModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ElementOfDayData | null>(null);
  const [claimed, setClaimed] = useState(false);
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setClaimed(false);
  }, []);

  // Handle clicking on the element image to claim reward
  // Element of Day click -> claim_daily_checkin RPC
  const handleImageClick = useCallback(async () => {
    if (!data || claimed) return;

    // Play click sound
    playClickSound();

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

      // Dispatch relic celebration event
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
    }, 300);
  }, [data, claimed, playClickSound]);

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
            return;
          }
        } catch (err) {
          console.warn('[ElementOfDayModal] Failed to fetch from API:', err);
        }

        // Fallback to event data if API fails
        setData(e.detail);
        setIsOpen(true);
        setClaimed(false);
      }
    };

    window.addEventListener("element-of-day:show" as any, handleShow);
    return () => {
      window.removeEventListener("element-of-day:show" as any, handleShow);
    };
  }, []);

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

      {/* Modal Content - positioned at bottom, just above light beam */}
      <div
        className="fixed left-0 right-0 flex items-end justify-center pointer-events-none"
        style={{
          zIndex: 2147483648,
          top: "var(--profile-bar-boundary, 64px)",
          bottom: "var(--light-beam-boundary, 200px)",
        }}
      >
        <div
          className="relative pointer-events-auto flex flex-col"
          style={{
            width: "min(90vw, 380px)",
            maxHeight: "100%",
            padding: "24px",
            borderRadius: 20,
            background: "rgba(0,0,0,0.85)",
            border: `2px solid ${elementColor}80`,
            boxShadow: `0 0 40px ${elementColor}50, 0 0 80px ${elementColor}30`,
            overflow: "auto",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
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
              fontSize: "14px",
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
          <div className="flex justify-center mb-6">
            <button
              onClick={handleImageClick}
              onMouseEnter={handleElementHover}
              className="relative cursor-pointer transition-transform hover:scale-105"
              style={{
                width: 140,
                height: 140,
                background: "transparent",
                border: "none",
                padding: 0,
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
