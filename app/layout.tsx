import "./globals.css";
import "../styles/glow.css";
import type { Metadata } from "next";
import React from "react";
import ClickTracker from "@/components/ClickTracker";
import AnalyticsWidget from "@/components/AnalyticsWidget";
import PageViewTracker from "@/components/PageViewTracker";
import { isAnalyticsDisabled } from "@/lib/analytics";
import { Suspense } from "react";
import { AudioProvider } from "@/app/providers/AudioProvider";
import LazyLoadEnhancer from "@/components/LazyLoadEnhancer";

export const metadata: Metadata = {
  metadataBase: new URL("https://chxndler-music.com"),
  title: "CHXNDLER — SPACESHIP",
  description: "Pilot the cockpit, switch channels, and drift through space.",
  openGraph: {
    title: "CHXNDLER — SPACESHIP",
    description: "Pilot the cockpit, switch channels, and drift through space.",
    url: "https://chxndler-music.com",
    siteName: "CHXNDLER",
    type: "website",
    images: [
      {
        url: "/logo/CHXNDLER_Logo.png",
        width: 458,
        height: 596,
        alt: "CHXNDLER Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CHXNDLER — SPACESHIP",
    description: "Pilot the cockpit, switch channels, and drift through space.",
    images: ["/logo/CHXNDLER_Logo.png"],
    creator: "@chxndler",
  },
  icons: {
    icon: "/logo/CHXNDLER_Logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const mpId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const analyticsOff = (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS || '').toLowerCase() === '1' || (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS || '').toLowerCase() === 'true';

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/logo/CHXNDLER_Logo.png" sizes="any" />
        <link rel="icon" href="/logo/CHXNDLER_Logo.png" type="image/png" />
        {/* Fonts: Orbitron (lyrics page) and Exo 2 (lyrics popover) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700&display=swap" rel="stylesheet" />

        {/* Preconnect to YouTube domains for faster homepage background video */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.google.com" />

        <link rel="preload" as="image" href="/elements/instagram.png" />
        <link rel="preload" as="image" href="/elements/tiktok.png" />
        <link rel="preload" as="image" href="/elements/youtube.png" />
        <link rel="preload" as="image" href="/elements/spotify.png" />
        <link rel="preload" as="image" href="/elements/apple.png" />
        {/* Preload cockpit frame and light beam base so they render instantly */}
        <link rel="preload" as="image" href="/cockpit/cockpit.png?v=2" />
        <link rel="preload" as="image" href="/cockpit/lightbeam-base.png?v=2" />
        {/* Preload the steering wheel video; use as=fetch for broad browser support */}
        <link rel="preload" as="fetch" href="/cockpit/wheel_less_transparent.webm" type="video/webm" />
        {/* Remove sky video preloads (assets may not exist; dynamic sky handles loading) */}
        {gaId && !analyticsOff ? (
          <>
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');
            ` }} />
          </>
        ) : null}
        {mpId && !analyticsOff ? (
          <script dangerouslySetInnerHTML={{ __html: `
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${mpId}');
          ` }} />
        ) : null}
      </head>
      <body className="font-sans">
        <AudioProvider>
          {!analyticsOff && (
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
          )}
          {!analyticsOff && <ClickTracker />}
          {!analyticsOff && <AnalyticsWidget />}
          <LazyLoadEnhancer />
          {children}
        </AudioProvider>
        {mpId && !analyticsOff ? (
          <noscript>
            <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${mpId}&noscript=1`} alt="" />
          </noscript>
        ) : null}
      </body>
    </html>
  );
}
