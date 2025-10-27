export function toSpotifyEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'open.spotify.com') return null;
    // Build embed URL by prefixing path with /embed and dropping query params
    const path = u.pathname.replace(/\/+$/, '');
    if (!path || path === '/') return null;
    return `https://open.spotify.com/embed${path}`;
  } catch {
    return null;
  }
}

export function spotifyEmbedHeight(url: string): number {
  try {
    // Normalize to embed path for detection
    const embed = toSpotifyEmbed(url) || url;
    const u = new URL(embed);
    const p = u.pathname;
    // Compact heights to reduce overall popout size
    if (p.startsWith('/embed/track')) return 136;
    if (p.startsWith('/embed/episode')) return 180;
    if (p.startsWith('/embed/show')) return 180;
    if (p.startsWith('/embed/playlist')) return 248;
    if (p.startsWith('/embed/album')) return 248;
    if (p.startsWith('/embed/artist')) return 248;
    return 248;
  } catch {
    return 248;
  }
}
