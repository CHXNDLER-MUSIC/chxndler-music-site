"use client";

import React from "react";
import SkyboxVideo from "@/components/SkyboxVideo";      // uses clip-path fallback (no PNG mask needed)
import { DASHBOARD } from "@/config/dashboard";          // slot positions you can tweak
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDockFrame from "@/components/MediaDockFrame";
import JoinAliensBox from "@/components/JoinAliensBox";

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY video — hardcoded path; make sure file exists at /public/skies/ocean-girl.mp4 */}
      <SkyboxVideo
        src="/skies/ocean-girl.mp4"
        poster=""               // optional poster (leave empty if none)
        brightness={0.95}       // tweak to match your cockpit lighting
      />

      {/* SLOT MOUNTS — set debug={true} temporarily to outline the rectangles */}
      <Slot rect={DASHBOARD.socialDock} debug={false}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock} debug={false}>
        <MediaDockFrame />
      </Slot>

      <Slot rect={DASHBOARD.joinBox} debug={false}>
        <JoinAliensBox />
      </Slot>
    </main>
  );
}
