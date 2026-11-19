export type PostReleaseKey = "playlistPitched" | "syncPlacement" | "spotifyCanvas" | "sky" | "chxndlerCard" | "musicVideo" | "contentReleased";
export type PostReleaseState = Record<PostReleaseKey, boolean>;
type IconKind = "video" | "playlist" | "sync" | "content" | "spotify" | "sky" | "card";

function Icon({ kind }: { kind: IconKind }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 shrink-0">
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

export default function PostReleaseIconRow({ state, onToggle }: { state?: Partial<PostReleaseState> | null; onToggle: (key: PostReleaseKey, value: boolean) => void }) {
  return <div className="flex flex-wrap items-center gap-2.5" aria-label={`Post release: ${items.map(item => `${item.label} ${state?.[item.key] ? "complete" : "not set"}`).join(", ")}`}>
    {items.map(item => {
      const done = state?.[item.key] === true;
      return <button key={item.key} type="button" title={`${item.label} · ${done ? "On" : "Off"} (click to toggle)`} aria-label={`${item.label} ${done ? "on" : "off"}. Click to toggle.`} aria-pressed={done} onClick={() => onToggle(item.key, !done)} className="rounded-md p-0.5 transition hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ color: item.color, opacity: done ? 1 : .38 }}><Icon kind={item.kind}/></button>;
    })}
  </div>;
}
