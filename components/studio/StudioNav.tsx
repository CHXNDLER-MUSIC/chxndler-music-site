"use client";

import React from "react";
import { motion } from "framer-motion";
import { scrollToSection } from "./scrollTo";
import { STUDIO_PINK } from "./identity";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";

const LINKS: Array<{ id: string; label: string }> = [
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "about", label: "Studio" },
];

/**
 * Minimal, persistent nav for the whole /studio page — unlike the
 * brand-pitch template's `header` (a scrolls-away title card for the hero
 * underneath it, see BrandPitchPage.tsx), /studio is a long single-page
 * homepage where "WORK / SERVICES / ABOUT" need to be reachable from
 * anywhere, so this stays fixed. A flat translucent bar from the start (no
 * scroll-listener state) — /studio's hero is always a fixed near-black, not
 * a variable per-brand image, so it never needs the mix-blend-mode trick the
 * brand-pitch header relies on for legibility.
 *
 * The text wordmark sits dead-center of the bar (absolutely positioned, not
 * part of the flex flow — the detailed alien mark lives above the hero
 * headline instead, see StudioHero.tsx; repeating it here at nav size just
 * reads as clutter), with section links on the left and the "Start a
 * Project" CTA on the right.
 */
export default function StudioNav() {
  const { playHover, playClick } = useInteractionSound();

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    playClick();
    scrollToSection(id);
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-[1rem] px-[6vw] sm:px-[8vw] py-[1.375rem] sm:py-[1.5rem] backdrop-blur-md bg-[#08080B]/85 border-b border-white/[0.08]"
      style={{ color: "#ffffff" }}
    >
      <nav aria-label="Studio sections" className="hidden sm:flex items-center gap-[2rem] flex-1">
        {LINKS.map((link) => (
          <motion.a
            key={link.id}
            href={`#${link.id}`}
            onClick={go(link.id)}
            onMouseEnter={playHover}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="inline-block text-[0.75rem] font-semibold tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] rounded-sm"
            style={{ outlineColor: STUDIO_PINK }}
          >
            {link.label}
          </motion.a>
        ))}
      </nav>

      {/* Plain Tailwind hover:scale (not framer-motion) so it composites with
          the existing -translate-x-1/2 -translate-y-1/2 centering transform
          instead of a motion component's inline transform replacing it and
          breaking the centering. */}
      <a
        href="#hero"
        onClick={go("hero")}
        onMouseEnter={playHover}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.6875rem] sm:text-[0.75rem] font-bold tracking-[0.16em] uppercase text-white/90 hover:text-white hover:scale-[1.1] transition-[color,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] rounded-sm whitespace-nowrap"
        style={{ outlineColor: STUDIO_PINK }}
      >
        Chxndler Studio
      </a>

      <div className="flex flex-1 justify-end">
        <motion.a
          href="#start-a-project"
          onClick={go("start-a-project")}
          onMouseEnter={playHover}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-shrink-0 text-[0.6875rem] sm:text-[0.75rem] font-bold tracking-[0.16em] uppercase whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] rounded-sm"
          style={{ color: STUDIO_PINK, outlineColor: STUDIO_PINK }}
        >
          Start a Project
        </motion.a>
      </div>
    </header>
  );
}
