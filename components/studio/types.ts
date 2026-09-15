// Shared shape for CHXNDLER STUDIO's homepage (/studio) — resolved once,
// server-side, from the same canonical brand_pitches summary every
// /brands/[slug] page already draws its "Explore the Studio" gallery from
// (see lib/brandPitch.ts#fetchAllBrandPitchSummaries). Never a second,
// independent source of project data.
export type StudioWorkItem = {
  slug: string;
  brandName: string;
  projectTitle: string;
  coverArtUrl: string | null;
  /** Raw storage path (not a resolved URL) for the version Selected Work's
   * cover-art play control plays — resolved with the exact same
   * is_hero_default -> primary+is_default -> primary[0] fallback chain
   * BrandHero.tsx uses for "the" hero song, so /studio and a brand's own
   * pitch page agree on which cut is "the song." Used as the shared-audio
   * id (see BrandAudioContext) — a raw path, not the resolved URL, matching
   * the convention every other player on the site uses. Null when a pitch
   * has no playable version yet. */
  fullSongId: string | null;
  fullSongUrl: string | null;
  /** Resolved public URL for the brand's primary sonic-logo cut, when it has
   * one — powers the Selected Work card's independent "Sonic Identity" pill.
   * Null renders as "no preview available" everywhere, never a fabricated
   * placeholder. */
  sonicPreviewUrl: string | null;
  href: string;
};
