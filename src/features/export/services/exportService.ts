/**
 * Export Service
 * 
 * Handles the STL export process including CSG union and file generation.
 */

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  meshToSTL,
  downloadFile,
  generateExportFilename,
  performRealCSGUnionInWorker,
  type ExportConfig,
} from '@rapidtool/cad-core';
import type { 
  ExportGeometryCollection, 
  ExportProgressCallback,
  ExportResult,
  ExportServiceConfig,
  DEFAULT_EXPORT_CONFIG,
} from '../types';

/**
 * Performs CSG union on baseplate and supports
 */
async function performBaseplateSupportsUnion(
  baseplateAndSupports: THREE.BufferGeometry[],
  onProgress?: ExportProgressCallback
): Promise<THREE.BufferGeometry | null> {
  if (baseplateAndSupports.length === 0) {
    return null;
  }
  
  if (baseplateAndSupports.length === 1) {
    return baseplateAndSupports[0];
  }
  
  console.log(`[Export] Performing CSG union on baseplate + ${baseplateAndSupports.length - 1} supports...`);
  onProgress?.({ 
    stage: 'manifold', 
    progress: 10, 
    message: `CSG union: baseplate + ${baseplateAndSupports.length - 1} supports...` 
  });
  
  try {
    const geomsForWorker = baseplateAndSupports.map((geom, idx) => ({
      id: idx === 0 ? 'baseplate' : `support-${idx}`,
      geometry: geom
    }));
    
    const result = await performRealCSGUnionInWorker(
      geomsForWorker,
      undefined,
      (current, total, stage) => {
        const progress = 10 + ((current / total) * 25); // 10-35%
        onProgress?.({ 
          stage: 'manifold', 
          progress, 
          message: `CSG union: ${stage} (${current}/${total})` 
        });
      }
    );
    
    if (result) {
      console.log('[Export] Baseplate + supports CSG union succeeded - manifold geometry created');
      return result;
    }
  } catch (error) {
    console.error('[Export] Baseplate + supports CSG union failed:', error);
  }
  
  return null;
}

/**
 * Performs fast geometry merge with vertex welding
 */
function performFastMerge(
  geometries: THREE.BufferGeometry[],
  tolerance: number,
  onProgress?: ExportProgressCallback
): THREE.BufferGeometry | null {
  if (geometries.length === 0) {
    return null;
  }
  
  console.log('[Export] Merging final geometries...');
  onProgress?.({ stage: 'manifold', progress: 45, message: 'Merging final geometries...' });
  
  try {
    // Normalize all geometries before merging
    const normalizedGeometries = geometries.map(geom => {
      const nonIndexed = geom.index ? geom.toNonIndexed() : geom.clone();
      if (nonIndexed.getAttribute('uv')) {
        nonIndexed.deleteAttribute('uv');
      }
      if (nonIndexed.getAttribute('uv2')) {
        nonIndexed.deleteAttribute('uv2');
      }
      return nonIndexed;
    });
    
    onProgress?.({ 
      stage: 'manifold', 
      progress: 50, 
      message: `Merging ${normalizedGeometries.length} geometries...` 
    });
    
    const merged = mergeGeometries(normalizedGeometries, false);
    
    if (merged) {
      onProgress?.({ stage: 'manifold', progress: 60, message: 'Welding vertices...' });
      
      const welded = mergeVertices(merged, tolerance);
      welded.computeVertexNormals();
      
      console.log(`[Export] Final merge succeeded: ${welded.getAttribute('position').count} vertices`);
      
      // Cleanup temporary geometries
      normalizedGeometries.forEach(g => g.dispose());
      
      return welded;
    }
  } catch (error) {
    console.error('[Export] Final merge failed:', error);
  }
  
  return null;
}

/**
 * Performs full CSG union as fallback
 */
async function performFullCSGUnion(
  geometries: THREE.BufferGeometry[],
  onProgress?: ExportProgressCallback
): Promise<THREE.BufferGeometry | null> {
  console.log('[Export] Falling back to full CSG union...');
  onProgress?.({ stage: 'manifold', progress: 70, message: 'Trying full CSG union (fallback)...' });
  
  try {
    const geometriesForWorker = geometries.map((geom, idx) => ({
      id: `export-part-${idx}`,
      geometry: geom
    }));
    
    const result = await performRealCSGUnionInWorker(
      geometriesForWorker,
      undefined,
      (current, total, stage) => {
        const progress = 70 + ((current / total) * 20); // 70-90%
        onProgress?.({ 
          stage: 'manifold', 
          progress, 
          message: `CSG Union: ${stage} (${current}/${total})` 
        });
      }
    );
    
    if (result) {
      console.log('[Export] CSG union succeeded!');
      return result;
    }
  } catch (error) {
    console.error('[Export] CSG union failed:', error);
  }
  
  return null;
}

/**
 * Generates and downloads STL file(s)
 */
function generateSTLFiles(
  exportGeometry: THREE.BufferGeometry,
  config: ExportConfig,
  isMultiSection: boolean,
  sectionCount: number,
  onProgress?: ExportProgressCallback
): ExportResult {
  onProgress?.({ stage: 'exporting', progress: 95, message: 'Generating STL file...' });
  
  // Create a temporary mesh for STL export
  const exportMesh = new THREE.Mesh(
    exportGeometry, 
    new THREE.MeshStandardMaterial()
  );
  
  try {
    if (isMultiSection && config.splitParts && sectionCount > 1) {
      // Export parts individually for multi-section baseplate
      for (let i = 0; i < sectionCount; i++) {
        const filename = generateExportFilename({
          filename: config.filename,
          sectionNumber: i + 1,
        }, config.format);
        
        onProgress?.({ 
          stage: 'exporting', 
          progress: 85 + ((i / sectionCount) * 10), 
          message: `Exporting ${filename}...` 
        });
        
        const stlData = meshToSTL(exportMesh, config.options);
        downloadFile(stlData, filename, 'application/sla');
      }
      
      console.log(`[Export] Exported ${sectionCount} section files`);
      return { success: true, filesExported: sectionCount };
    } else {
      // Export as single file
      const filename = generateExportFilename({
        filename: config.filename,
      }, config.format);
      
      const stlData = meshToSTL(exportMesh, config.options);
      downloadFile(stlData, filename, 'application/sla');
      
      console.log(`[Export] Exported single file: ${filename}`);
      return { success: true, filename, filesExported: 1 };
    }
  } catch (error) {
    console.error('[Export] STL generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'STL generation failed' 
    };
  }
}

/**
 * Main export function
 */
export async function exportFixture(
  geometryCollection: ExportGeometryCollection,
  config: ExportConfig,
  fallbackGeometry: THREE.BufferGeometry | null,
  sectionCount: number = 1,
  serviceConfig: ExportServiceConfig = { performCSGUnion: true, vertexMergeTolerance: 0.001 },
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  try {
    // Collect all geometries for CSG union (baseplate + supports)
    const baseplateAndSupportsForCSG: THREE.BufferGeometry[] = [];
    
    // Add baseplate
    if (geometryCollection.baseplateGeometry) {
      baseplateAndSupportsForCSG.push(geometryCollection.baseplateGeometry);
    }
    
    // Add regular supports
    baseplateAndSupportsForCSG.push(...geometryCollection.supportGeometries);
    
    // Add clamp supports
    baseplateAndSupportsForCSG.push(...geometryCollection.clampSupportGeometries);
    
    // Final geometries to merge (after CSG union of baseplate+supports)
    const geometriesToMerge: THREE.BufferGeometry[] = [];
    
    // Perform CSG union on baseplate + supports
    if (serviceConfig.performCSGUnion && baseplateAndSupportsForCSG.length > 1) {
      const unionResult = await performBaseplateSupportsUnion(
        baseplateAndSupportsForCSG,
        onProgress
      );
      
      if (unionResult) {
        geometriesToMerge.push(unionResult);
      } else {
        console.warn('[Export] CSG union returned null, adding geometries individually');
        geometriesToMerge.push(...baseplateAndSupportsForCSG);
      }
    } else if (baseplateAndSupportsForCSG.length === 1) {
      geometriesToMerge.push(baseplateAndSupportsForCSG[0]);
    } else if (baseplateAndSupportsForCSG.length > 1) {
      geometriesToMerge.push(...baseplateAndSupportsForCSG);
    }
    
    // Add label geometries (these don't overlap, so just merge)
    geometriesToMerge.push(...geometryCollection.labelGeometries);
    
    console.log(`[Export] Total geometries to merge: ${geometriesToMerge.length}`);
    
    // If we have no geometries, use fallback
    if (geometriesToMerge.length === 0) {
      if (fallbackGeometry) {
        console.warn('[Export] No component geometries found, using fallback geometry');
        geometriesToMerge.push(fallbackGeometry);
      } else {
        return { success: false, error: 'No geometries available for export' };
      }
    }
    
    // Perform final merge
    let exportGeometry = performFastMerge(
      geometriesToMerge,
      serviceConfig.vertexMergeTolerance,
      onProgress
    );
    
    // Fallback to full CSG union if fast merge failed
    if (!exportGeometry) {
      exportGeometry = await performFullCSGUnion(geometriesToMerge, onProgress);
    }
    
    // Last resort: use fallback geometry
    if (!exportGeometry) {
      if (fallbackGeometry) {
        console.warn('[Export] All methods failed, using fallback geometry...');
        onProgress?.({ stage: 'manifold', progress: 90, message: 'Using cached geometry...' });
        exportGeometry = fallbackGeometry;
      } else {
        return { success: false, error: 'Failed to create export geometry' };
      }
    }
    
    // Generate STL file(s)
    const result = generateSTLFiles(
      exportGeometry,
      config,
      geometryCollection.isMultiSection,
      sectionCount,
      onProgress
    );
    
    // Cleanup created geometry (don't dispose fallback)
    if (exportGeometry !== fallbackGeometry) {
      exportGeometry.dispose();
    }
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Export complete!' });
    
    return result;
    
  } catch (error) {
    console.error('[Export] Failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Export failed' 
    };
  }
}
