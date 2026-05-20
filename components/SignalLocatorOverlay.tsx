"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { sfx } from "@/lib/sfx";
import { useAudio } from "@/app/providers/AudioProvider";

type Phase =
  | "idle"
  | "warp"
  | "starfield"
  | "radar"
  | "heartbeat"
  | "eliminating"
  | "lockon"
  | "pulse"
  | "cockpit";

interface CardOrder {
  id: string | number;
  shipping_full_name: string | null;
  created_at: string;
  is_winner?: boolean;
}

// Deterministic pseudo-random bg star positions (avoids re-render flicker)
const BG_STARS = Array.from({ length: 70 }, (_, i) => ({
  left: `${((i * 19.3 + 7.1) % 97 + 1.5).toFixed(2)}%`,
  top: `${((i * 31.7 + 13.3) % 93 + 2.5).toFixed(2)}%`,
  size: (i % 3) + 1,
  opacity: (0.15 + (i % 7) * 0.07).toFixed(2),
}));

const RING_CONFIG = [
  { radiusFraction: 0.14, duration: 22 },
  { radiusFraction: 0.24, duration: 35 },
  { radiusFraction: 0.34, duration: 50 },
];
const MAX_STARS_VISIBLE = 48;

export default function SignalLocatorOverlay() {
  const audioManager = useAudio();
  const [phase, setPhase] = useState<Phase>("idle");
  const [orders, setOrders] = useState<CardOrder[]>([]);
  const [winner, setWinner] = useState<CardOrder | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string | number>>(new Set());
  const [showRadar, setShowRadar] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [lockonActive, setLockonActive] = useState(false);
  const [warpExiting, setWarpExiting] = useState(false);
  const [radarFlareActive, setRadarFlareActive] = useState(false);
  const [radarRingCount, setRadarRingCount] = useState(0);
  const [vmin, setVmin] = useState(600);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const centerAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const update = () => setVmin(Math.min(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const stopCenterAudio = useCallback(() => {
    try {
      if (centerAudioRef.current) {
        centerAudioRef.current.pause();
        centerAudioRef.current = null;
      }
    } catch {}
    try { audioManager.stopAllAudio(); } catch {}
  }, [audioManager]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  const runAnimation = useCallback(async () => {
    clearTimers();
    stopCenterAudio();
    setPhase("warp");
    setEliminatedIds(new Set());
    setShowRadar(false);
    setHeartbeatActive(false);
    setLockonActive(false);
    setWarpExiting(false);
    setRadarFlareActive(false);
    setRadarRingCount(0);

    // Stop all playing music via DOM (works regardless of audio provider context)
    try {
      document.querySelectorAll("audio").forEach((a) => {
        try { a.pause(); a.currentTime = 0; } catch {}
      });
    } catch {}

    // Warp sound
    try { sfx.play("warp", 0.85); } catch {}

    const animStart = Date.now();

    // Fetch data during warp phase
    let allOrders: CardOrder[] = [];
    let winnerData: CardOrder | null = null;
    try {
      const [ordersRes, winnerRes] = await Promise.all([
        fetch("/api/cards/chxndler-orders").then((r) => r.json()),
        fetch("/api/cards/signal-winner").then((r) => r.json()),
      ]);
      allOrders = Array.isArray(ordersRes)
        ? ordersRes.slice(0, MAX_STARS_VISIBLE)
        : [];
      winnerData = winnerRes.winner || null;
    } catch {}

    setOrders(allOrders);
    setWinner(winnerData);

    // Offset all timers by how long the fetch took (warp already started)
    const elapsed = Date.now() - animStart;
    const t = (delay: number) => Math.max(0, delay - elapsed);

    let seq = 2800; // warp duration — long enough for lightspeed.mp4 to play fully

    // Begin fade-out of warp video 300ms before phase switch
    after(t(seq - 300), () => setWarpExiting(true));

    after(t(seq), () => {
      setPhase("starfield");
      setWarpExiting(false);
      // Play center.mp3 via AudioProvider (pre-unlocked, handles Supabase URL)
      try { audioManager.playTrack('center').catch(() => {}); } catch {}
    });

    // Helper: fire a radar brightness flare + ring burst + SFX pulse together
    const radarPulse = (delay: number, vol: number) => {
      after(t(delay), () => {
        try { sfx.play("heart-pulse", vol); } catch {}
        setRadarFlareActive(true);
        setRadarRingCount((c) => c + 1);
        after(t(delay + 200), () => setRadarFlareActive(false));
      });
    };

    seq += 2200; // stars visible + orbit begins
    after(t(seq), () => {
      setShowRadar(true);
      setPhase("radar");
    });
    // Three synced SFX + flare pulses across the radar sweep
    radarPulse(seq,        0.7);
    radarPulse(seq + 900,  0.55);
    radarPulse(seq + 2000, 0.4);

    seq += 3000; // radar sweep
    after(t(seq), () => {
      setShowRadar(false);
      setHeartbeatActive(true);
      setPhase("heartbeat");
    });

    seq += 2200; // heartbeat
    const elimStart = seq;
    after(t(seq), () => setPhase("eliminating"));

    const winnerId = winnerData ? String(winnerData.id) : null;
    const nonWinners = allOrders.filter((o) => String(o.id) !== winnerId);
    const shuffled = [...nonWinners].sort(() => Math.random() - 0.5);
    const elimInterval = Math.max(150, Math.min(350, 4000 / Math.max(shuffled.length, 1)));

    shuffled.forEach((order, i) => {
      after(t(elimStart + (i + 1) * elimInterval), () => {
        setEliminatedIds((prev) => new Set([...prev, order.id]));
        try { sfx.play("click", 0.18); } catch {}
      });
    });

    seq = elimStart + shuffled.length * elimInterval + 900;
    after(t(seq), () => {
      setHeartbeatActive(false);
      setLockonActive(true);
      setPhase("lockon");
      // Signal located SFX
      try { sfx.play("star", 1.0); } catch {}
      after(t(seq + 400), () => { try { sfx.play("card-ding", 0.8); } catch {} });
    });

    seq += 2800;
    after(t(seq), () => {
      setLockonActive(false);
      setPhase("pulse");
    });

    seq += 1600;
    after(t(seq), () => {
      setPhase("cockpit");
      try { sfx.play('join-alien', 0.85); } catch {}
    });
  }, [after, clearTimers, stopCenterAudio, audioManager]);

  useEffect(() => {
    const handler = () => runAnimation();
    window.addEventListener("locateSignal", handler);
    return () => {
      window.removeEventListener("locateSignal", handler);
      clearTimers();
      stopCenterAudio();
    };
  }, [runAnimation, clearTimers, stopCenterAudio]);

  useEffect(() => () => { clearTimers(); stopCenterAudio(); }, [clearTimers, stopCenterAudio]);

  const ringOrders = useMemo(() => {
    const r0 = orders.filter((_, i) => i % 3 === 0);
    const r1 = orders.filter((_, i) => i % 3 === 1);
    const r2 = orders.filter((_, i) => i % 3 === 2);
    return [r0, r1, r2];
  }, [orders]);

  const winnerId = winner ? String(winner.id) : null;

  if (phase === "idle") return null;
  if (typeof document === "undefined") return null;

  const isVisible = phase !== "warp";
  const centerSize = Math.round(vmin * 0.22);

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 2147483649, background: "rgba(0,0,5,0.97)", backdropFilter: "blur(3px)" }}
    >
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BG_STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, background: "white", opacity: s.opacity }}
          />
        ))}
      </div>

      {/* Warp sky video — fills background during warp phase, fades out on exit */}
      {(phase === "warp" || warpExiting) && (
        <video
          autoPlay
          muted
          playsInline
          loop
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            pointerEvents: "none",
            opacity: warpExiting ? 0 : 1,
            transition: "opacity 300ms ease",
          }}
        >
          <source src="/skies/lightspeed.mp4" type="video/mp4" />
        </video>
      )}

      {/* Warp zoom */}
      {phase === "warp" && (
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 35%, rgba(255,255,255,0.15) 60%, transparent 80%)",
            animation: "signal-warp 2.5s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Solar system layer */}
      {isVisible && (
        <div className="absolute inset-0">
          {/* Radar sweep */}
          {showRadar && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: vmin * 0.85,
                height: vmin * 0.85,
                borderRadius: "50%",
                animation: "signal-radar 2s linear infinite",
                background: "conic-gradient(from 0deg, transparent 0deg, rgba(252,84,175,0.06) 30deg, rgba(252,84,175,0.28) 55deg, transparent 56deg)",
                filter: radarFlareActive ? "brightness(3) saturate(1.4)" : "brightness(1)",
                transition: "filter 150ms ease",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Radar pulse ring — re-mounts on each pulse to replay animation */}
          {showRadar && radarRingCount > 0 && (
            <div
              key={radarRingCount}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: vmin * 0.26,
                height: vmin * 0.26,
                border: "2px solid rgba(252,84,175,0.9)",
                borderRadius: "50%",
                animation: "signal-shockwave 3.2s ease-out forwards",
                pointerEvents: "none",
                zIndex: 20,
              }}
            />
          )}


          {/* Orbit stars */}
          {ringOrders.map((ringOrdrs, ringIdx) => {
            const { radiusFraction, duration } = RING_CONFIG[ringIdx];
            const radius = Math.round(vmin * radiusFraction);
            return ringOrdrs.map((order, j) => {
              const totalInRing = ringOrdrs.length;
              const angleOffset = (j / Math.max(totalInRing, 1)) * 360;
              const isWinner = String(order.id) === winnerId;
              const isEliminated = eliminatedIds.has(order.id);
              // Winner looks identical to all stars until lockon phase
              const showLockon = lockonActive && isWinner;

              return (
                <div
                  key={order.id}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 0,
                    height: 0,
                    animation: `signal-orbit ${duration}s linear infinite`,
                    animationDelay: `-${((angleOffset / 360) * duration).toFixed(2)}s`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: `-${radius}px`,
                      transform: "translate(-50%, -50%)",
                      fontSize: showLockon ? "22px" : "16px",
                      lineHeight: 1,
                      color: "#fff",
                      textShadow: showLockon
                        ? "0 0 10px #fff, 0 0 22px #FC54AF, 0 0 50px rgba(252,84,175,.7)"
                        : "0 0 5px rgba(255,255,255,.9), 0 0 12px rgba(255,255,255,.45)",
                      opacity: isEliminated ? 0 : 1,
                      transition: "opacity 0.65s ease, font-size 0.4s ease, color 0.4s ease",
                      userSelect: "none",
                      pointerEvents: "none",
                      animation: showLockon ? "signal-lockon-star 0.9s ease-in-out infinite" : undefined,
                    }}
                  >
                    ✦
                  </div>
                </div>
              );
            });
          })}

          {/* Center planet */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                animation: heartbeatActive ? "signal-heartbeat 0.75s ease-in-out infinite" : undefined,
                transition: "filter 0.5s ease",
                filter: lockonActive
                  ? "drop-shadow(0 0 28px #FC54AF) drop-shadow(0 0 60px rgba(252,84,175,.6))"
                  : undefined,
              }}
            >
              {/* Outer aura */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: "-50%",
                  background: "radial-gradient(circle, rgba(252,84,175,0.55) 0%, rgba(252,84,175,0.2) 45%, transparent 70%)",
                  filter: "blur(24px)",
                  pointerEvents: "none",
                }}
              />
              {/* Planet image */}
              <Image
                src="/textures/center-planet.webp"
                alt="Heartverse"
                width={centerSize}
                height={Math.round(centerSize * 1.3)}
                priority
                style={{
                  filter: "drop-shadow(0 0 20px rgba(252,84,175,0.85)) drop-shadow(0 0 40px rgba(252,84,175,0.4))",
                  position: "relative",
                  zIndex: 2,
                }}
              />
            </div>
          </div>
        </div>
      )}


      {/* Cockpit display */}
      {phase === "cockpit" && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 40 }}
        >
          {/* Scanline */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(252,84,175,0.35), transparent)",
              animation: "signal-scanline 3s linear infinite",
              zIndex: 45,
            }}
          />

          <div
            style={{
              width: "min(88vw, 520px)",
              animation: "signal-cockpit 0.6s ease-out both",
              background: "rgba(0,0,12,0.94)",
              border: "1px solid rgba(252,84,175,0.6)",
              borderRadius: 4,
              boxShadow: "0 0 30px rgba(252,84,175,0.4), 0 0 80px rgba(252,84,175,0.15), inset 0 0 24px rgba(252,84,175,0.05)",
              overflow: "hidden",
              fontFamily: "'Courier New', 'Courier', monospace",
            }}
          >
            {/* Header bar */}
            <div
              style={{
                borderBottom: "1px solid rgba(252,84,175,0.35)",
                padding: "8px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(252,84,175,0.07)",
              }}
            >
              <span style={{ color: "rgba(252,84,175,0.6)", fontSize: 10, letterSpacing: "0.18em" }}>
                HEARTVERSE SIGNAL SYSTEM
              </span>
              <span style={{ color: "rgba(252,84,175,0.4)", fontSize: 10 }}>v1.0</span>
            </div>

            <div style={{ padding: "28px 24px 20px" }}>
              {/* Main status */}
              <div
                style={{
                  color: "#FC54AF",
                  fontSize: "clamp(26px, 6vw, 38px)",
                  fontWeight: "bold",
                  letterSpacing: "0.12em",
                  textShadow: "0 0 12px rgba(252,84,175,0.9), 0 0 28px rgba(252,84,175,0.5)",
                  marginBottom: 6,
                }}
              >
                &gt; SIGNAL LOCATED
              </div>

              {/* Winner name box */}
              <div
                style={{
                  border: "1px solid rgba(252,84,175,0.4)",
                  borderRadius: 2,
                  padding: "14px 18px",
                  marginBottom: 24,
                  background: "rgba(252,84,175,0.05)",
                }}
              >
                <div style={{ color: "rgba(252,84,175,0.82)", fontSize: 10, letterSpacing: "0.14em", marginBottom: 8 }}>
                  ALIEN IDENTIFIED
                </div>
                <div
                  style={{
                    color: "#fff",
                    fontSize: "clamp(18px, 4vw, 26px)",
                    fontWeight: "bold",
                    letterSpacing: "0.06em",
                    textShadow: "0 0 10px rgba(252,84,175,0.9), 0 0 24px rgba(252,84,175,0.55), 0 0 44px rgba(252,84,175,0.25)",
                    animation: "signal-winner-reveal 0.8s 0.3s ease-out both",
                  }}
                >
                  {winner?.shipping_full_name ?? "— — —"}
                </div>
              </div>

              {/* Status lines */}
              <div style={{ fontSize: 10, letterSpacing: "0.14em", lineHeight: 1.9 }}>
                <div style={{ color: "rgba(252,84,175,0.82)" }}>&gt; STATUS: HEART SIGNAL SYNCHRONIZED</div>
                <div style={{ color: "rgba(252,84,175,0.82)" }}>&gt; REWARD: PERSONAL TRANSMISSION</div>
              </div>
            </div>

            {/* Footer / close */}
            <div
              style={{
                borderTop: "1px solid rgba(252,84,175,0.2)",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  try { sfx.play("close", 0.5); } catch {}
                  stopCenterAudio();
                  setPhase("idle");
                  setEliminatedIds(new Set());
                  setOrders([]);
                  setWinner(null);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(252,84,175,0.4)",
                  borderRadius: 2,
                  color: "rgba(252,84,175,0.7)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                [CLOSE DISPLAY]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
