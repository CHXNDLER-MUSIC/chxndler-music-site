"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Subscribes to the `go_live_override` flag in `app_settings`.
 * Returns { isOverrideActive: boolean, loading: boolean }
 */
export function useGoLiveOverride() {
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial value
    supabaseBrowser
      .from("app_settings")
      .select("value")
      .eq("key", "go_live_override")
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setIsOverrideActive(data.value === "true");
        }
        setLoading(false);
      });

    // 2. Subscribe to real-time changes
    const channel = supabaseBrowser
      .channel("go_live_override")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.go_live_override",
        },
        (payload) => {
          setIsOverrideActive(payload.new.value === "true");
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return { isOverrideActive, loading };
}
