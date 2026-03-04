"use client";

import React, { useState, useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseClient } from "@/lib/supabaseClient";
// import { useLiveStatus } from "@/hooks/useLiveStatus"; // Removed since chat is always available
import ChatPanel from "@/components/chat/ChatPanel";
import WelcomeHomeModal from "@/components/WelcomeHomeModal";
import EpisodesLibrary from "@/components/EpisodesLibrary";
import { useGoLiveOverride } from "@/hooks/useGoLiveOverride";

export default function JoinAliens({ visible = true } = {}) {
  const { profile, savePhone, user } = useProfile();
  const { isOverrideActive } = useGoLiveOverride();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [status, setStatus] = useState("idle");

  // Check if currently inside a broadcast window (Mon/Thu 7-8 PM ET)
  const isInBroadcastWindow = () => {
    const now = new Date();
    const tz = 'America/New_York';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    const etHour = get('hour') === 24 ? 0 : get('hour');
    const etDate = new Date(get('year'), get('month') - 1, get('day'));
    const etDow = etDate.getDay();
    return (etDow === 1 || etDow === 4) && etHour >= 19 && etHour < 20;
  };

  const showTwitchEmbed = isOverrideActive || isInBroadcastWindow();
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatProfileOpen, setIsChatProfileOpen] = useState(false);
  
  // Tip functionality state
  const [showTipOptions, setShowTipOptions] = useState(false);
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);
  const [showVenmoPayment, setShowVenmoPayment] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPaymentOptions5, setShowPaymentOptions5] = useState(false);
  const [showPaymentOptions10, setShowPaymentOptions10] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  
  // ── Next-broadcast countdown ──────────────────────────────────────────────
  const [countdownMs, setCountdownMs] = useState(0);
  const [nextBroadcast, setNextBroadcast] = useState(null);

  /**
   * Returns the next upcoming broadcast (Mon 7 PM ET / Thu 7 PM ET).
   * Respects America/New_York so EST ↔ EDT transitions are automatic.
   */
  const getNextBroadcast = () => {
    const now = new Date();
    const tz = 'America/New_York';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    const etYear = get('year');
    const etMonth = get('month');
    const etDay = get('day');
    const etHour = get('hour') === 24 ? 0 : get('hour');
    const etDate = new Date(etYear, etMonth - 1, etDay);
    const etDow = etDate.getDay();

    let daysUntil, kind;
    const isBeforeStreamEnd = etHour < 20;

    if (etDow === 1 && isBeforeStreamEnd) {
      daysUntil = 0; kind = 'acoustic';
    } else if (etDow === 4 && isBeforeStreamEnd) {
      daysUntil = 0; kind = 'electric';
    } else {
      const daysToMon = ((1 - etDow + 7) % 7) || 7;
      const daysToThu = ((4 - etDow + 7) % 7) || 7;
      if (daysToMon < daysToThu) { daysUntil = daysToMon; kind = 'acoustic'; }
      else { daysUntil = daysToThu; kind = 'electric'; }
    }

    const target = new Date(etYear, etMonth - 1, etDay + daysUntil);
    const tY = target.getFullYear(), tM = target.getMonth(), tD = target.getDate();

    // Convert 19:00 ET → UTC (try EST first, adjust for EDT)
    let utc = new Date(Date.UTC(tY, tM, tD, 19 + 5, 0, 0));
    const checkH = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false })
        .formatToParts(utc).find((p) => p.type === 'hour')?.value ?? '0', 10
    );
    if (checkH !== 19) utc = new Date(Date.UTC(tY, tM, tD, 19 + 4, 0, 0));

    const dayName = kind === 'acoustic' ? 'MONDAY' : 'THURSDAY';
    const label = `${dayName} \u2022 7:00 PM ET \u2022 ${kind.toUpperCase()} SESSION`;

    return { kind, start: utc, label, dayName };
  };

  // Update phone when profile changes
  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

  // Countdown ticker — runs every second while visible & offline
  useEffect(() => {
    if (!visible) {
      // Reset tip states when hidden
      setShowTipOptions(false);
      setShowPaymentOptions(false);
      setShowPaymentOptions5(false);
      setShowPaymentOptions10(false);
      setShowVenmoPopup(false);
      setShowVenmoPayment(false);
      return;
    }

    const tick = () => {
      const broadcast = getNextBroadcast();
      setNextBroadcast(broadcast);
      setCountdownMs(Math.max(0, broadcast.start.getTime() - Date.now()));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
        minHeight: isChatOpen ? '0' : 'fit-content',
        maxHeight: '100%',
        margin: '0',
        padding: '0px 8px 0px 8px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        border: 'none',
        borderRadius: 'inherit',
        boxShadow: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 300ms ease',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'block'
      }}
    >
      {/* Heart Signal Title - Top */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '2px',
        paddingBottom: '2px',
        borderBottom: '1px solid rgba(252, 84, 175, 0.3)',
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#FC54AF',
                boxShadow: '0 0 8px #FC54AF, 0 0 16px #FC54AF',
                animation: showTwitchEmbed ? 'signalBlink 1.2s ease-in-out infinite' : 'none',
                opacity: showTwitchEmbed ? 1 : 0.5
              }}
            />
            <h1
              className="text-xl font-bold whitespace-nowrap"
              style={{
                color: '#FC54AF !important',
                textShadow: '0 0 10px #FC54AF, 0 0 20px #FC54AF, 0 0 30px #FC54AF',
                letterSpacing: '0.05em',
                fontWeight: 'bold',
                fontSize: 'clamp(20px, 4vw, 28px)',
                margin: 0
              }}
            >
              HEART SIGNAL
            </h1>
          </div>
          
          {/* Extended glow line centered */}
          <div 
            style={{
              width: '60%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(252, 84, 175, 0.6), rgba(252, 84, 175, 0.6), transparent)',
              boxShadow: '0 0 8px rgba(252, 84, 175, 0.4)'
            }}
          />
        </div>
      </div>

      {/* Twitch Stream Embed - Middle (only during broadcast or override) */}
      {showTwitchEmbed ? (
        <div style={{
          width: 'calc(100% + 16px)',
          padding: '0',
          margin: '-6px -8px 8px'
        }}>
          <iframe
            src={`https://player.twitch.tv/?channel=chxndlerthealien&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=true&muted=true`}
            width="100%"
            style={{
              aspectRatio: '16 / 9',
              borderRadius: '0px',
              border: 'none',
              boxShadow: '0 0 15px rgba(252, 84, 175, 0.2)',
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'block'
            }}
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            allow="autoplay; fullscreen"
            title="CHXNDLER Twitch Stream"
          />
        </div>
      ) : (
        /* ── Cinematic Countdown ─────────────────────────────────── */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 6vw, 48px) 16px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {/* "NEXT TRANSMISSION" label */}
          <div style={{
            fontSize: 'clamp(10px, 2.5vw, 13px)',
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontWeight: '600',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(0, 255, 255, 0.6)',
            marginTop: '8px',
            marginBottom: 'clamp(12px, 3vw, 20px)',
          }}>
            NEXT TRANSMISSION
          </div>

          {/* HH : MM : SS countdown */}
          {(() => {
            const totalSec = Math.floor(countdownMs / 1000);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            const pad = (n) => String(n).padStart(2, '0');

            const digitStyle = {
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
              fontSize: 'clamp(36px, 12vw, 72px)',
              fontWeight: '700',
              lineHeight: 1,
              color: '#00FFFF',
              textShadow: '0 0 8px #00FFFF, 0 0 20px rgba(0,255,255,0.5), 0 0 40px rgba(0,255,255,0.25)',
              animation: 'countdownPulse 2s ease-in-out infinite',
              letterSpacing: '0.05em',
            };

            const separatorStyle = {
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
              fontSize: 'clamp(28px, 9vw, 56px)',
              fontWeight: '300',
              color: 'rgba(0, 255, 255, 0.35)',
              padding: '0 clamp(4px, 2vw, 12px)',
              lineHeight: 1,
              alignSelf: 'flex-start',
            };

            const labelStyle = {
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
              fontSize: 'clamp(8px, 2vw, 11px)',
              fontWeight: '500',
              letterSpacing: '0.25em',
              color: 'rgba(0, 255, 255, 0.4)',
              marginTop: '6px',
              textAlign: 'center',
            };

            return (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}>
                {/* Hours */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(h)}</span>
                  <span style={labelStyle}>HRS</span>
                </div>

                <span style={separatorStyle}>:</span>

                {/* Minutes */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(m)}</span>
                  <span style={labelStyle}>MIN</span>
                </div>

                <span style={separatorStyle}>:</span>

                {/* Seconds */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(s)}</span>
                  <span style={labelStyle}>SEC</span>
                </div>
              </div>
            );
          })()}

          {/* Weekly schedule */}
          <div style={{
            marginTop: 'clamp(8px, 2.2vw, 14px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}>
            {(() => {
              const acoustic = { label: 'MONDAY \u2022 7:00 PM EST \u2022 ACOUSTIC SIGNAL', kind: 'acoustic' };
              const electric = { label: 'THURSDAY \u2022 7:00 PM EST \u2022 ELECTRIC SIGNAL', kind: 'electric' };
              const next = nextBroadcast?.kind === 'electric' ? electric : acoustic;
              const other = next === acoustic ? electric : acoustic;
              return [
                { ...next, isNext: true },
                { ...other, isNext: false },
              ].map(({ label, isNext }, idx) => (
                <div key={label} className={isNext ? 'next-broadcast-pulse' : ''} style={{
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  fontSize: 'clamp(9px, 2.4vw, 12px)',
                  fontWeight: isNext ? '700' : '500',
                  letterSpacing: '0.2em',
                  color: isNext ? '#00FFFF' : 'rgba(252, 84, 175, 0.45)',
                  textAlign: 'center',
                  lineHeight: 1.05,
                  // Slightly more space between the two lines
                  marginTop: idx === 1 ? '8px' : 0,
                }}>
                  {label}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{
        width: '100%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(252, 84, 175, 0.5), transparent)',
        // Slight space under the schedule text
        marginTop: '2px',
        // Reduce overall gap by 10px
        marginBottom: '6px',
      }} />

      {/* Tip amount buttons - horizontal row below Twitch embed */}
      {showTipOptions && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          padding: '6px 8px 4px',
        }}>
          {[
            { amount: 3, showState: showPaymentOptions, setShow: setShowPaymentOptions, closeOthers: () => { setShowPaymentOptions5(false); setShowPaymentOptions10(false); } },
            { amount: 5, showState: showPaymentOptions5, setShow: setShowPaymentOptions5, closeOthers: () => { setShowPaymentOptions(false); setShowPaymentOptions10(false); } },
            { amount: 10, showState: showPaymentOptions10, setShow: setShowPaymentOptions10, closeOthers: () => { setShowPaymentOptions(false); setShowPaymentOptions5(false); } },
          ].map(({ amount, showState, setShow, closeOthers }) => {
            const stripeUrls = { 3: 'https://buy.stripe.com/bJeeVe5X3fZH9Nnchh4gg0P', 5: 'https://buy.stripe.com/3cIaEYbhn00JbVv4OP4gg0Q', 10: 'https://buy.stripe.com/4gM5kEdpv3cV9Nn6WX4gg0R' };
            const venmoNotes = { 3: 'Fuel the Signal', 5: 'Boost the Transmission', 10: 'Ignite the Heartverse' };
            return (
              <div key={amount} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    try { sfx.play('audio/click.mp3', 0.3); } catch {}
                    if (showState) { setShow(false); } else { closeOthers(); setShow(true); setSelectedTipAmount(amount); }
                  }}
                  style={{
                    width: '55px', height: '55px',
                    background: 'rgba(252, 84, 175, 0.1)', border: '2px solid #FC54AF', borderRadius: '50%',
                    color: '#FC54AF', fontSize: amount === 10 ? '14px' : '16px', fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 300ms ease', textShadow: '0 0 8px #FC54AF', boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
                  }}
                  onMouseEnter={(e) => { try { sfx.play('hover', 0.3); } catch {} e.target.style.background = 'rgba(252, 84, 175, 0.2)'; e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)'; e.target.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(252, 84, 175, 0.1)'; e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)'; e.target.style.transform = 'scale(1)'; }}
                >
                  ${amount}
                </button>
                {showState && (
                  <>
                    <button
                      onClick={() => {
                        try { sfx.play('card-ding', 0.7); } catch {}
                        window.open(stripeUrls[amount], '_blank');
                        setShow(false);
                      }}
                      style={{
                        padding: '0', width: '58px', height: '38px',
                        background: 'rgba(252, 84, 175, 0.1)', border: '2px solid #FC54AF', borderRadius: '8px',
                        cursor: 'pointer', transition: 'all 300ms ease', boxShadow: '0 0 15px rgba(252, 84, 175, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => { try { sfx.play('audio/hover.mp3', 0.3); } catch {} e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)'; e.target.style.background = 'rgba(252, 84, 175, 0.2)'; e.target.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.3)'; e.target.style.background = 'rgba(252, 84, 175, 0.1)'; e.target.style.transform = 'scale(1)'; }}
                    >
                      <img src="/elements/credit-card.webp" alt="Credit Card" style={{ width: '54px', height: '34px', filter: 'brightness(0) saturate(100%) invert(19%) sepia(95%) saturate(1646%) hue-rotate(300deg) brightness(102%) contrast(98%)' }} />
                    </button>
                    <button
                      onClick={() => {
                        try { sfx.play('card-ding', 0.7); } catch {}
                        const venmoUrl = `venmo://paycharge?txn=pay&recipients=chxndlerthealien&amount=${amount}&note=${encodeURIComponent(venmoNotes[amount])}`;
                        const webVenmoUrl = `https://venmo.com/u/chxndlerthealien?txn=pay&amount=${amount}&note=${encodeURIComponent(venmoNotes[amount])}`;
                        window.open(venmoUrl, '_blank');
                        setTimeout(() => { window.open(webVenmoUrl, '_blank'); }, 1000);
                        setShow(false);
                      }}
                      style={{
                        padding: '0', width: '48px', height: '48px',
                        background: 'rgba(0, 255, 255, 0.1)', border: '2px solid #00FFFF', borderRadius: '50%',
                        cursor: 'pointer', transition: 'all 300ms ease', boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => { try { sfx.play('audio/hover.mp3', 0.3); } catch {} e.target.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)'; e.target.style.background = 'rgba(0, 255, 255, 0.2)'; e.target.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'; e.target.style.background = 'rgba(0, 255, 255, 0.1)'; e.target.style.transform = 'scale(1)'; }}
                    >
                      <img src="/elements/venmo.webp" alt="Venmo" style={{ width: '44px', height: '44px', filter: 'brightness(1) invert(0)' }} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stay Connected Section - fits below Twitch embed */}
      {showPhoneForm && (
      <div style={{
        padding: '12px 12px 0',
      }}>
        {/* Header Text */}
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
      </div>
      )}



      {/* Text Button - positioned in bottom left */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (process.env.NODE_ENV !== "production") console.log('Chat button clicked! Current state:', isChatOpen);
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          // Close phone form before opening chat
          if (!isChatOpen && showPhoneForm) {
            setShowPhoneForm(false);
          }
          setIsChatOpen(!isChatOpen);
          if (process.env.NODE_ENV !== "production") console.log('Setting chat state to:', !isChatOpen);
        }}
        title="Open text chat"
        className="text-chat-button"
        style={{
          position: 'absolute',
          bottom: '15px',
          left: '10px',
          width: '60px',
          height: '60px',
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
          zIndex: isChatOpen ? (isChatProfileOpen ? 10 : 120) : 1000,
          overflow: 'hidden',
          pointerEvents: (isChatOpen && isChatProfileOpen) ? 'none' : 'auto'
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

      {/* Episodes Library - button + panel rendered directly in container */}
      <EpisodesLibrary isChatOpen={isChatOpen} visible={visible} />

      {/* Phone Button - positioned to the left of $ button */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          // Toggle the phone form visibility — close tip options so they don't stack
          const opening = !showPhoneForm;
          if (opening) {
            setShowTipOptions(false);
            setShowPaymentOptions(false);
            setShowPaymentOptions5(false);
            setShowPaymentOptions10(false);
          }
          setShowPhoneForm(opening);
        }}
        style={{
          position: 'absolute',
          bottom: '15px',
          right: '140px',
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


      {/* $ Button - positioned to the left of Episodes button */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          const opening = !showTipOptions;
          setShowTipOptions(opening);
          setShowPaymentOptions(false);
          setShowPaymentOptions5(false);
          setShowPaymentOptions10(false);
          // Close phone form so they don't stack
          if (opening) {
            setShowPhoneForm(false);
          }
        }}
        style={{
          position: 'absolute',
          bottom: '15px',
          right: '75px',
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
          bottom: '93px',
          right: '16px',
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
        @keyframes nextBroadcastPulse {
          0%, 100% {
            opacity: 0.85;
            text-shadow:
              0 0 6px rgba(0, 255, 255, 0.5),
              0 0 12px rgba(0, 255, 255, 0.25);
          }
          50% {
            opacity: 0.5;
            text-shadow:
              0 0 3px rgba(0, 255, 255, 0.3),
              0 0 6px rgba(0, 255, 255, 0.1);
          }
        }
        .next-broadcast-pulse {
          animation: nextBroadcastPulse 3s ease-in-out infinite;
        }

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
        
        @keyframes signalBlink {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 8px #FC54AF, 0 0 16px #FC54AF;
          }
          50% {
            opacity: 0.2;
            box-shadow: 0 0 2px #FC54AF;
          }
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

        @keyframes countdownPulse {
          0%, 100% {
            text-shadow:
              0 0 8px #00FFFF,
              0 0 20px rgba(0, 255, 255, 0.5),
              0 0 40px rgba(0, 255, 255, 0.25);
          }
          50% {
            text-shadow:
              0 0 4px #00FFFF,
              0 0 12px rgba(0, 255, 255, 0.35),
              0 0 24px rgba(0, 255, 255, 0.15);
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


      {/* Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onProfileOpen={setIsChatProfileOpen}
        collapsedSidebarWidth={72}
      />
      
      {/* Welcome Home Modal */}
      <WelcomeHomeModal 
        open={showWelcomeHome} 
        onClose={() => setShowWelcomeHome(false)} 
      />
    </div>
  );
}
