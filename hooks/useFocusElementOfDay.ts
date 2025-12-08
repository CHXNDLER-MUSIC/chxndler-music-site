"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
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
  const [focusElement, setFocusElement] = useState<ElementType | null>("heart");

  // TEMPORARILY DISABLED: Skip database calls that cause 404 errors
  // This allows the 3D planet system to work properly
  useEffect(() => {
    // Just use "heart" as the default focus element
    setFocusElement("heart");
  }, []);

  return { focusElement };
}

