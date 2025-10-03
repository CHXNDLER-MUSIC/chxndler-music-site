"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, DoubleSide, Euler, SphereGeometry, AdditiveBlending } from "three";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  // Heart size baseline (used to scale geometry & glows) - made smaller
  const heartRadius = 2.0; // Smaller so it doesn't dominate the display
  
  // Log after defining radius to avoid ReferenceError during render
  // console.log("🧡 HeartPlanet is rendering! Position: [0,0,0], Radius:", heartRadius);
  // console.log("🧡 Using spherical geometry with heart displacement and enhanced glow layers");

  // Create spherical geometry with heart-shaped surface displacement in shader
  const heartGeometry = useMemo(() => {
    // Use a sphere as the base geometry for guaranteed roundness
    const geometry = new SphereGeometry(heartRadius, 64, 32);
    return geometry;
  }, [heartRadius]);

  // Bright emissive "sun" surface shader (procedural granulation)
  const planetMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#FC54AF") },
        uEmissiveIntensity: { value: 2.2 },
        uGranulation: { value: 3.0 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 pos = position;
          // Very subtle breathing to keep it lively but stable
          float pulse = 1.0 + sin(uTime * 1.8) * 0.015;
          pos *= pulse;

          vNormalW = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uEmissiveIntensity;
        uniform float uGranulation;
        
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        
        // Noise utilities
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
          vec3 n = normalize(vNormalW);
          vec3 v = normalize(cameraPosition - vWorldPosition);

          // Solar granulation using FBM on world position
          vec2 gUv = vec2(vWorldPosition.x, vWorldPosition.y) * uGranulation;
          float gran = fbm(gUv + uTime * 0.15) * 0.7 + fbm(gUv * 1.9 - uTime * 0.1) * 0.3;
          gran = smoothstep(0.2, 0.9, gran);

          // Make the center brighter than the rim
          float center = pow(max(dot(n, v), 0.0), 1.5);
          float flicker = 0.85 + 0.15 * sin(uTime * 8.0 + vWorldPosition.x * 2.0);

          vec3 color = uColor * (1.2 + 1.6 * gran) * center * uEmissiveIntensity * flicker;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      // FrontSide prevents backface lighting artifacts at grazing angles
      side: 0,
      transparent: false,
      depthWrite: true,
      depthTest: true
    });
    return material;
  }, []);

  // Atmosphere material
  const atmosphereMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#FC54AF") },
        uStrength: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        
        void main() {
          // Compute world-space normal and position for correct view direction
          vNormalW = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uStrength;
        
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        
        void main() {
          // Correct view direction in world space
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = 1.0 - abs(dot(normalize(vNormalW), viewDir));
          fresnel = pow(fresnel, 2.0);
           
          // Stronger solar atmosphere pulsing
          float pulse = sin(uTime * 2.0) * 0.8 + 1.6;
          float heartPulse = sin(uTime * 3.0) * 0.6 + 1.4;
           
          vec3 atmosphereColor = uColor * 120.0 * fresnel * pulse * heartPulse * uStrength;
          float alpha = fresnel * 0.9; // additive blending; alpha acts as weight
           
          gl_FragColor = vec4(atmosphereColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      // BackSide for a clean halo silhouette without inner-face artifacts
      side: 1
    });
    // Keep additive layers out of tone mapping to preserve intensity
    (material as any).toneMapped = false;
    return material;
  }, []);

  // Inner frontside glow to brighten the core towards camera
  const innerGlowMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color("#FF77C6") },
        uIntensity: { value: 2.0 }
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        void main(){
          vNormalW = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position,1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        void main(){
          vec3 v = normalize(cameraPosition - vWorldPosition);
          float center = pow(max(dot(normalize(vNormalW), v), 0.0), 3.0);
          vec3 c = uColor * uIntensity * center;
          gl_FragColor = vec4(c, center);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: 0
    });
    (material as any).toneMapped = false;
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
    if (innerGlowMaterial.uniforms) {
      innerGlowMaterial.uniforms.uTime.value = time;
    }
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.15;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group position={[0, 0, 0]} scale={[0.85, 0.85, 0.85]}>
      {/* Single core heart planet body with bright shader material */}
      <mesh ref={meshRef} position={[0, 0, 0]} geometry={heartGeometry}>
        <primitive object={planetMaterial} />
      </mesh>

      {/* Inner frontside glow overlay */}
      <mesh position={[0, 0, 0]} scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[heartRadius, 64, 32]} />
        <primitive object={innerGlowMaterial} />
      </mesh>
      
      {/* Stronger solar corona (additive, backface only) */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.25, 1.25, 1.25]}>
        <sphereGeometry args={[heartRadius, 32, 16]} />
        <primitive object={atmosphereMaterial} />
      </mesh>
      
      {/* Outer far glow (very soft) */}
      <mesh position={[0, 0, 0]} scale={[1.55, 1.55, 1.55]}>
        <sphereGeometry args={[heartRadius, 24, 12]} />
        <meshBasicMaterial
          color="#FC54AF"
          transparent
          opacity={0.04}
          depthWrite={false}
          blending={AdditiveBlending}
          side={1}
        />
      </mesh>
      
      {/* Planetary lighting - gentle illumination */}
      <ambientLight intensity={0.1} />
      {/* Keep an external white light subtle so emissive dominates */}
      <pointLight position={[8, 6, 10]} color="#FFFFFF" intensity={0.6} distance={50} decay={0.5} />
      
      {/* Subtle heart-colored accent lighting */}
      <pointLight position={[0, 0, 0]} color="#FC54AF" intensity={1.5} distance={18} decay={2.0} />
    </group>
  );
}
