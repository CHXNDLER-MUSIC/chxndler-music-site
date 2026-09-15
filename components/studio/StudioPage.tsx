"use client";

import React from "react";
import { BrandAudioProvider } from "@/components/brand-pitch/BrandAudioContext";
import StudioNav from "./StudioNav";
import StudioHero from "./StudioHero";
import StudioSelectedWork from "./StudioSelectedWork";
import StudioServices from "./StudioServices";
import StudioManifesto from "./StudioManifesto";
import StudioSonicIdentity from "./StudioSonicIdentity";
import StudioCreatedBy from "./StudioCreatedBy";
import StudioFinalCTA from "./StudioFinalCTA";
import StudioFooter from "./StudioFooter";
import { STUDIO_BG } from "./identity";
import type { StudioWorkItem } from "./types";

// Client assembly, mirroring BrandPitchPage.tsx's role for /brands/[slug]:
// one shared BrandAudioProvider so a card preview, the Sonic Identity
// section, and (if a visitor clicks through) any per-brand player all share
// a single underlying <audio> element — never two clips audible at once.
export default function StudioPage({ projects }: { projects: StudioWorkItem[] }) {
  return (
    <BrandAudioProvider>
      <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }}>
        <StudioNav />
        {/* See BrandPitchPage.tsx — neutralizes the sitewide `main { background:
            radial-gradient(...) }` rule (meant for the homepage cockpit UI)
            that would otherwise bleed a cyan gradient through this page. */}
        <main className="bg-none">
          <StudioHero />
          <StudioSelectedWork projects={projects} />
          <StudioServices />
          <StudioManifesto />
          <StudioSonicIdentity projects={projects} />
          <StudioCreatedBy />
          <StudioFinalCTA />
        </main>
        <StudioFooter />
      </div>
    </BrandAudioProvider>
  );
}
