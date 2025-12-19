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
  const [focusElement, setFocusElement] = useState<ElementType | null>("heart");
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
          // Fall back to heart on error
          setFocusElement("heart");
        } else if (data?.element) {
          const normalized = normalizeElement(data.element);
          setFocusElement(normalized || "heart");
          debug("Focus element of day:", normalized || "heart");
        } else {
          // No entry for today, fall back to heart
          setFocusElement("heart");
        }
      } catch (err) {
        console.error("Failed to fetch element of day:", err);
        setFocusElement("heart");
      } finally {
        setLoading(false);
      }
    }

    fetchElementOfDay();
  }, []);

  return { focusElement, loading };
}

