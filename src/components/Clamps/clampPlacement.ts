/**
 * Clamp Placement Utilities
 * 
 * Handles the positioning logic for clamps on workpieces.
 * 
 * For vertical clamps:
 * 1. User clicks on part surface to place the fixture point
 * 2. Raycast to find the click point on the part
 * 3. Position clamp so fixture point touches the part surface
 * 4. Position clamp support OUTSIDE the part silhouette
 */

import * as THREE from 'three';
import { PlacedClamp } from './types';
import { AnySupport } from '../Supports/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of clamp placement calculation
 */
export interface ClampPlacementResult {
  /** Calculated position for the clamp (fixture point center) */
  position: THREE.Vector3;
  /** Calculated rotation in degrees */
  rotation: { x: number; y: number; z: number };
  /** Whether placement was successful */
  success: boolean;
  /** Error message if placement failed */
  error?: string;
}

/**
 * Options for clamp placement
 */
export interface ClampPlacementOptions {
  /** The point where user clicked (world coordinates) */
  clickPoint: THREE.Vector3;
  /** Normal of the surface at click point */
  surfaceNormal: THREE.Vector3;
  /** Part mesh that was clicked */
  partMesh: THREE.Object3D;
  /** All part meshes in the scene */
  allPartMeshes: THREE.Object3D[];
  /** Part silhouette points (XZ plane) */
  partSilhouette: Array<{ x: number; z: number }>;
  /** Already placed supports */
  existingSupports: AnySupport[];
  /** Already placed clamps */
  existingClamps: PlacedClamp[];
  /** Y position of baseplate top */
  baseTopY: number;
  /** Minimum placement offset (from fixture cutouts) */
  minPlacementOffset: number;
  /** Clamp support footprint size (approximate) */
  supportFootprintSize?: { width: number; depth: number };
  /** Clearance from silhouette edge */
  silhouetteClearance?: number;
  /** Clamp category (vertical or side-push) */
  clampCategory: 'Toggle Clamps Vertical' | 'Toggle Clamps Side Push';
}

/**
 * Result of collision adjustment
 */
export interface CollisionAdjustmentResult {
  /** Adjusted position */
  position: { x: number; y: number; z: number };
  /** Adjusted rotation in degrees */
  rotation: { x: number; y: number; z: number };
  /** Whether adjustment was needed */
  wasAdjusted: boolean;
  /** Description of adjustment made */
  adjustmentReason?: string;
}

// ============================================================================
// Main Placement Functions
// ============================================================================

/**
 * Calculate the optimal position for a vertical clamp
 * 
 * The fixture point (where the clamp contacts the part) should be:
 * 1. As close as possible to the user's click point
 * 2. Resting on top of the part surface
 * 
 * The clamp support should be:
 * 1. Outside the part silhouette
 * 2. Within reach of the fixture point
 */
export function calculateVerticalClampPlacement(
  options: ClampPlacementOptions
): ClampPlacementResult {
  const {
    clickPoint,
    surfaceNormal,
    partSilhouette,
    baseTopY,
    minPlacementOffset,
  } = options;

  // For vertical clamps, the fixture point should rest on top of the part
  // Ensure it's above the minimum clearance from baseplate
  const fixturePointY = Math.max(
    clickPoint.y,
    baseTopY + minPlacementOffset
  );

  // Find the direction to push the support outside the silhouette
  // Use the surface normal projected onto XZ plane, or if too vertical, use radial direction
  let pushDirection = new THREE.Vector2(surfaceNormal.x, surfaceNormal.z);
  
  if (pushDirection.length() < 0.1) {
    // Surface is mostly horizontal, use radial direction from part center
    const silhouetteCenter = getSilhouetteCenter(partSilhouette);
    pushDirection = new THREE.Vector2(
      clickPoint.x - silhouetteCenter.x,
      clickPoint.z - silhouetteCenter.z
    );
  }
  
  if (pushDirection.length() < 0.01) {
    // Still no direction, use arbitrary
    pushDirection = new THREE.Vector2(1, 0);
  }
  
  pushDirection.normalize();

  // Calculate clamp rotation so support is positioned correctly
  const rotationY = Math.atan2(-pushDirection.x, -pushDirection.y) * (180 / Math.PI);

  // The final clamp position is at the fixture point (click point XZ, calculated Y)
  const clampPosition = new THREE.Vector3(
    clickPoint.x,
    fixturePointY,
    clickPoint.z
  );

  return {
    position: clampPosition,
    rotation: { x: 0, y: rotationY, z: 0 },
    success: true,
  };
}

/**
 * Adjust clamp HEIGHT when pivot controls are CLOSED.
 * 
 * SIMPLIFIED: ONLY adjusts Y position (height).
 * Does NOT change rotation or XZ position.
 * 
 * Drops the clamp so fixture point bottom sits ON TOP of the part surface.
 */
export function adjustClampPositionAfterTransform(
  clampPosition: { x: number; y: number; z: number },
  clampRotation: { x: number; y: number; z: number },
  _supportPolygon: Array<[number, number]>,
  fixturePointRadius: number,
  partMeshes: THREE.Object3D[],
  _partSilhouette: Array<{ x: number; z: number }>,
  baseTopY: number
): CollisionAdjustmentResult {
  const position = { ...clampPosition };
  const rotation = { ...clampRotation }; // Keep rotation unchanged
  let wasAdjusted = false;
  let adjustmentReason: string | undefined;
  
  // ONLY adjust height - drop clamp to part surface
  const dropResult = dropClampToPartSurface(position, fixturePointRadius, partMeshes, baseTopY);
  if (dropResult.adjusted) {
    position.y = dropResult.newY;
    wasAdjusted = true;
    adjustmentReason = 'Adjusted height to part surface';
  }
  
  return { position, rotation, wasAdjusted, adjustmentReason };
}

/**
 * Drop clamp so fixture point disk sits ON TOP of a part surface.
 * 
 * TWO-STEP APPROACH:
 * 1. Raycast DOWN from current position - if we hit a valid top surface (normal opposing ray), drop there
 * 2. If no valid top surface found, fixture point must be INSIDE the part - move UP to exit, then drop down
 */
export function dropClampToPartSurface(
  clampPosition: { x: number; y: number; z: number },
  fixturePointRadius: number,
  partMeshes: THREE.Object3D[],
  baseTopY: number
): { newY: number; adjusted: boolean } {
  if (partMeshes.length === 0) {
    return { newY: clampPosition.y, adjusted: false };
  }
  
  const raycaster = new THREE.Raycaster();
  raycaster.far = 5000;
  
  // 5 raycast points across the fixture point disk
  const sampleRadius = fixturePointRadius * 0.7;
  const testOffsets = [
    { x: 0, z: 0 },
    { x: sampleRadius, z: 0 },
    { x: -sampleRadius, z: 0 },
    { x: 0, z: sampleRadius },
    { x: 0, z: -sampleRadius },
  ];
  
  // STEP 1: Try to find a valid top surface by raycasting DOWN from current position
  // A valid top surface has normal opposing the ray direction (normal.y > 0 when ray is -Y)
  const directDropY = findTopSurfaceBelow(
    clampPosition,
    testOffsets,
    partMeshes,
    raycaster
  );
  
  if (directDropY !== null) {
    // Found a valid top surface - drop to it
    const adjusted = Math.abs(directDropY - clampPosition.y) > 0.01;
    return { newY: directDropY, adjusted };
  }
  
  // STEP 2: No valid top surface found - fixture point must be inside the part mesh
  // Move UP to exit the part, then drop down
  const currentPoint = new THREE.Vector3(clampPosition.x, clampPosition.y, clampPosition.z);
  const exitY = findExitPointMovingUp(currentPoint, partMeshes);
  
  if (exitY === null) {
    // Could not find exit point - no adjustment possible
    return { newY: clampPosition.y, adjusted: false };
  }
  
  // Now drop down from above the part
  const rayStartY = exitY + 100; // Start from above the exit point
  
  let highestSurface = -Infinity;
  
  for (const offset of testOffsets) {
    const rayOrigin = new THREE.Vector3(
      clampPosition.x + offset.x,
      rayStartY,
      clampPosition.z + offset.z
    );
    raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    
    for (const mesh of partMeshes) {
      mesh.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(mesh, true);
      
      for (const hit of hits) {
        if (hit.face) {
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
          const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
          
          // Only consider top-facing surfaces (normal opposing ray direction)
          if (worldNormal.y > 0.1 && hit.point.y > highestSurface) {
            highestSurface = hit.point.y;
          }
        }
      }
    }
  }
  
  if (highestSurface === -Infinity) {
    return { newY: clampPosition.y, adjusted: false };
  }
  
  const adjusted = Math.abs(highestSurface - clampPosition.y) > 0.01;
  return { newY: highestSurface, adjusted };
}

/**
 * Find the highest top-facing surface below the given position.
 * Returns null if no valid top surface is found (meaning we're likely inside the mesh).
 */
function findTopSurfaceBelow(
  clampPosition: { x: number; y: number; z: number },
  testOffsets: Array<{ x: number; z: number }>,
  partMeshes: THREE.Object3D[],
  raycaster: THREE.Raycaster
): number | null {
  let highestValidSurface = -Infinity;
  let foundValidSurface = false;
  
  for (const offset of testOffsets) {
    const rayOrigin = new THREE.Vector3(
      clampPosition.x + offset.x,
      clampPosition.y,
      clampPosition.z + offset.z
    );
    raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    
    for (const mesh of partMeshes) {
      mesh.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(mesh, true);
      
      // Check the FIRST hit - if it's a top-facing surface, it's valid
      if (hits.length > 0) {
        const firstHit = hits[0];
        if (firstHit.face) {
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(firstHit.object.matrixWorld);
          const worldNormal = firstHit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
          
          // Valid top surface: normal opposes ray direction (normal.y > 0 when ray is -Y)
          if (worldNormal.y > 0.1) {
            foundValidSurface = true;
            if (firstHit.point.y > highestValidSurface) {
              highestValidSurface = firstHit.point.y;
            }
          }
        }
      }
    }
  }
  
  return foundValidSurface ? highestValidSurface : null;
}

// ============================================================================
// Silhouette Computation
// ============================================================================

/**
 * Compute part silhouette using render-based approach
 * Returns the boundary points of the part's shadow on the XZ plane
 */
export function computePartSilhouetteForClamps(
  meshes: THREE.Object3D[],
  baseTopY: number
): Array<{ x: number; z: number }> {
  if (meshes.length === 0) return [];
  
  // Compute bounding box
  const box = new THREE.Box3();
  meshes.forEach(mesh => {
    mesh.updateMatrixWorld(true);
    box.expandByObject(mesh);
  });
  
  if (box.isEmpty()) return [];
  
  const bounds = {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z
  };
  
  // Use render-based silhouette extraction
  return computeRenderSilhouette(meshes, baseTopY, bounds);
}

// ============================================================================
// Polygon/Geometry Utilities
// ============================================================================

/**
 * Check if a point is inside a polygon (2D, XZ plane)
 */
export function isPointInsidePolygon(
  point: { x: number; z: number },
  polygon: Array<{ x: number; z: number }>
): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    
    if (((zi > point.z) !== (zj > point.z)) &&
        (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Get the center of a silhouette polygon
 */
function getSilhouetteCenter(silhouette: Array<{ x: number; z: number }>): { x: number; z: number } {
  if (silhouette.length === 0) {
    return { x: 0, z: 0 };
  }
  
  let sumX = 0;
  let sumZ = 0;
  for (const p of silhouette) {
    sumX += p.x;
    sumZ += p.z;
  }
  
  return {
    x: sumX / silhouette.length,
    z: sumZ / silhouette.length
  };
}

/**
 * Find the Y position where we exit the part mesh (moving upward)
 */
function findExitPointMovingUp(
  startPoint: THREE.Vector3,
  partMeshes: THREE.Object3D[]
): number | null {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 5000;
  
  // Cast ray upward
  raycaster.set(startPoint, new THREE.Vector3(0, 1, 0));
  
  const allHits: THREE.Intersection[] = [];
  for (const mesh of partMeshes) {
    mesh.updateMatrixWorld(true);
    const hits = raycaster.intersectObject(mesh, true);
    allHits.push(...hits);
  }
  
  if (allHits.length === 0) {
    return null; // No surfaces above
  }
  
  // Sort by distance (closest first)
  allHits.sort((a, b) => a.distance - b.distance);
  
  // Find the first TOP-FACING surface (normal pointing up = we exit through top)
  for (const hit of allHits) {
    if (hit.face) {
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      
      // Top-facing surface (we exit through it going up)
      if (worldNormal.y > 0.1) {
        return hit.point.y;
      }
    }
  }
  
  // Fallback: return highest hit point
  return allHits[allHits.length - 1].point.y;
}

/**
 * Compute silhouette by rendering from above
 */
function computeRenderSilhouette(
  meshes: THREE.Object3D[],
  baseTopY: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): Array<{ x: number; z: number }> {
  const RESOLUTION = 256;
  const PADDING = 5;
  
  const minX = bounds.minX - PADDING;
  const maxX = bounds.maxX + PADDING;
  const minZ = bounds.minZ - PADDING;
  const maxZ = bounds.maxZ + PADDING;
  
  const width = maxX - minX;
  const depth = maxZ - minZ;
  
  if (width <= 0 || depth <= 0) return [];
  
  // Create offscreen renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true
  });
  renderer.setSize(RESOLUTION, RESOLUTION);
  renderer.setClearColor(0xffffff, 1);
  
  const maxDim = Math.max(width, depth);
  const camera = new THREE.OrthographicCamera(
    -maxDim / 2, maxDim / 2,
    maxDim / 2, -maxDim / 2,
    0.1, 1000
  );
  
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  
  // Find max Y
  let maxY = baseTopY;
  meshes.forEach(obj => {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.updateMatrixWorld(true);
        const childBox = new THREE.Box3().setFromObject(child);
        maxY = Math.max(maxY, childBox.max.y);
      }
    });
  });
  
  camera.position.set(centerX, maxY + 100, centerZ);
  camera.lookAt(centerX, baseTopY, centerZ);
  camera.updateProjectionMatrix();
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  
  const blackMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide
  });
  
  meshes.forEach(obj => {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.updateMatrixWorld(true);
        const clonedMesh = new THREE.Mesh(child.geometry.clone(), blackMaterial);
        clonedMesh.matrixAutoUpdate = false;
        clonedMesh.matrix.copy(child.matrixWorld);
        clonedMesh.matrixWorld.copy(child.matrixWorld);
        scene.add(clonedMesh);
      }
    });
  });
  
  renderer.render(scene, camera);
  
  const gl = renderer.getContext();
  const pixels = new Uint8Array(RESOLUTION * RESOLUTION * 4);
  gl.readPixels(0, 0, RESOLUTION, RESOLUTION, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  
  // Cleanup
  renderer.dispose();
  blackMaterial.dispose();
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
    }
  });
  
  // Create binary grid
  const grid: boolean[][] = [];
  for (let row = 0; row < RESOLUTION; row++) {
    grid.push(new Array(RESOLUTION).fill(false));
  }
  
  for (let row = 0; row < RESOLUTION; row++) {
    for (let col = 0; col < RESOLUTION; col++) {
      const pixelIdx = ((RESOLUTION - 1 - row) * RESOLUTION + col) * 4;
      const r = pixels[pixelIdx];
      if (r < 128) {
        grid[row][col] = true;
      }
    }
  }
  
  // Extract boundary using simple row scan
  const boundary: Array<{ x: number; z: number }> = [];
  
  const pixelToWorld = (row: number, col: number): { x: number; z: number } => {
    const u = col / RESOLUTION;
    const v = row / RESOLUTION;
    return {
      x: centerX - maxDim / 2 + u * maxDim,
      z: centerZ - maxDim / 2 + v * maxDim
    };
  };
  
  // Find boundary pixels (part pixel adjacent to non-part pixel)
  for (let row = 1; row < RESOLUTION - 1; row++) {
    for (let col = 1; col < RESOLUTION - 1; col++) {
      if (grid[row][col]) {
        // Check if this is a boundary pixel
        const hasEmptyNeighbor = 
          !grid[row - 1][col] || !grid[row + 1][col] ||
          !grid[row][col - 1] || !grid[row][col + 1];
        
        if (hasEmptyNeighbor) {
          boundary.push(pixelToWorld(row, col));
        }
      }
    }
  }
  
  // Simplify boundary if too many points
  if (boundary.length > 100) {
    const step = Math.ceil(boundary.length / 100);
    const simplified: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < boundary.length; i += step) {
      simplified.push(boundary[i]);
    }
    return simplified;
  }
  
  return boundary;
}
