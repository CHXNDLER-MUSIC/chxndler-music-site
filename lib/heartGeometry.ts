import { BufferGeometry, Vector3, BufferAttribute, Vector2 } from 'three';

/**
 * Creates a 3D heart-shaped geometry
 */
type HeartGeoOptions = {
  // >1.0 makes it more heart-like (less circular); <1.0 more spherical
  heartness?: number;
  // Multiplies thickness along Z
  thicknessMultiplier?: number;
};

export function createHeartGeometry(
  size: number = 1,
  detail: number = 32,
  options?: HeartGeoOptions
): BufferGeometry {
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Heart equation parameters
  const scale = size * 0.5;
  const thickness = scale * 1.0 * (options?.thicknessMultiplier ?? 1.0); // planet-like volume
  const heartness = Math.max(0.3, Math.min(3.0, options?.heartness ?? 1.0));
  
  // Generate vertices for solid heart shape using layered approach
  const layers = Math.floor(detail * 0.8); // number of depth slices
  // Use a point count that avoids duplicating the seam vertex so we can
  // cleanly close caps without degenerate triangles.
  const pointsPerLayer = Math.max(8, detail);
  
  for (let layer = 0; layer <= layers; layer++) {
    for (let point = 0; point < pointsPerLayer; point++) {
      const t = (point / pointsPerLayer) * Math.PI * 2; // parameter around heart outline
      const layerDepth = (layer / layers) - 0.5; // from -0.5 to 0.5
      
      // 2D heart shape equation (parametric) - flipped Y for correct orientation
      const heartX = scale * (16 * Math.sin(t) ** 3) * 0.08;
      const heartY = scale * -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 0.08;
      
      // Create solid planet-like body by scaling heart shape based on distance from center
      // Use spherical interpolation and roundness blending to make it more planet-like
      const distanceFromCenter = Math.abs(layerDepth);
      const sphericalFactor = Math.cos(distanceFromCenter * Math.PI); // creates rounded profile
      const heartScale = 0.7 + 0.3 * sphericalFactor; // scale heart shape for solid appearance

      // Blend the 2D heart outline toward a circular outline for a rounder planet-like silhouette
      const dir = new Vector2(heartX, heartY);
      const len = dir.length();
      if (len < 1e-6) dir.set(1, 0); // avoid NaN
      else dir.divideScalar(len);
      // target circle radius (slightly smaller than the maximum heart radius), scaled by sphericalFactor for nicer profile
      const targetCircleRadius = scale * 0.9 * heartScale;
      const circleX = dir.x * targetCircleRadius;
      const circleY = dir.y * targetCircleRadius;
      // roundness factor — more circular near the center slices
      // Reduce circular blend as heartness increases (more heart silhouette)
      const roundness = Math.min(0.95, (0.65 + 0.25 * sphericalFactor) / heartness); // ~0.4–0.9
      const baseX = heartX * heartScale;
      const baseY = heartY * heartScale;
      const x = baseX * (1 - roundness) + circleX * roundness;
      const y = baseY * (1 - roundness) + circleY * roundness;
      const z = layerDepth * thickness;

      vertices.push(x, y, z);

      // Calculate normals for proper planet-like lighting
      // Blend between heart shape normal and spherical normal for more realistic lighting
      const heartNormal = new Vector3(baseX, baseY, 0).normalize();
      const sphericalNormal = new Vector3(x, y, z).normalize();
      const lerpToSphere = Math.max(0.55, Math.min(0.9, 0.82 / heartness));
      const normal = heartNormal.lerp(sphericalNormal, lerpToSphere).normalize();
      normals.push(normal.x, normal.y, normal.z);

      // UV coordinates
      uvs.push(point / pointsPerLayer, layer / layers);
    }
  }
  
  // Generate indices for the side surface by connecting rings between layers
  for (let layer = 0; layer < layers; layer++) {
    for (let point = 0; point < pointsPerLayer; point++) {
      const ringStride = pointsPerLayer;
      const current = layer * ringStride + point;
      const next = layer * ringStride + ((point + 1) % pointsPerLayer);
      const currentNext = (layer + 1) * ringStride + point;
      const nextNext = (layer + 1) * ringStride + ((point + 1) % pointsPerLayer);

      // Two triangles per quad to create solid surface
      indices.push(current, next, currentNext);
      indices.push(next, nextNext, currentNext);
    }
  }

  // Add front and back caps so the heart silhouette is filled (not hollow)
  // Create a center vertex for each cap, then fan triangles to the ring.
  const ringStride = pointsPerLayer;
  const backZ = -0.5 * thickness;
  const frontZ = 0.5 * thickness;

  // Back cap (layer 0)
  const backCenterIndex = vertices.length / 3;
  vertices.push(0, 0, backZ);
  normals.push(0, 0, -1);
  uvs.push(0.5, 0.5);
  for (let p = 0; p < pointsPerLayer; p++) {
    const a = 0 * ringStride + p;
    const b = 0 * ringStride + ((p + 1) % pointsPerLayer);
    // Winding chosen so normal faces outward (-Z)
    indices.push(backCenterIndex, b, a);
  }

  // Front cap (layer = layers)
  const frontCenterIndex = vertices.length / 3;
  vertices.push(0, 0, frontZ);
  normals.push(0, 0, 1);
  uvs.push(0.5, 0.5);
  for (let p = 0; p < pointsPerLayer; p++) {
    const a = layers * ringStride + p;
    const b = layers * ringStride + ((p + 1) % pointsPerLayer);
    // Winding chosen so normal faces outward (+Z)
    indices.push(frontCenterIndex, a, b);
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  
  geometry.computeVertexNormals(); // Recalculate for better lighting
  
  return geometry;
}
