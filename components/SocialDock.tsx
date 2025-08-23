"use client";
import React from "react";
import { SOCIALS } from "@/config/socials";

export default function SocialDock() {
  return (
    <div className="h-full w-full flex items-center justify-end gap-8 pr-[1vw]">
      {SOCIALS.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={s.label}
          title={s.label}
          className="rounded-xl px-3 py-2 bg-black/35 backdrop-blur-md hover:scale-[1.04] transition glow cockpit-glow pulse-soft uppercase tracking-wide text-xs md:text-sm"
        >
          {s.id}
        </a>
      ))}
    </div>
  );
}
