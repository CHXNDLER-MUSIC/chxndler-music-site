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
  
  // Determine base material properties with more dramatic variations
  let roughness = 0.7;
  let metalness = 0.1;
  let emissiveIntensity = 0.3; // Increased base brightness for all song planets
  let transparent = false;
  let opacity = 1.0;
  
  // Enhanced material property adjustments for unique looks
  if (surface.includes('mirror') || surface.includes('glass') || surface.includes('crystal')) {
    roughness = 0.0;
    metalness = 1.0;
    emissiveIntensity = 0.5; // Increased brightness
  }
  if (surface.includes('velvet') || surface.includes('fabric') || surface.includes('cotton')) {
    roughness = 1.0;
    metalness = 0.0;
    emissiveIntensity = 0.25; // Increased brightness
  }
  if (surface.includes('metal') || surface.includes('obsidian')) {
    roughness = 0.1;
    metalness = 0.9;
    emissiveIntensity = 0.4; // Increased brightness
  }
  if (surface.includes('glow') || surface.includes('neon') || surface.includes('illuminated')) {
    emissiveIntensity = 0.9; // Increased brightness
    roughness = 0.1;
  }
  if (surface.includes('volcanic') || surface.includes('lava') || surface.includes('magma')) {
    emissiveIntensity = 1.1; // Increased brightness
    roughness = 0.8;
    metalness = 0.2;
  }
  if (surface.includes('ice') || surface.includes('frost') || surface.includes('frozen')) {
    roughness = 0.0;
    metalness = 0.1;
    emissiveIntensity = 0.6; // Increased brightness
  }
  if (surface.includes('marble')) {
    roughness = 0.3;
    metalness = 0.1;
    emissiveIntensity = 0.3; // Increased brightness
  }
  if (surface.includes('asphalt') || surface.includes('concrete')) {
    roughness = 0.9;
    metalness = 0.0;
    emissiveIntensity = 0.2; // Increased brightness
  }
  if (surface.includes('honeycomb') || surface.includes('hex')) {
    roughness = 0.4;
    metalness = 0.3;
    emissiveIntensity = 0.7; // Increased brightness
  }
  
  // Determine emissive color based on detailed description analysis
  let emissiveColor = new THREE.Color(0x000000);
  
  // Specific color combinations for unique planets
  if (surface.includes('obsidian') && surface.includes('red')) {
    emissiveColor = new THREE.Color(0x660000); // Deep red glow for volcanic obsidian
  } else if (surface.includes('violet') && surface.includes('magma')) {
    emissiveColor = new THREE.Color(0x440066); // Violet magma glow
  } else if (surface.includes('neon') && surface.includes('pink')) {
    emissiveColor = new THREE.Color(0xff1493); // Bright neon pink
  } else if (surface.includes('neon') && surface.includes('yellow')) {
    emissiveColor = new THREE.Color(0xffff00); // Bright neon yellow
  } else if (surface.includes('teal') || surface.includes('cyan')) {
    emissiveColor = new THREE.Color(0x008b8b); // Teal glow
  } else if (surface.includes('honeycomb') && surface.includes('golden')) {
    emissiveColor = new THREE.Color(0xffd700); // Golden honey glow
  } else if (surface.includes('crystalline') || surface.includes('crystal')) {
    emissiveColor = new THREE.Color(0x4169e1); // Crystal blue glow
  } else if (surface.includes('frozen') || surface.includes('ice')) {
    emissiveColor = new THREE.Color(0x87ceeb); // Ice blue glow
  } else if (surface.includes('lava') || surface.includes('volcanic')) {
    emissiveColor = new THREE.Color(0xff4500); // Orange-red lava glow
  } else if (surface.includes('velvet') && surface.includes('pink')) {
    emissiveColor = new THREE.Color(0x663344); // Soft pink velvet glow
  } else if (surface.includes('mirror') || surface.includes('silver')) {
    emissiveColor = new THREE.Color(0x444444); // Metallic silver glow
  } else {
    // Fallback color analysis
    if (surface.includes('pink') || surface.includes('rose')) {
      emissiveColor = new THREE.Color(0x552244);
    } else if (surface.includes('blue') || surface.includes('turquoise')) {
      emissiveColor = new THREE.Color(0x224455);
    } else if (surface.includes('yellow') || surface.includes('gold')) {
      emissiveColor = new THREE.Color(0x554422);
    } else if (surface.includes('violet') || surface.includes('purple')) {
      emissiveColor = new THREE.Color(0x442255);
    } else if (surface.includes('red')) {
      emissiveColor = new THREE.Color(0x552222);
    } else if (surface.includes('green')) {
      emissiveColor = new THREE.Color(0x225522);
    } else if (surface.includes('orange')) {
      emissiveColor = new THREE.Color(0x553322);
    }
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
  const surface = appearance.surface.toLowerCase();
  
  // Default sphere parameters
  let geometry = { type: 'sphere', radius: 1, segments: 32 };
  let scaleModification = { x: 1, y: 1, z: 1 };
  let deformation = 'none';
  let specialShape = false;
  
  // Specific shape analyses for unique planets
  if (shape.includes('irregular') && shape.includes('chunks')) {
    geometry.segments = 8; // Very low poly for chunky, irregular look
    deformation = 'fragmented';
    scaleModification = { x: 1.2, y: 0.8, z: 1.1 }; // Irregular proportions
  } else if (shape.includes('city-pillar') || shape.includes('vertical')) {
    scaleModification = { x: 0.6, y: 3.0, z: 0.6 }; // Tall and narrow like city skylines
    geometry.segments = 16;
  } else if (shape.includes('flat') && shape.includes('plate')) {
    scaleModification = { x: 1.5, y: 0.2, z: 1.5 }; // Very flat plate-like
    geometry.segments = 24;
  } else if (shape.includes('jagged') || shape.includes('angular')) {
    geometry.segments = 12; // Lower poly for jagged look
    deformation = 'jagged';
  } else if (shape.includes('blocky') || shape.includes('cube')) {
    geometry.type = 'box';
    geometry.segments = 8;
  } else if (shape.includes('hex-patterned') || surface.includes('honeycomb')) {
    geometry.segments = 6; // Hexagonal-like
    deformation = 'hexagonal';
  } else if (shape.includes('fragmented') || shape.includes('shattered')) {
    geometry.segments = 16;
    deformation = 'fragmented';
  } else if (shape.includes('tombstone') && shape.includes('monolith')) {
    scaleModification = { x: 0.8, y: 2.5, z: 0.4 }; // Tall, thin tombstone
    geometry.type = 'box';
  } else if (shape.includes('dance-floor') && shape.includes('bumpy')) {
    scaleModification = { x: 1.3, y: 0.8, z: 1.3 }; // Flatter but wider
    deformation = 'bumpy';
  }
  
  // Additional deformation based on surface features
  if (surface.includes('cracked') || surface.includes('fractured')) {
    deformation = deformation === 'none' ? 'cracked' : deformation;
  }
  if (surface.includes('molten') || surface.includes('liquid')) {
    deformation = deformation === 'none' ? 'flowing' : deformation;
  }
  if (surface.includes('pixel') || surface.includes('8-bit')) {
    geometry.segments = 8;
    deformation = 'pixelated';
  }
  
  return {
    geometry,
    scaleModification,
    deformation,
    specialShape
  };
}