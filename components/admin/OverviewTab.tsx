"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { songProductionLabel, trackedProductionMilestones } from "@/lib/songWorkflow";

type Song = {
  id: string; title: string; slug: string; is_released: boolean; workflow_stage?: string | null;
  audio_status?: string | null; production_tracking_started?: boolean;
  production_stages?: Record<string, boolean>; next_action?: string; next_action_manual?: boolean;
  linkedTask?: Task | null;
};
type Task = { id: string; title: string; status: string; priority: string; due_at: string | null; business_area?: string; song_id?: string | null; song?: { id: string; title: string } | null };
type OutreachRecord = { id: string; status?: string | null };
type SyncRecord = { id: string; status?: string | null };

const generatedProfileTask = (title: string) => title.trim().toLowerCase() === "complete song profile";
const activePitchStatuses = new Set(["Planned", "Sent", "Follow-up"]);
const terminalSyncStatuses = new Set(["Licensed", "Passed", "Declined", "Closed"]);

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function taskOrder(today: string) {
  return (a: Task, b: Task) => {
    const bucket = (task: Task) => task.due_at && task.due_at < today ? 0 : task.due_at === today ? 1 : task.priority === "high" ? 2 : task.due_at ? 3 : 4;
    return bucket(a) - bucket(b) || (a.due_at || "9999-99-99").localeCompare(b.due_at || "9999-99-99") || a.title.localeCompare(b.title);
  };
}

export default function OverviewTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSong, setSavingSong] = useState(false);
  const [taskSaving, setTaskSaving] = useState<string | null>(null);
  const [activeOutreach, setActiveOutreach] = useState(0);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/song-tracker", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Songs unavailable"))),
      fetch("/api/admin/tasks", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Tasks unavailable"))),
      fetch("/api/admin/outreach-workspace", { cache: "no-store" }).then(async response => response.ok ? response.json() : { records: [] }),
      fetch("/api/admin/sync-workspace", { cache: "no-store" }).then(async response => response.ok ? response.json() : { opportunities: [] }),
      fetch("/api/admin/featured-song", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject(new Error("Featured song preference unavailable"))),
    ]).then(([songData, taskData, outreachData, syncData, featuredData]) => {
      if (!active) return;
      setSongs(songData.songs || []);
      setTasks(taskData.tasks || []);
      const pitchCount = (outreachData.records || []).filter((row: OutreachRecord) => activePitchStatuses.has(row.status || "")).length;
      const syncCount = (syncData.opportunities || []).filter((row: SyncRecord) => !!row.status && !terminalSyncStatuses.has(row.status)).length;
      setActiveOutreach(pitchCount + syncCount);
      setSelectedSongId(typeof featuredData.songId === "string" ? featuredData.songId : null);
      setError("");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load the music workspace."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const today = localToday();
  const actionableTasks = useMemo(() => tasks
    .filter(task => task.status !== "done" && !generatedProfileTask(task.title))
    .sort(taskOrder(today)), [tasks, today]);
  const featuredSong = songs.find(song => song.id === selectedSongId) || null;
  const releasedCount = songs.filter(song => song.is_released).length;
  const milestoneCount = featuredSong ? trackedProductionMilestones(featuredSong) : null;
  const nextStep = featuredSong?.next_action?.trim() || (featuredSong ? actionableTasks.find(task => task.song_id === featuredSong.id)?.title : "") || "";

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
  }

  const chooser = <label className="inline-flex items-center gap-2 rounded-full border border-white/[.12] bg-black/20 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#FD52AF]/40 hover:text-white">
    <span className="sr-only">Choose the song you are currently working on</span>
    <select aria-label="Choose the song you are currently working on" value="" disabled={savingSong || loading || !songs.length} onChange={event => { if (event.target.value === "__clear") void chooseSong(""); else if (event.target.value) void chooseSong(event.target.value); }} className="max-w-40 cursor-pointer appearance-none bg-transparent text-xs font-semibold text-white/75 outline-none"><option value="" disabled>{savingSong ? "Saving…" : "Change Song"}</option>{selectedSongId && <option value="__clear">Clear featured song</option>}{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select>
    <span aria-hidden="true" className="text-[#FD52AF]">⌄</span>
  </label>;

  return <div className="space-y-4 sm:space-y-5">
    <section aria-labelledby="portfolio-snapshot-title" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      <h1 id="portfolio-snapshot-title" className="sr-only">Portfolio Snapshot</h1>
      <Link href="/admin?view=songs" className="group rounded-xl border border-white/[.08] bg-[#111116] px-4 py-3 transition hover:-translate-y-px hover:border-[#FD52AF]/30 sm:px-5"><span className="block text-xs font-semibold text-white/45">Total Songs</span><span className="mt-1 block text-2xl font-black tabular-nums text-white">{loading ? "—" : songs.length}</span></Link>
      <Link href="/admin?view=songs&filter=released" className="group rounded-xl border border-white/[.08] bg-[#111116] px-4 py-3 transition hover:-translate-y-px hover:border-emerald-300/25 sm:px-5"><span className="block text-xs font-semibold text-white/45">Released</span><span className="mt-1 block text-2xl font-black tabular-nums text-emerald-200">{loading ? "—" : releasedCount}</span></Link>
      <Link href="/admin?view=outreach" className="group rounded-xl border border-white/[.08] bg-[#111116] px-4 py-3 transition hover:-translate-y-px hover:border-sky-300/25 sm:px-5"><span className="block text-xs font-semibold text-white/45">Active Outreach</span><span className="mt-1 block text-2xl font-black tabular-nums text-sky-200">{loading ? "—" : activeOutreach}</span></Link>
    </section>

    <section aria-labelledby="currently-working-title" className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-[#101014] shadow-[0_20px_65px_rgba(0,0,0,.25)]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#FD52AF]/[.07] blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-4 py-3.5 sm:px-6"><div><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Your focus</p><h2 id="currently-working-title" className="mt-0.5 text-sm font-bold text-white/90">Currently Working On</h2></div></div>
      {loading ? <div className="relative grid min-h-48 place-items-center p-8 text-sm text-white/40">Loading your workspace…</div> : featuredSong ? <div className="relative grid gap-5 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:gap-7 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
        <Link href={`/admin/songs/${featuredSong.id}`} aria-label={`Open ${featuredSong.title} artwork and workspace`} className="group relative mx-auto block h-40 w-40 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
          <span className="absolute -inset-5 rounded-full bg-[#FD52AF]/20 blur-2xl transition duration-500 group-hover:bg-[#FD52AF]/30" />
          <span className="relative block h-full w-full overflow-hidden rounded-2xl border border-white/[.11] bg-gradient-to-br from-[#291321] to-[#101014] shadow-[0_16px_45px_rgba(0,0,0,.4)]"><span className="absolute inset-0 grid place-items-center text-[.62rem] font-black tracking-[.16em] text-[#FD52AF]/60">CHXNDLER</span><img src={songCoverPath(featuredSong.slug, featuredSong.title)} alt={`${featuredSong.title} cover art`} onError={event => { event.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /></span>
        </Link>
        <div className="min-w-0 text-center sm:text-left"><div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"><span className="rounded-full border border-white/[.08] bg-white/[.035] px-2.5 py-1 text-[.62rem] font-semibold text-white/65">{featuredSong.is_released ? "Released" : "Unreleased"}</span><span className="text-[.68rem] text-white/40">{songProductionLabel(featuredSong)}</span></div><h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{featuredSong.title}</h3>
          {milestoneCount !== null && <div className="mx-auto mt-3 max-w-sm sm:mx-0"><div className="flex items-center justify-between text-[.65rem] text-white/40"><span>Production milestones</span><span>{milestoneCount}/6</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-[#FD52AF] to-[#f8a2ce] transition-[width] duration-500" style={{ width: `${milestoneCount / 6 * 100}%` }} /></div></div>}
          <div className="mt-4"><p className="text-[.62rem] font-bold uppercase tracking-[.15em] text-white/35">Next step</p>{nextStep ? <p className="mt-1 text-sm font-medium text-white/80">{nextStep}</p> : <p className="mt-1 text-sm text-white/40">No next step saved yet.</p>}</div>
        </div>
        <div className="flex flex-col items-center gap-2 sm:col-span-2 sm:flex-row sm:justify-center lg:col-span-1 lg:flex-col lg:items-stretch"><Link href={`/admin/songs/${featuredSong.id}`} className="inline-flex min-w-48 items-center justify-center rounded-xl bg-[#FD52AF] px-5 py-3 text-sm font-extrabold text-[#170d14] shadow-[0_8px_28px_rgba(253,82,175,.16)] transition hover:-translate-y-px hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Continue Working <span className="ml-2" aria-hidden="true">→</span></Link>{chooser}</div>
      </div> : <div className="relative flex flex-col items-center px-5 py-9 text-center sm:py-11"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#FD52AF]/20 bg-[#FD52AF]/[.06] text-xl text-[#FD52AF]" aria-hidden="true">♪</div><h3 className="mt-3 text-lg font-bold text-white">Choose your focus song</h3><p className="mt-1 max-w-sm text-sm leading-5 text-white/45">Your selected song will stay here between visits. Nothing is picked for you.</p><label className="mt-4"><span className="sr-only">Choose a song to feature</span><select value="" disabled={savingSong || !songs.length} onChange={event => { if (event.target.value) void chooseSong(event.target.value); }} className="min-w-48 rounded-xl border border-white/[.12] bg-[#17171c] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#FD52AF]/50"><option value="" disabled>{songs.length ? "Choose a song…" : "No songs available"}</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label></div>}
      {error && <p role="alert" className="relative border-t border-red-300/10 bg-red-300/[.035] px-4 py-2.5 text-sm text-red-200 sm:px-6">{error}</p>}
    </section>

    <section aria-labelledby="up-next-title" className="rounded-2xl border border-white/[.08] bg-[#101014] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-white/35">Your task list</p><h2 id="up-next-title" className="mt-0.5 text-base font-bold">Up Next</h2></div><Link href="/admin?view=tasks" className="shrink-0 text-xs font-semibold text-[#FD52AF] transition hover:text-[#ffabd4]">View All Tasks →</Link></header>
      {taskError && <p role="alert" className="mb-3 rounded-lg border border-red-300/10 bg-red-300/[.04] px-3 py-2 text-xs text-red-200">{taskError}</p>}
      {loading ? <p className="py-5 text-center text-sm text-white/40">Loading tasks…</p> : actionableTasks.length ? <ul className="divide-y divide-white/[.06]">{actionableTasks.slice(0, 5).map(task => {
        const isOverdue = !!task.due_at && task.due_at < today;
        const taskHref = `/admin?view=tasks&task=${task.id}`;
        return <li key={task.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
          <button type="button" disabled={taskSaving === task.id} onClick={() => void completeTask(task)} aria-label={`Mark ${task.title} complete`} className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/20 text-transparent transition hover:border-[#FD52AF] hover:bg-[#FD52AF]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FD52AF] disabled:opacity-40"><span aria-hidden="true">✓</span></button>
          <div className="min-w-0 flex-1"><Link href={taskHref} className="block truncate text-sm font-semibold text-white/85 transition hover:text-[#ff9dcd]">{task.title}</Link><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[.66rem] text-white/40">{task.song && <Link href={`/admin/songs/${task.song.id}`} className="truncate hover:text-white/70">{task.song.title}</Link>}{task.due_at && <span className={isOverdue ? "font-semibold text-amber-200" : ""}>{isOverdue ? "Overdue · " : "Due "}{task.due_at}</span>}{task.priority === "high" && <span className="rounded-full bg-amber-200/[.08] px-1.5 py-0.5 font-semibold text-amber-100">High priority</span>}</div></div>
          <Link href={taskHref} aria-label={`Open ${task.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/25 transition hover:bg-white/[.05] hover:text-white/75">↗</Link>
        </li>;
      })}</ul> : <div className="rounded-xl border border-dashed border-white/[.09] px-4 py-5 text-center"><p className="text-sm font-semibold text-white/65">You’re clear for now.</p><p className="mt-1 text-xs text-white/35">When something needs follow-up, it’ll appear here.</p></div>}
    </section>
    <style jsx>{`@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}`}</style>
  </div>;
}
