/**
 * HoleTransformControls
 *
 * Transform controls for mounting holes using PivotControls from @react-three/drei.
 * Allows XZ plane translation only (no Y-axis movement or rotation).
 * Styled consistently with SupportTransformControls.
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlacedHole } from './types';

// =============================================================================
// Types
// =============================================================================

interface HoleTransformControlsProps {
  hole: PlacedHole;
  baseTopY: number;
  onTransformChange: (newPosition: THREE.Vector2) => void;
  onTransformEnd: (newPosition: THREE.Vector2) => void;
  onDragStart?: () => void;
  onDeselect: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Height offset above baseplate for gizmo positioning */
const GIZMO_Y_OFFSET = 5;

/** Minimum scale for gizmo visibility */
const MIN_GIZMO_SCALE = 30;

/** Gizmo scale multiplier based on hole diameter */
const GIZMO_SCALE_MULTIPLIER = 3;

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
function safeNum(value: number | undefined | null, defaultValue: number): number {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Dispatches a custom event to enable/disable orbit controls.
 */
function setOrbitControlsEnabled(enabled: boolean): void {
  window.dispatchEvent(
    new CustomEvent('disable-orbit-controls', { detail: { disabled: !enabled } })
  );
}

// =============================================================================
// Main Component
// =============================================================================

const HoleTransformControls: React.FC<HoleTransformControlsProps> = ({
  hole,
  baseTopY,
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

  // Extract and sanitize hole position
  const holeX = safeNum(hole.position?.x, 0);
  const holeZ = safeNum(hole.position?.y, 0); // position.y is Z in world coords
  const holeDiameter = safeNum(hole.diameter, 6);
  const gizmoY = baseTopY + GIZMO_Y_OFFSET;

  // Always use current hole position for gizmo
  const displayPos = useMemo(() => {
    return new THREE.Vector3(holeX, gizmoY, holeZ);
  }, [holeX, holeZ, gizmoY]);

  // Calculate gizmo scale based on hole size
  const gizmoScale = useMemo(
    () => Math.max(holeDiameter * GIZMO_SCALE_MULTIPLIER, MIN_GIZMO_SCALE),
    [holeDiameter]
  );

  /**
   * Reads world transform from the anchor mesh inside PivotControls.
   */
  const getTransformFromAnchor = useCallback((): THREE.Vector2 | null => {
    if (!anchorRef.current) return null;

    anchorRef.current.updateMatrixWorld(true);
    anchorRef.current.getWorldPosition(tempPosition);

    // Convert world position to hole position (x = worldX, y = worldZ)
    return new THREE.Vector2(tempPosition.x, tempPosition.z);
  }, []);

  /**
   * Handles drag movement - reads transform from anchor mesh.
   */
  const handleDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    const newPosition = getTransformFromAnchor();
    if (newPosition) {
      onTransformChange(newPosition);
    }
  }, [getTransformFromAnchor, onTransformChange]);

  /**
   * Handles drag start.
   */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setOrbitControlsEnabled(false);
    gl.domElement.style.cursor = 'grabbing';
    onDragStartProp?.();
  }, [gl, onDragStartProp]);

  /**
   * Handles drag end - emits final transform and resets pivot.
   */
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setOrbitControlsEnabled(true);
    gl.domElement.style.cursor = 'auto';

    const newPosition = getTransformFromAnchor();
    if (newPosition) {
      onTransformEnd(newPosition);
    }

    // Reset pivot to identity after drag ends
    if (pivotRef.current) {
      pivotRef.current.matrix.identity();
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.rotation.set(0, 0, 0);
      pivotRef.current.scale.set(1, 1, 1);
      pivotRef.current.updateMatrix();
    }
  }, [gl, getTransformFromAnchor, onTransformEnd]);

  // =============================================================================
  // Event Handlers for Deselection
  // =============================================================================

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

      {/* Visual indicator - hole preview ring at baseplate surface level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -GIZMO_Y_OFFSET, 0]}>
        <ringGeometry args={[holeDiameter / 2, holeDiameter / 2 + 0.15, 32]} />
        <meshBasicMaterial color={0x00ff88} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default HoleTransformControls;
