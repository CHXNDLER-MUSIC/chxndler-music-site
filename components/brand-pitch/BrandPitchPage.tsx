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
// BrandFit, BrandOffer, BrandPricing and BrandProcess still exist as
// components/data (nothing deleted) but are intentionally not part of this
// template's render — the "sales deck" layer an earlier pass moved away from.
export default function BrandPitchPage({ pitch }: { pitch: BrandPitch }) {
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
        {/* mix-blend-mode makes this legible over any hero backdrop (light, dark, image, video)
            without brand-specific logic — white text inverts against whatever sits beneath it. */}
        <header
          className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-[1rem] pl-[6vw] pr-[7vw] sm:pl-[8vw] sm:pr-[9.5vw] py-[1.5rem] sm:py-[1.75rem] pointer-events-none"
          style={{ color: "#ffffff", mixBlendMode: "difference" }}
        >
          <span className="pointer-events-auto flex-shrink-0 font-bold tracking-[0.2em] text-[0.875rem] sm:text-[0.9375rem]">
            CHXNDLER STUDIO
          </span>
          <span className="pointer-events-auto text-right text-[0.6875rem] sm:text-[0.75rem] tracking-[0.2em] uppercase font-medium">
            Original Brand Concept / {year}
          </span>
        </header>

        <main>
          <BrandHero pitch={pitch} accent={palette.accent} year={year} />
          <CreativeIdea pitch={pitch} palette={palette} />
          <HearTheConcept pitch={pitch} palette={palette} assets={assets} />
          <SonicIdentity pitch={pitch} palette={palette} />
          <SecondaryCampaignImage pitch={pitch} assets={assets} />
          <BrandMoments pitch={pitch} palette={palette} />
          <Collectible pitch={pitch} palette={palette} assets={assets} />
          <BrandCTA pitch={pitch} palette={palette} />
          <BrandAbout pitch={pitch} palette={palette} assets={assets} />
        </main>
      </div>
    </BrandAudioProvider>
  );
}
