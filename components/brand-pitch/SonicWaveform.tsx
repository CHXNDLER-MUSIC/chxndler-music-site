"use client";

import React, { useEffect, useRef } from "react";

type SonicWaveformProps = {
  /** Null when Web Audio isn't available, or before playback has ever started. */
  analyser: AnalyserNode | null;
  /** Whether the version this waveform belongs to is the one currently playing. */
  active: boolean;
  color: string;
  reduceMotion: boolean;
  className?: string;
};

/**
 * A minimal live waveform for whichever sonic-logo version is currently
 * playing — a thin oscilloscope line via Canvas + AnalyserNode, not a
 * scrubbable SoundCloud-style timeline. When idle (or reduced-motion) it
 * settles into a static flat line and runs no animation loop at all, so it
 * costs nothing until something is actually playing.
 */
export default function SonicWaveform({
  analyser,
  active,
  color,
  reduceMotion,
  className = "",
}: SonicWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let rafId: number | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    const drawFlat = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = Math.max(1, 1.5 * dpr);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    resize();

    const isLive = active && !reduceMotion && !!analyser;

    if (!isLive) {
      drawFlat();
      const ro = new ResizeObserver(() => {
        resize();
        drawFlat();
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 1.5 * dpr);
      ctx.beginPath();
      const slice = width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128 - 1; // -1..1
        const y = height / 2 + v * (height * 0.42);
        const x = i * slice;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    draw();

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active, analyser, color, reduceMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block w-full h-full ${className}`} />;
}
