"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
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
  const [active, setActive] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
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
    setActive(true);
  }, [clearDisabled]);

  const finish = useCallback(async () => {
    setActive(false);
    setEndModalVisible(true);
    markCompleted();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
  }, [markCompleted, updateProfile]);

  const skip = useCallback(async () => {
    setActive(false);
    setEndModalVisible(false);
    markCompleted();
    markDisabled();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
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
      // start tour a tick later so UI settles after the last modal
      setTimeout(() => start(), 250);
    }
  }, [profile, start, isCompleted, isDisabled]);

  // Listen to a global event for explicit start (emitted on ENTER THE HEARTVERSE if needed)
  useEffect(() => {
    const onEntered = () => {
      if (!isDisabled() && !isCompleted()) start();
    };
    window.addEventListener("heartverse:entered", onEntered);
    return () => window.removeEventListener("heartverse:entered", onEntered);
  }, [start, isCompleted, isDisabled]);

  const value = useMemo(() => ({ active, start, skip, restart, disable, enable }), [active, start, skip, restart, disable, enable]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {/* Render the tour globally */}
      <OnboardingTour active={active} onFinish={() => finish()} onSkip={() => skip()} endModalVisible={endModalVisible} onRestartFromEnd={() => restart()} />
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

