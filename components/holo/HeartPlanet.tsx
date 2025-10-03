"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, AdditiveBlending, BackSide, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  // Planet size baseline (used to scale geometry & glows)
  const planetRadius = 2.0;

  // Textured, lit planet shader (procedural continents/oceans + specular)
  const planetMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // Colors: tweak for a heart-tinged world while staying realistic
        uOcean: { value: new Color("#1b3d6e") },
        uLandLow: { value: new Color("#3d915f") },
        uLandHigh: { value: new Color("#c4b08a") },
        uSpecular: { value: new Color("#a9c9ff") },
        // Lighting
        uLightDir: { value: new Vector3(3, 6, 5).normalize() },
        uGloss: { value: 128.0 },
        uRoughness: { value: 0.5 },
        // Noise controls
        uScale: { value: 0.55 }, // continent scale
        uDetail: { value: 2.2 },
        uCloudScale: { value: 1.2 },
        uCloudStrength: { value: 0.25 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        varying vec3 vViewDir;
        
        void main() {
          vec3 pos = position;
          // Gentle rotation wobble to keep it lively but not pulsing in size
          vNormalW = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          vViewDir = normalize(cameraPosition - vWorldPosition);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uOcean;
        uniform vec3 uLandLow;
        uniform vec3 uLandHigh;
        uniform vec3 uSpecular;
        uniform vec3 uLightDir;
        uniform float uGloss;
        uniform float uRoughness;
        uniform float uScale;
        uniform float uDetail;
        uniform float uCloudScale;
        uniform float uCloudStrength;
        
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        varying vec3 vViewDir;
        
        // Basic hash and noise
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float noise(vec2 x){
          vec2 i = floor(x);
          vec2 f = fract(x);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
        }
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          for(int i=0;i<6;i++){
            v += a * noise(p);
            p *= 2.0; a *= 0.5;
          }
          return v;
        }
        float ridge(vec2 p){
          float n = fbm(p);
          return 1.0 - abs(2.0*n - 1.0);
        }
        
        void main(){
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uLightDir);
          vec3 V = normalize(vViewDir);
          vec3 H = normalize(L + V);
          
          // Generate continents/oceans in world space for stability
          vec2 uv = vWorldPosition.xz * uScale;
          float base = fbm(uv + vec2(0.0, uTime*0.01));
          float detail = fbm(uv * (2.0 + uDetail) - vec2(0.0, uTime*0.02));
          float terrain = mix(base, detail, 0.45);
          // Sharpen to make clear land/ocean boundaries
          float landMask = smoothstep(0.47, 0.53, terrain);
          // Mountains on land using ridge noise
          float mountains = ridge(uv * 3.0 + 12.0);
          
          // Land color gradient
          vec3 land = mix(uLandLow, uLandHigh, clamp(mountains * 1.2, 0.0, 1.0));
          vec3 ocean = uOcean;
          vec3 albedo = mix(ocean, land, landMask);
          
          // Simple lambert + blinn-phong
          float diff = max(dot(N, L), 0.0);
          float shininess = mix(64.0, uGloss, (1.0 - uRoughness));
          // Specular mostly on oceans
          float oceanFactor = 1.0 - landMask;
          float spec = pow(max(dot(N, H), 0.0), shininess) * oceanFactor;
          
          // Very soft ambient and night boost so the night side isn't pitch black
          float ambient = 0.18;
          float nightBoost = 0.06;
          float lightAmt = diff + ambient;
          vec3 color = albedo * lightAmt + uSpecular * spec * 0.6 + albedo * nightBoost * (1.0 - diff);
          
          // Subtle animated cloud veil (additive, brightens day side slightly)
          float clouds = fbm(vWorldPosition.xy * uCloudScale + uTime*0.03);
          clouds = smoothstep(0.65, 0.93, clouds);
          color += vec3(1.0) * clouds * uCloudStrength * diff;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      // FrontSide
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
        uStrength: { value: 1.6 }
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
           
          // Moderate pulsing
          float pulse = sin(uTime * 2.0) * 0.35 + 1.2;
          float heartPulse = sin(uTime * 3.0) * 0.25 + 1.1;
           
          float rim = pow(fresnel, 1.4);
          vec3 atmosphereColor = uColor * 180.0 * rim * pulse * heartPulse * uStrength;
          float alpha = rim; // additive blending; alpha acts as weight
          
          gl_FragColor = vec4(atmosphereColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      // Use BackSide on a scaled mesh to create a halo around the silhouette
      side: BackSide
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
        uIntensity: { value: 1.5 }
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
          float center = pow(max(dot(normalize(vNormalW), v), 0.0), 2.2);
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
    // no billboard uniforms
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.12;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.15;
    }
    
    // removed billboard sizing
  });

  return (
    <group position={[0, 0, 0]} scale={[0.9, 0.9, 0.9]}>
      {/* Core sphere with realistic shading */}
      <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={1}>
        <sphereGeometry args={[planetRadius, 128, 64]} />
        <primitive object={planetMaterial} />
      </mesh>

      {/* Inner frontside glow overlay (subtle) */}
      <mesh position={[0, 0, 0]} scale={[1.04, 1.04, 1.04]} renderOrder={5}>
        <sphereGeometry args={[planetRadius, 64, 32]} />
        <primitive object={innerGlowMaterial} />
      </mesh>
      
      {/* Atmosphere corona (additive, backface only) */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.5, 1.5, 1.5]} renderOrder={6}>
        <sphereGeometry args={[planetRadius, 64, 32]} />
        <primitive object={atmosphereMaterial} />
      </mesh>

      {/* Outer far glow (very soft) */}
      <mesh position={[0, 0, 0]} scale={[2.3, 2.3, 2.3]} renderOrder={7}>
        <sphereGeometry args={[planetRadius, 32, 16]} />
        <meshBasicMaterial
          color="#FC54AF"
          transparent
          opacity={0.12}
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          side={2}
          toneMapped={false as any}
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
