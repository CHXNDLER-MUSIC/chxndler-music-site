"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Sprite, SpriteMaterial, CanvasTexture } from "three";
import { ELEMENT_STYLES, ElementKey, GateState } from "@/utils/planetStyles";

interface StyledSongPlanetProps {
  gateState: GateState;
  elementKey: ElementKey;
  position: [number, number, number];
  radius?: number;
  song?: any;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export default function StyledSongPlanet({ 
  gateState, 
  elementKey, 
  position, 
  radius = 0.4,
  song,
  onClick,
  onHover
}: StyledSongPlanetProps) {
  const groupRef = useRef<any>(null);
  const planetRef = useRef<Mesh>(null);
  const outlineRef = useRef<Mesh>(null);
  const sparkleRef = useRef<any>(null);
  
  const elementStyles = ELEMENT_STYLES[elementKey];
  
  // Create lock icon texture for locked state
  const lockTexture = useMemo(() => {
    if (gateState !== "lockedTier") return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Draw simple lock icon
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', 16, 24);
    
    return new CanvasTexture(canvas);
  }, [gateState]);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Gentle hover scale animation
    const time = state.clock.elapsedTime;
    
    if (gateState === "owned" && sparkleRef.current) {
      // Rotate sparkle ring for owned cards
      sparkleRef.current.rotation.z = time * 2;
    }
    
    // Subtle floating motion
    groupRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.05;
  });
  
  // Handle interactions
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (gateState === "available" || gateState === "owned") {
      onClick?.();
    }
  };
  
  const handlePointerOver = () => {
    onHover?.(true);
    if (gateState === "available" || gateState === "owned") {
      document.body.style.cursor = 'pointer';
    }
  };
  
  const handlePointerOut = () => {
    onHover?.(false);
    document.body.style.cursor = 'auto';
  };
  
  // Render different states
  if (gateState === "comingSoon") {
    return (
      <group 
        ref={groupRef} 
        position={[position[0], position[1], position[2]]}
      >
        {/* Ghost planet */}
        <mesh renderOrder={3}>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshStandardMaterial
            color="#3A3A3A"
            emissive="#000000"
            transparent
            opacity={0.6}
            depthWrite={true}
          />
        </mesh>
        
        {/* Element color outline */}
        <mesh renderOrder={3}>
          <sphereGeometry args={[radius * 1.05, 16, 16]} />
          <meshBasicMaterial
            color={elementStyles.coreColor}
            wireframe
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }
  
  if (gateState === "lockedTier") {
    return (
      <group 
        ref={groupRef} 
        position={[position[0], position[1], position[2]]}
      >
        {/* Dimmed planet */}
        <mesh renderOrder={3}>
          <sphereGeometry args={[radius, 20, 20]} />
          <meshStandardMaterial
            color={elementStyles.rimColor}
            emissive={elementStyles.rimColor}
            emissiveIntensity={0.3}
            depthWrite={true}
          />
        </mesh>
        
        {/* Lock dome */}
        <mesh renderOrder={3}>
          <sphereGeometry args={[radius * 1.15, 16, 16]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            transparent
            opacity={0.25}
            wireframe
            depthWrite={false}
          />
        </mesh>
        
        {/* Lock icon sprite */}
        {lockTexture && (
          <sprite 
            position={[0, radius * 1.5, 0]} 
            scale={[0.3, 0.3, 0.3]}
            renderOrder={4}
          >
            <spriteMaterial 
              map={lockTexture} 
              transparent 
              depthWrite={false}
            />
          </sprite>
        )}
      </group>
    );
  }
  
  if (gateState === "available") {
    return (
      <group 
        ref={groupRef} 
        position={[position[0], position[1], position[2]]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Available planet */}
        <mesh ref={planetRef} renderOrder={3}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            emissive={elementStyles.innerGlow}
            emissiveIntensity={1.0}
            depthWrite={true}
          />
        </mesh>
        
        {/* Optional: orbit ring */}
        <mesh renderOrder={3}>
          <ringGeometry args={[radius * 1.3, radius * 1.35, 16]} />
          <meshBasicMaterial
            color={elementStyles.coreColor}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }
  
  if (gateState === "owned") {
    return (
      <group 
        ref={groupRef} 
        position={[position[0], position[1], position[2]]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Owned planet - enhanced */}
        <mesh ref={planetRef} renderOrder={3}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial
            color={elementStyles.coreColor}
            emissive={elementStyles.innerGlow}
            emissiveIntensity={1.3}
            depthWrite={true}
          />
        </mesh>
        
        {/* Gold/white outline */}
        <mesh ref={outlineRef} renderOrder={3}>
          <sphereGeometry args={[radius * 1.1, 16, 16]} />
          <meshBasicMaterial
            color="#FFFFFF"
            wireframe
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
        
        {/* Sparkle ring */}
        <group ref={sparkleRef}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * radius * 1.5;
            const z = Math.sin(angle) * radius * 1.5;
            return (
              <mesh key={i} position={[x, 0, z]} renderOrder={4}>
                <sphereGeometry args={[0.02, 4, 4]} />
                <meshBasicMaterial
                  color="#FFFFFF"
                  emissive="#FFFFFF"
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}
        </group>
      </group>
    );
  }
  
  // Fallback
  return null;
}