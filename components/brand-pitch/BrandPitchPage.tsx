"use client";

import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import { buildPitchPalette } from "@/lib/brandPitchPalette";
import { createAssetRegistry } from "@/lib/brandPitchVisuals";
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
// UNDERSTAND WHO CREATED IT -> TAKE ACTION. Photography is a feature, not a
// background for every section: the hero, the one campaign-image break, and
// Hear the Concept (a derived "background 1.png") use a photo; everything
// else is a solid campaign color from lib/brandPitchPalette. BrandFit,
// BrandOffer, BrandPricing and BrandProcess
// still exist as components/data (nothing deleted) but are intentionally not
// part of this template's render — the "sales deck" layer an earlier pass
// moved away from.
export default function BrandPitchPage({ pitch }: { pitch: BrandPitch }) {
  const palette = buildPitchPalette(pitch);
  const year = pitch.year || new Date().getFullYear();

  // Cross-section image deduplication: whichever image the hero actually
  // renders (hero_art_path, falling back to cover_art_path exactly like
  // BrandHero itself does) is claimed immediately, before anything else
  // resolves — so no later section (the campaign image break, application
  // mockups, the collectible card) can ever accidentally reuse it. See
  // lib/brandPitchVisuals.
  const heroImageUrl = getBrandArtUrl(pitch.hero_art_path || pitch.cover_art_path);
  const assets = createAssetRegistry([heroImageUrl]);

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
          className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-[6vw] sm:px-[8vw] py-[1.5rem] sm:py-[1.75rem] pointer-events-none"
          style={{ color: "#ffffff", mixBlendMode: "difference" }}
        >
          <span className="pointer-events-auto font-bold tracking-[0.2em] text-[0.875rem] sm:text-[0.9375rem]">
            CHXNDLER
          </span>
          <span className="pointer-events-auto text-[0.6875rem] sm:text-[0.75rem] tracking-[0.2em] uppercase font-medium">
            Original Brand Concept / {year}
          </span>
        </header>

        <main>
          <BrandHero pitch={pitch} accent={palette.accent} year={year} />
          <CreativeIdea pitch={pitch} palette={palette} />
          <HearTheConcept pitch={pitch} palette={palette} assets={assets} />
          <SonicIdentity pitch={pitch} palette={palette} />
          <SecondaryCampaignImage pitch={pitch} assets={assets} />
          <BrandMoments pitch={pitch} palette={palette} assets={assets} />
          <Collectible pitch={pitch} palette={palette} assets={assets} />
          <BrandAbout pitch={pitch} palette={palette} />
          <BrandCTA pitch={pitch} palette={palette} />
        </main>
      </div>
    </BrandAudioProvider>
  );
}
