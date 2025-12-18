"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log('AuthProvider: Session cleared manually');
    } catch (error) {
      console.error('AuthProvider: Error clearing session:', error);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error.message);
        } else {
          setUser(session?.user ?? null);
          if (process.env.NODE_ENV === "development") {
            console.log('AuthProvider: Initial session loaded:', { 
              browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
              hasUser: !!session?.user, 
              userId: session?.user?.id,
              hasAccessToken: !!session?.access_token,
              hasRefreshToken: !!session?.refresh_token
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

    // Subscribe to auth state changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        if (process.env.NODE_ENV === "development") {
          console.log('AuthProvider: Auth state changed:', { 
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, clearSession }}>
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