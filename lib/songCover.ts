import { getSongBySlug } from "@/lib/songs-consolidated";

// Songs whose art doesn't follow /covers/<TITLE>.webp (same overrides
// DashboardApp's hudSongs uses). The WE'RE JUST FRIENDS titles use a curly
// apostrophe (and lowercase "mickey jas") in the songs table, so the title
// convention misses them on case-sensitive hosts.
const COVER_OVERRIDES: Record<string, string> = {
  "am-i-pretty-when-i-cry": "/covers/AM I PRETTY WHEN I CRY.webp",
  "am-i-pretty-when-i-cry-acoustic": "/covers/AM I PRETTY WHEN I CRY_ (ACOUSTIC).webp",
  "were-just-friends-acoustic": "/covers/WE'RE JUST FRIENDS (Acoustic).webp",
  "make-believe": "/covers/MAKE BELIEVE.webp",
  "play-house": "/covers/PLAY HOUSE.png",
  "sugar-were-going-down": "/covers/SUGAR, WE'RE GOING DOWN.webp",
  "whats-my-age-again": "/covers/WHAT'S MY AGE AGAIN.webp",
  cheerleader: "/covers/cheerleader.webp",
  "were-just-friends": "/covers/WE'RE JUST FRIENDS.webp",
  "were-just-friends-dmvrco-remix": "/covers/WE'RE JUST FRIENDS (DMVRCO Remix).webp",
  "were-just-friends-mickey-jas-remix": "/covers/WE'RE JUST FRIENDS (Mickey Jas Remix).webp",
  // These cover files are PNGs rather than the default WEBP extension.
  "bad-idea": "/covers/BAD IDEA.png",
  "like-this": "/covers/LIKE THIS.png",
  "my-mom-thinks-im-famous": "/covers/MY MOM THINKS I'M FAMOUS.png",
  // Artwork for these tracks has not been uploaded yet. Keep a valid CHXNDLER
  // card visible until their individual covers are added.
  // Bump the URL so browsers that cached the earlier COPYCAT artwork reload it.
  copycat: "/covers/COPYCAT.png?v=2",
  "three-cheers-for-five-years": "/covers/CHXNDLER.webp",
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
