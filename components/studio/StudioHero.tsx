"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import AmbientSignal from "./AmbientSignal";
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
      className="relative isolate flex flex-col justify-center min-h-[100svh] px-[6vw] sm:px-[8vw] pt-[6rem] pb-[5rem] overflow-hidden"
    >
      {/* Understated backdrop — a hair of radial glow, nothing photographic. */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{ background: `radial-gradient(120% 90% at 50% 0%, ${STUDIO_PINK}14 0%, transparent 55%)` }}
      />

      <motion.div {...fade(0)} className="max-w-[62rem] mx-auto text-center">
        <p className="text-[0.75rem] sm:text-[0.8125rem] tracking-[0.35em] uppercase font-semibold text-white/50 mb-[1.5rem]">
          CHXNDLER STUDIO
        </p>

        <h1
          className="font-bold uppercase leading-[0.96] tracking-tight break-words text-[2.15rem] sm:text-[4.75rem] lg:text-[6.25rem]"
          style={{
            backgroundImage: "linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #c7c9d1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          We Make Brands
          <br className="hidden sm:block" /> Sound Unforgettable.
        </h1>

        <p className="mt-[1.75rem] text-[1rem] sm:text-[1.1875rem] tracking-[0.08em] uppercase font-medium text-white/60">
          Original Music <span aria-hidden="true" className="mx-[0.5rem] text-white/30">•</span>
          Sonic Identity <span aria-hidden="true" className="mx-[0.5rem] text-white/30">•</span>
          Creative Direction
        </p>
      </motion.div>

      <motion.div
        {...fade(0.15)}
        className="mt-[3rem] flex flex-wrap items-center justify-center gap-[1rem] sm:gap-[1.25rem]"
      >
        <motion.a
          href="#work"
          onClick={go("work")}
          onMouseEnter={playHover}
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-[0.625rem] rounded-full px-[1.875rem] py-[1rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ backgroundColor: STUDIO_PINK, outlineColor: STUDIO_PINK }}
        >
          Hear the Work
        </motion.a>
        <motion.a
          href="#start-a-project"
          onClick={go("start-a-project")}
          onMouseEnter={playHover}
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-[0.625rem] rounded-full border border-white/20 bg-[#0a0a0d] px-[1.875rem] py-[1rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase text-white/85 transition-colors duration-200 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ outlineColor: STUDIO_PINK }}
        >
          Start a Project
        </motion.a>
      </motion.div>

      <div className="mt-[3.5rem] sm:mt-[4.5rem] h-[3rem] sm:h-[3.5rem] max-w-[42rem] w-full mx-auto">
        <AmbientSignal className="h-full" />
      </div>
    </section>
  );
}
