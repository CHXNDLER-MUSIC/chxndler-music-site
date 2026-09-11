"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import MediaViewerModal from "./MediaViewerModal";
import { useInteractionSound } from "./useInteractionSound";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import type { BrandPitch, BrandPitchMoment } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";

type MediaItem = { url: string; isVideo: boolean };

// PRODUCT/IRL/SOCIAL get a tailored presentation; any other author-entered
// category (e.g. a brand's "CAMPAIGN" or "EXPERIENCE" moment) still opens in
// the same viewer with the generic lookbook treatment — this is driven by
// the moment's own `category` string, never a brand slug.
type Presentation = "product" | "irl" | "social" | "generic";

function presentationFor(category: string): Presentation {
  const c = category.trim().toUpperCase();
  if (c === "PRODUCT") return "product";
  if (c === "IRL") return "irl";
  if (c === "SOCIAL") return "social";
  return "generic";
}

/** Hero image_path first, then auto-discovered extra assets, deduped by
 * resolved URL — mirrors how MomentCard resolves the hero image today. */
function buildMedia(moment: BrandPitchMoment): MediaItem[] {
  const items: MediaItem[] = [];
  const seen = new Set<string>();
  const push = (path: string | null, isVideo: boolean) => {
    const url = getBrandArtUrl(path);
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({ url, isVideo });
  };
  push(moment.image_path, false);
  for (const asset of moment.assets) push(asset.path, asset.isVideo);
  return items;
}

/**
 * The one reusable "campaign lookbook" viewer opened by every card in
 * BrandMoments (PRODUCT / IRL / SOCIAL / any future category) — built on the
 * shared MediaViewerModal for portal/focus-trap/scroll-lock/Escape/reduced-
 * motion, adding gallery navigation and a category-appropriate media stage.
 * Single-asset moments render with zero gallery chrome; multi-asset moments
 * automatically get a counter and prev/next.
 */
export default function CampaignDetailViewer({
  open,
  onClose,
  pitch,
  palette,
  moment,
  index,
}: {
  open: boolean;
  onClose: () => void;
  pitch: BrandPitch;
  palette: PitchPalette;
  moment: BrandPitchMoment | null;
  index: number;
}) {
  const { playHover, playClick } = useInteractionSound();
  const reduceMotion = !!useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const media = useMemo(() => (moment ? buildMedia(moment) : []), [moment]);
  const presentation = moment ? presentationFor(moment.category) : "generic";
  const momentKey = moment ? `${moment.category}|${moment.title}` : "";

  useEffect(() => {
    setActiveIndex(0);
  }, [momentKey]);

  // Preload the next still image only — never eagerly fetch video bytes.
  useEffect(() => {
    const next = media[activeIndex + 1];
    if (next && !next.isVideo && typeof window !== "undefined") {
      const img = new window.Image();
      img.src = next.url;
    }
  }, [media, activeIndex]);

  const canNav = media.length > 1;
  const goTo = (i: number) => setActiveIndex(((i % media.length) + media.length) % media.length);
  const goNext = () => {
    if (!canNav) return;
    playClick();
    goTo(activeIndex + 1);
  };
  const goPrev = () => {
    if (!canNav) return;
    playClick();
    goTo(activeIndex - 1);
  };

  useEffect(() => {
    if (!open || !canNav) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canNav, activeIndex, media.length]);

  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  if (!moment) return null;

  const number = String(index + 1).padStart(2, "0");
  const eyebrow = `${number} — ${moment.category || "Application"}`;

  return (
    <MediaViewerModal open={open} onClose={onClose} label={pitch.song_title} kind={pitch.brand_name} accent={palette.accent}>
      <div>
        <p className="text-[0.75rem] font-bold tracking-[0.2em] uppercase" style={{ color: palette.accent }}>
          {eyebrow}
        </p>
        <h3 className="mt-[0.5rem] text-[1.75rem] sm:text-[2.25rem] font-bold tracking-tight leading-[1.05] text-white">
          {moment.title}
        </h3>
        {moment.body && (
          <p className="mt-[0.75rem] text-[0.9375rem] sm:text-[1rem] leading-relaxed text-white/70 max-w-[36rem]">
            {moment.body}
          </p>
        )}

        <div
          className="mt-[1.5rem] sm:mt-[2rem]"
          onTouchStart={canNav ? onTouchStart : undefined}
          onTouchEnd={canNav ? onTouchEnd : undefined}
        >
          {presentation === "social" ? (
            <VerticalStage
              media={media}
              activeIndex={activeIndex}
              onSelect={goTo}
              reduceMotion={reduceMotion}
              playHover={playHover}
              playClick={playClick}
            />
          ) : (
            <LookbookStage media={media} activeIndex={activeIndex} reduceMotion={reduceMotion} />
          )}
        </div>

        {canNav && (
          <div className="mt-[1.25rem] flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              onMouseEnter={playHover}
              aria-label="Previous asset"
              className="inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-200 focus-visible:outline focus-visible:outline-2"
              style={{ outlineColor: palette.accent }}
            >
              <span aria-hidden="true" className="text-[1.25rem] leading-none">‹</span>
            </button>
            <span className="text-[0.75rem] font-semibold tracking-[0.25em] text-white/50">
              {String(activeIndex + 1).padStart(2, "0")} / {String(media.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={goNext}
              onMouseEnter={playHover}
              aria-label="Next asset"
              className="inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-200 focus-visible:outline focus-visible:outline-2"
              style={{ outlineColor: palette.accent }}
            >
              <span aria-hidden="true" className="text-[1.25rem] leading-none">›</span>
            </button>
          </div>
        )}
      </div>
    </MediaViewerModal>
  );
}

/** PRODUCT / IRL / generic: one large piece of art at a time, crossfading
 * between assets — a packaging or activation lookbook, not a carousel. */
function LookbookStage({
  media,
  activeIndex,
  reduceMotion,
}: {
  media: MediaItem[];
  activeIndex: number;
  reduceMotion: boolean;
}) {
  const item = media[activeIndex];
  if (!item) return null;

  return (
    <div className="flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.url}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {item.isVideo ? (
            <video
              src={item.url}
              controls
              playsInline
              preload="none"
              className="max-w-full max-h-[65vh] w-auto h-auto mx-auto block rounded-[0.75rem]"
            />
          ) : (
            <img
              src={item.url}
              alt=""
              className="max-w-full max-h-[65vh] w-auto h-auto mx-auto block rounded-[0.75rem]"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** SOCIAL: vertical (9:16) cuts browsed like a premium content strip — the
 * active cut centered at near-viewport height, neighbors peeking in at the
 * sides. Built on native scroll-snap rather than a carousel dependency. */
function VerticalStage({
  media,
  activeIndex,
  onSelect,
  reduceMotion,
  playHover,
  playClick,
}: {
  media: MediaItem[];
  activeIndex: number;
  onSelect: (i: number) => void;
  reduceMotion: boolean;
  playHover: () => void;
  playClick: () => void;
}) {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex, reduceMotion]);

  const single = media.length === 1;

  return (
    <div
      className={`flex items-center gap-[1rem] overflow-x-auto snap-x snap-mandatory py-[0.5rem] [&::-webkit-scrollbar]:hidden ${
        single ? "justify-center" : "px-[10vw] sm:px-[20vw]"
      }`}
      style={{ scrollbarWidth: "none" }}
    >
      {media.map((item, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={item.url}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            role={single || isActive ? undefined : "button"}
            tabIndex={single || isActive ? undefined : 0}
            aria-label={single || isActive ? undefined : `View asset ${i + 1}`}
            onClick={single || isActive ? undefined : () => { playClick(); onSelect(i); }}
            onKeyDown={
              single || isActive
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      playClick();
                      onSelect(i);
                    }
                  }
            }
            onMouseEnter={single || isActive ? undefined : playHover}
            className="snap-center flex-none transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: "min(78vw, 24rem)",
              opacity: isActive ? 1 : 0.35,
              transform: isActive ? "scale(1)" : "scale(0.86)",
              cursor: single || isActive ? "default" : "pointer",
            }}
          >
            <div className="w-full aspect-[9/16] rounded-[1rem] overflow-hidden bg-black/30" style={{ maxHeight: "72vh" }}>
              {item.isVideo ? (
                <video
                  src={item.url}
                  controls={isActive}
                  playsInline
                  preload="none"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
