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
    // Heuristics based on Apple widget sizes
    if (p.includes('/playlist/')) return 560; // taller playlist
    if (p.includes('/album/') && !hasSongParam) return 560; // taller album view
    if (p.includes('/artist/')) return 560; // taller artist view
    // Likely a single track embed — make taller
    return 260;
  } catch {
    return 360;
  }
}
