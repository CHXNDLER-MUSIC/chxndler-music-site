"use client";

import { AdditiveBlending, Color, ShaderMaterial } from "three";
import { extend, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

class HoloMat extends ShaderMaterial {}
extend({ HoloMat });

export default function HoloMaterial({
  baseColor,
  glowColor,
  scanIntensity = 0.22,
  fresnelPower = 2.2,
  brighten = 1.1,
  alpha = 0.5,
  depthFactor = 1.0,
}: any) {
  const mat = useRef<any>(null);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBaseColor: { value: new Color(baseColor) },
      uGlowColor: { value: new Color(glowColor) },
      uScanIntensity: { value: scanIntensity },
      uFresnelPower: { value: fresnelPower },
      uBrighten: { value: (brighten as number) * (depthFactor as number) },
      uAlpha: { value: (alpha as number) * (depthFactor as number) },
    }),
    [baseColor, glowColor, scanIntensity, fresnelPower, brighten, alpha, depthFactor]
  );

  // @ts-ignore
  return (
    <holoMat
      ref={mat}
      uniforms={uniforms}
      vertexShader={vs}
      fragmentShader={fs}
      transparent
      blending={AdditiveBlending}
      depthWrite={false}
    />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      holoMat: any;
    }
  }
}

const vs = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const fs = /* glsl */ `
  uniform float uTime;
  uniform vec3  uBaseColor;
  uniform vec3  uGlowColor;
  uniform float uScanIntensity;
  uniform float uFresnelPower;
  uniform float uBrighten;
  uniform float uAlpha;
  varying vec3 vNormal;
  varying vec2 vUv;

  float fresnelTerm(vec3 n, vec3 v, float p){
    return pow(1.0 - max(dot(normalize(n), normalize(v)), 0.0), p);
  }
  
  float hash(vec2 p){ 
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); 
  }
  
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x)+ (d-b)*u.x*u.y;
  }
  
  // Ultra-enhanced grid lines with multi-layer holographic distortion
  float gridMask(vec2 uv, float cellsX, float cellsY, float width){
    // Multi-layer holographic distortion for more realistic hologram appearance
    vec2 wave1 = vec2(
      0.003 * sin(uTime * 2.0 + uv.y * 20.0 + uv.x * 5.0),
      0.002 * cos(uTime * 1.5 + uv.x * 15.0 + uv.y * 8.0)
    );
    vec2 wave2 = vec2(
      0.001 * sin(uTime * 3.2 + uv.y * 35.0),
      0.0015 * cos(uTime * 2.8 + uv.x * 25.0)
    );
    vec2 wave3 = vec2(
      0.0008 * sin(uTime * 4.1 + (uv.x + uv.y) * 40.0),
      0.0006 * cos(uTime * 3.7 + (uv.x - uv.y) * 30.0)
    );
    
    vec2 distortedUV = uv + wave1 + wave2 + wave3;
    
    // Multiple grid frequencies for layered depth
    float gx = abs(fract(distortedUV.x * cellsX) - 0.5);
    float gy = abs(fract(distortedUV.y * cellsY) - 0.5);
    
    // Enhanced smoothstep for sharper but anti-aliased lines
    float lx = 1.0 - smoothstep(0.5 - width * 2.0, 0.5 - width * 0.5, gx);
    float ly = 1.0 - smoothstep(0.5 - width * 2.0, 0.5 - width * 0.5, gy);
    
    // Combine with multiplicative blending for more realistic intersection
    return lx * ly + max(lx, ly) * 0.3;
  }
  
  // Advanced holographic interference patterns with laser coherence
  float interference(vec2 uv, float time) {
    // Primary interference from coherent laser beams
    float wave1 = sin(uv.x * 45.0 + time * 3.0 + uv.y * 8.0);
    float wave2 = sin(uv.y * 38.0 + time * 2.5 + uv.x * 6.0);
    float wave3 = sin((uv.x + uv.y) * 28.0 + time * 4.0);
    float wave4 = sin((uv.x - uv.y) * 32.0 + time * 3.8);
    
    // Secondary harmonics for depth
    float harm1 = sin(uv.x * 90.0 + time * 6.0) * 0.3;
    float harm2 = sin(uv.y * 76.0 + time * 5.0) * 0.25;
    
    // Constructive and destructive interference
    float primary = (wave1 + wave2 + wave3 + wave4) * 0.25;
    float secondary = (harm1 + harm2) * 0.5;
    
    // Beat frequencies for realistic hologram flicker
    float beat = sin(time * 0.8) * 0.1;
    
    return (primary + secondary + beat) * 0.8;
  }
  
  // Chromatic aberration effect
  vec3 chromaticAberration(vec2 uv, float intensity) {
    vec2 offset = vec2(intensity * 0.003, 0.0);
    float r = fresnelTerm(vNormal, vec3(0.0,0.0,1.0), uFresnelPower + 0.2);
    float g = fresnelTerm(vNormal, vec3(0.0,0.0,1.0), uFresnelPower);
    float b = fresnelTerm(vNormal, vec3(0.0,0.0,1.0), uFresnelPower - 0.2);
    return vec3(r, g, b);
  }

  void main(){
    vec3 viewDir = vec3(0.0,0.0,1.0);
    float fr = fresnelTerm(vNormal, viewDir, uFresnelPower);

    // Ultra-enhanced scanlines with realistic CRT phosphor decay
    float scans1 = pow(sin((vUv.y + uTime * 0.4) * 1200.0) * 0.5 + 0.5, 0.8);
    float scans2 = pow(sin((vUv.y + uTime * 0.8) * 600.0) * 0.3 + 0.5, 1.2);
    float scans3 = pow(sin((vUv.y - uTime * 0.6) * 1800.0) * 0.2 + 0.5, 1.5);
    float scans4 = sin((vUv.y + uTime * 0.3) * 2400.0) * 0.15 + 0.5;
    
    // Interlaced effect for authentic display appearance
    float interlace = step(0.5, fract(vUv.y * 300.0));
    
    // Phosphor persistence effect
    float phosphor = exp(-mod(vUv.y * 600.0 + uTime * 100.0, 1.0) * 8.0) * 0.3 + 0.7;
    
    float scanMask = mix(1.0, scans1 * scans2 * scans3 * scans4 * (0.8 + interlace * 0.2) * phosphor, uScanIntensity);

    // Enhanced shimmer with multiple octaves
    float shimmer = 0.05 * noise(vUv * 40.0 + uTime * 0.6) + 
                   0.03 * noise(vUv * 80.0 + uTime * 1.2) +
                   0.02 * noise(vUv * 160.0 + uTime * 0.9);

    // Multiple sweeping bands
    float sweep1 = smoothstep(0.42, 0.5, 0.5 + 0.5 * sin(uTime * 1.2 + vUv.y * 6.28318));
    float sweep2 = smoothstep(0.35, 0.45, 0.5 + 0.3 * sin(uTime * 0.8 + vUv.x * 4.0 + vUv.y * 2.0));
    float sweep3 = smoothstep(0.4, 0.48, 0.5 + 0.4 * sin(uTime * 1.5 + (vUv.x + vUv.y) * 8.0));
    
    // Ultra-enhanced multi-layer grid system with parallax depth
    float grid = gridMask(vUv, 25.0, 12.0, 0.045);
    float gridFine = gridMask(vUv + vec2(0.003 * sin(uTime * 1.2), 0.002 * cos(uTime * 1.5)), 75.0, 35.0, 0.015);
    float gridUltraFine = gridMask(vUv * 2.0 + vec2(0.0015 * sin(uTime * 2.2), 0.001 * cos(uTime * 1.8)), 150.0, 70.0, 0.006);
    float gridMicro = gridMask(vUv * 3.0 + vec2(0.0008 * sin(uTime * 3.1), 0.0006 * cos(uTime * 2.7)), 300.0, 140.0, 0.003);
    
    // Dynamic grid fade based on viewing angle for realistic hologram depth
    float gridDepth = fr * 0.8 + 0.2;

    // Holographic interference
    float interf = interference(vUv, uTime) * 0.15;
    
    // Chromatic aberration
    vec3 chromatic = chromaticAberration(vUv, fr);
    
    // Data stream effect
    float dataStream = step(0.98, hash13(vec3(floor(vUv * 50.0), floor(uTime * 10.0)))) * 
                      smoothstep(0.0, 0.1, sin(uTime * 8.0 + vUv.y * 30.0));

    // Enhanced color mixing
    vec3 col = uBaseColor * (0.6 + shimmer);
    col = mix(col, uGlowColor * chromatic, fr * 0.8);
    
    // Add all enhanced holographic effects with depth weighting
    col += uGlowColor * 0.9 * grid * gridDepth;
    col += uGlowColor * 0.6 * gridFine * gridDepth;
    col += uGlowColor * 0.35 * gridUltraFine * gridDepth;
    col += uGlowColor * 0.2 * gridMicro * gridDepth;
    col += uGlowColor * 0.35 * sweep1;
    col += uGlowColor * 0.25 * sweep2;
    col += uGlowColor * 0.18 * sweep3;
    col += uGlowColor * interf * 1.2;
    col += uGlowColor * 0.7 * dataStream;
    
    // Additional holographic depth cueing
    float depthCue = smoothstep(0.2, 0.8, fr);
    col += uGlowColor * depthCue * 0.1;
    
    // Apply final effects
    col *= scanMask * uBrighten;
    
    // Add slight color noise for realism
    col += vec3(
      hash(vUv + uTime) - 0.5,
      hash(vUv * 1.1 + uTime * 1.1) - 0.5,
      hash(vUv * 0.9 + uTime * 0.9) - 0.5
    ) * 0.01;

    gl_FragColor = vec4(col, uAlpha);
  }
`;
