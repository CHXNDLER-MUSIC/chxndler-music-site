export type Track = {
  id: string;
  title: string;
  file: string;      // audio
  cover: string;     // cover art
  element: string;   // WATER, MOON, etc.
  bgVideo: string;   // video background
  poster?: string;   // still fallback
};

export const tracks: Track[] = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    file: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl.webp",
    element: "WATER",
    bgVideo: "/cockpit/skies/ocean.mp4",
    poster: "/cockpit/skies/ocean.webp",
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL (Acoustic)",
    file: "/tracks/ocean-girl-acoustic.m4a",
    cover: "/cover/ocean-girl-acoustic.webp",
    element: "HEART",
    bgVideo: "/cockpit/skies/gold-hour.mp4",
    poster: "/cockpit/skies/gold-hour.webp",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL (Remix)",
    file: "/tracks/ocean-girl-remix.mp3",
    cover: "/cover/ocean-girl-remix.webp",
    element: "MOON",
    bgVideo: "/cockpit/skies/moon.mp4",
    poster: "/cockpit/skies/moon.webp",
  },
];
