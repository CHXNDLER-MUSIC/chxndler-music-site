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
    // Keep the page background simple so the video layer is obvious
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY video sits ABOVE background but BELOW HUD (z-10 inside the component) */}
      <SkyboxVideo src="/skies/ocean-girl.mp4" brightness={0.95} />

      {/* HUD slots (z >= 30 via Slot) */}
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
