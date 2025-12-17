'use client';

import { useState, useEffect } from 'react';
import type { SongWithElement } from '@/hooks/useSongs';

interface Pure3DSystemProps {
  songs: SongWithElement[];
  songsByElement: Record<string, SongWithElement[]>;
  zoomLevel: number;
  onPlanetSelect?: (planetId: string) => void;
  quality: 'low' | 'high';
  showStats?: boolean;
}

export default function Pure3DSystem(props: Pure3DSystemProps) {
  const [ThreeComponent, setThreeComponent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Add timeout to automatically fall back to 2D after 3 seconds
    const fallbackTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('3D system taking too long to load, falling back to 2D');
        setHasError(true);
        setIsLoading(false);
      }
    }, 3000);

    const loadThreeJS = async () => {
      try {
        // Wait a bit to ensure we're fully client-side
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mounted) return;

        // Dynamically import only on client side
        const { SolarSystemCanvas } = await import('./SolarSystemCanvas');
        
        if (mounted) {
          clearTimeout(fallbackTimeout);
          setThreeComponent(() => SolarSystemCanvas);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load 3D system:', error);
        if (mounted) {
          clearTimeout(fallbackTimeout);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadThreeJS();

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          Loading 3D Engine...
        </div>
      </div>
    );
  }

  if (hasError || !ThreeComponent) {
    // Signal parent component to switch to 2D
    React.useEffect(() => {
      const fallbackElement = document.getElementById('fallback-2d');
      if (fallbackElement) {
        fallbackElement.style.opacity = '1';
        fallbackElement.style.zIndex = '10';
      }
      
      // Hide the error message after a brief delay
      const hideError = setTimeout(() => {
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
          errorElement.style.display = 'none';
        }
      }, 1000);
      
      return () => clearTimeout(hideError);
    }, []);
    
    return (
      <div className="error-message w-full h-full bg-red-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">⚠️</div>
          <div>Failed to load 3D system</div>
          <div className="text-sm text-red-300">Falling back to 2D view</div>
        </div>
      </div>
    );
  }

  return <ThreeComponent {...props} />;
}