"use client";

import { useEffect, useRef, useState } from "react";
import { practiceInfoFor } from "@/components/admin/PracticeTab";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function splitPerformanceNotes(value: string) {
  const match = value.match(/^1 Liner:\s*\n([\s\S]*?)\n\nIntro:\s*\n([\s\S]*)$/i);
  return match ? { oneLiner: match[1].trim(), intro: match[2].trim() } : { oneLiner: "", intro: value };
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

export default function SongPractice({songId,title,slug,bpm,musicalKey,capoFret,chordShape,initialLyrics,initialNotes,onSaveSetup,onSaveLyrics,onSaveNotes}:{songId:string;title:string;slug:string;bpm:number|null;musicalKey:string;capoFret:number|null;chordShape:string;initialLyrics:string;initialNotes:string;onSaveSetup:(values:{bpm:number|null;musical_key:string;capo_fret:number|null;chord_shape:string})=>Promise<boolean>;onSaveLyrics:(lyrics:string)=>Promise<boolean>;onSaveNotes:(notes:string)=>Promise<boolean>}) {
  const catalogTrack = practiceInfoFor(title);
  const [oneLiner, setOneLiner] = useState(() => splitPerformanceNotes(initialNotes).oneLiner);
  const [intro, setIntro] = useState(() => splitPerformanceNotes(initialNotes).intro);
  const [lyrics, setLyrics] = useState(initialLyrics);
  const savedLyricsRef = useRef(initialLyrics);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [listenOpen, setListenOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [editingSetup, setEditingSetup] = useState(false);
  const [key, setKey] = useState(musicalKey || catalogTrack?.key || "");
  const [tempo, setTempo] = useState(bpm === null ? "" : String(bpm));
  const [capo, setCapo] = useState(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret));
  const [shape, setShape] = useState(chordShape || catalogTrack?.shape || "");
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingLyrics, setSavingLyrics] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"setup" | "lyrics" | "notes" | "" >("");

  const originalAudio = `/api/audio?path=${encodeURIComponent(`${slug}.mp3`)}`;
  const instrumentalAudio = `/api/audio?path=${encodeURIComponent(`${slug}-instrumental.mp3`)}`;

  useEffect(() => {
    const parsedNotes = splitPerformanceNotes(initialNotes);
    setOneLiner(parsedNotes.oneLiner);
    setIntro(parsedNotes.intro);
    setLyrics(initialLyrics);
    savedLyricsRef.current = initialLyrics;
    setKey(musicalKey || catalogTrack?.key || "");
    setTempo(bpm === null ? "" : String(bpm));
    setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret));
    setShape(chordShape || catalogTrack?.shape || "");
    setEditingSetup(false); setSaved("");
  }, [songId, initialLyrics, initialNotes, bpm, musicalKey, capoFret, chordShape, title]);

  async function saveSetup() {
    setSavingSetup(true); setSaved(""); setError("");
    const success = await onSaveSetup({ bpm: tempo === "" ? null : Number(tempo), musical_key: key.trim(), capo_fret: capo === "" ? null : Number(capo), chord_shape: shape.trim() });
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
    const value = `1 Liner:\n${oneLiner.trim()}\n\nIntro:\n${intro.trim()}`.trim();
    const success = await onSaveNotes(value);
    setSavingNotes(false);
    if (success) setSaved("notes");
    else setError("Unable to save performance notes.");
  }

  return <section className="space-y-5">
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] px-3 py-2.5 text-sm text-red-200">{error}</p>}

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="song-setup-heading">
      <button type="button" aria-expanded={setupOpen} aria-controls="song-setup-panel" onClick={() => setSetupOpen(open => !open)} className="flex w-full items-center gap-2 text-left"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 text-[#EF43A3] transition-transform ${setupOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><h2 id="song-setup-heading" className="text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3]">Song Setup</h2></button>
      {setupOpen && <div id="song-setup-panel">
      {editingSetup ? <div className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-white/50">Key<input value={key} onChange={event => setKey(event.target.value)} placeholder="e.g. A#" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">BPM<input type="number" min="1" max="400" value={tempo} onChange={event => setTempo(event.target.value)} placeholder="e.g. 75" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Capo fret<input type="number" min="0" max="24" value={capo} onChange={event => setCapo(event.target.value)} placeholder="0" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
          <label className="text-xs font-medium text-white/50">Chord shape<input value={shape} onChange={event => setShape(event.target.value)} placeholder="e.g. G" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#EF43A3]/60" /></label>
        </div>
        <div className="mt-4 flex gap-2"><button type="button" disabled={savingSetup} onClick={() => void saveSetup()} className="rounded-lg bg-[#EF43A3] px-4 py-2.5 text-sm font-bold text-[#170d14] transition hover:brightness-110 disabled:opacity-50">{savingSetup ? "Saving…" : "Save setup"}</button><button type="button" onClick={() => { setKey(musicalKey || catalogTrack?.key || ""); setTempo(bpm === null ? "" : String(bpm)); setCapo(capoFret === null ? (catalogTrack?.capo || "") : String(capoFret)); setShape(chordShape || catalogTrack?.shape || ""); setEditingSetup(false); }} className="rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/55">Cancel</button></div>
      </div> : <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-6">
        <button type="button" onClick={() => setEditingSetup(true)} className="min-w-0 cursor-pointer text-left focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF43A3]"><span className="block text-[.6rem] font-bold uppercase tracking-[.08em] text-white/45 sm:text-sm">Key</span><span className="mt-1 block truncate text-lg font-bold text-[#FD52AF] sm:text-3xl">{key || "Not set"}</span></button>
        <button type="button" onClick={() => setEditingSetup(true)} className="min-w-0 cursor-pointer text-left focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF43A3]"><span className="block text-[.6rem] font-bold uppercase tracking-[.08em] text-white/45 sm:text-sm">Capo</span><span className="mt-1 block truncate text-lg font-bold text-[#42B8E8] sm:text-3xl">{capo || "Not set"}</span></button>
        <button type="button" onClick={() => setEditingSetup(true)} className="min-w-0 cursor-pointer text-left focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF43A3]"><span className="block text-[.6rem] font-bold uppercase tracking-[.08em] text-white/45 sm:text-sm">Chord Shape</span><span className="mt-1 block truncate text-lg font-bold text-[#F2B84B] sm:text-3xl">{shape || "Not set"}</span></button>
      </div>}
      {saved === "setup" && <p role="status" className="mt-2 text-xs text-emerald-300">Setup saved.</p>}
      </div>}
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-label="Listen and rehearse">
      <button type="button" aria-expanded={listenOpen} aria-controls="song-listen-panel" onClick={() => setListenOpen(open => !open)} className="mb-4 flex w-full items-center gap-2 text-left"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 text-[#EF43A3] transition-transform ${listenOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><span className="text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3]">LISTEN</span></button>
      {listenOpen && <div id="song-listen-panel"><RehearsalAudioPlayer fullSrc={originalAudio} laybackSrc={instrumentalAudio} /></div>}
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-label="Lyrics">
      <section aria-labelledby="lyrics-heading">
          <div className="flex flex-wrap items-center gap-3">
          <button type="button" aria-expanded={lyricsOpen} aria-controls="practice-lyrics-panel" onClick={() => setLyricsOpen(value => !value)} className="mr-auto inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3] transition hover:text-[#ff83c4]"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4 w-4 transition-transform ${lyricsOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><span id="lyrics-heading">LYRICS</span></button>
          </div>
          {lyricsOpen && <div id="practice-lyrics-panel" className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-white/[.07] bg-black/20 p-4 sm:p-5">
            <textarea value={lyrics} onChange={event => { setLyrics(event.target.value); setSaved(""); }} placeholder="Add song lyrics…" rows={Math.max(12, lyrics.split(/\r?\n/).length)} className="min-h-64 w-full resize-y whitespace-pre-wrap bg-transparent font-mono text-sm leading-7 text-white/80 outline-none placeholder:text-white/30" />
          </div>}
          {lyricsOpen && (savingLyrics || saved === "lyrics") && <p role="status" className="mt-2 text-xs text-white/40">{savingLyrics ? "Saving lyrics…" : "Lyrics saved."}</p>}
      </section>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-label="Performance notes">
      <button type="button" aria-expanded={notesOpen} aria-controls="performance-notes-panel" onClick={() => setNotesOpen(open => !open)} className="flex w-full items-center gap-2 text-left"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 text-[#EF43A3] transition-transform ${notesOpen ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m7 4 6 6-6 6"/></svg><span className="text-sm font-bold uppercase tracking-[.08em] text-[#EF43A3]">PERFORMANCE NOTES</span></button>
      {notesOpen && <div id="performance-notes-panel" className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-white/45">1 Liner<textarea value={oneLiner} onChange={event => { setOneLiner(event.target.value); setSaved(""); }} rows={4} maxLength={4000} placeholder="One-line performance reminder…" className="mt-2 min-h-28 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm leading-6 normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#EF43A3]/45" /></label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/45">Intro<textarea value={intro} onChange={event => { setIntro(event.target.value); setSaved(""); }} rows={4} maxLength={8000} placeholder="Intro delivery, expression, phrasing, harmonies…" className="mt-2 min-h-28 w-full rounded-xl border border-white/[.08] bg-black/20 p-3 text-sm leading-6 normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#EF43A3]/45" /></label>
        <div className="sm:col-span-2 flex items-center gap-3"><button type="button" disabled={savingNotes} onClick={() => void savePerformanceNotes()} className="rounded-lg bg-[#EF43A3] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-50">{savingNotes ? "Saving…" : "Save notes"}</button>{saved === "notes" && <p role="status" className="text-xs text-emerald-300">Performance notes saved.</p>}</div>
      </div>}
    </section>
  </section>;
}
