import * as THREE from 'three';

/**
 * Hologram Halo - Cheap billboarded glow behind planets
 *
 * Uses a shared radial gradient texture to minimize draw calls and memory.
 * Animates opacity/scale subtly in the render loop.
 */

// Shared gradient texture (generated once, reused for all halos)
let sharedHaloTexture: THREE.Texture | null = null;

/**
 * Generate or return the shared radial gradient texture
 */
function getSharedHaloTexture(): THREE.Texture {
  if (sharedHaloTexture) return sharedHaloTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radial gradient: bright center fading to transparent edges
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  sharedHaloTexture = texture;

  return texture;
}

/**
 * Halo element colors by preset
 */
const HALO_COLORS: Record<string, number> = {
  heart: 0xff69b4,
  water: 0x00e5ff,
  lightning: 0xffd700,
  darkness: 0xe040fb,
  center: 0x00ffff,
};

function getHaloColor(element: string): number {
  return HALO_COLORS[element.toLowerCase()] || HALO_COLORS.center;
}

/**
 * Create a halo sprite for a planet
 *
 * @param element - Element type (heart/water/lightning/darkness/center)
 * @param scale - Base scale for the halo (should be ~1.5-2x planet radius)
 * @param baseOpacity - Starting opacity (0.2-0.4 recommended)
 */
export function createHaloSprite(
  element: string,
  scale: number = 3,
  baseOpacity: number = 0.3
): THREE.Sprite {
  const texture = getSharedHaloTexture();
  const color = getHaloColor(element);

  const material = new THREE.SpriteMaterial({
    map: texture,
    color: color,
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = -10; // Render behind planet

  // Store base values for animation
  (sprite as any)._haloBaseOpacity = baseOpacity;
  (sprite as any)._haloBaseScale = scale;

  return sprite;
}

/**
 * Update halo animation (call in render loop)
 *
 * @param sprite - The halo sprite
 * @param time - Elapsed time from clock
 * @param pulseSpeed - Speed of the pulse (0.5-2.0 recommended)
 * @param pulseStrength - Strength of the pulse (0.1-0.3 recommended)
 */
export function updateHaloAnimation(
  sprite: THREE.Sprite,
  time: number,
  pulseSpeed: number = 1.0,
  pulseStrength: number = 0.15
): void {
  const baseOpacity = (sprite as any)._haloBaseOpacity ?? 0.3;
  const baseScale = (sprite as any)._haloBaseScale ?? 3;

  // Subtle sine wave pulse
  const pulse = Math.sin(time * pulseSpeed) * pulseStrength;

  // Update opacity (clamped)
  const material = sprite.material as THREE.SpriteMaterial;
  material.opacity = Math.max(0.05, baseOpacity + pulse * 0.5);

  // Update scale
  const scaleMultiplier = 1 + pulse * 0.1;
  const newScale = baseScale * scaleMultiplier;
  sprite.scale.set(newScale, newScale, 1);
}

/**
 * Dispose of shared resources (call on scene cleanup)
 */
export function disposeHaloResources(): void {
  if (sharedHaloTexture) {
    sharedHaloTexture.dispose();
    sharedHaloTexture = null;
  }
}

/**
 * Create a song planet halo (smaller, element-colored)
 */
export function createSongHaloSprite(
  element: string,
  scale: number = 2.5,
  baseOpacity: number = 0.25
): THREE.Sprite {
  return createHaloSprite(element, scale, baseOpacity);
}
