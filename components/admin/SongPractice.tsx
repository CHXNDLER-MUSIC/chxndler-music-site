"use client";

import { useEffect, useRef, useState } from "react";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import { practiceInfoFor } from "@/components/admin/PracticeTab";

type AudioPlayerProps = { label: string; src: string; unavailableText: string };
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function RehearsalAudioPlayer({ label, src, unavailableText }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => { setUnavailable(true); setPlaying(false); };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("error", onError);
    audio.volume = volume;
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [src, volume]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setUnavailable(false); }
      catch { setUnavailable(true); }
    } else audio.pause();
  }

  function changeVolume(value: number) {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }

  return <div className="rounded-xl border border-white/[.08] bg-[#15151b] p-4 transition-colors hover:border-white/[.13]">
    <audio ref={audioRef} src={src} preload="metadata" className="sr-only" aria-label={label} />
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => void togglePlayback()} disabled={unavailable} aria-label={`${playing ? "Pause" : "Play"} ${label}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EF43A3] text-[#120b10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
        {playing ? <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z"/></svg> : <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M5 3.5v13l11-6.5-11-6.5Z"/></svg>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-white">{label}</p><span className="shrink-0 font-mono text-[.68rem] tabular-nums text-white/45">{formatTime(currentTime)} <span className="text-white/25">/</span> {formatTime(duration)}</span></div>
        <input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} disabled={!duration || unavailable} aria-label={`${label} playback position`} onChange={event => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="h-1.5 w-full cursor-pointer accent-[#EF43A3] disabled:cursor-default disabled:opacity-40" />
      </div>
      <label className="hidden shrink-0 items-center gap-2 text-white/45 sm:flex" title="Volume">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8v4h3l4 3V5L6 8H3Zm10-1a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>
        <input type="range" min="0" max="1" step="0.05" value={volume} aria-label={`${label} volume`} onChange={event => changeVolume(Number(event.target.value))} className="w-16 cursor-pointer accent-[#EF43A3]" />
      </label>
    </div>
    <label className="mt-3 flex items-center gap-3 text-[.65rem] text-white/40 sm:hidden"><span className="w-12">Volume</span><input type="range" min="0" max="1" step="0.05" value={volume} aria-label={`${label} volume`} onChange={event => changeVolume(Number(event.target.value))} className="flex-1 cursor-pointer accent-[#EF43A3]" /></label>
    {unavailable && <p role="status" className="mt-3 text-xs text-white/45">{unavailableText}</p>}
  </div>;
}

export default function SongPractice({songId,title,slug,musicalKey,capoFret,chordShape,initialLyrics,initialNotes,onSaveSetup,onSaveLyrics,onSaveNotes}:{songId:string;title:string;slug:string;musicalKey:string;capoFret:number|null;chordShape:string;initialLyrics:string;initialNotes:string;onSaveSetup:(values:{musical_key:string;capo_fret:number|null;chord_shape:string})=>Promise<boolean>;onSaveLyrics:(lyrics:string)=>Promise<boolean>;onSaveNotes:(notes:string)=>Promise<boolean>}) {
  const catalogTrack = practiceInfoFor(title);
  const [notes, setNotes] = useState(initialNotes);
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [editingSetup, setEditingSetup] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [key, setKey] = useState(musicalKey || catalogTrack?.key || "");
  const [capo, setCapo] = useState(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret));
  const [shape, setShape] = useState(chordShape || catalogTrack?.shape || "");
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingLyrics, setSavingLyrics] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"setup" | "lyrics" | "notes" | "" >("");

  const originalAudio = releaseAudioSrc(slug);
  const instrumentalAudio = `/api/audio?path=${encodeURIComponent(`${slug}-instrumental.mp3`)}`;

  useEffect(() => {
    let alive = true;
    if (!initialLyrics) fetch(`/api/lyrics/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (alive) setLyrics(data?.content || ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, [songId, slug, initialLyrics]);

  useEffect(() => {
    setNotes(initialNotes);
    setLyrics(initialLyrics);
    setKey(musicalKey || catalogTrack?.key || "");
    setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret));
    setShape(chordShape || catalogTrack?.shape || "");
    setEditingSetup(false); setEditingLyrics(false); setEditingNotes(false); setSaved("");
  }, [songId, initialLyrics, initialNotes, musicalKey, capoFret, chordShape, title]);

  async function saveSetup() {
    setSavingSetup(true); setSaved(""); setError("");
    const success = await onSaveSetup({ musical_key: key.trim(), capo_fret: capo === "" ? null : Number(capo), chord_shape: shape.trim() });
    setSavingSetup(false);
    if (success) { setSaved("setup"); setEditingSetup(false); }
  }
  async function saveSongLyrics() {
    setSavingLyrics(true); setSaved(""); setError("");
    const success = await onSaveLyrics(lyrics);
    setSavingLyrics(false);
    if (success) { setSaved("lyrics"); setEditingLyrics(false); }
    else setError("Unable to save lyrics.");
  }
  async function savePerformanceNotes() {
    setSavingNotes(true); setSaved(""); setError("");
    const success = await onSaveNotes(notes);
    setSavingNotes(false);
    if (success) { setSaved("notes"); setEditingNotes(false); }
    else setError("Unable to save performance notes.");
  }

  return <section className="space-y-5">
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] px-3 py-2.5 text-sm text-red-200">{error}</p>}

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-setup-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#EF43A3]">Rehearsal setup</p><h2 id="song-setup-heading" className="mt-1 text-base font-bold">Song Setup</h2></div>
        <button type="button" onClick={() => { setSaved(""); setEditingSetup(value => !value); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">{editingSetup ? "Cancel" : "Edit setup"}</button>
      </div>
      {editingSetup ? <div className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-white/50">Key<input value={key} onChange={event => setKey(event.target.value)} placeholder="e.g. A#" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Capo fret<input type="number" min="0" max="24" value={capo} onChange={event => setCapo(event.target.value)} placeholder="0" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Chord shape<input value={shape} onChange={event => setShape(event.target.value)} placeholder="e.g. G" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
        </div>
        <div className="mt-4 flex gap-2"><button type="button" disabled={savingSetup} onClick={() => void saveSetup()} className="rounded-lg bg-[#EF43A3] px-4 py-2.5 text-sm font-bold text-[#170d14] transition hover:brightness-110 disabled:opacity-50">{savingSetup ? "Saving…" : "Save setup"}</button><button type="button" onClick={() => { setKey(musicalKey || catalogTrack?.key || ""); setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret)); setShape(chordShape || catalogTrack?.shape || ""); setEditingSetup(false); }} className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/55">Cancel</button></div>
      </div> : <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white/80"><span>Key: <strong className="text-white">{key || "Not set"}</strong></span><span aria-hidden="true" className="text-white/20">·</span><span>Capo: <strong className="text-white">{capo || "Not set"}</strong></span><span aria-hidden="true" className="text-white/20">·</span><span>Chord Shape: <strong className="text-white">{shape || "Not set"}</strong></span></div>}
      {saved === "setup" && <p role="status" className="mt-2 text-xs text-emerald-300">Setup saved.</p>}
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="rehearsal-player-heading">
      <div className="mb-4"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#EF43A3]">Listen & rehearse</p><h2 id="rehearsal-player-heading" className="mt-1 text-base font-bold">Rehearsal Player</h2></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RehearsalAudioPlayer label="FULL" src={originalAudio} unavailableText="Full song audio is unavailable right now." />
        <RehearsalAudioPlayer label="LAYBACK" src={instrumentalAudio} unavailableText="No layback audio is available for this song yet." />
      </div>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="lyrics-notes-heading">
      <div className="mb-4"><p className="text-[.62rem] font-bold uppercase tracking-[.18em] text-[#EF43A3]">Learn the performance</p><h2 id="lyrics-notes-heading" className="mt-1 text-base font-bold">Lyrics &amp; Performance Notes</h2></div>
      <div className="divide-y divide-white/[.07]">
        <section className="pb-4" aria-labelledby="lyrics-heading">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" aria-expanded={lyricsOpen} aria-controls="practice-lyrics-panel" onClick={() => setLyricsOpen(value => !value)} className="mr-auto inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4 w-4 transition-transform ${lyricsOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><span id="lyrics-heading">Lyrics</span><span className="text-xs font-normal text-white/35">{lyrics.trim() ? `${lyrics.split(/\r?\n/).length} lines` : "Not added"}</span></button>
            {lyricsOpen && <button type="button" onClick={() => { setSaved(""); if (editingLyrics) setLyrics(initialLyrics); setEditingLyrics(value => !value); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">{editingLyrics ? "Cancel edit" : "Edit lyrics"}</button>}
            {lyricsOpen && editingLyrics && <button type="button" disabled={savingLyrics} onClick={() => void saveSongLyrics()} className="rounded-lg bg-[#EF43A3] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-50">{savingLyrics ? "Saving…" : "Save lyrics"}</button>}
          </div>
          {lyricsOpen && <div id="practice-lyrics-panel" className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-white/[.07] bg-black/20 p-4 sm:p-5">
            {editingLyrics ? <textarea autoFocus value={lyrics} onChange={event => { setLyrics(event.target.value); setSaved(""); }} placeholder="Add song lyrics…" rows={Math.max(12, lyrics.split(/\r?\n/).length)} className="min-h-64 w-full resize-y whitespace-pre-wrap bg-transparent font-mono text-sm leading-7 text-white/80 outline-none placeholder:text-white/30" />
              : lyrics.trim() ? <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/75">{lyrics}</pre> : <p className="text-sm text-white/40">Lyrics have not been added yet.</p>}
          </div>}
          {saved === "lyrics" && <p role="status" className="mt-2 text-xs text-emerald-300">Lyrics saved.</p>}
        </section>

        <section className="pt-4" aria-labelledby="performance-notes-heading">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto"><h3 id="performance-notes-heading" className="text-sm font-semibold text-white/85">Performance Notes</h3><p className="mt-1 text-xs text-white/40">Delivery, expression, phrasing, harmonies, or reminders.</p></div>
            <button type="button" onClick={() => { setSaved(""); if (editingNotes) setNotes(initialNotes); setEditingNotes(value => !value); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">{editingNotes ? "Cancel" : notes.trim() ? "Edit notes" : "Add notes"}</button>
            {editingNotes && <button type="button" disabled={savingNotes} onClick={() => void savePerformanceNotes()} className="rounded-lg bg-[#EF43A3] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-50">{savingNotes ? "Saving…" : "Save notes"}</button>}
          </div>
          {editingNotes ? <textarea autoFocus value={notes} onChange={event => { setNotes(event.target.value); setSaved(""); }} rows={5} maxLength={12000} placeholder="Add ongoing performance notes for this song…" className="mt-3 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#EF43A3]/45" />
            : <p title={notes.trim() || undefined} style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }} className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${notes.trim() ? "text-white/70" : "text-white/35"}`}>{notes.trim() || "No performance notes yet."}</p>}
          {saved === "notes" && <p role="status" className="mt-2 text-xs text-emerald-300">Performance notes saved.</p>}
        </section>
      </div>
    </section>
  </section>;
}
