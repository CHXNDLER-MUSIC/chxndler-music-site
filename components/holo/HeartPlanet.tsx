"use client";

import React, { useRef, useMemo } from "react";
import { Mesh, ShaderMaterial, Color, AdditiveBlending, BackSide, Vector3 } from "three";
import { createHeartGeometry } from "../../lib/heartGeometry";
import { useFrame } from "@react-three/fiber";

export default function HeartPlanet() {
  const meshRef = useRef<Mesh>(null);
  const atmosphereRef = useRef<Mesh>(null);
  const cloudShellRef = useRef<Mesh>(null);
  // Planet size baseline (used to scale geometry & glows)
  const planetRadius = 2.0;

  // Create heart geometry
  const heartGeometry = useMemo(() => {
    return createHeartGeometry(planetRadius * 2, 64, { 
      heartness: 0.75, // even rounder silhouette
      thicknessMultiplier: 1.15 // fuller body
    });
  }, [planetRadius]);

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
        uGloss: { value: 220.0 },
        uRoughness: { value: 0.34 },
        // Surface relief + micro detail (stronger for richer texture)
        uBumpStrength: { value: 1.9 },
        uMicroScale: { value: 16.0 },
        uMicroStrength: { value: 0.5 },
        uRoughVar: { value: 0.6 },
        // Subtle body glow to feel alive like holographic planets
        uHeartGlowColor: { value: new Color("#FC54AF") },
        uHeartGlowStrength: { value: 0.45 },
        // Noise controls
        uScale: { value: 0.85 },
        uDetail: { value: 3.5 },
        uCloudScale: { value: 1.4 },
        uCloudStrength: { value: 0.55 },
        // Night lights color
        uCityColor: { value: new Color("#ffd398") },
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
        uniform float uBumpStrength;
        uniform float uMicroScale;
        uniform float uMicroStrength;
        uniform float uRoughVar;
        uniform vec3 uHeartGlowColor;
        uniform float uHeartGlowStrength;
        uniform float uScale;
        uniform float uDetail;
        uniform float uCloudScale;
        uniform float uCloudStrength;
        uniform vec3 uCityColor;
        
        varying vec3 vNormalW;
        varying vec3 vWorldPosition;
        varying vec3 vViewDir;
        
        // 3D value noise + fbm for seamless planet features
        float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453123); }
        float noise3(vec3 x){
          vec3 i = floor(x);
          vec3 f = fract(x);
          float n000 = hash3(i + vec3(0.0,0.0,0.0));
          float n100 = hash3(i + vec3(1.0,0.0,0.0));
          float n010 = hash3(i + vec3(0.0,1.0,0.0));
          float n110 = hash3(i + vec3(1.0,1.0,0.0));
          float n001 = hash3(i + vec3(0.0,0.0,1.0));
          float n101 = hash3(i + vec3(1.0,0.0,1.0));
          float n011 = hash3(i + vec3(0.0,1.0,1.0));
          float n111 = hash3(i + vec3(1.0,1.0,1.0));
          vec3 u = f*f*(3.0-2.0*f);
          float nx00 = mix(n000, n100, u.x);
          float nx10 = mix(n010, n110, u.x);
          float nx01 = mix(n001, n101, u.x);
          float nx11 = mix(n011, n111, u.x);
          float nxy0 = mix(nx00, nx10, u.y);
          float nxy1 = mix(nx01, nx11, u.y);
          return mix(nxy0, nxy1, u.z);
        }
        float fbm3(vec3 p){
          float v = 0.0;
          float a = 0.5;
          for(int i=0;i<6;i++){
            v += a * noise3(p);
            p *= 2.0; a *= 0.5;
          }
          return v;
        }
        float ridge3(vec3 p){
          float n = fbm3(p);
          return 1.0 - abs(2.0*n - 1.0);
        }

        // Planet domain based on world position (stable across shape)
        vec3 domain(vec3 wp){
          return wp * uScale;
        }
        float terrainFBM(vec3 p, float time){
          float b = fbm3(p + vec3(0.0, 0.0, time*0.02));
          float d = fbm3(p * (2.0 + uDetail) - vec3(0.0, 0.0, time*0.03));
          return mix(b, d, 0.45);
        }
        float landMaskAt(vec3 p, float time){
          float t = terrainFBM(p, time);
          return smoothstep(0.47, 0.53, t);
        }
        float landHeightAt(vec3 p){
          float t = terrainFBM(p, uTime);
          float m = ridge3(p * 3.0 + 12.0);
          return mix(t, m, 0.6);
        }
        float oceanRipplesAt(vec3 p){
          return fbm3(p * 2.5 + vec3(0.0, 0.0, uTime * 0.07)) * 0.4;
        }
        float heightAt(vec3 p){
          float lm = landMaskAt(p, uTime);
          return mix(oceanRipplesAt(p), landHeightAt(p), lm);
        }
        
        void main(){
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uLightDir);
          vec3 V = normalize(vViewDir);
          vec3 H = normalize(L + V);
          
          // Domain
          vec3 P = domain(vWorldPosition);
          float base = fbm3(P + vec3(0.0, 0.0, uTime*0.02));
          float detail = fbm3(P * (2.0 + uDetail) - vec3(0.0, 0.0, uTime*0.03));
          float terrain = mix(base, detail, 0.45);
          float landMask = smoothstep(0.46, 0.54, terrain);
          float mountains = ridge3(P * 3.0 + 12.0);

          // Height field (blend ocean ripples and land mountains)
          float oceanRipples = oceanRipplesAt(P);
          float landHeight = mix(terrain, mountains, 0.6);
          float height = mix(oceanRipples, landHeight, landMask);

          // Orthonormal basis from N to sample gradients in tangent space
          vec3 up = abs(N.y) < 0.999 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
          vec3 T = normalize(cross(up, N));
          vec3 B = normalize(cross(N, T));
          float eps = 0.004;
          float hL = heightAt(P - eps * T);
          float hR = heightAt(P + eps * T);
          float hD = heightAt(P - eps * B);
          float hU = heightAt(P + eps * B);
          float dHT = (hR - hL);
          float dHB = (hU - hD);
          vec3 bumpN = normalize(N + uBumpStrength * (dHT * T + dHB * B));
          // Secondary micro-bump at higher frequency
          float mhL = heightAt(P * 12.0 - eps * T);
          float mhR = heightAt(P * 12.0 + eps * T);
          float mhD = heightAt(P * 12.0 - eps * B);
          float mhU = heightAt(P * 12.0 + eps * B);
          float mdHT = (mhR - mhL);
          float mdHB = (mhU - mhD);
          bumpN = normalize(bumpN + 0.35 * uMicroStrength * (mdHT * T + mdHB * B));
          
          // Land color gradient
          vec3 land = mix(uLandLow, uLandHigh, clamp(mountains * 1.15, 0.0, 1.0));
          // Subtle color variation for land to avoid flat regions
          float landVar = fbm3(P * 4.0 + 7.3);
          land *= mix(0.92, 1.08, landVar);
          vec3 ocean = uOcean;
          vec3 albedo = mix(ocean, land, landMask);

          // Simple lambert + blinn-phong
          float diff = max(dot(bumpN, L), 0.0);
          // Micro-normal affects roughness for sparkle on oceans and soft land
          float micro = fbm3(P * uMicroScale + vec3(0.0, 0.0, uTime * 0.1));
          float rough = clamp(uRoughness + uRoughVar * (1.0 - micro) * (1.0 - landMask) - uMicroStrength * landMask * 0.25, 0.06, 1.0);
          float shininess = mix(64.0, uGloss, (1.0 - rough));
          // Specular mostly on oceans, with Schlick fresnel
          float oceanFactor = 1.0 - landMask;
          float spec = pow(max(dot(bumpN, H), 0.0), shininess) * oceanFactor;
          float F0 = 0.02; // water
          float fresSpec = F0 + (1.0 - F0) * pow(1.0 - max(dot(bumpN, V), 0.0), 5.0);
          spec *= mix(0.7, 1.0, fresSpec);

          // Heart glow veins: subtle high-frequency ridge noise on land that emits softly
          float veins = ridge3(P * 18.0 + 21.0);
          veins = smoothstep(0.7, 0.95, veins) * landMask; // only on land

          // Very soft ambient and night boost so the night side isn't pitch black
          float ambient = 0.2;
          float nightBoost = 0.08;
          float lightAmt = diff + ambient;
          // Cheap AO from height to darken creases
          float ao = mix(0.88, 1.0, smoothstep(0.2, 0.8, height));
          // Albedo micro-variation for extra texture
          float albVar = fbm3(P * 9.0 + 13.7);
          vec3 albedoVar = albedo * mix(0.9, 1.12, albVar);
          vec3 color = albedoVar * lightAmt * ao + uSpecular * spec * 0.8 + albedoVar * nightBoost * (1.0 - diff);

          // Night lights on dark side over land
          float nightSide = step(0.0, dot(-L, bumpN));
          float cities = smoothstep(0.94, 0.98, fbm3(P * 24.0 + vec3(11.0, 7.0, 3.0)));
          cities *= landMask * nightSide * (1.0 - diff);
          color += uCityColor * cities * 0.9;

          // Subtle body fresnel glow to match holographic feel (with gentle pulse)
          float fres = pow(1.0 - abs(dot(normalize(bumpN), V)), 2.2);
          float glowPulse = 0.88 + 0.22 * sin(uTime * 2.2);
          color += uHeartGlowColor * (uHeartGlowStrength * glowPulse * fres);
          // Add gentle emissive veins
          color += uHeartGlowColor * (0.12 * veins);

          // Subtle animated cloud veil (additive, brightens day side slightly)
          float clouds = fbm3(P * uCloudScale + vec3(0.0,0.0,uTime*0.03));
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
        uStrength: { value: 10.0 }
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
           
          float rim = pow(fresnel, 1.35);
          vec3 atmosphereColor = uColor * 420.0 * rim * pulse * heartPulse * uStrength;
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
        uIntensity: { value: 12.0 }
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
          float center = pow(max(dot(normalize(vNormalW), v), 0.0), 2.0);
          float pulse = 0.9 + 0.25 * sin(uTime * 2.4 + 1.0);
          vec3 c = uColor * uIntensity * center * pulse;
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

  // High-altitude cloud shell material (separate rotating layer for parallax)
  const cloudShellMaterial = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color('#FFFFFF') },
        uOpacity: { value: 0.35 },
        uScale: { value: 2.2 },
        uSpeed: { value: 0.025 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormalW;
        void main(){
          vNormalW = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uScale;
        uniform float uSpeed;
        varying vec3 vWorldPosition;
        varying vec3 vNormalW;
        
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
          for(int i=0;i<5;i++){ v += a*noise(p); p*=2.0; a*=0.5; }
          return v;
        }
        
        void main(){
          // Project into a stable 2D domain using world XZ
          vec2 uv = vWorldPosition.xz * uScale;
          float t = uTime * uSpeed;
          // Billowy clouds
          float c1 = fbm(uv + vec2(t, 0.0));
          float c2 = fbm(uv * 1.7 - vec2(0.0, t*1.3));
          float clouds = smoothstep(0.58, 0.9, mix(c1, c2, 0.5));
          // Fade near edges for a shell-like feel (fresnel)
          float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorldPosition))), 1.8);
          float alpha = clouds * (0.65 + 0.6*fres) * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
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
    if (cloudShellMaterial.uniforms) {
      cloudShellMaterial.uniforms.uTime.value = time;
    }
    // no billboard uniforms
    
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.y += delta * 0.12;
    }
    
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.15;
    }
    if (cloudShellRef.current) {
      cloudShellRef.current.rotation.y += delta * 0.08;
    }
    
    // removed billboard sizing
    // Ensure continuous animation in demand frameloop
    state.invalidate();
  });

  return (
    <group position={[0, 0, 0]} scale={[1.3, 1.3, 1.3]}>
      {/* Core heart with realistic shading */}
      <mesh ref={meshRef} position={[0, 0, 0]} renderOrder={1}>
        <primitive object={heartGeometry} />
        <primitive object={planetMaterial} />
      </mesh>

      {/* Inner frontside glow overlay (subtle) */}
      <mesh position={[0, 0, 0]} scale={[1.1, 1.1, 1.1]} renderOrder={5}>
        <primitive object={heartGeometry} />
        <primitive object={innerGlowMaterial} />
      </mesh>

      {/* Rotating cloud shell for added depth */}
      <mesh ref={cloudShellRef} position={[0, 0, 0]} scale={[1.08, 1.08, 1.08]} renderOrder={5}>
        <primitive object={heartGeometry} />
        <primitive object={cloudShellMaterial} />
      </mesh>
      
      {/* Atmosphere corona (additive, backface only) */}
      <mesh ref={atmosphereRef} position={[0, 0, 0]} scale={[1.6, 1.6, 1.6]} renderOrder={6}>
        <primitive object={heartGeometry} />
        <primitive object={atmosphereMaterial} />
      </mesh>

      {/* Outer far glow (very soft) */}
      <mesh position={[0, 0, 0]} scale={[2.6, 2.6, 2.6]} renderOrder={7}>
        <primitive object={heartGeometry} />
        <meshBasicMaterial
          color="#FC54AF"
          transparent
          opacity={0.55}
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          side={2}
          toneMapped={false as any}
        />
      </mesh>
      
      {/* Planetary lighting - gentle illumination */}
      <ambientLight intensity={0.2} />
      {/* Keep an external white light subtle so emissive dominates */}
      <pointLight position={[8, 6, 10]} color="#FFFFFF" intensity={0.8} distance={50} decay={0.5} />
      
      {/* Bright heart-colored accent lighting */}
      <pointLight position={[0, 0, 0]} color="#FC54AF" intensity={12.0} distance={28} decay={1.6} />
      
      {/* Additional bright core light for extra glow */}
      <pointLight position={[0, 0, 2]} color="#FF77C6" intensity={9.0} distance={22} decay={2.0} />
      <pointLight position={[0, 0, -2]} color="#FF44B8" intensity={9.0} distance={22} decay={2.0} />
    </group>
  );
}
