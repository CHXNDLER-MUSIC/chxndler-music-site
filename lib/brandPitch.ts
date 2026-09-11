// Server-only data access for the reusable brand-pitch CMS.
// Never import this from a "use client" module — it uses the Supabase
// admin client so the service role key stays out of the browser bundle.
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export type BrandPitchPoint = { title: string; body: string };
export type BrandPitchProcessStep = { number: string; title: string; body: string };
// A single unified "audio version" — the one source of truth for every
// playable cut on the pitch page (what used to be spread across audio_15/
// 30/60_path, full_song_path, and a separate alt_versions list). Supabase
// decides everything about hierarchy: which versions are primary pitch tabs
// vs supporting/content rows, which one is the default, and which one is
// "the" full song (for the hero's secondary link + lyrics gating).
export type BrandPitchAudioVersionRole = "primary" | "supporting";
export type BrandPitchAudioVersion = {
  label: string;
  description: string;
  path: string;
  role: BrandPitchAudioVersionRole;
  is_default: boolean;
  is_full_song: boolean;
  // Which version the hero's single CTA plays. Independent of is_default (the
  // "Hear the Concept" tab that opens first) so a pitch can lead the hero with
  // the full song while "Hear the Concept" still opens on the short brand cut.
  is_hero_default: boolean;
};
export type BrandPitchMomentEmphasis = "hero" | "large" | "standard";
export type BrandPitchMoment = {
  category: string;
  title: string;
  body: string;
  image_path: string | null;
  emphasis: BrandPitchMomentEmphasis;
};

export type BrandPitch = {
  id: string;
  slug: string;
  brand_name: string;
  artist_name: string;
  year: number | null;
  is_published: boolean;
  song_title: string;

  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_supporting_text: string | null;
  hero_button_text: string | null;
  /** Bottom hero capability labels, e.g. ["Original Song","Campaign Cuts","Sonic Identity"]. */
  hero_capability_labels: string[];

  idea_eyebrow: string | null;
  idea_headline: string | null;
  idea_body: string | null;
  idea_pull_quote: string | null;
  idea_attribution: string | null;

  fit_eyebrow: string | null;
  fit_headline: string | null;
  fit_intro: string | null;
  fit_points: BrandPitchPoint[];

  audio_eyebrow: string | null;
  audio_headline: string | null;
  audio_description: string | null;

  sonic_eyebrow: string | null;
  sonic_headline: string | null;
  sonic_description: string | null;
  sonic_mnemonic: string | null;
  sonic_uses: string[];

  campaign_eyebrow: string | null;
  campaign_headline: string | null;
  campaign_intro: string | null;
  campaign_uses: BrandPitchMoment[];

  full_song_eyebrow: string | null;
  full_song_headline: string | null;
  lyrics: string | null;

  alt_versions_eyebrow: string | null;
  alt_versions_headline: string | null;
  alt_versions_description: string | null;
  /** All playable audio versions for "Hear the Concept" — see BrandPitchAudioVersion. */
  alt_versions: BrandPitchAudioVersion[];

  collectible_eyebrow: string | null;
  collectible_headline: string | null;
  collectible_subhead: string | null;
  collectible_body: string | null;
  collectible_card_path: string | null;

  offer_eyebrow: string | null;
  offer_headline: string | null;
  offer_intro: string | null;
  deliverables: BrandPitchPoint[];

  pricing_eyebrow: string | null;
  pricing_name: string | null;
  starting_price: number | null;
  pricing_note: string | null;

  process_eyebrow: string | null;
  process_headline: string | null;
  process_steps: BrandPitchProcessStep[];

  about_eyebrow: string | null;
  about_headline: string | null;
  about_body: string | null;

  cta_eyebrow: string | null;
  cta_headline: string | null;
  cta_body: string | null;
  cta_button_text: string | null;
  cta_url: string | null;

  cover_art_path: string | null;
  hero_art_path: string | null;
  hero_video_path: string | null;
  secondary_art_path: string | null;
  song_title_graphic_path: string | null;
  background_textures: string[];
  audio_15_path: string | null;
  audio_30_path: string | null;
  audio_60_path: string | null;
  full_song_path: string | null;
  sonic_logo_path: string | null;
  social_mockup_path: string | null;
  campaign_mockup_path: string | null;
  sonic_mockup_path: string | null;
  event_mockup_path: string | null;

  background_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  secondary_color: string | null;

  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
};

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Malformed JSON in a jsonb column — treat as empty rather than crash the page.
    }
  }
  return [];
}

function asPointArray(value: unknown): BrandPitchPoint[] {
  return coerceArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = typeof (item as any).title === "string" ? (item as any).title : null;
      const body = typeof (item as any).body === "string" ? (item as any).body : "";
      if (!title) return null;
      return { title, body };
    })
    .filter((x): x is BrandPitchPoint => x !== null);
}

// campaign_uses items — extended in place (same jsonb column, richer shape)
// to carry an optional per-moment image and layout hint, so BrandMoments
// never has to pair items with fixed mockup-path columns by index.
function asMoments(value: unknown): BrandPitchMoment[] {
  return coerceArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = typeof (item as any).title === "string" ? (item as any).title : null;
      if (!title) return null;
      const body = typeof (item as any).body === "string" ? (item as any).body : "";
      const category = typeof (item as any).category === "string" ? (item as any).category : "";
      const image_path =
        typeof (item as any).image_path === "string" && (item as any).image_path.trim() ? (item as any).image_path : null;
      const rawEmphasis = (item as any).emphasis;
      const emphasis: BrandPitchMomentEmphasis = rawEmphasis === "hero" || rawEmphasis === "large" ? rawEmphasis : "standard";
      return { category, title, body, image_path, emphasis };
    })
    .filter((x): x is BrandPitchMoment => x !== null);
}

function asProcessSteps(value: unknown): BrandPitchProcessStep[] {
  return coerceArray(value)
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const title = typeof (item as any).title === "string" ? (item as any).title : null;
      if (!title) return null;
      const body = typeof (item as any).body === "string" ? (item as any).body : "";
      const number =
        typeof (item as any).number === "string" ? (item as any).number : String(i + 1).padStart(2, "0");
      return { number, title, body };
    })
    .filter((x): x is BrandPitchProcessStep => x !== null);
}

function asStringArray(value: unknown): string[] {
  return coerceArray(value).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function asAudioVersions(value: unknown): BrandPitchAudioVersion[] {
  return coerceArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = typeof (item as any).label === "string" ? (item as any).label : null;
      const path = typeof (item as any).path === "string" ? (item as any).path : null;
      if (!label || !path) return null;
      const description = typeof (item as any).description === "string" ? (item as any).description : "";
      const role: BrandPitchAudioVersionRole = (item as any).role === "primary" ? "primary" : "supporting";
      const is_default = (item as any).is_default === true;
      const is_full_song = (item as any).is_full_song === true;
      const is_hero_default = (item as any).is_hero_default === true;
      return { label, description, path, role, is_default, is_full_song, is_hero_default };
    })
    .filter((x): x is BrandPitchAudioVersion => x !== null);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeBrandPitch(row: Record<string, any>): BrandPitch {
  return {
    id: row.id,
    slug: row.slug,
    brand_name: row.brand_name || "",
    artist_name: row.artist_name || "CHXNDLER",
    year: typeof row.year === "number" ? row.year : null,
    is_published: !!row.is_published,
    song_title: row.song_title || "",

    hero_headline: nullableString(row.hero_headline),
    hero_subheadline: nullableString(row.hero_subheadline),
    hero_supporting_text: nullableString(row.hero_supporting_text),
    hero_button_text: nullableString(row.hero_button_text),
    hero_capability_labels: asStringArray(row.hero_capability_labels),

    idea_eyebrow: nullableString(row.idea_eyebrow),
    idea_headline: nullableString(row.idea_headline),
    idea_body: nullableString(row.idea_body),
    idea_pull_quote: nullableString(row.idea_pull_quote),
    idea_attribution: nullableString(row.idea_attribution),

    fit_eyebrow: nullableString(row.fit_eyebrow),
    fit_headline: nullableString(row.fit_headline),
    fit_intro: nullableString(row.fit_intro),
    fit_points: asPointArray(row.fit_points),

    audio_eyebrow: nullableString(row.audio_eyebrow),
    audio_headline: nullableString(row.audio_headline),
    audio_description: nullableString(row.audio_description),

    sonic_eyebrow: nullableString(row.sonic_eyebrow),
    sonic_headline: nullableString(row.sonic_headline),
    sonic_description: nullableString(row.sonic_description),
    sonic_mnemonic: nullableString(row.sonic_mnemonic),
    sonic_uses: asStringArray(row.sonic_uses),

    campaign_eyebrow: nullableString(row.campaign_eyebrow),
    campaign_headline: nullableString(row.campaign_headline),
    campaign_intro: nullableString(row.campaign_intro),
    campaign_uses: asMoments(row.campaign_uses),

    full_song_eyebrow: nullableString(row.full_song_eyebrow),
    full_song_headline: nullableString(row.full_song_headline),
    lyrics: nullableString(row.lyrics),

    alt_versions_eyebrow: nullableString(row.alt_versions_eyebrow),
    alt_versions_headline: nullableString(row.alt_versions_headline),
    alt_versions_description: nullableString(row.alt_versions_description),
    alt_versions: asAudioVersions(row.alt_versions),

    collectible_eyebrow: nullableString(row.collectible_eyebrow),
    collectible_headline: nullableString(row.collectible_headline),
    collectible_subhead: nullableString(row.collectible_subhead),
    collectible_body: nullableString(row.collectible_body),
    collectible_card_path: nullableString(row.collectible_card_path),

    offer_eyebrow: nullableString(row.offer_eyebrow),
    offer_headline: nullableString(row.offer_headline),
    offer_intro: nullableString(row.offer_intro),
    deliverables: asPointArray(row.deliverables),

    pricing_eyebrow: nullableString(row.pricing_eyebrow),
    pricing_name: nullableString(row.pricing_name),
    starting_price: typeof row.starting_price === "number" ? row.starting_price : row.starting_price ? Number(row.starting_price) : null,
    pricing_note: nullableString(row.pricing_note),

    process_eyebrow: nullableString(row.process_eyebrow),
    process_headline: nullableString(row.process_headline),
    process_steps: asProcessSteps(row.process_steps),

    about_eyebrow: nullableString(row.about_eyebrow),
    about_headline: nullableString(row.about_headline),
    about_body: nullableString(row.about_body),

    cta_eyebrow: nullableString(row.cta_eyebrow),
    cta_headline: nullableString(row.cta_headline),
    cta_body: nullableString(row.cta_body),
    cta_button_text: nullableString(row.cta_button_text),
    cta_url: nullableString(row.cta_url),

    cover_art_path: nullableString(row.cover_art_path),
    hero_art_path: nullableString(row.hero_art_path),
    hero_video_path: nullableString(row.hero_video_path),
    secondary_art_path: nullableString(row.secondary_art_path),
    song_title_graphic_path: nullableString(row.song_title_graphic_path),
    background_textures: asStringArray(row.background_textures),
    audio_15_path: nullableString(row.audio_15_path),
    audio_30_path: nullableString(row.audio_30_path),
    audio_60_path: nullableString(row.audio_60_path),
    full_song_path: nullableString(row.full_song_path),
    sonic_logo_path: nullableString(row.sonic_logo_path),
    social_mockup_path: nullableString(row.social_mockup_path),
    campaign_mockup_path: nullableString(row.campaign_mockup_path),
    sonic_mockup_path: nullableString(row.sonic_mockup_path),
    event_mockup_path: nullableString(row.event_mockup_path),

    background_color: nullableString(row.background_color),
    text_color: nullableString(row.text_color),
    accent_color: nullableString(row.accent_color),
    secondary_color: nullableString(row.secondary_color),

    seo_title: nullableString(row.seo_title),
    seo_description: nullableString(row.seo_description),
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

/**
 * Fetch a brand pitch by slug for the reusable /brands/[slug] route.
 * Server-only. Explicitly filters is_published (rather than relying on RLS,
 * which has drifted from migrations before in this project) so the publish
 * gate is enforced here regardless of table policy state.
 *
 * Outside production (local dev), unpublished rows are still returned so a
 * pitch can be previewed at its real /brands/<slug> URL before flipping
 * is_published — production keeps the strict gate.
 */
export async function fetchBrandPitch(slug: string): Promise<BrandPitch | null> {
  const cleanSlug = (slug || "").trim().toLowerCase();
  if (!cleanSlug) return null;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("brand_pitches").select("*").eq("slug", cleanSlug);
    if (process.env.NODE_ENV === "production") {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    return normalizeBrandPitch(data);
  } catch (err) {
    console.error("[fetchBrandPitch] failed:", err);
    return null;
  }
}
