"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Fallback used only while the initial fetch is in-flight
const FALLBACK_DATE = new Date("2099-12-31T23:59:59Z");

function parseEndsAt(raw: unknown): Date {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (obj && typeof obj === "object" && "ends_at" in obj) {
      const d = new Date((obj as { ends_at: string }).ends_at);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return FALLBACK_DATE;
}

export function useHiddenSignalDate(): { endDate: Date; loading: boolean } {
  const [endDate, setEndDate] = useState<Date>(FALLBACK_DATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser
      .from("app_settings")
      .select("value")
      .eq("key", "hidden_signal_countdown")
      .single()
      .then(({ data, error }) => {
        if (!error && data) setEndDate(parseEndsAt(data.value));
        setLoading(false);
      });

    const channel = supabaseBrowser
      .channel("hidden_signal_countdown")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.hidden_signal_countdown" },
        (payload) => {
          if (payload.new && "value" in payload.new) {
            setEndDate(parseEndsAt((payload.new as { value: unknown }).value));
          }
        }
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  return { endDate, loading };
}
