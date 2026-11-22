"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { ContentItem } from "@/components/admin/ContentDetailPanel";

type ChecklistItem = ContentItem & { content_order?: number | null; content_template_key?: string | null };
type MusicVideoProject = { id: string; status: string; workspace: Record<string, unknown>; next_action: string; assigned_videographer: Record<string, unknown> };
const categoryOrder = ["Music Video", "Live Performance", "Studio", "Performance", "Creative Locations", "Behind the Scenes", "Song Story", "Release"];
const categoryNames: Record<string, string> = { "Music Video": "Music Video", "Live Performance": "Live Performances", Studio: "Studio", Performance: "Performance / Lip-Sync", "Creative Locations": "Creative Locations", "Behind the Scenes": "Behind the Scenes", "Song Story": "Song Story / Meaning", Release: "Release" };

export default function SongContent({ songId, songTitle, artworkUrl, musicVideo, onCreateMusicVideo }: { songId: string; songTitle: string; artworkUrl?: string | null; musicVideo: MusicVideoProject | null; onCreateMusicVideo: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>([]), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [busyId, setBusyId] = useState<string | null>(null);
  const [panelItem, setPanelItem] = useState<ContentItem | null | undefined>(undefined);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch(`/api/admin/content-items?songId=${encodeURIComponent(songId)}&page=1&pageSize=100&sort=content_order&direction=asc`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to load this song’s content."); setLoading(false); return; }
    const pages = Math.ceil((body.total || 0) / 100);
    const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => fetch(`/api/admin/content-items?songId=${encodeURIComponent(songId)}&page=${index + 2}&pageSize=100&sort=content_order&direction=asc`, { cache: "no-store" }).then(async result => ({ ok: result.ok, body: await result.json() })))) : [];
    const failed = rest.find(result => !result.ok);
    if (failed) { setError(failed.body.error || "Unable to load every checklist item."); setLoading(false); return; }
    setItems([...(body.items || []), ...rest.flatMap(result => result.body.items || [])] as ChecklistItem[]); setTotal(body.total || 0); setLoading(false);
  }, [songId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("content");
    if (!requested || !items.length) return;
    const item = items.find(row => row.id === requested);
    if (item) { setPanelItem(item); const params = new URLSearchParams(window.location.search); params.delete("content"); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }
  }, [items]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();
    for (const item of items) { const key = item.category || "Other"; groups.set(key, [...(groups.get(key) || []), item]); }
    return [...groups.entries()].sort(([a], [b]) => {
      const ai = categoryOrder.indexOf(a), bi = categoryOrder.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
    });
  }, [items]);
  const counts = useMemo(() => ({ planned: items.length, recorded: items.filter(item => item.recorded === true).length, edited: items.filter(item => item.edited === true).length, posted: items.filter(item => item.published === true).length }), [items]);
  const progress = counts.planned ? Math.round(counts.posted / counts.planned * 100) : 0;
  const videoProduction = (musicVideo?.workspace?.production || {}) as Record<string, unknown>;
  const videoStage = typeof videoProduction.stage === "string" ? videoProduction.stage : musicVideo?.status || "Concept";
  const videoAssignee = String(musicVideo?.assigned_videographer?.name || musicVideo?.assigned_videographer?.email || "Not assigned");

  async function toggle(item: ChecklistItem, field: "recorded" | "edited" | "published") {
    setBusyId(item.id); setError("");
    const response = await fetch("/api/admin/song-content-checklist", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, [field]: item[field] !== true }) });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setError(body.error || "Unable to update this deliverable."); return; }
    setItems(current => current.map(row => row.id === item.id ? { ...row, [field]: body.item[field] } : row));
  }

  async function move(item: ChecklistItem, direction: -1 | 1) {
    const group = items.filter(row => row.category === item.category).sort((a, b) => (a.content_order || 0) - (b.content_order || 0));
    const index = group.findIndex(row => row.id === item.id), neighbor = group[index + direction];
    if (!neighbor) return;
    setBusyId(item.id); setError("");
    const reordered = [...group];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    const responses = await Promise.all(reordered.map((row, rowIndex) => fetch("/api/admin/song-content-checklist", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: row.id, content_order: (rowIndex + 1) * 10 }) })));
    setBusyId(null);
    if (responses.some(response => !response.ok)) { setError("Unable to reorder these deliverables."); await load(); return; }
    await load();
  }

  async function duplicate(item: ChecklistItem) {
    setBusyId(item.id); setError("");
    const nextOrder = Math.max(0, ...items.map(row => row.content_order || 0)) + 10;
    const response = await fetch("/api/admin/content-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: `${item.title} (copy)`, category: item.category, sub_category: item.sub_category, song_name: songTitle, song_id: songId, recorded: false, edited: false, post_ready: false, published: false, media_type: item.media_type, purpose: item.purpose, source_url: "", media_url: item.media_url || "", script: item.script || "", platform: item.platform || "", caption: item.caption || "", hashtags: item.hashtags || "", planned_date: item.planned_date || null, content_order: nextOrder }) });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setError(body.error || "Unable to duplicate this deliverable."); return; }
    await load();
  }

  async function remove(item: ChecklistItem) {
    if (!window.confirm(`Remove “${item.title}” from this song’s content checklist?`)) return;
    setBusyId(item.id); setError("");
    const response = await fetch(`/api/admin/song-content-checklist?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    const body = await response.json(); setBusyId(null);
    if (!response.ok) { setError(body.error || "Unable to remove this deliverable."); return; }
    setItems(current => current.filter(row => row.id !== item.id)); setTotal(value => Math.max(0, value - 1));
  }

  const checkbox = (item: ChecklistItem, field: "recorded" | "edited" | "published", label: string) => <input type="checkbox" aria-label={`${label}: ${item.title}`} checked={item[field] === true} disabled={busyId === item.id} onChange={() => void toggle(item, field)} className="h-4 w-4 cursor-pointer accent-[#FD52AF] disabled:cursor-wait"/>;
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="font-bold">Content Production</h2></div><button type="button" onClick={() => setPanelItem(null)} className="rounded-lg bg-[#FD52AF] px-3 py-2 text-sm font-bold text-black">+ Add</button></header>
    <article className="flex flex-wrap items-center gap-4 rounded-xl border border-[#FD52AF]/25 bg-gradient-to-r from-[#FD52AF]/[.07] to-white/[.02] p-4 sm:p-5">{artworkUrl ? <img src={artworkUrl} alt={`${songTitle} artwork`} className="h-20 w-20 shrink-0 rounded-lg border border-white/10 object-cover shadow-lg" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#FD52AF]/20 bg-[#FD52AF]/10 text-[#ff7fc2]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg></div>}<div className="mr-auto min-w-0"><p className="text-[.62rem] font-bold uppercase tracking-[.14em] text-[#ff7fc2]">Music Video Project</p><h3 className="mt-1 truncate font-bold">{songTitle} — Official Music Video</h3><p className="mt-1 text-xs text-white/50">{musicVideo ? `${videoStage} · ${videoAssignee} · Next: ${musicVideo.next_action || "Add a next action"}` : "Plan the official music video and keep its production details connected here."}</p></div>{musicVideo ? <a href={`/admin/music-videos/${musicVideo.id}`} className="rounded-lg border border-[#FD52AF]/30 px-3.5 py-2.5 text-xs font-semibold text-[#ff9dcd] transition hover:bg-[#FD52AF]/10">Open project ↗</a> : <button type="button" onClick={onCreateMusicVideo} className="rounded-lg bg-[#FD52AF] px-3.5 py-2.5 text-xs font-bold text-black">+ Plan music video</button>}</article>
    <div className="rounded-xl border border-white/[.08] bg-[#111116] p-3 sm:p-4"><div className="grid grid-cols-4 gap-2 text-center sm:gap-4">{([["Planned", counts.planned, "text-sky-300"], ["Recorded", counts.recorded, "text-cyan-300"], ["Edited", counts.edited, "text-amber-300"], ["Posted", counts.posted, "text-emerald-300"]] as const).map(([label, value, color]) => <div key={label}><p className={`text-[.62rem] uppercase tracking-wide ${color}`}>{label}</p><p className={`mt-1 text-lg font-extrabold tabular-nums sm:text-xl ${color}`}>{value}</p></div>)}</div><div role="progressbar" aria-label="Posted deliverables" aria-valuemin={0} aria-valuemax={counts.planned} aria-valuenow={counts.posted} className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-[#FD52AF] transition-[width]" style={{ width: `${progress}%` }}/></div></div>
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.05] p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-white/40">Loading checklist…</p> : items.length ? <div className="overflow-hidden rounded-xl border border-white/[.08] bg-[#111116]">
      <div className="grid grid-cols-[minmax(0,1fr)_2rem_2rem_2rem_4.3rem_2rem] gap-1.5 border-b border-white/[.08] px-3 py-2 text-[.55rem] font-semibold uppercase tracking-wide text-white/40 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_6rem_5.5rem] sm:gap-2 sm:px-4 sm:text-[.62rem]"><span>Content</span><span className="text-center sm:text-xs">Rec</span><span className="text-center sm:text-xs">Edit</span><span className="text-center sm:text-xs">Post</span><span className="text-center">Date</span><span className="text-right">Details</span></div>
      {grouped.map(([category, rows], groupIndex) => <details key={category} open={groupIndex === 0} className="group border-b border-white/[.08] last:border-0"><summary className="flex cursor-pointer list-none items-center gap-2 bg-white/[.025] px-3 py-2.5 text-xs font-bold text-white/70 sm:px-4"><span className="text-[#FD52AF] transition-transform group-open:rotate-90">›</span><span>{categoryNames[category] || category}</span><span className="text-[.62rem] font-medium text-white/35">{rows.length}</span></summary><div className="divide-y divide-white/[.055]">{rows.map(item => {
        const stage = item.published ? "Posted" : item.edited ? "Ready to Post" : item.recorded ? "To Edit" : "Not Started";
        const stageColor = stage === "Posted" ? "text-emerald-300/65" : stage === "Ready to Post" ? "text-[#FD52AF]/70" : stage === "To Edit" ? "text-amber-200/60" : "text-white/30";
        return <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_2rem_2rem_2rem_4.3rem_2rem] items-center gap-1.5 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4.5rem_6rem_5.5rem] sm:gap-2 sm:px-4"><button type="button" onClick={() => setPanelItem(item)} className="min-w-0 text-left" title={item.title}><span className="block truncate text-[.78rem] font-medium text-white/85 hover:text-[#ff9dcd]">{item.title.replace(`${songTitle} — `, "")}</span><span className={`mt-0.5 block text-[.6rem] ${stageColor}`}>{stage}</span></button><span className="flex justify-center sm:hidden">{checkbox(item, "recorded", "Recorded")}</span><span className="flex justify-center sm:hidden">{checkbox(item, "edited", "Edited")}</span><span className="flex justify-center sm:hidden">{checkbox(item, "published", "Posted")}</span><span className="hidden justify-center sm:flex">{checkbox(item, "recorded", "Recorded")}</span><span className="hidden justify-center sm:flex">{checkbox(item, "edited", "Edited")}</span><span className="hidden justify-center sm:flex">{checkbox(item, "published", "Posted")}</span><span className="truncate text-center text-[.65rem] text-white/50">{item.planned_date ? new Date(`${item.planned_date}T00:00:00`).toLocaleDateString() : "—"}</span><div className="relative flex items-center justify-end gap-0.5"><button type="button" title="Move up" aria-label={`Move ${item.title} up`} disabled={busyId === item.id || rows[0]?.id === item.id} onClick={() => void move(item, -1)} className="hidden rounded px-1 text-xs text-white/35 hover:text-white disabled:opacity-20 sm:inline">↑</button><button type="button" title="Move down" aria-label={`Move ${item.title} down`} disabled={busyId === item.id || rows.at(-1)?.id === item.id} onClick={() => void move(item, 1)} className="hidden rounded px-1 text-xs text-white/35 hover:text-white disabled:opacity-20 sm:inline">↓</button><button type="button" title="Duplicate" aria-label={`Duplicate ${item.title}`} disabled={busyId === item.id} onClick={() => void duplicate(item)} className="hidden rounded px-1 text-xs text-white/35 hover:text-white disabled:opacity-30 sm:inline">⧉</button><button type="button" title="Remove" aria-label={`Remove ${item.title}`} disabled={busyId === item.id} onClick={() => void remove(item)} className="hidden rounded px-1 text-xs text-white/35 hover:text-red-200 disabled:opacity-30 sm:inline">×</button><details className="relative sm:hidden"><summary aria-label={`More actions for ${item.title}`} className="cursor-pointer list-none rounded px-1 text-sm text-white/50">⋯</summary><div className="absolute right-0 top-full z-20 grid min-w-28 gap-1 rounded-md border border-white/10 bg-[#19191f] p-1 shadow-xl"><button type="button" disabled={busyId === item.id || rows[0]?.id === item.id} onClick={() => void move(item, -1)} className="rounded px-2 py-1.5 text-left text-xs text-white/70 disabled:opacity-30">Move up</button><button type="button" disabled={busyId === item.id || rows.at(-1)?.id === item.id} onClick={() => void move(item, 1)} className="rounded px-2 py-1.5 text-left text-xs text-white/70 disabled:opacity-30">Move down</button><button type="button" disabled={busyId === item.id} onClick={() => void duplicate(item)} className="rounded px-2 py-1.5 text-left text-xs text-white/70 disabled:opacity-30">Duplicate</button><button type="button" disabled={busyId === item.id} onClick={() => void remove(item)} className="rounded px-2 py-1.5 text-left text-xs text-red-200 disabled:opacity-30">Remove</button></div></details></div></div>;
      })}</div></details>)}
    </div> : <div className="rounded-xl border border-dashed border-white/15 p-7 text-center"><p className="text-sm font-semibold text-white/75">No content items found.</p><button type="button" onClick={() => setPanelItem(null)} className="mt-3 rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-black">+ Add Content</button></div>}
    {items.length < total && !loading && <p className="text-center text-xs text-white/40">Showing {items.length} of {total}. Add a task or use the Content Library for the full list.</p>}
    {panelItem !== undefined && <ChecklistDetailPanel key={panelItem?.id || "new"} item={panelItem} songId={songId} songTitle={songTitle} contentOrder={Math.max(0, ...items.map(row => row.content_order || 0)) + 10} onClose={() => setPanelItem(undefined)} onSaved={() => { setPanelItem(undefined); void load(); }}/ >}
  </section>;
}

type DetailDraft = { title: string; category: string; sub_category: string; media_type: string; purpose: string; script: string; recorded_at: string; media_url: string; source_url: string; platform: string; caption: string; hashtags: string };
function ChecklistDetailPanel({ item, songId, songTitle, contentOrder, onClose, onSaved }: { item: ChecklistItem | null; songId: string; songTitle: string; contentOrder: number; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<DetailDraft>({ title: item?.title.replace(`${songTitle} — `, "") || "", category: item?.category || "", sub_category: item?.sub_category || "", media_type: item?.media_type || "VIDEO", purpose: item?.purpose || "", script: item?.script || "", recorded_at: item?.recorded_at?.slice(0, 16) || "", media_url: item?.media_url || "", source_url: item?.source_url || "", platform: item?.platform || "", caption: item?.caption || "", hashtags: item?.hashtags || "" });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const set = (key: keyof DetailDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const input = "mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[#FD52AF]/45";
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = { ...draft, title: item && !item.title.startsWith(`${songTitle} — `) ? draft.title : `${songTitle} — ${draft.title}`, song_id: songId, song_name: songTitle, content_order: item ? item.content_order || 0 : contentOrder, recorded_at: draft.recorded_at ? new Date(draft.recorded_at).toISOString() : null };
    const response = await fetch("/api/admin/content-items", { method: item ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item ? { id: item.id, ...payload } : { ...payload, recorded: false, edited: false, post_ready: false, published: false }) });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { setError(body.error || "Unable to save this deliverable."); return; }
    onSaved();
  }
  return <div className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={save} className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0d0d12] shadow-2xl"><header className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><div className="mr-auto min-w-0"><p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-[#FD52AF]">{item ? "Deliverable details" : "Add deliverable"}</p><h2 className="truncate text-base font-bold text-white">{item?.title || songTitle}</h2></div><button type="button" onClick={onClose} aria-label="Close details" className="rounded px-3 py-2 text-lg text-white/50 hover:bg-white/5">×</button></header><div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">{error && <p role="alert" className="rounded border border-red-300/20 bg-red-300/[.05] p-2 text-xs text-red-200">{error}</p>}{item?.music_video_project_id && <a href={`/admin/music-videos/${item.music_video_project_id}`} className="block rounded-md border border-[#FD52AF]/15 bg-[#FD52AF]/[.04] px-3 py-2 text-xs font-semibold text-[#FD52AF]">Open Music Video project ↗</a>}
    <label className="block text-xs text-white/55">Content<input required value={draft.title} onChange={event => set("title", event.target.value)} className={input}/></label>
    <div className="grid grid-cols-2 gap-3"><label className="block text-xs text-white/55">Category<input value={draft.category} onChange={event => set("category", event.target.value)} className={input}/></label><label className="block text-xs text-white/55">Type<input value={draft.media_type} onChange={event => set("media_type", event.target.value)} className={input}/></label></div>
    <label className="block text-xs text-white/55">Concept / Notes<textarea rows={3} value={draft.script} onChange={event => set("script", event.target.value)} className={input}/></label>
    <label className="block text-xs text-white/55">Recording date<input type="datetime-local" value={draft.recorded_at} onChange={event => set("recorded_at", event.target.value)} className={input}/></label>
    <label className="block text-xs text-white/55">Media / footage link<input type="url" value={draft.media_url} onChange={event => set("media_url", event.target.value)} placeholder="https://…" className={input}/></label>
    <label className="block text-xs text-white/55">Published URL<input type="url" value={draft.source_url} onChange={event => set("source_url", event.target.value)} placeholder="https://…" className={input}/></label>
    <label className="block text-xs text-white/55">Platform<input value={draft.platform} onChange={event => set("platform", event.target.value)} placeholder="Instagram, TikTok, YouTube…" className={input}/></label>
    <label className="block text-xs text-white/55">Caption<textarea rows={3} value={draft.caption} onChange={event => set("caption", event.target.value)} className={input}/></label>
    <label className="block text-xs text-white/55">Hashtags<textarea rows={2} value={draft.hashtags} onChange={event => set("hashtags", event.target.value)} className={input}/></label>
  </div><footer className="flex justify-end gap-2 border-t border-white/10 px-4 py-3"><button type="button" onClick={onClose} className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/60">Cancel</button><button disabled={saving} className="rounded-md bg-[#FD52AF] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></footer></form></div>;
}
