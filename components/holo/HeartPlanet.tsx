"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, DoubleSide } from "three";
import { useFrame } from "@react-three/fiber";
import { createHeartGeometry } from "@/lib/heartGeometry";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  
  console.log("🧡 HeartPlanet is rendering!");

  // Create the heart geometry
  const heartGeometry = useMemo(() => {
    return createHeartGeometry(3.2, 48, { 
      heartness: 1.4, 
      thicknessMultiplier: 1.8 
    });
  }, []);

  // Enhanced planet-like shader material with dramatic lighting
  const planetMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#FC54AF") },
        uLightColor: { value: new Color("#FFFFFF") },
        uDarkColor: { value: new Color("#AA2266") },
        uLightPos1: { value: [4, 6, 8] },
        uLightPos2: { value: [-3, 2, 5] },
        uLightPos3: { value: [0, -2, 6] },
        uRoughness: { value: 0.4 },
        uMetalness: { value: 0.1 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uLightColor;
        uniform vec3 uDarkColor;
        uniform vec3 uLightPos1;
        uniform vec3 uLightPos2;
        uniform vec3 uLightPos3;
        uniform float uRoughness;
        uniform float uMetalness;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // Enhanced noise functions
        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i.x + i.y * 57.0), hash(i.x + 1.0 + i.y * 57.0), u.x),
                     mix(hash(i.x + (i.y + 1.0) * 57.0), hash(i.x + 1.0 + (i.y + 1.0) * 57.0), u.x), u.y);
        }
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          
          // Multiple light sources for dramatic 3D effect
          vec3 lightDir1 = normalize(uLightPos1 - vWorldPosition);
          vec3 lightDir2 = normalize(uLightPos2 - vWorldPosition);
          vec3 lightDir3 = normalize(uLightPos3 - vWorldPosition);
          
          // Calculate lighting from multiple sources
          float diff1 = max(dot(normal, lightDir1), 0.0);
          float diff2 = max(dot(normal, lightDir2), 0.0) * 0.6;
          float diff3 = max(dot(normal, lightDir3), 0.0) * 0.4;
          float totalDiff = diff1 + diff2 + diff3;
          
          // Specular highlights
          vec3 reflectDir1 = reflect(-lightDir1, normal);
          float spec1 = pow(max(dot(viewDir, reflectDir1), 0.0), 32.0);
          
          // Fresnel rim lighting for 3D depth
          float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
          fresnel = pow(fresnel, 1.8);
          
          // Dynamic surface details
          vec2 surfaceUv = vUv * 6.0 + uTime * 0.05;
          float surfaceDetail = fbm(surfaceUv) * 0.3;
          float continents = fbm(vUv * 3.0) * 0.4;
          
          // Heart pulse effect
          float heartPulse = sin(uTime * 3.0) * 0.1 + 0.9;
          
          // Color mixing with enhanced contrast
          vec3 darkColor = mix(uDarkColor, uDarkColor * 0.5, continents);
          vec3 litColor = mix(uColor, uLightColor, totalDiff * 0.7);
          vec3 surfaceColor = mix(darkColor, litColor, totalDiff + surfaceDetail);
          
          // Add specular highlights
          surfaceColor += uLightColor * spec1 * 0.8;
          
          // Strong rim lighting for 3D pop
          vec3 rimColor = uColor * 4.0 * fresnel * heartPulse;
          surfaceColor += rimColor;
          
          // Emissive glow from within (much brighter)
          vec3 emissive = uColor * 1.2 * heartPulse;
          
          vec3 finalColor = surfaceColor + emissive;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: DoubleSide
    });
    return material;
  }, []);

  // Atmosphere material
  const atmosphereMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#FC54AF") }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(vNormal, viewDir));
          fresnel = pow(fresnel, 2.0);
          
          // Pulsing atmosphere (brighter)
          float pulse = sin(uTime * 2.0) * 0.4 + 1.0;
          
          vec3 atmosphereColor = uColor * 2.5 * fresnel * pulse;
          float alpha = fresnel * 0.8 * pulse;
          
          gl_FragColor = vec4(atmosphereColor, alpha);
        }
      `,
      transparent: true,
      side: 2 // DoubleSide
    });
    return material;
  }, []);

  // Animation loop
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Update shader uniforms
    if (planetMaterial.uniforms) {
      planetMaterial.uniforms.uTime.value = time;
    }
    if (atmosphereMaterial.uniforms) {
      atmosphereMaterial.uniforms.uTime.value = time;
    }
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.2;
      
      // Subtle heartbeat pulsing (less dramatic for planet-like appearance)
      const heartbeat = 1 + Math.sin(time * 3) * 0.05 + Math.sin(time * 6) * 0.02;
      meshRef.current.scale.setScalar(heartbeat);
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group position={[0, 0, 0]} scale={[1.0, 1.0, 1.0]}>
      {/* Main heart planet using proper heart geometry */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <primitive object={heartGeometry} />
        <primitive object={planetMaterial} />
      </mesh>
      
      {/* Atmospheric glow around heart planet */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.08, 1.08, 1.08]}>
        <primitive object={heartGeometry} />
        <primitive object={atmosphereMaterial} />
      </mesh>
      
      {/* Outer atmospheric halo */}
      <mesh position={[0, 0, 0]} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[3.8, 16, 16]} />
        <meshBasicMaterial
          color="#FC54AF"
          transparent
          opacity={0.15}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}