"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import { songPipelineKey, type SongPipelineKey } from "@/lib/songWorkflow";

type PipelineKey = SongPipelineKey;
type FilterKey = "all" | "released" | "unreleased" | "in_progress" | "ready_for_collab" | "video_needed" | "active_outreach" | "needs_attention" | `stage:${PipelineKey}`;
type LinkedTask = { id: string; title: string; status: string; priority: string; due_at: string | null };
type SongRow = {
  id: string; title: string; slug: string; is_released: boolean; release_date?: string | null;
  updated_at?: string | null; created_at?: string | null; audio_status?: string | null;
  collaboration_opportunities: string[]; video_concept?: string; collaboration_enabled?: boolean;
  production_stages?: Record<string, boolean>; production_tracking_started?: boolean;
  ready_for_collab?: boolean; workflow_stage?: string | null; next_action?: string;
  next_action_manual?: boolean; activeOutreachCount?: number; linkedTask?: LinkedTask | null;
  sky_video_url?: string | null; youtube_music_video_url?: string | null;
  brand_cover_path?: string | null;
  musicVideo?: null | { id: string; status: string; visibility: string; next_action: string; assigned_videographer?: { name?: string; email?: string }; public_concept?: string; public_status?: string; collaboration_stage?: string };
};

const pipeline = [
  { key: "idea", label: "Idea / Demo", color: "#FD52AF" },
  { key: "progress", label: "In Progress", color: "#42B8E8" },
  { key: "final", label: "Final", color: "#A78BFA" },
  { key: "unset", label: "Not Set", color: "#777783" },
] as const;
const productionOptions = [
  ["Idea", "Idea / Demo"], ["Writing", "Writing"], ["Recording", "Recording"],
  ["Mixing", "Mixing"], ["Mastering", "Mastering"], ["Ready", "Final / Ready"],
] as const;
const stages = ["concept", "lyrics", "recorded", "mix", "mastered", "ready"] as const;
const generatedProfileTask = (title: string) => title.trim().toLowerCase() === "complete song profile";

function workflowStageValue(song: SongRow) {
  if (song.workflow_stage === "Idea" && !song.production_tracking_started && !Object.values(song.production_stages || {}).some(Boolean)) {
    if (song.audio_status === "In Progress") return "__audio_progress";
    if (song.audio_status === "Final") return "__audio_final";
    return "__not_set";
  }
  if (!song.workflow_stage && song.audio_status === "In Progress") return "__audio_progress";
  if (!song.workflow_stage && song.audio_status === "Final") return "__audio_final";
  return productionOptions.some(([value]) => value === song.workflow_stage) ? song.workflow_stage! : "__not_set";
}

function hasVideoOpportunity(song: SongRow) {
  return song.collaboration_opportunities.includes("video") || !!song.video_concept?.trim()
    || song.musicVideo?.collaboration_stage === "Seeking"
    || /seeking videographer/i.test(song.musicVideo?.public_status || "");
}

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function SongTracker() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [columnFilter, setColumnFilter] = useState<{ key: string; value: string } | null>(null);
  const [columnMenu, setColumnMenu] = useState<string | null>(null);
  const [songFilterText, setSongFilterText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionDraft, setActionDraft] = useState("");
  const [savingCollabId, setSavingCollabId] = useState<string | null>(null);
  const [songInfo, setSongInfo] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/song-tracker", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setSongs(data.songs || []);
      setError("");
    } else setError(data.error || "Unable to load songs.");
    setLoading(false);
  }

  async function openSongInfo(song: SongRow) {
    setSongInfo({ song: { id: song.id, title: song.title } });
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") setAdding(true);
    const filter = params.get("filter");
    if (filter === "released") setStatusFilter("released");
    if (filter === "ready_for_collab") setStatusFilter("ready_for_collab");
  }, []);

  const today = localToday();
  const counts = useMemo(() => {
    const stageCounts = Object.fromEntries(pipeline.map(item => [item.key, songs.filter(song => songPipelineKey(song) === item.key).length])) as Record<PipelineKey, number>;
    return {
      total: songs.length,
      released: songs.filter(song => song.is_released).length,
      needsAttention: songs.filter(song => song.linkedTask?.due_at && song.linkedTask.due_at < today).length,
      stageCounts,
    };
  }, [songs, today]);

  const visible = useMemo(() => songs.filter(song => {
    const collabReady = song.ready_for_collab === true;
    const attention = !!song.linkedTask?.due_at && song.linkedTask.due_at < today;
    let matches = true;
    if (statusFilter === "released") matches = song.is_released;
    else if (statusFilter === "unreleased") matches = !song.is_released;
    else if (statusFilter === "in_progress") matches = songPipelineKey(song) === "progress";
    else if (statusFilter === "ready_for_collab") matches = collabReady;
    else if (statusFilter === "video_needed") matches = hasVideoOpportunity(song);
    else if (statusFilter === "active_outreach") matches = (song.activeOutreachCount || 0) > 0;
    else if (statusFilter === "needs_attention") matches = attention;
    else if (statusFilter.startsWith("stage:")) matches = songPipelineKey(song) === statusFilter.slice(6);
    if (!matches) return false;
    if (columnFilter) {
      const hasNextStep = !!song.next_action?.trim() || !!song.linkedTask;
      const progressKeys = ["write", "record", "mix", "cover_art", "spotify_canvas", "sky", "chxndler_card", "karaoke", "music_video"];
      const done = progressKeys.filter(key => song.production_stages?.[key] === true).length;
      if (columnFilter.key === "song" && !song.title.toLowerCase().includes(columnFilter.value.toLowerCase())) return false;
      if (columnFilter.key === "status" && columnFilter.value !== "all" && String(song.is_released) !== columnFilter.value) return false;
      if (columnFilter.key === "production" && columnFilter.value !== "all" && songPipelineKey(song) !== columnFilter.value) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "started" && done === 0) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "complete" && done < progressKeys.length) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "not_started" && done > 0) return false;
      if (columnFilter.key === "collaboration" && columnFilter.value !== "all" && String(collabReady) !== columnFilter.value) return false;
      if (columnFilter.key === "opportunities" && columnFilter.value !== "all" && (columnFilter.value === "video" ? !hasVideoOpportunity(song) : !(song.activeOutreachCount || 0))) return false;
      if (columnFilter.key === "next" && columnFilter.value !== "all" && String(hasNextStep) !== columnFilter.value) return false;
    }
    return true;
  }), [songs, statusFilter, today, columnFilter]);

  const sorted = useMemo(() => [...visible].sort((a, b) => {
    return (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
  }), [visible]);

  async function updateStage(song: SongRow, workflow_stage: string) {
    const previous = { workflow_stage: song.workflow_stage, production_tracking_started: song.production_tracking_started };
    setSongs(rows => rows.map(row => row.id === song.id ? { ...row, workflow_stage, production_tracking_started: true } : row));
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, workflow_stage }) });
    if (!response.ok) {
      setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ...previous } : row));
      const data = await response.json(); setError(data.error || "Unable to save production stage.");
    }
  }

  async function toggleCollaboration(song: SongRow) {
    const ready_for_collab = song.ready_for_collab !== true;
    setError("");
    setSavingCollabId(song.id);
    setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ready_for_collab } : row));
    try {
      const response = await fetch("/api/admin/song-tracker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ songId: song.id, ready_for_collab }),
      });
      if (!response.ok) {
        const data = await response.json();
        setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ready_for_collab: song.ready_for_collab } : row));
        setError(data.error || "Unable to update collaboration status.");
      }
    } catch {
      setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ready_for_collab: song.ready_for_collab } : row));
      setError("Unable to update collaboration status.");
    } finally {
      setSavingCollabId(current => current === song.id ? null : current);
    }
  }

  async function saveNextAction(song: SongRow) {
    const next_action = actionDraft.trim().slice(0, 240);
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, next_action }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to save next step."); return; }
    setSongs(rows => rows.map(row => row.id === song.id ? { ...row, next_action, next_action_manual: !!next_action, linkedTask: next_action ? null : row.linkedTask } : row));
    setEditingActionId(null);
    if (!next_action) await load();
  }

  async function createSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setError("");
    const response = await fetch("/api/admin/song-tracker", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
    const data = await response.json(); setCreating(false);
    if (!response.ok) { setError(data.error || "Unable to add this song."); return; }
    window.location.href = `/admin/songs/${data.song.id}`;
  }

  function clearFilters() {
    setStatusFilter("all");
    setColumnFilter(null); setSongFilterText("");
  }

  function filterHeader(key: string, label: string, choices: Array<{ value: string; label: string }>) {
    const active = columnFilter?.key === key;
    const currentValue = columnFilter?.key === key ? columnFilter.value : "";
    return <div className="relative"><button type="button" aria-expanded={columnMenu === key} onClick={() => setColumnMenu(current => current === key ? null : key)} className="text-left hover:text-white">{label}{active ? ` · ${key === "song" ? currentValue : choices.find(choice => choice.value === currentValue)?.label || currentValue}` : ""}⌄</button>{columnMenu === key && <div className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-48 overflow-auto rounded-lg border border-white/10 bg-[#17171c] p-1 normal-case tracking-normal shadow-xl">{key === "song" ? <><button type="button" onClick={() => { setSongFilterText(""); setColumnFilter(null); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/60 hover:bg-white/10">Clear</button><input autoFocus type="search" value={songFilterText} onChange={event => { setSongFilterText(event.target.value); setColumnFilter(event.target.value ? {key, value:event.target.value} : null); }} placeholder="Type a song title…" className="w-full rounded px-3 py-2 text-xs text-white outline-none placeholder:text-white/40"/></> : <button type="button" onClick={() => { setColumnFilter(null); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/60 hover:bg-white/10">All</button>}{key !== "song" && choices.map(choice=><button key={choice.value} type="button" onClick={() => { setColumnFilter({key,value:choice.value}); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/75 hover:bg-white/10">{choice.label}</button>)}</div>}</div>;
  }

  return <section className="song-portfolio">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Songs</h1><p className="mt-1 text-sm text-white/45">Your music universe · {loading ? "—" : counts.total} songs</p></div>
      <button type="button" onClick={() => setAdding(value => !value)} className="rounded-xl bg-[#FD52AF] px-4 py-3 text-sm font-extrabold text-[#170d14] shadow-[0_8px_28px_rgba(253,82,175,.16)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{adding ? "Cancel" : "+ Add Song"}</button>
    </header>

    <section aria-label="Song portfolio snapshot" className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      {([
        ["all", "Total Songs", counts.total, "#FD52AF"],
        ["released", "Released", counts.released, "#55D6A4"],
        ["needs_attention", "Needs Attention", counts.needsAttention, "#F2B84B"],
      ] as const).map(([key, label, count, accent]) => <button key={key} type="button" onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key} className={`rounded-xl border bg-[#111116] px-3 py-3 text-left transition hover:-translate-y-px hover:border-white/20 sm:px-4 ${statusFilter === key ? "border-white/25 shadow-[0_0_24px_rgba(253,82,175,.07)]" : "border-white/[.08]"}`}>
        <span className="block truncate text-[.65rem] font-semibold text-white/45 sm:text-xs">{label}</span><span className="mt-1 block text-xl font-black tabular-nums sm:text-2xl" style={{ color: accent }}>{loading ? "—" : count}</span>
      </button>)}
    </section>

    <section aria-label="Song Pipeline" className="mb-5 rounded-2xl border border-white/[.08] bg-[#101014] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-white">Song Pipeline</h2><p className="mt-0.5 text-xs text-white/40">Production stage across the full catalog</p></div><span className="text-[.65rem] uppercase tracking-[.14em] text-white/30">{counts.total} total</span></div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[.055]" role="group" aria-label={pipeline.map(item => `${item.label}: ${counts.stageCounts[item.key]}`).join(", ")}>
        {pipeline.map(item => <button key={item.key} type="button" title={`${item.label}: ${counts.stageCounts[item.key]} songs · ${counts.total ? Math.round(counts.stageCounts[item.key] / counts.total * 100) : 0}%`} aria-label={`Filter ${item.label}: ${counts.stageCounts[item.key]} songs, ${counts.total ? Math.round(counts.stageCounts[item.key] / counts.total * 100) : 0}%`} onClick={() => setStatusFilter(`stage:${item.key}`)} className="h-full min-w-0 transition-[width,opacity,filter] duration-500 hover:brightness-125 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ width: counts.total ? `${counts.stageCounts[item.key] / counts.total * 100}%` : "0%", backgroundColor: item.color, opacity: statusFilter === `stage:${item.key}` ? 1 : .8 }} />)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6">
        {pipeline.map(item => <button key={item.key} type="button" onClick={() => setStatusFilter(`stage:${item.key}`)} aria-pressed={statusFilter === `stage:${item.key}`} className={`inline-flex items-center gap-2 text-left text-xs transition hover:text-white ${statusFilter === `stage:${item.key}` ? "text-white" : "text-white/55"}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}/><span>{item.label}</span><span className="tabular-nums text-white/75">{loading ? "—" : counts.stageCounts[item.key]}</span></button>)}
      </div>
      <p className="sr-only" aria-live="polite">{pipeline.map(item => `${item.label}: ${counts.stageCounts[item.key]}`).join(". ")}</p>
    </section>

    {adding && <form onSubmit={createSong} className="mb-4 grid gap-3 rounded-2xl border border-[#FD52AF]/20 bg-[#111116] p-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-sm font-medium text-white/75">Song title<input autoFocus required maxLength={120} value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Name your song" className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white placeholder:text-white/30"/></label><button disabled={creating} className="rounded-xl bg-[#FD52AF] px-5 py-3 font-bold text-black disabled:opacity-60">{creating ? "Creating…" : "Create workspace"}</button></form>}

    {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[.05] p-3 text-sm text-red-200">{error}</p>}
    {loading ? <div className="rounded-2xl border border-white/[.08] bg-[#101014] p-8 text-center text-sm text-white/45">Loading your songs…</div> : !sorted.length ? <div className="rounded-2xl border border-dashed border-white/[.14] bg-[#101014]/60 p-10 text-center"><p className="font-semibold text-white/75">{songs.length ? "No songs match these filters." : "Your music universe is ready."}</p><p className="mt-1 text-sm text-white/40">{songs.length ? "Try a different search or clear the filters." : "Add your first song to create a workspace."}</p>{songs.length > 0 && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#FD52AF]">Clear filters</button>}</div> : <div className="overflow-visible rounded-2xl border border-white/[.08] bg-[#101014]">
      <div className="grid min-w-[1040px] grid-cols-[minmax(12rem,1.3fr)_minmax(6rem,.65fr)_minmax(7rem,.75fr)_minmax(6rem,.55fr)_minmax(8rem,.75fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] gap-4 border-b border-white/[.07] px-5 py-3 text-[.65rem] font-bold uppercase tracking-[.13em] text-white/35">{filterHeader("song", "Song", [])}{filterHeader("status", "Status", [{value:"false",label:"Unreleased"},{value:"true",label:"Released"}])}{filterHeader("production", "Production", pipeline.map(item=>({value:item.key,label:item.label})))}{filterHeader("progress", "Progress", [{value:"not_started",label:"Not started"},{value:"started",label:"In progress"},{value:"complete",label:"Complete"}])}{filterHeader("collaboration", "Open for Collaboration", [{value:"true",label:"Yes"},{value:"false",label:"No"}])}{filterHeader("opportunities", "Opportunities", [{value:"video",label:"Video Needed"},{value:"outreach",label:"Active Outreach"}])}{filterHeader("next", "Next Step", [{value:"true",label:"Has a next step"},{value:"false",label:"No next step"}])}</div>
      {sorted.map(song => {
        const category = songPipelineKey(song), stageColor = pipeline.find(item => item.key === category)?.color || "#777783";
        const collabReady = song.ready_for_collab === true;
        const videoNeeded = hasVideoOpportunity(song), hasOutreach = (song.activeOutreachCount || 0) > 0;
        const badges = [videoNeeded ? { label: "Video Needed", href: `/admin/songs/${song.id}?tab=Video`, color: "blue" } : null,
          hasOutreach ? { label: "Active Outreach", href: `/admin?view=outreach&song=${song.id}`, color: "green" } : null].filter(Boolean) as Array<{label:string;href:string;color:string}>;
        const nextAction = song.next_action?.trim();
        const task = song.linkedTask && !generatedProfileTask(song.linkedTask.title) ? song.linkedTask : null;
        const progressCount = ["write", "record", "mix", "cover_art", "spotify_canvas", "sky", "chxndler_card", "karaoke", "music_video"].filter(key => song.production_stages?.[key] === true).length;
        return <article key={song.id} className="grid gap-3 border-b border-white/[.06] p-3 transition-colors last:border-0 hover:bg-white/[.015] sm:p-4 lg:grid-cols-[minmax(12rem,1.3fr)_minmax(6rem,.65fr)_minmax(7rem,.75fr)_minmax(6rem,.55fr)_minmax(8rem,.75fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] lg:items-center lg:gap-4 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => void openSongInfo(song)} aria-label={`Show ${song.title} information`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[.09] bg-gradient-to-br from-[#271323] to-[#111116] shadow-[0_4px_20px_rgba(0,0,0,.25)] sm:h-16 sm:w-16"><span className="grid h-full w-full place-items-center px-1 text-center text-[.48rem] font-black tracking-[.1em] text-[#FD52AF]/65">CHXNDLER</span><img src={song.brand_cover_path ? getBrandArtUrl(song.brand_cover_path) || songCoverPath(song.slug, song.title) : songCoverPath(song.slug, song.title)} alt="" onError={event => { if (song.brand_cover_path && !event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "1"; event.currentTarget.src = songCoverPath(song.slug, song.title); } else event.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"/></button>
            <div className="min-w-0"><button type="button" onClick={() => void openSongInfo(song)} className="block truncate text-left text-sm font-bold text-white transition hover:text-[#ff8bc4]">{song.title}</button><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[.62rem] font-semibold ${song.is_released ? "bg-emerald-300/[.08] text-emerald-200" : "bg-white/[.055] text-white/45"}`}>{song.is_released ? "Released" : "Unreleased"}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/55 lg:block"><span className="text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Status · </span>{song.is_released ? "Released" : "Unreleased"}</div>
          <label className="flex items-center gap-2 lg:block"><span className="text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Production</span><span className="hidden h-1.5 w-1.5 rounded-full lg:mr-2 lg:inline-block" style={{ backgroundColor: stageColor }}/><select aria-label={`Production stage for ${song.title}`} value={workflowStageValue(song)} onChange={event => { if (!event.target.value.startsWith("__")) void updateStage(song, event.target.value); }} className="max-w-full rounded-lg border border-white/[.09] bg-[#17171c] px-2.5 py-2 text-xs text-white outline-none transition focus:border-[#FD52AF]/45"><option value="__not_set" disabled>Not Set</option><option value="__audio_progress" disabled>In Progress</option><option value="__audio_final" disabled>Final</option>{productionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="text-xs text-white/55"><span className="text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Progress · </span>{progressCount}/9</div>
          <div className="flex items-center justify-between gap-2 lg:justify-start"><span className="text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Open for Collaboration</span><button type="button" role="switch" aria-checked={collabReady} aria-label={`${song.title}: open for collaboration ${collabReady ? "yes" : "no"}. Click to ${collabReady ? "close" : "open"}.`} disabled={savingCollabId === song.id} onClick={() => void toggleCollaboration(song)} className={`min-w-16 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${collabReady ? "border-[#FD52AF]/30 bg-[#FD52AF]/[.09] text-[#ffb2d8]" : "border-white/[.1] bg-white/[.035] text-white/45 hover:border-white/20 hover:text-white/75"}`}>{savingCollabId === song.id ? "Saving…" : collabReady ? "Yes" : "No"}</button></div>
          <div className="flex min-h-8 flex-wrap items-center gap-1.5"><span className="w-full text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Opportunities</span>{badges.length ? <>{badges.slice(0, 2).map(badge => <Link key={badge.label} href={badge.href} className={`rounded-full border px-2.5 py-1 text-[.62rem] font-semibold transition hover:brightness-125 ${badge.color === "pink" ? "border-[#FD52AF]/20 bg-[#FD52AF]/[.07] text-[#ffb2d8]" : badge.color === "blue" ? "border-sky-300/20 bg-sky-300/[.06] text-sky-200" : "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200"}`}>{badge.label}</Link>)}{badges.length > 2 && <span title={badges.slice(2).map(item => item.label).join(", ")} className="rounded-full bg-white/[.06] px-2 py-1 text-[.62rem] text-white/45">+{badges.length - 2}</span>}</> : <span className="text-xs text-white/30">No active opportunities</span>}</div>
          <div className="flex min-w-0 items-center gap-2"><span className="w-full text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Next Step</span>{editingActionId === song.id ? <div className="flex min-w-0 flex-1 gap-1.5"><input autoFocus value={actionDraft} onChange={event => setActionDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void saveNextAction(song); } if (event.key === "Escape") setEditingActionId(null); }} maxLength={240} placeholder="Add a next step" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-white outline-none focus:border-[#FD52AF]/50"/><button type="button" onClick={() => void saveNextAction(song)} className="rounded-lg px-2 text-xs font-bold text-[#FD52AF]">Save</button></div> : nextAction ? <button type="button" onClick={() => { setEditingActionId(song.id); setActionDraft(nextAction); }} className="min-w-0 flex-1 truncate text-left text-xs text-white/65 hover:text-white" title="Edit saved next step">{nextAction}</button> : task ? <Link href={`/admin?view=tasks&task=${task.id}`} className="min-w-0 flex-1 truncate text-xs text-white/65 hover:text-[#ff8bc4]" title="Open linked task">{task.title}</Link> : <button type="button" onClick={() => { setEditingActionId(song.id); setActionDraft(""); }} className="min-w-0 flex-1 text-left text-xs text-white/35 transition hover:text-[#ff8bc4]">+ Add next step</button>}</div>
        </article>;
      })}
    </div>}

    {songInfo && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-2 sm:p-5" onClick={() => setSongInfo(null)}><section role="dialog" aria-modal="true" aria-label={`${songInfo.song.title} full song workspace`} onClick={event => event.stopPropagation()} className="flex h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#09090c] shadow-2xl"><header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111116] px-4 py-2"><h2 className="min-w-0 flex-1 truncate text-sm font-bold text-white">{songInfo.song.title} · Song Workspace</h2><button type="button" onClick={() => setSongInfo(null)} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10">Close</button></header><iframe title={`${songInfo.song.title} full song workspace`} src={`/admin/songs/${songInfo.song.id}?embed=1`} className="min-h-0 w-full flex-1 border-0 bg-[#09090c]"/></section></div>}

    <style jsx>{`
      .song-portfolio button,.song-portfolio a,.song-portfolio select,.song-portfolio input{ -webkit-tap-highlight-color:transparent }
      @media (prefers-reduced-motion:reduce){.song-portfolio *{scroll-behavior:auto!important;transition-duration:0.01ms!important;animation-duration:0.01ms!important}}
    `}</style>
  </section>;
}
