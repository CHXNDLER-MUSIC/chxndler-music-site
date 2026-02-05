"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useMenuState } from "@/contexts/MenuStateContext";
import OnboardingTour from "@/components/OnboardingTour";
import { sfx } from "@/lib/sfx";
import { suppressBadgeCelebrations } from "@/utils/celebrationQueue";
import { ONBOARDING_SEQUENCE_COMPLETE, isOnboardingSequenceActive } from "@/utils/onboardingSequence";

type TourContextValue = {
  active: boolean;
  start: () => void;
  skip: () => void;
  restart: () => void;
  disable: () => void; // permanently until re-enabled
  enable: () => void;  // re-enable via settings
};

const TourContext = createContext<TourContextValue | null>(null);

const LS_KEYS = {
  completed: "heartverse_tour_completed",
  disabled: "heartverse_tour_disabled",
} as const;

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useProfile();
  const { setMenuOpen } = useMenuState();
  const [active, setActive] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const autostartGuard = useRef(false);

  // Helpers for localStorage fallback (stable functions that don't change)
  const isCompleted = useCallback(() => {
    try { return localStorage.getItem(LS_KEYS.completed) === "1"; } catch { return false; }
  }, []);
  const isDisabled = useCallback(() => {
    try { return localStorage.getItem(LS_KEYS.disabled) === "1"; } catch { return false; }
  }, []);
  const markCompleted = useCallback(() => {
    try { localStorage.setItem(LS_KEYS.completed, "1"); } catch {}
  }, []);
  const markDisabled = useCallback(() => {
    try { localStorage.setItem(LS_KEYS.disabled, "1"); } catch {}
  }, []);
  const clearDisabled = useCallback(() => {
    try { localStorage.removeItem(LS_KEYS.disabled); } catch {}
  }, []);

  const start = useCallback(() => {
    // Suppress badge celebrations during tour to prevent interruptions
    suppressBadgeCelebrations(60000); // Suppress for 60 seconds (tour duration)
    try { localStorage.removeItem(LS_KEYS.disabled); } catch {}
    setEndModalVisible(false);
    setWelcomeVisible(false);
    setActive(true);
  }, []);

  const finish = useCallback(async () => {
    setActive(false);
    setEndModalVisible(true);
    markCompleted();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
  }, [markCompleted, updateProfile]);

  const completeAndDismiss = useCallback(async () => {
    setActive(false);
    setEndModalVisible(false);
    markCompleted();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
  }, [markCompleted, updateProfile]);

  const skip = useCallback(async () => {
    console.log('Tour skip function called');
    setActive(false);
    setEndModalVisible(false);
    markCompleted();
    markDisabled();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
    
    // Trigger warp effect when skipping tour
    try {
      console.log('Dispatching tour:skipped event');
      window.dispatchEvent(new CustomEvent('tour:skipped'));
      console.log('tour:skipped event dispatched successfully');
    } catch (e) {
      console.log('Could not dispatch tour:skipped event:', e);
    }
  }, [markCompleted, markDisabled, updateProfile]);

  const restart = useCallback(() => {
    setEndModalVisible(false);
    setActive(true);
  }, []);

  const disable = useCallback(async () => {
    markDisabled();
    markCompleted();
    setActive(false);
    setEndModalVisible(false);
    try { await updateProfile({ has_seen_tour: true }); } catch {}
  }, [markCompleted, markDisabled, updateProfile]);

  const enable = useCallback(() => {
    clearDisabled();
  }, [clearDisabled]);

  // Auto-start: after profile is complete, no previous completion/disable
  // BUT if onboarding sequence is active, defer to sequence-complete event
  useEffect(() => {
    if (autostartGuard.current) return;
    if (!profile) return;
    const completed = profile.has_seen_tour || isCompleted();
    if (completed || isDisabled()) return;

    if (profile.profile_complete) {
      autostartGuard.current = true;

      // If onboarding sequence is active, don't auto-start
      // The sequence will dispatch ONBOARDING_SEQUENCE_COMPLETE when done
      if (isOnboardingSequenceActive()) {
        console.log('[Tour] Onboarding sequence active, deferring to sequence-complete event');
        return;
      }

      // For users who complete onboarding without the sequence (edge case),
      // show welcome a tick later so UI settles after the last modal
      setTimeout(() => setWelcomeVisible(true), 250);
    }
  }, [profile]);

  // Listen to a global event for explicit start (emitted on ENTER THE HEARTVERSE if needed)
  useEffect(() => {
    const onEntered = () => {
      // Only show if user hasn't completed the tour yet
      const completed = profile?.has_seen_tour || isCompleted();
      if (!completed && !isDisabled()) {
        clearDisabled();
        setWelcomeVisible(true);
      }
    };
    window.addEventListener("heartverse:entered", onEntered);
    return () => window.removeEventListener("heartverse:entered", onEntered);
  }, [clearDisabled, profile, isCompleted, isDisabled]);

  // Listen for onboarding sequence completion to show tour prompt
  useEffect(() => {
    const onSequenceComplete = () => {
      console.log('[Tour] Onboarding sequence complete');

      // Show tour if user hasn't completed it yet
      const completed = profile?.has_seen_tour || isCompleted();
      if (!completed && !isDisabled()) {
        console.log('[Tour] Showing tour after onboarding sequence');
        clearDisabled();
        setWelcomeVisible(true);
      }
    };

    window.addEventListener(ONBOARDING_SEQUENCE_COMPLETE, onSequenceComplete);
    return () => window.removeEventListener(ONBOARDING_SEQUENCE_COMPLETE, onSequenceComplete);
  }, [profile, isCompleted, isDisabled, clearDisabled]);

  const value = useMemo(() => ({ active, start, skip, restart, disable, enable }), [active, start, skip, restart, disable, enable]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {/* Render the tour globally */}
      <OnboardingTour 
        active={active} 
        onFinish={(completed: boolean) => completed ? completeAndDismiss() : finish()} 
        onSkip={() => skip()} 
        endModalVisible={endModalVisible} 
        onRestartFromEnd={() => restart()}
        onMenuToggle={setMenuOpen}
      />

      {/* Welcome modal before starting the tour */}
      {welcomeVisible && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center transition-opacity duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
          <div
            className="relative z-[1000000] w-full max-w-md mx-4 rounded-2xl p-8 text-center pointer-events-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(56,182,255,0.18), rgba(56,182,255,0.12))',
              border: '1px solid rgba(56,182,255,0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(56,182,255,0.5)'
            }}
          >
            <h2
              className="text-2xl font-bold text-white mb-4"
              style={{ textShadow: '0 0 18px rgba(56,182,255,0.7)' }}
            >
              Let me show you around
            </h2>

            <button
              onClick={() => {
                try { sfx.play('click', 0.5); } catch {}
                start();
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
              }}
              className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))',
                border: '1px solid rgba(252,84,175,0.5)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.35), 0 0 20px rgba(252,84,175,0.45)'
              }}
            >
              Start tour
            </button>

            <button
              onClick={() => {
                try { sfx.play('click', 0.5); } catch {}
                console.log('Skip tour clicked');
                setWelcomeVisible(false);
                // Small delay to ensure modal closes before triggering warp
                setTimeout(() => skip(), 100);
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.3); } catch {}
              }}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
