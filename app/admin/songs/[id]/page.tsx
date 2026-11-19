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
  const [profile, setProfile] = useState<Profile | null>(null), [lyrics, setLyrics] = useState(""), [meaning, setMeaning] = useState(""), [songLinks, setSongLinks] = useState<Record<string, string>>({}), [error, setError] = useState(""), [saved, setSaved] = useState(false), [loading, setLoading] = useState(true);
  async function load() {
    const response = await fetch(`/api/admin/song-profile?id=${id}`, { cache: "no-store" }); const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load song profile."); setLoading(false); return; }
    setProfile(data); setMeaning(data.meaning || ""); setSongLinks(Object.fromEntries(fields.map(([, key]) => [key, data.song[key] || ""])));
    const lyricResponse = await fetch(data.lyricUrl, { cache: "no-store" }); const lyricData = await lyricResponse.json();
    setLyrics(lyricResponse.ok ? lyricData.content : "Lyrics have not been added yet."); setLoading(false);
  }
  useEffect(() => { void load(); }, [id]);
  async function saveMeaning() {
    if (!profile) return; setSaved(false); setError("");
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: profile.song.id, meaning }) });
    const data = await response.json(); if (!response.ok) { setError(data.error || "Unable to save meaning."); return; } setSaved(true);
  }
  async function saveLinks() {
    if (!profile) return; setSaved(false); setError("");
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: profile.song.id, links: songLinks }) });
    const data = await response.json(); if (!response.ok) { setError(data.error || "Unable to save song links."); return; }
    setProfile(current => current ? { ...current, song: { ...current.song, ...songLinks } } : current); setSaved(true);
  }
  async function createVideoProject() {
    if (!profile) return; setError("");
    const response = await fetch("/api/music-video-projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: profile.song.id }) });
    const data = await response.json(); if (!response.ok || !data.id) { setError(data.error || "Unable to create music video workspace."); return; }
    location.href = `/admin/music-videos/${data.id}`;
  }
  if (loading) return <main className="min-h-screen bg-[#09090c] p-8 text-white/50">Loading song profile…</main>;
  if (!profile) return <main className="min-h-screen bg-[#09090c] p-8 text-red-200">{error || "Song profile unavailable."}</main>;
  return <main className="admin-dashboard min-h-screen p-4 text-white sm:p-8" style={{ background: "#09090c" }}><div className="mx-auto max-w-6xl"><Link href="/admin" className="text-sm text-white/65">← Song hub</Link><header className="my-6 grid gap-5 sm:grid-cols-[9rem_1fr] sm:items-center"><img src={profile.coverUrl} alt={`${profile.song.title} artwork`} className="aspect-square w-36 rounded-xl object-cover"/><div><p className="text-xs font-bold tracking-[.22em] text-[#FC54AF]">SONG WORKSPACE · {profile.song.is_released ? "RELEASED" : "IN PROGRESS"}</p><h1 className="mt-2 text-3xl font-black">{profile.song.title}</h1><p className="mt-2 text-sm text-white/65">{profile.song.slug}</p><audio controls preload="none" src={releaseAudioSrc(profile.song.slug)} className="mt-4 h-9 w-full max-w-md" /></div></header>
    <nav aria-label="Song project steps" className="mb-6 grid gap-2 rounded-2xl border border-[#292930] bg-[#111116] p-3 sm:grid-cols-5">{[["✍️", "Profile", "#song-meaning", "#FC54AF"], ["🎙️", "Story & lyrics", "#song-lyrics", "#38B6FF"], ["🤝", "Collaboration", "/admin/collaborations", "#FC54AF"], ["🎬", "Music video", "#song-video", "#38B6FF"], ["🚀", "Release", "#song-links", "#F2EF1D"]].map(([icon, label, href, color]) => <a key={label} href={href} style={{ color }} className="flex items-center gap-2 rounded-xl bg-[#19191f] px-3 py-3 text-sm font-bold"><span className="text-lg">{icon}</span>{label}<span className="ml-auto text-xs text-white/35">→</span></a>)}</nav>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2"><section id="song-meaning" className="scroll-mt-5 rounded-2xl border border-[#FC54AF]/25 bg-[#121217] p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">01 · Song meaning</h2><button onClick={() => void saveMeaning()} className="rounded-lg bg-[#FC54AF] px-3 py-2 text-xs font-bold text-[#160711]">Save story</button></div><textarea value={meaning} onChange={event => { setMeaning(event.target.value); setSaved(false); }} rows={7} placeholder="Themes, story, and what the song means…" className="w-full rounded-lg border border-[#383840] bg-[#09090c] p-3 text-sm leading-6 text-white placeholder:text-white/45"/>{saved && <p className="mt-2 text-xs text-emerald-300">Song story saved.</p>}</section>
      <section id="song-video" className="scroll-mt-5 rounded-2xl border border-[#38B6FF]/25 bg-[#121217] p-4 sm:p-5"><h2 className="mb-3 text-lg font-bold">04 · Music video</h2>{profile.musicVideo ? <><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#38B6FF]/10 px-3 py-1.5 text-[#83d1ff]">{profile.musicVideo.status}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-white/75">{profile.musicVideo.visibility.replaceAll("_", " ")}</span></div>{profile.musicVideo.public_concept && <p className="mt-3 text-sm leading-6 text-white/75">{profile.musicVideo.public_concept}</p>}<p className="mt-3 text-sm text-white/65">Next action: {profile.musicVideo.next_action}</p><Link href={`/admin/music-videos/${profile.musicVideo.id}`} className="mt-4 inline-block text-sm font-bold text-[#83d1ff]">Open video workspace ↗</Link></> : <><p className="text-sm text-white/70">No video workspace is attached to this song yet.</p><button onClick={() => void createVideoProject()} className="mt-4 rounded-lg border border-[#38B6FF]/50 px-3 py-2 text-sm font-semibold text-[#83d1ff]">Create video workspace</button></>}</section>
      <section id="song-lyrics" className="scroll-mt-5 rounded-2xl border border-[#38B6FF]/25 bg-[#121217] p-4 sm:p-5 lg:col-span-2"><h2 className="mb-3 text-lg font-bold">02 · Lyrics & practice</h2><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">{lyrics}</pre></section>
      <section id="song-links" className="scroll-mt-5 rounded-2xl border border-[#F2EF1D]/25 bg-[#121217] p-4 sm:p-5 lg:col-span-2"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">05 · Release & platform links</h2><p className="mt-1 text-sm text-white/65">Keep streaming, video, karaoke, and Heartverse links with the song.</p></div><button onClick={() => void saveLinks()} className="rounded-lg bg-[#F2EF1D] px-4 py-2 text-xs font-extrabold text-[#171707]">Save links</button></div><div className="grid gap-3 sm:grid-cols-2">{fields.map(([label, key]) => <label key={key} className="text-xs font-bold text-white/75">{label}<input type="url" value={songLinks[key] || ""} onChange={event => { setSongLinks(current => ({ ...current, [key]: event.target.value })); setSaved(false); }} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-[#383840] bg-[#09090c] px-3 py-2.5 text-sm font-normal text-white placeholder:text-white/45 focus:border-[#F2EF1D] focus:outline-none"/></label>)}</div>{saved && <p className="mt-3 text-xs text-emerald-300">Song links saved.</p>}</section>
    </div></div></main>;
}
