// components/CockpitSceneHooks.ts
"use client";
import { useEffect } from "react";

export function useSkybox(bgSky?: string) {
  useEffect(() => {
    if (!bgSky) return;
    const el = document.documentElement;
    const prev = el.style.getPropertyValue("--sky-url");
    el.style.setProperty("--sky-url", `url(${bgSky})`);
    return () => el.style.setProperty("--sky-url", prev || "");
  }, [bgSky]);
}
