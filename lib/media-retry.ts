// Media retry utilities with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffFactor: 2,
  onRetry: () => {},
};

/**
 * Retry audio/video element play with exponential backoff
 */
export const retryMediaPlay = async (
  element: HTMLAudioElement | HTMLVideoElement,
  options: RetryOptions = {}
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      await element.play();
      return; // Success - exit retry loop
    } catch (error) {
      const isLastAttempt = attempt === opts.maxRetries - 1;
      
      if (isLastAttempt) {
        throw error; // Re-throw the final error
      }
      
      // Call retry callback
      opts.onRetry(attempt + 1, error);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Retry audio/video element load with exponential backoff
 */
export const retryMediaLoad = async (
  element: HTMLAudioElement | HTMLVideoElement,
  src: string,
  options: RetryOptions = {}
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      // Set source and load
      element.src = src;
      element.load();
      
      // Wait for canplaythrough event
      await new Promise<void>((resolve, reject) => {
        const onCanPlayThrough = () => {
          cleanup();
          resolve();
        };
        
        const onError = (event: Event) => {
          cleanup();
          reject(new Error(`Media load failed: ${element.error?.message || 'Unknown error'}`));
        };
        
        const cleanup = () => {
          element.removeEventListener('canplaythrough', onCanPlayThrough);
          element.removeEventListener('error', onError);
        };
        
        element.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
        element.addEventListener('error', onError, { once: true });
      });
      
      return; // Success
    } catch (error) {
      const isLastAttempt = attempt === opts.maxRetries - 1;
      
      if (isLastAttempt) {
        throw error;
      }
      
      opts.onRetry(attempt + 1, error);
      
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Combined retry for load + play operations
 */
export const retryMediaLoadAndPlay = async (
  element: HTMLAudioElement | HTMLVideoElement,
  src: string,
  options: RetryOptions = {}
): Promise<void> => {
  await retryMediaLoad(element, src, options);
  await retryMediaPlay(element, options);
};

/**
 * Enhanced audio loading utility with better error handling
 */
export const ensureAudioLoaded = async (
  element: HTMLAudioElement,
  src: string,
  options: RetryOptions = {}
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // First ensure the source is set correctly
  if (element.src !== src) {
    element.src = src;
  }
  
  // Check if already loaded
  if (element.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
    return;
  }
  
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      
      // Trigger load
      element.load();
      
      // Wait for sufficient data
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Audio load timeout'));
        }, 10000); // 10 second timeout
        
        const onCanPlay = () => {
          cleanup();
          resolve();
        };
        
        const onError = () => {
          console.error('🔴 Audio load error:', element.error);
          cleanup();
          reject(new Error(`Audio load failed: ${element.error?.message || 'Unknown error'}`));
        };
        
        const cleanup = () => {
          clearTimeout(timeout);
          element.removeEventListener('canplay', onCanPlay);
          element.removeEventListener('error', onError);
        };
        
        // Check if already ready
        if (element.readyState >= 3) {
          cleanup();
          resolve();
          return;
        }
        
        element.addEventListener('canplay', onCanPlay, { once: true });
        element.addEventListener('error', onError, { once: true });
      });
      return;
    } catch (error) {
      const isLastAttempt = attempt === opts.maxRetries - 1;
      console.error(`🔴 Audio load attempt ${attempt + 1} failed:`, error);
      
      if (isLastAttempt) {
        throw error;
      }
      
      opts.onRetry(attempt + 1, error);
      
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Utility to handle autoplay restrictions with fallback to muted play
 */
export const playWithAutoplayFallback = async (
  element: HTMLAudioElement | HTMLVideoElement,
  options: RetryOptions = {}
): Promise<{ muted: boolean }> => {
  // Ensure audio is loaded first for HTMLAudioElement
  if (element instanceof HTMLAudioElement && element.src) {
    try {
      await ensureAudioLoaded(element, element.src, options);
    } catch (loadError) {
      console.error('🔴 Failed to load audio before play:', loadError);
      throw loadError;
    }
  }
  
  try {
    // Try normal play first
    await retryMediaPlay(element, options);
    return { muted: false };
  } catch (error) {
    
    
    // Fallback to muted play for autoplay restrictions
    const originalMuted = element.muted;
    const originalVolume = element.volume;
    
    try {
      element.muted = true;
      element.volume = 0;
      await retryMediaPlay(element, options);
      
      
      // Gradually unmute after successful muted play
      setTimeout(() => {
        try {
          element.muted = originalMuted;
          element.volume = originalVolume;
        } catch {
          console.warn('🔴 Failed to unmute audio');
        }
      }, 100);
      
      return { muted: true };
    } catch (mutedError) {
      console.error('🔴 Muted play also failed:', mutedError);
      // Restore original state
      element.muted = originalMuted;
      element.volume = originalVolume;
      throw mutedError;
    }
  }
};
