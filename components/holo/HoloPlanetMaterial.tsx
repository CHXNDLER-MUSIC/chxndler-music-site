"use client";

import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import { Color } from "three";

// Holographic planet material:
// - Bright center, darker edges (view-dependent)
// - Soft teal/cyan base with inner cyan bloom
// - Subtle speckle/nebula noise
// - Slight directional darkening (bottom-left) for 3D curvature
const HoloPlanetMat = shaderMaterial(
  {
    uBase: new Color("#0C2A33"),      // deep teal base
    uInner: new Color("#19E3FF"),     // cyan inner glow
    uOpacity: 0.85,
    uSpeckle: 0.25,
    uTime: 0,
  },
  // vertex
  /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      vPos = position;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // fragment
  /* glsl */`
    uniform vec3 uBase;
    uniform vec3 uInner;
    uniform float uOpacity;
    uniform float uSpeckle;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    
    // simple hash noise from a direction vector
    float hash31(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }
    
    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(vViewDir);
      // center factor: 1 at screen center, 0 toward edges
      float center = clamp(dot(n, v), 0.0, 1.0);
      center = pow(center, 1.15);
      // base gradient mix
      vec3 col = mix(uBase, uInner, center * 0.85);
      
      // subtle nebula-like speckles
      float s = hash31(n * 47.0 + vec3(0.123, 0.456, 0.789));
      float speck = step(0.975, s) * (0.4 + 0.6 * fract(sin(s * 123.45 + uTime * 0.5)));
      col += uSpeckle * speck * (0.5 + 0.5 * center);
      
      // directional darkening (bottom-left)
      vec3 darkDir = normalize(vec3(-0.45, -0.35, 0.2));
      float shade = 0.85 - 0.15 * max(dot(n, darkDir), 0.0);
      col *= shade;
      
      gl_FragColor = vec4(col, uOpacity);
    }
  `
);

extend({ HoloPlanetMat });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      holoPlanetMat: any;
    }
  }
}

export default HoloPlanetMat;

