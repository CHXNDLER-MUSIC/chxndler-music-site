// Global audio coordination system for the Heartbverse
// Ensures only one audio source plays at a time

type AudioSource = 'main' | 'ambient' | 'intro' | 'sfx';

class AudioCoordinator {
  private currentSource: AudioSource | null = null;
  private listeners: Set<(source: AudioSource | null) => void> = new Set();

  setActiveSource(source: AudioSource | null) {
    // Don't interfere if unified audio system is active
    if (typeof window !== 'undefined' && (window as any).__UNIFIED_AUDIO_ACTIVE) {
      return;
    }
    
    if (this.currentSource === source) return;
    
    // Stop all other audio sources when switching
    if (source !== 'main') {
      this.stopMainAudio();
    }
    
    // Allow intro and ambient to coexist - don't stop one when the other starts
    if (source === 'main' || source === 'sfx') {
      // Only stop ambient/intro when main music or SFX takes over
      this.stopAmbientAudio();
      this.stopIntroAudio();
    }
    
    this.currentSource = source;
    this.notifyListeners();
  }

  getCurrentSource(): AudioSource | null {
    return this.currentSource;
  }

  isSourceActive(source: AudioSource): boolean {
    return this.currentSource === source;
  }

  onSourceChange(callback: (source: AudioSource | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentSource));
  }

  private stopMainAudio() {
    try {
      const mainAudio = document.querySelector('audio[data-audio-player="1"]') as HTMLAudioElement;
      if (mainAudio) {
        mainAudio.pause();
        // Don't reset currentTime for main audio to preserve position
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn('🎵 AudioCoordinator: Error stopping main audio:', e);
    }
  }

  private stopAmbientAudio() {
    try {
      const ambientAudio = document.querySelector('audio[data-ambient="1"]') as HTMLAudioElement;
      if (ambientAudio && this.currentSource !== 'ambient') {
        // Only stop ambient if we're switching to a different source
        // Use a gentler fade-out instead of immediate pause to prevent cutting out
        const fadeOut = () => {
          if (ambientAudio.volume > 0.1) {
            ambientAudio.volume = Math.max(0, ambientAudio.volume - 0.1);
            setTimeout(fadeOut, 50);
          } else {
            ambientAudio.volume = 0;
            ambientAudio.pause();
          }
        };
        fadeOut();
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn('🎵 AudioCoordinator: Error stopping ambient audio:', e);
    }
  }

  private stopIntroAudio() {
    try {
      const introAudio = document.querySelector('audio[data-intro="1"]') as HTMLAudioElement;
      if (introAudio) {
        introAudio.pause();
        introAudio.currentTime = 0;
        introAudio.volume = 0;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn('🎵 AudioCoordinator: Error stopping intro audio:', e);
    }
  }

  private forceStopAmbientAudio() {
    try {
      const ambientAudio = document.querySelector('audio[data-ambient="1"]') as HTMLAudioElement;
      if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio.currentTime = 0;
        ambientAudio.volume = 0;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn('🎵 AudioCoordinator: Error force stopping ambient audio:', e);
    }
  }

  // Force stop all audio
  stopAll() {
    this.stopMainAudio();
    this.forceStopAmbientAudio();
    this.stopIntroAudio();
    this.currentSource = null;
    this.notifyListeners();
  }

  // Debug helper
  getAudioStatus() {
    const main = document.querySelector('audio[data-audio-player="1"]') as HTMLAudioElement;
    const ambient = document.querySelector('audio[data-ambient="1"]') as HTMLAudioElement;
    const intro = document.querySelector('audio[data-intro="1"]') as HTMLAudioElement;

    return {
      currentSource: this.currentSource,
      main: main ? {
        paused: main.paused,
        currentTime: main.currentTime,
        volume: main.volume,
        src: main.src
      } : null,
      ambient: ambient ? {
        paused: ambient.paused,
        currentTime: ambient.currentTime,
        volume: ambient.volume,
        src: ambient.src
      } : null,
      intro: intro ? {
        paused: intro.paused,
        currentTime: intro.currentTime,
        volume: intro.volume,
        src: intro.src
      } : null
    };
  }
}

// Global singleton instance
export const audioCoordinator = new AudioCoordinator();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).audioCoordinator = audioCoordinator;
  (window as any).getAudioStatus = () => audioCoordinator.getAudioStatus();
}
