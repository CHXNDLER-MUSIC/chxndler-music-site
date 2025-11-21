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
  const [showTipPopup, setShowTipPopup] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"venmo" | "credit" | null>(null);

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

        {/* Dollar sign button at bottom right corner */}
        <button
          type="button"
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black font-bold text-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl"
          style={{
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)',
            border: '2px solid rgba(255, 215, 0, 0.8)'
          }}
          onClick={() => {
            setShowTipPopup(true);
            try {
              sfx.play('card-ding', 0.7);
            } catch {}
          }}
          aria-label="Dollar action"
        >
          $
        </button>
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

    {/* Tip Popup */}
    {showTipPopup && (
      <HeartversePopup 
        isOpen={showTipPopup} 
        onClose={() => {
          setShowTipPopup(false);
          setSelectedTipAmount(null);
          setCustomAmount("");
          setShowCustomInput(false);
          setSelectedPaymentMethod(null);
        }} 
        title="TIP CHXNLDER THE ALIEN 💸"
        positioning="higher"
      >
        <div className="space-y-6">
          <p className="text-sm text-center" style={{ color: '#00FF00', textShadow: '0 0 10px rgba(0, 255, 0, 0.8)' }}>
            Show some love with a tip! Choose your amount and payment method.
          </p>

          {/* Tip Amount Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
              Select Tip Amount
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setSelectedTipAmount(1);
                  setShowCustomInput(false);
                  setCustomAmount("");
                }}
                className={`tip-button ${selectedTipAmount === 1 ? 'selected' : ''}`}
              >
                $1
              </button>
              <button
                onClick={() => {
                  setSelectedTipAmount(3);
                  setShowCustomInput(false);
                  setCustomAmount("");
                }}
                className={`tip-button ${selectedTipAmount === 3 ? 'selected' : ''}`}
              >
                $3
              </button>
              <button
                onClick={() => {
                  setSelectedTipAmount(null);
                  setShowCustomInput(true);
                  setCustomAmount("");
                }}
                className={`tip-button ${showCustomInput ? 'selected' : ''}`}
              >
                CUSTOM
              </button>
            </div>

            {showCustomInput && (
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#00FF00' }}>
                  Custom Amount
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                  }}
                  placeholder="Enter custom amount..."
                  min="1"
                  step="0.01"
                  className="w-full rounded-lg border-2 bg-black/40 px-4 py-3 text-white placeholder-white/50 focus:outline-none custom-amount-input"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          {(selectedTipAmount || customAmount) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
                Payment Method
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod("venmo")}
                  className={`payment-button venmo-button ${selectedPaymentMethod === "venmo" ? 'selected' : ''}`}
                >
                  <span className="text-2xl mr-3">📱</span>
                  Venmo (@CHXNLDER-THE-ALIEN)
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("credit")}
                  className={`payment-button credit-button ${selectedPaymentMethod === "credit" ? 'selected' : ''}`}
                >
                  <span className="text-2xl mr-3">💳</span>
                  Credit Card
                </button>
              </div>
            </div>
          )}

          {/* Proceed Button */}
          {selectedPaymentMethod && (selectedTipAmount || customAmount) && (
            <button
              onClick={() => {
                const amount = selectedTipAmount || parseFloat(customAmount);
                if (selectedPaymentMethod === "venmo") {
                  // Open Venmo with pre-filled amount
                  window.open(`https://venmo.com/u/CHXNLDER-THE-ALIEN?txn=pay&amount=${amount}&note=Tip for CHXNLDER THE ALIEN`, '_blank');
                } else {
                  // Handle credit card payment (placeholder for now)
                  alert(`Credit card payment for $${amount} coming soon!`);
                }
              }}
              className="w-full proceed-button"
            >
              {selectedPaymentMethod === "venmo" ? "Open Venmo" : "Pay with Card"} - ${selectedTipAmount || customAmount}
            </button>
          )}
        </div>

        <style jsx>{`
          .tip-button {
            padding: 1rem 2rem;
            border-radius: 12px;
            font-size: 1.5rem;
            font-weight: bold;
            background: transparent;
            border: 2px solid #00FF00;
            color: #00FF00;
            cursor: pointer;
            transition: all 0.3s ease;
            text-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
          }

          .tip-button:hover {
            transform: scale(1.05);
            box-shadow: 0 0 25px rgba(0, 255, 0, 0.5);
            text-shadow: 0 0 12px rgba(0, 255, 0, 0.8);
          }

          .tip-button.selected {
            background: rgba(0, 255, 0, 0.2);
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.7);
            text-shadow: 0 0 15px rgba(0, 255, 0, 1);
          }

          .custom-amount-input {
            border-color: #00FF00;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
          }

          .custom-amount-input:focus {
            border-color: #00FFFF;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
          }

          .payment-button {
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: bold;
            background: transparent;
            border: 2px solid;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .venmo-button {
            border-color: #3D95CE;
            color: #3D95CE;
            text-shadow: 0 0 8px rgba(61, 149, 206, 0.6);
            box-shadow: 0 0 15px rgba(61, 149, 206, 0.3);
          }

          .venmo-button:hover {
            transform: scale(1.02);
            box-shadow: 0 0 25px rgba(61, 149, 206, 0.5);
            text-shadow: 0 0 12px rgba(61, 149, 206, 0.8);
          }

          .venmo-button.selected {
            background: rgba(61, 149, 206, 0.2);
            box-shadow: 0 0 30px rgba(61, 149, 206, 0.7);
          }

          .credit-button {
            border-color: #FFD700;
            color: #FFD700;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
          }

          .credit-button:hover {
            transform: scale(1.02);
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.5);
            text-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
          }

          .credit-button.selected {
            background: rgba(255, 215, 0, 0.2);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.7);
          }

          .proceed-button {
            padding: 1rem 2rem;
            border-radius: 12px;
            font-size: 1.2rem;
            font-weight: bold;
            background: linear-gradient(135deg, #FF1493, #FF69B4);
            border: 2px solid #FF1493;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            text-shadow: 0 0 8px rgba(255, 20, 147, 0.6);
            box-shadow: 0 0 25px rgba(255, 20, 147, 0.5);
          }

          .proceed-button:hover {
            transform: scale(1.05);
            box-shadow: 0 0 35px rgba(255, 20, 147, 0.7);
            text-shadow: 0 0 12px rgba(255, 20, 147, 0.8);
          }
        `}</style>
      </HeartversePopup>
    )}
  );
}