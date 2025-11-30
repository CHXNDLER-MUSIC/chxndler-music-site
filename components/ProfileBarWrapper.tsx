"use client";

import React from "react";
import ProfileBar from "@/components/ProfileBar";
import { useUIState } from "@/lib/use-ui-state";

type Props = React.ComponentProps<typeof ProfileBar> & {
  todaysPrompt?: any;
};

// Wrapper that prevents any render until client hydration, then
// conditionally shows the ProfileBar only after the user has entered.
export default function ProfileBarWrapper(props: Props) {
  // All hooks must be called before any early returns
  const hasEnteredHeartverse = useUIState((s) => s.hasEnteredHeartverse);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Wait until client mount to avoid SSR/CSR mismatch and flashes
    setHydrated(true);
  }, []);

  // Early returns only after all hooks are called
  if (!hydrated) return null;
  if (!hasEnteredHeartverse) return null;

  return <ProfileBar {...props} />;
}

