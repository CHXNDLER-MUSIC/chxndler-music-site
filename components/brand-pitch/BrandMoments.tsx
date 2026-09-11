import React from "react";
import type { BrandPitch, BrandPitchMoment } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, useAssetAvailable } from "./ui";

/**
 * "How It Could Live" — one song expanding into a brand world, told as a
 * clean, uniform 3-column grid (same aspect ratio, same dimensions, same
 * text hierarchy for every card) so the whole section reads in about five
 * seconds: song -> primary use -> primary use -> primary use. The first
 * three campaign_uses entries are the primary cards; anything beyond that,
 * plus any configured application mockups, drops into a smaller, restrained
 * "Supporting Applications" row that never competes with the primary three.
 * A solid campaign-dark surface — no photographic background.
 */
export default function BrandMoments({
  pitch,
  palette,
  assets,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  assets: PitchAssetRegistry;
}) {
  const primaryMoments = pitch.campaign_uses.slice(0, 3);
  const extraMoments = pitch.campaign_uses.slice(3);

  // Campaign card imagery always renders as configured (see MomentCard/
  // SupportingTile below — never gated on claim()), but still registers as
  // "used" here, before the mockup claims right below, so a mockup field
  // that happens to be configured with the same file a card already uses
  // gets skipped instead of showing the identical photo twice.
  for (const m of [...primaryMoments, ...extraMoments]) {
    assets.claim(getBrandArtUrl(m.image_path));
  }

  const socialMockup = useAssetAvailable(assets.claim(getBrandArtUrl(pitch.social_mockup_path)));
  const campaignMockup = useAssetAvailable(assets.claim(getBrandArtUrl(pitch.campaign_mockup_path)));
  const eventMockup = useAssetAvailable(assets.claim(getBrandArtUrl(pitch.event_mockup_path)));
  const mockups = [
    { key: "social", label: "Social", asset: socialMockup },
    { key: "campaign", label: "Campaign", asset: campaignMockup },
    { key: "event", label: "Event", asset: eventMockup },
  ].filter((m): m is { key: string; label: string; asset: { src: string; onError: () => void } } => !!m.asset.src);

  if (!pitch.campaign_headline && !pitch.campaign_intro && primaryMoments.length === 0 && mockups.length === 0) return null;

  return (
    <SectionShell style={{ backgroundColor: palette.dark, color: palette.onDark }}>
      <Eyebrow color={palette.accent}>{pitch.campaign_eyebrow || "How It Could Live"}</Eyebrow>

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
            <MomentCard key={`${moment.category}-${moment.title}-${i}`} pitch={pitch} palette={palette} moment={moment} index={i} />
          ))}
        </div>
      )}

      {(extraMoments.length > 0 || mockups.length > 0) && (
        <div className="mt-[4rem] sm:mt-[5rem] pt-[3rem] border-t border-current/15">
          <p className="text-[0.75rem] font-semibold tracking-[0.15em] uppercase opacity-50">Supporting Applications</p>
          <div className="mt-[1.25rem] grid grid-cols-2 sm:grid-cols-4 gap-[1rem] sm:gap-[1.25rem]">
            {extraMoments.map((moment, i) => (
              <SupportingTile key={`${moment.category}-${moment.title}-${i}`} label={moment.title} imagePath={moment.image_path} />
            ))}
            {mockups.map((m) => (
              <div key={m.key} className="relative aspect-square rounded-[0.75rem] overflow-hidden">
                <img
                  src={m.asset.src}
                  alt={`${pitch.brand_name} ${m.label.toLowerCase()} application`}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={m.asset.onError}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function SupportingTile({ label, imagePath }: { label: string; imagePath: string | null }) {
  const artAsset = useAssetAvailable(getBrandArtUrl(imagePath));
  if (!artAsset.src) return null;
  return (
    <div className="relative aspect-square rounded-[0.75rem] overflow-hidden">
      <img src={artAsset.src} alt={label} className="absolute inset-0 w-full h-full object-cover" onError={artAsset.onError} />
    </div>
  );
}

function MomentCard({
  pitch,
  palette,
  moment,
  index,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  moment: BrandPitchMoment;
  index: number;
}) {
  // Campaign card imagery is author-configured content, never deduplicated
  // away — only checked for a genuine load failure (404).
  const artAsset = useAssetAvailable(getBrandArtUrl(moment.image_path));
  const art = artAsset.src;
  const number = String(index + 1).padStart(2, "0");

  return (
    <div className="flex flex-col">
      <p className="text-[0.75rem] font-bold tracking-[0.2em] uppercase" style={{ color: palette.accent }}>
        {number} — {moment.category || "Application"}
      </p>

      <div
        className="mt-[1rem] relative w-full aspect-[4/5] rounded-[1rem] overflow-hidden"
        style={art ? undefined : { backgroundColor: `${palette.onDark}14` }}
      >
        {art ? (
          <img
            src={art}
            alt={`${moment.title} — ${pitch.brand_name} × ${pitch.artist_name}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={artAsset.onError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-[1.5rem] text-center" aria-hidden="true">
            <span className="text-[1.25rem] font-black leading-tight tracking-tight uppercase opacity-40">{moment.title}</span>
          </div>
        )}
      </div>

      <h3 className="mt-[1.25rem] text-[1.125rem] sm:text-[1.25rem] font-bold tracking-tight">{moment.title}</h3>
      {moment.body && <p className="mt-[0.5rem] text-[0.9375rem] leading-relaxed opacity-75">{moment.body}</p>}
    </div>
  );
}
