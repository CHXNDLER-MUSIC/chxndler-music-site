"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import SharedModal from "@/components/SharedModal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HeartCoinModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function signInWithPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      setMessage("Check your phone for a verification code.");
    } catch (e: any) {
      setError(e?.message || "Failed to send SMS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SharedModal 
      open={open} 
      onClose={onClose} 
      title="WELCOME BACK TO THE HEARTVERSE <3"
      ariaLabel="Sign in"
    >
      <p className="relative text-sm text-white/80 mb-3">Choose your connection method.</p>

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

          <div className="relative space-y-3">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-50"
            >
              CONNECT with Google
            </button>

            <div className="relative flex items-center text-white/50">
              <div className="flex-grow border-t border-white/20" />
              <span className="mx-3 text-xs uppercase">or</span>
              <div className="flex-grow border-t border-white/20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone Login Section */}
              <form onSubmit={signInWithPhone} className="space-y-2">
                <label htmlFor="login-phone" className="block text-sm font-medium text-white/90">
                  Phone Number
                </label>
                <input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                  className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || phone.length === 0}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF]/20 border-2 border-[#FC54AF]/60 px-4 py-3 text-sm font-medium text-white hover:bg-[#FC54AF]/30 transition disabled:opacity-50"
                  style={{
                    boxShadow: loading || phone.length === 0 
                      ? 'none' 
                      : '0 0 20px rgba(252,84,175,0.6), 0 0 40px rgba(252,84,175,0.4), inset 0 0 10px rgba(252,84,175,0.2)'
                  }}
                >
                  CONNECT
                </button>
              </form>

              {/* Email Login Section */}
              <form onSubmit={signInWithEmail} className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-medium text-white/90">
                  Email Address
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
                  CONNECT
                </button>
              </form>
            </div>
          </div>
    </SharedModal>
  );
}