"use client";
import { useEffect } from "react";

export default function PrewarmThree() {
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          import("three"),
          import("@react-three/fiber"),
          import("@react-three/drei"),
        ]);
      } catch {}
    })();
  }, []);
  return null;
}

