"use client";
import React, { useEffect, useRef } from "react";

export default function NeonCockpitRim() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Try to hook into the main audio element
    const audio = document.querySelector<HTMLAudioElement>('audio[data-audio-player="1"]');
    if (!audio) return;

    // Lazily create an AudioContext and analyser
    let ctx = ctxRef.current;
    if (!ctx) {
      try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      catch { ctx = null as any; }
      ctxRef.current = ctx;
    }
    if (!ctx) return;

    // Some browsers require resume after user gesture; attempt non-blocking resume
    try { if (ctx.state === 'suspended') ctx.resume().catch(()=>{}); } catch {}

    // Build nodes once per element
    let analyser = analyserRef.current;
    let source = sourceRef.current;
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
    }
    if (!source) {
      try { source = ctx.createMediaElementSource(audio); }
      catch {
        // If source already connected for this element in another component, bail gracefully
        source = null as any;
      }
      if (source) {
        source.connect(analyser);
        // Keep existing output routing intact by also connecting to destination
        try { source.connect(ctx.destination); } catch {}
        sourceRef.current = source;
      }
    }

    if (!dataRef.current) dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const a = analyserRef.current, buf = dataRef.current, el = hostRef.current;
      if (!a || !buf || !el) return;
      a.getByteFrequencyData(buf);
      // Compute a simple energy measure focused on low-mid bands (beats, kick, bass)
      const len = buf.length;
      const start = Math.floor(len * 0.05); // skip subsonic
      const end = Math.floor(len * 0.35);   // low-mid emphasis
      let sum = 0;
      for (let i = start; i < end; i++) sum += buf[i];
      const avg = sum / Math.max(1, end - start);
      // Normalize ~[0..1] with soft knee
      const level = Math.max(0, Math.min(1, (avg / 140)));
      el.style.setProperty("--level", level.toFixed(3));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      // Do not close the context to avoid breaking other audio; just disconnect our nodes
      try { analyserRef.current?.disconnect(); } catch {}
      try { sourceRef.current?.disconnect(); } catch {}
    };
  }, []);

  return (
    <div ref={hostRef} className="neon-rim pointer-events-none" aria-hidden>
      <style jsx>{`
        .neon-rim{
          position: fixed; inset: 0; z-index: 28; /* above cockpit-bg (z-20), below controls */
          /* Drive intensity via CSS var set from analyser */
          --level: 0.0;
          opacity: calc(0.22 + var(--level) * 0.55);
          filter: brightness(calc(0.9 + var(--level) * 0.6)) saturate(calc(1.1 + var(--level) * 0.4));
          /* Rim made of layered radial gradients hugging edges/corners */
          background:
            radial-gradient(120% 60% at 50% -10%, rgba(56,182,255,.16), rgba(56,182,255,0) 60%),
            radial-gradient(90% 50% at 10% 0%, rgba(252,84,175,.18), rgba(252,84,175,0) 60%),
            radial-gradient(90% 50% at 90% 0%, rgba(242,239,29,.16), rgba(242,239,29,0) 60%),
            radial-gradient(100% 80% at 50% 110%, rgba(56,255,180,.20), rgba(56,255,180,0) 60%);
          mix-blend-mode: screen;
        }
        /* Extra animated edge glows */
        .neon-rim::before,
        .neon-rim::after{
          content: ""; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
        }
        .neon-rim::before{
          /* scanning sweep */
          background: linear-gradient(180deg,
            rgba(56,182,255, calc(0.06 + var(--level) * 0.12)),
            rgba(56,182,255, 0) 40%);
          transform: translateY(calc(var(--level) * 2vh));
          filter: blur(4px);
        }
        .neon-rim::after{
          /* corner blooms */
          background:
            radial-gradient(50% 60% at 6% 10%, rgba(56,255,200, calc(0.18 + var(--level) * 0.26)), transparent 60%),
            radial-gradient(50% 60% at 94% 10%, rgba(56,182,255, calc(0.18 + var(--level) * 0.26)), transparent 60%),
            radial-gradient(50% 60% at 6% 90%, rgba(252,84,175, calc(0.16 + var(--level) * 0.22)), transparent 60%),
            radial-gradient(50% 60% at 94% 90%, rgba(242,239,29, calc(0.14 + var(--level) * 0.18)), transparent 60%);
          filter: blur(10px);
        }
      `}</style>
    </div>
  );
}

