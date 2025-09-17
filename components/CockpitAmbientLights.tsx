"use client";
import React, { useEffect, useRef, useState } from "react";
import { ELEMENT_COLORS, type Element } from "@/lib/planets";
import type { Track } from "@/config/tracks";

interface Props {
  currentTrack?: Track;
  isPlaying: boolean;
  mounted: boolean;
}

function getTrackElement(track?: Track): Element {
  if (!track) return "water";
  const slug = track.slug || "";
  const s = slug.toLowerCase();
  // Specific themes first (matching logic from MediaPlayer.tsx)
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "water";
  if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "heart";
  if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "lightning";
  if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "darkness";
  if (s.includes("fire") || s.includes("burn")) return "fire";
  if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "earth";
  if (s.includes("air") || s.includes("sky")) return "air";
  return "water"; // fallback
}

export default function CockpitAmbientLights({ currentTrack, isPlaying, mounted }: Props) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const rafRef = useRef<number>();

  // Beat detection state
  const [beatDetected, setBeatDetected] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const lastBeatTime = useRef<number>(0);
  const energyHistory = useRef<number[]>([]);
  const bassHistory = useRef<number[]>([]);
  const kickHistory = useRef<number[]>([]);
  const snareHistory = useRef<number[]>([]);
  const hihatHistory = useRef<number[]>([]);
  
  // Beat detection parameters
  const BEAT_THRESHOLD = 1.2; // Energy spike threshold
  const BEAT_MIN_INTERVAL = 200; // Minimum ms between beats
  const HISTORY_SIZE = 43; // ~1 second at 60fps for moving average

  // Get current song's element and colors
  const currentElement = getTrackElement(currentTrack);
  const primaryColor = ELEMENT_COLORS[currentElement];
  
  // Generate complementary colors for variety
  const getComplementaryColors = (baseColor: string) => {
    const colors = [];
    colors.push(baseColor); // Primary
    
    // Convert hex to HSL for color manipulation
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    
    // Generate variations
    const hslToHex = (h: number, s: number, l: number) => {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1/3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1/3);
      
      return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
    };
    
    // Add complementary and triadic colors
    colors.push(hslToHex((h + 0.5) % 1, s * 0.8, l)); // Complementary
    colors.push(hslToHex((h + 0.33) % 1, s * 0.9, l * 0.9)); // Triadic 1
    colors.push(hslToHex((h + 0.67) % 1, s * 0.9, l * 0.9)); // Triadic 2
    
    return colors;
  };
  
  const lightColors = getComplementaryColors(primaryColor);

  // Advanced beat detection algorithm
  const detectBeat = (frequencyData: Uint8Array) => {
    const now = Date.now();
    
    // Define frequency ranges for different drum elements
    const bassRange = { start: 0, end: 8 };     // 0-340Hz - kick drum range
    const kickRange = { start: 2, end: 6 };     // 86-258Hz - tight kick range  
    const snareRange = { start: 8, end: 20 };   // 340-860Hz - snare drum range
    const hihatRange = { start: 40, end: 60 };  // 1720-2580Hz - hi-hat range
    
    // Calculate energy in different frequency bands
    const calculateBandEnergy = (range: { start: number; end: number }) => {
      let sum = 0;
      for (let i = range.start; i <= range.end && i < frequencyData.length; i++) {
        sum += frequencyData[i] * frequencyData[i]; // Square for energy
      }
      return sum / (range.end - range.start + 1);
    };
    
    const bassEnergy = calculateBandEnergy(bassRange);
    const kickEnergy = calculateBandEnergy(kickRange);
    const snareEnergy = calculateBandEnergy(snareRange);
    const hihatEnergy = calculateBandEnergy(hihatRange);
    const totalEnergy = bassEnergy + snareEnergy + hihatEnergy;
    
    // Update energy histories
    energyHistory.current.push(totalEnergy);
    bassHistory.current.push(bassEnergy);
    kickHistory.current.push(kickEnergy);
    snareHistory.current.push(snareEnergy);
    hihatHistory.current.push(hihatEnergy);
    
    // Trim histories to maintain size
    if (energyHistory.current.length > HISTORY_SIZE) {
      energyHistory.current.shift();
      bassHistory.current.shift();
      kickHistory.current.shift();
      snareHistory.current.shift();
      hihatHistory.current.shift();
    }
    
    // Need enough history for meaningful analysis
    if (energyHistory.current.length < HISTORY_SIZE) return;
    
    // Calculate moving averages for adaptive thresholding
    const avgEnergy = energyHistory.current.reduce((a, b) => a + b) / energyHistory.current.length;
    const avgBass = bassHistory.current.reduce((a, b) => a + b) / bassHistory.current.length;
    const avgKick = kickHistory.current.reduce((a, b) => a + b) / kickHistory.current.length;
    const avgSnare = snareHistory.current.reduce((a, b) => a + b) / snareHistory.current.length;
    
    // Calculate variance for dynamic threshold adjustment
    const energyVariance = energyHistory.current.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / energyHistory.current.length;
    const adaptiveThreshold = BEAT_THRESHOLD + Math.sqrt(energyVariance) * 0.01;
    
    // Detect different types of beats
    const kickBeat = kickEnergy > avgKick * (adaptiveThreshold * 1.1); // Slightly higher threshold for kicks
    const snareBeat = snareEnergy > avgSnare * adaptiveThreshold;
    const bassBeat = bassEnergy > avgBass * adaptiveThreshold;
    const generalBeat = totalEnergy > avgEnergy * adaptiveThreshold;
    
    // Beat detection with minimum interval
    const timeSinceLastBeat = now - lastBeatTime.current;
    const beatDetected = (kickBeat || snareBeat || bassBeat || generalBeat) && timeSinceLastBeat > BEAT_MIN_INTERVAL;
    
    if (beatDetected) {
      lastBeatTime.current = now;
      
      // Calculate beat intensity based on energy spike magnitude
      const energyRatio = totalEnergy / Math.max(avgEnergy, 1);
      const kickRatio = kickEnergy / Math.max(avgKick, 1);
      const snareRatio = snareEnergy / Math.max(avgSnare, 1);
      
      // Combine ratios with weights for different beat types
      let intensity = 0;
      if (kickBeat) intensity += kickRatio * 0.4; // Kicks get strong weight
      if (snareBeat) intensity += snareRatio * 0.3; // Snares get medium weight
      if (bassBeat) intensity += (bassEnergy / Math.max(avgBass, 1)) * 0.2; // Bass gets lower weight
      if (generalBeat) intensity += energyRatio * 0.1; // General energy as backup
      
      // Normalize and clamp intensity
      intensity = Math.min(Math.max(intensity - adaptiveThreshold, 0) * 2, 3);
      
      setBeatDetected(true);
      setBeatIntensity(intensity);
      
      // Clear beat detection after short duration
      setTimeout(() => setBeatDetected(false), 150);
    }
    
    return {
      beatDetected,
      intensity: beatDetected ? beatIntensity : 0,
      kickBeat,
      snareBeat,
      bassBeat,
      bassEnergy: bassEnergy / 10000, // Normalize for lighting
      snareEnergy: snareEnergy / 10000,
      hihatEnergy: hihatEnergy / 10000,
    };
  };

  // Set up audio analysis with enhanced beat detection
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const setupAudio = async () => {
      try {
        const audioElement = document.querySelector('audio[data-audio-player="1"]') as HTMLAudioElement;
        if (!audioElement) return;
        
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaElementSource(audioElement);
        const analyserNode = ctx.createAnalyser();
        
        analyserNode.fftSize = 512; // Increased for better frequency resolution
        analyserNode.smoothingTimeConstant = 0.6; // Reduced for more responsive beat detection
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        source.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        
        setAudioContext(ctx);
        setAnalyser(analyserNode);
        setDataArray(dataArray);
      } catch (error) {
        console.warn('Audio analysis setup failed:', error);
        // Fallback to time-based animation without audio analysis
      }
    };
    
    setupAudio();
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [mounted, currentTrack]);

  // Enhanced animation loop with beat detection
  useEffect(() => {
    if (!isPlaying || !mounted) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = () => {
      setAnimationTime(Date.now());
      
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        // Run beat detection on every frame
        detectBeat(dataArray);
      }
      
      if (isPlaying) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, mounted, analyser, dataArray]);

  // Calculate audio-reactive values
  const getAudioReactiveValue = (frequencyRange: [number, number], baseValue: number = 0.5) => {
    if (!dataArray || !analyser) {
      // Fallback to time-based animation
      return baseValue + Math.sin(animationTime * 0.003) * 0.3;
    }
    
    const [startFreq, endFreq] = frequencyRange;
    const startBin = Math.floor(startFreq * dataArray.length / 128);
    const endBin = Math.floor(endFreq * dataArray.length / 128);
    
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += dataArray[i];
    }
    const average = sum / (endBin - startBin + 1);
    
    return baseValue + (average / 255) * 0.8;
  };

  // Calculate blue button position and beam area to position lights above it
  const getButtonBottomPercent = () => {
    if (typeof window === 'undefined') return 31;
    const w = window.innerWidth;
    if (w <= 420) return 28; // small phones
    if (w <= 768) return 29; // tablets/large phones  
    return 31; // desktop
  };
  
  const buttonBottomPercent = getButtonBottomPercent();
  const buttonTopPercent = 100 - buttonBottomPercent; // Convert from bottom to top positioning
  const beamTopPercent = Math.max(buttonTopPercent - 15, 5); // Position lights well above button beam
  
  // Generate light positions around the cockpit - positioned relative to blue button
  const lightPositions = [
    // Left side lights - positioned above blue button beam
    { x: '8%', y: `${Math.max(beamTopPercent - 20, 3)}%`, frequency: [0, 0.2] as [number, number], colorIndex: 0 },
    { x: '5%', y: `${Math.max(beamTopPercent - 10, 8)}%`, frequency: [0.2, 0.4] as [number, number], colorIndex: 1 },
    { x: '3%', y: `${Math.max(beamTopPercent + 5, 18)}%`, frequency: [0.1, 0.3] as [number, number], colorIndex: 2 },
    { x: '7%', y: `${Math.max(beamTopPercent + 20, 35)}%`, frequency: [0.3, 0.5] as [number, number], colorIndex: 3 },
    
    // Right side lights - positioned above blue button beam  
    { x: '92%', y: `${Math.max(beamTopPercent - 20, 3)}%`, frequency: [0.4, 0.6] as [number, number], colorIndex: 1 },
    { x: '95%', y: `${Math.max(beamTopPercent - 10, 8)}%`, frequency: [0.5, 0.7] as [number, number], colorIndex: 2 },
    { x: '97%', y: `${Math.max(beamTopPercent + 5, 18)}%`, frequency: [0.6, 0.8] as [number, number], colorIndex: 0 },
    { x: '93%', y: `${Math.max(beamTopPercent + 20, 35)}%`, frequency: [0.7, 1.0] as [number, number], colorIndex: 3 },
    
    // Top accent lights - always at the very top
    { x: '25%', y: '2%', frequency: [0.8, 1.0] as [number, number], colorIndex: 2 },
    { x: '75%', y: '2%', frequency: [0.0, 0.2] as [number, number], colorIndex: 1 },
  ];

  if (!mounted) return null;

  return (
    <>
      {lightPositions.map((light, i) => {
        const baseIntensity = getAudioReactiveValue(light.frequency, 0.4);
        const color = lightColors[light.colorIndex % lightColors.length];
        const pulsePhase = (animationTime * 0.002 + i * 0.5) % (Math.PI * 2);
        const basePulseFactor = 0.8 + Math.sin(pulsePhase) * 0.3;
        
        // Beat-reactive enhancements
        let intensity = baseIntensity;
        let pulseFactor = basePulseFactor;
        let beatScale = 1;
        let beatBlur = 8 + baseIntensity * 12;
        
        if (beatDetected) {
          // Apply beat intensity multiplier
          const beatBoost = 1 + (beatIntensity * 0.8);
          intensity = Math.min(intensity * beatBoost, 1.2);
          
          // Enhanced pulse factor on beats
          pulseFactor = Math.min(basePulseFactor + (beatIntensity * 0.4), 1.5);
          
          // Scale effect on beat
          beatScale = 1 + (beatIntensity * 0.3);
          
          // Dynamic blur on beats - sharper on strong beats
          beatBlur = Math.max(beatBlur - (beatIntensity * 4), 4);
        }
        
        // Different light behaviors based on position
        const isLeftSide = parseFloat(light.x) < 50;
        const isTopAccent = parseFloat(light.y) < 20;
        
        // Special beat effects for different light zones
        let zoneIntensityBoost = 1;
        if (beatDetected) {
          if (isTopAccent) {
            // Top accent lights react strongly to snares and highs
            zoneIntensityBoost = 1 + (beatIntensity * 0.6);
          } else if (isLeftSide) {
            // Left side lights react more to bass/kicks
            zoneIntensityBoost = 1 + (beatIntensity * 0.5);
          } else {
            // Right side lights react to overall energy
            zoneIntensityBoost = 1 + (beatIntensity * 0.7);
          }
        }
        
        intensity *= zoneIntensityBoost;
        
        return (
          <div
            key={i}
            className="fixed pointer-events-none z-10"
            style={{
              left: light.x,
              top: light.y,
              transform: `translate(-50%, -50%) scale(${beatScale})`,
              width: `${20 + intensity * 40}px`,
              height: `${20 + intensity * 40}px`,
              transition: beatDetected ? 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 300ms ease',
            }}
          >
            {/* Main light source with beat reactivity */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${color}${Math.floor(Math.min(intensity * 255, 255)).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                filter: `blur(${beatBlur}px) brightness(${beatDetected ? 1.1 + (beatIntensity * 0.3) : 1})`,
                opacity: isPlaying ? Math.min(intensity * pulseFactor, 1) : 0.1,
                transition: beatDetected ? 'all 100ms ease' : 'opacity 300ms ease',
                animation: isPlaying && !beatDetected ? 'lightPulse 2s ease-in-out infinite' : 'none',
                animationDelay: `${i * 200}ms`,
                boxShadow: beatDetected ? `0 0 ${20 + beatIntensity * 30}px ${color}88, 0 0 ${40 + beatIntensity * 60}px ${color}44` : 'none',
              }}
            />
            
            {/* Secondary glow layer with enhanced beat response */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${color}${Math.floor((intensity * 0.6) * 255).toString(16).padStart(2, '0')} 0%, ${color}22 40%, transparent 80%)`,
                filter: `blur(${16 + intensity * 20}px)`,
                opacity: isPlaying ? Math.min(intensity * 0.6 * pulseFactor, 0.8) : 0.05,
                transition: beatDetected ? 'all 120ms ease' : 'opacity 300ms ease',
                transform: `scale(${1.5 + intensity * 0.8 + (beatDetected ? beatIntensity * 0.2 : 0)})`,
              }}
            />
            
            {/* Outer atmospheric glow with subtle beat enhancement */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${color}33 0%, ${color}11 50%, transparent 100%)`,
                filter: `blur(${24 + intensity * 32}px)`,
                opacity: isPlaying ? Math.min(intensity * 0.4 * pulseFactor, 0.6) : 0.02,
                transition: beatDetected ? 'all 150ms ease' : 'opacity 300ms ease',
                transform: `scale(${2.5 + intensity * 1.2 + (beatDetected ? beatIntensity * 0.15 : 0)})`,
              }}
            />
            
            {/* Beat flash overlay - only visible during beats */}
            {beatDetected && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${color}FF 0%, ${color}88 30%, transparent 60%)`,
                  filter: `blur(${Math.max(beatBlur - 2, 2)}px)`,
                  opacity: beatIntensity * 0.4,
                  transform: `scale(${0.8 + beatIntensity * 0.5})`,
                  animation: 'beatFlash 150ms ease-out',
                }}
              />
            )}
          </div>
        );
      })}
      
      {/* Dynamic CSS for animations */}
      <style jsx>{`
        @keyframes lightPulse {
          0%, 100% { 
            opacity: ${isPlaying ? 0.6 : 0.1}; 
            transform: scale(1); 
          }
          50% { 
            opacity: ${isPlaying ? 1 : 0.2}; 
            transform: scale(1.1); 
          }
        }
        
        @keyframes beatFlash {
          0% { 
            opacity: ${beatIntensity * 0.6};
            transform: scale(0.6);
            filter: blur(6px) brightness(1.5);
          }
          30% {
            opacity: ${beatIntensity * 0.8};
            transform: scale(${0.9 + beatIntensity * 0.3});
            filter: blur(4px) brightness(1.8);
          }
          100% { 
            opacity: 0;
            transform: scale(${1.2 + beatIntensity * 0.5});
            filter: blur(8px) brightness(1.2);
          }
        }
        
        @keyframes atmosphericFlow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        /* Beat-responsive glow effects */
        @keyframes beatGlow {
          0% { 
            box-shadow: 0 0 10px ${primaryColor}44, 0 0 20px ${primaryColor}22;
          }
          50% { 
            box-shadow: 0 0 ${20 + beatIntensity * 40}px ${primaryColor}88, 0 0 ${40 + beatIntensity * 80}px ${primaryColor}44;
          }
          100% { 
            box-shadow: 0 0 10px ${primaryColor}44, 0 0 20px ${primaryColor}22;
          }
        }
      `}</style>
    </>
  );
}