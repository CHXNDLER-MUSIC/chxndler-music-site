"use client";

import React, { useState, useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseClient } from "@/lib/supabaseClient";
// import { useLiveStatus } from "@/hooks/useLiveStatus"; // Removed since chat is always available
import ChatPanel from "@/components/chat/ChatPanel";
import WelcomeHomeModal from "@/components/WelcomeHomeModal";

export default function JoinAliens({ visible = true } = {}) {
  const { profile, savePhone, user } = useProfile();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [status, setStatus] = useState("idle");
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Tip functionality state
  const [showTipOptions, setShowTipOptions] = useState(false);
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);
  const [showVenmoPayment, setShowVenmoPayment] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPaymentOptions5, setShowPaymentOptions5] = useState(false);
  const [showPaymentOptions10, setShowPaymentOptions10] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(true);
  
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

  // Update phone when profile changes
  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

  // Start countdown when component becomes visible and reset tip options when hidden
  useEffect(() => {
    if (visible) {
      startCountdown();
    } else {
      // Reset all tip-related states when component becomes hidden
      setShowTipOptions(false);
      setShowPaymentOptions(false);
      setShowPaymentOptions5(false);
      setShowPaymentOptions10(false);
      setShowVenmoPopup(false);
      setShowVenmoPayment(false);
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

  // Controlled input: only allow digits and plus sign
  function handlePhoneChange(e) {
    const newVal = e.target.value;
    if (/^[0-9+]*$/.test(newVal)) {
      setPhone(newVal);
    }
  }

  // Simple international-friendly validation (E.164 style-ish): length + allowed chars
  const isValidPhone = phone.length >= 7 && phone.length <= 20 && /^[0-9+]+$/.test(phone);

  async function sendHeartSignal() {
    if (!isValidPhone) {
      setError("Please enter a valid phone number with country code.");
      try { sfx.play('error', 0.5); } catch {}
      return;
    }

    setError(null);
    setMessage(null);
    setStatus("saving");

    try {
      sfx.play('join-alien', 0.8);

      const phoneToSave = phone.trim();

      // Always insert raw string to anonymous signup table
      const { error: insertError } = await supabaseClient
        .from("phone_signups")
        .insert({ phone: phoneToSave });

      if (insertError) {
        console.error("Error saving to phone_signups:", insertError);
      }

      // If logged in, also update the user's profile phone
      if (user && profile) {
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({ phone: phoneToSave })
          .eq("id", profile.id);

        if (updateError) {
          console.error("Error updating profile phone:", updateError);
        } else {
          // Keep local context in sync if helper exists
          try { await savePhone(phoneToSave); } catch {}
        }
      }

      setStatus("saved");
      setHeartSignalSent(true); // Track that heart signal was sent
      setMessage(user && profile
        ? "Signal linked to your Alien profile."
        : "Signal received. When you create your Alien we will connect this number.");
      try { sfx.play('success', 0.7); } catch {}

      setTimeout(() => {
        setError(null);
        setMessage(null);
        // Don't reset status to idle if user is not logged in and heart signal was sent
        // Keep the "Create your ALIEN profile" button visible
        if (user && profile) {
          setStatus("idle");
        }
      }, 3000);

    } catch (e) {
      console.error('Heart signal error:', e);
      setError("Failed to send heart signal");
      setStatus("error");
      try { sfx.play('error', 0.5); } catch {}
      setTimeout(() => {
        setError(null);
        setStatus("idle");
      }, 3000);
    }
  }

  return (
    <div 
      className={`signal-lost-container ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} 
      style={{ 
        zIndex: 130, 
        position: 'relative', 
        pointerEvents: visible ? 'auto' : 'none', 
        width: '100%',
        height: '100%',
        minHeight: 'fit-content',
        maxHeight: '100%',
        margin: '0',
        padding: '0px 20px 0px 20px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        border: 'none',
        borderRadius: 'inherit',
        boxShadow: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 300ms ease',
        overflow: 'auto',
        boxSizing: 'border-box',
        display: 'block'
      }}
    >
      {/* Countdown Section - Top */}
      <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '0px', paddingTop: '12px' }}>
        {/* Neon "Signal Lost" message */}
        <div style={{ marginBottom: '0px' }}>
          <h2 
            className="signal-lost-text"
            style={{
              color: '#FC54AF',
              textShadow: `
                0 0 8px #FC54AF,
                0 0 16px #FC54AF,
                0 0 24px #FC54AF,
                0 0 32px #FC54AF,
                0 0 48px #FC54AF,
                0 0 64px #FC54AF,
                0 0 80px #FC54AF
              `,
              animation: 'neonFlicker 2s infinite alternate',
              fontSize: 'clamp(22px, 5vw, 36px)',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              lineHeight: '1.2',
              marginBottom: '8px'
            }}
          >
            SIGNAL LOST
          </h2>
          <div 
            style={{
              color: isScrambling ? '#FF00FF' : '#00FFFF',
              textShadow: isScrambling ? `
                0 0 8px #FF00FF,
                0 0 16px #FF00FF,
                0 0 24px #FF00FF,
                0 0 32px #FF00FF,
                0 0 40px #FF00FF
              ` : `
                0 0 8px #00FFFF,
                0 0 16px #00FFFF,
                0 0 24px #00FFFF,
                0 0 32px #00FFFF,
                0 0 40px #00FFFF
              `,
              animation: isScrambling ? 'neonScramble 0.1s infinite' : 'neonPulse 1.5s infinite',
              transition: 'all 0.05s ease',
              fontSize: 'clamp(12px, 3vw, 16px)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              lineHeight: '1.3',
              marginBottom: '0px'
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
        margin: '2px 0 4px 0' 
      }} />

      {/* Stay Connected Section - Bottom */}
      <div style={{ marginTop: '40px', paddingBottom: '80px' }}>
        {/* Header Text */}
        {showPhoneForm && (
        <div 
          style={{ 
            textAlign: 'center', 
            marginBottom: '8px',
            color: '#00FFFF',
            fontSize: '16px',
            fontWeight: '600',
            textShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
          }}
        >
          {'Stay connected to the Heartverse.'}
        </div>
        )}

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


      {/* Phone Number Input */}
      {showPhoneForm && (
      <>
      <div style={{ marginBottom: '12px', width: '80%', margin: '0 auto 12px auto' }}>
        <input
          id="signal-phone"
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          // Must start with + or a digit; no formatting like dashes
          placeholder={profile?.phone ? profile.phone : "+1 5555555555 or your country code"}
          disabled={status === "saving"}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid #00FFFF',
            boxShadow: '0 0 8px rgba(0, 255, 255, 0.5), 0 0 15px rgba(0, 255, 255, 0.3)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 200ms ease',
            '&:focus': {
              borderColor: '#00FFFF'
            }
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00FFFF';
            e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 255, 255, 0.4)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {phone.length > 0 && !isValidPhone && (
          <p className="text-pink-400 text-sm mt-2">
            Please enter a valid phone number with country code.
          </p>
        )}
      </div>

      {/* Send Heart Signal Button / Create Profile Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={heartSignalSent && !user ? () => {
          try { sfx.play('click', 0.4); } catch {}
          setShowWelcomeHome(true);
        } : sendHeartSignal}
        disabled={status === "saving" || (!heartSignalSent && !isValidPhone)}
        style={{
          width: '80%',
          margin: '0 auto',
          padding: '12px 24px',
          background: 'transparent',
          border: status === "saved" && heartSignalSent && !user
            ? '2px solid #F2EF1D'  // Neon yellow for "Create your ALIEN profile"
            : status === "saved"
            ? '2px solid #00FF00'
            : status === "saving" || (!heartSignalSent && !isValidPhone) 
              ? '2px solid rgba(128, 128, 128, 0.3)' 
              : '2px solid #00FFFF',
          borderRadius: '8px',
          color: status === "saved" && heartSignalSent && !user
            ? '#F2EF1D'  // Neon yellow text for "Create your ALIEN profile"
            : status === "saved"
            ? '#00FF00'
            : status === "saving" || (!heartSignalSent && !isValidPhone) 
              ? 'rgba(128, 128, 128, 0.7)' 
              : '#00FFFF',
          fontSize: '16px',
          fontWeight: '600',
          cursor: status === "saving" || !isValidPhone ? 'not-allowed' : 'pointer',
          transition: 'all 300ms ease',
          boxShadow: status === "saved" && heartSignalSent && !user
            ? '0 0 15px rgba(242, 239, 29, 0.5)'  // Neon yellow glow for "Create your ALIEN profile"
            : status === "saved"
            ? '0 0 15px rgba(0, 255, 0, 0.3)'
            : status === "saving" || (!heartSignalSent && !isValidPhone) 
              ? 'none' 
              : '0 0 15px rgba(0, 255, 255, 0.3)',
          textShadow: status === "saved" && heartSignalSent && !user
            ? '0 0 10px #F2EF1D, 0 0 20px #F2EF1D, 0 0 30px #F2EF1D'  // Neon yellow text glow
            : status === "saved"
            ? '0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 30px #00FF00'
            : status === "saving" || (!heartSignalSent && !isValidPhone) 
              ? 'none' 
              : '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (status === "saved" && heartSignalSent && !user) {
            // Yellow hover effects for "Create your ALIEN profile" button
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.background = 'rgba(242, 239, 29, 0.15)';
            e.target.style.boxShadow = '0 0 40px rgba(242, 239, 29, 0.8), 0 0 60px rgba(242, 239, 29, 0.4), inset 0 0 30px rgba(242, 239, 29, 0.2)';
            e.target.style.textShadow = '0 0 15px #F2EF1D, 0 0 25px #F2EF1D, 0 0 35px #F2EF1D, 0 0 45px #F2EF1D';
            e.target.style.borderColor = '#F2EF1D';
            try { sfx.play('hover.mp3', 0.3); } catch {}
          } else if (status !== "saving" && isValidPhone && status !== "saved") {
            // Cyan hover effects for normal state
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.background = 'rgba(0, 255, 255, 0.15)';
            e.target.style.boxShadow = '0 0 40px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4), inset 0 0 30px rgba(0, 255, 255, 0.2)';
            e.target.style.textShadow = '0 0 15px #00FFFF, 0 0 25px #00FFFF, 0 0 35px #00FFFF, 0 0 45px #00FFFF';
            e.target.style.borderColor = '#00E5FF';
            try { sfx.play('hover.mp3', 0.3); } catch {}
          }
        }}
        onMouseLeave={(e) => {
          if (status === "saved" && heartSignalSent && !user) {
            // Reset to yellow style for "Create your ALIEN profile" button
            e.target.style.transform = 'translateY(0)';
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = '0 0 15px rgba(242, 239, 29, 0.5)';
            e.target.style.textShadow = '0 0 10px #F2EF1D, 0 0 20px #F2EF1D, 0 0 30px #F2EF1D';
            e.target.style.borderColor = '#F2EF1D';
          } else if (status !== "saving" && isValidPhone && status !== "saved") {
            // Reset to cyan style for normal state
            e.target.style.transform = 'translateY(0)';
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
            e.target.style.textShadow = '0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF';
            e.target.style.borderColor = '#00FFFF';
          }
        }}
      >
        {status === "saving" ? (
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
        ) : status === "saved" && heartSignalSent && !user ? (
          "Signal received. Create your ALIEN profile."
        ) : status === "saved" ? (
          "Heart signal sent"
        ) : (
          "Send Heart Signal"
        )}
      </button>
      </div>
      </> 
      )}
      </div> {/* Close Stay Connected Section */}



      {/* Text Button - positioned in bottom left */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Chat button clicked! Current state:', isChatOpen);
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          setIsChatOpen(!isChatOpen);
          console.log('Setting chat state to:', !isChatOpen);
        }}
        title="Open text chat"
        className="text-chat-button"
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '80px',
          height: '80px',
          background: 'rgba(242, 239, 29, 0.1)',
          border: '2px solid #F2EF1D',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          outline: 'none',
          boxShadow: '0 0 15px rgba(242, 239, 29, 0.4)',
          zIndex: 1000,
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.transform = 'scale(1.1)';
          e.target.style.background = 'rgba(242, 239, 29, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(242, 239, 29, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(242, 239, 29, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(242, 239, 29, 0.4)';
        }}
      >
        <img 
          src="/elements/text.webp" 
          alt="Text Chat" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(1.2) saturate(1.2)',
            pointerEvents: 'none'
          }}
        />
      </button>

      {/* Phone Button - positioned in bottom left corner */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          // Toggle the phone form visibility
          setShowPhoneForm(!showPhoneForm);
        }}
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          width: '55px',
          height: '55px',
          background: 'rgba(0, 255, 255, 0.1)',
          border: '2px solid #00FFFF',
          borderRadius: '50%',
          color: '#00FFFF',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          outline: 'none',
          textShadow: '0 0 8px #00FFFF',
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.transform = 'scale(1.1)';
          e.target.style.background = 'rgba(0, 255, 255, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
          e.target.style.textShadow = '0 0 15px #00FFFF, 0 0 25px #00FFFF';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(0, 255, 255, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
          e.target.style.textShadow = '0 0 8px #00FFFF';
        }}
      >
        <img 
          src="/elements/phone.webp" 
          alt="Phone" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(1.2) saturate(1.2)'
          }}
        />
      </button>

      {/* $3 Button - positioned to the left of $5 button */}
      {showTipOptions && (
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.3); } catch {}
          
          // Toggle VENMO/CARD options popup for $3
          if (showPaymentOptions) {
            setShowPaymentOptions(false);
          } else {
            setShowPaymentOptions5(false); // Close $5 payment options first
            setShowPaymentOptions10(false); // Close $10 payment options first
            setShowPaymentOptions(true);
            setSelectedTipAmount(3);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '205px', // Position above $5 button
          right: '12px',
          width: '55px',
          height: '55px',
          background: 'rgba(252, 84, 175, 0.1)',
          border: '2px solid #FC54AF',
          borderRadius: '50%',
          color: '#FC54AF',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          textShadow: '0 0 8px #FC54AF',
          boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.background = 'rgba(252, 84, 175, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(252, 84, 175, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
        }}
      >
        $3
      </button>
      )}

      {/* $5 Button - positioned to the left of $10 button */}
      {showTipOptions && (
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.3); } catch {}
          
          // Toggle VENMO/CARD options popup for $5
          if (showPaymentOptions5) {
            setShowPaymentOptions5(false);
          } else {
            setShowPaymentOptions(false); // Close $3 payment options first
            setShowPaymentOptions10(false); // Close $10 payment options first
            setShowPaymentOptions5(true);
            setSelectedTipAmount(5);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '140px', // Position above $10 button
          right: '12px',
          width: '55px',
          height: '55px',
          background: 'rgba(252, 84, 175, 0.1)',
          border: '2px solid #FC54AF',
          borderRadius: '50%',
          color: '#FC54AF',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          textShadow: '0 0 8px #FC54AF',
          boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.background = 'rgba(252, 84, 175, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(252, 84, 175, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
          e.target.style.transform = 'scale(1)';
        }}
      >
        $5
      </button>
      )}

      {/* $10 Button - positioned to the left of $ button */}
      {showTipOptions && (
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.3); } catch {}
          
          // Toggle VENMO/CARD options popup for $10
          if (showPaymentOptions10) {
            setShowPaymentOptions10(false);
          } else {
            setShowPaymentOptions(false); // Close $3 payment options first
            setShowPaymentOptions5(false); // Close $5 payment options first
            setShowPaymentOptions10(true);
            setSelectedTipAmount(10);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '75px', // Position above $ button
          right: '12px',
          width: '55px',
          height: '55px',
          background: 'rgba(252, 84, 175, 0.1)',
          border: '2px solid #FC54AF',
          borderRadius: '50%',
          color: '#FC54AF',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          textShadow: '0 0 8px #FC54AF',
          boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.background = 'rgba(252, 84, 175, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(252, 84, 175, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
        }}
      >
        $10
      </button>
      )}

      {/* $ Button - positioned in bottom right corner */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          setShowTipOptions(!showTipOptions);
          setShowPaymentOptions(false); // Also close payment options when closing tip menu
          setShowPaymentOptions5(false); // Also close $5 payment options
          setShowPaymentOptions10(false); // Also close $10 payment options
        }}
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '55px',
          height: '55px',
          background: 'rgba(252, 84, 175, 0.1)',
          border: '2px solid #FC54AF',
          borderRadius: '50%',
          color: '#FC54AF',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          outline: 'none',
          textShadow: '0 0 8px #FC54AF',
          boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.transform = 'scale(1.1)';
          e.target.style.background = 'rgba(252, 84, 175, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
          e.target.style.textShadow = '0 0 15px #FC54AF, 0 0 25px #FC54AF';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(252, 84, 175, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
          e.target.style.textShadow = '0 0 8px #FC54AF';
        }}
      >
        $
      </button>

      {/* Tip Options - appear when $ button is clicked */}
      {showTipOptions && (
        <div style={{
          position: 'absolute',
          bottom: '55px',
          right: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'transparent',
          padding: '6px',
          borderRadius: '8px',
          zIndex: 11,
          alignItems: 'center'
        }}>
        </div>
      )}

      {/* Venmo Popup */}
      {showVenmoPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingTop: '10vh',
          paddingLeft: '5vw',
          zIndex: 1000
        }}
        onClick={() => setShowVenmoPopup(false)}
        >
          <div style={{
            background: 'rgba(10, 10, 20, 0.95)',
            border: '2px solid #FC54AF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(252, 84, 175, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              color: '#FC54AF',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              textShadow: '0 0 15px #FC54AF'
            }}>
              Send Tip via Venmo
            </h3>
            <p style={{
              color: '#fff',
              fontSize: '16px',
              marginBottom: '8px'
            }}>
              Send ${selectedTipAmount === 'custom' ? '[Enter Amount]' : selectedTipAmount} to:
            </p>
            <p style={{
              color: '#FC54AF',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textShadow: '0 0 10px #FC54AF'
            }}>
              @chxndlerthealien
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={`https://venmo.com/CHXNDLERTHEALIEN?amount=${selectedTipAmount === 'custom' ? '1' : selectedTipAmount}&note=Fueling%20the%20signal`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #3D95CE, #5BA8D8)',
                  border: '2px solid #3D95CE',
                  borderRadius: '50%',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                  transition: 'all 300ms ease',
                  textShadow: '0 0 8px rgba(61, 149, 206, 0.6)',
                  boxShadow: '0 0 25px rgba(61, 149, 206, 0.5)',
                  flex: 1,
                  minWidth: '120px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 0 35px rgba(61, 149, 206, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 0 25px rgba(61, 149, 206, 0.5)';
                }}
              >
                📱 Open Venmo
              </a>
              
              <button
                onClick={() => {
                  try { sfx.play('close', 0.3); } catch {}
                  setShowVenmoPopup(false);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(252, 84, 175, 0.1)',
                  border: '2px solid #FC54AF',
                  borderRadius: '50%',
                  color: '#FC54AF',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                  transition: 'all 300ms ease',
                  textShadow: '0 0 8px #FC54AF',
                  boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
                  flex: 1,
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(252, 84, 175, 0.2)';
                  e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(252, 84, 175, 0.1)';
                  e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Payment Interface - No External Navigation */}
      {showVenmoPayment && (
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Payment Interface Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(61, 149, 206, 0.1), rgba(91, 168, 216, 0.1))',
            border: '2px solid #00FFFF',
            borderRadius: '12px',
            padding: '15px',
            maxWidth: '220px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(61, 149, 206, 0.4)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowVenmoPayment(false)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '30px',
                height: '30px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid #00FFFF',
                borderRadius: '50%',
                color: '#00FFFF',
                fontSize: '16px',
                cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              ×
            </button>




            {/* Payment Actions */}
            <a
              href="https://venmo.com/CHXNDLERTHEALIEN?amount=3&note=Fueling%20the%20signal"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '20px',
                background: 'transparent',
                border: '2px solid #00FFFF',
                borderRadius: '50%',
                color: '#00FFFF',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                transition: 'all 300ms ease',
                boxShadow: '0 0 20px rgba(61, 149, 206, 0.5)',
                width: '60px',
                height: '60px',
                textDecoration: 'none',
                display: 'inline-block',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.3); } catch {}
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 0 25px rgba(61, 149, 206, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 0 20px rgba(61, 149, 206, 0.5)';
              }}
            >
              $3
            </a>

            {/* Other Payment Options Button */}
            <button
              onClick={() => {
                try { sfx.play('hover', 0.3); } catch {}
                // Add functionality here later
              }}
              style={{
                padding: '20px',
                background: 'transparent',
                border: '2px solid #00FFFF',
                borderRadius: '50%',
                color: '#00FFFF',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                transition: 'all 300ms ease',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                width: '60px',
                height: '60px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '10px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.3); } catch {}
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
              }}
            >
              $5
            </button>

            {/* $10 Payment Button */}
            <button
              onClick={() => {
                try { sfx.play('hover', 0.3); } catch {}
                // Add $10 functionality here later
              }}
              style={{
                padding: '20px',
                background: 'transparent',
                border: '2px solid #00FFFF',
                borderRadius: '50%',
                color: '#00FFFF',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                transition: 'all 300ms ease',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                width: '60px',
                height: '60px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '10px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.3); } catch {}
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
              }}
            >
              $10
            </button>

          </div>
        </div>
      )}

      <style jsx>{`
        .signal-lost-container {
          padding-top: 0px !important;
          padding-bottom: 0px !important;
          margin-bottom: 0px !important;
          margin-top: 0px !important;
        }
        
        .signal-lost-text {
          margin: 0 !important;
        }
        
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

      {/* Payment buttons popup */}
      {showPaymentOptions && (
        <div 
          style={{
            position: 'absolute',
            bottom: '205px',
            right: '80px',
            zIndex: 15,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
          onClick={(e) => {
            // Close if clicking the container (outside buttons)
            if (e.target === e.currentTarget) {
              setShowPaymentOptions(false);
            }
          }}
        >
          {/* Venmo Button */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              const venmoUrl = `venmo://paycharge?txn=pay&recipients=chxndlerthealien&amount=3&note=${encodeURIComponent('Fuel the Signal')}`;
              const webVenmoUrl = `https://venmo.com/u/chxndlerthealien?txn=pay&amount=3&note=${encodeURIComponent('Fuel the Signal')}`;
              
              window.open(venmoUrl, '_blank');
              setTimeout(() => {
                window.open(webVenmoUrl, '_blank');
              }, 1000);
              
              setShowPaymentOptions(false);
            }}
            style={{
              padding: '0',
              width: '48px',
              height: '48px',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '2px solid #00FFFF',
              borderRadius: '50%',
              color: '#00FFFF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
              textShadow: '0 0 8px #00FFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
              e.target.style.background = 'rgba(0, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
            }}
          >
            <img 
              src="/elements/venmo.webp" 
              alt="Venmo" 
              style={{
                width: '44px',
                height: '44px',
                filter: 'brightness(1) invert(0)'
              }}
            />
          </button>

          {/* Credit Card Button */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              // Open Stripe payment page for $3
              window.open('https://buy.stripe.com/bJeeVe5X3fZH9Nnchh4gg0P', '_blank');
              setShowPaymentOptions(false);
            }}
            style={{
              padding: '0',
              width: '58px',
              height: '38px',
              background: 'rgba(252, 84, 175, 0.1)',
              border: '2px solid #FC54AF',
              borderRadius: '8px',
              color: '#FC54AF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
              textShadow: '0 0 8px #FC54AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
              e.target.style.background = 'rgba(252, 84, 175, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
              e.target.style.background = 'rgba(252, 84, 175, 0.1)';
            }}
          >
            <img 
              src="/elements/credit-card.webp" 
              alt="Credit Card" 
              style={{
                width: '54px',
                height: '34px',
                filter: 'brightness(0) saturate(100%) invert(19%) sepia(95%) saturate(1646%) hue-rotate(300deg) brightness(102%) contrast(98%)'
              }}
            />
          </button>
        </div>
      )}

      {/* Payment buttons popup for $5 */}
      {showPaymentOptions5 && (
        <div 
          style={{
            position: 'absolute',
            bottom: '140px',
            right: '80px',
            zIndex: 15,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
          onClick={(e) => {
            // Close if clicking the container (outside buttons)
            if (e.target === e.currentTarget) {
              setShowPaymentOptions5(false);
            }
          }}
        >
          {/* Venmo Button for $5 */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              const venmoUrl = `venmo://paycharge?txn=pay&recipients=chxndlerthealien&amount=5&note=${encodeURIComponent('Boost the Transmission')}`;
              const webVenmoUrl = `https://venmo.com/u/chxndlerthealien?txn=pay&amount=5&note=${encodeURIComponent('Boost the Transmission')}`;
              
              window.open(venmoUrl, '_blank');
              setTimeout(() => {
                window.open(webVenmoUrl, '_blank');
              }, 1000);
              
              setShowPaymentOptions5(false);
            }}
            style={{
              padding: '0',
              width: '48px',
              height: '48px',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '2px solid #00FFFF',
              borderRadius: '50%',
              color: '#00FFFF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
              textShadow: '0 0 8px #00FFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
              e.target.style.background = 'rgba(0, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
            }}
          >
            <img 
              src="/elements/venmo.webp" 
              alt="Venmo" 
              style={{
                width: '44px',
                height: '44px',
                filter: 'brightness(1) invert(0)'
              }}
            />
          </button>

          {/* Credit Card Button for $5 */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              // Open Stripe payment page for $5
              window.open('https://buy.stripe.com/3cIaEYbhn00JbVv4OP4gg0Q', '_blank');
              setShowPaymentOptions5(false);
            }}
            style={{
              padding: '0',
              width: '58px',
              height: '38px',
              background: 'rgba(252, 84, 175, 0.1)',
              border: '2px solid #FC54AF',
              borderRadius: '8px',
              color: '#FC54AF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
              textShadow: '0 0 8px #FC54AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
              e.target.style.background = 'rgba(252, 84, 175, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
              e.target.style.background = 'rgba(252, 84, 175, 0.1)';
            }}
          >
            <img 
              src="/elements/credit-card.webp" 
              alt="Credit Card" 
              style={{
                width: '54px',
                height: '34px',
                filter: 'brightness(0) saturate(100%) invert(19%) sepia(95%) saturate(1646%) hue-rotate(300deg) brightness(102%) contrast(98%)'
              }}
            />
          </button>
        </div>
      )}

      {/* Payment buttons popup for $10 */}
      {showPaymentOptions10 && (
        <div 
          style={{
            position: 'absolute',
            bottom: '75px',
            right: '80px',
            zIndex: 15,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
          onClick={(e) => {
            // Close if clicking the container (outside buttons)
            if (e.target === e.currentTarget) {
              setShowPaymentOptions10(false);
            }
          }}
        >
          {/* Venmo Button for $10 */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              // Use the specific $10 Venmo URL
              const venmoUrl = 'https://venmo.com/CHXNDLERTHEALIEN?txn=pay&amount=10&note=Ignite%20the%20Heartverse';
              
              window.open(venmoUrl, '_blank');
              
              setShowPaymentOptions10(false);
            }}
            style={{
              padding: '0',
              width: '48px',
              height: '48px',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '2px solid #00FFFF',
              borderRadius: '50%',
              color: '#00FFFF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
              textShadow: '0 0 8px #00FFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
              e.target.style.background = 'rgba(0, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
            }}
          >
            <img 
              src="/elements/venmo.webp" 
              alt="Venmo" 
              style={{
                width: '44px',
                height: '44px',
                filter: 'brightness(1) invert(0)'
              }}
            />
          </button>

          {/* Credit Card Button for $10 */}
          <button
            onClick={() => {
              try { sfx.play('card-ding', 0.7); } catch {}
              // Open Stripe payment page for $10
              window.open('https://buy.stripe.com/4gM5kEdpv3cV9Nn6WX4gg0R', '_blank');
              setShowPaymentOptions10(false);
            }}
            style={{
              padding: '0',
              width: '58px',
              height: '38px',
              background: 'rgba(252, 84, 175, 0.1)',
              border: '2px solid #FC54AF',
              borderRadius: '8px',
              color: '#FC54AF',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 300ms ease',
              boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
              textShadow: '0 0 8px #FC54AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              try { sfx.play('audio/hover.mp3', 0.3); } catch {}
              e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
              e.target.style.background = 'rgba(252, 84, 175, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)';
              e.target.style.background = 'rgba(252, 84, 175, 0.1)';
            }}
          >
            <img 
              src="/elements/credit-card.webp" 
              alt="Credit Card" 
              style={{
                width: '54px',
                height: '34px',
                filter: 'brightness(0) saturate(100%) invert(19%) sepia(95%) saturate(1646%) hue-rotate(300deg) brightness(102%) contrast(98%)'
              }}
            />
          </button>
        </div>
      )}

      {/* Chat Panel */}
      <ChatPanel 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      
      {/* Welcome Home Modal */}
      <WelcomeHomeModal 
        open={showWelcomeHome} 
        onClose={() => setShowWelcomeHome(false)} 
      />
    </div>
  );
}
