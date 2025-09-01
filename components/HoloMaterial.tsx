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
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x)+ (d-b)*u.x*u.y;
  }
  // Grid lines over spherical UVs (lat/long) for hologram feel
  float gridMask(vec2 uv, float cellsX, float cellsY, float width){
    float gx = abs(fract(uv.x * cellsX) - 0.5);
    float gy = abs(fract(uv.y * cellsY) - 0.5);
    float lx = smoothstep(0.5 - width, 0.5, gx);
    float ly = smoothstep(0.5 - width, 0.5, gy);
    return max(lx, ly);
  }

  void main(){
    vec3 viewDir = vec3(0.0,0.0,1.0);
    float fr = fresnelTerm(vNormal, viewDir, uFresnelPower);

    // subtle horizontal scanlines
    float scans = sin((vUv.y + uTime*0.4) * 800.0) * 0.5 + 0.5;
    float scanMask = mix(1.0, scans, uScanIntensity);

    // slight shimmer
    float shimmer = 0.04 * noise(vUv * 40.0 + uTime*0.6);

    // sweeping band
    float sweep = smoothstep(0.42, 0.5, 0.5 + 0.5*sin(uTime*1.2 + vUv.y*6.28318));
    
    // grid overlay (fewer cells + thicker lines for visibility)
  float grid = gridMask(vUv, 20.0, 10.0, 0.04);
  // secondary finer grid for denser pattern
  float gridFine = gridMask(vUv + vec2(0.001 * sin(uTime), 0.0), 60.0, 30.0, 0.014);

    vec3 col = uBaseColor * (0.55 + shimmer);
    col = mix(col, uGlowColor, fr);
    // add grid and sweep as additive highlights (stronger coarse grid + subtle fine grid)
    col += uGlowColor * 0.7 * grid;
    col += uGlowColor * 0.4 * gridFine;
    col += uGlowColor * 0.2 * sweep;
    col *= scanMask * uBrighten;

    gl_FragColor = vec4(col, uAlpha);
  }
`;
