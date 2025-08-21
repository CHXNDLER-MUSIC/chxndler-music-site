// app/layout.jsx
import "./globals.css";

export const metadata = {
  // IMPORTANT: this should be your live domain
  metadataBase: new URL("https://chxndler-music.com"),
  title: {
    default: "CHXNDLER • Heartverse",
    template: "%s | CHXNDLER • Heartverse",
  },
  description:
    "The Heartverse — CHXNDLER’s music hub. Stream tracks, follow on socials, and plug into the world we’re building.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://chxndler-music.com/",
    siteName: "CHXNDLER • Heartverse",
    title: "CHXNDLER • Heartverse",
    description:
      "Explore the Heartverse. Listen on Spotify, follow along, and stay in the loop.",
    images: [
      {
        url: "/og.jpg", // place this file in /public/og.jpg (1200x630)
        width: 1200,
        height: 630,
        alt: "CHXNDLER — Heartverse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHXNDLER • Heartverse",
    description:
      "Explore the Heartverse. Listen on Spotify, follow along, and stay in the loop.",
    images: ["/og.jpg"],
    creator: "@YOUR_TWITTER_HANDLE", // optional
  },
  icons: {
    icon: "/favicon.ico", // optional: /public/favicon.ico
    apple: "/apple-touch-icon.png", // optional: 180x180
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
