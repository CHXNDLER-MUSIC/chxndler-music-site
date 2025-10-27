"use client";
import React from "react";
import LazyVideo from "@/components/LazyVideo";

export default function OceanBg({ active = true }: { active?: boolean }) {
  return (
    <LazyVideo
      className="fixed inset-0 w-screen h-screen object-cover -z-10"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/cover/ocean-girl.png"
      srcMp4="/skies/ocean-girl.mp4"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 300ms ease' }}
    />
  );
}
