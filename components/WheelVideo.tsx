'use client';

import React, { useRef, useEffect, useState } from 'react';
import { supportsVideoBlendModes, isSafari } from '../utils/browserDetection';
import { useCanvasChromaKey } from '../hooks/useCanvasChromaKey';

interface WheelVideoProps {
  src?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  style?: React.CSSProperties;
}

const WheelVideo: React.FC<WheelVideoProps> = ({
  src = '/wheel.mp4',
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  style
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(false);
  const canvasRef = useCanvasChromaKey(videoRef, {
    threshold: 0.15,
    smoothing: 0.03
  });

  useEffect(() => {
    setUseFallback(!supportsVideoBlendModes());
  }, []);

  const commonProps = {
    autoPlay,
    loop,
    muted,
    playsInline,
    preload: 'auto' as const,
    'webkit-playsinline': playsInline,
  };

  if (useFallback) {
    return (
      <div className={`wheel-video-container wheel-video-safari ${className}`} style={style}>
        <video
          ref={videoRef}
          src={src}
          {...commonProps}
          className="wheel-video-hidden"
        />
        <canvas
          ref={canvasRef}
          className="wheel-video-canvas"
        />
      </div>
    );
  }

  return (
    <div className={`wheel-video-container wheel-video-modern ${className}`} style={style}>
      <video
        ref={videoRef}
        src={src}
        {...commonProps}
        className="wheel-video-blend"
      />
    </div>
  );
};

export default WheelVideo;