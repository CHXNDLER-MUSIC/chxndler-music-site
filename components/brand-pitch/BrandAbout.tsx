"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell } from "./ui";
import StartButton from "@/components/StartButton";
import { useInteractionSound } from "./useInteractionSound";
import StudioPortfolioLauncher, { type StudioProject } from "./StudioPortfolioLauncher";

// CHXNDLER's own identity photo and wordmark signature — the same across
// every brand pitch page, not per-brand content, so they live locally rather
// than in Supabase.
const CHXNDLER_PHOTO = "/elements/CHXNDLER.jpg";
const CHXNDLER_SIGNATURE = "/elements/PINK SIGNATURE.png";

// This section is the one deliberate break from every brand's own campaign
// palette (the light backgrounds / brand-accent colors every section above
// uses) into a fixed, universal CHXNDLER creator identity — same look
// regardless of which brand's pitch this is, never driven by
// palette/pitch.about_background_*. Values match the sitewide CHXNDLER brand
// colors used elsewhere (the HeartCoin gem-button pink and StartButton's own
// cyan glow in app/globals.css), so this section reads as "the same CHXNDLER"
// a visitor sees anywhere else on the site, not an Oatly-specific treatment.
// The current pitch's own `palette.accent` is woven in only as a handful of
// subtle touches (eyebrow, portrait glow, divider, the featured line) so the
// section still feels connected to whichever brand pitch it's on.
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

// This whole copy block is CHXNDLER's own fixed creator-credit signature —
// true regardless of which brand pitch it appears on — not per-brand
// content, so it's a constant here rather than a field every brand row has
// to duplicate by hand. `pitch.about_eyebrow` is still honored as an
// explicit per-pitch override (existing architecture, unchanged); nothing
// else here reads from Supabase.
const CHXNDLER_EYEBROW = "CREATED BY CHXNDLER";
const CHXNDLER_HEADLINE_LINE_1 = "THE ARTIST";
const CHXNDLER_HEADLINE_LINE_2 = "BEHIND THE SONG.";
const CHXNDLER_CREDENTIALS = "ARTIST · SONGWRITER · PRODUCER";
// The one accent word per line ("visual", "sonic") gets its own neon
// treatment — everything else in the statement stays one consistent color/weight.
const NEON_YELLOW = "#F5FF3D";

/**
 * The closing signature of the pitch, after LET'S TALK — an editorial artist
 * reveal/creative-director credit, not a corporate team-bio or an "About Me"
 * block. A portrait (40%) and the creator's story (60%) sit as one connected
 * composition, vertically centered, framed rather than floating in an
 * oversized viewport. Visually it intentionally transitions OUT of the
 * brand's campaign world (the hot-pink BrandCTA section right above it) and
 * into CHXNDLER's own dark, cinematic identity — see the CHXNDLER_*
 * constants above.
 */
export default function BrandAbout({
  pitch,
  palette,
  assets,
  otherProjects,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  assets: PitchAssetRegistry;
  /** Every OTHER published brand project — the current pitch is already
   * excluded by the caller (app/brands/[slug]/page.tsx), derived from the
   * brand_pitches row's own slug, never a route/pathname check here. */
  otherProjects: StudioProject[];
}) {
  const reduceMotion = useReducedMotion();
  // The Heartverse mark gets its own signature click sound (star.mp3, same
  // as the collectible card) rather than the generic sitewide click — same
  // "you found something special" beat, template-wide, not brand-specific.
  const { playHover, playClick } = useInteractionSound({ clickKey: "star" });
  if (!pitch.about_body) return null;

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.35 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <SectionShell style={{ backgroundColor: CHXNDLER_BG, color: CHXNDLER_BODY }}>
      <div className="relative flex items-center">
        {/* Atmosphere only — no literal space graphics, just a hair of grain
            for depth. The cyan/pink/accent glow itself lives with the
            portrait below so it reads as coming from the photo, not the page. */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN_URL}")` }}
          aria-hidden="true"
        />

        <div className="relative w-full grid grid-cols-1 lg:grid-cols-[2fr_3fr] items-center gap-[2rem] sm:gap-[2.5rem] lg:gap-[3rem]">
          {/* Portrait — 40% column on desktop, ~9% smaller than the prior
              pass so it reads as editorial rather than a profile avatar. No
              card border/container: the atmospheric glow and the feathered
              top edge are the only framing, so it feels embedded in the page
              rather than pasted on top of it. */}
          <motion.div
            {...fade(0)}
            className="relative flex-shrink-0 mx-auto lg:mx-0 w-[9rem] h-[9rem] sm:w-[11.5rem] sm:h-[11.5rem] md:w-[14rem] md:h-[14rem] lg:w-[18rem] lg:h-[18rem]"
          >
            <div
              className="absolute -inset-[20%] rounded-full blur-[6rem] pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${palette.accent}22 0%, ${CHXNDLER_CYAN}26 40%, ${CHXNDLER_PINK}14 66%, transparent 82%)`,
              }}
              aria-hidden="true"
            />
            <img
              src={CHXNDLER_PHOTO}
              alt={pitch.artist_name}
              className="relative w-full h-full object-cover rounded-full"
              style={{ WebkitMaskImage: PORTRAIT_MASK, maskImage: PORTRAIT_MASK, objectPosition: "58% 50%" }}
              data-no-lazy="" // see ui.tsx SectionShell for why
            />
          </motion.div>

          {/* Copy — 60% column. Deliberate rhythm: eyebrow, headline, body,
              featured statement, then the role/signature line — no excessive
              gaps between them. */}
          <motion.div {...fade(0.12)} className="text-center lg:text-left max-w-[34rem] mx-auto lg:mx-0">
            <Eyebrow color={palette.accent} style={{ fontSize: "0.9375rem" }}>
              {pitch.about_eyebrow || CHXNDLER_EYEBROW}
            </Eyebrow>

            <h3
              className="font-bold uppercase leading-[0.95] tracking-tight text-[2.5rem] sm:text-[3.5rem] lg:text-[4.25rem]"
              style={{ color: CHXNDLER_HEADLINE }}
            >
              {CHXNDLER_HEADLINE_LINE_1}
              <br />
              <span className="whitespace-nowrap">{CHXNDLER_HEADLINE_LINE_2}</span>
            </h3>

            <p
              className="mt-[0.75rem] text-[0.6875rem] sm:text-[0.75rem] font-semibold tracking-[0.25em] uppercase"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {CHXNDLER_CREDENTIALS}
            </p>

            {pitch.about_body && (
              <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed mx-auto lg:mx-0" style={{ color: CHXNDLER_BODY }}>
                {pitch.about_body}
              </p>
            )}

            {/* Featured statement — the creative philosophy, given more
                weight than the biography but deliberately smaller than the
                headline so it never competes with it. Always centered on its
                own, regardless of how the surrounding copy column aligns
                (center on mobile, left on desktop) — it reads as a standalone
                pull-quote/mantra, not body copy. Both lines share one color/
                weight; only the one accent word per line ("visual", "sonic")
                breaks out in bold neon yellow. */}
            <p
              className="mt-[1.5rem] text-center text-[1.1875rem] sm:text-[1.3125rem] leading-snug italic"
              style={{ color: CHXNDLER_HEADLINE }}
            >
              <span className="block">
                Every brand has a <span className="font-bold" style={{ color: NEON_YELLOW }}>visual</span> identity.
              </span>
              <span className="block">
                Why not a <span className="font-bold" style={{ color: NEON_YELLOW }}>sonic</span> one?
              </span>
            </p>

            {/* Creator's mark — one centered lockup, always on its own axis
                regardless of how the surrounding copy column aligns (center
                on mobile, left on desktop): CHXNDLER's signature with THE
                HEARTVERSE directly beneath it, then the interactive blue
                Heartverse button centered underneath the whole lockup with
                real breathing room — never beside it. The wrapper's scoped
                override tones down StartButton's own cyan glow (shared
                sitewide, so its base styling stays untouched) so the mark
                stays a controlled, intentional finishing detail rather than
                the oversized glow of the earlier design. */}
            <div className="mt-[0.125rem] flex flex-col items-center gap-[1rem] chxndler-mark">
              <div className="flex flex-col items-center">
                {/* The source PNG has a lot of baked-in transparent padding above
                    the actual mark — pulled up to close that gap instead of just
                    trusting the box's own margin, or the visible ink would still
                    read far below the statement above it. */}
                <img
                  src={CHXNDLER_SIGNATURE}
                  alt="CHXNDLER"
                  className="-mt-[1rem] sm:-mt-[1.25rem] h-[5.5rem] sm:h-[6.5rem] w-auto object-contain"
                  data-no-lazy="" // see ui.tsx SectionShell for why
                />
                <span className="-mt-[0.5rem] sm:-mt-[0.625rem] text-[0.6875rem] font-semibold tracking-[0.25em] uppercase text-white">
                  THE HEARTVERSE
                </span>
              </div>
              <div onMouseEnter={playHover}>
                <StartButton
                  size={112}
                  pulse={false}
                  ariaLabel="Visit chxndler.world"
                  onClick={() => {
                    playClick();
                    window.open("https://chxndler.world", "_blank", "noopener,noreferrer");
                  }}
                />
              </div>
            </div>

            {/* Portfolio launcher — same centered-on-its-own-axis treatment
                as the mark above, with its own breathing room so it reads as
                a deliberate closing beat, not an appendage. Renders nothing
                if the current pitch is the only published project. */}
            <div className="mt-[1.75rem] flex justify-center">
              <StudioPortfolioLauncher projects={otherProjects} />
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .chxndler-mark :global(.chx-icon) {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))
            drop-shadow(0 0 4px rgba(25, 227, 255, 0.12)) !important;
        }
      `}</style>
    </SectionShell>
  );
}
