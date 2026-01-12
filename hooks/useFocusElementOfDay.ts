"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { debug, warn } from "@/lib/logger";
import type { ElementType } from "@/lib/planetConfig";
import { getLocalDateString } from "@/utils/dateHelpers";

function normalizeElement(s: string | null | undefined): ElementType | null {
  const v = String(s || "").toLowerCase();
  if (["heart", "water", "lightning", "darkness"].includes(v)) return v as ElementType;
  return null;
}

export function useFocusElementOfDay() {
  // Default to null so camera shows overview/space view, not locked to any element
  const [focusElement, setFocusElement] = useState<ElementType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchElementOfDay() {
      try {
        const today = getLocalDateString();

        // Fetch from soul_daily_prompts table
        const { data, error } = await supabaseBrowser
          .from("soul_daily_prompts")
          .select("element")
          .eq("prompt_date", today)
          .maybeSingle();

        if (error) {
          warn("Error fetching element of day:", error.message);
          // Stay null on error - camera will show overview
          setFocusElement(null);
        } else if (data?.element) {
          const normalized = normalizeElement(data.element);
          // Only set focus if there's a valid daily element configured
          setFocusElement(normalized);
          debug("Focus element of day:", normalized || "none");
        } else {
          // No entry for today - stay null for overview
          setFocusElement(null);
        }
      } catch (err) {
        console.error("Failed to fetch element of day:", err);
        // Stay null on error - camera will show overview
        setFocusElement(null);
      } finally {
        setLoading(false);
      }
    }

    fetchElementOfDay();
  }, []);

  return { focusElement, loading };
}

