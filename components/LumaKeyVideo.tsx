"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  srcMp4?: string;
  srcAlt?: string;
  threshold?: number; // 0..1 luminance below which becomes transparent
  softness?: number;  // feather width around threshold
  saturation?: number; // optional extra punch
  contrast?: number;   // optional extra punch
  offsetYPx?: number;  // shift drawn video content down/up inside canvas (px)
  offsetYRatio?: number; // shift by a ratio of canvas height (e.g., 0.1 = 10%)
  className?: string;
  style?: React.CSSProperties;
};

export default function LumaKeyVideo({
  srcMp4,
  srcAlt,
  threshold = 0.08,
  softness = 0.06,
  saturation = 1.05,
  contrast = 1.05,
  offsetYPx = 0,
  offsetYRatio = 0,
  className,
  style,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    videoRef.current = video;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true as any;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    const s1 = document.createElement("source");
    if (srcMp4) { s1.src = srcMp4; s1.type = "video/mp4"; video.appendChild(s1); }
    if (srcAlt) {
      const s2 = document.createElement("source"); s2.src = srcAlt; s2.type = "video/mp4"; video.appendChild(s2);
    }
    const onCanPlay = () => { setReady(true); video.play().catch(()=>{}); };
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onCanPlay);
    return () => {
      video.pause();
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onCanPlay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [srcMp4, srcAlt]);

  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let running = true;
    const draw = () => {
      if (!running) return;
      const w = canvas.clientWidth || 0;
      const h = canvas.clientHeight || 0;
      if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(draw); return; }
      // Match canvas backing size to CSS pixels for crispness
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const CW = Math.floor(w * dpr);
      const CH = Math.floor(h * dpr);
      if (canvas.width !== CW || canvas.height !== CH) {
        canvas.width = CW; canvas.height = CH;
      }
      // Draw video to canvas covering
      // Compute cover fit
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const scale = Math.max(CW / vw, CH / vh);
      const dx = Math.floor((CW - vw * scale) / 2);
      let dy = Math.floor((CH - vh * scale) / 2);
      // Apply caller-provided content offset to reveal more bottom/top area
      dy += Math.round(offsetYPx + offsetYRatio * CH);
      ctx.filter = `saturate(${saturation}) contrast(${contrast})`;
      ctx.drawImage(video, 0, 0, vw, vh, dx, dy, Math.ceil(vw * scale), Math.ceil(vh * scale));
      ctx.filter = "none";

      try {
        const img = ctx.getImageData(0, 0, CW, CH);
        const data = img.data;
        const t0 = threshold * 255;
        const t1 = (threshold + softness) * 255;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // luminance (Rec. 709)
          const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          let a = data[i + 3];
          if (y <= t0) {
            a = 0;
          } else if (y < t1) {
            const t = (y - t0) / (t1 - t0);
            a = Math.round(a * t);
          }
          data[i + 3] = a;
        }
        ctx.putImageData(img, 0, 0);
      } catch {}

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready, threshold, softness, saturation, contrast]);

  return <canvas ref={canvasRef} className={className} style={style} />;
}
