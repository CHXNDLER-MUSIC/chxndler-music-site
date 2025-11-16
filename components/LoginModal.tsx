"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
      setMessage("Check your email for a magic link.");
    } catch (e: any) {
      setError(e?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label="Sign in"
      style={{ alignItems: 'flex-start', paddingTop: '15vh' }}
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative mx-4 max-w-sm w-full">
        <div className="relative rounded-2xl p-4 backdrop-blur-md border-2 border-[#FC54AF]/60 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)]">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                "0 0 40px rgba(252,84,175,0.5), 0 0 80px rgba(252,84,175,0.3), inset 0 0 24px rgba(252,84,175,0.2)",
            }}
          />

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/20 hover:bg-white/15"
          >
            ×
          </button>

          <h2 className="relative text-xl font-bold tracking-wider text-white drop-shadow mb-1">
            WELCOME HOME
          </h2>
          <p className="relative text-sm text-white/80 mb-3">You're invited into the Heartverse.</p>

          {error && (
            <div className="relative mb-2 rounded-md bg-red-50/10 border border-red-200/40 p-2 text-sm text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="relative mb-2 rounded-md bg-green-50/10 border border-green-200/40 p-2 text-sm text-green-200">
              {message}
            </div>
          )}

          <div className="relative space-y-2">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-50"
            >
              Sign in with Google
            </button>

            <div className="relative flex items-center text-white/50">
              <div className="flex-grow border-t border-white/20" />
              <span className="mx-3 text-xs uppercase">or</span>
              <div className="flex-grow border-t border-white/20" />
            </div>

            <form onSubmit={signInWithEmail} className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-white/90">
                Email for magic link
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || email.length === 0}
                className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF]/20 border-2 border-[#FC54AF]/60 px-4 py-3 text-sm font-medium text-white hover:bg-[#FC54AF]/30 transition disabled:opacity-50"
                style={{
                  boxShadow: loading || email.length === 0 
                    ? 'none' 
                    : '0 0 20px rgba(252,84,175,0.6), 0 0 40px rgba(252,84,175,0.4), inset 0 0 10px rgba(252,84,175,0.2)'
                }}
              >
                Send magic link
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

