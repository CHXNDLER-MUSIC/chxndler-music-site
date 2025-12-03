import * as THREE from 'three';
import { PlanetVisualAppearance } from './planet-data';

export interface GeneratedPlanetMaterial {
  material: THREE.Material;
  hasGlow: boolean;
  glowMaterial?: THREE.Material;
  hasParticles: boolean;
  particleCount?: number;
}

export function generatePlanetMaterial(
  appearance: PlanetVisualAppearance,
  textureLoader: THREE.TextureLoader,
  planetId: string
): GeneratedPlanetMaterial {
  const baseColor = new THREE.Color(appearance.primaryColor);
  
  // Analyze surface description for material properties
  const surface = appearance.surface.toLowerCase();
  const atmosphere = appearance.atmosphere.toLowerCase();
  
  // Determine base material properties
  let roughness = 0.7;
  let metalness = 0.1;
  let emissiveIntensity = 0.1;
  let transparent = false;
  let opacity = 1.0;
  
  // Material property adjustments based on surface description
  if (surface.includes('mirror') || surface.includes('glass') || surface.includes('crystal')) {
    roughness = 0.1;
    metalness = 0.9;
  }
  if (surface.includes('velvet') || surface.includes('fabric') || surface.includes('cotton')) {
    roughness = 0.9;
    metalness = 0.0;
  }
  if (surface.includes('metal') || surface.includes('obsidian')) {
    roughness = 0.3;
    metalness = 0.8;
  }
  if (surface.includes('glow') || surface.includes('neon') || surface.includes('illuminated')) {
    emissiveIntensity = 0.3;
  }
  if (surface.includes('volcanic') || surface.includes('lava')) {
    emissiveIntensity = 0.5;
  }
  if (surface.includes('ice') || surface.includes('frost') || surface.includes('frozen')) {
    roughness = 0.2;
    metalness = 0.1;
  }
  
  // Determine emissive color based on description
  let emissiveColor = new THREE.Color(0x000000);
  if (surface.includes('pink') || surface.includes('rose')) {
    emissiveColor = new THREE.Color(0x331122);
  }
  if (surface.includes('blue') || surface.includes('turquoise')) {
    emissiveColor = new THREE.Color(0x112233);
  }
  if (surface.includes('yellow') || surface.includes('gold')) {
    emissiveColor = new THREE.Color(0x332211);
  }
  if (surface.includes('violet') || surface.includes('purple')) {
    emissiveColor = new THREE.Color(0x221133);
  }
  if (surface.includes('red') || surface.includes('magma')) {
    emissiveColor = new THREE.Color(0x331111);
  }
  if (surface.includes('green')) {
    emissiveColor = new THREE.Color(0x113311);
  }
  
  // Create base material
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: emissiveColor,
    emissiveIntensity,
    roughness,
    metalness,
    transparent,
    opacity
  });
  
  // Determine if planet should have glow effect
  const hasGlow = atmosphere.includes('glow') || 
                  atmosphere.includes('aurora') || 
                  atmosphere.includes('neon') ||
                  surface.includes('glow') ||
                  surface.includes('illuminated');
  
  let glowMaterial: THREE.Material | undefined;
  if (hasGlow) {
    // Create glow effect material
    let glowColor = baseColor.clone();
    
    // Adjust glow color based on atmosphere description
    if (atmosphere.includes('pink')) glowColor = new THREE.Color(0xff69b4);
    if (atmosphere.includes('blue')) glowColor = new THREE.Color(0x4169e1);
    if (atmosphere.includes('yellow') || atmosphere.includes('gold')) glowColor = new THREE.Color(0xffd700);
    if (atmosphere.includes('violet') || atmosphere.includes('purple')) glowColor = new THREE.Color(0x9400d3);
    if (atmosphere.includes('green')) glowColor = new THREE.Color(0x32cd32);
    if (atmosphere.includes('orange')) glowColor = new THREE.Color(0xff8c00);
    
    glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
  }
  
  // Determine if planet should have particle effects
  const hasParticles = atmosphere.includes('spark') || 
                      atmosphere.includes('mist') || 
                      atmosphere.includes('particles') ||
                      atmosphere.includes('burst') ||
                      atmosphere.includes('static') ||
                      atmosphere.includes('rain');
  
  let particleCount = 0;
  if (hasParticles) {
    if (atmosphere.includes('burst') || atmosphere.includes('explosion')) {
      particleCount = 200;
    } else if (atmosphere.includes('mist') || atmosphere.includes('haze')) {
      particleCount = 100;
    } else {
      particleCount = 50;
    }
  }
  
  return {
    material,
    hasGlow,
    glowMaterial,
    hasParticles,
    particleCount
  };
}

// Helper function to get geometric shape modifications
export function getShapeModifications(appearance: PlanetVisualAppearance) {
  const shape = appearance.shape.toLowerCase();
  
  // Default sphere parameters
  let geometry = { type: 'sphere', radius: 1, segments: 32 };
  let scaleModification = { x: 1, y: 1, z: 1 };
  let deformation = 'none';
  
  if (shape.includes('jagged') || shape.includes('angular')) {
    geometry.segments = 16; // Lower poly for jagged look
    deformation = 'jagged';
  }
  
  if (shape.includes('flat') || shape.includes('plate')) {
    scaleModification.y = 0.3; // Flatten the sphere
  }
  
  if (shape.includes('elongated') || shape.includes('pillar')) {
    scaleModification.y = 2.0; // Stretch vertically
  }
  
  if (shape.includes('fragmented') || shape.includes('chunks')) {
    deformation = 'fragmented';
  }
  
  if (shape.includes('blocky') || shape.includes('cube')) {
    geometry.type = 'box';
  }
  
  return {
    geometry,
    scaleModification,
    deformation
  };
}