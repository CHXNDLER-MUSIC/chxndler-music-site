'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

type HologramGridProps = {
  // World-space size of the grid plane
  width?: number;
  height?: number;
  // World-space cell size. Smaller = denser grid
  cellSize?: number;
  // Pixel size of the generated texture tile (64–128 recommended)
  textureSize?: number;
  // Line appearance
  lineColor?: string; // CSS color for the grid lines
  lineAlpha?: number; // 0..1 alpha for the line color
  // Layering
  baseZ?: number; // Z for the first plane (slightly behind content)
  zOffset?: number; // Additional Z offset for second plane
  baseOpacity?: number;
  secondaryOpacity?: number;
};

/**
 * Lightweight hologram-style grid using a single Plane and a tiny repeating CanvasTexture.
 * - No custom shaders
 * - meshBasicMaterial with additive blending
 * - Transparent + depthWrite disabled to avoid occluding planets
 * - RepeatWrapping to tile a small texture
 */
export default function HologramGrid({
  width = 80,
  height = 80,
  cellSize = 2,
  textureSize = 64,
  lineColor = '#33e9ff',
  lineAlpha = 0.6,
  baseZ = -0.28,
  zOffset = -0.04,
  baseOpacity = 0.18,
  secondaryOpacity = 0.1,
}: HologramGridProps) {
  // Create a tiny tile that draws a single grid cell with top/left lines only
  // so repeats do not double-thicken at tile seams.
  const texture = useMemo(() => {
    const size = Math.max(8, Math.min(512, Math.floor(textureSize)));
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // Crisp 1px lines: align to pixel grid
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, lineAlpha));
    ctx.lineWidth = 1;

    // Outer glow-ish softness (optional): draw a faint larger alpha before crisp line
    // Subtle haze
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, lineAlpha)) * 0.25;
    ctx.moveTo(0.5, 0.5);
    ctx.lineTo(size - 0.5, 0.5);
    ctx.moveTo(0.5, 0.5);
    ctx.lineTo(0.5, size - 0.5);
    ctx.stroke();

    // Main crisp line (top and left edges only)
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = Math.max(0, Math.min(1, lineAlpha));
    // Top edge
    ctx.moveTo(0.5, 0.5);
    ctx.lineTo(size - 0.5, 0.5);
    // Left edge
    ctx.moveTo(0.5, 0.5);
    ctx.lineTo(0.5, size - 0.5);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.NearestFilter; // keep lines crisp when zoomed
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [textureSize, lineColor, lineAlpha]);

  // Compute repeats so that each cell covers `cellSize` units in world space
  const repeat = useMemo(() => {
    const sx = Math.max(1, Math.floor(width / Math.max(0.001, cellSize)));
    const sy = Math.max(1, Math.floor(height / Math.max(0.001, cellSize)));
    return new THREE.Vector2(sx, sy);
  }, [width, height, cellSize]);

  // Apply repeat on the texture. This mutates the texture but is memoized above.
  useMemo(() => {
    texture.repeat.copy(repeat);
    texture.needsUpdate = true;
  }, [texture, repeat]);

  return (
    <group>
      {/* Primary grid layer */}
      <mesh position={[0, 0, baseZ]} renderOrder={-100}>
        <planeGeometry args={[width, height, 1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={baseOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color={new THREE.Color(0x33e9ff)}
        />
      </mesh>

      {/* Secondary subtle layer for hologram depth */}
      <mesh position={[0, 0, baseZ + zOffset]} renderOrder={-101}>
        <planeGeometry args={[width, height, 1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={secondaryOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          color={new THREE.Color(0x29d9ff)}
        />
      </mesh>
    </group>
  );
}

