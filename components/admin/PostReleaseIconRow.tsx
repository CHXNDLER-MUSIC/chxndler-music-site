export type PostReleaseKey = "playlistPitched" | "syncPlacement" | "spotifyCanvas" | "sky" | "chxndlerCard" | "musicVideo" | "contentReleased";
export type PostReleaseState = Record<PostReleaseKey, boolean>;
type IconKind = "video" | "playlist" | "sync" | "content" | "spotify" | "sky" | "card";

function Icon({ kind, className = "h-4 w-4" }: { kind: IconKind; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`${className} shrink-0`}>
    {kind === "video" ? <><rect x="2" y="4" width="11" height="12" rx="2"/><path d="m13 8 5-3v10l-5-3"/></>
      : kind === "playlist" ? <><path d="M11 3v10.5a2.5 2.5 0 1 1-1.5-2.3V5l7-1.5v8a2.5 2.5 0 1 1-1.5-2.3V2.7L11 3Z"/><path d="M3 5h4M3 8h3"/></>
      : kind === "sync" ? <><path d="M4 7.5 7 5l3 2.5-3 2.5-3-2.5ZM10 7.5 13 5l3 2.5-3 2.5-3-2.5Z"/><path d="m7 10 2 2 2-2M9 12v3M5 15h8"/></>
      : kind === "content" ? <><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4M17 7h1.5v10.5H8V17"/></>
      : kind === "spotify" ? <><circle cx="10" cy="10" r="8.1"/><path d="M5.5 7.7c3.1-.9 6.5-.6 9.2.9M6.2 10.3c2.6-.7 5.5-.4 7.8.8M6.9 12.8c2-.5 4.2-.3 6 .5"/></>
      : kind === "sky" ? <><path d="M5 16h9a3 3 0 0 0 .4-6 5 5 0 0 0-9.6 1.3A2.4 2.4 0 0 0 5 16Z"/><path d="M5 5V3M2.5 7 1 6M9 5l1.5-1"/></>
      : <><rect x="3" y="2.5" width="14" height="17" rx="2"/><circle cx="10" cy="8" r="2.2"/><path d="M6 15c.7-2 2-3 4-3s3.3 1 4 3M14.5 5.5h1"/></>}
  </svg>;
}

const items: Array<{ kind: IconKind; key: PostReleaseKey; label: string; color: string }> = [
  { kind: "spotify", key: "spotifyCanvas", label: "Spotify Canvas", color: "#1ED760" },
  { kind: "sky", key: "sky", label: "Sky", color: "#42B8E8" },
  { kind: "card", key: "chxndlerCard", label: "CHXNDLER Card", color: "#A78BFA" },
  { kind: "video", key: "musicVideo", label: "Music video", color: "#FB7185" },
  { kind: "content", key: "contentReleased", label: "Content released", color: "#60A5FA" },
  { kind: "playlist", key: "playlistPitched", label: "Playlist pitched", color: "#FD52AF" },
  { kind: "sync", key: "syncPlacement", label: "Sync placement", color: "#F2B84B" },
];

export default function PostReleaseIconRow({ state, onToggle, compact = false }: { state?: Partial<PostReleaseState> | null; onToggle: (key: PostReleaseKey, value: boolean) => void; compact?: boolean }) {
  if (compact) return <div className="flex flex-wrap items-center gap-3" aria-label={`Release and promotion progress: ${items.map(item => `${item.label} ${state?.[item.key] ? "complete" : "not set"}`).join(", ")}`}>
    {items.map(item => {
      const done = state?.[item.key] === true;
      return <button key={item.key} type="button" title={`${item.label} · ${done ? "Done" : "Not yet"}`} aria-label={`${item.label}: ${done ? "complete" : "incomplete"}. Click to toggle.`} aria-pressed={done} onClick={() => onToggle(item.key, !done)} className="grid h-12 w-12 place-items-center rounded-lg transition hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ color: item.color, opacity: done ? 1 : .42 }}><Icon kind={item.kind} className="h-9 w-9"/></button>;
    })}
  </div>;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={`Release and promotion progress: ${items.map(item => `${item.label} ${state?.[item.key] ? "complete" : "not set"}`).join(", ")}`}>
    {items.map(item => {
      const done = state?.[item.key] === true;
      return <button key={item.key} type="button" title={`Click to mark ${item.label} ${done ? "incomplete" : "complete"}`} aria-label={`${item.label}: ${done ? "complete" : "incomplete"}. Click to toggle.`} aria-pressed={done} onClick={() => onToggle(item.key, !done)} className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition hover:bg-white/[.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${done ? "border-white/[.10] bg-white/[.025]" : "border-white/[.06] opacity-60"}`}><span className="shrink-0" style={{ color: item.color }}><Icon kind={item.kind}/></span><span className="min-w-0 flex-1 truncate text-xs font-medium text-white/70">{item.label}</span><span className={`text-[.62rem] font-semibold ${done ? "text-emerald-200" : "text-white/35"}`}>{done ? "Done" : "Not yet"}</span></button>;
    })}
  </div>;
}
