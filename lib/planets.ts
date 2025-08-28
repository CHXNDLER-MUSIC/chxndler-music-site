import { tracks } from "@/config/tracks";
import { slugify } from "@/lib/slug";

export type Element = "water" | "fire" | "earth" | "air" | "heart" | "lightning" | "darkness";

export const ELEMENT_COLORS: Record<Element, string> = {
  water: "#38B6FF", // cyan/blue
  fire: "#FC54AF",  // neon magenta (brand-leaning fire)
  earth: "#F2EF1D", // neon yellow
  air: "#8BF9FF",   // light cyan
  heart: "#FC54AF", // pink/magenta
  lightning: "#F2EF1D", // bright bolt yellow
  darkness: "#000000", // deep black
};

function pickElement(slug: string, index: number): Element {
  const s = slug.toLowerCase();
  // Specific themes first
  if (s.includes("ocean") || s.includes("tide") || s.includes("wave") || s.includes("sea")) return "water";
  if (s.includes("heart") || s.includes("love") || s.includes("friends") || s.includes("somebody-to-love")) return "heart";
  if (s.includes("lightning") || s.includes("lighting") || s.includes("electric") || s.includes("neon") || s.includes("collide") || s.includes("brain") || s.includes("kid") || s.includes("game")) return "lightning";
  if (s.includes("dark") || s.includes("black") || s.includes("alone") || s.includes("midnight")) return "darkness";
  // Legacy element mapping
  if (s.includes("fire") || s.includes("burn")) return "fire";
  if (s.includes("home") || s.includes("earth") || s.includes("paris") || s.includes("bee")) return "earth";
  if (s.includes("air") || s.includes("sky")) return "air";
  // fallback: cycle for variety
  const cycle: Element[] = ["water", "heart", "lightning", "darkness", "fire", "earth", "air"];
  return cycle[index % cycle.length];
}

// Data shape for HUD list component
export type HudSong = { id: string; title: string; icon: Element; color: string };

// Data shape for hologram 3D system (store/usePlayerStore)
export type HoloSong = {
  id: string;
  title: string;
  oneLiner: string;
  planet: { radius: number; color: string; orbitRadius: number; orbitSpeed: number; tilt: number; textureUrl?: string; element?: Element };
};

export function buildPlanetSongs(): { hudSongs: HudSong[]; holoSongs: HoloSong[] } {
  // Explicit song→element mapping (by title); favors precise control over heuristics
  const PAIRS: Array<[string, Element]> = [
    ["ALONE", "darkness"],
    ["MR. BRIGHTSIDE", "darkness"],
    ["ALWAYS ON MY MIND", "heart"],
    ["BABY", "heart"],
    ["BE MY BEE", "heart"],
    ["BE MY BEE (ACOUSTIC)", "heart"],
    ["BRAIN FREEZE", "lightning"],
    ["HOME", "lightning"],
    ["LETTING GO", "water"],
    ["OCEAN GIRL", "water"],
    ["OCEAN GIRL (ACOUSTIC)", "water"],
    ["OCEAN GIRL (REMIX)", "water"],
    ["LITTLE BLACK HEART", "darkness"],
    ["COLORS OF OUR HOME", "heart"],
    ["WE'RE JUST FRIENDS", "heart"],
    ["WE'RE JUST FRIENDS (DMVRCO REMIX)", "heart"],
    ["GAME BOY HEART", "lightning"],
    ["KID FOREVER", "lightning"],
    ["COLLIDE", "heart"],
    ["I MIGHT FALL IN LOVE WITH YOU", "heart"],
    ["SOMEBODY TO LOVE", "heart"],
    ["TIENES UN AMIGO", "heart"],
    ["WE'RE JUST FRIENDS (mickey jas REMIX)", "heart"],
    ["PARIS", "darkness"],
    ["BELIEVE IN ME", "heart"],
    ["LOVE", "heart"],
    ["WE'RE JUST FRIENDS (ACOUSTIC)", "heart"],
    ["FEELING THIS", "lightning"],
    ["HOME (ACOUSTIC)", "lightning"],
    ["HOUSE PARTY", "lightning"],
    ["HOUSE PARTY (ACOUSTIC)", "lightning"],
    ["POKÉMON", "lightning"],
  ];
  // Build a map by slug; include some alternates for common cover variants
  const TITLE_ELEMENT_MAP: Record<string, Element> = {};
  for (const [title, el] of PAIRS) {
    const s = slugify(title);
    TITLE_ELEMENT_MAP[s] = el;
    // Add common alternates
    if (s === "mr-brightside") TITLE_ELEMENT_MAP["mr-brightside-killers-cover"] = el;
    if (s === "feeling-this") TITLE_ELEMENT_MAP["feeling-this-blink-182-cover"] = el;
    if (s === "house-party") TITLE_ELEMENT_MAP["alien-house-party"] = el; // alias used in some assets
  }
  const hudSongs: HudSong[] = [];
  const holoSongs: HoloSong[] = [];

  const baseRadius = 0.8; // base planet radius
  const radiusJitter = 0.35; // add variety

  // Order tracks alphabetically by title for UI friendliness
  const ordered = [...tracks].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }));
  ordered.forEach((t, i) => {
    const id = (t.slug || `track-${i + 1}`);
    const element = TITLE_ELEMENT_MAP[id] ?? pickElement(id, i);
    const color = ELEMENT_COLORS[element];

    hudSongs.push({ id, title: t.title, icon: element, color });

    // orbit spacing and speed with variety
    const orbitRadius = 1.6 + (i % 8) * 0.5 + (i % 3) * 0.15;
    const orbitSpeed = 0.28 + ((i % 7) * 0.03);
    const tilt = 0.12 + ((i % 5) * 0.03);
    const radius = baseRadius + ((i % 5) * (radiusJitter / 5));

    holoSongs.push({
      id,
      title: t.title,
      oneLiner: t.subtitle || "",
      // Planets should look like realistic worlds with element colors — no cover textures
      planet: { radius, color, orbitRadius, orbitSpeed, tilt, element },
    });
  });

  return { hudSongs, holoSongs };
}
