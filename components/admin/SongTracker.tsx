"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { songs as practiceSongs } from "@/lib/songs-consolidated";
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";
import SongPromotion from "@/components/admin/SongPromotion";

type Request = { id: string; status: string; submitted_at: string; contribution_type: string };
type StageKey = "concept" | "lyrics" | "recorded" | "mix" | "mastered" | "ready" | "music_video" | "playlist_pitch" | "sync_placement";
type IconName = StageKey | "check" | "rocket" | "close";
type SongRow = { id: string; title: string; slug: string; is_released: boolean; release_date?: string | null; audio_status?: "Demo" | "In Progress" | "Final" | "Released"; collaboration_opportunities?: string[]; video_concept?: string; youtube_music_video_url?: string | null; sky_video_url?: string | null; production_stages?: Partial<Record<StageKey, boolean>>; production_tracking_started?: boolean; workflow_stage?: string; next_action?: string; derived_next_action?: string; next_action_manual?: boolean; ready_for_collab?: boolean; collab_interests?: string[]; collaboration_description?: string; collaboration_enabled: boolean; requests: Request[]; musicVideo: null | { id: string; status: string; visibility: string; next_action: string } };
function AdminIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const drawings: Record<IconName, React.ReactNode> = {
    concept: <><path d="M9 18h6M10 22h4M8.5 14.5A7 7 0 1 1 15.5 14.5c-.9.7-1.3 1.6-1.5 2.5h-4c-.2-.9-.6-1.8-1.5-2.5Z"/><path d="M12 3v2M4.9 5.9l1.4 1.4M19.1 5.9l-1.4 1.4"/></>,
    lyrics: <><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h6M10 17h6"/></>,
    recorded: <><rect x="8" y="3" width="8" height="13" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
    mix: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><path d="M13 4v6M7 14v6"/></>,
    mastered: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2"/></>,
    music_video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/><path d="m8 10 4 2-4 2z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    ready: <path d="m5 12 4 4L19 6"/>,
    playlist_pitch: <path d="M9 18V5l12-2v13M9 18c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Zm12-2c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Z"/>,
    sync_placement: <><path d="M3 12h4l3-8 4 16 3-8h4"/><path d="M4 5h3M17 19h3"/></>,
    rocket: <><path d="M12 19c4 0 7-5 7-13-8 0-13 3-13 7l6 6Z"/><path d="m8 15-4 1-1 4 4-1 1-4ZM13 7l4 4"/><circle cx="14.5" cy="9.5" r="1"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{drawings[name]}</svg>;
}
const productionStages: Array<{ key: StageKey; label: string; icon: IconName }> = [
  { key: "concept", label: "Concept", icon: "concept" },
  { key: "lyrics", label: "Lyrics", icon: "lyrics" },
  { key: "recorded", label: "Recorded", icon: "recorded" },
  { key: "mix", label: "Mixed", icon: "mix" },
  { key: "mastered", label: "Mastered", icon: "mastered" },
  { key: "music_video", label: "Music Video", icon: "music_video" },
  { key: "playlist_pitch", label: "Playlist Pitch", icon: "ready" },
  { key: "sync_placement", label: "Sync Placement", icon: "ready" },
  { key: "ready", label: "Ready", icon: "check" },
];
const stageColors: Record<StageKey, string> = { concept: "#FC54AF", lyrics: "#38B6FF", recorded: "#F2EF1D", mix: "#A78BFA", mastered: "#34D399", ready: "#34D399", music_video: "#FB923C", playlist_pitch: "#38BDF8", sync_placement: "#A78BFA" };
const lifecycle = [
  { key: "ideas", label: "Ideas / Demos", color: "#9CA3AF" },
  { key: "in_progress", label: "In Progress", color: "#38BDF8" },
  { key: "final", label: "Final", color: "#A78BFA" },
  { key: "released", label: "Released", color: "#34D399" },
] as const;
function productionCategory(song: SongRow) {
  if (song.is_released || song.audio_status === "Released") return "released";
  if (song.audio_status === "Final" || song.workflow_stage === "Ready" || song.production_stages?.ready === true) return "final";
  const hasProduction = Object.entries(song.production_stages || {}).some(([key, value]) => !["music_video", "ready", "playlist_pitch", "sync_placement"].includes(key) && value === true);
  if (song.audio_status === "In Progress" || hasProduction || (song.workflow_stage && ["Writing", "Recording", "Mixing", "Mastering"].includes(song.workflow_stage))) return "in_progress";
  return "ideas";
}
function hasVideo(song: SongRow) { return !!song.musicVideo || !!song.youtube_music_video_url || !!song.sky_video_url; }

export default function SongTracker() {
  const [songs, setSongs] = useState<SongRow[]>([]), [songSearch, setSongSearch] = useState(""), [statusFilter, setStatusFilter] = useState("all"), [error, setError] = useState(""), [loading, setLoading] = useState(true), [adding, setAdding] = useState(false), [newTitle, setNewTitle] = useState(""), [creating, setCreating] = useState(false), [profileSong, setProfileSong] = useState<SongRow | null>(null), [profileTab, setProfileTab] = useState<"video"|"practice"|"sync"|"playlist">("practice"), [sort, setSort] = useState<{ key: "title" | "release"; direction: 1 | -1 }>({ key: "title", direction: 1 }), [practiceLyrics, setPracticeLyrics] = useState(""), [practiceNotes, setPracticeNotes] = useState(""), [instrumentalUnavailable, setInstrumentalUnavailable] = useState(false);
  async function load() { setLoading(true); const r = await fetch("/api/admin/song-tracker", { cache: "no-store" }); const j = await r.json(); if (r.ok) setSongs(j.songs || []); else setError(j.error || "Unable to load songs."); setLoading(false); }
  useEffect(() => { void load(); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("action") === "add") setAdding(true); const filter=params.get("filter"); if(filter==="released")setStatusFilter("released"); if(filter==="ready_for_collab")setStatusFilter("open_for_collab"); }, []);
  const counts = useMemo(() => ({
    all: songs.length,
    in_progress: songs.filter(song => productionCategory(song) === "in_progress").length,
    final: songs.filter(song => productionCategory(song) === "final").length,
    released: songs.filter(song => productionCategory(song) === "released").length,
    open_for_collab: songs.filter(song => song.collaboration_opportunities?.some(value => value === "feature" || value === "remix")).length,
    video_needed: songs.filter(song => !hasVideo(song)).length,
  }), [songs]);
  const visible = useMemo(() => songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(songSearch.trim().toLowerCase());
    const matchesFilter = statusFilter === "all" || (statusFilter === "in_progress" && productionCategory(song) === "in_progress") || (statusFilter === "final" && productionCategory(song) === "final") || (statusFilter === "released" && productionCategory(song) === "released") || (statusFilter === "open_for_collab" && song.collaboration_opportunities?.some(value => value === "feature" || value === "remix")) || (statusFilter === "video_needed" && !hasVideo(song));
    return matchesSearch && matchesFilter;
  }), [songs, songSearch, statusFilter]);
  const lifecycleCounts = useMemo(() => lifecycle.map(item => ({ ...item, count: songs.filter(song => productionCategory(song) === item.key).length })), [songs]);
  const sortedVisible = useMemo(() => [...visible].sort((a, b) => {
    const comparison = sort.key === "title"
      ? a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      : (a.release_date || "9999-99-99").localeCompare(b.release_date || "9999-99-99");
    return comparison * sort.direction;
  }), [visible, sort]);
  const activeProfileSong = profileSong ? songs.find(song => song.id === profileSong.id) || profileSong : null;
  const practiceTrack = activeProfileSong ? practiceSongs.find(item => item.title.toLowerCase() === activeProfileSong.title.toLowerCase() || item.slug === activeProfileSong.slug) : undefined;
  useEffect(() => {
    if (!activeProfileSong) return;
    let cancelled = false;
    setPracticeLyrics(""); setInstrumentalUnavailable(false);
    const date = new Date(); const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const all = JSON.parse(localStorage.getItem("chxndler-admin-practice-v1") || "{}");
      const entry = Array.isArray(all[today]) ? all[today].find((item: { title?: string }) => item.title?.toLowerCase() === activeProfileSong.title.toLowerCase()) : null;
      setPracticeNotes(entry?.lyrics || "");
    } catch { setPracticeNotes(""); }
    if (practiceTrack?.slug) fetch(`/api/lyrics/${encodeURIComponent(practiceTrack.slug)}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (!cancelled) setPracticeLyrics(typeof data?.content === "string" ? data.content : ""); }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeProfileSong?.id, practiceTrack?.slug]);
  function savePracticeNotes(value: string) {
    setPracticeNotes(value);
    if (!activeProfileSong) return;
    const date = new Date(); const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const all = JSON.parse(localStorage.getItem("chxndler-admin-practice-v1") || "{}");
      const entries = Array.isArray(all[today]) ? all[today] : [];
      const index = entries.findIndex((item: { title?: string }) => item.title?.toLowerCase() === activeProfileSong.title.toLowerCase());
      if (index >= 0) entries[index] = { ...entries[index], lyrics: value };
      else entries.push({ id: `${Date.now()}`, title: activeProfileSong.title, key: "", capo: "", shape: "", lyrics: value });
      all[today] = entries; localStorage.setItem("chxndler-admin-practice-v1", JSON.stringify(all));
    } catch {}
  }
  async function toggle(song: SongRow, key: "is_released") {
    setError(""); const next = !song[key];
    setSongs(current => current.map(item => item.id === song.id ? { ...item, [key]: next } : item));
    const r = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, [key]: next }) });
    if (!r.ok) { setSongs(current => current.map(item => item.id === song.id ? { ...item, [key]: !next } : item)); const j = await r.json(); setError(j.error || "Could not save change."); }
  }
  async function setReleaseDate(song: SongRow, release_date: string) {
    setError("");
    setSongs(current => current.map(item => item.id === song.id ? { ...item, release_date: release_date || null } : item));
    const r = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, release_date: release_date || null }) });
    if (!r.ok) { setSongs(current => current.map(item => item.id === song.id ? { ...item, release_date: song.release_date } : item)); const j = await r.json(); setError(j.error || "Could not save release date."); }
  }
  async function toggleStage(song: SongRow, key: StageKey) {
    const complete = !song.production_stages?.[key];
    setSongs(current => current.map(item => item.id === song.id ? { ...item, production_stages: { ...item.production_stages, [key]: complete } } : item));
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, stage: key, complete }) });
    if (!response.ok) {
      setSongs(current => current.map(item => item.id === song.id ? { ...item, production_stages: { ...item.production_stages, [key]: !complete } } : item));
      const result = await response.json(); setError(result.error || "Could not update song stage.");
    }
  }
  async function setNextAction(song: SongRow, next_action: string) {
    const clean = next_action.trim().slice(0, 240);
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, next_action: clean }) });
    const result = await response.json();
    if (response.ok) setSongs(current => current.map(item => item.id === song.id ? { ...item, next_action: clean, next_action_manual: true } : item));
    else setError(result.error || "Unable to save next action.");
  }
  async function saveOpportunitySettings(song: SongRow, patch: Partial<Pick<SongRow, "audio_status" | "collaboration_opportunities" | "video_concept">>) {
    setError("");
    setSongs(rows => rows.map(row => row.id === song.id ? { ...row, ...patch } : row));
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, ...patch }) });
    const result = await response.json();
    if (!response.ok) { setSongs(rows => rows.map(row => row.id === song.id ? { ...row, audio_status: song.audio_status, collaboration_opportunities: song.collaboration_opportunities, video_concept: song.video_concept } : row)); setError(result.error || "Unable to save collaboration opportunities."); }
  }
  function sortBy(key: "title" | "release") {
    setSort(current => current.key === key ? { key, direction: current.direction === 1 ? -1 : 1 } : { key, direction: 1 });
  }
  async function createSong(event: React.FormEvent) {
    event.preventDefault(); setCreating(true); setError("");
    const response = await fetch("/api/admin/song-tracker", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
    const result = await response.json();
    setCreating(false);
    if (!response.ok) { setError(result.error || "Unable to add this song."); return; }
    location.href = `/admin/songs/${result.song.id}`;
  }
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Song portfolio <span className="ml-2 text-sm font-medium text-white/45">{songs.length}</span></h2><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">{adding ? "Cancel" : "+ Add song"}</button></div>
    <section aria-label="Song portfolio metrics" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {([ ["all", "All Songs", counts.all, "#FC54AF"], ["in_progress", "In Progress", counts.in_progress, "#38BDF8"], ["final", "Final", counts.final, "#A78BFA"], ["released", "Released", counts.released, "#34D399"], ["open_for_collab", "Open for Collab", counts.open_for_collab, "#FB923C"], ["video_needed", "Video Needed", counts.video_needed, "#F2EF1D"] ] as const).map(([key, label, count, color]) => <button key={key} type="button" onClick={() => setStatusFilter(key)} aria-pressed={statusFilter === key} className={`flex min-h-[60px] items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${statusFilter === key ? "border-white/30 bg-white/[.09]" : "border-white/[.08] bg-[#101014] hover:bg-white/[.05]"}`}><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color, boxShadow: statusFilter === key ? `0 0 10px ${color}88` : "none" }}/><span className="min-w-0 flex-1 text-xs leading-4 text-white/65">{label}</span><span className="text-lg font-bold tabular-nums text-white">{count}</span></button>)}
    </section>
    <section aria-label="Production lifecycle" className="mb-4 rounded-lg border border-white/[.08] bg-[#101014] px-3 py-2.5"><div className="flex h-2 overflow-hidden rounded-full bg-white/[.06]" role="group" aria-label={lifecycleCounts.map(item => `${item.label}: ${item.count}`).join(", ")}>{lifecycleCounts.map(item => <button key={item.key} type="button" title={`${item.label}: ${item.count}`} aria-label={`Filter ${item.label}, ${item.count} songs`} onClick={() => setStatusFilter(item.key)} className="h-full min-w-0 transition-opacity hover:opacity-75" style={{ width: songs.length ? `${item.count / songs.length * 100}%` : "0%", backgroundColor: item.color }}/>)}</div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{lifecycleCounts.map(item => <button key={item.key} type="button" onClick={() => setStatusFilter(item.key)} className={`inline-flex items-center gap-1.5 text-[.65rem] ${statusFilter === item.key ? "text-white" : "text-white/50"}`}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }}/>{item.label}<span className="tabular-nums text-white/75">{item.count}</span></button>)}</div></section>
    {adding && <form onSubmit={createSong} className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-sm text-white/75">Song title<input autoFocus required maxLength={120} value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Name your song" className="mt-2 block w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base text-white"/></label><button disabled={creating} className="rounded-lg bg-[#FD52AF] px-5 py-3 font-bold text-black disabled:opacity-60">{creating ? "Creating…" : "Create workspace"}</button></form>}
    <div className="mb-3 flex flex-col gap-2 sm:flex-row"><input value={songSearch} onChange={event => setSongSearch(event.target.value)} placeholder="Search songs" aria-label="Search songs" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white placeholder:text-white/40"/><select aria-label="Sort songs" value={`${sort.key}:${sort.direction}`} onChange={event => { const [key, direction] = event.target.value.split(":"); setSort({ key: key as "title" | "release", direction: Number(direction) as 1 | -1 }); }} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white"><option value="title:1">Title A–Z</option><option value="title:-1">Title Z–A</option><option value="release:1">Release date earliest</option><option value="release:-1">Release date latest</option></select><button type="button" onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm">Refresh</button>{(statusFilter !== "all" || songSearch) && <button type="button" onClick={() => { setStatusFilter("all"); setSongSearch(""); }} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/65">Clear filters</button>}</div>

    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="p-8 text-center text-white/45">Loading songs…</p> : <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101014]"><div className="hidden grid-cols-[minmax(13rem,1.5fr)_8rem_minmax(10rem,1fr)_8rem_minmax(12rem,1fr)] gap-3 border-b border-white/10 px-4 py-3 text-[.68rem] font-semibold text-white/45 lg:grid"><span>Artwork + Song</span><span>Production Stage</span><span>Opportunities</span><span>Video</span><span>Next Action</span></div>
      {sortedVisible.map(song => { const category = productionCategory(song), videoReady = hasVideo(song); const opportunities = (song.collaboration_opportunities || []).filter(value => ["feature", "remix"].includes(value)); return <article key={song.id} className="grid gap-2.5 border-b border-white/[.07] p-3 last:border-0 lg:grid-cols-[minmax(13rem,1.5fr)_8rem_minmax(10rem,1fr)_8rem_minmax(12rem,1fr)] lg:items-center lg:gap-3 lg:px-4">
        <div className="flex items-center gap-3"><button type="button" onClick={() => setProfileSong(song)} aria-label={`Open ${song.title} workspace`} className="shrink-0 rounded-md"><img src={songCoverPath(song.slug, song.title)} alt="" className="h-11 w-11 rounded-md border border-white/10 object-cover"/></button><div className="min-w-0"><button type="button" onClick={() => setProfileSong(song)} className="block max-w-full truncate text-left text-sm font-semibold hover:text-[#FD52AF]">{song.title}</button><span className={`text-xs ${song.is_released ? "text-emerald-300" : "text-white/45"}`}>{song.is_released ? "Released" : "Unreleased"}</span></div></div>
        <label className="flex items-center gap-2 text-xs text-white/45 lg:block"><span className="sr-only">Production stage for {song.title}</span><span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full lg:mr-1.5" style={{ backgroundColor: lifecycle.find(item => item.key === category)?.color }}/><select value={song.workflow_stage || "Idea"} onChange={event => { const workflow_stage = event.target.value; setSongs(rows => rows.map(row => row.id === song.id ? { ...row, workflow_stage } : row)); void fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, workflow_stage: event.target.value }) }); }} className="rounded-md border border-white/10 bg-[#17171c] px-2 py-1.5 text-xs text-white"><option>Idea</option><option>Writing</option><option>Recording</option><option>Mixing</option><option>Mastering</option><option>Ready</option></select></label>
        <button type="button" onClick={() => setProfileSong(song)} aria-label={`Edit collaboration opportunities for ${song.title}`} className="flex w-fit flex-wrap gap-1.5 text-left">{opportunities.map(value => <span key={value} className="rounded-full border border-[#FC54AF]/20 bg-[#FC54AF]/[.08] px-2 py-1 text-[.65rem] text-[#ffb4d9]">Open for {value === "feature" ? "Feature" : "Remix"}</span>)}{!opportunities.length && <span className="text-xs text-white/35">No collab openings</span>}</button>
        <Link href={song.musicVideo ? `/admin/music-videos/${song.musicVideo.id}` : `/admin/music-videos?song=${encodeURIComponent(song.title)}`} className={`w-fit rounded-full px-2 py-1 text-[.65rem] ${videoReady ? "bg-sky-300/10 text-sky-200" : "bg-amber-300/10 text-amber-200"}`}>{videoReady ? (song.musicVideo ? "Video active" : "Video linked") : "Video needed"}</Link>
        <label className="flex gap-2 text-xs text-white/45"><span className="sr-only">Next action for {song.title}</span><input key={`${song.id}:${song.next_action || song.derived_next_action || ""}`} defaultValue={song.next_action || song.derived_next_action || ""} onBlur={event => { if (event.currentTarget.value !== (song.next_action || song.derived_next_action || "")) void setNextAction(song, event.currentTarget.value); }} placeholder="Add next action" maxLength={240} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white placeholder:text-white/35"/><Link href={`/admin/songs/${song.id}`} aria-label={`Open full ${song.title} workspace`} className="self-center text-[#FD52AF]">Open</Link></label>
      </article>; })}{visible.length === 0 && <p className="p-8 text-center text-sm text-white/45">{songs.length ? "No songs match this view." : "No songs found."}</p>}</div>}
    {activeProfileSong && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setProfileSong(null); }}><section role="dialog" aria-modal="true" aria-label={`${activeProfileSong.title} song progress`} className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-[#09090c] shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#09090c]/95 px-4 py-3 backdrop-blur sm:px-6"><div className="min-w-0"><p className="text-[.62rem] font-black uppercase tracking-[.2em] text-[#FC54AF]">Song workspace</p><h2 className="truncate font-bold text-white">{activeProfileSong.title} · Progress</h2></div><button type="button" onClick={() => setProfileSong(null)} aria-label="Close song progress" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/70 hover:border-[#FC54AF] hover:text-white"><AdminIcon name="close" size={18}/></button></header>
      <section className="border-b border-white/10 px-4 py-5 sm:px-6"><div className="mb-4 flex items-end justify-between"><div><p className="text-[.62rem] font-black uppercase tracking-[.2em] text-white/40">Song journey</p><p className="mt-1 text-sm font-semibold text-white">{productionStages.filter(({ key }) => activeProfileSong.production_stages?.[key]).length} of {productionStages.length} steps complete</p></div><span className="text-xs text-white/40">{activeProfileSong.is_released ? "Released" : "In production"}</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{productionStages.map(({ key, label, icon }) => { const complete = !!activeProfileSong.production_stages?.[key]; const color = stageColors[key]; return <button key={key} type="button" onClick={() => void toggleStage(activeProfileSong, key)} aria-pressed={complete} className="flex min-w-0 flex-col items-center gap-2 text-center text-[.65rem] font-bold sm:text-xs"><span className="grid h-10 w-10 place-items-center rounded-full border-2" style={{ color: complete ? "#09090c" : color, borderColor: color, background: complete ? color : "#111116", boxShadow: complete ? `0 0 18px ${color}55` : "none" }}><AdminIcon name={complete ? "check" : icon} size={16}/></span><span className={complete ? "text-white" : "text-white/55"}>{label}</span></button>; })}</div></section>
      <nav role="tablist" aria-label={`${activeProfileSong.title} sections`} className="grid grid-cols-4 border-b border-white/10 px-4 sm:px-6">{([ ["video","VIDEO"], ["practice","PRACTICE"], ["sync","SYNC"], ["playlist","PLAYLIST"]] as const).map(([id,label])=><button key={id} role="tab" aria-selected={profileTab===id} onClick={()=>setProfileTab(id)} className={`border-b-2 py-3 text-xs font-bold tracking-wider ${profileTab===id?"border-[#FD52AF] text-white":"border-transparent text-white/45"}`}>{label}</button>)}</nav>
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,.8fr)]">
        <section style={{display:profileTab==="video"?"block":"none"}} className="rounded-xl border border-[#FD52AF]/20 bg-[#FD52AF]/[.035] p-4 sm:p-5 lg:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#FD52AF]">Collaboration Opportunities</p><p className="mt-1 text-xs text-white/45">Audio status and creative opportunities are tracked independently.</p></div><label className="text-xs text-white/50">Audio status<select value={activeProfileSong.audio_status || (activeProfileSong.is_released ? "Released" : "Demo")} onChange={event => void saveOpportunitySettings(activeProfileSong, { audio_status: event.target.value as SongRow["audio_status"] })} className="ml-2 rounded-lg border border-white/10 bg-[#17171c] p-2 text-white"><option>Demo</option><option>In Progress</option><option>Final</option><option>Released</option></select></label></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">{([["feature", "Open for Feature"], ["video", "Open for Video Collab"], ["remix", "Open for Remix"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={activeProfileSong.collaboration_opportunities?.includes(key) || false} onChange={event => { const current = activeProfileSong.collaboration_opportunities || []; const collaboration_opportunities = event.target.checked ? [...current, key] : current.filter(value => value !== key); void saveOpportunitySettings(activeProfileSong, { collaboration_opportunities }); }} className="accent-[#FD52AF]"/>{label}</label>)}</div>{activeProfileSong.collaboration_opportunities?.includes("video") && <label className="mt-4 block text-xs text-white/50">Music video concept <textarea key={`${activeProfileSong.id}:video-concept`} defaultValue={activeProfileSong.video_concept || ""} maxLength={500} rows={2} onBlur={event => { if (event.currentTarget.value !== (activeProfileSong.video_concept || "")) void saveOpportunitySettings(activeProfileSong, { video_concept: event.currentTarget.value }); }} placeholder="A short visual direction for a videographer" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 p-2.5 text-sm text-white placeholder:text-white/30"/></label>}<Link href={`/admin/collaborations?song=${activeProfileSong.id}`} className="mt-4 inline-block text-xs font-bold text-[#ff9dce]">Invite Creative →</Link></section>
        <section style={{display:profileTab==="practice"?"block":"none"}} className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><div className="flex flex-wrap items-start gap-5"><img src={songCoverPath(activeProfileSong.slug, activeProfileSong.title)} alt={`${activeProfileSong.title} cover art`} className="h-36 w-36 rounded-xl border border-white/10 object-cover shadow-[0_0_28px_rgba(252,84,175,.12)] sm:h-44 sm:w-44"/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Production progress</p><p className="mt-1 text-2xl font-black text-white">{productionStages.filter(({ key }) => activeProfileSong.production_stages?.[key]).length} <span className="text-base font-semibold text-white/45">/ {productionStages.length} complete</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FC54AF]" style={{ width: `${productionStages.filter(({ key }) => activeProfileSong.production_stages?.[key]).length / productionStages.length * 100}%` }}/></div></div></div>
          <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#FC54AF]">Practice this song</p>{practiceTrack?.sources?.[0]?.src && <a href={practiceTrack.sources[0].src} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#FD52AF] px-4 py-3 text-sm font-black text-black">FULL SONG ↗</a>} {practiceTrack && <div className="mt-4"><p className="mb-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-white/45">Instrumental · if available</p><a href={supabaseTrackUrl(`${practiceTrack.slug}-instrumental.mp3`)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white">INSTRUMENTAL ↗</a>{instrumentalUnavailable && <span className="text-xs text-white/40">No instrumental found.</span>}</div>}{practiceLyrics && <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-bold text-[#83d1ff]">View lyrics</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-white/75">{practiceLyrics}</pre></details>}<label className="mt-5 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/45">Practice notes<textarea value={practiceNotes} onChange={event => savePracticeNotes(event.target.value)} placeholder="Jot down what to work on…" rows={5} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white placeholder:text-white/25"/></label><p className="mt-2 text-[.65rem] text-white/35">Notes save in today’s practice session on this device.</p></div>
        </section>
        <div className="grid gap-4">
          {profileTab==="sync"&&<SongPromotion songId={activeProfileSong.id} title={activeProfileSong.title} mode="sync"/>}
          {profileTab==="playlist"&&<SongPromotion songId={activeProfileSong.id} title={activeProfileSong.title} mode="playlist"/>}
          <section style={{display:profileTab==="video"?"block":"none"}} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Release</p><p className="mt-1 text-sm font-semibold text-white">{activeProfileSong.is_released ? "Released" : "Unreleased"}</p></div><button type="button" onClick={() => void toggle(activeProfileSong, "is_released")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeProfileSong.is_released ? "bg-[#F2EF1D]/10 text-[#F2EF1D]" : "bg-white/10 text-white/65"}`}>{activeProfileSong.is_released ? "Mark unreleased" : "Mark released"}</button></div><label className="mt-4 block text-xs text-white/45">Release date<input type="date" value={activeProfileSong.release_date || ""} onChange={event => void setReleaseDate(activeProfileSong, event.target.value)} className="mt-1.5 block rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label></section>

          <section style={{display:profileTab==="video"?"block":"none"}} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Music video</p>{activeProfileSong.musicVideo ? <><p className="mt-1 text-sm font-semibold capitalize text-white">{activeProfileSong.musicVideo.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs leading-5 text-white/50">{activeProfileSong.musicVideo.next_action || "Workspace is ready."}</p><Link href={`/admin/music-videos/${activeProfileSong.musicVideo.id}`} className="mt-3 inline-block text-xs font-bold text-[#83d1ff]">Open video workspace →</Link></> : (activeProfileSong.youtube_music_video_url || activeProfileSong.sky_video_url) ? <><p className="mt-1 text-sm font-semibold text-white">Video link associated</p><a href={activeProfileSong.youtube_music_video_url || activeProfileSong.sky_video_url || undefined} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-[#83d1ff]">Watch music video ↗</a></> : <><p className="mt-1 text-sm text-white/55">No video workspace yet.</p><Link href={`/admin/music-videos?song=${encodeURIComponent(activeProfileSong.title)}`} className="mt-3 inline-block text-xs font-bold text-[#83d1ff]">Set up music video →</Link></>}</section>
          <Link href={`/admin/songs/${activeProfileSong.id}`} className="justify-self-start rounded-lg border border-white/15 px-3 py-2 text-xs text-white/65 hover:border-white/30 hover:text-white">Open full song workspace ↗</Link>
        </div>
      </div>
    </section></div>}
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/collaborations" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Open outreach inbox ↗</Link><Link href="/admin/music-videos" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Music video projects ↗</Link></div>
  </>;
}
