// Centralized audio control for Heartverse experience
// Manages welcome_to_the_heartverse.mp3, welcome_home.mp3, and space_music.mp3

class AudioHeartverseController {
  private welcomeToHeartvseAudio: HTMLAudioElement | null = null;
  private welcomeHomeAudio: HTMLAudioElement | null = null;
  private spaceMusicAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  // Audio URLs
  private readonly WELCOME_TO_HEARTVERSE_URL = "https://ik.imagekit.io/CHXNDLER/tracks/welcome-to-the-heartverse.mp3?updatedAt=1762392390137";
  private readonly WELCOME_HOME_URL = "https://ik.imagekit.io/CHXNDLER/tracks/welcome-home.mp3?updatedAt=1762392378623";
  private readonly SPACE_MUSIC_URL = "https://ik.imagekit.io/CHXNDLER/tracks/space-music.mp3?updatedAt=1762392378623";

  private initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Create audio elements
    this.welcomeToHeartvseAudio = new Audio(this.WELCOME_TO_HEARTVERSE_URL);
    this.welcomeToHeartvseAudio.preload = 'auto';
    this.welcomeToHeartvseAudio.volume = 0.7;

    this.welcomeHomeAudio = new Audio(this.WELCOME_HOME_URL);
    this.welcomeHomeAudio.preload = 'auto';
    this.welcomeHomeAudio.volume = 0.7;

    this.spaceMusicAudio = new Audio(this.SPACE_MUSIC_URL);
    this.spaceMusicAudio.preload = 'auto';
    this.spaceMusicAudio.volume = 0.5;
    this.spaceMusicAudio.loop = true;

    this.isInitialized = true;
  }

  // Stop all audio
  private stopAll() {
    this.initialize();
    
    [this.welcomeToHeartvseAudio, this.welcomeHomeAudio, this.spaceMusicAudio].forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }

  // For non-logged-in users clicking Start button
  playWelcomeToHeartverse() {
    this.initialize();
    this.stopAll(); // Stop any existing audio

    if (this.welcomeToHeartvseAudio) {
      this.welcomeToHeartvseAudio.currentTime = 0;
      this.welcomeToHeartvseAudio.play().catch(console.error);
    }
  }

  // For logged-in users after warp effect completes
  playWelcomeHomeAndSpaceMusic() {
    this.initialize();
    this.stopAll(); // Stop any existing audio

    // Play both tracks simultaneously
    if (this.welcomeHomeAudio && this.spaceMusicAudio) {
      // Start welcome home (plays once)
      this.welcomeHomeAudio.currentTime = 0;
      this.welcomeHomeAudio.play().catch(console.error);
      
      // Start space music (loops)
      this.spaceMusicAudio.currentTime = 0;
      this.spaceMusicAudio.play().catch(console.error);
    }
  }

  // Stop space music (if needed for other scenarios)
  stopSpaceMusic() {
    if (this.spaceMusicAudio && !this.spaceMusicAudio.paused) {
      this.spaceMusicAudio.pause();
    }
  }

  // Get current space music state for debugging
  getSpaceMusicState() {
    return {
      playing: this.spaceMusicAudio ? !this.spaceMusicAudio.paused : false,
      currentTime: this.spaceMusicAudio?.currentTime || 0,
      volume: this.spaceMusicAudio?.volume || 0
    };
  }
}

export const audioHeartverse = new AudioHeartverseController();