// Central registry for songs used by MediaDock + the cockpit HUD
export type Track = {
  slug: string;               // e.g., "ocean-girl"
  title: string;              // "OCEAN GIRL"
  artist?: string;            // "CHXNDLER"
  src: string;                // "/tracks/ocean-girl.m4a"
  cover?: string;             // "/cover/ocean-girl.webp"
  bpm?: number;
  key?: string;
};

export const TRACKS: Track[] = [
  {
    slug: "ocean-girl",
    title: "OCEAN GIRL",
    artist: "CHXNDLER",
    src: "/tracks/ocean-girl.m4a",
    cover: "/cover/ocean-girl.webp",
    bpm: 95,
    key: "C Maj",
  },
  {
    slug: "ocean-girl-acoustic",
    title: "OCEAN GIRL (Acoustic)",
    artist: "CHXNDLER",
    src: "/tracks/ocean-girl-acoustic.m4a",
    cover: "/cover/ocean-girl-acoustic.webp",
  },
  {
    slug: "ocean-girl-remix",
    title: "OCEAN GIRL (Remix)",
    artist: "CHXNDLER",
    src: "/tracks/ocean-girl-remix.m4a",
    cover: "/cover/ocean-girl-remix.webp",
  },
];

export const TRACK_BY_SLUG = Object.fromEntries(TRACKS.map(t => [t.slug, t]));
