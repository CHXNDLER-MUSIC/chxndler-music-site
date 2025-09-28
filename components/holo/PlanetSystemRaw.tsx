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

export default function PlanetSystemRaw({ showAll = false, onSongChange }: { showAll?: boolean; onSongChange?: (id: string) => void }) {
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
  // Camera animation for smooth focus transitions
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 16.0));
  const targetCameraLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const cameraTransitionSpeed = useRef<number>(0.08);
  
  // Particle system for gravitational connections
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const connectionLinesRef = useRef<THREE.LineSegments[]>([]);
  const particleUniforms = useRef<{ uTime: { value: number }; uCentralPos: { value: THREE.Vector3 }; uCentralColor: { value: THREE.Color } } | null>(null);

  // Create ultra-realistic planet material based on planet type and properties
  function makePlanetMaterial(planetData: any) {
    const color = new THREE.Color(planetData.color || '#38B6FF');
    const surface = planetData.surface || {};
    const type = planetData.type || 'terrestrial';
    const geometry = planetData.geometry || {};
    // Stable per-planet seed to avoid unintended color/texture shifts over time
    const seed = typeof planetData.seed === 'number' ? planetData.seed : Math.random() * 1000;
    
    // Enhanced planet-specific properties for more realism
    const planetTypeData = getPlanetTypeData(type);
    const enhancedSurface = { ...planetTypeData.surface, ...surface };
    
    // High-quality geometry settings
    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: seed },
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
      uniform float uSeed;
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
      
      // Simplex noise utilities (matches cloud shader for coherence)
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
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      float fbm(vec3 p) {
        float v = 0.0; float a = 0.5; vec3 s = p;
        for (int i = 0; i < 5; i++) { v += a * snoise(s); s *= 2.0; a *= 0.5; }
        return 0.5 + 0.5 * v;
      }
      float ridged(vec3 p) {
        float v = 0.0; float a = 0.5; vec3 s = p;
        for (int i = 0; i < 4; i++) { float n = snoise(s); v += a * (1.0 - abs(n)); s *= 2.0; a *= 0.5; }
        return clamp(v, 0.0, 1.0);
      }

      // Quick saturation boost approximation
      vec3 saturateColor(vec3 color, float amt) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(luma), color, 1.0 + amt);
      }
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        vec3 nrm = normalize(vWorldPosition);
        float lat = asin(clamp(nrm.y, -1.0, 1.0));
        float lon = atan(nrm.z, nrm.x);
        
        // Compute coherent noise-driven height for realism
        // Use a stable per-planet seed so surface patterns do not change over time
        float height = fbm(vec3(lon * 2.5, lat * 3.0, uSeed));
        float ridges = ridged(vec3(lon * 6.0, lat * 6.5, uSeed));
        float continents = smoothstep(0.42, 0.58, height);
        float mountains = smoothstep(0.65, 0.9, ridges);
        
        // Temperature by latitude (colder near poles)
        float temp = 1.0 - smoothstep(0.6, 1.0, abs(sin(lat)));
        
        // Gas giant branch
        vec3 surfaceColor;
        float waterMask = 0.0;
        if (uPlanetType < 2.5) {
          // Stable band patterns without time animation
          float bands = sin(lat * 18.0 + uSeed * 0.1) * 0.5 + 0.5;
          float turb = fbm(vec3(lon * 8.0, lat * 20.0, uSeed));
          
          // More detailed atmospheric layers for gas giants
          float layer1 = sin(lat * 32.0 + uSeed * 0.2) * 0.3 + 0.7;
          float layer2 = sin(lat * 12.0 + uSeed * 0.15) * 0.2 + 0.8;
          float stormPattern = ridged(vec3(lon * 4.0, lat * 8.0, uSeed + 50.0));
          
          vec3 hi = saturateColor(uBaseColor * (1.2 + 0.3 * turb + 0.15 * stormPattern), 0.4);
          vec3 lo = uBaseColor * (0.7 + 0.15 * turb);
          vec3 mid = uBaseColor * (0.9 + 0.1 * layer2);
          
          // Complex layered appearance
          surfaceColor = mix(lo, hi, bands);
          surfaceColor = mix(surfaceColor, mid, layer1 * 0.6);
        } else {
          // Enhanced terrestrial planets with planet-type specific features
          float sea = 0.5; // sea level
          float h = height * 1.1 - 0.05;
          waterMask = step(h, sea);
          
          // Planet-type specific terrain generation
          vec3 surfaceA, surfaceB, surfaceC;
          
          if (uPlanetType >= 3.5 && uPlanetType < 4.5) { // Ice worlds
            vec3 ice = vec3(0.85, 0.90, 0.95);
            vec3 deepIce = vec3(0.60, 0.75, 0.90);
            vec3 rock = vec3(0.30, 0.25, 0.22);
            vec3 cracks = vec3(0.20, 0.40, 0.60);
            
            float iceCracks = ridged(vec3(lon * 25.0, lat * 20.0, uSeed + 400.0));
            float exposed = smoothstep(0.7, 0.9, mountains);
            
            surfaceColor = mix(deepIce, ice, smoothstep(0.2, 0.8, height));
            surfaceColor = mix(surfaceColor, cracks, iceCracks * 0.4);
            surfaceColor = mix(surfaceColor, rock, exposed * 0.6);
            
          } else if (uPlanetType >= 4.5 && uPlanetType < 5.5) { // Desert worlds
            vec3 sand = vec3(0.8, 0.6, 0.3);
            vec3 darkSand = vec3(0.5, 0.4, 0.2);
            vec3 rock = vec3(0.4, 0.3, 0.25);
            vec3 dunes = vec3(0.9, 0.7, 0.4);
            
            float dunePattern = fbm(vec3(lon * 8.0, lat * 12.0, uSeed + 350.0));
            float rockFormations = ridged(vec3(lon * 20.0, lat * 16.0, uSeed + 450.0));
            
            surfaceColor = mix(darkSand, sand, smoothstep(0.2, 0.8, height));
            surfaceColor = mix(surfaceColor, dunes, dunePattern * 0.5);
            surfaceColor = mix(surfaceColor, rock, rockFormations * 0.7);
            
          } else if (uPlanetType >= 5.5 && uPlanetType < 6.5) { // Ocean worlds
            vec3 deepOcean = vec3(0.01, 0.08, 0.20);
            vec3 shallowOcean = vec3(0.05, 0.25, 0.45);
            vec3 coral = vec3(0.15, 0.45, 0.35);
            vec3 islands = vec3(0.6, 0.55, 0.4);
            
            // Coral reefs and underwater features
            float coralMask = ridged(vec3(lon * 15.0, lat * 15.0, uSeed + 100.0));
            vec3 waterColor = mix(deepOcean, shallowOcean, smoothstep(sea - 0.2, sea, h));
            waterColor = mix(waterColor, coral, coralMask * (1.0 - waterMask) * 0.4);
            vec3 landColor = mix(islands, coral, coralMask * 0.3);
            surfaceColor = mix(waterColor, landColor, 1.0 - waterMask);
            
          } else if (uPlanetType >= 6.5 && uPlanetType < 7.5) { // Volcanic worlds
            vec3 lava = vec3(0.8, 0.2, 0.1);
            vec3 cooledLava = vec3(0.15, 0.10, 0.08);
            vec3 ash = vec3(0.25, 0.22, 0.20);
            vec3 hotSpots = vec3(1.0, 0.4, 0.0);
            
            // Volcanic activity patterns
            float volcanic = ridged(vec3(lon * 12.0, lat * 8.0, uSeed + 200.0));
            float lavaFlows = fbm(vec3(lon * 20.0, lat * 16.0, uSeed + 300.0));
            
            surfaceColor = mix(cooledLava, ash, smoothstep(0.3, 0.7, height));
            surfaceColor = mix(surfaceColor, lava, volcanic * 0.6);
            surfaceColor = mix(surfaceColor, hotSpots, lavaFlows * volcanic * 0.3);
            
          } else if (uPlanetType >= 7.5 && uPlanetType < 8.5) { // Crystal worlds
            vec3 crystal = vec3(0.8, 0.9, 1.0);
            vec3 darkCrystal = vec3(0.4, 0.5, 0.7);
            vec3 prisms = vec3(0.9, 0.8, 1.0);
            vec3 energy = vec3(0.6, 0.9, 1.0);
            
            float crystalPattern = ridged(vec3(lon * 18.0, lat * 18.0, uSeed + 500.0));
            float facets = fbm(vec3(lon * 35.0, lat * 35.0, uSeed + 600.0));
            
            surfaceColor = mix(darkCrystal, crystal, smoothstep(0.3, 0.8, height));
            surfaceColor = mix(surfaceColor, prisms, crystalPattern * 0.7);
            surfaceColor = mix(surfaceColor, energy, facets * crystalPattern * 0.4);
            
          } else if (uPlanetType >= 8.5 && uPlanetType < 9.5) { // Toxic worlds
            vec3 toxicGreen = vec3(0.3, 0.6, 0.2);
            vec3 acidPools = vec3(0.6, 0.8, 0.1);
            vec3 poison = vec3(0.8, 0.9, 0.3);
            vec3 sludge = vec3(0.2, 0.3, 0.1);
            
            float toxic = fbm(vec3(lon * 14.0, lat * 14.0, uSeed + 700.0));
            float corrosion = ridged(vec3(lon * 22.0, lat * 22.0, uSeed + 800.0));
            
            surfaceColor = mix(sludge, toxicGreen, smoothstep(0.2, 0.7, height));
            surfaceColor = mix(surfaceColor, acidPools, toxic * 0.6);
            surfaceColor = mix(surfaceColor, poison, corrosion * toxic * 0.4);
            
          } else if (uPlanetType >= 9.5 && uPlanetType < 10.5) { // Metal worlds
            vec3 darkMetal = vec3(0.15, 0.15, 0.18);
            vec3 brightMetal = vec3(0.6, 0.6, 0.65);
            vec3 rust = vec3(0.4, 0.25, 0.15);
            vec3 chrome = vec3(0.8, 0.8, 0.85);
            
            float metalPattern = ridged(vec3(lon * 16.0, lat * 16.0, uSeed + 900.0));
            float corrosion = fbm(vec3(lon * 24.0, lat * 24.0, uSeed + 1000.0));
            
            surfaceColor = mix(darkMetal, brightMetal, smoothstep(0.4, 0.8, height));
            surfaceColor = mix(surfaceColor, rust, corrosion * 0.5);
            surfaceColor = mix(surfaceColor, chrome, metalPattern * 0.3);
            
          } else { // Default terrestrial
            vec3 deepWater = vec3(0.02, 0.1, 0.25);
            vec3 shallowWater = vec3(0.08, 0.3, 0.55);
            vec3 sand = vec3(0.76, 0.7, 0.5);
            vec3 grass = vec3(0.22, 0.55, 0.28);
            vec3 rock = vec3(0.42, 0.38, 0.36);
            vec3 snow = vec3(0.95, 0.97, 1.0);
            
            vec3 landColor = mix(sand, grass, smoothstep(sea, sea + 0.08, h));
            landColor = mix(landColor, rock, mountains);
            float snowLine = mix(0.85, 0.65, temp);
            landColor = mix(landColor, snow, smoothstep(snowLine, 1.0, h));
            vec3 waterColor = mix(deepWater, shallowWater, smoothstep(sea - 0.15, sea, h));
            surfaceColor = mix(waterColor, landColor, 1.0 - waterMask);
          }
          
          // Subtle element color tinting
          surfaceColor = mix(surfaceColor, uBaseColor, 0.12);
          surfaceColor = saturateColor(surfaceColor, 0.2);
        }
        
        // Lighting calculation (softer for hologram look)
        vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
        float NdotL = max(dot(normal, lightDirection), 0.0);
        
        // Stronger Fresnel for hologram rim
        float fresnel = pow(1.0 - abs(dot(normal, viewDirection)), 2.2);
        vec3 atmosphereGlow = uAtmosphereColor * fresnel * (uAtmosphereDensity * 1.0);
        
        // Specular highlight — stronger over water, softer over land
        vec3 halfV = normalize(lightDirection + viewDirection);
        float specStrength = mix(0.15, 0.6, waterMask);
        float spec = pow(max(dot(normal, halfV), 0.0), mix(24.0, 80.0, waterMask)) * specStrength;
        
        // Combine surface and atmosphere with stable lighting
        vec3 baseTint = uBaseColor * 0.4;
        vec3 finalColor = surfaceColor * (0.35 + 0.65 * NdotL) + atmosphereGlow + uEmissive + baseTint * 0.08 + vec3(spec);

        // Add metallic reflection for appropriate planet types
        if (uMetallic > 0.5) {
          vec3 reflectDirection = reflect(-viewDirection, normal);
          float metalSpec = pow(max(dot(reflectDirection, lightDirection), 0.0), 32.0);
          finalColor += vec3(1.0) * metalSpec * uMetallic;
        }
        
        // Stable surface detail enhancement based on planet seed
        float detailNoise = fbm(vec3(lon * 40.0, lat * 40.0, uSeed + 1000.0));
        finalColor *= (0.92 + 0.16 * detailNoise);

        // Stable transparency with realistic atmosphere edge
        float alpha = clamp(0.55 + fresnel * 0.25, 0.45, 0.85);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
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
        
        // Gentle brightness pulse for atmosphere without hue shift
        float pulse = 0.04 * sin(uTime * 0.8);
        vec3 glowColor = uColor * uGlow * (1.0 + pulse);
        
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
  
  // Enhanced planet type data for ultra-realistic worlds
  function getPlanetTypeData(type: PlanetType) {
    const typeData = {
      terrestrial: {
        surface: {
          roughness: 0.6,
          metallic: 0.1,
          normalStrength: 1.2,
          emissive: '#000000',
          landMass: 0.35,
          oceanDepth: 0.8,
          mountainHeight: 0.25,
          plateauSize: 0.15
        },
        colors: {
          ocean: '#1a4b84',
          land: '#8B4513',
          vegetation: '#228B22',
          snow: '#F8F8FF',
          desert: '#DEB887'
        }
      },
      gas_giant: {
        surface: {
          roughness: 0.2,
          metallic: 0.0,
          normalStrength: 0.8,
          emissive: '#001122',
          bandCount: 12,
          stormSize: 0.3,
          atmosphereThickness: 2.5
        },
        colors: {
          primaryBand: '#FF6B35',
          secondaryBand: '#4A90E2',
          storm: '#8B0000',
          glow: '#FFD700'
        }
      },
      ice_world: {
        surface: {
          roughness: 0.8,
          metallic: 0.3,
          normalStrength: 1.5,
          emissive: '#001133',
          iceThickness: 0.9,
          crackDensity: 0.4,
          reflectivity: 0.95
        },
        colors: {
          ice: '#B0E0E6',
          deepIce: '#4682B4',
          cracks: '#00008B',
          aurora: '#00FF7F'
        }
      },
      desert: {
        surface: {
          roughness: 0.9,
          metallic: 0.05,
          normalStrength: 1.8,
          emissive: '#331100',
          duneSize: 0.2,
          rockFormations: 0.3,
          oasisCount: 0.02
        },
        colors: {
          sand: '#DEB887',
          rock: '#8B4513',
          mesa: '#CD853F',
          oasis: '#228B22'
        }
      },
      ocean: {
        surface: {
          roughness: 0.1,
          metallic: 0.0,
          normalStrength: 0.6,
          emissive: '#000033',
          waveHeight: 0.05,
          islandSize: 0.08,
          coralReefs: 0.12,
          deepTrenches: 0.6
        },
        colors: {
          shallowWater: '#40E0D0',
          deepWater: '#191970',
          foam: '#F0F8FF',
          coral: '#FF7F50'
        }
      },
      volcanic: {
        surface: {
          roughness: 1.2,
          metallic: 0.2,
          normalStrength: 2.0,
          emissive: '#FF4500',
          lavaFlows: 0.25,
          craterSize: 0.35,
          ashClouds: 0.4,
          temperature: 1.8
        },
        colors: {
          lava: '#FF4500',
          cooledLava: '#2F4F4F',
          ash: '#696969',
          magma: '#DC143C'
        }
      },
      crystal: {
        surface: {
          roughness: 0.05,
          metallic: 0.9,
          normalStrength: 3.0,
          emissive: '#4B0082',
          crystalSize: 0.4,
          facetCount: 8,
          prismEffect: 1.5,
          resonance: 2.2
        },
        colors: {
          primaryCrystal: '#9932CC',
          secondaryCrystal: '#00CED1',
          energy: '#FFFF00',
          core: '#FF00FF'
        }
      },
      toxic: {
        surface: {
          roughness: 0.7,
          metallic: 0.3,
          normalStrength: 1.4,
          emissive: '#228B22',
          acidPools: 0.3,
          poisonGas: 0.6,
          corrosion: 0.8,
          bioLuminescence: 1.2
        },
        colors: {
          toxic: '#ADFF2F',
          acid: '#32CD32',
          poison: '#9ACD32',
          decay: '#556B2F'
        }
      },
      metal: {
        surface: {
          roughness: 0.3,
          metallic: 0.95,
          normalStrength: 1.0,
          emissive: '#1C1C1C',
          corrosion: 0.15,
          wireframe: 0.05,
          panels: 0.4,
          machinery: 0.25
        },
        colors: {
          steel: '#708090',
          copper: '#B87333',
          gold: '#FFD700',
          rust: '#CD853F'
        }
      }
    };
    
    return typeData[type] || typeData.terrestrial;
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
  
  // Create particle system for gravitational connections
  function createGravitationalParticles(scene: THREE.Scene, centralPlanetColor: string = '#38B6FF') {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    
    // Create particle positions along orbital paths
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const distances = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles along different orbital distances
      const orbitRadius = 2.5 + Math.random() * 8.5; // 2.5 to 11
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 0.8;
      
      positions[i3] = Math.cos(angle) * orbitRadius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * orbitRadius;
      
      // Velocity for orbital motion
      velocities[i3] = -Math.sin(angle) * 0.02 / orbitRadius; // Slower for outer orbits
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i3 + 2] = Math.cos(angle) * 0.02 / orbitRadius;
      
      phases[i] = Math.random() * Math.PI * 2;
      distances[i] = orbitRadius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('distance', new THREE.BufferAttribute(distances, 1));
    
    // Particle shader material
    const uniforms = {
      uTime: { value: 0 },
      uCentralPos: { value: new THREE.Vector3(0, 0, 1.2) },
      uCentralColor: { value: new THREE.Color(centralPlanetColor) },
      uSize: { value: 3.0 }
    };
    
    particleUniforms.current = uniforms;
    
    const vertexShader = `
      attribute vec3 velocity;
      attribute float phase;
      attribute float distance;
      
      uniform float uTime;
      uniform vec3 uCentralPos;
      uniform float uSize;
      
      varying float vAlpha;
      varying float vDistanceFactor;
      
      void main() {
        vec3 pos = position;
        
        // Orbital motion
        pos += velocity * uTime * 20.0;
        
        // Oscillating pull toward center
        vec3 toCentral = uCentralPos - pos;
        float distToCentral = length(toCentral);
        float pullStrength = 0.1 / (1.0 + distToCentral * 0.5);
        pos += normalize(toCentral) * sin(uTime * 2.0 + phase) * pullStrength;
        
        // Distance-based alpha for depth effect
        vDistanceFactor = 1.0 / (1.0 + distance * 0.1);
        vAlpha = vDistanceFactor * (0.3 + 0.7 * sin(uTime * 3.0 + phase));
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Distance-based size
        gl_PointSize = uSize * vDistanceFactor * (1.0 + sin(uTime * 4.0 + phase) * 0.3);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 uCentralColor;
      varying float vAlpha;
      varying float vDistanceFactor;
      
      void main() {
        // Circular particle shape
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        
        // Soft circular gradient
        float alpha = (1.0 - dist * 2.0) * vAlpha;
        
        // Color mixing between central planet color and cyan energy
        vec3 energyColor = mix(vec3(0.1, 0.9, 1.0), uCentralColor, vDistanceFactor * 0.6);
        
        gl_FragColor = vec4(energyColor, alpha * 0.8);
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particleSystemRef.current = particles;
    
    return particles;
  }
  
  // Create connection lines between central planet and orbiting planets
  function createConnectionLines(scene: THREE.Scene, satellites: Sat[], centralPos: THREE.Vector3, centralColor: string = '#38B6FF') {
    // Clear existing lines
    connectionLinesRef.current.forEach(line => {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    connectionLinesRef.current = [];
    
    satellites.forEach(sat => {
      if (!sat.mesh.visible) return; // Skip hidden satellites
      
      const points = [];
      const segmentCount = 20;
      
      // Create curved connection from central planet to satellite
      for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const satellitePos = sat.mesh.position;
        
        // Bezier-like curve with gravitational pull effect
        const midPoint = new THREE.Vector3()
          .lerpVectors(centralPos, satellitePos, 0.5)
          .add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.8, 0));
        
        const point = new THREE.Vector3()
          .lerpVectors(centralPos, satellitePos, t)
          .lerp(midPoint, Math.sin(t * Math.PI) * 0.4);
        
        points.push(point);
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Create gradient material
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(centralColor),
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      connectionLinesRef.current.push(line as any);
    });
  }
  
  // Create detailed planet geometry based on planet type
  function createPlanetGeometry(radius: number, geometry: PlanetGeometry) {
    // Validate inputs to prevent NaN values
    if (!radius || radius <= 0 || !isFinite(radius)) {
      if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('Invalid radius provided to createPlanetGeometry:', radius); }
      radius = 0.5; // fallback
    }
    
    const { segments, scale, deformation, poleFlattening, surfaceRoughness } = geometry;
    
    // Validate geometry parameters
    const safeScale = {
      x: (scale?.x && isFinite(scale.x) && scale.x > 0) ? scale.x : 1,
      y: (scale?.y && isFinite(scale.y) && scale.y > 0) ? scale.y : 1,
      z: (scale?.z && isFinite(scale.z) && scale.z > 0) ? scale.z : 1
    };
    
    const safeDeformation = (deformation && isFinite(deformation)) ? Math.max(0, Math.min(1, deformation)) : 0.05;
    const safePoleFlattening = (poleFlattening && isFinite(poleFlattening)) ? Math.max(0, Math.min(1, poleFlattening)) : 0.02;
    const safeSurfaceRoughness = (surfaceRoughness && isFinite(surfaceRoughness)) ? Math.max(0, Math.min(2, surfaceRoughness)) : 0.5;
    
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
      
      // Validate vector components
      if (!isFinite(vector.x) || !isFinite(vector.y) || !isFinite(vector.z)) {
        if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('Invalid vector components detected, skipping vertex:', i); }
        continue;
      }
      
      // Apply pole flattening (like gas giants) with safe math
      const latitudeInput = Math.max(-1, Math.min(1, vector.y / radius)); // clamp to valid asin range
      const latitude = Math.asin(latitudeInput);
      const poleEffect = Math.cos(latitude);
      
      if (isFinite(poleEffect)) {
        vector.y *= (1 - safePoleFlattening * poleEffect);
      }
      
      // Apply general deformation with noise
      const noiseValue = 
        Math.sin(vector.x * 8) * Math.cos(vector.z * 6) * 0.1 +
        Math.sin(vector.x * 16) * Math.cos(vector.z * 12) * 0.05 +
        Math.sin(vector.x * 32) * Math.cos(vector.z * 24) * 0.025;
      
      if (isFinite(noiseValue)) {
        const deformationFactor = 1 + (noiseValue * safeDeformation * safeSurfaceRoughness);
        if (isFinite(deformationFactor) && deformationFactor > 0) {
          vector.multiplyScalar(deformationFactor);
        }
      }
      
      // Apply scale with validation
      vector.x *= safeScale.x;
      vector.y *= safeScale.y;
      vector.z *= safeScale.z;
      
      // Final validation before setting position
      if (isFinite(vector.x) && isFinite(vector.y) && isFinite(vector.z)) {
        positions.setXYZ(i, vector.x, vector.y, vector.z);
      } else {
        if (process.env.NODE_ENV !== 'production') { /* eslint-disable-next-line no-console */ console.warn('NaN detected in final vector position, using fallback for vertex:', i); }
        // Use original position as fallback
        vector.fromBufferAttribute(positions, i);
        positions.setXYZ(i, vector.x * safeScale.x, vector.y * safeScale.y, vector.z * safeScale.z);
      }
    }
    
    // Recalculate normals for proper lighting
    baseGeometry.computeVertexNormals();
    
    return baseGeometry;
  }

  // Helper to add a realistic satellite mesh to the current system group
  function addSatLocal(id: string, planetData: any, r = 6.0, speed = 0.25, a = Math.random() * Math.PI * 2) {
    const sys = groupRef.current; if (!sys) return;
    // Add subtle per-planet size variation for a more organic feel
    const sizeJitter = 0.75 + Math.random() * 0.8; // 0.75x .. 1.55x
    const radius = (planetData.radius || 0.42) * sizeJitter;

    // Strengthen element-specific atmosphere hues for heart/lightning
    const element = (planetData && (planetData as any).element) || null;
    const tunedAtmosphere = planetData.atmosphere ? {
      ...planetData.atmosphere,
      color: (element === 'heart') ? '#FF6BCD' : (element === 'lightning') ? '#FFD84D' : planetData.atmosphere.color,
      glow: (element === 'heart') ? Math.max(planetData.atmosphere.glow || 0, 1.3) : (element === 'lightning') ? Math.max(planetData.atmosphere.glow || 0, 1.6) : (planetData.atmosphere.glow || 1.0),
    } : undefined;
    const tunedPlanetData = { ...planetData, atmosphere: tunedAtmosphere, seed: (planetData.seed ?? Math.random() * 1000) };
    const geometry = planetData.geometry || {
      segments: { widthSegments: 128, heightSegments: 128 },
      scale: { x: 1, y: 1, z: 1 },
      deformation: 0.05,
      poleFlattening: 0.02,
      surfaceRoughness: 0.5
    };
    
    // Main planet with detailed geometry
    const planetGeometry = createPlanetGeometry(radius, geometry);
    const material = makePlanetMaterial(tunedPlanetData);
    const mesh = new THREE.Mesh(planetGeometry, material);
    
    // Atmosphere
    let atmosphereMesh: THREE.Mesh | undefined;
    if (tunedPlanetData.atmosphere) {
      const atmosphereMat = makeAtmosphereMaterial(tunedPlanetData);
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

    // Hologram wireframe shell for added holographic feel
    try {
      const wireGeo = new THREE.SphereGeometry(radius * 1.01, Math.max(24, geometry.segments.widthSegments / 4), Math.max(16, geometry.segments.heightSegments / 4));
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x19E3FF, wireframe: true, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      mesh.add(wire);
    } catch {}
    
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
      planetData.weather.cloudLayers.forEach((cloudLayer) => {
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
      planetData.weather.storms.forEach((storm) => {
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
    cameraRef.current = camera;

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
      
      // Update camera focus for smooth transitions
      const camera = cameraRef.current;
      if (camera) {
        // Smoothly animate camera position to target
        camera.position.lerp(targetCameraPos.current, cameraTransitionSpeed.current);
        
        // Smoothly animate camera look-at target
        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        currentLookAt.add(camera.position);
        
        const targetLookDirection = targetCameraLookAt.current.clone().sub(camera.position).normalize();
        const currentLookDirection = currentLookAt.sub(camera.position).normalize();
        
        currentLookDirection.lerp(targetLookDirection, cameraTransitionSpeed.current);
        const newLookAt = camera.position.clone().add(currentLookDirection);
        camera.lookAt(newLookAt);
      }

      // Update central planet if it exists
      if (centralPlanet.mesh) {
        const hovered = !!hov && centralPlanet.id === hov;
        const osc = hovered ? (1 + 0.06 * Math.sin(t * 3.2)) : 1;
        const targetScale = (hovered ? 1.8 : 1.6) * osc; // Central planet is much larger
        const ms = centralPlanet.mesh.scale;
        ms.x += (targetScale - ms.x) * 0.18;
        ms.y = ms.x; ms.z = ms.x;
        // Position central planet slightly forward for better visibility
        centralPlanet.mesh.position.set(0, 0, 1.2);
        // Gentle rotation for the central planet
        centralPlanet.mesh.rotation.y += 0.003;
        
        // Drive planet shader uniforms
        try {
          const u: any = (centralPlanet.mesh.material as any).uniforms;
          
          // Update atmosphere and weather for central planet
          centralPlanet.mesh.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material) {
              const childU: any = (child.material as any).uniforms;
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
        
        // Apply muting effect when not in showAll mode and this satellite is not the focus
        const isFocused = mainId && s.id === mainId;
        const shouldMute = !showAll && mainId && !isFocused;
        
        // Set material opacity based on muting state
        if (s.mesh.material && typeof (s.mesh.material as any).opacity === 'number') {
          const targetOpacity = shouldMute ? 0.15 : 1.0;
          (s.mesh.material as any).opacity = targetOpacity;
          (s.mesh.material as any).transparent = true;
        }
        
        // Also mute atmosphere if present
        if (s.atmosphereMesh && s.atmosphereMesh.material && typeof (s.atmosphereMesh.material as any).opacity === 'number') {
          const targetOpacity = shouldMute ? 0.1 : (s.atmosphereMesh.material as any).originalOpacity || 0.8;
          (s.atmosphereMesh.material as any).opacity = targetOpacity;
          (s.atmosphereMesh.material as any).transparent = true;
        }
        
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
          
          // Update atmosphere if present
          if (s.atmosphereMesh && s.atmosphereMesh.material) {
            const atmU: any = (s.atmosphereMesh.material as any).uniforms;
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
              // Each cloud layer rotates at different speeds
              cloudLayer.rotation.y += 0.002 + idx * 0.001;
              cloudLayer.rotation.x += 0.0005;
            });
          }
          
          // Update storm systems
          if (s.stormSystems && s.stormSystems.length > 0 && s.weatherData) {
            s.stormSystems.forEach((storm, idx) => {
              const stormU: any = (storm.mesh.material as any).uniforms;
              
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
      // Update particle system
      if (particleSystemRef.current && particleUniforms.current) {
        try {
          particleUniforms.current.uTime.value = t;
          
          // Update central position if we have a central planet
          if (centralPlanet.mesh) {
            particleUniforms.current.uCentralPos.value.copy(centralPlanet.mesh.position);
            // Update particle visibility and intensity based on central planet
            const visibility = centralPlanet.mesh.visible ? 1.0 : 0.0;
            particleSystemRef.current.material.opacity = visibility * 0.8;
          } else {
            // Fade out particles when no central planet
            particleSystemRef.current.material.opacity *= 0.95;
          }
        } catch {}
      }
      
      // Update connection lines
      if (connectionLinesRef.current.length > 0 && centralPlanet.mesh) {
        connectionLinesRef.current.forEach((line, index) => {
          if (line && line.material) {
            // Animate line opacity with breathing effect
            const baseOpacity = 0.15;
            const breath = Math.sin(t * 2.0 + index * 0.5) * 0.05;
            (line.material as any).opacity = baseOpacity + breath;
          }
        });
      }
      
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

    // Mouse interaction for planet selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!onSongChange) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Check intersections with planet meshes
      const planetMeshes: THREE.Mesh[] = [];
      const planetIds: string[] = [];
      
      satsRef.current.forEach(sat => {
        if (sat.mesh) {
          planetMeshes.push(sat.mesh);
          planetIds.push(sat.id);
        }
      });

      const intersects = raycaster.intersectObjects(planetMeshes);
      
      if (intersects.length > 0) {
        const clickedMeshIndex = planetMeshes.indexOf(intersects[0].object as THREE.Mesh);
        if (clickedMeshIndex >= 0) {
          const planetId = planetIds[clickedMeshIndex];
          onSongChange(planetId);
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

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
      try { renderer.domElement.removeEventListener('click', onMouseClick); } catch {}
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
      // Cleanup particle system
      try {
        if (particleSystemRef.current) {
          particleSystemRef.current.geometry?.dispose();
          (particleSystemRef.current.material as THREE.Material)?.dispose();
        }
      } catch {}
      // Cleanup connection lines
      try {
        connectionLinesRef.current.forEach(line => {
          line.geometry?.dispose();
          (line.material as THREE.Material)?.dispose();
        });
      } catch {}
    };
  }, []);

  // Sync planets to songs from the global store for closer match to previous visuals
  const { songs, mainId, hoverId } = usePlayerStore((s) => ({ songs: s.songs, mainId: s.mainId, hoverId: s.hoverId }));
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
    const focusId = showAll ? null : mainId;
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
    
    // Clear connection lines when rebuilding
    connectionLinesRef.current.forEach(line => {
      try { 
        if (sys.parent) (sys.parent as THREE.Scene).remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      } catch {}
    });
    connectionLinesRef.current = [];
    
    // Reset camera to overview position when showing all planets
    if (showAll || !focusId) {
      targetCameraPos.current.set(0, 1.2, 16.0);
      targetCameraLookAt.current.set(0, 0, 0);
      cameraTransitionSpeed.current = 0.08;
      
      // Fade out particle system when no focus
      if (particleSystemRef.current) {
        (particleSystemRef.current.material as any).opacity = 0.2;
      }
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
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.35, depthWrite: false });
      const gridLineMat = new THREE.LineBasicMaterial({ color: 0x19e3ff, transparent: true, opacity: 0.25 });
      const indices = Array.from(ringMaxByIndex.keys()).sort((a, b) => a - b);
      
      // Create radial grid lines emanating from center
      const radialLineCount = 12;
      const maxRadius = Math.max(...Array.from(ringMaxByIndex.values()).map(v => v.r));
      for (let i = 0; i < radialLineCount; i++) {
        const angle = (i / radialLineCount) * Math.PI * 2;
        const lineGeometry = new THREE.BufferGeometry();
        const points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * maxRadius, 0, Math.sin(angle) * maxRadius)
        ];
        lineGeometry.setFromPoints(points);
        const radialLine = new THREE.Line(lineGeometry, gridLineMat.clone());
        sys.add(radialLine);
        ringsRef.current.push(radialLine as any);
      }
      
      for (const idx of indices) {
        const { r, tiltDeg } = ringMaxByIndex.get(idx)!;
        const g = new THREE.Group();
        g.rotation.x = -Math.PI / 2 + (tiltDeg * Math.PI / 180);
        
        // Main orbital ring with increased thickness
        const geom = new THREE.RingGeometry(Math.max(0, r - 0.03), r + 0.03, 128);
        const mesh = new THREE.Mesh(geom, ringMat.clone());
        g.add(mesh);
        
        // Add additional orbital path indicators - thinner inner and outer guides
        if (r > 1) {
          const innerGuideGeom = new THREE.RingGeometry(Math.max(0, r * 0.85 - 0.01), r * 0.85 + 0.01, 64);
          const innerGuideMesh = new THREE.Mesh(innerGuideGeom, new THREE.MeshBasicMaterial({ 
            color: 0x19e3ff, transparent: true, opacity: 0.15, depthWrite: false 
          }));
          g.add(innerGuideMesh);
          
          const outerGuideGeom = new THREE.RingGeometry(r * 1.15 - 0.01, r * 1.15 + 0.01, 64);
          const outerGuideMesh = new THREE.Mesh(outerGuideGeom, new THREE.MeshBasicMaterial({ 
            color: 0x19e3ff, transparent: true, opacity: 0.15, depthWrite: false 
          }));
          g.add(outerGuideMesh);
        }
        
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
    if (focusId) {
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
    } else {
      // Clear focus when showing all planets (homepage mode)
      focusTargetRy.current = null;
    }
    // Update main planet
    // const mainEntry = focusId ? songs.find(s => s.id === focusId) : null;
    const main = mainRef.current.mesh;
    if (main) main.visible = false; // no separate central planet; every song has its own
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, mainId, showAll, layout && Object.keys(layout).join(',')]);

  // When the selected song changes, create central planet and update orbital system
  useEffect(() => {
    console.log("🌍 Central planet effect triggered, mainId:", mainId);
    const sys = groupRef.current; if (!sys) return;
    const id = mainId; if (!id) { console.log("❌ No mainId, skipping central planet"); return; }
    const sat = satsRef.current.find(s => s.id === id);
    if (!sat) { console.log("❌ No satellite found for id:", id, "Available satellites:", satsRef.current.map(s => s.id)); return; }
    console.log("✅ Creating central planet for:", id);
    
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
    // Strengthen element-specific atmosphere for the central planet as well
    const element = (planetData && (planetData as any).element) || null;
    const tunedAtmosphere = planetData.atmosphere ? {
      ...planetData.atmosphere,
      color: (element === 'heart') ? '#FF6BCD' : (element === 'lightning') ? '#FFD84D' : planetData.atmosphere.color,
      glow: (element === 'heart') ? Math.max(planetData.atmosphere.glow || 0, 1.3) : (element === 'lightning') ? Math.max(planetData.atmosphere.glow || 0, 1.6) : (planetData.atmosphere.glow || 1.0),
    } : undefined;
    const enhancedPlanetData = {
      ...planetData,
      atmosphere: tunedAtmosphere,
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
    const centralMat = makePlanetMaterial({ ...enhancedPlanetData, seed: (enhancedPlanetData as any).seed ?? Math.random() * 1000 });
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
    
    // Hologram wireframe shell on central planet
    try {
      const wireGeo = new THREE.SphereGeometry(centralRadius * 1.01, 48, 32);
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x19E3FF, wireframe: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      centralMesh.add(wire);
    } catch {}

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
    centralMesh.position.set(0, 0, 1.2);
    centralMesh.scale.set(1.6, 1.6, 1.6); // Start even larger
    centralMesh.visible = true; // Ensure central planet is visible
    sys.add(centralMesh);
    console.log("🎯 Central planet created and added to scene:", id, "Position:", centralMesh.position, "Visible:", centralMesh.visible);
    
    // Update central planet reference
    centralPlanetRef.current = {
      id: id,
      mesh: centralMesh,
      originalSat: sat
    };
    
    // Set camera to focus on the central planet with cinematic positioning
    const planetColor = new THREE.Color(enhancedPlanetData.color || '#38B6FF');
    const isWarmColor = planetColor.r > 0.6 || (planetColor.r + planetColor.g) > 1.0;
    
    // Dynamic camera positioning based on planet characteristics
    const baseDistance = 12.0; // Increased from 8.5 for more breathing room
    const focusDistance = baseDistance * (isWarmColor ? 1.1 : 0.95); // Slightly further for warm colors
    const heightOffset = isWarmColor ? 2.2 : 1.8; // Increased height for better overview
    
    // Set target camera position - zoomed out for better composition
    targetCameraPos.current.set(0, heightOffset, focusDistance);
    targetCameraLookAt.current.set(0, 0, 1.2); // Look at central planet position
    
    // Faster transition for focus changes
    cameraTransitionSpeed.current = 0.12;
    
    // Create particle system for gravitational effects
    if (!particleSystemRef.current) {
      const scene = sys.parent as THREE.Scene;
      if (scene) {
        createGravitationalParticles(scene, enhancedPlanetData.color || '#38B6FF');
      }
    } else {
      // Update existing particle system color
      if (particleUniforms.current) {
        particleUniforms.current.uCentralColor.value.set(enhancedPlanetData.color || '#38B6FF');
        particleUniforms.current.uCentralPos.value.set(0, 0, 1.2);
      }
    }
    
    // Create connection lines to orbiting planets
    const scene = sys.parent as THREE.Scene;
    if (scene) {
      const visibleSatellites = satsRef.current.filter(sat => sat.mesh.visible);
      createConnectionLines(scene, visibleSatellites, new THREE.Vector3(0, 0, 1.2), enhancedPlanetData.color || '#38B6FF');
    }
    
    // Reset system rotation to face forward since central planet is now at origin
    focusTargetRy.current = 0;
    
  }, [mainId]);

  // Hover behavior handled in main tick via hoverRef

  return <div ref={mountRef} className="absolute inset-0" style={{ background: "transparent" }} />;
}
