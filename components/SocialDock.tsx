"use client";

import React from "react";
import GlowButton from "./GlowButton";
// from /components -> /config is one level up
import * as SocialsMod from "../config/socials";

type SocialItem = { id: string; href: string };

export default function SocialDock() {
  // Accept both named and default exports safely
  const SOCIALS = (SocialsMod as any).SOCIALS ?? (SocialsMod as any).default ?? [];

  // Normalize in case someone exported an object
  const items: SocialItem[] = Array.isArray(SOCIALS)
    ? SOCIALS
    : Object.values(SOCIALS || {});

  return (
    <div className="h-full w-full flex flex-col items-start justify-between gap-3 py-2">
      {items.map((s: SocialItem) => (
        <GlowButton key={s.id} label={s.id} href={s.href} className="!px-2 !py-2" />
      ))}
    </div>
  );
}
