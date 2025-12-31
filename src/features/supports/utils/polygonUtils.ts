/**
 * Polygon Utility Functions
 * 
 * Provides functions for working with 2D polygons, particularly
 * for ensuring consistent winding order which is critical for
 * generating manifold 3D geometry.
 * 
 * WINDING ORDER CONVENTIONS:
 * - In XZ plane (looking down Y axis): CW = negative signed area, CCW = positive
 * - THREE.js Shape (XY plane): expects CCW for front-facing geometry
 * - When we apply [x, -y] transformation + rotateX(-PI/2), the winding flips
 * 
 * For custom polygon supports, the geometry pipeline works as follows:
 * 1. User draws polygon in XZ plane (can be CW or CCW)
 * 2. For body: apply [x, -y] to flip winding, create Shape, extrude, rotateX(-PI/2)
 * 3. For fillet: reverse polygon to match body winding, compute normals based on winding
 * 4. For bottom cap: use same reversed polygon as fillet for consistent geometry
 * 
 * The geometry functions now handle ANY winding direction by computing isCW dynamically.
 */

/**
 * Calculate the signed area of a 2D polygon using the shoelace formula.
 * 
 * @param polygon - Array of [x, y] coordinate pairs
 * @returns Signed area (positive = CCW, negative = CW in standard math convention)
 */
export function polygonSignedArea2D(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0;
  
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return area / 2;
}

/**
 * Determine if a polygon is clockwise in XZ plane.
 * Uses the shoelace formula where negative area = CW.
 * 
 * @param polygon - Array of [x, z] coordinate pairs in XZ plane
 * @returns true if polygon is clockwise, false if counter-clockwise
 */
export function isPolygonClockwiseXZ(polygon: [number, number][]): boolean {
  return polygonSignedArea2D(polygon) < 0;
}

/**
 * Compute winding direction for a polygon using the trapezoidal formula.
 * This is used by geometry functions after reversing the polygon.
 * 
 * The trapezoidal formula: sum of (x2-x1)*(z2+z1) for each edge
 * - Positive = clockwise
 * - Negative = counter-clockwise
 * 
 * @param polygon - Array of [x, z] coordinate pairs
 * @returns true if clockwise, false if counter-clockwise
 */
export function computePolygonWindingCW(polygon: [number, number][]): boolean {
  if (polygon.length < 3) return true;
  
  let signedArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, z1] = polygon[i];
    const [x2, z2] = polygon[(i + 1) % polygon.length];
    signedArea += (x2 - x1) * (z2 + z1);
  }
  return signedArea > 0;
}

/**
 * Ensure polygon has clockwise winding order when viewed in XZ plane (looking down Y axis).
 * 
 * This is used at support creation time to normalize the polygon, ensuring
 * consistent geometry regardless of how the user drew the outline.
 * 
 * @param polygon - Array of [x, z] coordinate pairs in XZ plane
 * @returns Polygon with consistent clockwise winding
 */
export function ensureClockwiseWindingXZ(polygon: [number, number][]): [number, number][] {
  if (polygon.length < 3) return polygon;
  
  // Using shoelace: positive = CCW, negative = CW
  const signedArea = polygonSignedArea2D(polygon);
  
  // If CCW (positive area), reverse to make CW
  if (signedArea > 0) {
    return [...polygon].reverse();
  }
  
  return polygon;
}

/**
 * Prepare a polygon for fillet/cap geometry creation.
 * 
 * IMPORTANT: This function should NOT be used anymore. The fillet and cap geometry
 * should use the SAME polygon vertex order as the body to ensure corners match.
 * 
 * Previously this function reversed the polygon, which caused the corner geometry
 * to be calculated with opposite prev/next directions compared to the body,
 * resulting in non-matching corner curves.
 * 
 * @deprecated Use ensureClockwiseWindingXZ and computePolygonWindingCW separately
 */
export function preparePolygonForGeometry(polygon: [number, number][]): {
  workingPolygon: [number, number][];
  isCW: boolean;
} {
  if (polygon.length < 3) {
    return { workingPolygon: polygon, isCW: true };
  }
  
  // Reverse the polygon to match body's effective winding
  const workingPolygon: [number, number][] = [...polygon].reverse();
  
  // Compute winding of the reversed polygon using trapezoidal formula
  const isCW = computePolygonWindingCW(workingPolygon);
  
  return { workingPolygon, isCW };
}

/**
 * Compute outward-facing edge normal for a polygon edge.
 * The normal direction depends on the polygon's winding order.
 * 
 * @param p1 - Start point of edge [x, z]
 * @param p2 - End point of edge [x, z]
 * @param isCW - Whether the polygon is clockwise
 * @returns Outward normal [nx, nz], or [0, 0] if edge is degenerate
 */
export function computeEdgeNormal(
  p1: [number, number],
  p2: [number, number],
  isCW: boolean
): [number, number] {
  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  
  if (len < 0.01) return [0, 0];
  
  // Perpendicular direction depends on winding
  if (isCW) {
    return [-dz / len, dx / len]; // outward for CW
  } else {
    return [dz / len, -dx / len]; // outward for CCW
  }
}
