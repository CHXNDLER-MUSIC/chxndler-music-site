"use client";

import React from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDockFrame from "@/components/MediaDockFrame";
import JoinAliensBox from "@/components/JoinAliensBox";

export default function Page() {
  const DEBUG = false; // set true to outline slot rectangles

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY video inside windshield (oval fallback) */}
      <SkyboxVideo brightness={0.95} />

      {/* HUD slots (always above video) */}
      <Slot rect={DASHBOARD.socialDock} debug={DEBUG}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock} debug={DEBUG}>
        <MediaDockFrame />
      </Slot>

      <Slot rect={DASHBOARD.joinBox} debug={DEBUG}>
        <JoinAliensBox />
      </Slot>
    </main>
  );
}
