import { ExtrudeGeometry, Shape } from 'three';

export function createHeartExtrudedGeometry(size: number = 1, depth: number = 0.1): ExtrudeGeometry {
  const s = size;
  const heart = new Shape();
  // Symmetric heart via cubic Bezier curves
  // Top start
  heart.moveTo(0, 0.35 * s);
  heart.bezierCurveTo(0.08 * s, 0.60 * s, 0.42 * s, 0.62 * s, 0.52 * s, 0.36 * s);
  heart.bezierCurveTo(0.72 * s, 0.02 * s, 0.48 * s, -0.32 * s, 0.00 * s, -0.50 * s);
  heart.bezierCurveTo(-0.48 * s, -0.32 * s, -0.72 * s, 0.02 * s, -0.52 * s, 0.36 * s);
  heart.bezierCurveTo(-0.42 * s, 0.62 * s, -0.08 * s, 0.60 * s, 0.00 * s, 0.35 * s);

  const geo = new ExtrudeGeometry(heart, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: size * 0.035,
    bevelSegments: 3,
    curveSegments: 64
  });
  geo.center();
  return geo;
}

