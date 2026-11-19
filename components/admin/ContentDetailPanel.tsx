"use client";

import { useEffect, useMemo, useState } from "react";

export type ContentItem = {
  id: string; source_row: number | null; legacy_x5: boolean | null; title: string; category: string | null;
  sub_category: string | null; song_name: string | null; song_id: string | null; canonical_song_title: string | null;
  song_link_status: "matched" | "unmatched" | "ambiguous" | "unlinked"; recorded: boolean | null; edited: boolean | null;
  post_ready: boolean | null; media_type: string | null; purpose: string | null; source_url: string | null;
  media_url: string | null; script: string | null; planned_date: string | null; planned_time: string | null;
  caption: string | null; text_on_screen: string | null; hidden: boolean | null; hashtags: string | null;
  legacy_date_time: string | null; editor: string | null; legacy_minutes: string | null; published: boolean | null;
  legacy_posted_raw: string | null; is_placeholder_date: boolean; is_sample: boolean;
  workflow_status: string; recorded_at?: string | null; edited_at?: string | null; published_at?: string | null;
  platform?: string | null; music_video_project_id?: string | null; is_reportable?: boolean;
  music_video_status?: string | null; music_video_next_action?: string | null; created_at?: string; updated_at?: string;
};

export type CatalogSong = { id: string; title: string; slug: string };
type Draft = Omit<ContentItem, "id" | "source_row" | "canonical_song_title" | "song_link_status" | "workflow_status" | "is_sample" | "created_at" | "updated_at">;
const blank: Draft = { legacy_x5: false, title: "", category: "", sub_category: "", song_name: "", song_id: null, recorded: false, edited: false, post_ready: false, media_type: "", purpose: "", source_url: "", media_url: "", script: "", planned_date: null, planned_time: "", caption: "", text_on_screen: "", hidden: false, hashtags: "", legacy_date_time: "", editor: "", legacy_minutes: "", published: false, legacy_posted_raw: null, is_placeholder_date: false, recorded_at: null, edited_at: null, published_at: null, platform: "" };
const input = "mt-1 block w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#FD52AF]/45";
const nullable = (value: string | null | undefined) => value || "";

export default function ContentDetailPanel({ item, songs, onClose, onSaved, initialSongId }: { item: ContentItem | null; songs: CatalogSong[]; onClose: () => void; onSaved: (item: ContentItem) => void; initialSongId?: string | null }) {
  const [draft, setDraft] = useState<Draft>({ ...blank });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [workflow, setWorkflow] = useState("Idea");
  const selectedSong = useMemo(() => songs.find(song => song.id === draft.song_id) || null, [songs, draft.song_id]);

  useEffect(() => {
    setDraft(item ? {
      legacy_x5: item.legacy_x5, title: item.title, category: item.category, sub_category: item.sub_category,
      song_name: item.song_name, song_id: item.song_id, recorded: item.recorded, edited: item.edited,
      post_ready: item.post_ready, media_type: item.media_type, purpose: item.purpose, source_url: item.source_url,
      media_url: item.media_url, script: item.script, planned_date: item.planned_date, planned_time: item.planned_time,
      caption: item.caption, text_on_screen: item.text_on_screen, hidden: item.hidden, hashtags: item.hashtags,
      legacy_date_time: item.legacy_date_time, editor: item.editor, legacy_minutes: item.legacy_minutes,
      published: item.published, legacy_posted_raw: item.legacy_posted_raw, is_placeholder_date: item.is_placeholder_date,
      recorded_at: item.recorded_at || null, edited_at: item.edited_at || null, published_at: item.published_at || null, platform: item.platform || "",
    } : { ...blank, song_id: initialSongId || null, song_name: songs.find(song => song.id === initialSongId)?.title || "" });
    setWorkflow(item?.workflow_status === "Scheduled" ? "Scheduled" : item?.workflow_status === "Ready" ? "Ready" : item?.workflow_status || "Idea");
    setError("");
  }, [item, initialSongId, songs]);

  const set = (key: keyof Draft, value: string | boolean | null) => setDraft(current => ({ ...current, [key]: value }));
  const copy = async (label: string, text: string | null) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(`${label} copied`); window.setTimeout(() => setCopied(""), 1800); }
    catch { setCopied("Clipboard unavailable"); }
  };
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const stage = workflow === "Idea" || workflow === "To Record" ? { recorded: false, edited: false, post_ready: false, published: false } : workflow === "To Edit" ? { recorded: true, edited: false, post_ready: false, published: false } : workflow === "Ready" ? { recorded: true, edited: true, post_ready: true, published: false } : workflow === "Scheduled" ? { recorded: true, edited: true, post_ready: true, published: false, is_placeholder_date: false } : { recorded: true, edited: true, post_ready: true, published: true };
    const response = await fetch("/api/admin/content-items", { method: item ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item ? { id: item.id, ...draft, ...stage } : { ...draft, ...stage }) });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { setError(body.error || "Unable to save this content item."); return; }
    onSaved(body.item);
  }

  const isImage = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(draft.media_url || "");
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(draft.media_url || "");
  const filteredSongs = songQuery ? songs.filter(song => song.title.toLowerCase().includes(songQuery.toLowerCase())).slice(0, 12) : songs;
  const copyButton = (label: string, text: string | null) => <button type="button" onClick={() => void copy(label, text)} disabled={!text} className="text-[.68rem] font-semibold text-violet-200 hover:text-white disabled:opacity-30">Copy</button>;

  if (item?.music_video_project_id) return <div className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0d0d12] p-5 shadow-2xl sm:p-7"><header className="flex items-start"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Linked production project</p><h2 className="mt-1 text-xl font-black text-white">{item.title}</h2><p className="mt-1 text-sm text-white/45">{item.canonical_song_title || item.song_name} · {item.music_video_status || "Concept"}</p></div><button type="button" onClick={onClose} aria-label="Close project details" className="rounded-lg px-3 py-2 text-lg text-white/50 hover:bg-white/5">×</button></header><div className="mt-6 rounded-xl border border-white/[.08] bg-white/[.025] p-4"><p className="text-sm text-white/70">{item.music_video_next_action || "Continue planning this official music video in its project workspace."}</p></div><a href={`/admin/music-videos/${item.music_video_project_id}`} className="mt-5 rounded-lg bg-[#FD52AF] px-4 py-3 text-center text-sm font-bold text-black">Open Music Video workspace</a><p className="mt-3 text-xs text-white/35">This entry is linked to the song’s production project and is excluded from social content completion counts.</p></section></div>;

  return <div className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={save} className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0d0d12] shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6"><div className="mr-auto min-w-0"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#FD52AF]">{item ? "Content item" : "New content"}</p><h2 className="truncate text-lg font-black text-white">{item?.title || "Add content"}</h2></div>{item && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[.65rem] text-white/50">{item.workflow_status}</span>}<button type="button" onClick={onClose} aria-label="Close content details" className="rounded-lg px-3 py-2 text-lg text-white/50 hover:bg-white/5 hover:text-white">×</button></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}
        <section className="rounded-xl border border-white/[.08] bg-white/[.02] p-3 sm:p-4"><h3 className="text-xs font-bold uppercase tracking-[.14em] text-violet-200">Content details</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[.7rem] text-white/55 sm:col-span-2">Content title<input required value={draft.title} onChange={event => set("title", event.target.value)} className={input} maxLength={500}/></label>
          <label className="text-[.7rem] text-white/55">Song<select value={draft.song_id || ""} onChange={event => { const selected = songs.find(song => song.id === event.target.value); setDraft(current => ({ ...current, song_id: selected?.id || null, song_name: selected?.title || current.song_name || "" })); }} onFocus={() => setSongQuery("")} className={input}><option value="">No song association</option>{filteredSongs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select><span className="mt-1 block text-[.62rem] text-white/35">{item?.song_link_status === "ambiguous" ? "Legacy song name is ambiguous" : item?.song_link_status === "unmatched" ? "Legacy song name has no exact match" : selectedSong ? `Linked to ${selectedSong.title}` : "Unlinked content stays in the library."}</span></label>
          <label className="text-[.7rem] text-white/55">Find a catalog song<input value={songQuery} onChange={event => setSongQuery(event.target.value)} className={input} placeholder="Type to narrow song options"/></label>
          <label className="text-[.7rem] text-white/55">Type<input value={nullable(draft.media_type)} onChange={event => set("media_type", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Purpose<input value={nullable(draft.purpose)} onChange={event => set("purpose", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Status<select value={workflow} onChange={event => setWorkflow(event.target.value)} className={input}>{["Idea","To Record","To Edit","Ready","Scheduled","Posted"].map(value=><option key={value} value={value}>{value === "Ready" ? "Ready to Post" : value}</option>)}</select></label>
          <label className="text-[.7rem] text-white/55">Target date<input type="date" value={draft.planned_date || ""} onChange={event => { set("planned_date", event.target.value || null); if (event.target.value) setDraft(current => ({...current,is_placeholder_date:false})); }} className={input}/></label>
        </div></section>

        <details open={!!item} className="rounded-xl border border-white/[.08] bg-white/[.02] p-3 sm:p-4"><summary className="cursor-pointer text-xs font-bold uppercase tracking-[.14em] text-violet-200">Production details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/[.06] p-2.5 text-sm text-white/75"><input type="checkbox" checked={draft.recorded === true} onChange={event => set("recorded", event.target.checked)} className="accent-[#FD52AF]"/>Record complete</label>
          <label className="flex items-center gap-2 rounded-lg border border-white/[.06] p-2.5 text-sm text-white/75"><input type="checkbox" checked={draft.edited === true} onChange={event => set("edited", event.target.checked)} className="accent-[#FD52AF]"/>Edit complete</label>
          <label className="flex items-center gap-2 rounded-lg border border-white/[.06] p-2.5 text-sm text-white/75"><input type="checkbox" checked={draft.post_ready === true} onChange={event => set("post_ready", event.target.checked)} className="accent-[#FD52AF]"/>Post / scheduled</label>
          <label className="text-[.7rem] text-white/55">Category<input value={nullable(draft.category)} onChange={event => set("category", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Sub-category<input value={nullable(draft.sub_category)} onChange={event => set("sub_category", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Platform<input value={nullable(draft.platform)} onChange={event => set("platform", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Recorded date<input type="datetime-local" value={draft.recorded_at ? draft.recorded_at.slice(0, 16) : ""} onChange={event => set("recorded_at", event.target.value ? new Date(event.target.value).toISOString() : null)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Edited date<input type="datetime-local" value={draft.edited_at ? draft.edited_at.slice(0, 16) : ""} onChange={event => set("edited_at", event.target.value ? new Date(event.target.value).toISOString() : null)} className={input}/></label>
          <label className="text-[.7rem] text-white/55 sm:col-span-2">Script<textarea rows={3} value={nullable(draft.script)} onChange={event => set("script", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55 sm:col-span-2">Media attachment or link<input type="url" value={nullable(draft.media_url)} onChange={event => set("media_url", event.target.value)} className={input} placeholder="https://…"/>
            {draft.media_url && <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-black/25">{isImage ? <img src={draft.media_url} alt="Content media preview" className="max-h-64 w-full object-contain"/> : isVideo ? <video src={draft.media_url} controls preload="metadata" className="max-h-64 w-full"/> : <a href={draft.media_url} target="_blank" rel="noreferrer" className="block break-all p-3 text-xs text-violet-200 underline">Open media ↗</a>}</div>}
          </label>
        </div></details>

        <details open={!!item} className="rounded-xl border border-white/[.08] bg-white/[.02] p-3 sm:p-4"><summary className="cursor-pointer text-xs font-bold uppercase tracking-[.14em] text-violet-200">Publishing details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/[.06] p-2.5 text-sm text-white/75"><input type="checkbox" checked={draft.published === true} onChange={event => set("published", event.target.checked)} className="accent-[#FD52AF]"/>Posted</label>
          <label className="text-[.7rem] text-white/55">Posted date<input type="datetime-local" value={draft.published_at ? draft.published_at.slice(0, 16) : ""} onChange={event => set("published_at", event.target.value ? new Date(event.target.value).toISOString() : null)} className={input}/></label>
          <label className="flex items-center gap-2 rounded-lg border border-white/[.06] p-2.5 text-sm text-white/75"><input type="checkbox" checked={draft.is_placeholder_date} onChange={event => setDraft(current => ({ ...current, is_placeholder_date: event.target.checked }))} className="accent-amber-300"/>Date is a placeholder</label>
          <label className="text-[.7rem] text-white/55">Planned date<input type="date" value={draft.planned_date || ""} onChange={event => set("planned_date", event.target.value || null)} className={input}/></label>
          <label className="text-[.7rem] text-white/55">Planned time<input value={nullable(draft.planned_time)} onChange={event => set("planned_time", event.target.value)} className={input} placeholder="12:00 PM"/></label>
          <label className="text-[.7rem] text-white/55 sm:col-span-2">URL<input type="url" value={nullable(draft.source_url)} onChange={event => set("source_url", event.target.value)} className={input} placeholder="Published post or source URL"/></label>
          <label className="text-[.7rem] text-white/55 sm:col-span-2"><span className="flex items-center">Caption<span className="ml-auto">{copyButton("Caption", draft.caption)}</span></span><textarea rows={3} value={nullable(draft.caption)} onChange={event => set("caption", event.target.value)} className={input}/></label>
          <label className="text-[.7rem] text-white/55 sm:col-span-2"><span className="flex items-center">Hashtags<span className="ml-auto">{copyButton("Hashtags", draft.hashtags)}</span></span><textarea rows={2} value={nullable(draft.hashtags)} onChange={event => set("hashtags", event.target.value)} className={input}/></label>
        </div></details>

        <details className="rounded-xl border border-white/[.08] bg-white/[.02] p-3 sm:p-4"><summary className="cursor-pointer text-xs font-bold uppercase tracking-[.14em] text-white/55">Other imported fields</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[.7rem] text-white/55">Song name (imported)<input value={nullable(draft.song_name)} onChange={event => set("song_name", event.target.value)} className={input} placeholder="Legacy song name"/></label>
          <label className="text-[.7rem] text-white/55">Text on screen<textarea rows={2} value={nullable(draft.text_on_screen)} onChange={event => set("text_on_screen", event.target.value)} className={input}/></label>
          <label className="flex items-center gap-2 text-sm text-white/55"><input type="checkbox" checked={draft.hidden === true} onChange={event => set("hidden", event.target.checked)} className="accent-[#FD52AF]"/>Hidden</label>
          <p className="text-[.68rem] text-white/40 sm:col-span-2">Source row {item?.source_row ?? "new"} · Original posted value {item?.legacy_posted_raw || "—"} · Legacy date/time {item?.legacy_date_time || "—"} · Editor {item?.editor || "—"} · Minutes {item?.legacy_minutes || "—"} · X5 {item?.legacy_x5 == null ? "—" : String(item.legacy_x5)}</p>
        </div></details>
      </div>
      <footer className="flex items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-6"><p className="mr-auto text-xs text-emerald-300">{copied}</p><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60">Close</button><button disabled={saving} className="rounded-lg bg-[#FD52AF] px-5 py-2 text-sm font-bold text-black disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button></footer>
    </form>
  </div>;
}
