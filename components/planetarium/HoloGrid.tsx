'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Custom shader material for holographic grid
const HoloGridMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0.08,
    uColor: new THREE.Color(0x00d4aa),
    uGridSize: 2.0,
    uLineWidth: 0.015,
    uFadeRadius: 0.85,
    uParallax: new THREE.Vector2(0, 0),
    uDriftSpeed: 0.02
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uGridSize;
    uniform float uLineWidth;
    uniform float uFadeRadius;
    uniform vec2 uParallax;
    uniform float uDriftSpeed;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    float grid(vec2 uv, float size, float lineWidth) {
      vec2 gridUv = fract(uv * size);

      // Soft grid lines using smoothstep for anti-aliasing
      float lineX = smoothstep(0.0, lineWidth, gridUv.x) * smoothstep(1.0, 1.0 - lineWidth, gridUv.x);
      float lineY = smoothstep(0.0, lineWidth, gridUv.y) * smoothstep(1.0, 1.0 - lineWidth, gridUv.y);

      // Invert to get lines instead of cells
      float gridLine = 1.0 - (lineX * lineY);

      return gridLine;
    }

    void main() {
      // Apply parallax offset and time-based drift
      vec2 uv = vUv - 0.5;
      uv += uParallax * 0.02;
      uv += vec2(sin(uTime * uDriftSpeed * 0.7) * 0.01, cos(uTime * uDriftSpeed) * 0.008);
      uv += 0.5;

      // Calculate grid with slight perspective distortion at edges
      float perspectiveFactor = 1.0 + (length(vUv - 0.5) * 0.3);
      float gridValue = grid(uv, uGridSize * perspectiveFactor, uLineWidth);

      // Add a secondary finer grid for holographic depth
      float fineGrid = grid(uv * 0.5, uGridSize * 3.0 * perspectiveFactor, uLineWidth * 0.5) * 0.3;
      gridValue = max(gridValue, fineGrid);

      // Radial vignette fade - strongest at center, fades at edges
      float dist = length(vUv - 0.5) * 2.0;
      float vignette = 1.0 - smoothstep(uFadeRadius * 0.5, uFadeRadius, dist);

      // Additional falloff for softer edges
      vignette *= smoothstep(1.0, 0.3, dist);

      // Subtle pulse animation for hologram feel
      float pulse = 0.95 + 0.05 * sin(uTime * 0.5);

      // Combine everything
      float alpha = gridValue * vignette * uOpacity * pulse;

      // Slight color variation for holographic effect
      vec3 color = uColor;
      color += vec3(0.02, 0.05, 0.03) * sin(uTime * 0.3 + vUv.x * 5.0);

      // Discard nearly invisible pixels for performance
      if (alpha < 0.001) discard;

      gl_FragColor = vec4(color, alpha);
    }
  `
);

// Extend R3F with the custom material
extend({ HoloGridMaterial });

// TypeScript declaration for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      holoGridMaterial: any;
    }
  }
}

interface HoloGridProps {
  opacity?: number;
  color?: string | THREE.Color;
  gridSize?: number;
  fadeRadius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  enableParallax?: boolean;
}

export const HoloGrid = React.memo(({
  opacity = 0.08,
  color = '#00d4aa',
  gridSize = 2.0,
  fadeRadius = 0.85,
  position = [0, -5, 0],
  rotation = [-Math.PI / 2.2, 0, 0],
  scale = 80,
  enableParallax = true
}: HoloGridProps) => {
  const materialRef = useRef<any>(null);
  const { camera, pointer } = useThree();

  // Convert color to THREE.Color
  const gridColor = useMemo(() => {
    return new THREE.Color(color);
  }, [color]);

  // Animation loop
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;

      if (enableParallax) {
        // Smooth parallax based on pointer position
        const targetX = pointer.x * 0.5;
        const targetY = pointer.y * 0.5;

        materialRef.current.uParallax.x = THREE.MathUtils.lerp(
          materialRef.current.uParallax.x,
          targetX,
          0.02
        );
        materialRef.current.uParallax.y = THREE.MathUtils.lerp(
          materialRef.current.uParallax.y,
          targetY,
          0.02
        );
      }
    }
  });

  return (
    <mesh
      position={position}
      rotation={rotation}
      renderOrder={-100}
    >
      <planeGeometry args={[scale, scale, 1, 1]} />
      <holoGridMaterial
        ref={materialRef}
        uOpacity={opacity}
        uColor={gridColor}
        uGridSize={gridSize}
        uFadeRadius={fadeRadius}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
});

HoloGrid.displayName = 'HoloGrid';

export default HoloGrid;
