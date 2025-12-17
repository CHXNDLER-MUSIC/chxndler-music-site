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
      const shouldEnable = true; // Force enable for testing
      setEnabled(shouldEnable);
      console.log('Cursor FORCE enabled:', shouldEnable, 'Window width:', window.innerWidth);
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

  const size = 48; // Made larger for better visibility

  return (
    <>
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
          zIndex: 2147483651,
          transform: "translate3d(0, 0, 0)",
          isolation: "isolate",
          contain: "layout style paint",
          opacity: imageLoaded ? 1 : 0,
          visibility: "visible",
          mixBlendMode: "normal",
          willChange: "transform",
        }}
      />
    </>
  );
}