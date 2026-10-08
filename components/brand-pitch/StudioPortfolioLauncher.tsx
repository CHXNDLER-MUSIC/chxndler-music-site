"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import MediaViewerModal from "./MediaViewerModal";
import { useInteractionSound } from "./useInteractionSound";
import { useBrandAudio } from "./BrandAudioContext";
import ArtistReleaseDetail from "./ArtistReleaseDetail";
import SkyVideoBackground from "./SkyVideoBackground";
import { releaseAudioId, releaseAudioSrc, releaseNowPlaying, type ArtistRelease } from "./artistRelease";

export type { ArtistRelease };

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

type Tab = "brand" | "artist";

/**
 * "EXPLORE THE STUDIO" — a compact trigger beneath the CHXNDLER/Heartverse
 * mark in BrandAbout that opens a portfolio overlay of every OTHER published
 * CHXNDLER STUDIO brand project (the current one is never in `projects` —
 * see app/brands/[slug]/page.tsx, which filters it out by slug before this
 * component ever renders). Nothing here is brand-specific: adding a row to
 * brand_pitches is enough for it to show up in every other pitch's gallery,
 * with zero per-page code.
 */
export default function StudioPortfolioLauncher({
  projects,
  releases = [],
}: {
  projects: StudioProject[];
  releases?: ArtistRelease[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(projects.length > 0 ? "brand" : "artist");
  // Slug of the release whose song view is open (Artist Releases tab only).
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Where the releases grid was scrolled to, so "Back" lands on the same row.
  const gridScrollTop = useRef(0);
  const pendingScroll = useRef<number | null>(null);
  // The release to focus once back on the grid, so keyboard users land on
  // the card they came from instead of the page body.
  const pendingFocusSlug = useRef<string | null>(null);
  const { playHover, playClick } = useInteractionSound();
  const audio = useBrandAudio();

  // The modal's own scroll container (see MediaViewerModal).
  const getScroller = () => panelRef.current?.closest<HTMLElement>("[data-modal-scroll]") ?? null;

  // Applied after the grid/song view swap has rendered.
  useLayoutEffect(() => {
    if (pendingScroll.current !== null) {
      const scroller = getScroller();
      if (scroller) scroller.scrollTop = pendingScroll.current;
      pendingScroll.current = null;
    }
    if (pendingFocusSlug.current) {
      panelRef.current
        ?.querySelector<HTMLElement>(`[data-release-slug="${CSS.escape(pendingFocusSlug.current)}"]`)
        ?.focus({ preventScroll: true });
      pendingFocusSlug.current = null;
    }
  }, [selectedSlug]);

  const openRelease = (slug: string) => {
    gridScrollTop.current = getScroller()?.scrollTop ?? 0;
    pendingScroll.current = 0;
    setSelectedSlug(slug);
    // Tapping a cover is the user gesture, so playback is allowed right away;
    // a song paused earlier resumes where it left off.
    const release = releases.find((r) => r.slug === slug);
    if (release) audio.play(releaseAudioId(slug), releaseAudioSrc(slug), releaseNowPlaying(release));
  };

  const closeRelease = () => {
    // Leaving the song view stops its song (back button and Escape alike).
    if (audio.activeId?.startsWith("release:")) audio.pause();
    pendingScroll.current = gridScrollTop.current;
    pendingFocusSlug.current = selectedSlug;
    setSelectedSlug(null);
  };

  if (projects.length === 0 && releases.length === 0) return null;

  // Only offer the toggle when both sides have something to show.
  const showTabs = projects.length > 0 && releases.length > 0;
  const activeTab: Tab = showTabs ? tab : projects.length > 0 ? "brand" : "artist";
  const selectedRelease = activeTab === "artist" ? releases.find((r) => r.slug === selectedSlug) ?? null : null;

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
        className="studio-launcher-btn group relative inline-flex items-center gap-[0.5rem] rounded-[0.375rem] border border-white/20 bg-[#0a0a0d] px-[1.625rem] py-[0.8125rem] text-[0.8125rem] font-bold uppercase tracking-[0.15em] text-white/80 transition-all duration-200 ease-out hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
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
          setSelectedSlug(null);
          // A release shouldn't keep playing once the modal is gone.
          if (audio.activeId?.startsWith("release:")) audio.pause();
          triggerRef.current?.focus();
        }}
        label="CHXNDLER Studio"
        kind="Other Projects"
        accent={PINK}
        maxWidthClassName="max-w-[68rem]"
        onEscape={
          selectedRelease
            ? () => {
                playClick();
                closeRelease();
              }
            : undefined
        }
        background={
          selectedRelease?.skyVideoUrl ? (
            <SkyVideoBackground key={selectedRelease.slug} url={selectedRelease.skyVideoUrl} />
          ) : undefined
        }
        header={
          selectedRelease ? (
            // Song view: just the way back — the gallery title and tabs return with the grid.
            <div className="pr-[2.5rem] -mt-[0.5rem] sm:-mt-[1rem] min-h-[2.5rem] flex items-center">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  closeRelease();
                }}
                onMouseEnter={playHover}
                className="inline-flex items-center gap-[0.4rem] rounded-full px-[0.25rem] py-[0.25rem] text-[0.75rem] font-bold uppercase tracking-[0.15em] text-white/70 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
                style={{ outlineColor: PINK }}
              >
                <span aria-hidden="true">←</span> Back to Artist Releases
              </button>
            </div>
          ) : (
            <div className="pr-[2.5rem]">
              <p className="text-[0.6875rem] font-bold tracking-[0.35em] uppercase" style={{ color: PINK }}>
                CHXNDLER STUDIO
              </p>
              <h2 className="mt-[0.375rem] text-[1.5rem] sm:text-[1.875rem] font-bold uppercase tracking-tight text-white">
                Other Projects
              </h2>
              <p className="mt-[0.375rem] text-[0.8125rem] text-white/50">
                {activeTab === "brand" ? "Original music + sonic identities for brands." : "Original CHXNDLER releases."}
              </p>
            </div>
          )
        }
      >
        {showTabs && !selectedRelease && (
          <div
            role="tablist"
            aria-label="Work type"
            className="mb-[1.25rem] sm:mb-[1.5rem] grid grid-cols-2 gap-[0.25rem] rounded-full bg-white/[0.04] p-[0.25rem]"
          >
            {(
              [
                ["brand", "Brand Projects"],
                ["artist", "Artist Releases"],
              ] as const
            ).map(([value, text]) => {
              const selected = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  id={`studio-tab-${value}`}
                  aria-selected={selected}
                  aria-controls={`studio-panel-${value}`}
                  onClick={() => {
                    playClick();
                    setTab(value);
                    setSelectedSlug(null);
                  }}
                  onMouseEnter={playHover}
                  className={`rounded-full px-[0.75rem] py-[0.625rem] sm:py-[0.75rem] text-[0.75rem] sm:text-[0.9375rem] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem] ${
                    selected ? "bg-white/[0.12] text-white" : "text-white/50 hover:text-white/80"
                  }`}
                  style={{ outlineColor: PINK }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        )}

        <div
          ref={panelRef}
          role={showTabs && !selectedRelease ? "tabpanel" : undefined}
          id={`studio-panel-${activeTab}`}
          aria-labelledby={showTabs && !selectedRelease ? `studio-tab-${activeTab}` : undefined}
        >
          {selectedRelease ? (
            <ArtistReleaseDetail key={selectedRelease.slug} release={selectedRelease} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-[1.25rem] sm:gap-[1.5rem]">
              {activeTab === "brand"
                ? projects.map((project) => (
                    <StudioProjectCard key={project.slug} project={project} onNavigate={playClick} onHover={playHover} />
                  ))
                : releases.map((release) => (
                    <ArtistReleaseCard
                      key={release.slug}
                      release={release}
                      onOpen={() => {
                        playClick();
                        openRelease(release.slug);
                      }}
                      onHover={playHover}
                    />
                  ))}
            </div>
          )}
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
        <p className="text-[0.9375rem] sm:text-[1.0625rem] font-bold uppercase tracking-[0.1em] text-white">{project.brandName}</p>
        <p className="mt-[0.125rem] text-[0.8125rem] sm:text-[0.875rem] text-white/50">{project.projectTitle}</p>
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

/** Release cover that opens its song view. While its song is playing (from
 * the song view), the card keeps a pink outline and progress bar so it's
 * easy to spot after going back to the grid. */
function ArtistReleaseCard({
  release,
  onOpen,
  onHover,
}: {
  release: ArtistRelease;
  onOpen: () => void;
  onHover: () => void;
}) {
  const { activeId, playing, currentTime, duration } = useBrandAudio();
  const isActive = activeId === releaseAudioId(release.slug);
  const progress = isActive && duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={onHover}
      aria-label={`Play ${release.title}`}
      data-release-slug={release.slug}
      className="release-card group block w-full text-left rounded-[0.5rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
      style={{ outlineColor: PINK }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[0.5rem] border bg-white/5"
        style={{
          aspectRatio: "1 / 1",
          borderColor: isActive ? `${PINK}aa` : "rgba(255,255,255,0.1)",
          boxShadow: isActive ? `0 0 1.5rem -0.5rem ${PINK}99` : undefined,
        }}
      >
        <img
          src={release.coverArt}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
          data-no-lazy="" // see ui.tsx SectionShell for why
        />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 flex items-end justify-center pb-[0.875rem]">
          <span className="inline-flex items-center gap-[0.35rem] rounded-full bg-black/70 px-[0.75rem] py-[0.3rem] text-[0.625rem] font-bold uppercase tracking-[0.15em] text-white">
            ▶ Play Song
          </span>
        </div>
        {isActive && playing && (
          <span className="pointer-events-none absolute top-[0.5rem] left-[0.5rem] rounded-full bg-black/70 px-[0.625rem] py-[0.25rem] text-[0.5625rem] font-bold uppercase tracking-[0.15em]" style={{ color: PINK }}>
            Now Playing
          </span>
        )}
        {isActive && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.25rem] bg-white/15">
            <div className="h-full" style={{ width: `${progress * 100}%`, background: PINK }} />
          </div>
        )}
      </div>
      <div className="mt-[0.625rem] text-center">
        <p className="text-[0.875rem] sm:text-[1rem] font-bold uppercase tracking-[0.08em] text-white break-words">{release.title}</p>
      </div>

      <style jsx>{`
        .release-card:hover > div {
          border-color: ${PINK}88 !important;
        }
      `}</style>
    </button>
  );
}
