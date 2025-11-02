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
  // Pause the processing loop (saves CPU/GPU when dimmed or offscreen)
  paused?: boolean;
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
  paused = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const [isSafari, setIsSafari] = useState(false);
  const [fastMode, setFastMode] = useState(true);
  const [disabled, setDisabled] = useState(false);
  // Hold the last processed frame briefly when the video loops
  // to avoid any one-frame seam while the decoder seeks back to 0.
  const loopCooldownRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // Detect Safari (exclude Chrome on iOS/Android)
  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      const isSafariUA = /safari/i.test(ua) && !/chrome|crios|android/i.test(ua);
      setIsSafari(isSafariUA);
      // Performance controls via localStorage
      const fastLS = (typeof window !== 'undefined') ? window.localStorage.getItem('LUMA_FAST') : null;
      if (fastLS === '0') setFastMode(false);
      const disLS = (typeof window !== 'undefined') ? window.localStorage.getItem('LUMA_DISABLE') : null;
      if (disLS === '1' || disLS === 'true') setDisabled(true);
    } catch {}
  }, []);

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

  // Main processing loop
  useEffect(() => {
    if (!ready || disabled) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let running = true;
    let frameCount = 0;
    let visible = true;

    // Offscreen work canvas for downscaled processing in fast mode
    const work: HTMLCanvasElement | null = fastMode ? document.createElement('canvas') : null;
    const wctx = work ? work.getContext('2d', { willReadFrequently: true }) : null;

    const onVisibility = () => { visible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVisibility);

    const draw = () => {
      if (!running) return;
      if (paused || !visible) { rafRef.current = requestAnimationFrame(draw); return; }
      const w = canvas.clientWidth || 0;
      const h = canvas.clientHeight || 0;
      if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(draw); return; }
      // DPR clamp (force 1x in fast mode)
      const dpr = fastMode ? 1 : Math.min(2, window.devicePixelRatio || 1);
      const CW = Math.max(1, Math.floor(w * dpr));
      const CH = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== CW || canvas.height !== CH) {
        canvas.width = CW; canvas.height = CH;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium' as any;
      }
      // Draw video to canvas covering
      // Compute cover fit
      const vw = video.videoWidth || 0;
      const vh = video.videoHeight || 0;
      if (!vw || !vh) { rafRef.current = requestAnimationFrame(draw); return; }
      // Detect loop wrap-around and hold last processed frame for a couple frames
      const t = video.currentTime || 0;
      if (lastTimeRef.current != null && t + 0.005 < lastTimeRef.current) {
        // currentTime decreased -> looped
        loopCooldownRef.current = 2; // hold 2 frames (~1 frame at 60Hz in fast mode)
      }
      lastTimeRef.current = t;

      const processThisFrame = (loopCooldownRef.current === 0) && (!fastMode || (frameCount % 2 === 0));
      if (loopCooldownRef.current > 0) loopCooldownRef.current--;
      const effContrast = isSafari ? Math.max(contrast, 1.18) : contrast;

      if (fastMode && work && wctx) {
        const SCALE = 0.66; // downscale processing resolution
        const Ww = Math.max(1, Math.floor(CW * SCALE));
        const Hw = Math.max(1, Math.floor(CH * SCALE));
        if (work.width !== Ww || work.height !== Hw) { work.width = Ww; work.height = Hw; wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'medium' as any; }

        if (processThisFrame) {
          // Draw into work canvas with cover fit only when processing this frame
          const scale = Math.max(Ww / vw, Hw / vh);
          const dx = Math.floor((Ww - vw * scale) / 2);
          let dy = Math.floor((Hw - vh * scale) / 2);
          dy += Math.round(offsetYPx + offsetYRatio * Hw);
          wctx.filter = `saturate(${saturation}) contrast(${effContrast})`;
          wctx.drawImage(video, 0, 0, vw, vh, dx, dy, Math.ceil(vw * scale), Math.ceil(vh * scale));
          wctx.filter = 'none';

          try {
            const img = wctx.getImageData(0, 0, Ww, Hw);
            const data = img.data;
            const floor = isSafari ? Math.max(threshold, 0.045) : threshold;
            const feather = isSafari ? Math.max(softness, 0.060) : softness;
            const t0 = floor * 255;
            const t1 = (floor + feather) * 255;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
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
            wctx.putImageData(img, 0, 0);
          } catch {}
        }
        // Scale processed work canvas up to the main canvas
        ctx.clearRect(0, 0, CW, CH);
        ctx.drawImage(work, 0, 0, Ww, Hw, 0, 0, CW, CH);
      } else {
        // Original full-resolution path
        if (processThisFrame) {
          const scale = Math.max(CW / vw, CH / vh);
          const dx = Math.floor((CW - vw * scale) / 2);
          let dy = Math.floor((CH - vh * scale) / 2);
          dy += Math.round(offsetYPx + offsetYRatio * CH);
          ctx.filter = `saturate(${saturation}) contrast(${effContrast})`;
          ctx.drawImage(video, 0, 0, vw, vh, dx, dy, Math.ceil(vw * scale), Math.ceil(vh * scale));
          ctx.filter = 'none';
          try {
            const img = ctx.getImageData(0, 0, CW, CH);
            const data = img.data;
            const floor = isSafari ? Math.max(threshold, 0.045) : threshold;
            const feather = isSafari ? Math.max(softness, 0.060) : softness;
            const t0 = floor * 255;
            const t1 = (floor + feather) * 255;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
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
        }
      }

      frameCount++;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, threshold, softness, saturation, contrast, isSafari, fastMode, paused, disabled, offsetYPx, offsetYRatio]);

  // Apply CSS blend trick only on Safari to neutralize any remaining black pixels visually
  const canvasStyle: React.CSSProperties = {
    ...(style || {}),
    background: 'transparent',
    // Isolate blending to avoid affecting siblings
    // Only apply screen blend on Safari
    ...(isSafari ? { mixBlendMode: 'screen' as const } : {}),
  };

  if (disabled) {
    return <div className={className} style={{ ...(style || {}), background: 'transparent' }} />;
  }
  return <canvas ref={canvasRef} className={className} style={canvasStyle} />;
}
