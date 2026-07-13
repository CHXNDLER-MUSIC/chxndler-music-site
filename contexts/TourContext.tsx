"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { useMenuState } from "@/contexts/MenuStateContext";
import { useHeartcoinBalance } from "@/providers/HeartcoinBalanceProvider";
import { supabaseBrowser } from "@/lib/supabase-browser";
import OnboardingTour from "@/components/OnboardingTour";
import { sfx } from "@/lib/sfx";
import { suppressBadgeCelebrations } from "@/utils/celebrationQueue";
import { triggerHeartCoinCelebration, suppressNextHeartcoinCelebration } from "@/utils/heartcoinCelebration";
import { ONBOARDING_SEQUENCE_COMPLETE, runRewardSequence } from "@/utils/onboardingSequence";
import { checkAndAwardEligibleBadges } from "@/lib/updateBadgeProgress";

type TourRewardType = "tour_skipped" | "tour_completed";

type TourContextValue = {
  active: boolean;
  start: () => void;
  skip: () => void;
  restart: () => void;
  disable: () => void; // permanently until re-enabled
  enable: () => void;  // re-enable via settings
  showWelcome: () => void; // show the "Let me show you around" prompt
};

const TourContext = createContext<TourContextValue | null>(null);

const LS_KEYS = {
  completed: "heartverse_tour_completed",
  disabled: "heartverse_tour_disabled",
} as const;

// Scope keys per-account so one user's tour-seen/disabled state can never
// leak into another account tested/logged-in on the same browser.
function scopedKey(base: string, userId?: string | null) {
  return userId ? `${base}_${userId}` : base;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile, refreshProfile, ensureProfileExists } = useProfile();
  const { setMenuOpen } = useMenuState();
  const { setBalanceFromServer } = useHeartcoinBalance();
  const [active, setActive] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const userId = profile?.id;

  // Helpers for localStorage fallback, scoped to the current account.
  // Each accepts an optional override id, since during onboarding ProfileContext's
  // `profile` can still be null (no Supabase client session yet) even though we
  // know the real user id from the event that just fired (e.g. ALIGN completion).
  const markCompleted = useCallback(() => {
    try { localStorage.setItem(scopedKey(LS_KEYS.completed, userId), "1"); } catch {}
  }, [userId]);
  const markDisabled = useCallback(() => {
    try { localStorage.setItem(scopedKey(LS_KEYS.disabled, userId), "1"); } catch {}
  }, [userId]);
  const clearDisabled = useCallback((overrideUserId?: string | null) => {
    try { localStorage.removeItem(scopedKey(LS_KEYS.disabled, overrideUserId ?? userId)); } catch {}
  }, [userId]);

  const start = useCallback(() => {
    // Suppress badge celebrations during tour to prevent interruptions
    suppressBadgeCelebrations(60000); // Suppress for 60 seconds (tour duration)
    try { localStorage.removeItem(scopedKey(LS_KEYS.disabled, userId)); } catch {}
    setEndModalVisible(false);
    setWelcomeVisible(false);
    setActive(true);
  }, [userId]);

  const finish = useCallback(async () => {
    setActive(false);
    setEndModalVisible(true);
    markCompleted();
    try { await updateProfile({ has_seen_tour: true }); } catch {}
  }, [markCompleted, updateProfile]);

  // One-time onboarding reward claim (tour_skipped / tour_completed) via the
  // claim_tour_reward RPC. This does NOT depend on ProfileContext's `profile`
  // being loaded — the RPC resolves the user server-side from the Supabase
  // auth session (auth.uid()), so it's safe to call even in the window right
  // after ALIGN where `profile` can still be null client-side.
  //
  // Uses supabaseBrowser (the app's single shared browser client — see
  // lib/supabase/client.ts) everywhere. No server/admin client involved.
  const claimTourReward = useCallback(async (
    rewardType: TourRewardType
  ): Promise<{ awarded: boolean; failed: boolean }> => {
    console.log("[tour reward] started", rewardType);

    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();

    console.log("[tour reward] auth", {
      userId: session?.user?.id,
      sessionError,
    });

    if (sessionError || !session?.user) {
      console.error("[tour reward] no authenticated session", sessionError);
      return { awarded: false, failed: true };
    }

    // Guard against the profiles-row-creation trigger not having run yet —
    // on a fresh signup, claim_tour_reward's award UPDATE (like other writes
    // keyed on auth.uid()) silently matches zero rows and reports
    // awarded:false/amount:0 with no error if the row doesn't exist yet.
    // ensureProfileExists is an idempotent upsert (ignoreDuplicates), so this
    // is a safe no-op once the row is already there.
    await ensureProfileExists(session.user.id, session.user.email);

    const { data, error } = await supabaseBrowser.rpc("claim_tour_reward", {
      p_reward_type: rewardType,
    });

    console.log("[tour reward] rpc result", { data, error });

    if (error) {
      console.error("[tour reward] RPC failed", error);
      return { awarded: false, failed: true };
    }

    if (!data || typeof data.awarded !== "boolean") {
      console.error("[tour reward] invalid RPC response", data);
      return { awarded: false, failed: true };
    }

    if (typeof data.heartcoin_balance === "number") {
      setBalanceFromServer(data.heartcoin_balance);
    }

    if (data.awarded === true) {
      // Suppress the realtime-driven duplicate that would otherwise fire if
      // this RPC's award also inserts a heartcoin_transactions row, then
      // show the one, real celebration.
      suppressNextHeartcoinCelebration();
      triggerHeartCoinCelebration(1, { force: true });

      // Explicitly check for newly-eligible badges (e.g. Wanderer, which
      // requires 1 HeartCoin) right now, using the session's user id — do
      // not wait on HeartcoinBalanceProvider's realtime heartcoin_transactions
      // listener, since we don't know whether this RPC's award path inserts
      // a row there. allowCelebration:true lets the real-time badge
      // celebration system (lib/useBadgeCelebrations.ts +
      // components/BadgeCelebrationController.tsx) show the unlock animation
      // once it sees the resulting user_badges insert.
      checkAndAwardEligibleBadges(session.user.id, { allowCelebration: true }).catch((err) => {
        console.error("[tour reward] badge check failed", err);
      });

      // ProfileContext's `profile.heartcoin_total` (used by badge progress
      // math, e.g. Wanderer's "X / 1 HeartCoin") isn't updated by the
      // realtime user_badges subscription above — only a badge's unlocked
      // state is. Without this, the badge shows unlocked but its progress
      // bar reads stale (e.g. 0/1) until an unrelated profile refresh or a
      // full page reload happens to fire. skipBadgeCheck:true avoids
      // re-running badge checks here (checkAndAwardEligibleBadges already
      // did that above).
      refreshProfile().catch((err) => {
        console.error("[tour reward] profile refresh failed", err);
      });
    }
    // awarded === false is not an error — it means this reward type was
    // already claimed previously. No celebration, caller just continues.

    return {
      awarded: data.awarded,
      failed: false,
    };
  }, [setBalanceFromServer, refreshProfile, ensureProfileExists]);

  const completeAndDismiss = useCallback(async () => {
    console.log("[tour reward] Got it! clicked -> completeAndDismiss()");
    markCompleted();
    try { await updateProfile({ has_seen_tour: true }); } catch {}

    // Await the real database award BEFORE dismissing the tour UI. Dismissing
    // first doesn't itself cancel this async function, but we sequence it
    // explicitly so the award is guaranteed to have resolved before anything
    // downstream (badge sequence, claim card) runs.
    await claimTourReward("tour_completed");

    setActive(false);
    setEndModalVisible(false);

    if (profile?.id) {
      // Run reward sequence (Wanderer badge → claim card) after tour completion.
      // HeartCoin celebration is skipped here — claimTourReward already handled
      // (or correctly skipped) the real award above; this must never re-award.
      runRewardSequence(profile.id, { skipHeartCoinCelebration: true });
    }
  }, [markCompleted, updateProfile, profile, claimTourReward]);

  const skip = useCallback(async () => {
    console.log("[tour reward] Skip for now clicked -> skip()");
    markCompleted();
    markDisabled();
    try { await updateProfile({ has_seen_tour: true }); } catch {}

    // Await the real database award BEFORE dismissing the tour UI (see
    // completeAndDismiss for why).
    await claimTourReward("tour_skipped");

    setActive(false);
    setEndModalVisible(false);
    setWelcomeVisible(false);

    if (profile?.id) {
      // Run reward sequence (Wanderer badge → claim card) whether skipping mid-tour
      // or skipping the welcome prompt. HeartCoin celebration is skipped here —
      // claimTourReward already handled (or correctly skipped) the real award above.
      runRewardSequence(profile.id, { skipHeartCoinCelebration: true });
    }
  }, [markCompleted, markDisabled, updateProfile, profile, claimTourReward]);

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

  const showWelcome = useCallback(() => {
    clearDisabled();
    setWelcomeVisible(true);
  }, [clearDisabled]);

  // Listen for onboarding sequence completion (fires after ALIGN's warp lands)
  // to show the tour prompt. This always shows, regardless of whether the
  // tour has been seen/completed/disabled before — ALIGN always re-prompts.
  useEffect(() => {
    const onSequenceComplete = (event: Event) => {
      if (process.env.NODE_ENV !== "production") console.log('[Tour] Onboarding sequence complete');

      // ProfileContext's `profile` can still be null here (no Supabase client
      // session yet during onboarding), so prefer the userId the ALIGN handler
      // dispatched this event with over the (possibly stale/null) profile.
      const eventUserId = (event as CustomEvent)?.detail?.userId as string | undefined;
      const effectiveUserId = eventUserId ?? userId;

      // Guard: don't re-show if already visible or tour is already active
      // (the sequence dispatches this event a second time after its own timeouts)
      const shouldShow = !active && !welcomeVisible;
      if (process.env.NODE_ENV !== "production") console.log('[Tour] shouldShow?', shouldShow, { effectiveUserId, active, welcomeVisible });
      if (shouldShow) {
        if (process.env.NODE_ENV !== "production") console.log('[Tour] Showing tour prompt after warp — setWelcomeVisible(true) called');
        clearDisabled(effectiveUserId);
        setWelcomeVisible(true);
      }
    };

    window.addEventListener(ONBOARDING_SEQUENCE_COMPLETE, onSequenceComplete);
    return () => window.removeEventListener(ONBOARDING_SEQUENCE_COMPLETE, onSequenceComplete);
  }, [active, welcomeVisible, clearDisabled, userId]);

  useEffect(() => {
    if (welcomeVisible && process.env.NODE_ENV !== "production") {
      console.log('[Tour] welcomeVisible=true — popup JSX should now be mounted in the DOM');
    }
  }, [welcomeVisible]);

  const value = useMemo(() => ({ active, start, skip, restart, disable, enable, showWelcome }), [active, start, skip, restart, disable, enable, showWelcome]);

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

      {/* Welcome prompt before starting the tour — embedded in the blue hologram display */}
      {welcomeVisible && (
        <>
          {/* Hologram base glow */}
          <div
            className="fixed flex justify-center"
            style={{
              zIndex: 9999999,
              pointerEvents: 'none',
              left: 0,
              right: 0,
              top: 'var(--profile-bar-boundary, 64px)',
              bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
              alignItems: 'flex-start',
              paddingTop: '200px',
            }}
          >
            <div
              style={{
                width: 'min(120vw, 700px)',
                height: '200px',
                background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
                filter: 'blur(100px)',
              }}
            />
          </div>

          {/* Display container */}
          <div
            className="fixed flex justify-center pointer-events-none"
            style={{
              zIndex: 9999999,
              left: 0,
              right: 0,
              top: 'var(--profile-bar-boundary, 64px)',
              bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
              alignItems: 'flex-start',
            }}
          >
            <div
              className="pointer-events-auto flex flex-col"
              style={{
                width: 'min(92vw, 500px)',
                height: '100%',
                padding: '16px 24px 20px 24px',
                borderRadius: 18,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,255,255,0.55)',
                boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
                backdropFilter: 'blur(12px) saturate(140%)',
                color: '#00FFFF',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Bottom glow */}
              <div
                className="absolute"
                style={{
                  bottom: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '120%',
                  height: '30px',
                  background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
              {/* Top bloom glow */}
              <div
                className="absolute"
                style={{
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  height: '20px',
                  background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />

              {/* Content */}
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <h2
                  className="text-2xl font-bold text-white mb-6"
                  style={{ textShadow: '0 0 18px rgba(0,255,255,0.7)' }}
                >
                  Should I show you around?
                </h2>

                <button
                  onClick={() => {
                    try { sfx.play('click', 0.5); } catch {}
                    start();
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(252,84,175,0.85), rgba(252,84,175,0.65))',
                    border: '1px solid rgba(252,84,175,0.5)',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.35), 0 0 20px rgba(252,84,175,0.45)',
                  }}
                >
                  Yes, show me around
                </button>

                <button
                  onClick={() => {
                    try { sfx.play('click', 0.5); } catch {}
                    skip();
                  }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                  className="w-full text-white/80 hover:text-white text-sm underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
