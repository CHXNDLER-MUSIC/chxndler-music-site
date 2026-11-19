"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Request = { id: string; status: string; submitted_at: string; contribution_type: string };
type SongRow = { id: string; title: string; slug: string; is_released: boolean; collaboration_enabled: boolean; requests: Request[]; musicVideo: null | { id: string; status: string; visibility: string; next_action: string } };
const statusTone: Record<string, string> = { new: "text-pink-300", reviewing: "text-amber-200", approved: "text-emerald-300", declined: "text-white/40", agreement_pending: "text-amber-200", signed: "text-emerald-300", in_progress: "text-sky-300", completed: "text-emerald-300", canceled: "text-white/40", archived: "text-white/40" };

export default function SongTracker() {
  const [songs, setSongs] = useState<SongRow[]>([]), [search, setSearch] = useState(""), [filter, setFilter] = useState("all"), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const r = await fetch("/api/admin/song-tracker", { cache: "no-store" }); const j = await r.json(); if (r.ok) setSongs(j.songs || []); else setError(j.error || "Unable to load songs."); setLoading(false); }
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => songs.filter(song => {
    const q = search.toLowerCase();
    const match = `${song.title} ${song.slug}`.toLowerCase().includes(q);
    const matchesFilter = filter === "all" || (filter === "released" && song.is_released) || (filter === "unreleased" && !song.is_released) || (filter === "outreach" && song.collaboration_enabled);
    return match && matchesFilter;
  }), [songs, search, filter]);
  async function toggle(song: SongRow, key: "is_released" | "collaboration_enabled") {
    setError(""); const next = !song[key];
    setSongs(current => current.map(item => item.id === song.id ? { ...item, [key]: next } : item));
    const r = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, [key]: next }) });
    if (!r.ok) { setSongs(current => current.map(item => item.id === song.id ? { ...item, [key]: !next } : item)); const j = await r.json(); setError(j.error || "Could not save change."); }
  }
  return <>
    <section className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Songs", value: songs.length }, { label: "Released", value: songs.filter(song => song.is_released).length }, { label: "Open outreach", value: songs.filter(song => song.collaboration_enabled).length }].map(card => <div key={card.label} className="rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-xs uppercase tracking-[.16em] text-white/45">{card.label}</p><p className="mt-2 text-2xl font-black">{card.value}</p></div>)}
    </section>
    <div className="my-5 flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a song" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"/><select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] p-3 text-sm"><option value="all">All songs</option><option value="released">Released</option><option value="unreleased">Unreleased</option><option value="outreach">Outreach enabled</option></select><button onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Refresh</button></div>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="p-8 text-center text-white/45">Loading song tracker…</p> : <div className="overflow-hidden rounded-xl border border-white/10"><div className="hidden grid-cols-[minmax(12rem,1.5fr)_8rem_9rem_minmax(12rem,1fr)] gap-3 bg-white/[.05] px-4 py-3 text-[.65rem] font-bold uppercase tracking-[.16em] text-white/45 md:grid"><span>Song</span><span>Release</span><span>Outreach</span><span>Activity</span></div>
      {visible.map(song => <article key={song.id} className="grid gap-3 border-t border-white/10 px-4 py-4 md:grid-cols-[minmax(12rem,1.5fr)_8rem_9rem_minmax(12rem,1fr)] md:items-center"><div><h2 className="font-bold">{song.title}</h2><p className="mt-1 text-xs text-white/35">{song.slug}</p><div className="mt-2 flex gap-3 text-xs"><Link className="text-[#ff66b4]" href={`/songs/${song.slug}`}>Song page ↗</Link><Link className="text-white/55" href={`/admin/music-videos${song.musicVideo ? `/${song.musicVideo.id}` : ""}`}>{song.musicVideo ? "Video workspace ↗" : "Set up video"}</Link></div></div>
        <button onClick={() => void toggle(song, "is_released")} className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${song.is_released ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"}`}>{song.is_released ? "Released" : "Unreleased"}</button>
        <button onClick={() => void toggle(song, "collaboration_enabled")} className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${song.collaboration_enabled ? "bg-[#ff3ea5]/15 text-[#ff80c4]" : "bg-white/10 text-white/50"}`}>{song.collaboration_enabled ? "Outreach open" : "Outreach closed"}</button>
        <div className="text-xs text-white/55"><p>{song.requests.length} request{song.requests.length === 1 ? "" : "s"} · <Link className="text-[#ff66b4]" href={`/admin/collaborations${song.requests[0] ? `?request=${song.requests[0].id}` : ""}`}>Manage outreach ↗</Link></p>{song.requests.slice(0, 2).map(request => <p key={request.id} className={`mt-1 capitalize ${statusTone[request.status] || ""}`}>{request.status.replaceAll("_", " ")} · {request.contribution_type}</p>)}{song.musicVideo && <p className="mt-1">Video: {song.musicVideo.status} · {song.musicVideo.next_action}</p>}</div>
      </article>)}{visible.length === 0 && <p className="p-8 text-center text-sm text-white/45">{songs.length ? "No songs match this view." : "No songs found."}</p>}</div>}
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/collaborations" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Open outreach inbox ↗</Link><Link href="/admin/music-videos" className="rounded-lg border border-white/15 px-4 py-2 text-sm">Music video projects ↗</Link></div>
  </>;
}
