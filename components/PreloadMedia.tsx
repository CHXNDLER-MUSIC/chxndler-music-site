"use client";
import React from "react";
import { tracks } from "@/lib/songs-consolidated";
import { skyFor, introSky } from "@/lib/sky";

type Props = {
  // Limit concurrent fetches to avoid network spikes
  maxImage?: number;
  maxAudio?: number;
  maxVideo?: number;
  // Limit how many items to preload (0 = all)
  limitTracks?: number;
};

/**
 * Preloads cover images and primes the first ~5s of each audio track and sky video
 * to make transitions feel instant. Runs only on client; renders nothing.
 */
export default function PreloadMedia({ maxImage = 6, maxAudio = 3, maxVideo = 2, limitTracks = 0 }: Props) {
  React.useEffect(() => {
    let cancelled = false;
    const aborts: Array<() => void> = [];

    function take<T>(arr: T[], n: number): T[] { return n > 0 ? arr.slice(0, n) : arr; }

    // Build datasets
    const tlist = take(tracks, limitTracks || tracks.length);
    const images = tlist.map(t => t.cover).filter(Boolean) as string[];
    const audios = tlist.map(t => t.src).filter(Boolean) as string[];
    const skySet = new Set<string>();
    tlist.forEach(t => { const s = skyFor(t.slug); if (s?.mp4) skySet.add(s.mp4); });
    // Always include intro + default space
    if (introSky?.mp4) skySet.add(introSky.mp4);
    skySet.add("/skies/space.mp4");
    const videos = Array.from(skySet);

    // Simple concurrency helper
    async function runQueue<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number) {
      const q = items.slice();
      const workers: Promise<void>[] = [];
      const doOne = async () => {
        while (!cancelled && q.length) {
          const it = q.shift() as T;
          try { await worker(it); } catch { /* ignore */ }
        }
      };
      for (let i = 0; i < Math.max(1, concurrency); i++) workers.push(doOne());
      await Promise.all(workers);
    }

    // Image preloader (does not hold UI thread)
    const preloadImage = (src: string) => new Promise<void>((resolve) => {
      if (cancelled) return resolve();
      const img = new Image();
      const done = () => resolve();
      img.onload = done; img.onerror = done; img.onabort = done;
      img.decoding = "async" as any;
      img.src = src;
      aborts.push(() => { try { img.onload = img.onerror = img.onabort = null; } catch {} });
    });

    // Audio preloader: seek to ~5s to prime range request, then reset to 0
    const preloadAudio = (src: string) => new Promise<void>((resolve) => {
      if (cancelled) return resolve();
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.crossOrigin = '';
      audio.src = src;
      let done = false;
      const cleanup = () => {
        if (done) return; done = true;
        try { audio.src = ''; } catch {}
        resolve();
      };
      const onMeta = () => {
        try {
          const target = isFinite(audio.duration) && audio.duration > 6 ? 5 : Math.max(0, (audio.duration || 6) - 0.5);
          const onSeeked = () => {
            // Reset back to 0 to avoid audible pop later
            try { audio.currentTime = 0; } catch {}
            audio.removeEventListener('seeked', onSeeked);
            cleanup();
          };
          audio.addEventListener('seeked', onSeeked);
          // Force a range request up to ~5s
          try { audio.currentTime = target; } catch { cleanup(); }
        } catch { cleanup(); }
      };
      audio.addEventListener('loadedmetadata', onMeta);
      audio.addEventListener('error', cleanup as any);
      aborts.push(() => {
        try { audio.removeEventListener('loadedmetadata', onMeta); } catch {}
        try { audio.removeEventListener('error', cleanup as any); } catch {}
        cleanup();
      });
      // Kick off load
      try { audio.load(); } catch {}
    });

    // Video preloader: metadata → seek ~5s to prime; no playback
    const preloadVideo = (src: string) => new Promise<void>((resolve) => {
      if (cancelled) return resolve();
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      // @ts-ignore
      video.playsInline = true;
      video.crossOrigin = '';
      video.src = src;
      let done = false;
      const cleanup = () => { if (done) return; done = true; try { video.src = ''; } catch {}; resolve(); };
      const onMeta = () => {
        try {
          const target = isFinite(video.duration) && video.duration > 6 ? 5 : Math.max(0, (video.duration || 6) - 0.5);
          const onSeeked = () => { video.removeEventListener('seeked', onSeeked); cleanup(); };
          video.addEventListener('seeked', onSeeked);
          try { video.currentTime = target; } catch { cleanup(); }
        } catch { cleanup(); }
      };
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('error', cleanup as any);
      aborts.push(() => {
        try { video.removeEventListener('loadedmetadata', onMeta); } catch {}
        try { video.removeEventListener('error', cleanup as any); } catch {}
        cleanup();
      });
      try { video.load(); } catch {}
    });

    // Fire queues with modest concurrency caps
    runQueue(take(images, images.length), preloadImage, Math.max(1, maxImage)).catch(()=>{});
    runQueue(take(audios, audios.length), preloadAudio, Math.max(1, maxAudio)).catch(()=>{});
    runQueue(take(videos, videos.length), preloadVideo, Math.max(1, maxVideo)).catch(()=>{});

    return () => { cancelled = true; aborts.forEach(fn => { try { fn(); } catch {} }); };
  }, [maxImage, maxAudio, maxVideo, limitTracks]);

  return null;
}

