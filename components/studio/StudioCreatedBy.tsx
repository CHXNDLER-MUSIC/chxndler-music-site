"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import StartButton from "@/components/StartButton";
import { STUDIO_BG, STUDIO_PINK, STUDIO_HEADLINE, STUDIO_BODY } from "./identity";

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
  const { playHover, playClick } = useInteractionSound({ clickKey: "pause" });

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
    <SectionShell
      id="about"
      className="scroll-mt-[4.5rem] !pt-[2.75rem] !pb-[2.25rem] sm:!pt-[4.25rem] sm:!pb-[3rem]"
      style={{ backgroundColor: STUDIO_BG, color: STUDIO_BODY }}
    >
      <div className="relative w-full grid grid-cols-1 lg:grid-cols-[3fr_4fr] items-center gap-[1.5rem] sm:gap-[2rem]">
        <motion.div
          {...fade(0)}
          className="relative flex-shrink-0 mx-auto lg:mx-0 w-[13.5rem] h-[13.5rem] sm:w-[17rem] sm:h-[17rem] md:w-[21rem] md:h-[21rem] lg:w-[27rem] lg:h-[27rem]"
        >
          {/* A soft atmospheric halo from behind the portrait only — never a
              section-wide tint. Stops fade fully transparent well inside the
              blurred box's own edge (72%), so the blur never reveals a
              rectangular boundary. */}
          <div
            className="absolute -inset-[38%] rounded-full blur-[7rem] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(32,74,148,0.34) 0%, rgba(16,32,64,0.2) 38%, rgba(6,10,22,0.09) 58%, transparent 72%)",
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
            className="font-bold uppercase leading-[0.95] tracking-tight text-[1.75rem] sm:text-[3.25rem] lg:text-[3.75rem]"
            style={{ color: STUDIO_HEADLINE }}
          >
            The Artist
            <br />
            <span className="whitespace-nowrap">Behind the Sound.</span>
          </h3>

          <p
            className="mt-[0.75rem] text-[0.6875rem] sm:text-[0.75rem] font-semibold tracking-[0.25em] uppercase"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Artist · Songwriter · Producer
          </p>

          <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed mx-auto lg:mx-0" style={{ color: STUDIO_BODY }}>
            CHXNDLER STUDIO brings an artist's approach to original music, sonic identity and creative worlds for
            brands.
          </p>

          <div className="mt-[1.75rem] flex justify-center lg:justify-start">
            <div onMouseEnter={playHover}>
              <StartButton
                size={96}
                pulse={false}
                ariaLabel="Visit chxndler.world"
                onClick={() => {
                  playClick();
                  window.open(CHXNDLER_DESTINATION, "_blank", "noopener,noreferrer");
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
