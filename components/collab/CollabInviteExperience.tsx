"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CollabInviteExperience({ token, name, personalMessage = "", contributionType = "Other" }: { token: string; name: string; personalMessage?: string; contributionType?: string }) {
  const router = useRouter();
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const [entering, setEntering] = useState(false);
  const [warpActive, setWarpActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sound = new Audio("/audio/warp.mp3");
    sound.preload = "auto";
    sound.volume = 0.34;
    soundRef.current = sound;
    sound.load();
    return () => { sound.pause(); soundRef.current = null; };
  }, []);

  async function enter() {
    if (entering) return;
    setEntering(true); setError("");
    // Start the existing portal sound directly inside the user gesture. Audio
    // failure is deliberately non-blocking, including on mobile browsers.
    try {
      const sound = soundRef.current;
      if (sound) { sound.currentTime = 0; void sound.play().catch(() => {}); }
    } catch {}
    try {
      const response = await fetch(`/api/collab/invite/${encodeURIComponent(token)}`, { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "This invitation is no longer active.");
      setWarpActive(true);
      window.setTimeout(() => router.replace("/collab"), 2800);
    } catch (cause) {
      setEntering(false);
      setWarpActive(false);
      setError(cause instanceof Error ? cause.message : "Unable to enter this collaboration space.");
    }
  }

  return <main style={{ background: "#050505" }} className={`collab-invite-screen ${entering && !warpActive ? "is-entering" : ""}`}>
    {warpActive && <video autoPlay muted playsInline aria-hidden="true" className="collab-invite-warp"><source src="/skies/lightspeed.mp4" type="video/mp4" /></video>}
    <div className="collab-invite-content">
      <img className="collab-invite-wordmark" src="/elements/logo.webp" alt="CHXNDLER" />
      <h1><span className="collab-invite-name">{name}</span>, let&apos;s create something unforgettable.</h1>
      <p className="collab-invite-message">{personalMessage || (contributionType === "Other" ? "I've got some demos and unreleased music I'd love to share with you. Take a listen and let me know what speaks to you." : `I’d love to explore a ${contributionType.toLowerCase()} collaboration with you. Take a listen and see what speaks to you.`)}</p>
      <button type="button" className="collab-invite-enter" onClick={() => void enter()} disabled={entering}>
        <span className="collab-invite-glow" />
        <span>{entering ? "ENTERING THE HEARTVERSE" : "EXPLORE THE MUSIC"}</span><span aria-hidden="true"> →</span>
      </button>
      {error && <p role="alert" className="collab-invite-error">{error}</p>}
    </div>
    <style>{`
      .collab-invite-screen{position:fixed;inset:0;z-index:9999;min-height:100svh;min-width:100%;display:grid;place-items:center;overflow:auto;padding:1.5rem 1.25rem;color:#fff;text-align:center;transition:opacity .32s ease,transform .4s cubic-bezier(.2,.8,.2,1);}
      .collab-invite-screen.is-entering .collab-invite-content{opacity:0;transform:scale(1.035);transition:opacity .32s ease,transform .4s cubic-bezier(.2,.8,.2,1)}
      .collab-invite-warp{position:fixed;inset:0;z-index:10;width:100%;height:100%;object-fit:cover;pointer-events:none;animation:collab-warp-in .2s ease-out both}
      .collab-invite-content{width:min(100%,38rem);display:flex;flex-direction:column;align-items:center}
      .collab-invite-wordmark{width:clamp(12rem,48vw,19rem);height:clamp(4rem,15vw,6.25rem);object-fit:contain;margin:0 auto 1rem;filter:drop-shadow(0 0 12px rgba(253,82,175,.36)) drop-shadow(0 0 30px rgba(253,82,175,.16))}
      .collab-invite-content h1{max-width:35rem;margin:0;font-size:clamp(2rem,7vw,3.4rem);font-weight:700;letter-spacing:-.045em;line-height:1.08}
      .collab-invite-name{color:#FD52AF}
      .collab-invite-message{max-width:29rem;margin:1.25rem 0 1.7rem;color:rgba(255,255,255,.68);font-size:clamp(.9rem,3vw,1rem);line-height:1.8}
      .collab-invite-enter{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;overflow:hidden;border:1px solid rgba(253,82,175,.7);border-radius:999px;background:linear-gradient(110deg,rgba(253,82,175,.2),rgba(253,82,175,.08));padding:1rem 1.7rem;color:#fff;font-size:.78rem;font-weight:800;letter-spacing:.15em;cursor:pointer;isolation:isolate;transition:transform .24s ease,box-shadow .24s ease,border-color .24s ease;box-shadow:0 0 28px rgba(253,82,175,.12)}
      .collab-invite-enter:hover{transform:translateY(-2px);border-color:#FD52AF;box-shadow:0 0 34px rgba(253,82,175,.25)}
      .collab-invite-enter:focus-visible{outline:2px solid #FD52AF;outline-offset:5px}
      .collab-invite-enter:disabled{cursor:wait}
      .collab-invite-glow{position:absolute;inset:0;z-index:-1;background:#FD52AF;opacity:0;filter:blur(22px);transition:opacity .24s ease}
      .is-entering .collab-invite-glow{opacity:.5}
      .collab-invite-error{margin:1.25rem 0 0;color:#ff9bc9;font-size:.82rem}
      @keyframes collab-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
      @keyframes collab-glow{0%,100%{opacity:.1;transform:scale(.85)}50%{opacity:.2;transform:scale(1.08)}}
      @keyframes collab-warp-in{from{opacity:0}to{opacity:1}}
      @media(prefers-reduced-motion:reduce){.collab-invite-screen,.collab-invite-enter,.collab-invite-glow,.collab-invite-warp{animation:none;transition-duration:.01ms}}
    `}</style>
  </main>;
}
