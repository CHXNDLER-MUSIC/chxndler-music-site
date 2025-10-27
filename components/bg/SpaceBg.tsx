"use client";
import React from "react";
import LazyVideo from "@/components/LazyVideo";

export default function SpaceBg({ active = true }: { active?: boolean }) {
  return (
    <LazyVideo
      className="fixed inset-0 w-screen h-screen object-cover -z-10"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/logo/CHXNDLER_Logo.png"
      srcMp4="/skies/space.mp4"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 300ms ease' }}
    />
  );
}
