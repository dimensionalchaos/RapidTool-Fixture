/**
 * Export Hook
 * 
 * React hook for managing fixture export operations.
 */

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ExportConfig } from '@rapidtool/cad-core';
import type { BasePlateConfig } from '@/features/baseplate';
import type { LabelConfig } from '@/features/labels';
import type { PlacedClamp } from '@/features/clamps';
import { collectAllGeometries } from '../utils/geometryCollector';
import { exportFixture } from '../services/exportService';
import type { 
  GeometryCollectionContext, 
  ExportProgress,
  ClampExportData,
} from '../types';

export interface UseExportParams {
  /** Merged fixture mesh (used as fallback) */
  mergedFixtureMesh: THREE.Mesh | null;
  /** Current baseplate configuration */
  basePlate: BasePlateConfig | null;
  /** Baseplate with holes geometry */
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
  /** Loaded clamp data ref */
  loadedClampDataRef: React.MutableRefObject<Map<string, ClampExportData>>;
  /** Labels ref */
  labelsRef: React.MutableRefObject<LabelConfig[]>;
  /** Top Y position of baseplate */
  baseTopY: number;
}

/**
 * Hook for handling fixture export functionality
 */
export function useExport({
  mergedFixtureMesh,
  basePlate,
  baseplateWithHoles,
  basePlateMeshRef,
  multiSectionBasePlateGroupRef,
  originalBaseplateGeoRef,
  modifiedSupportGeometries,
  placedClamps,
  clampSupportInfos,
  loadedClampDataRef,
  labelsRef,
  baseTopY,
}: UseExportParams) {
  // Store the latest values in refs for the event handler
  const paramsRef = useRef({
    mergedFixtureMesh,
    basePlate,
    baseplateWithHoles,
    modifiedSupportGeometries,
    placedClamps,
    clampSupportInfos,
    baseTopY,
  });
  
  // Update refs when values change
  useEffect(() => {
    paramsRef.current = {
      mergedFixtureMesh,
      basePlate,
      baseplateWithHoles,
      modifiedSupportGeometries,
      placedClamps,
      clampSupportInfos,
      baseTopY,
    };
  }, [mergedFixtureMesh, basePlate, baseplateWithHoles, modifiedSupportGeometries, placedClamps, clampSupportInfos, baseTopY]);

  /**
   * Handle export fixture event
   */
  const handleExportFixture = useCallback(async (e: CustomEvent) => {
    const { config } = e.detail as { config: ExportConfig };
    const params = paramsRef.current;
    
    if (!params.mergedFixtureMesh) {
      console.error('[Export] No merged fixture mesh available');
      window.dispatchEvent(new CustomEvent('export-complete', { 
        detail: { success: false, error: 'No merged fixture available' } 
      }));
      return;
    }

    try {
      // Progress callback
      const onProgress = (progress: ExportProgress) => {
        window.dispatchEvent(new CustomEvent('export-progress', { 
          detail: progress 
        }));
      };
      
      // Create geometry collection context
      const ctx: GeometryCollectionContext = {
        basePlate: params.basePlate,
        baseplateWithHoles: params.baseplateWithHoles,
        basePlateMeshRef,
        multiSectionBasePlateGroupRef,
        originalBaseplateGeoRef,
        modifiedSupportGeometries: params.modifiedSupportGeometries,
        placedClamps: params.placedClamps,
        clampSupportInfos: params.clampSupportInfos,
        loadedClampDataRef,
        labels: labelsRef.current || [],
        baseTopY: params.baseTopY,
      };
      
      // Collect all geometries
      const geometryCollection = await collectAllGeometries(ctx, onProgress);
      
      // Export fixture
      const result = await exportFixture(
        geometryCollection,
        config,
        params.mergedFixtureMesh.geometry,
        params.basePlate?.sections?.length || 1,
        { performCSGUnion: true, vertexMergeTolerance: 0.001 },
        onProgress
      );
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('export-complete', { 
        detail: result 
      }));
      
    } catch (error) {
      console.error('[Export] Failed:', error);
      window.dispatchEvent(new CustomEvent('export-complete', { 
        detail: { success: false, error: error instanceof Error ? error.message : 'Export failed' } 
      }));
    }
  }, [basePlateMeshRef, multiSectionBasePlateGroupRef, originalBaseplateGeoRef, loadedClampDataRef, labelsRef]);

  // Register event listener
  useEffect(() => {
    window.addEventListener('export-fixture', handleExportFixture as EventListener);
    return () => window.removeEventListener('export-fixture', handleExportFixture as EventListener);
  }, [handleExportFixture]);

  return {
    handleExportFixture,
  };
}

export default useExport;
