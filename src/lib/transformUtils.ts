/**
 * Transform Utilities
 *
 * Shared utilities for position/rotation transformations between
 * UI (CAD convention) and Three.js coordinate systems.
 */

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Transform3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TRANSFORM: Transform3D = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Converts radians to degrees */
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Converts degrees to radians */
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Maps CAD axis to Three.js axis
 * CAD Convention: X = horizontal, Y = depth, Z = vertical
 * Three.js: X = horizontal, Y = vertical, Z = depth
 */
export const cadToThreeAxis = (cadAxis: 'x' | 'y' | 'z'): 'x' | 'y' | 'z' => {
  switch (cadAxis) {
    case 'y':
      return 'z';
    case 'z':
      return 'y';
    default:
      return 'x';
  }
};

/**
 * Converts Three.js position to CAD-style position for display
 * Swaps Y and Z axes
 */
export const toCadPosition = (position: { x: number; y: number; z: number }) => ({
  x: position.x,
  y: position.z, // CAD Y = Three.js Z
  z: position.y, // CAD Z = Three.js Y
});

/**
 * Converts Three.js rotation to CAD-style rotation for display
 * Swaps Y and Z axes
 */
export const toCadRotation = (rotation: { x: number; y: number; z: number }) => ({
  x: rotation.x,
  y: rotation.z, // CAD Y = Three.js Z
  z: rotation.y, // CAD Z = Three.js Y
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Dispatches transform change event to 3D scene */
export const dispatchTransformChange = (
  partId: string,
  transform: Transform3D
): void => {
  window.dispatchEvent(
    new CustomEvent('set-model-transform', {
      detail: {
        partId,
        position: new THREE.Vector3(
          transform.position.x,
          transform.position.y,
          transform.position.z
        ),
        rotation: new THREE.Euler(
          degToRad(transform.rotation.x),
          degToRad(transform.rotation.y),
          degToRad(transform.rotation.z)
        ),
        respectBaseplate: true,
      },
    })
  );
};

/** Requests transform data from 3D scene for a part */
export const requestPartTransform = (partId: string): void => {
  window.dispatchEvent(
    new CustomEvent('request-model-transform', {
      detail: { partId },
    })
  );
};

/** Dispatches event to set part on baseplate */
export const dispatchSetToBaseplate = (partId: string): void => {
  window.dispatchEvent(
    new CustomEvent('set-part-to-baseplate', {
      detail: { partId },
    })
  );
};
