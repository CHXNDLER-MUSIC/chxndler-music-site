"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, Color } from "three";
import { useFrame } from "@react-three/fiber";
import { type Element, ELEMENT_COLORS } from "@/lib/planets";

interface SongPlanetSphereProps {
  element: Element;
  songId: string;
  isMain?: boolean;
  isHover?: boolean;
}

export default function SongPlanetSphere({ 
  element, 
  songId, 
  isMain = false, 
  isHover = false 
}: SongPlanetSphereProps) {
  const meshRef = useRef<Mesh>(null);
  
  // Create softer element-colored material
  const material = useMemo(() => {
    const baseColor = new Color(ELEMENT_COLORS[element]);
    
    // Soften the color by mixing with white and reducing saturation
    const softenedColor = baseColor.clone().lerp(new Color(0xffffff), 0.3);
    
    return {
      color: softenedColor,
      emissive: baseColor.clone().multiplyScalar(0.1), // Subtle emissive glow
      transparent: true,
      opacity: 0.85,
    };
  }, [element]);
  
  // Gentle rotation and hover effects
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Gentle self-rotation
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.x += 0.005;
    
    // Scale effects for interaction states
    const targetScale = isMain ? 1.3 : isHover ? 1.15 : 1.0;
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    meshRef.current.scale.setScalar(newScale);
    
    // Subtle pulsing for main/hover states
    if (isMain || isHover) {
      const pulse = 1 + Math.sin(time * 3) * 0.1;
      meshRef.current.scale.multiplyScalar(pulse);
    }
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial 
        color={material.color}
        emissive={material.emissive}
        transparent={material.transparent}
        opacity={material.opacity}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}