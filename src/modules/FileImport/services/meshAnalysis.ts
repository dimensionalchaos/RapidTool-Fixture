import * as THREE from 'three';
import { simplifyGeometry } from '@/lib/fastQuadricSimplify';

// Note: Using Fast Quadric Mesh Simplification (WASM) for decimation

export interface MeshAnalysisResult {
  isManifold: boolean;
  triangleCount: number;
  vertexCount: number;
  hasNonManifoldEdges: boolean;
  hasDegenerateFaces: boolean;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    size: THREE.Vector3;
  };
  issues: string[];
}

export interface MeshRepairResult {
  success: boolean;
  repairedGeometry: THREE.BufferGeometry | null;
  triangleCount: number;
  repairActions: string[];
  error?: string;
}

export interface DecimationResult {
  success: boolean;
  decimatedGeometry: THREE.BufferGeometry | null;
  originalTriangles: number;
  finalTriangles: number;
  reductionPercent: number;
  error?: string;
}

export interface MeshProcessingProgress {
  stage: 'analyzing' | 'repairing' | 'decimating' | 'complete';
  progress: number; // 0-100
  message: string;
}

// Threshold for when decimation should be suggested (triangles)
export const DECIMATION_THRESHOLD = 500000;
// Target triangle count after decimation
export const DECIMATION_TARGET = 500000;

/**
 * Analyze a mesh for potential issues
 */
export async function analyzeMesh(
  geometry: THREE.BufferGeometry,
  onProgress?: (progress: MeshProcessingProgress) => void
): Promise<MeshAnalysisResult> {
  onProgress?.({ stage: 'analyzing', progress: 0, message: 'Starting mesh analysis...' });
  
  const positionAttr = geometry.getAttribute('position');
  const triangleCount = positionAttr.count / 3;
  const vertexCount = positionAttr.count;
  
  onProgress?.({ stage: 'analyzing', progress: 20, message: 'Checking geometry bounds...' });
  
  // Compute bounding box
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  
  onProgress?.({ stage: 'analyzing', progress: 40, message: 'Checking for degenerate faces...' });
  
  const issues: string[] = [];
  let hasDegenerateFaces = false;
  let hasNonManifoldEdges = false;
  
  // Check for degenerate triangles (zero area)
  const positions = positionAttr.array as Float32Array;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();
  
  let degenerateCount = 0;
  for (let i = 0; i < triangleCount; i++) {
    const baseIdx = i * 9;
    v0.set(positions[baseIdx], positions[baseIdx + 1], positions[baseIdx + 2]);
    v1.set(positions[baseIdx + 3], positions[baseIdx + 4], positions[baseIdx + 5]);
    v2.set(positions[baseIdx + 6], positions[baseIdx + 7], positions[baseIdx + 8]);
    
    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    cross.crossVectors(edge1, edge2);
    
    if (cross.lengthSq() < 1e-12) {
      degenerateCount++;
      hasDegenerateFaces = true;
    }
  }
  
  if (degenerateCount > 0) {
    issues.push(`Found ${degenerateCount} degenerate (zero-area) triangles`);
  }
  
  onProgress?.({ stage: 'analyzing', progress: 60, message: 'Checking edge topology...' });
  
  // Build edge map to check for non-manifold edges
  const edgeMap = new Map<string, number>();
  
  const makeEdgeKey = (i1: number, i2: number): string => {
    const idx1 = Math.floor(i1 / 3);
    const idx2 = Math.floor(i2 / 3);
    const min = Math.min(idx1, idx2);
    const max = Math.max(idx1, idx2);
    return `${min}-${max}`;
  };
  
  for (let i = 0; i < triangleCount; i++) {
    const baseIdx = i * 3;
    
    // Three edges per triangle
    const edges = [
      makeEdgeKey(baseIdx * 3, baseIdx * 3 + 3),
      makeEdgeKey(baseIdx * 3 + 3, baseIdx * 3 + 6),
      makeEdgeKey(baseIdx * 3 + 6, baseIdx * 3),
    ];
    
    for (const edge of edges) {
      edgeMap.set(edge, (edgeMap.get(edge) || 0) + 1);
    }
  }
  
  // Check for edges shared by more than 2 faces (non-manifold)
  let nonManifoldCount = 0;
  for (const [_, count] of edgeMap) {
    if (count > 2) {
      nonManifoldCount++;
      hasNonManifoldEdges = true;
    }
  }
  
  if (nonManifoldCount > 0) {
    issues.push(`Found ${nonManifoldCount} non-manifold edges (shared by more than 2 faces)`);
  }
  
  onProgress?.({ stage: 'analyzing', progress: 80, message: 'Checking boundary edges...' });
  
  // Check for boundary edges (edges only used once = holes in mesh)
  let boundaryEdges = 0;
  for (const [_, count] of edgeMap) {
    if (count === 1) {
      boundaryEdges++;
    }
  }
  
  if (boundaryEdges > 0) {
    issues.push(`Found ${boundaryEdges} boundary edges (mesh has holes)`);
  }
  
  onProgress?.({ stage: 'analyzing', progress: 100, message: 'Analysis complete' });
  
  const isManifold = !hasNonManifoldEdges && boundaryEdges === 0 && !hasDegenerateFaces;
  
  if (triangleCount > DECIMATION_THRESHOLD) {
    issues.push(`High triangle count (${triangleCount.toLocaleString()}) may slow down downstream operations`);
  }
  
  return {
    isManifold,
    triangleCount,
    vertexCount,
    hasNonManifoldEdges,
    hasDegenerateFaces,
    boundingBox: {
      min: bbox.min.clone(),
      max: bbox.max.clone(),
      size,
    },
    issues,
  };
}

/**
 * Attempt to repair a mesh using basic operations
 */
export async function repairMesh(
  geometry: THREE.BufferGeometry,
  onProgress?: (progress: MeshProcessingProgress) => void
): Promise<MeshRepairResult> {
  try {
    onProgress?.({ stage: 'repairing', progress: 0, message: 'Starting mesh repair...' });
    
    const repairActions: string[] = [];
    
    // Clone geometry to avoid modifying original
    const repairedGeometry = geometry.clone();
    
    onProgress?.({ stage: 'repairing', progress: 20, message: 'Removing degenerate triangles...' });
    
    // Remove degenerate triangles
    const positionAttr = repairedGeometry.getAttribute('position');
    const normalAttr = repairedGeometry.getAttribute('normal');
    const positions = positionAttr.array as Float32Array;
    const normals = normalAttr ? normalAttr.array as Float32Array : null;
    
    const triangleCount = positionAttr.count / 3;
    const validPositions: number[] = [];
    const validNormals: number[] = [];
    
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    const cross = new THREE.Vector3();
    
    let removedCount = 0;
    
    for (let i = 0; i < triangleCount; i++) {
      const baseIdx = i * 9;
      v0.set(positions[baseIdx], positions[baseIdx + 1], positions[baseIdx + 2]);
      v1.set(positions[baseIdx + 3], positions[baseIdx + 4], positions[baseIdx + 5]);
      v2.set(positions[baseIdx + 6], positions[baseIdx + 7], positions[baseIdx + 8]);
      
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      
      // Keep non-degenerate triangles
      if (cross.lengthSq() >= 1e-12) {
        validPositions.push(
          positions[baseIdx], positions[baseIdx + 1], positions[baseIdx + 2],
          positions[baseIdx + 3], positions[baseIdx + 4], positions[baseIdx + 5],
          positions[baseIdx + 6], positions[baseIdx + 7], positions[baseIdx + 8]
        );
        if (normals) {
          const nBaseIdx = i * 9;
          validNormals.push(
            normals[nBaseIdx], normals[nBaseIdx + 1], normals[nBaseIdx + 2],
            normals[nBaseIdx + 3], normals[nBaseIdx + 4], normals[nBaseIdx + 5],
            normals[nBaseIdx + 6], normals[nBaseIdx + 7], normals[nBaseIdx + 8]
          );
        }
      } else {
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      repairActions.push(`Removed ${removedCount} degenerate triangles`);
    }
    
    onProgress?.({ stage: 'repairing', progress: 60, message: 'Rebuilding geometry...' });
    
    // Create new geometry with valid triangles
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(validPositions, 3));
    if (validNormals.length > 0) {
      newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(validNormals, 3));
    }
    
    onProgress?.({ stage: 'repairing', progress: 80, message: 'Recomputing normals...' });
    
    // Recompute normals
    newGeometry.computeVertexNormals();
    repairActions.push('Recomputed vertex normals');
    
    // Compute bounds tree if available
    if (typeof (newGeometry as any).computeBoundsTree === 'function') {
      (newGeometry as any).computeBoundsTree();
    }
    
    onProgress?.({ stage: 'repairing', progress: 100, message: 'Repair complete' });
    
    const finalTriangleCount = validPositions.length / 9;
    
    return {
      success: true,
      repairedGeometry: newGeometry,
      triangleCount: finalTriangleCount,
      repairActions,
    };
  } catch (error) {
    return {
      success: false,
      repairedGeometry: null,
      triangleCount: 0,
      repairActions: [],
      error: error instanceof Error ? error.message : 'Unknown error during repair',
    };
  }
}

/**
 * Decimate a mesh to reduce triangle count using Fast Quadric Mesh Simplification (WASM)
 * High-quality decimation that preserves mesh topology and surface detail
 */
export async function decimateMesh(
  geometry: THREE.BufferGeometry,
  targetTriangles: number = DECIMATION_TARGET,
  onProgress?: (progress: MeshProcessingProgress) => void
): Promise<DecimationResult> {
  try {
    onProgress?.({ stage: 'decimating', progress: 0, message: 'Starting mesh decimation...' });
    
    const positionAttr = geometry.getAttribute('position');
    const indices = geometry.index;
    const originalTriangles = indices ? indices.count / 3 : positionAttr.count / 3;
    
    if (originalTriangles <= targetTriangles) {
      return {
        success: true,
        decimatedGeometry: geometry.clone(),
        originalTriangles,
        finalTriangles: originalTriangles,
        reductionPercent: 0,
      };
    }
    
    // Calculate target ratio
    const targetRatio = targetTriangles / originalTriangles;
    
    console.log(`[Decimation] Original: ${originalTriangles} triangles, Target: ${targetTriangles}, Ratio: ${targetRatio.toFixed(3)}`);
    
    // Use Fast Quadric Mesh Simplification (WASM)
    const result = await simplifyGeometry(geometry, {
      ratio: targetRatio,
      onProgress: (stage, percent, message) => {
        // Map simplification progress to decimation progress
        const mappedProgress = Math.round(percent * 0.9); // Leave 10% for final steps
        onProgress?.({ stage: 'decimating', progress: mappedProgress, message });
      }
    });
    
    if (!result.success || !result.geometry) {
      throw new Error(result.error || 'Simplification failed');
    }
    
    onProgress?.({ stage: 'decimating', progress: 95, message: 'Finalizing geometry...' });
    
    // Compute bounds tree if available
    if (typeof (result.geometry as any).computeBoundsTree === 'function') {
      (result.geometry as any).computeBoundsTree();
    }
    
    onProgress?.({ stage: 'decimating', progress: 100, message: 'Decimation complete' });
    
    console.log(`[Decimation] Complete: ${result.originalTriangles} -> ${result.finalTriangles} triangles (${result.reductionPercent.toFixed(1)}% reduction)`);
    
    return {
      success: true,
      decimatedGeometry: result.geometry,
      originalTriangles: result.originalTriangles,
      finalTriangles: result.finalTriangles,
      reductionPercent: result.reductionPercent,
    };
  } catch (error) {
    console.error('[Decimation] Error:', error);
    return {
      success: false,
      decimatedGeometry: null,
      originalTriangles: 0,
      finalTriangles: 0,
      reductionPercent: 0,
      error: error instanceof Error ? error.message : 'Unknown error during decimation',
    };
  }
}

/**
 * Full mesh processing pipeline: analyze, repair if needed, and optionally decimate
 */
export async function processMeshPipeline(
  geometry: THREE.BufferGeometry,
  options: {
    autoRepair?: boolean;
    decimate?: boolean;
    targetTriangles?: number;
  } = {},
  onProgress?: (progress: MeshProcessingProgress) => void
): Promise<{
  analysis: MeshAnalysisResult;
  repair?: MeshRepairResult;
  decimation?: DecimationResult;
  finalGeometry: THREE.BufferGeometry;
}> {
  const { autoRepair = true, decimate = false, targetTriangles = DECIMATION_TARGET } = options;
  
  // Step 1: Analyze
  const analysis = await analyzeMesh(geometry, onProgress);
  
  let currentGeometry = geometry;
  let repair: MeshRepairResult | undefined;
  let decimation: DecimationResult | undefined;
  
  // Step 2: Repair if needed and enabled
  if (autoRepair && analysis.issues.length > 0) {
    repair = await repairMesh(currentGeometry, onProgress);
    if (repair.success && repair.repairedGeometry) {
      currentGeometry = repair.repairedGeometry;
    }
  }
  
  // Step 3: Decimate if requested
  if (decimate) {
    decimation = await decimateMesh(currentGeometry, targetTriangles, onProgress);
    if (decimation.success && decimation.decimatedGeometry) {
      currentGeometry = decimation.decimatedGeometry;
    }
  }
  
  onProgress?.({ stage: 'complete', progress: 100, message: 'Processing complete' });
  
  return {
    analysis,
    repair,
    decimation,
    finalGeometry: currentGeometry,
  };
}
