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
  // Force-enable processing even if localStorage flags request disable
  forceEnabled?: boolean;
  // Prefer higher-quality processing (less downscaling/frame-skipping)
  highQuality?: boolean;
  // Apply screen blend to visually erase residual dark pixels
  blendScreen?: boolean;
  // Control whether to show the plain-video fallback underlay at all
  fallbackEnabled?: boolean;
  // Minimum keyed coverage (0..1) before hiding fallback; lower to avoid black box
  minCoverageRatio?: number;
  // Optional chroma key (color-based) — if provided, overrides luminance key
  keyColor?: [number, number, number]; // RGB 0..255 (e.g., [0,0,0] for black)
  keyTolerance?: number; // 0..1 distance where fully transparent begins
  keySoftness?: number;  // 0..1 feather width beyond tolerance
  // Keying mode: 'auto' (use chroma if provided else luma), 'chroma', 'luma', or 'both'
  keyMode?: 'auto' | 'chroma' | 'luma' | 'both';
  // Optional circular mask to softly crop edges (safety net when keying can't remove corners)
  maskCircle?: boolean;
  maskRadiusPct?: number;   // 0..100, soft edge starts before this
  maskFeatherPct?: number;  // 0..100, feather width
  maskCenterX?: string;     // e.g., '50%'
  maskCenterY?: string;     // e.g., '55%'
  // Geometry-aware preservation to keep the wheel area from being keyed out
  protectCircle?: boolean;
  protectCenterXRatio?: number; // 0..1 relative to canvas width
  protectCenterYRatio?: number; // 0..1 relative to canvas height
  protectRadiusRatio?: number;  // 0..1 relative to min(canvasW, canvasH)
  protectFeatherRatio?: number; // 0..1 feather width around radius
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
  forceEnabled = false,
  highQuality = false,
  blendScreen = false,
  fallbackEnabled = true,
  minCoverageRatio = 0.0005,
  keyColor,
  keyTolerance = 0.0,
  keySoftness = 0.0,
  keyMode = 'auto',
  maskCircle = false,
  maskRadiusPct = 48,
  maskFeatherPct = 8,
  maskCenterX = '50%',
  maskCenterY = '55%',
  protectCircle = false,
  protectCenterXRatio = 0.5,
  protectCenterYRatio = 0.58,
  protectRadiusRatio = 0.47,
  protectFeatherRatio = 0.06,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const [isSafari, setIsSafari] = useState(false);
  const [fastMode, setFastMode] = useState(!highQuality);
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
  // Fallback visibility when keyed output is effectively empty
  const [showFallback, setShowFallback] = useState(true);
  const sampleEveryRef = useRef<number>(12);
  const sampleCounterRef = useRef<number>(0);
  const minCoverageRef = useRef<number>(minCoverageRatio);

  useEffect(() => { minCoverageRef.current = minCoverageRatio; }, [minCoverageRatio]);

  // Detect Safari (exclude Chrome on iOS/Android)
  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      const isSafariUA = /safari/i.test(ua) && !/chrome|crios|android/i.test(ua);
      setIsSafari(isSafariUA);
      // Performance controls via localStorage
      const fastLS = (typeof window !== 'undefined') ? window.localStorage.getItem('LUMA_FAST') : null;
      if (highQuality) setFastMode(false); else if (fastLS === '0') setFastMode(false);
      const disLS = (typeof window !== 'undefined') ? window.localStorage.getItem('LUMA_DISABLE') : null;
      if (!forceEnabled && (disLS === '1' || disLS === 'true')) setDisabled(true);
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
      window.addEventListener('touchstart', unlock, { once: true, passive: true } as any);
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

  // Play/pause fallback video based on visibility
  useEffect(() => {
    const fv = fallbackRef.current;
    if (!fv) return;
    try {
      if (showFallback && fallbackEnabled) {
        fv.play().catch(() => {});
      } else {
        fv.pause();
      }
    } catch {}
  }, [showFallback, fallbackEnabled]);

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
            let opaqueCount = 0;
            const useChroma = !!keyColor && (keyMode === 'auto' || keyMode === 'chroma' || keyMode === 'both');
            const useLuma = (keyMode === 'auto' && !keyColor) || keyMode === 'luma' || keyMode === 'both' || (!!keyColor && keyMode === 'both');
            const CWN = CW, CHN = CH; const Rmin = Math.min(CWN, CHN);
            const cx = protectCenterXRatio * CWN; const cy = protectCenterYRatio * CHN;
            const r0 = protectRadiusRatio * Rmin; const r1 = (protectRadiusRatio + protectFeatherRatio) * Rmin;
            const WwN = Ww || 1; const HwN = Hw || 1; const RminW = Math.min(WwN, HwN);
            const cxW = protectCenterXRatio * WwN; const cyW = protectCenterYRatio * HwN;
            const r0W = protectRadiusRatio * RminW; const r1W = (protectRadiusRatio + protectFeatherRatio) * RminW;
            if (useChroma && !useLuma) {
              // Chroma key only
              const Kr = keyColor![0], Kg = keyColor![1], Kb = keyColor![2];
              const tol0 = Math.max(0, Math.min(1, keyTolerance));
              const soft = Math.max(0, Math.min(1, keySoftness));
              const d0 = tol0 * 441.67295593;
              const d1 = (tol0 + soft) * 441.67295593;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const dr = r - Kr, dg = g - Kg, db = b - Kb;
                const d = Math.sqrt(dr*dr + dg*dg + db*db);
                let a = data[i + 3];
                if (d <= d0) a = 0; else if (d < d1) a = Math.round(a * ((d - d0) / (d1 - d0)));
                if (protectCircle) {
                  const idx = (i >> 2); const px = idx % WwN; const py = (idx / WwN) | 0;
                  const dx = px - cxW, dy = py - cyW; const dist = Math.hypot(dx, dy);
                  if (dist <= r0W) {
                    a = data[i + 3];
                  } else if (dist < r1W) {
                    const t = (dist - r0W) / (r1W - r0W);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            } else if (!useChroma && useLuma) {
              // Luma key only
              const floor = Math.max(0, threshold);
              const feather = Math.max(0, softness);
              const t0 = floor * 255;
              const t1 = (floor + feather) * 255;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                let a = data[i + 3];
                if (y <= t0) a = 0; else if (y < t1) a = Math.round(a * ((y - t0) / (t1 - t0)));
                if (protectCircle) {
                  const idx = (i >> 2); const px = idx % WwN; const py = (idx / WwN) | 0;
                  const dx = px - cxW, dy = py - cyW; const dist = Math.hypot(dx, dy);
                  if (dist <= r0W) {
                    a = data[i + 3];
                  } else if (dist < r1W) {
                    const t = (dist - r0W) / (r1W - r0W);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            } else if (useChroma && useLuma) {
              // Combine: min of chroma and luma factors
              const Kr = keyColor ? keyColor[0] : 0, Kg = keyColor ? keyColor[1] : 0, Kb = keyColor ? keyColor[2] : 0;
              const tol0 = Math.max(0, Math.min(1, keyTolerance));
              const soft = Math.max(0, Math.min(1, keySoftness));
              const d0 = tol0 * 441.67295593;
              const d1 = (tol0 + soft) * 441.67295593;
              const floor = Math.max(0, threshold);
              const feather = Math.max(0, softness);
              const t0 = floor * 255;
              const t1 = (floor + feather) * 255;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const dr = r - Kr, dg = g - Kg, db = b - Kb;
                const d = Math.sqrt(dr*dr + dg*dg + db*db);
                let a = data[i + 3];
                let fL = 1; if (y <= t0) fL = 0; else if (y < t1) fL = (y - t0) / (t1 - t0);
                let fC = 1; if (d <= d0) fC = 0; else if (d < d1) fC = (d - d0) / (d1 - d0);
                const f = Math.min(fL, fC);
                a = Math.round(a * f);
                if (protectCircle) {
                  const idx = (i >> 2); const px = idx % WwN; const py = (idx / WwN) | 0;
                  const dx = px - cxW, dy = py - cyW; const dist = Math.hypot(dx, dy);
                  if (dist <= r0W) {
                    a = data[i + 3];
                  } else if (dist < r1W) {
                    const t = (dist - r0W) / (r1W - r0W);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            }
            wctx.putImageData(img, 0, 0);
            // Sample coverage occasionally to decide if we need fallback
            if (fallbackEnabled && ++sampleCounterRef.current % sampleEveryRef.current === 0) {
              const total = (Ww * Hw);
              const ratio = total ? (opaqueCount / total) : 0;
              // If almost nothing is visible, enable fallback video
              setShowFallback(ratio < minCoverageRef.current);
            }
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
            let opaqueCount = 0;
            const useChroma = !!keyColor && (keyMode === 'auto' || keyMode === 'chroma' || keyMode === 'both');
            const useLuma = (keyMode === 'auto' && !keyColor) || keyMode === 'luma' || keyMode === 'both' || (!!keyColor && keyMode === 'both');
            if (useChroma && !useLuma) {
              const Kr = keyColor[0], Kg = keyColor[1], Kb = keyColor[2];
              const tol0 = Math.max(0, Math.min(1, keyTolerance));
              const soft = Math.max(0, Math.min(1, keySoftness));
              const d0 = tol0 * 441.67295593;
              const d1 = (tol0 + soft) * 441.67295593;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const dr = r - Kr, dg = g - Kg, db = b - Kb;
                const d = Math.sqrt(dr*dr + dg*dg + db*db);
                let a = data[i + 3];
                if (d <= d0) a = 0; else if (d < d1) a = Math.round(a * ((d - d0) / (d1 - d0)));
                if (protectCircle) {
                  const idx = (i >> 2);
                  const px = idx % CWN;
                  const py = (idx / CWN) | 0;
                  const dx = px - cx, dy = py - cy; const dist = Math.hypot(dx, dy);
                  if (dist <= r0) {
                    a = data[i + 3];
                  } else if (dist < r1) {
                    const t = (dist - r0) / (r1 - r0);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            } else if (!useChroma && useLuma) {
              // Luma key
              const floor = Math.max(0, threshold);
              const feather = Math.max(0, softness);
              const t0 = floor * 255;
              const t1 = (floor + feather) * 255;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                let a = data[i + 3];
                if (y <= t0) a = 0; else if (y < t1) a = Math.round(a * ((y - t0) / (t1 - t0)));
                if (protectCircle) {
                  const idx = (i >> 2);
                  const px = idx % CWN;
                  const py = (idx / CWN) | 0;
                  const dx = px - cx, dy = py - cy; const dist = Math.hypot(dx, dy);
                  if (dist <= r0) {
                    a = data[i + 3];
                  } else if (dist < r1) {
                    const t = (dist - r0) / (r1 - r0);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            } else if (useChroma && useLuma) {
              // Combine
              const Kr = keyColor ? keyColor[0] : 0, Kg = keyColor ? keyColor[1] : 0, Kb = keyColor ? keyColor[2] : 0;
              const tol0 = Math.max(0, Math.min(1, keyTolerance));
              const soft = Math.max(0, Math.min(1, keySoftness));
              const d0 = tol0 * 441.67295593;
              const d1 = (tol0 + soft) * 441.67295593;
              const floor = Math.max(0, threshold);
              const feather = Math.max(0, softness);
              const t0 = floor * 255;
              const t1 = (floor + feather) * 255;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const dr = r - Kr, dg = g - Kg, db = b - Kb;
                const d = Math.sqrt(dr*dr + dg*dg + db*db);
                let a = data[i + 3];
                let fL = 1; if (y <= t0) fL = 0; else if (y < t1) fL = (y - t0) / (t1 - t0);
                let fC = 1; if (d <= d0) fC = 0; else if (d < d1) fC = (d - d0) / (d1 - d0);
                const f = Math.min(fL, fC);
                a = Math.round(a * f);
                if (protectCircle) {
                  const idx = (i >> 2);
                  const px = idx % CWN;
                  const py = (idx / CWN) | 0;
                  const dx = px - cx, dy = py - cy; const dist = Math.hypot(dx, dy);
                  if (dist <= r0) {
                    a = data[i + 3];
                  } else if (dist < r1) {
                    const t = (dist - r0) / (r1 - r0);
                    const baseA = data[i + 3];
                    a = Math.max(a, Math.round(baseA * (1 - t)));
                  }
                }
                data[i + 3] = a;
                if (a > 8) opaqueCount++;
              }
            }
            ctx.putImageData(img, 0, 0);
            if (fallbackEnabled && ++sampleCounterRef.current % sampleEveryRef.current === 0) {
              const total = (CW * CH);
              const ratio = total ? (opaqueCount / total) : 0;
              setShowFallback(ratio < minCoverageRef.current);
            }
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
  // Optional radial mask CSS string
  const maskCss = maskCircle
    ? `radial-gradient(circle at ${maskCenterX} ${maskCenterY}, rgba(0,0,0,1) ${Math.max(0, Math.min(100, maskRadiusPct))}%, rgba(0,0,0,0) ${Math.max(0, Math.min(100, maskRadiusPct + maskFeatherPct))}%)`
    : undefined;

  const canvasStyle: React.CSSProperties = {
    background: 'transparent',
    // Blend to remove dark backgrounds visually; 'lighten' is stronger at removing near-black
    ...((isSafari || blendScreen) ? { mixBlendMode: 'lighten' as const } : {}),
    // Do not intercept pointer/scroll events; keep overlay non-interactive
    pointerEvents: 'none',
    ...(maskCss ? ({ maskImage: maskCss, WebkitMaskImage: maskCss } as any) : {}),
    // Hint the browser we animate opacity/transforms around this element
    willChange: 'opacity, transform',
    contain: 'layout paint',
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  };

  // If luma processing is disabled, render a plain <video> fallback
  if (disabled) {
    const src = srcMp4 || srcAlt || '';
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        aria-label="luma-fallback-video"
        className={className}
        style={{
          ...(style || {}),
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: 'transparent',
          pointerEvents: 'none',
        }}
      />
    );
  }
  const src = srcMp4 || srcAlt || '';
  return (
    <div className={className} style={{ ...(style || {}), position: 'relative' }}>
      {/* Fallback underlay to ensure visibility if keyed output is empty */}
      {fallbackEnabled ? (
        <video
          ref={fallbackRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          aria-label="luma-fallback-underlay"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: showFallback ? 1 : 0,
            transition: 'opacity 180ms ease',
            pointerEvents: 'none',
            background: 'transparent',
            // Apply same blend so black pixels don't darken the background
            ...((isSafari || blendScreen) ? { mixBlendMode: 'lighten' as const } : {}),
            ...(maskCss ? ({ maskImage: maskCss, WebkitMaskImage: maskCss } as any) : {}),
          }}
        />
      ) : null}
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  );
}
