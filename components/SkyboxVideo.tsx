"use client";
import { useEffect, useRef } from "react";

type Props = {
  src: string;          // e.g. "/cockpit/skies/videos/ocean.webm"
  poster?: string;      // e.g. "/cockpit/skies/ocean.webp"
  className?: string;
};

export default function SkyboxVideo({ src, poster, className }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    if (v.currentSrc.endsWith(src)) return;
    v.src = src;
    v.currentTime = 0;
    const tryPlay = async () => {
      try { await v.play(); }
      catch {
        const onInteract = () => { v.play().catch(() => {}); window.removeEventListener("click", onInteract); window.removeEventListener("touchstart", onInteract); };
        window.addEventListener("click", onInteract, { once: true });
        window.addEventListener("touchstart", onInteract, { once: true });
      }
    };
    tryPlay();
  }, [src]);

  return (
    <video
      ref={ref}
      id="skybox-video"
      className={`fixed inset-0 w-full h-full object-cover -z-10 ${className ?? ""}`}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
    />
  );
}
