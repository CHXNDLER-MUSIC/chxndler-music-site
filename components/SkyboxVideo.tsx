"use client";
import React, { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import StarfieldFallback from "@/components/StarfieldFallback";

/** Fades between skies; warp flash on key change. Auto-uses PNG mask; starfield fallback if video fails. */
export default function SkyboxVideo({
  webm, mp4, brightness = 0.95, skyKey,
}: { webm: string; mp4: string; brightness?: number; skyKey: string; }) {
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [failed, setFailed] = useState(false);
  const keyRef = useRef(skyKey);

  // Detect PNG windshield mask
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasMask(true);
    img.onerror = () => setHasMask(false);
    img.src = "/cockpit/windshield-mask.png";
  }, []);

  // Warp flash on change
  useEffect(() => {
    if (keyRef.current !== skyKey) {
      keyRef.current = skyKey;
      setFlash(true);
      setFailed(false); // reset on new sky
      const t = setTimeout(() => setFlash(false), 520);
      return () => clearTimeout(t);
    }
  }, [skyKey]);

  useEffect(() => { if (ready) track("sky_ready", { key: skyKey }); }, [ready, skyKey]);

  const maskClass = (hasMask ? "windshield-mask" : "windshield-clip") + " h-full w-full";

  return (
    <>
      <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className={maskClass}>
          {failed ? (
            <StarfieldFallback brightness={brightness} />
          ) : (
            <video
              autoPlay muted loop playsInline preload="auto"
              onLoadedData={() => setReady(true)}
              onError={() => setFailed(true)}
              className="h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: ready ? 1 : 0, filter:`brightness(${brightness})` }}
              key={skyKey}
            >
              {/* If these files are missing, onError triggers and we render starfield */}
              <source src={webm} type="video/webm" />
              <source src={mp4}  type="video/mp4" />
            </video>
          )}
        </div>
      </div>
      {flash && <div className="warp-flash" />}
    </>
  );
}
