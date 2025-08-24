"use client";

import React from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDockFrame from "@/components/MediaDockFrame";
// import JoinAliensBox from "@/components/JoinAliensBox"; // TEMP disabled

export default function Page() {
  const DEBUG = false;
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <SkyboxVideo brightness={0.95} />

      <Slot rect={DASHBOARD.socialDock} debug={DEBUG}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock} debug={DEBUG}>
        <MediaDockFrame />
      </Slot>

      {/* <Slot rect={DASHBOARD.joinBox} debug={DEBUG}>
        <JoinAliensBox />
      </Slot> */}
    </main>
  );
}
