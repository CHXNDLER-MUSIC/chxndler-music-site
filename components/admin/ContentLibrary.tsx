"use client";

import { useCallback, useEffect, useState } from "react";
import ContentDetailPanel, { type CatalogSong, type ContentItem } from "@/components/admin/ContentDetailPanel";

type Metrics = { total: number | null; recorded?: number | null; edited?: number | null; toRecord: number | null; toEdit: number | null; ready: number | null; scheduled: number | null; posted: number | null };
type Payload = { items: ContentItem[]; total: number; page: number; pageSize: number; metrics: Metrics; songs: CatalogSong[]; categories: string[]; types: string[] };
const blankMetrics: Metrics = { total: 0, toRecord: 0, toEdit: 0, ready: 0, scheduled: 0, posted: 0 };
const statusStyles: Record<string, string> = { Idea: "text-white/55 bg-white/[.06]", "To Record": "text-sky-200 bg-sky-300/10", "To Edit": "text-amber-200 bg-amber-300/10", Ready: "text-fuchsia-200 bg-fuchsia-300/10", Scheduled: "text-violet-200 bg-violet-300/10", Posted: "text-emerald-200 bg-emerald-300/10" };
const stages = ["Idea", "To Record", "To Edit", "Ready", "Posted"];
const stageFilter = ["All", "Needs Action", "Scheduled", "Posted"];
const count = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString();

function planned(item: ContentItem) {
  if (!item.planned_date || item.is_placeholder_date) return null;
  return `${item.planned_date}${item.planned_time ? ` · ${item.planned_time}` : ""}`;
}

const categoryColors: Record<string, string> = { SHORT: "#67D9FF", LONG: "#B99AFF", ALBUM: "#FF83C8", MUSIC: "#7EE0B5" };
const songColors = ["#FF8BC4", "#76D8FF", "#B99AFF", "#FFC66D", "#7EE0B5", "#FF9A7A"];
function songColor(name: string) {
  let hash = 0;
  for (const char of name.toUpperCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return songColors[Math.abs(hash) % songColors.length];
}

export default function ContentLibrary({ songId: scopedSongId }: { songId?: string }) {
  const [items, setItems] = useState<ContentItem[]>([]), [songs, setSongs] = useState<CatalogSong[]>([]), [metrics, setMetrics] = useState<Metrics>(blankMetrics);
  const [total, setTotal] = useState(0), [page, setPage] = useState(1), [pageSize] = useState(50), [type, setType] = useState(""), [filter, setFilter] = useState("All"), [query, setQuery] = useState("");
  const [view, setView] = useState<"List" | "Board">("List"), [loading, setLoading] = useState(true), [busyId, setBusyId] = useState<string | null>(null), [error, setError] = useState(""), [panelItem, setPanelItem] = useState<ContentItem | null | undefined>(undefined);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => { if (!scopedSongId) { const params = new URLSearchParams(window.location.search); setQuery(params.get("q") || ""); } }, [scopedSongId]);
  useEffect(() => { setPage(1); }, [scopedSongId, type, filter, query]);
  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(requestedPage), pageSize: String(pageSize), sort: scopedSongId ? "workflow_priority" : "canonical_song_title", direction: "asc" });
    if (scopedSongId) params.set("songId", scopedSongId);
    if (type) params.set("type", type);
    if (query.trim()) params.set("q", query.trim());
    if (filter !== "All") params.set("workflow", filter);
    const response = await fetch(`/api/admin/content-items?${params}`, { cache: "no-store" }), body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to load content."); setLoading(false); return; }
    const result = body as Payload; setItems(result.items || []); setTotal(result.total || 0); setMetrics(result.metrics || blankMetrics); setSongs(result.songs || []); setTypes(result.types || []); setLoading(false);
  }, [page, pageSize, scopedSongId, type, filter, query]);
  useEffect(() => { void load(page); }, [load, page]);

  async function toggleStatus(item: ContentItem, key: "recorded" | "edited" | "post_ready" | "published") {
    if (item.music_video_project_id || busyId === item.id) return;
    setBusyId(item.id); setError("");
    const response = await fetch("/api/admin/content-items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, [key]: !item[key] }) });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setError(body.error || "Unable to update content status."); return; }
    setItems(current => current.map(row => row.id === item.id ? body.item : row));
    void fetch(`/api/admin/content-items?page=${page}&pageSize=${pageSize}${scopedSongId ? `&songId=${scopedSongId}` : ""}`, { cache: "no-store" }).then(r => r.json()).then(data => { if (data.metrics) setMetrics(data.metrics); });
  }

  const actionable = (metrics.toRecord || 0) + (metrics.toEdit || 0) + (metrics.ready || 0);
  const summary = `${count(metrics.posted)} of ${count(metrics.total)} posted · ${actionable.toLocaleString()} need attention`;
  const filterItems = items;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const statusActions = [
    { key: "recorded" as const, label: "Record", color: "text-sky-300", icon: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3m-4 0h8"/></> },
    { key: "edited" as const, label: "Edit", color: "text-violet-300", icon: <><path d="m15 5 4 4M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/><path d="M13.5 6.5 17.5 10.5"/></> },
    { key: "post_ready" as const, label: "Ready", color: "text-fuchsia-300", icon: <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></> },
    { key: "published" as const, label: "Posted", color: "text-emerald-300", icon: <><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></> },
  ];
  const row = (item: ContentItem, compact = false) => {
    const song = item.canonical_song_title || item.song_name || "";
    const category = item.category || "";
    return <article key={item.id} className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[.07] px-3 py-3 last:border-0 hover:bg-white/[.025] sm:px-4 ${!scopedSongId && !compact ? "lg:grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(7rem,.7fr)_8rem_8rem_auto_1rem]" : "lg:flex"}`}>
    <button type="button" onClick={() => item.music_video_project_id ? window.location.assign(`/admin/music-videos/${item.music_video_project_id}`) : setPanelItem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      {item.media_url && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(item.media_url) ? <img src={item.media_url} alt="" className="h-10 w-10 shrink-0 rounded-md border border-white/10 object-cover"/> : <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-md border border-white/[.08] bg-white/[.025]"/>}
      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white group-hover:text-[#ff9dcd]">{item.title}</span><span className="mt-1 block truncate text-xs text-white/40">{[item.media_type, item.sub_category].filter(Boolean).join(" · ") || "Uncategorized"}</span>{!scopedSongId && <span className="mt-1 block truncate text-xs lg:hidden" style={{ color: song ? songColor(song) : "rgba(255,255,255,.45)" }}>{song || "Unassigned"}{category ? ` · ${category}` : ""}</span>}</span>
    </button>
    {!scopedSongId && <span className="hidden min-w-0 truncate text-sm font-semibold lg:block" style={{ color: song ? songColor(song) : "rgba(255,255,255,.4)" }} title={song || "Unassigned"}>{song || "—"}</span>}
    {!scopedSongId && <span className="hidden min-w-0 truncate text-xs font-bold uppercase tracking-wide lg:block" style={{ color: categoryColors[category.toUpperCase()] || "#86B9FF" }} title={category || "Uncategorized"}>{category || "—"}</span>}
    <span className="hidden min-w-24 text-right text-xs text-white/40 sm:block">{item.is_placeholder_date ? "Unscheduled" : planned(item) || ""}</span>
    <span className={`hidden rounded-full px-2.5 py-1 text-[.65rem] font-semibold sm:inline-flex ${statusStyles[item.workflow_status] || "text-violet-200 bg-violet-300/10"}`}>{item.workflow_status === "Ready" ? "Ready to Post" : item.workflow_status}</span>
    <div role="group" className="flex shrink-0 items-center gap-1" aria-label={`Content status for ${item.title}`} onClick={event => event.stopPropagation()}>{statusActions.map(action => { const active = Boolean(item[action.key]); return <button key={action.key} type="button" aria-label={`${action.label}: ${active ? "complete" : "incomplete"} for ${item.title}`} aria-pressed={active} title={`${action.label}${active ? " complete" : " not complete"}${item.music_video_project_id ? " · Update in Music Video workspace" : ""}`} disabled={busyId === item.id || Boolean(item.music_video_project_id)} onClick={() => void toggleStatus(item, action.key)} className={`grid h-9 w-9 place-items-center rounded-md transition hover:bg-white/[.07] disabled:cursor-not-allowed ${active ? action.color : "text-white/25 hover:text-white/65"}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{action.icon}</svg></button>; })}</div>
    <button type="button" aria-label={`Open ${item.title}`} onClick={() => setPanelItem(item)} className="text-white/30 hover:text-white">›</button>
    </article>;
  };

  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h1 className="text-2xl font-black">Content</h1><p className="mt-1 text-xs text-white/45">{scopedSongId ? "Content linked to this song" : summary}</p></div><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">+ Add Content</button></header>
    {!scopedSongId && <><div className="flex flex-wrap items-center gap-2 text-xs text-white/45">{[["Planned", metrics.total], ["Recorded", metrics.recorded], ["Edited", metrics.edited], ["Posted", metrics.posted]].map(([label, value]) => <span key={String(label)} className="rounded-md border border-white/[.08] px-2.5 py-1.5"><b className="mr-1.5 text-white">{count(value as number | null)}</b>{label}</span>)}<span className="ml-auto">{count(metrics.posted)} / {count(metrics.total)} posted</span></div><div role="progressbar" aria-label="Published content progress" aria-valuemin={0} aria-valuemax={metrics.total || 0} aria-valuenow={metrics.posted || 0} className="h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[#FD52AF]" style={{ width: `${metrics.total ? Math.min(100, Math.round((metrics.posted || 0) / metrics.total * 100)) : 0}%` }}/></div></>}
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}
    <div className="flex flex-wrap items-center gap-2"><div className="flex gap-1 rounded-lg border border-white/[.08] p-1">{stageFilter.map(value => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-white/[.1] text-white" : "text-white/45 hover:text-white"}`}>{value}</button>)}</div><select value={type} onChange={event => setType(event.target.value)} aria-label="Filter content type" className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-xs text-white/65"><option value="">All types</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search content or song" aria-label="Search content" className="min-w-[150px] flex-1 rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#FD52AF]/40"/><div className="ml-auto flex rounded-lg border border-white/[.08] p-1">{(["List", "Board"] as const).map(value => <button key={value} onClick={() => setView(value)} aria-pressed={view === value} className={`rounded-md px-3 py-1.5 text-xs ${view === value ? "bg-white/[.1] text-white" : "text-white/45"}`}>{value}</button>)}</div></div>
    {loading ? <p className="py-12 text-center text-sm text-white/40">Loading content…</p> : view === "List" ? <div className="overflow-hidden rounded-xl border border-white/[.08] bg-[#111116]">{!scopedSongId && <div className="hidden grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(7rem,.7fr)_8rem_8rem_auto_1rem] gap-3 border-b border-white/[.08] px-4 py-3 text-[.65rem] font-bold uppercase tracking-[.12em] text-white/35 lg:grid"><span>Content</span><span>Song</span><span>Category</span><span className="text-right">Schedule</span><span>Status</span><span>Progress</span><span/> </div>}{filterItems.length ? filterItems.map(item => row(item)) : <p className="p-10 text-center text-sm text-white/40">No content in this view.</p>}</div> : <div className="flex gap-3 overflow-x-auto pb-2">{[...stages, "Music Video"].map(status => <section key={status} className="w-[min(82vw,300px)] shrink-0 rounded-xl border border-white/[.08] bg-[#111116]"><header className="sticky top-0 flex items-center justify-between rounded-t-xl border-b border-white/[.07] bg-[#111116] px-3 py-3"><h2 className="text-sm font-semibold">{status === "Ready" ? "Ready to Post" : status}</h2><span className="text-xs text-white/40">{filterItems.filter(item => status === "Music Video" ? !!item.music_video_project_id : !item.music_video_project_id && (item.workflow_status === status || status === "Ready" && item.workflow_status === "Scheduled")).length}</span></header>{filterItems.filter(item => status === "Music Video" ? !!item.music_video_project_id : !item.music_video_project_id && (item.workflow_status === status || status === "Ready" && item.workflow_status === "Scheduled")).map(item => <div key={item.id} className="px-2">{row(item, true)}</div>)}</section>)}</div>}
    <footer className="flex items-center justify-between text-xs text-white/40"><span>{total.toLocaleString()} items · page {page} of {maxPage}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)} className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><button disabled={page >= maxPage || loading} onClick={() => setPage(n => n + 1)} className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div></footer>
    {panelItem !== undefined && <ContentDetailPanel item={panelItem} songs={songs} initialSongId={scopedSongId || null} onClose={() => setPanelItem(undefined)} onSaved={() => { setPanelItem(undefined); void load(page); }}/ >}
  </section>;
}
