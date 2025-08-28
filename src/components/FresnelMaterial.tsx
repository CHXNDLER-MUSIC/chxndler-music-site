"use client";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import { Color } from "three";

// Simple Fresnel rim glow material (additive, transparent)
const FresnelMat = shaderMaterial(
  {
    uColor: new Color("#19E3FF"),
    uPower: 2.0,
    uIntensity: 1.0,
  },
  // vertex
  /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // fragment
  /* glsl */`
    uniform vec3 uColor;
    uniform float uPower;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), uPower);
      vec3 col = uColor * rim * uIntensity;
      gl_FragColor = vec4(col, rim);
    }
  `
);

extend({ FresnelMat });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      fresnelMat: any;
    }
  }
}

export default FresnelMat;

