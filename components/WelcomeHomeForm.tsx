"use client";

import { useState } from "react";

export default function WelcomeHomeForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) return;
    
    setLoading(true);
    setMessage(null);

    try {
      // Submit to join API
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, phone }),
      });

      if (response.ok) {
        setMessage("Welcome to the Heartverse! We'll be in touch soon.");
        setEmail("");
        setPhone("");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendHeartSignal() {
    try {
      // Send heart signal to API
      const response = await fetch('/api/heart-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Heart signal from welcome home',
          anonymous: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message || "💖 Heart signal sent to the Heartverse!");
      } else {
        setMessage("Failed to send heart signal");
      }

      setTimeout(() => {
        setMessage(null);
      }, 3000);

    } catch (e) {
      console.error('Heart signal error:', e);
      setMessage("Failed to send heart signal");
      setTimeout(() => {
        setMessage(null);
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
    <div className="space-y-4">
      {message && (
        <div 
          className="rounded-lg border p-3 text-sm text-center"
          style={{
            backgroundColor: message.includes('💖') || message.includes('Welcome') ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            borderColor: message.includes('💖') || message.includes('Welcome') ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 107, 107, 0.3)',
            color: message.includes('💖') || message.includes('Welcome') ? '#00FFFF' : '#ff6b6b'
          }}
        >
          {message}
        </div>
      )}

      {/* Contact Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email Input */}
          <div>
            <label htmlFor="welcome-email" className="block text-sm font-medium mb-2" style={{ color: '#00FFFF', textShadow: '0 0 6px rgba(0, 255, 255, 0.5)' }}>
              Email
            </label>
            <input
              id="welcome-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 shadow-sm focus:border-[#00FFFF] focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 disabled:opacity-50"
              disabled={loading}
            />
          </div>

          {/* Phone Input */}
          <div>
            <label htmlFor="welcome-phone" className="block text-sm font-medium mb-2" style={{ color: '#00FFFF', textShadow: '0 0 6px rgba(0, 255, 255, 0.5)' }}>
              Phone
            </label>
            <input
              id="welcome-phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+1 (555) 123-4567"
              className="block w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/40 shadow-sm focus:border-[#00FFFF] focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/20 disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit Button */}
        {(email || phone) && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-6 py-3 font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            style={{
              background: 'linear-gradient(135deg, #00FFFF, #38B6FF)',
              boxShadow: loading ? 'none' : '0 0 25px rgba(0,255,255,0.5), 0 0 50px rgba(56,182,255,0.3)'
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              "CONNECT WITH HEARTVERSE"
            )}
          </button>
        )}
      </form>

      {/* Heart Signal Button */}
      <div className="flex justify-center pt-4">
        <div className="text-center">
          <p className="text-xs mb-3" style={{ color: '#00FFFF', textShadow: '0 0 6px rgba(0, 255, 255, 0.5)' }}>
            Send a heart signal
          </p>
          <button
            type="button"
            onClick={sendHeartSignal}
            className="heart-signal-btn inline-flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #00FFFF, #00E5FF, #00BFFF)',
              boxShadow: '0 0 25px rgba(0,255,255,0.6), 0 0 50px rgba(0,255,255,0.4)'
            }}
          >
            <span className="text-2xl text-white drop-shadow-lg">💖</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .heart-signal-btn:hover {
          box-shadow: 0 0 35px rgba(0,255,255,0.8), 0 0 70px rgba(0,255,255,0.6) !important;
        }
      `}</style>
    </div>
  );
}