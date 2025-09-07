'use client';

export const dynamic = 'force-dynamic'; // don't prerender this route
export const runtime = 'nodejs';        // avoid Edge runtime
export const revalidate = 0;            // no caching

import "@/styles/glow.css";
import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePlayerStore } from "@/store/usePlayerStore";
import { buildPlanetSongs } from "@/lib/planets";

// ⬇️ dynamically import HoloPanel as a client-only component
const HoloPanel = dynamic(() => import("@/components/holo/HoloPanel"), {
  ssr: false,
});

export default function Page() {
  useEffect(() => {
    const { holoSongs } = buildPlanetSongs();
    usePlayerStore.getState().initSongs(holoSongs);
  }, []);

  return <HoloPanel />;
}
