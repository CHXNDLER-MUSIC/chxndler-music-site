"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBrandAudio } from "./BrandAudioContext";
import { useInteractionSound } from "./useInteractionSound";
import { releaseAudioId, releaseAudioSrc, releaseNowPlaying, type ArtistRelease } from "./artistRelease";
import CollectibleViewer from "./CollectibleViewer";
import { Space_Grotesk } from "next/font/google";

// Lyrics typeface — self-hosted by next/font, loaded only with this view.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

// Same fixed CHXNDLER pink the rest of the studio launcher uses.
const PINK = "#ff3ea5";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Lyrics files separate verses with blank lines; trailing spaces vary. */
function splitVerses(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((verse) => verse.split("\n").map((line) => line.trimEnd()).join("\n").trim())
    .filter(Boolean);
}

type LyricsState = { status: "loading" } | { status: "ready"; text: string } | { status: "missing" };

/**
 * One release's song view inside the "Other Projects" modal: cover + title,
 * a player on the page's shared brand <audio> element, streaming links,
 * scrollable lyrics, the collectible card, and the music video. Sections
 * with nothing to show (no lyrics file, no card, no video) are left out.
 */
export default function ArtistReleaseDetail({ release }: { release: ArtistRelease }) {
  const { activeId, playing, loading, error, currentTime, duration, toggle, seek } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();
  const [lyrics, setLyrics] = useState<LyricsState>({ status: "loading" });
  const [lyricsOpen, setLyricsOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  // Latest toggle for the Space shortcut below (its listener is bound once).
  const togglePlaybackRef = useRef(() => {});
  togglePlaybackRef.current = () => toggle(id, releaseAudioSrc(release.slug), releaseNowPlaying(release));

  // Space plays/pauses the song while this view is open. Left alone when
  // Space already means something: typing, a button/link the user tabbed to
  // (where it presses that control), and when another viewer (the
  // collectible card popout) is open on top of this one. A button that's
  // only focused because it was clicked (no :focus-visible) doesn't count.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && target !== document.body) {
        if (target.isContentEditable || target.closest("textarea, select")) return;
        const control = target.closest("button, a[href], [role='button'], [role='tab']");
        if (control && control.matches(":focus-visible")) return;
        if (target instanceof HTMLInputElement && target.type !== "range") return;
        const dialog = rootRef.current?.closest("[role='dialog']");
        if (dialog && !dialog.contains(target)) return;
      }
      e.preventDefault(); // no page/modal scroll
      togglePlaybackRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const id = releaseAudioId(release.slug);
  const isActive = activeId === id;
  const isPlaying = isActive && playing;
  const isLoading = isActive && loading;
  const shownTime = isActive ? currentTime : 0;
  const shownDuration = isActive ? duration : 0;

  // Same lyrics source the HUD uses (lyrics/<slug>.md via /api/lyrics).
  useEffect(() => {
    let cancelled = false;
    setLyrics({ status: "loading" });
    fetch(`/api/lyrics/${encodeURIComponent(release.slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const text = typeof data?.content === "string" ? data.content.trim() : "";
        setLyrics(text ? { status: "ready", text } : { status: "missing" });
      })
      .catch(() => {
        if (!cancelled) setLyrics({ status: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [release.slug]);

  const streamingLinks = [
    { label: "Spotify", href: release.spotifyUrl, color: "#1ed760" },
    { label: "Apple Music", href: release.appleMusicUrl, color: "#fa2d48" },
    { label: "YouTube", href: release.youtubeUrl, color: "#ff0033" },
  ];

  return (
    <div ref={rootRef}>
      {/* Cover + title / player / streaming links */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-[1.25rem] sm:gap-[2rem] items-center">
        {/* The cover doubles as a play/pause button. */}
        <button
          type="button"
          onClick={() => {
            playClick();
            toggle(id, releaseAudioSrc(release.slug), releaseNowPlaying(release));
          }}
          onMouseEnter={playHover}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${release.title}`}
          className="group grid w-full max-w-[22rem] mx-auto sm:max-w-none overflow-hidden rounded-[0.75rem] border border-white/10 bg-white/5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
          style={{ aspectRatio: "1 / 1", boxShadow: `0 0 2.5rem -1rem ${PINK}88`, outlineColor: PINK }}
        >
          <img
            src={release.coverArt}
            alt=""
            className="[grid-area:1/1] w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            data-no-lazy=""
          />
          {/* Play/pause glyph — shows on hover, and stays while paused. */}
          <span
            aria-hidden="true"
            className={`[grid-area:1/1] flex items-center justify-center bg-black/25 transition-opacity duration-200 ${
              isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            <span className="flex items-center justify-center w-[22%] min-w-[3rem] aspect-square rounded-full bg-black/60 text-white">
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[45%] h-[45%] translate-x-[6%]" fill="currentColor">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                </svg>
              )}
            </span>
          </span>
        </button>

        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold tracking-[0.35em] uppercase" style={{ color: PINK }}>
            CHXNDLER
          </p>
          <h3 className="mt-[0.25rem] text-[1.5rem] sm:text-[2.25rem] font-bold uppercase leading-tight tracking-tight text-white break-words">
            {release.title}
          </h3>

          {/* Player */}
          <div className="mt-[1.25rem] flex items-center gap-[0.875rem]">
            <button
              type="button"
              onClick={() => {
                playClick();
                toggle(id, releaseAudioSrc(release.slug), releaseNowPlaying(release));
              }}
              onMouseEnter={playHover}
              aria-label={`${isPlaying ? "Pause" : "Play"} ${release.title}`}
              className="flex-none inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full text-black transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
              style={{ background: PINK, outlineColor: PINK }}
            >
              {isLoading ? (
                <span className="block w-[1.25rem] h-[1.25rem] rounded-full border-2 border-black/25 border-t-black animate-spin" />
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-[1.375rem] h-[1.375rem]" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-[1.375rem] h-[1.375rem] translate-x-[0.1rem]" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min={0}
                max={shownDuration || 0}
                step={0.1}
                value={Math.min(shownTime, shownDuration || 0)}
                disabled={!isActive || shownDuration <= 0}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek"
                className="release-seek w-full"
                style={{
                  background: `linear-gradient(to right, ${PINK} ${shownDuration > 0 ? (shownTime / shownDuration) * 100 : 0}%, rgba(255,255,255,0.15) 0)`,
                }}
              />
              <div className="mt-[0.375rem] flex justify-between text-[0.75rem] tabular-nums text-white/50">
                <span>{formatTime(shownTime)}</span>
                <span>{shownDuration > 0 ? formatTime(shownDuration) : "--:--"}</span>
              </div>
            </div>
          </div>
          {isActive && error && <p className="mt-[0.5rem] text-[0.75rem] text-white/50">{error}</p>}

          {/* Streaming links */}
          <div className="mt-[1.25rem] flex flex-wrap gap-[0.5rem]">
            {streamingLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={playClick}
                onMouseEnter={playHover}
                className="inline-flex items-center gap-[0.5rem] rounded-full border border-white/15 bg-white/[0.04] px-[0.875rem] py-[0.5rem] text-[0.75rem] font-bold uppercase tracking-[0.1em] text-white/80 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
                style={{ outlineColor: PINK }}
              >
                <span aria-hidden="true" className="w-[0.5rem] h-[0.5rem] rounded-full" style={{ background: link.color }} />
                {link.label}
                <span aria-hidden="true" className="text-white/40">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Lyrics + collectible card */}
      {(lyrics.status !== "missing" || release.cardArt) && (
        <div
          className={`mt-[2rem] grid grid-cols-1 gap-[1.5rem] ${
            lyrics.status !== "missing" && release.cardArt ? "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start" : ""
          }`}
        >
          {lyrics.status !== "missing" && (
            <section aria-label="Lyrics" className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setLyricsOpen((v) => !v);
                }}
                onMouseEnter={playHover}
                aria-expanded={lyricsOpen}
                aria-controls={`lyrics-${release.slug}`}
                className="group inline-flex items-center gap-[0.5rem] rounded-full py-[0.125rem] text-white/50 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
                style={{ outlineColor: PINK }}
              >
                <span className="text-[0.6875rem] font-bold tracking-[0.3em] uppercase">Lyrics</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-[0.875rem] h-[0.875rem] transition-transform duration-200 ease-out"
                  style={{ transform: lyricsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
                <span className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-white/30 group-hover:text-white/60">
                  {lyricsOpen ? "Hide" : "Show"}
                </span>
              </button>
              {/* 0fr <-> 1fr row trick: animates to the content's real height. */}
              <div
                id={`lyrics-${release.slug}`}
                className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                style={{ gridTemplateRows: lyricsOpen ? "1fr" : "0fr" }}
                // React 18 renders inert={false} as inert="false" (still inert),
                // so the attribute is only added while collapsed.
                {...(lyricsOpen ? {} : ({ inert: "" } as Record<string, string>))}
              >
                <div className="min-h-0 overflow-hidden">
                  {/* No box — just a soft dark wash fading out to the right so
                      the lyrics sit on the sky, with the scroll edges faded too. */}
                  <div
                    className={`${spaceGrotesk.className} mt-[0.5rem] rounded-[1.25rem]`}
                    style={{
                      background:
                        "linear-gradient(to right, rgba(8,8,12,0.55) 0%, rgba(8,8,12,0.3) 55%, rgba(8,8,12,0) 100%)",
                    }}
                  >
                    <div
                      className="lyrics-scroll max-h-[28rem] overflow-y-auto overscroll-contain px-[1rem] sm:px-[1.25rem] py-[1.75rem]"
                      style={{
                        maskImage: "linear-gradient(to bottom, transparent 0, #000 1.5rem, #000 calc(100% - 2.5rem), transparent 100%)",
                        WebkitMaskImage:
                          "linear-gradient(to bottom, transparent 0, #000 1.5rem, #000 calc(100% - 2.5rem), transparent 100%)",
                      }}
                    >
                      {lyrics.status === "loading" ? (
                        <p className="text-[0.9375rem] text-white/40">Loading lyrics…</p>
                      ) : (
                        splitVerses(lyrics.text).map((verse, i) => (
                          <p
                            key={i}
                            className="whitespace-pre-line text-[0.9375rem] sm:text-[1.0625rem] text-white/85 [&:not(:last-child)]:mb-[1.75em]"
                            style={{ lineHeight: 1.85, letterSpacing: "0.005em", textShadow: "0 0.0625rem 0.75rem rgba(0,0,0,0.55)" }}
                          >
                            {verse}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {release.cardArt && (
            <section aria-label="Collectible card" className="min-w-0">
              <SectionLabel>Collectible Card</SectionLabel>
              {/* Same tap-to-inspect popout as the pitch's own Collectible
                  section: drag to tilt/spin, tap to flip to the card back. */}
              <div className="mt-[0.75rem] mx-auto w-[70%] max-w-[18rem] md:w-full flex justify-center">
                <CollectibleViewer src={release.cardArt} songTitle={release.title} accent={PINK} />
              </div>
            </section>
          )}
        </div>
      )}

      {/* Music video */}
      {release.videoEmbedUrl && (
        <section aria-label="Music video" className="mt-[2rem]">
          <SectionLabel>Music Video</SectionLabel>
          <div className="mt-[0.75rem] w-full overflow-hidden rounded-[0.75rem] border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              src={`${release.videoEmbedUrl}?rel=0`}
              title={`${release.title} music video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="w-full h-full"
            />
          </div>
        </section>
      )}

      <style jsx>{`
        .lyrics-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        .release-seek {
          -webkit-appearance: none;
          appearance: none;
          height: 0.25rem;
          border-radius: 9999px;
          cursor: pointer;
        }
        .release-seek:disabled {
          cursor: default;
        }
        .release-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 0.875rem;
          height: 0.875rem;
          border-radius: 9999px;
          background: #fff;
        }
        .release-seek::-moz-range-thumb {
          width: 0.875rem;
          height: 0.875rem;
          border: none;
          border-radius: 9999px;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[0.6875rem] font-bold tracking-[0.3em] uppercase text-white/50">{children}</h4>;
}
