/**
 * Export Feature Types
 * 
 * Type definitions for the STL/geometry export functionality.
 */

import * as THREE from 'three';
import type { BasePlateConfig } from '@/features/baseplate';
import type { LabelConfig } from '@/features/labels';
import type { PlacedClamp } from '@/features/clamps';

/**
 * Export progress stages
 */
export type ExportStage = 
  | 'preparing'
  | 'manifold'
  | 'exporting'
  | 'complete'
  | 'error';

/**
 * Progress callback for export operations
 */
export interface ExportProgress {
  stage: ExportStage;
  progress: number;
  message: string;
}

/**
 * Progress callback function type
 */
export type ExportProgressCallback = (progress: ExportProgress) => void;

/**
 * Clamp data required for export
 */
export interface ClampExportData {
  id: string;
  supportInfo: {
    polygon: THREE.Vector2[];
    mountSurfaceLocalY: number;
    fixturePointY: number;
  } | null;
  fixtureCutoutsGeometry: THREE.BufferGeometry | null;
  fixturePointTopCenter: THREE.Vector3 | null;
}

/**
 * Collection of geometries for export
 */
export interface ExportGeometryCollection {
  /** Baseplate geometry (with holes if applicable) */
  baseplateGeometry: THREE.BufferGeometry | null;
  /** Support geometries (modified after cavity cut) */
  supportGeometries: THREE.BufferGeometry[];
  /** Clamp support geometries */
  clampSupportGeometries: THREE.BufferGeometry[];
  /** Label geometries */
  labelGeometries: THREE.BufferGeometry[];
  /** Whether baseplate is multi-section */
  isMultiSection: boolean;
}

/**
 * Context required for geometry collection
 */
export interface GeometryCollectionContext {
  /** Current baseplate configuration */
  basePlate: BasePlateConfig | null;
  /** Baseplate with holes geometry (if holes exist) */
  baseplateWithHoles: THREE.BufferGeometry | null;
  /** Reference to baseplate mesh */
  basePlateMeshRef: React.RefObject<THREE.Mesh | null>;
  /** Reference to multi-section baseplate group */
  multiSectionBasePlateGroupRef: React.RefObject<THREE.Group | null>;
  /** Cached original baseplate geometry */
  originalBaseplateGeoRef: React.MutableRefObject<THREE.BufferGeometry | null>;
  /** Modified support geometries map */
  modifiedSupportGeometries: Map<string, THREE.BufferGeometry>;
  /** Placed clamps array */
  placedClamps: PlacedClamp[];
  /** Clamp support info map */
  clampSupportInfos: Map<string, { height: number }>;
  /** Loaded clamp data map */
  loadedClampDataRef: React.MutableRefObject<Map<string, ClampExportData>>;
  /** Current labels */
  labels: LabelConfig[];
  /** Top Y position of baseplate */
  baseTopY: number;
}

/**
 * Result of the export operation
 */
export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
  filesExported?: number;
}

/**
 * Export service configuration
 */
export interface ExportServiceConfig {
  /** Whether to perform CSG union on overlapping geometries */
  performCSGUnion: boolean;
  /** Vertex merge tolerance for welding */
  vertexMergeTolerance: number;
}

/**
 * Default export service configuration
 */
export const DEFAULT_EXPORT_CONFIG: ExportServiceConfig = {
  performCSGUnion: true,
  vertexMergeTolerance: 0.001,
};
