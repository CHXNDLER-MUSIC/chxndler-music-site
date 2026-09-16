"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eyebrow, SectionShell, formatTime } from "@/components/brand-pitch/ui";
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

function ArrowGlyph({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="w-[1.05rem] h-[1.05rem]">
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

// Same value the track's gap-* utilities render at sm+ (mobile's 1.25rem/20px
// gap is close enough that using this one constant for step math everywhere
// never drifts visibly — scroll-snap silently absorbs the few px difference).
const CARD_GAP = 24;

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
 *
 * INFINITE LOOP: the track renders three copies of `projects` back to back
 * ([clone-before][real][clone-after]) and starts scrolled to the first card
 * of the middle (real) copy. Arrow/keyboard/drag navigation is completely
 * unaware of the loop — it just scrolls by one card, same as always. A
 * scroll-settle watcher (debounced off the native `scroll` event, since
 * `scrollend` isn't universal yet) checks whether the settled position has
 * drifted into a clone section and, if so, silently re-anchors `scrollLeft`
 * (no smooth animation) to the identical position in the real section —
 * since the clone is pixel-identical to the real card it's replacing, this
 * correction is invisible, which is what makes 06→01 feel like one
 * continuous slide rather than a reset. Clones are the same plain data
 * objects as the real projects (not separate audio/state), so a clone
 * mid-transition already shows the correct playing/hover state for free.
 */
export default function StudioSelectedWork({ projects }: { projects: StudioWorkItem[] }) {
  if (projects.length === 0) return null;

  const { playHover, playClick } = useInteractionSound();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const N = projects.length;
  // Three back-to-back copies so there's always a full real section's worth
  // of clone buffer on either side, regardless of how many cards are visible
  // at once or how many projects exist.
  const loopedProjects = useMemo(() => [...projects, ...projects, ...projects], [projects]);

  const measureStep = useCallback((el: HTMLDivElement) => {
    const card = el.querySelector<HTMLElement>("[data-work-card]");
    return card ? card.getBoundingClientRect().width + CARD_GAP : el.clientWidth;
  }, []);

  // Jump (no animation) to the start of the middle "real" copy before first
  // paint, so the loop buffer is invisible on load.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = N * measureStep(el);
    setCurrentIndex(0);
  }, [N, measureStep]);

  const handleScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const step = measureStep(el);
    const paddedIndex = step > 0 ? Math.round(el.scrollLeft / step) : 0;
    const real = ((paddedIndex % N) + N) % N;
    setCurrentIndex(real);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (isDragging.current) return; // re-checked on the next scroll/settle once released
      const elNow = trackRef.current;
      if (!elNow) return;
      const stepNow = measureStep(elNow);
      if (stepNow <= 0) return;
      const pNow = Math.round(elNow.scrollLeft / stepNow);
      if (pNow < N || pNow >= 2 * N) {
        const realNow = ((pNow % N) + N) % N;
        elNow.scrollLeft = (N + realNow) * stepNow;
      }
    }, 160);
  }, [N, measureStep]);

  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      const amount = measureStep(el);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollBy({ left: dir * amount, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [measureStep]
  );

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
      className="scroll-mt-[4.5rem] !pt-[4rem] sm:!pt-[5.5rem] !pb-[2rem] sm:!pb-[2.75rem]"
      style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }}
      backgroundImage="/elements/chxndler-studio-background.png"
    >
      <div className="flex flex-wrap items-end justify-between gap-[1.5rem]">
        <div>
          <Eyebrow color={STUDIO_PINK} style={{ fontSize: "1.3rem" }}>
            Hear the Work
          </Eyebrow>
          <p className="mt-[0.25rem] text-[0.8125rem] sm:text-[1.3125rem] lg:text-[1.4375rem] leading-relaxed whitespace-nowrap text-white/60">
            Songs, sounds and worlds built for brands.
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        role="region"
        aria-label="Selected work — scroll or use the arrow keys to browse projects"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        className="chx-work-track mt-[1.5rem] sm:mt-[2.25rem] -mx-[6vw] sm:-mx-[8vw] px-[6vw] sm:px-[8vw] flex gap-[1.25rem] sm:gap-[1.5rem] overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-0.25rem]"
        style={{ WebkitOverflowScrolling: "touch", outlineColor: STUDIO_PINK }}
      >
        {loopedProjects.map((project, i) => {
          const isClone = i < N || i >= 2 * N;
          return <WorkCard key={`${i < N ? "before" : i < 2 * N ? "real" : "after"}-${project.slug}`} project={project} inert={isClone} />;
        })}
      </div>

      <div className="hidden sm:flex flex-col items-center gap-[0.625rem] mt-[1.5rem]">
        <div className="flex items-center gap-[0.875rem]">
          <button
            type="button"
            onClick={() => {
              playClick();
              scrollByCards(-1);
            }}
            onMouseEnter={playHover}
            aria-label="Previous project"
            className="inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full border border-white/20 text-white/80 transition-all duration-200 hover:scale-110 hover:border-current hover:text-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
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
            aria-label="Next project"
            className="inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full border border-white/20 text-white/80 transition-all duration-200 hover:scale-110 hover:border-current hover:text-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
            style={{ outlineColor: STUDIO_PINK }}
          >
            <ArrowGlyph direction="right" />
          </button>
        </div>

        <p className="text-[0.75rem] font-semibold tracking-[0.2em] text-white/35 tabular-nums">
          {String(currentIndex + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
        </p>
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
 * The card now has exactly one interaction model, applied consistently
 * across every project: the artwork itself IS the full-song play/pause
 * control (album artwork behaves like album artwork), a small pill below
 * plays the sonic logo, and campaign navigation happens only through the
 * "Explore the Campaign" link — never by clicking the cover. All audio
 * (song or sonic logo, on this card or any other) is driven by the single
 * shared BrandAudioContext element, so starting one always stops whatever
 * else was playing — there is no separate bookkeeping to get wrong here.
 */
function WorkCard({ project, inert = false }: { project: StudioWorkItem; inert?: boolean }) {
  const { activeId, playing, currentTime, duration, toggle } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();

  const hasSong = !!project.fullSongId && !!project.fullSongUrl;
  const isSongPlaying = hasSong && activeId === project.fullSongId && playing;

  const hasSonic = !!project.sonicPreviewUrl;
  const isSonicPlaying = hasSonic && activeId === project.sonicPreviewUrl && playing;

  const isThisProjectPlaying = isSongPlaying || isSonicPlaying;

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

  const coverArt = project.coverArtUrl ? (
    <img
      src={project.coverArtUrl}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      data-no-lazy="" // see ui.tsx SectionShell — this whole page is SSR'd with real data, so
      // every image is already in the initial HTML; skips a hydration-mismatch race, not real lazy-loading
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center px-[1rem] text-center">
      <span className="text-[1.5rem] font-black uppercase tracking-tight opacity-25">{project.brandName}</span>
    </div>
  );

  return (
    <div data-work-card className="group snap-start flex-shrink-0 w-[80%] sm:w-[45%] lg:w-[31%]" aria-hidden={inert || undefined}>
      {hasSong ? (
        <button
          type="button"
          tabIndex={inert ? -1 : undefined}
          onClick={playSong}
          onMouseEnter={playHover}
          aria-pressed={isSongPlaying}
          aria-label={
            isSongPlaying
              ? `Pause ${project.projectTitle} — ${project.brandName}`
              : `Play ${project.projectTitle} — ${project.brandName}`
          }
          className="relative block w-full aspect-square rounded-[0.75rem] overflow-hidden border border-white/10 bg-white/5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
          style={{ outlineColor: STUDIO_PINK }}
        >
          {coverArt}

          {/* Desktop-hover reveal; also shown (not just on hover) while this
              card's song is playing, so a listener who moves the mouse away
              still sees the artwork reflect its own state. Mobile has no
              hover — tapping just toggles play/pause directly. */}
          <div
            className={`pointer-events-none absolute inset-0 hidden lg:flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25 ${
              isSongPlaying ? "lg:bg-black/25" : ""
            }`}
          >
            <span
              className={`inline-flex items-center gap-[0.45rem] text-[0.8125rem] font-bold tracking-[0.1em] uppercase text-white opacity-0 translate-y-[0.35rem] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 ${
                isSongPlaying ? "lg:opacity-100 lg:translate-y-0" : ""
              }`}
            >
              <PlayPauseGlyph playing={isSongPlaying} className="w-[0.7rem] h-[0.7rem]" />
              {isSongPlaying ? "Pause" : "Play Song"}
            </span>
          </div>
        </button>
      ) : (
        <div
          className="relative block w-full aspect-square rounded-[0.75rem] overflow-hidden border border-white/10 bg-white/5"
          aria-hidden="true"
        >
          {coverArt}
        </div>
      )}

      <div className="mt-[0.875rem]">
        <p className="text-[1.1875rem] sm:text-[1.3125rem] font-bold tracking-tight">{project.projectTitle}</p>
        <p className="mt-[0.125rem] text-[1rem] text-white/50">{project.brandName}</p>

        <div className="mt-[0.625rem] min-h-[2.1875rem] flex flex-wrap items-center gap-[0.5rem]">
          {hasSonic && (
            <AudioPill
              active={isSonicPlaying}
              onClick={playSonic}
              onMouseEnter={playHover}
              tabIndex={inert ? -1 : undefined}
              ariaLabel={isSonicPlaying ? `Pause ${project.brandName} sonic logo` : `Play ${project.brandName} sonic logo`}
            >
              <PlayPauseGlyph playing={isSonicPlaying} className="w-[0.6rem] h-[0.6rem]" />
              Sonic Logo
            </AudioPill>
          )}
        </div>

        {isThisProjectPlaying && <NowPlaying currentTime={currentTime} duration={duration} />}

        <Link
          href={project.href}
          onMouseEnter={playHover}
          onClick={playClick}
          tabIndex={inert ? -1 : undefined}
          className="group/link mt-[0.875rem] inline-flex items-center gap-[0.4rem] rounded-full border border-white/[0.12] px-[1rem] py-[0.4375rem] text-[0.9375rem] font-bold uppercase tracking-[0.04em] text-[#EF43A3] transition-all duration-[250ms] hover:scale-110 hover:border-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
          style={{ outlineColor: STUDIO_PINK }}
        >
          View Full Campaign
          <span aria-hidden="true" className="inline-block transition-transform duration-[250ms] group-hover/link:translate-x-[0.25rem]">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

/** Compact, non-interactive progress readout — reuses the shared audio
 * element's own currentTime/duration rather than tracking anything new, so
 * it costs nothing extra to keep accurate. */
function NowPlaying({ currentTime, duration }: { currentTime: number; duration: number }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="mt-[0.625rem] flex items-center gap-[0.5rem]" aria-hidden="true">
      <span className="text-[0.625rem] font-bold tracking-[0.15em] uppercase" style={{ color: STUDIO_PINK }}>
        Now Playing
      </span>
      <div className="relative h-[2px] w-[3.5rem] rounded-full bg-white/15 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: STUDIO_PINK }} />
      </div>
      <span className="text-[0.625rem] tabular-nums text-white/40">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

function AudioPill({
  children,
  active,
  onClick,
  onMouseEnter,
  ariaLabel,
  tabIndex,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  ariaLabel: string;
  tabIndex?: number;
}) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-[0.35rem] rounded-full border px-[0.8125rem] py-[0.625rem] text-[0.6875rem] font-bold tracking-[0.08em] uppercase leading-none transition-all duration-200 hover:scale-110 hover:border-[#EF43A3] hover:text-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem] ${
        active ? "border-[#EF43A3] text-[#EF43A3]" : "border-white/[0.12] text-white/75"
      }`}
      style={{ outlineColor: STUDIO_PINK }}
    >
      {children}
    </button>
  );
}
