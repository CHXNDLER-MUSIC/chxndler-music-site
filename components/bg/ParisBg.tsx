"use client";
import React from "react";

export default function ParisBg({ active = true }: { active?: boolean }) {
  return (
    <video
      className="fixed inset-0 w-screen h-screen object-cover -z-10"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 300ms ease' }}
    >
      <source src="/skies/paris.mp4" type="video/mp4" />
    </video>
  );
}

