import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { useAssetAvailable } from "./ui";

/**
 * The ONE intentional full-bleed campaign image break in the whole page,
 * between the music/sonic story and "How It Could Live" — no copy, just an
 * editorial visual moment. `assets` deduplicates against the hero: if this
 * pitch's secondary_art_path resolves to the exact same asset already used
 * by the hero (or 404s, or is unset), the section is omitted entirely rather
 * than duplicating the hero's image or showing a broken one.
 */
export default function SecondaryCampaignImage({ pitch, assets }: { pitch: BrandPitch; assets: PitchAssetRegistry }) {
  const claimed = assets.claim(getBrandArtUrl(pitch.secondary_art_path));
  const artAsset = useAssetAvailable(claimed);
  if (!artAsset.src) return null;

  return (
    <section className="relative w-full h-[60vh] sm:h-[85vh] overflow-hidden" aria-hidden="true">
      <img src={artAsset.src} alt="" className="absolute inset-0 w-full h-full object-cover" onError={artAsset.onError} />
    </section>
  );
}
