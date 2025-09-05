"use client";
import React from "react";

type Props = {
  size: number; // CSS pixels for square canvas (will scale with DPR)
  sources: string[]; // video sources to try in order
  threshold?: number; // 0–255 luma threshold to key out (default 28)
};

export default function WheelVideoCanvas({ size, sources, threshold = 28 }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef<boolean>(false);
  const [failed, setFailed] = React.useState(false);

  // Init video element and attach source
  React.useEffect(() => {
    mountedRef.current = true;
    const vid = document.createElement("video");
    videoRef.current = vid;
    try {
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.crossOrigin = "anonymous"; // allow canvas sampling
      // Try primary source, then fallback if error
      let idx = 0;
      const setSrc = (i: number) => {
        try { vid.pause(); } catch {}
        vid.src = sources[i] || "";
        // Kick playback
        vid.load();
        vid.play().catch(() => {});
      };
      const onError = () => {
        if (!mountedRef.current) return;
        idx += 1;
        if (idx < sources.length) setSrc(idx);
        else setFailed(true);
      };
      vid.addEventListener("error", onError);
      // Start with the first source
      setSrc(idx);
    } catch {
      setFailed(true);
    }

    return () => {
      mountedRef.current = false;
      try { if (videoRef.current) { videoRef.current.pause(); } } catch {}
      videoRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [sources]);

  // Draw loop with luma key
  React.useEffect(() => {
    if (failed) return;
    const cvs = canvasRef.current;
    const vid = videoRef.current;
    if (!cvs || !vid) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    // Style size stays at `size`; internal buffer scales to DPR
    cvs.width = Math.max(2, Math.round(size * dpr));
    cvs.height = Math.max(2, Math.round(size * dpr));
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (!ctx) { setFailed(true); return; }

    const draw = () => {
      if (!mountedRef.current) return;
      try {
        // Clear and clip to a circle
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.save();
        ctx.beginPath();
        const r = Math.min(cvs.width, cvs.height) / 2;
        ctx.arc(cvs.width / 2, cvs.height / 2, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        // Draw the video scaled to canvas
        ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
        // Luma key: set alpha to 0 for near-black pixels
        const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const data = img.data;
        const thr = threshold;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Rec. 709 luma
          const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (y < thr) data[i + 3] = 0; // transparent
        }
        ctx.putImageData(img, 0, 0);
        ctx.restore();
      } catch {
        // If we fail at any point, bail and let fallback show
        setFailed(true);
        return;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    // Start drawing when the video can play
    const start = () => {
      if (!mountedRef.current) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    const canPlay = () => { try { vid.play().catch(() => {}); } catch {}; start(); };
    vid.addEventListener("playing", start);
    vid.addEventListener("canplay", canPlay);
    if (!vid.paused) start();

    return () => {
      try {
        vid.removeEventListener("playing", start);
        vid.removeEventListener("canplay", canPlay);
      } catch {}
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [size, threshold, failed]);

  // Fallback: show regular video if canvas fails
  if (failed) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{ display: 'block', width: size, height: size, objectFit: 'cover', borderRadius: '50%' }}
      >
        {sources.map((src, i) => (
          <source key={i} src={src} />
        ))}
      </video>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: size, height: size, borderRadius: '50%' }}
      aria-hidden
    />
  );
}

