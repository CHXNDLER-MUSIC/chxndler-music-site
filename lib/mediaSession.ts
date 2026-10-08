/**
 * Media Session (lock screen / Control Center / desktop media keys) for an
 * <audio> element — the one shared implementation for both the main site
 * (AudioProvider) and the brand pages (BrandAudioProvider).
 *
 * Whichever bound element most recently started playing owns the session;
 * events from any other element are ignored, so two providers can never
 * clear or overwrite each other's "now playing". Play/pause/seek act on the
 * element itself, which every provider already mirrors into its own state
 * through the element's play/pause/timeupdate events — so the lock screen
 * behaves exactly like the in-page controls.
 *
 * Next/previous track are deliberately left disabled for now.
 */

export type NowPlaying = {
  title: string;
  artist: string;
  album?: string;
  /** Any URL — relative paths and spaces are resolved/encoded here. */
  artwork?: string | null;
};

export type MediaSessionBinding = {
  /** Re-reads the current NowPlaying (e.g. after a title loads) if this element owns the session. */
  refresh: () => void;
  dispose: () => void;
};

const SEEK_STEP_SECONDS = 10;
const NOOP_BINDING: MediaSessionBinding = { refresh: () => {}, dispose: () => {} };

let owner: HTMLAudioElement | null = null;

function supported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator && typeof window !== "undefined";
}

function setHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Action not supported by this browser (e.g. "seekto" on older Safari).
  }
}

function artworkFor(url: string | null | undefined): MediaImage[] {
  if (!url) return [];
  let src: string;
  try {
    src = new URL(url, window.location.href).href;
  } catch {
    return [];
  }
  const ext = src.split("?")[0].split(".").pop()?.toLowerCase();
  const type =
    ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : undefined;
  // One entry is enough — the OS scales it. The size hint just lets it pick.
  return [{ src, sizes: "512x512", ...(type ? { type } : {}) }];
}

export function bindMediaSession(audio: HTMLAudioElement, getNowPlaying: () => NowPlaying | null): MediaSessionBinding {
  if (!supported()) return NOOP_BINDING;
  const session = navigator.mediaSession;

  const updatePosition = () => {
    if (owner !== audio || typeof session.setPositionState !== "function") return;
    const duration = audio.duration;
    if (!isFinite(duration) || duration <= 0) return;
    try {
      session.setPositionState({
        duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(0, audio.currentTime), duration),
      });
    } catch {}
  };

  const applyMetadata = () => {
    const info = getNowPlaying();
    try {
      session.metadata = info
        ? new MediaMetadata({
            title: info.title,
            artist: info.artist,
            album: info.album ?? "",
            artwork: artworkFor(info.artwork),
          })
        : null;
    } catch {}
  };

  const seekTo = (time: number) => {
    const duration = isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.max(0, Math.min(time, duration));
    updatePosition();
  };

  const claim = () => {
    owner = audio;
    applyMetadata();
    setHandler("play", () => void audio.play().catch(() => {}));
    setHandler("pause", () => audio.pause());
    setHandler("stop", () => audio.pause());
    setHandler("seekto", (details) => {
      if (details.seekTime == null) return;
      if (details.fastSeek && typeof audio.fastSeek === "function") {
        audio.fastSeek(details.seekTime);
        updatePosition();
      } else {
        seekTo(details.seekTime);
      }
    });
    setHandler("seekbackward", (details) => seekTo(audio.currentTime - (details.seekOffset || SEEK_STEP_SECONDS)));
    setHandler("seekforward", (details) => seekTo(audio.currentTime + (details.seekOffset || SEEK_STEP_SECONDS)));
    setHandler("previoustrack", null);
    setHandler("nexttrack", null);
    session.playbackState = "playing";
    updatePosition();
  };

  const onPause = () => {
    if (owner !== audio) return;
    session.playbackState = "paused";
    updatePosition();
  };

  audio.addEventListener("play", claim);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("ended", onPause);
  // Position is extrapolated by the OS between updates; only discontinuities need a push.
  audio.addEventListener("loadedmetadata", updatePosition);
  audio.addEventListener("durationchange", updatePosition);
  audio.addEventListener("seeked", updatePosition);
  audio.addEventListener("ratechange", updatePosition);

  return {
    refresh: () => {
      if (owner !== audio) return;
      applyMetadata();
      updatePosition();
    },
    dispose: () => {
      audio.removeEventListener("play", claim);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("loadedmetadata", updatePosition);
      audio.removeEventListener("durationchange", updatePosition);
      audio.removeEventListener("seeked", updatePosition);
      audio.removeEventListener("ratechange", updatePosition);
      if (owner === audio) {
        owner = null;
        try {
          session.metadata = null;
          session.playbackState = "none";
        } catch {}
      }
    },
  };
}
