"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import BookingInline from "@/components/brand-pitch/BookingInline";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_PINK, STUDIO_ON_PINK } from "./identity";

/**
 * Final CTA — the second (and last) full-bleed #EF43A3 moment on the page.
 * No eyebrow, no graphic, no gradient: just the biggest typographic moment
 * on the site and one dark pill button, mirroring StudioManifesto's flat
 * pink treatment. Reuses the same inline Cal.com booking mechanism every
 * /brands/[slug] page already uses (BookingInline) so a booking made from
 * /studio lands in the same calendar/inbox as one made from a brand pitch.
 */
export default function StudioFinalCTA() {
  const reduceMotion = useReducedMotion();
  const [bookingOpen, setBookingOpen] = useState(false);
  const { playHover, playClick } = useInteractionSound();

  return (
    <section
      id="start-a-project"
      className="relative isolate overflow-hidden flex flex-col items-center justify-center text-center px-[6vw] sm:px-[8vw] pt-[4rem] pb-[4.25rem] sm:py-[6.5rem] scroll-mt-[5rem]"
      style={{ color: STUDIO_ON_PINK }}
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <img
          src="/elements/chxndler-studio-background.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          data-no-lazy=""
        />
      </div>

      <div className="max-w-[34rem] sm:max-w-[42rem] lg:max-w-[60rem]">
        <h2
          className="mx-auto font-black uppercase leading-[0.94] tracking-tighter text-[2.5rem] sm:text-[4rem] lg:text-[5.5rem]"
          style={{ color: STUDIO_PINK }}
        >
          So, What Does Your
          <br className="hidden lg:block" /> Brand Sound Like?
        </h2>

        <motion.button
          type="button"
          onClick={() => {
            playClick();
            setBookingOpen(true);
          }}
          onMouseEnter={playHover}
          // The idle pulse has to live in framer-motion's own `animate` prop,
          // not a CSS @keyframes class: this is a motion.button, so framer
          // sets `transform` via inline style on every render (even at
          // rest), which silently wins over a CSS animation targeting the
          // same property — the previous .chx-pulse class was a no-op.
          // whileHover/whileTap still transparently override this loop while
          // active, framer's normal gesture-priority behavior.
          animate={reduceMotion ? undefined : { scale: [1, 1.035, 1] }}
          transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={reduceMotion ? undefined : { scale: 1.06, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          className="group relative mt-[2.25rem] sm:mt-[2.75rem] inline-flex items-center justify-center gap-[0.875rem] rounded-full px-[3.25rem] py-[1.375rem] text-[1.0625rem] sm:text-[1.1875rem] font-bold tracking-[0.08em] uppercase transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
          style={{ backgroundColor: "#F5FF3D", color: STUDIO_ON_PINK, outlineColor: "#F5FF3D" }}
        >
          <span className="relative">Let's Create It</span>
          <span
            aria-hidden="true"
            className="relative inline-block transition-transform duration-200 group-hover:translate-x-[0.25rem]"
          >
            →
          </span>
        </motion.button>
      </div>

      <BookingInline open={bookingOpen} brandName="CHXNDLER STUDIO" brandSlug="studio" accentColor={STUDIO_PINK} />
    </section>
  );
}
