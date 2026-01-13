"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabaseClient";
import { sfx } from "@/lib/sfx";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function TestModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

  function getRedirectUrl() {
    return `${window.location.origin}/auth/callback`;
  }

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getRedirectUrl() },
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
        options: { emailRedirectTo: getRedirectUrl() },
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

  if (!open) return null;

  return (
    <div
      className="fixed z-[9999] flex justify-center"
      style={{ 
        top: '10px',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div 
        className="mx-4 max-w-md w-full"
        style={{
          position: 'absolute',
          top: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-black/90 backdrop-blur-lg border border-[#19E3FF]/60 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white p-4 max-h-[70vh] overflow-y-auto"
          style={{ maxWidth: '450px', maxHeight: '400px' }}
          onClick={(e) => e.stopPropagation()}
        >
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            sfx.play('close', 0.8);
            onClose();
          }}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white/80 border border-[#19E3FF]/30 hover:bg-black/70 hover:text-white transition-colors text-xs"
        >
          ×
        </button>

        <h2 className="text-xl font-bold tracking-wider text-[#19E3FF] drop-shadow mb-1">
          WELCOME BACK TO THE HEARTVERSE {'<3'}
        </h2>
        
        <p className="text-sm text-white/80 mb-3">Choose your connection method.</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-900/20 border border-red-500/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-900/20 border border-green-500/40 p-3 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-[#19E3FF] px-3 py-2 text-xs font-semibold text-black hover:bg-[#19E3FF]/90 transition disabled:opacity-50"
          >
            CONNECT with Google
          </button>

          <div className="flex items-center text-white/50">
            <div className="flex-grow border-t border-[#19E3FF]/30" />
            <span className="mx-2 text-xs uppercase">or</span>
            <div className="flex-grow border-t border-[#19E3FF]/30" />
          </div>

          <div className="space-y-3">
            {/* Phone Login Section */}
            <form onSubmit={signInWithPhone} className="space-y-2">
              <label htmlFor="test-phone" className="block text-xs font-medium text-[#19E3FF]">
                Phone Number
              </label>
              <input
                id="test-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                className="w-full px-2 py-1.5 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none text-xs"
              />
              <button
                type="submit"
                disabled={loading || phone.length === 0}
                className="w-full inline-flex items-center justify-center rounded-lg bg-black/50 border-2 border-[#19E3FF]/60 px-3 py-1.5 text-xs font-medium text-[#19E3FF] hover:bg-[#19E3FF]/10 transition disabled:opacity-50"
              >
                CONNECT
              </button>
            </form>

            {/* Email Login Section */}
            <form onSubmit={signInWithEmail} className="space-y-2">
              <label htmlFor="test-email" className="block text-xs font-medium text-[#19E3FF]">
                Email Address
              </label>
              <input
                id="test-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-2 py-1.5 bg-black/50 border border-[#19E3FF]/30 rounded text-white placeholder-gray-400 focus:border-[#19E3FF] focus:outline-none text-xs"
              />
              <button
                type="submit"
                disabled={loading || email.length === 0}
                className="w-full inline-flex items-center justify-center rounded-lg bg-black/50 border-2 border-[#19E3FF]/60 px-3 py-1.5 text-xs font-medium text-[#19E3FF] hover:bg-[#19E3FF]/10 transition disabled:opacity-50"
              >
                CONNECT
              </button>
            </form>
          </div>
        </div>
        </motion.div>
      </div>
    </div>
  );
}
