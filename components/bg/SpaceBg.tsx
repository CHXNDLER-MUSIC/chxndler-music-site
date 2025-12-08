"use client";
import React from "react";

export default function SpaceBg({ active = true }: { active?: boolean }) {
  const youtubeEmbedUrl = "https://www.youtube.com/embed/gHDxkhQ4FbY?autoplay=1&mute=1&loop=1&playlist=gHDxkhQ4FbY&controls=0&modestbranding=1&playsinline=1";

  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{ 
        opacity: active ? 1 : 0, 
        transition: 'opacity 300ms ease',
        pointerEvents: 'none'
      }}
    >
      {/* 16:9 cover sizing for YouTube iframe */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '177.78vh',
          height: '100vh',
          minWidth: '100vw',
          minHeight: '56.25vw'
        }}
      >
        <iframe
          src={youtubeEmbedUrl}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          title="Space Background"
          loading="eager"
          referrerPolicy="origin"
          fetchPriority="high"
          style={{
            display: 'block',
            border: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />
      </div>
    </div>
  );
}
