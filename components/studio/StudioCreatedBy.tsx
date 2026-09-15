"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG, STUDIO_PINK, STUDIO_CYAN, STUDIO_HEADLINE, STUDIO_BODY } from "./identity";

// Same asset the brand-pitch template's own "CREATED BY CHXNDLER" section
// uses (see components/brand-pitch/BrandAbout.tsx) — the artist's identity
// photo is CHXNDLER's own signature across every surface, not per-page content.
const CHXNDLER_PHOTO = "/elements/CHXNDLER.jpg";
const PORTRAIT_MASK = "radial-gradient(ellipse 50% 52% at 50% 46%, #000 94%, transparent 100%)";
// Same destination BrandAbout.tsx's Heartverse mark already links to — the
// one existing "meet CHXNDLER" destination on the site, not a new/invented route.
const CHXNDLER_DESTINATION = "https://chxndler.world";

/**
 * "CREATED BY CHXNDLER" — reuses the exact visual language and copy
 * structure of the brand-pitch template's own section of the same name
 * (BrandAbout.tsx: portrait + eyebrow + headline + credentials + body, same
 * fixed CHXNDLER identity colors), adapted to connect CHXNDLER (the artist)
 * to CHXNDLER STUDIO (the commercial studio) rather than to one brand's song.
 * Deliberately lighter than BrandAbout's version — no Heartverse/fan-world
 * mark or "explore the studio" launcher here, since Selected Work already
 * serves that role at the page level and this section's job is just the
 * artist -> studio connection, not a biography.
 */
export default function StudioCreatedBy() {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound({ clickKey: "star" });

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.35 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <SectionShell id="about" className="scroll-mt-[4.5rem]" style={{ backgroundColor: STUDIO_BG, color: STUDIO_BODY }}>
      <div className="relative w-full grid grid-cols-1 lg:grid-cols-[2fr_3fr] items-center gap-[2rem] sm:gap-[2.5rem] lg:gap-[3rem]">
        <motion.div
          {...fade(0)}
          className="relative flex-shrink-0 mx-auto lg:mx-0 w-[9rem] h-[9rem] sm:w-[11.5rem] sm:h-[11.5rem] md:w-[14rem] md:h-[14rem] lg:w-[18rem] lg:h-[18rem]"
        >
          <div
            className="absolute -inset-[20%] rounded-full blur-[6rem] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${STUDIO_PINK}22 0%, ${STUDIO_CYAN}26 40%, ${STUDIO_PINK}14 66%, transparent 82%)`,
            }}
            aria-hidden="true"
          />
          <img
            src={CHXNDLER_PHOTO}
            alt="CHXNDLER"
            className="relative w-full h-full object-cover rounded-full"
            style={{ WebkitMaskImage: PORTRAIT_MASK, maskImage: PORTRAIT_MASK, objectPosition: "58% 50%" }}
            data-no-lazy=""
          />
        </motion.div>

        <motion.div {...fade(0.12)} className="text-center lg:text-left max-w-[34rem] mx-auto lg:mx-0">
          <Eyebrow color={STUDIO_PINK} style={{ fontSize: "0.9375rem" }}>
            Created by CHXNDLER
          </Eyebrow>

          <h3
            className="font-bold uppercase leading-[0.95] tracking-tight text-[2rem] sm:text-[3.5rem] lg:text-[4.25rem]"
            style={{ color: STUDIO_HEADLINE }}
          >
            The Artist
            <br />
            Behind the Studio.
          </h3>

          <p
            className="mt-[0.75rem] text-[0.6875rem] sm:text-[0.75rem] font-semibold tracking-[0.25em] uppercase"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Artist · Songwriter · Producer
          </p>

          <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed mx-auto lg:mx-0" style={{ color: STUDIO_BODY }}>
            CHXNDLER STUDIO is the creative studio founded by artist, songwriter and producer CHXNDLER — bringing an
            artist's approach to original music, sonic identity and creative worlds for brands.
          </p>

          <div className="mt-[1.75rem] flex justify-center lg:justify-start">
            <a
              href={CHXNDLER_DESTINATION}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={playHover}
              onClick={playClick}
              className="inline-flex items-center gap-[0.5rem] text-[0.875rem] font-bold tracking-[0.08em] uppercase transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] rounded-sm"
              style={{ color: STUDIO_PINK, outlineColor: STUDIO_PINK }}
            >
              Meet CHXNDLER
              <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-[0.2rem]">
                →
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
