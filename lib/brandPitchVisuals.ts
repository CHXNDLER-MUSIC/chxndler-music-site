/**
 * Cross-section image deduplication for the /brands/[slug] template.
 *
 * Under the current design, only two sections show a decorative photo at
 * all: the hero and the single "campaign image break". Everything else is a
 * solid campaign color (see lib/brandPitchPalette). This registry makes sure
 * a resolved asset URL assigned to one major role — the hero above all —
 * can never silently reappear somewhere else on the page: pre-seed it with
 * the hero's resolved URL, then have every other image-bearing section
 * (secondary campaign image, supporting application mockups, the collectible
 * card) go through `claim()` before rendering. A section whose only image
 * candidate is already claimed omits the image (or falls back to a
 * solid-color presentation) rather than duplicate it.
 *
 * Deliberately NOT used for campaign_uses[].image_path — those are
 * author-configured content images for individual cards and must always
 * render as configured, never be excluded by this system.
 */
import { getBrandArtUrl } from "@/lib/brandPitchStorage";

function dirnameOfPath(path: string | null | undefined): string | null {
  const clean = (path || "").trim();
  if (!clean) return null;
  const idx = clean.lastIndexOf("/");
  return idx === -1 ? null : clean.slice(0, idx);
}

/**
 * Derives "<photo folder>/background N.png" from whichever real asset path
 * the row already has (hero, cover, or secondary art) — no new Supabase
 * column needed. Used sparingly: only for a section that explicitly wants
 * photographic texture behind it instead of a solid campaign color.
 */
export function getDerivedBackgroundImage(
  pitch: { hero_art_path: string | null; cover_art_path: string | null; secondary_art_path: string | null },
  n: 1 | 2 | 3
): string | null {
  const dir =
    dirnameOfPath(pitch.hero_art_path) || dirnameOfPath(pitch.cover_art_path) || dirnameOfPath(pitch.secondary_art_path);
  return dir ? getBrandArtUrl(`${dir}/background ${n}.png`) : null;
}

/**
 * Derives "<photo folder>/<filename>" from the pitch's cover_art_path — the
 * PHOTO subfolder's other physical mockup photos (cd.png, vinyl.png,
 * cassette.png) are uploaded as siblings of "cover art.png" itself, so no new
 * Supabase column is needed to find them. Returns null if the pitch has no
 * cover_art_path to derive a folder from (or hasn't uploaded that file yet —
 * callers should pair this with useAssetAvailable for the 404 case).
 */
export function getDerivedPhotoAsset(pitch: { cover_art_path: string | null }, filename: string): string | null {
  const dir = dirnameOfPath(pitch.cover_art_path);
  return dir ? getBrandArtUrl(`${dir}/${filename}`) : null;
}

/**
 * The hero's own fallback chain — the derived "background 1.png" first (a
 * brand's chosen lead campaign image, e.g. Oatly's field), falling back to
 * the row's explicit hero_art_path, then cover_art_path, so a pitch that
 * hasn't uploaded "background 1.png" still gets a hero image. Shared between
 * BrandHero (which renders it) and BrandPitchPage (which seeds the
 * deduplication registry with it) so the two can never drift apart.
 */
export function getHeroImageCandidates(pitch: {
  hero_art_path: string | null;
  cover_art_path: string | null;
  secondary_art_path: string | null;
}): string[] {
  return [
    getDerivedBackgroundImage(pitch, 1),
    getBrandArtUrl(pitch.hero_art_path),
    getBrandArtUrl(pitch.cover_art_path),
  ].filter((u): u is string => !!u);
}

/**
 * background_textures[n] -> a low-opacity atmosphere wash for one of the
 * three solid-color sections that otherwise have no photography at all (0:
 * The Idea, 1: Sonic Identity, 2: How It Could Live). Passed straight into
 * SectionShell's `textureUrl` prop. Deliberately independent of the
 * asset-dedup registry below — these are decorative washes, not "major"
 * campaign photography, so the same texture is allowed to repeat and never
 * competes with the hero/collectible/etc. for a claim.
 */
export function getSectionTexture(pitch: { background_textures: string[] }, index: 0 | 1 | 2): string | null {
  return getBrandArtUrl(pitch.background_textures[index] ?? null);
}

export type PitchAssetRegistry = {
  /** Returns `url` if no earlier section has claimed it yet (and marks it
   * claimed); returns null if it's already in use elsewhere on the page. */
  claim: (url: string | null) => string | null;
};

export function createAssetRegistry(preclaimed: Array<string | null | undefined> = []): PitchAssetRegistry {
  const used = new Set<string>();
  for (const u of preclaimed) if (u) used.add(u);

  return {
    claim(url) {
      if (!url || used.has(url)) return null;
      used.add(url);
      return url;
    },
  };
}
