"use client";

import React, { useEffect, useRef, useState } from "react";

interface SimpleWaveformProps {
  className?: string;
}

const SimpleWaveform: React.FC<SimpleWaveformProps> = ({ 
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find any playing audio element on the page
    const findActiveAudio = () => {
      const audioElements = document.querySelectorAll('audio');
      for (const audio of audioElements) {
        if (!audio.paused && audio.currentTime > 0) {
          return audio;
        }
      }
      // If no audio is playing, try to find the main holo audio
      return document.querySelector('audio[data-holo-audio="1"]') as HTMLAudioElement || null;
    };

    const audioEl = findActiveAudio();
    if (!audioEl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setupAudioContext = async (targetAudio: HTMLAudioElement) => {
      try {
        // Clean up previous connections
        if (analyserRef.current) {
          analyserRef.current.disconnect();
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }

        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          const AudioCtor: typeof AudioContext = 
            (window as any).AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtor();
        }

        const audioContext = audioContextRef.current;
        
        // Create new source for the target audio
        sourceRef.current = audioContext.createMediaElementSource(targetAudio);
        // Connect source to destination to maintain audio output
        sourceRef.current.connect(audioContext.destination);

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Smaller FFT for simpler visualization
        analyser.smoothingTimeConstant = 0.8;

        // Connect source to analyser
        sourceRef.current.connect(analyser);
        analyserRef.current = analyser;
        setIsConnected(true);

        // Start drawing
        draw();
      } catch (error) {
        console.warn("Failed to setup audio context:", error);
        setIsConnected(false);
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

    // Try to connect to the audio element
    if (audioEl && !isConnected) {
      setupAudioContext(audioEl);
    }

    // Periodic check for new audio elements
    const intervalId = setInterval(() => {
      const currentAudio = findActiveAudio();
      if (currentAudio && currentAudio !== audioEl) {
        setupAudioContext(currentAudio);
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
    };
  }, [isConnected]);

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