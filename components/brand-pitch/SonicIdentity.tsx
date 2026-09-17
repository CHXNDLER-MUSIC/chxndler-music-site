"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BrandPitch, BrandPitchSonicLogoVersion } from "@/lib/brandPitch";
import { getBrandTrackUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getSectionTexture } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, formatTime } from "./ui";
import { useBrandAudio } from "./BrandAudioContext";
import { useInteractionSound } from "./useInteractionSound";
import SonicWaveform from "./SonicWaveform";

type ResolvedVersion = BrandPitchSonicLogoVersion & { src: string };

/** Splits a mnemonic like "I'M → ON → VA-CA-TION" (or "FLICK → SWIPE →
 * SPARK") into its rhythmic beats on the arrow — generic parsing, not tied
 * to any one brand's wording, so it degrades to a single "beat" (no visible
 * change from the old single-line treatment) for a mnemonic authored without
 * arrows at all. */
function parseMnemonicBeats(mnemonic: string): string[] {
  return mnemonic
    .split(/\s*(?:→|->)\s*/)
    .map((b) => b.trim())
    .filter(Boolean);
}

/** A vector play/pause glyph, not a Unicode character — a text glyph like
 * "▶" renders with inconsistent optical centering across fonts/browsers, so
 * it could never be truly centered inside the circle no matter how much
 * margin was hand-tuned. The play triangle's tip sits a hair right of
 * geometric center on purpose (the standard optical-centering convention for
 * play icons — a dead-center triangle reads as left-heavy to the eye). */
function PlayPauseGlyph({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      {playing ? (
        <>
          <rect x="5" y="4" width="3.4" height="12" rx="1" />
          <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
        </>
      ) : (
        <path d="M6.2 4.2L16.2 10L6.2 15.8V4.2Z" />
      )}
    </svg>
  );
}

function SonicLogoButton({
  version,
  isPlaying,
  isLoading,
  onToggle,
  onHover,
  color,
  size,
}: {
  version: ResolvedVersion;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onHover: () => void;
  color: string;
  size: "primary" | "alt";
}) {
  if (size === "primary") {
    return (
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={onHover}
        aria-label={isPlaying ? `Pause ${version.label}` : `Play ${version.label}`}
        aria-pressed={isPlaying}
        className="relative z-10 inline-flex items-center justify-center w-full h-full rounded-full transition-transform hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.35rem]"
        style={{ border: `1.5px solid ${color}`, color, outlineColor: color }}
      >
        {isLoading ? (
          <span aria-hidden="true" className="text-[1.25rem] sm:text-[1.5rem]">
            …
          </span>
        ) : (
          <PlayPauseGlyph playing={isPlaying} className="w-[1.375rem] h-[1.375rem] sm:w-[1.75rem] sm:h-[1.75rem]" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={onHover}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? `Pause ${version.label}` : `Play ${version.label}`}
      className="inline-flex items-center gap-[0.55rem] rounded-full pl-[0.4rem] pr-[1rem] py-[0.4rem] text-[0.75rem] font-semibold tracking-[0.12em] uppercase transition-all duration-200 hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
      style={{
        border: `1px solid ${color}`,
        backgroundColor: isPlaying ? color : "transparent",
        outlineColor: color,
      }}
    >
      <span
        aria-hidden="true"
        className="flex-shrink-0 flex items-center justify-center w-[1.5rem] h-[1.5rem] rounded-full transition-colors"
        style={{ border: `1px solid ${color}` }}
      >
        {isLoading ? (
          <span className="text-[0.55rem] leading-none">…</span>
        ) : (
          <PlayPauseGlyph playing={isPlaying} className="w-[0.6rem] h-[0.6rem]" />
        )}
      </span>
      {version.label}
    </button>
  );
}

/**
 * A bold solid campaign-accent surface — the one section that contrasts hard
 * against Idea (primary) and Hear the Concept (light) either side of it.
 * Redesigned around the SONIC LOGO itself as the focus: the mnemonic and
 * play controls dominate, explanatory copy is reduced to a light-weight
 * caption, and every alternate cut (however many a brand has) is easy to
 * preview beneath the emphasized primary. Section background/texture is
 * untouched — only the content inside it changes.
 */
export default function SonicIdentity({ pitch, palette }: { pitch: BrandPitch; palette: PitchPalette }) {
  const reduceMotion = useReducedMotion();
  const { activeId, playing, loading, duration, currentTime, toggle, getAnalyser } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();
  const [pulseId, setPulseId] = useState<number | null>(null);

  const mnemonicBeats = useMemo(
    () => (pitch.sonic_mnemonic ? parseMnemonicBeats(pitch.sonic_mnemonic) : []),
    [pitch.sonic_mnemonic]
  );

  const versions = useMemo(() => {
    return pitch.sonic_logo_versions
      .map((v) => {
        const src = getBrandTrackUrl(v.path);
        return src ? { ...v, src } : null;
      })
      .filter((v): v is ResolvedVersion => v !== null);
  }, [pitch.sonic_logo_versions]);

  const primary = versions.find((v) => v.role === "primary") || versions[0] || null;
  const alternates = versions.filter((v) => v !== primary);

  const activeVersion = versions.find((v) => v.path === activeId) || null;
  const isSectionPlaying = !!activeVersion && playing;
  const analyser = isSectionPlaying ? getAnalyser() : null;

  // Best-effort sync, not sample-accurate: there's no per-beat timing data
  // stored anywhere, so this divides the ACTIVE cut's real playback progress
  // (whichever sonic-logo version — primary or an alternate — is currently
  // playing) evenly across however many beats the mnemonic has. It still
  // tracks true audio position, so scrubbing/pausing keeps it honest.
  const beatProgress = isSectionPlaying && duration > 0 ? Math.min(currentTime / duration, 0.999) : -1;
  const activeBeatIndex = beatProgress >= 0 && mnemonicBeats.length > 0 ? Math.floor(beatProgress * mnemonicBeats.length) : -1;

  const hasContent =
    pitch.sonic_headline || pitch.sonic_description || pitch.sonic_mnemonic || pitch.sonic_uses.length > 0 || versions.length > 0;
  if (!hasContent) return null;

  const handleToggle = (v: ResolvedVersion) => {
    playClick();
    if (!(activeId === v.path && playing) && !reduceMotion) setPulseId(Date.now());
    toggle(v.path, v.src);
  };

  const primaryIsActive = !!primary && activeId === primary.path;
  const primaryIsPlaying = primaryIsActive && playing;
  const primaryIsLoading = primaryIsActive && loading;
  const primaryDuration = primaryIsActive ? duration : 0;

  // The section background IS the accent color here, so highlights need the
  // contrast color, not the accent color itself (which would vanish).
  const highlight = `${palette.onAccent}d9`;

  return (
    <SectionShell
      id="sonic-identity"
      className="!pt-[3.25rem] sm:!pt-[6.5rem] !pb-[6rem] sm:!pb-[10.75rem]"
      style={{ backgroundColor: palette.accent, color: palette.onAccent }}
      textureUrl={getSectionTexture(pitch, 1)}
    >
      <div className="flex flex-col items-center text-center">
        <Eyebrow color={highlight} className="!mb-[0.75rem]" style={{ fontSize: "1.0625rem" }}>
          {pitch.sonic_eyebrow || "The Sonic Identity"}
        </Eyebrow>

        {/* Explanatory copy — deliberately light: the sonic logo itself is the focus. */}
        {pitch.sonic_headline && (
          <h2 className="max-w-[32rem] whitespace-pre-line font-semibold leading-[1.15] tracking-tight text-[1.375rem] sm:text-[1.75rem] opacity-90">
            {pitch.sonic_headline}
          </h2>
        )}
        {pitch.sonic_description && (
          <p className="mt-[0.625rem] max-w-[26rem] text-[0.9375rem] leading-relaxed opacity-60">{pitch.sonic_description}</p>
        )}

        {/* The mnemonic — the visual hero of the section, rendered as its own
            rhythmic beats (not one run-on line) so each "hit" can read on its
            own and — while the sonic ID is playing — sequentially brighten in
            time with real playback progress. Stacks on mobile so three short
            beats never risk an accidental mid-word line break; sits in a row
            past sm. clamp() keeps it on one line at typical desktop widths
            while giving it a bit more breathing room than a flat max size. */}
        {mnemonicBeats.length > 0 && (
          <div className="mt-[1.75rem] sm:mt-[2.25rem] flex flex-col sm:flex-row items-center gap-[0.25rem] sm:gap-[0.625rem]">
            {mnemonicBeats.map((beat, i) => {
              const isActiveBeat = activeBeatIndex === i;
              return (
                <React.Fragment key={`${beat}-${i}`}>
                  <span
                    className="font-black leading-[1] tracking-tight text-[clamp(2.25rem,1.6rem+3vw,4.25rem)]"
                    style={{
                      opacity: activeBeatIndex === -1 ? 1 : isActiveBeat ? 1 : 0.4,
                      transform: !reduceMotion && isActiveBeat ? "scale(1.06)" : "scale(1)",
                      transition: reduceMotion ? "opacity 0.15s linear" : "opacity 0.2s ease, transform 0.2s ease",
                      display: "inline-block",
                    }}
                  >
                    {beat}
                  </span>
                  {i < mnemonicBeats.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="opacity-35 text-[1.125rem] sm:text-[1.5rem] rotate-90 sm:rotate-0"
                    >
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {primary && (
          <>
            <div className="relative mt-[1.5rem] sm:mt-[2rem] w-[7rem] h-[7rem] sm:w-[8.5rem] sm:h-[8.5rem] flex items-center justify-center">
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

              <SonicLogoButton
                version={primary}
                isPlaying={primaryIsPlaying}
                isLoading={primaryIsLoading}
                color={palette.onAccent}
                size="primary"
                onHover={playHover}
                onToggle={() => handleToggle(primary)}
              />
            </div>

            {/* ONE clean line integrated with the control — no separate
                "Primary" / "Play" wireframe-style stack underneath it. */}
            <p className="mt-[0.75rem] text-[0.8125rem] font-bold tracking-[0.2em] uppercase opacity-90">
              {primaryIsPlaying ? "Pause Sonic ID" : "Play Sonic ID"}
              {primaryDuration > 0 ? ` · ${formatTime(primaryDuration)}` : ""}
            </p>

            {/* Minimal live waveform — reacts to whichever version in this
                section is actually playing; settles into a static idle line otherwise. */}
            <div className="mt-[0.875rem] w-[9rem] sm:w-[11rem] h-[2rem]">
              <SonicWaveform
                analyser={analyser}
                active={isSectionPlaying}
                color={palette.onAccent}
                reduceMotion={!!reduceMotion}
              />
            </div>
          </>
        )}

        {alternates.length > 0 && (
          <div className="mt-[1.5rem] sm:mt-[2rem] flex flex-col items-center gap-[0.625rem]">
            <p className="text-[0.6875rem] tracking-[0.25em] uppercase opacity-50">Alternates</p>
            <div className="flex flex-wrap items-center justify-center gap-[0.5rem]">
              {alternates.map((v) => {
                const isActive = activeId === v.path;
                return (
                  <SonicLogoButton
                    key={v.path}
                    version={v}
                    isPlaying={isActive && playing}
                    isLoading={isActive && loading}
                    color={palette.onAccent}
                    size="alt"
                    onHover={playHover}
                    onToggle={() => handleToggle(v)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* The section's closing statement — given the largest gap above it
            of anything in this composition (everything above it just got
            tighter) so it reads as a deliberate conclusion, not one more item
            in the same rhythm as the alternates. */}
        {pitch.sonic_uses.length > 0 && (
          <div className="mt-[3.25rem] sm:mt-[4rem]">
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
