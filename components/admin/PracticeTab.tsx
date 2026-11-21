"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { songs as catalog } from "@/lib/songs-consolidated";
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import { songCoverPath } from "@/lib/songCover";
import RehearsalAudioPlayer from "@/components/admin/RehearsalAudioPlayer";

type SongInfo = { title: string; key: string; capo: string; shape: string; slug?: string; cover?: string; readyForCollab?: boolean };
type PracticeEntry = SongInfo & { id: string; lyrics: string };
function PracticeLyricsEditor({ value, onChange, title }: { value: string; onChange: (value: string) => void; title: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);
  return <textarea ref={textareaRef} aria-label={`Lyrics and practice notes for ${title}`} value={value} onChange={event => onChange(event.target.value)} placeholder="Lyrics load automatically when available. Add practice notes here…" rows={1} className="mt-2 min-h-48 w-full resize-none overflow-hidden rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/25" />;
}
const catalogInfo: SongInfo[] = [
  { title: "ALMOST HUMAN", key: "A#", capo: "3", shape: "G" },
  { title: "ALONE", key: "E", capo: "3", shape: "C" }, { title: "ALONE (ACOUSTIC)", key: "E", capo: "3", shape: "C" },
  { title: "ALWAYS ON MY MIND", key: "D#", capo: "3", shape: "C" }, { title: "ALWAYS ON MY MIND (ACOUSTIC)", key: "D#", capo: "3", shape: "C" }, { title: "ALWAYS ON MY MIND (REMIX)", key: "", capo: "", shape: "" },
  { title: "AMERICAN DREAM", key: "A#", capo: "3", shape: "G" }, { title: "AMERICAN DREAM (ACOUSTIC)", key: "A#", capo: "3", shape: "G" },
  { title: "AM I PRETTY WHEN I CRY", key: "D", capo: "2", shape: "C" }, { title: "AM I PRETTY WHEN I CRY (ACOUSTIC)", key: "D", capo: "2", shape: "C" },
  { title: "BABY", key: "A#", capo: "3", shape: "G" }, { title: "BAD IDEA", key: "G", capo: "0", shape: "G" },
  { title: "BE MY BEE", key: "B", capo: "4", shape: "G" }, { title: "BE MY BEE (ACOUSTIC)", key: "B", capo: "4", shape: "G" },
  { title: "BLUE", key: "G", capo: "0", shape: "G" }, { title: "BLUE (ACOUSTIC)", key: "G", capo: "0", shape: "G" },
  { title: "BRAIN FREEZE", key: "", capo: "", shape: "" },
  { title: "CHEERLEADER", key: "E", capo: "4", shape: "C" }, { title: "CHEERLEADER (ACOUSTIC)", key: "E", capo: "4", shape: "C" },
  { title: "COLLIDE", key: "B", capo: "0", shape: "B" }, { title: "COLORS OF OUR HOME", key: "A#", capo: "3", shape: "G" }, { title: "COLORS OF OUR HOME (ACOUSTIC)", key: "A#", capo: "3", shape: "G" }, { title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)", key: "", capo: "", shape: "" },
  { title: "EMO GIRL", key: "C", capo: "0", shape: "C" }, { title: "FEELING THIS", key: "C#", capo: "0", shape: "C" },
  { title: "GAME BOY HEART (ゲームボーイの心)", key: "", capo: "", shape: "" },
  { title: "HAPPY MEAL", key: "A#", capo: "3", shape: "G" }, { title: "HAPPY MEAL (ACOUSTIC)", key: "A#", capo: "3", shape: "G" },
  { title: "HOLY", key: "F", capo: "4", shape: "C" }, { title: "HOME", key: "D", capo: "2", shape: "C" }, { title: "HOME (ACOUSTIC)", key: "D", capo: "2", shape: "C" },
  { title: "HOUSE PARTY", key: "A", capo: "2", shape: "G" }, { title: "HOUSE PARTY (ACOUSTIC)", key: "A", capo: "2", shape: "G" },
  { title: "HOW TO LOVE", key: "B", capo: "4", shape: "G" },
  { title: "I LIKE ME BETTER", key: "A", capo: "2", shape: "G" }, { title: "I MIGHT FALL IN LOVE WITH YOU", key: "F#", capo: "2", shape: "E" }, { title: "I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)", key: "F#", capo: "2", shape: "E" }, { title: "I WANT CANDY", key: "", capo: "", shape: "" },
  { title: "I WOULD DIE FOR YOUR LOVE", key: "A#", capo: "3", shape: "G" }, { title: "I WOULD DIE FOR YOUR LOVE (ACOUSTIC)", key: "A#", capo: "3", shape: "G" },
  { title: "KID FOREVER (永遠の子供)", key: "", capo: "", shape: "" },
  { title: "LETTING GO", key: "F", capo: "5", shape: "C" }, { title: "LIKE THIS", key: "B", capo: "4", shape: "G" },
  { title: "LITTLE BLACK HEART", key: "G#", capo: "1", shape: "G" }, { title: "LITTLE BLACK HEART (ACOUSTIC)", key: "G#", capo: "1", shape: "G" }, { title: "LOST IN BERMUDA", key: "A#", capo: "3", shape: "G" }, { title: "LOVE", key: "", capo: "", shape: "" },
  { title: "LOVE ME", key: "D#", capo: "3", shape: "C" }, { title: "LOVE ME (ACOUSTIC)", key: "D#", capo: "3", shape: "C" }, { title: "LOVE ME (REMIX)", key: "", capo: "", shape: "" },
  { title: "MAKE BELIEVE", key: "G", capo: "0", shape: "G" }, { title: "MR.BRIGHTSIDE", key: "C#", capo: "1", shape: "C" }, { title: "MY MOM THINKS I'M FAMOUS", key: "A", capo: "2", shape: "G" },
  { title: "OCEAN GIRL", key: "C", capo: "0", shape: "C" }, { title: "OCEAN GIRL (ACOUSTIC)", key: "C", capo: "0", shape: "C" }, { title: "OCEAN GIRL (REMIX)", key: "C", capo: "0", shape: "C" },
  { title: "PARIS", key: "A", capo: "2", shape: "G" }, { title: "PLAYDOUGH", key: "C", capo: "5", shape: "F" }, { title: "POKÉMON", key: "D", capo: "2", shape: "C" }, { title: "POKÉMON (ACOUSTIC)", key: "", capo: "", shape: "" }, { title: "PINK MOON", key: "C", capo: "0", shape: "E" },
  { title: "SOMEBODY TOO", key: "C", capo: "0", shape: "C" }, { title: "SOMEBODY TO LOVE", key: "E", capo: "0", shape: "E" }, { title: "STUDIO", key: "A#", capo: "3", shape: "G" },
  { title: "SUGAR, WE'RE GOING DOWN", key: "C", capo: "0", shape: "C" }, { title: "SUGAR, WE'RE GOING DOWN (REMIX)", key: "", capo: "", shape: "" }, { title: "SUPERSTAR", key: "D#", capo: "3", shape: "C" },
  { title: "THE AFTER PARTY", key: "", capo: "", shape: "" }, { title: "THREE CHEERS FOR FIVE YEARS", key: "B", capo: "0", shape: "B" }, { title: "TIENES UN AMIGO", key: "E", capo: "0", shape: "E" }, { title: "TIDE IN", key: "D#", capo: "3", shape: "C" },
  { title: "WE’RE JUST FRIENDS", key: "C", capo: "0", shape: "C" }, { title: "WE’RE JUST FRIENDS (ACOUSTIC)", key: "C", capo: "0", shape: "C" }, { title: "WE’RE JUST FRIENDS (DMVRCO Remix)", key: "", capo: "", shape: "" }, { title: "WE’RE JUST FRIENDS (MICKEY JAS REMIX)", key: "", capo: "", shape: "" },
  { title: "WHAT'S MY AGE AGAIN", key: "F#", capo: "5", shape: "C" }, { title: "WHO TAUGHT YOU TO LOVE", key: "D#", capo: "3", shape: "C" },
  { title: "YOU FEEL IT", key: "A#", capo: "3", shape: "G" }, { title: "YOU FEEL IT (ACOUSTIC)", key: "A#", capo: "3", shape: "G" },
];
const catalogInfoByTitle = new Map(catalogInfo.map(info => [info.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""), info]));
const practiceCatalog: SongInfo[] = catalog.map(song => {
  const key = song.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const info = catalogInfoByTitle.get(key) || (song.slug === "mr-brightside-killers-cover" ? catalogInfoByTitle.get("mrbrightside") : undefined);
  return { title: song.title, key: info?.key ?? "", capo: info?.capo ?? "", shape: info?.shape ?? "" };
});
function titleKey(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function metadataForTitle(title: string) { return catalogInfoByTitle.get(titleKey(title)) || practiceCatalog.find(info => titleKey(info.title) === titleKey(title)) || null; }
export function practiceInfoFor(title: string) { return metadataForTitle(title); }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const storageKey = "chxndler-admin-practice-v1";
function slugify(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function keyColor(key: string) {
  const colors: Record<string, string> = { C: "#fb7185", "A#": "#f472b6", G: "#4ade80", "D#": "#a78bfa", D: "#38bdf8", A: "#facc15", F: "#2dd4bf", "C#": "#c084fc", E: "#fb923c", B: "#f87171", "F#": "#e879f9" };
  return colors[key] || "#d4d4dc";
}

export default function PracticeTab({ campaignSong = "" }: { campaignSong?: string }) {
  const [date, setDate] = useState(today), [entries, setEntries] = useState<PracticeEntry[]>([]), [selected, setSelected] = useState("");
  const [catalogSongs, setCatalogSongs] = useState<SongInfo[]>(practiceCatalog);
  const [collapsedLyrics, setCollapsedLyrics] = useState<Set<string>>(() => new Set());
  const [songSearch, setSongSearch] = useState("");
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const lyricsRequests = useRef(new Set<string>());
  const activeDate = useRef(date);
  activeDate.current = date;
  useEffect(() => {
    let active = true;
    fetch("/api/admin/song-tracker", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (!active || !Array.isArray(data?.songs)) return;
      const rows = data.songs.map((song: { title: string; slug: string; ready_for_collab?: boolean; collaboration_enabled?: boolean }) => {
        const savedInfo = metadataForTitle(song.title);
        return { title: song.title, slug: song.slug, key: savedInfo?.key || "", capo: savedInfo?.capo || "", shape: savedInfo?.shape || "", cover: songCoverPath(song.slug, song.title), readyForCollab: song.ready_for_collab === true || song.collaboration_enabled === true };
      });
      const seen = new Set(rows.map((song: SongInfo) => titleKey(song.title)));
      setCatalogSongs([...rows, ...practiceCatalog.filter(song => !seen.has(titleKey(song.title)))]);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    try { const all = JSON.parse(localStorage.getItem(storageKey) || "{}"); setEntries(Array.isArray(all[date]) ? all[date] : []); }
    catch { setEntries([]); }
    setSaved(false);
  }, [date]);
  useEffect(() => {
    if (campaignSong && catalogSongs.some(song => song.title === campaignSong)) {
      setSelected(entries.some(entry => entry.title === campaignSong) ? "" : campaignSong);
    }
  }, [campaignSong, entries, catalogSongs]);
  useEffect(() => {
    for (const entry of entries) {
      if (entry.lyrics.trim()) continue;
      const song = catalogSongs.find(item => titleKey(item.title) === titleKey(entry.title)) || catalog.find(item => slugify(item.title) === slugify(entry.title) || (slugify(entry.title) === "mr-brightside" && item.slug === "mr-brightside-killers-cover"));
      const songSlug = entry.slug || song?.slug;
      if (!songSlug) continue;
      const requestKey = `${date}:${entry.id}`;
      if (lyricsRequests.current.has(requestKey)) continue;
      lyricsRequests.current.add(requestKey);
      fetch(`/api/lyrics/${encodeURIComponent(songSlug)}`, { cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          const content = typeof data?.content === "string" ? data.content.trim() : "";
          if (!content || activeDate.current !== date) return;
          setEntries(current => {
            const next = current.map(item => item.id === entry.id && !item.lyrics.trim() ? { ...item, lyrics: content } : item);
            try { const all = JSON.parse(localStorage.getItem(storageKey) || "{}"); all[date] = next; localStorage.setItem(storageKey, JSON.stringify(all)); } catch {}
            return next;
          });
          setSaved(true);
        })
        .catch(() => {})
        .finally(() => lyricsRequests.current.delete(requestKey));
    }
  }, [entries, date, catalogSongs]);
  const choices = catalogSongs;
  const filteredChoices = useMemo(() => choices.filter(song => song.title.toLowerCase().includes(songSearch.toLowerCase())), [choices, songSearch]);
  function persist(next: PracticeEntry[]) {
    setEntries(next); setSaved(false);
    try { const all = JSON.parse(localStorage.getItem(storageKey) || "{}"); all[date] = next; localStorage.setItem(storageKey, JSON.stringify(all)); setSaved(true); }
    catch { setSaved(false); }
  }
  function addSong() {
    const song = catalogSongs.find(item => item.title === selected); if (!song) return;
    persist([...entries, { ...song, id: `${Date.now()}-${Math.random()}`, lyrics: "" }]); setSelected(""); setSongSearch(""); setSongPickerOpen(false);
  }
  const trackFor = (title: string) => catalogSongs.find(song => titleKey(song.title) === titleKey(title)) || catalog.find(song => slugify(song.title) === slugify(title) || (slugify(title) === "mr-brightside" && song.slug === "mr-brightside-killers-cover"));
  return <section>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Practice session</p><h2 className="mt-1 text-2xl font-black">Song practice</h2></div>
      <label className="grid gap-1 text-xs text-white/50">Practice date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm text-white" /></label>
    </div>
    <div className="mb-5 flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-1">
        <button type="button" aria-haspopup="listbox" aria-expanded={songPickerOpen} onClick={() => setSongPickerOpen(open => !open)} className="flex h-14 w-full items-center justify-between gap-3 rounded-lg border border-white/15 bg-[#111116] px-4 text-left text-sm focus:border-[#ff66b4] focus:outline-none"><span style={{ color: selected ? keyColor(practiceInfoFor(selected)?.key || "") : undefined }}>{selected || `Choose a song to practice · ${choices.length} available`}</span><span className="text-[#ff66b4]">⌄</span></button>
        {songPickerOpen && <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-[75vh] overflow-hidden rounded-xl border border-white/15 bg-[#17171c] shadow-2xl">
          <input autoFocus type="search" value={songSearch} onChange={event => setSongSearch(event.target.value)} placeholder="Search songs…" aria-label="Search songs to practice" className="w-full border-b border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"/>
          <div role="listbox" aria-label="Songs to practice" className="max-h-[65vh] overflow-y-auto p-1.5">{filteredChoices.map(song => <button key={song.title} type="button" role="option" aria-selected={selected === song.title} onClick={() => { setSelected(song.title); setSongPickerOpen(false); }} className="flex w-full flex-col items-start gap-1.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[.07]"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold" style={{ color: keyColor(song.key) }}>{song.title}</span>{song.readyForCollab && <span className="rounded-full border border-[#FD52AF]/25 bg-[#FD52AF]/[.08] px-2 py-0.5 text-[.58rem] font-bold uppercase tracking-wide text-[#ff9dcd]">Open to collaborate</span>}</span><span className="flex flex-wrap gap-1.5 text-[.65rem]"><span className="rounded border border-violet-300/20 bg-violet-300/[.08] px-1.5 py-0.5 text-violet-200">Key: {song.key || "—"}</span><span className="rounded border border-sky-300/20 bg-sky-300/[.08] px-1.5 py-0.5 text-sky-200">Capo: {song.capo || "—"}</span><span className="rounded border border-amber-300/20 bg-amber-300/[.08] px-1.5 py-0.5 text-amber-200">Shape: {song.shape || "—"}</span></span></button>)}{!filteredChoices.length && <p className="px-3 py-5 text-center text-sm text-white/40">No songs found.</p>}</div>
        </div>}
      </div>
      <button type="button" onClick={addSong} disabled={!selected} aria-label="Add song to practice" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#ff3ea5] text-4xl font-semibold text-black shadow-[0_0_22px_rgba(255,62,165,0.35)] transition hover:bg-[#ff66b4] hover:shadow-[0_0_30px_rgba(255,62,165,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9dce] disabled:opacity-40">+</button>
      <span className="self-center text-xs text-white/40">{saved ? "Saved on this device" : "Autosaves as you edit"}</span>
    </div>
    {!entries.length ? <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-white/45">No songs added for this date yet. Choose one above and press +.</div> : <div className="space-y-4">{entries.map(entry => {
      const song = trackFor(entry.title); const slug = song?.slug || slugify(entry.title); const original = song ? releaseAudioSrc(slug) : supabaseTrackUrl(`${slug}.mp3`); const instrumental = supabaseTrackUrl(`${slug}-instrumental.mp3`);
      return <article key={entry.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
        <div className="flex flex-wrap items-center gap-4 p-4">
          {(entry.cover || song?.cover) && <img src={entry.cover || song?.cover} alt={`${entry.title} cover art`} className="h-16 w-16 rounded-lg object-cover" />}
          <div className="min-w-[10rem] flex-1"><h3 className="font-bold" style={{ color: keyColor(entry.key) }}>{entry.title}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-md border border-violet-300/20 bg-violet-300/[.09] px-2 py-1 text-violet-200">Key: {entry.key || "—"}</span><span className="rounded-md border border-sky-300/20 bg-sky-300/[.09] px-2 py-1 text-sky-200">Capo: {entry.capo || "—"}</span><span className="rounded-md border border-amber-300/20 bg-amber-300/[.09] px-2 py-1 text-amber-200">Shape: {entry.shape || "—"}</span></div></div>
          <button type="button" onClick={() => persist(entries.filter(item => item.id !== entry.id))} className="rounded-lg px-3 py-2 text-xs text-white/40 hover:text-red-300">Remove</button>
        </div>
        <div className="border-t border-white/10 p-4"><RehearsalAudioPlayer fullSrc={original} laybackSrc={instrumental}/></div>
        <div className="border-t border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" aria-expanded={!collapsedLyrics.has(entry.id)} aria-controls={`practice-lyrics-${entry.id}`} onClick={() => setCollapsedLyrics(current => { const next = new Set(current); if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id); return next; })} className="inline-flex items-center gap-2 text-left text-[.65rem] font-bold uppercase tracking-[.15em] text-white/50 transition hover:text-white/80"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4 w-4 transition-transform ${collapsedLyrics.has(entry.id) ? "-rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m5 7 5 5 5-5"/></svg><span>Lyrics / practice notes</span><span className="text-[.58rem] font-semibold tracking-[.1em] text-[#ff9dcd]">Auto-saved</span></button><span className="text-[.65rem] text-white/35">{entry.lyrics.trim() ? `${entry.lyrics.split(/\r?\n/).length} lines` : "No lyrics yet"}</span></div>{!collapsedLyrics.has(entry.id) && <div id={`practice-lyrics-${entry.id}`}><PracticeLyricsEditor title={entry.title} value={entry.lyrics} onChange={value => persist(entries.map(item => item.id === entry.id ? { ...item, lyrics: value } : item))}/></div>}</div>
      </article>;
    })}</div>}
  </section>;
}
