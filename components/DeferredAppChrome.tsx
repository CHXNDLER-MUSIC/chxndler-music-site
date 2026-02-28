"use client";
import React from "react";
import dynamic from "next/dynamic";

// Dynamically import heavy, non-critical UI so it doesn't block LCP/INP
const GeoOnLogin = dynamic(() => import("@/components/GeoOnLogin"), { ssr: false, loading: () => null });
const CardCelebration = dynamic(() => import("@/components/CardCelebration"), { ssr: false, loading: () => null });
const HeartCoinCelebration = dynamic(() => import("@/components/HeartCoinCelebration"), { ssr: false, loading: () => null });
const ElementCardCelebration = dynamic(() => import("@/components/ElementCardCelebration"), { ssr: false, loading: () => null });
const MerchCelebration = dynamic(() => import("@/components/MerchCelebration"), { ssr: false, loading: () => null });
const BadgeCelebrationController = dynamic(() => import("@/components/BadgeCelebrationController"), { ssr: false, loading: () => null });

// Idle-after-paint helper for broad browser support
function onIdle(cb: () => void) {
  const ric = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void) => number);
  if (ric) ric(cb);
  else setTimeout(cb, 450);
}

export default function DeferredAppChrome() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    onIdle(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;

  return (
    <>
      {/* Lightweight mounts after first paint/idle */}
      <GeoOnLogin />
      <CardCelebration />
      <HeartCoinCelebration />
      <ElementCardCelebration />
      <MerchCelebration />
      <BadgeCelebrationController />
    </>
  );
}

