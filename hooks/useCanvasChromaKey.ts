import { useEffect, useRef, useCallback } from 'react';

interface ChromaKeyOptions {
  threshold?: number;
  smoothing?: number;
}

export const useCanvasChromaKey = (
  videoRef: React.RefObject<HTMLVideoElement>,
  options: ChromaKeyOptions = {}
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();
  
  const { threshold = 0.1, smoothing = 0.02 } = options;

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState < 2) {
      animationIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Process each pixel for chroma key (remove black/dark pixels)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // If pixel is dark (black background), make it transparent
      if (luminance < threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      } else {
        // Apply smoothing to edges
        const alpha = Math.min(1, Math.max(0, (luminance - threshold) / smoothing));
        data[i + 3] = Math.round(alpha * 255);
      }
    }

    // Put the processed image data back
    ctx.putImageData(imageData, 0, 0);

    // Continue animation
    animationIdRef.current = requestAnimationFrame(processFrame);
  }, [threshold, smoothing, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      processFrame();
    };

    const handlePause = () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
    };
  }, [processFrame, videoRef]);

  return canvasRef;
};