// Audio assets mapping by slug, generated from existing track data
// This provides the bridge between Supabase song slugs and actual audio/cover file paths
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";

export const AUDIO_ASSETS_BY_SLUG: Record<string, {
  src: string;
  cover: string;
  spotify?: string;
  apple?: string;
  sections?: Array<{ time: number; label: string; kind?: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' }>;
}> = {
  "game-boy-heart": {
    src: supabaseTrackUrl("game-boy-heart.mp3"),
    cover: "/covers/GAME BOY HEART.webp",
    spotify: "https://open.spotify.com/track/5VypE0QkaggJemaNG6sMsF",
    apple: "https://music.apple.com/us/album/game-boy-heart-%E3%82%B2%E3%83%BC%E3%83%A0%E3%83%9C%E3%83%BC%E3%82%A4%E3%81%AE%E5%BF%83/1826340576?i=1826340577",
    sections: [
      { time: 15.5, label: "Verse 1", kind: "verse" },
      { time: 47.2, label: "Chorus 1", kind: "chorus" },
      { time: 78.8, label: "Verse 2", kind: "verse" },
      { time: 110.4, label: "Chorus 2", kind: "chorus" },
      { time: 142.1, label: "Bridge", kind: "bridge" },
      { time: 158.7, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "kid-forever": {
    src: supabaseTrackUrl("kid-forever.mp3"),
    cover: "/covers/KID FOREVER.webp",
    spotify: "https://open.spotify.com/track/5X27jqHBvMBsDvvFixeZdN",
    apple: "https://music.apple.com/us/album/kid-forever-%E6%B0%B8%E9%81%A0%E3%81%AE%E5%AD%90%E4%BE%9B-single/1826397337",
    sections: [
      { time: 12.3, label: "Verse 1", kind: "verse" },
      { time: 42.8, label: "Chorus 1", kind: "chorus" },
      { time: 73.5, label: "Verse 2", kind: "verse" },
      { time: 104.2, label: "Chorus 2", kind: "chorus" },
      { time: 134.9, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "brain-freeze": {
    src: supabaseTrackUrl("brain-freeze.mp3"),
    cover: "/covers/BRAIN FREEZE.webp",
    spotify: "https://open.spotify.com/track/5ou8AyA71rLFK6Ysxr2CpT",
    apple: "https://music.apple.com/us/album/brain-freeze/1823925483?i=1823925484",
    sections: [
      { time: 18.7, label: "Verse 1", kind: "verse" },
      { time: 51.3, label: "Chorus 1", kind: "chorus" },
      { time: 84.6, label: "Verse 2", kind: "verse" },
      { time: 117.2, label: "Chorus 2", kind: "chorus" },
      { time: 149.8, label: "Bridge", kind: "bridge" },
      { time: 165.4, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "we're-just-friends-mickey-jas-remix": {
    src: supabaseTrackUrl("we're-just-friends-mickey-jas-remix.opus"),
    cover: "/covers/WE'RE JUST FRIENDS (MICKEY JAS REMIX).webp",
    spotify: "https://open.spotify.com/track/28wYsy2LrfVUT5glavy7hJ",
    apple: "https://music.apple.com/us/album/were-just-friends-mickey-jas-remix/1785153493?i=1785153499",
    sections: [
      { time: 16.2, label: "Build Up", kind: "verse" },
      { time: 48.9, label: "Drop 1", kind: "chorus" },
      { time: 81.5, label: "Break", kind: "verse" },
      { time: 114.1, label: "Drop 2", kind: "chorus" },
      { time: 146.7, label: "Final Drop", kind: "chorus" }
    ]
  },
  "be-my-bee": {
    src: supabaseTrackUrl("be-my-bee.opus"),
    cover: "/covers/BE MY BEE.webp",
    spotify: "https://open.spotify.com/track/12iLygYksfcZ3nv6NkrnEr",
    apple: "https://music.apple.com/us/album/be-my-bee/1784058027?i=1784058028",
    sections: [
      { time: 14.1, label: "Verse 1", kind: "verse" },
      { time: 45.7, label: "Chorus 1", kind: "chorus" },
      { time: 77.3, label: "Verse 2", kind: "verse" },
      { time: 108.9, label: "Chorus 2", kind: "chorus" },
      { time: 140.5, label: "Bridge", kind: "bridge" },
      { time: 156.1, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "we're-just-friends": {
    src: supabaseTrackUrl("we're-just-friends.opus"),
    cover: "/covers/WE'RE JUST FRIENDS.webp",
    spotify: "https://open.spotify.com/track/2IffMAupdw2alpsISKFs8y",
    apple: "https://music.apple.com/us/album/were-just-friends/1662517763?i=1662517764",
    sections: [
      { time: 13.8, label: "Verse 1", kind: "verse" },
      { time: 44.5, label: "Chorus 1", kind: "chorus" },
      { time: 75.2, label: "Verse 2", kind: "verse" },
      { time: 105.9, label: "Chorus 2", kind: "chorus" },
      { time: 136.6, label: "Bridge", kind: "bridge" },
      { time: 152.3, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "paris": {
    src: supabaseTrackUrl("paris.mp3"),
    cover: "/covers/PARIS.webp",
    spotify: "https://open.spotify.com/track/2luPTqZK9w5fJ30T4rLZut",
    apple: "https://music.apple.com/us/album/paris/1779879728?i=1779879729",
    sections: [
      { time: 19.4, label: "Verse 1", kind: "verse" },
      { time: 52.1, label: "Chorus 1", kind: "chorus" },
      { time: 84.8, label: "Verse 2", kind: "verse" },
      { time: 117.5, label: "Chorus 2", kind: "chorus" },
      { time: 150.2, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "pokemon": {
    src: supabaseTrackUrl("pokemon.opus"),
    cover: "/covers/POKEMON.webp",
    spotify: "https://open.spotify.com/track/7uzO8MyTy8402703kP2Xuk",
    apple: "https://music.apple.com/us/album/pok%C3%A9mon-single/1807448784",
    sections: [
      { time: 11.6, label: "Verse 1", kind: "verse" },
      { time: 41.3, label: "Chorus 1", kind: "chorus" },
      { time: 71.0, label: "Verse 2", kind: "verse" },
      { time: 100.7, label: "Chorus 2", kind: "chorus" },
      { time: 130.4, label: "Bridge", kind: "bridge" },
      { time: 145.1, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "house-party": {
    src: supabaseTrackUrl("house-party.mp3"),
    cover: "/covers/HOUSE PARTY.webp",
    spotify: "https://open.spotify.com/track/0b5y0gHMf3wLYX69B8S6g4",
    apple: "https://music.apple.com/us/album/alien-house-party/1757497439?i=1757497440",
    sections: [
      { time: 17.9, label: "Verse 1", kind: "verse" },
      { time: 50.6, label: "Chorus 1", kind: "chorus" },
      { time: 83.3, label: "Verse 2", kind: "verse" },
      { time: 116.0, label: "Chorus 2", kind: "chorus" },
      { time: 148.7, label: "Bridge", kind: "bridge" },
      { time: 164.4, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "we're-just-friends-dmvrco-remix": {
    src: supabaseTrackUrl("we're-just-friends-dmvrco-remix.opus"),
    cover: "/covers/WE'RE JUST FRIENDS (DMVRCO REMIX).webp",
    spotify: "https://open.spotify.com/track/1WfJUtDFUiz0rUdlGfLQBA",
    apple: "https://music.apple.com/us/album/were-just-friends-dmvrco-remix/1680307531?i=1680307532",
    sections: [
      { time: 20.5, label: "Build Up", kind: "verse" },
      { time: 53.2, label: "Drop 1", kind: "chorus" },
      { time: 85.9, label: "Break", kind: "verse" },
      { time: 118.6, label: "Drop 2", kind: "chorus" },
      { time: 151.3, label: "Final Drop", kind: "chorus" }
    ]
  },
  "baby": {
    src: supabaseTrackUrl("baby.opus"),
    cover: "/covers/BABY.webp",
    spotify: "https://open.spotify.com/track/3UEVjChARWDbY4ruOIbIl3",
    apple: "https://music.apple.com/us/album/baby/1823220422?i=1823220423",
    sections: [
      { time: 15.8, label: "Verse 1", kind: "verse" },
      { time: 47.4, label: "Chorus 1", kind: "chorus" },
      { time: 79.0, label: "Verse 2", kind: "verse" },
      { time: 110.6, label: "Chorus 2", kind: "chorus" },
      { time: 142.2, label: "Bridge", kind: "bridge" },
      { time: 157.8, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "ocean-girl": {
    src: supabaseTrackUrl("ocean-girl.opus"),
    cover: "/covers/OCEAN GIRL.webp",
    spotify: "https://open.spotify.com/album/37niwECG0TJMuYFQdrJE3y?si=S_Btj1hMRU-RsnsVL2PBmQ",
    apple: "https://music.apple.com/us/album/ocean-girl/1829503198?i=1829503199",
    sections: [
      { time: 16.7, label: "Verse 1", kind: "verse" },
      { time: 48.3, label: "Chorus 1", kind: "chorus" },
      { time: 79.9, label: "Verse 2", kind: "verse" },
      { time: 111.5, label: "Chorus 2", kind: "chorus" },
      { time: 143.1, label: "Bridge", kind: "bridge" },
      { time: 158.7, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "ocean-girl-acoustic": {
    src: supabaseTrackUrl("ocean-girl-acoustic.opus"),
    cover: "/covers/OCEAN GIRL (ACOUSTIC).webp",
    spotify: "https://open.spotify.com/track/62KREyqgAQxmq3zqCT7oMh?si=506cf1906fac4275",
    apple: "https://music.apple.com/us/album/ocean-girl-acoustic/1830685266?i=1830685267",
    sections: [
      { time: 14.2, label: "Verse 1", kind: "verse" },
      { time: 43.8, label: "Chorus 1", kind: "chorus" },
      { time: 73.4, label: "Verse 2", kind: "verse" },
      { time: 103.0, label: "Chorus 2", kind: "chorus" },
      { time: 132.6, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "ocean-girl-remix": {
    src: supabaseTrackUrl("ocean-girl-remix.opus"),
    cover: "/covers/OCEAN GIRL (REMIX).webp",
    spotify: "https://open.spotify.com/track/1wbgLONY1GsBZC5XW4MUzu?si=ff27a874552948c4",
    apple: "https://music.apple.com/us/album/ocean-girl-remix-single/1830764323",
    sections: [
      { time: 22.1, label: "Build Up", kind: "verse" },
      { time: 54.7, label: "Drop 1", kind: "chorus" },
      { time: 87.3, label: "Break", kind: "verse" },
      { time: 119.9, label: "Drop 2", kind: "chorus" },
      { time: 152.5, label: "Final Drop", kind: "chorus" }
    ]
  },
  "mr-brightside": {
    src: supabaseTrackUrl("MR.BRIGHTSIDE.mp3"),
    cover: "/covers/MR. BRIGHTSIDE.webp",
  },
  "collide": {
    src: supabaseTrackUrl("collide.mp3"),
    cover: "/covers/COLLIDE.webp",
    spotify: "https://open.spotify.com/track/4CCfWIk6SDUwmcUvGvgVQG?si=2788de692cc3435d",
    apple: "https://music.apple.com/us/album/collide/1814599250?i=1814599264",
    sections: [
      { time: 18.4, label: "Verse 1", kind: "verse" },
      { time: 51.0, label: "Chorus 1", kind: "chorus" },
      { time: 83.6, label: "Verse 2", kind: "verse" },
      { time: 116.2, label: "Chorus 2", kind: "chorus" },
      { time: 148.8, label: "Bridge", kind: "bridge" },
      { time: 164.4, label: "Final Chorus", kind: "chorus" }
    ]
  },
};