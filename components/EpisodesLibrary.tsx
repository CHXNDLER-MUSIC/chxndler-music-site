"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    title: "Heartverse 00: Welcome to the Heartverse",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    locked: true,
  },
  {
    id: "hv-001",
    title: "Heartverse 01: Searching for a Place to Call Home in NYC",
    youtubeUrl: "https://youtube.com/shorts/9qEktORb8EY?feature=share",
    type: "heartverse",
    // 7PM Eastern (EST, UTC-5) => next day 00:00Z
    releaseDate: "2026-02-19T00:00:00Z",
    postDescription: "Sofia and I search New York City for a place to call home. This episode is about more than apartment hunting. It is about building something real. A home for us. A home for the music. A home for the Aliens.\nWelcome to the Heartverse.",
  },
  {
    id: "hv-002",
    title: "Heartverse 02: Moving Day",
    youtubeUrl: "https://youtube.com/shorts/AdvP_6VVp3k",
    type: "heartverse",
    // 7PM Eastern (EST, UTC-5) => next day 00:00Z
    releaseDate: "2026-02-26T00:00:00Z",
  },
  {
    id: "hv-003",
    title: "Heartverse 03: Welcome To New York",
    youtubeUrl: "https://youtube.com/shorts/yvbtCNO0PAI",
    type: "heartverse",
    // 7PM Eastern (EST, UTC-5) => next day 00:00Z
    releaseDate: "2026-03-05T00:00:00Z",
  },
  {
    id: "hv-004",
    title: "Heartverse 04: Fight Club",
    youtubeUrl: "https://youtube.com/shorts/BJ711zgixAk",
    type: "heartverse",
    // 7PM Eastern on 2026-03-11 (EDT, UTC-4)
    releaseDate: "2026-03-11T23:00:00Z",
  },
  {
    id: "hv-005",
    title: "Heartverse 05: First Gig in New York City",
    youtubeUrl: "https://youtube.com/shorts/vfzrqgOcfe4",
    type: "heartverse",
    // 7PM Eastern (EDT, UTC-4)
    releaseDate: "2026-03-25T23:00:00Z",
  },
  {
    id: "hv-007",
    title: "Heartverse 06: Our First Tattoos",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    // 7PM Eastern (EDT, UTC-4)
    releaseDate: "2026-07-31T23:00:00Z",
  },
  {
    id: "hv-008",
    title: "Heartverse 07: Lost In Bermuda",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    // 7PM Eastern (EDT, UTC-4)
    releaseDate: "2026-08-14T23:00:00Z",
  },
  {
    id: "hv-006",
    title: "Heartverse 08: Hosting at Home",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    // 7PM Eastern (EDT, UTC-4)
    releaseDate: "2026-10-02T23:00:00Z",
  },
  {
    id: "hv-009",
    title: "Heartverse 09: Get A Job",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "heartverse",
    // 1 month after Hosting at Home — 7PM Eastern (EST, UTC-5)
    releaseDate: "2026-11-03T00:00:00Z",
  },

  // ── Live Signal – Acoustic Session ──
  // Releasing weekly on Mondays at 8 PM starting 2/16/26.
  {
    id: "lsp-001",
    title: "Acoustic Signal 01",
    youtubeUrl: "https://youtu.be/RXWbQzWjTPg",
    type: "acoustic",
    releaseDate: "2026-02-17T12:00:00",
    postDescription: "Setlist\n00:00 OCEAN GIRL\n03:50 ALWAYS ON MY MIND\n07:15 SOMEBODY TO LOVE\n11:48 MR. BRIGHTSIDE (The Killers)\n14:48 Good Things Fall Apart (Illenium, Jon Bellion)\n15:54 Julia (Lauv)\n16:56 Too Old To Cry (Voodoo Blue)",
  },
  {
    id: "lsp-002",
    title: "Acoustic Signal 02",
    youtubeUrl: "https://youtu.be/MWyv2bfps9w",
    type: "acoustic",
    releaseDate: "2026-02-24T12:00:00",
    postDescription: "Setlist\n00:00 WE'RE JUST FRIENDS\n05:15 BE MY BEE\n10:19 Love Drunk (Boys Like Girls)\n13:51 BABY (Justin Bieber)\n18:55 FEELING THIS (Blink 182)\n22:21 AMERICAN DREAM",
  },
  {
    id: "lsp-003",
    title: "Acoustic Signal 03",
    youtubeUrl: "https://youtu.be/Pxd-uIKa_lg",
    type: "acoustic",
    releaseDate: "2026-03-03T12:00:00",
    postDescription: "Setlist\n00:00 MR. BRIGHTSIDE (The Killers)\n03:00 ALONE\n05:39 POKÉMON (Jason Paige)\n08:56 I MIGHT FALL IN LOVE WITH YOU\n13:32 AMERICAN DREAM\n16:14 FEELING THIS (Blink 182)",
  },
  {
    id: "lsp-004",
    title: "Acoustic Signal 04",
    youtubeUrl: "https://youtu.be/OzJwQ--EFd8",
    type: "acoustic",
    releaseDate: "2026-03-17T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:18 Holy (Justin Bieber)\n02:51 ALONE\n04:33 Castle On The Hill (Ed Sheeran)\n06:21 LITTLE BLACK HEART\n08:55 I Lose Control (Teddy Swims)\n10:44 COLORS OF OUR HOME\n13:00 LOVE ME",
  },
  {
    id: "lsp-005",
    title: "Acoustic Signal 05",
    youtubeUrl: "https://youtu.be/1iOv7Sd8ac8",
    type: "acoustic",
    releaseDate: "2026-03-25T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:18 ALONE\n03:25 AMERICAN DREAM\n07:11 MR. BRIGHTSIDE\n11:22  LETTING GO\n16:03 OCEAN GIRL\n20:09 Stitches (Shawn Mendes)\n23:03 MAKE BELIEVE",
  },
  {
    id: "lsp-006",
    title: "Acoustic Signal 06",
    youtubeUrl: "https://youtu.be/WX2655uxjy4",
    type: "acoustic",
    releaseDate: "2026-04-01T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:46 HOUSE PARTY\n04:15 BE MY BEE\n08:55 HOME\n12:44 LITTLE BLACK HEART\n16:40 WE'RE JUST FRIENDS",
  },
  {
    id: "lsp-007",
    title: "Acoustic Signal 07",
    youtubeUrl: "https://youtu.be/nUOnKt_FjMI",
    type: "acoustic",
    releaseDate: "2026-04-08T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n01:00 LOVE ME\n04:54 CHEERLEADER\n08:55 LETTING GO\n13:16 Goodnight Moon (Go Radio)\n18:33 AMERICAN DREAM\n24:05 MAKE BELIEVE\n29:21 OCEAN GIRL",
  },
  {
    id: "lsp-008",
    title: "Acoustic Signal 08",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-07-03T12:00:00",
    locked: true,
  },
  {
    id: "lsp-009",
    title: "Acoustic Signal 09",
    youtubeUrl: "https://youtu.be/lGexpoJfwJ4",
    type: "acoustic",
    releaseDate: "2026-05-16T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:58 What's My Age Again? (Blink 182)\n03:25 Sugar We're Going Down (Fall Out Boy)\n06:36 HOUSE PARTY\n10:31 Complicated (Avril Lavigne)\n13:06 Jamie All Over (Mayday Parade)\n17:06 Dear Maria, Count Me In (All Time Low)\n24:15 Teenage Dirtbag (Wheatus)\n24:51 Scotty Doesn't Know (Lustra)\n27:57 WE'RE JUST FRIENDS",
  },
  {
    id: "lsp-010",
    title: "Acoustic Signal 10",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-07-17T12:00:00",
  },
  {
    id: "lsp-011",
    title: "Acoustic Signal 11",
    youtubeUrl: "https://youtu.be/aIsGwmTky9g",
    type: "acoustic",
    releaseDate: "2026-08-14T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:36 Peaches (Justin Bieber)\n02:26 Never (Lauv)\n05:32 Love (Kendrick Lamar)\n08:54 EMO GIRL (mgk)\n11:34 CHEERLEADER\n14:56 MAKE BELIEVE",
  },
  {
    id: "lsp-012",
    title: "Acoustic Signal 12",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-10-23T12:00:00",
  },
  {
    id: "lsp-013",
    title: "Acoustic Signal 13",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-11-23T12:00:00",
  },
  {
    id: "lsp-014",
    title: "Acoustic Signal 14",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2026-12-23T12:00:00",
  },
  {
    id: "lsp-015",
    title: "Acoustic Signal 15",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "acoustic",
    releaseDate: "2027-01-23T12:00:00",
  },

  // ── Live Signal – Electric Set ──
  // Releasing weekly on Thursdays at 8 PM starting 2/19/26.
  {
    id: "lsf-001",
    title: "Electric Signal 01",
    youtubeUrl: "https://youtu.be/TVCTbXqwJ5A",
    type: "electric",
    releaseDate: "2026-02-21T12:00:00",
    postDescription: "Setlist\n00:00 WELCOME ALIENS\n00:21 WE'RE JUST FRIENDS\n04:28 MR. BRIGHTSIDE (The Killers)\n07:39 SOMEBODY TO LOVE\n10:15 ALWAYS ON MY MIND\n13:29 OCEAN GIRL\n16:29 BE MY BEE\n20:24 BABY (Justin Bieber)",
  },
  {
    id: "lsf-002",
    title: "Electric Signal 02",
    youtubeUrl: "https://youtu.be/rsLzbiOIPrM",
    type: "electric",
    releaseDate: "2026-02-28T12:00:00",
    postDescription: "Setlist\n00:00 FEELING THIS (Blink 182)\n02:26 PARIS (The 1975)\n06:16 ALWAYS ON MY MIND\n09:32 ALONE\n13:16 CHXNDLER Cards\n14:00 WE'RE JUST FRIENDS\n17:50 MR. BRIGHTSIDE (The Killers)\n21:19 OCEAN GIRL",
  },
  {
    id: "lsf-003",
    title: "Electric Signal 03",
    youtubeUrl: "https://youtu.be/cvVkNj47Ut8",
    type: "electric",
    releaseDate: "2026-03-07T12:00:00",
    postDescription: "Setlist\n00:00 WELCOME ALIEN\n00:29 FEELING THIS (Blink 182)\n02:55 ALONE\n06:22 MR. BRIGHTSIDE (The Killers)\n10:05 ALWAYS ON MY MIND\n13:23 ALIEN (HOUSE PARTY)\n17:49 WE'RE JUST FRIENDS",
  },
  {
    id: "lsf-004",
    title: "Electric Signal 04",
    youtubeUrl: "https://youtu.be/lFuXBbTa2Cg",
    type: "electric",
    releaseDate: "2026-03-21T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:18 MR. BRIGHTSIDE (The Killers)\n03:27 BE ME BEE\n07:33 CHEERLEADER\n10:39  LOVE ME\n14:17 AMERICAN DREAM\n18:09 WERE JUST FRIENDS",
  },
  {
    id: "lsf-005",
    title: "Electric Signal 05",
    youtubeUrl: "https://youtu.be/Gmdh0ZyfcZo",
    type: "electric",
    releaseDate: "2026-03-28T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:17 BABY\n02:13 ALWAYS ON MY MIND\n05:26 MAKE BELIEVE\n09:29 ALONE (ACOUSTIC)\n12:09 LITTLE BLACK HEART\n15:37 WERE JUST FRIENDS",
  },
  {
    id: "lsf-006",
    title: "Electric Signal 06",
    youtubeUrl: "https://youtu.be/235FBFd0Ntw",
    type: "electric",
    releaseDate: "2026-04-04T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:17 LOVE ME\n03:30 CHEERLEADER\n06:42 Painted Smiles (Mickey Jas)\n10:42 I Hate Holding Hands (Mickey Jas)\n16:19 LETTING GO\n20:02 AMERICAN DREAM\n23:32 MAKE BELIEVE\n28:07 OCEAN GIRL (REMIX)",
  },
  {
    id: "lsf-007",
    title: "Electric Signal 07",
    youtubeUrl: "https://youtu.be/5rJL4p74l-g",
    type: "electric",
    releaseDate: "2026-06-19T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:18 SUGAR, WE'RE GOING DOWN (Fall Out Boy)\n03:52 WE'RE JUST FRIENDS\n07:29 WHAT'S MY AGE AGAIN? (Blink 182)\n09:56 I LIKE ME BETTER (Lauv)\n13:36 ALWAYS ON MY MIND\n17:25 LOVE ME",
  },
  {
    id: "lsf-008",
    title: "Electric Signal 08",
    youtubeUrl: "https://youtu.be/9eJ5hZmCj2Q",
    type: "electric",
    releaseDate: "2026-07-31T12:00:00",
    postDescription: "Setlist\n00:00 Heartverse\n00:33 CHEERLEADER\n04:03 Mean It (Lauv)\n08:21 I WOULD DIE FOR YOUR LOVE\n12:31 I LIKE ME BETTER (Lauv)\n14:31 Love\n16:36 Robbers\n21:10 AM I PRETTY WHEN I CRY",
  },
  {
    id: "lsf-009",
    title: "Electric Signal 09",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-10-14T12:00:00",
  },
  {
    id: "lsf-010",
    title: "Electric Signal 10",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-11-14T12:00:00",
  },
  {
    id: "lsf-011",
    title: "Electric Signal 11",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2026-12-14T12:00:00",
  },
  {
    id: "lsf-012",
    title: "Electric Signal 12",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2027-01-14T12:00:00",
  },
  {
    id: "lsf-013",
    title: "Electric Signal 13",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2027-02-14T12:00:00",
  },
  {
    id: "lsf-014",
    title: "Electric Signal 14",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2027-03-14T12:00:00",
  },
  {
    id: "lsf-015",
    title: "Electric Signal 15",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    type: "electric",
    releaseDate: "2027-04-14T12:00:00",
  },

  // ── Karaoke ──
  {
    id: "kar-001",
    title: "ALONE (ACOUSTIC)",
    youtubeUrl: "https://youtu.be/07Vs6Dmi8tE",
    type: "karaoke",
  },
  {
    id: "kar-002",
    title: "ALONE",
    youtubeUrl: "https://youtu.be/ca3a6wiERQE",
    type: "karaoke",
  },
  {
    id: "kar-003",
    title: "BE MY BEE",
    youtubeUrl: "https://youtu.be/ooTTnsrQqOc",
    type: "karaoke",
  },
  {
    id: "kar-004",
    title: "LETTING GO",
    youtubeUrl: "https://youtu.be/0rqWRJ-Lors",
    type: "karaoke",
  },
  {
    id: "kar-005",
    title: "OCEAN GIRL",
    youtubeUrl: "https://youtu.be/2FJyPj5andI",
    type: "karaoke",
  },
  {
    id: "kar-006",
    title: "OCEAN GIRL (ACOUSTIC)",
    youtubeUrl: "https://youtu.be/9PXDM5HogoY",
    type: "karaoke",
  },
  {
    id: "kar-007",
    title: "OCEAN GIRL (REMIX)",
    youtubeUrl: "https://youtu.be/rfRz3QDLNmM",
    type: "karaoke",
  },
  {
    id: "kar-008",
    title: "WE'RE JUST FRIENDS",
    youtubeUrl: "https://youtu.be/dYeVIV3RqXg",
    type: "karaoke",
  },
  {
    id: "kar-009",
    title: "MAKE BELIEVE",
    youtubeUrl: "https://youtu.be/HDSZ0QJuqdQ",
    type: "karaoke",
  },
  {
    id: "kar-010",
    title: "BABY",
    youtubeUrl: "https://youtu.be/z-EnAJomZ3M",
    type: "karaoke",
  },
  {
    id: "kar-011",
    title: "POKÉMON",
    youtubeUrl: "https://youtu.be/6xV_72SlBRM",
    type: "karaoke",
  },
];

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────
type VideoType = "heartverse" | "acoustic" | "electric" | "karaoke";

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

type TopTab = "heartverse" | "livesignal" | "karaoke";
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
  const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1${originParam}`;
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
export default function EpisodesLibrary({ isChatOpen = false, visible = true, onOpenChange }: { isChatOpen?: boolean; visible?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const setIsOpenAndNotify = useCallback((val: boolean) => { setIsOpen(val); onOpenChange?.(val); }, [onOpenChange]);
  const [topTab, setTopTab] = useState<TopTab>("heartverse");
  const [liveSignalSection, setLiveSignalSection] = useState<LiveSignalSection>("acoustic");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [startTime, setStartTime] = useState(0);
  const audio = useAudio();
  const wasPlayingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoOpenedAtRef = useRef<number>(0);
  const lastPositionsRef = useRef<Map<string, number>>(new Map());

  const stopVideo = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
    }
  }, []);

  // Reset the open-time clock whenever a video starts (or jumps to a timestamp)
  useEffect(() => {
    if (activeVideo) {
      videoOpenedAtRef.current = Date.now();
    }
  }, [activeVideo, startTime]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        stopVideo();
        if (wasPlayingRef.current) audio.play();
        setIsOpenAndNotify(false);
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

  // If the parent live signal display is closed, pause the YouTube player (keep position)
  useEffect(() => {
    if (visible === false) {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          const msg = JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] });
          iframe.contentWindow.postMessage(msg, '*');
        }
      } catch {}
    }
  }, [visible]);

  // Filter videos based on current tab/section
  const filteredVideos = VIDEOS.filter((v) => {
    if (topTab === "heartverse") return v.type === "heartverse";
    if (topTab === "karaoke") return v.type === "karaoke";
    return v.type === liveSignalSection;
  });
  if (topTab === "karaoke") {
    filteredVideos.sort((a, b) => a.title.localeCompare(b.title));
  }

  const newestId = getNewestId(filteredVideos);

  const handleVideoClick = (video: Video) => {
    if (isLocked(video)) return;
    playClick();
    // Remember if music was playing, then pause it
    wasPlayingRef.current = audio.playing;
    if (audio.playing) audio.pause();
    const savedPos = lastPositionsRef.current.get(video.id) ?? 0;
    setStartTime(savedPos);
    setActiveVideo(video);
  };

  const handleBack = () => {
    playClick();
    // Save approximate playback position so we can resume later
    if (activeVideo && videoOpenedAtRef.current > 0) {
      const elapsed = Math.floor((Date.now() - videoOpenedAtRef.current) / 1000);
      lastPositionsRef.current.set(activeVideo.id, startTime + elapsed);
    }
    stopVideo();
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
        onClick={() => { playClick(); if (isOpen) stopVideo(); setIsOpenAndNotify(!isOpen); }}
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
      <AnimatePresence>
      {isOpen && (
        <motion.div
          key="episodes-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
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
              onClick={() => { playClick(); stopVideo(); if (wasPlayingRef.current) audio.play(); setIsOpenAndNotify(false); setActiveVideo(null); }}
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
                stopVideo();
                setTopTab("heartverse");
                setActiveVideo(null);
              }}
              onMouseEnter={playHover}
            >
              Signals
            </button>
            <button
              className={`episodes-tab flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all duration-200 uppercase tracking-wide ${
                topTab === "livesignal"
                  ? "episodes-tab-livesignal-active"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => {
                playClick();
                stopVideo();
                setTopTab("livesignal");
                setActiveVideo(null);
              }}
              onMouseEnter={playHover}
            >
              Live Signal
            </button>
            <button
              className={`episodes-tab flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all duration-200 uppercase tracking-wide ${
                topTab === "karaoke"
                  ? "episodes-tab-karaoke-active"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => {
                playClick();
                stopVideo();
                setTopTab("karaoke");
                setActiveVideo(null);
              }}
              onMouseEnter={playHover}
            >
              Karaoke
            </button>
          </div>


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
                  stopVideo();
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
                  stopVideo();
                  setLiveSignalSection("electric");
                  setActiveVideo(null);
                }}
                onMouseEnter={playHover}
              >
                Electric
              </button>
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
                  ref={iframeRef}
                  key={activeVideo?.id}
                  src={`${getYouTubeEmbedUrl(activeVideo.youtubeUrl)}&start=${startTime}&autoplay=1`}
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
                          onClick={() => {
                            playClick();
                            setStartTime(seconds);
                            if (iframeRef.current?.contentWindow) {
                              iframeRef.current.contentWindow.postMessage(
                                JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
                                '*'
                              );
                              iframeRef.current.contentWindow.postMessage(
                                JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                                '*'
                              );
                            }
                          }}
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
                    const isKaraoke = topTab === "karaoke";
                    const accentColor = isElectric ? "#F2EF1D" : isAcoustic ? "#00FFFF" : isKaraoke ? "#F2EF1D" : "#FC54AF";
                    const isNewest = video.id === newestId;
                    const isReleased = !locked;
                    const borderDefault = isReleased
                      ? accentColor
                      : isElectric
                        ? 'rgba(242,239,29,0.15)'
                        : isAcoustic
                          ? 'rgba(0,255,255,0.15)'
                          : 'rgba(252,84,175,0.15)';
                    return (
                      <button
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        onMouseEnter={locked ? undefined : playHover}
                        disabled={locked}
                        aria-disabled={locked}
                        className={`episodes-video-card group flex items-center gap-2 w-full text-left p-2 rounded-lg border transition-all duration-200 episode-row-base ${
                          locked
                            ? "bg-white/3 cursor-not-allowed"
                            : "bg-white/3 hover:bg-white/8 episode-row-released"
                        }${isNewest ? " episode-row-newest" : ""}`}
                        style={{
                          '--row-accent': accentColor,
                          '--row-border': borderDefault,
                          '--row-base-shadow': isReleased ? `0 0 14px ${accentColor}50, 0 0 28px ${accentColor}20, inset 0 0 6px ${accentColor}15` : 'none',
                          '--row-pulse-shadow': `0 0 24px ${accentColor}BB, 0 0 48px ${accentColor}66, inset 0 0 10px ${accentColor}33`,
                          '--row-hover-shadow': `0 0 26px ${accentColor}EE, 0 0 52px ${accentColor}99, inset 0 0 14px ${accentColor}55`,
                          pointerEvents: locked ? 'none' : 'auto',
                        } as React.CSSProperties}
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
                              Releases {formatReleaseDate(video.releaseDate)}
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
        </motion.div>
      )}
      </AnimatePresence>

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
        .episode-row-base {
          border-color: var(--row-border);
          box-shadow: var(--row-base-shadow);
        }
        @keyframes rowGlowPulse {
          0%, 100% { box-shadow: var(--row-base-shadow); }
          50%       { box-shadow: var(--row-pulse-shadow); }
        }
        .episode-row-newest {
          animation: rowGlowPulse 2s ease-in-out infinite;
        }
        .episode-row-newest:hover {
          animation-play-state: paused;
        }
        .episode-row-released:hover {
          border-color: var(--row-accent) !important;
          box-shadow: var(--row-hover-shadow) !important;
          transform: scale(1.025);
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
        .episodes-tab-livesignal-active {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.6);
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
        }
        .episodes-tab-karaoke-active {
          background: rgba(242, 239, 29, 0.15);
          color: #F2EF1D;
          border: 1px solid rgba(242, 239, 29, 0.35);
          text-shadow: 0 0 6px rgba(242, 239, 29, 0.4);
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
