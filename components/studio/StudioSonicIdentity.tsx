"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { useBrandAudio } from "@/components/brand-pitch/BrandAudioContext";
import SonicWaveform from "@/components/brand-pitch/SonicWaveform";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";
import { STUDIO_BG_ALT, STUDIO_PINK } from "./identity";
import type { StudioWorkItem } from "./types";

function PlayPauseGlyph({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="w-[0.9rem] h-[0.9rem]">
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

/**
 * "Every Brand Should Have a Sound" — demonstrates the studio's sonic-
 * identity work using the real sonic-logo cuts already stored per brand
 * (the same primary cut BrandPitchPage's own SonicIdentity section plays),
 * never fabricated audio. Renders one row per project that actually has a
 * sonic-logo path; if none do, the section renders nothing rather than an
 * empty state.
 */
export default function StudioSonicIdentity({ projects }: { projects: StudioWorkItem[] }) {
  const examples = projects.filter((p) => !!p.sonicPreviewUrl);
  if (examples.length === 0) return null;

  return (
    <SectionShell style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}>
      <div className="text-center">
        <Eyebrow color={STUDIO_PINK} className="!mb-[0.75rem]">
          Sonic Identity
        </Eyebrow>
        <h2 className="font-bold uppercase leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem] max-w-[36rem] mx-auto">
          Every Brand Should
          <br />
          Have a Sound.
        </h2>
      </div>

      <div className="mt-[3rem] sm:mt-[4rem] max-w-[40rem] mx-auto flex flex-col divide-y divide-white/10">
        {examples.map((project) => (
          <SonicRow key={project.slug} project={project} />
        ))}
      </div>
    </SectionShell>
  );
}

function SonicRow({ project }: { project: StudioWorkItem }) {
  const reduceMotion = useReducedMotion();
  const { activeId, playing, loading, toggle, getAnalyser } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();

  const id = project.sonicPreviewUrl!;
  const isActive = activeId === id;
  const isPlaying = isActive && playing;
  const isLoading = isActive && loading;
  const analyser = isPlaying ? getAnalyser() : null;

  return (
    <div className="flex items-center gap-[1.25rem] py-[1.25rem]">
      <button
        type="button"
        onClick={() => {
          playClick();
          toggle(id, id);
        }}
        onMouseEnter={playHover}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? `Pause ${project.brandName} sonic signature` : `Play ${project.brandName} sonic signature`}
        className="flex-shrink-0 inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
        style={{
          borderColor: isPlaying ? STUDIO_PINK : "rgba(255,255,255,0.25)",
          color: isPlaying ? STUDIO_PINK : "#ffffff",
          outlineColor: STUDIO_PINK,
        }}
      >
        {isLoading ? <span className="text-[0.875rem]">…</span> : <PlayPauseGlyph playing={isPlaying} />}
      </button>

      <div className="min-w-0 text-left">
        <p className="text-[1rem] sm:text-[1.0625rem] font-bold tracking-tight truncate">{project.brandName}</p>
        <p className="text-[0.6875rem] tracking-[0.2em] uppercase text-white/45">Sonic Signature</p>
      </div>

      <div className="ml-auto w-[5rem] sm:w-[7rem] h-[1.5rem] flex-shrink-0">
        <SonicWaveform
          analyser={analyser}
          active={isPlaying}
          color={isPlaying ? STUDIO_PINK : "#ffffff"}
          reduceMotion={!!reduceMotion}
        />
      </div>
    </div>
  );
}
