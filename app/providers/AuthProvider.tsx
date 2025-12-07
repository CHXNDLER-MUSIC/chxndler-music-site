"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log('AuthProvider: Getting initial session...');
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error.message);
        } else {
          setUser(session?.user ?? null);
          if (process.env.NODE_ENV === "development") {
            console.log('AuthProvider: Initial session loaded:', { 
              hasUser: !!session?.user, 
              userId: session?.user?.id 
            });
          }
          
          // Set initial cookies if session exists
          if (session?.access_token) {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
            if (session.refresh_token) {
              document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
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

    // Subscribe to auth state changes - ONLY ONCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
          if (session.refresh_token) {
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
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
  }, []); // Empty dependency array - only run once

  return (
    <AuthContext.Provider value={{ user, loading }}>
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