"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import HeartversePopup from "@/components/HeartversePopup";
import VenmoButton from "@/components/VenmoButton";
import { sfx } from "@/lib/sfx";
// npm install libphonenumber-js
import { parsePhoneNumberFromString } from "libphonenumber-js";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
};

export default function JoinUsPopup({ isOpen, onClose, onOpenChat }: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [signupMethod, setSignupMethod] = useState<"phone" | "email">("phone");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Clear phone number when popup opens or when showPhonePopup changes
  useEffect(() => {
    if (showPhonePopup) {
      setPhoneNumber("");
    }
  }, [showPhonePopup]);

  // Clear main phone state when popup opens or signup method changes
  useEffect(() => {
    if (isOpen) {
      setPhone("");
      setPhoneNumber("");
      setError(null);
      setMessage(null);
    }
  }, [isOpen, signupMethod]);

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
      console.log('🚀 Redirect URL will be:', window.location.origin + '/auth/callback?profileSetup=1');

      // Sign up with email and redirect to auth callback for name prompt
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password: 'temppassword123', // Temporary password
        options: { 
          emailRedirectTo: window.location.origin + '/auth/callback?profileSetup=1',
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

  async function submitPhoneNumber(phone: string) {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/submit-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        try {
          sfx.play('success', 0.7);
        } catch {}
        
        // Clear phone number after successful submission
        setPhoneNumber("");
        
        // Close popup after a delay
        setTimeout(() => {
          setShowPhonePopup(false);
          setMessage(null);
        }, 3000);
      } else {
        setError(result.error || "Failed to save phone number");
        try {
          sfx.play('error', 0.5);
        } catch {}
      }

    } catch (e: any) {
      console.error('Phone submission error:', e);
      setError("Failed to save phone number. Please try again.");
      try {
        sfx.play('error', 0.5);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  // Country data for selector
  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' }
  ];

  // Country mapping for detected countries
  const countryNames: { [key: string]: string } = {
    'US': 'United States',
    'CA': 'Canada', 
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'AU': 'Australia',
    'JP': 'Japan',
    'BR': 'Brazil',
    'IN': 'India',
    'MX': 'Mexico',
    'BO': 'Bolivia',
    'AR': 'Argentina',
    'CN': 'China',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark'
  };

  // International phone number country configurations
  const phoneConfigs = {
    US: { code: '+1', format: '(XXX) XXX-XXXX', minLength: 10, maxLength: 10 },
    CA: { code: '+1', format: '(XXX) XXX-XXXX', minLength: 10, maxLength: 10 },
    GB: { code: '+44', format: 'XXXX XXX XXXX', minLength: 10, maxLength: 11 },
    DE: { code: '+49', format: 'XXX XXXX XXXX', minLength: 10, maxLength: 12 },
    FR: { code: '+33', format: 'X XX XX XX XX', minLength: 9, maxLength: 9 },
    AU: { code: '+61', format: 'XXX XXX XXX', minLength: 9, maxLength: 9 },
    JP: { code: '+81', format: 'XXX XXXX XXXX', minLength: 10, maxLength: 11 },
    BR: { code: '+55', format: '(XX) XXXXX-XXXX', minLength: 11, maxLength: 11 },
    IN: { code: '+91', format: 'XXXXX XXXXX', minLength: 10, maxLength: 10 },
    MX: { code: '+52', format: 'XXX XXX XXXX', minLength: 10, maxLength: 10 }
  };

  // Simple phone number handler that preserves all digits
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow only + symbol and digits
    const cleaned = raw.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  }

  function handlePhoneNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow only digits, +, spaces, and -
    if (/^[0-9+\-\s]*$/.test(value)) {
      setPhoneNumber(value);
      
      // Auto-detect country using libphonenumber-js
      const parsed = parsePhoneNumberFromString(value);
      if (parsed && parsed.country) {
        setDetectedCountry(parsed.country); // ISO 2 code like "US", "BO", "GB"
      } else {
        setDetectedCountry(null);
      }
    }
  }

  function getPhoneValidation(country: string = 'US') {
    const config = phoneConfigs[country] || phoneConfigs.US;
    // Just check for minimum number of digits
    return { minLength: config.minLength, maxLength: config.maxLength, minFormattedLength: config.minLength };
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
            {/* Country Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  // Clear phone number when country changes to avoid confusion
                  setPhone('');
                }}
                className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white shadow-sm focus:border-[#FC54AF] focus:outline-none focus:ring-2 focus:ring-[#FC54AF]/20"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code} className="bg-black text-white">
                    {country.flag} {country.name} ({phoneConfigs[country.code]?.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="join-phone" className="block text-sm font-medium text-white/90">
                Phone Number
              </label>
              <input
                id="join-phone"
                key={`main-phone-input-${selectedCountry}`}
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder={`${phoneConfigs[selectedCountry]?.code}1234567890`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                disabled={loading}
                className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 shadow-sm focus:border-[#FC54AF] focus:outline-none focus:ring-2 focus:ring-[#FC54AF]/20 disabled:opacity-50"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < getPhoneValidation(selectedCountry).minLength}
              className="w-full rounded-lg bg-gradient-to-r from-[#FC54AF] to-[#38B6FF] px-6 py-3 text-lg font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FC54AF]/30 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                boxShadow: loading || phone.replace(/\D/g, '').length < getPhoneValidation(selectedCountry).minLength
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
                  border: '2px solid #F2EF1D',
                  boxShadow: heartSignalSent
                    ? '0 0 25px rgba(0,255,0,0.8), 0 0 50px rgba(0,255,0,0.6)'
                    : '0 0 25px rgba(242,239,29,0.6), 0 0 50px rgba(242,239,29,0.4)',
                  width: heartSignalSent ? 'auto' : '4rem',
                  height: heartSignalSent ? 'auto' : '4rem',
                  padding: heartSignalSent ? '0.75rem 2rem' : '0',
                  minWidth: heartSignalSent ? '280px' : '4rem',
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
            <div className="absolute right-12 top-3 bg-black/90 border-2 border-cyan-400 rounded-lg p-4 w-48 z-50"
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
              <div className="absolute left-[-8px] top-7 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-cyan-400"></div>
            </div>
          )}
        </div>

        {/* Phone button in top left of popup */}
        <div className="absolute top-4 left-4">
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl"
            style={{
              boxShadow: '0 0 20px rgba(0, 255, 255, 0.6)',
              border: '2px solid rgba(0, 255, 255, 0.8)'
            }}
            onClick={() => {
              if (onOpenChat) {
                onOpenChat();
                onClose(); // Close the join popup when opening chat
              } else {
                setShowPhonePopup(true);
              }
              try {
                sfx.play('click', 0.5);
              } catch {}
            }}
            aria-label={onOpenChat ? "Open Chat" : "Phone"}
          >
            {onOpenChat ? (
              // Chat icon using SVG
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" style={{ color: 'white' }}>
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.5 1.33 4.74 3.41 6.4L4 22l4.92-1.5C10.22 20.84 11.1 21 12 21c5.52 0 10-3.58 10-8S17.52 3 12 3zm0 14c-.83 0-1.64-.14-2.39-.4L6 18l1.41-2.6C6.52 14.64 6 12.87 6 11c0-2.21 2.69-4 6-4s6 1.79 6 4-2.69 4-6 4z"/>
                <circle cx="9" cy="11" r="1"/>
                <circle cx="12" cy="11" r="1"/>
                <circle cx="15" cy="11" r="1"/>
              </svg>
            ) : (
              <img 
                src="/audio/phone.png" 
                alt="Phone" 
                className="w-8 h-8 object-contain filter brightness-0 invert"
                style={{
                  filter: 'brightness(0) invert(1)',
                }}
              />
            )}
          </button>

          {/* Phone popup - using signal lost styling */}
          {showPhonePopup && (
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '0px',
                width: '280px',
                height: 'auto',
                margin: '0',
                padding: '15px 20px 20px 20px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
                zIndex: 50,
                boxSizing: 'border-box'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPhonePopup(false)}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '24px',
                  height: '24px',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '2px solid #00FFFF',
                  borderRadius: '50%',
                  color: '#00FFFF',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0, 255, 255, 0.1)';
                }}
              >
                ×
              </button>
              {/* Header Text */}
              <div 
                style={{ 
                  textAlign: 'center', 
                  marginBottom: '12px',
                  color: '#00FFFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  textShadow: '0 0 12px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.6)'
                }}
              >
                Stay connected to the Heartverse
              </div>

              {/* Country Selector */}
              <div style={{ marginBottom: '12px' }}>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    // Clear phone number when country changes to avoid confusion
                    setPhoneNumber('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid #00FFFF',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxShadow: '0 0 8px rgba(0, 255, 255, 0.3)'
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code} style={{ background: '#000', color: '#fff' }}>
                      {country.flag} {country.name} ({phoneConfigs[country.code]?.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Number Input */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  key={`phone-input-${selectedCountry}`}
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="+1 555-555-5555"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid #00FFFF',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 200ms ease',
                    boxShadow: '0 0 8px rgba(0, 255, 255, 0.3)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#00FFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#00FFFF';
                    e.target.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.3)';
                  }}
                />

                {/* Country detection and validation display */}
                {detectedCountry ? (
                  <p style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#87CEEB',
                    textAlign: 'left'
                  }}>
                    Detected country: {countryNames[detectedCountry] || detectedCountry}
                  </p>
                ) : phoneNumber.length > 0 && (() => {
                  const digitsOnly = phoneNumber.replace(/\D/g, '');
                  const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                  return !isValidPhone ? (
                    <p style={{
                      marginTop: '8px',
                      color: '#FC54AF',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}>
                      Please enter a valid phone number.
                    </p>
                  ) : (
                    <p style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#87CEEB',
                      textAlign: 'left'
                    }}>
                      Outside the US? Add your full country code.
                    </p>
                  );
                })()}
              </div>

              {/* Submit Phone Button */}
              <button
                onClick={() => {
                  const digitsOnly = phoneNumber.replace(/\D/g, '');
                  const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                  if (isValidPhone && !loading) {
                    submitPhoneNumber(phoneNumber.trim());
                  }
                }}
                disabled={(() => {
                  const digitsOnly = phoneNumber.replace(/\D/g, '');
                  const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                  return !isValidPhone || loading;
                })()}
                style={{
                  width: 'auto',
                  minWidth: '140px',
                  maxWidth: '180px',
                  padding: '12px 20px',
                  background: 'transparent',
                  border: (() => {
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                    return (!isValidPhone || loading) ? '2px solid rgba(128, 128, 128, 0.3)' : '2px solid #00FFFF';
                  })(),
                  borderRadius: '8px',
                  color: (() => {
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                    return (!isValidPhone || loading) ? 'rgba(128, 128, 128, 0.7)' : '#00FFFF';
                  })(),
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (() => {
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                    return (!isValidPhone || loading) ? 'not-allowed' : 'pointer';
                  })(),
                  transition: 'all 300ms ease',
                  boxShadow: (() => {
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                    return (!isValidPhone || loading) ? 'none' : '0 0 15px rgba(0, 255, 255, 0.3)';
                  })(),
                  textShadow: (() => {
                    const digitsOnly = phoneNumber.replace(/\D/g, '');
                    const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                    return (!isValidPhone || loading) ? 'none' : '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF';
                  })(),
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  const digitsOnly = phoneNumber.replace(/\D/g, '');
                  const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                  if (isValidPhone && !loading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.background = 'rgba(0, 255, 255, 0.15)';
                    e.target.style.boxShadow = '0 0 40px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4), inset 0 0 30px rgba(0, 255, 255, 0.2)';
                    e.target.style.textShadow = '0 0 15px #00FFFF, 0 0 25px #00FFFF, 0 0 35px #00FFFF, 0 0 45px #00FFFF';
                    e.target.style.borderColor = '#00E5FF';
                    try { sfx.play('hover.mp3', 0.3); } catch {}
                  }
                }}
                onMouseLeave={(e) => {
                  const digitsOnly = phoneNumber.replace(/\D/g, '');
                  const isValidPhone = digitsOnly.length >= 7 && digitsOnly.length <= 20;
                  if (isValidPhone && !loading) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.background = 'transparent';
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
                    e.target.style.textShadow = '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF';
                    e.target.style.borderColor = '#00FFFF';
                  }
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(0, 255, 255, 0.3)',
                      borderTop: '2px solid #00FFFF',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Saving...
                  </div>
                ) : (
                  'Send Heart Signal'
                )}
              </button>
              
              {/* Arrow pointing down to button */}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '24px',
                width: '0',
                height: '0',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid #00FFFF'
              }}></div>
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
            box-shadow: 0 0 25px rgba(242,239,29,0.6), 0 0 50px rgba(242,239,29,0.4);
          }
          25% { 
            transform: scale(1.2);
            box-shadow: 0 0 35px rgba(242,239,29,0.8), 0 0 70px rgba(242,239,29,0.6);
          }
          50% { 
            transform: scale(1.15);
            box-shadow: 0 0 40px rgba(242,239,29,0.9), 0 0 80px rgba(242,239,29,0.7);
          }
          75% { 
            transform: scale(1.25);
            box-shadow: 0 0 35px rgba(242,239,29,0.8), 0 0 70px rgba(242,239,29,0.6);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </HeartversePopup>

  );
}
