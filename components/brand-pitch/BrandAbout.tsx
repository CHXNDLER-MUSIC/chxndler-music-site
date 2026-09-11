import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { Eyebrow, SectionShell } from "./ui";

// CHXNDLER's own identity photo — the same across every brand pitch page,
// not per-brand content, so it lives locally rather than in Supabase.
const CHXNDLER_PHOTO = "/elements/CHXNDLER.jpg";

/**
 * Supporting credibility, not the climax of the page — deliberately smaller
 * and calmer than the campaign sections around it: a pale solid surface, a
 * small portrait, modest type scale. Comes before the CTA, never competing
 * with it.
 */
export default function BrandAbout({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  if (!pitch.about_headline && !pitch.about_body) return null;

  return (
    <SectionShell style={{ backgroundColor: palette.light, color: palette.onLight }}>
      <div className="max-w-[32rem] mx-auto flex flex-col items-center text-center">
        <div className="w-[3.25rem] h-[3.25rem] rounded-full overflow-hidden shadow-[0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.3)]">
          <img src={CHXNDLER_PHOTO} alt={pitch.artist_name} className="w-full h-full object-cover" />
        </div>
        <Eyebrow color={palette.accent}>{pitch.about_eyebrow || `Created by ${pitch.artist_name}`}</Eyebrow>
        {pitch.about_headline && (
          <h3 className="text-[1.25rem] sm:text-[1.5rem] font-bold tracking-tight">{pitch.about_headline}</h3>
        )}
        {pitch.about_body && <p className="mt-[1rem] text-[0.9375rem] leading-relaxed opacity-75">{pitch.about_body}</p>}
      </div>
    </SectionShell>
  );
}
