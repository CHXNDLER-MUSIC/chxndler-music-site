"use client";
import React from "react";

// Minimal placeholder background component with no YouTube fallback.
export default function SpaceBg({ active = true }: { active?: boolean }) {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        opacity: active ? 1 : 0,
        transition: "opacity 300ms ease",
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  );
}
