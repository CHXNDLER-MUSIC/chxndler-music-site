// Central config for FAST edits (positions, playlist, links, paths)
export const BUILD_TAG = "Cockpit v3.2 — integrated";

export const PATHS = {
  cockpit: "/cockpit/cockpit.png",
  fallbackBackdrop: "/cockpit/ocean-girl.png",
  logoFallback: "/logo/CHXNDLER_Logo.png",
};

export const PLAYLIST = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    src: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl-cover.png",
    backdrop: "/cockpit/ocean-girl.png",
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL — Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic-cover.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL — Remix",
    src: "/tracks/ocean-girl-remix.mp3",
    cover: "/cover/ocean-girl-remix-cover.png",
    backdrop: "/cockpit/ocean-girl-remix.png",
  },
];

export const LINKS = {
  instagram: "https://instagram.com/CHXNDLER_MUSIC",
  tiktok: "https://tiktok.com/@CHXNDLER_MUSIC",
  youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  spotify: "https://open.spotify.com/artist/0",
  apple: "https://music.apple.com/artist/0",
};

/* Positions for HUD + left console icons (tweak freely) */
export const POS = {
  hud: {
    topVh: 28,   // move HUD up/down so it sits on the center screen
    widthVw: 46, // % of viewport width
    maxPx: 740,  // clamp on wide screens
  },
  console: {
    xVw: 8.2,     // column X for left console icons
    igYVh: 37.0,  // Instagram center Y
    ttYVh: 52.0,  // TikTok center Y
    ytYVh: 68.0,  // YouTube center Y
    sizePx: 54,   // diameter of glow buttons
  },
};
