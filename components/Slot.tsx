"use client";
import React from "react";

type Rect = { top: number; left: number; width: number; height: number };

export function Slot({
  rect,
  children,
  className = "",
  z = 30,
  debug = false,
}: {
  rect: Rect;
  children: React.ReactNode;
  className?: string;
  z?: number;
  debug?: boolean;
}) {
  const style: React.CSSProperties = {
    position: "fixed",
    top: `${rect.top}vh`,
    left: `${rect.left}vw`,
    width: `${rect.width}vw`,
    height: `${rect.height}vh`,
    zIndex: z,
  };
  return (
    <div style={style} className={`${debug ? "debug-slot" : ""} ${className}`}>
      {children}
    </div>
  );
}
