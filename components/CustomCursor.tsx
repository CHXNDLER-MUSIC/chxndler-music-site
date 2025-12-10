"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    const handleResize = () => {
      const shouldEnable = window.innerWidth > 768;
      setEnabled(shouldEnable);
      console.log('Cursor enabled:', shouldEnable, 'Window width:', window.innerWidth);
    };

    handleResize();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("resize", handleResize);

    // Preload cursor image
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      console.log('Cursor image loaded successfully');
    };
    img.onerror = () => {
      console.error('Failed to load cursor image');
    };
    img.src = "/elements/cursor.png";

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  console.log('Cursor render - enabled:', enabled, 'pos:', pos, 'imageLoaded:', imageLoaded);

  if (!enabled) return null;

  const size = 32;

  return (
    <>
      {/* Bright fallback cursor that's always visible */}
      <div
        className="custom-cursor-always-top"
        style={{
          position: "fixed",
          left: pos.x - 3,
          top: pos.y - 3,
          width: 6,
          height: 6,
          backgroundColor: "#FF0080",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 2147483649,
          transform: "translate3d(0, 0, 0)",
          boxShadow: "0 0 10px #FF0080, 0 0 20px #FF0080",
          opacity: 1,
          visibility: "visible",
        }}
      />
      {/* Custom image cursor */}
      <div
        className="custom-cursor-always-top"
        style={{
          position: "fixed",
          left: pos.x - size / 2,
          top: pos.y - size / 2,
          width: size,
          height: size,
          backgroundImage: imageLoaded ? 'url("/elements/cursor.png")' : 'none',
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
          zIndex: 2147483649,
          transform: "translate3d(0, 0, 0)",
          isolation: "isolate",
          contain: "layout style paint",
          opacity: imageLoaded ? 1 : 0,
          visibility: "visible",
        }}
      />
    </>
  );
}