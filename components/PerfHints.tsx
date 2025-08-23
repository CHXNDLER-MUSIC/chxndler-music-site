// components/PerfHints.tsx
"use client";
import { useEffect } from "react";

export default function PerfHints() {
  useEffect(() => {
    // Avoid heavy blurs on low-end devices:
    const lowEnd = navigator?.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    if (lowEnd) {
      document.documentElement.classList.add("low-end");
    }
  }, []);
  return null;
}
