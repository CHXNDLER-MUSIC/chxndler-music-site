"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { sfx } from "@/lib/sfx";
import { useAudio } from "@/app/providers/AudioProvider";

// ──────────────────────────────────────────────
// VIDEO DATA STRUCTURE
// Add, remove, or reorder videos here.
// Each video needs: id, title, youtubeUrl, type
// Optional: releaseDate (ISO string) — video is locked until this date
// type: "heartverse" | "acoustic" | "electric"
// ──────────────────────────────────────────────
const VIDEOS: Video[] = [
  // ── Episodes ──
  // Releasing weekly on Wednesdays at 7 PM starting 2/18/26.
  {
    id: "hv-000",
    title: "First Contact — Welcome to the Heartverse",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-02-12T06:00:00",
    locked: true,
  },
  {
    id: "hv-001",
    title: "Episode 1 — Searching for Our First Apartment in NYC",
    youtubeUrl: "https://youtube.com/shorts/9qEktORb8EY?feature=share",
    type: "heartverse",
    releaseDate: "2026-02-18T19:00:00",
    postDescription: "Sofia and I search New York City for a place to call home. This episode is about more than apartment hunting. It is about building something real. A home for us. A home for the music. A home for the Aliens.\nWelcome to the Heartverse.",
  },
  {
    id: "hv-002",
    title: "Episode 2 — Moving Day",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-02-25T19:00:00",
  },
  {
    id: "hv-003",
    title: "Episode 3 — Welcome To New York",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-03-04T19:00:00",
  },
  {
    id: "hv-004",
    title: "Episode 4 — Fight Club",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-03-11T19:00:00",
  },
  {
    id: "hv-005",
    title: "Episode 5 — I Got Cheated On Last Night",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-03-18T19:00:00",
  },
  {
    id: "hv-006",
    title: "Episode 6 — First Gig",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-03-25T19:00:00",
  },
  {
    id: "hv-007",
    title: "Episode 7 — Our First Tattoos",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-04-01T19:00:00",
  },
  {
    id: "hv-008",
    title: "Episode 8 — The Dirty Thirties",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    releaseDate: "2026-04-08T19:00:00",
  },

  // ── Live Signal – Acoustic Session ──
  // Releasing weekly on Mondays at 8 PM starting 2/16/26.
  {
    id: "lsp-001",
    title: "Acoustic Session — First Signal",
    youtubeUrl: "https://youtu.be/RXWbQzWjTPg",
    type: "acoustic",
    releaseDate: "2026-02-17T12:00:00",
    description: "The debut Acoustic Session live stream inside the Heartverse.\nMuch love to the Aliens who joined.\nIf you've ever felt like you're searching for your people, this is your signal.",
    postDescription: "Setlist\n00:00 OCEAN GIRL\n03:50 ALWAYS ON MY MIND\n07:15 SOMEBODY TO LOVE\n11:48 MR. BRIGHTSIDE (The Killers)\n14:48 Good Things Fall Apart — Audience Request (Illenium, Jon Bellion)\n15:54 Julia — Audience Request (Lauv)\n16:56 Too Old To Cry — Audience Request (Voodoo Blue)",
  },
  {
    id: "lsp-002",
    title: "Acoustic Session — Valentine's Day",
    youtubeUrl: "https://youtu.be/MWyv2bfps9w",
    type: "acoustic",
    releaseDate: "2026-02-24T12:00:00",
  },
  {
    id: "lsp-003",
    title: "Acoustic Session — Late Night Keys",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-03-03T12:00:00",
  },
  {
    id: "lsp-004",
    title: "Acoustic Session — Beat Sketches",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-03-10T12:00:00",
  },
  {
    id: "lsp-005",
    title: "Acoustic Session — Frequencies",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-03-17T12:00:00",
  },
  {
    id: "lsp-006",
    title: "Acoustic Session — Unplugged",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-03-24T12:00:00",
  },
  {
    id: "lsp-007",
    title: "Acoustic Session — Loops",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-03-31T12:00:00",
  },
  {
    id: "lsp-008",
    title: "Acoustic Session — Vocals",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-04-07T12:00:00",
  },
  {
    id: "lsp-009",
    title: "Acoustic Session — Analog",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-04-14T12:00:00",
  },
  {
    id: "lsp-010",
    title: "Acoustic Session — Midnight Run",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-04-21T12:00:00",
  },

  // ── Live Signal – Electric Set ──
  // Releasing weekly on Thursdays at 8 PM starting 2/19/26.
  {
    id: "lsf-001",
    title: "Electric Set — Heartverse Is Live",
    youtubeUrl: "https://youtu.be/TVCTbXqwJ5A",
    type: "electric",
    releaseDate: "2026-02-21T12:00:00",
    description: "The debut Electric Set live stream inside the Heartverse.\nMuch love to the Aliens who joined.\nIf you've been searching for your signal, you just found it.",
    postDescription: "Setlist\n00:00 WELCOME ALIENS\n00:21 WE'RE JUST FRIENDS\n04:28 MR. BRIGHTSIDE (The Killers)\n07:39 SOMEBODY TO LOVE\n10:15 ALWAYS ON MY MIND\n13:29 OCEAN GIRL\n16:29 BE MY BEE\n20:24 BABY (Justin Bieber)",
  },
  {
    id: "lsf-002",
    title: "Electric Set — Rooftop Session",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-02-28T12:00:00",
  },
  {
    id: "lsf-003",
    title: "Electric Set — Sold Out",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-03-07T12:00:00",
  },
  {
    id: "lsf-004",
    title: "Electric Set — Acoustic Set",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-03-14T12:00:00",
  },
  {
    id: "lsf-005",
    title: "Electric Set — After Hours",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-03-21T12:00:00",
  },
  {
    id: "lsf-006",
    title: "Electric Set — Warehouse",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-03-28T12:00:00",
  },
  {
    id: "lsf-007",
    title: "Electric Set — Open Mic",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-04-04T12:00:00",
  },
  {
    id: "lsf-008",
    title: "Electric Set — Festival",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-04-11T12:00:00",
  },
  {
    id: "lsf-009",
    title: "Electric Set — Encore",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-04-18T12:00:00",
  },
  {
    id: "lsf-010",
    title: "Electric Set — Grand Finale",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-04-25T12:00:00",
  },
];

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────
type VideoType = "heartverse" | "acoustic" | "electric";

interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  type: VideoType;
  releaseDate?: string;
  description?: string;
  postDescription?: string;
  locked?: boolean;
}

type TopTab = "heartverse" | "livesignal";
type LiveSignalSection = "acoustic" | "electric";

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

/** Extract YouTube video ID from various URL formats */
function getYouTubeEmbedUrl(url: string): string {
  let videoId = "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.pathname.startsWith("/shorts/")) {
      videoId = parsed.pathname.split("/shorts/")[1];
    } else {
      videoId = parsed.searchParams.get("v") || "";
    }
  } catch {
    videoId = url;
  }
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

/** Check if a video is still locked based on its releaseDate or explicit lock */
function isLocked(video: Video): boolean {
  if (video.locked) return true;
  if (!video.releaseDate) return false;
  return new Date() < new Date(video.releaseDate);
}

/** Find the most recently released (unlocked) video ID from a list */
function getNewestId(videos: Video[]): string | null {
  let newest: Video | null = null;
  const now = Date.now();
  for (const v of videos) {
    if (isLocked(v) || !v.releaseDate) continue;
    if (!newest || new Date(v.releaseDate).getTime() > new Date(newest.releaseDate!).getTime()) {
      newest = v;
    }
  }
  return newest?.id ?? null;
}

/** Format a release date like "2/17/26 @ 8PM" */
function formatReleaseDate(isoDate: string): string {
  const d = new Date(isoDate);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = String(d.getFullYear()).slice(2);
  const hours = d.getHours();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${month}/${day}/${year} @ ${displayHour}${period}`;
}

// ──────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────
export default function EpisodesLibrary({ isChatOpen = false }: { isChatOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>("heartverse");
  const [liveSignalSection, setLiveSignalSection] = useState<LiveSignalSection>("acoustic");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [startTime, setStartTime] = useState(0);
  const audio = useAudio();
  const wasPlayingRef = useRef(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (wasPlayingRef.current) audio.play();
        setIsOpen(false);
        setActiveVideo(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, audio]);

  const playHover = useCallback(() => {
    try { sfx.play("hover", 0.3); } catch {}
  }, []);

  const playClick = useCallback(() => {
    try { sfx.play("click", 0.5); } catch {}
  }, []);

  // Filter videos based on current tab/section
  const filteredVideos = VIDEOS.filter((v) => {
    if (topTab === "heartverse") return v.type === "heartverse";
    return v.type === liveSignalSection;
  });

  const newestId = getNewestId(filteredVideos);

  const handleVideoClick = (video: Video) => {
    if (isLocked(video)) return;
    playClick();
    // Remember if music was playing, then pause it
    wasPlayingRef.current = audio.playing;
    if (audio.playing) audio.pause();
    setActiveVideo(video);
    setStartTime(0);
  };

  const handleBack = () => {
    playClick();
    // Resume music if it was playing before
    if (wasPlayingRef.current) audio.play();
    setActiveVideo(null);
    setStartTime(0);
  };

  return (
    <>
      {/* ── Episodes Pulse Animation ── */}
      <style>{`
        @keyframes episodesGlowPulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1.2) saturate(1.3);
            box-shadow:
              0 16px 30px rgba(0,0,0,.6),
              0 0 18px rgba(242,239,29,0.8),
              0 0 40px rgba(242,239,29,0.6),
              0 0 70px rgba(242,239,29,0.4),
              0 0 110px rgba(242,239,29,0.2),
              inset 0 2px 0 rgba(255,255,255,.25),
              inset 0 -6px 14px rgba(0,0,0,.7);
          }
          50% {
            transform: scale(1.08);
            filter: brightness(1.5) saturate(1.6);
            box-shadow:
              0 18px 34px rgba(0,0,0,.7),
              0 0 30px rgba(242,239,29,0.93),
              0 0 60px rgba(242,239,29,0.73),
              0 0 100px rgba(242,239,29,0.53),
              0 0 140px rgba(242,239,29,0.27),
              inset 0 2px 0 rgba(255,255,255,.35),
              inset 0 -6px 14px rgba(0,0,0,.7);
          }
        }
        .episodes-trigger-btn {
          animation: episodesGlowPulse 2s ease-in-out infinite;
        }
        .episodes-trigger-btn:hover {
          animation: none;
          transform: scale(1.1) !important;
          box-shadow:
            0 0 30px rgba(242,239,29,0.93),
            0 0 60px rgba(242,239,29,0.73),
            0 0 100px rgba(242,239,29,0.53) !important;
          filter: brightness(1.6) saturate(1.7);
        }
      `}</style>

      {/* ── Trigger Button (matches text chat button style) ── */}
      <button
        type="button"
        className="episodes-trigger-btn"
        aria-label="Open Heartverse Library"
        title="Heartverse Library"
        onClick={() => { playClick(); setIsOpen(!isOpen); }}
        onMouseEnter={() => { playHover(); }}
        onMouseLeave={() => {}}
        style={{
          position: 'absolute',
          bottom: '15px',
          right: '10px',
          width: '55px',
          height: '55px',
          background: 'rgba(242, 239, 29, 0.1)',
          border: '2px solid #F2EF1D',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          zIndex: isChatOpen ? 10 : 1000,
          overflow: 'hidden',
          pointerEvents: isChatOpen ? 'none' : 'auto',
        }}
      >
        <img
          src="/elements/episodes.webp"
          alt="Episodes"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(1.2) saturate(1.2)',
            pointerEvents: 'none'
          }}
        />
      </button>

      {/* ── Inline Panel (contained within parent) ── */}
      {isOpen && (
        <div
          className="episodes-panel flex flex-col rounded-2xl border-2 border-[#FC54AF]/50 bg-black/90 backdrop-blur-xl overflow-hidden"
          role="dialog"
          aria-label="Heartverse Library"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            left: '8px',
            bottom: '8px',
            zIndex: 1100,
            boxShadow:
              "0 0 30px rgba(252,84,175,0.3), inset 0 0 16px rgba(252,84,175,0.06)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scanline overlay */}
          <div className="scanlines absolute inset-0 pointer-events-none rounded-2xl" />

          {/* ── Header ── */}
          <div className="relative flex items-center justify-center px-3 pt-3 pb-2">
            <h2
              className="text-sm sm:text-base font-bold tracking-wider text-white uppercase text-center flex-1"
              style={{
                textShadow: "0 0 8px rgba(252,84,175,0.6), 0 0 16px rgba(252,84,175,0.3)",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              Heartverse Library
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => { playClick(); if (wasPlayingRef.current) audio.play(); setIsOpen(false); setActiveVideo(null); }}
              onMouseEnter={playHover}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200 hover:scale-110 episodes-close-btn"
              style={{ position: 'absolute', right: '12px' }}
            >
              x
            </button>
          </div>

          {/* ── Top-Level Tabs ── */}
          <div className="relative flex gap-1 mx-3 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              className={`episodes-tab flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all duration-200 uppercase tracking-wide ${
                topTab === "heartverse"
                  ? "episodes-tab-active"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => {
                playClick();
                setTopTab("heartverse");
                setActiveVideo(null);
              }}
              onMouseEnter={playHover}
            >
              Episodes
            </button>
            <button
              className={`episodes-tab flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all duration-200 uppercase tracking-wide ${
                topTab === "livesignal"
                  ? "episodes-tab-active"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => {
                playClick();
                setTopTab("livesignal");
                setActiveVideo(null);
              }}
              onMouseEnter={playHover}
            >
              Live Signal
            </button>
          </div>

          {/* ── New Episodes Schedule ── */}
          {topTab === "heartverse" && (
            <div
              className="schedule-pulse-pink text-center mx-3 mt-1.5"
              style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                fontSize: 'clamp(8px, 2vw, 10px)',
                fontWeight: '600',
                letterSpacing: '0.2em',
                color: '#FC54AF',
              }}
            >
              NEW EPISODES EVERY WEDNESDAY &bull; 7PM EST
            </div>
          )}

          {/* ── Live Signal Sub-Sections ── */}
          {topTab === "livesignal" && (
            <div className="relative flex gap-1 mx-3 mt-2 p-1 rounded-md bg-white/3 border border-[#00FFFF]/15">
              <button
                className={`flex-1 py-1 px-2 text-xs font-medium rounded transition-all duration-200 tracking-wide ${
                  liveSignalSection === "acoustic"
                    ? "bg-[#00FFFF]/15 text-[#00FFFF] border border-[#00FFFF]/30"
                    : "text-white/40 hover:text-white/70 border border-transparent"
                }`}
                onClick={() => {
                  playClick();
                  setLiveSignalSection("acoustic");
                  setActiveVideo(null);
                }}
                onMouseEnter={playHover}
              >
                Acoustic
              </button>
              <button
                className={`flex-1 py-1 px-2 text-xs font-medium rounded transition-all duration-200 tracking-wide ${
                  liveSignalSection === "electric"
                    ? "bg-[#F2EF1D]/15 text-[#F2EF1D] border border-[#F2EF1D]/30"
                    : "text-white/40 hover:text-white/70 border border-transparent"
                }`}
                onClick={() => {
                  playClick();
                  setLiveSignalSection("electric");
                  setActiveVideo(null);
                }}
                onMouseEnter={playHover}
              >
                Electric
              </button>
            </div>
          )}

          {/* ── Live Signal Schedule ── */}
          {topTab === "livesignal" && (
            <div
              className={liveSignalSection === "acoustic" ? "schedule-pulse" : "schedule-pulse-yellow"}
              style={{
                textAlign: 'center',
                margin: '6px 12px 0',
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                fontSize: 'clamp(8px, 2vw, 10px)',
                fontWeight: '600',
                letterSpacing: '0.2em',
                color: liveSignalSection === "acoustic" ? '#00FFFF' : '#F2EF1D',
              }}
            >
              {liveSignalSection === "acoustic"
                ? <>NEW EPISODES EVERY TUESDAY &bull; 12PM EST</>
                : <>NEW EPISODES EVERY SATURDAY &bull; 12PM EST</>
              }
            </div>
          )}

          {/* ── Video Player Area ── */}
          {activeVideo && (
            <div className="relative flex-1 min-h-0 overflow-y-auto custom-scroll mx-3 mt-2 pb-3">
              <button
                onClick={handleBack}
                onMouseEnter={playHover}
                className="text-xs text-[#FC54AF]/80 hover:text-[#FC54AF] mb-1 transition-colors duration-150 flex items-center gap-1"
              >
                <span className="text-sm">&#8592;</span> Back to list
              </button>
              <p
                className="text-xs text-white/90 font-medium mb-1.5 tracking-wide"
                style={{
                  textShadow: "0 0 6px rgba(252,84,175,0.3)",
                }}
              >
                {activeVideo.title}
              </p>
              {activeVideo.description && (
                <div
                  className="mb-2 text-[11px] leading-relaxed text-white/80 whitespace-pre-line"
                  style={{
                    textShadow: "0 0 4px rgba(0,255,255,0.2)",
                  }}
                >
                  {activeVideo.description}
                </div>
              )}
              <div
                className="relative w-full rounded-lg overflow-hidden border border-[#FC54AF]/30"
                style={{ aspectRatio: "16/9" }}
              >
                <iframe
                  key={startTime}
                  src={`${getYouTubeEmbedUrl(activeVideo.youtubeUrl)}&start=${startTime}&autoplay=${startTime > 0 ? 1 : 0}`}
                  title={activeVideo.title}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              {activeVideo.postDescription && (
                <div
                  className="mt-2 text-[11px] leading-relaxed text-white/80"
                  style={{
                    textShadow: "0 0 4px rgba(0,255,255,0.2)",
                  }}
                >
                  {activeVideo.postDescription.split('\n').map((line, i) => {
                    if (i === 0 && line.trim().toLowerCase() === 'setlist') {
                      return <div key={i} className="font-bold text-white mb-1">{line}</div>;
                    }
                    const timeMatch = line.match(/^(\d+):(\d+)\s+(.+)$/);
                    if (timeMatch) {
                      const seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
                      const timestamp = timeMatch[1] + ':' + timeMatch[2];
                      const songTitle = timeMatch[3];
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { playClick(); setStartTime(seconds); }}
                          onMouseEnter={playHover}
                          className="block w-full text-left py-0.5 transition-colors duration-150 hover:text-[#00FFFF] cursor-pointer"
                        >
                          <span className="text-[#FC54AF]/70 mr-1.5">{timestamp}</span>
                          {songTitle}
                        </button>
                      );
                    }
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Video List ── */}
          {!activeVideo && (
            <div className="relative flex-1 min-h-0 overflow-y-auto custom-scroll mt-2 px-3 pb-3">
              {filteredVideos.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-6">
                  No videos yet.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredVideos.map((video) => {
                    const locked = isLocked(video);
                    const isElectric = topTab === "livesignal" && liveSignalSection === "electric";
                    const isAcoustic = topTab === "livesignal" && liveSignalSection === "acoustic";
                    const accentColor = isElectric ? "#F2EF1D" : isAcoustic ? "#00FFFF" : "#FC54AF";
                    const isNewest = video.id === newestId;
                    const borderDefault = isNewest
                      ? accentColor
                      : isElectric
                        ? (locked ? 'rgba(242,239,29,0.15)' : 'rgba(242,239,29,0.2)')
                        : isAcoustic
                          ? (locked ? 'rgba(0,255,255,0.15)' : 'rgba(0,255,255,0.2)')
                          : (locked ? 'rgba(252,84,175,0.15)' : 'rgba(252,84,175,0.2)');
                    return (
                      <button
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        onMouseEnter={locked ? undefined : playHover}
                        disabled={locked}
                        className={`episodes-video-card group flex items-center gap-2 w-full text-left p-2 rounded-lg border transition-all duration-200 ${
                          locked
                            ? "bg-white/3 cursor-not-allowed"
                            : "bg-white/3 hover:bg-white/8"
                        }`}
                        style={{
                          borderColor: borderDefault,
                          boxShadow: isNewest ? `0 0 8px ${accentColor}40, inset 0 0 4px ${accentColor}15` : undefined,
                        }}
                        onMouseOver={!locked ? (e) => { (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}4D`; } : undefined}
                        onMouseOut={!locked ? (e) => { (e.currentTarget as HTMLElement).style.borderColor = borderDefault; } : undefined}
                      >
                        {/* Thumbnail placeholder */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-12 h-8 rounded-md border flex items-center justify-center transition-colors duration-200 overflow-hidden bg-white/5"
                            style={{
                              borderColor: locked ? 'rgba(255,255,255,0.1)' : `${accentColor}AA`,
                            }}
                          >
                            {locked ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="text-white/40"
                              >
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                style={{ color: `${accentColor}CC`, transition: 'color 200ms' }}
                                onMouseOver={(e) => { (e.currentTarget as SVGElement).style.color = accentColor; }}
                                onMouseOut={(e) => { (e.currentTarget as SVGElement).style.color = `${accentColor}CC`; }}
                              >
                                <path
                                  d="M8 5v14l11-7z"
                                  fill="currentColor"
                                />
                              </svg>
                            )}
                          </div>
                          {video.id === newestId && (
                            <span className={`new-badge ${isElectric ? "new-badge-yellow" : !isAcoustic ? "new-badge-pink" : ""}`}>NEW</span>
                          )}
                        </div>
                        {/* Title + release date */}
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs transition-colors duration-200 line-clamp-1 ${
                            locked
                              ? "text-white/70"
                              : "text-white/70 group-hover:text-white/95"
                          }`}>
                            {video.title}
                          </span>
                          {locked && video.releaseDate && (
                            <span
                              className="text-[10px] mt-0.5"
                              style={{
                                color: accentColor,
                                opacity: 0.5,
                                textShadow: `0 0 4px ${accentColor}4D`,
                              }}
                            >
                              Released {formatReleaseDate(video.releaseDate)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes schedulePulse {
          0%, 100% {
            opacity: 0.85;
            text-shadow:
              0 0 6px rgba(0, 255, 255, 0.5),
              0 0 12px rgba(0, 255, 255, 0.25);
          }
          50% {
            opacity: 0.5;
            text-shadow:
              0 0 3px rgba(0, 255, 255, 0.3),
              0 0 6px rgba(0, 255, 255, 0.1);
          }
        }
        .schedule-pulse {
          animation: schedulePulse 3s ease-in-out infinite;
        }
        @keyframes schedulePulsePink {
          0%, 100% {
            opacity: 0.85;
            text-shadow:
              0 0 6px rgba(252, 84, 175, 0.5),
              0 0 12px rgba(252, 84, 175, 0.25);
          }
          50% {
            opacity: 0.5;
            text-shadow:
              0 0 3px rgba(252, 84, 175, 0.3),
              0 0 6px rgba(252, 84, 175, 0.1);
          }
        }
        .schedule-pulse-pink {
          animation: schedulePulsePink 3s ease-in-out infinite;
        }
        @keyframes schedulePulseYellow {
          0%, 100% {
            opacity: 0.85;
            text-shadow:
              0 0 6px rgba(242, 239, 29, 0.5),
              0 0 12px rgba(242, 239, 29, 0.25);
          }
          50% {
            opacity: 0.5;
            text-shadow:
              0 0 3px rgba(242, 239, 29, 0.3),
              0 0 6px rgba(242, 239, 29, 0.1);
          }
        }
        .schedule-pulse-yellow {
          animation: schedulePulseYellow 3s ease-in-out infinite;
        }
        @keyframes newBadgePulse {
          0%, 100% {
            opacity: 1;
            text-shadow:
              0 0 4px rgba(0, 255, 255, 0.8),
              0 0 8px rgba(0, 255, 255, 0.4);
            box-shadow:
              0 0 4px rgba(0, 255, 255, 0.4),
              inset 0 0 3px rgba(0, 255, 255, 0.15);
          }
          50% {
            opacity: 0.6;
            text-shadow:
              0 0 2px rgba(0, 255, 255, 0.4),
              0 0 4px rgba(0, 255, 255, 0.2);
            box-shadow:
              0 0 2px rgba(0, 255, 255, 0.2),
              inset 0 0 2px rgba(0, 255, 255, 0.05);
          }
        }
        .new-badge {
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #00FFFF;
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(0, 255, 255, 0.5);
          border-radius: 3px;
          padding: 1px 4px;
          line-height: 1.2;
          z-index: 1;
          pointer-events: none;
          animation: newBadgePulse 2s ease-in-out infinite;
        }
        @keyframes newBadgePulseYellow {
          0%, 100% {
            opacity: 1;
            text-shadow:
              0 0 4px rgba(242, 239, 29, 0.8),
              0 0 8px rgba(242, 239, 29, 0.4);
            box-shadow:
              0 0 4px rgba(242, 239, 29, 0.4),
              inset 0 0 3px rgba(242, 239, 29, 0.15);
          }
          50% {
            opacity: 0.6;
            text-shadow:
              0 0 2px rgba(242, 239, 29, 0.4),
              0 0 4px rgba(242, 239, 29, 0.2);
            box-shadow:
              0 0 2px rgba(242, 239, 29, 0.2),
              inset 0 0 2px rgba(242, 239, 29, 0.05);
          }
        }
        .new-badge-yellow {
          color: #F2EF1D;
          border-color: rgba(242, 239, 29, 0.5);
          animation: newBadgePulseYellow 2s ease-in-out infinite;
        }
        @keyframes newBadgePulsePink {
          0%, 100% {
            opacity: 1;
            text-shadow:
              0 0 4px rgba(252, 84, 175, 0.8),
              0 0 8px rgba(252, 84, 175, 0.4);
            box-shadow:
              0 0 4px rgba(252, 84, 175, 0.4),
              inset 0 0 3px rgba(252, 84, 175, 0.15);
          }
          50% {
            opacity: 0.6;
            text-shadow:
              0 0 2px rgba(252, 84, 175, 0.4),
              0 0 4px rgba(252, 84, 175, 0.2);
            box-shadow:
              0 0 2px rgba(252, 84, 175, 0.2),
              inset 0 0 2px rgba(252, 84, 175, 0.05);
          }
        }
        .new-badge-pink {
          color: #FC54AF;
          border-color: rgba(252, 84, 175, 0.5);
          animation: newBadgePulsePink 2s ease-in-out infinite;
        }
        .episodes-trigger-btn:hover {
          box-shadow:
            0 0 24px rgba(252,84,175,0.4),
            0 0 48px rgba(252,84,175,0.15),
            inset 0 0 12px rgba(252,84,175,0.1);
        }
        .episodes-tab-active {
          background: rgba(252, 84, 175, 0.15);
          color: #FC54AF;
          border: 1px solid rgba(252, 84, 175, 0.35);
          text-shadow: 0 0 6px rgba(252, 84, 175, 0.4);
        }
        .episodes-close-btn {
          background: transparent;
          color: #FF1493;
          border-color: #FF1493;
          text-shadow:
            0 0 5px #FF1493,
            0 0 10px #FF1493;
          box-shadow:
            0 0 8px rgba(255, 20, 147, 0.4),
            inset 0 0 6px rgba(255, 20, 147, 0.1);
        }
        .episodes-close-btn:hover {
          color: #FF69B4;
          border-color: #FF69B4;
          text-shadow:
            0 0 8px #FF69B4,
            0 0 15px #FF69B4,
            0 0 25px #FF69B4;
          box-shadow:
            0 0 12px rgba(255, 105, 180, 0.6),
            0 0 24px rgba(255, 105, 180, 0.3),
            inset 0 0 10px rgba(255, 105, 180, 0.15);
        }
        .scanlines {
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.04) 0px,
            rgba(255,255,255,0.04) 1px,
            rgba(0,0,0,0) 2px,
            rgba(0,0,0,0) 4px
          );
          mix-blend-mode: screen;
          opacity: 0.12;
        }
      `}</style>
    </>
  );
}
