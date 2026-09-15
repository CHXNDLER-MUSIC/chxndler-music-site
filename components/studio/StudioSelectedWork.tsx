"use client";

import React from "react";
import Link from "next/link";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useBrandAudio } from "@/components/brand-pitch/BrandAudioContext";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG, STUDIO_PINK } from "./identity";
import type { StudioWorkItem } from "./types";

function PlayPauseGlyph({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-[0.75rem] h-[0.75rem]">
      {playing ? (
        <>
          <rect x="5" y="4" width="3.4" height="12" rx="1" />
          <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
        </>
      ) : (
        <path d="M6.2 4.2L16.2 10L6.2 15.8V4.2Z" />
      )}
    </svg>
  );
}

/**
 * "Selected Work" — the main section of the homepage. Pulls its list
 * straight from the same brand_pitches summary every /brands/[slug] page's
 * "Explore the Studio" gallery already uses (see app/studio/page.tsx),
 * never a second hardcoded project list. An editorial, alternating-scale
 * grid rather than a uniform SaaS card wall: the first project (whatever it
 * is — sort_order-driven, not hardcoded to any one brand) gets a larger,
 * wider treatment; the rest sit in a tighter uniform grid beneath it.
 */
export default function StudioSelectedWork({ projects }: { projects: StudioWorkItem[] }) {
  if (projects.length === 0) return null;

  const [featured, ...rest] = projects;

  return (
    <SectionShell id="work" className="scroll-mt-[4.5rem]" style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }}>
      <Eyebrow color={STUDIO_PINK}>Selected Work</Eyebrow>
      <p className="max-w-[32rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed text-white/60">
        Original songs, sonic identities and campaigns built for global brands.
      </p>

      <div className="mt-[3rem] sm:mt-[4rem] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.75rem] sm:gap-[2.25rem]">
        <WorkCard project={featured} className="sm:col-span-2 lg:col-span-2" aspect="aspect-[4/5] sm:aspect-[21/9]" />
        {rest.map((project) => (
          <WorkCard key={project.slug} project={project} aspect="aspect-[4/5]" />
        ))}
      </div>
    </SectionShell>
  );
}

function WorkCard({
  project,
  aspect,
  className = "",
}: {
  project: StudioWorkItem;
  aspect: string;
  className?: string;
}) {
  const { activeId, playing, toggle } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();

  const isPreviewing = !!project.sonicPreviewUrl && activeId === project.sonicPreviewUrl && playing;

  return (
    <div className={`group ${className}`}>
      <Link
        href={project.href}
        onMouseEnter={playHover}
        onClick={playClick}
        className="relative block w-full overflow-hidden rounded-[0.75rem] border border-white/10 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
        style={{ outlineColor: STUDIO_PINK }}
      >
        <div className={`relative w-full ${aspect}`}>
          {project.coverArtUrl ? (
            <img
              src={project.coverArtUrl}
              alt={`${project.brandName} — ${project.projectTitle}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              data-no-lazy=""
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[2rem] font-black uppercase tracking-tight opacity-25">{project.brandName}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
          <span className="absolute bottom-[1.125rem] right-[1.125rem] inline-flex items-center gap-[0.35rem] rounded-full bg-white/90 px-[0.875rem] py-[0.4rem] text-[0.6875rem] font-bold tracking-[0.1em] uppercase text-black opacity-0 translate-y-[0.4rem] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 motion-reduce:transition-none">
            Explore →
          </span>
        </div>
      </Link>

      <div className="mt-[1rem] flex items-start justify-between gap-[1rem]">
        <div>
          <p className="text-[0.9375rem] sm:text-[1.0625rem] font-bold tracking-tight">{project.brandName}</p>
          <p className="mt-[0.125rem] text-[0.8125rem] text-white/50">{project.projectTitle}</p>
          <div className="mt-[0.625rem] flex flex-wrap items-center gap-[0.4rem]">
            <Tag>Original Music</Tag>
            {project.sonicPreviewUrl && <Tag>Sonic Identity</Tag>}
          </div>
        </div>

        {project.sonicPreviewUrl && (
          <button
            type="button"
            onClick={() => {
              playClick();
              toggle(project.sonicPreviewUrl!, project.sonicPreviewUrl!);
            }}
            onMouseEnter={playHover}
            aria-pressed={isPreviewing}
            aria-label={isPreviewing ? `Pause sonic ID for ${project.brandName}` : `Listen to sonic ID for ${project.brandName}`}
            className="flex-shrink-0 inline-flex items-center justify-center w-[2.25rem] h-[2.25rem] rounded-full border border-white/20 text-white/80 transition-colors duration-200 hover:border-current hover:text-[#ff3ea5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
            style={{ outlineColor: STUDIO_PINK }}
          >
            <PlayPauseGlyph playing={isPreviewing} />
          </button>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 px-[0.625rem] py-[0.2rem] text-[0.625rem] font-bold tracking-[0.1em] uppercase text-white/55">
      {children}
    </span>
  );
}
