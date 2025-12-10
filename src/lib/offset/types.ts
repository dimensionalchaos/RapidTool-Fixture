// ============================================
// Offset Mesh Processor Types
// ============================================

import * as THREE from 'three';

export interface OffsetMeshOptions {
  /** Offset distance in world units */
  offsetDistance: number;
  /** Resolution (pixels per unit) */
  pixelsPerUnit: number;
  /** Tile size for large heightmaps (default: 2048) */
  tileSize?: number;
  /** Simplification ratio (0.1-1.0), null to disable */
  simplifyRatio?: number | null;
  /** Verify manifold and repair/fallback if needed */
  verifyManifold?: boolean;
  /** Rotation around Y axis in degrees (XZ plane) */
  rotationXZ?: number;
  /** Rotation around X axis in degrees (YZ plane, inverted: 180-input) */
  rotationYZ?: number;
  /** Fill holes in input mesh before heightmap generation */
  fillHoles?: boolean;
  /** Use Manifold 3D for final mesh optimization */
  useManifold?: boolean;
  /** Progress callback (current, total, stage) */
  progressCallback?: ((current: number, total: number, stage: string) => void) | null;
}

export interface OffsetMeshMetadata {
  offsetDistance: number;
  pixelsPerUnit: number;
  resolution: number;
  vertexCount: number;
  triangleCount: number;
  processingTime: number;
  simplificationApplied: boolean;
  simplificationTime: number;
  originalTriangleCount: number;
  geometryCreationTime: number;
  holesFilled: number;
  holesCapTriangles: number;
  manifoldProcessed: boolean;
  manifoldTime: number;
}

export interface HeightmapResult {
  heightMap: Float32Array;
  scale: number;
  center: THREE.Vector3;
  usesIndexedDB?: boolean;
  tileKeys?: string[];
  tileResolution?: number;
  tilesPerSide?: number;
}

export interface OffsetMeshResult {
  heightmapResult: HeightmapResult | null;
  geometry: THREE.BufferGeometry | null;
  metadata: OffsetMeshMetadata;
}

export interface CavitySettings {
  /** Enable cavity creation */
  enabled: boolean;
  /** Offset distance for the cavity (clearance from part) in mm */
  offsetDistance: number;
  /** Resolution - pixels per unit for heightmap generation */
  pixelsPerUnit: number;
  /** Simplification ratio (0.1-1.0), null for no simplification */
  simplifyRatio: number | null;
  /** Rotation around Y axis in degrees (XZ plane) - derived from part */
  rotationXZ: number;
  /** Rotation around X axis in degrees (YZ plane) - derived from part */
  rotationYZ: number;
  /** Fill holes in input mesh before heightmap generation */
  fillHoles: boolean;
  /** Verify mesh is watertight/manifold */
  verifyManifold: boolean;
  /** Use Manifold 3D for mesh optimization */
  useManifold: boolean;
  /** Show cavity preview mesh */
  showPreview: boolean;
  /** Preview mesh opacity (0-1) */
  previewOpacity: number;
}

export const DEFAULT_CAVITY_SETTINGS: CavitySettings = {
  enabled: true,
  offsetDistance: 0.5,
  pixelsPerUnit: 6,
  simplifyRatio: 0.8,
  rotationXZ: 0,
  rotationYZ: 0,
  fillHoles: true,
  verifyManifold: true,
  useManifold: true,
  showPreview: true,
  previewOpacity: 0.3,
};
