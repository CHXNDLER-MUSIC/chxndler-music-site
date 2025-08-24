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
};

const RAW: Omit<Track, "slug" | "type" | "src" | "cover" | "subtitle">[] = [
  { title: "GAME BOY HEART (ゲームボーイの心)", spotify:"https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF", apple:"https://music.apple.com/us/album/game-boy-heart-%E3%82%B2%E3%83%BC%E3%83%A0%E3%83%9C%E3%83%BC%E3%82%A4%E3%81%AE%E5%BF%83/1826340576?i=1826340577" },
  { title: "KID FOREVER (永遠の子供)",           spotify:"https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN", apple:"https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337" },
  { title: "BRAIN FREEZE",                       spotify:"https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT", apple:"https://music.apple.com/us/album/brain-freeze/1823925483?i=1823925484" },
  { title: "WE’RE JUST FRIENDS (mickey jas Remix)", spotify:"https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ", apple:"https://music.apple.com/us/album/were-just-friends-mickey-jas-remix/1785153493?i=1785153499" },
  { title: "BE MY BEE",                           spotify:"https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr", apple:"https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028" },
  { title: "WE’RE JUST FRIENDS",                  spotify:"https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y", apple:"https://music.apple.com/us/album/were-just-friends/1662517763?i=1662517764" },
  { title: "PARIS",                               spotify:"https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut", apple:"https://music.apple.com/us/album/paris/1779879728?i=1779879729" },
  { title: "POKÉMON",                             spotify:"https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk", apple:"https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784" },
  { title: "ALIEN (House Party)",                 spotify:"https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4", apple:"https://music.apple.com/us/album/alien-house-party/1757497439?i=1757497440" },
  { title: "WE’RE JUST FRIENDS (DMVRCO Remix)",   spotify:"https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA", apple:"https://music.apple.com/us/album/were-just-friends-dmvrco-remix/1680307531?i=1680307532" },
  { title: "BABY",                                spotify:"https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3", apple:"https://music.apple.com/us/album/baby/1823220422?i=1823220423" },
  { title: "OCEAN GIRL",                          spotify:"https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ", apple:"https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199" },
  { title: "OCEAN GIRL (ACOUSTIC)",               spotify:"https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275",       apple:"https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267" },
  { title: "OCEAN GIRL (REMIX)",                  spotify:"https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4",       apple:"https://music.apple.com/us/album/ocean-girl-remix-single/1830764323" },
  { title: "COLLIDE",                             spotify:"https://open.spotify.com/track/4CCfWIk6SDUwmcUvGvgVQG?si=2788de692cc3435d",      apple:"https://music.apple.com/us/album/collide/1814599250?i=1814599264" },
];

export const tracks = RAW.map((t, idx) => {
  let base = slugify(t.title);
  if (!base || base === "track") base = `track-${idx + 1}`;
  return {
    ...t,
    slug: base,
    type: "audio/mpeg",
    // Match existing asset locations under /public
    // audio: /public/tracks/<slug>.mp3
    // cover: /public/cover/<slug>-cover.png
    src:  t.src   ?? `/tracks/${base}.mp3`,
    cover:t.cover ?? `/cover/${base}-cover.png`,
    subtitle: `Channel ${idx + 1}`,
  };
});
