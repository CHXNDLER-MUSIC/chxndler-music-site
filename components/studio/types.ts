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
  /** Resolved public URL for the brand's primary sonic-logo cut, when it has
   * one — powers both the Selected Work card's inline "Listen" preview and
   * the Sonic Identity section below. Null renders as "no preview available"
   * everywhere, never a fabricated placeholder. */
  sonicPreviewUrl: string | null;
  href: string;
};
