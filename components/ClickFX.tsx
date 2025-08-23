"use client";
import React, { useEffect, useRef } from "react";

/** Global click sound. Place /public/ui/click.mp3 */
export default function ClickFX() {
  const ref = useRef<HTMLAudioElement|null>(null);

  useEffect(() => {
    const onClick = () => {
      const a = ref.current;
      if (!a) return;
      a.currentTime = 0;
      a.volume = 0.5;
      a.play().catch(()=>{});
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return <audio ref={ref} src="/ui/click.mp3" preload="auto" />;
}
