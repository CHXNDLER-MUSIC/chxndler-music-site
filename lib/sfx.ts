// Lightweight WebAudio SFX bus for near‑zero‑latency UI sounds
// Usage: import { sfx } from "@/lib/sfx"; sfx.play('hover', 0.35)

type BufferMap = Record<string, AudioBuffer | null>;

class SFXBus {
  private ctx: AudioContext | null = null;
  private buffers: BufferMap = {};
  private primed = false;
  private loading: Record<string, Promise<AudioBuffer> | undefined> = {};
  // Gate SFX until Start button unlocks the UI
  private enabled = false;

  // Minimal preset map from keys to public audio assets
  private files: Record<string, string> = {
    hover: "/audio/hover.mp3",
    click: "/audio/click.mp3",
    join: "/audio/join-alien.mp3",
    "join-aliens": "/audio/join-alien.mp3", // alias for convenience
    "join-alien": "/audio/join-alien.mp3",
    change: "/audio/change-channel.mp3",
    pause: "/audio/pause.mp3",
    launch: "/audio/launch.mp3",
    select: "/audio/song-select.mp3",
    warp: "/audio/warp.mp3",
    flip: "/audio/flip.mp3",
    button: "/audio/button.mp3",
  };

  private ensure() {
    if (this.ctx) return this.ctx;
    try {
      // @ts-ignore webkit prefix for iOS
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return (this.ctx = null);
      this.ctx = new Ctor();
      // Pre-decode common sounds in background (add warp/button for start flow)
      this.preload(["hover", "click", "join", "select", "button", "warp"]).catch(() => {});
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  // External toggle so app can enable sounds after Start is clicked
  setEnabled(v: boolean) {
    this.enabled = !!v;
    try { (window as any).__CHX_UI_UNLOCKED = this.enabled; } catch {}
    // Best-effort: create/resume AudioContext immediately on enable within the user gesture
    try {
      if (this.enabled) {
        const ctx = this.ensure();
        if (ctx && ctx.state === 'suspended') {
          // Resume asynchronously but without waiting
          ctx.resume().catch(() => {});
        }
      }
    } catch {}
  }
  private isEnabled(): boolean {
    try {
      // Allow enabling via global flag as a secondary path
      if (typeof window !== 'undefined' && (window as any).__CHX_UI_UNLOCKED === true) return true;
    } catch {}
    return this.enabled === true;
  }

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
    window.addEventListener("touchstart", unlock, { once: true } as any);
    window.addEventListener("keydown", unlock as any, { once: true } as any);
  }

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
    if (this.buffers[key]) return this.buffers[key] as AudioBuffer;
    if (this.loading[key]) return this.loading[key] as Promise<AudioBuffer>;
    const url = this.files[key] || key; // allow direct URL
    const ctx = this.ensure();
    if (!ctx) throw new Error("No AudioContext");
    const p = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((ab) => {
        this.buffers[key] = ab;
        this.loading[key] = undefined;
        return ab;
      })
      .catch((e) => {
        this.loading[key] = undefined;
        throw e;
      });
    this.loading[key] = p;
    return p;
  }

  async play(key: string, volume = 1.0) {
    if (!this.isEnabled()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const buf = this.buffers[key] || (await this.load(key));
      if (!buf) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      src.buffer = buf;
      src.connect(gain).connect(ctx.destination);
      src.start(0);
    } catch {}
  }

  // Play SFX and return a promise that resolves when it ends.
  // Falls back to a timeout based on buffer duration (or 1000ms if unavailable).
  async playAndWait(key: string, volume = 1.0): Promise<void> {
    if (!this.isEnabled()) return Promise.resolve();
    const ctx = this.ensure();
    try { if (ctx && ctx.state === 'suspended') await ctx.resume().catch(()=>{}); } catch {}
    try {
      if (!ctx) { // No AudioContext; best effort delay
        await new Promise((r) => setTimeout(r, 1000));
        return;
      }
      const buf = this.buffers[key] || (await this.load(key));
      if (!buf) { await new Promise((r) => setTimeout(r, 1000)); return; }
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
}

export const sfx = new SFXBus();
// Attach unlock handlers immediately on module import
if (typeof window !== "undefined") {
  try { sfx.attachUnlock(); } catch {}
}
