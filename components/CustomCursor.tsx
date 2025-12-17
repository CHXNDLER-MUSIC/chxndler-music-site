"use client";

import { useEffect } from "react";

export default function CustomCursor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Create cursor element directly in DOM (not through React)
    const cursor = document.createElement("div");
    cursor.id = "custom-cursor-vanilla";
    cursor.style.cssText = `
      position: fixed;
      width: 48px;
      height: 48px;
      background-image: url("/elements/cursor.png");
      background-size: contain;
      background-repeat: no-repeat;
      pointer-events: none;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.1s;
    `;

    // Append to end of body
    document.body.appendChild(cursor);

    // Preload image then show cursor
    const img = new Image();
    img.onload = () => {
      cursor.style.opacity = "1";
    };
    img.src = "/elements/cursor.png";

    const handleMove = (e: MouseEvent) => {
      cursor.style.left = `${e.clientX - 24}px`;
      cursor.style.top = `${e.clientY - 24}px`;
    };

    window.addEventListener("mousemove", handleMove);

    // Re-append cursor to end of body periodically to stay on top of portals
    const interval = setInterval(() => {
      if (cursor.parentNode === document.body) {
        document.body.appendChild(cursor);
      }
    }, 100);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearInterval(interval);
      cursor.remove();
    };
  }, []);

  return null;
}
