"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionShell } from "@/components/brand-pitch/ui";
import { STUDIO_BG, STUDIO_PINK } from "./identity";

/** The studio's manifesto/differentiator — the most memorable visual moment
 * on the page. Solid near-black, no photography, no accent-colored surface:
 * pure typography carrying the whole statement. */
export default function StudioManifesto() {
  const reduceMotion = useReducedMotion();

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <SectionShell style={{ backgroundColor: STUDIO_BG, color: "#ffffff" }} className="!py-[7rem] sm:!py-[10rem]">
      <div className="max-w-[52rem] mx-auto text-center">
        <motion.h2
          {...fade(0)}
          className="font-black uppercase leading-[0.92] tracking-tight text-[3rem] sm:text-[5.5rem] lg:text-[6.75rem]"
        >
          Not Jingles.
          <br />
          <span style={{ color: STUDIO_PINK }}>Songs.</span>
        </motion.h2>

        <motion.p {...fade(0.12)} className="mt-[2rem] text-[1.25rem] sm:text-[1.5rem] font-semibold text-white/85">
          People skip ads.
          <br />
          They save songs.
        </motion.p>

        <motion.p
          {...fade(0.22)}
          className="mt-[2rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed text-white/55 max-w-[36rem] mx-auto"
        >
          CHXNDLER STUDIO creates original music designed to live beyond the campaign — combining songwriting,
          production, sonic identity and creative direction into one recognizable world.
        </motion.p>
      </div>
    </SectionShell>
  );
}
