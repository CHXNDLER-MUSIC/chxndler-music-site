"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Clapperboard, Lightbulb, Rocket } from "lucide-react";
import SongPractice from "@/components/admin/SongPractice";
import SongContent from "@/components/admin/SongContent";
import OutreachWorkspace from "@/components/admin/OutreachWorkspace";
import SongProductionProgress from "@/components/admin/SongProductionProgress";
import MusicVideoWorkspace from "@/components/admin/MusicVideoWorkspace";
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
  metadata_provenance?: Record<string, string>;
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

function musicVideoStages(project: MusicVideoProject) {
  const workspace = project.workspace || {};
  const creative = (workspace.creative || {}) as Record<string, any>;
  const concepts = Array.isArray(creative.concepts) ? creative.concepts : [];
  const concept = concepts.find((item: Record<string, any>) => item.id === creative.selectedConceptId) || concepts.find((item: Record<string, any>) => !item.archived) || concepts[0];
  const readiness = (workspace.readiness || {}) as Record<string, string>;
  const release = (workspace.release || {}) as Record<string, any>;
  const creativeComplete = Boolean(concept && (concept.developmentStatus === "developed" || concept.synopsis?.trim() || concept.story?.trim()));
  const productionComplete = (Object.keys(readiness).length > 0 && Object.values(readiness).every(value => value === "ready")) || ["filming", "editing", "delivered", "complete"].includes(project.status);
  const releaseComplete = release.publicationConfirmed === true || release.publicationStatus === "Published";
  return [
    { label: "Creative", Icon: Lightbulb, complete: creativeComplete },
    { label: "Production", Icon: Clapperboard, complete: productionComplete },
    { label: "Release", Icon: Rocket, complete: releaseComplete },
  ];
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
      const requested = (new URLSearchParams(window.location.search).get("tab") || "").replaceAll("-", " ").toLowerCase();
      const available: Tab[] = data.musicVideo && !data.song.youtube_music_video_url ? [...baseTabs, "Music Video"] : baseTabs;
      setTab(available.find(item => item.toLowerCase() === requested) || "Overview");
    });
  // The song id identifies the workspace loaded above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function selectTab(next: Tab) {
    setTab(next);
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
    for (const key of ["meaning", "category", "genre", "sub_genre", "sub_genre_2", "musical_key"]) body[key] = String(form.get(key) || "");
    body.bpm = String(form.get("bpm") || "") ? Number(form.get("bpm")) : null;
    body.release_date = String(form.get("release_date") || "") || null;
    const response = await fetch("/api/admin/song-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to save song details."); return; }
    setProfile(current => current ? { ...current, song: { ...current.song, ...body, metadata_provenance: Object.fromEntries(Object.entries(current.song.metadata_provenance || {}).filter(([key]) => !(key in body))) } as SongProfile, meaning: String(body.meaning || "") } : current);
    setMeaning(String(body.meaning || "")); setSaved(true);
  }

  async function savePracticeSetup(values: { bpm: number | null; musical_key: string; capo_fret: number | null; chord_shape: string }) {
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

  async function createVideo(destination: Tab = "Music Video") {
    setBusy(true); setError("");
    const response = await fetch("/api/music-video-projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: id }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok || !data.id) { setError(data.error || "Unable to create the video workspace."); return; }
    await load(); selectTab(destination);
  }

  if (loading) return <main style={{ background: "#0b0b0f" }} className={`admin-dashboard flex ${embedded ? "min-h-full" : "min-h-screen"} items-center justify-center !bg-[#0b0b0f] p-6 text-sm text-white/55`}><span className="inline-flex items-center gap-3"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-[#EF43A3]"/>Loading song workspace…</span></main>;
  if (!profile) return <main className={`${embedded ? "min-h-full" : "min-h-screen"} bg-[#0b0b0f] p-6 text-sm text-rose-200`}>{error || "Song unavailable."}</main>;

  const song = profile.song;
  const tabs: Tab[] = profile.musicVideo && !profile.song.youtube_music_video_url ? [...baseTabs, "Music Video"] : baseTabs;
  const needsAttention = contentSummary ? Math.max(0, contentSummary.total - contentSummary.posted) : 0;
  const contentPercent = contentSummary?.total ? Math.round(contentSummary.posted / contentSummary.total * 100) : 0;

  return <main style={{ background: "#0b0b0f", minWidth: embedded ? 0 : "100vw", width: embedded ? "100%" : undefined }} className={`admin-dashboard relative isolate ${embedded ? "min-h-full" : "min-h-screen"} !bg-[#0b0b0f] p-4 text-white sm:p-6`}>
    <div className="relative z-10 mx-auto max-w-6xl">
      {embedded && onBack ? <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3.5 text-sm font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">← Back to Songs</button> : !embedded && <Link href="/admin?view=songs" className="mb-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3.5 text-sm font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">← Back to Songs</Link>}

      <header className="mb-5 flex flex-wrap items-center gap-4 sm:gap-5">
        <img src={profile.coverUrl} alt={`${song.title} artwork`} className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover shadow-[0_10px_32px_rgba(0,0,0,.3)] sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#EF43A3]">Song workspace</p><h1 className="mt-1 break-words text-2xl font-black tracking-tight sm:text-3xl">{song.title}</h1><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50"><span><span className="text-white/30">Release status</span> <strong className="font-semibold text-white/75">{song.is_released ? "Released" : "Unreleased"}</strong></span><span aria-hidden="true" className="text-white/20">·</span><span><span className="text-white/30">Production stage</span> <strong className="font-semibold text-white/75">{songProductionLabel(song)}</strong></span>{song.release_date && <><span aria-hidden="true" className="text-white/20">·</span><span><span className="text-white/30">Release date</span> <strong className="font-semibold text-white/75">{song.release_date}</strong></span></>}</div></div>
      </header>

      <nav aria-label="Song workspace" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/[.07] bg-[#111116] p-1">{tabs.map(item => <button key={item} type="button" onClick={() => selectTab(item)} aria-current={tab === item ? "page" : undefined} className={`shrink-0 rounded-lg px-3.5 py-2.5 text-xs font-semibold uppercase transition sm:flex-1 sm:text-sm ${tab === item ? "bg-[#EF43A3]/12 text-white shadow-[inset_0_0_0_1px_rgba(239,67,163,.28)]" : "text-white/45 hover:bg-white/[.04] hover:text-white/80"}`}>{item}</button>)}</nav>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-300/20 bg-red-300/[.06] px-3 py-2.5 text-sm text-red-200">{error}</p>}

      {tab === "Overview" && <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
          <SongProductionProgress song={song} onSaved={updated => setProfile(current => current ? { ...current, song: { ...current.song, ...updated } } : current)} />
          <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-post-release-progress">
            <div className="mb-2"><h2 id="song-post-release-progress" className="text-sm font-bold uppercase tracking-[.08em]">POST RELEASE</h2></div>
            <PostReleaseIconRow compact state={profile.postRelease} onToggle={(key, value) => void patchSong({ stage: postReleaseStage[key], complete: value })} />
          </section>
        </div>

        <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-content-progress">
          <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 id="song-content-progress" className="text-sm font-bold uppercase tracking-[.08em]">CONTENT <span className="ml-1 font-semibold normal-case tracking-normal text-white/55">— {contentSummary ? `${contentSummary.posted} of ${contentSummary.total} posted` : "Loading totals…"}</span></h2></div><button type="button" onClick={() => selectTab("Content")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#EF43A3]/40 hover:text-white">View Content</button></div>
          {contentSummary && <><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-[#EF43A3] transition-[width]" style={{ width: `${contentPercent}%` }} /></div><p className="mt-2 text-xs text-white/45">{needsAttention} {needsAttention === 1 ? "item" : "items"} remaining <span className="mx-1.5 text-white/20">·</span>{contentPercent}% complete</p></>}
        </section>

        <section className="rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-music-video">
          <div className="flex flex-wrap items-start gap-3"><div className="mr-auto"><h2 id="song-music-video" className="text-sm font-bold uppercase tracking-[.08em]">MUSIC VIDEO</h2><p className={`mt-1 text-xs ${profile.postRelease.musicVideo ? "text-emerald-300" : "text-white/45"}`}>{profile.postRelease.musicVideo ? "Completed" : profile.musicVideo ? "Project in progress" : "No project started."}</p></div>{profile.musicVideo && <button type="button" onClick={() => selectTab("Music Video")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#EF43A3]/40 hover:text-white">Open Project</button>}</div>
          {profile.musicVideo && <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/[.07] bg-black/15 p-3">{musicVideoStages(profile.musicVideo).map(({ label, Icon, complete }) => <div key={label} className={`flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-center ${complete ? "text-emerald-300" : "text-rose-300"}`}><span className="flex items-center gap-1.5"><Icon size={20}/>{complete ? <CheckCircle2 size={15} aria-label="Complete"/> : <Circle size={15} aria-label="Incomplete"/>}</span><span className="text-xs font-bold">{label}</span></div>)}</div>}
        </section>

        <details className="rounded-xl border border-white/[.08] bg-[#111116]">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-white/75 marker:hidden sm:px-5"><span className="mr-auto">Song Details</span><span className="text-[.65rem] font-normal text-white/35">Metadata, release links &amp; promotion</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m5 7.5 5 5 5-5"/></svg></summary>
          <div className="space-y-5 border-t border-white/[.07] px-4 py-4 sm:px-5">
            <form onSubmit={saveCatalog} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([ ["Meaning", "meaning", meaning], ["Category", "category", song.category], ["Genre", "genre", song.genre], ["Sub-genre", "sub_genre", song.sub_genre], ["Sub-genre 2", "sub_genre_2", song.sub_genre_2] ] as const).map(([label, name, value]) => <label key={name} className="text-xs font-medium text-white/45">{label}{song.metadata_provenance?.[name] === "inferred" && <span className="ml-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[.58rem] font-bold tracking-wide text-amber-200">INFERRED</span>}{name === "meaning" ? <textarea name={name} defaultValue={value || ""} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /> : <input name={name} defaultValue={value || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" />}</label>)}
              <label className="text-xs font-medium text-white/45">BPM{song.metadata_provenance?.bpm === "inferred" && <span className="ml-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[.58rem] font-bold tracking-wide text-amber-200">INFERRED</span>}<input name="bpm" type="number" min="1" max="400" defaultValue={song.bpm ?? ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>
              <label className="text-xs font-medium text-white/45">Release date{song.metadata_provenance?.release_date === "inferred" && <span className="ml-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[.58rem] font-bold tracking-wide text-amber-200">INFERRED</span>}<input name="release_date" type="date" defaultValue={song.release_date || ""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>
              <button type="submit" className="self-end justify-self-start rounded-lg bg-[#EF43A3] px-4 py-2.5 text-xs font-bold text-[#170d14] transition hover:brightness-110">Save song details</button>{saved && <span role="status" className="self-center text-xs text-emerald-300">Saved</span>}
            </form>

            <div className="border-t border-white/[.07] pt-4"><p className="mb-3 text-xs font-semibold text-white/65">Streaming &amp; associated links</p><div className="grid gap-3 sm:grid-cols-2">{links.map(([label, key]) => <label key={key} className="text-xs font-medium text-white/45">{label}<input type="url" value={linkValues[key] || ""} onChange={event => setLinkValues(current => ({ ...current, [key]: event.target.value }))} placeholder="https://" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/45" /></label>)}</div><button type="button" onClick={() => void saveLinks()} className="mt-3 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">Save links</button></div>

          </div>
        </details>
      </div>}

      {tab === "Practice" && <SongPractice songId={song.id} title={song.title} slug={song.slug} bpm={song.bpm} musicalKey={song.musical_key || ""} capoFret={song.capo_fret} chordShape={song.chord_shape || ""} initialLyrics={song.lyrics || lyrics} initialNotes={song.practice_notes || ""} onSaveSetup={savePracticeSetup} onSaveLyrics={savePracticeLyrics} onSaveNotes={savePracticeNotes} />}
      {tab === "Content" && <SongContent songId={song.id} songTitle={song.title} artworkUrl={profile.coverUrl} musicVideo={profile.musicVideo} onCreateMusicVideo={() => void createVideo("Content")} />}
      {tab === "Music Video" && profile.musicVideo && <MusicVideoWorkspace id={profile.musicVideo.id} embedded />}
      {tab === "Outreach" && <OutreachWorkspace initialSection="pitches" initialSongId={song.id} />}
      {busy && <p role="status" className="mt-3 text-xs text-white/40">Saving…</p>}
    </div>
  </main>;
}
