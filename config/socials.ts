// export const SOCIALS = {
//   instagram: "https://www.instagram.com/chxndler_music/",
//   tiktok:    "https://www.tiktok.com/@chxndler_music",
//   facebook:  "https://www.facebook.com/CHXNDLEROfficial",
//   youtube:   "https://www.youtube.com/@chxndler_music",
//   spotify:   "https://open.spotify.com/artist/6O2eoUA8ZWY0lwjsa3E3Yo?si=FbSaqIoRR8i0jAck1J0dmQ",
//   apple:     "https://music.apple.com/us/artist/chxndler/1660901437",
// };

// /config/socials.ts
// Social links used by the left rail. Must be an ARRAY.

export type SocialItem = {
  id: string;          // short label shown on the button
  href: string;        // destination url
  // icon?: React.ReactNode; // (optional) future icon slot
};

export const SOCIALS: SocialItem[] = [
  { id: "Instagram", href: "https://instagram.com/your-handle" },
  { id: "TikTok",    href: "https://tiktok.com/@your-handle" },
  { id: "YouTube",   href: "https://youtube.com/@your-handle" },
];

// keep a default export too, so either import style works
export default SOCIALS;
