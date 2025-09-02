"use client";
import React, { useEffect, useRef } from "react";

/** Fallback when sky videos are missing: animated starfield on <canvas>. */
export default function StarfieldFallback({ brightness = 0.96 }: { brightness?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);

    const STAR_COUNT = Math.floor((w * h) / 2400);
    const stars = new Array(STAR_COUNT).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: 0.2 + Math.random() * 1.2,
      r: 0.4 + Math.random() * 1.8,
      tw: Math.random() * Math.PI * 2,
      sp: 0.2 + Math.random() * 0.8,
    }));

    let raf = 0;
    function frame(t: number) {
      ctx.fillStyle = `rgb(${Math.floor(12 * brightness)}, ${Math.floor(14 * brightness)}, ${Math.floor(
        20 * brightness
      )})`;
      ctx.fillRect(0, 0, w, h);

      for (let s of stars) {
        s.y += s.z * s.sp; // drift
        if (s.y > h + 2) s.y = -2;
        const twinkle = 0.75 + 0.25 * Math.sin(t * 0.002 + s.tw);
        let r = s.r * twinkle;
        if (!isFinite(r) || r <= 0) r = 0.2;
        ctx.beginPath();
        try { ctx.arc(s.x, s.y, r, 0, Math.PI * 2); } catch { continue; }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * DPR));
      canvas.height = Math.max(1, Math.floor(h * DPR));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [brightness]);

  return <canvas ref={ref} className="h-full w-full" style={{ filter: `brightness(${brightness})` }} />;
}
