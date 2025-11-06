"use client";
import { useEffect } from "react";

export default function PrewarmThree() {
  useEffect(() => {
    (async () => {
      try {
        // Global kill-switch to disable any 3D prewarming while investigating performance
        const DISABLE_3D_DEFAULT = true;
        const disable3D = (() => {
          try {
            const v = typeof window !== 'undefined' ? window.localStorage.getItem('DISABLE_3D_PLANETS') : null;
            if (v === '0') return false;
            if (v === '1') return true;
          } catch {}
          return DISABLE_3D_DEFAULT;
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
