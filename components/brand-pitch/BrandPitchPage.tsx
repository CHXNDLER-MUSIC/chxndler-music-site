"use client";

import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { buildPitchPalette } from "@/lib/brandPitchPalette";
import { createAssetRegistry, getHeroImageCandidates } from "@/lib/brandPitchVisuals";
import { BrandAudioProvider } from "./BrandAudioContext";
import BrandHero from "./BrandHero";
import CreativeIdea from "./CreativeIdea";
import HearTheConcept from "./HearTheConcept";
import SonicIdentity from "./SonicIdentity";
import SecondaryCampaignImage from "./SecondaryCampaignImage";
import BrandMoments from "./BrandMoments";
import Collectible from "./Collectible";
import BrandAbout from "./BrandAbout";
import BrandCTA from "./BrandCTA";
import BrandSectionDivider from "./BrandSectionDivider";
import type { StudioProject } from "./StudioPortfolioLauncher";

// The narrative spine, in order: ENTER THE WORLD (hero) -> UNDERSTAND THE
// IDEA -> HEAR IT -> UNDERSTAND THE BRAND ASSET -> SEE THE WORLD (one
// campaign image) -> UNDERSTAND HOW IT SCALES -> SEE THE COLLECTIBLE ->
// TAKE ACTION (LET'S TALK) -> UNDERSTAND WHO CREATED IT. The CTA sits before
// the creator signature, not after, so the conversion moment never gets
// buried below an about section. Photography is a feature, not a background
// for every section: the hero ("background 1.png"), the one campaign-image
// break, and Hear the Concept ("background 2.png") use a photo; Idea, Sonic
// Identity and How It Could Live are solid campaign colors with an optional
// subtle atmosphere texture (background_textures[]); Collectible
// ("background 3.png") and Created by CHXNDLER (its own
// about_background_image_path/about_background_color) each get an
// independent, fully configurable background — never hardcoded to any brand.
// The "sales deck" layer an earlier pass moved away from (fit/offer/pricing/
// process) was removed entirely (see git history) rather than kept as dead
// components — their brand_pitches columns (fit_points, deliverables,
// pricing_*, process_steps) still exist and are still parsed by lib/brandPitch.ts,
// just unrendered, so no content was lost if this template wants them back.
export default function BrandPitchPage({
  pitch,
  otherProjects = [],
}: {
  pitch: BrandPitch;
  /** Every OTHER published brand project, for the "EXPLORE THE STUDIO"
   * gallery in BrandAbout — see app/brands/[slug]/page.tsx, which fetches
   * the canonical brand_pitches list and excludes the current slug. */
  otherProjects?: StudioProject[];
}) {
  const palette = buildPitchPalette(pitch);
  const year = pitch.year || new Date().getFullYear();

  // Cross-section image deduplication: whichever image the hero actually
  // renders (its own "background 1.png" -> hero_art_path -> cover_art_path
  // chain — see getHeroImageCandidates) is claimed immediately, before
  // anything else resolves, so no later section (Hear the Concept's
  // "background 2.png", How It Could Live's "background 3.png", the campaign
  // image break, application mockups, the collectible card) can ever
  // accidentally reuse it.
  const assets = createAssetRegistry([getHeroImageCandidates(pitch)[0] ?? null]);

  // Exposed as CSS custom properties at the page root so any section (now or
  // later) can reach the campaign palette via var(--campaign-*) instead of
  // needing the color threaded through as a prop.
  const themeVars = {
    backgroundColor: palette.primary,
    color: palette.onPrimary,
    "--campaign-primary": palette.primary,
    "--campaign-secondary": palette.secondary,
    "--campaign-accent": palette.accent,
    "--campaign-light": palette.light,
    "--campaign-dark": palette.dark,
  } as React.CSSProperties;

  return (
    <BrandAudioProvider>
      <div className="min-h-screen w-full overflow-x-hidden" style={themeVars}>
        {/* mix-blend-mode makes the year label legible over any hero backdrop
            (light, dark, image, video) without brand-specific logic — white
            text inverts against whatever sits beneath it. The wordmark is a
            detailed chrome graphic rather than flat text, so it opts out of
            that same blend (which would invert its own shading into noise)
            and instead centers itself with its own drop-shadow for legibility.
            Deliberately `absolute`, not `fixed`: this is a title card for the
            hero underneath it, not a persistent nav — it scrolls away with the
            hero instead of staying pinned over every section beneath it. */}
        <header
          className="absolute top-0 inset-x-0 z-40 flex items-center justify-end gap-[1rem] pl-[6vw] pr-[7vw] sm:pl-[8vw] sm:pr-[9.5vw] py-[1.25rem] sm:py-[1.5rem] pointer-events-none"
          style={{ color: "#ffffff", mixBlendMode: "difference" }}
        >
          <img
            src="/elements/chxndler-studio.png"
            alt="CHXNDLER STUDIO"
            className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[7.5rem] sm:h-[9.5rem] w-auto drop-shadow-[0_0.125rem_0.5rem_rgba(0,0,0,0.55)]"
            style={{ mixBlendMode: "normal" }}
            data-no-lazy="" // see ui.tsx SectionShell for why
          />
          <span className="pointer-events-auto text-right text-[0.6875rem] sm:text-[0.75rem] tracking-[0.2em] uppercase font-medium">
            Original Brand Concept / {year}
          </span>
        </header>

        {/* globals.css has an unscoped `main { background: radial-gradient(...) }`
            rule intended for the homepage's cockpit UI — it cascades to ANY
            page rendering a bare <main>, this one included. Every brand pitch
            up to now has masked it with an opaque hero image; a pitch with no
            hero art (its only content is a faint accent-tinted wash) exposes
            that cyan gradient bleeding straight through. Neutralized locally
            here rather than touching the shared global rule, which other
            unrelated pages (login, profile, ...) still depend on as-is. */}
        <main className="bg-none">
          <BrandHero pitch={pitch} accent={palette.accent} year={year} />
          <BrandSectionDivider targetId="idea" />
          <CreativeIdea pitch={pitch} palette={palette} />
          <BrandSectionDivider targetId="hear-the-concept" />
          <HearTheConcept pitch={pitch} palette={palette} assets={assets} />
          <BrandSectionDivider targetId="sonic-identity" />
          <SonicIdentity pitch={pitch} palette={palette} />
          {/* No divider directly around SecondaryCampaignImage — it renders
              nothing when the pitch has no unique secondary image, and a
              divider pinned to either side of it would then sit right next
              to another one with nothing between them. */}
          <SecondaryCampaignImage pitch={pitch} assets={assets} />
          <BrandMoments pitch={pitch} palette={palette} />
          <BrandSectionDivider targetId="collectible" />
          <Collectible pitch={pitch} palette={palette} assets={assets} />
          <BrandSectionDivider targetId="about" />
          <BrandAbout pitch={pitch} palette={palette} assets={assets} otherProjects={otherProjects} />
          <BrandSectionDivider targetId="cta" />
          <BrandCTA pitch={pitch} palette={palette} />
        </main>
      </div>
    </BrandAudioProvider>
  );
}
