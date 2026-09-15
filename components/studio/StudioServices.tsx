"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { scrollToSection } from "./scrollTo";
import { STUDIO_BG_ALT, STUDIO_PINK } from "./identity";

const SERVICES = [
  {
    number: "01",
    title: "Original Music",
    body: "Original songs built around your brand, culture and audience — made to live beyond the campaign.",
  },
  {
    number: "02",
    title: "Sonic Identity",
    body: "Ownable sonic signatures and recurring sounds people recognize in seconds.",
  },
  {
    number: "03",
    title: "Creative Worlds",
    body: "We turn the sound into visuals, content, campaigns and real-world experiences.",
  },
];

// No per-service sub-pages exist yet — each "Explore" scrolls to Selected
// Work (the only place the studio's output actually lives) rather than a
// fabricated route. Swap to a dedicated destination per service if/when one exists.
const EXPLORE_ID = "work";

/** Typography-led, deliberately restrained — no gradient cards, no icons, no borders-as-decoration. */
export default function StudioServices() {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound();

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <SectionShell
      id="services"
      className="scroll-mt-[4.5rem] !py-[2.75rem] sm:!py-[3.5rem]"
      style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}
    >
      <Eyebrow color={STUDIO_PINK}>How We Make Brands Heard</Eyebrow>

      <div className="mt-[1.75rem] sm:mt-[2.25rem] grid grid-cols-1 sm:grid-cols-3 gap-[1.75rem] sm:gap-[2rem] divide-y sm:divide-y-0 divide-white/10">
        {SERVICES.map((service, i) => (
          <motion.div
            key={service.number}
            {...fade(i * 0.08)}
            className="group pt-[1.75rem] sm:pt-0 first:pt-0 sm:border-l sm:first:border-l-0 sm:pl-[2rem] sm:first:pl-0 border-white/10 hover:border-white/25 transition-colors duration-300"
          >
            <p className="text-[0.8125rem] font-bold tracking-[0.2em] text-[#EF43A3]/60 transition-colors duration-300 group-hover:text-[#EF43A3]">
              {service.number}
            </p>
            <h3 className="mt-[0.75rem] font-bold uppercase tracking-tight text-[1.5rem] sm:text-[1.75rem] text-white/90 transition-colors duration-300 group-hover:text-white">
              {service.title}
            </h3>
            <p className="mt-[0.875rem] text-[1rem] leading-relaxed text-white/60 max-w-[22rem] transition-colors duration-300 group-hover:text-white/70">
              {service.body}
            </p>

            <a
              href={`#${EXPLORE_ID}`}
              onMouseEnter={playHover}
              onClick={(e) => {
                e.preventDefault();
                playClick();
                scrollToSection(EXPLORE_ID);
              }}
              className="mt-[1.125rem] inline-flex items-center gap-[0.35rem] text-[0.8125rem] font-semibold tracking-[0.08em] uppercase text-white/50 transition-colors duration-300 group-hover:text-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] rounded-sm"
              style={{ outlineColor: STUDIO_PINK }}
            >
              Explore
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 group-hover:translate-x-[0.25rem]"
              >
                →
              </span>
            </a>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
