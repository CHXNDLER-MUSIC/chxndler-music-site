import * as THREE from 'three';

// Shared uniforms across all planet materials (single time uniform)
export const sharedGridUniforms = {
  // Tweak opacity here (0.08–0.15 recommended)
  uGridOpacity: { value: 0.1 },
  // Tweak scale here (~14–18 cells across recommended)
  uGridScale: { value: 16.0 },
  // Tweak line width here (thin lines, use with smoothstep)
  uGridLineWidth: { value: 0.02 },
  // Shared time uniform
  uTime: { value: 0.0 },
};

// Call this each frame from an existing render loop to keep time in sync
export function setGridTime(t: number) {
  sharedGridUniforms.uTime.value = t;
}

// Apply hologram-style grid overlay to an existing material via onBeforeCompile
export function applyHologramGrid(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
) {
  const anyMat = material as any;
  if (anyMat.__hologramGridPatched) return;
  anyMat.__hologramGridPatched = true;

  material.onBeforeCompile = (shader) => {
    // Attach shared uniforms
    shader.uniforms.uGridOpacity = sharedGridUniforms.uGridOpacity;
    shader.uniforms.uGridScale = sharedGridUniforms.uGridScale;
    shader.uniforms.uGridLineWidth = sharedGridUniforms.uGridLineWidth;
    shader.uniforms.uTime = sharedGridUniforms.uTime;

    // Inject uniform declarations
    shader.fragmentShader = `
      uniform float uGridOpacity;
      uniform float uGridScale;
      uniform float uGridLineWidth;
      uniform float uTime;
    ` + shader.fragmentShader;

    // Insert grid logic before final output while preserving original lighting
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `
      // BEGIN: hologram grid overlay
      vec2 gridUV;
      #ifdef USE_UV
        gridUV = vUv;
      #else
        // Spherical fallback using normal if UVs are unavailable
        vec3 n = normalize( vNormal );
        float u = atan(n.z, n.x) / (6.28318530718) + 0.5; // 2*PI
        float v = asin(n.y) / 3.14159265359 + 0.5;        // PI
        gridUV = vec2(u, v);
      #endif

      // Very subtle time-based drift
      gridUV += uTime * 0.004;

      // Procedural grid in UV space
      vec2 cell = fract(gridUV * uGridScale);
      vec2 edge = min(cell, 1.0 - cell);
      float d = min(edge.x, edge.y);
      float aa = fwidth(d) * 0.75; // smooth edges for thin lines
      float gridMask = smoothstep(uGridLineWidth + aa, uGridLineWidth - aa, d);

      // Fresnel term to strengthen edges slightly
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
      float gridAlpha = uGridOpacity * (0.6 + 0.4 * fresnel);

      // Faint cyan/teal grid color
      vec3 gridColor = vec3(0.0, 0.85, 0.9);
      vec3 holo = gridColor * gridAlpha;

      // Preserve original lighting and textures, add subtle overlay
      outgoingLight = mix(outgoingLight, outgoingLight + holo, gridMask);
      // END: hologram grid overlay

      #include <output_fragment>
    `);
  };
}

