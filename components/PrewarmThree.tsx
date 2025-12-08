"use client";
import { useEffect } from "react";
import { ENABLE_HEARTVERSE_3D } from "@/config/features";

export default function PrewarmThree() {
  useEffect(() => {
    (async () => {
      try {
        // ⚠️ TEMPORARY 3D SYSTEM SHUTDOWN - Use feature flag to disable 3D prewarming
        // This prevents preloading React Three Fiber when 3D system is disabled
        if (!ENABLE_HEARTVERSE_3D) return;
        
        // Also respect local storage override for additional control
        const disable3D = (() => {
          try {
            const v = typeof window !== 'undefined' ? window.localStorage.getItem('DISABLE_3D_PLANETS') : null;
            if (v === '0') return false;
            if (v === '1') return true;
          } catch {}
          return false; // Default to enabled when feature flag is true
        })();
        if (disable3D) return;
        // Skip prewarming on constrained devices
        const conn: any = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
        const saveData = !!conn?.saveData;
        const effType: string = String(conn?.effectiveType || '').toLowerCase();
        const slowLink = effType.includes('2g') || effType.includes('3g');
        const isSmallScreen = typeof window !== 'undefined' ? (window.innerWidth <= 768) : false;
        if (saveData || slowLink || isSmallScreen) return;
        await Promise.all([
          import("three"),
          import("@react-three/fiber"),
        ]);
      } catch {}
    })();
  }, []);
  return null;
}
