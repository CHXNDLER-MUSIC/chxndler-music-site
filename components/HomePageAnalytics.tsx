"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

export default function HomePageAnalytics() {
  useEffect(() => {
    // Track home/landing page view
    trackPageView();
  }, []);

  return null;
}

