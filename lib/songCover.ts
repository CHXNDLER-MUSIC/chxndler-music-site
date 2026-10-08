import { getSongBySlug } from "@/lib/songs-consolidated";

// Songs whose art doesn't follow /covers/<TITLE>.webp (same overrides
// DashboardApp's hudSongs uses). The WE'RE JUST FRIENDS titles use a curly
// apostrophe (and lowercase "mickey jas") in the songs table, so the title
// convention misses them on case-sensitive hosts.
const COVER_OVERRIDES: Record<string, string> = {
  "make-believe": "/covers/MAKE BELIEVE.webp",
  "sugar-were-going-down": "/covers/SUGAR, WE'RE GOING DOWN.webp",
  "whats-my-age-again": "/covers/WHAT'S MY AGE AGAIN.webp",
  cheerleader: "/covers/cheerleader.webp",
  "were-just-friends": "/covers/WE'RE JUST FRIENDS.webp",
  "were-just-friends-dmvrco-remix": "/covers/WE'RE JUST FRIENDS (DMVRCO Remix).webp",
  "were-just-friends-mickey-jas-remix": "/covers/WE'RE JUST FRIENDS (Mickey Jas Remix).webp",
};

/** A song's cover art path: overrides, then the static song data, then
 * /covers/<TITLE>.webp with diacritics stripped (POKÉMON -> POKEMON). */
export function songCoverPath(slug: string, title: string): string {
  return (
    COVER_OVERRIDES[slug] ||
    getSongBySlug(slug)?.cover ||
    `/covers/${title.normalize("NFD").replace(/[̀-ͯ]/g, "")}.webp`
  );
}
