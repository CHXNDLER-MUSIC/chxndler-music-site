"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    const handleResize = () => {
      setEnabled(window.innerWidth > 768);
    };

    handleResize();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!enabled) return null;

  const size = 32;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x - size / 2,
        top: pos.y - size / 2,
        width: size,
        height: size,
        backgroundImage: 'url("/elements/cursor.png")',
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
        zIndex: 2147483647,
        transform: "translate3d(0, 0, 0)",
      }}
    />
  );
}