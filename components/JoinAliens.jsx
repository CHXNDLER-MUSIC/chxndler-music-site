"use client";

import React, { useState, useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";

export default function JoinAliens({ visible = true } = {}) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  
  // Countdown state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [scrambledTime, setScrambledTime] = useState("0:00");
  const [isScrambling, setIsScrambling] = useState(false);
  const countdownRef = useRef(null);
  const scrambleRef = useRef(null);

  // Calculate time until specific target date: 11/28/25 12:00:00
  const getTimeUntilTargetDate = () => {
    const now = new Date();
    // Target date: November 28, 2025 at 12:00:00 (noon)
    const targetDate = new Date('2025-11-28T12:00:00');
    
    // Calculate difference in seconds
    const diffMs = targetDate.getTime() - now.getTime();
    
    // If target date has passed, return 0
    if (diffMs <= 0) {
      return 0;
    }
    
    return Math.floor(diffMs / 1000);
  };

  // Scrambling effect for numbers
  const scrambleNumber = (targetTime) => {
    setIsScrambling(true);
    let scrambleCount = 0;
    const maxScrambles = 8; // Number of scramble iterations
    
    scrambleRef.current = setInterval(() => {
      if (scrambleCount < maxScrambles) {
        // Generate random scrambled time format
        const randomDays = Math.floor(Math.random() * 99);
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        const randomSeconds = Math.floor(Math.random() * 60);
        
        // Create scrambled display with random numbers
        const scrambledDisplay = `${randomDays}d ${randomHours}h ${randomMinutes}m ${randomSeconds}s`;
        setScrambledTime(scrambledDisplay);
        scrambleCount++;
      } else {
        // Show actual time
        setScrambledTime(formatTimeRemaining(targetTime));
        setIsScrambling(false);
        clearInterval(scrambleRef.current);
      }
    }, 50); // Fast scrambling
  };

  // Countdown timer for reconnection
  const startCountdown = () => {
    const initialTime = getTimeUntilTargetDate();
    setTimeRemaining(initialTime);
    setScrambledTime(formatTimeRemaining(initialTime));
    
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          // Target date reached!
          clearInterval(countdownRef.current);
          if (scrambleRef.current) clearInterval(scrambleRef.current);
          return 0;
        }
        
        // Trigger scramble effect every second
        scrambleNumber(newTime);
        return newTime;
      });
    }, 1000);
  };

  // Format time remaining for display (supports days, hours, minutes)
  const formatTimeRemaining = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else {
      return `${minutes}m ${secs}s`;
    }
  };

  // Start countdown when component becomes visible
  useEffect(() => {
    if (visible) {
      startCountdown();
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (scrambleRef.current) {
        clearInterval(scrambleRef.current);
      }
    };
  }, [visible]);

  function formatPhoneNumber(value) {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX for US numbers
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `+1 (${phoneNumber}`;
    if (phoneNumber.length <= 6) return `+1 (${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `+1 (${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }

  function handlePhoneChange(e) {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  }

  async function sendHeartSignal() {
    if (!phone || phone.length < 14) {
      setError("Please enter a valid phone number");
      try { sfx.play('error', 0.5); } catch {}
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      sfx.play('heart', 0.8);
      
      // Send heart signal to API
      const response = await fetch('/api/heart-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          message: 'Heart signal from signal pop-out',
          anonymous: false
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message || "💖 Heart signal sent to the Heartverse!");
        setHeartSignalSent(true);
        setPhone(""); // Clear phone after successful send
        try { sfx.play('success', 0.7); } catch {}
      } else {
        setError("Failed to send heart signal");
        try { sfx.play('error', 0.5); } catch {}
      }

      setTimeout(() => {
        setMessage(null);
        setError(null);
        setHeartSignalSent(false);
      }, 3000);

    } catch (e) {
      console.error('Heart signal error:', e);
      setError("Failed to send heart signal");
      try { sfx.play('error', 0.5); } catch {}
      setTimeout(() => {
        setError(null);
        setHeartSignalSent(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className={`${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} 
      style={{ 
        zIndex: 130, 
        position: 'relative', 
        pointerEvents: visible ? 'auto' : 'none', 
        width: '100%',
        height: '100%',
        margin: '0',
        padding: '20px 60px',
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(12px)',
        border: 'none',
        borderRadius: 'inherit',
        boxShadow: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 300ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Countdown Section - Top */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        {/* Neon "Signal Lost" message */}
        <div style={{ marginBottom: '16px' }}>
          <h2 
            style={{
              color: '#FC54AF',
              textShadow: `
                0 0 5px #FC54AF,
                0 0 10px #FC54AF,
                0 0 15px #FC54AF,
                0 0 20px #FC54AF,
                0 0 35px #FC54AF,
                0 0 40px #FC54AF
              `,
              animation: 'neonFlicker 2s infinite alternate',
              fontSize: 'clamp(18px, 4vw, 28px)',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              margin: '0 0 12px 0',
              lineHeight: '1.2'
            }}
          >
            SIGNAL LOST
          </h2>
          <div 
            style={{
              color: isScrambling ? '#FF00FF' : '#00FFFF',
              textShadow: isScrambling ? `
                0 0 5px #FF00FF,
                0 0 10px #FF00FF,
                0 0 15px #FF00FF,
                0 0 20px #FF00FF
              ` : `
                0 0 5px #00FFFF,
                0 0 10px #00FFFF,
                0 0 15px #00FFFF,
                0 0 20px #00FFFF
              `,
              animation: isScrambling ? 'neonScramble 0.1s infinite' : 'neonPulse 1.5s infinite',
              transition: 'all 0.05s ease',
              fontSize: 'clamp(12px, 3vw, 16px)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              lineHeight: '1.3'
            }}
          >
            Reconnecting in {scrambledTime}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ 
        width: '100%', 
        height: '1px', 
        background: 'linear-gradient(90deg, transparent, rgba(252, 84, 175, 0.5), transparent)', 
        margin: '16px 0 8px 0' 
      }} />

      {/* Stay Connected Section - Bottom */}
      <div style={{ marginTop: '0px' }}>
        {/* Header Text */}
        <div 
          style={{ 
            textAlign: 'center', 
            marginBottom: '12px',
            color: '#FC54AF',
            fontSize: '16px',
            fontWeight: '600',
            textShadow: '0 0 8px rgba(252, 84, 175, 0.6)'
          }}
        >
          Stay connected to the Heartverse.
        </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '8px',
          color: '#ff6b6b',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: 'rgba(0, 255, 0, 0.1)',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          borderRadius: '8px',
          color: '#4ade80',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {/* Phone Number Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          id="signal-phone"
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="+1 (555) 123-4567"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(252, 84, 175, 0.4)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 200ms ease',
            '&:focus': {
              borderColor: '#FC54AF'
            }
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#FC54AF';
            e.target.style.boxShadow = '0 0 0 2px rgba(252, 84, 175, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(252, 84, 175, 0.4)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Send Heart Signal Button */}
      <button
        onClick={sendHeartSignal}
        disabled={loading || phone.length < 14}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: 'transparent',
          border: loading || phone.length < 14 
            ? '2px solid rgba(128, 128, 128, 0.3)' 
            : '2px solid #FC54AF',
          borderRadius: '8px',
          color: loading || phone.length < 14 
            ? 'rgba(128, 128, 128, 0.7)' 
            : '#FC54AF',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || phone.length < 14 ? 'not-allowed' : 'pointer',
          transition: 'all 300ms ease',
          boxShadow: loading || phone.length < 14 
            ? 'none' 
            : '0 0 15px rgba(252, 84, 175, 0.3)',
          textShadow: loading || phone.length < 14 
            ? 'none' 
            : '0 0 10px #FC54AF, 0 0 20px #FC54AF, 0 0 30px #FC54AF',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (!loading && phone.length >= 14) {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.background = 'rgba(252, 84, 175, 0.15)';
            e.target.style.boxShadow = '0 0 40px rgba(252, 84, 175, 0.8), 0 0 60px rgba(252, 84, 175, 0.4), inset 0 0 30px rgba(252, 84, 175, 0.2)';
            e.target.style.textShadow = '0 0 15px #FC54AF, 0 0 25px #FC54AF, 0 0 35px #FC54AF, 0 0 45px #FC54AF';
            e.target.style.borderColor = '#FF1B8D';
            try { sfx.play('hover.mp3', 0.3); } catch {}
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && phone.length >= 14) {
            e.target.style.transform = 'translateY(0)';
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
            e.target.style.textShadow = '0 0 10px #FC54AF, 0 0 20px #FC54AF, 0 0 30px #FC54AF';
            e.target.style.borderColor = '#FC54AF';
          }
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            Sending...
          </div>
        ) : heartSignalSent ? (
          "Heart signal sent to the Heartverse!"
        ) : (
          "Send Heart Signal"
        )}
      </button>
      </div> {/* Close Stay Connected Section */}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes neonFlicker {
          0%, 100% {
            text-shadow: 
              0 0 5px #FF073A,
              0 0 10px #FF073A,
              0 0 15px #FF073A,
              0 0 20px #FF073A,
              0 0 35px #FF073A,
              0 0 40px #FF073A;
          }
          50% {
            text-shadow: 
              0 0 2px #FF073A,
              0 0 5px #FF073A,
              0 0 8px #FF073A,
              0 0 12px #FF073A,
              0 0 20px #FF073A,
              0 0 25px #FF073A;
          }
        }
        
        @keyframes neonPulse {
          0%, 100% {
            text-shadow: 
              0 0 5px #00FFFF,
              0 0 10px #00FFFF,
              0 0 15px #00FFFF,
              0 0 20px #00FFFF;
          }
          50% {
            text-shadow: 
              0 0 2px #00FFFF,
              0 0 5px #00FFFF,
              0 0 8px #00FFFF,
              0 0 12px #00FFFF;
          }
        }
        
        @keyframes neonScramble {
          0%, 20%, 40%, 60%, 80%, 100% {
            text-shadow: 
              0 0 5px #FF00FF,
              0 0 10px #FF00FF,
              0 0 15px #FF00FF,
              0 0 20px #FF00FF;
          }
          10%, 30%, 50%, 70%, 90% {
            text-shadow: 
              0 0 3px #FF00FF,
              0 0 7px #FF00FF,
              0 0 12px #FF00FF,
              0 0 17px #FF00FF;
          }
        }
      `}</style>
    </div>
  );
}
