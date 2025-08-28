"use client";

import "@/styles/glow.css";
import React from "react";
import HoloPanel from "@/components/holo/HoloPanel";
import { usePlayerStore } from "@/store/usePlayerStore";
import { buildPlanetSongs } from "@/lib/planets";

export default function Page() {
  React.useEffect(() => {
    const { holoSongs } = buildPlanetSongs();
    usePlayerStore.getState().initSongs(holoSongs);
  }, []);
  return <HoloPanel />;
}
