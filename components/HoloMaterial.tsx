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
  
  // Enhanced holographic instability and power fluctuations
  float holoFlicker(float time) {
    // Primary power fluctuation (like old projectors)
    float powerFlicker = 0.95 + 0.05 * sin(time * 0.8 + sin(time * 1.3) * 2.0);
    
    // Random electrical interference
    float interference = 0.98 + 0.02 * sin(time * 12.0 + sin(time * 23.0));
    
    // Occasional major glitches
    float glitch = step(0.98, hash(vec2(floor(time * 2.0), 0.0))) * 
                   (0.3 + 0.7 * sin(time * 50.0));
    
    return powerFlicker * interference * (1.0 - glitch);
  }
  
  // Holographic projection depth distortion
  float holoDepthWarp(vec2 uv, float time) {
    // Simulate the way holograms shift with viewing angle
    float warp1 = sin(uv.x * 15.0 + time * 2.0 + uv.y * 5.0) * 0.003;
    float warp2 = cos(uv.y * 12.0 + time * 1.5 + uv.x * 8.0) * 0.002;
    float warp3 = sin((uv.x + uv.y) * 20.0 + time * 3.0) * 0.001;
    
    return warp1 + warp2 + warp3;
  }
  
  // Coherent laser interference patterns
  float laserInterference(vec2 uv, float time) {
    // Multiple coherent laser beams creating interference
    float beam1 = sin(uv.x * 80.0 + time * 4.0 + uv.y * 15.0);
    float beam2 = sin(uv.y * 75.0 + time * 3.5 + uv.x * 20.0);
    float beam3 = sin((uv.x + uv.y) * 55.0 + time * 5.0);
    float beam4 = sin((uv.x - uv.y) * 65.0 + time * 4.5);
    
    // Beat patterns from slightly different frequencies
    float beat1 = sin(time * 0.3) * 0.2;
    float beat2 = cos(time * 0.7) * 0.15;
    
    return (beam1 + beam2 + beam3 + beam4) * 0.25 + beat1 + beat2;
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
    
    // Apply holographic instability
    float flicker = holoFlicker(uTime);
    
    // Apply depth warping to UV coordinates
    vec2 warpedUV = vUv + vec2(holoDepthWarp(vUv, uTime));
    
    // Enhanced laser interference
    float laser = laserInterference(warpedUV, uTime) * 0.08;

    // Ultra-enhanced scanlines with realistic CRT phosphor decay and flicker
    float scans1 = pow(sin((warpedUV.y + uTime * 0.4) * 1200.0) * 0.5 + 0.5, 0.8);
    float scans2 = pow(sin((warpedUV.y + uTime * 0.8) * 600.0) * 0.3 + 0.5, 1.2);
    float scans3 = pow(sin((warpedUV.y - uTime * 0.6) * 1800.0) * 0.2 + 0.5, 1.5);
    float scans4 = sin((warpedUV.y + uTime * 0.3) * 2400.0) * 0.15 + 0.5;
    
    // Interlaced effect with holographic instability
    float interlace = step(0.5, fract(warpedUV.y * 300.0));
    
    // Enhanced phosphor persistence with flicker
    float phosphor = exp(-mod(warpedUV.y * 600.0 + uTime * 100.0, 1.0) * 8.0) * 0.3 + 0.7;
    
    float scanMask = mix(1.0, scans1 * scans2 * scans3 * scans4 * (0.8 + interlace * 0.2) * phosphor * flicker, uScanIntensity);

    // Enhanced shimmer with holographic instability
    float shimmer = (0.05 * noise(warpedUV * 40.0 + uTime * 0.6) + 
                    0.03 * noise(warpedUV * 80.0 + uTime * 1.2) +
                    0.02 * noise(warpedUV * 160.0 + uTime * 0.9)) * flicker;

    // Multiple sweeping bands with depth warping
    float sweep1 = smoothstep(0.42, 0.5, 0.5 + 0.5 * sin(uTime * 1.2 + warpedUV.y * 6.28318));
    float sweep2 = smoothstep(0.35, 0.45, 0.5 + 0.3 * sin(uTime * 0.8 + warpedUV.x * 4.0 + warpedUV.y * 2.0));
    float sweep3 = smoothstep(0.4, 0.48, 0.5 + 0.4 * sin(uTime * 1.5 + (warpedUV.x + warpedUV.y) * 8.0));
    
    // Ultra-enhanced multi-layer grid system with holographic distortion
    float grid = gridMask(warpedUV, 25.0, 12.0, 0.045) * flicker;
    float gridFine = gridMask(warpedUV + vec2(0.003 * sin(uTime * 1.2), 0.002 * cos(uTime * 1.5)), 75.0, 35.0, 0.015) * flicker;
    float gridUltraFine = gridMask(warpedUV * 2.0 + vec2(0.0015 * sin(uTime * 2.2), 0.001 * cos(uTime * 1.8)), 150.0, 70.0, 0.006) * flicker;
    float gridMicro = gridMask(warpedUV * 3.0 + vec2(0.0008 * sin(uTime * 3.1), 0.0006 * cos(uTime * 2.7)), 300.0, 140.0, 0.003) * flicker;
    
    // Dynamic grid fade based on viewing angle with enhanced depth
    float gridDepth = fr * 0.8 + 0.2;

    // Enhanced holographic interference
    float interf = interference(warpedUV, uTime) * 0.15 * flicker;
    
    // Chromatic aberration with instability
    vec3 chromatic = chromaticAberration(warpedUV, fr) * flicker;
    
    // Data stream effect with flickering
    float dataStream = step(0.98, hash13(vec3(floor(warpedUV * 50.0), floor(uTime * 10.0)))) * 
                      smoothstep(0.0, 0.1, sin(uTime * 8.0 + warpedUV.y * 30.0)) * flicker;

    // Holographic projection lines (like light beams)
    float projectionLines = 0.0;
    for(int i = 0; i < 5; i++) {
      float angle = float(i) * 0.628318 + uTime * 0.5;
      vec2 dir = vec2(cos(angle), sin(angle));
      float line = 1.0 - smoothstep(0.0, 0.01, abs(dot(warpedUV - 0.5, dir)));
      projectionLines += line * 0.02;
    }

    // Enhanced color mixing with holographic effects
    vec3 col = uBaseColor * (0.6 + shimmer);
    col = mix(col, uGlowColor * chromatic, fr * 0.8);
    
    // Add all enhanced holographic effects with instability
    col += uGlowColor * 1.2 * grid * gridDepth;
    col += uGlowColor * 0.8 * gridFine * gridDepth;
    col += uGlowColor * 0.5 * gridUltraFine * gridDepth;
    col += uGlowColor * 0.3 * gridMicro * gridDepth;
    col += uGlowColor * 0.35 * sweep1 * flicker;
    col += uGlowColor * 0.25 * sweep2 * flicker;
    col += uGlowColor * 0.18 * sweep3 * flicker;
    col += uGlowColor * interf * 1.5;
    col += uGlowColor * 0.9 * dataStream;
    col += uGlowColor * laser * 2.0;
    col += uGlowColor * projectionLines * 3.0;
    
    // Additional holographic depth cueing with flicker
    float depthCue = smoothstep(0.2, 0.8, fr) * flicker;
    col += uGlowColor * depthCue * 0.15;
    
    // Apply holographic power fluctuations
    col *= scanMask * uBrighten * flicker;
    
    // Enhanced noise with holographic characteristics
    vec3 holoNoise = vec3(
      hash(warpedUV + uTime) - 0.5,
      hash(warpedUV * 1.1 + uTime * 1.1) - 0.5,
      hash(warpedUV * 0.9 + uTime * 0.9) - 0.5
    ) * 0.015 * flicker;
    
    col += holoNoise;
    
    // Add occasional holographic "refresh" effect
    float refresh = step(0.995, hash(vec2(floor(uTime * 0.5), 0.0))) * 
                   sin(uTime * 100.0) * 0.1;
    col += uGlowColor * refresh;

    gl_FragColor = vec4(col, uAlpha * flicker);
  }
`;
