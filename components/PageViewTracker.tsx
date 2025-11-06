"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView, isAnalyticsDisabled } from "@/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAnalyticsDisabled()) return;
    // Track page view on route changes and initial load
    // Use a stable string for search params to avoid effect loops
    const params = searchParams?.toString() || '';
    const url = pathname + (params ? `?${params}` : '');
    const timer = setTimeout(() => {
      console.log('PageViewTracker: tracking page view for', url);
      trackPageView();
    }, 120); // small debounce
    return () => clearTimeout(timer);
  }, [pathname, searchParams?.toString()]);

  return null;
}
