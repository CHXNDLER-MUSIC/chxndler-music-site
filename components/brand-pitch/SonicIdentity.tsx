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
        <span aria-hidden="true" className="text-[1.5rem] sm:text-[2rem]" style={{ marginLeft: isPlaying ? 0 : "0.2em" }}>
          {isLoading ? "…" : isPlaying ? "❚❚" : "▶"}
        </span>
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
      className="inline-flex items-center gap-[0.6rem] rounded-full pl-[0.4rem] pr-[1.1rem] py-[0.4rem] text-[0.75rem] font-semibold tracking-[0.12em] uppercase transition-all duration-200 hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
      style={{
        border: `1px solid ${color}`,
        backgroundColor: isPlaying ? color : "transparent",
        outlineColor: color,
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center w-[1.5rem] h-[1.5rem] rounded-full transition-colors"
        style={{ border: `1px solid ${color}` }}
      >
        <span className="text-[0.55rem]" style={{ marginLeft: isPlaying ? 0 : "0.1em" }}>
          {isLoading ? "…" : isPlaying ? "❚❚" : "▶"}
        </span>
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
  const { activeId, playing, loading, duration, toggle, getAnalyser } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();
  const [pulseId, setPulseId] = useState<number | null>(null);

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
      style={{ backgroundColor: palette.accent, color: palette.onAccent }}
      textureUrl={getSectionTexture(pitch, 1)}
    >
      <div className="flex flex-col items-center text-center">
        <Eyebrow color={highlight}>{pitch.sonic_eyebrow || "The Sonic Identity"}</Eyebrow>

        {/* Explanatory copy — deliberately light: the sonic logo itself is the focus. */}
        {pitch.sonic_headline && (
          <h2 className="max-w-[32rem] whitespace-pre-line font-semibold leading-[1.15] tracking-tight text-[1.375rem] sm:text-[1.75rem] opacity-90">
            {pitch.sonic_headline}
          </h2>
        )}
        {pitch.sonic_description && (
          <p className="mt-[0.75rem] max-w-[26rem] text-[0.9375rem] leading-relaxed opacity-60">{pitch.sonic_description}</p>
        )}

        {/* The mnemonic — the visual hero of the section */}
        {pitch.sonic_mnemonic && (
          <p className="mt-[2.75rem] sm:mt-[3.25rem] font-black leading-[1] tracking-tight text-[3rem] sm:text-[5rem]">
            {pitch.sonic_mnemonic}
          </p>
        )}

        {primary && (
          <>
            <div className="relative mt-[3rem] sm:mt-[3.5rem] w-[7.5rem] h-[7.5rem] sm:w-[9rem] sm:h-[9rem] flex items-center justify-center">
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

            <p className="mt-[1rem] text-[0.6875rem] font-bold tracking-[0.3em] uppercase opacity-70">
              {primary.label || "Primary"}
            </p>
            <p className="mt-[0.35rem] text-[0.8125rem] font-semibold tracking-[0.15em] uppercase opacity-90">
              {primaryIsPlaying ? "Pause" : "Play"}
              {primaryDuration > 0 ? ` · ${formatTime(primaryDuration)}` : ""}
            </p>

            {/* Minimal live waveform — reacts to whichever version in this
                section is actually playing; settles into a static idle line otherwise. */}
            <div className="mt-[1.25rem] w-[9rem] sm:w-[11rem] h-[2rem]">
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
          <div className="mt-[2.5rem] sm:mt-[3rem] flex flex-col items-center gap-[1rem]">
            <p className="text-[0.6875rem] tracking-[0.25em] uppercase opacity-50">Alternates</p>
            <div className="flex flex-wrap items-center justify-center gap-[0.75rem]">
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
