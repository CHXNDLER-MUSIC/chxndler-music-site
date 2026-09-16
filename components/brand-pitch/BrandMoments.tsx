"use client";

import React, { useState } from "react";
import type { BrandPitch, BrandPitchMoment } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getSectionTexture } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, useAssetAvailable } from "./ui";
import { useInteractionSound } from "./useInteractionSound";
import CampaignDetailViewer from "./CampaignDetailViewer";

/**
 * "How It Could Live" — one song expanding into a brand world, told as a
 * clean, uniform 3-column grid (same aspect ratio, same dimensions, same
 * text hierarchy for every card) so the whole section reads in about five
 * seconds: song -> primary use -> primary use -> primary use. Only the
 * first three campaign_uses entries ever render here — deliberately the
 * strongest examples, not an exhaustive list; nothing beyond that (and no
 * application-mockup fields) renders in this template. A solid
 * campaign-dark surface, with an optional subtle atmosphere texture
 * (background_textures[2]) layered low-opacity over it. "background 3.png"
 * belongs to Collectible.
 */
export default function BrandMoments({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  const primaryMoments = pitch.campaign_uses.slice(0, 3);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!pitch.campaign_headline && !pitch.campaign_intro && primaryMoments.length === 0) return null;

  const selectedMoment = openIndex != null ? primaryMoments[openIndex] ?? null : null;

  return (
    <SectionShell
      id="campaign"
      style={{ backgroundColor: palette.dark, color: palette.onDark }}
      textureUrl={getSectionTexture(pitch, 2)}
    >
      <Eyebrow color={palette.accent} style={{ fontSize: "1.0625rem" }}>
        {pitch.campaign_eyebrow || "How It Could Live"}
      </Eyebrow>

      {pitch.campaign_headline && (
        <h2 className="font-bold leading-[1.05] tracking-tight text-[2rem] sm:text-[3rem] max-w-[40rem]">
          {pitch.campaign_headline}
        </h2>
      )}
      {pitch.campaign_intro && (
        <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed opacity-75 max-w-[32rem]">{pitch.campaign_intro}</p>
      )}

      {primaryMoments.length > 0 && (
        <div className="mt-[3.5rem] sm:mt-[4.5rem] grid grid-cols-1 sm:grid-cols-3 gap-[2.5rem] sm:gap-[2rem]">
          {primaryMoments.map((moment, i) => (
            <MomentCard
              key={`${moment.category}-${moment.title}-${i}`}
              pitch={pitch}
              palette={palette}
              moment={moment}
              index={i}
              onOpen={() => setOpenIndex(i)}
            />
          ))}
        </div>
      )}

      <CampaignDetailViewer
        open={openIndex != null}
        onClose={() => setOpenIndex(null)}
        pitch={pitch}
        palette={palette}
        moment={selectedMoment}
        index={openIndex ?? 0}
      />
    </SectionShell>
  );
}

function MomentCard({
  pitch,
  palette,
  moment,
  index,
  onOpen,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  moment: BrandPitchMoment;
  index: number;
  onOpen: () => void;
}) {
  // Campaign card imagery is author-configured content, never deduplicated
  // away — only checked for a genuine load failure (404).
  const artAsset = useAssetAvailable(getBrandArtUrl(moment.image_path));
  const art = artAsset.src;
  const number = String(index + 1).padStart(2, "0");
  const { playHover, playClick } = useInteractionSound();

  return (
    <button
      type="button"
      onClick={() => {
        playClick();
        onOpen();
      }}
      onMouseEnter={playHover}
      aria-haspopup="dialog"
      aria-label={`Explore ${moment.title}`}
      className="group flex flex-col text-left cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-[0.25rem] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem] rounded-[0.5rem]"
      style={{ outlineColor: palette.accent }}
    >
      <p className="text-[0.75rem] font-bold tracking-[0.2em] uppercase" style={{ color: palette.accent }}>
        {number} — {moment.category || "Application"}
      </p>

      <div
        className="mt-[1rem] relative w-full aspect-[4/5] rounded-[1rem] overflow-hidden"
        style={{ backgroundColor: art && moment.image_fit === "cover" ? undefined : `${palette.onDark}14` }}
      >
        {art ? (
          <img
            src={art}
            alt={`${moment.title} — ${pitch.brand_name} × ${pitch.artist_name}`}
            className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
              moment.image_fit === "contain" ? "object-contain" : "object-cover"
            }`}
            onError={artAsset.onError}
            data-no-lazy="" // see ui.tsx SectionShell for why
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-[1.5rem] text-center" aria-hidden="true">
            <span className="text-[1.25rem] font-black leading-tight tracking-tight uppercase opacity-40">{moment.title}</span>
          </div>
        )}

        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-[1rem] right-[1rem] inline-flex items-center gap-[0.35rem] rounded-full bg-white/90 px-[0.875rem] py-[0.4rem] text-[0.6875rem] font-bold tracking-[0.1em] uppercase text-black shadow-[0_0.5rem_1.5rem_-0.25rem_rgba(0,0,0,0.4)] opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-[0.4rem] sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-300 motion-reduce:transition-none"
        >
          Explore →
        </span>
      </div>

      <h3 className="mt-[1.25rem] text-[1.125rem] sm:text-[1.25rem] font-bold tracking-tight">{moment.title}</h3>
      {moment.body && <p className="mt-[0.5rem] text-[0.9375rem] leading-relaxed opacity-75">{moment.body}</p>}
    </button>
  );
}
