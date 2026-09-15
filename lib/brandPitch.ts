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
// One playable sonic-logo cut. "primary" is the version the section leads
// with (visually emphasized); everything else is an easy-to-preview
// alternate — however many a brand has (ALT 01, ALT 02, ALT 03, ...), never
// a fixed count. Mirrors the alt_versions shape/convention on purpose.
export type BrandPitchSonicLogoRole = "primary" | "alternate";
export type BrandPitchSonicLogoVersion = {
  label: string;
  path: string;
  role: BrandPitchSonicLogoRole;
};

export type BrandPitchMomentEmphasis = "hero" | "large" | "standard";
export type BrandPitchMomentImageFit = "cover" | "contain";
/** One auto-discovered campaign asset beyond a moment's hero image_path —
 * see discoverMomentAssets. `isVideo` is derived from the file extension,
 * never a separate authored field, so the viewer can never mis-render a
 * still image as a video. */
export type BrandPitchMomentAsset = { path: string; isVideo: boolean };
export type BrandPitchMoment = {
  category: string;
  title: string;
  body: string;
  image_path: string | null;
  emphasis: BrandPitchMomentEmphasis;
  /** "cover" (default) fills the card, cropping as needed. "contain" shows
   * the whole image uncropped — for a card whose asset isn't the card's own
   * aspect ratio (e.g. a full social post/story screenshot). */
  image_fit: BrandPitchMomentImageFit;
  /** Additional campaign assets beyond image_path (the hero), auto-discovered
   * from the same Storage folder — see discoverMomentAssets. Always [] as
   * parsed from the row; fetchBrandPitch fills this in afterward, since
   * discovery is an async Storage call the synchronous row parser can't do. */
  assets: BrandPitchMomentAsset[];
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
  /** A short, punchy campaign tagline (e.g. "WHY FOLLOW THE HERD? ♡") — a
   * more deliberate "creative thought" statement than idea_pull_quote when a
   * pitch has one. CreativeIdea prefers this and falls back to
   * idea_pull_quote so pitches entered before this column existed keep
   * showing their own line. */
  campaign_tagline: string | null;

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
  /** Scalable sonic-logo cuts (primary + however many alternates exist) —
   * see BrandPitchSonicLogoVersion. Falls back to the legacy single
   * sonic_logo_path column (as a synthetic one-item "primary" list) when
   * empty, so brands entered before this column existed still render. */
  sonic_logo_versions: BrandPitchSonicLogoVersion[];

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
  about_background_color: string | null;
  about_background_image_path: string | null;

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
      const image_fit: BrandPitchMomentImageFit = (item as any).image_fit === "contain" ? "contain" : "cover";
      return { category, title, body, image_path, emphasis, image_fit, assets: [] as BrandPitchMomentAsset[] };
    })
    .filter((x): x is BrandPitchMoment => x !== null);
}

// Same public bucket as lib/brandPitchStorage.ts's getBrandArtUrl — kept as
// its own constant here (rather than importing that browser-client module)
// since this file must stay importable from server-only contexts.
const BRAND_BUCKET = "Brands";
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v"]);

function dirnameOfPath(path: string | null | undefined): string | null {
  const clean = (path || "").trim();
  if (!clean) return null;
  const idx = clean.lastIndexOf("/");
  return idx === -1 ? null : clean.slice(0, idx);
}

function basenameOfPath(path: string | null | undefined): string | null {
  const clean = (path || "").trim();
  if (!clean) return null;
  const idx = clean.lastIndexOf("/");
  return idx === -1 ? clean : clean.slice(idx + 1);
}

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Auto-discovers a moment's additional campaign assets by scanning the same
 * Storage folder its hero image_path already lives in (falling back to the
 * pitch's cover_art_path folder when image_path is null) for sibling files
 * named "<category> <n>.<ext>" — e.g. a "PRODUCT" moment whose hero is
 * "Oatly/WOW NO COW/PHOTO/product.png" picks up "product 2.png",
 * "product 3.png", etc. from that same folder, sorted numerically.
 *
 * This is a live Storage list() call rather than a stored path list, so
 * uploading a correctly-named file makes it appear with zero DB edit and
 * zero code change — no new Supabase column needed. The hero's own filename
 * is explicitly excluded so it can never be duplicated into the list.
 */
async function discoverMomentAssets(
  pitch: { cover_art_path: string | null },
  moment: BrandPitchMoment
): Promise<BrandPitchMomentAsset[]> {
  const category = moment.category.trim();
  if (!category) return [];
  const folder = dirnameOfPath(moment.image_path) || dirnameOfPath(pitch.cover_art_path);
  if (!folder) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BRAND_BUCKET).list(folder, { limit: 100 });
    if (error || !data) return [];

    const heroFilename = basenameOfPath(moment.image_path);
    const pattern = new RegExp(`^${escapeRegExp(category.toLowerCase())}\\s+(\\d+)\\.[a-z0-9]+$`, "i");

    return data
      .map((file) => {
        if (file.name === heroFilename) return null;
        const match = file.name.match(pattern);
        if (!match) return null;
        return { name: file.name, order: parseInt(match[1], 10) };
      })
      .filter((x): x is { name: string; order: number } => x !== null)
      .sort((a, b) => a.order - b.order)
      .map((x) => ({ path: `${folder}/${x.name}`, isVideo: VIDEO_EXTENSIONS.has(extensionOf(x.name)) }));
  } catch (err) {
    console.error("[discoverMomentAssets] failed:", err);
    return [];
  }
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

function asSonicLogoVersions(value: unknown, legacyPath: unknown): BrandPitchSonicLogoVersion[] {
  const parsed = coerceArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = typeof (item as any).label === "string" ? (item as any).label : null;
      const path = typeof (item as any).path === "string" ? (item as any).path : null;
      if (!label || !path) return null;
      const role: BrandPitchSonicLogoRole = (item as any).role === "alternate" ? "alternate" : "primary";
      return { label, path, role };
    })
    .filter((x): x is BrandPitchSonicLogoVersion => x !== null);

  if (parsed.length > 0) {
    // Exactly one "primary" — first flagged one wins, everything else
    // (including any additional item mistakenly marked primary) is an alternate.
    let sawPrimary = false;
    return parsed.map((v) => {
      if (v.role === "primary") {
        if (sawPrimary) return { ...v, role: "alternate" as const };
        sawPrimary = true;
        return v;
      }
      return v;
    });
  }

  // No rows entered under the new column yet — synthesize a single primary
  // from the legacy sonic_logo_path so existing brands keep working.
  const legacy = typeof legacyPath === "string" && legacyPath.trim() ? legacyPath : null;
  return legacy ? [{ label: "Primary", path: legacy, role: "primary" }] : [];
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
    campaign_tagline: nullableString(row.campaign_tagline),

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
    sonic_logo_versions: asSonicLogoVersions(row.sonic_logo_versions, row.sonic_logo_path),

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
    about_background_color: nullableString(row.about_background_color),
    about_background_image_path: nullableString(row.about_background_image_path),

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

/** One brand_pitches row reduced to what the "EXPLORE THE STUDIO" launcher
 * (and the /studio "Selected Work" gallery) needs to list every project —
 * see StudioPortfolioLauncher. Deliberately carries raw storage paths, not
 * resolved URLs: this file stays free of lib/brandPitchStorage's
 * getBrandArtUrl (see BRAND_BUCKET comment above) so it's safe to import
 * from any server-only context, not just React Server Components. Callers
 * resolve cover_art_path/hero_art_path/sonic_logo_path themselves (see
 * app/brands/[slug]/page.tsx and app/studio/page.tsx). */
export type BrandPitchSummary = {
  slug: string;
  brand_name: string;
  song_title: string;
  cover_art_path: string | null;
  hero_art_path: string | null;
  /** The brand's primary sonic-logo cut, when it has one — a short (few-
   * second) audio ID, exactly what /studio's Selected Work cards and Sonic
   * Identity section preview. Legacy single-path column, same one
   * asSonicLogoVersions falls back to in the full pitch fetch — good enough
   * for a lightweight summary without pulling in the full jsonb column. */
  sonic_logo_path: string | null;
  /** Every sonic-logo cut (primary + alternates), parsed the same way
   * fetchBrandPitch does — lets a caller resolve "the" primary cut with the
   * exact same asSonicLogoVersions rule (first-flagged-primary-wins, legacy
   * sonic_logo_path fallback) used everywhere else, instead of assuming
   * sonic_logo_path alone is always populated. */
  sonic_logo_versions: BrandPitchSonicLogoVersion[];
  /** Every playable audio version (label/path/role/is_default/is_full_song/
   * is_hero_default), parsed the same way fetchBrandPitch does — this is
   * what lets /studio's Selected Work play "the full song" per project using
   * the exact same is_hero_default -> primary+is_default -> primary[0]
   * fallback chain BrandHero.tsx already uses, rather than a second,
   * divergent notion of "the" song. */
  alt_versions: BrandPitchAudioVersion[];
};

/**
 * Fetch every published brand pitch (minimal fields only) for the
 * "EXPLORE THE STUDIO" project gallery — the single canonical list every
 * /brands/[slug] page draws its "other projects" from, so adding a new brand
 * row automatically appears everywhere without touching any page. Same
 * is_published gate as fetchBrandPitch (strict in production, permissive in
 * local dev so an unpublished pitch can still be previewed).
 */
export async function fetchAllBrandPitchSummaries(): Promise<BrandPitchSummary[]> {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("brand_pitches")
      .select(
        "slug, brand_name, song_title, cover_art_path, hero_art_path, sonic_logo_path, sonic_logo_versions, alt_versions, is_published, sort_order"
      )
      .order("sort_order", { ascending: true });
    if (process.env.NODE_ENV === "production") {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data
      .filter((row: Record<string, any>) => !!row.slug && !!row.brand_name)
      .map((row: Record<string, any>) => ({
        slug: String(row.slug).trim().toLowerCase(),
        brand_name: row.brand_name || "",
        song_title: row.song_title || "",
        cover_art_path: nullableString(row.cover_art_path),
        hero_art_path: nullableString(row.hero_art_path),
        sonic_logo_path: nullableString(row.sonic_logo_path),
        sonic_logo_versions: asSonicLogoVersions(row.sonic_logo_versions, row.sonic_logo_path),
        alt_versions: asAudioVersions(row.alt_versions),
      }));
  } catch (err) {
    console.error("[fetchAllBrandPitchSummaries] failed:", err);
    return [];
  }
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
    // Case-insensitive lookup on purpose: /brands/[slug] should resolve the
    // same pitch whether a link (or a row's slug column) was typed as
    // "vacation" or "Vacation" — ilike with no wildcards in `cleanSlug` is a
    // plain case-insensitive equality check, not a pattern match. Escape any
    // literal %/_ first so a slug containing them can't be misread as a
    // wildcard.
    const ilikeSafeSlug = cleanSlug.replace(/[%_]/g, (c) => `\\${c}`);
    let query = supabase.from("brand_pitches").select("*").ilike("slug", ilikeSafeSlug);
    if (process.env.NODE_ENV === "production") {
      query = query.eq("is_published", true);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    const pitch = normalizeBrandPitch(data);

    // Enrich each moment with its auto-discovered extra assets (see
    // discoverMomentAssets) — a handful of lightweight Storage list() calls,
    // not asset downloads, so this stays cheap even though it runs on every
    // request (this route is force-dynamic).
    const campaign_uses = await Promise.all(
      pitch.campaign_uses.map(async (moment) => ({
        ...moment,
        assets: await discoverMomentAssets(pitch, moment),
      }))
    );

    return { ...pitch, campaign_uses };
  } catch (err) {
    console.error("[fetchBrandPitch] failed:", err);
    return null;
  }
}
