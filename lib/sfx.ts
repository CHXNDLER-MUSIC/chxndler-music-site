// Lightweight WebAudio SFX bus for near‑zero‑latency UI sounds
// Usage: import { sfx } from "@/lib/sfx"; sfx.play('hover', 0.35)
//
// Debug: set window.__DEBUG_SFX__ = true in console to see per-play logs.

declare global {
  interface Window {
    __DEBUG_SFX__?: boolean;
    __DEBUG_SFX_LIMIT__?: number;
  }
}

type BufferMap = Record<string, AudioBuffer | null>;

class SFXBus {
  private ctx: AudioContext | null = null;
  private buffers: BufferMap = {};
  private primed = false;
  private loading: Record<string, Promise<AudioBuffer> | undefined> = {};
  private enabled = false;
  private preloaded = false; // only preload once

  // Debug counters
  private _debugPlayCount: Record<string, number> = {};

  // Minimal preset map from keys to public audio assets
  private files: Record<string, string> = {
    hover: "/audio/hover.mp3",
    click: "/audio/click.mp3",
    close: "/audio/close.mp3",
    scroll: "/audio/scroll.mp3",
    volume: "/audio/scroll.mp3",
    join: "/audio/join-alien.mp3",
    "join-aliens": "/audio/join-alien.mp3",
    "join-alien": "/audio/join-alien.mp3",
    change: "/audio/change-channel.mp3",
    "change-channel": "/audio/change-channel.mp3",
    pause: "/audio/pause.mp3",
    launch: "/audio/launch.mp3",
    select: "/audio/song-select.mp3",
    warp: "/audio/warp.mp3",
    flip: "/audio/flip.mp3",
    button: "/audio/button.mp3",
    "coin-ding": "/audio/coin-ding.mp3",
    "card-ding": "/audio/card-ding.mp3",
    star: "/audio/star.mp3",
    "alien-wave": "/audio/alien-wave.MP3",
    "heart-pulse": "/audio/heart-pulse.MP3",
    "water-ripple": "/audio/water-ripple.MP3",
    "lightning-spark": "/audio/lightning-spark.MP3",
    "shadow-glow": "/audio/shadow-glow.MP3",
  };

  // --------------- AudioContext management ---------------

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      // @ts-ignore webkit prefix for iOS
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return (this.ctx = null);
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    // Preload common sounds exactly once (not every time ensure() is called)
    if (this.ctx && !this.preloaded) {
      this.preloaded = true;
      this.preload([
        "hover", "click", "close", "join", "select",
        "button", "warp", "scroll", "volume",
      ]).catch(() => {});
    }
    return this.ctx;
  }

  // --------------- Enable / disable ---------------

  setEnabled(v: boolean) {
    this.enabled = !!v;
    try { (window as any).__CHX_UI_UNLOCKED = this.enabled; } catch {}
    try {
      if (this.enabled) {
        const ctx = this.ensure();
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      }
    } catch {}
  }

  private isEnabled(): boolean {
    try {
      if (typeof window !== 'undefined' && (window as any).__CHX_UI_UNLOCKED === true) return true;
    } catch {}
    return this.enabled === true;
  }

  // --------------- iOS / Safari unlock ---------------

  attachUnlock() {
    if (this.primed) return;
    const unlock = () => {
      try {
        const ctx = this.ensure();
        if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch {}
      window.removeEventListener("pointerdown", unlock as any);
      window.removeEventListener("touchstart", unlock as any);
      window.removeEventListener("keydown", unlock as any);
      this.primed = true;
    };
    window.addEventListener("pointerdown", unlock, { once: true } as any);
    window.addEventListener("touchstart", unlock, { once: true, passive: true } as any);
    window.addEventListener("keydown", unlock as any, { once: true } as any);
  }

  /** Optional: call after first user gesture to eagerly decode all sounds. */
  prime() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    this.preload(Object.keys(this.files)).catch(() => {});
  }

  // --------------- Loading / caching ---------------

  async preload(keys: string[]) {
    const ctx = this.ensure();
    if (!ctx) return;
    await Promise.all(
      keys.map(async (k) => {
        if (this.buffers[k]) return;
        await this.load(k).catch(() => {});
      })
    );
  }

  private async load(key: string): Promise<AudioBuffer> {
    // Return from buffer cache
    if (this.buffers[key]) return this.buffers[key] as AudioBuffer;
    // De-duplicate concurrent fetches for the same key
    if (this.loading[key]) return this.loading[key] as Promise<AudioBuffer>;

    const url = this.files[key] || key;
    this._debugLog(`FETCH key="${key}" url="${url}" stack:\n${new Error().stack || ''}`);

    const ctx = this.ensure();
    if (!ctx) throw new Error("No AudioContext");

    const p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((ab) => {
        this.buffers[key] = ab;
        delete this.loading[key];
        return ab;
      })
      .catch((e) => {
        delete this.loading[key];
        throw e;
      });

    this.loading[key] = p;
    return p;
  }

  // --------------- Playback ---------------

  async play(key: string, volume = 1.0) {
    if (!this.isEnabled()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

      const cached = !!this.buffers[key];
      const buf = this.buffers[key] || (await this.load(key));
      if (!buf) return;

      this._debugPlayCount[key] = (this._debugPlayCount[key] || 0) + 1;
      this._debugPlayLog(key, cached, 'PLAY');

      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      src.buffer = buf;
      src.connect(gain).connect(ctx.destination);
      src.start(0);
    } catch {}
  }

  async playAndWait(key: string, volume = 1.0): Promise<void> {
    if (!this.isEnabled()) return;
    const ctx = this.ensure();
    try { if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => {}); } catch {}
    try {
      if (!ctx) { await new Promise((r) => setTimeout(r, 1000)); return; }

      const cached = !!this.buffers[key];
      const buf = this.buffers[key] || (await this.load(key));
      if (!buf) { await new Promise((r) => setTimeout(r, 1000)); return; }

      this._debugPlayCount[key] = (this._debugPlayCount[key] || 0) + 1;
      this._debugPlayLog(key, cached, 'PLAY_WAIT');

      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      src.buffer = buf;
      src.connect(gain).connect(ctx.destination);
      return await new Promise<void>((resolve) => {
        try {
          src.onended = () => resolve();
          src.start(0);
        } catch {
          setTimeout(resolve, Math.max(200, Math.floor((buf.duration || 1) * 1000)));
        }
      });
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // --------------- Debug ---------------

  private _debugLog(msg: string) {
    try {
      if (typeof window !== 'undefined' && window.__DEBUG_SFX__) {
        console.debug(`[SFX] ${msg}`);
      }
    } catch {}
  }

  /** Enhanced debug: logs key, timestamp, cached status, and stack trace.
   *  Respects window.__DEBUG_SFX_LIMIT__ (max logs per key). */
  private _debugPlayLog(key: string, cached: boolean, method: string) {
    try {
      if (typeof window === 'undefined' || !window.__DEBUG_SFX__) return;
      const count = this._debugPlayCount[key] || 0;
      const limit = window.__DEBUG_SFX_LIMIT__;
      if (typeof limit === 'number' && count > limit) return;
      const ts = new Date().toISOString();
      const stack = new Error().stack || '(no stack)';
      // Strip the Error + _debugPlayLog + play/playAndWait frames (first 3 lines)
      const trimmedStack = stack.split('\n').slice(3).join('\n');
      console.debug(
        `[SFX] ${method} key="${key}" ts=${ts} cached=${cached} #${count}\n${trimmedStack}`
      );
      if (typeof limit === 'number' && count === limit) {
        console.debug(`[SFX] key="${key}" hit __DEBUG_SFX_LIMIT__=${limit}, suppressing further logs`);
      }
    } catch {}
  }
}

export const sfx = new SFXBus();
if (typeof window !== "undefined") {
  try { sfx.attachUnlock(); } catch {}
}
