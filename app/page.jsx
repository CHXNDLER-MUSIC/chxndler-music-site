// BRAND (unchanged)
const BRAND = { yellow: "#F2EF1D", pink: "#FC54AF", blue: "#38B6FF" };

// PATHS — uses your real file names
const PATHS = {
  cockpit: "/cockpit/cockpit.png",              // you currently have cockpit.png
  spaceDefault: "/cockpit/ocean-girl.png",      // placeholder bg (you have this)
  logos: {
    // you can swap these later for SVGs if you add them
    instagram: "/logo/CHXNDLER_Logo.png",       // temp icon until you add social SVGs
    tiktok: "/logo/CHXNDLER_Logo.png",
    youtube: "/logo/CHXNDLER_Logo.png",
    spotify: "/logo/CHXNDLER_Logo.png",
    apple: "/logo/CHXNDLER_Logo.png",
  },
};

// PLAYLIST — maps to /public/tracks + /public/cover
const PLAYLIST = [
  {
    id: "ocean-girl",
    title: "OCEAN GIRL",
    src: "/tracks/ocean-girl.mp3",
    cover: "/cover/ocean-girl-cover.png",
    backdrop: "/cockpit/ocean-girl.png",       // optional bg tint per track
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

// Social links you want
const LINKS = {
  instagram: "https://instagram.com/CHXNDLER_MUSIC",
  tiktok: "https://tiktok.com/@CHXNDLER_MUSIC",
  youtube: "https://youtube.com/@CHXNDLER_MUSIC",
  spotify: "https://open.spotify.com/artist/0", // update when ready
  apple: "https://music.apple.com/artist/0",
};

// Google Apps Script web app endpoint (when you have it)
const FORMSCRIPT_URL = "https://script.google.com/macros/s/REPLACE/exec";
