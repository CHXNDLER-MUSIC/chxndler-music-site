"use client";
import React from "react";
import { SOCIALS } from "@/config/socials";
import { track } from "@/lib/analytics";

function Emblem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank" rel="noreferrer"
      className="hud-btn cockpit-glow text-center"
      aria-label={label}
      title={label}
      onClick={() => track("social_click", { label })}
    >
      {label}
    </a>
  );
}

/** Left rail: glowing social emblems with click tracking */
export default function SocialDock() {
  return (
    <div className="h-full w-full flex flex-col items-start justify-between py-[0.6vh]">
      <Emblem label="Instagram" href={SOCIALS.instagram} />
      <Emblem label="TikTok"    href={SOCIALS.tiktok} />
      <Emblem label="Facebook"  href={SOCIALS.facebook} />
      <Emblem label="YouTube"   href={SOCIALS.youtube} />
      <Emblem label="Spotify"   href={SOCIALS.spotify} />
      <Emblem label="Apple"     href={SOCIALS.apple} />
    </div>
  );
}
