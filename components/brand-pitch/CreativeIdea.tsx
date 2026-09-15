import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getSectionTexture } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell } from "./ui";

// Symbol/emoji ranges a "creative thought" tagline might end on (a heart, an
// alien, an arrow, ...) — deliberately narrow (doesn't match ordinary
// letters) so this only ever touches a genuinely decorative trailing glyph.
const TRAILING_GLYPH_RE = /^[←-⯿☀-➿\u{1f000}-\u{1ffff}]+$/u;

/** Ties a trailing decorative glyph (e.g. the "♡" in "LOVE IS OUT THERE ♡")
 * to the word right before it with a non-breaking space, so a short punchy
 * tagline can never wrap and strand the glyph alone on its own line.
 * Ordinary trailing words are left untouched. */
function glueTrailingGlyph(text: string): string {
  const lastSpace = text.lastIndexOf(" ");
  if (lastSpace === -1) return text;
  const lastToken = text.slice(lastSpace + 1);
  if (!TRAILING_GLYPH_RE.test(lastToken)) return text;
  return text.slice(0, lastSpace) + "\u00A0" + lastToken;
}

/**
 * The opening thesis of the pitch — a clean editorial block, not a photo
 * backdrop. Shares its solid surface color with Sonic Identity (palette.accent)
 * so the two bookend sections of the page read as a matched pair, with a
 * computed contrast text color so this reads correctly regardless of how
 * bold or pale that color is for any given brand — plus an optional subtle
 * atmosphere texture (background_textures[0]) layered low-opacity over that
 * color when the brand has uploaded one.
 *
 * Because the section surface IS the accent color here, the eyebrow/pull
 * quote highlight can't use palette.accent itself (it would vanish) — same
 * fix as Sonic Identity: a slightly-transparent onAccent instead.
 *
 * Three deliberate movements, each given its own visual weight so the
 * section reads as the pitch's strategic thesis rather than an "about"
 * paragraph: the question (headline), the explanation (body), then a clear
 * break before the creative thought — a major secondary statement, not a
 * footnote.
 */
export default function CreativeIdea({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  // Prefers the dedicated campaign_tagline column (a punchier, more
  // deliberate "creative thought" line, e.g. Oatly's "WHY FOLLOW THE HERD?
  // ♡") when a pitch has one, falling back to idea_pull_quote so a pitch
  // entered before that column existed still shows its own line — same
  // newer-field-first/legacy-fallback convention used elsewhere in this
  // template (e.g. sonic_logo_versions -> sonic_logo_path).
  const statement = pitch.campaign_tagline || pitch.idea_pull_quote;

  if (!pitch.idea_headline && !pitch.idea_body && !statement) return null;

  const highlight = `${palette.onAccent}d9`;

  return (
    <SectionShell
      className="!py-[5rem] sm:!py-[7rem]"
      style={{ backgroundColor: palette.accent, color: palette.onAccent }}
      textureUrl={getSectionTexture(pitch, 0)}
    >
      <div className="max-w-[46rem] mx-auto">
        <Eyebrow color={highlight}>{pitch.idea_eyebrow || "The Idea"}</Eyebrow>

        {pitch.idea_headline && (
          <h2 className="font-bold leading-[0.98] tracking-tight text-[2.75rem] sm:text-[4.25rem] lg:text-[5.5rem]">
            {pitch.idea_headline}
          </h2>
        )}

        {pitch.idea_body && (
          <p className="mt-[1.75rem] sm:mt-[2.25rem] text-[1.1875rem] sm:text-[1.3125rem] leading-relaxed opacity-80 max-w-[36rem]">
            {pitch.idea_body}
          </p>
        )}

        {/* A clear break before the creative thought — its own small
            eyebrow, then a major statement, not a small closing line.
            clamp() sizing (rather than fixed breakpoint jumps) keeps a short
            punchy tagline — with glueTrailingGlyph guarding its final glyph —
            fitting on one line at typical widths instead of wrapping. */}
        {statement && (
          <div className="mt-[3.5rem] sm:mt-[5rem]">
            <Eyebrow color={highlight}>The Creative Thought</Eyebrow>
            <p
              className="font-black leading-[0.98] tracking-tight text-[clamp(1.75rem,1.15rem+3.2vw,4.5rem)]"
              style={{ color: highlight }}
            >
              {glueTrailingGlyph(statement)}
            </p>
          </div>
        )}

        {pitch.idea_attribution && (
          <p className="mt-[1.5rem] sm:mt-[2rem] text-[0.75rem] font-semibold tracking-[0.2em] uppercase opacity-60">
            {pitch.idea_attribution}
          </p>
        )}
      </div>
    </SectionShell>
  );
}
