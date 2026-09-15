"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { Eyebrow } from "./ui";
import BookingInline from "./BookingInline";
import { useInteractionSound } from "./useInteractionSound";

/**
 * The closing moment — a solid campaign-accent surface, centered, generous
 * padding, no image of any kind. A confident ending, not another campaign
 * photo.
 */
export default function BrandCTA({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  const reduceMotion = useReducedMotion();
  const hasCta = !!(pitch.cta_eyebrow || pitch.cta_headline || pitch.cta_body);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { playHover, playClick } = useInteractionSound();
  if (!hasCta) return null;

  const buttonLabel = pitch.cta_button_text || "LET'S TALK";
  // Every pitch gets a working scheduler automatically — no per-brand code,
  // no code change when a new brand_pitches row is added — expanded inline
  // in this section (BookingInline) rather than navigating to
  // /book?brand=..., which stays around only as a standalone/shareable link.
  // cta_url still wins when a pitch explicitly wants to point somewhere else entirely.
  const isExternalUrl = !!pitch.cta_url;
  const href = pitch.cta_url || "";

  // The section background IS the accent color, so the eyebrow needs the
  // contrast color (softened), not the accent color itself.
  const eyebrowColor = `${palette.onAccent}d9`;

  return (
    <section
      className="flex flex-col items-center justify-center text-center px-[6vw] sm:px-[8vw] py-[7rem] sm:py-[10rem] min-h-[70vh]"
      style={{ backgroundColor: palette.accent, color: palette.onAccent }}
    >
      <div className="max-w-[42rem]">
        <Eyebrow color={eyebrowColor}>{pitch.cta_eyebrow || `${pitch.brand_name} × ${pitch.artist_name}`}</Eyebrow>

        {pitch.cta_headline && (
          <h2 className="font-bold leading-[1.02] tracking-tight text-[2.5rem] sm:text-[4rem]">{pitch.cta_headline}</h2>
        )}

        {pitch.cta_body && (
          <p className="mt-[1.5rem] text-[1.0625rem] sm:text-[1.1875rem] leading-relaxed opacity-85 max-w-[34rem] mx-auto">
            {pitch.cta_body}
          </p>
        )}

        {isExternalUrl ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-[2.5rem] inline-flex items-center justify-center rounded-full px-[2.25rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase bg-white transition-transform hover:scale-[1.045] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] focus-visible:outline-white"
            style={{ color: palette.accent }}
          >
            {buttonLabel}
          </a>
        ) : (
          <motion.button
            type="button"
            onClick={() => {
              playClick();
              setBookingOpen(true);
            }}
            onMouseEnter={playHover}
            animate={reduceMotion || bookingOpen ? { scale: 1 } : { scale: [1, 1.015, 1] }}
            transition={
              reduceMotion || bookingOpen ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
            }
            // A direct hover response to pointer input, not an auto-playing
            // animation — kept even under prefers-reduced-motion (only the
            // idle looping pulse above is gated on that). Needs its own fast
            // transition: the `transition` prop above is tuned for the 3.6s
            // idle loop and would otherwise govern this too, making the
            // enlarge take ~3.4s to reach full scale — nearly invisible on a
            // normal hover.
            whileHover={{ scale: 1.045, transition: { duration: 0.2, ease: "easeOut" } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className="relative mt-[2.5rem] inline-flex items-center justify-center rounded-full px-[2.25rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] focus-visible:outline-white"
            style={{ color: palette.accent }}
          >
            {/* Slow, subtle glow ring — same idle-attention cue as the hero
                play button. White (not palette.accent) since the button
                itself sits on the accent-colored section background, where
                an accent-colored glow would just vanish into it. Stops once
                the scheduler is open — it's already gotten the click. */}
            {!reduceMotion && !bookingOpen && (
              <motion.span
                aria-hidden="true"
                className="absolute -inset-[0.35rem] rounded-full pointer-events-none bg-white"
                animate={{ opacity: [0.15, 0.45, 0.15] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <span className="relative">{buttonLabel}</span>
          </motion.button>
        )}
      </div>

      {/* Deliberately outside the copy's max-w-[42rem] column: Cal's
          calendar-left/times-right layout needs real width to render — boxed
          into the same narrow column as the headline, it has no choice but
          to fall back to its tall stacked (calendar full-width, then a long
          scrolling list of times) layout. Its own width is set in
          BookingInline. */}
      {!isExternalUrl && (
        <BookingInline
          open={bookingOpen}
          brandName={pitch.brand_name}
          brandSlug={pitch.slug}
          accentColor={palette.accent}
        />
      )}
    </section>
  );
}
