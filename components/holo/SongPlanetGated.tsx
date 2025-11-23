"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, Color, AdditiveBlending } from "three";
import { useFrame } from "@react-three/fiber";
import { ELEMENT_STYLES, type ElementKey } from "@/utils/planetStyles";
import { type CardGateState } from "@/utils/cardGating";

interface SongPlanetGatedProps {
  songId: string;
  elementKey: ElementKey;
  gateState: CardGateState;
  position: [number, number, number];
  radius?: number;
  isMain?: boolean;
  isHover?: boolean;
  onClick?: () => void;
}

export default function SongPlanetGated({
  songId,
  elementKey,
  gateState,
  position,
  radius = 0.3,
  isMain = false,
  isHover = false,
  onClick = () => {}
}: SongPlanetGatedProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  
  const elementStyles = ELEMENT_STYLES[elementKey];

  // Calculate target scale based on interaction states
  const targetScale = isMain ? 1.4 : isHover ? 1.2 : 1.0;

  // Animation frame
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (planetRef.current) {
      // Gentle self-rotation
      planetRef.current.rotation.y += 0.01;
      planetRef.current.rotation.x += 0.005;
      
      // Scale effects for interaction states
      const currentScale = planetRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      planetRef.current.scale.setScalar(newScale);
      
      // Subtle pulsing for main/hover states
      if (isMain || isHover) {
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        planetRef.current.scale.multiplyScalar(pulse);
      }
    }

    // Heart element special pulsing
    if (elementKey === 'heart' && glowRef.current) {
      const heartPulse = 0.8 + 0.3 * Math.sin(time * 2.5);
      glowRef.current.scale.setScalar(heartPulse);
    }
  });

  // Render different states
  if (gateState === "comingSoon") {
    return (
      <group ref={groupRef} position={position}>
        {/* Ghost planet - muted and transparent */}
        <mesh
          ref={planetRef}
          onClick={onClick}
          onPointerEnter={() => {}}
          onPointerLeave={() => {}}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color="#3A3A3A"
            emissive="#000000"
            transparent
            opacity={0.6}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Thin outline in element color */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[radius * 1.05, 32, 32]} />
          <meshBasicMaterial
            color={elementStyles.coreColor}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    );
  }

  if (gateState === "lockedTier") {
    const dimmedColor = elementStyles.rimColor;
    
    return (
      <group ref={groupRef} position={position}>
        {/* Dimmed planet */}
        <mesh
          ref={planetRef}
          onClick={onClick}
          onPointerEnter={() => {}}
          onPointerLeave={() => {}}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={dimmedColor}
            emissive={elementStyles.rimColor}
            emissiveIntensity={0.3}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Lock dome - protective barrier */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[radius * 1.15, 32, 32]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            transparent
            opacity={0.25}
            wireframe
          />
        </mesh>
        
        {/* Secondary lock dome for depth */}
        <mesh renderOrder={-2}>
          <sphereGeometry args={[radius * 1.25, 16, 16]} />
          <meshBasicMaterial
            color={elementStyles.coreColor}
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Lock indicator - simple glowing plane above planet */}
        <group position={[0, radius + 0.8, 0]}>
          <mesh>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              color="#FFAA00"
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Small glow around lock */}
          <mesh renderOrder={-1}>
            <planeGeometry args={[0.6, 0.6]} />
            <meshBasicMaterial
              color="#FFAA00"
              transparent
              opacity={0.3}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    );
  }

  if (gateState === "available") {
    return (
      <group ref={groupRef} position={position}>
        {/* Bright available planet */}
        <mesh
          ref={planetRef}
          onClick={onClick}
          onPointerEnter={() => {}}
          onPointerLeave={() => {}}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            emissive={elementStyles.innerGlow}
            emissiveIntensity={isHover ? 1.3 : 1.0}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Subtle glow */}
        <mesh ref={glowRef} renderOrder={-1}>
          <sphereGeometry args={[radius * 1.15, 16, 16]} />
          <meshBasicMaterial
            color={elementStyles.innerGlow}
            transparent
            opacity={isHover ? 0.4 : 0.3}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  if (gateState === "owned") {
    return (
      <group ref={groupRef} position={position}>
        {/* Full brightness owned planet */}
        <mesh
          ref={planetRef}
          onClick={onClick}
          onPointerEnter={() => {}}
          onPointerLeave={() => {}}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            emissive={elementStyles.innerGlow}
            emissiveIntensity={1.3}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>

        {/* Enhanced glow for owned status */}
        <mesh ref={glowRef} renderOrder={-1}>
          <sphereGeometry args={[radius * 1.2, 16, 16]} />
          <meshBasicMaterial
            color={elementStyles.innerGlow}
            transparent
            opacity={0.5}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Gold/white outline for ownership */}
        <mesh renderOrder={-2}>
          <sphereGeometry args={[radius * 1.1, 32, 32]} />
          <meshBasicMaterial
            color="#FFFFFF"
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Optional sparkle effect */}
        <mesh renderOrder={-3}>
          <sphereGeometry args={[radius * 1.05, 16, 16]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  // Fallback - render as available
  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={planetRef}
        onClick={onClick}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={elementStyles.coreColor}
          emissive={elementStyles.innerGlow}
          emissiveIntensity={0.8}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}