"use client";
import React, { useCallback } from "react";
import SkyboxVideo from "@/components/SkyboxVideo";
import { DASHBOARD } from "@/config/dashboard";
import { Slot } from "@/components/Slot";
import SocialDock from "@/components/SocialDock";
import MediaPlayer from "@/components/MediaPlayer";
import JoinAliensBox from "@/components/JoinAliensBox";

export default function Page() {
  const handleSkyChange = useCallback(() => {}, []);
  const handlePlayingChange = useCallback(() => {}, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white grid place-items-center">
      {/* Sky video underlay */}
      <SkyboxVideo brightness={0.95} />

      {/* Simple light beam (blue) */}
      <div
        className="fixed pointer-events-none z-20"
        style={{ left: '50%', bottom: '35vh', height: '45vh', width: '380px', transform: 'translateX(-50%)', opacity: 1 }}
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            left: '5%', right: '5%', bottom: 0, top: 0,
            clipPath: 'polygon(48% 100%, 52% 100%, 15% 0, 85% 0)',
            backgroundImage: `linear-gradient(180deg,
              rgba(25,227,255, 0.0) 0%,
              rgba(25,227,255, 0.15) 15%,
              rgba(25,227,255, 0.35) 40%,
              rgba(25,227,255, 0.55) 65%,
              rgba(25,227,255, 0.35) 85%,
              rgba(25,227,255, 0.0) 100%),
            repeating-linear-gradient(180deg,
              transparent 0px,
              rgba(25,227,255, 0.1) 20px,
              rgba(25,227,255, 0.2) 40px,
              rgba(25,227,255, 0.1) 60px,
              transparent 80px)`,
            backgroundSize: '100% 100%, 100% 160px',
            filter: 'blur(4px)',
            mixBlendMode: 'screen',
            animation: 'beamFlow 3s linear infinite'
          }}
        />
        <style jsx>{`
          @keyframes beamFlow {
            0% { background-position: 0% 0%, 0% 0px; }
            100% { background-position: 0% 0%, 0% -160px; }
          }
        `}</style>
      </div>

      {/* HUD slots */}
      <Slot rect={DASHBOARD.socialDock}>
        <SocialDock />
      </Slot>

      <Slot rect={DASHBOARD.mediaDock}>
        <MediaPlayer onSkyChange={handleSkyChange} onPlayingChange={handlePlayingChange} />
      </Slot>

      <Slot rect={DASHBOARD.joinBox}>
        <JoinAliensBox />
      </Slot>
    </main>
  );
}
