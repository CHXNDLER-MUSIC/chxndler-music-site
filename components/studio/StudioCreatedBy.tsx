"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG, STUDIO_PINK, STUDIO_HEADLINE, STUDIO_BODY } from "./identity";

// Same asset the brand-pitch template's own "CREATED BY CHXNDLER" section
// uses (see components/brand-pitch/BrandAbout.tsx) — the artist's identity
// photo is CHXNDLER's own signature across every surface, not per-page content.
const CHXNDLER_PHOTO = "/elements/CHXNDLER.jpg";
const PORTRAIT_MASK = "radial-gradient(ellipse 50% 52% at 50% 46%, #000 94%, transparent 100%)";
// Same destination BrandAbout.tsx's Heartverse mark already links to — the
// one existing "meet CHXNDLER" destination on the site, not a new/invented route.
const CHXNDLER_DESTINATION = "https://chxndler.world";
// Same signature asset + accent color BrandAbout.tsx uses for its identical
// "Every brand has a visual identity..." statement and creator's mark —
// CHXNDLER's fixed identity, not per-page content.
const CHXNDLER_SIGNATURE = "/elements/PINK SIGNATURE.png";
const NEON_YELLOW = "#F5FF3D";

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
      className="scroll-mt-[4.5rem] !pt-[7rem] !pb-[2.25rem] sm:!pt-[9.5rem] sm:!pb-[3rem]"
      style={{ backgroundColor: STUDIO_BG, color: STUDIO_BODY }}
      backgroundImage="/elements/chxndler-studio-background.png"
    >
      <div className="relative w-full grid grid-cols-1 lg:grid-cols-[3fr_4fr] items-center gap-[1.5rem] sm:gap-[2rem]">
        <motion.div
          {...fade(0)}
          className="relative flex-shrink-0 mx-auto lg:mx-0 lg:order-2 w-[15rem] h-[15rem] sm:w-[19rem] sm:h-[19rem] md:w-[23rem] md:h-[23rem] lg:w-[29.5rem] lg:h-[29.5rem]"
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

        <motion.div {...fade(0.12)} className="text-center lg:text-left lg:order-1 max-w-[34rem] mx-auto lg:mx-0">
          <Eyebrow color={STUDIO_PINK} style={{ fontSize: "1.125rem" }}>
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
            className="mt-[0.75rem] text-[0.8125rem] sm:text-[0.875rem] font-semibold tracking-[0.25em] uppercase"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Artist · Songwriter · Producer
          </p>

          <p className="mt-[1.25rem] text-[1.1875rem] leading-relaxed mx-auto lg:mx-0" style={{ color: STUDIO_BODY }}>
            CHXNDLER STUDIO brings an artist's approach to original music, sonic identity and creative worlds for
            brands.
          </p>

          {/* Featured statement — same copy/treatment as BrandAbout.tsx's
              identical pull-quote: both lines share one color/weight, only
              the accent word per line breaks out in neon yellow. Always
              centered on its own, regardless of how the column above aligns. */}
          <p className="mt-[1.5rem] text-center text-[1.3125rem] sm:text-[1.4375rem] leading-snug italic" style={{ color: STUDIO_HEADLINE }}>
            <span className="block">
              Every brand has a{" "}
              <span className="font-bold" style={{ color: NEON_YELLOW }}>
                visual
              </span>{" "}
              identity.
            </span>
            <span className="block">
              Why not a{" "}
              <span className="font-bold" style={{ color: NEON_YELLOW }}>
                sonic
              </span>{" "}
              one?
            </span>
          </p>

          {/* Creator's mark — pink CHXNDLER signature, with "Explore the
              Artist" itself as the clickable link into chxndler.world. */}
          <div className="mt-[0.125rem] flex flex-col items-center">
            <img
              src={CHXNDLER_SIGNATURE}
              alt="CHXNDLER"
              className="-mt-[1rem] sm:-mt-[1.25rem] h-[8rem] sm:h-[9.5rem] w-auto object-contain"
              data-no-lazy="" // see ui.tsx SectionShell for why
            />
            <a
              href={CHXNDLER_DESTINATION}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={playHover}
              onClick={playClick}
              className="group -mt-[1rem] sm:-mt-[1.25rem] inline-flex items-center gap-[0.3rem] text-[0.8125rem] font-semibold tracking-[0.25em] uppercase text-white transition-all duration-200 hover:scale-110 hover:text-[#EF43A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] rounded-sm"
              style={{ outlineColor: STUDIO_PINK }}
            >
              Explore the Artist
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
