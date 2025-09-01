import { slugify } from "@/lib/slug";

export type Track = {
  title: string;
  spotify?: string;
  apple?: string;
  src?: string;         // defaults to /tracks/<slug>.mp3
  cover?: string;       // defaults to /cover/<slug>-cover.png
  type?: string;        // default "audio/mpeg"
  subtitle?: string;    // optional label
  slug?: string;        // auto-filled; falls back to track-<n> if needed
  bgSky?: string;       // optional HUD sky override (used by CockpitDashboard)
};

// Taglines per song, keyed by slugified title
const TAGLINES: Record<string, string> = {
  "alone": "Lost in a crowd under city lights.",
  "always-on-my-mind": "Even goodbyes can’t erase you.",
  "baby": "Chaos, magic, and first-date sparks.",
  "be-my-bee": "Love’s sweet buzz, then the sting.",
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
  "pok-mon": "Dream big, fight hard, never stop chasing.",
  "somebody-to-love": "You gave real love, they weren’t the one.",
  "studio": "Where dreams echo into sound.",
  "they-feel-too": "Every alien heart still aches.",
  "tienes-un-amigo": "Friendship finds you anywhere.",
  "were-just-friends": "Lines blur between us.",
  "were-just-friends-dmvrco-remix": "Lines blur between us.",
  "were-just-friends-mickey-jas-remix": "Lines blur between us.",
};

const RAW: Omit<Track, "slug" | "type" | "subtitle">[] = [
  { title: "GAME BOY HEART (ゲームボーイの心)", spotify:"https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF", apple:"https://music.apple.com/us/album/game-boy-heart-%E3%82%B2%E3%83%BC%E3%83%A0%E3%83%9C%E3%83%BC%E3%82%A4%E3%81%AE%E5%BF%83/1826340576?i=1826340577", src: "/tracks/game-boy-heart.mp3", cover: "/cover/game-boy-heart-cover.png" },
  { title: "KID FOREVER (永遠の子供)",           spotify:"https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN", apple:"https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337", src: "/tracks/kid-forever.mp3" },
  { title: "BRAIN FREEZE",                       spotify:"https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT", apple:"https://music.apple.com/us/album/brain-freeze/1823925483?i=1823925484", src: "/tracks/brain-freeze.mp3" },
  { title: "WE’RE JUST FRIENDS (mickey jas Remix)", spotify:"https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ", apple:"https://music.apple.com/us/album/were-just-friends-mickey-jas-remix/1785153493?i=1785153499", cover:"/cover/we're-just-friends-mickey-jas-remix-cover.png", src: "/tracks/we're-just-friends-mickey-jas-remix.mp3" },
  { title: "BE MY BEE",                           spotify:"https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr", apple:"https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028", src: "/tracks/be-my-bee.mp3" },
  { title: "WE’RE JUST FRIENDS",                  spotify:"https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y", apple:"https://music.apple.com/us/album/were-just-friends/1662517763?i=1662517764", cover:"/cover/we're-just-friends-cover.png", src: "/tracks/we're-just-friends.mp3" },
  { title: "PARIS",                               spotify:"https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut", apple:"https://music.apple.com/us/album/paris/1779879728?i=1779879729" },
  { title: "POKÉMON",                             spotify:"https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk", apple:"https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784", cover:"/cover/pokemon-cover.png", src: "/tracks/pokemon.mp3" },
  { title: "ALIEN (House Party)",                 spotify:"https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4", apple:"https://music.apple.com/us/album/alien-house-party/1757497439?i=1757497440", cover:"/cover/house-party-cover.jpg", src: "/tracks/house-party.mp3" },
  { title: "WE’RE JUST FRIENDS (DMVRCO Remix)",   spotify:"https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA", apple:"https://music.apple.com/us/album/were-just-friends-dmvrco-remix/1680307531?i=1680307532", cover:"/cover/we're-just-friends-dmvrco-remix-cover.png", src: "/tracks/we're-just-friends-dmvrco-remix.mp3" },
  { title: "BABY",                                spotify:"https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3", apple:"https://music.apple.com/us/album/baby/1823220422?i=1823220423", src: "/tracks/baby.mp3" },
  { title: "OCEAN GIRL",                          spotify:"https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ", apple:"https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199", src: "/tracks/ocean-girl.mp3" },
  { title: "OCEAN GIRL (ACOUSTIC)",               spotify:"https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275",       apple:"https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267", src: "/tracks/ocean-girl-acoustic.mp3" },
  { title: "OCEAN GIRL (REMIX)",                  spotify:"https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4",       apple:"https://music.apple.com/us/album/ocean-girl-remix-single/1830764323", src: "/tracks/ocean-girl-remix.mp3" },
  { title: "COLLIDE",                             spotify:"https://open.spotify.com/track/4CCfWIk6SDUwmcUvGvgVQG?si=2788de692cc3435d",      apple:"https://music.apple.com/us/album/collide/1814599250?i=1814599264", src: "/tracks/collide.mp3" },
];

const MAPPED = RAW.map((t, idx) => {
  let base = slugify(t.title);
  if (!base || base === "track") base = `track-${idx + 1}`;
  let tagline = TAGLINES[base];
  if (!tagline && base.startsWith("ocean-girl")) tagline = TAGLINES["ocean-girl"]; // apply to variants
  return {
    ...t,
    slug: base,
    type: "audio/mpeg",
    // Match existing asset locations under /public
    // audio: only when provided in RAW (no auto default)
    // cover: /public/cover/<slug>-cover.png
    src:  t.src ?? `/tracks/${base}.mp3`,
    cover:t.cover ?? `/cover/${base}-cover.png`,
    subtitle: tagline ?? `Channel ${idx + 1}`,
  };
});

// Ensure keyboard navigation order matches the song list (alphabetical by title)
export const tracks = MAPPED.sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
