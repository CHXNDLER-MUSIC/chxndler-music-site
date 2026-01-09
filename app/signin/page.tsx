"use client";

import { useState } from "react";
import { supabaseClient } from "../../lib/supabaseClient";

export default function SignInPage() {
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
        options: { redirectTo: getRedirectUrl("/auth/callback") },
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
        options: { emailRedirectTo: getRedirectUrl("/auth/callback?profileSetup=1") },
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
      <h1 className="text-2xl font-semibold mb-6">Join the Heartverse</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Sign in with Google
        </button>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="mx-3 text-xs uppercase text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        <form onSubmit={signInWithEmail} className="space-y-3">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email for magic link
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || email.length === 0}
            className="w-full inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  );
}
