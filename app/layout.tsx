import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CHXNDLER • Heartverse",
  description: "A home for Aliens — unapologetic, unfiltered, united through music.",
  metadataBase: new URL("https://chxndler-music.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
