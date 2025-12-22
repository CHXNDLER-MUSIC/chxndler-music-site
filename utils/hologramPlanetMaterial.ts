import * as THREE from 'three';

/**
 * Hologram Planet Material - Lightweight holographic shader for planets
 *
 * Features:
 * - Fresnel rim glow based on view angle
 * - Animated scanlines
 * - Lat/long grid (fake wireframe)
 * - Subtle shimmer/noise modulation
 * - Additive-like emissive look via transparency
 */

// Shared time uniform - call updateHologramTime(t) each frame
export const hologramTimeUniform = { value: 0 };

export function updateHologramTime(t: number) {
  hologramTimeUniform.value = t;
}

// Vertex shader
const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader with all hologram effects
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uScanDensity;
uniform float uScanSpeed;
uniform float uGridDensity;
uniform float uGridStrength;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uShimmerStrength;
uniform float uAlpha;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

// Cheap hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  vec3 normal = normalize(vNormal);

  // === Fresnel rim glow ===
  float fresnel = pow(1.0 - abs(dot(normal, viewDir)), uRimPower);
  vec3 rimColor = uAccent * fresnel * uRimStrength;

  // === Lat/long grid (fake wireframe) ===
  // Compute spherical coords from world position
  vec3 localPos = normalize(vWorldPosition);
  float lat = asin(localPos.y); // -PI/2 to PI/2
  float lon = atan(localPos.z, localPos.x); // -PI to PI

  // Grid lines
  float latLines = abs(fract(lat * uGridDensity / 3.14159) - 0.5) * 2.0;
  float lonLines = abs(fract(lon * uGridDensity / 6.28318) - 0.5) * 2.0;
  float gridMask = min(latLines, lonLines);

  // Sharpen grid lines with smoothstep
  float gridWidth = 0.05;
  float grid = 1.0 - smoothstep(0.0, gridWidth, gridMask);
  vec3 gridColor = uAccent * grid * uGridStrength;

  // === Scanlines ===
  float scanY = vWorldPosition.y + uTime * uScanSpeed;
  float scanLine = sin(scanY * uScanDensity) * 0.5 + 0.5;
  scanLine = smoothstep(0.3, 0.7, scanLine);
  float scanMask = 0.85 + 0.15 * scanLine;

  // === Shimmer noise ===
  vec2 noiseCoord = vec2(lon * 2.0, lat * 4.0) + uTime * 0.3;
  float shimmer = noise(noiseCoord * 8.0);
  shimmer = 0.9 + shimmer * uShimmerStrength;

  // === Combine effects ===
  vec3 baseColor = uColor * 0.4; // Subtle base
  vec3 holoColor = baseColor + rimColor + gridColor;
  holoColor *= scanMask * shimmer;

  // Additive glow boost for holographic feel
  float glowBoost = fresnel * 0.3 + grid * 0.2;
  holoColor += uAccent * glowBoost;

  // Alpha based on fresnel for edge transparency
  float alpha = uAlpha * (0.6 + fresnel * 0.4);

  gl_FragColor = vec4(holoColor, alpha);
}
`;

// Element presets - uniform values per element type
export interface HologramPreset {
  color: THREE.Color;
  accent: THREE.Color;
  scanDensity: number;
  scanSpeed: number;
  gridDensity: number;
  gridStrength: number;
  rimPower: number;
  rimStrength: number;
  shimmerStrength: number;
  alpha: number;
}

export const HOLOGRAM_PRESETS: Record<string, HologramPreset> = {
  // Heart - warm pink/magenta, gentle pulse
  heart: {
    color: new THREE.Color(0xff6b9d),
    accent: new THREE.Color(0xff1493),
    scanDensity: 12.0,
    scanSpeed: 0.8,
    gridDensity: 6.0,
    gridStrength: 0.35,
    rimPower: 2.5,
    rimStrength: 1.2,
    shimmerStrength: 0.15,
    alpha: 0.92,
  },
  // Water - cool cyan/blue, flowing feel
  water: {
    color: new THREE.Color(0x4fc3f7),
    accent: new THREE.Color(0x00e5ff),
    scanDensity: 10.0,
    scanSpeed: 0.6,
    gridDensity: 8.0,
    gridStrength: 0.4,
    rimPower: 2.0,
    rimStrength: 1.4,
    shimmerStrength: 0.2,
    alpha: 0.88,
  },
  // Lightning - electric yellow/gold, energetic
  lightning: {
    color: new THREE.Color(0xffeb3b),
    accent: new THREE.Color(0xffd700),
    scanDensity: 18.0,
    scanSpeed: 1.5,
    gridDensity: 10.0,
    gridStrength: 0.5,
    rimPower: 3.0,
    rimStrength: 1.6,
    shimmerStrength: 0.25,
    alpha: 0.95,
  },
  // Darkness - deep purple/violet, mysterious
  darkness: {
    color: new THREE.Color(0x9c27b0),
    accent: new THREE.Color(0xe040fb),
    scanDensity: 8.0,
    scanSpeed: 0.4,
    gridDensity: 5.0,
    gridStrength: 0.3,
    rimPower: 2.8,
    rimStrength: 1.8,
    shimmerStrength: 0.12,
    alpha: 0.85,
  },
  // Center/default - neutral hologram
  center: {
    color: new THREE.Color(0xffffff),
    accent: new THREE.Color(0x00ffff),
    scanDensity: 10.0,
    scanSpeed: 0.5,
    gridDensity: 6.0,
    gridStrength: 0.35,
    rimPower: 2.2,
    rimStrength: 1.3,
    shimmerStrength: 0.15,
    alpha: 0.9,
  },
};

/**
 * Get a preset by element name (case-insensitive)
 */
export function getHologramPreset(element: string): HologramPreset {
  const key = element.toLowerCase();
  return HOLOGRAM_PRESETS[key] || HOLOGRAM_PRESETS.center;
}

/**
 * Create a hologram material for a planet
 *
 * @param preset - Element preset or preset name
 * @param options - Optional overrides for any uniform value
 */
export function createHologramMaterial(
  preset: string | HologramPreset,
  options?: Partial<HologramPreset>
): THREE.ShaderMaterial {
  const p = typeof preset === 'string' ? getHologramPreset(preset) : preset;
  const merged = { ...p, ...options };

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: hologramTimeUniform,
      uColor: { value: merged.color.clone() },
      uAccent: { value: merged.accent.clone() },
      uScanDensity: { value: merged.scanDensity },
      uScanSpeed: { value: merged.scanSpeed },
      uGridDensity: { value: merged.gridDensity },
      uGridStrength: { value: merged.gridStrength },
      uRimPower: { value: merged.rimPower },
      uRimStrength: { value: merged.rimStrength },
      uShimmerStrength: { value: merged.shimmerStrength },
      uAlpha: { value: merged.alpha },
    },
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Create a hologram material class for drei's extend()
 * Use this with React Three Fiber
 */
export class HologramPlanetMaterial extends THREE.ShaderMaterial {
  constructor(parameters?: {
    preset?: string;
    color?: THREE.Color;
    accent?: THREE.Color;
    scanDensity?: number;
    scanSpeed?: number;
    gridDensity?: number;
    gridStrength?: number;
    rimPower?: number;
    rimStrength?: number;
    shimmerStrength?: number;
    alpha?: number;
  }) {
    const presetName = parameters?.preset || 'center';
    const p = getHologramPreset(presetName);

    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: hologramTimeUniform,
        uColor: { value: parameters?.color?.clone() || p.color.clone() },
        uAccent: { value: parameters?.accent?.clone() || p.accent.clone() },
        uScanDensity: { value: parameters?.scanDensity ?? p.scanDensity },
        uScanSpeed: { value: parameters?.scanSpeed ?? p.scanSpeed },
        uGridDensity: { value: parameters?.gridDensity ?? p.gridDensity },
        uGridStrength: { value: parameters?.gridStrength ?? p.gridStrength },
        uRimPower: { value: parameters?.rimPower ?? p.rimPower },
        uRimStrength: { value: parameters?.rimStrength ?? p.rimStrength },
        uShimmerStrength: { value: parameters?.shimmerStrength ?? p.shimmerStrength },
        uAlpha: { value: parameters?.alpha ?? p.alpha },
      },
      transparent: true,
      depthWrite: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });
  }

  // Setters for reactivity in R3F
  set preset(value: string) {
    const p = getHologramPreset(value);
    this.uniforms.uColor.value.copy(p.color);
    this.uniforms.uAccent.value.copy(p.accent);
    this.uniforms.uScanDensity.value = p.scanDensity;
    this.uniforms.uScanSpeed.value = p.scanSpeed;
    this.uniforms.uGridDensity.value = p.gridDensity;
    this.uniforms.uGridStrength.value = p.gridStrength;
    this.uniforms.uRimPower.value = p.rimPower;
    this.uniforms.uRimStrength.value = p.rimStrength;
    this.uniforms.uShimmerStrength.value = p.shimmerStrength;
    this.uniforms.uAlpha.value = p.alpha;
  }

  set color(value: THREE.Color) {
    this.uniforms.uColor.value.copy(value);
  }

  set accent(value: THREE.Color) {
    this.uniforms.uAccent.value.copy(value);
  }

  set alpha(value: number) {
    this.uniforms.uAlpha.value = value;
  }
}
