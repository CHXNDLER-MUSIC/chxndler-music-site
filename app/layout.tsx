import "./globals.css";
import "../styles/glow.css";
import type { Metadata, Viewport } from "next";
import React from "react";
import ClickTracker from "@/components/ClickTracker";
import AnalyticsWidget from "@/components/AnalyticsWidget";
import PageViewTracker from "@/components/PageViewTracker";
import { isAnalyticsDisabled } from "@/lib/analytics";
import { Suspense } from "react";
import { AudioProvider } from "@/app/providers/AudioProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import LazyLoadEnhancer from "@/components/LazyLoadEnhancer";
import OnboardingEntryGate from "@/components/OnboardingEntryGate";
import WhatShouldWeCallYouModal from "@/components/WhatShouldWeCallYouModal";
import WhatElementAreYouModal from "@/components/WhatElementAreYouModal";
import NamePromptOnLogin from "@/components/NamePromptOnLogin";
import StoreProvider from "@/components/StoreProvider";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AudioManagerProvider } from "@/contexts/AudioManagerContext";
import { TourProvider } from "@/contexts/TourContext";
import { MenuStateProvider } from "@/contexts/MenuStateContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://chxndler.world"),
  title: "CHXNDLER | The Heartverse",
  description: "Explore the immersive world of CHXNDLER, an electronic music artist creating otherworldly experiences through sound and visuals.",
  openGraph: {
    title: "CHXNDLER | The Heartverse",
    description: "Explore the immersive world of CHXNDLER, an electronic music artist creating otherworldly experiences through sound and visuals.",
    url: "https://chxndler.world",
    siteName: "CHXNDLER",
    type: "website",
    images: [
      {
        url: "/icons/chxndler-og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "CHXNDLER - Electronic music artist from The Heartverse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHXNDLER | The Heartverse",
    description: "Explore the immersive world of CHXNDLER, an electronic music artist creating otherworldly experiences through sound and visuals.",
    images: ["/icons/chxndler-og-1200x630.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/chxndler-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/chxndler-256.webp", sizes: "256x256", type: "image/webp" },
      { url: "/icons/chxndler-384.webp", sizes: "384x384", type: "image/webp" },
      { url: "/icons/chxndler-512.webp", sizes: "512x512", type: "image/webp" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.webp", sizes: "180x180", type: "image/webp" }
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#FC54AF" }
    ]
  },
};

export const viewport: Viewport = {
  themeColor: "#FC54AF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const mpId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const analyticsOff = (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS || '').toLowerCase() === '1' || (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS || '').toLowerCase() === 'true';

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.webp" />
        <link rel="icon" href="/icons/chxndler-192.webp" sizes="192x192" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#FC54AF" />
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

        <link rel="preload" as="image" href="/elements/instagram.webp" />
        <link rel="preload" as="image" href="/elements/tiktok.webp" />
        <link rel="preload" as="image" href="/elements/youtube.webp" />
        <link rel="preload" as="image" href="/elements/spotify.webp" />
        <link rel="preload" as="image" href="/elements/apple.webp" />
        {/* Preload cockpit frame and light beam base so they render instantly */}
        <link rel="preload" as="image" href="/cockpit/cockpit.webp?v=2" />
        <link rel="preload" as="image" href="/cockpit/lightbeam-base.webp?v=2" />
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
      <body className="font-sans bg-[#020016]">
        <AuthProvider>
          <ProfileProvider>
            <AudioManagerProvider>
            <AudioProvider>
              <MenuStateProvider>
                <TourProvider>
            {!analyticsOff && (
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
            )}
            {!analyticsOff && <ClickTracker />}
            {!analyticsOff && <AnalyticsWidget />}
            <LazyLoadEnhancer />
            <OnboardingEntryGate />
            <StoreProvider />
            {/* Opens the name prompt when returning from auth with completeProfile=1 */}
            <Suspense fallback={null}>
              <NamePromptOnLogin />
            </Suspense>
            <WhatShouldWeCallYouModal />
            <WhatElementAreYouModal />
            {children}
                </TourProvider>
              </MenuStateProvider>
            </AudioProvider>
            </AudioManagerProvider>
          </ProfileProvider>
        </AuthProvider>
        {mpId && !analyticsOff ? (
          <noscript>
            <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${mpId}&noscript=1`} alt="" />
          </noscript>
        ) : null}
      </body>
    </html>
  );
}
