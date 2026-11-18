"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Song = { id: string; title: string; slug: string };
export default function MusicVideosAdmin() {
  const [songs, setSongs] = useState<Song[]>([]), [song, setSong] = useState(""), [error, setError] = useState("");
  useEffect(() => { void (async () => { const r = await fetch("/api/music-video-projects/songs", { cache: "no-store" }); if (r.ok) { const j = await r.json(); setSongs(j.songs || []); } })(); }, []);
  return <main className="min-h-screen bg-[#09090c] p-5 text-white sm:p-10"><div className="mx-auto max-w-3xl"><Link href="/admin/collaborations" className="text-sm text-white/50">← Collaborations</Link><h1 className="my-6 text-3xl font-black">Music Video Projects</h1><p className="mb-5 text-sm text-white/60">Start the primary video workspace from an existing song. Song records are never duplicated.</p><div className="flex flex-col gap-3 sm:flex-row"><select value={song} onChange={e => setSong(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black p-3"><option value="">Choose a song</option>{songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><button onClick={async () => { setError(""); const r = await fetch("/api/music-video-projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song }) }); const j = await r.json(); if (r.ok && j.id) location.href = `/admin/music-videos/${j.id}`; else setError(j.error || "Unable to open workspace."); }} className="rounded-lg bg-[#ff3ea5] px-5 py-3 font-bold text-black">Open workspace</button></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</div></main>;
}
