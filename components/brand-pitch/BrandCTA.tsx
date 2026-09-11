"use client";

import React, { useState } from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { Eyebrow } from "./ui";
import BookingInline from "./BookingInline";

/**
 * The closing moment — a solid campaign-accent surface, centered, generous
 * padding, no image of any kind. A confident ending, not another campaign
 * photo.
 */
export default function BrandCTA({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  const hasCta = !!(pitch.cta_eyebrow || pitch.cta_headline || pitch.cta_body);
  const [bookingOpen, setBookingOpen] = useState(false);
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
            className="mt-[2.5rem] inline-flex items-center justify-center rounded-full px-[2.25rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase bg-white transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] focus-visible:outline-white"
            style={{ color: palette.accent }}
          >
            {buttonLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="mt-[2.5rem] inline-flex items-center justify-center rounded-full px-[2.25rem] py-[1.125rem] text-[0.9375rem] font-bold tracking-[0.08em] uppercase bg-white transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] focus-visible:outline-white"
            style={{ color: palette.accent }}
          >
            {buttonLabel}
          </button>
        )}

        {!isExternalUrl && (
          <BookingInline
            open={bookingOpen}
            brandName={pitch.brand_name}
            brandSlug={pitch.slug}
            accentColor={palette.accent}
          />
        )}
      </div>
    </section>
  );
}
