"use client";

import React from "react";
import { Canvas, CanvasProps } from "@react-three/fiber";

interface R3FCanvasProps extends CanvasProps {
  children?: React.ReactNode;
}

const R3FCanvas: React.FC<R3FCanvasProps> = ({ children, ...props }) => {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 10], fov: 75 }}
      {...props}
    >
      {children}
    </Canvas>
  );
};

export default R3FCanvas;