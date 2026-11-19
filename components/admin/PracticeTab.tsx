"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { songs as catalog } from "@/lib/songs-consolidated";

type SongInfo = { title: string; key: string; capo: string; shape: string };
type PracticeEntry = SongInfo & { id: string; lyrics: string };
const catalogInfo: SongInfo[] = [
  { title: "ALONE", key: "E", capo: "3", shape: "C" }, { title: "ALWAYS ON MY MIND", key: "D#", capo: "3", shape: "C" },
  { title: "AMERICAN DREAM", key: "A#", capo: "3", shape: "G" }, { title: "AM I PRETTY WHEN I CRY", key: "D", capo: "2", shape: "C" },
  { title: "BABY", key: "A#", capo: "3", shape: "G" }, { title: "BE MY BEE", key: "B", capo: "4", shape: "G" },
  { title: "BLUE", key: "", capo: "", shape: "" }, { title: "CHEERLEADER", key: "E", capo: "4", shape: "C" },
  { title: "COLLIDE", key: "B", capo: "0", shape: "B" }, { title: "COLORS OF OUR HOME", key: "A#", capo: "3", shape: "G" },
  { title: "EMO GIRL", key: "C", capo: "0", shape: "C" }, { title: "FEELING THIS", key: "C#", capo: "0", shape: "C" },
  { title: "HOME", key: "D", capo: "2", shape: "C" }, { title: "HOUSE PARTY", key: "A", capo: "2", shape: "G" },
  { title: "I LIKE ME BETTER", key: "A", capo: "2", shape: "G" }, { title: "I MIGHT FALL IN LOVE WITH YOU", key: "F#", capo: "2", shape: "E" },
  { title: "I WOULD DIE FOR YOUR LOVE", key: "A#", capo: "3", shape: "G" }, { title: "LETTING GO", key: "F", capo: "5", shape: "C" },
  { title: "LITTLE BLACK HEART", key: "G#", capo: "1", shape: "G" }, { title: "LOVE ME", key: "D#", capo: "3", shape: "C" },
  { title: "LOST IN BERMUDA", key: "", capo: "", shape: "" }, { title: "MAKE BELIEVE", key: "G", capo: "0", shape: "G" },
  { title: "MR.BRIGHTSIDE", key: "C#", capo: "1", shape: "C" }, { title: "OCEAN GIRL", key: "C", capo: "0", shape: "C" },
  { title: "PARIS", key: "A", capo: "2", shape: "G" }, { title: "PINK MOON", key: "C", capo: "0", shape: "E" },
  { title: "POKÉMON", key: "D", capo: "2", shape: "C" }, { title: "SOMEBODY TO LOVE", key: "E", capo: "0", shape: "E" },
  { title: "SUGAR, WE'RE GOING DOWN", key: "C", capo: "0", shape: "C" }, { title: "TIENES UN AMIGO", key: "", capo: "", shape: "" },
  { title: "WE’RE JUST FRIENDS", key: "C", capo: "0", shape: "C" }, { title: "WHAT'S MY AGE AGAIN?", key: "F#", capo: "5", shape: "C" },
  { title: "YOU FEEL IT", key: "", capo: "", shape: "" },
];
const catalogInfoByTitle = new Map(catalogInfo.map(info => [info.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""), info]));
const practiceCatalog: SongInfo[] = catalog.map(song => {
  const key = song.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const info = catalogInfoByTitle.get(key) || (song.slug === "mr-brightside-killers-cover" ? catalogInfoByTitle.get("mrbrightside") : undefined);
  return { title: song.title, key: info?.key ?? "", capo: info?.capo ?? "", shape: info?.shape ?? "" };
});
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const storageKey = "chxndler-admin-practice-v1";
function slugify(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function backgroundVideoSource(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? { kind: "embed" as const, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1` } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      return id ? { kind: "embed" as const, src: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&background=1` } : null;
    }
    return /\.(mp4|webm|ogg|m3u8)$/i.test(url.pathname) ? { kind: "video" as const, src: value } : { kind: "embed" as const, src: value };
  } catch { return null; }
}

export default function PracticeTab({ campaignSong = "" }: { campaignSong?: string }) {
  const [date, setDate] = useState(today), [entries, setEntries] = useState<PracticeEntry[]>([]), [selected, setSelected] = useState("");
  const [backgroundVideos, setBackgroundVideos] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const lyricsRequests = useRef(new Set<string>());
  const activeDate = useRef(date);
  activeDate.current = date;
  useEffect(() => { fetch("/api/admin/song-tracker", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
    const map: Record<string, string> = {}; for (const song of data?.songs || []) if (song.sky_video_url) map[slugify(song.title)] = song.sky_video_url;
    setBackgroundVideos(map);
  }).catch(() => {}); }, []);
  useEffect(() => {
    try { const all = JSON.parse(localStorage.getItem(storageKey) || "{}"); setEntries(Array.isArray(all[date]) ? all[date] : []); }
    catch { setEntries([]); }
    setSaved(false);
  }, [date]);
  useEffect(() => {
    if (campaignSong && practiceCatalog.some(song => song.title === campaignSong)) {
      setSelected(entries.some(entry => entry.title === campaignSong) ? "" : campaignSong);
    }
  }, [campaignSong, entries]);
  useEffect(() => {
    for (const entry of entries) {
      if (entry.lyrics.trim()) continue;
      const song = catalog.find(item => slugify(item.title) === slugify(entry.title) || (slugify(entry.title) === "mr-brightside" && item.slug === "mr-brightside-killers-cover"));
      if (!song) continue;
      const requestKey = `${date}:${entry.id}`;
      if (lyricsRequests.current.has(requestKey)) continue;
      lyricsRequests.current.add(requestKey);
      fetch(`/api/lyrics/${encodeURIComponent(song.slug)}`, { cache: "no-store" })
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
  }, [entries, date]);
  const choices = useMemo(() => practiceCatalog.filter(info => !entries.some(entry => slugify(entry.title) === slugify(info.title))), [entries]);
  function persist(next: PracticeEntry[]) {
    setEntries(next); setSaved(false);
    try { const all = JSON.parse(localStorage.getItem(storageKey) || "{}"); all[date] = next; localStorage.setItem(storageKey, JSON.stringify(all)); setSaved(true); }
    catch { setSaved(false); }
  }
  function addSong() {
    const song = practiceCatalog.find(item => item.title === selected); if (!song) return;
    persist([...entries, { ...song, id: `${Date.now()}-${Math.random()}`, lyrics: "" }]); setSelected("");
  }
  const trackFor = (title: string) => catalog.find(song => slugify(song.title) === slugify(title) || (slugify(title) === "mr-brightside" && song.slug === "mr-brightside-killers-cover"));
  return <section>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff66b4]">Practice session</p><h2 className="mt-1 text-2xl font-black">Song practice</h2></div>
      <label className="grid gap-1 text-xs text-white/50">Practice date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm text-white" /></label>
    </div>
    <div className="mb-5 flex flex-wrap gap-2">
      <select value={selected} onChange={event => setSelected(event.target.value)} aria-label="Choose a song to practice" className="h-14 min-w-0 flex-1 appearance-none rounded-lg border border-white/15 bg-[#111116] px-4 text-sm text-white focus:border-[#ff66b4] focus:outline-none"><option value="" className="bg-[#111116] text-white">Choose a song to practice · {choices.length} available</option>{choices.map(song => <option key={song.title} value={song.title} className="bg-[#111116] text-white">{song.title}</option>)}</select>
      <button type="button" onClick={addSong} disabled={!selected} aria-label="Add song to practice" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#ff3ea5] text-4xl font-semibold text-black shadow-[0_0_22px_rgba(255,62,165,0.35)] transition hover:bg-[#ff66b4] hover:shadow-[0_0_30px_rgba(255,62,165,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9dce] disabled:opacity-40">+</button>
      <span className="self-center text-xs text-white/40">{saved ? "Saved on this device" : "Autosaves as you edit"}</span>
    </div>
    {!entries.length ? <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-white/45">No songs added for this date yet. Choose one above and press +.</div> : <div className="space-y-4">{entries.map(entry => {
      const song = trackFor(entry.title); const slug = song?.slug || slugify(entry.title); const instrumental = song ? `https://hjpaiolhhugwzblarfix.supabase.co/storage/v1/object/public/tracks/${encodeURIComponent(`${slug}-instrumental.mp3`)}` : ""; const backgroundVideo = backgroundVideos[slugify(entry.title)]; const backgroundSource = backgroundVideo ? backgroundVideoSource(backgroundVideo) : null;
      return <article key={entry.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
        <div className="flex flex-wrap items-center gap-4 p-4">
          {song?.cover && <img src={song.cover} alt={`${entry.title} cover art`} className="h-16 w-16 rounded-lg object-cover" />}
          <div className="min-w-[10rem] flex-1"><h3 className="font-bold">{entry.title}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs">{[["Key", entry.key], ["Capo", entry.capo], ["Shape", entry.shape]].map(([label, value]) => <span key={label} className="rounded-md bg-white/[.07] px-2 py-1 text-white/75">{label}: {value || "—"}</span>)}</div></div>
          {song?.sources?.[0]?.src && <a href={song.sources[0].src} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70">Full song ↗</a>}
          <button type="button" onClick={() => persist(entries.filter(item => item.id !== entry.id))} className="rounded-lg px-3 py-2 text-xs text-white/40 hover:text-red-300">Remove</button>
        </div>
        {backgroundSource && <div className="border-t border-white/10 bg-black/30 p-4"><p className="mb-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Background video</p>{backgroundSource.kind === "video" ? <video src={backgroundSource.src} autoPlay muted loop playsInline controls className="max-h-[28rem] w-full rounded-lg bg-black object-contain" /> : <iframe src={backgroundSource.src} title={`${entry.title} background video`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-lg bg-black" />}</div>}
        {song && <div className="border-t border-white/10 px-4 py-3"><p className="mb-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Instrumental · if available</p><audio controls preload="none" src={instrumental} className="h-9 w-full max-w-md" onError={event => { event.currentTarget.hidden = true; const msg = event.currentTarget.nextElementSibling as HTMLElement | null; if (msg) msg.hidden = false; }} /><p hidden className="text-xs text-white/40">No instrumental file found at the standard song path.</p></div>}
        <div className="border-t border-white/10 p-4"><label className="mb-2 block text-[.65rem] font-bold uppercase tracking-[.15em] text-white/40">Lyrics / practice notes</label><textarea value={entry.lyrics} onChange={event => persist(entries.map(item => item.id === entry.id ? { ...item, lyrics: event.target.value } : item))} placeholder="Lyrics load automatically when available. Add practice notes here…" rows={8} className="w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/25" /></div>
      </article>;
    })}</div>}
  </section>;
}
