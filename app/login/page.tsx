"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getRedirectUrl(path: string) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${baseUrl}${path}`;
  }

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getRedirectUrl("/auth/callback?next=/dashboard") },
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
        options: { emailRedirectTo: getRedirectUrl("/auth/callback?next=/dashboard&profileSetup=1") },
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
    <main className="mx-auto max-w-md p-6">
      <div className="relative rounded-2xl p-6 backdrop-blur-md border border-white/20 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)]">
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          boxShadow:
            "0 0 40px rgba(252,84,175,0.25), 0 0 80px rgba(56,182,255,0.25), inset 0 0 24px rgba(242,239,29,0.15)",
        }} />

        <h1 className="relative text-3xl font-bold tracking-wider text-white drop-shadow mb-6">
          ENTER THE HEARTVERSE
        </h1>
        <p className="relative text-sm text-white/80 mb-6">You’re invited into the Heartverse.</p>

        {error && (
          <div className="relative mb-4 rounded-md bg-red-50/10 border border-red-200/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="relative mb-4 rounded-md bg-green-50/10 border border-green-200/40 p-3 text-sm text-green-200">
            {message}
          </div>
        )}

        <div className="relative space-y-4">
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

          <form onSubmit={signInWithEmail} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-white/90">
              Email for magic link
            </label>
            <input
              id="email"
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
              className="w-full inline-flex items-center justify-center rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-50"
            >
              Send magic link
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
