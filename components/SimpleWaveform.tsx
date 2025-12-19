"use client";

import React, { useEffect, useRef } from "react";

interface SimpleWaveformProps {
  className?: string;
}

// WeakMap to track which audio elements have already had a source node created
// This persists across component instances and React StrictMode double-renders
const audioSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

const SimpleWaveform: React.FC<SimpleWaveformProps> = ({
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  // Track which audio element we're currently connected to
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find any playing audio element on the page
    const findActiveAudio = (): HTMLAudioElement | null => {
      const audioElements = document.querySelectorAll('audio');
      for (const audio of audioElements) {
        if (!audio.paused && audio.currentTime > 0) {
          return audio;
        }
      }
      // If no audio is playing, try to find the main holo audio
      return document.querySelector('audio[data-holo-audio="1"]') as HTMLAudioElement || null;
    };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupAudioContext = (targetAudio: HTMLAudioElement) => {
      try {
        // If we're already connected to this exact audio element, don't reconnect
        if (connectedAudioRef.current === targetAudio && sourceRef.current) {
          // Just ensure analyser is connected and start drawing
          if (analyserRef.current) {
            startDrawing();
          }
          return;
        }

        // Create audio context if it doesn't exist
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          const AudioCtor: typeof AudioContext =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtor();
        }

        const audioContext = audioContextRef.current;

        // Check if this audio element already has a source node (from WeakMap)
        let source = audioSourceMap.get(targetAudio);

        if (!source) {
          // Only create a new source if one doesn't exist for this element
          source = audioContext.createMediaElementSource(targetAudio);
          audioSourceMap.set(targetAudio, source);
          // Connect source to destination to maintain audio output
          source.connect(audioContext.destination);
        }

        sourceRef.current = source;
        connectedAudioRef.current = targetAudio;

        // Disconnect old analyser if it exists
        if (analyserRef.current) {
          try { analyserRef.current.disconnect(); } catch {}
        }

        // Create new analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        // Connect source to analyser
        source.connect(analyser);
        analyserRef.current = analyser;

        // Start drawing
        startDrawing();
      } catch (error) {
        // Only log if it's not the known "already connected" error
        if (!(error instanceof DOMException && error.name === 'InvalidStateError')) {
          console.warn("Failed to setup audio context:", error);
        }
      }
    };

    const startDrawing = () => {
      // Cancel any existing animation frame before starting new one
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      draw();
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

    // Try to connect to any active audio element
    const audioEl = findActiveAudio();
    if (audioEl) {
      setupAudioContext(audioEl);
    }

    // Periodic check for new audio elements
    const intervalId = setInterval(() => {
      const currentAudio = findActiveAudio();
      if (currentAudio) {
        // Only setup if it's a different audio element than we're connected to
        if (currentAudio !== connectedAudioRef.current) {
          setupAudioContext(currentAudio);
        } else if (!animationIdRef.current && analyserRef.current) {
          // Restart drawing if it stopped
          startDrawing();
        }
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      // Disconnect analyser but NOT the source (it's shared via WeakMap)
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount - don't close AudioContext as it may be reused
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
      // Note: We don't disconnect sourceRef or close audioContext here
      // because the source node is shared via WeakMap and may be reused
      connectedAudioRef.current = null;
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