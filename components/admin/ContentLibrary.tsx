"use client";

import { useCallback, useEffect, useState } from "react";
import ContentDetailPanel, { type CatalogSong, type ContentItem } from "@/components/admin/ContentDetailPanel";
import { songCoverPath } from "@/lib/songCover";
import { sfx } from "@/lib/sfx";

type Metrics = { total: number | null; recorded?: number | null; edited?: number | null; toRecord: number | null; toEdit: number | null; ready: number | null; scheduled: number | null; posted: number | null };
type Payload = { items: ContentItem[]; total: number; page: number; pageSize: number; metrics: Metrics; songs: CatalogSong[]; categories: string[]; types: string[] };
const blankMetrics: Metrics = { total: 0, toRecord: 0, toEdit: 0, ready: 0, scheduled: 0, posted: 0 };
const statusStyles: Record<string, string> = { Idea: "text-white/55 bg-white/[.06]", "To Record": "text-sky-200 bg-sky-300/10", "To Edit": "text-amber-200 bg-amber-300/10", Ready: "text-fuchsia-200 bg-fuchsia-300/10", Scheduled: "text-violet-200 bg-violet-300/10", Posted: "text-emerald-200 bg-emerald-300/10" };
const stages = ["Idea", "To Record", "To Edit", "Ready", "Posted"];
const stageFilter = ["All", "Needs Action", "Scheduled", "Posted"];
const count = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString();

function planned(item: ContentItem) {
  if (item.published && item.published_at) return item.published_at.slice(0, 10);
  if (item.planned_date && !item.is_placeholder_date) return `${item.planned_date}${item.planned_time ? ` · ${item.planned_time}` : ""}`;
  return item.legacy_date_time?.trim() || null;
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
  const [total, setTotal] = useState(0), [page, setPage] = useState(1), [pageSize] = useState(50), [type, setType] = useState(""), [category, setCategory] = useState(""), [filter, setFilter] = useState("All"), [query, setQuery] = useState("");
  const [metricFilter, setMetricFilter] = useState<"" | "recorded" | "edited" | "posted">("");
  const [view, setView] = useState<"List" | "Board">("List"), [loading, setLoading] = useState(true), [busyId, setBusyId] = useState<string | null>(null), [error, setError] = useState(""), [panelItem, setPanelItem] = useState<ContentItem | null | undefined>(undefined);
  const [types, setTypes] = useState<string[]>([]), [categories, setCategories] = useState<string[]>([]);

  useEffect(() => { if (!scopedSongId) { const params = new URLSearchParams(window.location.search); setQuery(params.get("q") || ""); } }, [scopedSongId]);
  useEffect(() => { setPage(1); }, [scopedSongId, type, category, filter, query, metricFilter]);
  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(requestedPage), pageSize: String(pageSize), sort: scopedSongId ? "workflow_priority" : "canonical_song_title", direction: "asc" });
    if (scopedSongId) params.set("songId", scopedSongId);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    if (filter !== "All") params.set("workflow", filter);
    if (metricFilter === "recorded" || metricFilter === "edited") params.set(metricFilter, "true");
    if (metricFilter === "posted") params.set("published", "true");
    const response = await fetch(`/api/admin/content-items?${params}`, { cache: "no-store" }), body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to load content."); setLoading(false); return; }
    const result = body as Payload; setItems(result.items || []); setTotal(result.total || 0); setMetrics(result.metrics || blankMetrics); setSongs(result.songs || []); setTypes(result.types || []); setCategories(result.categories || []); setLoading(false);
  }, [page, pageSize, scopedSongId, type, category, filter, query, metricFilter]);
  useEffect(() => { void load(page); }, [load, page]);

  async function toggleStatus(item: ContentItem, key: "recorded" | "edited" | "post_ready" | "published") {
    if (busyId === item.id) return;
    const updatedValue = !item[key];
    sfx.play(updatedValue ? "select" : "click", 0.35);
    setBusyId(item.id); setError("");
    setItems(current => current.map(row => row.id === item.id ? { ...row, [key]: updatedValue } : row));
    const response = await fetch("/api/admin/content-items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, [key]: updatedValue }) });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setItems(current => current.map(row => row.id === item.id ? { ...row, [key]: item[key] } : row)); setError(body.error || "Unable to update content status."); return; }
    setItems(current => current.map(row => row.id === item.id ? body.item : row));
    void fetch(`/api/admin/content-items?page=${page}&pageSize=${pageSize}${scopedSongId ? `&songId=${scopedSongId}` : ""}`, { cache: "no-store" }).then(r => r.json()).then(data => { if (data.metrics) setMetrics(data.metrics); });
  }

  const actionable = (metrics.toRecord || 0) + (metrics.toEdit || 0) + (metrics.ready || 0);
  const summary = `${count(metrics.posted)} of ${count(metrics.total)} Posted · ${actionable.toLocaleString()} Need Attention`;
  const filterItems = items;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const statusActions = [
    { key: "recorded" as const, label: "Record", color: "text-sky-300", icon: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></> },
    { key: "edited" as const, label: "Edit", color: "text-violet-300", icon: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></> },
    { key: "published" as const, label: "Posted", color: "text-emerald-300", icon: <><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></> },
  ];
  const row = (item: ContentItem, compact = false) => {
    const song = item.canonical_song_title || item.song_name || "";
    const linkedSong = songs.find(candidate => candidate.id === item.song_id) || songs.find(candidate => candidate.title.toLowerCase() === song.toLowerCase());
    const cover = linkedSong ? songCoverPath(linkedSong.slug, linkedSong.title) : item.media_url && /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(item.media_url) ? item.media_url : null;
    const category = item.category || "";
    return <article key={item.id} className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[.07] px-3 py-3 last:border-0 hover:bg-white/[.025] sm:px-4 ${!scopedSongId && !compact ? "lg:grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(7rem,.7fr)_8rem_8rem_auto_1rem]" : "lg:flex"}`}>
    <button type="button" onClick={() => item.music_video_project_id ? window.location.assign(`/admin/music-videos/${item.music_video_project_id}`) : setPanelItem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      {cover ? <img src={cover} alt="" className="h-10 w-10 shrink-0 rounded-md border border-white/10 object-cover"/> : <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-md border border-white/[.08] bg-white/[.025]"/>}
      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white group-hover:text-[#ff9dcd]">{item.title}</span><span className="mt-1 block truncate text-xs text-white/40">{[item.media_type, item.sub_category].filter(Boolean).join(" · ") || "Uncategorized"}</span>{!scopedSongId && <span className="mt-1 block truncate text-xs lg:hidden" style={{ color: song ? songColor(song) : "rgba(255,255,255,.45)" }}>{song || "Unassigned"}{category ? ` · ${category}` : ""}</span>}</span>
    </button>
    {!scopedSongId && <span className="hidden min-w-0 truncate text-sm font-semibold lg:block" style={{ color: song ? songColor(song) : "rgba(255,255,255,.4)" }} title={song || "Unassigned"}>{song || "—"}</span>}
    {!scopedSongId && <button type="button" onClick={() => setPanelItem(item)} aria-label={`Edit category for ${item.title}`} className="hidden min-w-0 truncate text-left text-xs font-bold uppercase tracking-wide hover:underline lg:flex lg:items-center lg:gap-2" style={{ color: categoryColors[category.toUpperCase()] || "#86B9FF" }} title="Click to edit category">{category && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">{category.toLowerCase().includes("live") ? <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></> : category.toLowerCase().includes("video") ? <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></> : <><circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/></>}</svg>}{category || "—"}</button>}
    <span className="hidden min-w-24 text-right text-xs text-white/40 sm:block">{planned(item) || (item.is_placeholder_date ? "Unscheduled" : "")}</span>
    <span className={`hidden w-fit max-w-full justify-self-start rounded-full px-2.5 py-1 text-[.65rem] font-semibold sm:inline-flex ${statusStyles[item.workflow_status] || "text-violet-200 bg-violet-300/10"}`}>{item.workflow_status === "Ready" ? "Ready to Post" : item.workflow_status}</span>
    <div role="group" className="flex shrink-0 items-center gap-1" aria-label={`Content status for ${item.title}`} onClick={event => event.stopPropagation()}>{statusActions.map(action => { const active = Boolean(item[action.key]); return <button key={action.key} type="button" aria-label={`${action.label}: ${active ? "complete" : "incomplete"} for ${item.title}`} aria-pressed={active} disabled={busyId === item.id} onClick={() => void toggleStatus(item, action.key)} className={`grid h-9 w-9 place-items-center rounded-md transition hover:bg-white/[.07] disabled:cursor-wait disabled:opacity-60 ${active ? action.color : "text-white/25 hover:text-white/65"}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{action.icon}</svg></button>; })}</div>
    <button type="button" aria-label={`Open ${item.title}`} onClick={() => setPanelItem(item)} className="text-white/30 hover:text-white">›</button>
    </article>;
  };

  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h1 className="text-2xl font-black">Content</h1><p className="mt-1 text-xs text-white/45">{scopedSongId ? "Content linked to this song" : summary}</p></div><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">+ Add Content</button></header>
    {!scopedSongId && <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{[["Planned", metrics.total, "#86B9FF", ""], ["Recorded", metrics.recorded, "#54D6B0", "recorded"], ["Edited", metrics.edited, "#B99AFF", "edited"], ["Posted", metrics.posted, "#FD52AF", "posted"]].map(([label, value, color, key]) => <button key={String(label)} type="button" aria-pressed={metricFilter === key && (key !== "" || filter === "All")} onClick={() => { setFilter("All"); setMetricFilter(key as "" | "recorded" | "edited" | "posted"); }} className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:px-5 sm:py-3.5" style={{ borderColor: `${color}44`, backgroundColor: `${color}0D`, color: String(color) }}><b className="text-2xl font-black leading-none sm:text-3xl">{count(value as number | null)}</b><span className="text-xs font-bold uppercase tracking-[.12em] sm:text-sm">{label}</span></button>)}<span className="col-span-2 self-center text-right text-xs font-semibold uppercase tracking-wide text-white/45 sm:col-span-4">{count(metrics.posted)} / {count(metrics.total)} Posted</span></div><div role="progressbar" aria-label="Published content progress" aria-valuemin={0} aria-valuemax={metrics.total || 0} aria-valuenow={metrics.posted || 0} className="h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[#FD52AF]" style={{ width: `${metrics.total ? Math.min(100, Math.round((metrics.posted || 0) / metrics.total * 100)) : 0}%` }}/></div></>}
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}
    <div className="flex flex-wrap items-center gap-2"><div className="flex gap-1 rounded-lg border border-white/[.08] p-1">{stageFilter.map(value => <button key={value} type="button" onClick={() => { setFilter(value); setMetricFilter(""); }} aria-pressed={filter === value && !metricFilter} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === value && !metricFilter ? "bg-white/[.1] text-white" : "text-white/45 hover:text-white"}`}>{value}</button>)}</div><select value={type} onChange={event => setType(event.target.value)} aria-label="Filter content type" className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-xs text-white/65"><option value="">All types</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search content or song" aria-label="Search content" className="min-w-[150px] flex-1 rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#FD52AF]/40"/><div className="ml-auto flex rounded-lg border border-white/[.08] p-1">{(["List", "Board"] as const).map(value => <button key={value} onClick={() => setView(value)} aria-pressed={view === value} className={`rounded-md px-3 py-1.5 text-xs ${view === value ? "bg-white/[.1] text-white" : "text-white/45"}`}>{value}</button>)}</div></div>
    {loading ? <p className="py-12 text-center text-sm text-white/40">Loading content…</p> : view === "List" ? <div className="overflow-hidden rounded-xl border border-white/[.08] bg-[#111116]">{!scopedSongId && <div className="hidden grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(7rem,.7fr)_8rem_8rem_auto_1rem] gap-3 border-b border-white/[.08] px-4 py-3 text-[.65rem] font-bold uppercase tracking-[.12em] text-white/35 lg:grid"><span>Content</span><span>Song</span><select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)} className="w-full cursor-pointer appearance-none bg-transparent font-bold uppercase tracking-[.12em] text-white/45 outline-none"><option value="">Category · All</option>{categories.map(value => <option key={value} value={value} className="bg-[#111116]">Category · {value}</option>)}</select><span className="text-right">Schedule</span><span>Status</span><span>Progress</span><span/> </div>}{filterItems.length ? filterItems.map(item => row(item)) : <p className="p-10 text-center text-sm text-white/40">No content in this view.</p>}</div> : <div className="flex gap-3 overflow-x-auto pb-2">{[...stages, "Music Video"].map(status => <section key={status} className="w-[min(82vw,300px)] shrink-0 rounded-xl border border-white/[.08] bg-[#111116]"><header className="sticky top-0 flex items-center justify-between rounded-t-xl border-b border-white/[.07] bg-[#111116] px-3 py-3"><h2 className="text-sm font-semibold">{status === "Ready" ? "Ready to Post" : status}</h2><span className="text-xs text-white/40">{filterItems.filter(item => status === "Music Video" ? !!item.music_video_project_id : !item.music_video_project_id && (item.workflow_status === status || status === "Ready" && item.workflow_status === "Scheduled")).length}</span></header>{filterItems.filter(item => status === "Music Video" ? !!item.music_video_project_id : !item.music_video_project_id && (item.workflow_status === status || status === "Ready" && item.workflow_status === "Scheduled")).map(item => <div key={item.id} className="px-2">{row(item, true)}</div>)}</section>)}</div>}
    <footer className="flex items-center justify-between text-xs text-white/40"><span>{total.toLocaleString()} items · page {page} of {maxPage}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage(n => n - 1)} className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><button disabled={page >= maxPage || loading} onClick={() => setPage(n => n + 1)} className="rounded-md border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div></footer>
    {panelItem !== undefined && <ContentDetailPanel item={panelItem} songs={songs} initialSongId={scopedSongId || null} onClose={() => setPanelItem(undefined)} onSaved={() => { setPanelItem(undefined); void load(page); }}/ >}
  </section>;
}
