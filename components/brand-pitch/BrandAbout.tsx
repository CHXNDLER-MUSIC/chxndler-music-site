"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import type { PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell } from "./ui";
import StudioPortfolioLauncher, { type StudioProject } from "./StudioPortfolioLauncher";
import { useInteractionSound } from "./useInteractionSound";

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
const CHXNDLER_HEADLINE_LINE_2 = "BEHIND THE SOUND.";
const CHXNDLER_CREDENTIALS = "ARTIST · SONGWRITER · PRODUCER";
// The one accent word per line ("visual", "sonic") gets its own neon
// treatment — everything else in the statement stays one consistent color/weight.
const NEON_YELLOW = "#F5FF3D";

/**
 * The artist reveal/creative-director credit, now placed right before
 * LET'S TALK (BrandCTA) — an editorial signature, not a corporate team-bio
 * or an "About Me" block. A portrait (40%) and the creator's story (60%) sit
 * as one connected composition, vertically centered, framed rather than
 * floating in an oversized viewport. Visually it transitions OUT of the
 * brand's campaign world above it and into CHXNDLER's own dark, cinematic
 * identity — see the CHXNDLER_* constants above — right before the pitch
 * closes on the hot-pink BrandCTA ask.
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
  // Reuses the sitewide "pause" click cue (not the generic "click" one) for
  // this one interaction, per an explicit ask — the portrait is the only
  // brand-pitch element that plays it.
  const { playClick: playPortraitClick } = useInteractionSound({ clickKey: "pause" });
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
    <SectionShell
      id="about"
      className="!pt-[9rem] sm:!pt-[12rem] !pb-[9rem] sm:!pb-[12rem]"
      style={{ backgroundColor: CHXNDLER_BG, color: CHXNDLER_BODY }}
    >
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
            className="relative flex-shrink-0 mx-auto lg:mx-0 lg:order-2 w-[15rem] h-[15rem] sm:w-[19rem] sm:h-[19rem] md:w-[23rem] md:h-[23rem] lg:w-[29.5rem] lg:h-[29.5rem]"
          >
            <div
              className="absolute -inset-[20%] rounded-full blur-[6rem] pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${palette.accent}22 0%, ${CHXNDLER_CYAN}26 40%, ${CHXNDLER_PINK}14 66%, transparent 82%)`,
              }}
              aria-hidden="true"
            />
            {/* The whole portrait is a link out to CHXNDLER's own site (this
                site's homepage — the "brand" pages are a sub-section of it).
                No permanent caption; a hover-only glow ring, slight zoom and
                "EXPLORE CHXNDLER" label are the only affordances that it's
                clickable, so the editorial portrait treatment above stays
                intact at rest. */}
            <Link
              href="/"
              onClick={playPortraitClick}
              aria-label={`Visit ${pitch.artist_name}'s website`}
              className="group relative block w-full h-full rounded-full cursor-pointer"
            >
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: `0 0 2.5rem 0.35rem ${CHXNDLER_PINK}55` }}
                aria-hidden="true"
              />
              <img
                src={CHXNDLER_PHOTO}
                alt={pitch.artist_name}
                className="relative w-full h-full object-cover rounded-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                style={{ WebkitMaskImage: PORTRAIT_MASK, maskImage: PORTRAIT_MASK, objectPosition: "58% 50%" }}
                data-no-lazy="" // see ui.tsx SectionShell for why
              />
              <span
                className="absolute inset-x-0 bottom-[9%] flex justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                aria-hidden="true"
              >
                <span
                  className="text-[0.625rem] sm:text-[0.6875rem] font-bold tracking-[0.2em] uppercase px-[0.75rem] py-[0.35rem] rounded-full whitespace-nowrap"
                  style={{ color: "#ffffff", backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(0.25rem)" }}
                >
                  Explore CHXNDLER →
                </span>
              </span>
            </Link>
          </motion.div>

          {/* Copy — 60% column. Deliberate rhythm: eyebrow, headline, body,
              featured statement, then the role/signature line — no excessive
              gaps between them. */}
          <motion.div {...fade(0.12)} className="min-w-0 text-center lg:text-left lg:order-1 max-w-[34rem] mx-auto lg:mx-0">
            <Eyebrow color={palette.accent} style={{ fontSize: "0.9375rem" }}>
              {pitch.about_eyebrow || CHXNDLER_EYEBROW}
            </Eyebrow>

            <h3
              className="font-bold uppercase leading-[0.95] tracking-tight text-[2.5rem] sm:text-[3.5rem] lg:text-[4.25rem]"
              style={{ color: CHXNDLER_HEADLINE }}
            >
              {CHXNDLER_HEADLINE_LINE_1}
              <br />
              {CHXNDLER_HEADLINE_LINE_2}
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

            {/* Creator's mark — CHXNDLER's signature, centered on its own
                axis regardless of how the surrounding copy column aligns
                (center on mobile, left on desktop). */}
            <div className="mt-[0.125rem] flex flex-col items-center">
              {/* The source PNG has a lot of baked-in transparent padding above
                  the actual mark — pulled up to close that gap instead of just
                  trusting the box's own margin, or the visible ink would still
                  read far below the statement above it. */}
              <img
                src={CHXNDLER_SIGNATURE}
                alt="CHXNDLER"
                className="-mt-[1rem] sm:-mt-[1.25rem] h-[6.75rem] sm:h-[7.75rem] w-auto object-contain"
                data-no-lazy="" // see ui.tsx SectionShell for why
              />
            </div>

            {/* Portfolio launcher — same centered-on-its-own-axis treatment
                as the mark above, with its own breathing room so it reads as
                a deliberate closing beat, not an appendage. Renders nothing
                if the current pitch is the only published project. */}
            <div className="-mt-[1rem] sm:-mt-[1.25rem] flex justify-center">
              <StudioPortfolioLauncher projects={otherProjects} />
            </div>
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}
