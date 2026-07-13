"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseClient } from "@/lib/supabaseClient";
// import { useLiveStatus } from "@/hooks/useLiveStatus"; // Removed since chat is always available
import ChatPanel from "@/components/chat/ChatPanel";
import WelcomeHomeModal from "@/components/WelcomeHomeModal";
import EpisodesLibrary from "@/components/EpisodesLibrary";
import { useGoLiveOverride } from "@/hooks/useGoLiveOverride";
import YouTubeLive from "@/components/YouTubeLive";
// IRL shows now fetched from Supabase instead of static list

export default function JoinAliens({ visible = true } = {}) {
  const { profile, savePhone, user } = useProfile();
  const { isOverrideActive, overrideVideoId } = useGoLiveOverride();
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [heartSignalSent, setHeartSignalSent] = useState(false);
  const [status, setStatus] = useState("idle");

  // YouTube Live status for indicator and embed
  const [isLive, setIsLive] = useState(false);
  
  // Consider local/URL overrides and pending flag to force live embed immediately on open
  const isLocalLive = React.useMemo(() => {
    try {
      if (typeof window === 'undefined') return false;
      const p = new URLSearchParams(window.location.search || '');
      if (p.get('live') === '1' || p.get('goLive') === '1') return true;
      return window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1';
    } catch { return false; }
  }, []);
  const isPendingLive = (typeof window !== 'undefined' && (window).__CHX_PENDING_SIGNAL_OPEN) === true;

  // Also respect the DB live flag immediately without waiting for the hook,
  // and the value captured during Start (window.__CHX_LAST_DB_LIVE)
  const [dbLiveNow, setDbLiveNow] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function fetchDbLive() {
      try {
        const r = await fetch('/api/admin/go-live', { cache: 'no-store' });
        if (!r.ok) throw new Error('bad status');
        const j = await r.json();
        if (!cancelled) setDbLiveNow(!!j?.live);
      } catch {
        if (!cancelled) setDbLiveNow(false);
      } finally {
        if (!cancelled) setDbLoaded(true);
      }
    }
    fetchDbLive();
    return () => { cancelled = true; };
  }, []);
  const startDbLive = (typeof window !== 'undefined' && (window).__CHX_LAST_DB_LIVE === true);
  const startForceEmbed = (typeof window !== 'undefined' && (window).__CHX_FORCE_LIVE_EMBED === true);
  const [showWelcomeHome, setShowWelcomeHome] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatProfileOpen, setIsChatProfileOpen] = useState(false);
  const [isEpisodesOpen, setIsEpisodesOpen] = useState(false);
  // IRL panel state
  const [isIrlOpen, setIsIrlOpen] = useState(false);
  const [showAllIrl, setShowAllIrl] = useState(false);
  const [expandedIrlIndex, setExpandedIrlIndex] = useState(null);
  
  // Tip functionality state
  const [showTipOptions, setShowTipOptions] = useState(false);
  const [showVenmoPopup, setShowVenmoPopup] = useState(false);
  const [showVenmoPayment, setShowVenmoPayment] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPaymentOptions5, setShowPaymentOptions5] = useState(false);
  const [showPaymentOptions10, setShowPaymentOptions10] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showConcertsPanel, setShowConcertsPanel] = useState(false);
  const [concertsShowAll, setConcertsShowAll] = useState(false);
  const [concertsExpandedIdx, setConcertsExpandedIdx] = useState(null);
  
  // ── Next-broadcast countdown ──────────────────────────────────────────────
  const [countdownMs, setCountdownMs] = useState(0);
  const [nextBroadcast, setNextBroadcast] = useState(null);
  // Auto-switch when Thursday 7PM countdown reaches zero (kind === 'electric')
  const isCountdownZero = countdownMs === 0 && nextBroadcast !== null && nextBroadcast.kind === 'electric';
  // Once the DB has responded and confirmed not live, suppress stale window globals
  // (startDbLive / startForceEmbed / isPendingLive) so they don't keep forceLiveFlag true.
  const dbConfirmedNotLive = dbLoaded && !dbLiveNow && !isOverrideActive;
  const forceLiveFlag = isOverrideActive || isLocalLive || dbLiveNow
    || (!dbConfirmedNotLive && (isPendingLive || startDbLive || startForceEmbed))
    || isCountdownZero;
  const [shows, setShows] = useState([]);
  const [showsLoading, setShowsLoading] = useState(false);
  const [showsError, setShowsError] = useState(null);
  
  // Drag-to-scroll for Upcoming IRL list
  const irlScrollRef = useRef(null);
  const [isDraggingIrl, setIsDraggingIrl] = useState(false);
  const irlDragRef = useRef({ startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, moved: false });

  // Phone form overlay positioning
  const containerRef = useRef(null);
  const irlSectionRef = useRef(null);
  const [irlSectionTop, setIrlSectionTop] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !irlSectionRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const iRect = irlSectionRef.current.getBoundingClientRect();
      setIrlSectionTop(Math.round(iRect.top - cRect.top));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadShows() {
      setShowsLoading(true);
      setShowsError(null);
      try {
        const { data, error } = await supabaseClient
          .from('irl_shows')
          .select('*')
          .order('date', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          setShows(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) setShowsError(e?.message || 'Failed to load shows');
      } finally {
        if (!cancelled) setShowsLoading(false);
      }
    }
    loadShows();
    return () => { cancelled = true; };
  }, []);

  const nextIrl = React.useMemo(() => {
    const now = Date.now();
    let best = null;
    for (const row of shows) {
      const d = new Date(row.date);
      if (isNaN(d.getTime())) continue;
      if (d.getTime() >= now) {
        if (!best || d.getTime() < best.dateObj.getTime()) {
          best = {
            dateObj: d,
            venue: row.location || '',
            title: row.title || row.location || '',
            signalType: row.cost || '',
            displayDate: row.display_date || '',
            timeLabel: row.time_label || '',
            url: row.tickets_url || '',
            directionsUrl: row.directions || '',
          };
        }
      }
    }
    return best;
  }, [shows]);

  /**
   * Returns the next upcoming broadcast (Thu 7 PM ET).
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

    // Treat same-day as the active broadcast window until 9 PM ET
    const isBeforeStreamEnd = etHour < 21;

    const daysUntil = (etDow === 4 && isBeforeStreamEnd) ? 0 : (((4 - etDow + 7) % 7) || 7);
    const kind = 'electric';

    const target = new Date(etYear, etMonth - 1, etDay + daysUntil);
    const tY = target.getFullYear(), tM = target.getMonth(), tD = target.getDate();

    // Convert 19:00 ET → UTC (try EST first, adjust for EDT)
    let utc = new Date(Date.UTC(tY, tM, tD, 19 + 5, 0, 0));
    const checkH = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false })
        .formatToParts(utc).find((p) => p.type === 'hour')?.value ?? '0', 10
    );
    if (checkH !== 19) utc = new Date(Date.UTC(tY, tM, tD, 19 + 4, 0, 0));

    const dayName = 'THURSDAY';
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

  // Close the upcoming shows list when panel closes; scroll dropdown into view when opening
  useEffect(() => {
    if (!isIrlOpen) { setShowAllIrl(false); return; }
    const t = setTimeout(() => {
      irlSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 150);
    return () => clearTimeout(t);
  }, [isIrlOpen]);

  // Reset expanded row when list is hidden
  useEffect(() => {
    if (!showAllIrl) setExpandedIrlIndex(null);
  }, [showAllIrl]);

  useEffect(() => {
    if (!showTipOptions) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        try { sfx.play('close', 0.4); } catch {}
        setShowTipOptions(false); setShowPaymentOptions(false); setShowPaymentOptions5(false); setShowPaymentOptions10(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTipOptions]);

  useEffect(() => {
    if (!showPhoneForm) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        try { sfx.play('close', 0.4); } catch {}
        setShowPhoneForm(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPhoneForm]);

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
      ref={containerRef}
      className={`signal-lost-container ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        zIndex: 130,
        position: 'relative',
        pointerEvents: visible ? 'auto' : 'none',
        // Ensure hidden state cannot be interacted with
        visibility: visible ? 'visible' : 'hidden',
        width: '100%',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        margin: '0',
        // Always reserve space for bottom-floating buttons (chat, episodes, $/phone)
        // Use safe-area inset where available to avoid iOS home indicator overlap
        padding: '0px 8px calc(120px + env(safe-area-inset-bottom, 0px)) 8px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        border: 'none',
        borderRadius: 'inherit',
        boxShadow: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 300ms ease',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Heart Signal Title - Top */}
      <div style={{ 
        textAlign: 'center', 
        paddingTop: '2px',
        paddingBottom: '0px',
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
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#FC54AF',
                boxShadow: '0 0 8px #FC54AF, 0 0 16px #FC54AF',
                animation: isLive ? 'signalBlink 1.2s ease-in-out infinite' : 'none',
                opacity: isLive ? 1 : 0.5
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

      {/* Removed NEXT LIVE SIGNAL label */}

      {/* YouTube Live Embed (auto-detect) with countdown fallback */}
      <div
        className="ytlive-wrap"
        style={{
          width: 'calc(100% + 16px)',
          margin: '2px -8px 4px',
          position: 'relative',
          overflow: (isLive || forceLiveFlag) ? 'hidden' : 'visible',
          aspectRatio: (isLive || forceLiveFlag) ? '16 / 9' : undefined,
          height: (isLive || forceLiveFlag) ? undefined : (isIrlOpen ? undefined : 'fit-content'),
          maxHeight: (isLive || forceLiveFlag) ? undefined : 'none',
          flex: (!isLive && !forceLiveFlag) ? (isIrlOpen ? '1 1 0' : '0 0 auto') : undefined,
          minHeight: (!isLive && !forceLiveFlag) ? 0 : undefined,
          display: (!isLive && !forceLiveFlag) ? 'flex' : undefined,
          flexDirection: (!isLive && !forceLiveFlag) ? 'column' : undefined,
          borderRadius: 8,
        }}
      >
        <YouTubeLive
          forceLive={forceLiveFlag}
          overrideVideoId={overrideVideoId}
          onStatusChange={(live) => setIsLive(live)}
          pollMs={(isOverrideActive && !isLive) ? 5_000 : (forceLiveFlag ? 15_000 : 60_000)}
          className=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            // Zoom in and crop black bars; align to top
            height: '130%',
            transform: 'translateY(-10%)',
            border: '0',
            display: 'block'
          }}
        >
        {/* ── Cinematic Countdown ──────────────────────────────────────────────── */}
        {(() => {
          const liveOverride = isOverrideActive || dbLiveNow;
          const accent = liveOverride ? '#FC54AF' : '#00FFFF';
          const accentFaded = liveOverride ? 'rgba(252,84,175,0.35)' : 'rgba(0,255,255,0.35)';
          const accentMuted = liveOverride ? 'rgba(252,84,175,0.4)' : 'rgba(0,255,255,0.4)';
          const accentGlow = liveOverride
            ? '0 0 8px #FC54AF, 0 0 20px rgba(252,84,175,0.5), 0 0 40px rgba(252,84,175,0.25)'
            : '0 0 8px #00FFFF, 0 0 20px rgba(0,255,255,0.5), 0 0 40px rgba(0,255,255,0.25)';
          const dividerBg = liveOverride
            ? 'linear-gradient(90deg, transparent, rgba(252,84,175,0.5), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,255,255,0.5), transparent)';

          const totalSec = Math.floor(countdownMs / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          const pad = (n) => String(n).padStart(2, '0');

          const digitStyle = {
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontSize: 'clamp(30px, 9.5vw, 60px)',
            fontWeight: '700',
            lineHeight: 1,
            color: accent,
            textShadow: accentGlow,
            animation: 'countdownPulse 2s ease-in-out infinite',
            letterSpacing: '0.05em',
          };

          const separatorStyle = {
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontSize: 'clamp(22px, 7.5vw, 44px)',
            fontWeight: '300',
            color: accentFaded,
            padding: '0 clamp(4px, 2vw, 12px)',
            lineHeight: 1,
            alignSelf: 'flex-start',
          };

          const labelStyle = {
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            fontSize: 'clamp(8px, 1.8vw, 10px)',
            fontWeight: '500',
            letterSpacing: '0.25em',
            color: accentMuted,
            marginTop: '4px',
            textAlign: 'center',
          };

          if (liveOverride) {
            return (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(16px, 5vw, 32px) 12px',
                width: '100%',
                flex: '1 1 0',
                boxSizing: 'border-box',
                gap: 10,
              }}>
                <div style={{
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  fontSize: 'clamp(18px, 5.5vw, 28px)',
                  fontWeight: '700',
                  color: accent,
                  textShadow: accentGlow,
                  letterSpacing: '0.25em',
                  animation: 'liveIndicatorPulse 1.5s ease-in-out infinite',
                }}>
                  ● STREAM IS LIVE
                </div>
                <div style={{
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  fontSize: 'clamp(9px, 2vw, 11px)',
                  color: accentMuted,
                  letterSpacing: '0.2em',
                }}>
                  CONNECTING TO VIDEO...
                </div>
              </div>
            );
          }

          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 'clamp(2px, 1.5vw, 8px) 12px 12px',
              width: '100%',
              flex: '0 0 auto',
              boxSizing: 'border-box',
            }}>
              {/* HH : MM : SS countdown */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(h)}</span>
                  <span style={labelStyle}>HRS</span>
                </div>
                <span style={separatorStyle}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(m)}</span>
                  <span style={labelStyle}>MIN</span>
                </div>
                <span style={separatorStyle}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={digitStyle}>{pad(s)}</span>
                  <span style={labelStyle}>SEC</span>
                </div>
              </div>

              {/* Weekly schedule */}
              <div style={{
                marginTop: 'clamp(6px, 2vw, 10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}>
                <div style={{
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                  fontSize: 'clamp(9px, 2.4vw, 12px)',
                  fontWeight: '700',
                  letterSpacing: '0.2em',
                  color: accent,
                  textAlign: 'center',
                  lineHeight: 1.05,
                }}>
                  {'THURSDAY • 7:00 PM EST • LIVE STREAM SIGNAL'}
                </div>
              </div>

              {/* Divider above IRL panel */}
              <div style={{
                width: '100%',
                height: '1px',
                background: dividerBg,
                marginTop: '2px',
                marginBottom: '2px',
              }} />
            </div>
          );
        })()}
        </YouTubeLive>

        {/* IRL SIGNAL — expandable neon dashboard drawer — sibling of countdown, grows downward */}
        <div ref={irlSectionRef} style={{ width: 'calc(100% + 16px)', margin: '4px -8px 0', position: 'relative', flex: isIrlOpen ? '1 1 0' : '0 0 auto', minHeight: isIrlOpen ? 240 : 0, display: forceLiveFlag ? 'none' : 'flex', flexDirection: 'column' }}>
            {/* Wrapper with single continuous border so contents stay inside */}
            <div
              className="irl-pulse"
              style={{
                width: '100%',
                border: '1px solid rgba(242,239,29,0.55)',
                borderRadius: 12,
                flex: isIrlOpen ? '1 1 0' : '0 0 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
            <motion.button
              type="button"
              onClick={() => { try { sfx.play('click', 0.35); } catch {} setShowPhoneForm(false); setShowTipOptions(false); setShowPaymentOptions(false); setShowPaymentOptions5(false); setShowPaymentOptions10(false); setConcertsExpandedIdx(0); setShowConcertsPanel(true); }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                width: '100%',
                padding: isIrlOpen ? '4px 10px' : '8px 12px',
                background: 'linear-gradient(90deg, rgba(252,84,175,0.12), rgba(0,255,255,0.12))',
                border: 'none',
                borderBottom: '1px solid rgba(0,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isIrlOpen ? 0 : 2, minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                    letterSpacing: '0.18em', fontSize: 12, color: '#F2EF1D',
                    textShadow: '0 0 10px rgba(242,239,29,0.85)',
                    lineHeight: isIrlOpen ? 1 : 1.2
                  }}>
                    NEXT IN PERSON SIGNAL
                  </span>
                  {(() => {
                    if (isIrlOpen) return null; // Hide header details when dropdown is open
                    const fmtDateShort = (d) => {
                      try { return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d); }
                      catch { return d.toLocaleDateString('en-US'); }
                    };
                    const fmtTimeShort = (d) => {
                      try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d); }
                      catch { return d.toLocaleTimeString(); }
                    };
                    const deriveHeaderTime = (label, d) => {
                      if (label) {
                        let m = label.match(new RegExp('(\\\d{1,2})(?::(\\\d{2}))?\\s*([AP]M)', 'i'));
                        if (!m) {
                          const m2 = label.match(new RegExp('(\\\d{1,2})\\s*[–-]\\s*\\d{1,2}\\s*([AP]M)', 'i'));
                          if (m2) m = [null, m2[1], '00', m2[2]];
                        }
                        if (m) {
                          const hh = m[1];
                          const mm = m[2] || '00';
                          const ap = m[3].toUpperCase();
                          return `${hh}:${mm} ${ap}`;
                        }
                      }
                      return fmtTimeShort(d);
                    };
                    if (!nextIrl) {
                      return (
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>No terrestrial coordinates detected</span>
                      );
                    }
                    const venue = nextIrl.venue || '';
                    const dateShort = fmtDateShort(nextIrl.dateObj);
                    const timeShort = deriveHeaderTime(nextIrl.timeLabel, nextIrl.dateObj);
                    return (
                      <span style={{
                        color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: 700,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0
                      }}>
                        {venue} • {dateShort} • {timeShort} ▾
                      </span>
                    );
                  })()}
                </div>
              </div>
            </motion.button>

            {/* Phone form aligned below IRL drawer but outside its container — removed here */}

            <AnimatePresence>
                {isIrlOpen && visible && (
                  <motion.div
                    key="irl-inline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      flex: 1,
                      minHeight: 200,
                      width: '100%',
                      background: 'rgba(0,0,0,0.88)',
                      borderTop: '1px solid rgba(242,239,29,0.25)',
                      borderRadius: '0 0 12px 12px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    }}
                  >
                    <div style={{ padding: 8 }}>
                      {(() => {
                      const fmtFullDate = (d) => {
                        try { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d); }
                        catch { return d.toDateString(); }
                      };
                      const fmtTime = (d) => {
                        try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d); }
                        catch { return d.toLocaleTimeString(); }
                      };

                      if (nextIrl) {
                        const hasTime = !isNaN(nextIrl.dateObj.getHours());
                        const dateText = nextIrl.displayDate || fmtFullDate(nextIrl.dateObj);
                        const timeText = nextIrl.timeLabel || (hasTime ? fmtTime(nextIrl.dateObj) : 'Time TBA');
                        const venueText = nextIrl.venue || '';
                        const directionsUrl = nextIrl.directionsUrl && nextIrl.directionsUrl.startsWith('http')
                          ? nextIrl.directionsUrl
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueText)}`;
                        const pad = (n) => String(n).padStart(2, '0');
                        const toGCalDateUTC = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
                        let startStr = '';
                        let endStr = '';
                        if (hasTime) {
                          const start = new Date(nextIrl.dateObj);
                          const end = new Date(start.getTime() + 150 * 60 * 1000); // 2.5 hours (e.g., 9:30 PM → 12:00 AM)
                          startStr = toGCalDateUTC(start);
                          endStr = toGCalDateUTC(end);
                        } else {
                          const d = nextIrl.dateObj;
                          const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
                          // All-day event same-day
                          startStr = ymd;
                          endStr = ymd;
                        }
                        const calLocation = venueText;
                        let costText = nextIrl.signalType || 'TBA';
                        if (nextIrl.signalType && nextIrl.signalType.toUpperCase().indexOf('FREE') >= 0) { costText = 'FREE'; }
                        const description = 'Aliens welcome to the Heartverse\nI\'m playing live at ' + calLocation + '.\nSongs about love, feeling lost, and finding your community.\nCome be part of it.\nCost: ' + (costText || 'Free');
                        const calEventTitle = 'CHXNDLER live at ' + (venueText || 'IRL Signal');
                        const calendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(calEventTitle) + '&dates=' + startStr + '/' + endStr + '&location=' + encodeURIComponent(calLocation) + '&details=' + encodeURIComponent(description) + '&ctz=America/New_York';
                        const rowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
                        const labelStyle = { fontWeight: 800, color: '#fff', letterSpacing: '0.04em', flexShrink: 0 };
                        const valueStyle = { color: 'rgba(255,255,255,0.9)', flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 };
                        const iconStyle = { width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                            {/* Removed white NEXT IRL SIGNAL header and divider */}
                            {!showAllIrl && (
                            <>
                            <div style={{ ...rowStyle, fontSize: 12 }}>
                              <span style={iconStyle}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                                  <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                                </svg>
                              </span>
                              <span style={{ ...labelStyle, fontSize: 12 }}>Location:</span>
                              <span style={{ ...valueStyle, fontSize: 12, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <span>{venueText}</span>
                              </span>
                            </div>
                            <div style={{ ...rowStyle, fontSize: 12 }}>
                              <span style={iconStyle}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.6"/>
                                  <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.6" strokeLinecap="round"/>
                                </svg>
                              </span>
                              <span style={{ ...labelStyle, fontSize: 12 }}>Date:</span>
                              <span style={{ ...valueStyle, fontSize: 12 }}>{dateText}{timeText ? ` • ${timeText}` : ''}</span>
                            </div>
                            <div style={{ ...rowStyle, fontSize: 12 }}>
                              <span style={iconStyle}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                                  <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                                </svg>
                              </span>
                              <span style={{ ...labelStyle, fontSize: 12 }}>Cost:</span>
                              <span style={{ ...valueStyle, fontSize: 12 }}>{costText}</span>
                            </div>
                            
                            </>
                            )}

                            {showAllIrl && (
                              <div>
                                {(() => {
                                  const nowMs = Date.now();
                                  const upcoming = (Array.isArray(shows) ? shows : [])
                                    .map((row) => ({ row, d: new Date(row.date) }))
                                    .filter(({ d }) => !isNaN(d.getTime()) && d.getTime() >= nowMs)
                                    .sort((a, b) => a.d.getTime() - b.d.getTime());
                                  if (upcoming.length === 0) {
                                    return (
                                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>No upcoming shows.</div>
                                    );
                                  }
                                  // Preserve original indices so expansion state remains stable
                                  const upcomingWithIndex = upcoming.map((v, idx) => ({ ...v, idx }));
                                  // If a row is expanded, show only that row in detail view
                                  const items = (expandedIrlIndex !== null)
                                    ? upcomingWithIndex.filter((v) => v.idx === expandedIrlIndex)
                                    : upcomingWithIndex;
                                  const fmtListDate = (d) => new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' }).format(d);
                                  const fmtTime = (d) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
                                  const isDetailView = expandedIrlIndex !== null;
                                  const enableHorizontalDrag = false; // Use vertical list with drag-to-scroll
                                  const listStyle = isDetailView
                                    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 6 }
                                    : enableHorizontalDrag
                                    ? {
                                        display: 'flex',
                                        gap: 8,
                                        overflowX: 'auto',
                                        paddingBottom: 4,
                                        scrollSnapType: 'x mandatory',
                                        WebkitOverflowScrolling: 'touch',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                        cursor: isDraggingIrl ? 'grabbing' : 'grab',
                                        userSelect: isDraggingIrl ? 'none' : 'auto'
                                      }
                                    : {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr',
                                        gap: 6,
                                        maxHeight: 280,
                                        overflowY: 'auto',
                                        cursor: isDraggingIrl ? 'grabbing' : 'grab',
                                        userSelect: isDraggingIrl ? 'none' : 'auto',
                                        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))'
                                      };
                                  return (
                                    <div
                                      style={listStyle}
                                      ref={!isDetailView ? irlScrollRef : null}
                                      onMouseDown={!isDetailView ? (e) => {
                                        const el = irlScrollRef.current;
                                        if (!el) return;
                                        e.preventDefault();
                                        setIsDraggingIrl(true);
                                        if (enableHorizontalDrag) {
                                          irlDragRef.current.startX = e.pageX - el.offsetLeft;
                                          irlDragRef.current.startScrollLeft = el.scrollLeft;
                                        } else {
                                          irlDragRef.current.startY = e.pageY - el.offsetTop;
                                          irlDragRef.current.startScrollTop = el.scrollTop;
                                        }
                                        irlDragRef.current.moved = false;
                                      } : undefined}
                                      onMouseMove={!isDetailView ? (e) => {
                                        if (!isDraggingIrl) return;
                                        const el = irlScrollRef.current;
                                        if (!el) return;
                                        if (enableHorizontalDrag) {
                                          const x = e.pageX - el.offsetLeft;
                                          const walkX = x - irlDragRef.current.startX;
                                          if (Math.abs(walkX) > 2) irlDragRef.current.moved = true;
                                          el.scrollLeft = irlDragRef.current.startScrollLeft - walkX;
                                        } else {
                                          const y = e.pageY - el.offsetTop;
                                          const walkY = y - irlDragRef.current.startY;
                                          if (Math.abs(walkY) > 2) irlDragRef.current.moved = true;
                                          el.scrollTop = irlDragRef.current.startScrollTop - walkY;
                                        }
                                      } : undefined}
                                      onMouseUp={!isDetailView ? () => setIsDraggingIrl(false) : undefined}
                                      onMouseLeave={!isDetailView ? () => setIsDraggingIrl(false) : undefined}
                                      onClickCapture={!isDetailView ? (e) => {
                                        if (irlDragRef.current.moved) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          irlDragRef.current.moved = false;
                                        }
                                      } : undefined}
                                    >
                                      {items.map(({ row, d, idx }) => {
                                        const dateText = (() => {
                                          if (!row.display_date) return fmtListDate(d);
                                          const s = row.display_date;
                                          const lastSlash = s.lastIndexOf('/');
                                          if (lastSlash !== -1 && s.length - lastSlash - 1 === 2) {
                                            return s.slice(0, lastSlash);
                                          }
                                          return s;
                                        })();
                                        const title = row.title || row.location;
                                        const timeText = row.time_label || fmtTime(d);
                                        const timeCompact = (() => {
                                          const src = row.time_label || timeText || '';
                                          // Try to extract hour + AM/PM
                                          const re = new RegExp('(\\\d{1,2})(?::(\\\d{2}))?\\s*([AP]M)', 'i');
                                          const m = src.match(re);
                                          if (m) {
                                            const hour = m[1];
                                            const ampm = m[3].toUpperCase();
                                            return `${hour}${ampm}`;
                                          }
                                          // Fallback: remove :00 and tighten AM/PM spacing
                                          return src.replace(new RegExp(':00'), '').replace(new RegExp('\\s*(AM|PM)', 'i'), (_, p1) => p1.toUpperCase());
                                        })();
                                        const costText = (row.cost && String(row.cost).toUpperCase().includes('FREE')) ? 'FREE' : (row.cost || 'TBA');
                                        const venueForMaps = title || '';
                                        const directionsUrl = row.directions && String(row.directions).startsWith('http')
                                          ? row.directions
                                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueForMaps)}`;
                                        const pad = (n) => String(n).padStart(2, '0');
                                        const toGCalDateUTC = (d0) => `${d0.getUTCFullYear()}${pad(d0.getUTCMonth() + 1)}${pad(d0.getUTCDate())}T${pad(d0.getUTCHours())}${pad(d0.getUTCMinutes())}00Z`;
                                        const hasTime = !isNaN(d.getHours());
                                        let startStr = '';
                                        let endStr = '';
                                        if (hasTime) {
                                          const start = new Date(d);
                                          const end = new Date(start.getTime() + 150 * 60 * 1000); // 2.5 hours
                                          startStr = toGCalDateUTC(start);
                                          endStr = toGCalDateUTC(end);
                                        } else {
                                          const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
                                          startStr = ymd;
                                          endStr = ymd;
                                        }
                                        const calLocation = row.location || title || '';
                                        const description = [
                                          'Aliens… welcome to the Heartverse 👽',
                                          `I'm playing live at ${calLocation}.`,
                                          'Songs about love, feeling lost, and finding your community.',
                                          'Come be part of it.',
                                          `🎟 ${costText || 'Free'}`,
                                        ].join('\n');
                                        const calEventTitle = 'CHXNDLER live at ' + (calLocation || 'IRL Signal');
                                        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calEventTitle)}&dates=${startStr}/${endStr}&location=${encodeURIComponent(calLocation)}&details=${encodeURIComponent(description)}&ctz=America/New_York`;
                                        const isOpen = expandedIrlIndex === idx;
                                        const cardStyleBase = {
                                          border: '1px solid rgba(0,255,255,0.25)',
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                          background: 'rgba(0,0,0,0.25)'
                                        };
                                        const cardStyle = (isDetailView || !enableHorizontalDrag)
                                          ? cardStyleBase
                                          : {
                                              ...cardStyleBase,
                                              flex: '0 0 85%',
                                              minWidth: '85%',
                                              scrollSnapAlign: 'start',
                                              scrollSnapStop: 'always'
                                            };
                                        return (
                                          <div key={idx} style={cardStyle}>
                                            <button
                                              onClick={() => { try { sfx.play('audio/click.mp3', 0.35); } catch {} setExpandedIrlIndex(isOpen ? null : idx); }}
                                              style={{
                                                width: '100%', textAlign: 'left', cursor: 'pointer',
                                                background: 'transparent', border: 'none', padding: '8px 10px',
                                                display: 'flex', alignItems: 'center', gap: 8, minWidth: 0
                                              }}
                                            >
                                              <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                  <circle cx="12" cy="12" r="5" fill="rgba(0,255,255,0.6)" />
                                                </svg>
                                              </span>
                                              <span style={{ color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {title} • {dateText}{timeCompact ? ` • ${timeCompact}` : ''}
                                              </span>
                                              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>{isOpen ? '▴' : '▾'}</span>
                                            </button>
                                            <AnimatePresence initial={false}>
                                              {isOpen && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: 'auto' }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.25 }}
                                                  style={{ borderTop: '1px solid rgba(0,255,255,0.2)', padding: '8px 10px', background: 'rgba(0,0,0,0.35)' }}
                                                >
                                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                      <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                                                          <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                                                        </svg>
                                                      </span>
                                                      <strong style={{ color: '#fff' }}>Location:</strong>
                                                      <span style={{ color: 'rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                                        <span>{title}</span>
                                                      </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                      <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.6"/>
                                                          <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.6" strokeLinecap="round"/>
                                                        </svg>
                                                      </span>
                                                      <strong style={{ color: '#fff' }}>Date:</strong>
                                                      <span style={{ color: 'rgba(255,255,255,0.9)' }}>{dateText}{timeText ? ` • ${timeText}` : ''}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                      <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                                                          <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                                                        </svg>
                                                      </span>
                                                      <strong style={{ color: '#fff' }}>Cost:</strong>
                                                      <span style={{ color: 'rgba(255,255,255,0.9)' }}>{costText}</span>
                                                    </div>
                                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-start', marginTop: 4 }}>
                                                    <a
                                                      href={directionsUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={() => { try { sfx.play('click', 0.45); } catch {} }}
                                                      style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: 7, border: '1px solid #FC54AF',
                                                        background: 'rgba(252,84,175,0.10)', color: '#FC54AF',
                                                        textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                                        fontSize: 11,
                                                        boxShadow: '0 0 10px rgba(252,84,175,0.25)'
                                                      }}
                                                    >
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                                                          <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                                                        </svg>
                                                        <span>DIRECTIONS</span>
                                                      </span>
                                                    </a>
                                                    
                                                    <a
                                                      href={calendarUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={() => { try { sfx.play('click', 0.45); } catch {} }}
                                                      style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: 7, border: '1px solid #00FFFF',
                                                        background: 'rgba(0,255,255,0.10)', color: '#00FFFF',
                                                        textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                                        fontSize: 11,
                                                        boxShadow: '0 0 10px rgba(0,255,255,0.25)'
                                                      }}
                                                    >
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.6"/>
                                                          <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.6" strokeLinecap="round"/>
                                                        </svg>
                                                        <span>+ CALENDAR</span>
                                                      </span>
                                                    </a>
                                                    <a
                                                      href={row.tickets_url || '#'}
                                                      target={row.tickets_url ? '_blank' : undefined}
                                                      rel={row.tickets_url ? 'noopener noreferrer' : undefined}
                                                      onClick={(e) => { if (!row.tickets_url) { e.preventDefault(); return; } try { sfx.play('click', 0.45); } catch {} }}
                                                      style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: 7,
                                                        border: row.tickets_url ? '1px solid #F2EF1D' : '1px solid rgba(255,255,255,0.35)',
                                                        background: row.tickets_url ? 'rgba(242,239,29,0.10)' : 'rgba(255,255,255,0.06)',
                                                        color: row.tickets_url ? '#F2EF1D' : 'rgba(255,255,255,0.6)',
                                                        textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                                        fontSize: 11,
                                                        boxShadow: row.tickets_url ? '0 0 10px rgba(242,239,29,0.25)' : '0 0 8px rgba(255,255,255,0.15)',
                                                        cursor: row.tickets_url ? 'pointer' : 'default',
                                                        pointerEvents: row.tickets_url ? 'auto' : 'none',
                                                        opacity: row.tickets_url ? 1 : 0.7
                                                      }}
                                                    >
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                                                          <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                                                        </svg>
                                                        <span>TICKETS</span>
                                                      </span>
                                                    </a>
                                                  </div>
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                      {!isDetailView && (
                                        <div
                                          style={{
                                            position: 'sticky',
                                            bottom: 'calc(8px + env(safe-area-inset-bottom))',
                                            marginTop: 6,
                                            paddingTop: 8,
                                            background:
                                              'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.75) 100%)',
                                            borderTop: '1px solid rgba(255,255,255,0.12)'
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                                            <a
                                              href="#"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                try { sfx.play('click', 0.45); } catch {}
                                                if (expandedIrlIndex !== null) {
                                                  setExpandedIrlIndex(null);
                                                } else {
                                                  setShowAllIrl(false);
                                                }
                                              }}
                                              style={{
                                                flex: 1,
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                borderRadius: 10,
                                                border: '1px solid rgba(255,255,255,0.95)',
                                                background: 'rgba(255,255,255,0.10)',
                                                color: '#FFFFFF',
                                                textDecoration: 'none', fontWeight: 700,
                                                padding: '8px 12px',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Back
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {/* Actions row above Upcoming IRL Signals */}
                            {!showAllIrl && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-start', marginTop: 2 }}>
                                <a
                                  href={directionsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => { try { sfx.play('click', 0.45); } catch {} }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 7, border: '1px solid #FC54AF',
                                    background: 'rgba(252,84,175,0.10)', color: '#FC54AF',
                                    textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                    fontSize: 11,
                                    boxShadow: '0 0 10px rgba(252,84,175,0.25)'
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.6"/>
                                      <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.6"/>
                                    </svg>
                                    <span>DIRECTIONS</span>
                                  </span>
                                </a>
                                
                                <a
                                  href={calendarUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => { try { sfx.play('click', 0.45); } catch {} }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 7, border: '1px solid #00FFFF',
                                    background: 'rgba(0,255,255,0.10)', color: '#00FFFF',
                                    textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                    fontSize: 11,
                                    boxShadow: '0 0 10px rgba(0,255,255,0.25)'
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.6"/>
                                      <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.6" strokeLinecap="round"/>
                                    </svg>
                                    <span>+ CALENDAR</span>
                                  </span>
                                </a>
                                <a
                                  href={nextIrl.url || '#'}
                                  target={nextIrl.url ? '_blank' : undefined}
                                  rel={nextIrl.url ? 'noopener noreferrer' : undefined}
                                  onClick={(e) => {
                                    if (!nextIrl.url) { e.preventDefault(); return; }
                                    try { sfx.play('click', 0.45); } catch {}
                                  }}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 7,
                                    border: nextIrl.url ? '1px solid #F2EF1D' : '1px solid rgba(255,255,255,0.35)',
                                    background: nextIrl.url ? 'rgba(242,239,29,0.10)' : 'rgba(255,255,255,0.06)',
                                    color: nextIrl.url ? '#F2EF1D' : 'rgba(255,255,255,0.6)',
                                    textDecoration: 'none', fontWeight: 700, padding: '4px 8px',
                                    fontSize: 11,
                                    boxShadow: nextIrl.url ? '0 0 10px rgba(242,239,29,0.25)' : '0 0 8px rgba(255,255,255,0.15)',
                                    cursor: nextIrl.url ? 'pointer' : 'default',
                                    pointerEvents: nextIrl.url ? 'auto' : 'none',
                                    opacity: nextIrl.url ? 1 : 0.7
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.6"/>
                                      <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.6" strokeLinecap="round"/>
                                    </svg>
                                    <span>TICKETS</span>
                                  </span>
                                </a>
                              </div>
                            )}
                            {/* CTA below rows */}
                            {!showAllIrl && (
                              <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start', marginTop: 4 }}>
                                <a
                                  href={nextIrl.url || '#'}
                                  target={nextIrl.url ? '_blank' : undefined}
                                  rel={nextIrl.url ? 'noopener noreferrer' : undefined}
                                  onClick={(e) => {
                                    if (!nextIrl.url) {
                                      e.preventDefault();
                                      try { sfx.play('click', 0.45); } catch {}
                                      setShowAllIrl(true);
                                    } else {
                                      try { sfx.play('card-ding', 0.6); } catch {}
                                    }
                                  }}
                                  className={!nextIrl.url ? 'upcoming-irl-pulse' : undefined}
                                  style={{
                                    flex: 1,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 10,
                                    border: (!nextIrl.url) ? '1px solid rgba(255,255,255,0.95)' : '1px solid #F2EF1D',
                                    background: (!nextIrl.url) ? 'rgba(255,255,255,0.10)' : 'rgba(242,239,29,0.1)',
                                    color: (!nextIrl.url) ? '#FFFFFF' : '#F2EF1D',
                                    textDecoration: 'none', fontWeight: 700,
                                    boxShadow: nextIrl.url ? '0 0 18px rgba(242,239,29,0.25)' : undefined,
                                    padding: '8px 12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {nextIrl.url ? 'TICKETS' : 'UPCOMING IRL SIGNALS'}
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Polished empty state
                      return (
                        <div style={{
                          border: '1px dashed rgba(0,255,255,0.35)', borderRadius: 10,
                          padding: 14, textAlign: 'center',
                          background: 'radial-gradient(100% 60% at 50% 0%, rgba(0,255,255,0.08) 0%, rgba(0,0,0,0) 70%)'
                        }}>
                          <div style={{ color: '#00FFFF', textShadow: '0 0 10px rgba(0,255,255,0.7)', letterSpacing: '0.18em', fontSize: 12, marginBottom: 6 }}>
                            AWAITING IRL COORDINATES
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                            No IRL signal in range. Lock in to get an alert when a mission is confirmed.
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                            <button
                              onClick={() => { try { sfx.play('click', 0.4); } catch {} setShowPhoneForm(true); }}
                              style={{
                                borderRadius: 8, border: '1px solid #00FFFF', background: 'rgba(0,255,255,0.1)',
                                color: '#00FFFF', padding: '10px 14px', fontWeight: 700,
                                boxShadow: '0 0 14px rgba(0,255,255,0.25)'
                              }}
                            >
                              Get SMS Alerts
                            </button>
                          </div>
                        </div>
                      );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
      </div>



      {/* Support Panel — slide-up overlay */}
      <AnimatePresence>
        {showTipOptions && irlSectionTop !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="tip-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowTipOptions(false); setShowPaymentOptions(false); setShowPaymentOptions5(false); setShowPaymentOptions10(false); }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 140 }}
            />

            {/* Slide-up panel */}
            <motion.div
              key="tip-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(252,84,175,0.4)',
                borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                zIndex: 145,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -8px 32px rgba(252,84,175,0.12)',
              }}
            >
              {/* Header */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 40px 10px',
                borderBottom: '1px solid rgba(252,84,175,0.2)',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace",
                  fontSize: 14,
                  letterSpacing: '0.18em',
                  color: '#FC54AF',
                  textShadow: '0 0 10px rgba(252,84,175,0.8)',
                  textAlign: 'center',
                }}>
                  SUPPORT THE HEARTVERSE
                </span>
                <button
                  onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowTipOptions(false); setShowPaymentOptions(false); setShowPaymentOptions5(false); setShowPaymentOptions10(false); }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '16px', overflowY: 'auto' }}>
                {/* Amount buttons row */}
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                  {[
                    { amount: 3, showState: showPaymentOptions, setShow: setShowPaymentOptions, closeOthers: () => { setShowPaymentOptions5(false); setShowPaymentOptions10(false); } },
                    { amount: 5, showState: showPaymentOptions5, setShow: setShowPaymentOptions5, closeOthers: () => { setShowPaymentOptions(false); setShowPaymentOptions10(false); } },
                    { amount: 10, showState: showPaymentOptions10, setShow: setShowPaymentOptions10, closeOthers: () => { setShowPaymentOptions(false); setShowPaymentOptions5(false); } },
                  ].map(({ amount, showState, setShow, closeOthers }) => (
                    <button
                      key={amount}
                      onClick={() => { try { sfx.play('audio/click.mp3', 0.3); } catch {} if (showState) { setShow(false); } else { closeOthers(); setShow(true); setSelectedTipAmount(amount); } }}
                      style={{
                        width: 64, height: 64,
                        background: showState ? 'rgba(252,84,175,0.25)' : 'rgba(252,84,175,0.1)',
                        border: `2px solid ${showState ? '#FC54AF' : 'rgba(252,84,175,0.6)'}`,
                        borderRadius: '50%',
                        color: '#FC54AF', fontSize: amount === 10 ? 14 : 16, fontWeight: 'bold',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 300ms ease',
                        textShadow: '0 0 8px #FC54AF',
                        boxShadow: showState ? '0 0 24px rgba(252,84,175,0.5)' : '0 0 15px rgba(252,84,175,0.3)',
                      }}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* Payment method buttons — shown when an amount is selected */}
                {(() => {
                  const stripeUrls = { 3: 'https://buy.stripe.com/bJeeVe5X3fZH9Nnchh4gg0P', 5: 'https://buy.stripe.com/3cIaEYbhn00JbVv4OP4gg0Q', 10: 'https://buy.stripe.com/4gM5kEdpv3cV9Nn6WX4gg0R' };
                  const venmoNotes = { 3: 'Fuel the Signal', 5: 'Boost the Transmission', 10: 'Ignite the Heartverse' };
                  const activeEntry = [
                    { amount: 3, showState: showPaymentOptions, setShow: setShowPaymentOptions },
                    { amount: 5, showState: showPaymentOptions5, setShow: setShowPaymentOptions5 },
                    { amount: 10, showState: showPaymentOptions10, setShow: setShowPaymentOptions10 },
                  ].find(e => e.showState);
                  if (!activeEntry) return null;
                  const { amount, setShow } = activeEntry;
                  return (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={amount}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}
                      >
                        {/* Card / Stripe */}
                        <button
                          onClick={() => { try { sfx.play('card-ding', 0.7); } catch {} window.open(stripeUrls[amount], '_blank'); setShow(false); }}
                          style={{
                            padding: 0, width: 64, height: 42,
                            background: 'rgba(252,84,175,0.1)', border: '2px solid #FC54AF', borderRadius: 8,
                            cursor: 'pointer', transition: 'all 300ms ease', boxShadow: '0 0 15px rgba(252,84,175,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 25px rgba(252,84,175,0.6)'; e.currentTarget.style.background = 'rgba(252,84,175,0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(252,84,175,0.3)'; e.currentTarget.style.background = 'rgba(252,84,175,0.1)'; }}
                        >
                          <img src="/elements/credit-card.webp" alt="Card" style={{ width: 58, height: 36, filter: 'brightness(0) saturate(100%) invert(19%) sepia(95%) saturate(1646%) hue-rotate(300deg) brightness(102%) contrast(98%)' }} />
                        </button>
                        {/* Venmo */}
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
                            padding: 0, width: 54, height: 54,
                            background: 'rgba(0,255,255,0.1)', border: '2px solid #00FFFF', borderRadius: '50%',
                            cursor: 'pointer', transition: 'all 300ms ease', boxShadow: '0 0 15px rgba(0,255,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 25px rgba(0,255,255,0.6)'; e.currentTarget.style.background = 'rgba(0,255,255,0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,255,0.3)'; e.currentTarget.style.background = 'rgba(0,255,255,0.1)'; }}
                        >
                          <img src="/elements/venmo.webp" alt="Venmo" style={{ width: 48, height: 48 }} />
                        </button>
                      </motion.div>
                    </AnimatePresence>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      


      {/* Phone Form — slide-up overlay */}
      <AnimatePresence>
        {showPhoneForm && irlSectionTop !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="phone-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowPhoneForm(false); }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 140,
              }}
            />

            {/* Slide-up panel */}
            <motion.div
              key="phone-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(0,255,255,0.35)',
                borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                zIndex: 145,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -8px 32px rgba(0,255,255,0.12)',
              }}
            >
              {/* Header */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 40px 10px',
                borderBottom: '1px solid rgba(0,255,255,0.2)',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace",
                  fontSize: 14,
                  letterSpacing: '0.18em',
                  color: '#00FFFF',
                  textShadow: '0 0 10px rgba(0,255,255,0.8)',
                  textAlign: 'center',
                }}>
                  STAY CONNECTED TO THE HEARTVERSE
                </span>
                <button
                  onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowPhoneForm(false); }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 14,
                padding: '16px 16px',
                overflowY: 'auto',
              }}>
                {error && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(255,0,0,0.1)',
                    border: '1px solid rgba(255,0,0,0.3)',
                    borderRadius: '8px',
                    color: '#ff6b6b',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}>
                    {error}
                  </div>
                )}

                <input
                  id="signal-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={profile?.phone ? profile.phone : "+1 5555555555 or your country code"}
                  disabled={status === 'saving'}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '2px solid #00FFFF',
                    boxShadow: '0 0 8px rgba(0,255,255,0.5), 0 0 15px rgba(0,255,255,0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 200ms ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#00FFFF';
                    e.target.style.boxShadow = '0 0 0 2px rgba(0,255,255,0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0,255,255,0.4)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {phone.length > 0 && !isValidPhone && (
                  <p className="text-pink-400 text-sm" style={{ margin: 0 }}>
                    Please enter a valid phone number with country code.
                  </p>
                )}

                <button
                  onClick={heartSignalSent && !user ? () => { try { sfx.play('click', 0.4); } catch {}; setShowWelcomeHome(true); } : sendHeartSignal}
                  disabled={status === 'saving' || (!heartSignalSent && !isValidPhone)}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: 'transparent',
                    border: status === 'saved' && heartSignalSent && !user
                      ? '2px solid #F2EF1D'
                      : status === 'saved'
                        ? '2px solid #00FF00'
                        : status === 'saving' || (!heartSignalSent && !isValidPhone)
                          ? '2px solid rgba(128,128,128,0.3)'
                          : '2px solid #00FFFF',
                    borderRadius: '8px',
                    color: status === 'saved' && heartSignalSent && !user
                      ? '#F2EF1D'
                      : status === 'saved'
                        ? '#00FF00'
                        : status === 'saving' || (!heartSignalSent && !isValidPhone)
                          ? 'rgba(128,128,128,0.7)'
                          : '#00FFFF',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: status === 'saving' || !isValidPhone ? 'not-allowed' : 'pointer',
                    transition: 'all 300ms ease',
                    boxShadow: status === 'saved' && heartSignalSent && !user
                      ? '0 0 15px rgba(242,239,29,0.5)'
                      : status === 'saved'
                        ? '0 0 15px rgba(0,255,0,0.3)'
                        : status === 'saving' || (!heartSignalSent && !isValidPhone)
                          ? 'none'
                          : '0 0 15px rgba(0,255,255,0.3)',
                    textShadow: status === 'saved' && heartSignalSent && !user
                      ? '0 0 10px #F2EF1D, 0 0 20px #F2EF1D'
                      : status === 'saved'
                        ? '0 0 10px #00FF00, 0 0 20px #00FF00'
                        : status === 'saving' || (!heartSignalSent && !isValidPhone)
                          ? 'none'
                          : '0 0 10px #00FFFF, 0 0 20px #00FFFF',
                    outline: 'none',
                  }}
                >
                  {status === 'saving' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Sending...
                    </div>
                  ) : status === 'saved' && heartSignalSent && !user ? (
                    'Signal received. Create your ALIEN profile.'
                  ) : status === 'saved' ? (
                    'Heart signal sent'
                  ) : (
                    'Send Heart Signal'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Concerts Panel — slide-up overlay showing upcoming IRL signals */}
      <AnimatePresence>
        {showConcertsPanel && irlSectionTop !== null && (
          <>
            {/* Backdrop */}
            <motion.div
              key="concerts-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowConcertsPanel(false); }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 140 }}
            />

            {/* Slide-up panel */}
            <motion.div
              key="concerts-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(242,239,29,0.4)',
                borderBottom: 'none',
                borderRadius: '12px 12px 0 0',
                zIndex: 145,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -8px 32px rgba(242,239,29,0.1)',
              }}
            >
              {/* Header */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 40px 10px',
                borderBottom: '1px solid rgba(242,239,29,0.25)',
                flexShrink: 0,
              }}>
                {concertsExpandedIdx !== null && (
                  <button
                    onClick={() => { try { sfx.play('close', 0.4); } catch {} setConcertsExpandedIdx(null); }}
                    onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                    style={{
                      position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
                    }}
                  >←</button>
                )}
                <span style={{
                  fontFamily: "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace",
                  fontSize: 14,
                  letterSpacing: '0.18em',
                  color: '#F2EF1D',
                  textShadow: '0 0 10px rgba(242,239,29,0.8)',
                  textAlign: 'center',
                }}>
                  {concertsExpandedIdx !== null ? 'NEXT IN PERSON SIGNAL' : 'UPCOMING IRL SIGNALS'}
                </span>
                <button
                  onClick={() => { try { sfx.play('close', 0.4); } catch {} setShowConcertsPanel(false); setConcertsExpandedIdx(null); }}
                  onMouseEnter={() => { try { sfx.play('hover', 0.35); } catch {} }}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px',
                  }}
                >×</button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {showsLoading && (
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>
                    Loading signals...
                  </div>
                )}
                {!showsLoading && (() => {
                  const nowMs = Date.now();
                  const upcoming = (Array.isArray(shows) ? shows : [])
                    .map((row) => ({ row, d: new Date(row.date) }))
                    .filter(({ d }) => !isNaN(d.getTime()) && d.getTime() >= nowMs)
                    .sort((a, b) => a.d.getTime() - b.d.getTime());

                  if (upcoming.length === 0) {
                    return (
                      <div style={{
                        border: '1px dashed rgba(242,239,29,0.35)', borderRadius: 10,
                        padding: 16, textAlign: 'center',
                        background: 'radial-gradient(100% 60% at 50% 0%, rgba(242,239,29,0.06) 0%, rgba(0,0,0,0) 70%)'
                      }}>
                        <div style={{ color: '#F2EF1D', letterSpacing: '0.18em', fontSize: 12, marginBottom: 6 }}>
                          NO TERRESTRIAL COORDINATES DETECTED
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                          No IRL signals scheduled. Check back soon.
                        </div>
                      </div>
                    );
                  }

                  const fmtDate = (d) => {
                    try { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d); }
                    catch { return d.toDateString(); }
                  };
                  const fmtDateShort = (d) => {
                    try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d); }
                    catch { return d.toLocaleDateString(); }
                  };
                  const pad = (n) => String(n).padStart(2, '0');
                  const toGCalDateUTC = (d0) => `${d0.getUTCFullYear()}${pad(d0.getUTCMonth()+1)}${pad(d0.getUTCDate())}T${pad(d0.getUTCHours())}${pad(d0.getUTCMinutes())}00Z`;

                  // ── DETAIL VIEW ──────────────────────────────────────────
                  if (concertsExpandedIdx !== null) {
                    const item = upcoming[concertsExpandedIdx];
                    if (!item) { setConcertsExpandedIdx(null); return null; }
                    const { row, d } = item;
                    const venue = row.location || '';
                    const dateText = row.display_date || fmtDate(d);
                    const timeText = row.time_label || '';
                    const costText = (row.cost && String(row.cost).toUpperCase().includes('FREE')) ? 'FREE' : (row.cost || 'TBA');
                    const ticketsUrl = row.tickets_url || '';
                    const directionsUrl = row.directions && String(row.directions).startsWith('http')
                      ? row.directions
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
                    const hasTime = !isNaN(d.getHours());
                    let startStr = '', endStr = '';
                    if (hasTime) {
                      const end = new Date(d.getTime() + 150 * 60 * 1000);
                      startStr = toGCalDateUTC(d); endStr = toGCalDateUTC(end);
                    } else {
                      const ymd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
                      startStr = ymd; endStr = ymd;
                    }
                    const calEventTitle = 'CHXNDLER live at ' + (venue || 'IRL Signal');
                    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calEventTitle)}&dates=${startStr}/${endStr}&location=${encodeURIComponent(venue)}&ctz=America/New_York`;

                    const iconStyle = { width: 18, height: 18, flexShrink: 0 };
                    const rowStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' };
                    const labelStyle = { fontWeight: 800, color: '#fff', fontSize: 14, marginRight: 4, flexShrink: 0 };
                    const valueStyle = { color: 'rgba(255,255,255,0.88)', fontSize: 14 };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Info rows */}
                        <div style={{ flex: 1 }}>
                          {/* Location */}
                          <div style={rowStyle}>
                            <svg style={iconStyle} viewBox="0 0 24 24" fill="none">
                              <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.8"/>
                              <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.8"/>
                            </svg>
                            <span style={labelStyle}>Location:</span>
                            <span style={valueStyle}>{venue || 'TBA'}</span>
                          </div>
                          {/* Date */}
                          <div style={rowStyle}>
                            <svg style={iconStyle} viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.8"/>
                              <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            <span style={labelStyle}>Date:</span>
                            <span style={valueStyle}>{dateText}{timeText ? ` • ${timeText}` : ''}</span>
                          </div>
                          {/* Cost */}
                          <div style={{ ...rowStyle, borderBottom: 'none' }}>
                            <svg style={iconStyle} viewBox="0 0 24 24" fill="none">
                              <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="#F2EF1D" strokeWidth="1.8"/>
                              <path d="M8.5 12h7" stroke="#F2EF1D" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            <span style={labelStyle}>Cost:</span>
                            <span style={valueStyle}>{costText}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, paddingTop: 8, flexWrap: 'wrap' }}>
                          <a
                            href={directionsUrl} target="_blank" rel="noopener noreferrer"
                            onClick={() => { try { sfx.play('click', 0.4); } catch {} }}
                            style={{
                              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 8px', borderRadius: 10, textDecoration: 'none',
                              border: '1px solid rgba(252,84,175,0.6)', background: 'rgba(252,84,175,0.08)',
                              color: '#FC54AF', fontWeight: 700, fontSize: 13,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M12 21s-7-6.58-7-11a7 7 0 1 1 14 0c0 4.42-7 11-7 11z" stroke="#FC54AF" strokeWidth="1.8"/>
                              <circle cx="12" cy="10" r="2.5" stroke="#FC54AF" strokeWidth="1.8"/>
                            </svg>
                            DIRECTIONS
                          </a>
                          <a
                            href={calendarUrl} target="_blank" rel="noopener noreferrer"
                            onClick={() => { try { sfx.play('click', 0.4); } catch {} }}
                            style={{
                              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 8px', borderRadius: 10, textDecoration: 'none',
                              border: '1px solid rgba(0,255,255,0.6)', background: 'rgba(0,255,255,0.08)',
                              color: '#00FFFF', fontWeight: 700, fontSize: 13,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="5" width="18" height="16" rx="2" stroke="#00FFFF" strokeWidth="1.8"/>
                              <path d="M3 9h18M8 3v4M16 3v4" stroke="#00FFFF" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            + CALENDAR
                          </a>
                          <a
                            href={ticketsUrl || '#'} target={ticketsUrl ? '_blank' : undefined} rel="noopener noreferrer"
                            onClick={(e) => { if (!ticketsUrl) e.preventDefault(); try { sfx.play('click', 0.4); } catch {} }}
                            style={{
                              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 8px', borderRadius: 10, textDecoration: 'none',
                              border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13,
                              opacity: ticketsUrl ? 1 : 0.45,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
                              <path d="M8.5 12h7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                            TICKETS
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // ── LIST VIEW ────────────────────────────────────────────
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {upcoming.map(({ row, d }, idx) => {
                        const title = row.title || row.location || '';
                        const venue = row.location || '';
                        const dateShort = row.display_date || fmtDateShort(d);
                        const timeText = row.time_label || '';
                        const isNext = idx === 0;
                        return (
                          <button
                            key={row.id || idx}
                            type="button"
                            onClick={() => { try { sfx.play('click', 0.4); } catch {} setConcertsExpandedIdx(idx); }}
                            onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
                            style={{
                              width: '100%', textAlign: 'left', cursor: 'pointer',
                              border: `1px solid ${isNext ? 'rgba(242,239,29,0.45)' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: 10, padding: '12px 14px',
                              background: isNext ? 'rgba(242,239,29,0.05)' : 'rgba(255,255,255,0.02)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                              outline: 'none',
                              transition: 'background 150ms ease, border-color 150ms ease',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              {isNext && (
                                <div style={{
                                  fontFamily: "'SF Mono','Fira Code',monospace",
                                  fontSize: 9, letterSpacing: '0.22em', color: '#F2EF1D',
                                  textShadow: '0 0 8px rgba(242,239,29,0.6)', marginBottom: 4,
                                }}>NEXT SIGNAL</div>
                              )}
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 2,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                              </div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                                {dateShort}{timeText ? ` • ${timeText}` : ''}
                              </div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                              <path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Text Button - positioned in bottom left (fixed to viewport) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (process.env.NODE_ENV !== "production") console.log('Chat button clicked! Current state:', isChatOpen);
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          // Close phone form and tip panel before opening chat
          if (!isChatOpen && showPhoneForm) {
            setShowPhoneForm(false);
          }
          if (!isChatOpen && showTipOptions) {
            setShowTipOptions(false);
            setShowPaymentOptions(false);
            setShowPaymentOptions5(false);
            setShowPaymentOptions10(false);
          }
          setIsChatOpen(!isChatOpen);
          if (process.env.NODE_ENV !== "production") console.log('Setting chat state to:', !isChatOpen);
        }}
        title=""
        className="text-chat-button"
        style={{
          position: 'fixed',
          bottom: '15px',
          left: '10px',
          width: '60px',
          height: '60px',
          background: 'rgba(252, 84, 175, 0.1)',
          border: '2px solid #FC54AF',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 300ms ease',
          outline: 'none',
          boxShadow: '0 0 15px rgba(252, 84, 175, 0.4)',
          zIndex: isChatOpen ? (isChatProfileOpen ? 10 : 120) : 1000,
          overflow: 'hidden',
          pointerEvents: (isChatOpen && isChatProfileOpen) ? 'none' : 'auto'
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.target.style.transform = 'scale(1.1)';
          e.target.style.background = 'rgba(252, 84, 175, 0.2)';
          e.target.style.boxShadow = '0 0 25px rgba(252, 84, 175, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.background = 'rgba(252, 84, 175, 0.1)';
          e.target.style.boxShadow = '0 0 15px rgba(252, 84, 175, 0.4)';
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
      <EpisodesLibrary isChatOpen={isChatOpen} visible={visible} onOpenChange={setIsEpisodesOpen} />

      {/* Concerts Button - positioned to the left of Phone button */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          const opening = !showConcertsPanel;
          if (opening) {
            setShowPhoneForm(false);
            setShowTipOptions(false);
            setShowPaymentOptions(false);
            setShowPaymentOptions5(false);
            setShowPaymentOptions10(false);
          }
          setShowConcertsPanel(opening);
        }}
        style={{
          position: 'fixed',
          bottom: '15px',
          right: '205px',
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
          zIndex: (isChatOpen || isEpisodesOpen) ? 10 : 1200,
          pointerEvents: (isChatOpen || isEpisodesOpen) ? 'none' : 'auto',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
        }}
        aria-label="Concerts"
      >
        <img
          src="/elements/concerts.png"
          alt="Concerts"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(1.2) saturate(1.2)'
          }}
        />
      </button>

      {/* Phone Button - positioned to the left of $ button (fixed to viewport) */}
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
            setShowConcertsPanel(false);
          }
          setShowPhoneForm(opening);
        }}
        style={{
          position: 'fixed',
          bottom: '15px',
          right: '75px',
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
          zIndex: (isChatOpen || isEpisodesOpen) ? 10 : 1200,
          pointerEvents: (isChatOpen || isEpisodesOpen) ? 'none' : 'auto',
        }}
        onMouseEnter={(e) => {
          try { sfx.play('hover', 0.3); } catch {}
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
          e.currentTarget.style.textShadow = '0 0 15px #00FFFF, 0 0 25px #00FFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
          e.currentTarget.style.textShadow = '0 0 8px #00FFFF';
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


      {/* $ Button - positioned to the left of Episodes button (fixed to viewport) */}
      <button
        onClick={() => {
          try { sfx.play('audio/click.mp3', 0.5); } catch {}
          const opening = !showTipOptions;
          setShowTipOptions(opening);
          setShowPaymentOptions(false);
          setShowPaymentOptions5(false);
          setShowPaymentOptions10(false);
          // Close phone/concerts form so they don't stack
          if (opening) {
            setShowPhoneForm(false);
            setShowConcertsPanel(false);
          }
        }}
        style={{
          position: 'fixed',
          bottom: '15px',
          right: '140px',
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
          zIndex: (isChatOpen || isEpisodesOpen) ? 10 : 1200,
          pointerEvents: (isChatOpen || isEpisodesOpen) ? 'none' : 'auto',
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

        /* Subtle glow and pulse for entire IRL box */
        .irl-pulse {
          box-shadow:
            0 0 18px rgba(242,239,29,0.22),
            0 0 32px rgba(242,239,29,0.12);
          animation: irlPulse 3.2s ease-in-out infinite;
        }
        @keyframes irlPulse {
          0%, 100% {
            box-shadow:
              0 0 28px rgba(242,239,29,0.34),
              0 0 56px rgba(242,239,29,0.20),
              0 0 72px rgba(242,239,29,0.12);
          }
          50% {
            box-shadow:
              0 0 16px rgba(242,239,29,0.18),
              0 0 36px rgba(242,239,29,0.10),
              0 0 48px rgba(242,239,29,0.06);
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

        @keyframes liveIndicatorPulse {
          0%, 100% {
            text-shadow:
              0 0 8px #FC54AF,
              0 0 20px rgba(252, 84, 175, 0.5),
              0 0 40px rgba(252, 84, 175, 0.25);
          }
          50% {
            text-shadow:
              0 0 4px #FC54AF,
              0 0 12px rgba(252, 84, 175, 0.35),
              0 0 24px rgba(252, 84, 175, 0.15);
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

        /* White glowing pulse for "UPCOMING IRL SIGNALS" CTA */
        .upcoming-irl-pulse {
          animation: upcomingIrlPulse 2.6s ease-in-out infinite;
        }
        @keyframes upcomingIrlPulse {
          0%, 100% {
            box-shadow:
              0 0 22px rgba(255,255,255,0.45),
              0 0 36px rgba(255,255,255,0.25);
            text-shadow: 0 0 8px rgba(255,255,255,0.90);
          }
          50% {
            box-shadow:
              0 0 12px rgba(255,255,255,0.25),
              0 0 22px rgba(255,255,255,0.15);
            text-shadow: 0 0 3px rgba(255,255,255,0.60);
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
