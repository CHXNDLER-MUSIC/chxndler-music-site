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
    <header className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Content publishing</p>
      <h2 className="mt-1 text-2xl font-black">YouTube</h2>
      <p className="mt-2 text-sm text-white/55">Keep video links and searchable tags ready when posting. YouTube tags are limited to 500 characters.</p>
      <p className="mt-3 text-xs text-white/45">{videos.length} videos · {videos.filter(video => video.video_link).length} with links</p>
    </header>
    {notice && <p role="status" className="mb-4 text-sm text-white/70">{notice}</p>}
    {loading ? <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Loading YouTube content…</div> : <div className="space-y-3">{videos.map(video => <article key={video.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
      <h3 className="mb-3 font-bold">{video.song_title}</h3>
      <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Video link<input value={video.video_link} onChange={event => edit(video.id, { video_link: event.target.value })} type="url" placeholder="https://www.youtube.com/watch?v=…" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/25" /></label>
      <label className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">YouTube tags · {video.tags.length}/500<textarea value={video.tags} maxLength={500} onChange={event => edit(video.id, { tags: event.target.value })} rows={3} placeholder="Comma-separated tags" className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></label>
      <div className="flex justify-end"><button type="button" onClick={() => void save(video)} disabled={saving === video.id} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{saving === video.id ? "Saving…" : "Save changes"}</button></div>
    </article>)}</div>}
  </section>;
}
