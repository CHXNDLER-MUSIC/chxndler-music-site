"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { scrollToSection } from "./scrollTo";
import { STUDIO_PINK } from "./identity";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";

export default function StudioHero() {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound();

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    playClick();
    scrollToSection(id);
  };

  return (
    <section
      id="hero"
      className="relative isolate flex flex-col justify-center min-h-[82svh] sm:min-h-[86svh] lg:min-h-[80svh] px-[6vw] sm:px-[8vw] pt-[6.5rem] pb-[3rem] sm:pb-[3.5rem] overflow-hidden"
    >
      {/* Understated backdrop — a hair of radial glow, nothing photographic. */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{ background: `radial-gradient(120% 90% at 50% 0%, ${STUDIO_PINK}14 0%, transparent 55%)` }}
      />

      <motion.div {...fade(0)} className="mx-auto text-center">
        <img
          src="/elements/chxndler-studio.png"
          alt="CHXNDLER STUDIO"
          className="mx-auto h-auto w-[11rem] sm:w-[13.5rem] lg:w-[15.25rem] mb-[1.5rem] sm:mb-[2.25rem]"
          data-no-lazy="" // see ui.tsx SectionShell for why
        />
        <h1 className="mx-auto max-w-[26rem] sm:max-w-[46rem] lg:max-w-[74rem] font-bold uppercase leading-[0.92] tracking-tight text-[2.35rem] sm:text-[4.5rem] lg:text-[6rem]">
          <span className="block text-white">We Give Brands</span>
          <span
            className="block"
            style={{
              backgroundImage: "linear-gradient(180deg, #ffffff 0%, #ffffff 45%, #c7c9d1 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            A Sound of Their Own.
          </span>
        </h1>

        {/* Mobile: a compact centered vertical stack, no bullets — the
            single-line desktop treatment at this width orphans "Creative
            Worlds" onto its own line, which reads as a layout mistake. */}
        <div className="sm:hidden mt-[1.5rem] flex flex-col items-center gap-[0.4rem] text-[0.875rem] tracking-[0.08em] uppercase font-medium text-white/40">
          <span>Original Music</span>
          <span>Sonic Identity</span>
          <span>Creative Worlds</span>
        </div>

        <p className="hidden sm:block mt-[1.5rem] text-[0.875rem] tracking-[0.08em] uppercase font-medium text-white/40">
          Original Music <span aria-hidden="true" className="mx-[0.5rem] text-white/25">•</span>
          Sonic Identity <span aria-hidden="true" className="mx-[0.5rem] text-white/25">•</span>
          Creative Worlds
        </p>
      </motion.div>

      <motion.div
        {...fade(0.15)}
        className="mt-[1.75rem] sm:mt-[3rem] flex flex-wrap items-center justify-center gap-[1rem] sm:gap-[1.25rem]"
      >
        <motion.a
          href="#work"
          onClick={go("work")}
          onMouseEnter={playHover}
          whileTap={{ scale: 0.97 }}
          className="group inline-flex items-center gap-[0.625rem] rounded-full px-[1.875rem] py-[1rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ backgroundColor: STUDIO_PINK, outlineColor: STUDIO_PINK }}
        >
          Hear the Work
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-y-[0.2rem]">
            ↓
          </span>
        </motion.a>
        <motion.a
          href="#start-a-project"
          onClick={go("start-a-project")}
          onMouseEnter={playHover}
          whileTap={{ scale: 0.97 }}
          className="group inline-flex items-center gap-[0.625rem] rounded-full border border-white/20 bg-[#0a0a0d] px-[1.875rem] py-[1rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase text-white/85 transition-colors duration-200 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ outlineColor: STUDIO_PINK }}
        >
          Start a Project
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-[0.2rem]">
            →
          </span>
        </motion.a>
      </motion.div>
    </section>
  );
}
