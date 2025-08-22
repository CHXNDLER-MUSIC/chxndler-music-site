// app/layout.jsx
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://chxndler-music.com"),
  title: {
    default: "CHXNDLER",
    template: "%s | CHXNDLER",
  },
  description:
    "Official site of CHXNDLER. Listen on Spotify & Apple Music and follow on Instagram, TikTok, and YouTube.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://chxndler-music.com/",
    siteName: "CHXNDLER",
    title: "CHXNDLER",
    description:
      "Listen on Spotify & Apple Music and follow on Instagram, TikTok, and YouTube.",
    // No static images needed — /opengraph-image is used automatically
  },
  // No twitter section at all
  icons: {
    icon: "/favicon.ico",            // optional: /public/favicon.ico
    apple: "/apple-touch-icon.png",  // optional: 180x180
  },
  robots: { index: true, follow: true },
  themeColor: "#0b0719",
  authors: [{ name: "CHXNDLER" }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-[#0b0719] via-[#2b0f3a] to-[#120a1f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
