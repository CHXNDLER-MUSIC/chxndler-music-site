"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ContentDetailPanel, { type CatalogSong, type ContentItem } from "@/components/admin/ContentDetailPanel";

type Summary = { total: number; recorded: number; edited: number; posted: number; formats: Array<{ name: string; count: number }> };
const emptySummary: Summary = { total: 0, recorded: 0, edited: 0, posted: 0, formats: [] };
const percent = (value: number, total: number) => total ? Math.min(100, Math.round(value / total * 100)) : 0;

export default function SongContent({ songId, songTitle }: { songId: string; songTitle: string; releaseDate?: string | null }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState("");
  const [panelItem, setPanelItem] = useState<ContentItem | null | undefined>(undefined);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setMoreLoading(true); else setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/content-items?songId=${encodeURIComponent(songId)}&page=${nextPage}&pageSize=50`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to load this song’s content."); setLoading(false); setMoreLoading(false); return; }
    setItems(current => append ? [...current, ...(body.items || [])] : body.items || []);
    setSummary(body.songSummary || emptySummary); setSongs(body.songs || []); setTotal(body.total || 0); setPage(nextPage);
    setLoading(false); setMoreLoading(false);
  }, [songId]);
  useEffect(() => { void load(1); }, [load]);

  const openRequestedItem = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("content");
    if (!requested || !items.length) return;
    const item = items.find(row => row.id === requested);
    if (item) { setPanelItem(item); params.delete("content"); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }
  }, [items]);
  useEffect(openRequestedItem, [openRequestedItem]);

  const postedProgress = percent(summary.posted, summary.total);
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="font-bold">Content</h2><p className="mt-1 text-xs text-white/45">Content items connected to {songTitle}</p></div><Link href={`/admin?view=content&song=${encodeURIComponent(songId)}`} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-white/65 hover:border-violet-300/35 hover:text-white">View All Content ↗</Link><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">+ Add Content</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.05] p-3 text-sm text-red-200">{error}</p>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Total content", summary.total, "#c084fc"], ["Recorded", summary.recorded, "#38bdf8"], ["Edited", summary.edited, "#fbbf24"], ["Posted", summary.posted, "#34d399"]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border px-3 py-3" style={{borderColor:`${color}35`,background:`linear-gradient(145deg, ${color}16, #111116 72%)`}}><p className="text-[.65rem]" style={{color:`${color}bb`}}>{label}</p><p className="mt-1 text-xl font-black tabular-nums" style={{color}}>{loading ? "—" : value}</p></div>)}</div>
    <section className="rounded-xl border border-white/[.08] bg-[#111116] p-3 sm:p-4"><div className="mb-2 flex items-center justify-between text-[.68rem]"><span className="font-semibold text-emerald-200">Posted progress</span><span className="tabular-nums text-white/50">{summary.posted} / {summary.total} · {postedProgress}%</span></div><div role="progressbar" aria-label="Posted content progress" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.posted} className="h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[#FD52AF] transition-[width]" style={{ width: `${postedProgress}%` }}/></div></section>
    {summary.formats.length > 0 && <section className="rounded-xl border border-white/[.08] bg-[#111116] p-3 sm:p-4"><h3 className="text-[.65rem] font-bold uppercase tracking-[.15em] text-white/45">Content formats</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{summary.formats.map(format => <div key={format.name} className="min-w-0"><div className="mb-1 flex justify-between gap-2 text-[.68rem]"><span className="truncate text-white/65">{format.name}</span><span className="shrink-0 tabular-nums text-white/40">{format.count}</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-violet-300/60" style={{ width: `${percent(format.count, summary.total)}%` }}/></div></div>)}</div></section>}
    {loading ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/40">Loading content…</p> : items.length ? <div className="space-y-2">{items.map(item => <button type="button" key={item.id} onClick={() => setPanelItem(item)} className="flex w-full items-center gap-3 rounded-xl border border-white/[.08] bg-[#111116] p-3 text-left transition hover:border-[#FD52AF]/30 sm:p-3.5"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{item.title}</span><span className="mt-1 block truncate text-[.68rem] text-white/40">{[item.media_type, item.sub_category, item.category].filter(Boolean).join(" · ") || "Other / uncategorized"}</span></span><span className="hidden items-center gap-2 text-[.6rem] text-white/40 sm:flex">R{item.recorded ? "✓" : "–"} · E{item.edited ? "✓" : "–"} · P{item.post_ready ? "✓" : "–"}</span><span className="shrink-0"><span className="block rounded-full bg-white/[.06] px-2.5 py-1 text-[.62rem] font-semibold text-white/65">{item.workflow_status}</span>{item.planned_date && <span className={`mt-1 block text-right text-[.6rem] ${item.is_placeholder_date ? "text-amber-200/55" : "text-white/35"}`}>{item.planned_date}{item.is_placeholder_date ? " · placeholder" : ""}</span>}</span></button>)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><p className="text-sm font-semibold text-white/75">No content linked to this song yet</p><p className="mt-1 text-xs text-white/40">New items will also appear in the main Content library.</p></div>}
    {items.length < total && <button type="button" onClick={() => void load(page + 1, true)} disabled={moreLoading} className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/55 hover:text-white disabled:opacity-40">{moreLoading ? "Loading…" : `Load more (${items.length} of ${total})`}</button>}
    {panelItem !== undefined && <ContentDetailPanel item={panelItem} songs={songs} initialSongId={songId} onClose={() => setPanelItem(undefined)} onSaved={() => { setPanelItem(undefined); void load(1); }}/ >}
  </section>;
}
