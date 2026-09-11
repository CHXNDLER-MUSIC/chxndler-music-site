import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { Eyebrow, SectionShell } from "./ui";

/**
 * The opening thesis of the pitch — a clean editorial block, not a photo
 * backdrop. A solid campaign-primary surface (the brand's own configured
 * background_color) with a computed contrast text color, so this reads
 * correctly regardless of how bold or pale that color is for any given
 * brand. Eyebrow and pull quote use the accent color as the one spot
 * highlight; everything else is quiet.
 */
export default function CreativeIdea({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  if (!pitch.idea_headline && !pitch.idea_body && !pitch.idea_pull_quote) return null;

  return (
    <SectionShell style={{ backgroundColor: palette.primary, color: palette.onPrimary }}>
      <div className="max-w-[46rem] mx-auto">
        <Eyebrow color={palette.accent}>{pitch.idea_eyebrow || "The Idea"}</Eyebrow>

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
            style={{ color: palette.accent }}
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
