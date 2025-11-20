"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import HeartversePopup from "@/components/HeartversePopup";
import { sfx } from "@/lib/sfx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function JoinUsPopup({ isOpen, onClose }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);

  async function createProfileWithPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    setIsSigningUp(true);

    try {
      // Step 1: Sign up with phone using OTP
      const { error: signUpError } = await supabaseClient.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
        },
      });

      if (signUpError) throw signUpError;

      setMessage("Verification code sent! Check your phone and enter the code to complete signup.");
      
      // Play success sound
      try {
        sfx.play('success', 0.7);
      } catch {}

    } catch (e: any) {
      setError(e?.message || "Failed to create profile with phone number");
      try {
        sfx.play('error', 0.5);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function sendHeartSignal() {
    try {
      sfx.play('heart', 0.8);
      
      // Create a visual heart effect
      const heartButton = document.querySelector('.heart-signal-button');
      if (heartButton) {
        heartButton.classList.add('heart-pulse');
        setTimeout(() => {
          heartButton.classList.remove('heart-pulse');
        }, 1000);
      }

      // Send heart signal to API
      const response = await fetch('/api/heart-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Heart signal from join popup',
          anonymous: true // Allow anonymous heart signals
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message || "💖 Heart signal sent to the Heartverse!");
        setHeartSignalSent(true);
      } else {
        setError("Failed to send heart signal");
      }

      setTimeout(() => {
        setMessage(null);
        setError(null);
        setHeartSignalSent(false);
      }, 3000);

    } catch (e: any) {
      console.error('Heart signal error:', e);
      setError("Failed to send heart signal");
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  }

  function formatPhoneNumber(value: string) {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX for US numbers
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `+1 (${phoneNumber}`;
    if (phoneNumber.length <= 6) return `+1 (${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `+1 (${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  }

  return (
    <HeartversePopup 
      isOpen={isOpen} 
      onClose={onClose} 
      title="JOIN THE HEARTVERSE 💖"
    >
      <div className="space-y-6">
        <p className="text-sm text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
          Enter your phone number to create your Heartverse profile and start your journey!
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        
        {message && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-300">
            {message}
          </div>
        )}

        {/* Phone Number Signup Form */}
        <form onSubmit={createProfileWithPhone} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="join-phone" className="block text-sm font-medium text-white/90">
              Phone Number
            </label>
            <input
              id="join-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+1 (555) 123-4567"
              required
              disabled={loading}
              className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 shadow-sm focus:border-[#FC54AF] focus:outline-none focus:ring-2 focus:ring-[#FC54AF]/20 disabled:opacity-50"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || phone.length < 14} // +1 (XXX) XXX-XXXX = 14 chars minimum
            className="w-full rounded-lg bg-gradient-to-r from-[#FC54AF] to-[#38B6FF] px-6 py-3 text-lg font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FC54AF]/30 disabled:opacity-50 disabled:hover:scale-100"
            style={{
              boxShadow: loading || phone.length < 14 
                ? 'none' 
                : '0 0 30px rgba(252,84,175,0.5), 0 0 60px rgba(56,182,255,0.3)'
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Creating Profile...</span>
              </div>
            ) : (
              "CREATE HEARTVERSE PROFILE"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-white/20" />
          <span className="mx-4 text-xs uppercase text-white/50 bg-black px-2">or</span>
          <div className="flex-grow border-t border-white/20" />
        </div>

        {/* Heart Signal Button */}
        <div className="text-center">
          <p className="text-xs mb-3" style={{ color: '#00FFFF', textShadow: '0 0 6px rgba(0, 255, 255, 0.5)' }}>
            Send a heart signal to connect with the Heartverse community
          </p>
          <button
            type="button"
            onClick={sendHeartSignal}
            className="heart-signal-button mx-auto inline-flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #00FFFF, #00E5FF, #00BFFF)',
              boxShadow: '0 0 25px rgba(0,255,255,0.6), 0 0 50px rgba(0,255,255,0.4)',
              width: heartSignalSent ? 'auto' : '4rem',
              height: heartSignalSent ? 'auto' : '4rem',
              padding: heartSignalSent ? '0.75rem 1.5rem' : '0',
              minWidth: heartSignalSent ? '200px' : '4rem',
            }}
          >
            {heartSignalSent ? (
              <span className="text-sm font-semibold text-white drop-shadow-lg whitespace-nowrap">
                Heart signal sent to the Heartverse!
              </span>
            ) : (
              <span className="text-2xl text-white drop-shadow-lg">💖</span>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .heart-signal-button.heart-pulse {
          animation: heartPulse 1s ease-in-out;
        }
        
        @keyframes heartPulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 25px rgba(0,255,255,0.6), 0 0 50px rgba(0,255,255,0.4);
          }
          25% { 
            transform: scale(1.2);
            box-shadow: 0 0 35px rgba(0,255,255,0.8), 0 0 70px rgba(0,255,255,0.6);
          }
          50% { 
            transform: scale(1.15);
            box-shadow: 0 0 40px rgba(0,255,255,0.9), 0 0 80px rgba(0,255,255,0.7);
          }
          75% { 
            transform: scale(1.25);
            box-shadow: 0 0 35px rgba(0,255,255,0.8), 0 0 70px rgba(0,255,255,0.6);
          }
        }
      `}</style>
    </HeartversePopup>
  );
}