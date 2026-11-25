"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { parseYouTubeId } from "@/lib/youtube";
import { milestoneValue, songProductionLabel, trackedProductionMilestones, type ProductionMilestone, type ProductionStage } from "@/lib/songWorkflow";
import SkyVideoBackground from "@/components/brand-pitch/SkyVideoBackground";
import PracticeTab from "@/components/admin/PracticeTab";
import { ProductionStageIcon } from "@/components/admin/SongProductionProgress";

type Song = {
  id: string; title: string; slug: string; is_released: boolean; release_date?: string | null; workflow_stage?: string | null;
  sky_video_url?: string | null;
  audio_status?: string | null; production_tracking_started?: boolean;
  production_stages?: Record<string, boolean> | null; production_progress_verified?: boolean; next_action?: string | null; next_action_manual?: boolean;
  linkedTask?: Task | null;
};
type Task = { id: string; title: string; status: string; priority: string; due_at: string | null; task_category?: "music" | "editing" | "admin"; business_area?: string; song_id?: string | null; song?: { id: string; title: string } | null; content?: { id: string; song_id: string } | null };
type OutreachRecord = { id: string; status?: string | null };
type SyncRecord = { id: string; status?: string | null };
type CollaborationRequest = { id: string; song_id?: string | null; artist_name: string; contribution_type: string; status: string; submitted_at: string; songs?: { title?: string } | null };

const generatedProfileTask = (title: string) => title.trim().toLowerCase() === "complete song profile";
const focusProductionStages: Array<{ milestone: ProductionMilestone; stage: ProductionStage }> = [
  { milestone: "concept", stage: "Idea" }, { milestone: "lyrics", stage: "Writing" }, { milestone: "recorded", stage: "Recording" }, { milestone: "mixed", stage: "Mixing" }, { milestone: "mastered", stage: "Mastering" },
];
const activePitchStatuses = new Set(["Planned", "Sent", "Follow-up"]);
const terminalSyncStatuses = new Set(["Licensed", "Passed", "Declined", "Closed"]);
const songColors = ["#FF8BC4", "#76D8FF", "#B99AFF", "#FFC66D", "#7EE0B5", "#FF9A7A"];
function songColor(name: string) {
  let hash = 0;
  for (const char of name.toUpperCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return songColors[Math.abs(hash) % songColors.length];
}

function openCollaborationRequest(requestId: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("view", "outreach");
  params.set("section", "collabs");
  params.set("request", requestId);
  window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function TaskCategoryIcon({ category = "admin", title = "" }: { category?: Task["task_category"]; title?: string }) {
  const name = title.toLowerCase();
  if (name.includes("spotify canvas")) return <span title="Spotify Canvas" aria-label="Spotify Canvas" className="grid h-6 w-6 shrink-0 place-items-center"><img src="/elements/spotify.webp" alt="" className="h-6 w-6 object-contain" /></span>;
  if (name.includes("sky")) return <span title="Sky" aria-label="Sky" className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#42B8E8]/10 text-[#42B8E8]"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 16h9a3 3 0 0 0 .4-6 5 5 0 0 0-9.6 1.3A2.4 2.4 0 0 0 5 16Z"/><path d="M5 5V3M2.5 7 1 6M9 5l1.5-1"/></svg></span>;
  if (name.includes("chxndler card")) return <span title="CHXNDLER Card" aria-label="CHXNDLER Card" className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-[#A78BFA]/10"><img src={getCardImageUrl("BACK")} alt="" className="h-5 w-4 rounded-[2px] object-cover" /></span>;
  const color = category === "music" ? "#38B6FF" : category === "editing" ? "#B99AFF" : "#F2B84B";
  return <span title={`${category || "admin"} task`} aria-label={`${category || "admin"} task`} className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ color, backgroundColor: `${color}18` }}>
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{category === "music" ? <><path d="M12.5 4v9.2a2.3 2.3 0 1 1-1.4-2.1V6l6-1.3v7.5a2.3 2.3 0 1 1-1.4-2.1V3.5L12.5 4Z"/></> : category === "editing" ? <><path d="m13.8 3.5 2.7 2.7M4 16l1-.2 9.8-9.8-2.5-2.5-9.8 9.8L2 16h2Z"/><path d="M11 17h7"/></> : <><rect x="3.5" y="3" width="13" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h3"/></>}</svg>
  </span>;
}

function coverArtStep(title: string) {
  const name = title.toLowerCase();
  if (/^(make|create) cover art/.test(name)) return 0;
  if (name.includes("create horizontal cover art")) return 1;
  if (name.includes("animate horizontal cover art")) return 2;
  if (name.includes("create vertical cover art")) return 3;
  if (name.includes("spotify canvas")) return 4;
  return null;
}
function displayTaskTitle(title: string) {
  return title.replace(/^Make cover art\b/i, "Create cover art");
}

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return dateOnly;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function taskOrder(today: string) {
  return (a: Task, b: Task) => {
    const aCoverStep = coverArtStep(a.title), bCoverStep = coverArtStep(b.title);
    if (aCoverStep !== null || bCoverStep !== null) {
      if (aCoverStep === null) return 1;
      if (bCoverStep === null) return -1;
      if (aCoverStep !== bCoverStep) return aCoverStep - bCoverStep;
    }
    const bucket = (task: Task) => task.due_at && task.due_at < today ? 0 : task.due_at === today ? 1 : task.priority === "high" ? 2 : task.due_at ? 3 : 4;
    return bucket(a) - bucket(b) || (a.due_at || "9999-99-99").localeCompare(b.due_at || "9999-99-99") || a.title.localeCompare(b.title);
  };
}

export default function OverviewTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSong, setSavingSong] = useState(false);
  const [taskSaving, setTaskSaving] = useState<string | null>(null);
  const [activeOutreach, setActiveOutreach] = useState(0);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceDate, setPracticeDate] = useState(localToday);
  const [songMenuOpen, setSongMenuOpen] = useState(false);
  const songChooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/song-tracker", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Songs unavailable"))),
      fetch("/api/admin/tasks", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Tasks unavailable"))),
      fetch("/api/admin/collaboration-requests", { cache: "no-store" }).then(async response => response.ok ? response.json() : { requests: [] }),
      fetch("/api/admin/outreach-workspace", { cache: "no-store" }).then(async response => response.ok ? response.json() : { records: [] }),
      fetch("/api/admin/sync-workspace", { cache: "no-store" }).then(async response => response.ok ? response.json() : { opportunities: [] }),
      fetch("/api/admin/featured-song", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Featured song preference unavailable"))),
    ]).then(([songData, taskData, collabData, outreachData, syncData, featuredData]) => {
      if (!active) return;
      setSongs(songData.songs || []);
      setTasks(taskData.tasks || []);
      setCollaborationRequests((collabData.requests || []).filter((request: CollaborationRequest) => request.status === "new"));
      const pitchCount = (outreachData.records || []).filter((row: OutreachRecord) => activePitchStatuses.has(row.status || "")).length;
      const syncCount = (syncData.opportunities || []).filter((row: SyncRecord) => !!row.status && !terminalSyncStatuses.has(row.status)).length;
      setActiveOutreach(pitchCount + syncCount);
      setSelectedSongId(typeof featuredData.songId === "string" ? featuredData.songId : null);
      setError("");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load the music workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!practiceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPracticeOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [practiceOpen]);

  useEffect(() => {
    if (!songMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !songChooserRef.current?.contains(event.target)) setSongMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSongMenuOpen(false); };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [songMenuOpen]);

  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      const updated = (event as CustomEvent<Partial<Song> & { id?: string }>).detail;
      if (!updated?.id) return;
      setSongs(rows => rows.map(song => song.id === updated.id ? { ...song, ...updated } : song));
    };
    window.addEventListener("song-production-updated", handleProgressUpdate);
    return () => window.removeEventListener("song-production-updated", handleProgressUpdate);
  }, []);

  useEffect(() => {
    const handleTaskUpdate = (event: Event) => {
      const updated = (event as CustomEvent<{ id?: string; status?: string }>).detail;
      if (!updated?.id || !updated.status) return;
      setTasks(rows => rows.map(task => task.id === updated.id ? { ...task, status: updated.status! } : task));
    };
    window.addEventListener("admin-task-updated", handleTaskUpdate);
    return () => window.removeEventListener("admin-task-updated", handleTaskUpdate);
  }, []);

  const today = localToday();
  const actionableTasks = useMemo(() => tasks
    .filter(task => task.status !== "done" && !generatedProfileTask(task.title))
    .sort(taskOrder(today)), [tasks, today]);
  const featuredSong = songs.find(song => song.id === selectedSongId) || null;
  const taskBelongsToSong = (task: Task, songId: string) => task.song_id === songId || task.song?.id === songId || task.content?.song_id === songId;
  const focusTasks = featuredSong ? actionableTasks.filter(task => taskBelongsToSong(task, featuredSong.id)) : [];
  const focusCollaborationRequests = featuredSong ? collaborationRequests.filter(request => request.song_id === featuredSong.id) : [];
  const releasedCount = songs.filter(song => song.is_released).length;
  const milestoneCount = featuredSong ? trackedProductionMilestones(featuredSong) : null;
  const [contentRemaining, setContentRemaining] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedSongId) { setContentRemaining(null); return; }
    fetch(`/api/admin/content-items?songId=${encodeURIComponent(selectedSongId)}&pageSize=100`, { cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (active) setContentRemaining(data?.songSummary ? Math.max(0, data.songSummary.total - data.songSummary.posted) : null); })
      .catch(() => { if (active) setContentRemaining(null); });
    return () => { active = false; };
  }, [selectedSongId]);

  async function chooseSong(songId: string) {
    setSavingSong(true); setError("");
    const response = await fetch("/api/admin/featured-song", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: songId || null }) });
    const data = await response.json(); setSavingSong(false);
    if (!response.ok) { setError(data.error || "Unable to save the featured song."); return; }
    setSelectedSongId(data.songId);
  }

  async function completeTask(task: Task) {
    setTaskSaving(task.id); setTaskError("");
    const response = await fetch("/api/admin/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, status: "done" }) });
    const data = await response.json(); setTaskSaving(null);
    if (!response.ok) { setTaskError(data.error || "Unable to complete this task."); return; }
    setTasks(rows => rows.map(row => row.id === task.id ? { ...row, status: "done" } : row));
    window.dispatchEvent(new CustomEvent("admin-task-updated", { detail: { id: task.id, status: "done" } }));
  }

  async function updateTaskDate(task: Task, dueAt: string) {
    setTaskSaving(task.id); setTaskError("");
    const response = await fetch("/api/admin/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, due_at: dueAt || null }) });
    const data = await response.json(); setTaskSaving(null);
    if (!response.ok) { setTaskError(data.error || "Unable to update this task date."); return; }
    setTasks(rows => rows.map(row => row.id === task.id ? { ...row, due_at: dueAt || null } : row));
    window.dispatchEvent(new CustomEvent("admin-task-updated", { detail: { id: task.id, due_at: dueAt || null } }));
  }

  const chooser = <div ref={songChooserRef} className="relative">
    <button type="button" aria-label="Choose the song you are currently working on" aria-haspopup="listbox" aria-expanded={songMenuOpen} disabled={savingSong || loading || !songs.length} onClick={() => setSongMenuOpen(open => !open)} className="inline-flex items-center gap-2 rounded-full border border-white/[.12] bg-black/20 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#FD52AF]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
      {savingSong ? "Saving…" : "Change Song"}<span aria-hidden="true" className="text-[#FD52AF]">⌄</span>
    </button>
    {songMenuOpen && <div role="listbox" aria-label="Choose a featured song" className="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,30rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#FD52AF]/25 bg-[#111116] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.7)] ring-1 ring-black/50">
      <p className="px-3 pb-1.5 pt-2 text-[.6rem] font-bold uppercase tracking-[.16em] text-white/35">Featured song</p>
      {selectedSongId && <button type="button" role="option" aria-selected={false} onClick={() => { setSongMenuOpen(false); void chooseSong(""); }} className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white/55 transition hover:bg-[#FD52AF]/10 hover:text-[#ff8bc4]"><span className="grid h-5 w-5 place-items-center rounded-full border border-white/15 text-[.65rem]">×</span>Clear featured song</button>}
      {songs.map(song => { const color = songColor(song.title); const selected = song.id === selectedSongId; return <button key={song.id} type="button" role="option" aria-selected={selected} onClick={() => { setSongMenuOpen(false); if (!selected) void chooseSong(song.id); }} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${selected ? "border-white/10 bg-white/[.07]" : "border-transparent hover:bg-white/[.055]"}`}><span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_currentColor]" style={{ color, backgroundColor: color }}/><span className="min-w-0 flex-1 truncate text-xs font-bold" style={{ color }}>{song.title}</span>{selected && <span className="text-[.6rem] font-semibold uppercase tracking-wider text-white/35">Selected</span>}</button>; })}
    </div>}
  </div>;

  return <div className="space-y-4 sm:space-y-5">
    <section aria-labelledby="portfolio-snapshot-title" className="grid grid-cols-3 gap-2 sm:gap-3">
      <h1 id="portfolio-snapshot-title" className="sr-only">Portfolio Snapshot</h1>
      <Link href="/admin?view=songs" className="group min-w-0 rounded-xl border border-white/[.08] bg-[#111116] px-2.5 py-3 transition hover:-translate-y-px hover:border-[#FD52AF]/30 sm:px-4"><span className="block text-[.65rem] font-semibold leading-tight text-white/45 sm:text-xs">Total Songs</span><span className="mt-1 block text-2xl font-black tabular-nums text-white">{loading ? "—" : songs.length}</span></Link>
      <Link href="/admin?view=songs&filter=released" className="group min-w-0 rounded-xl border border-white/[.08] bg-[#111116] px-2.5 py-3 transition hover:-translate-y-px hover:border-emerald-300/25 sm:px-4"><span className="block text-[.65rem] font-semibold leading-tight text-white/45 sm:text-xs">Released</span><span className="mt-1 block text-2xl font-black tabular-nums text-emerald-200">{loading ? "—" : releasedCount}</span></Link>
      <Link href="/admin?view=outreach" className="group min-w-0 rounded-xl border border-white/[.08] bg-[#111116] px-2.5 py-3 transition hover:-translate-y-px hover:border-sky-300/25 sm:px-4"><span className="block text-[.65rem] font-semibold leading-tight text-white/45 sm:text-xs">Active Outreach</span><span className="mt-1 block text-2xl font-black tabular-nums text-sky-200">{loading ? "—" : activeOutreach}</span></Link>
    </section>

    <button type="button" onClick={() => setPracticeOpen(true)} aria-haspopup="dialog" className="group flex w-full items-center gap-4 rounded-2xl border border-[#FD52AF]/20 bg-gradient-to-r from-[#21121c] to-[#111116] p-4 text-left transition hover:-translate-y-px hover:border-[#FD52AF]/45 hover:from-[#291522] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FD52AF] sm:p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#FD52AF]/25 bg-[#FD52AF]/[.09] text-[#FD52AF]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
      <span className="min-w-0 flex-1 text-base font-bold text-white">Practice</span>
    </button>

    {practiceOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPracticeOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Practice session" className="flex h-[95vh] max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d11] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6"><label className="inline-flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[#ff66b4]">Practice date<input type="date" value={practiceDate} onChange={event => setPracticeDate(event.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm font-medium normal-case tracking-normal text-white" /></label><button type="button" autoFocus onClick={() => setPracticeOpen(false)} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ff79c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FD52AF]">Finish</button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><PracticeTab date={practiceDate}/></div>
      </section>
    </div>}

    <section aria-labelledby="currently-working-title" className="relative z-30 overflow-visible rounded-2xl border border-white/[.08] bg-[#101014] shadow-[0_20px_65px_rgba(0,0,0,.25)]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#FD52AF]/[.07] blur-3xl" />
      {featuredSong?.sky_video_url?.trim() && <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
        {parseYouTubeId(featuredSong.sky_video_url) ? <SkyVideoBackground url={featuredSong.sky_video_url} /> : <video src={featuredSong.sky_video_url} poster={songCoverPath(featuredSong.slug, featuredSong.title)} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/55" />
      </div>}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-4 py-3.5 sm:px-6"><p id="currently-working-title" className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Your focus</p>{chooser}</div>
      {loading ? <div className="relative grid min-h-48 place-items-center p-8 text-sm text-white/40">Loading your workspace…</div> : featuredSong ? <div className="relative grid gap-5 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:gap-7 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <Link href={`/admin/songs/${featuredSong.id}`} aria-label={`Open ${featuredSong.title} artwork and workspace`} className="group relative mx-auto block h-40 w-40 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
          <span className="absolute -inset-5 rounded-full bg-[#FD52AF]/20 blur-2xl transition duration-500 group-hover:bg-[#FD52AF]/30" />
          <span className="relative block h-full w-full overflow-hidden rounded-2xl border border-white/[.11] bg-gradient-to-br from-[#291321] to-[#101014] shadow-[0_16px_45px_rgba(0,0,0,.4)]"><span className="absolute inset-0 grid place-items-center text-[.62rem] font-black tracking-[.16em] text-[#FD52AF]/60">CHXNDLER</span><img src={songCoverPath(featuredSong.slug, featuredSong.title)} alt={`${featuredSong.title} cover art`} onError={event => { event.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /></span>
        </Link>
        <div className="min-w-0 text-center sm:text-left"><div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[.62rem] font-bold text-white"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 10h14M10 3l7 7-7 7"/></svg>{featuredSong.is_released ? "Released" : "Unreleased"}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[.68rem] font-semibold text-white"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 text-[#FD52AF]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 15.5V4.5M3 15.5h14M6 12l3-3 2 2 4-5"/></svg>{songProductionLabel(featuredSong)}</span></div><h3 className="mt-2 text-3xl font-black tracking-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,.8)] sm:text-4xl">{featuredSong.title}</h3>
          {featuredSong.release_date && <p className="mt-2 text-lg font-bold text-[#FD52AF] [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">Release day · {(() => { const [year, month, day] = featuredSong.release_date!.slice(0, 10).split("-"); return `${month}/${day}/${year}`; })()}</p>}
          <p className="mt-2 text-sm font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">Content left to release · <strong className="text-lg font-black text-[#FD52AF]">{contentRemaining === null ? "—" : `#${contentRemaining}`}</strong></p>
          {milestoneCount !== null && <div className="mx-auto mt-3 max-w-sm sm:mx-0"><div className="flex items-center justify-between rounded-md bg-black/40 px-2 py-1 text-xs font-semibold text-white"><span>Reviewed production progress</span><span>{milestoneCount}/5</span></div><div className="mt-2 flex items-center justify-between rounded-md bg-black/35 px-2 py-1.5" aria-label={`Music production milestones: ${milestoneCount} of 5 complete`}>{focusProductionStages.map(({ milestone, stage }) => { const complete = milestoneValue(featuredSong, milestone); return <span key={milestone} title={`${stage} · ${complete ? "Complete" : "Incomplete"}`} aria-label={`${stage} ${complete ? "complete" : "incomplete"}`}><ProductionStageIcon stage={stage} complete={complete} className="h-5 w-5 sm:h-6 sm:w-6" /></span>; })}</div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-gradient-to-r from-[#FD52AF] to-[#f8a2ce] transition-[width] duration-500" style={{ width: `${milestoneCount / 5 * 100}%` }} /></div></div>}
        </div>
      </div> : <div className="relative flex flex-col items-center px-5 py-9 text-center sm:py-11"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#FD52AF]/20 bg-[#FD52AF]/[.06] text-xl text-[#FD52AF]" aria-hidden="true">♪</div><h3 className="mt-3 text-lg font-bold text-white">Choose your focus song</h3><p className="mt-1 max-w-sm text-sm leading-5 text-white/45">Your selected song will stay here between visits. Nothing is picked for you.</p><label className="mt-4"><span className="sr-only">Choose a song to feature</span><select value="" disabled={savingSong || !songs.length} onChange={event => { if (event.target.value) void chooseSong(event.target.value); }} className="min-w-48 rounded-xl border border-white/[.12] bg-[#17171c] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#FD52AF]/50"><option value="" disabled>{songs.length ? "Choose a song…" : "No songs available"}</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label></div>}
      {error && <p role="alert" className="relative border-t border-red-300/10 bg-red-300/[.035] px-4 py-2.5 text-sm text-red-200 sm:px-6">{error}</p>}
    </section>

    <section aria-labelledby="up-next-title" className="rounded-2xl border border-white/[.08] bg-[#101014] p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-3"><div><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-white/35">Your task list</p><h2 id="up-next-title" className="mt-0.5 text-base font-bold">Up Next</h2></div></header>
      {taskError && <p role="alert" className="mb-3 rounded-lg border border-red-300/10 bg-red-300/[.04] px-3 py-2 text-xs text-red-200">{taskError}</p>}
      {loading ? <p className="py-5 text-center text-sm text-white/40">Loading tasks…</p> : focusTasks.length || focusCollaborationRequests.length ? <>
        <div className="hidden grid-cols-[1.25rem_minmax(0,2.5fr)_minmax(7rem,.65fr)_8rem] gap-3 border-b border-white/[.06] pb-2 text-[.6rem] font-bold uppercase tracking-[.14em] text-white/30 sm:grid"><span/><span>Task</span><span>Song</span><span>Date</span></div>
        <ul className="divide-y divide-white/[.06]">
        {focusCollaborationRequests.map(request => <li key={`collab-${request.id}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_7rem] items-center gap-3 border-b border-[#FD52AF]/15 py-3 first:pt-1 sm:grid-cols-[1.25rem_minmax(0,2.5fr)_minmax(7rem,.65fr)_8rem]">
          <span aria-label="Collaboration request" title="Collaboration request" className="grid h-6 w-6 shrink-0 place-items-center"><img src="/elements/alien.webp" alt="" className="h-6 w-6 object-contain" /></span>
          <a href={`/admin?view=outreach&section=collabs&request=${encodeURIComponent(request.id)}`} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openCollaborationRequest(request.id); }} className="min-w-0 truncate text-sm font-semibold text-white/90 transition hover:text-[#ff9dcd]">New collaboration request · {request.artist_name} <span className="font-normal text-white/50">· {request.contribution_type}</span></a>
          <a href={`/admin?view=outreach&section=collabs&request=${encodeURIComponent(request.id)}`} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openCollaborationRequest(request.id); }} className="hidden min-w-0 truncate text-xs font-semibold sm:block" style={{ color: request.songs?.title ? songColor(request.songs.title) : "rgba(255,255,255,.45)" }} title={request.songs?.title || "No song selected"}>{request.songs?.title || "—"}</a>
          <span className="whitespace-nowrap text-xs text-white/45" title={request.submitted_at}>{displayDate(request.submitted_at)}</span>
        </li>)}
        {focusTasks.slice(0, 5).map(task => {
        const isOverdue = !!task.due_at && task.due_at < today;
        const taskHref = task.content ? `/admin/songs/${task.content.song_id}?tab=content&content=${task.content.id}` : `/admin?view=tasks&task=${task.id}`;
        return <li key={task.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_7rem] items-center gap-3 py-3 first:pt-1 last:pb-1 sm:grid-cols-[1.25rem_minmax(0,2.5fr)_minmax(7rem,.65fr)_8rem]">
          <button type="button" disabled={taskSaving === task.id} onClick={() => void completeTask(task)} aria-label={`Mark ${task.title} complete`} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FD52AF] disabled:opacity-70 ${taskSaving === task.id ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-white/20 text-transparent hover:border-[#FD52AF] hover:bg-[#FD52AF]/10"}`}><span aria-hidden="true">✓</span></button>
          <div className="flex min-w-0 items-start gap-2"><TaskCategoryIcon category={task.task_category} title={task.title}/><div className="min-w-0 flex-1"><Link href={taskHref} className="block whitespace-normal break-words text-sm font-semibold text-white/85 transition hover:text-[#ff9dcd]">{displayTaskTitle(task.title)}</Link><div className="mt-1">{task.priority === "high" && <span className="rounded-full bg-amber-200/[.08] px-1.5 py-0.5 text-[.66rem] font-semibold text-amber-100">High priority</span>}</div></div></div>
          <span className="hidden min-w-0 truncate text-xs font-semibold sm:block" style={{ color: songColor(task.song?.title || featuredSong?.title || "") }} title={task.song?.title || featuredSong?.title || "No song"}>{task.song?.title || featuredSong?.title || "—"}</span>
          <input type="date" aria-label={`Set date for ${task.title}`} value={task.due_at || ""} disabled={taskSaving === task.id} onChange={event => void updateTaskDate(task, event.target.value)} className={`w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-1 text-xs outline-none transition focus:border-white/15 focus:bg-white/[.04] disabled:opacity-50 ${isOverdue ? "font-semibold text-amber-200" : "text-white/55"}`} />
        </li>;
      })}</ul></> : <div className="rounded-xl border border-dashed border-white/[.09] px-4 py-5 text-center"><p className="text-sm font-semibold text-white/65">You’re clear for now.</p><p className="mt-1 text-xs text-white/35">When something needs follow-up, it’ll appear here.</p></div>}
    </section>
    <style jsx>{`@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}`}</style>
  </div>;
}
