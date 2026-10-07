// config/actions.ts
import { BRAND } from "./ui";
import { CHXNDLER_APPLE_MUSIC_ARTIST_URL, CHXNDLER_SPOTIFY_ARTIST_URL, CHXNDLER_YOUTUBE_CHANNEL_URL } from "@/lib/chxndlerLinks";

export const socialActions = [
  { id: "ig", label: "Instagram", href: "https://www.instagram.com/chxndlerthealien/", icon: "Instagram", color: BRAND.pink },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@chxndler_music", icon: "TikTok", color: BRAND.yellow },
  { id: "yt", label: "YouTube", href: CHXNDLER_YOUTUBE_CHANNEL_URL, icon: "Youtube", color: BRAND.blue },
];

export const platformActions = [
  { id: "spotify", label: "Spotify", href: CHXNDLER_SPOTIFY_ARTIST_URL, icon: "Spotify", color: BRAND.green ?? "#1DB954" },
  { id: "apple", label: "Apple Music", href: CHXNDLER_APPLE_MUSIC_ARTIST_URL, icon: "Apple", color: "#ffffff" },
];
