import * as THREE from 'three';

export interface LabelConfig {
  id: string;
  text: string;
  fontSize: number;      // mm, minimum 5mm
  depth: number;         // mm, emboss height (default 1mm)
  position: THREE.Vector3;  // world position
  rotation: THREE.Euler;    // rotation (primarily Y for orientation on surface)
  // Computed bounds from actual rendered geometry (set by LabelMesh)
  computedWidth?: number;   // actual text width in mm
  computedHeight?: number;  // actual text height in mm
}

export const DEFAULT_LABEL_CONFIG: Omit<LabelConfig, 'id' | 'position'> = {
  text: 'V1.0',
  fontSize: 8,          // 8mm default, 5mm minimum
  depth: 1,             // 1mm default emboss height
  rotation: new THREE.Euler(0, 0, 0),
};

// Font used for labels - Roboto is optimized for 3D printing
export const LABEL_FONT = 'Roboto';

export const MIN_FONT_SIZE = 5;  // mm
export const MAX_FONT_SIZE = 50; // mm
export const MIN_DEPTH = 0.3;    // mm
export const MAX_DEPTH = 5;      // mm
export const DEFAULT_DEPTH = 1;  // mm
