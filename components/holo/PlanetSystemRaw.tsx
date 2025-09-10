"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { computePlanetLayout } from "@/lib/planetLayout";
import type { PlanetType, WeatherSystem, PlanetGeometry } from "@/lib/planets";

type Sat = {
  id: string;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  r: number;
  speed: number;
  a: number;
  baseRadius: number;
  atmosphereMesh?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  moons: THREE.Mesh[];
  planetType: PlanetType;
  cloudLayers: THREE.Mesh[];
  stormSystems: {
    mesh: THREE.Mesh;
    type: string;
    intensity: number;
    duration: number;
    age: number;
    active: boolean;
  }[];
  weatherData?: WeatherSystem;
};

export default function PlanetSystemRaw() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const satsRef = useRef<Sat[]>([]);
  const mainRef = useRef<{ id: string | null; mesh: THREE.Mesh | null; ring: THREE.Mesh | null }>({ id: null, mesh: null, ring: null });
  const ringsRef = useRef<THREE.Group[]>([]);
  const sweepUniforms = useRef<{ uTime: { value: number } } | null>(null);
  // Focus logic: rotate system to bring selected planet to front-center
  const focusTargetRy = useRef<number | null>(null);
  const spinSpeedRef = useRef<number>(0.0025);
  // Central planet system: selected planet becomes stationary at center
  const centralPlanetRef = useRef<{ id: string | null; mesh: THREE.Mesh | null; originalSat: Sat | null }>({ id: null, mesh: null, originalSat: null });

  // Create realistic planet material based on planet type and properties
  function makePlanetMaterial(planetData: any) {
    const color = new THREE.Color(planetData.color || '#38B6FF');
    const surface = planetData.surface || {};
    const type = planetData.type || 'terrestrial';
    const geometry = planetData.geometry || {};
    
    // High-quality geometry settings
    const uniforms = {
      uTime: { value: 0 },
      uBaseColor: { value: color },
      uEmissive: { value: new THREE.Color(surface.emissive || '#000000') },
      uRoughness: { value: surface.roughness || 0.5 },
      uMetallic: { value: surface.metallic || 0.1 },
      uNormalStrength: { value: surface.normalStrength || 1.0 },
      uAtmosphereColor: { value: new THREE.Color(planetData.atmosphere?.color || '#66AAFF') },
      uAtmosphereDensity: { value: planetData.atmosphere?.density || 0.3 },
      uPlanetType: { value: getPlanetTypeCode(type) },
      uSurfaceRoughness: { value: geometry.surfaceRoughness || 0.5 },
      uCraterDensity: { value: geometry.craterDensity || 0.2 },
      uDeformation: { value: geometry.deformation || 0.05 }
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uEmissive;
      uniform float uRoughness;
      uniform float uMetallic;
      uniform float uNormalStrength;
      uniform vec3 uAtmosphereColor;
      uniform float uAtmosphereDensity;
      uniform float uPlanetType;
      uniform float uSurfaceRoughness;
      uniform float uCraterDensity;
      uniform float uDeformation;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      // Noise functions for surface detail
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      
      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      vec3 getTerrainColor(vec2 uv, float planetType) {
        vec3 baseColor = uBaseColor;
        float height = fbm(vec3(uv * 8.0, uTime * 0.1));
        
        if (planetType < 1.5) { // terrestrial
          vec3 water = vec3(0.2, 0.4, 0.8);
          vec3 land = vec3(0.3, 0.6, 0.2);
          vec3 mountain = vec3(0.5, 0.4, 0.3);
          
          if (height < 0.3) return mix(water, baseColor, 0.3);
          else if (height < 0.6) return mix(land, baseColor, 0.4);
          else return mix(mountain, baseColor, 0.5);
        }
        else if (planetType < 2.5) { // gas_giant
          float bands = sin(uv.y * 20.0 + uTime) * 0.5 + 0.5;
          return mix(baseColor, baseColor * 1.5, bands * 0.3);
        }
        else if (planetType < 3.5) { // ice_world
          vec3 ice = vec3(0.8, 0.9, 1.0);
          return mix(ice, baseColor, 0.6 + height * 0.2);
        }
        else if (planetType < 4.5) { // desert
          vec3 sand = vec3(0.8, 0.6, 0.3);
          return mix(sand, baseColor, 0.4 + height * 0.3);
        }
        else if (planetType < 5.5) { // ocean
          vec3 deepWater = vec3(0.1, 0.2, 0.4);
          vec3 shallowWater = vec3(0.3, 0.5, 0.7);
          return mix(deepWater, shallowWater, height);
        }
        else if (planetType < 6.5) { // volcanic
          vec3 lava = vec3(1.0, 0.3, 0.1);
          vec3 rock = vec3(0.2, 0.1, 0.1);
          float lavaFlow = sin(uTime * 2.0 + height * 10.0) * 0.5 + 0.5;
          return mix(rock, lava, lavaFlow * 0.6);
        }
        else if (planetType < 7.5) { // crystal
          float crystal = sin(uv.x * 30.0 + uv.y * 20.0 + uTime) * 0.5 + 0.5;
          return baseColor * (1.0 + crystal * 0.8);
        }
        else if (planetType < 8.5) { // toxic
          vec3 poison = vec3(0.5, 0.8, 0.2);
          return mix(poison, baseColor, 0.7);
        }
        else { // metal
          float panels = step(0.5, fract(uv.x * 10.0)) * step(0.5, fract(uv.y * 10.0));
          return mix(baseColor * 0.5, baseColor, panels);
        }
      }
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        
        // Surface coloring based on planet type
        vec3 surfaceColor = getTerrainColor(vUv, uPlanetType);
        
        // Lighting calculation
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float NdotL = max(dot(normal, lightDirection), 0.0);
        
        // Fresnel effect for atmosphere
        float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.0);
        vec3 atmosphereGlow = uAtmosphereColor * fresnel * uAtmosphereDensity;
        
        // Combine surface and atmosphere
        vec3 finalColor = surfaceColor * (0.3 + 0.7 * NdotL) + atmosphereGlow + uEmissive;
        
        // Add metallic reflection
        if (uMetallic > 0.5) {
          vec3 reflectDirection = reflect(-viewDirection, normal);
          float spec = pow(max(dot(reflectDirection, lightDirection), 0.0), 32.0);
          finalColor += vec3(1.0) * spec * uMetallic;
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide
    });
  }
  
  // Create atmosphere material
  function makeAtmosphereMaterial(planetData: any) {
    const atmosphere = planetData.atmosphere;
    if (!atmosphere) return null;
    
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(atmosphere.color) },
      uDensity: { value: atmosphere.density },
      uGlow: { value: atmosphere.glow || 1.0 }
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uGlow;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        
        float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 1.5);
        float alpha = fresnel * uDensity * 0.8;
        
        vec3 glowColor = uColor * uGlow;
        
        gl_FragColor = vec4(glowColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
  }
  
  function getPlanetTypeCode(type: PlanetType): number {
    const typeMap: Record<PlanetType, number> = {
      'terrestrial': 1,
      'gas_giant': 2,
      'ice_world': 3,
      'desert': 4,
      'ocean': 5,
      'volcanic': 6,
      'crystal': 7,
      'toxic': 8,
      'metal': 9
    };
    return typeMap[type] || 1;
  }
  
  // Create cloud layer material
  function createCloudMaterial(cloudLayer: any) {
    const uniforms = {
      uTime: { value: 0 },
      uCloudColor: { value: new THREE.Color(cloudLayer.color) },
      uDensity: { value: cloudLayer.density },
      uTurbulence: { value: cloudLayer.turbulence },
      uSpeed: { value: cloudLayer.speed },
      uWindDirection: { value: Math.random() * Math.PI * 2 }
    };
    
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uCloudColor;
      uniform float uDensity;
      uniform float uTurbulence;
      uniform float uSpeed;
      uniform float uWindDirection;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      
      // 3D Noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      float turbulence(vec3 p) {
        float value = 0.0;
        float amplitude = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * abs(snoise(p));
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      void main() {
        // Create cloud movement based on wind
        vec2 windOffset = vec2(
          cos(uWindDirection) * uTime * uSpeed,
          sin(uWindDirection) * uTime * uSpeed
        );
        
        // Generate cloud patterns
        vec3 noisePos = vPosition * 2.0 + vec3(windOffset, uTime * 0.1);
        float cloudNoise = turbulence(noisePos * uTurbulence);
        
        // Edge fade for spherical clouds
        float edgeFade = 1.0 - pow(abs(dot(normalize(vNormal), normalize(vPosition))), 0.8);
        
        // Final cloud alpha
        float cloudAlpha = cloudNoise * uDensity * edgeFade;
        cloudAlpha = smoothstep(0.2, 0.8, cloudAlpha);
        
        // Cloud color with slight variation
        vec3 finalColor = uCloudColor * (0.8 + 0.4 * cloudNoise);
        
        gl_FragColor = vec4(finalColor, cloudAlpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }
  
  // Create storm system material
  function createStormMaterial(storm: any) {
    const uniforms = {
      uTime: { value: 0 },
      uStormColor: { value: new THREE.Color(storm.color) },
      uIntensity: { value: storm.intensity },
      uSize: { value: storm.size },
      uStormType: { value: getStormTypeCode(storm.type) }
    };
    
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uStormColor;
      uniform float uIntensity;
      uniform float uSize;
      uniform float uStormType;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      void main() {
        vec2 center = vec2(0.5);
        float dist = distance(vUv, center);
        
        // Storm eye and spiral pattern
        float angle = atan(vUv.y - center.y, vUv.x - center.x);
        float spiral = sin(angle * 8.0 + dist * 20.0 - uTime * 3.0) * 0.5 + 0.5;
        
        // Different storm patterns based on type
        float pattern = 1.0;
        if (uStormType < 1.5) { // hurricane
          pattern = (1.0 - smoothstep(0.0, uSize, dist)) * spiral;
        } else if (uStormType < 2.5) { // electrical
          float lightning = step(0.95, random(vUv + uTime));
          pattern = (1.0 - smoothstep(0.0, uSize * 0.8, dist)) + lightning * 0.5;
        } else if (uStormType < 3.5) { // dust
          float dustCloud = smoothstep(uSize, 0.0, dist) * (0.5 + 0.5 * sin(uTime * 2.0));
          pattern = dustCloud;
        } else { // plasma/ice
          pattern = (1.0 - smoothstep(0.0, uSize, dist)) * (0.7 + 0.3 * sin(uTime * 4.0));
        }
        
        float alpha = pattern * uIntensity;
        gl_FragColor = vec4(uStormColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }
  
  function getStormTypeCode(type: string): number {
    const typeMap: Record<string, number> = {
      'hurricane': 1,
      'electrical': 2,
      'dust': 3,
      'plasma': 4,
      'ice': 4
    };
    return typeMap[type] || 1;
  }
  
  // Create detailed planet geometry based on planet type
  function createPlanetGeometry(radius: number, geometry: PlanetGeometry) {
    const { segments, scale, deformation, poleFlattening, surfaceRoughness } = geometry;
    
    // Create base sphere geometry with high detail
    const baseGeometry = new THREE.SphereGeometry(
      radius,
      segments.widthSegments,
      segments.heightSegments
    );
    
    // Apply deformation for non-spherical planets
    const positions = baseGeometry.attributes.position;
    const vector = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);
      
      // Apply pole flattening (like gas giants)
      const latitude = Math.asin(vector.y / radius);
      const poleEffect = Math.cos(latitude);
      vector.y *= (1 - poleFlattening * poleEffect);
      
      // Apply general deformation with noise
      const noiseValue = 
        Math.sin(vector.x * 8) * Math.cos(vector.z * 6) * 0.1 +
        Math.sin(vector.x * 16) * Math.cos(vector.z * 12) * 0.05 +
        Math.sin(vector.x * 32) * Math.cos(vector.z * 24) * 0.025;
      
      const deformationFactor = 1 + (noiseValue * deformation * surfaceRoughness);
      vector.multiplyScalar(deformationFactor);
      
      // Apply scale
      vector.x *= scale.x;
      vector.y *= scale.y;
      vector.z *= scale.z;
      
      positions.setXYZ(i, vector.x, vector.y, vector.z);
    }
    
    // Recalculate normals for proper lighting
    baseGeometry.computeVertexNormals();
    
    return baseGeometry;
  }

  // Helper to add a realistic satellite mesh to the current system group
  function addSatLocal(id: string, planetData: any, r = 6.0, speed = 0.25, a = Math.random() * Math.PI * 2) {
    const sys = groupRef.current; if (!sys) return;
    
    const radius = planetData.radius || 0.42;
    const geometry = planetData.geometry || {
      segments: { widthSegments: 128, heightSegments: 128 },
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.05,
      poleFlattening: 0.02,
      surfaceRoughness: 0.5
    };
    
    // Main planet with detailed geometry
    const planetGeometry = createPlanetGeometry(radius, geometry);
    const material = makePlanetMaterial(planetData);
    const mesh = new THREE.Mesh(planetGeometry, material);
    
    // Atmosphere
    let atmosphereMesh: THREE.Mesh | undefined;
    if (planetData.atmosphere) {
      const atmosphereMat = makeAtmosphereMaterial(planetData);
      if (atmosphereMat) {
        const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.05, geometry.segments.widthSegments / 2, geometry.segments.heightSegments / 2);
        atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMat);
        mesh.add(atmosphereMesh);
      }
    }
    
    // Rings
    let ringMesh: THREE.Mesh | undefined;
    if (planetData.rings) {
      const rings = planetData.rings;
      const ringGeometry = new THREE.RingGeometry(
        radius * rings.innerRadius,
        radius * rings.outerRadius,
        32
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity,
        side: THREE.DoubleSide
      });
      ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      mesh.add(ringMesh);
    }
    
    // Moons
    const moons: THREE.Mesh[] = [];
    if (planetData.moons && planetData.moons > 0) {
      for (let i = 0; i < planetData.moons; i++) {
        const moonRadius = radius * (0.1 + Math.random() * 0.15);
        const moonDistance = radius * (1.5 + i * 0.5 + Math.random() * 0.3);
        const moonGeometry = new THREE.SphereGeometry(moonRadius, 16, 16);
        const moonMaterial = new THREE.MeshPhongMaterial({
          color: 0x666666,
          emissive: 0x111111
        });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        
        const angle = (Math.PI * 2 * i) / planetData.moons;
        moonMesh.position.set(
          Math.cos(angle) * moonDistance,
          (Math.random() - 0.5) * moonDistance * 0.2,
          Math.sin(angle) * moonDistance
        );
        
        mesh.add(moonMesh);
        moons.push(moonMesh);
      }
    }
    
    // Cloud Layers
    const cloudLayers: THREE.Mesh[] = [];
    if (planetData.weather?.cloudLayers) {
      planetData.weather.cloudLayers.forEach((cloudLayer, index) => {
        const cloudGeometry = new THREE.SphereGeometry(
          radius * cloudLayer.height,
          Math.max(32, geometry.segments.widthSegments / 2),
          Math.max(32, geometry.segments.heightSegments / 2)
        );
        const cloudMaterial = createCloudMaterial(cloudLayer);
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        mesh.add(cloudMesh);
        cloudLayers.push(cloudMesh);
      });
    }
    
    // Storm Systems
    const stormSystems: {
      mesh: THREE.Mesh;
      type: string;
      intensity: number;
      duration: number;
      age: number;
      active: boolean;
    }[] = [];
    
    if (planetData.weather?.storms) {
      planetData.weather.storms.forEach((storm, index) => {
        // Create storm geometry on planet surface
        const stormGeometry = new THREE.PlaneGeometry(
          radius * storm.size * 2,
          radius * storm.size * 2,
          16,
          16
        );
        const stormMaterial = createStormMaterial(storm);
        const stormMesh = new THREE.Mesh(stormGeometry, stormMaterial);
        
        // Position storm on planet surface
        const stormAngle = Math.random() * Math.PI * 2;
        const stormLat = (Math.random() - 0.5) * Math.PI;
        const stormDistance = radius * 1.001; // Just above surface
        
        stormMesh.position.set(
          Math.cos(stormAngle) * Math.cos(stormLat) * stormDistance,
          Math.sin(stormLat) * stormDistance,
          Math.sin(stormAngle) * Math.cos(stormLat) * stormDistance
        );
        
        // Orient storm to face outward from planet
        stormMesh.lookAt(mesh.position);
        stormMesh.rotateY(Math.PI);
        
        mesh.add(stormMesh);
        stormSystems.push({
          mesh: stormMesh,
          type: storm.type,
          intensity: storm.intensity,
          duration: storm.duration,
          age: 0,
          active: Math.random() < storm.frequency
        });
      });
    }
    
    sys.add(mesh);
    satsRef.current.push({ 
      id, 
      mesh, 
      mat: material, 
      r, 
      speed, 
      a, 
      baseRadius: radius,
      atmosphereMesh,
      ringMesh,
      moons,
      planetType: planetData.type || 'terrestrial',
      cloudLayers,
      stormSystems,
      weatherData: planetData.weather
    });
  }

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    // Guard against transient zero-size containers (e.g., during layout)
    const width = Math.max(1, mount.clientWidth || 600);
    const height = Math.max(1, mount.clientHeight || 340);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 120);
    camera.position.set(0, 1.2, 16.0);
    camera.lookAt(0, 0, 0); // Look directly at center

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const hemi = new THREE.HemisphereLight(0xbfefff, 0x0a1e24, 0.26);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0x99ffff, 0.5); dir.position.set(3, 6, 5); scene.add(dir);
    const pt1 = new THREE.PointLight(0x44ffff, 0.35); pt1.position.set(-4, 2, 4); scene.add(pt1);
    const pt2 = new THREE.PointLight(0x19e3ff, 1.1, 9); pt2.position.set(0, -1.4, 0.6); scene.add(pt2);
    const pt3 = new THREE.PointLight(0xfc54af, 0.26, 7.5); pt3.position.set(0.8, -1.0, -0.4); scene.add(pt3);

    // System group
    const sys = new THREE.Group();
    sys.position.set(0, 0, 0); // Center the system at origin
    sys.rotation.set(0, 0, 0); // Start with no rotation
    scene.add(sys);
    groupRef.current = sys;

    // Main planet placeholder (real one created when songs available)
    const mainGeo = new THREE.SphereGeometry(1.6, 48, 48);
    const mainMat = new THREE.MeshPhongMaterial({ color: 0x1bd3ff, emissive: 0x0a3240, shininess: 18, specular: 0x66ffff });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.visible = false;
    sys.add(main);
    mainRef.current = { id: null, mesh: main, ring: null as any };

    // (Rings will be created once layout is known)

    // Add a subtle projection sweep/scan shader in front of the system for holo polish
    try {
      const uniforms = { uTime: { value: 0 } };
      sweepUniforms.current = uniforms;
      const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
      const fs = `
        uniform float uTime; varying vec2 vUv;
        float gauss(float x, float m, float s){ float d=(x-m)/s; return exp(-0.5*d*d); }
        void main(){
          float pos = fract(uTime * 0.08);
          float band = gauss(vUv.x, pos, 0.06) * 0.9 + gauss(vUv.x, pos*0.7, 0.02) * 0.5;
          float scan = 0.08 * sin((vUv.y + uTime * 2.5) * 120.0);
          float a = clamp(band * 0.16 + scan * 0.08, 0.0, 1.0);
          vec3 col = vec3(0.65, 1.0, 1.0) * a;
          gl_FragColor = vec4(col, a);
        }
      `;
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), mat);
      plane.position.set(0, 0.35, 0.2);
      scene.add(plane);
    } catch {}

    // Initial simple satellites until songs load with weather systems
    const defaultPlanet1 = { 
      radius: 0.42, 
      color: '#38B6FF', 
      type: 'ocean' as PlanetType, 
      atmosphere: { color: '#38B6FF', density: 0.6, glow: 0.8 },
      weather: {
        cloudLayers: [
          { count: 2, speed: 0.015, density: 0.6, color: '#FFFFFF', height: 1.03, turbulence: 0.4 }
        ],
        storms: [
          { frequency: 0.2, intensity: 0.6, color: '#4A90E2', size: 0.15, duration: 30, type: 'hurricane' as const }
        ]
      },
      geometry: {
        shape: 'sphere' as const,
        deformation: 0.02,
        poleFlattening: 0.08,
        surfaceRoughness: 0.15,
        craterDensity: 0.05,
        segments: { widthSegments: 128, heightSegments: 128 },
        scale: { x: 1.2, y: 1.15, z: 1.2 }
      }
    };
    const defaultPlanet2 = { 
      radius: 0.5, 
      color: '#F2EF1D', 
      type: 'crystal' as PlanetType, 
      atmosphere: { color: '#F2EF1D', density: 0.2, glow: 2.0 },
      geometry: {
        shape: 'irregular' as const,
        deformation: 0.25,
        poleFlattening: 0.0,
        surfaceRoughness: 0.6,
        craterDensity: 0.1,
        segments: { widthSegments: 102, heightSegments: 102 },
        scale: { x: 0.8, y: 1.0, z: 0.8 }
      }
    };
    const defaultPlanet3 = { 
      radius: 0.34, 
      color: '#FC54AF', 
      type: 'terrestrial' as PlanetType, 
      atmosphere: { color: '#66AAFF', density: 0.5, glow: 0.4 }, 
      moons: 1,
      weather: {
        cloudLayers: [
          { count: 2, speed: 0.012, density: 0.5, color: '#FFFFFF', height: 1.025, turbulence: 0.3 }
        ],
        storms: [
          { frequency: 0.18, intensity: 0.4, color: '#708090', size: 0.12, duration: 35, type: 'electrical' as const }
        ]
      },
      geometry: {
        shape: 'sphere' as const,
        deformation: 0.05,
        poleFlattening: 0.06,
        surfaceRoughness: 0.5,
        craterDensity: 0.2,
        segments: { widthSegments: 128, heightSegments: 128 },
        scale: { x: 1.0, y: 1.0, z: 1.0 }
      }
    };
    
    addSatLocal('s1', defaultPlanet1, 6.0, 0.25);
    addSatLocal('s2', defaultPlanet2, 4.2, 0.2);
    addSatLocal('s3', defaultPlanet3, 2.8, 0.32);

    // Animate
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0;
    const tick = () => {
      t += 0.016;
      const hov = hoverRef.current;
      const centralPlanet = centralPlanetRef.current;
      
      // Update central planet if it exists
      if (centralPlanet.mesh) {
        const hovered = !!hov && centralPlanet.id === hov;
        const osc = hovered ? (1 + 0.06 * Math.sin(t * 3.2)) : 1;
        const targetScale = (hovered ? 1.6 : 1.4) * osc; // Central planet is much larger
        const ms = centralPlanet.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.18;
        ms.y = ms.x; ms.z = ms.x;
        // Position central planet slightly forward for better visibility
        centralPlanet.mesh.position.set(0, 0, 1.5);
        // Gentle rotation for the central planet
        centralPlanet.mesh.rotation.y += 0.003;
        
        // Drive planet shader uniforms
        try {
          const u: any = (centralPlanet.mesh.material as any).uniforms;
          if (u && u.uTime) u.uTime.value = t;
          
          // Update atmosphere and weather for central planet
          centralPlanet.mesh.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material) {
              const childU: any = (child.material as any).uniforms;
              if (childU && childU.uTime) childU.uTime.value = t;
              if (childU && childU.uGlow) {
                childU.uGlow.value += (((hovered ? 1.8 : 1.2)) - childU.uGlow.value) * 0.18;
              }
              
              // Update cloud layers on central planet
              if (childU && childU.uCloudColor) {
                child.rotation.y += 0.003;
                child.rotation.x += 0.001;
              }
              
              // Update storm systems on central planet
              if (childU && childU.uStormColor) {
                if (childU.uIntensity) {
                  const stormPulse = 0.5 + 0.5 * Math.sin(t * 2.0);
                  childU.uIntensity.value = 0.8 * stormPulse;
                }
                child.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.02);
              }
            }
          });
        } catch {}
      }
      
      satsRef.current.forEach(s => {
        // Skip the satellite if it's the central planet
        if (centralPlanet.id && s.id === centralPlanet.id) {
          s.mesh.visible = false; // Hide the original satellite
          return;
        }
        
        s.mesh.visible = true;
        s.a += (reduced ? 0.0 : s.speed * 0.008);
        const x = Math.cos(s.a) * s.r;
        const z = Math.sin(s.a) * s.r;
        s.mesh.position.set(x, 0, z);
        
        // Rotation for planet
        s.mesh.rotation.y += 0.005;
        s.mesh.rotation.x += 0.002;
        
        const hovered = !!hov && s.id === hov;
        const osc = hovered ? (1 + 0.06 * Math.sin(t * 3.2)) : 1;
        const targetScale = (hovered ? 1.16 : 1.0) * osc;
        const ms = s.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.18;
        ms.y = ms.x; ms.z = ms.x;
        
        // Update planet shader uniforms
        try {
          const u: any = (s.mesh.material as any).uniforms || s.mat.uniforms;
          if (u && u.uTime) u.uTime.value = t;
          
          // Update atmosphere if present
          if (s.atmosphereMesh && s.atmosphereMesh.material) {
            const atmU: any = (s.atmosphereMesh.material as any).uniforms;
            if (atmU && atmU.uTime) atmU.uTime.value = t;
            if (atmU && atmU.uGlow) {
              atmU.uGlow.value += (((hovered ? 1.5 : 1.0)) - atmU.uGlow.value) * 0.18;
            }
          }
          
          // Animate moons if present
          if (s.moons && s.moons.length > 0) {
            s.moons.forEach((moon, idx) => {
              const moonSpeed = 0.02 + idx * 0.01;
              const currentPos = moon.position.clone();
              const distance = currentPos.length();
              const angle = Math.atan2(currentPos.z, currentPos.x) + moonSpeed;
              
              moon.position.set(
                Math.cos(angle) * distance,
                currentPos.y,
                Math.sin(angle) * distance
              );
              moon.rotation.y += 0.05;
            });
          }
          
          // Animate rings if present
          if (s.ringMesh) {
            s.ringMesh.rotation.z += 0.01;
          }
          
          // Update cloud layers
          if (s.cloudLayers && s.cloudLayers.length > 0) {
            s.cloudLayers.forEach((cloudLayer, idx) => {
              const cloudU: any = (cloudLayer.material as any).uniforms;
              if (cloudU && cloudU.uTime) {
                cloudU.uTime.value = t;
              }
              // Each cloud layer rotates at different speeds
              cloudLayer.rotation.y += 0.002 + idx * 0.001;
              cloudLayer.rotation.x += 0.0005;
            });
          }
          
          // Update storm systems
          if (s.stormSystems && s.stormSystems.length > 0 && s.weatherData) {
            s.stormSystems.forEach((storm, idx) => {
              const stormU: any = (storm.mesh.material as any).uniforms;
              if (stormU && stormU.uTime) {
                stormU.uTime.value = t;
              }
              
              // Storm lifecycle management
              storm.age += 0.016;
              
              // Check if storm should become active
              const stormConfig = s.weatherData.storms?.[idx];
              if (stormConfig && !storm.active && Math.random() < stormConfig.frequency * 0.001) {
                storm.active = true;
                storm.age = 0;
              }
              
              // Deactivate storm after duration
              if (storm.active && storm.age > storm.duration) {
                storm.active = false;
                storm.age = 0;
              }
              
              // Update storm visibility and intensity
              if (storm.active) {
                const fadeIn = Math.min(storm.age / 5, 1); // 5 second fade in
                const fadeOut = storm.age > (storm.duration - 5) ? 
                  Math.max(0, (storm.duration - storm.age) / 5) : 1;
                const stormAlpha = fadeIn * fadeOut;
                
                if (stormU && stormU.uIntensity) {
                  stormU.uIntensity.value = storm.intensity * stormAlpha;
                }
                storm.mesh.visible = true;
                
                // Storm movement (rotate around planet)
                if (storm.type === 'hurricane' || storm.type === 'dust') {
                  storm.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.01);
                }
              } else {
                storm.mesh.visible = false;
              }
            });
          }
        } catch {}
      });
      // Update holo sweep shader time
      try { if (sweepUniforms.current) sweepUniforms.current.uTime.value = t; } catch {}
      // Apply focus-or-spin for the system group
      if (sys) {
        // Don't rotate the system if we have a central planet - let it stay fixed
        if (centralPlanet.mesh) {
          // Keep system rotation stable when central planet is active
          // The central planet is at origin, others orbit around it
        } else if (focusTargetRy.current !== null) {
          // Smoothly rotate toward the target yaw using shortest angular path
          const cur = sys.rotation.y;
          const target = focusTargetRy.current;
          // Normalize delta to [-PI, PI]
          let delta = ((target - cur + Math.PI) % (Math.PI * 2));
          if (delta < 0) delta += Math.PI * 2;
          delta -= Math.PI;
          // Step a fraction of the remaining angle
          sys.rotation.y = cur + delta * 0.12;
          if (Math.abs(delta) < 0.002) {
            sys.rotation.y = target;
            focusTargetRy.current = null; // done focusing
          }
        } else if (!reduced) {
          sys.rotation.y += spinSpeedRef.current;
        }
      }
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const onResize = () => {
      if (!mount) return;
      // Clamp to at least 1×1 to avoid IndexSizeError in some browsers
      const w = Math.max(1, mount.clientWidth || 600);
      const h = Math.max(1, mount.clientHeight || 340);
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    return () => {
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
      try { ro.disconnect(); } catch {}
      try { if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current.forceContextLoss?.(); } } catch {}
      try { if (mount && renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement); } catch {}
      // Cleanup central planet
      try {
        const centralPlanet = centralPlanetRef.current;
        if (centralPlanet.mesh) {
          centralPlanet.mesh.geometry?.dispose();
          centralPlanet.mesh.material?.dispose();
        }
      } catch {}
    };
  }, []);

  // Sync planets to songs from the global store for closer match to previous visuals
  const { songs, mainId, prevMainId, hoverId } = usePlayerStore((s) => ({ songs: s.songs, mainId: s.mainId, prevMainId: s.prevMainId, hoverId: s.hoverId }));
  const hoverRef = useRef<string | null>(null);
  useEffect(() => { hoverRef.current = hoverId || null; }, [hoverId]);
  // Compute layout with much larger spacing
  const layout = useMemo(() => (
    songs && songs.length ? computePlanetLayout(songs as any, { ringGap: 3.2, baseRadius: 3.6, tiltPerRing: 8, minScale: 0.7, maxScale: 1.25 }) : undefined
  ), [songs]);

  useEffect(() => {
    // Build system from songs when available
    const sys = groupRef.current; if (!sys) return;
    if (!songs || !songs.length) return;
    const focusId = mainId || songs[0]?.id;
    // Clear existing satellites
    for (const s of satsRef.current) {
      try { sys.remove(s.mesh); (s.mesh.geometry as any)?.dispose?.(); (s.mesh.material as any)?.dispose?.(); } catch {}
    }
    satsRef.current = [];
    // Clear existing rings
    for (const g of ringsRef.current) {
      try { sys.remove(g); g.clear(); } catch {}
    }
    ringsRef.current = [];
    
    // Clear central planet when rebuilding system
    const centralPlanet = centralPlanetRef.current;
    if (centralPlanet.mesh) {
      try { sys.remove(centralPlanet.mesh); } catch {}
      centralPlanetRef.current = { id: null, mesh: null, originalSat: null };
    }

    // Build orbit ring guides per ring index using layout radii
    if (layout) {
      const ringMaxByIndex = new Map<number, { r: number; tiltDeg: number }>();
      songs.forEach((song) => {
        const id = song.id;
        const lay = (layout as any)[id];
        if (!lay) return;
        const spacingMul = 2.2;
        const r = (lay.orbitRadius ?? 4) * spacingMul;
        const prev = ringMaxByIndex.get(lay.ringIndex);
        if (!prev || r > prev.r) ringMaxByIndex.set(lay.ringIndex, { r, tiltDeg: lay.tiltDeg ?? 8 });
      });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.12, depthWrite: false });
      const indices = Array.from(ringMaxByIndex.keys()).sort((a, b) => a - b);
      for (const idx of indices) {
        const { r, tiltDeg } = ringMaxByIndex.get(idx)!;
        const g = new THREE.Group();
        g.rotation.x = -Math.PI / 2 + (tiltDeg * Math.PI / 180);
        const geom = new THREE.RingGeometry(Math.max(0, r - 0.02), r + 0.02, 128);
        const mesh = new THREE.Mesh(geom, ringMat.clone());
        g.add(mesh);
        sys.add(g);
        ringsRef.current.push(g);
      }
    }
    // Create a planet for every song (including main)
    songs.forEach((song, idx) => {
      const id = song.id;
      const lay = layout ? (layout as any)[id] : undefined;
      const spacingMul = 2.2; // space them out much more
      const rBase = lay?.orbitRadius ?? (idx % 2 ? 4.2 : 6.0);
      const r = rBase * spacingMul;
      const speed = 0.08 + (lay ? (0.016 * (lay.ringIndex ?? 0)) : 0) + (0.02 * ((idx % 5))); // slower, ring-based
      const a0 = lay?.angle0 ?? (Math.random() * Math.PI * 2);
      
      // Use the full planet data with all realistic properties
      const planetData = song.planet || {
        radius: 0.8,
        color: '#38B6FF',
        type: 'terrestrial'
      };
      
      // Emphasize current song slightly
      if (id === focusId) {
        planetData.radius *= 1.25;
      } else {
        planetData.radius *= 0.95;
      }
      
      addSatLocal(id, planetData, r, speed, a0);
    });
    // After building, compute a focus rotation so the selected planet is front-center
    try {
      const sat = satsRef.current.find(s => s.id === focusId);
      if (sat) {
        const cur = sys.rotation.y;
        const desired = Math.PI / 2 - sat.a;
        let delta = ((desired - cur + Math.PI) % (Math.PI * 2));
        if (delta < 0) delta += Math.PI * 2;
        delta -= Math.PI;
        focusTargetRy.current = cur + delta;
      }
    } catch {}
    // Update main planet
    const mainEntry = songs.find(s => s.id === focusId) || songs[0];
    const main = mainRef.current.mesh;
    if (main) main.visible = false; // no separate central planet; every song has its own
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mainId, layout && Object.keys(layout).join(',')]);

  // When the selected song changes, create central planet and update orbital system
  useEffect(() => {
    const sys = groupRef.current; if (!sys) return;
    const id = mainId; if (!id) return;
    const sat = satsRef.current.find(s => s.id === id);
    if (!sat) return;
    
    // Create central planet from the selected satellite
    const centralPlanet = centralPlanetRef.current;
    
    // Clean up previous central planet
    if (centralPlanet.mesh && centralPlanet.mesh !== sat.mesh) {
      try { sys.remove(centralPlanet.mesh); } catch {}
    }
    
    // Get the original song data for the selected planet
    const songData = songs.find(s => s.id === id);
    const planetData = songData?.planet || { radius: sat.baseRadius, color: '#38B6FF', type: 'terrestrial' };
    
    // Create new central planet as a larger, higher quality version
    const centralRadius = sat.baseRadius * 2.0;
    const enhancedPlanetData = {
      ...planetData,
      radius: centralRadius
    };
    
    // Enhanced geometry for central planet
    const centralGeometry = enhancedPlanetData.geometry || {
      segments: { widthSegments: 256, heightSegments: 256 }, // Ultra high quality
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.05,
      poleFlattening: 0.02,
      surfaceRoughness: 0.5
    };
    
    const centralGeo = createPlanetGeometry(centralRadius, centralGeometry);
    const centralMat = makePlanetMaterial(enhancedPlanetData);
    const centralMesh = new THREE.Mesh(centralGeo, centralMat);
    
    // Add atmosphere to central planet if it has one
    if (enhancedPlanetData.atmosphere) {
      const atmosphereMat = makeAtmosphereMaterial(enhancedPlanetData);
      if (atmosphereMat) {
        const atmosphereGeo = new THREE.SphereGeometry(centralRadius * 1.05, 64, 64);
        const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        centralMesh.add(atmosphereMesh);
      }
    }
    
    // Add rings to central planet if it has them
    if (enhancedPlanetData.rings) {
      const rings = enhancedPlanetData.rings;
      const ringGeometry = new THREE.RingGeometry(
        centralRadius * rings.innerRadius,
        centralRadius * rings.outerRadius,
        64
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      centralMesh.add(ringMesh);
    }
    
    // Add weather systems to central planet
    if (enhancedPlanetData.weather?.cloudLayers) {
      enhancedPlanetData.weather.cloudLayers.forEach((cloudLayer) => {
        const cloudGeometry = new THREE.SphereGeometry(
          centralRadius * cloudLayer.height,
          64,
          64
        );
        const cloudMaterial = createCloudMaterial(cloudLayer);
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        centralMesh.add(cloudMesh);
      });
    }
    
    if (enhancedPlanetData.weather?.storms) {
      enhancedPlanetData.weather.storms.forEach((storm) => {
        const stormGeometry = new THREE.PlaneGeometry(
          centralRadius * storm.size * 2,
          centralRadius * storm.size * 2,
          32,
          32
        );
        const stormMaterial = createStormMaterial(storm);
        const stormMesh = new THREE.Mesh(stormGeometry, stormMaterial);
        
        // Position storm on central planet surface
        const stormAngle = Math.random() * Math.PI * 2;
        const stormLat = (Math.random() - 0.5) * Math.PI;
        const stormDistance = centralRadius * 1.001;
        
        stormMesh.position.set(
          Math.cos(stormAngle) * Math.cos(stormLat) * stormDistance,
          Math.sin(stormLat) * stormDistance,
          Math.sin(stormAngle) * Math.cos(stormLat) * stormDistance
        );
        
        stormMesh.lookAt(centralMesh.position);
        stormMesh.rotateY(Math.PI);
        
        if (Math.random() < storm.frequency) {
          centralMesh.add(stormMesh);
        }
      });
    }
    
    // Position forward from center for prominent display
    centralMesh.position.set(0, 0, 1.5);
    centralMesh.scale.set(1.4, 1.4, 1.4); // Start even larger
    sys.add(centralMesh);
    
    // Update central planet reference
    centralPlanetRef.current = {
      id: id,
      mesh: centralMesh,
      originalSat: sat
    };
    
    // Reset system rotation to face forward since central planet is now at origin
    focusTargetRy.current = 0;
    
  }, [mainId]);

  // Hover behavior handled in main tick via hoverRef

  return <div ref={mountRef} className="absolute inset-0" style={{ background: "transparent" }} />;
}
