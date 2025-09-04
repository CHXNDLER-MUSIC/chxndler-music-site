"use client";

import React, { useRef, useState } from "react";

export default function JoinAliens() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle");
  const joinRef = useRef(null);
  const hoverRef = useRef(null);

  // Keep success message persistent until page refresh

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "loading" || status === "ok") return; // lock after success
    try { const a = joinRef.current; if (a) { a.currentTime = 0; a.volume = 0.9; a.play().catch(()=>{}); } } catch {}
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
    } catch (e) {
      console.error("Join submit failed", e);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full w-full flex-col gap-3">
      <label className="sr-only" htmlFor="join-email">Email</label>
      <input
        id="join-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={status === "loading" || status === "ok"}
        aria-disabled={status === "loading" || status === "ok"}
        className="w-full max-w-[220px] mx-auto rounded-xl bg-black/35 backdrop-blur-md px-3 py-0.5 text-white placeholder-white/80 outline-none border-2 border-[#FC54AF]/80 shadow-[0_0_30px_rgba(252,84,175,0.55),_0_0_60px_rgba(252,84,175,0.35)] focus:ring-4 focus:ring-[#FC54AF] focus:shadow-[0_0_50px_rgba(252,84,175,0.85),_0_0_110px_rgba(252,84,175,0.55)] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      />

      <label className="sr-only" htmlFor="join-phone">Phone (optional)</label>
      <input
        id="join-phone"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        disabled={status === "loading" || status === "ok"}
        aria-disabled={status === "loading" || status === "ok"}
        className="w-full max-w-[220px] mx-auto rounded-xl bg-black/35 backdrop-blur-md px-3 py-0.5 text-white placeholder-white/80 outline-none border-2 border-[#FC54AF]/80 shadow-[0_0_30px_rgba(252,84,175,0.55),_0_0_60px_rgba(252,84,175,0.35)] focus:ring-4 focus:ring-[#FC54AF] focus:shadow-[0_0_50px_rgba(252,84,175,0.85),_0_0_110px_rgba(252,84,175,0.55)] disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      />

      <button
        type="submit"
        disabled={status === "loading" || status === "ok"}
        aria-disabled={status === "loading" || status === "ok"}
        className={
          `mt-1 rounded-2xl px-4 py-2 font-semibold tracking-wide backdrop-blur-md transition ` +
          (status === 'ok'
            ? // Neon pink locked state
              'text-white bg-[#FC54AF]/30 ring-2 ring-[#FC54AF] shadow-[0_0_36px_rgba(252,84,175,0.85)] cursor-default'
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
    </form>
  );
}
