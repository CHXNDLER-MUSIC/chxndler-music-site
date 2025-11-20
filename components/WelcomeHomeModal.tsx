"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import HeartversePopup from "@/components/HeartversePopup";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WelcomeHomeModal({ open, onClose }: Props) {
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

  if (!open) return null;

  return (
    <>
      {/* Hologram base glow - wider and stronger */}
      <div 
        className="fixed inset-0 z-[2147483646] flex items-center justify-center"
        style={{
          pointerEvents: 'none',
          paddingTop: '200px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Welcome Modal - holographic popup */}
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{
          paddingBottom: '80px'
        }}
      >
        <div
          className="welcome-hologram-container"
          style={{
            width: 'min(92vw, 700px)',
            minHeight: '40vh',
            padding: '10px 14px 14px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative'
          }}
        >
        {/* Soft bottom glow pseudo element */}
        <div 
          className="absolute"
          style={{
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '30px',
            background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
        
        {/* Top bloom glow - simulates hologram light rising through panel */}
        <div 
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '20px',
            background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center"
          style={{ 
            fontSize: '16px',
            boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
            textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
            background: 'rgba(0,255,255,0.1)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        
        {/* Header */}
        <div 
          className="text-center mb-3"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)', 
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          WELCOME HOME
        </div>
        
        {/* Thin yellow neon line */}
        <div 
          className="w-full h-px mb-4"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <p className="relative text-sm mb-2 text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)' }}>WELCOME TO THE HEARTVERSE {"<3"}</p>
        
        <p className="relative text-sm mb-3" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>CONNECT WITH OTHER ALIENS AND RECEIVE SIGNALS FOR EARLY RELEASES, SECRET TRANSMISSIONS AND EXCLUSIVE EVENTS.</p>

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

          <div className="grid grid-cols-2 gap-4">
            {/* Phone Login Section */}
            <form onSubmit={signInWithPhone} className="space-y-2">
              <label htmlFor="welcome-phone" className="block text-sm font-medium text-center" style={{ color: '#00FFFF', textShadow: '0 0 4px rgba(0,255,255,0.6)' }}>
                Phone
              </label>
              <input
                id="welcome-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                className="block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none"
                style={{
                  border: '1px solid rgba(0,255,255,0.4)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#00FFFF',
                  textShadow: '0 0 4px rgba(0,255,255,0.6)',
                  backdropFilter: 'blur(4px)'
                }}
              />
            </form>

            {/* Email Login Section */}
            <form onSubmit={signInWithEmail} className="space-y-2">
              <label htmlFor="welcome-email" className="block text-sm font-medium text-center" style={{ color: '#00FFFF', textShadow: '0 0 4px rgba(0,255,255,0.6)' }}>
                Email
              </label>
              <input
                id="welcome-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none"
                style={{
                  border: '1px solid rgba(0,255,255,0.4)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#00FFFF',
                  textShadow: '0 0 4px rgba(0,255,255,0.6)',
                  backdropFilter: 'blur(4px)'
                }}
              />
            </form>
          </div>
          
          {/* Single Send Heart Signal Button */}
          <button
            onClick={() => {
              if (phone.length > 0) {
                signInWithPhone(new Event('submit') as any);
              } else if (email.length > 0) {
                signInWithEmail(new Event('submit') as any);
              }
            }}
            disabled={loading || (phone.length === 0 && email.length === 0)}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50 mt-4"
            style={{
              background: 'rgba(0,255,255,0.15)',
              border: '1px solid rgba(0,255,255,0.5)',
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)',
              boxShadow: loading || (phone.length === 0 && email.length === 0)
                ? 'none' 
                : '0 0 15px rgba(0,255,255,0.4), 0 0 25px rgba(0,255,255,0.2)'
            }}
          >
            SEND HEART SIGNAL
          </button>
        </div>
        </div>
      </div>
    </>
  );
}