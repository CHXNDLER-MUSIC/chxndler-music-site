"use client";

import { useEffect, useRef, useState } from "react";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import { practiceInfoFor } from "@/components/admin/PracticeTab";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function RehearsalAudioPlayer({ fullSrc, laybackSrc }: { fullSrc: string; laybackSrc: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState<"FULL" | "LAYBACK">("FULL");
  const [available, setAvailable] = useState({ FULL: !!fullSrc, LAYBACK: !!laybackSrc });
  const src = activeTrack === "FULL" ? fullSrc : laybackSrc;
  const unavailable = !src;

  useEffect(() => {
    const probes = ([ ["FULL", fullSrc], ["LAYBACK", laybackSrc] ] as const).map(([track, source]) => {
      if (!source) { setAvailable(current => ({ ...current, [track]: false })); return null; }
      const probe = new Audio(); probe.preload = "metadata"; probe.src = source;
      const found = () => setAvailable(current => ({ ...current, [track]: true }));
      const missing = () => setAvailable(current => ({ ...current, [track]: false }));
      probe.addEventListener("loadedmetadata", found, { once: true });
      probe.addEventListener("error", missing, { once: true });
      return () => { probe.removeEventListener("loadedmetadata", found); probe.removeEventListener("error", missing); probe.src = ""; };
    }).filter((cleanup): cleanup is () => void => !!cleanup);
    return () => probes.forEach(cleanup => cleanup());
  }, [fullSrc, laybackSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!src) return;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => { setPlaying(false); setAvailable(current => ({ ...current, [activeTrack]: false })); };
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [src, activeTrack]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); }
      catch { setPlaying(false); }
    } else audio.pause();
  }

  async function chooseTrack(track: "FULL" | "LAYBACK") {
    const nextSrc = track === "FULL" ? fullSrc : laybackSrc;
    if (!nextSrc) return;
    if (track === activeTrack) { await togglePlayback(); return; }
    const audio = audioRef.current;
    setActiveTrack(track); setCurrentTime(0); setDuration(0);
    if (audio) {
      audio.src = nextSrc; audio.load();
      try { await audio.play(); } catch { setPlaying(false); }
    }
  }

  return <div>
    <audio ref={audioRef} src={src || undefined} preload="metadata" className="sr-only" aria-label={`${activeTrack} rehearsal audio`} />
    <div className="grid grid-cols-2 gap-3">
      {([ ["FULL", fullSrc], ["LAYBACK", laybackSrc] ] as const).map(([track, trackSrc]) => {
        const active = activeTrack === track;
        const disabled = !trackSrc || !available[track];
        return <button key={track} type="button" onClick={() => void chooseTrack(track)} disabled={disabled} aria-pressed={active} className={`flex min-h-16 items-center justify-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed ${disabled ? "border-white/[.06] bg-white/[.025] text-white/35" : active ? "border-[#EF43A3]/55 bg-[#EF43A3]/[.12] text-white" : "border-white/[.08] bg-white/[.025] text-white/65 hover:border-white/20 hover:text-white"}`}><span className={`grid h-8 w-8 place-items-center rounded-full ${disabled ? "bg-white/15 text-white/45" : active ? "bg-[#EF43A3] text-[#120b10]" : "bg-white/10 text-white/70"}`} aria-hidden="true">{playing && active ? "Ⅱ" : "▶"}</span>{track}</button>;
      })}
    </div>
    <div className="mt-4 flex items-center gap-3"><span className="shrink-0 font-mono text-xs tabular-nums text-white/45">{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} disabled={!duration || unavailable} aria-label={`${activeTrack} playback position`} onChange={event => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#EF43A3] disabled:cursor-default disabled:opacity-40"/><span className="shrink-0 font-mono text-xs tabular-nums text-white/45">{formatTime(duration)}</span></div>
  </div>;
}

export default function SongPractice({songId,title,slug,musicalKey,capoFret,chordShape,initialLyrics,initialNotes,onSaveSetup,onSaveLyrics,onSaveNotes}:{songId:string;title:string;slug:string;musicalKey:string;capoFret:number|null;chordShape:string;initialLyrics:string;initialNotes:string;onSaveSetup:(values:{musical_key:string;capo_fret:number|null;chord_shape:string})=>Promise<boolean>;onSaveLyrics:(lyrics:string)=>Promise<boolean>;onSaveNotes:(notes:string)=>Promise<boolean>}) {
  const catalogTrack = practiceInfoFor(title);
  const [notes, setNotes] = useState(initialNotes);
  const [lyrics, setLyrics] = useState(initialLyrics);
  const savedLyricsRef = useRef(initialLyrics);
  const [lyricsOpen, setLyricsOpen] = useState(false);
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
    setNotes(initialNotes);
    setLyrics(initialLyrics);
    savedLyricsRef.current = initialLyrics;
    setKey(musicalKey || catalogTrack?.key || "");
    setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret));
    setShape(chordShape || catalogTrack?.shape || "");
    setEditingSetup(false); setEditingNotes(false); setSaved("");
  }, [songId, initialLyrics, initialNotes, musicalKey, capoFret, chordShape, title]);

  async function saveSetup() {
    setSavingSetup(true); setSaved(""); setError("");
    const success = await onSaveSetup({ musical_key: key.trim(), capo_fret: capo === "" ? null : Number(capo), chord_shape: shape.trim() });
    setSavingSetup(false);
    if (success) { setSaved("setup"); setEditingSetup(false); }
  }
  async function saveSongLyrics(value = lyrics) {
    setSavingLyrics(true); setSaved(""); setError("");
    const success = await onSaveLyrics(value);
    setSavingLyrics(false);
    if (success) { savedLyricsRef.current = value; setSaved("lyrics"); }
    else setError("Unable to save lyrics.");
  }

  useEffect(() => {
    if (!lyricsOpen || lyrics === savedLyricsRef.current) return;
    const value = lyrics;
    const timer = window.setTimeout(() => void saveSongLyrics(value), 700);
    return () => window.clearTimeout(timer);
  }, [lyrics, lyricsOpen]);
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
        <div><h2 id="song-setup-heading" className="text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3]">Song Setup</h2></div>
      </div>
      {editingSetup ? <div className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-white/50">Key<input value={key} onChange={event => setKey(event.target.value)} placeholder="e.g. A#" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Capo fret<input type="number" min="0" max="24" value={capo} onChange={event => setCapo(event.target.value)} placeholder="0" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Chord shape<input value={shape} onChange={event => setShape(event.target.value)} placeholder="e.g. G" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
        </div>
        <div className="mt-4 flex gap-2"><button type="button" disabled={savingSetup} onClick={() => void saveSetup()} className="rounded-lg bg-[#EF43A3] px-4 py-2.5 text-sm font-bold text-[#170d14] transition hover:brightness-110 disabled:opacity-50">{savingSetup ? "Saving…" : "Save setup"}</button><button type="button" onClick={() => { setKey(musicalKey || catalogTrack?.key || ""); setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret)); setShape(chordShape || catalogTrack?.shape || ""); setEditingSetup(false); }} className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/55">Cancel</button></div>
      </div> : <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-lg font-bold sm:text-xl"><span className="text-[#FD52AF]">Key: <strong className="text-white">{key || "Not set"}</strong></span><span className="text-[#42B8E8]">Capo: <strong className="text-white">{capo || "Not set"}</strong></span><span className="text-[#F2B84B]">Chord Shape: <strong className="text-white">{shape || "Not set"}</strong></span></div>}
      {saved === "setup" && <p role="status" className="mt-2 text-xs text-emerald-300">Setup saved.</p>}
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-label="Listen and rehearse">
      <div className="mb-4"><p className="text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3]">LISTEN</p></div>
      <RehearsalAudioPlayer fullSrc={originalAudio} laybackSrc={instrumentalAudio} />
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-label="Lyrics">
      <section aria-labelledby="lyrics-heading">
          <div className="flex flex-wrap items-center gap-3">
          <button type="button" aria-expanded={lyricsOpen} aria-controls="practice-lyrics-panel" onClick={() => setLyricsOpen(value => !value)} className="mr-auto inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3] transition hover:text-[#ff83c4]"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4 w-4 transition-transform ${lyricsOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><span id="lyrics-heading">LYRICS</span></button>
          </div>
          {lyricsOpen && <div id="practice-lyrics-panel" className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-white/[.07] bg-black/20 p-4 sm:p-5">
            <textarea value={lyrics} onChange={event => { setLyrics(event.target.value); setSaved(""); }} placeholder="Add song lyrics…" rows={Math.max(12, lyrics.split(/\r?\n/).length)} className="min-h-64 w-full resize-y whitespace-pre-wrap bg-transparent font-mono text-sm leading-7 text-white/80 outline-none placeholder:text-white/30" />
          </div>}
          {lyricsOpen && <p role="status" className="mt-2 text-xs text-white/40">{savingLyrics ? "Saving lyrics…" : saved === "lyrics" ? "Lyrics saved." : "Changes save automatically."}</p>}
      </section>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="performance-notes-heading">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto"><h3 id="performance-notes-heading" className="text-sm font-semibold text-white/85">Performance Notes</h3><p className="mt-1 text-xs text-white/40">Delivery, expression, phrasing, harmonies, or reminders.</p></div>
            <button type="button" onClick={() => { setSaved(""); if (editingNotes) setNotes(initialNotes); setEditingNotes(value => !value); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-[#EF43A3]/40 hover:text-white">{editingNotes ? "Cancel" : notes.trim() ? "Edit notes" : "Add notes"}</button>
            {editingNotes && <button type="button" disabled={savingNotes} onClick={() => void savePerformanceNotes()} className="rounded-lg bg-[#EF43A3] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-50">{savingNotes ? "Saving…" : "Save notes"}</button>}
          </div>
          {editingNotes ? <textarea autoFocus value={notes} onChange={event => { setNotes(event.target.value); setSaved(""); }} rows={5} maxLength={12000} placeholder="Add ongoing performance notes for this song…" className="mt-3 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#EF43A3]/45" />
            : <p title={notes.trim() || undefined} style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }} className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${notes.trim() ? "text-white/70" : "text-white/35"}`}>{notes.trim() || "No performance notes yet."}</p>}
          {saved === "notes" && <p role="status" className="mt-2 text-xs text-emerald-300">Performance notes saved.</p>}
    </section>
  </section>;
}
