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
  /** Debug info for visualization */
  debugPoints?: {
    closestBoundaryPoint: { x: number; y: number; z: number };
    fixturePoint: { x: number; y: number; z: number };
    estimatedSupportCenter: { x: number; y: number; z: number };
  };
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
  /** Estimated support center offset from fixture point (local space, for initial placement) */
  estimatedSupportOffset?: { x: number; z: number };
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
 * Initial placement rules:
 * 1. Rotate clamp so that: silhouette centroid → fixture point → support center are collinear
 * 2. Move fixture point outward along this line until support clears the silhouette
 * 3. Drop to surface height
 */
export function calculateVerticalClampPlacement(
  options: ClampPlacementOptions
): ClampPlacementResult {
  const {
    clickPoint,
    partSilhouette,
    baseTopY,
    minPlacementOffset,
    silhouetteClearance = 5,
    estimatedSupportOffset = { x: 40, z: 0 }, // Default: support is 40mm to the +X side of fixture point
  } = options;

  // For vertical clamps, the fixture point should rest on top of the part
  // Ensure it's above the minimum clearance from baseplate
  const fixturePointY = Math.max(
    clickPoint.y,
    baseTopY + minPlacementOffset
  );

  // Find the closest point on the silhouette boundary to the fixture point
  const closestBoundary = getClosestPointOnSilhouette(
    { x: clickPoint.x, z: clickPoint.z },
    partSilhouette
  );
  
  // Calculate direction FROM fixture point TO closest boundary point
  // The support should be placed along this direction, past the boundary (outside the part)
  // Line goes: GREEN (fixture) -> RED (boundary) -> BLUE (support)
  let towardBoundaryDir = new THREE.Vector2(
    closestBoundary.x - clickPoint.x,
    closestBoundary.z - clickPoint.z
  );
  
  if (towardBoundaryDir.length() < 0.01) {
    // Click is at boundary, use outward normal direction from boundary
    towardBoundaryDir = new THREE.Vector2(closestBoundary.normalX || 1, closestBoundary.normalZ || 0);
  }
  towardBoundaryDir.normalize();
  
  // Calculate rotation so that support center is collinear: fixture -> boundary -> support
  // The support is at local +X, so we want local +X to point in the towardBoundary direction
  // For Y-axis rotation: to align +X with direction (dx, dz), use atan2(dz, dx)
  // But we need to account for THREE.js coordinate system
  const rotationY = Math.atan2(-towardBoundaryDir.y, towardBoundaryDir.x) * (180 / Math.PI);
  
  console.log('[calculateVerticalClampPlacement] Rotation calculation:', {
    closestBoundary: { x: closestBoundary.x, z: closestBoundary.z },
    clickPoint: { x: clickPoint.x, z: clickPoint.z },
    towardBoundaryDir: { x: towardBoundaryDir.x, y: towardBoundaryDir.y },
    rotationY
  });
  
  // Now we need to push the fixture point along the direction until the support clears the silhouette
  // Calculate where the support center will be in world space
  const rotRad = THREE.MathUtils.degToRad(rotationY);
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  
  // Transform support offset from local to world (rotate by clamp rotation)
  // Local coordinate: supportOffset.x = local X, supportOffset.z = local Z
  // Y-axis rotation: newX = x*cos + z*sin, newZ = -x*sin + z*cos
  const supportOffsetWorld = {
    x: estimatedSupportOffset.x * cosR + estimatedSupportOffset.z * sinR,
    z: -estimatedSupportOffset.x * sinR + estimatedSupportOffset.z * cosR
  };
  
  console.log('[calculateVerticalClampPlacement] Support offset calculation:', {
    estimatedSupportOffset,
    rotRad,
    cosR,
    sinR,
    supportOffsetWorld
  });
  
  // Start with fixture point at click position
  let fixtureX = clickPoint.x;
  let fixtureZ = clickPoint.z;
  
  // Check if support center would be inside silhouette
  // Move fixture point along towardBoundary direction until support clears
  const maxPushDistance = 200; // Maximum distance to push (mm)
  const stepSize = 2;
  
  for (let dist = 0; dist <= maxPushDistance; dist += stepSize) {
    const testFixtureX = clickPoint.x + towardBoundaryDir.x * dist;
    const testFixtureZ = clickPoint.z + towardBoundaryDir.y * dist;
    
    // Calculate where support center would be
    const supportCenterX = testFixtureX + supportOffsetWorld.x;
    const supportCenterZ = testFixtureZ + supportOffsetWorld.z;
    
    // Check if support center is outside silhouette with clearance
    const supportInsideSilhouette = isPointInsidePolygon(
      { x: supportCenterX, z: supportCenterZ },
      partSilhouette
    );
    
    if (!supportInsideSilhouette) {
      // Also check clearance from silhouette edge
      const distToEdge = distanceToSilhouetteEdge(
        { x: supportCenterX, z: supportCenterZ },
        partSilhouette
      );
      
      if (distToEdge >= silhouetteClearance) {
        // Found valid position
        fixtureX = testFixtureX;
        fixtureZ = testFixtureZ;
        break;
      }
    }
    
    // Update fixture position even if not yet clear (in case we reach max distance)
    fixtureX = testFixtureX;
    fixtureZ = testFixtureZ;
  }

  // The final clamp position is at the fixture point
  const clampPosition = new THREE.Vector3(
    fixtureX,
    fixturePointY,
    fixtureZ
  );

  // Calculate final support center position for debug
  const finalSupportCenterX = fixtureX + supportOffsetWorld.x;
  const finalSupportCenterZ = fixtureZ + supportOffsetWorld.z;

  return {
    position: clampPosition,
    rotation: { x: 0, y: rotationY, z: 0 },
    success: true,
    debugPoints: {
      closestBoundaryPoint: { x: closestBoundary.x, y: fixturePointY, z: closestBoundary.z },
      fixturePoint: { x: fixtureX, y: fixturePointY, z: fixtureZ },
      estimatedSupportCenter: { x: finalSupportCenterX, y: fixturePointY, z: finalSupportCenterZ },
    },
  };
}

/**
 * Adjust clamp position after support data is loaded.
 * Uses 2D silhouette math to ensure support polygon is outside the part boundary.
 * Moves fixture point along the line (fixture → boundary) until support clears.
 * 
 * @param clampPosition Current fixture point position
 * @param clampRotation Clamp rotation (Y rotation matters for support orientation)
 * @param supportPolygon Support footprint polygon in local space [x, z] pairs
 * @param closestBoundaryPoint The closest point on silhouette boundary (RED sphere)
 * @param partSilhouette Part silhouette polygon in world XZ space
 * @param silhouetteClearance Minimum clearance from silhouette edge (mm)
 */
export function adjustClampAfterDataLoad(
  clampPosition: { x: number; y: number; z: number },
  clampRotation: { x: number; y: number; z: number },
  supportPolygon: Array<[number, number]>,
  closestBoundaryPoint: { x: number; z: number } | null,
  partSilhouette: Array<{ x: number; z: number }>,
  silhouetteClearance: number = 1 // Minimal clearance - just outside boundary
): { position: { x: number; y: number; z: number }; adjusted: boolean } {
  console.log('[2D-ADJUST] Starting adjustClampAfterDataLoad:', {
    clampPosition,
    clampRotation,
    supportPolygonLength: supportPolygon.length,
    closestBoundaryPoint,
    silhouetteLength: partSilhouette?.length || 0,
    silhouetteClearance,
  });
  
  if (supportPolygon.length === 0 || !partSilhouette || partSilhouette.length < 3) {
    console.log('[2D-ADJUST] Early exit - insufficient data');
    return { position: clampPosition, adjusted: false };
  }
  
  const rotRad = THREE.MathUtils.degToRad(clampRotation.y);
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  
  // Function to transform support polygon to world space given a fixture position
  const transformSupportToWorld = (fixtureX: number, fixtureZ: number) => {
    return supportPolygon.map(([lx, lz]) => ({
      x: fixtureX + lx * cosR + lz * sinR,
      z: fixtureZ - lx * sinR + lz * cosR
    }));
  };
  
  // Function to check if support polygon overlaps with silhouette
  // Only checks if vertices are INSIDE - no extra clearance requirement
  const checkSupportOverlap = (fixtureX: number, fixtureZ: number): { overlaps: boolean; maxPenetration: number } => {
    const worldSupport = transformSupportToWorld(fixtureX, fixtureZ);
    let maxPenetration = 0;
    let overlaps = false;
    
    for (const vertex of worldSupport) {
      const isInside = isPointInsidePolygon(vertex, partSilhouette);
      
      if (isInside) {
        overlaps = true;
        const distToEdge = distanceToSilhouetteEdge(vertex, partSilhouette);
        // Just need to clear the boundary + minimal clearance
        maxPenetration = Math.max(maxPenetration, distToEdge + silhouetteClearance);
      }
    }
    
    return { overlaps, maxPenetration };
  };
  
  // Check initial overlap
  const initialCheck = checkSupportOverlap(clampPosition.x, clampPosition.z);
  console.log('[2D-ADJUST] Initial overlap check:', {
    fixturePos: { x: clampPosition.x, z: clampPosition.z },
    overlaps: initialCheck.overlaps,
    maxPenetration: initialCheck.maxPenetration,
  });
  
  if (!initialCheck.overlaps) {
    console.log('[2D-ADJUST] No overlap detected, returning original position');
    return { position: clampPosition, adjusted: false };
  }
  
  // Calculate direction to move: from fixture point TOWARD boundary point
  // This is the YELLOW LINE direction
  let moveDir: THREE.Vector2;
  
  if (closestBoundaryPoint) {
    moveDir = new THREE.Vector2(
      closestBoundaryPoint.x - clampPosition.x,
      closestBoundaryPoint.z - clampPosition.z
    );
    console.log('[2D-ADJUST] Using boundary point direction:', {
      from: { x: clampPosition.x, z: clampPosition.z },
      to: closestBoundaryPoint,
    });
  } else {
    // Fallback: use centroid-based outward direction
    const centroid = getSilhouetteCenter(partSilhouette);
    moveDir = new THREE.Vector2(
      clampPosition.x - centroid.x,
      clampPosition.z - centroid.z
    );
    console.log('[2D-ADJUST] Fallback: using centroid outward direction');
  }
  
  if (moveDir.length() < 0.01) {
    moveDir.set(1, 0);
  }
  moveDir.normalize();
  
  console.log('[2D-ADJUST] Move direction (normalized):', { x: moveDir.x, z: moveDir.y });
  
  // Iteratively move fixture point along the direction until support clears
  const maxMoveDistance = 200; // mm
  const stepSize = 1; // 1mm steps for precision
  
  let newFixtureX = clampPosition.x;
  let newFixtureZ = clampPosition.z;
  let foundClearPosition = false;
  
  for (let dist = stepSize; dist <= maxMoveDistance; dist += stepSize) {
    const testX = clampPosition.x + moveDir.x * dist;
    const testZ = clampPosition.z + moveDir.y * dist;
    
    const check = checkSupportOverlap(testX, testZ);
    
    if (!check.overlaps) {
      newFixtureX = testX;
      newFixtureZ = testZ;
      foundClearPosition = true;
      console.log('[2D-ADJUST] Found clear position at distance:', dist, 'mm');
      break;
    }
  }
  
  if (!foundClearPosition) {
    // Use the max penetration to estimate required move distance (no extra padding)
    const estimatedMove = initialCheck.maxPenetration;
    newFixtureX = clampPosition.x + moveDir.x * estimatedMove;
    newFixtureZ = clampPosition.z + moveDir.y * estimatedMove;
    console.log('[2D-ADJUST] Could not find clear position, using estimated move:', estimatedMove, 'mm');
  }
  
  console.log('[2D-ADJUST] Final position:', {
    from: { x: clampPosition.x, z: clampPosition.z },
    to: { x: newFixtureX, z: newFixtureZ },
    moved: Math.sqrt(Math.pow(newFixtureX - clampPosition.x, 2) + Math.pow(newFixtureZ - clampPosition.z, 2)),
  });
  
  return {
    position: {
      x: newFixtureX,
      y: clampPosition.y,
      z: newFixtureZ
    },
    adjusted: true
  };
}

/**
 * Build a support mesh geometry from a 2D polygon (extruded as a prism).
 * The polygon is in local XZ plane, extruded along Y.
 */
function buildSupportGeometryFromPolygon(
  polygon: Array<[number, number]>,
  height: number = 20
): THREE.BufferGeometry {
  if (polygon.length < 3) {
    // Return a tiny box as fallback
    return new THREE.BoxGeometry(1, 1, 1);
  }
  
  // Create a shape from the polygon
  const shape = new THREE.Shape();
  shape.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i][0], polygon[i][1]);
  }
  shape.closePath();
  
  // Extrude the shape along Y
  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: false
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  // ExtrudeGeometry creates shape in XY plane, extruded along Z
  // We need it in XZ plane, extruded along Y
  // Rotate -90 degrees around X axis: Y becomes Z, Z becomes -Y
  geometry.rotateX(-Math.PI / 2);
  
  return geometry;
}

/**
 * Check if the support mesh collides with any part mesh using BVH.
 * Returns true if there's a collision.
 */
function checkSupportPartCollisionBVH(
  supportGeometry: THREE.BufferGeometry,
  supportWorldMatrix: THREE.Matrix4,
  partMeshes: THREE.Object3D[]
): boolean {
  console.log('[BVH-COLLISION] Checking collision against', partMeshes.length, 'part meshes');
  
  // For each part mesh, check if support intersects it
  for (let i = 0; i < partMeshes.length; i++) {
    const partObj = partMeshes[i];
    const partMesh = partObj as THREE.Mesh;
    if (!partMesh.geometry) {
      console.log('[BVH-COLLISION] Part', i, 'has no geometry, skipping');
      continue;
    }
    
    const partGeometry = partMesh.geometry as THREE.BufferGeometry;
    
    // Ensure part has BVH
    if (!(partGeometry as any).boundsTree) {
      console.log('[BVH-COLLISION] Part', i, 'building BVH...');
      partGeometry.computeBoundsTree();
    }
    
    const bvh = (partGeometry as any).boundsTree;
    if (!bvh) {
      console.log('[BVH-COLLISION] Part', i, 'failed to build BVH, skipping');
      continue;
    }
    
    // Calculate transform: support world -> part local
    // supportToPart = partWorldInverse * supportWorld
    const partWorldMatrix = partMesh.matrixWorld.clone();
    const partWorldInverse = partWorldMatrix.clone().invert();
    const supportToPartMatrix = partWorldInverse.clone().multiply(supportWorldMatrix);
    
    // Check intersection
    const intersects = bvh.intersectsGeometry(supportGeometry, supportToPartMatrix);
    
    console.log('[BVH-COLLISION] Part', i, 'intersection result:', intersects);
    
    if (intersects) {
      return true;
    }
  }
  
  console.log('[BVH-COLLISION] No collision detected with any part');
  return false;
}

/**
 * Adjust clamp position using BVH-based mesh collision detection.
 * Moves fixture point TOWARD the boundary until support clears the part mesh.
 * 
 * @param clampPosition Current clamp position (fixture point)
 * @param clampRotation Current clamp rotation
 * @param supportPolygon Support footprint polygon in local space [x, z] pairs
 * @param supportLocalCenter Center of support in local space
 * @param closestBoundaryPoint Closest point on part silhouette boundary
 * @param partMeshes Array of part meshes to check collision against
 * @param supportHeight Height of support prism for collision geometry
 */
export function adjustClampWithBVHCollision(
  clampPosition: { x: number; y: number; z: number },
  clampRotation: { x: number; y: number; z: number },
  supportPolygon: Array<[number, number]>,
  supportLocalCenter: { x: number; y: number },
  closestBoundaryPoint: { x: number; z: number },
  partMeshes: THREE.Object3D[],
  supportHeight: number = 40
): { position: { x: number; y: number; z: number }; adjusted: boolean } {
  console.log('[BVH-ADJUST] Starting adjustClampWithBVHCollision:', {
    clampPosition,
    clampRotation,
    supportPolygonLength: supportPolygon.length,
    supportLocalCenter,
    closestBoundaryPoint,
    partMeshCount: partMeshes.length,
    supportHeight,
  });
  
  if (supportPolygon.length < 3 || partMeshes.length === 0) {
    console.log('[BVH-ADJUST] Early exit - insufficient data:', {
      polygonLength: supportPolygon.length,
      partMeshCount: partMeshes.length,
    });
    return { position: clampPosition, adjusted: false };
  }
  
  // Build support geometry from polygon
  console.log('[BVH-ADJUST] Building support geometry from polygon:', supportPolygon.slice(0, 5), '...');
  const supportGeometry = buildSupportGeometryFromPolygon(supportPolygon, supportHeight);
  
  // Check if geometry was built correctly
  const posAttr = supportGeometry.getAttribute('position');
  console.log('[BVH-ADJUST] Support geometry built:', {
    vertexCount: posAttr ? posAttr.count : 0,
    hasIndex: !!supportGeometry.index,
  });
  
  // Optionally build BVH for support geometry too (improves performance)
  supportGeometry.computeBoundsTree();
  
  const rotRad = THREE.MathUtils.degToRad(clampRotation.y);
  
  // Direction: from fixture point TOWARD boundary point
  // This is the direction we'll move if support collides
  const towardBoundaryDir = new THREE.Vector2(
    closestBoundaryPoint.x - clampPosition.x,
    closestBoundaryPoint.z - clampPosition.z
  );
  
  const distanceToBoundary = towardBoundaryDir.length();
  console.log('[BVH-ADJUST] Direction to boundary:', {
    from: { x: clampPosition.x, z: clampPosition.z },
    to: closestBoundaryPoint,
    distance: distanceToBoundary,
  });
  
  if (distanceToBoundary < 0.01) {
    console.log('[BVH-ADJUST] Already at boundary, no adjustment');
    supportGeometry.dispose();
    return { position: clampPosition, adjusted: false };
  }
  towardBoundaryDir.normalize();
  
  // Check initial collision
  const buildSupportWorldMatrix = (fixtureX: number, fixtureZ: number): THREE.Matrix4 => {
    // Support local center offset (in clamp local space)
    // Transform to world offset
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    
    // The support polygon is already in local space around the support center
    // We need to position the geometry at: fixture position + rotated support offset
    // But actually the polygon points are relative to support center (0,0)
    // So we need to translate by: supportLocalCenter in world space
    
    const worldSupportCenterX = fixtureX + supportLocalCenter.x * cosR + supportLocalCenter.y * sinR;
    const worldSupportCenterZ = fixtureZ - supportLocalCenter.x * sinR + supportLocalCenter.y * cosR;
    
    // Build world matrix for support
    const matrix = new THREE.Matrix4();
    matrix.makeRotationY(rotRad);
    matrix.setPosition(worldSupportCenterX, clampPosition.y - supportHeight / 2, worldSupportCenterZ);
    
    return matrix;
  };
  
  // Initial check
  console.log('[BVH-ADJUST] Checking initial collision at fixture position:', { x: clampPosition.x, z: clampPosition.z });
  let supportWorldMatrix = buildSupportWorldMatrix(clampPosition.x, clampPosition.z);
  let hasCollision = checkSupportPartCollisionBVH(supportGeometry, supportWorldMatrix, partMeshes);
  
  console.log('[BVH-ADJUST] Initial collision result:', hasCollision);
  
  if (!hasCollision) {
    // No collision, no adjustment needed
    console.log('[BVH-ADJUST] No initial collision, returning original position');
    supportGeometry.dispose();
    return { position: clampPosition, adjusted: false };
  }
  
  console.log('[BVH-ADJUST] Initial collision detected! Moving fixture toward boundary...');
  console.log('[BVH-ADJUST] Move direction:', { x: towardBoundaryDir.x, y: towardBoundaryDir.y });
  
  // Move fixture point toward boundary until no collision
  const maxMoveDistance = distanceToBoundary + 100; // Can move past boundary if needed
  const stepSize = 2; // mm per step
  
  let newFixtureX = clampPosition.x;
  let newFixtureZ = clampPosition.z;
  let foundClearPosition = false;
  
  for (let dist = stepSize; dist <= maxMoveDistance; dist += stepSize) {
    const testX = clampPosition.x + towardBoundaryDir.x * dist;
    const testZ = clampPosition.z + towardBoundaryDir.y * dist;
    
    supportWorldMatrix = buildSupportWorldMatrix(testX, testZ);
    hasCollision = checkSupportPartCollisionBVH(supportGeometry, supportWorldMatrix, partMeshes);
    
    if (!hasCollision) {
      newFixtureX = testX;
      newFixtureZ = testZ;
      foundClearPosition = true;
      console.log(`[adjustClampWithBVHCollision] Found clear position at distance ${dist}mm`);
      break;
    }
    
    // Update position even if still colliding (in case we reach max distance)
    newFixtureX = testX;
    newFixtureZ = testZ;
  }
  
  supportGeometry.dispose();
  
  if (!foundClearPosition) {
    console.warn('[adjustClampWithBVHCollision] Could not find clear position within max distance');
  }
  
  return {
    position: {
      x: newFixtureX,
      y: clampPosition.y,
      z: newFixtureZ
    },
    adjusted: true
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

/**
 * Calculate distance from a point to the nearest edge of a polygon
 */
function distanceToSilhouetteEdge(
  point: { x: number; z: number },
  polygon: Array<{ x: number; z: number }>
): number {
  if (polygon.length < 2) return Infinity;
  
  let minDist = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    // Calculate distance from point to line segment p1-p2
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lengthSq = dx * dx + dz * dz;
    
    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.z - p1.z) * dz) / lengthSq));
    }
    
    const closestX = p1.x + t * dx;
    const closestZ = p1.z + t * dz;
    
    const dist = Math.sqrt((point.x - closestX) ** 2 + (point.z - closestZ) ** 2);
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}

/**
 * Get the closest point on the silhouette boundary to a given point,
 * along with the outward normal at that point
 */
function getClosestPointOnSilhouette(
  point: { x: number; z: number },
  polygon: Array<{ x: number; z: number }>
): { x: number; z: number; normalX: number; normalZ: number } {
  if (polygon.length < 2) {
    return { x: point.x, z: point.z, normalX: 1, normalZ: 0 };
  }
  
  let minDist = Infinity;
  let closestX = point.x;
  let closestZ = point.z;
  let normalX = 1;
  let normalZ = 0;
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    // Calculate distance from point to line segment p1-p2
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lengthSq = dx * dx + dz * dz;
    
    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(0, Math.min(1, ((point.x - p1.x) * dx + (point.z - p1.z) * dz) / lengthSq));
    }
    
    const projX = p1.x + t * dx;
    const projZ = p1.z + t * dz;
    
    const dist = Math.sqrt((point.x - projX) ** 2 + (point.z - projZ) ** 2);
    
    if (dist < minDist) {
      minDist = dist;
      closestX = projX;
      closestZ = projZ;
      
      // Calculate outward normal (perpendicular to edge, pointing away from polygon interior)
      // Edge direction: (dx, dz), perpendicular: (-dz, dx) or (dz, -dx)
      // We want the one pointing outward (away from centroid)
      const edgeLen = Math.sqrt(lengthSq);
      if (edgeLen > 0) {
        // Use the perpendicular that points toward the query point
        const perpX = -dz / edgeLen;
        const perpZ = dx / edgeLen;
        
        // Check which direction points toward the query point
        const toPointX = point.x - projX;
        const toPointZ = point.z - projZ;
        const dot = perpX * toPointX + perpZ * toPointZ;
        
        if (dot >= 0) {
          normalX = perpX;
          normalZ = perpZ;
        } else {
          normalX = -perpX;
          normalZ = -perpZ;
        }
      }
    }
  }
  
  return { x: closestX, z: closestZ, normalX, normalZ };
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
 * Compute silhouette by rendering from above and using Moore Neighborhood tracing
 * This is the same algorithm used in overhangAnalysis.ts for accurate part outline
 */
function computeRenderSilhouette(
  meshes: THREE.Object3D[],
  baseTopY: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): Array<{ x: number; z: number }> {
  const RESOLUTION = 512; // Higher resolution for better accuracy
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
  
  // Create binary grid from pixels
  const grid: boolean[][] = [];
  for (let row = 0; row < RESOLUTION; row++) {
    grid.push(new Array(RESOLUTION).fill(false));
  }
  
  let filledCount = 0;
  for (let row = 0; row < RESOLUTION; row++) {
    for (let col = 0; col < RESOLUTION; col++) {
      const pixelIdx = ((RESOLUTION - 1 - row) * RESOLUTION + col) * 4;
      const r = pixels[pixelIdx];
      if (r < 128) {
        grid[row][col] = true;
        filledCount++;
      }
    }
  }
  
  console.log('[computeRenderSilhouette] Grid filled pixels:', filledCount, 'of', RESOLUTION * RESOLUTION);
  
  if (filledCount === 0) {
    console.warn('[computeRenderSilhouette] No part pixels found');
    return [];
  }
  
  // Convert pixel to world coordinates
  const pixelToWorld = (row: number, col: number): { x: number; z: number } => {
    const u = col / RESOLUTION;
    const v = row / RESOLUTION;
    return {
      x: centerX - maxDim / 2 + u * maxDim,
      z: centerZ - maxDim / 2 + v * maxDim
    };
  };
  
  // Use Moore Neighborhood tracing (same as overhangAnalysis.ts)
  const contour = mooreNeighborhoodTrace(grid, RESOLUTION, pixelToWorld);
  
  console.log('[computeRenderSilhouette] Moore trace contour:', contour.length, 'points');
  
  if (contour.length < 3) {
    console.warn('[computeRenderSilhouette] Moore trace produced insufficient points');
    return [];
  }
  
  // Simplify to reduce point count
  const cellSize = maxDim / RESOLUTION;
  const simplified = douglasPeuckerSimplify(contour, cellSize * 1.5);
  
  console.log('[computeRenderSilhouette] Simplified to:', simplified.length, 'points');
  
  return simplified;
}

/**
 * Moore Neighborhood Contour Tracing Algorithm
 * Same algorithm used in overhangAnalysis.ts - traces the exact boundary of a binary image
 */
function mooreNeighborhoodTrace(
  grid: boolean[][],
  resolution: number,
  pixelToWorld: (row: number, col: number) => { x: number; z: number }
): Array<{ x: number; z: number }> {
  // Helper to check if pixel is part
  const isPartPixel = (row: number, col: number): boolean => {
    if (row < 0 || row >= resolution || col < 0 || col >= resolution) return false;
    return grid[row][col];
  };
  
  // Find starting pixel: scan from top-left, find first part pixel
  let startRow = -1, startCol = -1;
  outer: for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      if (grid[row][col]) {
        startRow = row;
        startCol = col;
        break outer;
      }
    }
  }
  
  if (startRow < 0) {
    console.log('[MooreTrace] No start pixel found');
    return [];
  }
  
  console.log('[MooreTrace] Start pixel: row=' + startRow + ', col=' + startCol);
  
  // Moore neighborhood: 8 directions, clockwise starting from the pixel to the left
  const directions = [
    { dr: 0, dc: -1 },  // 0: West (left)
    { dr: -1, dc: -1 }, // 1: NW
    { dr: -1, dc: 0 },  // 2: North (up)
    { dr: -1, dc: 1 },  // 3: NE
    { dr: 0, dc: 1 },   // 4: East (right)
    { dr: 1, dc: 1 },   // 5: SE
    { dr: 1, dc: 0 },   // 6: South (down)
    { dr: 1, dc: -1 },  // 7: SW
  ];
  
  const contour: Array<{ x: number; z: number }> = [];
  const visited = new Set<string>();
  
  let currentRow = startRow;
  let currentCol = startCol;
  let backtrackDir = 0;
  
  const maxIterations = resolution * resolution;
  let iterations = 0;
  
  do {
    const key = `${currentRow},${currentCol}`;
    
    // Add this pixel to contour
    const worldPoint = pixelToWorld(currentRow, currentCol);
    if (contour.length === 0 || 
        contour[contour.length - 1].x !== worldPoint.x || 
        contour[contour.length - 1].z !== worldPoint.z) {
      contour.push(worldPoint);
    }
    
    // Check for loop completion
    if (visited.has(key) && iterations > 8) {
      if (currentRow === startRow && currentCol === startCol) {
        break;
      }
    }
    visited.add(key);
    
    // Scan neighbors clockwise starting from backtrack+1
    let found = false;
    const startScan = (backtrackDir + 1) % 8;
    
    for (let i = 0; i < 8; i++) {
      const dirIdx = (startScan + i) % 8;
      const dir = directions[dirIdx];
      const nr = currentRow + dir.dr;
      const nc = currentCol + dir.dc;
      
      if (isPartPixel(nr, nc)) {
        backtrackDir = (dirIdx + 4) % 8;
        currentRow = nr;
        currentCol = nc;
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log('[MooreTrace] No neighbor found at (' + currentRow + ', ' + currentCol + ')');
      break;
    }
    
    iterations++;
    if (iterations > maxIterations) {
      console.log('[MooreTrace] Max iterations reached');
      break;
    }
    
  } while (currentRow !== startRow || currentCol !== startCol || iterations < 8);
  
  return contour;
}

/**
 * Douglas-Peucker line simplification algorithm
 */
function douglasPeuckerSimplify(
  points: Array<{ x: number; z: number }>,
  tolerance: number
): Array<{ x: number; z: number }> {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIndex = 0;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistanceDP(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = douglasPeuckerSimplify(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeuckerSimplify(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistanceDP(
  point: { x: number; z: number },
  lineStart: { x: number; z: number },
  lineEnd: { x: number; z: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dz = lineEnd.z - lineStart.z;
  const lengthSq = dx * dx + dz * dz;
  
  if (lengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.z - lineStart.z);
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.z - lineStart.z) * dz) / lengthSq
  ));
  
  const projX = lineStart.x + t * dx;
  const projZ = lineStart.z + t * dz;
  
  return Math.hypot(point.x - projX, point.z - projZ);
}
