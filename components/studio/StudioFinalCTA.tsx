"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import BookingInline from "@/components/brand-pitch/BookingInline";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG_ALT, STUDIO_PINK } from "./identity";

/**
 * Final CTA — reuses the same contact mechanism every /brands/[slug] page
 * already uses (BookingInline: an inline Cal.com scheduler, no fixed
 * overlay), so a booking made from /studio lands in the exact same
 * calendar/inbox as one made from a brand pitch. Restyled to match the
 * brand direction here (near-black, pink used only for the button/accents)
 * rather than BrandCTA's full-bleed accent-color surface, which would read
 * as too much pink for this page's "sparingly" rule.
 */
export default function StudioFinalCTA() {
  const reduceMotion = useReducedMotion();
  const [bookingOpen, setBookingOpen] = useState(false);
  const { playHover, playClick } = useInteractionSound();

  return (
    <section
      id="start-a-project"
      className="flex flex-col items-center justify-center text-center px-[6vw] sm:px-[8vw] py-[7rem] sm:py-[9rem] min-h-[60vh] scroll-mt-[5rem]"
      style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}
    >
      <div className="max-w-[42rem]">
        <p className="text-[0.75rem] sm:text-[0.8125rem] font-semibold tracking-[0.3em] uppercase mb-[1rem]" style={{ color: STUDIO_PINK }}>
          CHXNDLER STUDIO
        </p>

        <h2 className="font-bold uppercase leading-[1.02] tracking-tight text-[2.5rem] sm:text-[4rem]">
          What Should
          <br />
          Your Brand Sound Like?
        </h2>

        <p className="mt-[1.5rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed text-white/60 max-w-[34rem] mx-auto">
          Let's make something people actually want to hear.
        </p>

        <motion.button
          type="button"
          onClick={() => {
            playClick();
            setBookingOpen(true);
          }}
          onMouseEnter={playHover}
          animate={reduceMotion || bookingOpen ? { scale: 1 } : { scale: [1, 1.015, 1] }}
          transition={reduceMotion || bookingOpen ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          whileHover={reduceMotion ? undefined : { scale: 1.045, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
          className="relative mt-[2.5rem] inline-flex items-center justify-center gap-[0.625rem] rounded-full px-[2.25rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ backgroundColor: STUDIO_PINK, outlineColor: STUDIO_PINK }}
        >
          {!reduceMotion && !bookingOpen && (
            <motion.span
              aria-hidden="true"
              className="absolute -inset-[0.35rem] rounded-full pointer-events-none"
              style={{ backgroundColor: STUDIO_PINK }}
              animate={{ opacity: [0.12, 0.32, 0.12] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative">Start a Project</span>
          <span aria-hidden="true" className="relative">→</span>
        </motion.button>
      </div>

      <BookingInline open={bookingOpen} brandName="CHXNDLER STUDIO" brandSlug="studio" accentColor={STUDIO_PINK} />
    </section>
  );
}
