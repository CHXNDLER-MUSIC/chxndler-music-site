"use client";

import React, { useRef, useMemo, useState } from "react";
import { Mesh, Color, AdditiveBlending, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { type Element, ELEMENT_COLORS } from "@/lib/planets";

interface SongPlanetProps {
  songId: string;
  title: string;
  element: Element;
  position: Vector3;
  size?: number;
  onClick?: () => void;
}

export default function SongPlanet({ 
  songId, 
  title, 
  element, 
  position, 
  size = 2,
  onClick = () => {}
}: SongPlanetProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Element color configuration
  const elementColor = useMemo(() => {
    const baseColor = ELEMENT_COLORS[element] || '#666666';
    return {
      base: baseColor,
      glow: element === 'heart' ? '#FFB8E6' : 
            element === 'water' ? '#8BDDFF' : 
            element === 'lightning' ? '#FFF966' : 
            element === 'darkness' ? '#6B2C91' : '#AAAAAA',
      dim: element === 'heart' ? '#AA1166' : 
           element === 'water' ? '#1177BB' : 
           element === 'lightning' ? '#CCAA00' : 
           element === 'darkness' ? '#441155' : '#444444'
    };
  }, [element]);

  // Orbital animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x += 0.01;
      
      // Subtle hover scaling
      const targetScale = hovered ? 1.2 : 1.0;
      meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.1);
    }
  });

  return (
    <group position={position}>
      {/* Main planet body */}
      <mesh 
        ref={meshRef}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={elementColor.base}
          emissive={elementColor.dim}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      
      {/* Subtle glow */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[size * 1.15, 16, 16]} />
        <meshBasicMaterial
          color={elementColor.glow}
          transparent
          opacity={hovered ? 0.4 : 0.2}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      
      {/* Hover text (song title) */}
      {hovered && (
        <group position={[0, size + 3, 0]}>
          {/* This would be replaced with a proper 3D text component if available */}
          <mesh>
            <planeGeometry args={[8, 2]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}