"use client";
import React from "react";
import GlowButton from "@/components/GlowButton";
import { SOCIALS } from "@/config/socials";

export default function SocialDock() {
  return (
    <div className="h-full w-full flex flex-col items-start justify-between py-2">
      {SOCIALS.map((s) => (
        <GlowButton key={s.id} label={s.id} href={s.href} className="!px-2 !py-2" />
      ))}
    </div>
  );
}
