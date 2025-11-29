"use client";

import React, { useEffect, useRef } from "react";

interface SimpleWaveformProps {
  audioRef?: React.RefObject<HTMLAudioElement>;
  className?: string;
}

const SimpleWaveform: React.FC<SimpleWaveformProps> = ({ 
  audioRef,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audioEl = audioRef?.current;
    
    if (!canvas || !audioEl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupAudioContext = async () => {
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          const AudioCtor: typeof AudioContext = 
            (window as any).AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtor();
        }

        const audioContext = audioContextRef.current;
        
        // Create source if it doesn't exist
        if (!sourceRef.current) {
          sourceRef.current = audioContext.createMediaElementSource(audioEl);
          // Connect source to destination to maintain audio output
          sourceRef.current.connect(audioContext.destination);
        }

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Smaller FFT for simpler visualization
        analyser.smoothingTimeConstant = 0.8;

        // Connect source to analyser
        sourceRef.current.connect(analyser);
        analyserRef.current = analyser;

        // Start drawing
        draw();
      } catch (error) {
        console.warn("Failed to setup audio context:", error);
      }
    };

    const draw = () => {
      if (!analyserRef.current) return;
      
      animationIdRef.current = requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw grey waveform line
      ctx.strokeStyle = "#666666";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Convert frequency data to waveform-like visualization
        const amplitude = dataArray[i] / 255.0;
        const y = height / 2 + (amplitude - 0.5) * height * 0.8;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    };

    const handlePlay = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      if (!analyserRef.current) {
        setupAudioContext();
      } else {
        draw();
      }
    };

    const handlePause = () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    // Listen for audio events
    audioEl.addEventListener("play", handlePlay);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("ended", handlePause);

    // Setup on mount if audio is already playing
    if (!audioEl.paused) {
      handlePlay();
    }

    return () => {
      audioEl.removeEventListener("play", handlePlay);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("ended", handlePause);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
    };
  }, [audioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
    };
  }, []);

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        className="w-full max-w-md h-12 opacity-80 hover:opacity-100 transition-opacity duration-200"
        style={{ 
          imageRendering: 'crisp-edges',
          background: 'transparent'
        }}
      />
    </div>
  );
};

export default SimpleWaveform;