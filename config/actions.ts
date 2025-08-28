// config/actions.ts
import { BRAND } from "./ui";

export const socialActions = [
  { id: "ig", label: "Instagram", href: "https://www.instagram.com/chxndler_music/", icon: "Instagram", color: BRAND.pink },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@chxndler_music", icon: "TikTok", color: BRAND.yellow },
  { id: "yt", label: "YouTube", href: "https://www.youtube.com/@chxndler_music", icon: "Youtube", color: BRAND.blue },
];

export const platformActions = [
  { id: "spotify", label: "Spotify", href: "https://open.spotify.com/artist/...", icon: "Spotify", color: BRAND.green ?? "#1DB954" },
  { id: "apple", label: "Apple Music", href: "https://music.apple.com/artist/...", icon: "Apple", color: "#ffffff" },
];
