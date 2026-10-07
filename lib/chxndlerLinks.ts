// CHXNDLER's generic artist/channel destinations — the ONLY definition of these
// three URLs. Song-specific links live in Supabase (public.songs) and these are
// the fallbacks when a song has no link for that platform.
export const CHXNDLER_SPOTIFY_ARTIST_URL = "https://open.spotify.com/artist/6O2eoUA8ZWY0lwjsa3E3Yo";
export const CHXNDLER_APPLE_MUSIC_ARTIST_URL = "https://music.apple.com/us/artist/chxndler/1660901437";
export const CHXNDLER_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@chxndlerthealien";

/** Link fields carried on a song object straight from its public.songs row. */
export type SongLinkFields = {
  spotify_url?: string | null;
  apple_music_url?: string | null;
  youtube_music_video_url?: string | null;
  karaoke_url?: string | null;
};

function present(url: string | null | undefined): string | null {
  const u = typeof url === "string" ? url.trim() : "";
  return u ? u : null;
}

/**
 * Where each streaming button goes for a song (or home, when `song` is null).
 * Spotify / Apple Music / YouTube fall back to the artist page or channel;
 * karaoke has NO fallback (a channel isn't a karaoke track) — null means
 * "no karaoke for this song".
 */
export function resolveSongLinks(song: SongLinkFields | null | undefined) {
  const spotify = present(song?.spotify_url);
  const apple = present(song?.apple_music_url);
  const youtube = present(song?.youtube_music_video_url);
  return {
    spotifyUrl: spotify ?? CHXNDLER_SPOTIFY_ARTIST_URL,
    appleMusicUrl: apple ?? CHXNDLER_APPLE_MUSIC_ARTIST_URL,
    youtubeUrl: youtube ?? CHXNDLER_YOUTUBE_CHANNEL_URL,
    karaokeUrl: present(song?.karaoke_url),
    isSpotifyFallback: !spotify,
    isAppleMusicFallback: !apple,
    isYouTubeFallback: !youtube,
  };
}
