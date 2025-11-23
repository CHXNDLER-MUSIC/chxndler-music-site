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

const NeonWaveform: React.FC<NeonWaveformProps> = ({ audioUrl, element }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
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

    // Create a single AudioContext and MediaElementSourceNode per element
    const AudioCtx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    const audioContext = audioContextRef.current;

    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 1024;
    }
    const analyser = analyserRef.current;

    if (!sourceRef.current) {
      // Create the source exactly once for this media element
      sourceRef.current = audioContext.createMediaElementSource(audioEl);
      sourceRef.current.connect(analyser);
      // Do not connect analyser to destination to avoid duplicate audio output
      // analyser.connect(audioContext.destination);
    }

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
      // Do not recreate the source; only stop animation here.
      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
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
        sourceRef.current?.disconnect();
        audioContextRef.current?.close();
      } catch {}
      analyserRef.current = null;
      sourceRef.current = null;
      audioContextRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full rounded-xl border border-white/10 bg-transparent"
      />
      <audio ref={audioRef} src={audioUrl} controls className="w-full" />
    </div>
  );
};

export default NeonWaveform;
