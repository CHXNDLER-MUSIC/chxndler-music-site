"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route changes and initial load
    // Add delay to prevent duplicate tracking from rapid route changes
    const timer = setTimeout(() => {
      console.log('PageViewTracker: tracking page view for', pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''));
      trackPageView();
    }, 100); // 100ms delay to debounce rapid changes
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}