"use client";

import React from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDockFrame from "@/components/MediaDockFrame";
import JoinAliensBox from "@/components/JoinAliensBox";

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY video sits above page bg, below HUD */}
      <SkyboxVideo brightness={0.95} />

      {/* SLOTS pinned to cockpit areas (tweak in /config/dashboard.ts) */}
      <Slot rect={DASHBOARD.socialDock}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock}>
        <MediaDockFrame />
      </Slot>

      <Slot rect={DASHBOARD.joinBox}>
        <JoinAliensBox />
      </Slot>
    </main>
  );
}
