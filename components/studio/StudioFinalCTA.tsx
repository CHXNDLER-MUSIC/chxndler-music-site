"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
  const [bookingOpen, setBookingOpen] = useState(false);
  const { playHover, playClick } = useInteractionSound();

  return (
    <section
      id="start-a-project"
      className="flex flex-col items-center justify-center text-center px-[6vw] sm:px-[8vw] pt-[4rem] pb-[4.25rem] sm:py-[6.5rem] scroll-mt-[5rem]"
      style={{ backgroundColor: STUDIO_PINK, color: STUDIO_ON_PINK }}
    >
      <div className="max-w-[34rem] sm:max-w-[42rem] lg:max-w-[60rem]">
        <h2 className="mx-auto font-black uppercase leading-[0.94] tracking-tighter text-[2.5rem] sm:text-[4rem] lg:text-[5.5rem]">
          So, What Does Your
          <br className="hidden lg:block" /> Brand Sound Like?
        </h2>

        <p
          className="mt-[1.5rem] sm:mt-[1.75rem] text-[1rem] sm:text-[1.125rem] font-bold tracking-[0.02em] leading-relaxed max-w-[28rem] mx-auto uppercase"
          style={{ color: "rgba(8,8,11,0.75)" }}
        >
          Let's create it.
        </p>

        <motion.button
          type="button"
          onClick={() => {
            playClick();
            setBookingOpen(true);
          }}
          onMouseEnter={playHover}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
          className="chx-pulse group mt-[2.5rem] inline-flex items-center justify-center gap-[0.75rem] rounded-full px-[2.5rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase transition-colors duration-200 hover:bg-[#141416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
          style={{ backgroundColor: STUDIO_ON_PINK, color: "#FFFFFF", outlineColor: STUDIO_ON_PINK }}
        >
          <span>Let's Create It.</span>
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-200 group-hover:translate-x-[0.25rem]"
          >
            →
          </span>
        </motion.button>
      </div>

      <BookingInline open={bookingOpen} brandName="CHXNDLER STUDIO" brandSlug="studio" accentColor={STUDIO_PINK} />

      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .chx-pulse {
            animation: chxCtaPulse 2.4s ease-in-out infinite;
          }
        }
        @keyframes chxCtaPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.035);
          }
        }
      `}</style>
    </section>
  );
}
