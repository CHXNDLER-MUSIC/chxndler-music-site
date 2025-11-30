// Central asset mapping for local static files
// Replaces all ImageKit URLs with local /public paths

import { slugify } from "@/lib/slug";

export interface TrackAsset {
  id: string;
  title: string;
  src: string;        // /tracks/*.opus
  cover: string;      // /covers/*.webp
  element?: string;
}

export interface BadgeAsset {
  id: string;
  name: string;
  src: string;        // /badges/*.webp
}

export interface RelicAsset {
  id: string;
  name: string;
  src: string;        // /relics/*.webp
}

export interface StoreItemAsset {
  id: string;
  name: string;
  image: string;      // /store/*.webp
  price?: number;
}

// Track assets - all audio files as .opus format
export const TRACKS: Record<string, TrackAsset> = {
  baby: {
    id: "baby",
    title: "BABY",
    src: "/tracks/baby.opus",
    cover: "/covers/BABY.webp",
    element: "HEART"
  },
  beMyBee: {
    id: "be_my_bee", 
    title: "BE MY BEE",
    src: "/tracks/be-my-bee.opus",
    cover: "/covers/BE MY BEE.webp",
    element: "EARTH"
  },
  colorsOfOurHome: {
    id: "colors_of_our_home",
    title: "COLORS OF OUR HOME", 
    src: "/tracks/COLORS-OF-OUR-HOME.opus",
    cover: "/covers/COLORS OF OUR HOME.webp",
    element: "HEART"
  },
  colorsOfOurHomeAcoustic: {
    id: "colors_of_our_home_acoustic",
    title: "COLORS OF OUR HOME (ACOUSTIC)",
    src: "/tracks/COLORS-OF-OUR-HOME-_ACOUSTIC_.opus", 
    cover: "/covers/COLORS OF OUR HOME (ACOUSTIC).webp",
    element: "HEART"
  },
  colorsOfOurHomeBluma: {
    id: "colors_of_our_home_bluma",
    title: "COLORS OF OUR HOME (BLUMA Game Soundtrack)",
    src: "/tracks/COLORS-OF-OUR-HOME-_BLUMA-Game-Soundtrack_.opus",
    cover: "/covers/COLORS OF OUR HOME (BLUMA Game Soundtrack).webp", 
    element: "HEART"
  },
  kidForever: {
    id: "kid_forever",
    title: "KID FOREVER (永遠の子供)",
    src: "/tracks/kid-forever.opus",
    cover: "/covers/KID FOREVER.webp",
    element: "LIGHTNING"
  },
  oceanGirl: {
    id: "ocean_girl",
    title: "OCEAN GIRL",
    src: "/tracks/ocean-girl.opus",
    cover: "/covers/OCEAN GIRL.webp",
    element: "WATER"
  },
  oceanGirlAcoustic: {
    id: "ocean_girl_acoustic", 
    title: "OCEAN GIRL (ACOUSTIC)",
    src: "/tracks/ocean-girl-acoustic.opus",
    cover: "/covers/OCEAN GIRL (ACOUSTIC).webp",
    element: "WATER"
  },
  oceanGirlRemix: {
    id: "ocean_girl_remix",
    title: "OCEAN GIRL (REMIX)", 
    src: "/tracks/ocean-girl-remix.opus",
    cover: "/covers/OCEAN GIRL (REMIX).webp",
    element: "WATER"
  },
  pokemon: {
    id: "pokemon",
    title: "POKÉMON",
    src: "/tracks/pokemon.opus", 
    cover: "/covers/POKÉMON.webp",
    element: "LIGHTNING"
  },
  // Additional tracks that may exist with mp3 extension
  gameBoyheart: {
    id: "game_boy_heart",
    title: "GAME BOY HEART (ゲームボーイの心)",
    src: "/tracks/game-boy-heart.mp3", // Still mp3 if not yet converted
    cover: "/covers/GAME BOY HEART.webp",
    element: "LIGHTNING"
  },
  brainFreeze: {
    id: "brain_freeze",
    title: "BRAIN FREEZE", 
    src: "/tracks/brain-freeze.mp3",
    cover: "/covers/BRAIN FREEZE.webp",
    element: "FIRE"
  },
  wereJustFriends: {
    id: "were_just_friends",
    title: "WE'RE JUST FRIENDS",
    src: "/tracks/were-just-friends.mp3",
    cover: "/covers/WE'RE JUST FRIENDS.webp", 
    element: "HEART"
  },
  wereJustFriendsMickeyJasRemix: {
    id: "were_just_friends_mickey_jas_remix",
    title: "WE'RE JUST FRIENDS (mickey jas Remix)",
    src: "/tracks/were-just-friends-mickey-jas-remix.mp3",
    cover: "/covers/WE'RE JUST FRIENDS (MICKEY JAS REMIX).webp",
    element: "HEART"  
  },
  wereJustFriendsDmvrcoRemix: {
    id: "were_just_friends_dmvrco_remix", 
    title: "WE'RE JUST FRIENDS (DMVRCO Remix)",
    src: "/tracks/were-just-friends-dmvrco-remix.mp3",
    cover: "/covers/WE'RE JUST FRIENDS (DMVRCO REMIX).webp",
    element: "HEART"
  },
  paris: {
    id: "paris",
    title: "PARIS", 
    src: "/tracks/paris.mp3",
    cover: "/covers/PARIS.webp",
    element: "FIRE"
  },
  houseParty: {
    id: "house_party",
    title: "ALIEN (House Party)",
    src: "/tracks/house-party.mp3",
    cover: "/covers/HOUSE PARTY.webp",
    element: "LIGHTNING"
  },
  collide: {
    id: "collide",
    title: "COLLIDE",
    src: "/tracks/collide.mp3", 
    cover: "/covers/COLLIDE.webp",
    element: "FIRE"
  }
};

// Badge icon assets - category-based organization
export const BADGE_ICONS: Record<string, BadgeAsset> = {
  // Soul/Achievement badges
  soul: {
    id: "soul",
    name: "Soul",
    src: "/badges/soul.webp"
  },
  soulStar: {
    id: "soul_star", 
    name: "Soul Star",
    src: "/badges/soul.webp" // Using same soul icon for soul-star category
  },
  collector: {
    id: "collector",
    name: "Collector",
    src: "/badges/collector.webp"
  },
  
  // Elemental streak badges
  elementalStreak: {
    id: "elemental_streak",
    name: "Elemental Streak", 
    src: "/badges/elemental streak.webp"
  },
  
  // Listening badges
  listening: {
    id: "listening",
    name: "Listening",
    src: "/badges/listening.webp"
  },
  firstListen: {
    id: "first_listen",
    name: "First Listen", 
    src: "/badges/listening.webp"
  },
  deepListener: {
    id: "deep_listener",
    name: "Deep Listener",
    src: "/badges/listening.webp"
  },
  
  // HeartCoin/Currency badges
  heartcoin: {
    id: "heartcoin",
    name: "HeartCoin",
    src: "/badges/currency.webp"
  },
  firstHeartcoin: {
    id: "first_heartcoin",
    name: "First HeartCoin",
    src: "/badges/currency.webp"
  },
  
  // Community badges
  community: {
    id: "community", 
    name: "Community",
    src: "/badges/community.webp"
  },
  
  // Achievement badges
  digitalCollector: {
    id: "digital_collector",
    name: "Digital Collector", 
    src: "/badges/collector.webp"
  },
  
  // Special achievement badges
  cosmicArchivist: {
    id: "cosmic_archivist",
    name: "Cosmic Archivist",
    src: "/badges/cosmic archivist.webp"
  },
  cosmicBroadcaster: {
    id: "cosmic_broadcaster", 
    name: "Cosmic Broadcaster",
    src: "/badges/cosmic broadcaster.webp"
  },
  cosmicDonor: {
    id: "cosmic_donor",
    name: "Cosmic Donor",
    src: "/badges/cosmic donor.webp"
  },
  cosmicEarner: {
    id: "cosmic_earner",
    name: "Cosmic Earner", 
    src: "/badges/cosmic earner.webp"
  },
  
  // Discography badges  
  completeDiscography: {
    id: "complete_discography",
    name: "Complete Discography",
    src: "/badges/complete discography.webp"
  }
};

// Relic assets - mystical collectible items
export const RELIC_ICONS: Record<string, RelicAsset> = {
  // Pattern relics
  chxndlerPattern2: {
    id: "chxndler_pattern_2",
    name: "CHXNDLER Pattern 2",
    src: "/relics/2_CHXNDLER-Pattern.webp"
  },
  chxndlerPattern4: {
    id: "chxndler_pattern_4", 
    name: "CHXNDLER Pattern 4",
    src: "/relics/4_CHXNDLER-Pattern.webp"
  },
  chxndlerPattern6: {
    id: "chxndler_pattern_6",
    name: "CHXNDLER Pattern 6", 
    src: "/relics/6_CHXNDLER-Pattern.webp"
  },
  chxndlerPattern8: {
    id: "chxndler_pattern_8",
    name: "CHXNDLER Pattern 8",
    src: "/relics/8_CHXNDLER-Pattern.webp"
  },
  
  // Alien relics
  alienBlue: {
    id: "alien_blue",
    name: "Alien - Blue",
    src: "/relics/Alien - Blue (Transparent).webp"
  },
  alienPink: {
    id: "alien_pink", 
    name: "Alien - Pink",
    src: "/relics/Alien - Pink (Transparent).webp"
  },
  
  // Numbered relics
  relic1: {
    id: "relic_1",
    name: "Relic 1",
    src: "/relics/1.webp"
  },
  relic2: {
    id: "relic_2", 
    name: "Relic 2", 
    src: "/relics/2.webp"
  },
  relic3: {
    id: "relic_3",
    name: "Relic 3",
    src: "/relics/3.webp"
  }
};

// Store merchandise assets
export const STORE_ITEMS: Record<string, StoreItemAsset> = {
  beanie: {
    id: "beanie",
    name: "CHXNDLER Beanie",
    image: "/store/beanie-front.webp", // Could also use beanie-back.webp for back view
    price: 25
  },
  bracelet: {
    id: "bracelet",
    name: "CHXNDLER Bracelet", 
    image: "/store/bracelet.webp",
    price: 15
  },
  button: {
    id: "button", 
    name: "CHXNDLER Button",
    image: "/store/button.webp",
    price: 5
  },
  hat: {
    id: "hat",
    name: "CHXNDLER Hat",
    image: "/store/hat.webp",
    price: 30
  },
  housePartyPoster: {
    id: "house_party_poster",
    name: "House Party Poster",
    image: "/store/house-party-poster.webp", 
    price: 20
  },
  keychain: {
    id: "keychain",
    name: "CHXNDLER Keychain",
    image: "/store/keychain.webp",
    price: 10
  },
  necklace: {
    id: "necklace", 
    name: "CHXNDLER Necklace",
    image: "/store/necklace.webp",
    price: 35
  },
  patch: {
    id: "patch",
    name: "CHXNDLER Patch",
    image: "/store/patch.webp", // Could also use patch-inverse.webp 
    price: 8
  },
  patchInverse: {
    id: "patch_inverse",
    name: "CHXNDLER Patch (Inverse)",
    image: "/store/patch-inverse.webp",
    price: 8
  }
};

// Utility function to get track by ID
export const getTrackById = (id: string): TrackAsset | undefined => {
  return Object.values(TRACKS).find(track => track.id === id);
};

// Utility function to get track by slug
export const getTrackBySlug = (slug: string): TrackAsset | undefined => {
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return Object.values(TRACKS).find(track => 
    track.id === normalizedSlug || 
    slugify(track.title) === slug
  );
};

// Utility function to get badge by category ID
export const getBadgeIcon = (categoryId: string): string => {
  const badgeMap: Record<string, string> = {
    'soul-star': BADGE_ICONS.soul.src,
    'achievements': BADGE_ICONS.collector.src,
    'elemental-streak': BADGE_ICONS.elementalStreak.src,
    'listening': BADGE_ICONS.listening.src,
    'heartcoin': BADGE_ICONS.heartcoin.src,
    'community': BADGE_ICONS.community.src
  };
  
  return badgeMap[categoryId] || BADGE_ICONS.soul.src;
};

// Utility function to get all tracks as array
export const getAllTracks = (): TrackAsset[] => {
  return Object.values(TRACKS);
};

// Utility function to get all badges as array  
export const getAllBadges = (): BadgeAsset[] => {
  return Object.values(BADGE_ICONS);
};

// Utility function to get all relics as array
export const getAllRelics = (): RelicAsset[] => {
  return Object.values(RELIC_ICONS);
};

// Utility function to get all store items as array
export const getAllStoreItems = (): StoreItemAsset[] => {
  return Object.values(STORE_ITEMS);
};