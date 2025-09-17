// Media state machine for coordinated audio/video playback

export type MediaState = 
  | 'idle'
  | 'loading'
  | 'warping'
  | 'playing'
  | 'paused'
  | 'error'
  | 'transitioning';

export type MediaEvent = 
  | { type: 'LOAD_SONG'; payload: { slug: string; src: string } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'WARP_START' }
  | { type: 'WARP_END' }
  | { type: 'AUDIO_READY' }
  | { type: 'VIDEO_READY' }
  | { type: 'ERROR'; payload: { error: Error } }
  | { type: 'RESET' };

export interface MediaContext {
  currentSlug: string | null;
  audioSrc: string | null;
  videoSrc: { webm?: string; mp4?: string; key?: string } | null;
  audioReady: boolean;
  videoReady: boolean;
  isPlaying: boolean;
  error: Error | null;
  warpActive: boolean;
  retryCount: number;
}

export type MediaStateTransition = {
  target: MediaState;
  action?: (context: MediaContext, event: MediaEvent) => Partial<MediaContext>;
};

const MAX_RETRIES = 3;

// State machine definition
const stateMachine: Record<MediaState, Partial<Record<MediaEvent['type'], MediaStateTransition>>> = {
  idle: {
    LOAD_SONG: {
      target: 'loading',
      action: (context, event) => ({
        currentSlug: event.type === 'LOAD_SONG' ? event.payload.slug : context.currentSlug,
        audioSrc: event.type === 'LOAD_SONG' ? event.payload.src : context.audioSrc,
        audioReady: false,
        videoReady: false,
        error: null,
        retryCount: 0,
      }),
    },
  },
  
  loading: {
    AUDIO_READY: {
      target: 'loading',
      action: (context) => ({ audioReady: true }),
    },
    VIDEO_READY: {
      target: 'loading',
      action: (context) => ({ videoReady: true }),
    },
    WARP_START: {
      target: 'warping',
      action: (context) => ({ warpActive: true }),
    },
    PLAY: {
      target: 'loading', // Stay in loading until both are ready
    },
    ERROR: {
      target: 'error',
      action: (context, event) => ({
        error: event.type === 'ERROR' ? event.payload.error : null,
        retryCount: context.retryCount + 1,
      }),
    },
  },
  
  warping: {
    WARP_END: {
      target: 'transitioning',
      action: (context) => ({ warpActive: false }),
    },
    ERROR: {
      target: 'error',
      action: (context, event) => ({ error: event.type === 'ERROR' ? event.payload.error : null }),
    },
  },
  
  transitioning: {
    PLAY: {
      target: 'playing',
      action: (context) => ({ isPlaying: true }),
    },
    AUDIO_READY: {
      target: 'transitioning',
      action: (context) => ({ audioReady: true }),
    },
    VIDEO_READY: {
      target: 'transitioning',
      action: (context) => ({ videoReady: true }),
    },
  },
  
  playing: {
    PAUSE: {
      target: 'paused',
      action: (context) => ({ isPlaying: false }),
    },
    WARP_START: {
      target: 'warping',
      action: (context) => ({ warpActive: true, isPlaying: false }),
    },
    LOAD_SONG: {
      target: 'loading',
      action: (context, event) => ({
        currentSlug: event.type === 'LOAD_SONG' ? event.payload.slug : context.currentSlug,
        audioSrc: event.type === 'LOAD_SONG' ? event.payload.src : context.audioSrc,
        audioReady: false,
        videoReady: false,
        isPlaying: false,
        error: null,
        retryCount: 0,
      }),
    },
    ERROR: {
      target: 'error',
      action: (context, event) => ({
        error: event.type === 'ERROR' ? event.payload.error : null,
        isPlaying: false,
      }),
    },
  },
  
  paused: {
    PLAY: {
      target: 'playing',
      action: (context) => ({ isPlaying: true }),
    },
    WARP_START: {
      target: 'warping',
      action: (context) => ({ warpActive: true }),
    },
    LOAD_SONG: {
      target: 'loading',
      action: (context, event) => ({
        currentSlug: event.type === 'LOAD_SONG' ? event.payload.slug : context.currentSlug,
        audioSrc: event.type === 'LOAD_SONG' ? event.payload.src : context.audioSrc,
        audioReady: false,
        videoReady: false,
        error: null,
        retryCount: 0,
      }),
    },
  },
  
  error: {
    RESET: {
      target: 'idle',
      action: () => ({
        currentSlug: null,
        audioSrc: null,
        videoSrc: null,
        audioReady: false,
        videoReady: false,
        isPlaying: false,
        error: null,
        warpActive: false,
        retryCount: 0,
      }),
    },
    LOAD_SONG: {
      target: 'loading',
      action: (context, event) => {
        // Allow retry if under limit
        if (context.retryCount < MAX_RETRIES && event.type === 'LOAD_SONG') {
          return {
            currentSlug: event.payload.slug,
            audioSrc: event.payload.src,
            audioReady: false,
            videoReady: false,
            error: null,
          };
        }
        return {}; // Stay in error state
      },
    },
  },
};

export class MediaStateMachine {
  private state: MediaState = 'idle';
  private context: MediaContext = {
    currentSlug: null,
    audioSrc: null,
    videoSrc: null,
    audioReady: false,
    videoReady: false,
    isPlaying: false,
    error: null,
    warpActive: false,
    retryCount: 0,
  };
  
  private listeners: Array<(state: MediaState, context: MediaContext) => void> = [];
  
  constructor(initialContext?: Partial<MediaContext>) {
    if (initialContext) {
      this.context = { ...this.context, ...initialContext };
    }
  }
  
  getState(): MediaState {
    return this.state;
  }
  
  getContext(): Readonly<MediaContext> {
    return { ...this.context };
  }
  
  send(event: MediaEvent): void {
    const currentStateConfig = stateMachine[this.state];
    const transition = currentStateConfig?.[event.type];
    
    if (!transition) {
      // No transition defined for this event in current state
      return;
    }
    
    // Update context if action is defined
    if (transition.action) {
      const contextUpdates = transition.action(this.context, event);
      this.context = { ...this.context, ...contextUpdates };
    }
    
    // Transition to new state
    this.state = transition.target;
    
    // Notify listeners
    this.notifyListeners();
  }
  
  // Convenience methods for common state checks
  canPlay(): boolean {
    return this.context.audioReady && this.context.videoReady && !this.context.warpActive;
  }
  
  shouldStartWarp(): boolean {
    return this.state === 'loading' && this.context.audioReady && this.context.videoReady;
  }
  
  shouldAutoPlay(): boolean {
    return this.state === 'transitioning' && this.canPlay();
  }
  
  isLoading(): boolean {
    return this.state === 'loading';
  }
  
  isErrored(): boolean {
    return this.state === 'error';
  }
  
  canRetry(): boolean {
    return this.state === 'error' && this.context.retryCount < MAX_RETRIES;
  }
  
  // Event subscription
  onStateChange(listener: (state: MediaState, context: MediaContext) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.context);
      } catch (error) {
        console.error('Media state machine listener error:', error);
      }
    });
  }
}