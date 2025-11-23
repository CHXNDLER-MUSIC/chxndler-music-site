"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import HeartversePopup from "@/components/HeartversePopup";
import VenmoButton from "@/components/VenmoButton";
import { sfx } from "@/lib/sfx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function JoinUsPopup({ isOpen, onClose }: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [signupMethod, setSignupMethod] = useState<"phone" | "email">("phone");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);

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

  async function createProfileWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    setIsSigningUp(true);

    try {
      console.log('🚀 Starting email signup for:', email);
      console.log('🚀 Redirect URL will be:', window.location.origin + '/auth/callback');

      // Sign up with email and redirect to auth callback for name prompt
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password: 'temppassword123', // Temporary password
        options: { 
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });

      console.log('🚀 Signup response:', { data, error: signUpError });

      if (signUpError) throw signUpError;

      setMessage(`✅ Email sent to ${email}! Check your inbox and click the confirmation link to join the Heartverse. You'll be prompted to set your name after confirming.`);
      
      // Play success sound
      try {
        sfx.play('success', 0.7);
      } catch {}

    } catch (e: any) {
      setError(e?.message || "Failed to send confirmation email");
      try {
        sfx.play('error', 0.5);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function sendHeartSignal() {
    try {
      sfx.play('join-alien', 0.8);
      
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
          Choose your preferred signup method to create your Heartverse profile and start your journey!
        </p>

        {/* Signup Method Selector */}
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          <button
            type="button"
            onClick={() => setSignupMethod("phone")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
              signupMethod === "phone"
                ? "bg-[#FC54AF]/20 text-[#FC54AF] border-r border-[#FC54AF]/30"
                : "bg-black/20 text-white/70 border-r border-white/20 hover:text-white"
            }`}
          >
            📱 Phone Number
          </button>
          <button
            type="button"
            onClick={() => setSignupMethod("email")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
              signupMethod === "email"
                ? "bg-[#38B6FF]/20 text-[#38B6FF]"
                : "bg-black/20 text-white/70 hover:text-white"
            }`}
          >
            📧 Email Address
          </button>
        </div>

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
        {signupMethod === "phone" && (
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
        )}

        {/* Email Signup Form */}
        {signupMethod === "email" && (
          <form onSubmit={createProfileWithEmail} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="join-email" className="block text-sm font-medium text-white/90">
                Email Address
              </label>
              <input
                id="join-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none focus:ring-2 focus:ring-[#38B6FF]/20 disabled:opacity-50"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-[#38B6FF] to-[#FC54AF] px-6 py-3 text-lg font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38B6FF]/30 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                boxShadow: loading || !email.trim()
                  ? 'none' 
                  : '0 0 30px rgba(56,182,255,0.5), 0 0 60px rgba(252,84,175,0.3)'
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Sending Email...</span>
                </div>
              ) : (
                "SEND CONFIRMATION EMAIL"
              )}
            </button>
          </form>
        )}

        {/* Heart Signal Section - Only show if no signup method active or after signup completion */}
        {(!isSigningUp && !message) && (
          <>
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
                  background: heartSignalSent 
                    ? 'linear-gradient(135deg, #00FF00, #00FF7F, #32FF32)' 
                    : 'linear-gradient(135deg, #00FFFF, #00E5FF, #00BFFF)',
                  boxShadow: heartSignalSent
                    ? '0 0 25px rgba(0,255,0,0.8), 0 0 50px rgba(0,255,0,0.6)'
                    : '0 0 25px rgba(0,255,255,0.6), 0 0 50px rgba(0,255,255,0.4)',
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
          </>
        )}

        {/* Simple $5 button with inline popup */}
        <div className="absolute top-4 left-16">
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black font-bold text-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl relative"
            style={{
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
              border: '2px solid rgba(255, 215, 0, 0.8)'
            }}
            onClick={() => {
              setShowVenmoPopup(!showVenmoPopup);
              try {
                sfx.play('card-ding', 0.7);
              } catch {}
            }}
            aria-label="Send $5 tip"
          >
            $5
          </button>

          {/* New simple popup */}
          {showVenmoPopup && (
            <div className="absolute right-12 top-0 bg-black/90 border-2 border-cyan-400 rounded-lg p-4 w-48 z-50"
                 style={{
                   boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                   backdropFilter: 'blur(10px)'
                 }}>
              <div className="text-center space-y-3">
                <p className="text-white text-sm font-semibold">Send $5 Tip</p>
                <p className="text-cyan-400 text-xs">@chxndlerthealien</p>
                
                <button
                  onClick={() => {
                    try {
                      // Use the specific $5 Venmo URL
                      const venmoUrl = 'https://venmo.com/CHXNDLERTHEALIEN?txn=pay&amount=5&note=Boost%20the%20Transmission';
                      window.open(venmoUrl, '_blank');
                      
                      setShowVenmoPopup(false);
                    } catch (error) {
                      console.error('Venmo open error:', error);
                    }
                  }}
                  className="w-full px-3 py-2 bg-cyan-500 text-black rounded font-semibold hover:bg-cyan-400 transition-colors"
                >
                  💙 VENMO
                </button>
              </div>
              
              {/* Arrow pointing left to button */}
              <div className="absolute left-[-8px] top-4 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-cyan-400"></div>
            </div>
          )}
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