import "./globals.css";
import "../styles/glow.css";
import type { Metadata, Viewport } from "next";
import React from "react";
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
import { TourProvider } from "@/contexts/TourContext";
import { MenuStateProvider } from "@/contexts/MenuStateContext";
import { HeartcoinBalanceProvider } from "@/providers/HeartcoinBalanceProvider";
import GlobalKeyboardHandler from "@/components/GlobalKeyboardHandler";
// Defer heavy, non-critical UI to improve LCP/INP
import DeferredAppChrome from "@/components/DeferredAppChrome";
import { PlanetRewardsProvider } from "@/components/PlanetRewardsProvider";

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

        {/* YouTube preconnect removed — iframe now deferred until user clicks Enter.
            Connections happen naturally when the iframe mounts post-gesture. */}

        <link rel="preload" as="image" href="/elements/instagram.webp" />
        <link rel="preload" as="image" href="/elements/tiktok.webp" />
        <link rel="preload" as="image" href="/elements/youtube.webp" />
        <link rel="preload" as="image" href="/elements/spotify.webp" />
        {/* Preload cockpit frame and light beam base so they render instantly */}
        {/**
         * Avoid preloading decorative cockpit images to keep bandwidth for critical content.
         * These are injected after first paint via DeferredAppChrome.
         */}
        {/* Wheel video preload removed - video files may not exist; SteeringWheelOverlay handles graceful fallback */}
      </head>
      <body className="font-sans bg-[#020016]">
        <AuthProvider>
          <ProfileProvider>
            <HeartcoinBalanceProvider>
            <AudioProvider>
              <GlobalKeyboardHandler />
              <MenuStateProvider>
                <TourProvider>
                  <PlanetRewardsProvider>
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
            {/**
             * Mount non-critical modals/celebrations and geolocation lazily after first paint.
             * This reduces main-thread work before the first input.
             */}
            <DeferredAppChrome />
                  </PlanetRewardsProvider>
                </TourProvider>
              </MenuStateProvider>
            </AudioProvider>
            </HeartcoinBalanceProvider>
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
