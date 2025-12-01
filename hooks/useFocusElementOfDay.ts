"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { ElementType } from "@/lib/planetConfig";

type FocusRecord = {
  element: string; // 'heart' | 'water' | 'lightning' | 'darkness' (case insensitive acceptable)
  focus_date?: string | null;
  created_at?: string | null;
};

const CANDIDATE_TABLES = [
  process.env.NEXT_PUBLIC_FOCUS_ELEMENT_TABLE || "",
  "element_focus_daily",
  "daily_focus_element",
  "focus_elements",
  "element_of_the_day",
].filter(Boolean);

function normalizeElement(s: string | null | undefined): ElementType | null {
  const v = String(s || "").toLowerCase();
  if (["heart", "water", "lightning", "darkness"].includes(v)) return v as ElementType;
  return null;
}

export function useFocusElementOfDay() {
  const [focusElement, setFocusElement] = useState<ElementType | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    async function fetchFocus() {
      for (const table of CANDIDATE_TABLES) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select("element, focus_date, created_at")
            .order("focus_date", { ascending: false })
            .limit(1);
          if (error) throw error;
          const rec: FocusRecord | undefined = data?.[0];
          const el = normalizeElement(rec?.element);
          if (el && mounted) {
            setFocusElement(el);
            return;
          }
        } catch (e) {
          // Try next candidate table
        }
      }
      // Fallback: default focus is HEART (brand)
      if (mounted) setFocusElement("heart");
    }
    fetchFocus();

    // Refresh at midnight local time (optional)
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(fetchFocus, msUntilMidnight + 1000);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  return { focusElement };
}

