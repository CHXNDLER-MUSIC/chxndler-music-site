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
        
        // Subtle planetary displacement with heart-inspired features
        float heartDisplacement(vec3 position) {
          // Convert 3D position to spherical coordinates
          float phi = atan(position.z, position.x); 
          float theta = acos(position.y / length(position));
          
          // Create natural planetary variations with subtle heart influence
          float heartU = phi / (2.0 * 3.14159);
          float heartV = theta / 3.14159;
          
          // Very subtle heart-inspired continental patterns
          vec2 heart1 = vec2(heartU * 1.5 - 0.75, heartV * 1.5 - 0.75);
          float x1 = heart1.x * 0.4;
          float y1 = heart1.y * 0.4;
          float heartShape = pow(x1*x1 + y1*y1 - 0.3, 3.0) - x1*x1 * pow(y1, 3.0) * 0.2;
          
          // Create realistic planetary surface variations
          float continentalPattern = smoothstep(-0.1, 0.1, heartShape) * 0.008; // Very subtle
          
          // Add natural planetary noise for realistic terrain
          float naturalNoise = sin(phi * 8.0) * sin(theta * 6.0) * 0.005 +
                              sin(phi * 15.0) * sin(theta * 12.0) * 0.003;
          
          return continentalPattern + naturalNoise;
        }
        
        void main() {
          vec3 pos = position;
          
          // Add subtle heart-shaped displacement to the sphere using 3D position
          float displacement = heartDisplacement(normalize(position));
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
          
          // Realistic planetary surface details
          vec2 surfaceUv = vUv * 8.0 + uTime * 0.02;
          float surfaceDetail = fbm(surfaceUv) * 0.2;
          
          // Large-scale continental patterns using world position
          vec3 worldPos = normalize(vWorldPosition);
          float phi = atan(worldPos.z, worldPos.x);
          float theta = acos(worldPos.y);
          vec2 sphericalUv = vec2(phi / (2.0 * 3.14159), theta / 3.14159);
          
          // Large continental masses
          float continents1 = fbm(sphericalUv * 3.0) * 0.4;
          float continents2 = fbm((sphericalUv + vec2(0.5, 0.3)) * 2.5) * 0.3;
          float continents3 = fbm((sphericalUv + vec2(0.8, 0.1)) * 4.0) * 0.2;
          
          // Very subtle heart-inspired continental shapes (barely visible)
          vec2 heartUv = sphericalUv * 1.8 - 0.9;
          float x = heartUv.x * 0.3;
          float y = heartUv.y * 0.3;
          float heartShape = pow(x*x + y*y - 0.2, 3.0) - x*x * pow(y, 3.0) * 0.1;
          float heartPattern = smoothstep(-0.05, 0.05, heartShape) * 0.08; // Very subtle
          
          // Combine for realistic planetary appearance
          float continents = continents1 + continents2 + continents3 + heartPattern;
          
          // Add mountain ranges and geographic features
          float mountains = fbm(sphericalUv * 12.0) * 0.15;
          float oceanBasins = smoothstep(0.2, 0.6, continents) * 0.3;
          
          // Heart pulse effect
          float heartPulse = sin(uTime * 3.0) * 0.1 + 0.9;
          
          // Realistic planetary color mixing
          vec3 oceanColor = mix(uDarkColor, vec3(0.1, 0.3, 0.6), oceanBasins);
          vec3 landColor = mix(uColor * 0.8, vec3(0.4, 0.6, 0.3), continents);
          vec3 mountainColor = mix(landColor, vec3(0.6, 0.5, 0.4), mountains);
          
          vec3 baseColor = mix(oceanColor, mountainColor, continents + mountains);
          vec3 litColor = mix(baseColor, uLightColor, totalDiff * 0.5);
          vec3 surfaceColor = mix(baseColor * 0.3, litColor, totalDiff + surfaceDetail * 0.5);
          
          // Add specular highlights (reduced for planet appearance)
          surfaceColor += uLightColor * spec1 * 0.3;
          
          // Subtle atmospheric rim lighting
          vec3 rimColor = uColor * 2.0 * fresnel * heartPulse;
          surfaceColor += rimColor;
          
          // Gentle planetary glow (much reduced)
          vec3 emissive = uColor * 0.8 * heartPulse;
          
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
          
          // Intense solar atmosphere pulsing
          float pulse = sin(uTime * 2.0) * 0.8 + 1.6;
          float heartPulse = sin(uTime * 3.0) * 0.6 + 1.4;
          
          vec3 atmosphereColor = uColor * 75.0 * fresnel * pulse * heartPulse;
          float alpha = fresnel * 5.0 * pulse;
          
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
      
      {/* Subtle planetary atmosphere */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[heartRadius, 32, 16]} />
        <meshStandardMaterial 
          color="#FC54AF" 
          emissive="#FC54AF"
          emissiveIntensity={0.3}
          transparent 
          opacity={0.15}
        />
      </mesh>
      
      {/* Outer atmospheric glow - very subtle for realistic planet */}
      <mesh position={[0, 0, 0]} scale={[1.25, 1.25, 1.25]}>
        <sphereGeometry args={[heartRadius, 24, 12]} />
        <meshBasicMaterial 
          color="#FC54AF" 
          transparent 
          opacity={0.08} 
          side={2}
        />
      </mesh>
      
      {/* Planetary lighting - gentle illumination */}
      <ambientLight intensity={0.3} />
      <pointLight 
        position={[8, 6, 10]} 
        color="#FFFFFF" 
        intensity={2.0}
        distance={50}
        decay={0.5}
      />
      
      {/* Subtle heart-colored accent lighting */}
      <pointLight 
        position={[0, 0, 0]} 
        color="#FC54AF" 
        intensity={1.0}
        distance={15}
        decay={2.0}
      />
    </group>
  );
}
