// Lightweight WebAudio SFX bus for near‑zero‑latency UI sounds
// Usage: import { sfx } from "@/lib/sfx"; sfx.play('hover', 0.35)

type BufferMap = Record<string, AudioBuffer | null>;

class SFXBus {
  private ctx: AudioContext | null = null;
  private buffers: BufferMap = {};
  private primed = false;
  private loading: Record<string, Promise<AudioBuffer> | undefined> = {};

  // Minimal preset map from keys to public audio assets
  private files: Record<string, string> = {
    hover: "/audio/hover.mp3",
    click: "/audio/click.mp3",
    join: "/audio/join-alien.mp3",
    change: "/audio/change-channel.mp3",
    pause: "/audio/pause.mp3",
    launch: "/audio/launch.mp3",
    select: "/audio/song-select.mp3",
  };

  private ensure() {
    if (this.ctx) return this.ctx;
    try {
      // @ts-ignore webkit prefix for iOS
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return (this.ctx = null);
      this.ctx = new Ctor();
      // Pre-decode a few common sounds in background
      this.preload(["hover", "click", "join", "select"]).catch(() => {});
    } catch {
      this.ctx = null;
    }
    return this.ctx;
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
}

export const sfx = new SFXBus();
// Attach unlock handlers immediately on module import
if (typeof window !== "undefined") {
  try { sfx.attachUnlock(); } catch {}
}

