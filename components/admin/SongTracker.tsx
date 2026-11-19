"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import { songPipelineKey, type SongPipelineKey } from "@/lib/songWorkflow";
import SongProductionProgress, { ProductionStageIcon } from "@/components/admin/SongProductionProgress";
import SongWorkspace from "@/components/admin/SongWorkspace";

type PipelineKey = SongPipelineKey | "complete";
type OpportunityIconKind = "video" | "playlist" | "sync" | "content" | "spotify" | "sky" | "card";
type FilterKey = "all" | "released" | "unreleased" | "in_progress" | "ready_for_collab" | "video_needed" | "active_outreach" | "needs_attention" | `stage:${PipelineKey}`;
type LinkedTask = { id: string; title: string; status: string; priority: string; due_at: string | null };
type SongRow = {
  id: string; title: string; slug: string; is_released: boolean; release_date?: string | null;
  updated_at?: string | null; created_at?: string | null; audio_status?: string | null;
  collaboration_opportunities: string[]; video_concept?: string; collaboration_enabled?: boolean;
  production_stages?: Record<string, boolean> | null; production_tracking_started?: boolean; production_progress_verified?: boolean;
  ready_for_collab?: boolean; workflow_stage?: string | null; next_action?: string | null;
  next_action_manual?: boolean; activeOutreachCount?: number; linkedTask?: LinkedTask | null;
  postRelease?: { playlistPitched: boolean; syncPlacement: boolean; spotifyCanvas: boolean; sky: boolean; chxndlerCard: boolean; musicVideo: boolean; contentReleased: boolean };
  sky_video_url?: string | null; youtube_music_video_url?: string | null;
  brand_cover_path?: string | null;
  musicVideo?: null | { id: string; status: string; visibility: string; next_action: string; assigned_videographer?: { name?: string; email?: string }; public_concept?: string; public_status?: string; collaboration_stage?: string };
  requests?: Array<{ id: string; status: string; submitted_at: string; contribution_type: string }>;
};

function productionCategory(song: SongRow): PipelineKey {
  const stage = songPipelineKey(song);
  const milestones = song.production_stages || {};
  if (song.is_released || milestones.mixed === true || milestones.mix === true || stage === "mastering") return "complete";
  if (milestones.recorded === true || milestones.record === true || stage === "mixing") return "mixing";
  if (milestones.lyrics === true || milestones.write === true || stage === "recording") return "recording";
  if (stage === "writing" || stage === "idea") return stage;
  return "unset";
}

function matchesProductionFilter(song: SongRow, value: string) {
  const milestones = song.production_stages || {};
  if (value === "wrote") return milestones.lyrics === true || milestones.write === true;
  if (value === "recorded") return milestones.recorded === true || milestones.record === true;
  if (value === "mixed") return song.is_released || milestones.mixed === true || milestones.mix === true;
  return productionCategory(song) === value;
}

function completedTrackerMilestones(song: SongRow) {
  const stages = song.production_stages || {};
  return [stages.lyrics === true || stages.write === true, stages.recorded === true || stages.record === true, stages.mixed === true || stages.mix === true].filter(Boolean).length;
}

const pipeline = [
  { key: "idea", label: "Idea", color: "#FD52AF" },
  { key: "writing", label: "Writing", color: "#A78BFA" },
  { key: "recording", label: "Recording", color: "#42B8E8" },
  { key: "mixing", label: "Mixing", color: "#F2B84B" },
  { key: "complete", label: "Complete", color: "#55D6A4" },
  { key: "unset", label: "Not Set", color: "#777783" },
] as const;
function OpportunityIcon({ kind, className = "h-3.5 w-3.5" }: { kind: OpportunityIconKind; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${className} shrink-0`}>
    {kind === "video" ? <><rect x="2" y="4" width="11" height="12" rx="2"/><path d="m13 8 5-3v10l-5-3"/></>
      : kind === "playlist" ? <><path d="M11 3v10.5a2.5 2.5 0 1 1-1.5-2.3V5l7-1.5v8a2.5 2.5 0 1 1-1.5-2.3V2.7L11 3Z"/><path d="M3 5h4M3 8h3"/></>
      : kind === "sync" ? <><path d="M4 7.5 7 5l3 2.5-3 2.5-3-2.5ZM10 7.5 13 5l3 2.5-3 2.5-3-2.5Z"/><path d="m7 10 2 2 2-2M9 12v3M5 15h8"/></>
      : kind === "content" ? <><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4M17 7h1.5v10.5H8V17"/></>
      : kind === "spotify" ? <><circle cx="10" cy="10" r="8.1"/><path d="M5.5 7.7c3.1-.9 6.5-.6 9.2.9M6.2 10.3c2.6-.7 5.5-.4 7.8.8M6.9 12.8c2-.5 4.2-.3 6 .5"/></>
      : kind === "sky" ? <><path d="M5 16h9a3 3 0 0 0 .4-6 5 5 0 0 0-9.6 1.3A2.4 2.4 0 0 0 5 16Z"/><path d="M5 5V3M2.5 7 1 6M9 5l1.5-1"/></>
      : <><rect x="3" y="2.5" width="14" height="17" rx="2"/><circle cx="10" cy="8" r="2.2"/><path d="M6 15c.7-2 2-3 4-3s3.3 1 4 3M14.5 5.5h1"/></>}
  </svg>;
}

function PostReleaseIcons({ song, onToggle }: { song: SongRow; onToggle: (key: keyof NonNullable<SongRow["postRelease"]>, done: boolean) => void }) {
  const items: Array<{ kind: OpportunityIconKind; key: keyof NonNullable<SongRow["postRelease"]>; label: string; color: string; done: boolean }> = [
    { kind: "spotify", key: "spotifyCanvas", label: "Spotify Canvas", color: "#1ED760", done: song.postRelease?.spotifyCanvas === true },
    { kind: "sky", key: "sky", label: "Sky", color: "#42B8E8", done: song.postRelease?.sky === true },
    { kind: "card", key: "chxndlerCard", label: "CHXNDLER Card", color: "#A78BFA", done: song.postRelease?.chxndlerCard === true },
    { kind: "video", key: "musicVideo", label: "Music video", color: "#FB7185", done: song.postRelease?.musicVideo === true },
    { kind: "content", key: "contentReleased", label: "Content released", color: "#60A5FA", done: song.postRelease?.contentReleased === true },
    { kind: "playlist", key: "playlistPitched", label: "Playlist pitched", color: "#FD52AF", done: song.postRelease?.playlistPitched === true },
    { kind: "sync", key: "syncPlacement", label: "Sync placement", color: "#F2B84B", done: song.postRelease?.syncPlacement === true },
  ];
  return <div className="flex items-center gap-2.5" aria-label={`Post release: ${items.map(item => `${item.label} ${item.done ? "complete" : "not set"}`).join(", ")}`}>
    {items.map(item => <button key={item.kind} type="button" title={`${item.label} · ${item.done ? "On" : "Off"} (click to toggle)`} aria-label={`${item.label} ${item.done ? "on" : "off"}. Click to toggle.`} aria-pressed={item.done} onClick={() => onToggle(item.key, !item.done)} className="rounded-md p-0.5 transition hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ color: item.color, opacity: item.done ? 1 : .38 }}><OpportunityIcon kind={item.kind} className="h-7 w-7"/></button>)}
  </div>;
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
  const [songInfo, setSongInfo] = useState<SongRow | null>(null);

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
    setSongInfo(song);
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
  const visible = useMemo(() => songs.filter(song => {
    const collabReady = song.ready_for_collab === true;
    const attention = !!song.linkedTask?.due_at && song.linkedTask.due_at < today;
    let matches = true;
    if (statusFilter === "released") matches = song.is_released;
    else if (statusFilter === "unreleased") matches = !song.is_released;
    else if (statusFilter === "in_progress") matches = ["writing", "recording", "mixing"].includes(productionCategory(song));
    else if (statusFilter === "ready_for_collab") matches = collabReady;
    else if (statusFilter === "video_needed") matches = hasVideoOpportunity(song);
    else if (statusFilter === "active_outreach") matches = (song.activeOutreachCount || 0) > 0;
    else if (statusFilter === "needs_attention") matches = attention;
    else if (statusFilter.startsWith("stage:")) matches = productionCategory(song) === statusFilter.slice(6);
    if (!matches) return false;
    if (columnFilter) {
      const done = completedTrackerMilestones(song);
      const verified = song.production_progress_verified === true;
      if (columnFilter.key === "song" && !song.title.toLowerCase().includes(columnFilter.value.toLowerCase())) return false;
      if (columnFilter.key === "status" && columnFilter.value !== "all" && String(song.is_released) !== columnFilter.value) return false;
      if (columnFilter.key === "production" && columnFilter.value !== "all" && !matchesProductionFilter(song, columnFilter.value)) return false;
      if (columnFilter.key === "postRelease" && columnFilter.value !== "all" && song.postRelease?.[columnFilter.value as keyof NonNullable<SongRow["postRelease"]>] !== true) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "started" && (!verified || done === 0 || done === 3)) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "complete" && (!verified || done < 3)) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "not_started" && (!verified || done > 0)) return false;
      if (columnFilter.key === "progress" && columnFilter.value === "unknown" && verified) return false;
      if (columnFilter.key === "collaboration" && columnFilter.value !== "all" && String(collabReady) !== columnFilter.value) return false;
      if (columnFilter.key === "opportunities" && columnFilter.value !== "all" && (columnFilter.value === "video" ? !hasVideoOpportunity(song) : !(song.activeOutreachCount || 0))) return false;
    }
    return true;
  }), [songs, statusFilter, today, columnFilter]);

  const sorted = useMemo(() => [...visible].sort((a, b) => {
    return (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
  }), [visible]);

  function saveProductionProgress(song: SongRow, updated: Partial<SongRow>) {
    setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ...updated } : row));
    setSongInfo(current => current?.id === song.id ? { ...current, ...updated } : current);
  }

  async function togglePostRelease(song: SongRow, key: keyof NonNullable<SongRow["postRelease"]>, value: boolean) {
    const stageByKey: Record<keyof NonNullable<SongRow["postRelease"]>, string> = { playlistPitched: "playlist_pitch", syncPlacement: "sync_placement", spotifyCanvas: "spotify_canvas", sky: "sky", chxndlerCard: "chxndler_card", musicVideo: "music_video_released", contentReleased: "content_released" };
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, stage: stageByKey[key], complete: value }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || `Unable to update ${key}.`); return; }
    const updated = { ...song, production_stages: { ...(song.production_stages || {}), [stageByKey[key]]: value }, postRelease: { ...(song.postRelease || { playlistPitched: false, syncPlacement: false, spotifyCanvas: false, sky: false, chxndlerCard: false, musicVideo: false, contentReleased: false }), [key]: value } };
    saveProductionProgress(song, updated);
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

  function filterByProductionStage(stage: string | "all") {
    setStatusFilter("all");
    setColumnFilter(stage === "all" ? null : { key: "production", value: stage });
    setSongFilterText("");
  }

  function filterHeader(key: string, label: string, choices: Array<{ value: string; label: string }>) {
    const active = columnFilter?.key === key;
    const currentValue = columnFilter?.key === key ? columnFilter.value : "";
    return <div className="relative"><button type="button" aria-expanded={columnMenu === key} onClick={() => setColumnMenu(current => current === key ? null : key)} className="text-left hover:text-white">{label}{active ? ` · ${key === "song" ? currentValue : choices.find(choice => choice.value === currentValue)?.label || currentValue}` : ""}⌄</button>{columnMenu === key && <div className="absolute left-0 top-full z-30 mt-2 max-h-64 min-w-48 overflow-auto rounded-lg border border-white/10 bg-[#17171c] p-1 normal-case tracking-normal shadow-xl">{key === "song" ? <><button type="button" onClick={() => { setSongFilterText(""); setColumnFilter(null); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/60 hover:bg-white/10">Clear</button><input autoFocus type="search" value={songFilterText} onChange={event => { setSongFilterText(event.target.value); setColumnFilter(event.target.value ? {key, value:event.target.value} : null); }} placeholder="Type a song title…" className="w-full appearance-none rounded border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs text-white outline-none placeholder:text-white/40 [color-scheme:dark] focus:border-[#FD52AF]/50"/></> : <button type="button" onClick={() => { setColumnFilter(null); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/60 hover:bg-white/10">All</button>}{key !== "song" && choices.map(choice=><button key={choice.value} type="button" onClick={() => { setColumnFilter({key,value:choice.value}); setColumnMenu(null); }} className="block w-full rounded px-3 py-2 text-left text-xs text-white/75 hover:bg-white/10">{choice.label}</button>)}</div>}</div>;
  }

  return <section className="song-portfolio">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Songs</h1><p className="mt-1 text-sm text-white/45">Your music universe · {loading ? "—" : songs.length} songs</p></div>
      <button type="button" onClick={() => setAdding(value => !value)} className="rounded-xl bg-[#FD52AF] px-4 py-3 text-sm font-extrabold text-[#170d14] shadow-[0_8px_28px_rgba(253,82,175,.16)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{adding ? "Cancel" : "+ Add Song"}</button>
    </header>

    <section aria-label="Songs by production stage" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {[{ key: "all", label: "All songs", color: "#E8E8EF", count: songs.length },
        { key: "wrote", label: "Wrote", color: "#A78BFA", count: songs.filter(song => matchesProductionFilter(song, "wrote")).length },
        { key: "recorded", label: "Recorded", color: "#42B8E8", count: songs.filter(song => matchesProductionFilter(song, "recorded")).length },
        { key: "mixed", label: "Mixed", color: "#F2B84B", count: songs.filter(song => matchesProductionFilter(song, "mixed")).length },
        { key: "unset", label: "Not Set", color: "#777783", count: songs.filter(song => productionCategory(song) === "unset").length }].map(item => {
        const active = item.key === "all" ? !columnFilter || columnFilter.key !== "production" : columnFilter?.key === "production" && columnFilter.value === item.key;
        const stage: "Writing" | "Recording" | "Mixing" | null = item.key === "wrote" ? "Writing" : item.key === "recorded" ? "Recording" : item.key === "mixed" ? "Mixing" : null;
        return <button key={item.key} type="button" aria-pressed={active} onClick={() => filterByProductionStage(item.key)} className={`group relative overflow-hidden rounded-xl border px-3 py-3 text-left transition hover:-translate-y-px hover:bg-white/[.045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${active ? "border-white/20 bg-white/[.055]" : "border-white/[.08] bg-[#101014]"}`}>
          <span className="absolute inset-x-0 top-0 h-0.5 opacity-80" style={{ backgroundColor: item.color }}/>
          <span className="flex flex-col items-start gap-1.5">{item.key === "all" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 shrink-0"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> : item.key === "complete" ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 shrink-0"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg> : <ProductionStageIcon stage={stage} className="h-7 w-7"/>}<span className="truncate text-[.68rem] font-semibold" style={{ color: item.color }}>{item.label}</span></span>
          <span className="mt-1 block text-xl font-black tabular-nums" style={{ color: item.color }}>{loading ? "—" : item.count}</span>
        </button>;
      })}
    </section>

    {adding && <form onSubmit={createSong} className="mb-4 grid gap-3 rounded-2xl border border-[#FD52AF]/20 bg-[#111116] p-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-sm font-medium text-white/75">Song title<input autoFocus required maxLength={120} value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Name your song" className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white placeholder:text-white/30"/></label><button disabled={creating} className="rounded-xl bg-[#FD52AF] px-5 py-3 font-bold text-black disabled:opacity-60">{creating ? "Creating…" : "Create workspace"}</button></form>}

    {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[.05] p-3 text-sm text-red-200">{error}</p>}
    {loading ? <div className="rounded-2xl border border-white/[.08] bg-[#101014] p-8 text-center text-sm text-white/45">Loading your songs…</div> : !sorted.length ? <div className="rounded-2xl border border-dashed border-white/[.14] bg-[#101014]/60 p-10 text-center"><p className="font-semibold text-white/75">{songs.length ? "No songs match these filters." : "Your music universe is ready."}</p><p className="mt-1 text-sm text-white/40">{songs.length ? "Try a different search or clear the filters." : "Add your first song to create a workspace."}</p>{songs.length > 0 && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#FD52AF]">Clear filters</button>}</div> : <div className="overflow-visible rounded-2xl border border-white/[.08] bg-[#101014]">
      <div className="hidden border-b border-white/[.07] px-5 py-3 text-[.65rem] font-bold uppercase tracking-[.13em] text-white/35 lg:grid lg:grid-cols-[minmax(14rem,1.2fr)_minmax(14rem,1.1fr)_minmax(15rem,1.2fr)_minmax(13rem,1fr)] lg:gap-5">{filterHeader("song", "Song", [])}{filterHeader("production", "Production", [{value:"wrote",label:"Wrote"},{value:"recorded",label:"Recorded"},{value:"mixed",label:"Mixed"},{value:"unset",label:"Not Set"}])}{filterHeader("postRelease", "Post Release", [{value:"spotifyCanvas",label:"Spotify Canvas"},{value:"sky",label:"Sky"},{value:"chxndlerCard",label:"CHXNDLER Card"},{value:"musicVideo",label:"Music Video"},{value:"contentReleased",label:"Content Release"},{value:"playlistPitched",label:"Playlist Pitched"},{value:"syncPlacement",label:"Sync Placement"}])}{filterHeader("opportunities", "Opportunities", [{value:"video",label:"Video Work"},{value:"outreach",label:"Active Outreach"}])}</div>
      {sorted.map(song => {
        const collabReady = song.ready_for_collab === true, hasVideoWork = !!song.musicVideo || hasVideoOpportunity(song), hasOutreach = (song.activeOutreachCount || 0) > 0;
        const requestCount = song.requests?.filter(request => !["declined", "cancelled", "closed"].includes(request.status.toLowerCase())).length || 0;
        const badges = [collabReady || requestCount ? { label: requestCount ? `Collab · ${requestCount}` : "Collab Open", href: `/admin/songs/${song.id}?tab=Collabs`, color: "pink", icon: null } : null,
          hasVideoWork ? { label: song.musicVideo ? "Video Work" : "Video Needed", href: song.musicVideo ? `/admin/music-videos/${song.musicVideo.id}` : `/admin/songs/${song.id}?tab=Overview`, color: "blue", icon: "video" as const } : null,
          hasOutreach ? { label: `Outreach · ${song.activeOutreachCount}`, href: `/admin?view=outreach&song=${song.id}`, color: "green", icon: null } : null].filter(Boolean) as Array<{label:string;href:string;color:string;icon:OpportunityIconKind|null}>;
        return <article key={song.id} className="grid gap-3 border-b border-white/[.06] p-3 transition-colors last:border-0 hover:bg-white/[.015] sm:p-4 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(14rem,1.1fr)_minmax(15rem,1.2fr)_minmax(13rem,1fr)] lg:items-center lg:gap-5 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => void openSongInfo(song)} aria-label={`Show ${song.title} information`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[.09] bg-gradient-to-br from-[#271323] to-[#111116] shadow-[0_4px_20px_rgba(0,0,0,.25)] sm:h-16 sm:w-16"><span className="grid h-full w-full place-items-center px-1 text-center text-[.48rem] font-black tracking-[.1em] text-[#FD52AF]/65">CHXNDLER</span><img src={song.brand_cover_path ? getBrandArtUrl(song.brand_cover_path) || songCoverPath(song.slug, song.title) : songCoverPath(song.slug, song.title)} alt="" onError={event => { if (song.brand_cover_path && !event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "1"; event.currentTarget.src = songCoverPath(song.slug, song.title); } else event.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"/></button>
            <div className="min-w-0"><button type="button" onClick={() => void openSongInfo(song)} className="block truncate text-left text-sm font-bold text-white transition hover:text-[#ff8bc4]">{song.title}</button><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[.62rem] font-semibold ${song.is_released ? "bg-emerald-300/[.08] text-emerald-200" : "bg-white/[.055] text-white/45"}`}>{song.is_released ? "Released" : "Unreleased"}</span></div>
          </div>
          <div className="min-w-0"><span className="mb-1 block text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Workflow Progress</span><SongProductionProgress song={song} onSaved={updated => saveProductionProgress(song, updated)} compact/></div>
          <div className="min-w-0"><span className="mb-1 block text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Post Release</span><PostReleaseIcons song={song} onToggle={(key, value) => void togglePostRelease(song, key, value)}/></div>
          <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5"><span className="w-full text-[.62rem] font-semibold uppercase tracking-wider text-white/35 lg:hidden">Opportunities</span>{badges.length ? badges.map(badge => <Link key={badge.label} href={badge.href} aria-label={badge.label} title={badge.label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.62rem] font-semibold transition hover:brightness-125 ${badge.color === "pink" ? "border-[#FD52AF]/20 bg-[#FD52AF]/[.07] text-[#ffb2d8]" : badge.color === "blue" ? "border-sky-300/20 bg-sky-300/[.06] text-sky-200" : "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200"}`}>{badge.icon && <OpportunityIcon kind={badge.icon} />}{badge.label}</Link>) : <span className="text-xs text-white/30">No active opportunities</span>}</div>
        </article>;
      })}
    </div>}

    {songInfo && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-2 sm:p-5" onClick={() => setSongInfo(null)}><section role="dialog" aria-modal="true" aria-label={`${songInfo.title} full song workspace`} onClick={event => event.stopPropagation()} className="flex h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#09090c] text-white shadow-2xl"><header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111116] px-4 py-2"><h2 className="min-w-0 flex-1 truncate text-sm font-bold">{songInfo.title} · Song Workspace</h2><button type="button" onClick={() => setSongInfo(null)} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white">Close</button></header><div className="min-h-0 flex-1 overflow-auto"><SongWorkspace id={songInfo.id} embedded onBack={() => setSongInfo(null)} /></div></section></div>}

    <style jsx>{`
      .song-portfolio button,.song-portfolio a,.song-portfolio select,.song-portfolio input{ -webkit-tap-highlight-color:transparent }
      @media (prefers-reduced-motion:reduce){.song-portfolio *{scroll-behavior:auto!important;transition-duration:0.01ms!important;animation-duration:0.01ms!important}}
    `}</style>
  </section>;
}
