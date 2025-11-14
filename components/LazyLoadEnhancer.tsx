"use client";
import React from "react";

/**
 * Globally opts images and iframes into lazy-loading at runtime.
 * - Adds loading="lazy" and decoding="async" to <img> without explicit loading.
 * - Adds loading="lazy" to <iframe> without explicit loading.
 * - Skips any element with [data-no-lazy].
 * A MutationObserver keeps newly-added nodes consistent.
 */
export default function LazyLoadEnhancer() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const enhanceImg = (img: HTMLImageElement) => {
      if (img.hasAttribute("data-no-lazy")) return;
      // Skip Next.js managed images to avoid attribute churn/flicker
      if (img.hasAttribute("data-nimg")) return;
      // Skip critical UI icons/covers to avoid any loading hint changes while visible
      const el = img as HTMLElement;
      if (el.closest('.songs-icon') || el.closest('.cover-hologram-container') || el.closest('.hud-cover')) return;
      if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
      // Reduce main-thread competition for non-critical images
      if (!img.hasAttribute("fetchpriority")) img.setAttribute("fetchpriority", "low");
    };

    const enhanceIframe = (frame: HTMLIFrameElement) => {
      if (frame.hasAttribute("data-no-lazy")) return;
      if (!frame.hasAttribute("loading")) frame.setAttribute("loading", "lazy");
    };

    const run = (root: ParentNode | Document) => {
      root.querySelectorAll<HTMLImageElement>("img").forEach(enhanceImg);
      root.querySelectorAll<HTMLIFrameElement>("iframe").forEach(enhanceIframe);
    };

    run(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.tagName === "IMG") enhanceImg(n as HTMLImageElement);
          else if (n.tagName === "IFRAME") enhanceIframe(n as HTMLIFrameElement);
          else run(n);
        });
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return null;
}
