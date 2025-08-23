"use client";

import { useMemo, useState } from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { tracks } from "@/config/tracks";          // your song list
import { getSkyForSlug } from "@/config/skies";    // if you use per-song skies
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaDockFrame from "@/components/MediaDockFrame";
import JoinAliensBox from "@/components/JoinAliensBox";

export default function Page() {
  const [idx, setIdx] = useState(0);
  const current = tracks[idx];

  const sky = useMemo(() => {
    if (current?.slug) return getSkyForSlug(current.slug);
    return { video: current?.bgVideo, poster: current?.poster, brightness: 0.95 };
  }, [current]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SKY only through windshield (useClipFallback=true until you add PNG mask) */}
      <SkyboxVideo
        src={sky?.video || current?.bgVideo}
        poster={sky?.poster || current?.poster}
        brightness={sky?.brightness ?? 0.95}
        useClipFallback={true}
      />

      {/* Temporary switcher for quick testing */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/40 backdrop-blur-md rounded-xl px-3 py-2">
        <select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="bg-transparent outline-none"
        >
          {tracks.map((t, i) => (
            <option key={t.slug ?? i} value={i}>{t.title ?? `Track ${i + 1}`}</option>
          ))}
        </select>
      </div>

      {/* SLOT MOUNTS — add debug={true} to outline boxes while you nudge values */}
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
