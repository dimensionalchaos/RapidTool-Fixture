/**
 * Export Feature Module
 * 
 * Handles STL/geometry export functionality for fixture designs.
 * 
 * Features:
 * - CSG union of overlapping geometries (baseplate + supports)
 * - Proper manifold mesh generation
 * - Multi-section baseplate export
 * - Label geometry embedding
 * 
 * @example
 * ```typescript
 * import { useExport } from '@/features/export';
 * 
 * // In your component
 * useExport({
 *   mergedFixtureMesh,
 *   basePlate,
 *   // ... other params
 * });
 * ```
 */

// Types
export * from './types';

// Services
export { exportFixture } from './services/exportService';

// Utilities
export {
  createBaseplateGeometryFromConfig,
  collectBaseplateGeometry,
  collectSupportGeometries,
  buildClampSupportWithCutouts,
  prepareGeometryForCSG,
  buildLabelGeometries,
  collectAllGeometries,
} from './utils/geometryCollector';

// Hooks
export { useExport, default as useExportHook } from './hooks/useExport';
export type { UseExportParams } from './hooks/useExport';
