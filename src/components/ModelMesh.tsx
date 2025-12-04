/**
 * ModelMesh Component
 * 
 * Renders a 3D model mesh with automatic normalization, positioning, and interaction support.
 * Handles unit scaling, geometry centering, and double-click events for transform activation.
 */

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProcessedFile } from '@/modules/FileImport/types';

// ============================================================================
// Types
// ============================================================================

export interface BoundsSummary {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  radius: number;
  unitsScale: number;
}

export interface ModelMeshProps {
  /** The processed file containing mesh and metadata */
  file: ProcessedFile;
  /** External ref to access the mesh instance */
  meshRef?: React.RefObject<THREE.Mesh>;
  /** Optional dimension overrides for scaling */
  dimensions?: { x?: number; y?: number; z?: number };
  /** Callback when bounds are computed/updated */
  onBoundsChange?: (bounds: BoundsSummary) => void;
}

// ============================================================================
// Constants
// ============================================================================

const UNIT_SCALES: Record<string, number> = {
  mm: 1,
  cm: 10,
  inch: 25.4,
};

const DOUBLE_CLICK_THRESHOLD_MS = 300;
const POSITION_TOLERANCE = 0.001;

const EVENTS = {
  meshDoubleClick: 'mesh-double-click',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Computes the dominant up direction quaternion for geometry auto-orientation
 */
function computeDominantUpQuaternion(geometry: THREE.BufferGeometry): THREE.Quaternion | null {
  const positionAttr = geometry.getAttribute('position');
  if (!positionAttr) return null;
  
  const positions = positionAttr.array as Float32Array;
  const triangleCount = positions.length / 9;
  
  // Accumulate weighted normal directions
  const normalSum = new THREE.Vector3(0, 0, 0);
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const normal = new THREE.Vector3();
  
  for (let i = 0; i < triangleCount; i++) {
    const base = i * 9;
    v0.fromArray(positions, base);
    v1.fromArray(positions, base + 3);
    v2.fromArray(positions, base + 6);
    
    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    normal.crossVectors(edge1, edge2);
    
    // Weight by triangle area (normal length = 2x area)
    normalSum.add(normal);
  }
  
  normalSum.normalize();
  
  // Determine if rotation is needed (if dominant normal is not close to Y-up)
  const yUp = new THREE.Vector3(0, 1, 0);
  const dot = normalSum.dot(yUp);
  
  if (Math.abs(dot) > 0.99) {
    return null; // Already aligned with Y-up
  }
  
  // Create quaternion to rotate dominant normal to Y-up
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(normalSum, yUp);
  
  return quaternion;
}

/**
 * Normalizes geometry: centers on XZ plane and places bottom at Y=0
 */
function normalizeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  
  if (!box) return;
  
  const center = box.getCenter(new THREE.Vector3());
  const bottomY = box.min.y;
  
  // Center on XZ, move bottom to Y=0
  geometry.translate(-center.x, -bottomY, -center.z);
  
  // Apply auto-orientation
  const quaternion = computeDominantUpQuaternion(geometry);
  if (quaternion) {
    geometry.applyQuaternion(quaternion);
    
    // Re-normalize after rotation
    geometry.computeBoundingBox();
    const newBox = geometry.boundingBox!;
    const newCenter = newBox.getCenter(new THREE.Vector3());
    const newBottomY = newBox.min.y;
    geometry.translate(-newCenter.x, -newBottomY, -newCenter.z);
  }
  
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  
  if (geometry.attributes.position) {
    geometry.attributes.position.needsUpdate = true;
  }
}

// ============================================================================
// Component
// ============================================================================

const ModelMesh: React.FC<ModelMeshProps> = ({
  file,
  meshRef,
  dimensions,
  onBoundsChange,
}) => {
  const internalRef = useRef<THREE.Mesh>(null);
  const actualRef = meshRef || internalRef;
  const isNormalizedRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  
  // Compute unit scale
  const unitScale = useMemo(() => {
    return UNIT_SCALES[file.metadata.units] || 1;
  }, [file.metadata.units]);
  
  // Normalize geometry on mount
  useEffect(() => {
    const mesh = actualRef.current;
    if (!mesh || isNormalizedRef.current) return;
    
    const geometry = mesh.geometry as THREE.BufferGeometry;
    
    // Normalize geometry (center and orient)
    normalizeGeometry(geometry);
    
    // Apply unit scale
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(unitScale);
    mesh.updateMatrixWorld(true);
    mesh.userData.normalized = true;
    isNormalizedRef.current = true;
    
    // Compute BVH if available
    if (typeof (geometry as any).computeBoundsTree === 'function') {
      (geometry as any).disposeBoundsTree?.();
      (geometry as any).computeBoundsTree();
    }
  }, [file, unitScale, actualRef]);
  
  // Apply dimension overrides
  useEffect(() => {
    const mesh = actualRef.current;
    if (!mesh || !dimensions) return;
    
    const { x, y, z } = dimensions;
    if (!x && !y && !z) return;
    
    const geometry = mesh.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const currentSize = box.getSize(new THREE.Vector3());
    
    mesh.scale.set(
      x ? (x / unitScale) / (currentSize.x || 1) : mesh.scale.x,
      y ? (y / unitScale) / (currentSize.y || 1) : mesh.scale.y,
      z ? (z / unitScale) / (currentSize.z || 1) : mesh.scale.z
    );
    mesh.updateMatrixWorld(true);
  }, [dimensions, unitScale, actualRef]);
  
  // Ensure model is centered and grounded after all transformations
  useEffect(() => {
    const mesh = actualRef.current;
    if (!mesh || !isNormalizedRef.current) return;
    
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const worldBox = new THREE.Box3().setFromObject(mesh);
    const worldCenter = worldBox.getCenter(new THREE.Vector3());
    const bottomY = worldBox.min.y;
    
    // Check if adjustment needed
    const needsAdjustment = 
      Math.abs(worldCenter.x) > POSITION_TOLERANCE ||
      Math.abs(worldCenter.z) > POSITION_TOLERANCE ||
      Math.abs(bottomY) > POSITION_TOLERANCE;
    
    if (needsAdjustment) {
      // Adjust geometry in local space
      const scale = mesh.scale;
      geometry.translate(
        -worldCenter.x / scale.x,
        -bottomY / scale.y,
        -worldCenter.z / scale.z
      );
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      mesh.updateMatrixWorld(true);
    }
    
    // Report final bounds
    const finalBox = new THREE.Box3().setFromObject(mesh);
    const sphere = finalBox.getBoundingSphere(new THREE.Sphere());
    
    onBoundsChange?.({
      min: finalBox.min.clone(),
      max: finalBox.max.clone(),
      center: finalBox.getCenter(new THREE.Vector3()),
      size: finalBox.getSize(new THREE.Vector3()),
      radius: sphere.radius,
      unitsScale: unitScale,
    });
  }, [file, dimensions, unitScale, onBoundsChange, actualRef]);
  
  // Double-click handler (manual detection for reliability)
  const handleClick = useCallback((event: THREE.Event) => {
    (event as any).stopPropagation?.();
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD_MS) {
      window.dispatchEvent(new CustomEvent(EVENTS.meshDoubleClick));
      lastClickTimeRef.current = 0; // Reset to prevent triple-click
    } else {
      lastClickTimeRef.current = now;
    }
  }, []);
  
  return (
    <mesh
      ref={actualRef}
      geometry={file.mesh.geometry}
      material={file.mesh.material}
      onClick={handleClick}
    />
  );
};

export default ModelMesh;
