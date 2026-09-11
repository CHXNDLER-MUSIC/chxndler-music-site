import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getSectionTexture } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell } from "./ui";

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
 */
export default function CreativeIdea({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  if (!pitch.idea_headline && !pitch.idea_body && !pitch.idea_pull_quote) return null;

  const highlight = `${palette.onAccent}d9`;

  return (
    <SectionShell
      style={{ backgroundColor: palette.accent, color: palette.onAccent }}
      textureUrl={getSectionTexture(pitch, 0)}
    >
      <div className="max-w-[46rem] mx-auto">
        <Eyebrow color={highlight}>{pitch.idea_eyebrow || "The Idea"}</Eyebrow>

        {pitch.idea_headline && (
          <h2 className="font-bold leading-[1.04] tracking-tight text-[2.25rem] sm:text-[3.5rem] lg:text-[4.25rem]">
            {pitch.idea_headline}
          </h2>
        )}

        {pitch.idea_body && (
          <p className="mt-[2rem] sm:mt-[2.5rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed opacity-80 max-w-[36rem]">
            {pitch.idea_body}
          </p>
        )}

        {pitch.idea_pull_quote && (
          <p
            className="mt-[3rem] sm:mt-[4rem] font-black leading-[1.05] tracking-tight text-[1.75rem] sm:text-[2.75rem]"
            style={{ color: highlight }}
          >
            {pitch.idea_pull_quote}
          </p>
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
