"use client";

import React, { useRef, useState, useEffect } from "react";
import { useGoLiveOverride } from "@/hooks/useGoLiveOverride";

// ── Broadcast schedule helpers ──────────────────────────────────────────────

/**
 * Returns the next upcoming broadcast based on the recurring schedule:
 *   Monday  7 PM ET → Acoustic Session
 *   Thursday 7 PM ET → Electric Session
 *
 * Respects America/New_York (EST/EDT) via Intl.DateTimeFormat.
 */
function getNextBroadcast(now = new Date()) {
  const tz = 'America/New_York';

  // Current date/time parts in Eastern Time
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type) => {
    const val = parts.find((p) => p.type === type)?.value ?? '0';
    return parseInt(val, 10);
  };

  const etYear = get('year');
  const etMonth = get('month');
  const etDay = get('day');
  const etHour = get('hour') === 24 ? 0 : get('hour'); // midnight edge

  // Day-of-week in ET (0 = Sun … 6 = Sat)
  const etDate = new Date(etYear, etMonth - 1, etDay);
  const etDow = etDate.getDay();

  let daysUntil;
  let kind;

  const isBeforeStreamEnd = etHour < 20; // before 8 PM ET

  if (etDow === 1 && isBeforeStreamEnd) {
    // Monday before 8 PM → target this Monday
    daysUntil = 0;
    kind = 'acoustic';
  } else if (etDow === 4 && isBeforeStreamEnd) {
    // Thursday before 8 PM → target this Thursday
    daysUntil = 0;
    kind = 'electric';
  } else {
    // Find the soonest Monday (1) or Thursday (4) in the future
    const daysToMon = ((1 - etDow + 7) % 7) || 7;
    const daysToThu = ((4 - etDow + 7) % 7) || 7;

    if (daysToMon < daysToThu) {
      daysUntil = daysToMon;
      kind = 'acoustic';
    } else {
      daysUntil = daysToThu;
      kind = 'electric';
    }
  }

  // Build the target calendar date in ET
  const targetCalendar = new Date(etYear, etMonth - 1, etDay + daysUntil);
  const tY = targetCalendar.getFullYear();
  const tM = targetCalendar.getMonth(); // 0-indexed
  const tD = targetCalendar.getDate();

  // Convert "tY-tM-tD 19:00 ET" → UTC Date
  // Try EST (UTC-5) first, then check if it's actually EDT (UTC-4)
  let target = new Date(Date.UTC(tY, tM, tD, 19 + 5, 0, 0));
  const checkParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(target);
  const checkHour = parseInt(checkParts.find((p) => p.type === 'hour')?.value ?? '0', 10);

  if (checkHour !== 19) {
    // EDT offset (UTC-4)
    target = new Date(Date.UTC(tY, tM, tD, 19 + 4, 0, 0));
  }

  const label =
    kind === 'acoustic'
      ? 'MONDAY \u2022 7:00 PM EST \u2022 ACOUSTIC SIGNAL'
      : 'THURSDAY \u2022 7:00 PM EST \u2022 ELECTRIC SIGNAL';

  return { kind, start: target, label };
}

/**
 * Formats a millisecond delta as DD:HH:MM:SS (always 2-digit, includes days).
 */
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

// ── Component ───────────────────────────────────────────────────────────────

export default function TwitchEmbed({ visible = true, channel = "chxndlerthealien" } = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(true);
  const [streamStatus, setStreamStatus] = useState('offline');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [nextBroadcast, setNextBroadcast] = useState(null);
  const iframeRef = useRef(null);
  const { isOverrideActive } = useGoLiveOverride();

  // Check if currently inside a broadcast window (Mon/Thu 7-9 PM ET)
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

    const get = (type) => {
      const val = parts.find((p) => p.type === type)?.value ?? '0';
      return parseInt(val, 10);
    };

    const etHour = get('hour') === 24 ? 0 : get('hour');
    const etDate = new Date(get('year'), get('month') - 1, get('day'));
    const etDow = etDate.getDay(); // 0=Sun, 1=Mon, 4=Thu

    const isBroadcastDay = etDow === 1 || etDow === 4; // Monday or Thursday
    const isDuringStream = etHour >= 19 && etHour < 20;  // 7 PM – 8 PM ET

    return isBroadcastDay && isDuringStream;
  };

  // Check stream status — show embed during broadcast windows OR when override is active
  const checkStreamStatus = async () => {
    if (isOverrideActive || isInBroadcastWindow()) {
      setStreamStatus('live');
      setIsOffline(false);
      setIsLoading(true);
    } else {
      setStreamStatus('offline');
      setIsOffline(true);
    }
  };

  // Initialize when component becomes visible + re-check every 30s for window transitions
  useEffect(() => {
    if (visible) {
      checkStreamStatus();
      const id = setInterval(checkStreamStatus, 30000);
      return () => clearInterval(id);
    }
  }, [visible, channel, isOverrideActive]);

  // Countdown ticker — runs every second while offline
  useEffect(() => {
    if (!isOffline || streamStatus !== 'offline') return;

    const tick = () => {
      const broadcast = getNextBroadcast();
      setNextBroadcast(broadcast);
      setTimeRemaining(Math.max(0, broadcast.start.getTime() - Date.now()));
    };

    tick(); // fire immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isOffline, streamStatus]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openTwitchInNewTab = () => {
    try {
      window.open(`https://www.twitch.tv/${channel}`, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className="text-white text-center mb-4">
          <p className="mb-2">Stream unavailable</p>
          <p className="text-sm opacity-75">Click below to open Twitch</p>
        </div>
        <button
          onClick={openTwitchInNewTab}
          className="text-white bg-[#9146FF]/30 ring-2 ring-[#9146FF] rounded-lg px-4 py-2 hover:bg-[#9146FF]/40 transition-all duration-200 shadow-[0_0_20px_rgba(145,70,255,0.5)]"
        >
          Open on Twitch
        </button>
      </div>
    );
  }

  // ── Offline: Heart Signal countdown ─────────────────────────────────────
  if (isOffline && streamStatus === 'offline') {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ width: '100%', height: '400px' }}
      >
        <div className="text-center px-4">
          {/* Small label */}
          <div
            className="text-xs md:text-sm font-mono tracking-widest mb-2"
            style={{
              color: '#FC54AF',
              textShadow: '0 0 6px #FC54AF, 0 0 12px #FC54AF',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            HEART SIGNAL
          </div>

          {/* Big headline */}
          <h2
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-wider"
            style={{
              color: '#FC54AF',
              textShadow: `
                0 0 8px #FC54AF,
                0 0 15px #FC54AF,
                0 0 25px #FC54AF,
                0 0 35px #FC54AF,
                0 0 50px #FC54AF
              `,
              animation: 'neonFlicker 2s infinite alternate',
              filter: 'drop-shadow(0 0 20px #FC54AF)',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            NEXT TRANSMISSION IN
          </h2>

          {/* Large countdown DD:HH:MM:SS */}
          <div
            className="text-5xl md:text-7xl lg:text-8xl font-mono tracking-wide mt-5"
            style={{
              color: '#00FFFF',
              textShadow: `
                0 0 8px #00FFFF,
                0 0 15px #00FFFF,
                0 0 25px #00FFFF,
                0 0 35px #00FFFF,
                0 0 45px #00FFFF
              `,
              animation: 'neonPulse 1.5s infinite',
              filter: 'drop-shadow(0 0 20px #00FFFF)',
              fontWeight: 'bold',
              letterSpacing: '0.05em',
            }}
          >
            {formatCountdown(timeRemaining)}
          </div>

          {/* Session info line */}
          {nextBroadcast && (
            <div
              className="text-sm md:text-base lg:text-lg font-bold tracking-wide mt-4"
              style={{
                color: '#FFD700',
                textShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.3)',
                letterSpacing: '0.12em',
              }}
            >
              {nextBroadcast.label}
            </div>
          )}

          {/* Manual reconnect */}
          <button
            onClick={() => {
              setIsOffline(false);
              setIsLoading(true);
              checkStreamStatus();
            }}
            className="mt-6 text-white bg-[#9146FF]/30 ring-2 ring-[#9146FF] rounded-lg px-6 py-3 hover:bg-[#9146FF]/40 transition-all duration-200 shadow-[0_0_20px_rgba(145,70,255,0.5)]"
          >
            Try Reconnect Now
          </button>
        </div>

        <style jsx>{`
          @keyframes neonFlicker {
            0%, 100% {
              text-shadow:
                0 0 5px #FC54AF,
                0 0 10px #FC54AF,
                0 0 15px #FC54AF,
                0 0 20px #FC54AF,
                0 0 35px #FC54AF,
                0 0 40px #FC54AF;
            }
            50% {
              text-shadow:
                0 0 2px #FC54AF,
                0 0 5px #FC54AF,
                0 0 8px #FC54AF,
                0 0 12px #FC54AF,
                0 0 20px #FC54AF,
                0 0 25px #FC54AF;
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
        `}</style>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ width: '100%', height: '400px' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg z-10">
          <div className="text-white text-sm">Loading stream...</div>
        </div>
      )}

      {/* Twitch chat iframe - positioned at top, half height */}
      <div style={{ height: '33%' }} className="mb-2">
        <iframe
          src={`https://www.twitch.tv/embed/${channel}/chat?parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&darkpopout`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          style={{
            borderRadius: '8px',
            border: '1px solid #FC54AF66',
            background: 'rgba(0,0,0,0.8)'
          }}
          title={`${channel} Twitch Chat`}
        />
      </div>

      {/* Twitch embed iframe - video player */}
      <div className="relative" style={{ height: '67%' }}>
        <iframe
          ref={iframeRef}
          src={`https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&autoplay=false&muted=true`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            borderRadius: '8px',
            border: '1px solid #FC54AF66',
            background: 'rgba(0,0,0,0.8)'
          }}
          title={`${channel} Twitch Stream`}
          allow="autoplay; fullscreen"
        />

        {/* Stream overlay controls */}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={openTwitchInNewTab}
            className="text-xs text-white bg-[#9146FF]/80 hover:bg-[#9146FF] px-2 py-1 rounded transition-all duration-200 backdrop-blur-sm"
            title="Open on Twitch"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}
