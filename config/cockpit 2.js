// Central config for FAST edits (positions, playlist, links, paths)
export const BUILD_TAG = "Cockpit v3.2 — integrated";

export const PATHS = {
  cockpit: "/cockpit/cockpit-filled.png?v=20250902",
  fallbackBackdrop: "/cockpit/ocean-girl.png",
  logoFallback: "/logo/CHXNDLER_Logo.png",
};

export const PLAYLIST = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    src: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl.png",
    backdrop: "/cockpit/ocean-girl.png",
  },
  {
    id: "ocean-girl-acoustic",
    title: "OCEAN GIRL — Acoustic",
    src: "/tracks/ocean-girl-acoustic.mp3",
    cover: "/cover/ocean-girl-acoustic.png",
    backdrop: "/cockpit/ocean-girl-acoustic.png",
  },
  {
    id: "ocean-girl-remix",
    title: "OCEAN GIRL — Remix",
    src: "/tracks/ocean-girl-remix.mp3",
    cover: "/cover/ocean-girl-remix.png",
    backdrop: "/cockpit/ocean-girl-remix.png",
  },
];

export const LINKS = {
  // Updated to current handles (lowercase, canonical URLs)
  instagram: "https://www.instagram.com/chxndler_music/",
  tiktok: "https://www.tiktok.com/@chxndler_music",
  youtube: "https://www.youtube.com/@chxndler_music",
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
    // Column X for left console icons
    xVw: 13.6,    // moved right to embed deeper in oval
    // Optional stacking controls (if present, overrides ig/tt/yt Y)
    baseYVh: 50.0,   // starting Y (vh) for top button — moved up a bit
    spacingVh: 14.0, // vertical spacing between buttons (spread out more)
    // Fallback individual centers (used if base/spacing not provided)
    igYVh: 42.0,
    ttYVh: 58.0,
    ytYVh: 74.0,
    sizePx: 76,   // diameter of glow buttons (larger presence)
  },
  stream: {
    // Middle console streaming buttons (Spotify + Apple)
    xVw: 50.0,   // centered
    yVh: 66.0,   // sit within the console just below the HUD
    sizePx: 76,
    gapPx: 22,
    tilt: "perspective(1200px) rotateX(18deg)",
  },
  wheel: {
    // Approximate steering wheel overlay positions (tweak as needed)
    // Values are in viewport percentages for easy scaling
    logo: { topVh: 66, leftVw: 26, sizePx: 72 },
    play: { topVh: 62, leftVw: 26, sizePx: 64 },
  },
};
