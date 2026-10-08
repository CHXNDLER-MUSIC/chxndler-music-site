import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBrandPitch, fetchAllBrandPitchSummaries } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import BrandPitchPage from "@/components/brand-pitch/BrandPitchPage";
import type { StudioProject, ArtistRelease } from "@/components/brand-pitch/StudioPortfolioLauncher";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { songCoverPath } from "@/lib/songCover";
import { resolveSongLinks } from "@/lib/chxndlerLinks";
import { toYouTubeEmbed } from "@/lib/youtube";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { youtubeSkyFor } from "@/lib/sky-youtube";

// Private/direct-link creative presentations — always fresh, never indexed.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pitch = await fetchBrandPitch(slug || "");
  if (!pitch) return { robots: { index: false, follow: false } };

  const title = pitch.seo_title || `${pitch.brand_name} × ${pitch.artist_name} — ${pitch.song_title}`;
  const description = pitch.seo_description || pitch.hero_supporting_text || undefined;
  const ogImage = getBrandArtUrl(pitch.cover_art_path || pitch.hero_art_path);

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const pitch = await fetchBrandPitch(slug || "");
  if (!pitch) return notFound();

  // "EXPLORE THE STUDIO" gallery — every other published project, excluded
  // by comparing the row's own slug (never the URL/pathname), so this stays
  // correct regardless of how a page got linked to.
  const allProjects = await fetchAllBrandPitchSummaries();
  const otherProjects: StudioProject[] = allProjects
    .filter((p) => p.slug !== pitch.slug.trim().toLowerCase())
    .map((p) => ({
      slug: p.slug,
      brandName: p.brand_name,
      projectTitle: p.song_title,
      coverArt: getBrandArtUrl(p.cover_art_path || p.hero_art_path),
      href: `/brands/${p.slug}`,
    }));

  const artistReleases = await fetchArtistReleases();

  return <BrandPitchPage pitch={pitch} otherProjects={otherProjects} artistReleases={artistReleases} />;
}

// Voiceover/ambient rows that live in the songs table but aren't releases.
const NON_RELEASE_TITLES = ["welcome to the heartverse", "you are home", "space music", "welcome back"];

// Card names match song titles, but the songs table uses curly apostrophes
// and accented letters (WE’RE, POKÉMON) where card names may not.
const normalizeTitle = (title: string) =>
  title.trim().replace(/[‘’ʼ`]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

/** "ARTIST RELEASES" tab — every released CHXNDLER song (public.songs is the
 * single source of truth for release status and links), alphabetical by
 * title, each with what its song view needs: streaming links (falling back
 * to the artist pages), its own music video, and its collectible card. */
async function fetchArtistReleases(): Promise<ArtistRelease[]> {
  try {
    const supabase = getSupabaseAdmin();
    const [songsRes, cardsRes] = await Promise.all([
      supabase
        .from("songs")
        .select("slug, title, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url")
        .eq("is_released", true),
      supabase.from("cards").select("card_name"),
    ]);
    if (songsRes.error || !songsRes.data) return [];

    const cardNames = new Map<string, string>();
    for (const card of cardsRes.data ?? []) {
      if (card.card_name) cardNames.set(normalizeTitle(String(card.card_name)), String(card.card_name));
    }

    return songsRes.data
      .filter((row) => !!row.slug && !!row.title && !NON_RELEASE_TITLES.includes(String(row.title).toLowerCase()))
      .map((row) => {
        const slug = String(row.slug);
        const title = String(row.title);
        const links = resolveSongLinks(row);
        const cardName = cardNames.get(normalizeTitle(title));
        return {
          slug,
          title,
          coverArt: songCoverPath(slug, title),
          spotifyUrl: links.spotifyUrl,
          appleMusicUrl: links.appleMusicUrl,
          youtubeUrl: links.youtubeUrl,
          // Only the song's own video is embedded — never the channel fallback.
          videoEmbedUrl: links.isYouTubeFallback ? null : toYouTubeEmbed(links.youtubeUrl),
          cardArt: cardName ? getCardImageUrl(cardName) : null,
          // Same rule as the cockpit sky: the songs row wins, the static map backs it up.
          skyVideoUrl: (row.sky_video_url as string | null) || youtubeSkyFor(slug) || null,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  } catch (err) {
    console.error("[fetchArtistReleases] failed:", err);
    return [];
  }
}
