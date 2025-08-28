"use client";

import HUDPanel from "@/components/HUDPanel";
import MediaDock from "@/components/MediaDock";
import { tracks } from "@/config/tracks";

export default function Dashboard() {
  const [channelIdx, setChannelIdx] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [sky, setSky] = React.useState({ webm: "/skies/ocean-girl.webm", mp4: "/skies/ocean-girl.mp4", key: "ocean-girl" });
  const [links, setLinks] = React.useState({ spotify: "", apple: "" });
  const [toggleSignal, setToggleSignal] = React.useState(0);

  function onSongChange(id){
    // map spec ids to track slugs
    const map = { alone: "alone", baby: "baby", bee: "be-my-bee", "ocean-girl": "ocean-girl" };
    const slug = map[id] || id;
    const idx = tracks.findIndex(t => (t.slug||"").startsWith(slug));
    if (idx >= 0) setChannelIdx(idx);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0C1117] text-white">
      {/* Backgrounds: starfield + ocean dusk placeholders (fallback to existing cockpit if missing) */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/bg/starfield.webp"
          alt="starfield"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          onError={(e)=>{ e.currentTarget.src = "/cockpit/cockpit.png"; e.currentTarget.style.opacity = 0.4; }}
        />
        <img
          src="/bg/ocean.webp"
          alt="ocean dusk"
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-40"
          onError={(e)=>{ e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Cockpit frame on top */}
      <div className="cockpit-bg fixed inset-0 z-10 pointer-events-none" aria-hidden="true" />

      {/* Holographic HUD panel centered above wheel */}
      <div className="relative z-20 grid place-items-center">
        <HUDPanel onSongChange={onSongChange} />
      </div>

      {/* Hidden media engine for real audio + sky updates */}
      <div className="hidden">
        <MediaDock
          onSkyChange={(webm, mp4, key) => setSky({ webm, mp4, key })}
          onPlayingChange={(p) => setIsPlaying(p)}
          onTrackChange={(t) => setLinks({ spotify: t.spotify || "", apple: t.apple || "" })}
          toggleSignal={toggleSignal}
          showHUDPlay={false}
          index={channelIdx}
          onIndexChange={(i)=> setChannelIdx(i)}
        />
      </div>
    </main>
  );
}
