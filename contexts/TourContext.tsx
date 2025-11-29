"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useMenuState } from "@/contexts/MenuStateContext";
import OnboardingTour from "@/components/OnboardingTour";

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

  // Helpers for localStorage fallback
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
    clearDisabled();
    setEndModalVisible(false);
    setWelcomeVisible(false);
    setActive(true);
  }, [clearDisabled]);

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
    setActive(false);
    setEndModalVisible(false);
    markCompleted();
    markDisabled();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
    
    // Trigger warp effect when skipping tour
    try {
      window.dispatchEvent(new CustomEvent('tour:skipped'));
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
  useEffect(() => {
    if (autostartGuard.current) return;
    if (!profile) return;
    const completed = profile.has_seen_tour || isCompleted();
    if (completed || isDisabled()) return;

    if (profile.profile_complete) {
      autostartGuard.current = true;
      // show welcome a tick later so UI settles after the last modal
      setTimeout(() => setWelcomeVisible(true), 250);
    }
  }, [profile, start, isCompleted, isDisabled]);

  // Listen to a global event for explicit start (emitted on ENTER THE HEARTVERSE if needed)
  useEffect(() => {
    const onEntered = () => {
      // Clear any previous tour state to ensure welcome shows when explicitly entering heartverse
      clearDisabled();
      setWelcomeVisible(true);
    };
    window.addEventListener("heartverse:entered", onEntered);
    return () => window.removeEventListener("heartverse:entered", onEntered);
  }, [clearDisabled]);

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
        <div className="fixed inset-0 z-[320] flex items-center justify-center transition-opacity duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-[321] w-full max-w-md mx-4 rounded-2xl p-8 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(56,182,255,0.18), rgba(56,182,255,0.12))',
              border: '1px solid rgba(56,182,255,0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(56,182,255,0.5)'
            }}
          >
            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ textShadow: '0 0 18px rgba(56,182,255,0.7)' }}
            >
              {`Welcome ${profile?.name ? profile.name : 'Alien'}`}
            </h2>
            <p className="text-white/90 mb-6">Let me show you around?</p>

            <button
              onClick={() => start()}
              className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))',
                border: '1px solid rgba(252,84,175,0.5)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.35), 0 0 20px rgba(252,84,175,0.45)'
              }}
            >
              Show me around
            </button>

            <button
              onClick={() => { setWelcomeVisible(false); skip(); }}
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
