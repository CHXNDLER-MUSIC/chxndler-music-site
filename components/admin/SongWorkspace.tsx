"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import SongPractice from "@/components/admin/SongPractice";
import SongContent from "@/components/admin/SongContent";
import OutreachWorkspace from "@/components/admin/OutreachWorkspace";
import SongProductionProgress from "@/components/admin/SongProductionProgress";
import PostReleaseIconRow, { type PostReleaseKey, type PostReleaseState } from "@/components/admin/PostReleaseIconRow";
import { songProductionLabel } from "@/lib/songWorkflow";

type SongProfile = {
  id: string; title: string; slug: string; is_released: boolean; release_date: string | null;
  spotify_url: string | null; apple_music_url: string | null; youtube_music_video_url: string | null;
  karaoke_url: string | null; sky_video_url: string | null; production_stages: Record<string, boolean> | null;
  production_tracking_started: boolean; production_progress_verified: boolean; audio_status: string | null;
  workflow_stage: string | null; ready_for_collab: boolean; collab_interests: string[];
  collaboration_description: string; practice_notes: string; next_action: string | null;
  category: string; submit_hub: string; genre: string; sub_genre: string; sub_genre_2: string;
  lyrics: string; bpm: number | null; musical_key: string; capo_fret: number | null; chord_shape: string;
};
type MusicVideoProject = {
  id: string; status: string; visibility: string; public_concept: string; workspace: Record<string, unknown>;
  next_action: string; assigned_videographer: Record<string, unknown>;
};
type Profile = {
  song: SongProfile; postRelease: PostReleaseState; meaning: string; lyricUrl: string; coverUrl: string;
  musicVideo: MusicVideoProject | null;
  requests: Array<{ id: string; status: string; submitted_at: string; contribution_type: string; artist_name: string; message: string | null }>;
};
type ContentSummary = { total: number; recorded: number; edited: number; posted: number };
type Tab = "Overview" | "Practice" | "Content" | "Outreach" | "Music Video";

const links: Array<[string, keyof SongProfile]> = [
  ["Spotify", "spotify_url"], ["Apple Music", "apple_music_url"],
  ["Music video", "youtube_music_video_url"], ["Sky video", "sky_video_url"], ["Karaoke", "karaoke_url"],
];
const baseTabs: Tab[] = ["Overview", "Practice", "Content", "Outreach"];
const postReleaseStage: Record<PostReleaseKey, string> = {
  spotifyCanvas: "spotify_canvas", sky: "sky", chxndlerCard: "chxndler_card", musicVideo: "music_video_released",
  contentReleased: "content_released", playlistPitched: "playlist_pitch", syncPlacement: "sync_placement",
};

function projectStage(project: MusicVideoProject) {
  const production = (project.workspace?.production || {}) as Record<string, unknown>;
  const stage = typeof production.stage === "string" ? production.stage : "";
  const legacy: Record<string, string> = { concept: "Concept", planning: "Planning", agreement: "Pre-production", filming: "Filming", editing: "Editing", delivered: "Delivered", complete: "Released" };
  return stage || legacy[project.status] || project.status || "Planning";
}
function projectVideographer(project: MusicVideoProject) {
  return String(project.assigned_videographer?.name || project.assigned_videographer?.email || "Not assigned");
}
export default function SongWorkspace({ id, embedded = false, onBack }: { id: string; embedded?: boolean; onBack?: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [meaning, setMeaning] = useState("");
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("Overview");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contentSummary, setContentSummary] = useState<ContentSummary | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  async function load(): Promise<Profile | null> {
    setLoading(true); setProfile(null); setError("");
    const response = await fetch(`/api/admin/song-profile?id=${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load song workspace."); setLoading(false); return null; }
    setProfile(data);
    setMeaning(data.meaning || "");
    setLinkValues(Object.fromEntries(links.map(([label, key]) => [key, data.song[key] || ""])));
    setLoading(false);
    try {
      const [lyricsResponse, contentResponse] = await Promise.all([
        fetch(data.lyricUrl, { cache: "no-store" }),
        fetch(`/api/admin/content-items?songId=${id}&pageSize=100`, { cache: "no-store" }),
      ]);
      const [lyricsData, contentData] = await Promise.all([lyricsResponse.json(), contentResponse.json()]);
      setLyrics(data.song.lyrics || (lyricsResponse.ok ? lyricsData.content || "" : ""));
      if (contentResponse.ok && contentData.songSummary) setContentSummary(contentData.songSummary);
      else setContentSummary(null);
    } catch {
      setLyrics(data.song.lyrics || "");
      setContentSummary(null);
    }
    return data as Profile;
  }

  useEffect(() => {
    void load().then(data => {
      if (!data) return;
      const params = new URLSearchParams(window.location.search);
      const requested = (params.get("tab") || "").replaceAll("-", " ").toLowerCase();
      const remembered = window.localStorage.getItem(`song-workspace-tab:${id}`)?.toLowerCase();
      const available: Tab[] = data.musicVideo ? [...baseTabs, "Music Video"] : baseTabs;
      const selected = available.find(item => item.toLowerCase() === requested) || available.find(item => item.toLowerCase() === remembered);
      if (selected) setTab(selected);
    });
  // The song id identifies the workspace loaded above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function selectTab(next: Tab) {
    setTab(next);
    window.localStorage.setItem(`song-workspace-tab:${id}`, next);
    if (!embedded) {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", next.toLowerCase().replace(" ", "-"));
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
  }

  async function patchSong(body: Record<string, unknown>) {
    if (!profile) return false;
    setBusy(true); setError("");
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id, ...body }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Unable to save song."); return false; }
    setProfile(current => {
      if (!current) return current;
      const song = { ...current.song, ...body } as SongProfile;
      if (typeof body.stage === "string" && typeof body.complete === "boolean") song.production_stages = { ...(current.song.production_stages || {}), [body.stage]: body.complete };
      if (typeof body.workflow_stage === "string") song.production_tracking_started = true;
      const stageKey = typeof body.stage === "string" ? (Object.entries(postReleaseStage).find(([, value]) => value === body.stage)?.[0] as PostReleaseKey | undefined) : undefined;
      return { ...current, song, postRelease: stageKey && typeof body.complete === "boolean" ? { ...current.postRelease, [stageKey]: body.complete } : current.postRelease };
    });
    return true;
  }

  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaved(false); setError("");
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { songId: id };
    for (const key of ["meaning", "category", "submit_hub", "genre", "sub_genre", "sub_genre_2", "musical_key"]) body[key] = String(form.get(key) || "");
    body.bpm = String(form.get("bpm") || "") ? Number(form.get("bpm")) : null;
    body.release_date = String(form.get("release_date") || "") || null;
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to save song details."); return; }
    setProfile(current => current ? { ...current, song: { ...current.song, ...body } as SongProfile, meaning: String(body.meaning || "") } : current);
    setMeaning(String(body.meaning || "")); setSaved(true);
  }

  async function savePracticeSetup(values: { musical_key: string; capo_fret: number | null; chord_shape: string }) {
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id, ...values }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to save song setup."); return false; }
    setProfile(current => current ? { ...current, song: { ...current.song, ...values } } : current);
    return true;
  }

  async function savePracticeLyrics(value: string) {
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id, lyrics: value }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to save lyrics."); return false; }
    setLyrics(value);
    setProfile(current => current ? { ...current, song: { ...current.song, lyrics: value } } : current);
    return true;
  }

  async function savePracticeNotes(value: string) {
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id, practice_notes: value }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to save performance notes."); return false; }
    setProfile(current => current ? { ...current, song: { ...current.song, practice_notes: value } } : current);
    return true;
  }

  async function saveLinks() {
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id, links: linkValues }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to save streaming links."); return; }
    setProfile(current => current ? { ...current, song: { ...current.song, ...linkValues } as SongProfile } : current);
    setSaved(true);
  }

  async function createVideo() {
    setBusy(true); setError("");
    const response = await fetch("/api/music-video-projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok || !data.id) { setError(data.error || "Unable to create the video workspace."); return; }
    await load(); selectTab("Music Video");
  }

  if (loading) return <main className={`flex ${embedded ? "min-h-full" : "min-h-screen"} items-center justify-center bg-[#0b0b0f] p-6 text-sm text-white/55`}><span className="inline-flex items-center gap-3"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-[#42B8E8]"/>Loading song workspace…</span></main>;
  if (!profile) return <main className={`${embedded ? "min-h-full" : "min-h-screen"} bg-[#0b0b0f] p-6 text-sm text-rose-200`}>{error || "Song unavailable."}</main>;

  const song = profile.song;
  const tabs: Tab[] = profile.musicVideo ? [...baseTabs, "Music Video"] : baseTabs;
  const needsAttention = contentSummary ? Math.max(0, contentSummary.total - contentSummary.posted) : 0;
  const contentPercent = contentSummary?.total ? Math.round(contentSummary.posted / contentSummary.total * 100) : 0;

  return <main style={{ background: "#0b0b0f" }} className={`admin-dashboard relative isolate ${embedded ? "min-h-full" : "min-h-screen"} !bg-[#0b0b0f] p-4 text-white sm:p-6`}>
    <div className="relative z-10 mx-auto max-w-6xl">
      {embedded && onBack ? <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3.5 text-sm font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">← Back to Songs</button> : !embedded && <Link href="/admin?view=songs" className="mb-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3.5 text-sm font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">← Back to Songs</Link>}

      <header className="mb-5 flex flex-wrap items-center gap-4 sm:gap-5">
        <img src={profile.coverUrl} alt={`${song.title} artwork`} className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover shadow-[0_10px_32px_rgba(0,0,0,.3)] sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#EF43A3]">Song workspace</p><h1 className="mt-1 break-words text-2xl font-black tracking-tight sm:text-3xl">{song.title}</h1><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50"><span><span className="text-white/30">Release status</span> <strong className="font-semibold text-white/75">{song.is_released ? "Released" : "Unreleased"}</strong></span><span aria-hidden="true" className="text-white/20">·</span><span><span className="text-white/30">Production stage</span> <strong className="font-semibold text-white/75">{songProductionLabel(song)}</strong></span>{song.release_date && <><span aria-hidden="true" className="text-white/20">·</span><span><span className="text-white/30">Release date</span> <strong className="font-semibold text-white/75">{song.release_date}</strong></span></>}</div></div>
        <button type="button" onClick={() => { if (tab !== "Overview") selectTab("Overview"); window.setTimeout(() => { if (detailsRef.current) { detailsRef.current.open = true; detailsRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); } }, 0); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">Edit details</button>
      </header>

      <nav aria-label="Song workspace" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/[.07] bg-[#111116] p-1">{tabs.map(item => <button key={item} type="button" onClick={() => selectTab(item)} aria-current={tab === item ? "page" : undefined} className={`shrink-0 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition sm:flex-1 sm:text-sm ${tab === item ? "bg-[#EF43A3]/12 text-white shadow-[inset_0_0_0_1px_rgba(239,67,163,.28)]" : "text-white/45 hover:bg-white/[.04] hover:text-white/80"}`}>{item}</button>)}</nav>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-300/20 bg-red-300/[.06] px-3 py-2.5 text-sm text-red-200">{error}</p>}

      {tab === "Overview" && <div className="space-y-4">
        <SongProductionProgress song={song} onSaved={updated => setProfile(current => current ? { ...current, song: { ...current.song, ...updated } } : current)} />

        <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-post-release-progress">
          <div className="mb-2"><p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-white/38">Release &amp; promotion</p><h2 id="song-post-release-progress" className="mt-1 text-sm font-bold">Post release</h2></div>
          <PostReleaseIconRow compact state={profile.postRelease} onToggle={(key, value) => void patchSong({ stage: postReleaseStage[key], complete: value })} />
        </section>

        <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-content-progress">
          <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-white/38">Publishing</p><h2 id="song-content-progress" className="mt-1 text-sm font-bold">Content <span className="ml-1 font-semibold text-white/55">— {contentSummary ? `${contentSummary.posted} of ${contentSummary.total} posted` : "Loading totals…"}</span></h2></div><button type="button" onClick={() => selectTab("Content")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#EF43A3]/40 hover:text-white">View Content</button></div>
          {contentSummary && <><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-[#EF43A3] transition-[width]" style={{ width: `${contentPercent}%` }} /></div><p className="mt-2 text-xs text-white/45">{needsAttention} {needsAttention === 1 ? "item" : "items"} remaining <span className="mx-1.5 text-white/20">·</span>{contentPercent}% complete</p></>}
        </section>

        {profile.musicVideo ? <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-music-video">
          <div className="flex flex-wrap items-start gap-3"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-white/38">Creative production</p><h2 id="song-music-video" className="mt-1 text-sm font-bold">Music Video</h2></div><button type="button" onClick={() => selectTab("Music Video")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#EF43A3]/40 hover:text-white">Open Project</button></div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-[.65rem] text-white/38">Current stage</p><p className="mt-1 font-semibold text-white/80">{projectStage(profile.musicVideo)}</p></div><div><p className="text-[.65rem] text-white/38">Videographer</p><p className="mt-1 font-semibold text-white/80">{projectVideographer(profile.musicVideo)}</p></div><div><p className="text-[.65rem] text-white/38">Next action</p><p className="mt-1 font-semibold text-white/80">{profile.musicVideo.next_action || "Add a next action"}</p></div></div>
        </section> : <section className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:px-5"><div className="mr-auto"><h2 className="text-sm font-bold">Music Video</h2><p className="mt-1 text-xs text-white/45">No project started.</p></div><button type="button" disabled={busy} onClick={() => void createVideo()} className="rounded-lg bg-[#EF43A3] px-3.5 py-2.5 text-xs font-bold text-[#170d14] transition hover:brightness-110 disabled:opacity-50">{busy ? "Planning…" : "+ Plan Music Video"}</button></section>}

        <details ref={detailsRef} className="rounded-xl border border-white/[.08] bg-[#111116]">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-white/75 marker:hidden sm:px-5"><span className="mr-auto">Song Details</span><span className="text-[.65rem] font-normal text-white/35">Metadata, release links &amp; promotion</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m5 7.5 5 5 5-5"/></svg></summary>
          <div className="space-y-5 border-t border-white/[.07] px-4 py-4 sm:px-5">
            <form onSubmit={saveCatalog} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([ ["Meaning", "meaning", meaning], ["Category", "category", song.category], ["Submit Hub", "submit_hub", song.submit_hub], ["Genre", "genre", song.genre], ["Sub-genre", "sub_genre", song.sub_genre], ["Sub-genre 2", "sub_genre_2", song.sub_genre_2] ] as const).map(([label, name, value]) => <label key={name} className="text-xs font-medium text-white/45">{label}<input name={name} defaultValue={value || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>)}
              <label className="text-xs font-medium text-white/45">BPM<input name="bpm" type="number" min="1" max="400" defaultValue={song.bpm ?? ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>
              <label className="text-xs font-medium text-white/45">Release date<input name="release_date" type="date" defaultValue={song.release_date || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>
              <button type="submit" className="self-end justify-self-start rounded-lg bg-[#EF43A3] px-4 py-2.5 text-xs font-bold text-[#170d14] transition hover:brightness-110">Save song details</button>{saved && <span role="status" className="self-center text-xs text-emerald-300">Saved</span>}
            </form>

            <div className="border-t border-white/[.07] pt-4"><p className="mb-3 text-xs font-semibold text-white/65">Streaming &amp; associated links</p><div className="grid gap-3 sm:grid-cols-2">{links.map(([label, key]) => <label key={key} className="text-xs font-medium text-white/45">{label}<input type="url" value={linkValues[key] || ""} onChange={event => setLinkValues(current => ({ ...current, [key]: event.target.value }))} placeholder="https://" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>)}</div><button type="button" onClick={() => void saveLinks()} className="mt-3 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">Save links</button></div>

            <div className="border-t border-white/[.07] pt-4"><p className="mb-3 text-xs font-semibold text-white/65">Release &amp; promotion progress</p><PostReleaseIconRow state={profile.postRelease} onToggle={(key, value) => void patchSong({ stage: postReleaseStage[key], complete: value })} /></div>
          </div>
        </details>
      </div>}

      {tab === "Practice" && <SongPractice songId={song.id} title={song.title} slug={song.slug} musicalKey={song.musical_key || ""} capoFret={song.capo_fret} chordShape={song.chord_shape || ""} initialLyrics={song.lyrics || lyrics} initialNotes={song.practice_notes || ""} onSaveSetup={savePracticeSetup} onSaveLyrics={savePracticeLyrics} onSaveNotes={savePracticeNotes} />}
      {tab === "Content" && <SongContent songId={song.id} songTitle={song.title} />}
      {tab === "Music Video" && profile.musicVideo && <MusicVideoSummary songTitle={song.title} project={profile.musicVideo} />}
      {tab === "Outreach" && <><div className="mb-4 flex flex-wrap items-center gap-3"><h2 className="mr-auto text-base font-bold">Song outreach</h2><Link href={`/admin?view=outreach&section=pitches&song=${encodeURIComponent(song.id)}`} className="text-sm font-semibold text-[#EF43A3]">Full Outreach view ↗</Link></div><OutreachWorkspace initialSection="pitches" initialSongId={song.id} songCollaborationSettings={<section className="mb-4 rounded-xl border border-white/[.07] bg-[#111116] p-4"><div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-sm font-bold">Song collaboration settings</h2><button type="button" disabled={busy} onClick={() => void patchSong({ ready_for_collab: !song.ready_for_collab })} className={`rounded-full px-3 py-2 text-xs font-bold ${song.ready_for_collab ? "bg-[#EF43A3]/15 text-[#ff9acb]" : "border border-white/15 text-white/55"}`}>{song.ready_for_collab ? "Requests enabled" : "Enable requests"}</button></div><fieldset className="mt-4"><legend className="mb-2 text-xs text-white/50">Interests</legend><div className="flex flex-wrap gap-4">{["Feature / Vocals", "Remix", "Music Video", "Other"].map(value => <label key={value} className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={song.collab_interests?.includes(value) || false} onChange={event => { const values = song.collab_interests || []; void patchSong({ collab_interests: event.target.checked ? [...values, value] : values.filter(item => item !== value) }); }} className="accent-[#EF43A3]" />{value}</label>)}</div></fieldset><label className="mt-3 block text-xs text-white/50">What are you looking for?<textarea value={song.collaboration_description || ""} onChange={event => setProfile(current => current ? { ...current, song: { ...current.song, collaboration_description: event.target.value } } : current)} onBlur={event => void patchSong({ collaboration_description: event.target.value })} maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white" /></label></section>} /></>}
      {busy && <p role="status" className="mt-3 text-xs text-white/40">Saving…</p>}
    </div>
  </main>;
}

function MusicVideoSummary({ songTitle, project }: { songTitle: string; project: MusicVideoProject }) {
  const stageList = ["Concept", "Planning", "Pre-production", "Filming", "Editing", "Review", "Delivered", "Released"];
  const production = (project.workspace?.production || {}) as Record<string, unknown>;
  const active = projectStage(project);
  const activeIndex = Math.max(0, stageList.indexOf(active));
  const shootDate = typeof production.shootDate === "string" ? production.shootDate : "";
  const deliveryDate = typeof production.deliveryDate === "string" ? production.deliveryDate : "";
  const budget = typeof production.budget === "string" ? production.budget : "";
  const assignee = projectVideographer(project);
  return <section className="space-y-4">
    <header className="flex flex-wrap items-start gap-3 rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5"><div className="mr-auto"><p className="text-[.62rem] font-bold uppercase tracking-[.15em] text-[#EF43A3]">Official music video</p><h2 className="mt-1 text-lg font-bold">{songTitle} — Official Music Video</h2><p className="mt-1 text-xs text-white/45">{assignee} · Next: {project.next_action || "Add a next action"}</p></div><Link href={`/admin/music-videos/${project.id}`} className="rounded-lg bg-[#EF43A3] px-3.5 py-2.5 text-xs font-bold text-[#170d14]">Open production workspace</Link></header>
    <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5"><p className="mb-3 text-xs font-semibold text-white/60">Production stage · {active}</p><div className="flex flex-wrap gap-2">{stageList.map((stage, index) => <div key={stage} className={`flex-1 basis-[28%] rounded-md border px-2 py-2 text-center text-[.68rem] ${index === activeIndex ? "border-[#EF43A3]/40 bg-[#EF43A3]/10 text-[#ff9dcd]" : index < activeIndex ? "border-emerald-300/15 text-emerald-200/75" : "border-white/[.06] text-white/35"}`}>{stage}</div>)}</div></section>
    <section className="grid gap-3 sm:grid-cols-3">{[["Shoot date", shootDate], ["Target delivery", deliveryDate], ["Budget", budget]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.08] bg-[#111116] p-4"><p className="text-xs text-white/40">{label}</p><p className="mt-1 text-sm text-white/75">{value || "Not set"}</p></div>)}</section>
    <p className="text-xs text-white/40">Creative brief, locations, shot list, proposal, agreement, and deliverables are managed in the linked production workspace.</p>
  </section>;
}
