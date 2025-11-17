"use client";

import { useEffect, useState } from "react";
import HoloJoinButton from "./HoloJoinButton";

// Small auth-aware wrapper that:
// - Shows "Join the Heartverse" when unauthenticated and navigates to /signin
// - Shows "Welcome back, Alien" when authenticated
// - Automatically calls /api/profile on mount when authenticated to ensure the profile exists
export default function AuthJoinCta({
  hubColor = "#FC54AF",
  size = 72,
  onClick,
  isActive = false,
}: {
  hubColor?: string;
  size?: number;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/profile", { method: "GET", cache: "no-store" });
        if (!mounted) return;
        if (res.status === 200) {
          // Profile GET triggers creation via API if missing
          setAuthed(true);
        } else if (res.status === 401) {
          setAuthed(false);
        } else {
          // Treat unexpected errors as unauthenticated for CTA purposes
          setAuthed(false);
        }
      } catch {
        if (mounted) setAuthed(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (authed === null) {
    // Avoid layout shift: render a disabled button placeholder
    return (
      <HoloJoinButton
        onClick={onClick || (() => {})}
        hubColor={hubColor}
        size={size}
        label="Join the Heartverse"
        isActive={isActive}
      />
    );
  }

  if (!authed) {
    return (
      <HoloJoinButton
        onClick={onClick || (() => { try { window.location.assign("/signin"); } catch {} })}
        hubColor={hubColor}
        size={size}
        label="Join the Heartverse"
        isActive={isActive}
      />
    );
  }

  return (
    <HoloJoinButton
      onClick={onClick || (() => { try { window.location.assign("/profile"); } catch {} })}
      hubColor={hubColor}
      size={size}
      label="Welcome back, Alien"
      isActive={isActive}
    />
  );
}

