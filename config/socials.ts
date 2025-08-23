export type SocialLink = {
  id: "instagram" | "tiktok" | "youtube" | "spotify" | "apple";
  label: string;
  href: string;
};

export const SOCIALS: SocialLink[] = [
  { id: "instagram", label: "Instagram", href: "https://instagram.com/yourhandle" },
  { id: "tiktok",    label: "TikTok",    href: "https://tiktok.com/@yourhandle" },
  { id: "youtube",   label: "YouTube",   href: "https://youtube.com/@yourhandle" },
  { id: "spotify",   label: "Spotify",   href: "https://open.spotify.com/artist/yourid" },
  { id: "apple",     label: "Apple",     href: "https://music.apple.com/artist/yourid" },
];
