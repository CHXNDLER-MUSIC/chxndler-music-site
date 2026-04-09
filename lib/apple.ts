export function toAppleEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!/^(music|embed\.music|itunes)\.apple\.com$/.test(host)) return null;
    u.hostname = 'embed.music.apple.com';
    // Keep path and query as-is; Apple embed uses same structure
    return u.toString();
  } catch {
    return null;
  }
}

export function appleEmbedHeight(url: string): number {
  try {
    const u = new URL(toAppleEmbed(url) || url);
    const p = u.pathname;
    const hasSongParam = !!u.searchParams.get('i');
    // Use Apple's typical widget heights for better aspect
    // Adjusted to match blue display vertical bounds
    // - Single track: ~175px
    // - Album/Playlist/Artist: ~320px (reduced from ~450)
    if (p.includes('/playlist/')) return 320;
    if (p.includes('/album/') && !hasSongParam) return 320;
    if (p.includes('/artist/')) return 320;
    // Likely a single track embed
    return 175;
  } catch {
    // Sensible default if parsing fails (align with blue display area)
    return 320;
  }
}
