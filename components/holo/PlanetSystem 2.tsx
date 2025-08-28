"use client";

import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import { Html, OrbitControls } from "@react-three/drei";
import { usePlayerStore } from "@/store/usePlayerStore";
import Planet from "@/components/holo/Planet";

function InvalidateOnState() {
  const invalidate = useThree((s) => s.invalidate);
  const { mainId, hoverId, songs } = usePlayerStore();
  useEffect(() => {
    invalidate();
  }, [mainId, hoverId, songs.length, invalidate]);
  return null;
}

export default function PlanetSystem() {
  const { songs, mainId, prevMainId, hoverId } = usePlayerStore();

  return (
    // Fill the parent (HUDPanel provides a fixed-height relative container)
    <div className="absolute inset-0 holo-inset">
      <Canvas
        className="absolute inset-0"
        dpr={[1, 2]}
        camera={{ position: [0.2, 1.35, 7.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        frameloop="demand"
      >
        {/* Transparent background; parent provides holographic blue backdrop */}
        <ambientLight intensity={0.28} />
        <directionalLight position={[3, 6, 5]} intensity={0.55} color={"#9ff"} />
        <pointLight position={[-4, 2, 4]} intensity={0.45} color={"#4ff"} />
        {/* Console-emitted cyan from below */}
        <pointLight position={[0, -1.4, 0.6]} intensity={0.9} color={"#19E3FF"} distance={8} />
        {/* Very soft magenta secondary glow for depth */}
        <pointLight position={[0.8, -1.0, -0.4]} intensity={0.22} color={"#FC54AF"} distance={7} />
        <InvalidateOnState />

        {/* Tilt the entire orbital plane to match dashboard-2 perspective */}
        <group rotation-x={0.45} rotation-y={-0.12}>
          {/* Global reference ring to echo dashboard-2 */}
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[2.15, 2.45, 192]} />
            <meshBasicMaterial color={"#19E3FF"} transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} />
          </mesh>
          {songs.map((song) => (
            <Planet
              key={song.id}
              song={song}
              isMain={song.id === mainId}
              isHover={hoverId === song.id}
              isMoon={song.id === prevMainId}
            />
          ))}
        </group>

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        <Html position={[0, -1.9, 0]} center style={{ pointerEvents: "none" }}>
          <div className="text-cyan-200/60 text-[10px]">Hologram Projection</div>
        </Html>
      </Canvas>
    </div>
  );
}
