"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User, Session } from "@supabase/supabase-js";
import { isDebug, debugLog } from "@/lib/debug";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  clearSession: () => Promise<void>;
  confirmSession: (session: Session) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to create a stable fingerprint for session comparison
function sessionFingerprint(session: Session | null): string {
  if (!session) return "no-session";
  return `${session.user?.id || ""}:${session.access_token?.slice(-8) || ""}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to prevent duplicate initialization and state updates
  const didInitRef = useRef(false);
  const lastSessionFingerprintRef = useRef<string>("init");
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  // Set only by an explicit, user-initiated sign-out. Lets onAuthStateChange
  // tell the difference between "the user actually logged out" and a spurious
  // background session-loss event (see confirmedSessionUntilRef below).
  const explicitSignOutRef = useRef(false);
  // While onboarding is in progress (name → element → ALIGN → warp → tour),
  // some environments briefly report no client session between OTP verification
  // and the client's own session persistence catching up (see confirmSession).
  // If a SIGNED_OUT/no-session event arrives before this timestamp and wasn't
  // caused by an explicit sign-out, it's treated as spurious and ignored rather
  // than kicking the user back to a "LOG IN" state and forcing re-verification.
  const confirmedSessionUntilRef = useRef<number>(0);
  const CONFIRMED_SESSION_GRACE_MS = 5 * 60 * 1000; // covers the full onboarding flow

  const clearSession = async () => {
    try {
      explicitSignOutRef.current = true;
      await supabaseBrowser.auth.signOut();
      // Clear cookies manually
      document.cookie = 'sb-access-token=; path=/; max-age=0';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0';
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      lastSessionFingerprintRef.current = "no-session";
      confirmedSessionUntilRef.current = 0;
      if (isDebug()) debugLog('AuthProvider: Session cleared manually');
    } catch (error) {
      console.error('AuthProvider: Error clearing session:', error);
    }
  };

  // Directly seed `user` from a session we already know is valid (e.g. the
  // session object returned straight from verifyOtp/signInWithOtp), instead of
  // waiting on onAuthStateChange or getSession() to catch up. This is the
  // Supabase-issued session itself — the source of truth — just applied
  // synchronously rather than round-tripped through the client's internal event
  // propagation, which onboarding has shown can lag or briefly report empty.
  const confirmSession = (session: Session) => {
    if (!session?.user) return;
    explicitSignOutRef.current = false;
    const fingerprint = sessionFingerprint(session);
    lastSessionFingerprintRef.current = fingerprint;
    confirmedSessionUntilRef.current = Date.now() + CONFIRMED_SESSION_GRACE_MS;
    setUser(session.user);
    setLoading(false);

    if (session.access_token) {
      const isSecure = window.location.protocol === 'https:';
      const secureFlag = isSecure ? '; Secure' : '';
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;
      if (session.refresh_token) {
        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
      }
    }

    if (isDebug()) debugLog('AuthProvider: Session confirmed directly', { userId: session.user.id });
  };

  useEffect(() => {
    // Guard against double-initialization (React StrictMode in dev)
    if (didInitRef.current) {
      return;
    }
    didInitRef.current = true;

    const getInitialSession = async () => {
      try {
        // Debug: Log all cookies visible to JavaScript
        if (process.env.NODE_ENV !== "production") console.log('[AuthProvider] Checking cookies:', document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean));

        const { data: { session }, error } = await supabaseBrowser.auth.getSession();

        if (process.env.NODE_ENV !== "production") console.log('[AuthProvider] getSession result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message
        });

        if (error) {
          console.error('AuthProvider: Error getting session:', error.message);
          setLoading(false);
          return;
        }

        const fingerprint = sessionFingerprint(session);

        // Only update state if fingerprint changed
        if (fingerprint !== lastSessionFingerprintRef.current) {
          lastSessionFingerprintRef.current = fingerprint;
          setUser(session?.user ?? null);

          if (isDebug()) {
            debugLog('AuthProvider: Initial session loaded:', {
              hasUser: !!session?.user,
              userId: session?.user?.id,
            });
          }

          // Set initial cookies if session exists
          if (session?.access_token) {
            const isSecure = window.location.protocol === 'https:';
            const secureFlag = isSecure ? '; Secure' : '';
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;
            if (session.refresh_token) {
              document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
            }
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Subscribe to auth state changes (only once)
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (process.env.NODE_ENV !== "production") console.log('[AuthProvider] onAuthStateChange fired:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        const fingerprint = sessionFingerprint(session);

        // Skip if this is INITIAL_SESSION and fingerprint matches (we already handled it)
        if (event === 'INITIAL_SESSION' && fingerprint === lastSessionFingerprintRef.current) {
          if (isDebug()) debugLog('AuthProvider: Skipping duplicate INITIAL_SESSION');
          return;
        }

        // Skip if fingerprint hasn't changed (no real auth change)
        if (fingerprint === lastSessionFingerprintRef.current) {
          return;
        }

        // Guard against spurious session-loss: if we recently confirmed a valid
        // session directly (see confirmSession) and this event reports no
        // session without an explicit sign-out having happened, ignore it —
        // don't force the user back to a logged-out state and a second OTP.
        if (!session && !explicitSignOutRef.current && Date.now() < confirmedSessionUntilRef.current) {
          console.warn('AuthProvider: Ignoring spurious no-session auth event during confirmed-session window', { event });
          return;
        }

        lastSessionFingerprintRef.current = fingerprint;

        if (isDebug()) {
          debugLog('AuthProvider: Auth state changed:', {
            event,
            hasUser: !!session?.user,
            userId: session?.user?.id
          });
        }

        // Sync session tokens to cookies for API routes
        if (session?.access_token) {
          const isSecure = window.location.protocol === 'https:';
          const secureFlag = isSecure ? '; Secure' : '';
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;
          if (session.refresh_token) {
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
          }
        } else {
          // Clear cookies when no session
          document.cookie = 'sb-access-token=; path=/; max-age=0';
          document.cookie = 'sb-refresh-token=; path=/; max-age=0';
        }

        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, loading, clearSession, confirmSession }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
