"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AuthEmailForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
      setMessage("Check your email for a magic link");
    } catch (err: any) {
      setError(err?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40"
        required
      />
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send magic link"}
      </button>
      {message && <p className="text-green-300 text-sm">{message}</p>}
      {error && <p className="text-red-300 text-sm">{error}</p>}
    </form>
  );
}

