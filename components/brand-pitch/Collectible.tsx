import React, { useMemo } from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getDerivedBackgroundImage, type PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, useAssetAvailable } from "./ui";
import CollectibleViewer from "./CollectibleViewer";

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
  // rather than show a placeholder (or a duplicate of another section's
  // image). Claimed via useMemo (not directly in the render body) so a
  // parent re-render doesn't re-invoke `assets.claim` against a url it
  // already claimed on the first render — claim() mutates a shared Set, so
  // an unmemoized second call would find it "already used" and return null.
  const claimedCard = useMemo(() => assets.claim(getBrandArtUrl(pitch.collectible_card_path)), [assets, pitch]);
  const cardAsset = useAssetAvailable(claimedCard);
  const card = cardAsset.src;

  // "background 3.png" — exclusively this section's now (BrandMoments no
  // longer claims it), so the card's own physical-object moment gets a
  // photographic backdrop instead of a flat color. Must run before the
  // `!card` early return below — every hook here has to run on every render,
  // or a card image that 404s after its first successful render (card goes
  // from truthy to null) drops this hook on a later render and React throws
  // "Rendered fewer hooks than expected".
  const backgroundImage = useMemo(() => assets.claim(getDerivedBackgroundImage(pitch, 3)), [assets, pitch]);

  if (!card) return null;

  return (
    <SectionShell
      id="collectible"
      className="text-center !pt-[3rem] sm:!pt-[5rem]"
      style={{ backgroundColor: palette.secondary, color: palette.onSecondary }}
      backgroundImage={backgroundImage}
      backgroundOverlay={`${palette.secondary}66`}
    >
      <div className="max-w-[36rem] mx-auto">
        <Eyebrow color={palette.accent}>{pitch.collectible_eyebrow || "The Collectible"}</Eyebrow>
        <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem]">
          {pitch.collectible_headline || "A Piece of the World You Can Keep."}
        </h2>
        <p className="mt-[1rem] text-[1.0625rem] sm:text-[1.25rem] font-semibold tracking-tight" style={{ color: palette.accent }}>
          {pitch.collectible_subhead || pitch.song_title}
        </p>
        <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed opacity-80">
          {pitch.collectible_body ||
            "A physical extension of the collaboration — turning the song into something fans can discover, collect and keep."}
        </p>
      </div>

      <div className="mt-[3.5rem] flex justify-center">
        <CollectibleViewer
          src={card}
          songTitle={pitch.song_title}
          accent={palette.accent}
          onError={cardAsset.onError}
        />
      </div>
    </SectionShell>
  );
}
