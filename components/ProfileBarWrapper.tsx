"use client";

import React from "react";
import ProfileBar from "@/components/ProfileBar";
import { useUIState } from "@/lib/use-ui-state";

type Props = React.ComponentProps<typeof ProfileBar> & {
  todaysPrompt?: any;
  onOpenHeartCoin?: () => void;
};

// Simplified wrapper that only depends on hasEnteredHeartverse
export default function ProfileBarWrapper(props: Props) {
  // All hooks must be called before any early returns
  const hasEnteredHeartverse = useUIState((s) => s.hasEnteredHeartverse);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Wait until client mount to avoid SSR/CSR mismatch and flashes
    setHydrated(true);
  }, []);

  // Debug logging
  React.useEffect(() => {
    console.log("🔧 ProfileBarWrapper state:", {
      hydrated,
      hasEnteredHeartverse,
      willRender: hydrated && hasEnteredHeartverse
    });
  }, [hydrated, hasEnteredHeartverse]);

  // Early returns only after all hooks are called
  if (!hydrated) return null;
  if (!hasEnteredHeartverse) return null;

  return <ProfileBar {...props} />;
}

