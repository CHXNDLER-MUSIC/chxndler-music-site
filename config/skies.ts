// Map each song/scene to a skybox video & poster
export type Sky = {
  slug: string;            // link to track slug for convenience
  video: string;           // "/skies/ocean-girl.webm"
  poster?: string;         // "/skies/ocean-girl-poster.webp"
  brightness?: number;     // 0.0–1.0 tweak for HUD blending
};

export const SKIES: Record<string, Sky> = {
  "ocean-girl": {
    slug: "ocean-girl",
    video: "/skies/ocean-girl.mp4",
    poster: "/skies/ocean-girl-poster.webp",
    brightness: 0.9,
  },
  "ocean-girl-acoustic": {
    slug: "ocean-girl-acoustic",
    video: "/skies/ocean-girl-acoustic.mp4",
    poster: "/skies/ocean-girl-acoustic-poster.webp",
    brightness: 0.95,
  },
  "ocean-girl-remix": {
    slug: "ocean-girl-remix",
    video: "/skies/ocean-girl-remix.mp4",
    poster: "/skies/ocean-girl-remix-poster.webp",
    brightness: 0.85,
  },
  "be-my-bee": {
    slug: "be-my-bee",
    video: "/skies/be-my-bee.mp4",
    brightness: 0.9,
  },
  "game-boy-heart": {
    slug: "game-boy-heart",
    video: "/skies/game-boy-heart.mp4",
    brightness: 0.9,
  },
};

export const getSkyForSlug = (slug: string) => SKIES[slug] ?? SKIES["ocean-girl"];
