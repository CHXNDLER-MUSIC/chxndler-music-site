"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, AdditiveBlending, TextureLoader } from "three";
import * as THREE from "three";
import { ELEMENT_STYLES, ElementKey } from "@/utils/planetStyles";
import { getElementalPlanetTexture } from "@/lib/elementalPlanets";
import { applyHologramGrid, setGridTime } from "@/utils/hologramGrid";

interface StyledElementPlanetProps {
  elementKey: ElementKey;
  position: [number, number, number];
  radius?: number;
}

export default function StyledElementPlanet({ 
  elementKey, 
  position,
  radius = 1.5
}: StyledElementPlanetProps) {
  console.log(`🌍 Rendering StyledElementPlanet: ${elementKey} at position:`, position, `radius: ${radius}`);
  
  const planetRef = useRef<Mesh>(null);
  const planetMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const glowRef = useRef<Mesh>(null);
  const time = useRef(0);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  const styles = ELEMENT_STYLES[elementKey];
  console.log(`🎨 Element styles for ${elementKey}:`, styles);

  // Load the appropriate texture for each element
  useEffect(() => {
    const textureLoader = new TextureLoader();
    const texturePath = getElementalPlanetTexture(elementKey);
    
    console.log(`🖼️ Loading texture for ${elementKey}: ${texturePath}`);
    
    if (texturePath) {
      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
          console.log(`✅ Successfully loaded texture for ${elementKey}`);
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load texture for ${elementKey}:`, error);
        }
      );
    }
  }, [elementKey]);
  
  // Different animation behaviors per element
  const animations = useMemo(() => {
    switch (elementKey) {
      case "heart":
        return {
          pulse: true,
          flicker: false,
          fresnel: false,
          baseEmissive: 1.2,
          maxEmissive: 1.8
        };
      case "lightning":
        return {
          pulse: false,
          flicker: true,
          fresnel: false,
          baseEmissive: 1.0,
          maxEmissive: 2.0
        };
      case "darkness":
        return {
          pulse: false,
          flicker: false,
          fresnel: true,
          baseEmissive: 0.1,
          maxEmissive: 0.3
        };
      default: // water
        return {
          pulse: false,
          flicker: false,
          fresnel: false,
          baseEmissive: 1.0,
          maxEmissive: 1.0
        };
    }
  }, [elementKey]);
  
  useFrame((state) => {
    time.current = state.clock.elapsedTime;
    // Update shared grid time uniform from this scene clock
    setGridTime(time.current);
    
    if (!planetRef.current) return;
    
    const material = planetRef.current.material as any;
    
    if (animations.pulse) {
      // Heart: gentle pulsing
      const pulse = Math.sin(time.current * 2) * 0.3 + 0.7;
      material.emissiveIntensity = animations.baseEmissive * pulse;
    } else if (animations.flicker) {
      // Lightning: quick flicker variation
      const flicker = Math.sin(time.current * 8) * 0.5 + 
                     Math.sin(time.current * 15) * 0.3 + 
                     Math.sin(time.current * 23) * 0.2;
      material.emissiveIntensity = animations.baseEmissive + Math.abs(flicker) * 0.8;
    } else if (animations.fresnel) {
      // Darkness: very subtle intensity variation
      const subtle = Math.sin(time.current * 0.5) * 0.1 + 0.9;
      material.emissiveIntensity = animations.baseEmissive * subtle;
    }
    
    // Slow rotation for all element planets
    planetRef.current.rotation.y += 0.005;
  });

  // Attach hologram grid overlay to the planet's material
  useEffect(() => {
    if (planetMatRef.current) {
      applyHologramGrid(planetMatRef.current);
      planetMatRef.current.needsUpdate = true;
    }
  }, []);
  
  return (
    <group position={position}>
      {/* Background glow */}
      <mesh ref={glowRef} renderOrder={2}>
        <sphereGeometry args={[radius * 2.5, 16, 16]} />
        <meshBasicMaterial
          color={styles.innerGlow}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      
      {/* Main element planet */}
      <mesh ref={planetRef} renderOrder={1}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          ref={planetMatRef as any}
          map={texture}
          color={texture ? "#ffffff" : styles.coreColor}
          emissive={elementKey === "darkness" ? styles.rimColor : styles.innerGlow}
          emissiveIntensity={texture ? animations.baseEmissive * 0.5 : animations.baseEmissive}
          roughness={elementKey === "darkness" ? 0.1 : 0.3}
          metalness={elementKey === "darkness" ? 0.8 : 0.2}
          transparent={false}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>
      
      {/* Rim highlight for darkness */}
      {elementKey === "darkness" && (
        <mesh renderOrder={1}>
          <sphereGeometry args={[radius * 1.02, 32, 32]} />
          <meshBasicMaterial
            color={styles.rimColor}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
