import type { Metadata } from "next";
import { fetchAllBrandPitchSummaries } from "@/lib/brandPitch";
import { getBrandArtUrl, getBrandTrackUrl } from "@/lib/brandPitchStorage";
import StudioPage from "@/components/studio/StudioPage";
import type { StudioWorkItem } from "@/components/studio/types";

// Public marketing homepage for CHXNDLER STUDIO — unlike /brands/[slug]
// (private, direct-link pitch decks, force-dynamic + noindex), this page is
// meant to be found and indexed, so it gets real metadata and normal
// caching (revalidated periodically rather than on every request, since the
// project list only changes when a new brand_pitches row is published).
export const revalidate = 300;

const TITLE = "CHXNDLER STUDIO — Original Music, Sonic Identity & Creative Direction";
const DESCRIPTION =
  "CHXNDLER STUDIO makes brands sound unforgettable — original songs, ownable sonic identities and creative direction for Oatly, Converse and more.";

export async function generateMetadata(): Promise<Metadata> {
  const projects = await fetchAllBrandPitchSummaries();
  const ogImage = getBrandArtUrl(projects[0]?.cover_art_path || projects[0]?.hero_art_path);

  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

export default async function StudioHomePage() {
  // The exact same canonical project list every /brands/[slug] page's
  // "Explore the Studio" gallery already draws from — see
  // lib/brandPitch.ts#fetchAllBrandPitchSummaries. No second/independent
  // project data source.
  const summaries = await fetchAllBrandPitchSummaries();

  const projects: StudioWorkItem[] = summaries.map((p) => ({
    slug: p.slug,
    brandName: p.brand_name,
    projectTitle: p.song_title,
    coverArtUrl: getBrandArtUrl(p.cover_art_path || p.hero_art_path),
    sonicPreviewUrl: getBrandTrackUrl(p.sonic_logo_path),
    href: `/brands/${p.slug}`,
  }));

  return <StudioPage projects={projects} />;
}
