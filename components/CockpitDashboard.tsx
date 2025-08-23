// components/CockpitDashboard.tsx
"use client";
import { TopPlatformRail, RightSocialRail } from "./DashboardRails";
import CoverHologram from "./CoverHologram";
import { useSkybox } from "./CockpitSceneHooks";
import type { Track } from "@/config/tracks";

export default function CockpitDashboard({ track }: { track: Track }) {
  useSkybox(track?.bgSky);
  return (
    <>
      <TopPlatformRail />
      <RightSocialRail />
      <CoverHologram src={track.cover} title={track.title} />
    </>
  );
}
