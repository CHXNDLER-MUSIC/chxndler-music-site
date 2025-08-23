// config/tracks.ts
export type Track = {
  id: string;
  title: string;
  file: string;     // /tracks/*.mp3
  cover: string;    // /cover/*.webp
  element: "WATER" | "HEART" | "MOON" | "FIRE" | "DARKNESS" | "LIGHTNING";
  bgSky: string;    // /cockpit/skies/*.webp
};

export const tracks: Track[] = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    file: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl.webp",
    element: "WATER",
    bgSky: "/cockpit/skies/ocean.webp",
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL (Acoustic)",
    file: "/tracks/ocean-girl-acoustic.m4a",
    cover: "/cover/ocean-girl-acoustic.webp",
    element: "HEART",
    bgSky: "/cockpit/skies/gold-hour.webp",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL (Remix)",
    file: "/tracks/ocean-girl-remix.mp3",
    cover: "/cover/ocean-girl-remix.webp",
    element: "MOON",
    bgSky: "/cockpit/skies/moon.webp",
  },
];
