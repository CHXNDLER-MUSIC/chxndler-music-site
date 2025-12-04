"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";

function DebugScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </>
  );
}

export default function R3FDebugPage() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <DebugScene />
      </Canvas>
    </div>
  );
}