"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";

type Profile = {
  song: { id: string; title: string; slug: string; is_released: boolean; spotify_url: string | null; apple_music_url: string | null; youtube_music_video_url: string | null; karaoke_url: string | null; sky_video_url: string | null };
  meaning: string;
  lyricUrl: string;
  coverUrl: string;
  musicVideo: null | { id: string; status: string; visibility: string; public_concept: string; workspace: Record<string, unknown>; next_action: string; assigned_videographer: Record<string, unknown> };
};
const fields: Array<[string, keyof Profile["song"]]> = [["Spotify", "spotify_url"], ["Apple Music", "apple_music_url"], ["Music video link", "youtube_music_video_url"], ["Karaoke", "karaoke_url"], ["Heartverse sky video", "sky_video_url"]];

export default function SongProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null), [lyrics, setLyrics] = useState(""), [meaning, setMeaning] = useState(""), [error, setError] = useState(""), [saved, setSaved] = useState(false), [loading, setLoading] = useState(true);
  async function load() {
    const response = await fetch(`/api/admin/song-profile?id=${id}`, { cache: "no-store" }); const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load song profile."); setLoading(false); return; }
    setProfile(data); setMeaning(data.meaning || "");
    const lyricResponse = await fetch(data.lyricUrl, { cache: "no-store" }); const lyricData = await lyricResponse.json();
    setLyrics(lyricResponse.ok ? lyricData.content : "Lyrics have not been added yet."); setLoading(false);
  }
  useEffect(() => { void load(); }, [id]);
  async function saveMeaning() {
    if (!profile) return; setSaved(false); setError("");
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: profile.song.id, meaning }) });
    const data = await response.json(); if (!response.ok) { setError(data.error || "Unable to save meaning."); return; } setSaved(true);
  }
  async function createVideoProject() {
    if (!profile) return; setError("");
    const response = await fetch("/api/music-video-projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: profile.song.id }) });
    const data = await response.json(); if (!response.ok || !data.id) { setError(data.error || "Unable to create music video workspace."); return; }
    location.href = `/admin/music-videos/${data.id}`;
  }
  if (loading) return <main className="min-h-screen bg-[#09090c] p-8 text-white/50">Loading song profile…</main>;
  if (!profile) return <main className="min-h-screen bg-[#09090c] p-8 text-red-200">{error || "Song profile unavailable."}</main>;
  return <main className="min-h-screen bg-[#09090c] p-4 text-white sm:p-8"><div className="mx-auto max-w-6xl"><Link href="/admin" className="text-sm text-white/45">← Task tracker</Link><header className="my-6 grid gap-5 sm:grid-cols-[9rem_1fr] sm:items-center"><img src={profile.coverUrl} alt={`${profile.song.title} artwork`} className="aspect-square w-36 rounded-xl object-cover"/><div><p className="text-xs font-bold tracking-[.22em] text-[#ff3ea5]">SONG PROFILE · {profile.song.is_released ? "RELEASED" : "UNRELEASED"}</p><h1 className="mt-2 text-3xl font-black">{profile.song.title}</h1><p className="mt-2 text-sm text-white/45">{profile.song.slug}</p><audio controls preload="none" src={releaseAudioSrc(profile.song.slug)} className="mt-4 h-9 w-full max-w-md" /></div></header>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Song meaning</h2><button onClick={() => void saveMeaning()} className="rounded-lg bg-[#ff3ea5] px-3 py-2 text-xs font-bold text-black">Save meaning</button></div><textarea value={meaning} onChange={event => { setMeaning(event.target.value); setSaved(false); }} rows={7} placeholder="Themes, story, and what the song means…" className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-6"/>{saved && <p className="mt-2 text-xs text-emerald-300">Meaning saved to the song outreach record.</p>}</section>
      <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><h2 className="mb-3 text-lg font-bold">Music video</h2>{profile.musicVideo ? <><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-sky-300/10 px-3 py-1.5 text-sky-200">{profile.musicVideo.status}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-white/60">{profile.musicVideo.visibility.replaceAll("_", " ")}</span></div>{profile.musicVideo.public_concept && <p className="mt-3 text-sm leading-6 text-white/65">{profile.musicVideo.public_concept}</p>}<p className="mt-3 text-xs text-white/45">Next action: {profile.musicVideo.next_action}</p><Link href={`/admin/music-videos/${profile.musicVideo.id}`} className="mt-4 inline-block text-sm font-bold text-[#ff76bd]">Open video workspace ↗</Link></> : <><p className="text-sm text-white/50">No video workspace is attached to this song yet.</p><button onClick={() => void createVideoProject()} className="mt-4 rounded-lg border border-[#ff3ea5]/40 px-3 py-2 text-sm text-[#ff86c6]">Create music video workspace</button></>}</section>
      <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5 lg:col-span-2"><h2 className="mb-3 text-lg font-bold">Lyrics</h2><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-white/70">{lyrics}</pre></section>
      <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5 lg:col-span-2"><h2 className="mb-3 text-lg font-bold">Song links</h2><div className="flex flex-wrap gap-3">{fields.map(([label, key]) => { const url = profile.song[key]; return typeof url === "string" && url ? <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">{label} ↗</a> : <span key={key} className="rounded-lg border border-white/5 px-3 py-2 text-sm text-white/30">{label} · not set</span>; })}</div></section>
    </div></div></main>;
}
