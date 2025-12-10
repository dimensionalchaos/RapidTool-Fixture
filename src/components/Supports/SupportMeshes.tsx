import React, { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AnySupport } from './types';

interface SupportMeshProps {
  support: AnySupport;
  preview?: boolean;
  baseTopY?: number;
  selected?: boolean;
  onDoubleClick?: (supportId: string) => void;
}

// Double-click detection threshold in milliseconds
const DOUBLE_CLICK_THRESHOLD_MS = 300;

// Lighter blue color for selection (blue-300 for better contrast with gizmo)
const SELECTION_COLOR = 0x93c5fd;

// Use a non-metallic matte material for supports
const materialFor = (preview?: boolean, selected?: boolean) =>
  new THREE.MeshStandardMaterial({
    color: preview ? 0x3b82f6 : selected ? SELECTION_COLOR : 0x888888,
    transparent: !!preview,
    opacity: preview ? 0.5 : 1,
    metalness: 0.0,
    roughness: 0.7,
    side: THREE.DoubleSide,
    emissive: selected ? SELECTION_COLOR : 0x000000,
    emissiveIntensity: selected ? 0.2 : 0,
  });

// Fillet parameters
const FILLET_RADIUS = 2.0; // mm - radius of the fillet curve
const FILLET_SEGMENTS = 24; // number of segments for smooth fillet (increased for better CSG results)

/**
 * Create a SOLID cylindrical support with integrated fillet as a single manifold mesh.
 * Uses LatheGeometry with a closed profile to create a watertight solid.
 * The profile includes: bottom cap, fillet curve, cylinder wall, and top cap.
 */
const createSolidCylindricalSupport = (
  supportRadius: number, 
  height: number,
  filletRadius: number = FILLET_RADIUS, 
  segments: number = FILLET_SEGMENTS
): THREE.BufferGeometry => {
  // Create a 2D profile that will be revolved around the Y axis
  // The profile traces the outline of the solid cross-section
  const points: THREE.Vector2[] = [];
  
  // Start at center bottom (y=0, x=0) - for bottom cap
  points.push(new THREE.Vector2(0.001, 0)); // Tiny offset to avoid degenerate triangles at axis
  
  // Bottom edge - from center to outer edge of fillet at y=0
  const outerRadius = supportRadius + filletRadius;
  points.push(new THREE.Vector2(outerRadius, 0));
  
  // Fillet curve - quarter circle from (outerRadius, 0) to (supportRadius, filletRadius)
  // Center of fillet arc is at (supportRadius + filletRadius, filletRadius)
  // Wait, that's wrong. Let me recalculate.
  // The fillet is at the BASE of the support, curving from the baseplate up.
  // It should curve from outer (at y=0) to inner (at y=filletRadius).
  // Arc center: (supportRadius + filletRadius, filletRadius)
  // At angle 3π/2 (270°, pointing down): point is at (supportRadius + filletRadius, 0)
  // At angle π (180°, pointing left): point is at (supportRadius, filletRadius)
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = (3 * Math.PI / 2) - t * (Math.PI / 2); // from 270° to 180°
    const x = (supportRadius + filletRadius) + filletRadius * Math.cos(angle);
    const y = filletRadius + filletRadius * Math.sin(angle);
    points.push(new THREE.Vector2(x, y));
  }
  
  // Now at (supportRadius, filletRadius) - continue up the cylinder wall
  // Top of cylinder at full height
  points.push(new THREE.Vector2(supportRadius, height));
  
  // Top cap - from outer edge to center
  points.push(new THREE.Vector2(0.001, height)); // Back to center axis at top
  
  // Create the lathe geometry
  const geometry = new THREE.LatheGeometry(points, 64, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  
  return geometry;
};

/**
 * Create a SOLID conical support with integrated fillet as a single manifold mesh.
 * Uses LatheGeometry with a closed profile to create a watertight solid.
 */
const createSolidConicalSupport = (
  baseRadius: number,
  topRadius: number,
  height: number,
  filletRadius: number = FILLET_RADIUS, 
  segments: number = FILLET_SEGMENTS
): THREE.BufferGeometry => {
  const points: THREE.Vector2[] = [];
  
  // Calculate the cone's slope angle
  const radiusDiff = baseRadius - topRadius;
  const slopeAngle = Math.atan2(radiusDiff, height);
  
  // Fillet parameters
  const filletCenterR = baseRadius + filletRadius;
  const filletCenterY = filletRadius;
  
  // Arc angles for conical fillet
  const startAngle = Math.PI + slopeAngle;  // tangent to cone slope
  const endAngle = 3 * Math.PI / 2;          // tangent to horizontal baseplate
  const arcAngle = endAngle - startAngle;
  
  // Calculate where fillet meets the cone
  const filletTopR = filletCenterR + filletRadius * Math.cos(startAngle);
  const filletTopY = filletCenterY + filletRadius * Math.sin(startAngle);
  
  // Start at center bottom (y=0, x=0) - for bottom cap
  points.push(new THREE.Vector2(0.001, 0));
  
  // Bottom edge - from center to outer edge of fillet at y=0
  const outerRadius = baseRadius + filletRadius;
  points.push(new THREE.Vector2(outerRadius, 0));
  
  // Fillet curve from outer bottom to where it meets cone slope
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = endAngle - t * arcAngle; // from 270° towards (180° + slopeAngle)
    const r = filletCenterR + filletRadius * Math.cos(angle);
    const y = filletCenterY + filletRadius * Math.sin(angle);
    points.push(new THREE.Vector2(r, y));
  }
  
  // Continue along the cone slope from fillet top to cone top
  // The cone goes from (filletTopR, filletTopY) to (topRadius, height)
  points.push(new THREE.Vector2(topRadius, height));
  
  // Top cap - from outer edge to center
  points.push(new THREE.Vector2(0.001, height));
  
  // Create the lathe geometry
  const geometry = new THREE.LatheGeometry(points, 64, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  
  return geometry;
};

/**
 * Create SOLID fillet geometry for cylindrical supports.
 * This creates the fillet portion only (not the full support) as a solid volume.
 */
const createCylindricalFilletGeometry = (supportRadius: number, filletRadius: number = FILLET_RADIUS, segments: number = FILLET_SEGMENTS): THREE.BufferGeometry => {
  // Create a profile for just the fillet portion as a solid
  const points: THREE.Vector2[] = [];
  
  // Start at inner edge at y=0 (where it will meet the cylinder body)
  points.push(new THREE.Vector2(supportRadius, 0));
  
  // Bottom edge to outer radius at y=0
  const outerRadius = supportRadius + filletRadius;
  points.push(new THREE.Vector2(outerRadius, 0));
  
  // Fillet curve from (outerRadius, 0) to (supportRadius, filletRadius)
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = (3 * Math.PI / 2) - t * (Math.PI / 2); // from 270° to 180°
    const x = (supportRadius + filletRadius) + filletRadius * Math.cos(angle);
    const y = filletRadius + filletRadius * Math.sin(angle);
    points.push(new THREE.Vector2(x, y));
  }
  
  // Top edge back to inner radius (close the profile)
  // Already at (supportRadius, filletRadius) from the loop
  // Close by going back down to start
  points.push(new THREE.Vector2(supportRadius, 0));
  
  // Create the lathe geometry
  const geometry = new THREE.LatheGeometry(points, 64, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  
  return geometry;
};

// Helper function to compute the height of a conical fillet
// Returns the Y position where the fillet ends at the top (meeting the cone body)
const getConicalFilletHeight = (baseRadius: number, topRadius: number, coneHeight: number, filletRadius: number): number => {
  // Calculate slope angle
  const radiusDiff = baseRadius - topRadius;
  const slopeAngle = Math.atan2(radiusDiff, coneHeight);
  // Fillet top Y = filletRadius * (1 - sin(slopeAngle))
  return filletRadius * (1 - Math.sin(slopeAngle));
};

// Create a fillet ring geometry for conical supports
// This creates an external fillet tangent to both the horizontal baseplate and the cone's sloped wall
// Now creates a SOLID fillet using LatheGeometry with closed profile
const createConicalFilletGeometry = (
  baseRadius: number, 
  topRadius: number, 
  coneHeight: number,
  filletRadius: number = FILLET_RADIUS, 
  segments: number = FILLET_SEGMENTS
): THREE.BufferGeometry => {
  // Calculate the cone's slope angle
  const radiusDiff = baseRadius - topRadius;
  const slopeAngle = Math.atan2(radiusDiff, coneHeight);
  
  // Fillet center position
  const filletCenterR = baseRadius + filletRadius;
  const filletCenterY = filletRadius;
  
  // Arc angles
  const startAngle = Math.PI + slopeAngle;  // tangent to cone slope
  const endAngle = 3 * Math.PI / 2;          // tangent to horizontal baseplate
  const arcAngle = endAngle - startAngle;
  
  // Calculate where fillet meets the cone (at top of fillet)
  const filletTopR = filletCenterR + filletRadius * Math.cos(startAngle);
  const filletTopY = filletCenterY + filletRadius * Math.sin(startAngle);
  
  // Create a 2D profile for the solid fillet
  const points: THREE.Vector2[] = [];
  
  // Start at inner edge at y=0 (where it will meet the cone body base)
  points.push(new THREE.Vector2(baseRadius, 0));
  
  // Bottom edge to outer radius at y=0
  const outerRadius = baseRadius + filletRadius;
  points.push(new THREE.Vector2(outerRadius, 0));
  
  // Fillet curve from outer bottom to where it meets cone
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = endAngle - t * arcAngle; // from 270° towards (180° + slopeAngle)
    const r = filletCenterR + filletRadius * Math.cos(angle);
    const y = filletCenterY + filletRadius * Math.sin(angle);
    points.push(new THREE.Vector2(r, y));
  }
  
  // Close by going back to where cone wall would be at this height
  // The fillet top point is at (filletTopR, filletTopY)
  // We need to connect back to close the profile
  points.push(new THREE.Vector2(baseRadius, filletTopY)); // Straight down to inner radius
  points.push(new THREE.Vector2(baseRadius, 0)); // Back to start
  
  // Create the lathe geometry
  const geometry = new THREE.LatheGeometry(points, 64, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  
  return geometry;
};

// Helper function to create a rounded polygon path with corner radius
const createRoundedPolygon = (polygon: [number, number][], cornerRadius: number): { points: [number, number][], cornerCenters: { cx: number, cz: number, startAngle: number, endAngle: number }[] } => {
  if (polygon.length < 3 || cornerRadius <= 0) {
    return { points: polygon, cornerCenters: [] };
  }
  
  const points: [number, number][] = [];
  const cornerCenters: { cx: number, cz: number, startAngle: number, endAngle: number }[] = [];
  const cornerSegs = 8;
  
  for (let i = 0; i < polygon.length; i++) {
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    
    // Vectors from current vertex to neighbors
    const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
    const toNext = [next[0] - curr[0], next[1] - curr[1]];
    
    const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);
    const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
    
    if (lenPrev < 0.01 || lenNext < 0.01) {
      points.push(curr);
      continue;
    }
    
    // Normalize directions
    const dirPrev = [toPrev[0] / lenPrev, toPrev[1] / lenPrev];
    const dirNext = [toNext[0] / lenNext, toNext[1] / lenNext];
    
    // Angle between edges
    const dot = dirPrev[0] * dirNext[0] + dirPrev[1] * dirNext[1];
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    
    // Limit corner radius to not exceed half of either edge
    const maxR = Math.min(lenPrev / 2, lenNext / 2, cornerRadius);
    const r = maxR;
    
    if (r < 0.01 || angle < 0.01 || angle > Math.PI - 0.01) {
      points.push(curr);
      continue;
    }
    
    // Distance from vertex to arc tangent points
    const tanDist = r / Math.tan(angle / 2);
    
    // Tangent points
    const tp1: [number, number] = [curr[0] + dirPrev[0] * tanDist, curr[1] + dirPrev[1] * tanDist];
    const tp2: [number, number] = [curr[0] + dirNext[0] * tanDist, curr[1] + dirNext[1] * tanDist];
    
    // Arc center (offset inward from the corner)
    const bisector = [dirPrev[0] + dirNext[0], dirPrev[1] + dirNext[1]];
    const bisLen = Math.sqrt(bisector[0] ** 2 + bisector[1] ** 2);
    if (bisLen < 0.01) {
      points.push(curr);
      continue;
    }
    const bisDir = [bisector[0] / bisLen, bisector[1] / bisLen];
    const centerDist = r / Math.sin(angle / 2);
    const cx = curr[0] + bisDir[0] * centerDist;
    const cz = curr[1] + bisDir[1] * centerDist;
    
    // Calculate start and end angles for the arc
    const startAngle = Math.atan2(tp1[1] - cz, tp1[0] - cx);
    const endAngle = Math.atan2(tp2[1] - cz, tp2[0] - cx);
    
    // Determine arc direction (should go the short way around, following polygon winding)
    let angleDiff = endAngle - startAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Generate arc points
    for (let j = 0; j <= cornerSegs; j++) {
      const t = j / cornerSegs;
      const a = startAngle + t * angleDiff;
      points.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    
    cornerCenters.push({ cx, cz, startAngle, endAngle: startAngle + angleDiff });
  }
  
  return { points, cornerCenters };
};

// Create a fillet for custom polygon supports
// This traces the polygon edges and creates fillet strips along each edge
const createPolygonFilletGeometry = (polygon: [number, number][], cornerRadius: number = 0, filletRadius: number = FILLET_RADIUS, segments: number = FILLET_SEGMENTS): THREE.BufferGeometry => {
  if (polygon.length < 3) {
    return new THREE.BufferGeometry();
  }
  
  // The polygon coordinates are [x, z] in world space.
  // The support body mirrors Y for the shape then rotates, ending up with world (x, height, z).
  // That mirroring also reverses the winding order.
  // The fillet builds directly in world XZ space, so we need to reverse the polygon order
  // to match the winding of the support body (so outward normals point the same way).
  const workingPolygon: [number, number][] = [...polygon].reverse();
  
  const positions: number[] = [];
  const indices: number[] = [];
  
  // Determine polygon winding order (CW vs CCW) by computing signed area
  let signedArea = 0;
  for (let i = 0; i < workingPolygon.length; i++) {
    const [x1, z1] = workingPolygon[i];
    const [x2, z2] = workingPolygon[(i + 1) % workingPolygon.length];
    signedArea += (x2 - x1) * (z2 + z1);
  }
  // If signedArea > 0, polygon is CW; if < 0, polygon is CCW
  const isCW = signedArea > 0;
  
  // For each vertex, compute the outward normal direction
  const getEdgeNormal = (p1: [number, number], p2: [number, number]): [number, number] => {
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return [0, 0];
    // Perpendicular: (dz, -dx) or (-dz, dx) depending on winding
    if (isCW) {
      return [-dz / len, dx / len]; // outward for CW
    } else {
      return [dz / len, -dx / len]; // outward for CCW
    }
  };
  
  // Helper to add a fillet strip along an edge
  const addEdgeFillet = (x1: number, z1: number, x2: number, z2: number, nx: number, nz: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.01) return;
    
    const stripSegments = Math.max(2, Math.ceil(length / 5));
    const baseIdx = positions.length / 3;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI + t * (Math.PI / 2);
      const outDist = filletRadius + filletRadius * Math.cos(angle);
      const y = filletRadius * Math.sin(angle) + filletRadius;
      
      for (let j = 0; j <= stripSegments; j++) {
        const s = j / stripSegments;
        const px = x1 + s * dx + nx * outDist;
        const pz = z1 + s * dz + nz * outDist;
        
        positions.push(px, y, pz);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < stripSegments; j++) {
        const a = baseIdx + i * (stripSegments + 1) + j;
        const b = a + stripSegments + 1;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  };
  
  // Helper to add a corner fillet that follows a quadratic Bezier curve
  // The support body uses quadraticCurveTo(vertex, insetEnd), so the fillet must follow the same path
  const addCornerFillet = (
    vx: number, vz: number,  // vertex (control point of Bezier)
    insetStartX: number, insetStartZ: number,  // start of Bezier (from previous edge)
    insetEndX: number, insetEndZ: number,  // end of Bezier (to next edge)
    n1x: number, n1z: number,  // normal at start
    n2x: number, n2z: number,  // normal at end
    r: number  // corner radius (used to determine if corner is rounded)
  ) => {
    // If no corner radius, just add a simple corner fillet at the vertex
    if (r < 0.01) {
      // Sharp corner - compute angle sweep from n1 to n2
      const startAngle = Math.atan2(n1z, n1x);
      let endAngle = Math.atan2(n2z, n2x);
      let angleDiff = endAngle - startAngle;
      
      if (isCW) {
        if (angleDiff > 0) angleDiff -= 2 * Math.PI;
      } else {
        if (angleDiff < 0) angleDiff += 2 * Math.PI;
      }
      
      if (Math.abs(angleDiff) < 0.01 || Math.abs(angleDiff) > 2 * Math.PI - 0.01) return;
      
      const baseIdx = positions.length / 3;
      const cornerSegs = Math.max(4, Math.ceil(Math.abs(angleDiff) / (Math.PI / 8)));
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const filletAngle = Math.PI + t * (Math.PI / 2);
        const outDist = filletRadius + filletRadius * Math.cos(filletAngle);
        const y = filletRadius * Math.sin(filletAngle) + filletRadius;
        
        for (let j = 0; j <= cornerSegs; j++) {
          const theta = startAngle + (j / cornerSegs) * angleDiff;
          positions.push(vx + outDist * Math.cos(theta), y, vz + outDist * Math.sin(theta));
        }
      }
      
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < cornerSegs; j++) {
          const a = baseIdx + i * (cornerSegs + 1) + j;
          const b = a + cornerSegs + 1;
          const c = a + 1;
          const d = b + 1;
          indices.push(a, b, c);
          indices.push(c, b, d);
        }
      }
      return;
    }
    
    // Rounded corner - follow the quadratic Bezier path
    // Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    // P0 = insetStart, P1 = vertex (control), P2 = insetEnd
    const baseIdx = positions.length / 3;
    const cornerSegs = 8;  // segments along the Bezier
    
    for (let i = 0; i <= segments; i++) {
      const filletT = i / segments;
      const filletAngle = Math.PI + filletT * (Math.PI / 2);
      const outDist = filletRadius + filletRadius * Math.cos(filletAngle);
      const y = filletRadius * Math.sin(filletAngle) + filletRadius;
      
      for (let j = 0; j <= cornerSegs; j++) {
        const t = j / cornerSegs;
        const omt = 1 - t;
        
        // Bezier point
        const bx = omt * omt * insetStartX + 2 * omt * t * vx + t * t * insetEndX;
        const bz = omt * omt * insetStartZ + 2 * omt * t * vz + t * t * insetEndZ;
        
        // Bezier tangent (derivative)
        const tx = 2 * omt * (vx - insetStartX) + 2 * t * (insetEndX - vx);
        const tz = 2 * omt * (vz - insetStartZ) + 2 * t * (insetEndZ - vz);
        const tLen = Math.sqrt(tx * tx + tz * tz);
        
        // Outward normal (perpendicular to tangent)
        // The Bezier curves inward toward the vertex (control point), so the outward
        // normal for the fillet is on the opposite side of what the curve direction suggests
        // We need to flip the normal direction from what the winding would suggest
        let nx: number, nz: number;
        if (tLen > 0.001) {
          if (isCW) {
            // For CW winding, flip to get outward normal for the fillet
            nx = -tz / tLen;
            nz = tx / tLen;
          } else {
            // For CCW winding, flip to get outward normal for the fillet
            nx = tz / tLen;
            nz = -tx / tLen;
          }
        } else {
          // Fallback: interpolate between start and end normals
          nx = n1x * (1 - t) + n2x * t;
          nz = n1z * (1 - t) + n2z * t;
          const nLen = Math.sqrt(nx * nx + nz * nz);
          if (nLen > 0.001) { nx /= nLen; nz /= nLen; }
        }
        
        // Position = Bezier point + outward normal * outDist
        positions.push(bx + nx * outDist, y, bz + nz * outDist);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < cornerSegs; j++) {
        const a = baseIdx + i * (cornerSegs + 1) + j;
        const b = a + cornerSegs + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  };
  
  // Process each edge and corner using mirrored polygon
  const n = workingPolygon.length;
  const edgeNormals: [number, number][] = [];
  
  // Compute all edge normals first
  for (let i = 0; i < n; i++) {
    const p1 = workingPolygon[i];
    const p2 = workingPolygon[(i + 1) % n];
    edgeNormals.push(getEdgeNormal(p1, p2));
  }
  
  // Compute corner inset positions for rounded corners
  const cornerData: { vx: number, vz: number, cx: number, cz: number, insetStart: [number, number], insetEnd: [number, number], r: number }[] = [];
  
  for (let i = 0; i < n; i++) {
    const prev = workingPolygon[(i - 1 + n) % n];
    const curr = workingPolygon[i];
    const next = workingPolygon[(i + 1) % n];
    
    const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
    const toNext = [next[0] - curr[0], next[1] - curr[1]];
    const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);
    const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
    
    if (lenPrev < 0.01 || lenNext < 0.01) {
      cornerData.push({ vx: curr[0], vz: curr[1], cx: curr[0], cz: curr[1], insetStart: curr, insetEnd: curr, r: 0 });
      continue;
    }
    
    const dirPrev = [toPrev[0] / lenPrev, toPrev[1] / lenPrev];
    const dirNext = [toNext[0] / lenNext, toNext[1] / lenNext];
    
    // Always apply corner radius for simple convex shapes
    const r = Math.min(cornerRadius, lenPrev / 2, lenNext / 2);
    
    if (r > 0.01) {
      // Calculate inset points
      const insetStart: [number, number] = [curr[0] + dirPrev[0] * r, curr[1] + dirPrev[1] * r];
      const insetEnd: [number, number] = [curr[0] + dirNext[0] * r, curr[1] + dirNext[1] * r];
      
      // Calculate arc center - offset inward along the angle bisector
      // The bisector direction is the normalized sum of the two inward directions
      const bisectorX = dirPrev[0] + dirNext[0];
      const bisectorZ = dirPrev[1] + dirNext[1];
      const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorZ * bisectorZ);
      
      // Distance from vertex to arc center along bisector
      // For a 90-degree corner: distance = r / sin(45°) = r * sqrt(2)
      // General formula: distance = r / sin(angle/2)
      const halfAngle = Math.acos(Math.max(-1, Math.min(1, -(dirPrev[0] * dirNext[0] + dirPrev[1] * dirNext[1])))) / 2;
      const distToCenter = halfAngle > 0.01 ? r / Math.sin(halfAngle) : r;
      
      let cx = curr[0];
      let cz = curr[1];
      if (bisectorLen > 0.01) {
        cx = curr[0] + (bisectorX / bisectorLen) * distToCenter;
        cz = curr[1] + (bisectorZ / bisectorLen) * distToCenter;
      }
      
      cornerData.push({ vx: curr[0], vz: curr[1], cx, cz, insetStart, insetEnd, r });
    } else {
      cornerData.push({ vx: curr[0], vz: curr[1], cx: curr[0], cz: curr[1], insetStart: curr, insetEnd: curr, r: 0 });
    }
  }
  
  // Now add edge fillets (between inset points) and corner fillets
  for (let i = 0; i < n; i++) {
    const currCorner = cornerData[i];
    const nextCorner = cornerData[(i + 1) % n];
    const normal = edgeNormals[i];
    
    // Edge goes from currCorner.insetEnd to nextCorner.insetStart
    const edgeStart = currCorner.insetEnd;
    const edgeEnd = nextCorner.insetStart;
    
    addEdgeFillet(edgeStart[0], edgeStart[1], edgeEnd[0], edgeEnd[1], normal[0], normal[1]);
    
    // Add corner fillet at nextCorner
    // The corner fillet follows the quadratic Bezier from insetStart through vertex to insetEnd
    const prevNormal = edgeNormals[i];
    const nextNormal = edgeNormals[(i + 1) % n];
    
    addCornerFillet(
      nextCorner.vx, nextCorner.vz,  // vertex (Bezier control point)
      nextCorner.insetStart[0], nextCorner.insetStart[1],  // Bezier start (from incoming edge)
      nextCorner.insetEnd[0], nextCorner.insetEnd[1],  // Bezier end (to outgoing edge)
      prevNormal[0], prevNormal[1],  // normal at start
      nextNormal[0], nextNormal[1],  // normal at end
      nextCorner.r  // corner radius
    );
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
};

// Create a fillet for rectangular supports
const createRectangularFilletGeometry = (width: number, depthVal: number, cornerRadius: number = 0, filletRadius: number = FILLET_RADIUS, segments: number = FILLET_SEGMENTS): THREE.BufferGeometry => {
  const hw = width / 2;
  const hd = depthVal / 2;
  const r = Math.max(0, Math.min(cornerRadius, hw - 0.01, hd - 0.01));
  
  const positions: number[] = [];
  const indices: number[] = [];
  
  // Helper to add a fillet strip along a straight edge
  // The fillet curves from the baseplate (y=0) up to the wall (y=filletRadius)
  const addFilletStrip = (x1: number, z1: number, x2: number, z2: number, outwardX: number, outwardZ: number) => {
    const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    if (length < 0.01) return;
    const stripSegments = Math.max(2, Math.ceil(length / 5));
    
    const baseIdx = positions.length / 3;
    
    // i=0: at baseplate outer edge (outDist=filletRadius, y=0)
    // i=segments: at the wall (outDist=0, y=filletRadius)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI + t * (Math.PI / 2); // from 180 to 270 degrees
      const outDist = filletRadius + filletRadius * Math.cos(angle); // filletRadius to 0
      const y = filletRadius * Math.sin(angle) + filletRadius; // 0 to filletRadius
      
      for (let j = 0; j <= stripSegments; j++) {
        const s = j / stripSegments;
        const px = x1 + s * (x2 - x1) + outwardX * outDist;
        const pz = z1 + s * (z2 - z1) + outwardZ * outDist;
        
        positions.push(px, y, pz);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < stripSegments; j++) {
        const a = baseIdx + i * (stripSegments + 1) + j;
        const b = a + stripSegments + 1;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  };
  
  // Helper to add a quarter-torus corner fillet
  const addCornerFillet = (cx: number, cz: number, startAngle: number) => {
    const cornerR = Math.max(r, 0.01);
    const baseIdx = positions.length / 3;
    const cornerSegs = 8;
    
    // i=0: at baseplate outer edge (outDist=cornerR+filletRadius, y=0)
    // i=segments: at the corner wall (outDist=cornerR, y=filletRadius)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const filletAngle = Math.PI + t * (Math.PI / 2); // 180 to 270 degrees
      const outDist = cornerR + filletRadius + filletRadius * Math.cos(filletAngle); // cornerR+filletRadius to cornerR
      const y = filletRadius * Math.sin(filletAngle) + filletRadius; // 0 to filletRadius
      
      for (let j = 0; j <= cornerSegs; j++) {
        const theta = startAngle + (j / cornerSegs) * (Math.PI / 2);
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        positions.push(cx + outDist * cosT, y, cz + outDist * sinT);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < cornerSegs; j++) {
        const a = baseIdx + i * (cornerSegs + 1) + j;
        const b = a + cornerSegs + 1;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  };
  
  // Add the four edge fillets
  addFilletStrip(-hw + r, -hd, hw - r, -hd, 0, -1);
  addFilletStrip(hw - r, hd, -hw + r, hd, 0, 1);
  addFilletStrip(-hw, hd - r, -hw, -hd + r, -1, 0);
  addFilletStrip(hw, -hd + r, hw, hd - r, 1, 0);
  
  // Add the four corner fillets
  addCornerFillet(hw - r, -hd + r, -Math.PI / 2);
  addCornerFillet(hw - r, hd - r, 0);
  addCornerFillet(-hw + r, hd - r, Math.PI / 2);
  addCornerFillet(-hw + r, -hd + r, Math.PI);
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
};

/**
 * Create a bottom cap geometry for sealing supports during CSG operations.
 * The cap is a flat disc/shape at y=0 that matches the fillet's outer footprint.
 */
const createBottomCapGeometry = (
  type: string, 
  support: any, 
  filletRadius: number
): THREE.BufferGeometry | null => {
  if (type === 'cylindrical') {
    const { radius } = support;
    // Outer radius = support radius + fillet radius (where fillet touches baseplate)
    const outerRadius = radius + filletRadius;
    const cap = new THREE.CircleGeometry(outerRadius, 64);
    cap.rotateX(-Math.PI / 2); // Face downward (normal pointing -Y)
    return cap;
  } else if (type === 'rectangular') {
    const { width, depth, cornerRadius = 0 } = support;
    // Add fillet radius to dimensions
    const capWidth = width + filletRadius * 2;
    const capDepth = depth + filletRadius * 2;
    const capCornerRadius = cornerRadius + filletRadius;
    
    if (capCornerRadius <= 0.01) {
      const cap = new THREE.PlaneGeometry(capWidth, capDepth);
      cap.rotateX(-Math.PI / 2);
      return cap;
    } else {
      // Create rounded rectangle cap
      const hw = capWidth / 2;
      const hd = capDepth / 2;
      const r = Math.min(capCornerRadius, hw, hd);
      const shape = new THREE.Shape();
      shape.moveTo(-hw + r, -hd);
      shape.lineTo(hw - r, -hd);
      shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
      shape.lineTo(hw, hd - r);
      shape.quadraticCurveTo(hw, hd, hw - r, hd);
      shape.lineTo(-hw + r, hd);
      shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
      shape.lineTo(-hw, -hd + r);
      shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      const cap = new THREE.ShapeGeometry(shape, 32);
      cap.rotateX(-Math.PI / 2);
      return cap;
    }
  } else if (type === 'conical') {
    const { baseRadius } = support;
    // For conical, outer radius at base = baseRadius + filletRadius
    const outerRadius = baseRadius + filletRadius;
    const cap = new THREE.CircleGeometry(outerRadius, 64);
    cap.rotateX(-Math.PI / 2);
    return cap;
  } else if (type === 'custom') {
    const { polygon, cornerRadius = 0 } = support;
    if (!polygon || polygon.length < 3) return null;
    
    // Offset the polygon outward by fillet radius
    // For simplicity, we'll create a shape from the polygon with corner radius increased
    const workingPolygon: [number, number][] = polygon.map(([x, y]: [number, number]) => [x, -y]);
    const safeCornerRadius = Math.max(0, cornerRadius) + filletRadius;
    const shape = new THREE.Shape();
    let started = false;
    
    for (let idx = 0; idx < workingPolygon.length; idx++) {
      const curr = workingPolygon[idx];
      const prev = workingPolygon[(idx - 1 + workingPolygon.length) % workingPolygon.length];
      const next = workingPolygon[(idx + 1) % workingPolygon.length];
      
      // Offset the vertex outward
      const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
      const toNext = [next[0] - curr[0], next[1] - curr[1]];
      const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);
      const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
      
      // Calculate outward normal (perpendicular to edge bisector)
      let nx = 0, ny = 0;
      if (lenPrev > 0.01 && lenNext > 0.01) {
        const dirPrev = [toPrev[0] / lenPrev, toPrev[1] / lenPrev];
        const dirNext = [toNext[0] / lenNext, toNext[1] / lenNext];
        // Average direction and rotate 90 degrees for normal
        const avgX = -(dirPrev[0] + dirNext[0]) / 2;
        const avgY = -(dirPrev[1] + dirNext[1]) / 2;
        const avgLen = Math.sqrt(avgX * avgX + avgY * avgY);
        if (avgLen > 0.01) {
          nx = avgX / avgLen * filletRadius;
          ny = avgY / avgLen * filletRadius;
        }
      }
      
      const offsetX = curr[0] + nx;
      const offsetY = curr[1] + ny;
      
      if (!started) {
        shape.moveTo(offsetX, offsetY);
        started = true;
      } else {
        shape.lineTo(offsetX, offsetY);
      }
    }
    shape.closePath();
    
    const cap = new THREE.ShapeGeometry(shape, 32);
    cap.rotateX(-Math.PI / 2);
    return cap;
  }
  
  return null;
};

/**
 * Build a complete merged geometry for a support including fillet and bottom cap.
 * The geometry is positioned in world space ready for CSG operations.
 * The bottom cap ensures watertight geometry for proper CSG subtraction.
 * @param support The support configuration
 * @param baseTopY The Y position of the baseplate top
 * @returns A merged BufferGeometry in world space, or null if creation fails
 */
export function buildFullSupportGeometry(support: AnySupport, baseTopY: number = 0): THREE.BufferGeometry | null {
  const { type, height, center } = support as any;
  const rotY = (support as any).rotationY ?? 0;
  const effectiveBaseY = (support as any).baseY ?? baseTopY;
  
  // Clamp fillet radius to not exceed support height
  const effectiveFilletRadius = Math.min(FILLET_RADIUS, Math.max(0, height - 0.1));
  
  // Create rotation quaternion for geometry
  const rotationQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0));
  
  let geometry: THREE.BufferGeometry | null = null;
  
  if (type === 'cylindrical') {
    const { radius } = support as any;
    // Create complete solid support using LatheGeometry with closed profile
    geometry = createSolidCylindricalSupport(radius, height, effectiveFilletRadius, FILLET_SEGMENTS);
  } else if (type === 'conical') {
    const { baseRadius, topRadius } = support as any;
    // Create complete solid conical support using LatheGeometry
    geometry = createSolidConicalSupport(baseRadius, topRadius, height, effectiveFilletRadius, FILLET_SEGMENTS);
  } else if (type === 'rectangular') {
    // For rectangular, we still need to combine fillet + body + cap
    // because we can't use LatheGeometry for non-circular shapes
    const { width, depth, cornerRadius = 0 } = support as any;
    const bodyHeight = Math.max(0.1, height - effectiveFilletRadius);
    
    const filletGeo = createRectangularFilletGeometry(width, depth, cornerRadius, effectiveFilletRadius, FILLET_SEGMENTS);
    
    let bodyGeo: THREE.BufferGeometry;
    if (cornerRadius <= 0) {
      bodyGeo = new THREE.BoxGeometry(width, bodyHeight, depth);
      bodyGeo.translate(0, bodyHeight / 2 + effectiveFilletRadius, 0);
    } else {
      const hw = width / 2;
      const hd = depth / 2;
      const r = Math.min(cornerRadius, hw, hd);
      const s = new THREE.Shape();
      s.moveTo(-hw + r, -hd);
      s.lineTo(hw - r, -hd);
      s.quadraticCurveTo(hw, -hd, hw, -hd + r);
      s.lineTo(hw, hd - r);
      s.quadraticCurveTo(hw, hd, hw - r, hd);
      s.lineTo(-hw + r, hd);
      s.quadraticCurveTo(-hw, hd, -hw, hd - r);
      s.lineTo(-hw, -hd + r);
      s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      bodyGeo = new THREE.ExtrudeGeometry(s, { depth: bodyHeight, bevelEnabled: false, curveSegments: 64 });
      bodyGeo.rotateX(-Math.PI / 2);
      bodyGeo.translate(0, effectiveFilletRadius, 0);
    }
    
    // Add bottom cap
    const bottomCap = createBottomCapGeometry(type, support, effectiveFilletRadius);
    
    // Merge all parts
    const normalizeGeometry = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
      const normalized = geo.index ? geo.toNonIndexed() : geo.clone();
      if (normalized.getAttribute('uv')) normalized.deleteAttribute('uv');
      if (normalized.getAttribute('uv2')) normalized.deleteAttribute('uv2');
      return normalized;
    };
    
    const parts: THREE.BufferGeometry[] = [normalizeGeometry(filletGeo), normalizeGeometry(bodyGeo)];
    if (bottomCap) parts.push(normalizeGeometry(bottomCap));
    
    geometry = mergeGeometries(parts, false);
    if (geometry) geometry = mergeVertices(geometry, 0.001);
  } else if (type === 'custom') {
    const { polygon, cornerRadius = 0 } = support as any;
    if (!polygon || polygon.length < 3) return null;
    
    const bodyHeight = Math.max(0.1, height - effectiveFilletRadius);
    const filletGeo = createPolygonFilletGeometry(polygon, cornerRadius, effectiveFilletRadius, FILLET_SEGMENTS);
    
    // Build the custom shape for the body
    const workingPolygon: [number, number][] = polygon.map(([x, y]: [number, number]) => [x, -y]);
    const safeCornerRadius = Math.max(0, cornerRadius);
    const shape = new THREE.Shape();
    let started = false;
    
    for (let idx = 0; idx < workingPolygon.length; idx++) {
      const curr = workingPolygon[idx];
      const prev = workingPolygon[(idx - 1 + workingPolygon.length) % workingPolygon.length];
      const next = workingPolygon[(idx + 1) % workingPolygon.length];
      
      const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
      const toNext = [next[0] - curr[0], next[1] - curr[1]];
      const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);
      const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
      
      if (lenPrev < 0.01 || lenNext < 0.01 || safeCornerRadius < 0.01) {
        if (!started) { shape.moveTo(curr[0], curr[1]); started = true; }
        else { shape.lineTo(curr[0], curr[1]); }
        continue;
      }
      
      const r = Math.min(safeCornerRadius, lenPrev / 2, lenNext / 2);
      const dirPrev = [toPrev[0] / lenPrev, toPrev[1] / lenPrev];
      const dirNext = [toNext[0] / lenNext, toNext[1] / lenNext];
      
      if (r > 0.01) {
        const insetStart: [number, number] = [curr[0] + dirPrev[0] * r, curr[1] + dirPrev[1] * r];
        const insetEnd: [number, number] = [curr[0] + dirNext[0] * r, curr[1] + dirNext[1] * r];
        if (!started) { shape.moveTo(insetStart[0], insetStart[1]); started = true; }
        else { shape.lineTo(insetStart[0], insetStart[1]); }
        shape.quadraticCurveTo(curr[0], curr[1], insetEnd[0], insetEnd[1]);
      } else {
        if (!started) { shape.moveTo(curr[0], curr[1]); started = true; }
        else { shape.lineTo(curr[0], curr[1]); }
      }
    }
    shape.closePath();
    
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: bodyHeight, bevelEnabled: false, curveSegments: 64 });
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, effectiveFilletRadius, 0);
    
    // Add bottom cap
    const bottomCap = createBottomCapGeometry(type, support, effectiveFilletRadius);
    
    // Merge all parts
    const normalizeGeometry = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
      const normalized = geo.index ? geo.toNonIndexed() : geo.clone();
      if (normalized.getAttribute('uv')) normalized.deleteAttribute('uv');
      if (normalized.getAttribute('uv2')) normalized.deleteAttribute('uv2');
      return normalized;
    };
    
    const parts: THREE.BufferGeometry[] = [normalizeGeometry(filletGeo), normalizeGeometry(bodyGeo)];
    if (bottomCap) parts.push(normalizeGeometry(bottomCap));
    
    geometry = mergeGeometries(parts, false);
    if (geometry) geometry = mergeVertices(geometry, 0.001);
  }
  
  if (!geometry) return null;
  
  // Apply rotation and translation
  geometry.applyQuaternion(rotationQuat);
  geometry.translate(center.x, effectiveBaseY, center.y);
  geometry.computeVertexNormals();
  
  return geometry;
}

const SupportMesh: React.FC<SupportMeshProps> = ({ support, preview, baseTopY = 0, selected, onDoubleClick }) => {
  const { type, height, center } = support as any;
  const rotY = (support as any).rotationY ?? 0;
  const effectiveBaseY = (support as any).baseY ?? baseTopY;
  
  // Double-click detection
  const lastClickTimeRef = useRef<number>(0);
  
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD_MS) {
      // Double-click detected
      onDoubleClick?.(support.id);
      lastClickTimeRef.current = 0; // Reset to prevent triple-click
    } else {
      lastClickTimeRef.current = now;
    }
  }, [support.id, onDoubleClick]);
  
  // Clamp fillet radius to not exceed support height (leave at least 0.1mm for body)
  const effectiveFilletRadius = Math.min(FILLET_RADIUS, Math.max(0, height - 0.1));
  
  // The main body starts at fillet height and goes up
  const bodyHeight = Math.max(0.1, height - effectiveFilletRadius);
  const bodyCenter = effectiveBaseY + effectiveFilletRadius + bodyHeight / 2;

  const mat = React.useMemo(() => materialFor(preview, selected), [preview, selected]);

  if (type === 'cylindrical') {
    const { radius } = support as any;
    const geo = React.useMemo(() => new THREE.CylinderGeometry(radius, radius, bodyHeight, 64), [radius, bodyHeight]);
    const filletGeo = React.useMemo(() => createCylindricalFilletGeometry(radius, effectiveFilletRadius, FILLET_SEGMENTS), [radius, effectiveFilletRadius]);
    
    return (
      <group onClick={handleClick}>
        <mesh geometry={filletGeo} position={[center.x, effectiveBaseY, center.y]} material={mat} />
        <group position={[center.x, bodyCenter, center.y]}>
          <mesh geometry={geo} material={mat} />
        </group>
      </group>
    );
  }

  if (type === 'rectangular') {
    const { width, depth, cornerRadius = 0 } = support as any;
    const filletGeo = React.useMemo(() => createRectangularFilletGeometry(width, depth, cornerRadius, effectiveFilletRadius, FILLET_SEGMENTS), [width, depth, cornerRadius, effectiveFilletRadius]);
    
    if (cornerRadius <= 0) {
      const geo = React.useMemo(() => new THREE.BoxGeometry(width, bodyHeight, depth), [width, bodyHeight, depth]);
      return (
        <group onClick={handleClick}>
          <mesh geometry={filletGeo} position={[center.x, effectiveBaseY, center.y]} rotation={[0, rotY, 0]} material={mat} />
          <group position={[center.x, bodyCenter, center.y]} rotation={[0, rotY, 0]}>
            <mesh geometry={geo} material={mat} />
          </group>
        </group>
      );
    }
    
    const rrGeo = React.useMemo(() => {
      const hw = width / 2;
      const hd = depth / 2;
      const r = Math.min(cornerRadius, hw, hd);
      const s = new THREE.Shape();
      s.moveTo(-hw + r, -hd);
      s.lineTo(hw - r, -hd);
      s.quadraticCurveTo(hw, -hd, hw, -hd + r);
      s.lineTo(hw, hd - r);
      s.quadraticCurveTo(hw, hd, hw - r, hd);
      s.lineTo(-hw + r, hd);
      s.quadraticCurveTo(-hw, hd, -hw, hd - r);
      s.lineTo(-hw, -hd + r);
      s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      const e = new THREE.ExtrudeGeometry(s, { depth: bodyHeight, bevelEnabled: false, curveSegments: 64 });
      e.rotateX(-Math.PI / 2);
      // Extrude upward (positive Y direction)
      return e;
    }, [width, depth, cornerRadius, bodyHeight]);
    
    return (
      <group onClick={handleClick}>
        <mesh geometry={filletGeo} position={[center.x, effectiveBaseY, center.y]} rotation={[0, rotY, 0]} material={mat} />
        <group position={[center.x, effectiveBaseY + effectiveFilletRadius, center.y]} rotation={[0, rotY, 0]}>
          <mesh geometry={rrGeo} material={mat} />
        </group>
      </group>
    );
  }

  if (type === 'conical') {
    const { baseRadius, topRadius } = support as any;
    
    // For conical supports, calculate the fillet height based on the cone's slope
    const totalHeight = height;
    
    // Calculate slope angle based on estimated body height
    const estimatedBodyHeight = Math.max(0.1, totalHeight - effectiveFilletRadius);
    const radiusDiff = baseRadius - topRadius;
    const slopeAngle = Math.atan2(radiusDiff, estimatedBodyHeight);
    
    // The fillet top Y (relative to fillet position) = filletRadius * (1 - sin(slopeAngle))
    // At start angle (π + slopeAngle): y = filletRadius + filletRadius * sin(π + slopeAngle)
    //                                    = filletRadius - filletRadius * sin(slopeAngle)
    //                                    = filletRadius * (1 - sin(slopeAngle))
    const conicalFilletTopY = effectiveFilletRadius * (1 - Math.sin(slopeAngle));
    
    // The fillet top radius (where it meets the cone)
    // At start angle: r = (baseRadius + filletRadius) + filletRadius * cos(π + slopeAngle)
    //                   = baseRadius + filletRadius - filletRadius * cos(slopeAngle)
    //                   = baseRadius + filletRadius * (1 - cos(slopeAngle))
    const filletTopRadius = baseRadius + effectiveFilletRadius * (1 - Math.cos(slopeAngle));
    
    // The cone body starts where the fillet ends
    // Cone bottom is at y = effectiveBaseY + conicalFilletTopY with radius = filletTopRadius
    const conicalBodyHeight = Math.max(0.1, totalHeight - conicalFilletTopY);
    const conicalBodyCenter = effectiveBaseY + conicalFilletTopY + conicalBodyHeight / 2;
    
    // The cone geometry: bottom radius should match where the fillet ends
    const geo = React.useMemo(() => new THREE.CylinderGeometry(topRadius, filletTopRadius, conicalBodyHeight, 64), [topRadius, filletTopRadius, conicalBodyHeight]);
    const filletGeo = React.useMemo(() => createConicalFilletGeometry(baseRadius, topRadius, conicalBodyHeight, effectiveFilletRadius, FILLET_SEGMENTS), [baseRadius, topRadius, conicalBodyHeight, effectiveFilletRadius]);
    
    return (
      <group onClick={handleClick}>
        <mesh geometry={filletGeo} position={[center.x, effectiveBaseY, center.y]} material={mat} />
        <group position={[center.x, conicalBodyCenter, center.y]}>
          <mesh geometry={geo} material={mat} />
        </group>
      </group>
    );
  }

  if (type === 'custom') {
    const { polygon, cornerRadius = 0 } = support as any;
    
    // Memoize polygon string to avoid recalculating on every render
    const polygonKey = React.useMemo(() => JSON.stringify(polygon), [polygon]);
    
    // Validate polygon before creating geometry
    const validPolygon = React.useMemo(() => {
      if (!Array.isArray(polygon) || polygon.length < 3) return null;
      // Check for valid numeric coordinates
      for (const pt of polygon) {
        if (!Array.isArray(pt) || pt.length < 2 || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) {
          return null;
        }
      }
      return polygon as [number, number][];
    }, [polygonKey]);
    
    // Clamp corner radius to a safe value
    const safeCornerRadius = React.useMemo(() => {
      if (!validPolygon || cornerRadius <= 0) return 0;
      // Find minimum edge length to clamp corner radius
      let minEdgeLen = Infinity;
      for (let i = 0; i < validPolygon.length; i++) {
        const curr = validPolygon[i];
        const next = validPolygon[(i + 1) % validPolygon.length];
        const len = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
        if (len < minEdgeLen) minEdgeLen = len;
      }
      // Corner radius should be at most half the shortest edge
      return Math.max(0, Math.min(cornerRadius, minEdgeLen / 2 - 0.1));
    }, [validPolygon, cornerRadius]);
    
    const filletGeo = React.useMemo(() => {
      if (!validPolygon) return new THREE.BufferGeometry();
      return createPolygonFilletGeometry(validPolygon, safeCornerRadius, effectiveFilletRadius, FILLET_SEGMENTS);
    }, [validPolygon, safeCornerRadius, effectiveFilletRadius]);
    
    const geo = React.useMemo(() => {
      if (!validPolygon) return new THREE.BufferGeometry();
      
      const shape = new THREE.Shape();
      const n = validPolygon.length;
      
      // Mirror the Y coordinates to match the rotation direction
      const workingPolygon: [number, number][] = validPolygon.map(([x, y]: [number, number]) => [x, -y]);
      
      if (safeCornerRadius <= 0) {
        // No rounding - simple polygon
        shape.moveTo(workingPolygon[0][0], workingPolygon[0][1]);
        for (let i = 1; i < n; i++) {
          shape.lineTo(workingPolygon[i][0], workingPolygon[i][1]);
        }
        shape.closePath();
      } else {
        // Build rounded polygon using quadratic curves at all corners
        // For a simple convex polygon like a rectangle, all exterior corners should be rounded
        let started = false;
        
        for (let i = 0; i < n; i++) {
          const prev = workingPolygon[(i - 1 + n) % n];
          const curr = workingPolygon[i];
          const next = workingPolygon[(i + 1) % n];
          
          const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
          const toNext = [next[0] - curr[0], next[1] - curr[1]];
          const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);
          const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
          
          if (lenPrev < 0.01 || lenNext < 0.01) {
            if (!started) {
              shape.moveTo(curr[0], curr[1]);
              started = true;
            } else {
              shape.lineTo(curr[0], curr[1]);
            }
            continue;
          }
          
          // Apply safe corner radius
          const r = Math.min(safeCornerRadius, lenPrev / 2, lenNext / 2);
          
          const dirPrev = [toPrev[0] / lenPrev, toPrev[1] / lenPrev];
          const dirNext = [toNext[0] / lenNext, toNext[1] / lenNext];
          
          if (r > 0.01) {
            // Calculate inset points for the arc
            const insetStart: [number, number] = [curr[0] + dirPrev[0] * r, curr[1] + dirPrev[1] * r];
            const insetEnd: [number, number] = [curr[0] + dirNext[0] * r, curr[1] + dirNext[1] * r];
            
            if (!started) {
              shape.moveTo(insetStart[0], insetStart[1]);
              started = true;
            } else {
              shape.lineTo(insetStart[0], insetStart[1]);
            }
            // Use quadratic curve through the original corner point
            shape.quadraticCurveTo(curr[0], curr[1], insetEnd[0], insetEnd[1]);
          } else {
            if (!started) {
              shape.moveTo(curr[0], curr[1]);
              started = true;
            } else {
              shape.lineTo(curr[0], curr[1]);
            }
          }
        }
        shape.closePath();
      }
      
      const e = new THREE.ExtrudeGeometry(shape, { depth: bodyHeight, bevelEnabled: false, curveSegments: 64 });
      e.rotateX(-Math.PI / 2);
      // Extrude upward (positive Y direction)
      return e;
    }, [validPolygon, safeCornerRadius, bodyHeight]);
    
    return (
      <group onClick={handleClick}>
        <mesh geometry={filletGeo} position={[center.x, effectiveBaseY, center.y]} rotation={[0, rotY, 0]} material={mat} />
        <group position={[center.x, effectiveBaseY + effectiveFilletRadius, center.y]} rotation={[0, rotY, 0]}>
          <mesh geometry={geo} material={mat} />
        </group>
      </group>
    );
  }

  return null;
};

export default SupportMesh;
