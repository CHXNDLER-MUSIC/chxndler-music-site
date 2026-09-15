"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl, getBrandTrackUrl } from "@/lib/brandPitchStorage";
import { getHeroImageCandidates } from "@/lib/brandPitchVisuals";
import { useBrandAudio } from "./BrandAudioContext";
import { useAssetAvailable, useAssetChain } from "./ui";
import { useInteractionSound } from "./useInteractionSound";

export default function BrandHero({ pitch, accent, year }: { pitch: BrandPitch; accent: string; year: number }) {
  const reduceMotion = useReducedMotion();
  const { activeId, playing, toggle } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();

  // Leads with the derived "background 1.png" (a brand's chosen campaign
  // image), falling back to hero_art_path then cover_art_path if that
  // specific file isn't uploaded. See lib/brandPitchVisuals — the exact same
  // chain BrandPitchPage uses to seed the page's asset-deduplication registry.
  const heroArtAsset = useAssetChain(getHeroImageCandidates(pitch));
  const heroVideoAsset = useAssetAvailable(getBrandArtUrl(pitch.hero_video_path));
  const titleGraphicAsset = useAssetAvailable(getBrandArtUrl(pitch.song_title_graphic_path));
  const heroArt = heroArtAsset.src;
  const heroVideo = heroVideoAsset.src;
  const titleGraphic = titleGraphicAsset.src;
  const hasBackdrop = !!(heroVideo || heroArt);

  // Single source of truth: the same pitch.alt_versions list "Hear the
  // Concept" reads from. The hero plays whichever version is flagged
  // is_hero_default — independent of is_default, the version "Hear the
  // Concept" opens on — so a pitch can lead the hero with the full song while
  // "Hear the Concept" still opens on the short brand cut. Falls back to the
  // same default "Hear the Concept" uses if nothing is hero-flagged.
  const primaryVersions = pitch.alt_versions.filter((v) => v.role === "primary");
  const heroVersion =
    pitch.alt_versions.find((v) => v.is_hero_default) ||
    primaryVersions.find((v) => v.is_default) ||
    primaryVersions[0] ||
    null;
  const heroSrc = getBrandTrackUrl(heroVersion?.path ?? null);

  // Use the raw object path as the audio id (not a made-up label) so this exact
  // clip is recognized as "the same instance" everywhere else it appears on the
  // page (e.g. the same tab in Hear the Concept) — continuity, not two copies.
  const heroId = heroVersion?.path || "";
  const isPlayingHero = activeId === heroId && playing;
  const title = pitch.hero_headline || pitch.song_title;
  // Always driven by this pitch's own song_title — never a hardcoded title —
  // with hero_button_text as an explicit CMS override when a brand wants
  // different copy entirely.
  const heroButtonLabel = pitch.hero_button_text || (pitch.song_title ? `Play "${pitch.song_title}"` : "Play");
  const capabilityLabels =
    pitch.hero_capability_labels.length > 0
      ? pitch.hero_capability_labels
      : ["Original Song", "Campaign Cuts", "Sonic Identity"];

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative isolate flex flex-col justify-end min-h-[100svh] px-[6vw] sm:px-[8vw] pb-[4rem] sm:pb-[5rem] pt-[7rem] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {heroVideo ? (
          <video
            className="w-full h-full object-cover"
            src={heroVideo}
            muted
            playsInline
            aria-hidden="true"
            onError={heroVideoAsset.onError}
            {...(!reduceMotion ? { autoPlay: true, loop: true } : {})}
          />
        ) : heroArt ? (
          <img
            src={heroArt}
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
            onError={heroArtAsset.onError}
            data-no-lazy="" // see ui.tsx SectionShell for why
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `radial-gradient(120% 120% at 50% 0%, ${accent}22 0%, transparent 60%)` }}
            aria-hidden="true"
          />
        )}
        {hasBackdrop && <div className="absolute inset-0 bg-black/35" aria-hidden="true" />}
      </div>

      <motion.div {...fade(0)} className="max-w-[60rem]">
        <p
          className={`text-[0.875rem] sm:text-[1rem] tracking-[0.15em] uppercase font-semibold mb-[1.25rem] ${
            hasBackdrop ? "text-white/90" : "opacity-70"
          }`}
        >
          {pitch.brand_name} × {pitch.artist_name}
        </p>

        <h1 className="leading-[0.92]">
          {titleGraphic ? (
            <img
              src={titleGraphic}
              alt={title}
              className="w-full max-w-[50rem] sm:max-w-[62rem] h-auto"
              onError={titleGraphicAsset.onError}
              data-no-lazy="" // see ui.tsx SectionShell for why
            />
          ) : (
            <span
              className={`block font-bold tracking-tight text-[2.75rem] sm:text-[4.5rem] lg:text-[6.5rem] break-words ${
                hasBackdrop ? "text-white" : ""
              }`}
            >
              {title}
            </span>
          )}
        </h1>

        {pitch.hero_subheadline && (
          <p
            className={`mt-[1.5rem] text-[1.25rem] sm:text-[1.75rem] font-semibold tracking-tight ${
              hasBackdrop ? "text-white/95" : ""
            }`}
            style={{ color: hasBackdrop ? undefined : accent }}
          >
            {pitch.hero_subheadline}
          </p>
        )}

        {pitch.hero_supporting_text && (
          <p
            className={`mt-[1rem] text-[1rem] sm:text-[1.125rem] max-w-[32rem] ${
              hasBackdrop ? "text-white/80" : "opacity-70"
            }`}
          >
            {pitch.hero_supporting_text}
          </p>
        )}
      </motion.div>

      <motion.div {...fade(0.15)} className="mt-[2.5rem] flex flex-wrap items-center gap-[1.25rem]">
        {heroVersion && heroSrc ? (
          <motion.button
            type="button"
            onClick={() => {
              playClick();
              toggle(heroId, heroSrc);
            }}
            onMouseEnter={playHover}
            aria-pressed={isPlayingHero}
            animate={reduceMotion || isPlayingHero ? { scale: 1 } : { scale: [1, 1.015, 1] }}
            transition={
              reduceMotion || isPlayingHero
                ? { duration: 0 }
                : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
            }
            whileHover={
              reduceMotion
                ? undefined
                : {
                    scale: 1.03,
                    boxShadow: `0 0.875rem 2rem -0.75rem rgba(0,0,0,0.5), 0 0 1.5rem -0.1rem ${accent}99`,
                    transition: { duration: 0.25, ease: "easeOut" },
                  }
            }
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className="group relative inline-flex items-center gap-[0.875rem] rounded-[1.5rem] pl-[1.25rem] pr-[1.875rem] py-[0.875rem] text-[1rem] font-bold tracking-[0.08em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
            style={{
              backgroundColor: accent,
              color: "#fff",
              outlineColor: accent,
              boxShadow: `0 0.75rem 2rem -0.75rem rgba(0,0,0,0.45), 0 0 1rem -0.25rem ${accent}66`,
            }}
          >
            {/* Soft accent glow — breathes gently while idle ("waiting to be
                pressed"), settles into a calm steady glow once playing
                ("clearly active") instead of vanishing. Skips the looping
                animation under prefers-reduced-motion but still renders a
                static glow — that's styling, not motion. */}
            <motion.span
              aria-hidden="true"
              className="absolute -inset-[0.3rem] rounded-[inherit] pointer-events-none"
              style={{ boxShadow: `0 0 1.25rem 0.15rem ${accent}` }}
              animate={
                reduceMotion
                  ? { opacity: isPlayingHero ? 0.3 : 0.18 }
                  : isPlayingHero
                    ? { opacity: 0.32 }
                    : { opacity: [0.12, 0.3, 0.12] }
              }
              transition={
                reduceMotion || isPlayingHero
                  ? { duration: 0.3 }
                  : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <span
              aria-hidden="true"
              className="relative flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full bg-white/14 transition-transform duration-300 group-hover:translate-x-[0.06rem]"
            >
              {isPlayingHero ? (
                <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="3" height="11" rx="1" fill="currentColor" />
                  <rect x="7" y="0.5" width="3" height="11" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ marginLeft: "0.1rem" }}>
                  <path d="M2 1L11 6.5L2 12V1Z" fill="currentColor" />
                </svg>
              )}
            </span>
            <span className="relative">{isPlayingHero ? "PAUSE" : heroButtonLabel}</span>
          </motion.button>
        ) : (
          <span
            className={`inline-flex items-center rounded-full px-[1.75rem] py-[1rem] text-[0.9375rem] font-semibold tracking-[0.08em] uppercase border ${
              hasBackdrop ? "border-white/30 text-white/60" : "border-current opacity-40"
            }`}
          >
            AUDIO COMING SOON
          </span>
        )}
      </motion.div>

      <motion.div
        {...fade(0.3)}
        className={`mt-[2.5rem] text-[0.75rem] sm:text-[0.8125rem] tracking-[0.2em] uppercase font-medium flex flex-wrap items-center gap-[0.75rem] ${
          hasBackdrop ? "text-white/70" : "opacity-60"
        }`}
      >
        {capabilityLabels.map((label, i) => (
          <React.Fragment key={`${label}-${i}`}>
            <span>{label}</span>
            {i < capabilityLabels.length - 1 && <span aria-hidden="true">•</span>}
          </React.Fragment>
        ))}
      </motion.div>
    </section>
  );
}
