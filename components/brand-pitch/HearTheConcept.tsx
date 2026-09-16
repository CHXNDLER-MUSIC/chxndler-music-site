"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { BrandPitch, BrandPitchAudioVersion } from "@/lib/brandPitch";
import { getBrandArtUrl, getBrandTrackUrl } from "@/lib/brandPitchStorage";
import type { PitchPalette } from "@/lib/brandPitchPalette";
import { getDerivedBackgroundImage, getDerivedPhotoAsset, type PitchAssetRegistry } from "@/lib/brandPitchVisuals";
import { Eyebrow, SectionShell, useAssetAvailable } from "./ui";
import BrandAudioPlayer from "./BrandAudioPlayer";
import { useInteractionSound } from "./useInteractionSound";
import CoverArtViewer from "./CoverArtViewer";

type ResolvedVersion = BrandPitchAudioVersion & { src: string };

type LyricsSection = { label: string | null; text: string };

/**
 * Splits raw lyrics into sections on bracketed labels ("[VERSE 1]",
 * "[CHORUS]", ...) so the panel can style those as small accent-colored
 * headers instead of dumping one undifferentiated block of text. Generic by
 * design — any brand's lyrics work the same way, nothing here assumes a
 * particular song's structure or wording.
 */
function parseLyricsSections(lyrics: string): LyricsSection[] {
  const sectionPattern = /^\s*\[([^\]]+)\]\s*$/;
  const sections: LyricsSection[] = [];
  let label: string | null = null;
  let lines: string[] = [];

  const flush = () => {
    const text = lines.join("\n").trim();
    if (label || text) sections.push({ label, text });
    lines = [];
  };

  for (const rawLine of lyrics.split(/\r?\n/)) {
    const match = rawLine.match(sectionPattern);
    if (match) {
      flush();
      label = match[1].trim();
    } else {
      lines.push(rawLine);
    }
  }
  flush();

  return sections;
}

function useKnownDuration(src: string | null): number | undefined {
  const [duration, setDuration] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = src;
    const onLoaded = () => {
      if (!cancelled && isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      cancelled = true;
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.src = "";
    };
  }, [src]);
  return duration;
}

function SupportingRow({
  version,
  accent,
  songTitle,
}: {
  version: ResolvedVersion;
  accent: string;
  songTitle: string;
}) {
  const knownDuration = useKnownDuration(version.src);
  return (
    <div className="py-[0.875rem]">
      <BrandAudioPlayer
        id={version.path}
        src={version.src}
        label={`${songTitle} — ${version.label.toLowerCase()}`}
        visibleLabel={version.label}
        accentColor={accent}
        size="sm"
        knownDuration={knownDuration}
      />
    </div>
  );
}

/**
 * "Hear the Concept" — the one place every playable version of the song
 * lives, ordered as a guided listening journey rather than a flat file list:
 * brand cut -> full song -> supporting content versions. Everything about
 * that hierarchy (which versions are primary pitch tabs, which are supporting
 * rows, which is the default, which one is "the" full song) comes from
 * pitch.alt_versions — nothing here assumes a fixed set of lengths or names,
 * so 15+full, 30+60+full, or 30+full+instrumental+acoustic all work the same way.
 *
 * Backed by "background 2.png" (derived from the brand's PHOTO folder, same
 * convention as the hero/cover art — no new Supabase field) with a campaign
 * tint over it for legibility, falling back to the plain light-campaign-color
 * surface if that file isn't uploaded, 404s, or was already used elsewhere
 * on the page (deduplicated via `assets`).
 */
export default function HearTheConcept({
  pitch,
  palette,
  assets,
}: {
  pitch: BrandPitch;
  palette: PitchPalette;
  assets: PitchAssetRegistry;
}) {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound();
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const versions = useMemo(() => {
    return pitch.alt_versions
      .map((v) => {
        const src = getBrandTrackUrl(v.path);
        return src ? { ...v, src } : null;
      })
      .filter((v): v is ResolvedVersion => v !== null);
  }, [pitch.alt_versions]);

  // Canonical tab order regardless of DB row order — anything not in this
  // list (a brand-specific label) keeps its original relative position at
  // the end, so this never hides an unrecognized version.
  const TAB_ORDER = ["30 SEC", "60 SEC", "FULL SONG", "INSTRUMENTAL"];
  const primary = useMemo(() => {
    const filtered = versions.filter((v) => v.role === "primary");
    return [...filtered].sort((a, b) => {
      const ai = TAB_ORDER.indexOf(a.label.toUpperCase());
      const bi = TAB_ORDER.indexOf(b.label.toUpperCase());
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [versions]);
  const supporting = useMemo(() => versions.filter((v) => v.role === "supporting"), [versions]);

  const defaultVersion = primary.find((v) => v.is_default) || primary[0] || null;
  const [selectedPath, setSelectedPath] = useState<string | null>(defaultVersion?.path ?? null);
  const selected = primary.find((v) => v.path === selectedPath) || defaultVersion;
  // Probed ahead of playback (same mechanism SupportingRow's compact rows
  // use below) so the duration readout shows the track's real length
  // immediately, instead of "0:00" until the listener presses play.
  const selectedKnownDuration = useKnownDuration(selected?.src ?? null);

  const coverAsset = useAssetAvailable(getBrandArtUrl(pitch.cover_art_path));
  const cover = coverAsset.src;
  const cdAsset = useAssetAvailable(getDerivedPhotoAsset(pitch, "cd.png"));
  const vinylAsset = useAssetAvailable(getDerivedPhotoAsset(pitch, "vinyl.png"));
  const cassetteAsset = useAssetAvailable(getDerivedPhotoAsset(pitch, "cassette.png"));
  const headline = pitch.audio_headline || (pitch.song_title ? `Hear "${pitch.song_title}."` : null);
  const supportingLine = pitch.audio_description || "One song, built to work from a quick brand moment to a full campaign.";
  const lyricsSections = useMemo(() => (pitch.lyrics ? parseLyricsSections(pitch.lyrics) : []), [pitch.lyrics]);

  if (!headline && !supportingLine && versions.length === 0) return null;

  // Claimed once per mount, not once per render: `assets.claim` mutates a
  // shared Set as a side effect, so calling it unmemoized here would
  // re-claim (and null out — the Set already has it from the first render)
  // this same url every time local state changes below (tab switch, lyrics
  // toggle), silently dropping the background on every subsequent render.
  const backgroundImage = useMemo(() => assets.claim(getDerivedBackgroundImage(pitch, 2)), [assets, pitch]);

  return (
    <SectionShell
      id="hear-the-concept"
      style={{ backgroundColor: palette.light, color: "#ffffff" }}
      backgroundImage={backgroundImage}
      backgroundOverlay={`${palette.light}1a`}
    >
      <Eyebrow color={palette.accent} style={{ fontSize: "1.0625rem" }}>
        {pitch.audio_eyebrow || "Hear the Concept"}
      </Eyebrow>

      {headline && (
        <h2 className="-mt-[0.35rem] font-bold leading-[1.02] tracking-tight text-[1.8rem] sm:text-[2.7rem] max-w-[38rem]">{headline}</h2>
      )}
      {supportingLine && (
        <p className="mt-[0.75rem] text-[1.0625rem] leading-relaxed opacity-75 max-w-[36rem]">{supportingLine}</p>
      )}

      <div className="mt-[2.25rem] grid grid-cols-1 lg:grid-cols-[minmax(0,24rem)_1fr] gap-[2.5rem] lg:gap-[4rem] items-start">
        {/* LEFT — cover art + song identity, one composition with the player on the right */}
        <div className="mx-auto lg:mx-0 w-full max-w-[21rem]">
          {cover ? (
            <CoverArtViewer
              src={cover}
              songTitle={pitch.song_title}
              accent={palette.accent}
              onError={coverAsset.onError}
              cd={cdAsset}
              vinyl={vinylAsset}
              cassette={cassetteAsset}
              className="aspect-square shadow-[0_1.5rem_3rem_-1rem_rgba(0,0,0,0.2)]"
            />
          ) : (
            <div
              className="relative w-full aspect-square rounded-[1rem] overflow-hidden shadow-[0_1.5rem_3rem_-1rem_rgba(0,0,0,0.2)]"
              style={{ backgroundColor: `${palette.accent}14` }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[3rem] font-bold opacity-20" style={{ color: palette.accent }}>
                  {pitch.brand_name?.slice(0, 1) || "♪"}
                </span>
              </div>
            </div>
          )}
          <p className="mt-[0.75rem] text-[1.125rem] font-bold tracking-tight">{pitch.song_title}</p>
          <p className="text-[0.9375rem] opacity-60">{pitch.artist_name}</p>
        </div>

        {/* RIGHT — primary listening experience, then supporting versions below a divider */}
        <div>
          {primary.length > 0 && selected && (
            <div>
              {primary.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Select a version"
                  className="inline-flex max-w-full items-center gap-[0.5rem] rounded-full p-[0.25rem] mb-[1.5rem] overflow-x-auto no-scrollbar"
                  style={{ backgroundColor: `${palette.accent}33` }}
                >
                  {primary.map((v) => {
                    const isSelected = selected.path === v.path;
                    return (
                      <motion.button
                        key={v.path}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => {
                          if (!isSelected) playClick();
                          setSelectedPath(v.path);
                        }}
                        onMouseEnter={playHover}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="flex-shrink-0 rounded-full px-[0.6875rem] py-[0.4375rem] text-[0.75rem] font-bold tracking-[0.04em] uppercase whitespace-nowrap transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
                        style={
                          isSelected
                            ? {
                                backgroundColor: palette.accent,
                                color: "#ffffff",
                                boxShadow: `0 0 0.6rem 0 ${palette.accent}66`,
                                outlineColor: palette.accent,
                              }
                            : { backgroundColor: "rgba(255,255,255,0.16)", color: "#ffffff", outlineColor: palette.accent }
                        }
                      >
                        {v.label}
                      </motion.button>
                    );
                  })}
                  <style jsx>{`
                    .no-scrollbar {
                      scrollbar-width: none;
                      -ms-overflow-style: none;
                    }
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                </div>
              )}

              {/* Crossfades between versions on tab switch — `layout` on this
                  wrapper smooths the height change between differently-sized
                  content (e.g. a description that only some versions have)
                  instead of the surrounding layout jumping. */}
              <motion.div layout={!reduceMotion}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.path}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? {} : { opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                  >
                    <h3 className="text-[1.25rem] sm:text-[1.5rem] font-bold tracking-tight">{selected.label}</h3>
                    {selected.description && (
                      <p className="mt-[0.4rem] text-[1rem] leading-relaxed opacity-70 max-w-[32rem]">{selected.description}</p>
                    )}

                    <div className="mt-[1.25rem]">
                      <BrandAudioPlayer
                        id={selected.path}
                        src={selected.src}
                        label={`${pitch.song_title} — ${selected.label.toLowerCase()}`}
                        accentColor={palette.accent}
                        size="lg"
                        knownDuration={selectedKnownDuration}
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Deliberately OUTSIDE the per-version crossfade above: the
                  lyrics belong to the song as a whole, not to whichever
                  version tab happens to be selected, so switching tabs must
                  never remount (and re-collapse) this panel. Sized as a
                  secondary/tertiary interaction now — "Explore the Campaign"
                  below is the section's actual closing CTA. */}
              {pitch.lyrics && (
                <div className="mt-[1.5rem]">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setLyricsOpen((v) => !v);
                    }}
                    onMouseEnter={playHover}
                    aria-expanded={lyricsOpen}
                    aria-controls="brand-lyrics-panel"
                    className="inline-flex items-center gap-[0.4rem] text-[0.9375rem] font-semibold tracking-[0.08em] uppercase opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: "currentColor" }}
                  >
                    {lyricsOpen ? "Hide Lyrics" : "View Lyrics"} <span aria-hidden="true">{lyricsOpen ? "↑" : "↓"}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {lyricsOpen && (
                      <motion.div
                        id="brand-lyrics-panel"
                        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-[1rem] max-w-[32rem]">
                          <p className="text-[0.6875rem] font-bold tracking-[0.2em] uppercase opacity-50">
                            {pitch.song_title} — Lyrics
                          </p>
                          <div className="mt-[1rem] flex flex-col gap-[1rem]">
                            {lyricsSections.map((section, i) => (
                              <div key={i}>
                                {section.label && (
                                  <p
                                    className="text-[0.6875rem] font-bold tracking-[0.2em] uppercase mb-[0.3rem]"
                                    style={{ color: palette.accent }}
                                  >
                                    {section.label}
                                  </p>
                                )}
                                {section.text && (
                                  <p className="whitespace-pre-line text-[1rem] leading-snug opacity-75">
                                    {section.text}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {supporting.length > 0 && (
            <div className={primary.length > 0 ? "mt-[2.5rem] pt-[2rem] border-t border-current/10" : ""}>
              <p className="text-[0.75rem] font-semibold tracking-[0.15em] uppercase opacity-50">
                {pitch.alt_versions_headline || "Versions for Content"}
              </p>
              <p className="mt-[0.35rem] text-[0.9375rem] opacity-60 max-w-[28rem]">
                {pitch.alt_versions_description || "Flexible assets for social, film and campaign edits."}
              </p>

              <div className="mt-[1rem] flex flex-col divide-y divide-current/10">
                {supporting.map((v) => (
                  <SupportingRow key={v.path} version={v} accent={palette.accent} songTitle={pitch.song_title} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
