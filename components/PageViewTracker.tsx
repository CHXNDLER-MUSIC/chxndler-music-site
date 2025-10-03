"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route changes
    console.log('PageViewTracker: tracking page view for', pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''));
    trackPageView();
  }, [pathname, searchParams]);

  // Also track initial page load
  useEffect(() => {
    // Track initial page view on mount
    console.log('PageViewTracker: initial mount - tracking page view for', pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''));
    trackPageView();
  }, []);

  return null;
}