// components/DashboardRails.tsx
"use client";
import GlowButton from "./GlowButton";
import { platformActions, socialActions } from "@/config/actions";

export function TopPlatformRail() {
  return (
    <div className="pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-40 flex gap-3">
      {platformActions.map(a => (
        <GlowButton key={a.id} icon={a.icon as any} label={a.label} href={a.href} color={a.color} />
      ))}
    </div>
  );
}

export function RightSocialRail() {
  return (
    <div className="pointer-events-auto fixed right-4 top-24 z-40 flex flex-col gap-3">
      {socialActions.map(a => (
        <GlowButton key={a.id} icon={a.icon as any} label={a.label} href={a.href} color={a.color} />
      ))}
    </div>
  );
}
