"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User, Session } from "@supabase/supabase-js";
import { isDebug, debugLog } from "@/lib/debug";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  clearSession: () => Promise<void>;
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

  const clearSession = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      // Clear cookies manually
      document.cookie = 'sb-access-token=; path=/; max-age=0';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0';
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      lastSessionFingerprintRef.current = "no-session";
      if (isDebug()) debugLog('AuthProvider: Session cleared manually');
    } catch (error) {
      console.error('AuthProvider: Error clearing session:', error);
    }
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
  const value = useMemo(() => ({ user, loading, clearSession }), [user, loading]);

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
