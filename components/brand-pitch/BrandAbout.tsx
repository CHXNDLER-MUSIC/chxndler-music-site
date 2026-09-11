import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell } from "./ui";
import StartButton from "@/components/StartButton";

// CHXNDLER's own identity photo — the same across every brand pitch page,
// not per-brand content, so it lives locally rather than in Supabase.
const CHXNDLER_PHOTO = "/elements/CHXNDLER.jpg";

// This section is the one deliberate break from every brand's own campaign
// palette (the light backgrounds / brand-accent colors every section above
// uses) into a fixed, universal CHXNDLER creator identity — same look
// regardless of which brand's pitch this is, never driven by
// palette/pitch.about_background_*. Values match the sitewide CHXNDLER brand
// colors used elsewhere (the HeartCoin gem-button pink and StartButton's own
// cyan glow in app/globals.css), so this section reads as "the same CHXNDLER"
// a visitor sees anywhere else on the site, not an Oatly-specific treatment.
const CHXNDLER_BG = "#08080C";
const CHXNDLER_PINK = "#ff3ea5";
const CHXNDLER_CYAN = "#19E3FF";
const CHXNDLER_HEADLINE = "#FFFFFF";
const CHXNDLER_BODY = "#C9C9D0";

// Tiny inline film-grain texture (generated, not a photo) — kept at very low
// opacity purely for depth, per the "sleek, not busy" brief.
const GRAIN_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

// Feathers the very top of the circular portrait so the hairline fades out
// past a hard edge instead of being guillotined by one — reads as an
// editorial crop breaking the frame rather than an avatar stamped in a
// circle. Applied as a mask (not overflow/border-radius) so the fade is
// soft, not a hard clip.
const PORTRAIT_MASK = "radial-gradient(ellipse 50% 52% at 50% 46%, #000 94%, transparent 100%)";

// Like CHXNDLER_PHOTO above, this eyebrow/headline pairing is CHXNDLER's own
// fixed signature line — not brand content — so it's a constant here rather
// than a per-pitch field every brand row has to duplicate by hand.
const CHXNDLER_EYEBROW = "Created by CHXNDLER";
const CHXNDLER_HEADLINE_TEXT = "Meet CHXNDLER";

/**
 * The closing signature of the pitch, after LET'S TALK — a creative credit,
 * not a corporate team-bio. A large, editorial circular portrait anchors the
 * section (not a small avatar), paired with an oversized name treatment.
 * Visually it intentionally transitions OUT of the brand's campaign world
 * (the hot-pink BrandCTA section right above it) and into CHXNDLER's own
 * dark, cinematic identity — see the CHXNDLER_* constants above.
 */
export default function BrandAbout({
  pitch,
  palette,
  assets,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  assets: PitchAssetRegistry;
}) {
  if (!pitch.about_body) return null;

  return (
    <SectionShell style={{ backgroundColor: CHXNDLER_BG, color: CHXNDLER_BODY }}>
      <div className="relative">
        {/* Atmosphere only — no literal space graphics, just a hair of grain
            for depth. The cyan/pink glow itself lives with the portrait
            below so it reads as coming from the photo, not the page. */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN_URL}")` }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-[3rem] sm:gap-[3.5rem] lg:gap-[6rem]">
          {/* Portrait — large editorial circle, not an avatar. No card
              border/container: the glow and the feathered top edge are the
              only framing. */}
          <div className="relative flex-shrink-0 w-[12rem] h-[12rem] sm:w-[15.25rem] sm:h-[15.25rem] md:w-[18.75rem] md:h-[18.75rem] lg:w-[24.5rem] lg:h-[24.5rem]">
            <div
              className="absolute -inset-[18%] rounded-full blur-[4rem] pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${CHXNDLER_CYAN}59 0%, ${CHXNDLER_PINK}26 42%, transparent 72%)`,
              }}
              aria-hidden="true"
            />
            <img
              src={CHXNDLER_PHOTO}
              alt={pitch.artist_name}
              className="relative w-full h-full object-cover rounded-full"
              style={{ WebkitMaskImage: PORTRAIT_MASK, maskImage: PORTRAIT_MASK }}
            />
          </div>

          <div className="flex-1 text-center lg:text-left max-w-[32rem]">
            <Eyebrow color={CHXNDLER_PINK}>{pitch.about_eyebrow || CHXNDLER_EYEBROW}</Eyebrow>
            <h3
              className="font-bold leading-[1.05] tracking-tight text-[2.25rem] sm:text-[3rem] lg:text-[3.25rem]"
              style={{ color: CHXNDLER_HEADLINE }}
            >
              {CHXNDLER_HEADLINE_TEXT}
            </h3>
            {pitch.about_body && (
              <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed mx-auto lg:mx-0" style={{ color: CHXNDLER_BODY }}>
                {pitch.about_body}
              </p>
            )}
            <div className="mt-[2rem] flex justify-center lg:justify-start">
              <StartButton
                size={104}
                ariaLabel="Visit chxndler.world"
                onClick={() => window.open("https://chxndler.world", "_blank", "noopener,noreferrer")}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
