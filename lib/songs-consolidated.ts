import { slugify } from "@/lib/slug";

export type ElementKind = 'WATER' | 'HEART' | 'LIGHTNING' | 'DARKNESS' | 'FIRE' | 'EARTH' | 'AIR';

export type AudioSource = {
  format: "opus" | "mp3";
  src: string;
  mimeType: string;
};

export type Song = {
  title: string;
  slug: string;
  spotify?: string;
  apple?: string;
  youtube?: string;
  src?: string;         // Legacy: defaults to /tracks/<slug>.mp3 (deprecated in favor of sources)
  sources: AudioSource[]; // New: dual format support
  cover?: string;       // defaults to /cover/<slug>.png
  type?: string;        // Legacy: default "audio/mpeg" (deprecated in favor of sources)
  subtitle?: string;    // optional label/tagline
  bgSky?: string;       // optional HUD sky override
  bg?: 'space' | 'ocean' | 'paris' | 'generic'; // background theme
  element: ElementKind; // element type for theming
  theme: Record<string, string>; // CSS variables
  // Whether lyrics are available for this song
  hasLyrics?: boolean;
  // Optional per-song chorus timestamps (seconds). First entry is first chorus.
  choruses?: number[];
  // Optional structured song sections with labels and kinds.
  sections?: { time: number; label: string; kind?: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' }[];
};

// Taglines per song, keyed by slugified title
const TAGLINES: Record<string, string> = {
  "alone": "Lost in a crowd under city lights.",
  "always-on-my-mind": "Even goodbyes can't erase you.",
  "baby": "Chaos, magic, and first-date sparks.",
  "be-my-bee": "Love's sweet buzz, then the sting.",
  "believe-in-me": "A whisper: believe in my dream.",
  "brain-freeze": "Summer highs, messy rush.",
  "collide": "Two souls crash into fate.",
  "colors-of-our-home": "From isolation to a world in color.",
  "cookies": "Sweet bites of nostalgia.",
  "do-you-want-to-play-house": "Pretend love feels too real.",
  "feeling-this-blink-182-cover": "Skin, sweat, and emotion take over.",
  "game-boy-heart": "Escaping into an 8-bit dream.",
  "home": "Searching the stars, finding home within.",
  "house-party": "A crush, a crowd, all aliens in disguise.",
  "alien-house-party": "A crush, a crowd, all aliens in disguise.",
  "i-might-fall-in-love-with-you": "Sweaters, slow mornings, love as home.",
  "kid-forever": "Fearless in your daydream land.",
  "letting-go": "Release it all to be free.",
  "little-black-heart": "Afraid to live or to die?",
  "love": "Lose myself chasing dreams—would you stay?",
  "merry-go-round": "Spinning in endless circles.",
  "mr-brightside-killers-cover": "Love turns to doubt, every glance betrayal.",
  "neon-skies": "Midnight painted in light.",
  "ocean-girl": "Love flows back like the tide.",
  "paris": "Poison love kissed anyway.",
  "pokemon": "Dream big, fight hard, never stop chasing.",
  "somebody-to-love": "You gave real love, they weren't the one.",
  "studio": "Where dreams echo into sound.",
  "they-feel-too": "Every alien heart still aches.",
  "tienes-un-amigo": "Friendship finds you anywhere.",
  "were-just-friends": "Lines blur between us.",
  "were-just-friends-dmvrco-remix": "Lines blur between us.",
  "were-just-friends-mickey-jas-remix": "Lines blur between us.",
};

// Element themes mapping
const ELEMENT_THEMES: Record<ElementKind, { bg: Song['bg']; theme: Record<string, string> }> = {
  WATER: {
    bg: 'ocean',
    theme: {
      '--color-primary': '#19E3FF',
      '--glow-1': 'rgba(25,227,255,0.6)',
      '--glow-2': 'rgba(25,227,255,0.25)',
    },
  },
  HEART: {
    bg: 'paris',
    theme: {
      '--color-primary': '#FC54AF',
      '--glow-1': 'rgba(252,84,175,0.6)',
      '--glow-2': 'rgba(252,84,175,0.25)',
    },
  },
  LIGHTNING: {
    bg: 'space',
    theme: {
      '--color-primary': '#F2EF1D',
      '--glow-1': 'rgba(242,239,29,0.6)',
      '--glow-2': 'rgba(242,239,29,0.25)',
    },
  },
  DARKNESS: {
    bg: 'space',
    theme: {
      '--color-primary': '#8B5A8B',
      '--glow-1': 'rgba(139,90,139,0.6)',
      '--glow-2': 'rgba(139,90,139,0.25)',
    },
  },
  FIRE: {
    bg: 'space',
    theme: {
      '--color-primary': '#FF6B35',
      '--glow-1': 'rgba(255,107,53,0.6)',
      '--glow-2': 'rgba(255,107,53,0.25)',
    },
  },
  EARTH: {
    bg: 'paris',
    theme: {
      '--color-primary': '#8FBC8F',
      '--glow-1': 'rgba(143,188,143,0.6)',
      '--glow-2': 'rgba(143,188,143,0.25)',
    },
  },
  AIR: {
    bg: 'space',
    theme: {
      '--color-primary': '#87CEEB',
      '--glow-1': 'rgba(135,206,235,0.6)',
      '--glow-2': 'rgba(135,206,235,0.25)',
    },
  },
};

// Function to determine element based on song content
function getElementForSong(title: string, slug: string): ElementKind {
  const s = slug.toLowerCase();
  const t = title.toLowerCase();
  
  // Specific themes first
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "WATER";
  if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love") || s.includes("paris") || s.includes("bee")) return "HEART";
  if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "LIGHTNING";
  if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "DARKNESS";
  if (s.includes("fire") || s.includes("burn")) return "FIRE";
  if (s.includes("home") || s.includes("earth")) return "EARTH";
  if (s.includes("air") || s.includes("sky")) return "AIR";
  
  // fallback to water for unknown tracks
  return "WATER";
}

// Function to build audio sources array for dual format support
function buildAudioSources(providedSrc: string | undefined, slug: string): AudioSource[] {
  const sources: AudioSource[] = [];
  
  // If a specific src is provided, use it and try to infer both formats
  if (providedSrc) {
    if (providedSrc.endsWith('.opus')) {
      // OPUS first for modern browsers
      sources.push({
        format: "opus",
        src: providedSrc,
        mimeType: "audio/ogg; codecs=opus",
      });
      // Try to find corresponding MP3
      const mp3Src = providedSrc.replace(/\.opus$/, '.mp3');
      sources.push({
        format: "mp3",
        src: mp3Src,
        mimeType: "audio/mpeg",
      });
    } else if (providedSrc.endsWith('.mp3')) {
      // Try to find corresponding OPUS first
      const opusSrc = providedSrc.replace(/\.mp3$/, '.opus');
      sources.push({
        format: "opus",
        src: opusSrc,
        mimeType: "audio/ogg; codecs=opus",
      });
      // Then MP3
      sources.push({
        format: "mp3",
        src: providedSrc,
        mimeType: "audio/mpeg",
      });
    } else {
      // Unknown format, just add as-is with generic MIME type
      sources.push({
        format: "mp3", // Default to mp3
        src: providedSrc,
        mimeType: "audio/mpeg",
      });
    }
  } else {
    // No specific src provided, use defaults with both formats
    sources.push({
      format: "opus",
      src: `/tracks/${slug}.opus`,
      mimeType: "audio/ogg; codecs=opus",
    });
    sources.push({
      format: "mp3",
      src: `/tracks/${slug}.mp3`,
      mimeType: "audio/mpeg",
    });
  }
  
  return sources;
}

const RAW: Omit<Song, "slug" | "type" | "subtitle" | "bg" | "element" | "theme" | "sources">[] = [
  { title: "BABY", spotify:"https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3", apple:"https://music.apple.com/us/album/baby/1823220422?i=1823220423", youtube:"https://youtu.be/RqBs_MYhM6c", cover: "/covers/BABY.webp", src: "/tracks/baby.opus", sections: [
    { time: 15.8, label: "Verse 1", kind: "verse" },
    { time: 47.4, label: "Chorus 1", kind: "chorus" },
    { time: 79.0, label: "Verse 2", kind: "verse" },
    { time: 110.6, label: "Chorus 2", kind: "chorus" },
    { time: 142.2, label: "Bridge", kind: "bridge" },
    { time: 157.8, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "BE MY BEE", spotify:"https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr", apple:"https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028", cover:"/covers/BE MY BEE.webp", src: "/tracks/be-my-bee.opus", sections: [
    { time: 14.1, label: "Verse 1", kind: "verse" },
    { time: 45.7, label: "Chorus 1", kind: "chorus" },
    { time: 77.3, label: "Verse 2", kind: "verse" },
    { time: 108.9, label: "Chorus 2", kind: "chorus" },
    { time: 140.5, label: "Bridge", kind: "bridge" },
    { time: 156.1, label: "Final Chorus", kind: "chorus" }
  ] },
  // COLORS OF OUR HOME — three variants
  { title: "COLORS OF OUR HOME",
    cover: "/covers/COLORS OF OUR HOME.webp",
    src: "/tracks/COLORS-OF-OUR-HOME.opus",
  },
  { title: "COLORS OF OUR HOME (ACOUSTIC)",
    cover: "/covers/COLORS OF OUR HOME (ACOUSTIC).webp",
    src: "/tracks/COLORS-OF-OUR-HOME-_ACOUSTIC_.opus",
  },
  { title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)",
    cover: "/covers/COLORS OF OUR HOME (BLUMA Game Soundtrack).webp",
    src: "/tracks/COLORS-OF-OUR-HOME-_BLUMA-Game-Soundtrack_.opus",
  },
  { title: "KID FOREVER (永遠の子供)", spotify:"https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN", apple:"https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337", src: "/tracks/kid-forever.opus", cover: "/covers/KID FOREVER.webp", sections: [
    { time: 12.3, label: "Verse 1", kind: "verse" },
    { time: 42.8, label: "Chorus 1", kind: "chorus" },
    { time: 73.5, label: "Verse 2", kind: "verse" },
    { time: 104.2, label: "Chorus 2", kind: "chorus" },
    { time: 134.9, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL", spotify:"https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ", apple:"https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199", youtube:"https://www.youtube.com/watch?v=GKfczFiNLn0", cover:"/covers/OCEAN GIRL.webp", src: "/tracks/ocean-girl.opus", sections: [
    { time: 16.7, label: "Verse 1", kind: "verse" },
    { time: 48.3, label: "Chorus 1", kind: "chorus" },
    { time: 79.9, label: "Verse 2", kind: "verse" },
    { time: 111.5, label: "Chorus 2", kind: "chorus" },
    { time: 143.1, label: "Bridge", kind: "bridge" },
    { time: 158.7, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL (ACOUSTIC)", spotify:"https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275", apple:"https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267", youtube:"https://www.youtube.com/watch?v=NsL3WC6L3fw", cover:"/covers/OCEAN GIRL (ACOUSTIC).webp", src: "/tracks/ocean-girl-acoustic.opus", sections: [
    { time: 14.2, label: "Verse 1", kind: "verse" },
    { time: 43.8, label: "Chorus 1", kind: "chorus" },
    { time: 73.4, label: "Verse 2", kind: "verse" },
    { time: 103.0, label: "Chorus 2", kind: "chorus" },
    { time: 132.6, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL (REMIX)", spotify:"https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4", apple:"https://music.apple.com/us/album/ocean-girl-remix-single/1830764323", youtube:"https://www.youtube.com/watch?v=oGiRQCARek4", cover:"/covers/OCEAN GIRL (REMIX).webp", src: "/tracks/ocean-girl-remix.opus", sections: [
    { time: 22.1, label: "Build Up", kind: "verse" },
    { time: 54.7, label: "Drop 1", kind: "chorus" },
    { time: 87.3, label: "Break", kind: "verse" },
    { time: 119.9, label: "Drop 2", kind: "chorus" },
    { time: 152.5, label: "Final Drop", kind: "chorus" }
  ] },
  { title: "POKÉMON", spotify:"https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk", apple:"https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784", cover:"/covers/POKEMON.webp", src: "/tracks/pokemon.opus", sections: [
    { time: 11.6, label: "Verse 1", kind: "verse" },
    { time: 41.3, label: "Chorus 1", kind: "chorus" },
    { time: 71.0, label: "Verse 2", kind: "verse" },
    { time: 100.7, label: "Chorus 2", kind: "chorus" },
    { time: 130.4, label: "Bridge", kind: "bridge" },
    { time: 145.1, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "WE'RE JUST FRIENDS", youtube:"https://www.youtube.com/watch?v=eQ4uBMn6cQ0" },
  { title: "HOUSE PARTY", youtube:"https://www.youtube.com/watch?v=B6EyIK-gE1c" },
  { title: "PARIS", youtube:"https://www.youtube.com/watch?v=J2qrS9EGRw8" },
  { title: "BABY | Official Lyric video", youtube:"https://youtu.be/4J0YaoWKRjI" },
];

const MAPPED = RAW.map((t, idx) => {
  let base = slugify(t.title);
  if (!base || base === "track") base = `track-${idx + 1}`;
  let tagline = TAGLINES[base];
  if (!tagline && base.startsWith("ocean-girl")) tagline = TAGLINES["ocean-girl"]; // apply to variants
  
  // Determine element and get corresponding theme
  const element = getElementForSong(t.title, base);
  const elementData = ELEMENT_THEMES[element];
  
  // Default to local cover path when a cover isn't provided
  // Covers are stored under /public/covers as WEBP; strip diacritics for filenames like POKÉMON -> POKEMON
  const fileTitle = (t.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cover = t.cover ?? `/covers/${fileTitle}.webp`;
  
  // Build audio sources for dual format support
  const sources = buildAudioSources(t.src, base);

  return {
    ...t,
    slug: base,
    // Legacy fields for backward compatibility
    type: t.src?.endsWith('.opus') ? "audio/ogg" : "audio/mpeg",
    src: t.src ?? `/tracks/${base}.opus`,
    // New dual format support
    sources,
    cover,
    subtitle: tagline ?? `Channel ${idx + 1}`,
    element,
    bg: elementData.bg,
    theme: elementData.theme,
  } as Song;
});

// Ensure keyboard navigation order matches the song list (alphabetical by title)
export const songs = MAPPED.sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));

// Backward compatibility exports - maintain the same API as both original files
export const tracks = songs; // For components expecting tracks

export function getSongBySlug(slug: string): Song | undefined {
  const s = String(slug || '').toLowerCase();
  return songs.find(x => x.slug === s);
}

export function getNextSongSlug(slug: string): string {
  const idx = songs.findIndex(s => s.slug === slug);
  if (idx < 0) return songs[0]?.slug || '';
  const next = (idx + 1) % songs.length;
  return songs[next].slug;
}

// Export for backward compatibility with Track type
export type Track = Song;
