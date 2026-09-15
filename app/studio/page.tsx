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

  const projects: StudioWorkItem[] = summaries.map((p) => {
    // Same fallback chain BrandHero.tsx uses for "the" hero song on a
    // brand's own pitch page: is_hero_default first, then the primary
    // version flagged is_default, then just the first primary version.
    const primaryVersions = p.alt_versions.filter((v) => v.role === "primary");
    const fullSongVersion =
      p.alt_versions.find((v) => v.is_hero_default) || primaryVersions.find((v) => v.is_default) || primaryVersions[0] || null;

    // Same resolution SonicIdentity.tsx uses for "the" primary cut —
    // asSonicLogoVersions (see lib/brandPitch.ts) already guarantees at most
    // one "primary" and puts it first when one exists.
    const sonicVersion = p.sonic_logo_versions.find((v) => v.role === "primary") || p.sonic_logo_versions[0] || null;

    return {
      slug: p.slug,
      brandName: p.brand_name,
      projectTitle: p.song_title,
      coverArtUrl: getBrandArtUrl(p.cover_art_path || p.hero_art_path),
      fullSongId: fullSongVersion?.path || null,
      fullSongUrl: getBrandTrackUrl(fullSongVersion?.path ?? null),
      sonicPreviewUrl: getBrandTrackUrl(sonicVersion?.path ?? null),
      href: `/brands/${p.slug}`,
    };
  });

  return <StudioPage projects={projects} />;
}
