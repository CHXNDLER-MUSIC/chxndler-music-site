"use client";

import React, { useEffect, useRef } from "react";

interface NeonWaveformProps {
  audioUrl: string;
  element: "heart" | "water" | "lightning" | "darkness";
}

const ELEMENT_COLORS: Record<
  NeonWaveformProps["element"],
  { stroke: string; glow: string }
> = {
  heart: {
    stroke: "#FC54AF",
    glow: "rgba(252, 84, 175, 0.9)",
  },
  water: {
    stroke: "#38B6FF",
    glow: "rgba(56, 182, 255, 0.9)",
  },
  lightning: {
    stroke: "#F2EF1D",
    glow: "rgba(242, 239, 29, 0.9)",
  },
  darkness: {
    stroke: "#FFFFFF",
    glow: "rgba(255, 255, 255, 0.7)",
  },
};

// Cache a single MediaElementSource per <audio> element across mounts
const MEDIA_SOURCE_CACHE: WeakMap<HTMLMediaElement, { ctx: AudioContext; src: MediaElementAudioSourceNode }> = new WeakMap();

const NeonWaveform: React.FC<NeonWaveformProps> = ({ audioUrl, element }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const elementRef = useRef(element);

  // Keep latest element for drawing colors without recreating the graph
  useEffect(() => {
    elementRef.current = element;
  }, [element]);

  useEffect(() => {
    const audioEl = audioRef.current;
    const canvas = canvasRef.current;
    if (!audioEl || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Obtain or create a cached AudioContext and MediaElementSource for this <audio>
    const AudioCtor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    let cached = MEDIA_SOURCE_CACHE.get(audioEl);
    if (!cached) {
      const ctx = new AudioCtor();
      const src = ctx.createMediaElementSource(audioEl);
      MEDIA_SOURCE_CACHE.set(audioEl, { ctx, src });
      cached = { ctx, src };
    }
    const audioContext = cached.ctx;
    const sourceNode = cached.src;

    // Create a dedicated analyser for this component instance and connect it
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    try { sourceNode.connect(analyser); } catch {}
    analyserRef.current = analyser;

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const { stroke, glow } = ELEMENT_COLORS[elementRef.current];
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = stroke;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 18;

      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    };

    const handlePlay = async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      draw();
    };

    const handlePause = () => {
      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    audioEl.addEventListener("play", handlePlay);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("ended", handlePause);

    return () => {
      audioEl.removeEventListener("play", handlePlay);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("ended", handlePause);
      // Stop animation and disconnect only this analyser
      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      try { analyser.disconnect(); } catch {}
    };
    // Intentionally only set up once for the element lifecycle
  }, []);

  // Cleanup on unmount: disconnect nodes and close context
  useEffect(() => {
    return () => {
      try {
        if (animationIdRef.current != null) {
          cancelAnimationFrame(animationIdRef.current);
        }
        analyserRef.current?.disconnect();
      } catch {}
      analyserRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3" style={{ marginTop: '12px' }}>
      <canvas
        ref={canvasRef}
        width={1600}
        height={120}
        className="w-full rounded-xl border border-white/10 bg-transparent"
        style={{ 
          maxWidth: 'none',
          width: '250%',
          marginLeft: '0',
          marginRight: '-150%'
        }}
      />
      <audio ref={audioRef} src={audioUrl} controls className="w-full" />
    </div>
  );
};

export default NeonWaveform;
