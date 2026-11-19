"use client";

import { useEffect, useState } from "react";

type Video = { id: string; song_title: string; video_link: string; tags: string; updated_at: string };

export default function YouTubeTab() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/youtube-content", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setVideos(data.videos || []);
    else setNotice(data.error || "Unable to load YouTube content.");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function edit(id: string, patch: Partial<Video>) {
    setVideos(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row));
    setNotice("");
  }

  async function save(video: Video) {
    setSaving(video.id); setNotice("");
    const response = await fetch("/api/admin/youtube-content", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: video.id, video_link: video.video_link, tags: video.tags }),
    });
    const data = await response.json();
    if (response.ok) {
      setVideos(rows => rows.map(row => row.id === video.id ? data.video : row));
      setNotice(`Saved ${video.song_title}.`);
    } else setNotice(data.error || "Unable to save this video.");
    setSaving("");
  }

  return <section>
    <header className="mb-5 rounded-2xl border border-[#FC54AF]/25 bg-[#121217] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#FC54AF]">Content publishing</p>
      <h2 className="mt-1 text-2xl font-black">YouTube</h2>
      <p className="mt-2 text-sm text-white/75">Keep video links and searchable tags ready when posting. YouTube tags are limited to 500 characters.</p>
      <p className="mt-3 text-sm font-semibold text-[#83d1ff]">{videos.length} videos <span className="text-white/45">·</span> {videos.filter(video => video.video_link).length} with links</p>
    </header>
    {notice && <p role="status" className="mb-4 rounded-xl border border-[#38B6FF]/25 bg-[#38B6FF]/[.08] px-4 py-3 text-sm text-white/90">{notice}</p>}
    {loading ? <div className="rounded-xl border border-[#292930] bg-[#121217] p-8 text-center text-sm text-white/75">Loading YouTube content…</div> : <div className="space-y-4">{videos.map(video => <article key={video.id} className="rounded-2xl border border-[#292930] bg-[#121217] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-white">{video.song_title}</h3><span className="rounded-full bg-[#38B6FF]/10 px-3 py-1 text-xs font-bold text-[#83d1ff]">{video.video_link ? "Link added" : "Needs video link"}</span></div>
      <label className="mb-4 block text-xs font-bold uppercase tracking-[.12em] text-white/75">Video link<input value={video.video_link} onChange={event => edit(video.id, { video_link: event.target.value })} type="url" placeholder="https://www.youtube.com/watch?v=…" className="mt-2 w-full rounded-lg border border-[#383840] bg-[#09090c] p-3 text-sm font-normal text-white placeholder:text-white/45 focus:border-[#38B6FF] focus:outline-none" /></label>
      <label className="mb-4 block text-xs font-bold uppercase tracking-[.12em] text-white/75">YouTube tags <span className="text-[#83d1ff]">· {video.tags.length}/500</span><textarea value={video.tags} maxLength={500} onChange={event => edit(video.id, { tags: event.target.value })} rows={3} placeholder="Comma-separated tags" className="mt-2 w-full resize-y rounded-lg border border-[#383840] bg-[#09090c] p-3 text-sm font-normal leading-6 text-white placeholder:text-white/45 focus:border-[#38B6FF] focus:outline-none" /></label>
      <div className="flex justify-end"><button type="button" onClick={() => void save(video)} disabled={saving === video.id} className="rounded-lg bg-[#FC54AF] px-4 py-2.5 text-sm font-extrabold text-[#160711] disabled:opacity-50">{saving === video.id ? "Saving…" : "Save changes"}</button></div>
    </article>)}</div>}
  </section>;
}
