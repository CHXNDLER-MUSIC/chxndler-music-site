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
        {!selectedRelease && activeTab === "brand" && (
          <div className="mt-[1.5rem] border-t border-white/[0.08] pt-[1.25rem] text-center">
            <Link
              href="/collab"
              onClick={playClick}
              onMouseEnter={playHover}
              className="inline-flex items-center gap-[0.45rem] text-[0.7rem] font-bold uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white"
            >
              Explore all collaborations <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
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
  const { playHover, playClick } = useInteractionSound();
  const isActive = activeId === releaseAudioId(release.slug);
  const progress = isActive && duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="release-card w-full rounded-[0.5rem]" data-release-slug={release.slug}>
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={onHover}
        aria-label={`Play ${release.title}`}
        className="release-artwork group block w-full text-left rounded-[0.5rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
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
      </button>
      <div className="mt-[0.625rem] flex items-center justify-center gap-[0.5rem]">
        {[
          { label: "Spotify", href: release.spotifyUrl, color: "#1ed760", icon: <><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor"/><path d="M7 9.1c3.5-1.05 7.45-.65 10.2 1.05M7.7 12c2.8-.8 6.05-.5 8.4.95m-7.65 1.95c2.05-.55 4.35-.3 6.1.75" fill="none" stroke="#111" strokeWidth="1.3" strokeLinecap="round"/></> },
          { label: "Apple Music", href: release.appleMusicUrl, color: "#fa2d48", icon: <path d="M16.37 1.43c0 1.14-.42 2.2-1.23 3.17-.98 1.16-2.16 1.83-3.43 1.72a3.5 3.5 0 0 1-.03-.43c0-1.1.48-2.27 1.33-3.2.43-.49.98-.9 1.63-1.22.64-.31 1.25-.49 1.82-.52.03.16.04.32.04.48ZM20.5 15.3c-.24.56-.53 1.08-.87 1.57-.47.68-.85 1.15-1.13 1.42-.43.45-.89.68-1.38.69-.35 0-.77-.1-1.26-.31-.49-.2-.94-.3-1.35-.3-.43 0-.89.1-1.39.3-.5.21-.9.32-1.21.33-.47.02-.94-.21-1.4-.7-.3-.3-.69-.79-1.17-1.48a10.3 10.3 0 0 1-1.25-2.48c-.38-1.02-.58-2-.58-2.94 0-1.09.24-2.02.71-2.78a4.1 4.1 0 0 1 1.46-1.48 3.9 3.9 0 0 1 1.97-.55c.39 0 .9.12 1.53.36.63.24 1.04.36 1.23.36.14 0 .6-.14 1.38-.42.74-.26 1.36-.37 1.86-.33 1.37.11 2.4.65 3.09 1.63-1.22.74-1.83 1.78-1.82 3.13.01 1.05.4 1.94 1.16 2.66.34.32.72.57 1.14.75-.09.26-.2.52-.32.77Z"/> },
          { label: "YouTube", href: release.youtubeUrl, color: "#ff0033", icon: <><path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.56 12 3.56 12 3.56s-7.55 0-9.4.52A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.52 9.4.52 9.4.52s7.55 0 9.4-.52a3 3 0 0 0 2.1-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8Z" fill="currentColor"/><path d="m9.6 15.6 6.3-3.6-6.3-3.6v7.2Z" fill="#111"/></> },
        ].filter((platform) => !!platform.href).map((platform) => (
          <a
            key={platform.label}
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Listen to ${release.title} on ${platform.label}`}
            title={platform.label}
            onClick={(event) => { event.stopPropagation(); playClick(); }}
            onMouseEnter={playHover}
            className="inline-flex h-[2.25rem] w-[2.25rem] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-transform hover:scale-110 hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: platform.color, outlineColor: platform.color }}
          >
            <svg viewBox="0 0 24 24" className="h-[1rem] w-[1rem]" fill="currentColor" aria-hidden="true">{platform.icon}</svg>
          </a>
        ))}
      </div>

      <style jsx>{`
        .release-card:hover .release-artwork > div:first-child {
          border-color: ${PINK}88 !important;
        }
      `}</style>
    </div>
  );
}
