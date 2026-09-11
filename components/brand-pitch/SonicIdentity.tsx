"use client";

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandTrackUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { Eyebrow, SectionShell, formatTime } from "./ui";
import { useBrandAudio } from "./BrandAudioContext";

/**
 * A bold solid campaign-accent surface — the one section that contrasts hard
 * against Idea (primary) and Hear the Concept (light) either side of it. The
 * mnemonic is the visual hero (large, bold wordmark), with the play control
 * beneath it as the functional way to actually hear the signature. No
 * photographic background, no "mapping words to sound" language.
 */
export default function SonicIdentity({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  const reduceMotion = useReducedMotion();
  const { activeId, playing, loading, duration, toggle } = useBrandAudio();
  const [pulseId, setPulseId] = useState<number | null>(null);

  const sonicSrc = getBrandTrackUrl(pitch.sonic_logo_path);
  const sonicId = pitch.sonic_logo_path || "";
  const isThis = activeId === sonicId;
  const isPlaying = isThis && playing;
  const isLoading = isThis && loading;
  const dur = isThis ? duration : 0;

  const hasContent =
    pitch.sonic_headline || pitch.sonic_description || pitch.sonic_mnemonic || pitch.sonic_uses.length > 0 || sonicSrc;
  if (!hasContent) return null;

  const handleToggle = () => {
    if (!sonicSrc) return;
    if (!isPlaying && !reduceMotion) setPulseId(Date.now());
    toggle(sonicId, sonicSrc);
  };

  // The section background IS the accent color here, so highlights need the
  // contrast color, not the accent color itself (which would vanish).
  const highlight = `${palette.onAccent}d9`;

  return (
    <SectionShell style={{ backgroundColor: palette.accent, color: palette.onAccent }}>
      <div className="flex flex-col items-center text-center">
        <Eyebrow color={highlight}>{pitch.sonic_eyebrow || "The Sonic Identity"}</Eyebrow>

        {pitch.sonic_headline && (
          <h2 className="max-w-[40rem] whitespace-pre-line font-bold leading-[1.05] tracking-tight text-[2rem] sm:text-[3rem]">
            {pitch.sonic_headline}
          </h2>
        )}
        {pitch.sonic_description && (
          <p className="mt-[1.25rem] max-w-[30rem] text-[1.0625rem] leading-relaxed opacity-80">
            {pitch.sonic_description}
          </p>
        )}

        {/* The mnemonic — the visual hero of the section */}
        {pitch.sonic_mnemonic && (
          <p className="mt-[2.5rem] sm:mt-[3rem] font-black leading-[1] tracking-tight text-[2.5rem] sm:text-[4rem]">
            {pitch.sonic_mnemonic}
          </p>
        )}

        {sonicSrc && (
          <>
            <div className="relative mt-[3rem] sm:mt-[3.5rem] w-[6.5rem] h-[6.5rem] sm:w-[8rem] sm:h-[8rem] flex items-center justify-center">
              <AnimatePresence>
                {pulseId !== null && (
                  <motion.span
                    key={pulseId}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: `1px solid ${palette.onAccent}` }}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.55, opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    onAnimationComplete={() => setPulseId(null)}
                  />
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleToggle}
                aria-label={isPlaying ? "Pause sonic logo" : "Play sonic logo"}
                className="relative z-10 inline-flex items-center justify-center w-full h-full rounded-full transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
                style={{ border: `1.5px solid ${palette.onAccent}`, color: palette.onAccent, outlineColor: palette.onAccent }}
              >
                <span aria-hidden="true" className="text-[1.5rem] sm:text-[2rem]" style={{ marginLeft: isPlaying ? 0 : "0.2em" }}>
                  {isLoading ? "…" : isPlaying ? "❚❚" : "▶"}
                </span>
              </button>
            </div>

            <p className="mt-[1.25rem] text-[0.8125rem] font-semibold tracking-[0.25em] uppercase opacity-90">
              {isPlaying ? "Pause Sonic Logo" : "Play Sonic Logo"}
            </p>
            <p className="mt-[0.4rem] text-[0.75rem] tracking-[0.2em] uppercase opacity-60">
              Sonic Signature{dur > 0 ? ` · ${formatTime(dur)}` : ""}
            </p>
          </>
        )}

        {pitch.sonic_uses.length > 0 && (
          <div className="mt-[3.5rem] sm:mt-[4.5rem]">
            <p className="text-[0.75rem] tracking-[0.3em] uppercase opacity-60">One Sound. Everywhere.</p>
            <p className="mt-[0.75rem] text-[0.875rem] sm:text-[0.9375rem] tracking-[0.15em] uppercase font-medium opacity-90">
              {pitch.sonic_uses.join(" • ")}
            </p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
