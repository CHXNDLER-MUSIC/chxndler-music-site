"use client";

import React, { useRef, useState, useEffect } from "react";
import { track } from "@/lib/analytics";

export default function JoinAliens({ visible = true } = {}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle");
  const joinRef = useRef(null);
  const hoverRef = useRef(null);
  const flipRef = useRef(null);

  // Keep success message persistent until page refresh
  
  // Play flip sound when "WELCOME ABOARD" appears
  useEffect(() => {
    if (status === "ok") {
      try {
        const audio = flipRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.volume = 0.7;
          audio.play().catch(() => {});
        }
      } catch {}
    }
  }, [status]);

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "loading" || status === "ok") return; // lock after success
    if (!email.trim() && !phone.trim()) return; // require at least one field
    try { const a = joinRef.current; if (a) { a.currentTime = 0; a.volume = 0.9; a.play().catch(()=>{}); } } catch {}
    try { track('join_aliens_submit', { payload: { email_present: !!email.trim(), phone_present: !!phone.trim() } }); } catch {}
    setStatus("loading");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) throw new Error("request failed");
      setEmail("");
      setPhone("");
      setStatus("ok");
      // Track successful submission when "WELCOME ABOARD" appears
      try { track('join_aliens_success'); } catch {}
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.error("Join submit failed", e); }
      setStatus("error");
    }
  }

  const isFormValid = email.trim() || phone.trim();

  return (
    <form onSubmit={onSubmit} autoComplete="off" className={`flex flex-col gap-3 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ zIndex: 130, position: 'relative', pointerEvents: visible ? 'auto' : 'none', width: 'fit-content', height: 'fit-content', margin: '0 auto' }}>
      <label className="sr-only" htmlFor="join-email">Email</label>
      <input
        id="join-email"
        type="email"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={() => console.log("Email input focused!")}
        onClick={() => console.log("Email input clicked!")}
        onMouseDown={(e) => {
          console.log("Email input mouse down!", e);
          e.stopPropagation();
        }}
        placeholder="Email"
        disabled={status === "loading" || status === "ok"}
        aria-disabled={status === "loading" || status === "ok"}
        tabIndex={0}
        style={{ 
          pointerEvents: 'auto !important', 
          zIndex: 135, 
          position: 'relative',
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid #FC54AF',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '12px',
          outline: 'none',
          width: '100%',
          maxWidth: '220px'
        }}
        className="mx-auto focus:ring-4 focus:ring-[#FC54AF] text-sm"
      />

      <label className="sr-only" htmlFor="join-phone">Phone (optional)</label>
      <input
        id="join-phone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onFocus={() => console.log("Phone input focused!")}
        onClick={() => console.log("Phone input clicked!")}
        onMouseDown={(e) => {
          console.log("Phone input mouse down!", e);
          e.stopPropagation();
        }}
        placeholder="Phone"
        disabled={status === "loading" || status === "ok"}
        aria-disabled={status === "loading" || status === "ok"}
        tabIndex={0}
        style={{ 
          pointerEvents: 'auto !important', 
          zIndex: 135, 
          position: 'relative',
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid #FC54AF',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '12px',
          outline: 'none',
          width: '100%',
          maxWidth: '220px'
        }}
        className="mx-auto focus:ring-4 focus:ring-[#FC54AF] text-sm"
      />

      <button
        type="submit"
        disabled={status === "loading" || status === "ok" || !isFormValid}
        aria-disabled={status === "loading" || status === "ok" || !isFormValid}
        style={{ 
          width: '100%',
          maxWidth: '220px'
        }}
        className={
          `mt-1 mx-auto rounded-2xl px-4 py-2 font-semibold tracking-wide backdrop-blur-md transition ${visible ? 'pointer-events-auto' : 'pointer-events-none'} ` +
          (status === 'ok'
            ? // Green success state
              'text-green-400 bg-green-500/30 ring-2 ring-green-400 shadow-[0_0_36px_rgba(34,197,94,0.85)] cursor-default'
            : // Default cyan interactive state — amped glow + soft pulse
              'text-white bg-[#FC54AF]/25 ring-4 ring-[#FC54AF]/80 shadow-[0_0_42px_rgba(252,84,175,0.85),0_0_90px_rgba(252,84,175,0.45)] hover:shadow-[0_0_60px_rgba(252,84,175,0.95),0_0_120px_rgba(252,84,175,0.55)] hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-[#FC54AF] disabled:opacity-70 disabled:cursor-not-allowed pulse-soft')
        }
        onMouseEnter={() => { try { const a = hoverRef.current; if (a) { a.currentTime = 0; a.volume = 0.3; a.play().catch(()=>{}); } } catch {} }}
      >
        {status === "loading"
          ? "Submitting..."
          : status === "ok"
            ? (<span className="text-xs sm:text-sm">WELCOME ABOARD</span>)
            : status === "error"
              ? "Try Again"
              : "JOIN THE ALIENS"}
      </button>
      <audio ref={joinRef} src="/audio/join-alien.mp3" preload="auto" />
      <audio ref={hoverRef} preload="auto">
        <source src="/audio/hover.mp3" type="audio/mpeg" />
        <source src="/audio/song-select.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={flipRef} src="/audio/flip.mp3" preload="auto" />
    </form>
  );
}
