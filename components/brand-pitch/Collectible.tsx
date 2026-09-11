import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, useAssetAvailable } from "./ui";

/**
 * Its own clearly defined, editorial section — not buried inside "How It
 * Could Live". A clean solid campaign surface with the collectible card as
 * the sole visual hero. `assets` guards against the (unlikely, but possible)
 * case of the card path being misconfigured to reuse the hero or another
 * major image — in that case the section stays hidden rather than duplicate it.
 */
export default function Collectible({
  pitch,
  palette,
  assets,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  assets: PitchAssetRegistry;
}) {
  // The card art is the whole point of this section — without a unique one
  // there's nothing to be "the visual hero," so the section stays hidden
  // rather than show a placeholder (or a duplicate of another section's image).
  const cardAsset = useAssetAvailable(assets.claim(getBrandArtUrl(pitch.collectible_card_path)));
  const card = cardAsset.src;
  if (!card) return null;

  return (
    <SectionShell id="collectible" className="text-center" style={{ backgroundColor: palette.secondary, color: palette.onSecondary }}>
      <div className="max-w-[36rem] mx-auto">
        <Eyebrow color={palette.accent}>{pitch.collectible_eyebrow || "The Collectible"}</Eyebrow>
        <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem]">
          {pitch.collectible_headline || "A Piece of the World You Can Keep."}
        </h2>
        <p className="mt-[1rem] text-[1.0625rem] sm:text-[1.25rem] font-semibold tracking-tight" style={{ color: palette.accent }}>
          {pitch.collectible_subhead || `${pitch.song_title} — Card 001`}
        </p>
        <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed opacity-80">
          {pitch.collectible_body ||
            "A physical extension of the collaboration — turning the song into something fans can discover, collect and keep."}
        </p>
      </div>

      <div className="mt-[3.5rem] flex justify-center">
        <div className="w-full max-w-[22rem] sm:max-w-[26rem]">
          <div
            className="relative w-full aspect-[5/7] rounded-[1.5rem] overflow-hidden shadow-[0_3rem_6rem_-2rem_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: `${palette.accent}14` }}
          >
            <img
              src={card}
              alt={`${pitch.song_title} collectible card`}
              className="w-full h-full object-cover"
              onError={cardAsset.onError}
            />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
