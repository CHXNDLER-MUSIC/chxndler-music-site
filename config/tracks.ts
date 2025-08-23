export type Track = {
  id: string;
  title: string;
  file: string;
  cover: string;
  element: "WATER" | "HEART" | "MOON" | "FIRE" | "DARKNESS" | "LIGHTNING";
  bgVideo: string;
  poster?: string;
};

export const tracks: Track[] = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    file: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl.webp",
    element: "WATER",
    bgVideo: "/cockpit/skies/ocean-girl.mp4",
    poster: "/cockpit/skies/ocean-girl.webp"
  }
];
