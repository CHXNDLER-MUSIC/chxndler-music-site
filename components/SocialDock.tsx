"use client";

import React from "react";
import * as SocialsMod from "../config/socials";

type SocialItem = { id: string; href: string };

// Minimal inline icons (stroke/fill uses currentColor)
const IG = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
  </svg>
);
const TT = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M21 8.5c-2 0-4-1-5.3-2.7V17a5 5 0 11-3-4.6V5h3a6.7 6.7 0 005.3 2.5V8.5z" />
  </svg>
);
const YT = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M23 12s0-3.2-.4-4.7a3.1 3.1 0 00-2.2-2.2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.4.6A3.1 3.1 0 001.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a3.1 3.1 0 002.2 2.2c1.5.6 8.4.6 8.4.6s6.9 0 8.4-.6a3.1 3.1 0 002.2-2.2c.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
  </svg>
);

const colorFor = (id: string) => {
  const key = id.toLowerCase();
  if (key.includes("insta")) return "#FC54AF"; // pink
  if (key.includes("tiktok")) return "#38B6FF"; // cyan/blue
  if (key.includes("tube")) return "#FF0000"; // red
  return "#ffffff";
};

const IconFor = ({ id }: { id: string }) => {
  const key = id.toLowerCase();
  if (key.includes("insta")) return <IG />;
  if (key.includes("tiktok")) return <TT />;
  if (key.includes("tube")) return <YT />;
  return <IG />;
};

export default function SocialDock() {
  const SOCIALS = (SocialsMod as any).SOCIALS ?? (SocialsMod as any).default ?? [];
  const items: SocialItem[] = Array.isArray(SOCIALS) ? SOCIALS : Object.values(SOCIALS || {});

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* Right-aligned vertical stack inside the console */}
      <div
        className="absolute right-2 bottom-2 flex flex-col gap-2 pointer-events-auto"
        style={{ transform: "perspective(800px) rotateX(8deg) translateZ(0)" }}
      >
      {items.map((s) => {
        const color = colorFor(s.id);
        const baseShadow = `0 0 18px ${color}88, inset 0 0 12px ${color}44, 0 12px 24px rgba(0,0,0,.35)`;
        const hoverShadow = `0 0 26px ${color}cc, inset 0 0 16px ${color}66, 0 16px 34px rgba(0,0,0,.45)`;
        return (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.id}
            title={s.id}
            className="grid place-items-center h-14 w-14 rounded-2xl select-none"
            style={{
              color,
              background: "rgba(0,0,0,.35)",
              border: "1px solid rgba(255,255,255,.16)",
              boxShadow: baseShadow,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              transition: "transform .12s ease, box-shadow .18s ease, background .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = hoverShadow;
              e.currentTarget.style.background = "rgba(255,255,255,.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = baseShadow;
              e.currentTarget.style.background = "rgba(0,0,0,.35)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.boxShadow = hoverShadow;
              e.currentTarget.style.background = "rgba(255,255,255,.14)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = baseShadow;
              e.currentTarget.style.background = "rgba(0,0,0,.35)";
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
          >
            <IconFor id={s.id} />
          </a>
        );
      })}
      </div>
    </div>
  );
}
