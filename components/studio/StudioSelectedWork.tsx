"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { SectionShell } from "@/components/brand-pitch/ui";
import { useBrandAudio } from "@/components/brand-pitch/BrandAudioContext";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG, STUDIO_PINK, STUDIO_BORDER } from "./identity";
import type { StudioWorkItem } from "./types";

function PlayPauseGlyph({ playing, className = "w-[0.8rem] h-[0.8rem]" }: { playing: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
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

function SparkleGlyph({ className = "w-[0.7rem] h-[0.7rem]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 1L12.3 7.7L19 10L12.3 12.3L10 19L7.7 12.3L1 10L7.7 7.7Z" />
    </svg>
  );
}

function ArrowGlyph({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-[0.9rem] h-[0.9rem]">
      <path
        d={direction === "left" ? "M12.5 4.5L6.5 10L12.5 15.5" : "M7.5 4.5L13.5 10L7.5 15.5"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Selected Work" — the record shelf. Every project gets identical 1:1
 * square cover art at identical size (no "featured" first item), presented
 * as a horizontal, peeking carousel rather than a grid: on any screen size
 * the next cover is deliberately cut off at the edge so the row reads as
 * "there is more to explore →", never as a finished/complete grid.
 *
 * Card widths are percentages of the scroll track itself (not the viewport),
 * so the peek amount is correct whether the track is edge-to-edge (mobile)
 * or sitting inside SectionShell's max-w-[75rem] column (desktop) — no
 * full-bleed breakout needed, and the browser's native overflow-x on the
 * track is the only thing that ever scrolls horizontally.
 *
 * Interaction: native touch swipe + trackpad scroll + scroll-snap need no
 * JS at all. Mouse click-and-drag is added on top for desktop mouse users
 * (a mouse wheel has no native horizontal axis the way a trackpad does).
 * Arrow buttons and left/right arrow keys move exactly one card. Nothing
 * ever autoplays or scrolls on its own.
 */
export default function StudioSelectedWork({ projects }: { projects: StudioWorkItem[] }) {
  if (projects.length === 0) return null;

  const { playHover, playClick } = useInteractionSound();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);

    const card = el.querySelector<HTMLElement>("[data-work-card]");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth;
    setCurrentIndex(Math.min(projects.length - 1, Math.round(el.scrollLeft / step)));
  }, [projects.length]);

  const scrollByCards = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-work-card]");
    const gap = 24;
    const amount = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.85;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * amount, behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByCards(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByCards(-1);
      }
    },
    [scrollByCards]
  );

  // Deliberately NOT using setPointerCapture: capturing the pointer on a
  // mousedown that started on a card's <Link> or <button> silently
  // re-targets the resulting "click" event to the capturing element (the
  // track), so the card's own click/button handler never fires — verified
  // this was breaking every card's play button and its link-through.
  // Tracking the drag via window-level listeners (added on pointerdown,
  // removed on pointerup) gets the same "keep following the mouse outside
  // the element" behavior without hijacking anyone's click target.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch/pen keep native scrolling untouched
    const el = trackRef.current;
    if (!el) return;
    isDragging.current = true;
    dragMoved.current = false;
    dragStartX.current = e.clientX;
    dragStartScroll.current = el.scrollLeft;

    const onMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - dragStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      el.scrollLeft = dragStartScroll.current - dx;
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  // Swallows the click that follows a real drag so releasing the mouse over
  // a card never also triggers its <Link> navigation.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved.current = false;
    }
  }, []);

  return (
    <SectionShell
      id="work"
      className="scroll-mt-[4.5rem] !py-[4rem] sm:!py-[5.5rem]"
      style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-[1.5rem]">
        <div>
          <h2
            className="font-bold uppercase leading-[0.98] tracking-tight text-[2.25rem] sm:text-[3.25rem] lg:text-[3.75rem]"
            style={{ color: STUDIO_PINK }}
          >
            Hear the Work
          </h2>
          <p className="mt-[1rem] max-w-[28rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed text-white/60">
            Original music + sonic identities for brands.
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        role="region"
        aria-label="Selected work — scroll or use the arrow keys to browse projects"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={updateEdges}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        className="chx-work-track mt-[2.5rem] sm:mt-[3.5rem] -mx-[6vw] sm:-mx-[8vw] px-[6vw] sm:px-[8vw] flex gap-[1.25rem] sm:gap-[1.5rem] overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-0.25rem]"
        style={{ WebkitOverflowScrolling: "touch", outlineColor: STUDIO_PINK }}
      >
        {projects.map((project) => (
          <WorkCard key={project.slug} project={project} />
        ))}
      </div>

      <div className="hidden sm:flex items-center justify-between gap-[1rem] mt-[2rem]">
        <p className="text-[0.75rem] font-semibold tracking-[0.2em] text-white/35 tabular-nums">
          {String(currentIndex + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
        </p>

        <div className="flex items-center gap-[0.625rem]">
          <button
            type="button"
            onClick={() => {
              playClick();
              scrollByCards(-1);
            }}
            onMouseEnter={playHover}
            disabled={atStart}
            aria-label="Previous project"
            className="inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full border border-white/20 text-white/80 transition-colors duration-200 hover:border-current hover:text-[#EF43A3] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
            style={{ outlineColor: STUDIO_PINK }}
          >
            <ArrowGlyph direction="left" />
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              scrollByCards(1);
            }}
            onMouseEnter={playHover}
            disabled={atEnd}
            aria-label="Next project"
            className="inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full border border-white/20 text-white/80 transition-colors duration-200 hover:border-current hover:text-[#EF43A3] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
            style={{ outlineColor: STUDIO_PINK }}
          >
            <ArrowGlyph direction="right" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .chx-work-track {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .chx-work-track::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </SectionShell>
  );
}

/**
 * The card separates two distinct actions: the artwork always navigates to
 * the internal /brands/[slug] project page (never plays audio), and a row
 * of compact audio-control pills underneath plays the full song / sonic
 * logo — both driven by the shared BrandAudioContext, so starting either
 * one here (or on any other card) stops whatever else was playing. A
 * project with no sonic-logo cut simply omits that pill rather than
 * rendering it disabled, so spacing stays consistent without an empty gap.
 */
function WorkCard({ project }: { project: StudioWorkItem }) {
  const { activeId, playing, toggle } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();

  const hasSong = !!project.fullSongId && !!project.fullSongUrl;
  const isSongPlaying = hasSong && activeId === project.fullSongId && playing;

  const hasSonic = !!project.sonicPreviewUrl;
  const isSonicPlaying = hasSonic && activeId === project.sonicPreviewUrl && playing;

  const playSong = () => {
    if (!hasSong) return;
    playClick();
    toggle(project.fullSongId!, project.fullSongUrl!);
  };
  const playSonic = () => {
    if (!hasSonic) return;
    playClick();
    toggle(project.sonicPreviewUrl!, project.sonicPreviewUrl!);
  };

  return (
    <div data-work-card className="group snap-start flex-shrink-0 w-[80%] sm:w-[45%] lg:w-[31%]">
      <Link
        href={project.href}
        onMouseEnter={playHover}
        onClick={playClick}
        draggable={false}
        aria-label={`View ${project.brandName} — ${project.projectTitle} project`}
        className="relative block w-full aspect-square rounded-[0.75rem] overflow-hidden border border-white/10 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
        style={{ outlineColor: STUDIO_PINK }}
      >
        {project.coverArtUrl ? (
          <img
            src={project.coverArtUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            data-no-lazy="" // see ui.tsx SectionShell — this whole page is SSR'd with real data, so
            // every image is already in the initial HTML; skips a hydration-mismatch race, not real lazy-loading
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-[1rem] text-center">
            <span className="text-[1.5rem] font-black uppercase tracking-tight opacity-25">{project.brandName}</span>
          </div>
        )}

        {/* Desktop-hover reveal only — mobile has no hover, and tapping the
            artwork already navigates directly, so there's nothing to reveal there. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/35">
          <span className="inline-flex items-center gap-[0.4rem] text-[0.8125rem] font-bold tracking-[0.1em] uppercase text-white opacity-0 translate-y-[0.35rem] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            View Project
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>

      <div className="mt-[0.875rem]">
        <p className="text-[0.9375rem] sm:text-[1.0625rem] font-bold tracking-tight">{project.projectTitle}</p>
        <p className="mt-[0.125rem] text-[0.8125rem] text-white/50">{project.brandName}</p>

        {(hasSong || hasSonic) && (
          <div className="mt-[0.625rem] flex flex-wrap items-center gap-[0.5rem]">
            {hasSong && (
              <AudioPill
                active={isSongPlaying}
                onClick={playSong}
                onMouseEnter={playHover}
                ariaLabel={isSongPlaying ? `Pause ${project.brandName} — ${project.projectTitle}` : `Play ${project.brandName} — ${project.projectTitle}`}
              >
                <PlayPauseGlyph playing={isSongPlaying} className="w-[0.65rem] h-[0.65rem]" />
                Full Song
              </AudioPill>
            )}
            {hasSonic && (
              <AudioPill
                active={isSonicPlaying}
                onClick={playSonic}
                onMouseEnter={playHover}
                ariaLabel={isSonicPlaying ? `Pause ${project.brandName} sonic logo` : `Play ${project.brandName} sonic logo`}
              >
                <SparkleGlyph className="w-[0.65rem] h-[0.65rem]" />
                Sonic Logo
              </AudioPill>
            )}
          </div>
        )}

        <Link
          href={project.href}
          onMouseEnter={playHover}
          onClick={playClick}
          className="group/link mt-[0.625rem] inline-flex items-center gap-[0.35rem] text-[0.8125rem] font-semibold text-white/70 transition-colors duration-200 hover:text-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] rounded-sm"
          style={{ outlineColor: STUDIO_PINK }}
        >
          View Project
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover/link:translate-x-[0.2rem]">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

function AudioPill({
  children,
  active,
  onClick,
  onMouseEnter,
  ariaLabel,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-[0.35rem] rounded-full border px-[0.8125rem] py-[0.625rem] text-[0.6875rem] font-bold tracking-[0.08em] uppercase leading-none transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
      style={{
        borderColor: active ? STUDIO_PINK : STUDIO_BORDER,
        color: active ? STUDIO_PINK : "rgba(255,255,255,0.75)",
        outlineColor: STUDIO_PINK,
      }}
    >
      {children}
    </button>
  );
}
