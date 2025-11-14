import { slugify } from "@/lib/slug";

export type ElementKind = 'WATER' | 'HEART' | 'LIGHTNING' | 'DARKNESS' | 'FIRE' | 'EARTH' | 'AIR';

export type Song = {
  title: string;
  slug: string;
  spotify?: string;
  apple?: string;
  youtube?: string;
  src?: string;         // defaults to /tracks/<slug>.mp3
  cover?: string;       // defaults to /cover/<slug>.png
  type?: string;        // default "audio/mpeg"
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

const RAW: Omit<Song, "slug" | "type" | "subtitle" | "bg" | "element" | "theme">[] = [
  { title: "GAME BOY HEART (ゲームボーイの心)", spotify:"https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF", apple:"https://music.apple.com/us/album/game-boy-heart-%E3%82%B2%E3%83%BC%E3%83%A0%E3%83%9C%E3%83%BC%E3%82%A4%E3%81%AE%E5%BF%83/1826340576?i=1826340577", src: "https://ik.imagekit.io/CHXNDLER/tracks/game-boy-heart.mp3?updatedAt=1762391901764", cover: "https://ik.imagekit.io/CHXNDLER/cover/game-boy-heart.png?updatedAt=1762361383524", sections: [
    { time: 15.5, label: "Verse 1", kind: "verse" },
    { time: 47.2, label: "Chorus 1", kind: "chorus" },
    { time: 78.8, label: "Verse 2", kind: "verse" },
    { time: 110.4, label: "Chorus 2", kind: "chorus" },
    { time: 142.1, label: "Bridge", kind: "bridge" },
    { time: 158.7, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "KID FOREVER (永遠の子供)", spotify:"https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN", apple:"https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337", src: "https://ik.imagekit.io/CHXNDLER/tracks/kid-forever.mp3?updatedAt=1762391913791", sections: [
    { time: 12.3, label: "Verse 1", kind: "verse" },
    { time: 42.8, label: "Chorus 1", kind: "chorus" },
    { time: 73.5, label: "Verse 2", kind: "verse" },
    { time: 104.2, label: "Chorus 2", kind: "chorus" },
    { time: 134.9, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "BRAIN FREEZE", spotify:"https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT", apple:"https://music.apple.com/us/album/brain-freeze/1823925483?i=1823925484", src: "https://ik.imagekit.io/CHXNDLER/tracks/brain-freeze.mp3?updatedAt=1762391904818", cover: "https://ik.imagekit.io/CHXNDLER/cover/brain-freeze.png?updatedAt=1762361385723", hasLyrics: false, sections: [
    { time: 18.7, label: "Verse 1", kind: "verse" },
    { time: 51.3, label: "Chorus 1", kind: "chorus" },
    { time: 84.6, label: "Verse 2", kind: "verse" },
    { time: 117.2, label: "Chorus 2", kind: "chorus" },
    { time: 149.8, label: "Bridge", kind: "bridge" },
    { time: 165.4, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "WE'RE JUST FRIENDS (mickey jas Remix)", spotify:"https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ", apple:"https://music.apple.com/us/album/were-just-friends-mickey-jas-remix/1785153493?i=1785153499", cover:"https://ik.imagekit.io/CHXNDLER/cover/we're-just-friends-mickey-jas-remix.png?updatedAt=1762361381793", src: "https://ik.imagekit.io/CHXNDLER/tracks/we're-just-friends-mickey-jas-remix.mp3?updatedAt=1762391913397", sections: [
    { time: 16.2, label: "Build Up", kind: "verse" },
    { time: 48.9, label: "Drop 1", kind: "chorus" },
    { time: 81.5, label: "Break", kind: "verse" },
    { time: 114.1, label: "Drop 2", kind: "chorus" },
    { time: 146.7, label: "Final Drop", kind: "chorus" }
  ] },
  { title: "BE MY BEE", spotify:"https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr", apple:"https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028", cover:"https://ik.imagekit.io/CHXNDLER/cover/be-my-bee.png?updatedAt=1762361384425", src: "https://ik.imagekit.io/CHXNDLER/tracks/be-my-bee.mp3?updatedAt=1762391900470", sections: [
    { time: 14.1, label: "Verse 1", kind: "verse" },
    { time: 45.7, label: "Chorus 1", kind: "chorus" },
    { time: 77.3, label: "Verse 2", kind: "verse" },
    { time: 108.9, label: "Chorus 2", kind: "chorus" },
    { time: 140.5, label: "Bridge", kind: "bridge" },
    { time: 156.1, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "WE'RE JUST FRIENDS", spotify:"https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y", apple:"https://music.apple.com/us/album/were-just-friends/1662517763?i=1662517764", youtube:"https://www.youtube.com/watch?v=eQ4uBMn6cQ0", cover:"https://ik.imagekit.io/CHXNDLER/cover/we're-just-friends.png?updatedAt=1762361383697", src: "https://ik.imagekit.io/CHXNDLER/tracks/we're-just-friends.mp3?updatedAt=1762391896496", sections: [
    { time: 13.8, label: "Verse 1", kind: "verse" },
    { time: 44.5, label: "Chorus 1", kind: "chorus" },
    { time: 75.2, label: "Verse 2", kind: "verse" },
    { time: 105.9, label: "Chorus 2", kind: "chorus" },
    { time: 136.6, label: "Bridge", kind: "bridge" },
    { time: 152.3, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "PARIS", spotify:"https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut", apple:"https://music.apple.com/us/album/paris/1779879728?i=1779879729", youtube:"https://www.youtube.com/watch?v=J2qrS9EGRw8", cover:"https://ik.imagekit.io/CHXNDLER/cover/paris.png?updatedAt=1762361385345", src: "https://ik.imagekit.io/CHXNDLER/tracks/paris.mp3?updatedAt=1762391905527", sections: [
    { time: 19.4, label: "Verse 1", kind: "verse" },
    { time: 52.1, label: "Chorus 1", kind: "chorus" },
    { time: 84.8, label: "Verse 2", kind: "verse" },
    { time: 117.5, label: "Chorus 2", kind: "chorus" },
    { time: 150.2, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "POKÉMON", spotify:"https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk", apple:"https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784", cover:"https://ik.imagekit.io/CHXNDLER/cover/poke%CC%81mon.png?updatedAt=1762361385977", src: "https://ik.imagekit.io/CHXNDLER/tracks/pokemon.mp3?updatedAt=1762391910321", sections: [
    { time: 11.6, label: "Verse 1", kind: "verse" },
    { time: 41.3, label: "Chorus 1", kind: "chorus" },
    { time: 71.0, label: "Verse 2", kind: "verse" },
    { time: 100.7, label: "Chorus 2", kind: "chorus" },
    { time: 130.4, label: "Bridge", kind: "bridge" },
    { time: 145.1, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "HOUSE PARTY", spotify:"https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4", apple:"https://music.apple.com/us/album/alien-house-party/1757497439?i=1757497440", youtube:"https://www.youtube.com/watch?v=B6EyIK-gE1c", cover:"https://ik.imagekit.io/CHXNDLER/cover/house-party.png?updatedAt=1762361373876", src: "https://ik.imagekit.io/CHXNDLER/tracks/house-party.mp3?updatedAt=1762391897114", sections: [
    { time: 17.9, label: "Verse 1", kind: "verse" },
    { time: 50.6, label: "Chorus 1", kind: "chorus" },
    { time: 83.3, label: "Verse 2", kind: "verse" },
    { time: 116.0, label: "Chorus 2", kind: "chorus" },
    { time: 148.7, label: "Bridge", kind: "bridge" },
    { time: 164.4, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "WE'RE JUST FRIENDS (DMVRCO Remix)", spotify:"https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA", apple:"https://music.apple.com/us/album/were-just-friends-dmvrco-remix/1680307531?i=1680307532", cover:"https://ik.imagekit.io/CHXNDLER/cover/we're-just-friends-dmvrco-remix.png?updatedAt=1762361378303", src: "https://ik.imagekit.io/CHXNDLER/tracks/we're-just-friends-dmvrco-remix.mp3?updatedAt=1762391900663", sections: [
    { time: 20.5, label: "Build Up", kind: "verse" },
    { time: 53.2, label: "Drop 1", kind: "chorus" },
    { time: 85.9, label: "Break", kind: "verse" },
    { time: 118.6, label: "Drop 2", kind: "chorus" },
    { time: 151.3, label: "Final Drop", kind: "chorus" }
  ] },
  { title: "BABY", spotify:"https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3", apple:"https://music.apple.com/us/album/baby/1823220422?i=1823220423", youtube:"https://youtu.be/RqBs_MYhM6c", cover: "https://ik.imagekit.io/CHXNDLER/cover/baby.png?updatedAt=1762361386070", src: "https://ik.imagekit.io/CHXNDLER/tracks/baby.mp3?updatedAt=1762391904175", sections: [
    { time: 15.8, label: "Verse 1", kind: "verse" },
    { time: 47.4, label: "Chorus 1", kind: "chorus" },
    { time: 79.0, label: "Verse 2", kind: "verse" },
    { time: 110.6, label: "Chorus 2", kind: "chorus" },
    { time: 142.2, label: "Bridge", kind: "bridge" },
    { time: 157.8, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL", spotify:"https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ", apple:"https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199", youtube:"https://www.youtube.com/watch?v=GKfczFiNLn0", cover:"https://ik.imagekit.io/CHXNDLER/cover/ocean-girl.png?updatedAt=1762361386944", src: "https://ik.imagekit.io/CHXNDLER/tracks/ocean-girl.mp3?updatedAt=1762391909163", sections: [
    { time: 16.7, label: "Verse 1", kind: "verse" },
    { time: 48.3, label: "Chorus 1", kind: "chorus" },
    { time: 79.9, label: "Verse 2", kind: "verse" },
    { time: 111.5, label: "Chorus 2", kind: "chorus" },
    { time: 143.1, label: "Bridge", kind: "bridge" },
    { time: 158.7, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL (ACOUSTIC)", spotify:"https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275", apple:"https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267", youtube:"https://www.youtube.com/watch?v=NsL3WC6L3fw", cover:"https://ik.imagekit.io/CHXNDLER/cover/ocean-girl-acoustic.png?updatedAt=1762361387474", src: "https://ik.imagekit.io/CHXNDLER/tracks/ocean-girl-acoustic.mp3?updatedAt=1762391908907", sections: [
    { time: 14.2, label: "Verse 1", kind: "verse" },
    { time: 43.8, label: "Chorus 1", kind: "chorus" },
    { time: 73.4, label: "Verse 2", kind: "verse" },
    { time: 103.0, label: "Chorus 2", kind: "chorus" },
    { time: 132.6, label: "Final Chorus", kind: "chorus" }
  ] },
  { title: "OCEAN GIRL (REMIX)", spotify:"https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4", apple:"https://music.apple.com/us/album/ocean-girl-remix-single/1830764323", youtube:"https://www.youtube.com/watch?v=oGiRQCARek4", cover:"https://ik.imagekit.io/CHXNDLER/cover/ocean-girl-remix.png?updatedAt=1762361386891", src: "https://ik.imagekit.io/CHXNDLER/tracks/ocean-girl-remix.mp3?updatedAt=1762391913916", sections: [
    { time: 22.1, label: "Build Up", kind: "verse" },
    { time: 54.7, label: "Drop 1", kind: "chorus" },
    { time: 87.3, label: "Break", kind: "verse" },
    { time: 119.9, label: "Drop 2", kind: "chorus" },
    { time: 152.5, label: "Final Drop", kind: "chorus" }
  ] },
  // COLORS OF OUR HOME — three variants
  { title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)",
    youtube: "https://youtu.be/_pycyld2Goc",
    cover: "https://ik.imagekit.io/CHXNDLER/cover/COLORS%20OF%20OUR%20HOME%20(BLUMA%20Game%20Soundtrack).png?updatedAt=1763056338011",
    src: "https://ik.imagekit.io/CHXNDLER/tracks/COLORS%20OF%20OUR%20HOME%20(BLUMA%20Game%20Soundtrack).mp3?updatedAt=1763057755898",
  },
  { title: "COLORS OF OUR HOME (ACOUSTIC)",
    youtube: "https://youtu.be/_pycyld2Goc",
    cover: "https://ik.imagekit.io/CHXNDLER/cover/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).png?updatedAt=1763056318632",
    src: "https://ik.imagekit.io/CHXNDLER/tracks/COLORS%20OF%20OUR%20HOME%20(ACOUSTIC).mp3?updatedAt=1763057756024",
  },
  { title: "COLORS OF OUR HOME",
    youtube: "https://youtu.be/_pycyld2Goc",
    cover: "https://ik.imagekit.io/CHXNDLER/cover/COLORS%20OF%20OUR%20HOME.png?updatedAt=1763056318729",
    src: "https://ik.imagekit.io/CHXNDLER/tracks/COLORS%20OF%20OUR%20HOME.mp3?updatedAt=1763082471946",
  },
  { title: "COLLIDE", spotify:"https://open.spotify.com/track/4CCfWIk6SDUwmcUvGvgVQG?si=2788de692cc3435d", apple:"https://music.apple.com/us/album/collide/1814599250?i=1814599264", cover:"https://ik.imagekit.io/CHXNDLER/cover/collide.png?updatedAt=1762361385809", src: "https://ik.imagekit.io/CHXNDLER/tracks/collide.mp3?updatedAt=1762391910342", sections: [
    { time: 18.4, label: "Verse 1", kind: "verse" },
    { time: 51.0, label: "Chorus 1", kind: "chorus" },
    { time: 83.6, label: "Verse 2", kind: "verse" },
    { time: 116.2, label: "Chorus 2", kind: "chorus" },
    { time: 148.8, label: "Bridge", kind: "bridge" },
    { time: 164.4, label: "Final Chorus", kind: "chorus" }
  ] },
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
  const cover = t.cover ?? `/cover/${base}.png`;

  return {
    ...t,
    slug: base,
    type: "audio/mpeg",
    // Match existing asset locations under /public
    src: t.src ?? `/tracks/${base}.mp3`,
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
