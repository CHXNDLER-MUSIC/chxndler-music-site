"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ContentDetailPanel, { type CatalogSong, type ContentItem } from "@/components/admin/ContentDetailPanel";

type Metrics = { total: number | null; toRecord: number | null; toEdit: number | null; ready: number | null; scheduled: number | null; posted: number | null };
type ResponseData = { items: ContentItem[]; total: number; page: number; pageSize: number; metrics: Metrics; songs: CatalogSong[]; categories: string[]; types: string[]; suggestions?: { titles: string[]; songs: string[]; categories: string[]; subCategories: string[]; types: string[]; dates: string[] } };
const workflows = ["All", "To Record", "To Edit", "Ready", "Scheduled", "Posted", "Idea"];
const blankMetrics: Metrics = { total: 0, toRecord: 0, toEdit: 0, ready: 0, scheduled: 0, posted: 0 };

function Status({ status }: { status: string }) {
  const styles: Record<string, string> = { Posted: "bg-emerald-300/10 text-emerald-200", Scheduled: "bg-sky-300/10 text-sky-200", Ready: "bg-violet-300/10 text-violet-200", "To Edit": "bg-amber-300/10 text-amber-200", "To Record": "bg-[#FD52AF]/10 text-[#ff9dcd]", Idea: "bg-white/[.06] text-white/50" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[.65rem] font-semibold ${styles[status] || styles.Idea}`}>{status}</span>;
}

function ProgressCheck({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="inline-flex cursor-pointer items-center justify-center p-1" title={`${label}: ${checked ? "complete" : "incomplete"}`} onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`${label} complete`} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="h-4 w-4 cursor-pointer accent-[#FD52AF] disabled:cursor-wait"/></label>;
}

function dateLabel(item: ContentItem) {
  if (!item.planned_date) return "—";
  return <span className={item.is_placeholder_date ? "text-amber-200/65" : "text-white/65"}>{item.planned_date}{item.is_placeholder_date && <small className="ml-1">placeholder</small>}</span>;
}

export default function ContentLibrary({ songId: scopedSongId }: { songId?: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<NonNullable<ResponseData["suggestions"]>>({ titles: [], songs: [], categories: [], subCategories: [], types: [], dates: [] });
  const [metrics, setMetrics] = useState<Metrics>(blankMetrics);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [songFilter, setSongFilter] = useState(scopedSongId || "");
  const [songNameFilter, setSongNameFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [workflow, setWorkflow] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState("");
  const [editFilter, setEditFilter] = useState("");
  const [postFilter, setPostFilter] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("planned_date");
  const [direction, setDirection] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [panelItem, setPanelItem] = useState<ContentItem | null | undefined>(undefined);

  useEffect(() => {
    if (scopedSongId) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSong = params.get("songId") || params.get("song");
    if (requestedSong) setSongFilter(requestedSong);
  }, [scopedSongId]);
  useEffect(() => { setPage(1); }, [songFilter, songNameFilter, titleFilter, categoryFilter, subCategoryFilter, typeFilter, workflow, dateFilter, recordFilter, editFilter, postFilter, sort, direction]);

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(requestedPage), pageSize: String(pageSize), sort, direction });
    if (songFilter) params.set("songId", songFilter);
    if (songNameFilter) params.set("songName", songNameFilter);
    if (titleFilter) params.set("title", titleFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (subCategoryFilter) params.set("subCategory", subCategoryFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (workflow !== "All") params.set("workflow", workflow);
    if (dateFilter) params.set("plannedDate", dateFilter);
    if (recordFilter) params.set("recorded", recordFilter);
    if (editFilter) params.set("edited", editFilter);
    if (postFilter) params.set("post_ready", postFilter);
    const response = await fetch(`/api/admin/content-items?${params}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to load content."); setLoading(false); return; }
    const result = body as ResponseData;
    setItems(result.items || []); setTotal(result.total || 0); setMetrics(result.metrics || blankMetrics);
    setSongs(result.songs || []); setCategories(result.categories || []); setTypes(result.types || []); setSuggestions(result.suggestions || { titles: [], songs: [], categories: [], subCategories: [], types: [], dates: [] }); setLoading(false);
  }, [page, pageSize, sort, direction, songFilter, songNameFilter, titleFilter, categoryFilter, subCategoryFilter, typeFilter, workflow, dateFilter, recordFilter, editFilter, postFilter]);

  useEffect(() => { void load(page); }, [load]);

  const currentSong = useMemo(() => songs.find(song => song.id === songFilter), [songs, songFilter]);
  const toggleSort = (key: string) => { if (sort === key) setDirection(value => value === "asc" ? "desc" : "asc"); else { setSort(key); setDirection("asc"); } };
  const saveItem = async (item: ContentItem) => { setPanelItem(undefined); await load(page); };
  async function toggle(item: ContentItem, field: "recorded" | "edited" | "post_ready", value: boolean) {
    setBusyId(item.id); setError("");
    const response = await fetch("/api/admin/content-items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, [field]: value }) });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setError(body.error || "Unable to update this item."); return; }
    setItems(current => current.map(row => row.id === item.id ? body.item : row));
    const summary = await fetch(`/api/admin/content-items?page=${page}&pageSize=${pageSize}${songFilter ? `&songId=${songFilter}` : ""}`, { cache: "no-store" }).then(result => result.json());
    if (summary.metrics) setMetrics(summary.metrics);
  }

  const clearFilters = () => { if (!scopedSongId) setSongFilter(""); setSongNameFilter(""); setTitleFilter(""); setCategoryFilter(""); setSubCategoryFilter(""); setTypeFilter(""); setWorkflow("All"); setDateFilter(""); setRecordFilter(""); setEditFilter(""); setPostFilter(""); setSort("planned_date"); setDirection("asc"); setOpenFilter(null); setPage(1); };
  const headerInput = "mt-2 w-full rounded-md border border-white/10 bg-[#101014] px-2 py-1.5 text-[.7rem] font-normal normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-violet-300/40";
  const headerFilter = (key: string) => {
    if (openFilter !== key) return null;
    const textInput = (value: string, onChange: (value: string) => void, listId: string, options: string[], placeholder = "Filter") => <><input autoFocus value={value} onChange={event => onChange(event.target.value)} list={listId} placeholder={placeholder} aria-label={`Filter ${key}`} className={headerInput}/><datalist id={listId}>{options.map(option => <option key={option} value={option}/>)}</datalist></>;
    const boolInput = (label: string, value: string, onChange: (value: string) => void) => <div className="mt-2 flex gap-1 normal-case tracking-normal">{[{value:"",text:"All"},{value:"true",text:"✓ Yes"},{value:"false",text:"✕ No"}].map(option=><button key={option.value||"all"} type="button" aria-pressed={value===option.value} onClick={()=>onChange(option.value)} className={`rounded-md border px-2 py-1 text-[.65rem] ${value===option.value?"border-[#FD52AF]/40 bg-[#FD52AF]/10 text-[#ff9dcd]":"border-white/10 text-white/55 hover:text-white"}`} aria-label={`${label}: ${option.value===""?"all":option.value==="true"?"yes":"no"}`}>{option.text}</button>)}</div>;
    if (key === "title") return textInput(titleFilter, setTitleFilter, "content-title-suggestions", suggestions.titles);
    if (key === "song_name") return textInput(songNameFilter, setSongNameFilter, "content-song-suggestions", suggestions.songs, "Filter song");
    if (key === "category") return <div className="space-y-1">{textInput(categoryFilter, setCategoryFilter, "content-category-suggestions", suggestions.categories, "Category")}{textInput(subCategoryFilter, setSubCategoryFilter, "content-subcategory-suggestions", suggestions.subCategories, "Sub-category")}</div>;
    if (key === "media_type") return textInput(typeFilter, setTypeFilter, "content-type-suggestions", suggestions.types);
    if (key === "workflow_status") return <select value={workflow} onChange={event=>setWorkflow(event.target.value)} aria-label="Filter workflow status" className={headerInput}><option value="All">All statuses</option>{workflows.filter(value=>value!=="All").map(value=><option key={value}>{value}</option>)}</select>;
    if (key === "recorded") return boolInput("Recorded", recordFilter, setRecordFilter);
    if (key === "edited") return boolInput("Edited", editFilter, setEditFilter);
    if (key === "post_ready") return boolInput("Posted", postFilter, setPostFilter);
    if (key === "planned_date") return <input type="date" value={dateFilter} onChange={event=>setDateFilter(event.target.value)} aria-label="Filter planned date" className={headerInput}/>;
    return null;
  };
  const paginationCount = Math.max(1, Math.ceil(total / pageSize));
  const metricCards: Array<[string, number | null, string]> = [["Total Content", metrics.total, "text-white"], ["To Record", metrics.toRecord, "text-[#ff9dcd]"], ["To Edit", metrics.toEdit, "text-amber-200"], ["Published", metrics.posted, "text-emerald-200"]];
  const workflowCount: Record<string, number | null> = { "To Record": metrics.toRecord, "To Edit": metrics.toEdit, Ready: metrics.ready, Scheduled: metrics.scheduled, Posted: metrics.posted };

  return <section className="space-y-4">
    {!scopedSongId && <><header className="flex flex-wrap items-end gap-3"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.2em] text-violet-300">Publishing library</p><h1 className="mt-1 text-2xl font-black">Content</h1></div><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">+ Add Content</button></header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{metricCards.map(([label, count, color]) => <div key={label} className="rounded-xl border border-white/[.08] bg-[#111116] px-3 py-3"><p className="text-[.68rem] text-white/45">{label}</p><p className={`mt-1 text-xl font-black tabular-nums ${color}`}>{count ?? "—"}</p></div>)}</div>
    </>}
    {scopedSongId && <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.2em] text-violet-300">Song content</p><h2 className="text-xl font-black">{currentSong?.title || "Content"}</h2></div><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">+ Add Content</button></header>}

    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[.08] bg-[#111116] p-2">
      {workflows.map(value => <button key={value} type="button" onClick={() => setWorkflow(value)} aria-pressed={workflow === value} className={`rounded-full px-3 py-1.5 text-[.68rem] font-semibold transition ${workflow === value ? "bg-violet-300/15 text-violet-100" : "text-white/45 hover:bg-white/[.05] hover:text-white/75"}`}>{value}{value !== "All" && workflowCount[value] !== null ? <span className="ml-1.5 opacity-55">{workflowCount[value]}</span> : null}</button>)}
      <button type="button" onClick={clearFilters} className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:text-white">Reset filters</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}

    <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-[#111116] md:block">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead className="bg-[#17171c] text-[.6rem] uppercase tracking-wider text-white/40"><tr>
          {[["title", "Content title", "24%"], ["song_name", "Song", "16%"], ["category", "Category / sub-category", "16%"], ["media_type", "Type", "9%"], ["workflow_status", "Status", "10%"], ["recorded", "Rec", "4%"], ["edited", "Edit", "4%"], ["post_ready", "Post", "4%"], ["planned_date", "Planned date", "13%"]].map(([key, label, width]) => <th key={key} style={{ width }} className="px-2 py-3 font-bold sm:px-3"><button type="button" onClick={() => toggleSort(key)} className="text-left hover:text-white">{label}{sort === key ? <span className="ml-1">{direction === "asc" ? "↑" : "↓"}</span> : null}</button></th>)}
        </tr></thead>
        <tbody className="divide-y divide-white/[.055]">
          {items.map(item => <tr key={item.id} onClick={() => setPanelItem(item)} onKeyDown={event => { if (event.key === "Enter" && event.target === event.currentTarget) setPanelItem(item); }} tabIndex={0} className="cursor-pointer align-middle transition hover:bg-white/[.025] focus:bg-white/[.04]">
            <td className="px-2 py-3 sm:px-3"><button type="button" onClick={event => { event.stopPropagation(); setPanelItem(item); }} className="line-clamp-2 text-left text-xs font-semibold text-white hover:text-[#ff9dcd]">{item.title}{item.is_sample && <span className="ml-1 text-[.55rem] text-amber-200">sample</span>}</button></td>
            <td className="px-2 py-3 sm:px-3"><span className="block truncate text-xs text-white/65">{item.canonical_song_title || item.song_name || "Unlinked"}</span>{item.song_link_status === "unmatched" || item.song_link_status === "ambiguous" ? <span className="text-[.56rem] text-amber-200/70">{item.song_link_status} song</span> : null}</td>
            <td className="px-2 py-3 sm:px-3"><span className="block truncate text-xs text-white/65">{item.category || "—"}</span><span className="block truncate text-[.62rem] text-white/35">{item.sub_category || "—"}</span></td>
            <td className="px-2 py-3 text-xs text-white/55">{item.media_type || "—"}</td><td className="px-2 py-3"><Status status={item.workflow_status}/></td>
            <td className="px-2 py-3 text-center"><ProgressCheck label="Record" checked={item.recorded === true} disabled={busyId === item.id} onChange={value => void toggle(item, "recorded", value)}/></td>
            <td className="px-2 py-3 text-center"><ProgressCheck label="Edit" checked={item.edited === true} disabled={busyId === item.id} onChange={value => void toggle(item, "edited", value)}/></td>
            <td className="px-2 py-3 text-center"><ProgressCheck label="Post" checked={item.post_ready === true} disabled={busyId === item.id} onChange={value => void toggle(item, "post_ready", value)}/></td>
            <td className="px-2 py-3 text-xs text-white/55 sm:px-3">{dateLabel(item)}</td>
          </tr>)}
          {!loading && !items.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-white/40">No content matches this view.</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="space-y-2 md:hidden">
      {items.map(item => <article key={item.id} onClick={() => setPanelItem(item)} className="cursor-pointer rounded-xl border border-white/[.08] bg-[#111116] p-3 active:border-[#FD52AF]/30"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-bold text-white">{item.title}</h3><p className="mt-1 truncate text-xs text-white/50">{item.canonical_song_title || item.song_name || "Unlinked"} · {item.category || "Uncategorized"}</p></div><Status status={item.workflow_status}/></div><div className="mt-3 flex items-center gap-3 border-t border-white/[.06] pt-2"><span className="mr-auto text-[.65rem] text-white/40">{item.media_type || item.sub_category || "Other"} · {dateLabel(item)}</span><span className="flex items-center gap-1 text-[.6rem] text-white/40">R<ProgressCheck label="Record" checked={item.recorded === true} disabled={busyId === item.id} onChange={value => void toggle(item, "recorded", value)}/></span><span className="flex items-center gap-1 text-[.6rem] text-white/40">E<ProgressCheck label="Edit" checked={item.edited === true} disabled={busyId === item.id} onChange={value => void toggle(item, "edited", value)}/></span><span className="flex items-center gap-1 text-[.6rem] text-white/40">P<ProgressCheck label="Post" checked={item.post_ready === true} disabled={busyId === item.id} onChange={value => void toggle(item, "post_ready", value)}/></span></div></article>)}
      {!loading && !items.length && <p className="rounded-xl border border-white/10 bg-[#111116] px-4 py-12 text-center text-sm text-white/40">No content matches this view.</p>}
    </div>

    <footer className="flex items-center justify-between text-xs text-white/45"><span>{loading ? "Loading…" : `${total.toLocaleString()} items · Page ${page} of ${paginationCount}`}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Previous</button><button type="button" disabled={page >= paginationCount || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30">Next</button></div></footer>
    {panelItem !== undefined && <ContentDetailPanel item={panelItem} songs={songs} initialSongId={songFilter || null} onClose={() => setPanelItem(undefined)} onSaved={item => void saveItem(item)}/>}
  </section>;
}
