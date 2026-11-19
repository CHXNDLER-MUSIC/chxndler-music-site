"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CollabInviteExperience({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const [entering, setEntering] = useState(false);
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
      await new Promise(resolve => window.setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 520));
      router.replace("/collab");
    } catch (cause) {
      setEntering(false);
      setError(cause instanceof Error ? cause.message : "Unable to enter this collaboration space.");
    }
  }

  return <main style={{ background: "#050505" }} className={`collab-invite-screen ${entering ? "is-entering" : ""}`}>
    <div className="collab-invite-content">
      <img className="collab-invite-wordmark" src="/elements/logo.webp" alt="CHXNDLER" />
      <p className="collab-invite-eyebrow">AN INVITATION TO CREATE</p>
      <h1>Hey {name},</h1>
      <h2>Let’s create something together.</h2>
      <p className="collab-invite-message">I&apos;d love to share some unreleased songs and demos with you. Take a listen, and if something speaks to you, let&apos;s create together.</p>
      <button type="button" className="collab-invite-enter" onClick={() => void enter()} disabled={entering} aria-label={`Tap to enter your collaboration space, ${name}`}>
        <span className="collab-invite-glow" />
        <img src="/elements/alien.webp" alt="" />
      </button>
      <p className="collab-invite-tap">{entering ? "ENTERING THE HEARTVERSE" : "TAP TO ENTER"}</p>
      {error && <p role="alert" className="collab-invite-error">{error}</p>}
    </div>
    <style>{`
      .collab-invite-screen{position:fixed;inset:0;z-index:9999;min-height:100svh;min-width:100%;display:grid;place-items:center;overflow:auto;padding:2rem 1.25rem;color:#fff;text-align:center;transition:opacity .48s ease,transform .58s cubic-bezier(.2,.8,.2,1);}
      .collab-invite-screen.is-entering{opacity:0;transform:scale(1.035)}
      .collab-invite-content{width:min(100%,38rem);display:flex;flex-direction:column;align-items:center}
      .collab-invite-wordmark{width:8rem;height:4rem;object-fit:contain;margin:0 auto 2.4rem}
      .collab-invite-eyebrow{margin:0 0 1.3rem;color:#FD52AF;font-size:.68rem;font-weight:800;letter-spacing:.25em}
      .collab-invite-content h1{margin:0;font-size:clamp(2.4rem,8vw,4rem);font-weight:700;letter-spacing:-.045em;line-height:1.05}
      .collab-invite-content h2{margin:1rem 0 0;font-size:clamp(1.1rem,4vw,1.55rem);font-weight:500;letter-spacing:-.02em}
      .collab-invite-message{max-width:29rem;margin:1.3rem 0 1.5rem;color:rgba(255,255,255,.64);font-size:.95rem;line-height:1.8}
      .collab-invite-enter{position:relative;width:clamp(8rem,34vw,12rem);aspect-ratio:1;border:0;background:transparent;padding:1rem;cursor:pointer;isolation:isolate;transition:transform .28s ease,filter .28s ease;animation:collab-breathe 3.6s ease-in-out infinite;}
      .collab-invite-enter:hover{transform:scale(1.055);filter:brightness(1.15)}
      .collab-invite-enter:focus-visible{outline:2px solid #FD52AF;outline-offset:8px;border-radius:50%}
      .collab-invite-enter:disabled{cursor:wait}
      .collab-invite-enter img{position:relative;z-index:1;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 12px rgba(253,82,175,.38));transition:filter .28s ease}
      .collab-invite-enter:hover img{filter:drop-shadow(0 0 24px rgba(253,82,175,.8))}
      .collab-invite-glow{position:absolute;inset:12%;z-index:0;border-radius:50%;background:#FD52AF;opacity:.11;filter:blur(35px);animation:collab-glow 3.6s ease-in-out infinite}
      .is-entering .collab-invite-glow{opacity:.55;filter:blur(55px);transition:all .28s ease}
      .collab-invite-tap{margin:1rem 0 0;color:#FD52AF;font-size:.62rem;font-weight:800;letter-spacing:.25em}
      .collab-invite-error{margin:1.25rem 0 0;color:#ff9bc9;font-size:.82rem}
      @keyframes collab-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
      @keyframes collab-glow{0%,100%{opacity:.1;transform:scale(.85)}50%{opacity:.2;transform:scale(1.08)}}
      @media(prefers-reduced-motion:reduce){.collab-invite-screen,.collab-invite-enter,.collab-invite-enter img,.collab-invite-glow{animation:none;transition-duration:.15s}}
    `}</style>
  </main>;
}
