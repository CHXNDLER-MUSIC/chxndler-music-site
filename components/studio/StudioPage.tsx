"use client";

import React from "react";
import { BrandAudioProvider } from "@/components/brand-pitch/BrandAudioContext";
import StudioNav from "./StudioNav";
import StudioHero from "./StudioHero";
import StudioSelectedWork from "./StudioSelectedWork";
import StudioServices from "./StudioServices";
import StudioCreatedBy from "./StudioCreatedBy";
import StudioFinalCTA from "./StudioFinalCTA";
import StudioFooter from "./StudioFooter";
import StudioSectionDivider from "./StudioSectionDivider";
import { STUDIO_BG } from "./identity";
import type { StudioWorkItem } from "./types";

// Client assembly, mirroring BrandPitchPage.tsx's role for /brands/[slug]:
// one shared BrandAudioProvider so a Selected Work card preview and (if a
// visitor clicks through) any per-brand player all share a single
// underlying <audio> element — never two clips audible at once.
export default function StudioPage({ projects }: { projects: StudioWorkItem[] }) {
  return (
    <BrandAudioProvider>
      <div className="relative isolate min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }}>
        {/* Fixed to the viewport (not the page) so the image is always sized
            to the screen — sized to the full page instead, "cover" would
            scale it up to match the page's scroll height and turn it blurry. */}
        <div className="fixed inset-0 -z-10" aria-hidden="true">
          <img src="/elements/chxndler-studio-background.png" alt="" className="h-full w-full object-cover" data-no-lazy="" />
        </div>

        <StudioNav />
        {/* See BrandPitchPage.tsx — neutralizes the sitewide `main { background:
            radial-gradient(...) }` rule (meant for the homepage cockpit UI)
            that would otherwise bleed a cyan gradient through this page. */}
        <main className="bg-none">
          <StudioHero />
          <StudioSelectedWork projects={projects} />
          <StudioSectionDivider targetId="services" />
          <StudioServices />
          <StudioSectionDivider targetId="about" />
          <StudioCreatedBy />
          <StudioSectionDivider targetId="start-a-project" />
          <StudioFinalCTA />
        </main>
        <StudioFooter />
      </div>
    </BrandAudioProvider>
  );
}
