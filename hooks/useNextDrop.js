"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Subscribes to the `next_drop` config in `app_settings`.
 * Returns { nextDrop: { title, slug, label, target } | null, loading }
 */
export function useNextDrop() {
  const [nextDrop, setNextDrop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse the JSON value, returning null for empty/invalid data
    function parse(raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && obj.title && obj.target) return obj;
      } catch {}
      return null;
    }

    // 1. Fetch initial value
    supabaseBrowser
      .from("app_settings")
      .select("value")
      .eq("key", "next_drop")
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setNextDrop(parse(data.value));
        }
        setLoading(false);
      });

    // 2. Subscribe to real-time changes
    const channel = supabaseBrowser
      .channel("next_drop")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.next_drop",
        },
        (payload) => {
          setNextDrop(parse(payload.new.value));
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return { nextDrop, loading };
}
