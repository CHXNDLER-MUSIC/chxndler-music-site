import { TRACKS } from "@/app/providers/AudioProvider";
import { trackKeyFromSlug } from "@/utils/trackKeyFromSlug";
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";
import type { NowPlaying } from "@/lib/mediaSession";

/** One released CHXNDLER song for the "ARTIST RELEASES" tab and its song
 * view — see fetchArtistReleases in app/brands/[slug]/page.tsx. Links are
 * already resolved server-side (artist-page fallbacks included). */
export type ArtistRelease = {
  slug: string;
  title: string;
  coverArt: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
  /** The song's own music video as a YouTube embed URL; null when it has none. */
  videoEmbedUrl: string | null;
  /** The matching collectible card's image; null when there's no card. */
  cardArt: string | null;
  /** The song's cockpit sky video (YouTube), looped muted behind its song view. */
  skyVideoUrl: string | null;
};

// Brand-audio ids are namespaced so a release never collides with the
// pitch's own clips on the shared <audio> element.
export const releaseAudioId = (slug: string) => `release:${slug}`;

/** Resolves a release's audio exactly like AudioProvider.selectTrack: the
 * static TRACKS entry when one exists (several uploads don't follow the
 * slug naming), otherwise the `<slug>.mp3` convention in the tracks bucket.
 * Always MP3 — it's the one format every TRACKS entry and every browser has. */
export function releaseAudioSrc(slug: string): string {
  const norm = slug.toLowerCase().replace(/'/g, "");
  const key = trackKeyFromSlug(norm) as keyof typeof TRACKS | null;
  return key && TRACKS[key] ? TRACKS[key].mp3 : supabaseTrackUrl(`${norm}.mp3`);
}

/** Lock-screen / Control Center info for a release. */
export function releaseNowPlaying(release: ArtistRelease): NowPlaying {
  return { title: release.title, artist: "CHXNDLER", artwork: release.coverArt };
}
