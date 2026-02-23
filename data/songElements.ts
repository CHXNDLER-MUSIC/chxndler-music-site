import type { ElementType } from "@/types/song";

// Song to element mapping based on existing planet data
// This maps song slugs to their associated element types for planet system
export const SONG_ELEMENT_MAPPING: Record<string, ElementType> = {
  // Heart songs  
  "baby": "heart",
  "be-my-bee": "heart",
  "collide": "heart",
  "we're-just-friends": "heart",
  "we're-just-friends-dmvrco-remix": "heart",
  "we're-just-friends-mickey-jas-remix": "heart",
  "paris": "heart", // Based on planet-data.ts, PARIS is in DARKNESS but it could be HEART
  
  // Lightning songs
  "brain-freeze": "lightning", 
  "game-boy-heart": "lightning",
  "house-party": "lightning",
  "kid-forever": "lightning",
  "pokemon": "lightning",
  
  // Water songs
  "ocean-girl": "water",
  "ocean-girl-acoustic": "water",
  "ocean-girl-remix": "water",
  
  // Darkness songs
  "mr-brightside": "darkness",
  // "paris": "darkness", // Could be either heart or darkness based on theming
};