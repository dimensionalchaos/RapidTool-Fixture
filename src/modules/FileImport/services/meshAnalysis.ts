import * as THREE from 'three';

// Note: manifold-3d could be used for more advanced mesh operations in the future
// For now, we use a custom implementation for mesh analysis, repair, and decimation

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
 * Decimate a mesh to reduce triangle count using edge collapse
 * Simple implementation that merges nearby vertices and removes small triangles
 */
export async function decimateMesh(
  geometry: THREE.BufferGeometry,
  targetTriangles: number = DECIMATION_TARGET,
  onProgress?: (progress: MeshProcessingProgress) => void
): Promise<DecimationResult> {
  try {
    onProgress?.({ stage: 'decimating', progress: 0, message: 'Starting mesh decimation...' });
    
    const positionAttr = geometry.getAttribute('position');
    const positions = positionAttr.array as Float32Array;
    const originalTriangles = positionAttr.count / 3;
    
    if (originalTriangles <= targetTriangles) {
      return {
        success: true,
        decimatedGeometry: geometry.clone(),
        originalTriangles,
        finalTriangles: originalTriangles,
        reductionPercent: 0,
      };
    }
    
    onProgress?.({ stage: 'decimating', progress: 10, message: 'Building vertex grid...' });
    
    // Calculate decimation ratio
    const ratio = targetTriangles / originalTriangles;
    
    // Compute bounding box
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Calculate grid cell size based on desired reduction
    // More aggressive reduction = larger cells = more vertex merging
    const cellSize = Math.max(size.x, size.y, size.z) * Math.pow(1 - ratio, 0.5) * 0.01;
    
    onProgress?.({ stage: 'decimating', progress: 20, message: 'Merging vertices...' });
    
    // Create a spatial hash grid for vertex merging
    const vertexMap = new Map<string, number>();
    const mergedPositions: number[] = [];
    const indexMap = new Map<number, number>(); // original vertex index -> merged index
    
    const getGridKey = (x: number, y: number, z: number): string => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      const gz = Math.floor(z / cellSize);
      return `${gx},${gy},${gz}`;
    };
    
    // First pass: merge vertices
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      const key = getGridKey(x, y, z);
      
      if (vertexMap.has(key)) {
        indexMap.set(i, vertexMap.get(key)!);
      } else {
        const newIndex = mergedPositions.length / 3;
        mergedPositions.push(x, y, z);
        vertexMap.set(key, newIndex);
        indexMap.set(i, newIndex);
      }
    }
    
    onProgress?.({ stage: 'decimating', progress: 50, message: 'Rebuilding triangles...' });
    
    // Second pass: rebuild triangles with merged vertices, removing degenerates
    const newIndices: number[] = [];
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    const cross = new THREE.Vector3();
    
    for (let i = 0; i < originalTriangles; i++) {
      const i0 = indexMap.get(i * 3)!;
      const i1 = indexMap.get(i * 3 + 1)!;
      const i2 = indexMap.get(i * 3 + 2)!;
      
      // Skip degenerate triangles (where vertices have been merged together)
      if (i0 === i1 || i1 === i2 || i2 === i0) {
        continue;
      }
      
      // Check if triangle is degenerate (zero area)
      v0.set(mergedPositions[i0 * 3], mergedPositions[i0 * 3 + 1], mergedPositions[i0 * 3 + 2]);
      v1.set(mergedPositions[i1 * 3], mergedPositions[i1 * 3 + 1], mergedPositions[i1 * 3 + 2]);
      v2.set(mergedPositions[i2 * 3], mergedPositions[i2 * 3 + 1], mergedPositions[i2 * 3 + 2]);
      
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      
      if (cross.lengthSq() < 1e-12) {
        continue;
      }
      
      newIndices.push(i0, i1, i2);
    }
    
    onProgress?.({ stage: 'decimating', progress: 70, message: 'Creating optimized geometry...' });
    
    // Create indexed geometry
    const decimatedGeometry = new THREE.BufferGeometry();
    decimatedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    decimatedGeometry.setIndex(newIndices);
    
    onProgress?.({ stage: 'decimating', progress: 85, message: 'Recomputing normals...' });
    
    // Recompute normals
    decimatedGeometry.computeVertexNormals();
    
    // Convert to non-indexed for consistency with original workflow
    const nonIndexedGeometry = decimatedGeometry.toNonIndexed();
    
    // Compute bounds tree if available
    if (typeof (nonIndexedGeometry as any).computeBoundsTree === 'function') {
      (nonIndexedGeometry as any).computeBoundsTree();
    }
    
    onProgress?.({ stage: 'decimating', progress: 100, message: 'Decimation complete' });
    
    const finalTriangles = newIndices.length / 3;
    const reductionPercent = ((originalTriangles - finalTriangles) / originalTriangles) * 100;
    
    return {
      success: true,
      decimatedGeometry: nonIndexedGeometry,
      originalTriangles,
      finalTriangles,
      reductionPercent,
    };
  } catch (error) {
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
