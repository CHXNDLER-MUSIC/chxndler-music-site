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
    // ── Local dev/testing overrides ─────────────────────────────
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search || '');
        // URL toggle: ?live=1 or ?goLive=1 enables a sticky local override
        if (params.get('live') === '1' || params.get('goLive') === '1') {
          window.localStorage.setItem('GO_LIVE_DEV_OVERRIDE', '1');
        }
        // Runtime API for console: window.setGoLiveOverride(true/false)
        if (!('setGoLiveOverride' in window)) {
          window.setGoLiveOverride = (flag) => {
            try { window.localStorage.setItem('GO_LIVE_DEV_OVERRIDE', flag ? '1' : '0'); } catch {}
            setIsOverrideActive(!!flag);
          };
        }
        // Sticky localStorage override
        if (window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1') {
          setIsOverrideActive(true);
        }
      }
    } catch {}

    // 1a. Prefer server API (works regardless of RLS): /api/admin/go-live
    (async () => {
      try {
        const res = await fetch('/api/admin/go-live', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          setIsOverrideActive(local || !!json?.live);
          setLoading(false);
          return; // Done
        }
      } catch {}

      // 1b. Fallback to direct Supabase read (requires RLS allowing anon read of app_settings)
      supabaseBrowser
        .from("app_settings")
        .select("key, value")
        .in("key", ["go_live_override", "live"]) 
        .then(({ data, error }) => {
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          if (!error && Array.isArray(data)) {
            const anyTrue = data.some((row) => {
              const v = typeof row?.value === 'string' ? row.value.toLowerCase() : row?.value;
              return v === 'true' || v === true || v === '1' || v === 1;
            });
            setIsOverrideActive(local || anyTrue);
          } else {
            // If we couldn't read, at least honor local override
            setIsOverrideActive(!!local);
          }
          setLoading(false);
        });
    })();

    // 2. Subscribe to real-time changes
    const channel = supabaseBrowser
      .channel("go_live_override")
      // Handle both UPDATE and INSERT for key 'go_live_override'
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "key=eq.go_live_override" },
        (payload) => {
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          setIsOverrideActive(local || payload.new.value === "true" || payload.new.value === '1' || payload.new.value === true);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_settings", filter: "key=eq.go_live_override" },
        (payload) => {
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          setIsOverrideActive(local || payload.new.value === "true" || payload.new.value === '1' || payload.new.value === true);
        }
      )
      // Handle both UPDATE and INSERT for legacy key 'live'
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "key=eq.live" },
        (payload) => {
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          setIsOverrideActive(local || payload.new.value === "true" || payload.new.value === '1' || payload.new.value === true);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_settings", filter: "key=eq.live" },
        (payload) => {
          const local = (typeof window !== 'undefined' && window.localStorage.getItem('GO_LIVE_DEV_OVERRIDE') === '1');
          setIsOverrideActive(local || payload.new.value === "true" || payload.new.value === '1' || payload.new.value === true);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return { isOverrideActive, loading };
}
