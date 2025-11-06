import { ExtrudeGeometry, Shape, BufferAttribute } from 'three';

export function createHeartExtrudedGeometry(size: number = 1, depth: number = 0.1): ExtrudeGeometry {
  const s = size;
  const heart = new Shape();

  // Sharper, more iconic heart silhouette with a deeper cleft, fuller lobes, and a pointier tip.
  // This curve set hews closer to the classic heart glyph proportions.
  // Start near the upper cleft center
  heart.moveTo(0.0, 0.38 * s);
  // Right lobe: higher and fuller, curving back into the upper center
  heart.bezierCurveTo(0.26 * s, 0.84 * s, 0.64 * s, 0.84 * s, 0.72 * s, 0.38 * s);
  // Sweep down to a deeper, sharper tip
  heart.bezierCurveTo(0.92 * s, -0.06 * s, 0.48 * s, -0.78 * s, 0.00 * s, -0.86 * s);
  // Mirror for the left side
  heart.bezierCurveTo(-0.48 * s, -0.78 * s, -0.92 * s, -0.06 * s, -0.72 * s, 0.38 * s);
  heart.bezierCurveTo(-0.64 * s, 0.84 * s, -0.26 * s, 0.84 * s, 0.00 * s, 0.38 * s);

  const geo = new ExtrudeGeometry(heart, {
    depth,
    steps: 1,
    // Disable beveling to avoid rounding the silhouette into a ball-like shape
    bevelEnabled: false,
    bevelThickness: 0,
    bevelSize: 0,
    bevelSegments: 0,
    curveSegments: 96,
  });
  geo.center();
  
  // Post-process vertices to further accentuate heart features:
  // - push upper lobes outward
  // - deepen the cleft with a subtle notch and z-thinning near the top center
  // - sharpen the bottom tip by narrowing and slightly extending
  const pos = geo.getAttribute('position') as BufferAttribute;
  const halfDepth = depth * 0.5;
  const topRef = 0.84 * s;   // approx top control height
  const tipRef = 0.86 * s;   // approx bottom tip depth
  const xRef = 0.35 * s;     // lateral reference for lobe shaping
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Normalize helpers
    const yPos = Math.max(0, y);
    const yNeg = Math.max(0, -y);
    const yTopNorm = Math.min(1, yPos / Math.max(1e-6, topRef));
    const yBotNorm = Math.min(1, yNeg / Math.max(1e-6, tipRef));
    const xAbs = Math.abs(x);
    const xCenterNorm = 1.0 - Math.min(1, xAbs / Math.max(1e-6, 0.22 * s)); // near centerline emphasis
    const xLobeNorm = Math.min(1, xAbs / Math.max(1e-6, xRef));             // lobe region emphasis

    // 1) Deepen cleft near the top center: pull down and thin Z locally
    const cleftMask = yTopNorm * (xCenterNorm * xCenterNorm);
    if (cleftMask > 0.0) {
      const cleftDown = 0.18 * s * cleftMask; // deepen even more
      y -= cleftDown;
      // Thin Z near the cleft to create a subtle inner cut
      const zThinFactor = 1.0 - 0.48 * cleftMask; // up to ~50% thinner at cleft
      z = Math.sign(z) * Math.min(Math.abs(z) * zThinFactor, halfDepth);
    }

    // 2) Push lobes outward on the upper half
    const lobeMask = yTopNorm * xLobeNorm;
    if (lobeMask > 0.0 && xAbs > 1e-6) {
      const push = 0.24 * s * lobeMask; // stronger outward push
      x += Math.sign(x) * push;
    }

    // 3) Sharpen the bottom tip: narrow X and pull tip slightly downward
    if (y < 0) {
      const narrow = 1.0 - 0.30 * Math.pow(yBotNorm, 1.5);
      x *= narrow;
      y -= 0.10 * s * Math.pow(yBotNorm, 2.0);
    }

    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
