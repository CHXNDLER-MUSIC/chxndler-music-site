"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { BrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl, getBrandTrackUrl } from "@/lib/brandPitchStorage";
import { Eyebrow, SectionShell } from "./ui";
import BrandAudioPlayer from "./BrandAudioPlayer";

export default function FullSong({ pitch, accent }: { pitch: BrandPitch; accent: string }) {
  const reduceMotion = useReducedMotion();
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const cover = getBrandArtUrl(pitch.cover_art_path);
  const fullSongSrc = getBrandTrackUrl(pitch.full_song_path);

  if (!fullSongSrc && !pitch.full_song_headline) return null;

  return (
    <SectionShell id="full-song" className="border-t border-current/10">
      <Eyebrow color={accent}>{pitch.full_song_eyebrow || "The Full Song"}</Eyebrow>

      {pitch.full_song_headline && (
        <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem] max-w-[38rem] mb-[3rem]">
          {pitch.full_song_headline}
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-[2rem] items-center">
        <div
          className="w-[8rem] h-[8rem] sm:w-[10rem] sm:h-[10rem] rounded-[0.75rem] overflow-hidden mx-auto sm:mx-0"
          style={{ backgroundColor: `${accent}14` }}
        >
          {cover ? (
            <img src={cover} alt={`${pitch.song_title} cover art`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[2rem] font-bold opacity-20" style={{ color: accent }}>
                ♪
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-[1.25rem] font-bold tracking-tight">{pitch.song_title}</p>
          <p className="text-[0.9375rem] opacity-60 mb-[1.5rem]">{pitch.artist_name}</p>

          {fullSongSrc ? (
            <BrandAudioPlayer
              id={pitch.full_song_path || ""}
              src={fullSongSrc}
              label={`${pitch.song_title} — full song`}
              accentColor={accent}
              size="lg"
            />
          ) : (
            <p className="text-[0.9375rem] opacity-50 italic">Full song coming soon.</p>
          )}
        </div>
      </div>

      {pitch.lyrics && (
        <div className="mt-[3rem]">
          <button
            type="button"
            onClick={() => setLyricsOpen((v) => !v)}
            aria-expanded={lyricsOpen}
            aria-controls="brand-lyrics-panel"
            className="text-[0.875rem] font-semibold tracking-[0.1em] uppercase underline underline-offset-4 decoration-1 hover:opacity-70 transition-opacity"
            style={{ color: accent }}
          >
            {lyricsOpen ? "Hide Lyrics" : "View Lyrics"}
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
                <p className="mt-[1.5rem] whitespace-pre-wrap text-[1rem] leading-relaxed opacity-75 max-w-[36rem]">
                  {pitch.lyrics}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </SectionShell>
  );
}
