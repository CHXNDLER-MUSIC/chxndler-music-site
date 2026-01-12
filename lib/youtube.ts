export function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // Short links: https://youtu.be/VIDEOID
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Standard and variants
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith('/live/')) {
        const id = u.pathname.split('/')[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }
  } catch {}
  return null;
}

// Optional: pick a reasonable compact height for inline popouts
export function youTubeEmbedHeight(): number {
  // A compact 16:9 area within the modal body; shell adds ~48px header
  return 220; // keep small to match compact feel; modal can scroll if needed
}

// Extract a YouTube video ID from common URL forms
export function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id || null;
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        return id || null;
      }
      if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/') || u.pathname.startsWith('/live/')) {
        const seg = u.pathname.split('/')[2];
        return seg || null;
      }
    }
    // If already an embed URL
    if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && url.includes('/embed/')) {
      const id = url.split('/embed/')[1]?.split(/[?&]/)[0];
      return id || null;
    }
  } catch {}
  return null;
}

// Build an autoplay, muted, inline, loopable embed URL for background playback
export function toAutoplayingYouTubeEmbed(url: string): string | null {
  const embed = toYouTubeEmbed(url);
  if (!embed) return null;
  const id = parseYouTubeId(url) || embed.split('/embed/')[1]?.split(/[?&]/)[0] || '';

  // Minimal parameters - only what's strictly needed for background video
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,  // Required for loop to work
    controls: '0',
    playsinline: '1',
  });

  return `${embed}?${params.toString()}`;
}
