"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import MediaViewerModal from "./MediaViewerModal";
import { useInteractionSound } from "./useInteractionSound";

// Same fixed CHXNDLER identity colors BrandAbout.tsx uses for this section —
// this launcher lives inside that same universal (non-brand-tinted) block,
// so it intentionally never reads the current pitch's own campaign palette.
const PINK = "#ff3ea5";

/** The shape every /brands/[slug] page already reduces its brand_pitches row
 * to for this gallery — see BrandPitchSummary in lib/brandPitch.ts, the
 * canonical source this is built from. `coverArt` and `href` are resolved
 * once, server-side, by the page that fetches the list. */
export type StudioProject = {
  slug: string;
  brandName: string;
  projectTitle: string;
  coverArt: string | null;
  href: string;
};

/**
 * "EXPLORE THE STUDIO" — a compact trigger beneath the CHXNDLER/Heartverse
 * mark in BrandAbout that opens a portfolio overlay of every OTHER published
 * CHXNDLER STUDIO brand project (the current one is never in `projects` —
 * see app/brands/[slug]/page.tsx, which filters it out by slug before this
 * component ever renders). Nothing here is brand-specific: adding a row to
 * brand_pitches is enough for it to show up in every other pitch's gallery,
 * with zero per-page code.
 */
export default function StudioPortfolioLauncher({ projects }: { projects: StudioProject[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { playHover, playClick } = useInteractionSound();

  if (projects.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          playClick();
          setOpen(true);
        }}
        onMouseEnter={playHover}
        className="studio-launcher-btn group relative inline-flex items-center gap-[0.5rem] rounded-[0.375rem] border border-white/20 bg-[#0a0a0d] px-[1.375rem] py-[0.6875rem] text-[0.75rem] font-bold uppercase tracking-[0.15em] text-white/80 transition-all duration-200 ease-out hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
        style={{ outlineColor: PINK }}
      >
        EXPLORE THE WORK
        <span aria-hidden="true" className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-[0.2rem]">
          →
        </span>
      </button>

      <MediaViewerModal
        open={open}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        label="CHXNDLER Studio"
        kind="Other Projects"
        accent={PINK}
        maxWidthClassName="max-w-[68rem]"
        header={
          <div className="pr-[2.5rem]">
            <p className="text-[0.6875rem] font-bold tracking-[0.35em] uppercase" style={{ color: PINK }}>
              CHXNDLER STUDIO
            </p>
            <h2 className="mt-[0.375rem] text-[1.5rem] sm:text-[1.875rem] font-bold uppercase tracking-tight text-white">
              Other Projects
            </h2>
            <p className="mt-[0.375rem] text-[0.8125rem] text-white/50">Original music + sonic identities for brands.</p>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[1.25rem] sm:gap-[1.5rem]">
          {projects.map((project) => (
            <StudioProjectCard key={project.slug} project={project} onNavigate={playClick} onHover={playHover} />
          ))}
        </div>
      </MediaViewerModal>

      <style jsx>{`
        .studio-launcher-btn:hover {
          border-color: ${PINK};
          box-shadow: 0 0 1.25rem -0.25rem ${PINK}66;
        }
      `}</style>
    </>
  );
}

function StudioProjectCard({
  project,
  onNavigate,
  onHover,
}: {
  project: StudioProject;
  onNavigate: () => void;
  onHover: () => void;
}) {
  return (
    <Link
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      onMouseEnter={onHover}
      className="studio-card group block rounded-[0.5rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
      style={{ outlineColor: PINK }}
    >
      <div className="relative w-full overflow-hidden rounded-[0.5rem] border border-white/10 bg-white/5" style={{ aspectRatio: "1 / 1" }}>
        {project.coverArt && (
          <img
            src={project.coverArt}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
            data-no-lazy="" // see ui.tsx SectionShell for why
          />
        )}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 flex items-end justify-center pb-[0.875rem]">
          <span className="inline-flex items-center gap-[0.35rem] rounded-full bg-black/70 px-[0.75rem] py-[0.3rem] text-[0.625rem] font-bold uppercase tracking-[0.15em] text-white">
            View Project →
          </span>
        </div>
      </div>
      <div className="mt-[0.625rem] text-center">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-white">{project.brandName}</p>
        <p className="mt-[0.125rem] text-[0.6875rem] text-white/50">{project.projectTitle}</p>
      </div>

      <style jsx>{`
        .studio-card > div {
          transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
        }
        .studio-card:hover > div {
          border-color: ${PINK}88;
          box-shadow: 0 0 1.5rem -0.5rem ${PINK}77;
        }
      `}</style>
    </Link>
  );
}
