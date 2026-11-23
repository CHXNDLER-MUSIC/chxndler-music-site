"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBrandAudio } from "./BrandAudioContext";
import { useInteractionSound } from "./useInteractionSound";
import { releaseAudioId, releaseAudioSrc, releaseNowPlaying, type ArtistRelease } from "./artistRelease";
import CollectibleViewer from "./CollectibleViewer";
import CollabRequestForm from "@/components/collab/CollabRequestForm";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { CHXNDLER_APPLE_MUSIC_ARTIST_URL, CHXNDLER_SPOTIFY_ARTIST_URL } from "@/lib/chxndlerLinks";

// Same fixed CHXNDLER pink the rest of the studio launcher uses.
const PINK = "#ff3ea5";

function ContributionIcon({ type }: { type: string }) {
  const iconClass = "h-5 w-5";
  if (type === "feature") return <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg>;
  if (type === "remix") return <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>;
}

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
export default function ArtistReleaseDetail({
  release,
  audioSrcOverride,
  instrumentalSrcOverride = null,
  audioIdOverride,
  lyricsUrlOverride,
  meaningUrlOverride,
  showLyricsSection = false,
  showInstrumentalControl = false,
  showCollabRequest = false,
  showStreamingLinks = true,
  invitedName = "",
  invitedEmail = "",
}: {
  release: ArtistRelease;
  audioSrcOverride?: string;
  instrumentalSrcOverride?: string | null;
  audioIdOverride?: string;
  lyricsUrlOverride?: string | null;
  meaningUrlOverride?: string | null;
  showLyricsSection?: boolean;
  showInstrumentalControl?: boolean;
  showCollabRequest?: boolean;
  showStreamingLinks?: boolean;
  invitedName?: string;
  invitedEmail?: string;
}) {
  const { activeId, playing, loading, error, currentTime, duration, toggle, play, seek } = useBrandAudio();
  const { playHover, playClick } = useInteractionSound();
  const [lyrics, setLyrics] = useState<LyricsState>({ status: "loading" });
  const [meaning, setMeaning] = useState<string | null>(null);
  const [meaningOpen, setMeaningOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"lyrics" | "collectible" | "video">("lyrics");
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabChoicesOpen, setCollabChoicesOpen] = useState(false);
  const [contributionType, setContributionType] = useState("");
  const [collabInitialMessage, setCollabInitialMessage] = useState("");
  const [collabChoiceNotice, setCollabChoiceNotice] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Latest toggle for the Space shortcut below (its listener is bound once).
  const togglePlaybackRef = useRef(() => {});
  togglePlaybackRef.current = () => {
    if (audioSrc) toggle(id, audioSrc, releaseNowPlaying(release));
  };

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

  const id = audioIdOverride || releaseAudioId(release.slug);
  const mainAudioSrc = audioSrcOverride !== undefined ? audioSrcOverride : releaseAudioSrc(release.slug);
  const audioSrc = isInstrumental && instrumentalSrcOverride ? instrumentalSrcOverride : mainAudioSrc;
  const isActive = activeId === id;
  const isPlaying = isActive && playing;
  const isLoading = isActive && loading;
  const shownTime = isActive ? currentTime : 0;
  const shownDuration = isActive ? duration : 0;

  // Same lyrics source the HUD uses (lyrics/<slug>.md via /api/lyrics).
  useEffect(() => {
    let cancelled = false;
    if (lyricsUrlOverride === null) {
      setLyrics({ status: "missing" });
      return () => { cancelled = true; };
    }
    setLyrics({ status: "loading" });
    const request = (async () => {
      if (typeof lyricsUrlOverride === "string") {
        const asset = await fetch(lyricsUrlOverride);
        if (asset.ok) {
          const content = await asset.text();
          if (content.trim()) return content;
        }
      }
      const fallback = await fetch(`/api/lyrics/${encodeURIComponent(release.slug)}`);
      return fallback.ok ? fallback.json() : null;
    })();
    request
      .then((data) => {
        if (cancelled) return;
        const rawText = typeof data === "string" ? data : typeof data?.content === "string" ? data.content : "";
        const text = rawText.replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/gm, "").trim();
        setLyrics(text ? { status: "ready", text } : { status: "missing" });
      })
      .catch(() => {
        if (!cancelled) setLyrics({ status: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [release.slug, lyricsUrlOverride]);

  useEffect(() => {
    let cancelled = false;
    setMeaning(null);
    if (!meaningUrlOverride) return () => { cancelled = true; };
    fetch(meaningUrlOverride)
      .then((response) => response.ok ? response.text() : "")
      .then((text) => { if (!cancelled) setMeaning(text.trim() || null); })
      .catch(() => { if (!cancelled) setMeaning(null); });
    return () => { cancelled = true; };
  }, [meaningUrlOverride]);

  return (
    <div ref={rootRef}>
      {/* Cover + title / player / streaming links */}
      <div className="grid grid-cols-1 gap-[1.25rem] sm:gap-[2rem] items-center">
        {/* The cover doubles as a play/pause button. */}
        <button
          type="button"
          disabled={!audioSrc}
          onClick={() => {
            if (!audioSrc) return;
            playClick();
            toggle(id, audioSrc, releaseNowPlaying(release));
          }}
          onMouseEnter={playHover}
          aria-label={audioSrc ? `${isPlaying ? "Pause" : "Play"} ${release.title}` : `${release.title} cover art`}
          className={`group relative block w-full max-w-[22rem] mx-auto overflow-hidden rounded-[0.75rem] border border-white/10 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] ${audioSrc ? "cursor-pointer" : "cursor-default"}`}
          style={{ aspectRatio: "1 / 1", boxShadow: `0 0 2.5rem -1rem ${PINK}88`, outlineColor: PINK }}
        >
          <img
            src={release.coverArt}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            data-no-lazy=""
          />
          {/* Play/pause glyph — shows on hover, and stays while paused. */}
          {audioSrc && <span
            aria-hidden="true"
            className={`absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-200 ${
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
          </span>}
        </button>

        {showCollabRequest && <button
          type="button"
          onClick={() => { setCollabChoiceNotice(""); setCollabChoicesOpen(true); }}
          onMouseEnter={playHover}
          className="mx-auto -mt-[0.5rem] flex min-h-12 w-full max-w-[22rem] items-center justify-center rounded-full bg-[#ff3ea5] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_0_24px_#ff3ea555] transition hover:bg-[#ff66b4] hover:shadow-[0_0_30px_#ff3ea577] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >Collaborate</button>}

        {showStreamingLinks && <div className="mx-auto -mt-1 flex w-full max-w-[22rem] justify-center gap-2" aria-label="Listen on streaming services">
          <a aria-label="Listen on Spotify" title="Spotify" href={release.spotifyUrl || CHXNDLER_SPOTIFY_ARTIST_URL} target="_blank" rel="noreferrer" className="streaming-link streaming-link-spotify"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M6.2 9.2c4.3-1.2 8.6-.8 12 1.2M7.2 12.1c3.5-.9 6.8-.5 9.6 1M8.1 14.8c2.5-.6 4.9-.3 7 .7" fill="none" stroke="#09090c" strokeWidth="1.5" strokeLinecap="round"/></svg><span className="sr-only">Spotify</span></a>
          <a aria-label="Listen on Apple Music" title="Apple Music" href={release.appleMusicUrl || CHXNDLER_APPLE_MUSIC_ARTIST_URL} target="_blank" rel="noreferrer" className="streaming-link streaming-link-apple"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor"><path d="M19 3v12.2a3.8 3.8 0 1 1-2-3.35V7.1l-7 1.55v9.05a3.8 3.8 0 1 1-2-3.35V6.95L19 3Z"/></svg><span className="sr-only">Apple Music</span></a>
        </div>}

        {(instrumentalSrcOverride || showInstrumentalControl) && (
          <div className="mx-auto -mt-[0.5rem] w-full max-w-[22rem]">
            <button
              type="button"
              disabled={!instrumentalSrcOverride}
              title={!instrumentalSrcOverride ? "No instrumental audio file was found for this track." : undefined}
              aria-pressed={isInstrumental}
              onClick={() => {
                const nextIsInstrumental = !isInstrumental;
                setIsInstrumental(nextIsInstrumental);
                play(id, nextIsInstrumental ? instrumentalSrcOverride || mainAudioSrc : mainAudioSrc, releaseNowPlaying(release));
              }}
              onMouseEnter={playHover}
              className={`inline-flex min-h-[2.5rem] items-center justify-center rounded-full border px-[1rem] py-[0.55rem] text-[0.6875rem] font-extrabold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem] disabled:cursor-not-allowed disabled:opacity-40 ${isInstrumental ? "border-[#ff3ea5] bg-[#ff3ea5] text-black" : "border-white/20 bg-white/[0.04] text-white/80 hover:border-white/45 hover:text-white"}`}
              style={{ outlineColor: PINK }}
            >
              {isInstrumental ? "Play Full Song" : "Instrumental"}
            </button>
          </div>
        )}

        <div className="min-w-0 w-full max-w-[42rem] mx-auto">
          <p className="text-[0.6875rem] font-bold tracking-[0.35em] uppercase" style={{ color: PINK }}>
            CHXNDLER
          </p>
          <h3 className={`font-sans mt-[0.25rem] text-[1.5rem] sm:text-[2.25rem] font-bold uppercase leading-tight tracking-[0.015em] text-white break-words`} style={{ textShadow: "0 0 22px rgba(255,62,165,.22)" }}>
            {release.title}
          </h3>
          {(release.oneLiner || release.slug !== "play-house") && <p className="mt-2 max-w-prose text-sm leading-6 text-white/75">{release.oneLiner || `${release.title} is ready for its next visual chapter.`}</p>}

          {/* Player */}
          <div className="mt-[1.25rem] flex items-center gap-[0.875rem]">
            <button
              type="button"
              disabled={!audioSrc}
              onClick={() => {
                if (!audioSrc) return;
                playClick();
                toggle(id, audioSrc, releaseNowPlaying(release));
              }}
              onMouseEnter={playHover}
              aria-label={audioSrc ? `${isPlaying ? "Pause" : "Play"} ${release.title}` : `${release.title} audio coming soon`}
              className={`flex-none inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full text-black transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] ${audioSrc ? "hover:scale-105" : "opacity-45 cursor-not-allowed"}`}
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
                disabled={!audioSrc || !isActive || shownDuration <= 0}
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
          {!audioSrc && <p className="mt-[0.5rem] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/40">Audio file coming soon</p>}
          {audioSrc && isActive && error && <p className="mt-[0.5rem] text-[0.75rem] text-white/50">{error}</p>}
          <nav role="tablist" aria-label="Song details" className="mt-5 grid grid-cols-3 gap-2 rounded-full border border-white/10 bg-black/35 p-1">
            {([ ["lyrics", "Lyrics"], ["collectible", "Collectible"], ["video", "Music Video"] ] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={detailTab === key} onClick={() => setDetailTab(key)} onMouseEnter={playHover} className="rounded-full px-2 py-3 text-[0.62rem] font-black uppercase tracking-[0.12em] transition-all sm:text-xs" style={detailTab === key ? { color: PINK, background: "rgba(255,62,165,.14)", boxShadow: `inset 0 0 0 1px ${PINK}88, 0 0 18px ${PINK}33`, textShadow: `0 0 10px ${PINK}88` } : { color: "rgba(255,255,255,.62)" }}>{label}</button>)}
          </nav>
        </div>
      </div>

      {collabChoicesOpen && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCollabChoicesOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="collab-options-title" className="w-full max-w-2xl rounded-t-3xl border border-white/10 bg-[#101014] p-5 text-white shadow-2xl sm:rounded-2xl sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff3ea5]">{release.title}</p><h2 id="collab-options-title" className="mt-2 text-2xl font-black">How would you like to collaborate?</h2>{release.videoConcept && release.collaborationOpportunities?.includes("video") && <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Video vision: {release.videoConcept}</p>}</div><div className="mt-5 grid gap-2 sm:grid-cols-2">{([["feature", "SING / FEATURE", "Sing or rap a verse, or add a vocal feature.", "Vocals / Feature"], ["remix", "REMIX", "Shape the production, arrangement, or a remix.", "Production / Remix"], ["video", "CREATE MUSIC VIDEO", "Pitch a visual treatment or video collaboration.", "Music Video"]] as const).filter(([key]) => key === "remix" || (!release.isReleased && ((key === "feature" && (release.collaborationOpportunities?.includes("feature") || release.readyForCollab)) || (key === "video" && release.collaborationOpportunities?.includes("video"))))).map(([key, label, description, contribution]) => <button key={label} type="button" onClick={() => { setContributionType(contribution); setCollabChoiceNotice(""); }} aria-pressed={contributionType === contribution} className={`rounded-xl border p-4 text-left transition ${contributionType === contribution ? "border-[#ff3ea5] bg-[#ff3ea5]/10" : "border-white/10 bg-white/[.03] hover:border-white/25"}`}><span className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ color: key === "feature" ? "#ff75ba" : key === "remix" ? "#7dd3fc" : "#c4a1ff", backgroundColor: key === "feature" ? "rgba(255,117,186,.12)" : key === "remix" ? "rgba(125,211,252,.12)" : "rgba(196,161,255,.12)" }}><ContributionIcon type={key} /></span><span className="font-bold" style={{ color: key === "feature" ? "#ff75ba" : key === "remix" ? "#7dd3fc" : "#c4a1ff" }}>{label}</span></span><span className="mt-1 block text-xs leading-5 text-white/60">{description}</span></button>)}</div>{collabChoiceNotice && <p role="status" className="mt-4 rounded-lg border border-[#38B6FF]/25 bg-[#38B6FF]/[.08] p-3 text-sm text-white/80">{collabChoiceNotice}</p>}<div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setCollabChoicesOpen(false)} className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/75">Cancel</button><button type="button" disabled={!contributionType} onClick={() => { if (!release.databaseId) { setCollabChoiceNotice("This opportunity is not connected to a song request workspace yet. Your choice has not been sent."); return; } setCollabChoicesOpen(false); setCollabOpen(true); }} className="rounded-full bg-[#ff3ea5] px-5 py-3 text-sm font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-40">Continue →</button></div></section></div>}
      {collabOpen && release.databaseId && <CollabRequestForm songId={release.databaseId} title={release.title} artwork={release.coverArt} invitedName={invitedName} invitedEmail={invitedEmail} initialContributionType={contributionType} initialMessage={collabInitialMessage} close={() => setCollabOpen(false)} />}

      <div role="tabpanel" className="mt-4 min-h-[9rem] rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-6">
          {detailTab === "lyrics" && (showLyricsSection || lyrics.status !== "missing") && (
            <section aria-label="Lyrics" className="min-w-0">
              <div
                id={`lyrics-${release.slug}`}
                className="mt-2"
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className="lyrics-scroll max-h-[28rem] overflow-y-auto overscroll-contain px-[1.25rem] pb-[1.75rem] pt-[0.5rem] text-center sm:px-[2rem] sm:pb-[2.125rem] sm:pt-[0.75rem]"
                    style={{
                      maskImage: "linear-gradient(to bottom, transparent 0, #000 1.5rem, #000 calc(100% - 2.5rem), transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0, #000 1.5rem, #000 calc(100% - 2.5rem), transparent 100%)",
                    }}
                  >
                      {lyrics.status === "loading" ? (
                        <p className="text-[0.9375rem] text-white/40">Loading lyrics…</p>
                      ) : lyrics.status === "missing" ? (
                        <p className="text-[0.9375rem] text-white/50">Lyrics are not available yet.</p>
                      ) : (
                        splitVerses(lyrics.text).map((verse, i) => (
                          <p
                            key={i}
                            className={`mx-auto max-w-[42rem] whitespace-pre-line text-[1rem] sm:text-[1.0625rem] [&:not(:last-child)]:mb-[2.125em] ${i === 0 && verse.toUpperCase() === release.title.toUpperCase() ? "font-bold text-[#ff3ea5]" : "text-white/90"}`}
                            style={{ lineHeight: 1.9, letterSpacing: "0.012em", ...(i === 0 && verse.toUpperCase() === release.title.toUpperCase() ? { textShadow: "0 0 10px #ff3ea588" } : {}) }}
                          >
                            {verse.split(/(\[YOUR VERSE\])/gi).map((part, partIndex) => part.toUpperCase() === "[YOUR VERSE]" ? <span key={partIndex} className="font-black tracking-[0.12em] text-[#ff3ea5]" style={{ textShadow: "0 0 7px #ff3ea5, 0 0 18px #ff3ea588" }}>{part}</span> : part)}
                          </p>
                        ))
                      )}
                  </div>
                </div>
              </div>
            </section>
          )}
          {detailTab === "lyrics" && !showLyricsSection && lyrics.status === "missing" && <p className="py-8 text-center text-sm font-bold uppercase tracking-[0.14em] text-white/55">Lyrics coming soon</p>}

          {detailTab === "lyrics" && meaning && (
            <section aria-label="Song meaning" className="min-w-0">
              <button
                type="button"
                onClick={() => setMeaningOpen((open) => !open)}
                onMouseEnter={playHover}
                aria-expanded={meaningOpen}
                className="group inline-flex items-center gap-[0.5rem] rounded-full py-[0.125rem] text-white/50 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
                style={{ outlineColor: PINK }}
              >
                <span className="text-[0.6875rem] font-bold tracking-[0.3em] uppercase">Meaning</span>
                <span className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-white/30 group-hover:text-white/60">{meaningOpen ? "Hide" : "Show"}</span>
              </button>
              {meaningOpen && <p className="mt-[0.75rem] max-w-prose whitespace-pre-line text-[0.9375rem] leading-relaxed text-white/80">{meaning}</p>}
            </section>
          )}

          {detailTab === "collectible" && release.cardArt && (
            <section aria-label="Collectible card" className="min-w-0">
              <SectionLabel>Collectible Card</SectionLabel>
              {/* Same tap-to-inspect popout as the pitch's own Collectible
                  section: drag to tilt/spin, tap to flip to the card back. */}
              <div className="mt-[0.75rem] mx-auto w-[70%] max-w-[18rem] md:w-full flex justify-center">
                <CollectibleViewer src={release.cardArt} songTitle={release.title} accent={PINK} />
              </div>
            </section>
          )}
          {detailTab === "collectible" && !release.cardArt && <section aria-label={`${release.title} locked collectible`} className="py-5 text-center"><div className="relative mx-auto aspect-[5/7] w-[70%] max-w-[18rem] overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-[0_1.5rem_4rem_rgba(0,0,.45)]"><img src={getCardImageUrl("BACK")} alt="Back of the CHXNDLER card" className="h-full w-full object-contain"/><div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2 bg-black/75 px-4 py-3 text-xs font-black uppercase tracking-[.2em] text-white"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Locked</div></div></section>}
          {detailTab === "video" && <div className="space-y-5">
            {(release.videoConcept?.trim() || release.videoPlan?.concept?.trim()) && <section className="rounded-xl border border-white/10 bg-white/[.03] p-4"><SectionLabel>VIDEO CONCEPT</SectionLabel><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{release.videoConcept?.trim() || release.videoPlan?.concept?.trim()}</p></section>}
            {(release.videoPlan?.locations || release.videoPlan?.performers) && <section className="grid gap-3 sm:grid-cols-2">{release.videoPlan.locations && <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><SectionLabel>Locations</SectionLabel><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{release.videoPlan.locations}</p></div>}{release.videoPlan.performers && <div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><SectionLabel>Actors & Performers</SectionLabel><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">{release.videoPlan.performers}</p></div>}</section>}
            {release.videoEmbedUrl && <section aria-label="Music video"><SectionLabel>Music Video</SectionLabel><div className="mt-3 w-full overflow-hidden rounded-xl border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}><iframe src={`${release.videoEmbedUrl}?rel=0`} title={`${release.title} music video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" className="h-full w-full" /></div></section>}
            {!release.videoEmbedUrl && <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff3ea5] drop-shadow-[0_0_12px_rgba(255,62,165,.75)]">No music video yet</p>}
            {showCollabRequest && <div className="grid gap-3">
              <button type="button" onClick={() => { playClick(); setContributionType("Music Video"); setCollabInitialMessage(""); setCollabChoiceNotice(""); setCollabOpen(true); }} className="group flex items-center gap-3 rounded-xl border border-[#ff3ea5] bg-[#ff3ea5] p-4 text-left shadow-[0_0_24px_rgba(255,62,165,.25)] transition hover:-translate-y-0.5 hover:bg-[#ff66b8]"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/15 text-black"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg></span><span className="min-w-0 flex-1"><span className="block text-sm font-black uppercase tracking-[.06em] text-[#170d14]">Collaborate as Videographer</span><span className="mt-1 block text-xs leading-5 text-black/75">Help plan or create the music video.</span></span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-black"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            </div>}
          </div>}
      </div>


      <style jsx>{`
        .lyrics-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        .streaming-link { display:inline-flex; align-items:center; justify-content:center; width:2.75rem; height:2.75rem; border:1px solid rgba(255,255,255,.18); border-radius:999px; color:#fff; text-decoration:none; transition:all .2s; }
        .streaming-link-spotify { color:#1ed760; border-color:rgba(30,215,96,.55); background:rgba(30,215,96,.12); }
        .streaming-link-apple { color:#ff5a75; border-color:rgba(255,90,117,.55); background:linear-gradient(135deg,rgba(255,90,117,.16),rgba(196,90,255,.14)); }
        .streaming-link:hover { transform:translateY(-1px) scale(1.05); box-shadow:0 0 16px currentColor; }
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
