// ============================================
// Offset Mesh Processor - Main API
// High-level API for creating offset meshes from STL geometry
// ============================================

import * as THREE from 'three';
import { createOffsetHeightMap, loadHeightMapFromTiles, cleanupOffscreenResources } from './offsetHeightmap.js';
import { createWatertightMeshFromHeightmap, calculateOptimalMeshSettings } from './meshGenerator.js';
import { fillMeshHoles, analyzeMeshHoles } from './meshHoleFiller.js';
import { processWithManifold, initManifold, isManifoldReady } from './manifoldProcessor.js';
import { MeshoptSimplifier } from 'meshoptimizer';
import type { OffsetMeshOptions, OffsetMeshResult, HeightmapResult } from './types';

// ============================================
// Main Processing Pipeline
// ============================================

/**
 * Process STL geometry and create offset mesh
 * @param {Float32Array} vertices - Triangle soup vertices (xyz per vertex)
 * @param {Object} options - Processing options
 * @param {number} options.offsetDistance - Offset distance in world units
 * @param {number} options.pixelsPerUnit - Resolution (pixels per unit)
 * @param {number} [options.tileSize=2048] - Tile size for large heightmaps
 * @param {number} [options.simplifyRatio=null] - Simplification ratio (0.1-1.0), null to disable
 * @param {boolean} [options.verifyManifold=true] - Verify manifold and repair/fallback if needed
 * @param {number} [options.rotationXZ=0] - Rotation around Y axis in degrees (XZ plane)
 * @param {number} [options.rotationYZ=0] - Rotation around X axis in degrees (YZ plane, inverted: 180-input)
 * @param {boolean} [options.fillHoles=true] - Fill holes in input mesh before heightmap generation
 * @param {boolean} [options.useManifold=true] - Use Manifold 3D for final mesh optimization
 * @param {Function} [options.progressCallback] - Progress callback (current, total, stage)
 * @returns {Promise<Object>} Result with geometry and metadata
 */
export async function createOffsetMesh(vertices: Float32Array, options: any): Promise<OffsetMeshResult> {
    const {
        offsetDistance,
        pixelsPerUnit,
        tileSize = 2048,
        simplifyRatio = null,
        verifyManifold = true,
        rotationXZ = 0,
        rotationYZ = 0,
        fillHoles = true,
        useManifold = true,
        progressCallback = null
    } = options;
    
    // Validate inputs
    if (!vertices || vertices.length === 0) {
        throw new Error('No vertices provided');
    }
    if (offsetDistance <= 0) {
        throw new Error('Offset distance must be positive');
    }
    if (pixelsPerUnit <= 0) {
        throw new Error('Pixels per unit must be positive');
    }
    if (simplifyRatio !== null && (simplifyRatio <= 0 || simplifyRatio >= 1)) {
        throw new Error('Simplify ratio must be between 0 and 1 (exclusive)');
    }
    
    const result: OffsetMeshResult = {
        heightmapResult: null,
        geometry: null,
        metadata: {
            offsetDistance,
            pixelsPerUnit,
            resolution: 0,
            vertexCount: 0,
            triangleCount: 0,
            processingTime: 0,
            simplificationApplied: false,
            simplificationTime: 0,
            originalTriangleCount: 0,
            geometryCreationTime: 0,
            holesFilled: 0,
            holesCapTriangles: 0,
            manifoldProcessed: false,
            manifoldTime: 0
        }
    };
    
    const startTime = performance.now();
    
    // Pre-calculate rotation parameters
    const actualYZ = 180 - rotationYZ;
    const needsRotation = rotationXZ !== 0 || actualYZ !== 0;
    
    try {
        // Step 0: Apply rotation if needed
        let workingVertices = vertices;
        
        if (needsRotation) {
            if (progressCallback) progressCallback(0, 100, 'Applying rotation');
            
            // Create rotation matrix
            const rotationMatrix = createRotationMatrix(rotationXZ, actualYZ);
            
            // Rotate vertices
            workingVertices = applyMatrixToVertices(vertices, rotationMatrix);
            
            console.log(`Applied rotation: XZ=${rotationXZ}°, YZ=${rotationYZ}° (actual YZ=${actualYZ}°)`);
        }
        
        // Step 0.5: Fill holes in input mesh to prevent gaps in heightmap
        if (fillHoles) {
            if (progressCallback) progressCallback(2, 100, 'Analyzing mesh for holes');
            
            const holeAnalysis = analyzeMeshHoles(workingVertices);
            
            if (holeAnalysis.hasHoles) {
                console.log(`Mesh has ${holeAnalysis.boundaryEdges} boundary edges (~${holeAnalysis.estimatedHoles} holes)`);
                
                if (progressCallback) progressCallback(3, 100, 'Filling mesh holes');
                
                const originalVertexCount = workingVertices.length;
                workingVertices = fillMeshHoles(workingVertices);
                
                const addedVertices = workingVertices.length - originalVertexCount;
                const addedTriangles = addedVertices / 9;
                
                result.metadata.holesFilled = holeAnalysis.estimatedHoles;
                result.metadata.holesCapTriangles = addedTriangles;
                
                console.log(`Added ${addedTriangles} cap triangles to close holes`);
            } else {
                console.log('No holes detected in input mesh');
            }
        }
        
        // Step 1: Calculate resolution
        if (progressCallback) progressCallback(5, 100, 'Calculating resolution');
        
        const box = new THREE.Box3();
        box.setFromArray(workingVertices);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const effectiveDim = maxDim + (offsetDistance * 10);
        const resolution = Math.ceil(effectiveDim * pixelsPerUnit);
        const clampedResolution = Math.max(64, Math.min(16384, resolution));
        
        result.metadata.resolution = clampedResolution;
        
        console.log(`Resolution: ${maxDim.toFixed(1)} units × ${pixelsPerUnit} px/unit = ${clampedResolution}×${clampedResolution}`);
        
        // Step 2: Generate heightmap
        if (progressCallback) progressCallback(10, 100, 'Generating heightmap');
        
        const heightmapProgressCallback = clampedResolution > tileSize ? (current, total) => {
            const percent = 10 + (current / total) * 40;
            if (progressCallback) progressCallback(percent, 100, `Rendering tile ${current}/${total}`);
        } : null;
        
        const heightmapResult = await createOffsetHeightMap(
            workingVertices, 
            offsetDistance, 
            clampedResolution, 
            tileSize, 
            heightmapProgressCallback
        );
        
        result.heightmapResult = heightmapResult as HeightmapResult;
        
        // Step 3: Load heightmap data
        if (progressCallback) progressCallback(50, 100, 'Loading heightmap data');
        
        let heightMap;
        if ('usesIndexedDB' in heightmapResult && heightmapResult.usesIndexedDB) {
            const loadProgressCallback = (current, total) => {
                const percent = 50 + (current / total) * 20;
                if (progressCallback) progressCallback(percent, 100, `Loading tile ${current}/${total}`);
            };
            heightMap = await loadHeightMapFromTiles(heightmapResult, loadProgressCallback);
        } else {
            heightMap = heightmapResult.heightMap;
        }
        
        // Step 4: Calculate mesh settings
        if (progressCallback) progressCallback(70, 100, 'Calculating mesh settings');
        
        const meshSettings = {
            downsampleFactor: 1,
            effectiveResolution: clampedResolution
        };
        
        console.log(`Mesh resolution: ${meshSettings.effectiveResolution}×${meshSettings.effectiveResolution}`);
        
        // Step 5: Create watertight mesh
        if (progressCallback) progressCallback(75, 100, 'Creating watertight mesh');
        
        // For Y-up coordinate system, clip values are based on Y (height) bounds
        const originalBox = box;
        const clipYMin = originalBox.min.y - offsetDistance;  // Bottom of mesh (ground level)
        const clipYMax = originalBox.max.y + offsetDistance;  // Top of mesh
        
        const geometry = createWatertightMeshFromHeightmap(
            heightMap,
            clampedResolution,
            heightmapResult.scale,
            heightmapResult.center,
            clipYMin,  // Was clipZMin - now represents Y min
            clipYMax,  // Was clipZMax - now represents Y max
            meshSettings
        );
        
        result.geometry = geometry;
        result.metadata.originalTriangleCount = geometry.index.count / 3;
        
        // Step 6: Optional mesh simplification
        if (simplifyRatio !== null && simplifyRatio > 0 && simplifyRatio < 1) {
            if (progressCallback) progressCallback(90, 100, 'Simplifying mesh');
            
            const simplifyStartTime = performance.now();
            try {
                console.log(`Attempting mesh simplification with ratio ${simplifyRatio}`);
                const simplifiedGeometry = await simplifyGeometry(geometry, simplifyRatio);
                
                let finalGeometry = simplifiedGeometry;
                let acceptMesh = true;
                
                // Only verify/repair if manifold checking is enabled
                if (verifyManifold) {
                    console.log('Verifying manifold properties...');
                    const { verifyWatertightness, repairNonManifoldMesh, fillSmallHoles } = await import('./meshOptimizer.js');
                    let manifoldCheck = verifyWatertightness(simplifiedGeometry);
                    
                    acceptMesh = manifoldCheck.isWatertight;
                    
                    // If non-manifold, attempt repair
                    if (!manifoldCheck.isWatertight && manifoldCheck.overSharedEdges > 0) {
                        console.log(`Attempting to repair ${manifoldCheck.overSharedEdges} over-shared edges...`);
                        const repairedGeometry = repairNonManifoldMesh(simplifiedGeometry, 3);
                        
                        // Verify repair worked
                        const repairedCheck = verifyWatertightness(repairedGeometry);
                        
                        if (repairedCheck.isWatertight) {
                            console.log('✓ Successfully repaired non-manifold geometry');
                            finalGeometry = repairedGeometry;
                            acceptMesh = true;
                        } else if (repairedCheck.nonManifoldEdges < manifoldCheck.nonManifoldEdges * 0.1) {
                            console.log(`✓ Significantly improved: ${manifoldCheck.nonManifoldEdges} → ${repairedCheck.nonManifoldEdges} non-manifold edges (${((1 - repairedCheck.nonManifoldEdges / manifoldCheck.nonManifoldEdges) * 100).toFixed(1)}% reduction)`);
                            finalGeometry = repairedGeometry;
                            acceptMesh = true;
                        } else {
                            console.warn(`Repair incomplete: ${repairedCheck.nonManifoldEdges} non-manifold edges remain. Using full mesh.`);
                        }
                    }
                    
                    // Fill small holes if mesh still has boundary edges
                    if (!manifoldCheck.isWatertight && manifoldCheck.boundaryEdges > 0) {
                        console.log(`Attempting to fill holes (${manifoldCheck.boundaryEdges} boundary edges)...`);
                        const filledGeometry = fillSmallHoles(finalGeometry, 50);
                        
                        // Verify hole filling worked
                        const filledCheck = verifyWatertightness(filledGeometry);
                        
                        if (filledCheck.isWatertight) {
                            console.log('✓ Successfully filled all holes - mesh is now watertight');
                            finalGeometry = filledGeometry;
                            acceptMesh = true;
                        } else if (filledCheck.boundaryEdges < manifoldCheck.boundaryEdges * 0.5) {
                            console.log(`✓ Partially filled holes: ${manifoldCheck.boundaryEdges} → ${filledCheck.boundaryEdges} boundary edges (${((1 - filledCheck.boundaryEdges / manifoldCheck.boundaryEdges) * 100).toFixed(1)}% reduction)`);
                            finalGeometry = filledGeometry;
                            acceptMesh = true;
                        }
                    }
                } else {
                    console.log('Manifold verification disabled - using simplified mesh as-is');
                }
                
                if (acceptMesh) {
                    result.geometry = finalGeometry;
                    result.metadata.simplificationApplied = true;
                    result.metadata.simplificationTime = performance.now() - simplifyStartTime;
                    console.log(`Mesh simplified: ${result.metadata.originalTriangleCount.toLocaleString()} → ${(finalGeometry.index.count / 3).toLocaleString()} triangles`);
                } else {
                    console.warn(`Simplification created non-manifold geometry that couldn't be repaired. Using full mesh.`);
                    result.metadata.simplificationApplied = false;
                    result.metadata.simplificationTime = 0;
                }
            } catch (error) {
                console.warn(`Mesh simplification failed: ${error.message}. Using full mesh.`);
                result.metadata.simplificationApplied = false;
                result.metadata.simplificationTime = 0;
            }
        }
        
        // Apply inverse rotation to restore original orientation
        if (needsRotation) {
            if (progressCallback) progressCallback(92, 100, 'Restoring orientation');
            
            const inverseMatrix = createInverseRotationMatrix(rotationXZ, actualYZ);
            result.geometry.applyMatrix4(inverseMatrix);
            result.geometry.computeVertexNormals();
            
            console.log('Restored original orientation');
        }
        
        // Step 7: Manifold 3D processing (final optimization)
        if (useManifold) {
            if (progressCallback) progressCallback(95, 100, 'Optimizing with Manifold 3D');
            
            const manifoldStartTime = performance.now();
            try {
                console.log('Processing with Manifold 3D...');
                const manifoldResult = await processWithManifold(result.geometry, {
                    decimate: false, // Decimation already handled by meshoptimizer
                    ensureManifold: true
                });
                
                if (manifoldResult.isManifold) {
                    result.geometry = manifoldResult.geometry;
                    result.metadata.manifoldProcessed = true;
                    console.log(`✓ Manifold processing complete: ${manifoldResult.finalTriangles} triangles`);
                } else {
                    console.warn('Manifold processing could not ensure watertight mesh');
                    result.metadata.manifoldProcessed = false;
                }
                
                result.metadata.manifoldTime = performance.now() - manifoldStartTime;
            } catch (error) {
                console.warn('Manifold processing failed:', error);
                result.metadata.manifoldProcessed = false;
                result.metadata.manifoldTime = 0;
            }
        }
        
        result.metadata.vertexCount = result.geometry.getAttribute('position').count;
        result.metadata.triangleCount = result.geometry.index.count / 3;
        
        const endTime = performance.now();
        result.metadata.processingTime = endTime - startTime;
        result.metadata.geometryCreationTime = result.metadata.processingTime - result.metadata.simplificationTime;
        
        if (progressCallback) progressCallback(100, 100, 'Complete');
        
        console.log(`Processing complete: ${result.metadata.triangleCount.toLocaleString()} triangles in ${result.metadata.processingTime.toFixed(0)}ms`);
        
        return result;
        
    } catch (error) {
        console.error('Error in createOffsetMesh:', error);
        throw error;
    }
}

/**
 * Simplify mesh geometry using meshoptimizer
 * @param {THREE.BufferGeometry} geometry - Geometry to simplify
 * @param {number} targetRatio - Target ratio (0.1-1.0)
 * @returns {Promise<THREE.BufferGeometry>} Simplified geometry
 */
async function simplifyGeometry(geometry, targetRatio) {
    // Wait for meshoptimizer to be ready
    await MeshoptSimplifier.ready;
    
    // Extract mesh data
    const positions = geometry.attributes.position.array;
    const indices = geometry.index.array;
    
    // Validate input
    if (!indices || indices.length === 0) {
        throw new Error('Geometry has no indices');
    }
    if (!positions || positions.length === 0) {
        throw new Error('Geometry has no positions');
    }
    
    // Convert to Uint32Array and Float32Array if needed
    const uint32Indices = indices instanceof Uint32Array ? indices : new Uint32Array(indices);
    const float32Positions = positions instanceof Float32Array ? positions : new Float32Array(positions);
    
    // Calculate target index count with minimum threshold
    const minIndexCount = 3;
    const targetIndexCount = Math.max(minIndexCount, Math.floor(uint32Indices.length * targetRatio));
    
    // Ensure target is divisible by 3 (triangles)
    const adjustedTargetIndexCount = Math.floor(targetIndexCount / 3) * 3;
    
    console.log(`Simplifying: ${uint32Indices.length} → ${adjustedTargetIndexCount} indices (ratio: ${targetRatio})`);
    
    // Simplify using meshoptimizer with LockBorder flag to preserve manifold topology
    // This prevents collapsing edges on the border which can create non-manifold geometry
    const [simplifiedIndices, error] = MeshoptSimplifier.simplify(
        uint32Indices,
        float32Positions,
        3, // stride (xyz)
        adjustedTargetIndexCount,
        0.01, // target error
        ['LockBorder'] // lock border vertices to preserve topology
    );
    
    console.log(`Simplification result: ${simplifiedIndices.length} indices, error: ${error.toFixed(6)}`);
    
    // Create new geometry with simplified indices
    const simplifiedGeometry = new THREE.BufferGeometry();
    simplifiedGeometry.setAttribute('position', geometry.attributes.position.clone());
    simplifiedGeometry.setIndex(Array.from(simplifiedIndices));
    simplifiedGeometry.computeVertexNormals();
    
    return simplifiedGeometry;
}

/**
 * Cleanup resources (call when done)
 */
export function cleanup() {
    cleanupOffscreenResources();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Extract vertices from Three.js BufferGeometry
 * @param {THREE.BufferGeometry} geometry
 * @returns {Float32Array} Triangle soup vertices
 */
export function extractVertices(geometry) {
    return geometry.attributes.position.array;
}

/**
 * Calculate adaptive resolution based on model size
 * @param {THREE.Box3} boundingBox - Model bounding box
 * @param {number} pixelsPerUnit - Pixels per unit
 * @param {number} offsetDistance - Offset distance
 * @returns {number} Calculated resolution (clamped 64-16384)
 */
export function calculateResolution(boundingBox, pixelsPerUnit, offsetDistance) {
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const effectiveDim = maxDim + (offsetDistance * 10);
    const resolution = Math.ceil(effectiveDim * pixelsPerUnit);
    return Math.max(64, Math.min(16384, resolution));
}

// ============================================
// Rotation Helper Functions
// ============================================

/**
 * Create a rotation matrix from XZ and actualYZ angles
 * @param {number} xzAngleDeg - Rotation around Y axis (degrees)
 * @param {number} actualYZ - Actual rotation around X axis (degrees, pre-calculated: 180-input)
 * @returns {THREE.Matrix4} Rotation matrix
 */
function createRotationMatrix(xzAngleDeg, actualYZ) {
    const matrix = new THREE.Matrix4();
    
    // Early return if no rotation needed
    if (xzAngleDeg === 0 && actualYZ === 0) {
        return matrix; // Identity matrix
    }
    
    // Rotation order: Y axis first (XZ plane), then X axis (YZ plane)
    if (xzAngleDeg !== 0) {
        const rotY = new THREE.Matrix4();
        rotY.makeRotationY(xzAngleDeg * Math.PI / 180);
        matrix.multiply(rotY);
    }
    
    if (actualYZ !== 0) {
        const rotX = new THREE.Matrix4();
        rotX.makeRotationX(actualYZ * Math.PI / 180);
        matrix.multiply(rotX);
    }
    
    return matrix;
}

/**
 * Create an inverse rotation matrix
 * @param {number} xzAngleDeg - Rotation around Y axis (degrees)
 * @param {number} actualYZ - Actual rotation around X axis (degrees)
 * @returns {THREE.Matrix4} Inverse rotation matrix
 */
function createInverseRotationMatrix(xzAngleDeg, actualYZ) {
    const matrix = new THREE.Matrix4();
    
    // Early return if no rotation needed
    if (xzAngleDeg === 0 && actualYZ === 0) {
        return matrix; // Identity matrix
    }
    
    // Inverse rotation: apply in reverse order with negative angles
    if (actualYZ !== 0) {
        const rotX = new THREE.Matrix4();
        rotX.makeRotationX(-actualYZ * Math.PI / 180);
        matrix.multiply(rotX);
    }
    
    if (xzAngleDeg !== 0) {
        const rotY = new THREE.Matrix4();
        rotY.makeRotationY(-xzAngleDeg * Math.PI / 180);
        matrix.multiply(rotY);
    }
    
    return matrix;
}

/**
 * Apply a transformation matrix to vertices
 * @param {Float32Array} vertices - Input vertices
 * @param {THREE.Matrix4} matrix - Transformation matrix
 * @returns {Float32Array} Transformed vertices
 */
function applyMatrixToVertices(vertices, matrix) {
    const result = new Float32Array(vertices.length);
    const vec = new THREE.Vector3();
    const elements = matrix.elements;
    
    // Extract matrix elements for faster access
    const m11 = elements[0], m12 = elements[4], m13 = elements[8], m14 = elements[12];
    const m21 = elements[1], m22 = elements[5], m23 = elements[9], m24 = elements[13];
    const m31 = elements[2], m32 = elements[6], m33 = elements[10], m34 = elements[14];
    const m41 = elements[3], m42 = elements[7], m43 = elements[11], m44 = elements[15];
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        
        // Manual matrix multiplication for better performance
        const w = m41 * x + m42 * y + m43 * z + m44 || 1;
        
        result[i] = (m11 * x + m12 * y + m13 * z + m14) / w;
        result[i + 1] = (m21 * x + m22 * y + m23 * z + m24) / w;
        result[i + 2] = (m31 * x + m32 * y + m33 * z + m34) / w;
    }
    
    return result;
}
