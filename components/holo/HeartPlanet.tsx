"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, DoubleSide, Euler, SphereGeometry } from "three";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  // Heart size baseline (used to scale geometry & glows) - made smaller
  const heartRadius = 2.0; // Smaller so it doesn't dominate the display
  
  // Log after defining radius to avoid ReferenceError during render
  console.log("🧡 HeartPlanet is rendering! Position: [0,0,0], Radius:", heartRadius);
  console.log("🧡 Using spherical geometry with heart displacement and enhanced glow layers");

  // Create spherical geometry with heart-shaped surface displacement in shader
  const heartGeometry = useMemo(() => {
    // Use a sphere as the base geometry for guaranteed roundness
    const geometry = new SphereGeometry(heartRadius, 64, 32);
    return geometry;
  }, [heartRadius]);

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
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // Heart-shaped displacement function
        float heartDisplacement(vec2 uv) {
          // Convert UV to heart coordinate space
          vec2 heartUv = (uv - 0.5) * 4.0; // Scale and center
          
          // Classic heart equation
          float x = heartUv.x;
          float y = -heartUv.y; // Flip Y for correct orientation
          float heart = pow(x*x + y*y - 1.0, 3.0) - x*x * pow(y, 3.0);
          
          // Create subtle displacement based on heart shape
          float displacement = smoothstep(-0.5, 0.5, heart) * 0.1;
          return displacement;
        }
        
        void main() {
          vec3 pos = position;
          
          // Add subtle heart-shaped displacement to the sphere
          float displacement = heartDisplacement(uv);
          pos += normal * displacement;
          
          // Add gentle pulsing
          float pulse = sin(uTime * 3.0) * 0.05 + 1.0;
          pos *= pulse;
          
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
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
          
          // Dynamic surface details with heart-shaped patterns
          vec2 surfaceUv = vUv * 6.0 + uTime * 0.05;
          float surfaceDetail = fbm(surfaceUv) * 0.3;
          
          // Enhanced heart-shaped continent patterns on spherical surface
          vec2 heartUv = vUv * 4.0 - 2.0; // Scale up for more heart patterns
          
          // Multiple heart shapes at different scales and positions
          float heartShape1 = pow(heartUv.x * heartUv.x + heartUv.y * heartUv.y - 0.5, 3.0) - 
                             heartUv.x * heartUv.x * pow(heartUv.y, 3.0);
          
          // Second heart pattern with offset
          vec2 heartUv2 = (vUv + vec2(0.3, 0.2)) * 3.0 - 1.5;
          float heartShape2 = pow(heartUv2.x * heartUv2.x + heartUv2.y * heartUv2.y - 0.4, 3.0) - 
                             heartUv2.x * heartUv2.x * pow(heartUv2.y, 3.0);
          
          // Third heart pattern with different offset
          vec2 heartUv3 = (vUv + vec2(-0.2, 0.4)) * 2.5 - 1.25;
          float heartShape3 = pow(heartUv3.x * heartUv3.x + heartUv3.y * heartUv3.y - 0.6, 3.0) - 
                             heartUv3.x * heartUv3.x * pow(heartUv3.y, 3.0);
          
          float heartPattern1 = smoothstep(-0.05, 0.05, heartShape1) * 0.8;
          float heartPattern2 = smoothstep(-0.03, 0.03, heartShape2) * 0.6;
          float heartPattern3 = smoothstep(-0.04, 0.04, heartShape3) * 0.7;
          
          // Combine heart patterns with base noise
          float continents = fbm(vUv * 3.0) * 0.3 + heartPattern1 + heartPattern2 + heartPattern3;
          
          // Heart pulse effect
          float heartPulse = sin(uTime * 3.0) * 0.1 + 0.9;
          
          // Color mixing with enhanced contrast
          vec3 darkColor = mix(uDarkColor, uDarkColor * 0.5, continents);
          vec3 litColor = mix(uColor, uLightColor, totalDiff * 0.7);
          vec3 surfaceColor = mix(darkColor, litColor, totalDiff + surfaceDetail);
          
          // Add specular highlights
          surfaceColor += uLightColor * spec1 * 0.8;
          
          // Strong rim lighting for 3D pop
          vec3 rimColor = uColor * 10.0 * fresnel * heartPulse;
          surfaceColor += rimColor;
          
          // Emissive glow from within (very bright)
          vec3 emissive = uColor * 12.0 * heartPulse;
          
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
          
          // Pulsing atmosphere (very bright)
          float pulse = sin(uTime * 2.0) * 0.4 + 1.0;
          float heartPulse = sin(uTime * 3.0) * 0.3 + 1.0;
          
          vec3 atmosphereColor = uColor * 15.0 * fresnel * pulse * heartPulse;
          float alpha = fresnel * 2.0 * pulse;
          
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
    <group position={[0, 0, 0]} scale={[0.8, 0.8, 0.8]} rotation={new Euler(0, 0, Math.PI)}>
      {/* Single core heart planet body with bright shader material */}
      <mesh ref={meshRef} position={[0, 0, 0]} geometry={heartGeometry}>
        <primitive object={planetMaterial} />
      </mesh>
      
      {/* Inner atmosphere glow layer */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[heartRadius, 32, 16]} />
        <primitive object={atmosphereMaterial} />
      </mesh>
      
      {/* Middle glow layer */}
      <mesh position={[0, 0, 0]} scale={[1.8, 1.8, 1.8]}>
        <sphereGeometry args={[heartRadius, 32, 16]} />
        <meshBasicMaterial 
          color="#FC54AF" 
          transparent 
          opacity={0.12} 
          side={2}
          blending={2}
        />
      </mesh>
      
      {/* Outer glow layer for extended light emission */}
      <mesh position={[0, 0, 0]} scale={[2.5, 2.5, 2.5]}>
        <sphereGeometry args={[heartRadius, 24, 12]} />
        <meshBasicMaterial 
          color="#FC54AF" 
          transparent 
          opacity={0.06} 
          side={2}
          blending={2}
        />
      </mesh>
      
      {/* Point light emanating from the heart planet */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#FC54AF" 
        intensity={2.5}
        distance={15}
        decay={2}
      />
    </group>
  );
}
