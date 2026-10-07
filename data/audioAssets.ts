// Audio assets mapping by slug, generated from existing track data
// This provides the bridge between Supabase song slugs and actual audio/cover file paths
import { supabaseTrackUrl } from "@/lib/supabaseTrackUrl";

export const AUDIO_ASSETS_BY_SLUG: Record<string, {
  src: string;
  cover: string;
  sections?: Array<{ time: number; label: string; kind?: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' }>;
}> = {
  "game-boy-heart": {
    src: supabaseTrackUrl("game-boy-heart.mp3"),
    cover: "/covers/GAME BOY HEART.webp",
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
    sections: [
      { time: 18.4, label: "Verse 1", kind: "verse" },
      { time: 51.0, label: "Chorus 1", kind: "chorus" },
      { time: 83.6, label: "Verse 2", kind: "verse" },
      { time: 116.2, label: "Chorus 2", kind: "chorus" },
      { time: 148.8, label: "Bridge", kind: "bridge" },
      { time: 164.4, label: "Final Chorus", kind: "chorus" }
    ]
  },
  "sugar-were-going-down": {
    src: supabaseTrackUrl("sugar-were-going-down.mp3"),
    cover: "/covers/SUGAR, WE'RE GOING DOWN.webp",
  },
  "whats-my-age-again": {
    src: supabaseTrackUrl("whats-my-age-again.mp3"),
    cover: "/covers/WHAT'S MY AGE AGAIN.webp",
  },
  // COLORS OF OUR HOME — variants
  "colors-of-our-home": {
    src: supabaseTrackUrl("COLORS-OF-OUR-HOME.opus"),
    cover: "/covers/COLORS OF OUR HOME.webp",
  },
  "colors-of-our-home-acoustic": {
    src: supabaseTrackUrl("COLORS-OF-OUR-HOME-_ACOUSTIC_.opus"),
    cover: "/covers/COLORS OF OUR HOME (ACOUSTIC).webp",
  },
  "colors-of-our-home-bluma-game-soundtrack": {
    src: supabaseTrackUrl("COLORS-OF-OUR-HOME-_BLUMA-Game-Soundtrack_.opus"),
    cover: "/covers/COLORS OF OUR HOME (BLUMA Game Soundtrack).webp",
  },
};
