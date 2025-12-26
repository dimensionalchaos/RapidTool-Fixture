/**
 * BasePlateTransformControls
 *
 * Transform controls for multi-section baseplate sections using PivotControls from @react-three/drei.
 * Allows XZ plane translation only (no Y-axis movement or rotation).
 * Styled consistently with HoleTransformControls and SupportTransformControls.
 * 
 * Uses the same pattern as HoleTransformControls:
 * - Place a reference object inside PivotControls
 * - Let autoTransform handle visual movement
 * - Read world transform from the reference object
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BasePlateSection } from './types';

// =============================================================================
// Types
// =============================================================================

interface BasePlateTransformControlsProps {
  section: BasePlateSection;
  onTransformChange: (newBounds: { minX: number; maxX: number; minZ: number; maxZ: number }) => void;
  onTransformEnd: (newBounds: { minX: number; maxX: number; minZ: number; maxZ: number }) => void;
  onDragStart?: () => void;
  onDeselect: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Height offset above ground for gizmo positioning */
const GIZMO_Y_OFFSET = 5;

/** Minimum scale for gizmo visibility */
const MIN_GIZMO_SCALE = 30;

/** Gizmo scale multiplier based on section size */
const GIZMO_SCALE_MULTIPLIER = 0.8;

// =============================================================================
// Reusable Objects (avoid per-frame allocations)
// =============================================================================

const tempPosition = new THREE.Vector3();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely parses a number with a fallback default.
 */
const safeNum = (value: number | undefined | null, defaultValue: number): number => {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
};

/**
 * Dispatches a custom event to enable/disable orbit controls.
 */
const setOrbitControlsEnabled = (enabled: boolean): void => {
  window.dispatchEvent(
    new CustomEvent('disable-orbit-controls', { detail: { disabled: !enabled } })
  );
};

/**
 * Calculates section bounds from world position and dimensions.
 */
const calculateSectionBounds = (
  worldPosition: THREE.Vector3,
  width: number,
  depth: number
): { minX: number; maxX: number; minZ: number; maxZ: number } => {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return {
    minX: worldPosition.x - halfWidth,
    maxX: worldPosition.x + halfWidth,
    minZ: worldPosition.z - halfDepth,
    maxZ: worldPosition.z + halfDepth,
  };
};

/**
 * Resets a Three.js group's transform to identity.
 */
const resetGroupTransform = (group: THREE.Group): void => {
  group.matrix.identity();
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.scale.set(1, 1, 1);
  group.updateMatrix();
};

// =============================================================================
// Main Component
// =============================================================================

const BasePlateTransformControls: React.FC<BasePlateTransformControlsProps> = ({
  section,
  onTransformChange,
  onTransformEnd,
  onDragStart: onDragStartProp,
  onDeselect,
}) => {
  const { gl } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Mesh>(null);
  const isDraggingRef = useRef(false);
  const dragStartGroupPos = useRef<THREE.Vector3 | null>(null);

  // Calculate section dimensions (memoized)
  const sectionDimensions = useMemo(() => {
    const centerX = (section.minX + section.maxX) / 2;
    const centerZ = (section.minZ + section.maxZ) / 2;
    const width = section.maxX - section.minX;
    const depth = section.maxZ - section.minZ;
    const size = Math.max(width, depth);
    
    return { centerX, centerZ, width, depth, size };
  }, [section]);

  const gizmoY = GIZMO_Y_OFFSET;

  // Use locked position during drag to prevent feedback loop
  const displayPos = useMemo(() => {
    if (isDraggingRef.current && dragStartGroupPos.current) {
      return dragStartGroupPos.current;
    }
    return new THREE.Vector3(sectionDimensions.centerX, gizmoY, sectionDimensions.centerZ);
  }, [sectionDimensions.centerX, sectionDimensions.centerZ, gizmoY]);

  // Calculate gizmo scale based on section size
  const gizmoScale = useMemo(
    () => Math.max(MIN_GIZMO_SCALE, sectionDimensions.size * GIZMO_SCALE_MULTIPLIER),
    [sectionDimensions.size]
  );

  /**
   * Reads world transform from the anchor mesh inside PivotControls.
   */
  const getTransformFromAnchor = useCallback((): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null => {
    if (!anchorRef.current) return null;

    anchorRef.current.updateMatrixWorld(true);
    anchorRef.current.getWorldPosition(tempPosition);

    return calculateSectionBounds(tempPosition, sectionDimensions.width, sectionDimensions.depth);
  }, [sectionDimensions.width, sectionDimensions.depth]);

  /**
   * Handles drag movement - reads transform from anchor mesh.
   */
  const handleDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    const newBounds = getTransformFromAnchor();
    if (newBounds) {
      onTransformChange(newBounds);
    }
  }, [getTransformFromAnchor, onTransformChange]);

  /**
   * Handles drag start - locks group position to prevent feedback loop.
   */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartGroupPos.current = new THREE.Vector3(
      sectionDimensions.centerX,
      gizmoY,
      sectionDimensions.centerZ
    );
    setOrbitControlsEnabled(false);
    gl.domElement.style.cursor = 'grabbing';
    onDragStartProp?.();
  }, [gl, sectionDimensions.centerX, sectionDimensions.centerZ, gizmoY, onDragStartProp]);

  /**
   * Handles drag end - emits final transform and resets pivot.
   */
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragStartGroupPos.current = null;
    setOrbitControlsEnabled(true);
    gl.domElement.style.cursor = 'auto';

    const newBounds = getTransformFromAnchor();
    if (newBounds) {
      onTransformEnd(newBounds);
    }

    // Reset pivot to identity after drag ends
    if (pivotRef.current) {
      resetGroupTransform(pivotRef.current);
    }
  }, [gl, getTransformFromAnchor, onTransformEnd]);

  // =============================================================================
  // Event Handlers for Deselection
  // =============================================================================

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setOrbitControlsEnabled(true);
    };
  }, []);

  // Click outside canvas to deselect
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Allow clicks on canvas (for camera controls) - don't deselect
      if (gl.domElement.contains(target) || gl.domElement === target) return;

      // Any click outside canvas (UI elements, sidebar, panels) should deselect
      onDeselect();
    };

    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => document.removeEventListener('mousedown', handleDocumentClick, true);
  }, [onDeselect, gl.domElement]);

  // Escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDeselect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeselect]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <group position={displayPos}>
      <PivotControls
        ref={pivotRef}
        scale={gizmoScale}
        lineWidth={3}
        depthTest={false}
        autoTransform
        disableRotations
        disableScaling
        disableSliders
        activeAxes={[true, false, true]} // Only X and Z axes (XZ plane)
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        visible
        anchor={[0, 0, 0]}
        annotations={false}
      >
        {/* Invisible anchor mesh that moves with the pivot */}
        <mesh ref={anchorRef} visible={false}>
          <sphereGeometry args={[0.1]} />
        </mesh>

        {/* Close button at gizmo center */}
        <Html center style={{ pointerEvents: 'auto', userSelect: 'none' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeselect();
            }}
            className="w-6 h-6 flex items-center justify-center bg-slate-800/90 hover:bg-red-600 text-white rounded-full shadow-lg border border-slate-600 transition-colors text-xs"
            title="Close (Esc)"
          >
            ✕
          </button>
        </Html>
      </PivotControls>
    </group>
  );
};

export default BasePlateTransformControls;
