"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { songCoverPath } from "@/lib/songCover";
import { songs as practiceSongs } from "@/lib/songs-consolidated";

type Request = { id: string; status: string; submitted_at: string; contribution_type: string };
type StageKey = "concept" | "lyrics" | "recorded" | "mix" | "mastered" | "music_video";
type IconName = StageKey | "check" | "rocket" | "close";
type SongRow = { id: string; title: string; slug: string; is_released: boolean; release_date?: string | null; production_stages?: Partial<Record<StageKey, boolean>>; collaboration_enabled: boolean; requests: Request[]; musicVideo: null | { id: string; status: string; visibility: string; next_action: string } };
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
    rocket: <><path d="M12 19c4 0 7-5 7-13-8 0-13 3-13 7l6 6Z"/><path d="m8 15-4 1-1 4 4-1 1-4ZM13 7l4 4"/><circle cx="14.5" cy="9.5" r="1"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{drawings[name]}</svg>;
}
const productionStages: Array<{ key: StageKey; label: string; icon: IconName }> = [
  { key: "concept", label: "Concept", icon: "concept" },
  { key: "lyrics", label: "Lyrics", icon: "lyrics" },
  { key: "recorded", label: "Recorded", icon: "recorded" },
  { key: "mix", label: "Mix", icon: "mix" },
  { key: "mastered", label: "Mastered", icon: "mastered" },
  { key: "music_video", label: "Music video", icon: "music_video" },
];
const stageColors: Record<StageKey, string> = { concept: "#FC54AF", lyrics: "#38B6FF", recorded: "#F2EF1D", mix: "#A78BFA", mastered: "#34D399", music_video: "#FB923C" };
const statusTone: Record<string, string> = { new: "text-pink-300", reviewing: "text-amber-200", approved: "text-emerald-300", declined: "text-white/40", agreement_pending: "text-amber-200", signed: "text-emerald-300", in_progress: "text-sky-300", completed: "text-emerald-300", canceled: "text-white/40", archived: "text-white/40" };

export default function SongTracker() {
  const [songs, setSongs] = useState<SongRow[]>([]), [songSearch, setSongSearch] = useState(""), [songSearchOpen, setSongSearchOpen] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true), [adding, setAdding] = useState(false), [newTitle, setNewTitle] = useState(""), [creating, setCreating] = useState(false), [profileSong, setProfileSong] = useState<SongRow | null>(null), [sort, setSort] = useState<{ key: "title" | "release"; direction: 1 | -1 }>({ key: "title", direction: 1 }), [practiceLyrics, setPracticeLyrics] = useState(""), [practiceNotes, setPracticeNotes] = useState(""), [instrumentalUnavailable, setInstrumentalUnavailable] = useState(false);
  async function load() { setLoading(true); const r = await fetch("/api/admin/song-tracker", { cache: "no-store" }); const j = await r.json(); if (r.ok) setSongs(j.songs || []); else setError(j.error || "Unable to load songs."); setLoading(false); }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => songs.filter(song => song.title.toLowerCase().includes(songSearch.trim().toLowerCase())), [songs, songSearch]);
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
  async function toggle(song: SongRow, key: "is_released" | "collaboration_enabled") {
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
    <section className="mb-6 rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#FC54AF]">One song · one home</p><h2 className="mt-1 text-xl font-black text-white">Song journey</h2><p className="mt-1 text-sm text-white/70">Keep every creative, collaboration, video, and release detail attached to its song.</p></div><button onClick={() => setAdding(value => !value)} className="rounded-xl bg-[#FC54AF] px-5 py-3 text-sm font-extrabold text-[#160711] shadow-[0_6px_24px_rgba(252,84,175,.18)]">{adding ? "Close" : "+ Add a song"}</button></div>
      <div className="grid gap-2 sm:grid-cols-5">{[
        ["✍️", "Song profile", "#FC54AF", "#/profile"], ["🎙️", "Story & lyrics", "#38B6FF", "#/lyrics"], ["🤝", "Collaboration", "#FC54AF", "/admin/collaborations"], ["🎬", "Music video", "#38B6FF", "/admin/music-videos"], ["🚀", "Release", "#F2EF1D", "#/release"],
      ].map(([icon, label, color, href]) => <a key={label} href={href.startsWith("#") ? undefined : href} className="flex min-h-16 items-center gap-3 rounded-xl border border-[#303038] bg-[#19191f] px-3 py-3 text-sm font-bold text-white/90"><span style={{ color }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-lg">{icon}</span><span>{label}</span></a>)}</div>
      {adding && <form onSubmit={createSong} className="mt-4 grid gap-3 rounded-xl border border-[#FC54AF]/35 bg-[#09090c] p-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="text-sm font-semibold text-white/80">Song title<input autoFocus required maxLength={120} value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Name your song" className="mt-2 block w-full rounded-lg border border-[#3b3b45] bg-[#15151b] px-4 py-3 text-base text-white placeholder:text-white/45 focus:border-[#FC54AF] focus:outline-none"/></label><button disabled={creating} className="rounded-lg bg-[#FC54AF] px-5 py-3 font-bold text-[#160711] disabled:opacity-60">{creating ? "Creating…" : "Create song workspace →"}</button></form>}
    </section>
    <section className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Songs", value: songs.length, color: "#FC54AF" }, { label: "Released", value: songs.filter(song => song.is_released).length, color: "#F2EF1D" }, { label: "Open outreach", value: songs.filter(song => song.collaboration_enabled).length, color: "#38B6FF" }].map(card => <div key={card.label} className="rounded-xl border border-[#292930] bg-[#121217] p-4"><p style={{ color: card.color }} className="text-xs font-bold uppercase tracking-[.16em]">{card.label}</p><p style={{ color: card.color }} className="mt-2 text-4xl font-black tabular-nums">{card.value}</p></div>)}
    </section>
    <div className="my-5 flex justify-end"><button onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-3 text-sm">Refresh</button></div>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="p-8 text-center text-white/45">Loading song tracker…</p> : <div className="overflow-hidden rounded-xl border border-white/10"><div className="hidden grid-cols-[minmax(12rem,1.5fr)_8rem_8rem_9rem_minmax(12rem,1fr)] gap-3 bg-white/[.05] px-4 py-3 text-[.65rem] font-bold uppercase tracking-[.16em] text-white/45 md:grid"><div className="flex min-w-0 items-center gap-2">{songSearchOpen ? <><input autoFocus value={songSearch} onChange={event => setSongSearch(event.target.value)} placeholder="Type a song name…" aria-label="Filter by song name" className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white placeholder:text-white/35"/><button type="button" onClick={() => { setSongSearch(""); setSongSearchOpen(false); }} aria-label="Close song name filter" className="text-white/55 hover:text-white">×</button></> : <button type="button" onClick={() => setSongSearchOpen(true)} className="text-left hover:text-white">Song⌕</button>}</div><button onClick={() => sortBy("release")} className="text-left hover:text-white">Release {sort.key === "release" ? (sort.direction === 1 ? "↑" : "↓") : "↕"}</button><span>Status</span><span>Outreach</span><span>Activity · production stages</span></div>
      {sortedVisible.map(song => <article key={song.id} className={`grid gap-3 border-t px-4 py-4 md:grid-cols-[minmax(12rem,1.5fr)_8rem_8rem_9rem_minmax(12rem,1fr)] md:items-center ${song.is_released ? "border-emerald-300/25 bg-emerald-400/[.09]" : Object.values(song.production_stages ?? {}).some(Boolean) ? "border-amber-300/25 bg-amber-300/[.09]" : "border-[#FC54AF]/25 bg-[#FC54AF]/[.07]"}`}><div className="flex items-center gap-3"><button type="button" onClick={() => setProfileSong(song)} aria-label={`Open ${song.title} song profile`} className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff66b4]"><img src={songCoverPath(song.slug, song.title)} alt={`${song.title} cover art`} className="h-14 w-14 rounded-lg border border-white/10 object-cover" /></button><div className="min-w-0"><h2 className="font-bold text-white"><button type="button" onClick={() => setProfileSong(song)} className="text-left hover:text-[#ff83c6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff66b4]">{song.title}</button></h2><Link className="mt-2 inline-block text-xs text-[#83d1ff]" href={`/admin/music-videos${song.musicVideo ? `/${song.musicVideo.id}` : ""}`}>{song.musicVideo ? "Video workspace ↗" : "Set up video"}</Link></div></div>
        <div className="grid gap-2"><button onClick={() => void toggle(song, "is_released")} className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${song.is_released ? "bg-[#F2EF1D]/10 text-[#F2EF1D]" : "bg-[#38B6FF]/10 text-[#83d1ff]"}`}>{song.is_released ? "Released" : "Unreleased"}</button><label className="text-[10px] text-white/65">Release date<input type="date" value={song.release_date || ""} onChange={event => void setReleaseDate(song, event.target.value)} className="mt-1 block rounded border border-white/15 bg-[#111116] p-1.5 text-xs text-white" /></label></div>
        <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${song.is_released ? "bg-[#F2EF1D]/10 text-[#F2EF1D]" : Object.values(song.production_stages ?? {}).some(Boolean) ? "bg-[#38B6FF]/10 text-[#83d1ff]" : "bg-white/[.07] text-white/55"}`}>{song.is_released ? "Released" : Object.values(song.production_stages ?? {}).some(Boolean) ? "In progress" : "Not started"}</span></div>
        <button onClick={() => void toggle(song, "collaboration_enabled")} className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${song.collaboration_enabled ? "bg-[#ff3ea5]/15 text-[#ff80c4]" : "bg-white/10 text-white/50"}`}>{song.collaboration_enabled ? "Outreach open" : "Outreach closed"}</button>
        <div className="text-xs text-white/55"><p>{song.requests.length} request{song.requests.length === 1 ? "" : "s"} · <Link className="text-[#ff66b4]" href={`/admin/collaborations${song.requests[0] ? `?request=${song.requests[0].id}` : ""}`}>Manage outreach ↗</Link></p>{song.requests.slice(0, 1).map(request => <p key={request.id} className={`mt-1 capitalize ${statusTone[request.status] || ""}`}>{request.status.replaceAll("_", " ")} · {request.contribution_type}</p>)}<div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${song.title} production stages`}>{productionStages.map(({ key, label, icon }) => { const complete = !!song.production_stages?.[key]; return <button key={key} type="button" onClick={() => void toggleStage(song, key)} aria-label={`${label}: ${complete ? "complete" : "not complete"}`} aria-pressed={complete} title={`${label}${complete ? " · complete" : ""}`} className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${complete ? "border-[#FC54AF]/70 bg-[#FC54AF]/15 text-[#ff83c6]" : "border-white/10 bg-white/[.03] text-white/35 hover:border-white/30 hover:text-white/75"}`}><AdminIcon name={icon} size={15}/>{complete && <span className="absolute -right-0.5 -top-0.5 grid h-3 w-3 place-items-center rounded-full bg-[#FC54AF] text-black"><AdminIcon name="check" size={9}/></span>}</button>; })}<button type="button" onClick={() => void toggle(song, "is_released")} aria-label={`Released: ${song.is_released ? "complete" : "not complete"}`} aria-pressed={song.is_released} title={`Released${song.is_released ? " · complete" : ""}`} className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${song.is_released ? "border-[#F2EF1D]/70 bg-[#F2EF1D]/15 text-[#F2EF1D]" : "border-white/10 bg-white/[.03] text-white/35 hover:border-white/30 hover:text-white/75"}`}><AdminIcon name="rocket" size={15}/></button></div></div>
      </article>)}{visible.length === 0 && <p className="p-8 text-center text-sm text-white/45">{songs.length ? "No songs match this view." : "No songs found."}</p>}</div>}
    {activeProfileSong && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setProfileSong(null); }}><section role="dialog" aria-modal="true" aria-label={`${activeProfileSong.title} song progress`} className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-[#09090c] shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#09090c]/95 px-4 py-3 backdrop-blur sm:px-6"><div className="min-w-0"><p className="text-[.62rem] font-black uppercase tracking-[.2em] text-[#FC54AF]">Song workspace</p><h2 className="truncate font-bold text-white">{activeProfileSong.title} · Progress</h2></div><button type="button" onClick={() => setProfileSong(null)} aria-label="Close song progress" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/70 hover:border-[#FC54AF] hover:text-white"><AdminIcon name="close" size={18}/></button></header>
      <section className="border-b border-white/10 px-4 py-5 sm:px-6"><div className="mb-4 flex items-end justify-between"><div><p className="text-[.62rem] font-black uppercase tracking-[.2em] text-white/40">Song journey</p><p className="mt-1 text-sm font-semibold text-white">{productionStages.filter(({ key }) => activeProfileSong.production_stages?.[key]).length} of {productionStages.length} steps complete</p></div><span className="text-xs text-white/40">{activeProfileSong.is_released ? "Released" : "In production"}</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{productionStages.map(({ key, label, icon }) => { const complete = !!activeProfileSong.production_stages?.[key]; const color = stageColors[key]; return <button key={key} type="button" onClick={() => void toggleStage(activeProfileSong, key)} aria-pressed={complete} className="flex min-w-0 flex-col items-center gap-2 text-center text-[.65rem] font-bold sm:text-xs"><span className="grid h-10 w-10 place-items-center rounded-full border-2" style={{ color: complete ? "#09090c" : color, borderColor: color, background: complete ? color : "#111116", boxShadow: complete ? `0 0 18px ${color}55` : "none" }}><AdminIcon name={complete ? "check" : icon} size={16}/></span><span className={complete ? "text-white" : "text-white/55"}>{label}</span></button>; })}</div></section>
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,.8fr)]">
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><div className="flex flex-wrap items-start gap-5"><img src={songCoverPath(activeProfileSong.slug, activeProfileSong.title)} alt={`${activeProfileSong.title} cover art`} className="h-36 w-36 rounded-xl border border-white/10 object-cover shadow-[0_0_28px_rgba(252,84,175,.12)] sm:h-44 sm:w-44"/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Production progress</p><p className="mt-1 text-2xl font-black text-white">{Object.values(activeProfileSong.production_stages || {}).filter(Boolean).length} <span className="text-base font-semibold text-white/45">/ {productionStages.length} complete</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FC54AF]" style={{ width: `${Object.values(activeProfileSong.production_stages || {}).filter(Boolean).length / productionStages.length * 100}%` }}/></div></div></div>
          <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#FC54AF]">Practice this song</p>{practiceTrack?.sources?.[0]?.src && <audio controls preload="none" src={practiceTrack.sources[0].src} className="mt-3 h-10 w-full" aria-label={`Play ${activeProfileSong.title}`}/>} {practiceTrack && <div className="mt-4"><p className="mb-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-white/45">Instrumental · if available</p><audio controls preload="none" src={`https://hjpaiolhhugwzblarfix.supabase.co/storage/v1/object/public/tracks/${encodeURIComponent(`${practiceTrack.slug}-instrumental.mp3`)}`} className="h-9 w-full max-w-md" onError={event => { event.currentTarget.hidden = true; setInstrumentalUnavailable(true); }}/>{instrumentalUnavailable && <span className="text-xs text-white/40">No instrumental found.</span>}</div>}{practiceLyrics && <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3"><summary className="cursor-pointer text-xs font-bold text-[#83d1ff]">View lyrics</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-white/75">{practiceLyrics}</pre></details>}<label className="mt-5 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/45">Practice notes<textarea value={practiceNotes} onChange={event => savePracticeNotes(event.target.value)} placeholder="Jot down what to work on…" rows={5} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white placeholder:text-white/25"/></label><p className="mt-2 text-[.65rem] text-white/35">Notes save in today’s practice session on this device.</p></div>
        </section>
        <div className="grid gap-4">
          <section className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Release</p><p className="mt-1 text-sm font-semibold text-white">{activeProfileSong.is_released ? "Released" : "Unreleased"}</p></div><button type="button" onClick={() => void toggle(activeProfileSong, "is_released")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeProfileSong.is_released ? "bg-[#F2EF1D]/10 text-[#F2EF1D]" : "bg-white/10 text-white/65"}`}>{activeProfileSong.is_released ? "Mark unreleased" : "Mark released"}</button></div><label className="mt-4 block text-xs text-white/45">Release date<input type="date" value={activeProfileSong.release_date || ""} onChange={event => void setReleaseDate(activeProfileSong, event.target.value)} className="mt-1.5 block rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label></section>
          <section className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Collaboration</p><p className="mt-1 text-sm text-white">{activeProfileSong.requests.length} request{activeProfileSong.requests.length === 1 ? "" : "s"} · {activeProfileSong.collaboration_enabled ? "Open" : "Closed"}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void toggle(activeProfileSong, "collaboration_enabled")} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/75">{activeProfileSong.collaboration_enabled ? "Close requests" : "Open requests"}</button><Link href={`/admin/collaborations${activeProfileSong.requests[0] ? `?request=${activeProfileSong.requests[0].id}` : ""}`} className="rounded-lg border border-[#FC54AF]/35 px-3 py-2 text-xs text-[#ff9dce]">Manage requests →</Link></div></section>
          <section className="rounded-xl border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Music video</p>{activeProfileSong.musicVideo ? <><p className="mt-1 text-sm font-semibold capitalize text-white">{activeProfileSong.musicVideo.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs leading-5 text-white/50">{activeProfileSong.musicVideo.next_action || "Workspace is ready."}</p><Link href={`/admin/music-videos/${activeProfileSong.musicVideo.id}`} className="mt-3 inline-block text-xs font-bold text-[#83d1ff]">Open video workspace →</Link></> : <><p className="mt-1 text-sm text-white/55">No video workspace yet.</p><Link href={`/admin/music-videos?song=${encodeURIComponent(activeProfileSong.title)}`} className="mt-3 inline-block text-xs font-bold text-[#83d1ff]">Set up music video →</Link></>}</section>
          <Link href={`/admin/songs/${activeProfileSong.id}`} className="justify-self-start rounded-lg border border-white/15 px-3 py-2 text-xs text-white/65 hover:border-white/30 hover:text-white">Open full song workspace ↗</Link>
        </div>
      </div>
    </section></div>}
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/collaborations" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Open outreach inbox ↗</Link><Link href="/admin/music-videos" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Music video projects ↗</Link></div>
  </>;
}
