"use client";

import React from "react";
import { useBrandAudio } from "./BrandAudioContext";
import { formatTime } from "./ui";
import { useInteractionSound } from "./useInteractionSound";

type BrandAudioPlayerProps = {
  id: string;
  src: string;
  label: string;
  accentColor?: string;
  size?: "sm" | "lg";
  className?: string;
  /** Duration to show before this track has ever been played/loaded (e.g.
   * probed ahead of time for compact rows) — ignored once it's the active track. */
  knownDuration?: number;
  /** Visible text label between the button and the scrubber — for compact
   * rows (e.g. "INSTRUMENTAL") where the title isn't shown elsewhere. */
  visibleLabel?: string;
};

/** A scrubbable, accessible play/pause + progress control — not the browser default <audio> UI. */
export default function BrandAudioPlayer({
  id,
  src,
  label,
  accentColor = "#111111",
  size = "lg",
  className = "",
  knownDuration,
  visibleLabel,
}: BrandAudioPlayerProps) {
  const { activeId, playing, loading, currentTime, duration, toggle, seek } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();
  const isThis = activeId === id;
  const isPlaying = isThis && playing;
  const isLoading = isThis && loading;
  const time = isThis ? currentTime : 0;
  const dur = isThis ? duration : knownDuration ?? 0;

  const buttonSize = size === "lg" ? "w-[4.375rem] h-[4.375rem]" : "w-[3rem] h-[3rem]";

  return (
    <div
      className={`flex items-center gap-[0.75rem] w-full ${size === "lg" ? "max-w-[31rem]" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={() => {
          playClick();
          toggle(id, src);
        }}
        onMouseEnter={playHover}
        aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
        aria-pressed={isPlaying}
        className={`flex-shrink-0 ${buttonSize} rounded-full flex items-center justify-center border-2 backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 hover:!bg-[var(--accent)] hover:shadow-[0_0_0.75rem_0_var(--accent-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]`}
        style={
          {
            backgroundColor: "rgba(12,12,18,0.35)",
            borderColor: accentColor,
            outlineColor: accentColor,
            "--accent": accentColor,
            "--accent-glow": `${accentColor}66`,
          } as React.CSSProperties
        }
      >
        {isLoading ? (
          <span
            className="block w-[1.25rem] h-[1.25rem] rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden="true"
          />
        ) : isPlaying ? (
          <span className="flex gap-[0.35rem]" aria-hidden="true">
            <span className="w-[0.4rem] h-[1.25rem] bg-white rounded-sm" />
            <span className="w-[0.4rem] h-[1.25rem] bg-white rounded-sm" />
          </span>
        ) : (
          <span
            className="block ml-[0.2rem]"
            style={{
              width: "0",
              height: "0",
              borderTop: "0.65rem solid transparent",
              borderBottom: "0.65rem solid transparent",
              borderLeft: "1rem solid white",
            }}
            aria-hidden="true"
          />
        )}
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-[0.5rem]">
        {visibleLabel && (
          <span className="text-[0.8125rem] font-semibold tracking-[0.04em] uppercase flex-shrink-0 max-w-[7rem] sm:max-w-[10rem] truncate">
            {visibleLabel}
          </span>
        )}
        <span className="text-[0.6875rem] font-mono tabular-nums opacity-60 w-[2.5rem] text-right">
          {formatTime(time)}
        </span>
        <input
          type="range"
          min={0}
          max={dur || 0.01}
          step={0.01}
          value={Math.min(time, dur || 0)}
          onChange={(e) => {
            if (!isThis) toggle(id, src);
            seek(parseFloat(e.target.value));
          }}
          aria-label={`Seek ${label}`}
          className={`flex-1 h-[0.25rem] rounded-full appearance-none cursor-pointer accent-[var(--brand-accent-native)] ${
            size === "lg" ? "max-w-[24rem]" : ""
          }`}
          style={{ accentColor }}
        />
        <span className="text-[0.6875rem] font-mono tabular-nums opacity-60 w-[2.5rem]">{formatTime(dur)}</span>
      </div>
    </div>
  );
}
