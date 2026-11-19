"use client";

import { useEffect, useMemo, useState } from "react";

type Outreach = { id: string; song: string; category: string; pitch: string; complete: boolean; meaning_of_song: string; updated_at?: string };
const categories = ["ALL", "BLOGS & PRESS", "INFLUENCER", "PLAYLIST", "RADIO", "SYNC"];

export default function PlaylistsTab() {
  const [records, setRecords] = useState<Outreach[]>([]);
  const [category, setCategory] = useState("PLAYLIST");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/song-outreach", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load outreach.");
      setRecords(data.records || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load outreach."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => records.filter(row =>
    (category === "ALL" || row.category === category) &&
    (!search || row.song.toLowerCase().includes(search.toLowerCase()) || row.pitch.toLowerCase().includes(search.toLowerCase()))
  ), [records, category, search]);
  const completedCount = records.filter(row => row.complete).length;

  function edit(id: string, patch: Partial<Outreach>) {
    setRecords(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row));
    setSaved("");
  }
  async function save(row: Outreach) {
    setSaving(row.id); setError("");
    try {
      const response = await fetch("/api/admin/song-outreach", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this row.");
      setRecords(rows => rows.map(item => item.id === row.id ? data.record : item));
      setSaved(row.id); window.setTimeout(() => setSaved(current => current === row.id ? "" : current), 1800);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this row."); }
    finally { setSaving(""); }
  }

  return <section>
    <header className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Outreach by song</p>
      <h2 className="mt-1 text-2xl font-black">Playlist & outreach tracker</h2>
      <p className="mt-2 text-sm text-white/55">Track pitch copy and completion across blogs, influencers, playlists, radio, and sync.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/55"><span>{records.length} song/category records</span><span>{completedCount} complete</span><span>{records.length - completedCount} remaining</span></div>
    </header>
    <div className="mb-4 flex flex-wrap gap-3">
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search songs or pitch copy" className="min-w-56 flex-1 rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white placeholder:text-white/30" />
      <select value={category} onChange={event => setCategory(event.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white">{categories.map(item => <option key={item} value={item}>{item === "ALL" ? "All categories" : item}</option>)}</select>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading outreach…</div> : !visible.length ? <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No matching outreach records.</div> : <div className="space-y-3">{visible.map(row => <article key={row.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="mr-auto font-bold">{row.song}</h3><span className="rounded-full bg-[#ff3ea5]/10 px-2.5 py-1 text-[.65rem] font-bold tracking-wide text-[#ff8bc9]">{row.category}</span><label className="flex cursor-pointer items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={row.complete} onChange={event => edit(row.id, { complete: event.target.checked })} className="accent-[#ff3ea5]" />Complete</label></div>
      <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Pitch<textarea value={row.pitch} onChange={event => edit(row.id, { pitch: event.target.value })} rows={row.pitch.length > 180 ? 4 : 2} placeholder="Add or edit pitch copy…" className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></label>
      <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Meaning of song<textarea value={row.meaning_of_song} onChange={event => edit(row.id, { meaning_of_song: event.target.value })} rows={row.meaning_of_song.length > 180 ? 4 : 2} placeholder="Song meaning / themes…" className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></label>
      <div className="flex justify-end"><button type="button" onClick={() => save(row)} disabled={saving === row.id} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{saving === row.id ? "Saving…" : saved === row.id ? "Saved" : "Save changes"}</button></div>
    </article>)}</div>}
  </section>;
}
