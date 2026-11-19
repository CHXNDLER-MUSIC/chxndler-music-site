"use client";

import { useEffect, useMemo, useState } from "react";

type Outreach = { id: string; song: string; category: string; pitch: string; complete: boolean; meaning_of_song: string; updated_at?: string };
const categories = ["BLOGS & PRESS", "INFLUENCER", "PLAYLIST", "RADIO", "SYNC"] as const;
type Category = typeof categories[number];
type Campaign = { song: string; records: Partial<Record<Category, Outreach>> };

export default function PlaylistsTab({ onPractice }: { onPractice?: (song: string) => void }) {
  const [records, setRecords] = useState<Outreach[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState<{ song: string; category: Category } | null>(null);

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

  const campaigns = useMemo(() => {
    const grouped = new Map<string, Campaign>();
    for (const row of records) {
      const campaign = grouped.get(row.song) || { song: row.song, records: {} };
      if (categories.includes(row.category as Category)) campaign.records[row.category as Category] = row;
      grouped.set(row.song, campaign);
    }
    const term = search.trim().toLowerCase();
    return [...grouped.values()].filter(campaign => !term || campaign.song.toLowerCase().includes(term) || Object.values(campaign.records).some(row => row?.pitch.toLowerCase().includes(term))).sort((a, b) => a.song.localeCompare(b.song));
  }, [records, search]);
  const completeCount = records.filter(row => row.complete).length;

  async function openStage(song: string, category: Category) {
    setError(""); setSaved(false);
    let row = records.find(item => item.song === song && item.category === category);
    if (!row) {
      try {
        const response = await fetch("/api/admin/song-outreach", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ song, category, pitch: "", meaning_of_song: "", complete: false }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to open this campaign step.");
        row = data.record;
        setRecords(current => [...current, row!]);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open this campaign step."); return; }
    }
    setActive({ song, category });
  }

  function editActive(patch: Partial<Outreach>) {
    if (!active) return;
    setRecords(current => current.map(row => row.song === active.song && row.category === active.category ? { ...row, ...patch } : row));
    setSaved(false);
  }

  async function saveActive() {
    if (!active) return;
    const row = records.find(item => item.song === active.song && item.category === active.category);
    if (!row) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/admin/song-outreach", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this campaign step.");
      setRecords(current => current.map(item => item.id === row.id ? data.record : item));
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this campaign step."); }
    finally { setSaving(false); }
  }

  const activeRecord = active ? records.find(row => row.song === active.song && row.category === active.category) : null;

  return <section>
    <header className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Campaigns by song</p>
      <h2 className="mt-1 text-2xl font-black">Song campaign workflow</h2>
      <p className="mt-2 text-sm text-white/55">One campaign per song. Move from practice to playlist pitching, sync, and music video.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/55"><span>{campaigns.length} song campaigns</span><span>{completeCount} outreach steps complete</span><span>{records.length - completeCount} remaining</span></div>
    </header>

    <div className="mb-4 flex flex-wrap gap-3">
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a song campaign…" className="min-w-56 flex-1 rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white placeholder:text-white/30" />
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading song campaigns…</div> : !campaigns.length ? <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No matching song campaigns.</div> : <div className="space-y-3">{campaigns.map(campaign => {
      const done = categories.filter(category => campaign.records[category]?.complete).length;
      const isActive = active?.song === campaign.song;
      const step = (category: Category, label: string) => {
        const row = campaign.records[category];
        return <button key={category} type="button" onClick={() => void openStage(campaign.song, category)} className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${isActive && active.category === category ? "border-[#ff3ea5]/70 bg-[#ff3ea5]/10 text-white" : "border-white/10 bg-black/20 text-white/65 hover:border-white/25 hover:text-white"}`}><span>{label}</span><span className={row?.complete ? "text-[#ff66b4]" : "text-white/35"}>{row?.complete ? "✓" : "→"}</span></button>;
      };
      return <article key={campaign.song} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3"><h3 className="mr-auto text-lg font-black tracking-wide">{campaign.song}</h3><span className="text-xs text-white/45">{done}/{categories.length} outreach steps</span></div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ff3ea5] transition-[width]" style={{ width: `${done / categories.length * 100}%` }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" onClick={() => onPractice?.(campaign.song)} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-bold text-white/65 transition hover:border-white/25 hover:text-white"><span>Practice</span><span>→</span></button>
            {step("PLAYLIST", "Playlist pitch")}
            {step("SYNC", "Sync pitch")}
            <a href={`/admin/music-videos?song=${encodeURIComponent(campaign.song)}`} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/65 transition hover:border-white/25 hover:text-white"><span>Music video</span><span>→</span></a>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-white/40 hover:text-white/70">More outreach steps</summary>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{step("BLOGS & PRESS", "Blogs & press")}{step("INFLUENCER", "Influencer")}{step("RADIO", "Radio")}</div>
          </details>
        </div>
        {isActive && activeRecord && <div className="border-t border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2"><p className="mr-auto text-xs font-black uppercase tracking-[.16em] text-[#ff66b4]">{active.category === "PLAYLIST" ? "Playlist pitch" : active.category === "SYNC" ? "Sync pitch" : active.category}</p><label className="flex cursor-pointer items-center gap-2 text-xs text-white/65"><input type="checkbox" checked={activeRecord.complete} onChange={event => editActive({ complete: event.target.checked })} className="accent-[#ff3ea5]" />Complete</label></div>
          <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Pitch<textarea value={activeRecord.pitch} onChange={event => editActive({ pitch: event.target.value })} rows={activeRecord.pitch.length > 180 ? 4 : 3} placeholder={active.category === "PLAYLIST" ? "Add your playlist pitch…" : active.category === "SYNC" ? "Add your sync pitch…" : "Add or edit pitch copy…"} className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></label>
          <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Meaning of song<textarea value={activeRecord.meaning_of_song} onChange={event => editActive({ meaning_of_song: event.target.value })} rows={2} placeholder="Song meaning / themes…" className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></label>
          <div className="flex items-center justify-end gap-3"><span role="status" className="text-xs text-[#ff8bc9]">{saved ? "Saved" : ""}</span><button type="button" onClick={() => void saveActive()} disabled={saving} className="rounded-lg bg-[#ff3ea5] px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">{saving ? "Saving…" : `Save ${active.category === "PLAYLIST" ? "playlist" : active.category.toLowerCase()} step`}</button></div>
        </div>}
      </article>;
    })}</div>}
  </section>;
}
