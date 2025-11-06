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
  // Pause rendering when offscreen for smoother page performance
  const [inViewport, setInViewport] = useState(true);
  const ioRef = useRef<IntersectionObserver | null>(null);
  // Hold the last processed frame briefly when the video loops
  // to avoid any one-frame seam while the decoder seeks back to 0.
  const loopCooldownRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  // Detect stalls where currentTime stops advancing even though the video isn't paused
  const lastAdvanceAtRef = useRef<number>(Date.now());
  const stallCountRef = useRef<number>(0);
  // Adaptive throttling
  const frameSkipRef = useRef<number>(2); // process every Nth frame in fast mode; start at ~30fps on 60Hz
  const lastDrawAtRef = useRef<number>(0);
  const rVFCIdRef = useRef<any>(null);

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
      // Heuristic: lower-end CPUs start with more aggressive frame skipping
      try {
        const hc = (navigator as any)?.hardwareConcurrency;
        if (typeof hc === 'number' && hc > 0 && hc <= 4) {
          frameSkipRef.current = 3; // ~20fps processing on 60Hz
        }
      } catch {}
    } catch {}
  }, []);

  useEffect(() => {
    const video = document.createElement("video");
    videoRef.current = video;
    // Strong autoplay hints for all browsers
    video.autoplay = true;
    video.muted = true;
    (video as any).defaultMuted = true;
    video.loop = true;
    video.playsInline = true as any;
    // Extra inline/autoplay hints for Safari/iOS
    try {
      (video as any).webkitPlaysInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      // Prevent remote playback UIs from hijacking inline playback on some devices
      (video as any).disableRemotePlayback = true;
    } catch {}
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    
    // Use direct src assignment first (more reliable on iOS Safari for autoplay)
    // Fallback to <source> elements if needed
    let usedDirectSrc = false;
    try {
      if (srcMp4) {
        (video as HTMLVideoElement).src = srcMp4;
        usedDirectSrc = true;
      } else if (srcAlt) {
        (video as HTMLVideoElement).src = srcAlt;
        usedDirectSrc = true;
      }
    } catch {}
    if (!usedDirectSrc) {
      const s1 = document.createElement("source");
      if (srcMp4) { s1.src = srcMp4; s1.type = "video/mp4"; video.appendChild(s1); }
      if (srcAlt) {
        const s2 = document.createElement("source"); s2.src = srcAlt; s2.type = "video/mp4"; video.appendChild(s2);
      }
    }
    try { video.load(); } catch {}

    // Attach offscreen to DOM to ensure playback advances on Safari/iOS
    try {
      video.style.position = 'fixed';
      video.style.left = '-99999px';
      video.style.top = '0px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
    } catch {}
    const tryPlay = () => { try { video.play().catch(()=>{}); } catch {} };
    const onCanPlay = () => { setReady(true); tryPlay(); };
    const onLoadedMeta = () => { setReady(true); tryPlay(); };
    const onEnded = () => { try { video.currentTime = 0; video.play().catch(()=>{}); } catch {} };
    const onPause = () => { if (!paused) { tryPlay(); } };
    const onStalled = () => { tryPlay(); };
    const onWaiting = () => { tryPlay(); };
    const onSuspend = () => { tryPlay(); };
    const onEmptied = () => { try { video.load(); } catch {}; tryPlay(); };
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onCanPlay);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("ended", onEnded);
    video.addEventListener("pause", onPause);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("suspend", onSuspend);
    video.addEventListener("emptied", onEmptied);

    // As a final fallback for strict autoplay policies, try once on first user gesture
    const unlock = () => { tryPlay(); };
    try {
      window.addEventListener('pointerdown', unlock, { once: true } as any);
      window.addEventListener('keydown', unlock, { once: true } as any);
      window.addEventListener('touchstart', unlock, { once: true } as any);
      // If the user just moves the mouse, that should be good enough too
      window.addEventListener('mousemove', unlock, { once: true } as any);
    } catch {}

    // Retry autoplay several times on mount to bypass flaky policies
    const playRetries: number[] = [];
    const scheduleRetry = (ms: number) => {
      const id = window.setTimeout(() => { tryPlay(); }, ms);
      playRetries.push(id);
    };
    [100, 300, 700, 1500, 3000].forEach(scheduleRetry);
    // Short-lived interval to keep nudging play until it sticks
    let nudgeCount = 0;
    const nudge = window.setInterval(() => {
      if (!video.paused || nudgeCount++ > 15) { try { window.clearInterval(nudge); } catch {}; return; }
      tryPlay();
    }, 200);
    playRetries.push(nudge);

    // Also attempt when page becomes visible
    const onVisibility = () => { if (document.visibilityState === 'visible') tryPlay(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      video.pause();
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("suspend", onSuspend);
      video.removeEventListener("emptied", onEmptied);
      playRetries.forEach(id => { try { window.clearTimeout(id); } catch {} });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        window.removeEventListener('pointerdown', unlock as any, { capture: false } as any);
        window.removeEventListener('keydown', unlock as any, { capture: false } as any);
        window.removeEventListener('touchstart', unlock as any, { capture: false } as any);
        window.removeEventListener('mousemove', unlock as any, { capture: false } as any);
      } catch {}
      try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
      // Detach hidden video from DOM
      try { if (video.parentNode) video.parentNode.removeChild(video); } catch {}
    };
  }, [srcMp4, srcAlt]);

  // Observe visibility in viewport to pause processing when not visible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.target === canvas) {
            setInViewport(e.isIntersecting);
          }
        }
      }, { threshold: 0.01 });
      io.observe(canvas);
      ioRef.current = io;
      return () => { try { io.disconnect(); } catch {} };
    } catch {}
  }, []);

  // If we get un-paused externally (e.g., warp end), ensure the underlying
  // <video> resumes playback to avoid getting stuck on a frame
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!paused) {
      try { v.play().catch(() => {}); } catch {}
    }
  }, [paused]);

  // Main processing loop
  useEffect(() => {
    if (disabled) return;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    // Prefer desynchronized context to reduce blocking on main thread
    const ctx = canvas.getContext("2d", { willReadFrequently: true, desynchronized: true as any });
    if (!ctx) return;

    let running = true;
    let frameCount = 0;
    let visible = true;

    // Offscreen work canvas for downscaled processing in fast mode
    const work: HTMLCanvasElement | null = fastMode ? document.createElement('canvas') : null;
    const wctx = work ? work.getContext('2d', { willReadFrequently: true }) : null;

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible && !paused) {
        try { video.play().catch(() => {}); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Helper: schedule next tick using requestVideoFrameCallback when available
    const scheduleNext = () => {
      const el: any = video;
      if (el && typeof el.requestVideoFrameCallback === 'function') {
        rVFCIdRef.current = el.requestVideoFrameCallback(() => { draw(); });
      } else {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    const draw = () => {
      if (!running) return;
      // Pause loop when hidden or offscreen
      if (paused || !visible || !inViewport) { scheduleNext(); return; }
      const w = canvas.clientWidth || 0;
      const h = canvas.clientHeight || 0;
      if (w === 0 || h === 0) { scheduleNext(); return; }
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
      if (!vw || !vh) { scheduleNext(); return; }
      // Detect loop wrap-around and hold last processed frame for a couple frames
      const t = video.currentTime || 0;
      if (lastTimeRef.current != null && t + 0.005 < lastTimeRef.current) {
        // currentTime decreased -> looped
        loopCooldownRef.current = 2; // hold 2 frames (~1 frame at 60Hz in fast mode)
      }
      // Stall watchdog: record when time advances; if it hasn't advanced in a while, nudge playback
      if (lastTimeRef.current == null || t > lastTimeRef.current + 0.0005) {
        lastAdvanceAtRef.current = Date.now();
        stallCountRef.current = 0;
      } else {
        const since = Date.now() - lastAdvanceAtRef.current;
        if (since > 600) {
          // Nudge play; if it keeps stalling, force a tiny seek or reload occasionally
          try { video.play().catch(() => {}); } catch {}
          stallCountRef.current++;
          lastAdvanceAtRef.current = Date.now();
          if (stallCountRef.current % 3 === 0) {
            try { video.currentTime = Math.max(0, t - 0.0001); } catch {}
          }
          if (stallCountRef.current >= 9) {
            try { video.load(); } catch {}
            try { video.play().catch(() => {}); } catch {}
            stallCountRef.current = 0;
          }
        }
      }
      lastTimeRef.current = t;

      // Adaptive frame skip: increase skipping if draw took too long
      const now = performance.now();
      const sinceLast = now - (lastDrawAtRef.current || 0);
      if (sinceLast && sinceLast > 45 && frameSkipRef.current < 3) {
        frameSkipRef.current = 3; // ~20fps
      } else if (sinceLast && sinceLast < 35 && frameSkipRef.current > 2) {
        frameSkipRef.current = 2; // ~30fps
      }
      const processThisFrame = (loopCooldownRef.current === 0) && (!fastMode || (frameCount % frameSkipRef.current === 0));
      if (loopCooldownRef.current > 0) loopCooldownRef.current--;
      const effContrast = isSafari ? Math.max(contrast, 1.18) : contrast;

      if (fastMode && work && wctx) {
        const SCALE = 0.55; // stronger downscale for processing resolution
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
      lastDrawAtRef.current = performance.now();
      scheduleNext();
    };
    scheduleNext();
    return () => {
      running = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { if (rVFCIdRef.current && (video as any).cancelVideoFrameCallback) { (video as any).cancelVideoFrameCallback(rVFCIdRef.current); } } catch {}
    };
  }, [ready, threshold, softness, saturation, contrast, isSafari, fastMode, paused, disabled, offsetYPx, offsetYRatio, inViewport]);

  // Apply CSS blend trick only on Safari to neutralize any remaining black pixels visually
  const canvasStyle: React.CSSProperties = {
    ...(style || {}),
    background: 'transparent',
    // Isolate blending to avoid affecting siblings
    // Only apply screen blend on Safari
    ...(isSafari ? { mixBlendMode: 'screen' as const } : {}),
    // Hint the browser we animate opacity/transforms around this element
    willChange: 'opacity, transform',
    contain: 'layout paint',
  };

  if (disabled) {
    return <div className={className} style={{ ...(style || {}), background: 'transparent' }} />;
  }
  return <canvas ref={canvasRef} className={className} style={canvasStyle} />;
}
