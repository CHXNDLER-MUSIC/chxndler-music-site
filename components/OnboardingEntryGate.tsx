"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfile } from "@/contexts/ProfileContext";
import { useUIStore } from "@/store/useUIStore";

export default function OnboardingEntryGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useProfile();
  const openNamePrompt = useUIStore((s) => s.openNamePrompt);

  useEffect(() => {
    const shouldOpen = searchParams.get("profileSetup") === "1";
    if (!shouldOpen) return;
    if (!profile) return;

    const isComplete = !!(profile.profile_complete || (profile.name && profile.element));
    if (!isComplete) {
      try { openNamePrompt(); } catch {}
      // Clean the URL to avoid re-trigger on refresh
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("profileSetup");
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : "/");
      } catch {}
    }
  }, [searchParams, profile, openNamePrompt, router]);

  return null;
}
