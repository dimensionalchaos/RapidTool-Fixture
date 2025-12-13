// ============================================
// Watertight Mesh Generation Module
// Creates manifold meshes from heightmap data
// For Y-up coordinate system (X-Z horizontal plane, Y is height)
// Uses Marching Squares-inspired approach for smooth boundaries
// ============================================

import * as THREE from 'three';

// ============================================
// Mesh Analysis for Manifold Verification
// ============================================

export interface MeshAnalysisResult {
    isManifold: boolean;
    vertexCount: number;
    triangleCount: number;
    edgeCount: number;
    
    // Edge analysis
    boundaryEdges: number;          // Edges with only 1 face (holes)
    nonManifoldEdges: number;       // Edges with >2 faces
    manifoldEdges: number;          // Edges with exactly 2 faces
    
    // Vertex analysis
    nonManifoldVertices: number;    // Vertices with non-manifold topology
    isolatedVertices: number;       // Vertices not part of any face
    
    // Detailed issues
    boundaryEdgeList: { v1: number; v2: number; pos1: THREE.Vector3; pos2: THREE.Vector3 }[];
    nonManifoldEdgeList: { v1: number; v2: number; faceCount: number; pos1: THREE.Vector3; pos2: THREE.Vector3 }[];
    
    // Winding analysis
    inconsistentWindingEdges: number;  // Edges where adjacent faces have same winding direction
    
    // Summary
    issues: string[];
}

export function analyzeMeshManifold(geometry: THREE.BufferGeometry): MeshAnalysisResult {
    const positions = geometry.getAttribute('position');
    const indices = geometry.getIndex();
    
    if (!indices) {
        return {
            isManifold: false,
            vertexCount: positions.count,
            triangleCount: 0,
            edgeCount: 0,
            boundaryEdges: 0,
            nonManifoldEdges: 0,
            manifoldEdges: 0,
            nonManifoldVertices: 0,
            isolatedVertices: positions.count,
            boundaryEdgeList: [],
            nonManifoldEdgeList: [],
            inconsistentWindingEdges: 0,
            issues: ['Geometry has no index buffer']
        };
    }
    
    const vertexCount = positions.count;
    const triangleCount = indices.count / 3;
    const issues: string[] = [];
    
    // Build edge map: edge key -> list of {faceIndex, direction}
    // Direction: true = v1->v2, false = v2->v1 (for winding check)
    const edgeMap = new Map<string, { faceIndex: number; forward: boolean }[]>();
    
    const getEdgeKey = (v1: number, v2: number): string => {
        return v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
    };
    
    // Track which vertices are used
    const usedVertices = new Set<number>();
    
    // Process all triangles
    for (let i = 0; i < triangleCount; i++) {
        const a = indices.getX(i * 3);
        const b = indices.getX(i * 3 + 1);
        const c = indices.getX(i * 3 + 2);
        
        usedVertices.add(a);
        usedVertices.add(b);
        usedVertices.add(c);
        
        // Three edges per triangle: a-b, b-c, c-a
        const edges = [
            { v1: a, v2: b },
            { v1: b, v2: c },
            { v1: c, v2: a }
        ];
        
        for (const edge of edges) {
            const key = getEdgeKey(edge.v1, edge.v2);
            const forward = edge.v1 < edge.v2; // true if stored in canonical order
            
            if (!edgeMap.has(key)) {
                edgeMap.set(key, []);
            }
            edgeMap.get(key)!.push({ faceIndex: i, forward });
        }
    }
    
    // Analyze edges
    let boundaryEdges = 0;
    let nonManifoldEdges = 0;
    let manifoldEdges = 0;
    let inconsistentWindingEdges = 0;
    
    const boundaryEdgeList: MeshAnalysisResult['boundaryEdgeList'] = [];
    const nonManifoldEdgeList: MeshAnalysisResult['nonManifoldEdgeList'] = [];
    
    const getVertexPos = (idx: number): THREE.Vector3 => {
        return new THREE.Vector3(
            positions.getX(idx),
            positions.getY(idx),
            positions.getZ(idx)
        );
    };
    
    for (const [key, faces] of edgeMap) {
        const [v1Str, v2Str] = key.split(',');
        const v1 = parseInt(v1Str);
        const v2 = parseInt(v2Str);
        
        if (faces.length === 1) {
            // Boundary edge (hole)
            boundaryEdges++;
            if (boundaryEdgeList.length < 50) { // Limit stored examples
                boundaryEdgeList.push({
                    v1, v2,
                    pos1: getVertexPos(v1),
                    pos2: getVertexPos(v2)
                });
            }
        } else if (faces.length === 2) {
            // Normal manifold edge - check winding consistency
            manifoldEdges++;
            
            // For proper manifold mesh, the two faces should traverse the edge in opposite directions
            // If both traverse in same direction, winding is inconsistent
            if (faces[0].forward === faces[1].forward) {
                inconsistentWindingEdges++;
            }
        } else {
            // Non-manifold edge (>2 faces)
            nonManifoldEdges++;
            if (nonManifoldEdgeList.length < 50) {
                nonManifoldEdgeList.push({
                    v1, v2,
                    faceCount: faces.length,
                    pos1: getVertexPos(v1),
                    pos2: getVertexPos(v2)
                });
            }
        }
    }
    
    // Count isolated vertices
    const isolatedVertices = vertexCount - usedVertices.size;
    
    // Non-manifold vertex detection (simplified - checks for bowtie topology)
    // A more complete check would detect vertices where the fan of faces doesn't form a single connected component
    let nonManifoldVertices = 0;
    // This is complex to compute fully, so we skip detailed vertex analysis for now
    
    // Build issues list
    if (boundaryEdges > 0) {
        issues.push(`${boundaryEdges} boundary edges (holes in mesh)`);
    }
    if (nonManifoldEdges > 0) {
        issues.push(`${nonManifoldEdges} non-manifold edges (>2 faces sharing edge)`);
    }
    if (inconsistentWindingEdges > 0) {
        issues.push(`${inconsistentWindingEdges} edges with inconsistent winding`);
    }
    if (isolatedVertices > 0) {
        issues.push(`${isolatedVertices} isolated vertices`);
    }
    
    const isManifold = boundaryEdges === 0 && nonManifoldEdges === 0 && inconsistentWindingEdges === 0;
    
    return {
        isManifold,
        vertexCount,
        triangleCount,
        edgeCount: edgeMap.size,
        boundaryEdges,
        nonManifoldEdges,
        manifoldEdges,
        nonManifoldVertices,
        isolatedVertices,
        boundaryEdgeList,
        nonManifoldEdgeList,
        inconsistentWindingEdges,
        issues
    };
}

export function logMeshAnalysis(analysis: MeshAnalysisResult, label: string = 'Mesh') {
    const status = analysis.isManifold ? '✅ MANIFOLD' : '❌ NON-MANIFOLD';
    
    console.log(`\n========== ${label} Analysis ==========`);
    console.log(`Status: ${status}`);
    console.log(`Vertices: ${analysis.vertexCount.toLocaleString()}`);
    console.log(`Triangles: ${analysis.triangleCount.toLocaleString()}`);
    console.log(`Edges: ${analysis.edgeCount.toLocaleString()}`);
    console.log(`  - Manifold (2 faces): ${analysis.manifoldEdges}`);
    console.log(`  - Boundary (1 face): ${analysis.boundaryEdges}`);
    console.log(`  - Non-manifold (>2 faces): ${analysis.nonManifoldEdges}`);
    console.log(`  - Inconsistent winding: ${analysis.inconsistentWindingEdges}`);
    
    if (analysis.issues.length > 0) {
        console.log(`\nIssues Found:`);
        analysis.issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
    }
    
    // Log sample boundary edges (holes)
    if (analysis.boundaryEdgeList.length > 0) {
        console.log(`\nSample Boundary Edges (holes):`);
        const samples = analysis.boundaryEdgeList.slice(0, 10);
        samples.forEach((edge, idx) => {
            console.log(`  ${idx + 1}. v${edge.v1}-v${edge.v2}: (${edge.pos1.x.toFixed(3)}, ${edge.pos1.y.toFixed(3)}, ${edge.pos1.z.toFixed(3)}) -> (${edge.pos2.x.toFixed(3)}, ${edge.pos2.y.toFixed(3)}, ${edge.pos2.z.toFixed(3)})`);
        });
        if (analysis.boundaryEdgeList.length > 10) {
            console.log(`  ... and ${analysis.boundaryEdgeList.length - 10} more`);
        }
    }
    
    // Log sample non-manifold edges
    if (analysis.nonManifoldEdgeList.length > 0) {
        console.log(`\nSample Non-Manifold Edges:`);
        const samples = analysis.nonManifoldEdgeList.slice(0, 10);
        samples.forEach((edge, idx) => {
            console.log(`  ${idx + 1}. v${edge.v1}-v${edge.v2} (${edge.faceCount} faces): (${edge.pos1.x.toFixed(3)}, ${edge.pos1.y.toFixed(3)}, ${edge.pos1.z.toFixed(3)}) -> (${edge.pos2.x.toFixed(3)}, ${edge.pos2.y.toFixed(3)}, ${edge.pos2.z.toFixed(3)})`);
        });
        if (analysis.nonManifoldEdgeList.length > 10) {
            console.log(`  ... and ${analysis.nonManifoldEdgeList.length - 10} more`);
        }
    }
    
    console.log(`========================================\n`);
    
    return analysis;
}

// ============================================
// Mesh Generation from Heightmap
// ============================================

export interface MeshGeneratorOptions {
    downsampleFactor?: number;
    effectiveResolution?: number;
    useSmoothBoundaries?: boolean;  // Enable diagonal wall smoothing for curved boundaries
}

export function createWatertightMeshFromHeightmap(
    heightMap: Float32Array, 
    resolution: number, 
    scale: number, 
    center: { x: number, y: number, z: number }, 
    clipYMin: number,  // Minimum Y value (bottom/ground level)
    clipYMax: number,  // Maximum Y value (top)
    meshSettings: MeshGeneratorOptions | null = null
) {
    const startTime = performance.now();
    
    // Apply downsampling if needed
    let workingHeightMap = heightMap;
    let workingResolution = resolution;
    
    // Enable smooth boundaries by default for cleaner curved edges
    const useSmoothBoundaries = meshSettings?.useSmoothBoundaries !== false;
    
    if (meshSettings && meshSettings.downsampleFactor && meshSettings.downsampleFactor > 1) {
        const downsampleResult = downsampleHeightmap(heightMap, resolution, meshSettings.downsampleFactor);
        workingHeightMap = downsampleResult.heightMap;
        workingResolution = downsampleResult.resolution;
    }
    
    // Pre-calculate coordinate transformation constants
    const invResMinusOne = 1 / (workingResolution - 1);
    const invScale = 1 / scale;
    
    // Step 1: Identify valid heightmap points and create vertex grid
    const vertexGrid: (number | null)[] = new Array(workingResolution * workingResolution).fill(null);
    const validVertices: {
        gridI: number;
        gridJ: number;
        topPos: THREE.Vector3;
        bottomPos: THREE.Vector3;
        topIndex: number;
        bottomIndex: number;
    }[] = [];
    
    let minHeight = Infinity;
    for (let i = 0; i < workingHeightMap.length; i++) {
        minHeight = Math.min(minHeight, workingHeightMap[i]);
    }
    
    const heightThreshold = 0.001;
    
    // For Y-up coordinate system:
    // - Heightmap X (column i) -> World X
    // - Heightmap Y (row j) -> World Z
    // - Height value -> World Y (the up direction)
    for (let j = 0; j < workingResolution; j++) {
        const flippedJ = workingResolution - 1 - j;
        const zCoord = -((flippedJ * 2 * invResMinusOne - 1) - center.z) * invScale;
        
        for (let i = 0; i < workingResolution; i++) {
            const heightIdx = flippedJ * workingResolution + i;
            const gridIdx = j * workingResolution + i;
            
            const rawHeight = workingHeightMap[heightIdx];
            
            if (Math.abs(rawHeight - minHeight) > heightThreshold) {
                const x = ((i * 2 * invResMinusOne - 1) + center.x) * invScale;
                let worldY = (rawHeight + center.y) * invScale;
                worldY = Math.max(clipYMin, Math.min(clipYMax, worldY));
                
                const vertexIndex = validVertices.length;
                
                validVertices.push({
                    gridI: i,
                    gridJ: j,
                    topPos: new THREE.Vector3(x, worldY, zCoord),
                    bottomPos: new THREE.Vector3(x, clipYMin, zCoord),
                    topIndex: -1,
                    bottomIndex: -1
                });
                
                vertexGrid[gridIdx] = vertexIndex;
            }
        }
    }
    
    // Step 2: Build manifold mesh with shared vertices
    const vertexMap = new Map<string, number>();
    const positions: number[] = [];
    let nextVertexIndex = 0;
    
    const getOrCreateVertex = (x: number, y: number, z: number): number => {
        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        if (vertexMap.has(key)) {
            return vertexMap.get(key)!;
        }
        
        const index = nextVertexIndex++;
        positions.push(x, y, z);
        vertexMap.set(key, index);
        return index;
    };
    
    // Create top and bottom vertices
    validVertices.forEach(v => {
        v.topIndex = getOrCreateVertex(v.topPos.x, v.topPos.y, v.topPos.z);
        v.bottomIndex = getOrCreateVertex(v.bottomPos.x, v.bottomPos.y, v.bottomPos.z);
    });
    
    // Step 3: Build triangles
    const indicesList: number[] = [];
    
    const addTriangle = (a: number, b: number, c: number) => {
        indicesList.push(a, b, c);
    };
    
    const addWallQuad = (v1Top: number, v1Bottom: number, v2Top: number, v2Bottom: number) => {
        addTriangle(v1Top, v2Top, v2Bottom);
        addTriangle(v1Top, v2Bottom, v1Bottom);
    };
    
    // Helper to get vertex index at grid position
    const getVertex = (i: number, j: number): number | null => {
        if (i < 0 || i >= workingResolution || j < 0 || j >= workingResolution) {
            return null;
        }
        return vertexGrid[j * workingResolution + i];
    };
    
    // ============================================
    // Build top and bottom surfaces
    // ============================================
    
    for (let j = 0; j < workingResolution - 1; j++) {
        for (let i = 0; i < workingResolution - 1; i++) {
            const aIdx = getVertex(i, j);         // bottom-left (a)
            const bIdx = getVertex(i + 1, j);     // bottom-right (b)
            const cIdx = getVertex(i, j + 1);     // top-left (c)
            const dIdx = getVertex(i + 1, j + 1); // top-right (d)
            
            const a = aIdx !== null;
            const b = bIdx !== null;
            const c = cIdx !== null;
            const d = dIdx !== null;
            const validCount = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) + (d ? 1 : 0);
            
            if (validCount === 4) {
                // Full quad - all corners valid
                const va = validVertices[aIdx!];
                const vb = validVertices[bIdx!];
                const vc = validVertices[cIdx!];
                const vd = validVertices[dIdx!];
                
                // Top surface (CCW when viewed from +Y)
                addTriangle(va.topIndex, vd.topIndex, vb.topIndex);
                addTriangle(va.topIndex, vc.topIndex, vd.topIndex);
                
                // Bottom surface (opposite winding)
                addTriangle(va.bottomIndex, vb.bottomIndex, vd.bottomIndex);
                addTriangle(va.bottomIndex, vd.bottomIndex, vc.bottomIndex);
                
            } else if (validCount === 3) {
                // Partial cell with 3 valid corners - create single triangle
                // Must match winding of full quad triangles:
                //   Full quad: (BL,TR,BR) and (BL,TL,TR)
                // For consistency, use explicit winding per missing corner case
                
                if (!a && b && c && d) {
                    // BL missing - have BR, TL, TR
                    // Match second triangle pattern: TL, TR, BR (like BL,TL,TR but shifted)
                    const vb = validVertices[bIdx!];
                    const vc = validVertices[cIdx!];
                    const vd = validVertices[dIdx!];
                    addTriangle(vc.topIndex, vd.topIndex, vb.topIndex);
                    addTriangle(vc.bottomIndex, vb.bottomIndex, vd.bottomIndex);
                    
                } else if (a && !b && c && d) {
                    // BR missing - have BL, TL, TR  
                    // Match second triangle: BL, TL, TR
                    const va = validVertices[aIdx!];
                    const vc = validVertices[cIdx!];
                    const vd = validVertices[dIdx!];
                    addTriangle(va.topIndex, vc.topIndex, vd.topIndex);
                    addTriangle(va.bottomIndex, vd.bottomIndex, vc.bottomIndex);
                    
                } else if (a && b && !c && d) {
                    // TL missing - have BL, BR, TR
                    // Match first triangle: BL, TR, BR
                    const va = validVertices[aIdx!];
                    const vb = validVertices[bIdx!];
                    const vd = validVertices[dIdx!];
                    addTriangle(va.topIndex, vd.topIndex, vb.topIndex);
                    addTriangle(va.bottomIndex, vb.bottomIndex, vd.bottomIndex);
                    
                } else if (a && b && c && !d) {
                    // TR missing - have BL, BR, TL
                    // Triangle: BL, TL, BR
                    const va = validVertices[aIdx!];
                    const vb = validVertices[bIdx!];
                    const vc = validVertices[cIdx!];
                    addTriangle(va.topIndex, vc.topIndex, vb.topIndex);
                    addTriangle(va.bottomIndex, vb.bottomIndex, vc.bottomIndex);
                }
            }
        }
    }
    
    // ============================================
    // Build side walls with smooth boundaries
    // ============================================
    
    const processedEdges = new Set<string>();
    
    const getEdgeKey = (v1: number, v2: number): string => {
        return v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
    };
    
    const getGridEdgeKey = (i1: number, j1: number, i2: number, j2: number): string => {
        if (i1 < i2 || (i1 === i2 && j1 < j2)) {
            return `${i1},${j1}-${i2},${j2}`;
        }
        return `${i2},${j2}-${i1},${j1}`;
    };
    
    // First pass: Identify all 3-corner cells and mark their L-shaped edges as "diagonal boundary"
    // These edges should NOT get H/V walls - only the diagonal wall
    const diagonalBoundaryEdges = new Set<string>();
    
    if (useSmoothBoundaries) {
        for (let j = 0; j < workingResolution - 1; j++) {
            for (let i = 0; i < workingResolution - 1; i++) {
                const blIdx = getVertex(i, j);
                const brIdx = getVertex(i + 1, j);
                const tlIdx = getVertex(i, j + 1);
                const trIdx = getVertex(i + 1, j + 1);
                
                const bl = blIdx !== null;
                const br = brIdx !== null;
                const tl = tlIdx !== null;
                const tr = trIdx !== null;
                const validCount = (bl ? 1 : 0) + (br ? 1 : 0) + (tl ? 1 : 0) + (tr ? 1 : 0);
                
                if (validCount === 3) {
                    // Mark the two edges adjacent to the missing corner
                    if (!bl) {
                        // Missing BL: mark bottom edge and left edge
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j, i + 1, j));     // bottom
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j, i, j + 1));     // left
                    } else if (!br) {
                        // Missing BR: mark bottom edge and right edge
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j, i + 1, j));     // bottom
                        diagonalBoundaryEdges.add(getGridEdgeKey(i + 1, j, i + 1, j + 1)); // right
                    } else if (!tl) {
                        // Missing TL: mark left edge and top edge
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j, i, j + 1));     // left
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j + 1, i + 1, j + 1)); // top
                    } else if (!tr) {
                        // Missing TR: mark right edge and top edge
                        diagonalBoundaryEdges.add(getGridEdgeKey(i + 1, j, i + 1, j + 1)); // right
                        diagonalBoundaryEdges.add(getGridEdgeKey(i, j + 1, i + 1, j + 1)); // top
                    }
                }
            }
        }
    }
    
    let wallCount = 0;
    
    // Second pass: Create H/V walls for boundary edges NOT in diagonalBoundaryEdges
    
    // Horizontal edges
    for (let j = 0; j < workingResolution; j++) {
        for (let i = 0; i < workingResolution - 1; i++) {
            const curr = getVertex(i, j);
            const next = getVertex(i + 1, j);
            
            if (curr !== null && next !== null) {
                // Check if this edge is part of a diagonal boundary
                const gridEdgeKey = getGridEdgeKey(i, j, i + 1, j);
                if (useSmoothBoundaries && diagonalBoundaryEdges.has(gridEdgeKey)) {
                    continue; // Skip - will be handled by diagonal wall
                }
                
                const currV = validVertices[curr];
                const nextV = validVertices[next];
                
                // Check neighbors - use AND logic (BOTH must be null for "missing")
                const above = j < workingResolution - 1 ? getVertex(i, j + 1) : null;
                const aboveNext = j < workingResolution - 1 ? getVertex(i + 1, j + 1) : null;
                const below = j > 0 ? getVertex(i, j - 1) : null;
                const belowNext = j > 0 ? getVertex(i + 1, j - 1) : null;
                
                const missingAbove = (above === null && aboveNext === null);
                const missingBelow = (below === null && belowNext === null);
                
                if (missingAbove && !missingBelow) {
                    // This edge is TOP of cell below - surface has curr→next, wall needs next→curr
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        addWallQuad(nextV.topIndex, nextV.bottomIndex, currV.topIndex, currV.bottomIndex);
                        wallCount++;
                    }
                } else if (missingBelow && !missingAbove) {
                    // This edge is BOTTOM of cell above - surface has next→curr, wall needs curr→next
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        addWallQuad(currV.topIndex, currV.bottomIndex, nextV.topIndex, nextV.bottomIndex);
                        wallCount++;
                    }
                } else if (j === 0 || j === workingResolution - 1) {
                    // Grid edge boundary
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        if (j === 0) {
                            // Bottom row - edge is BOTTOM of cell above, surface has next→curr, wall needs curr→next
                            addWallQuad(currV.topIndex, currV.bottomIndex, nextV.topIndex, nextV.bottomIndex);
                        } else {
                            // Top row - edge is TOP of cell below, surface has curr→next, wall needs next→curr
                            addWallQuad(nextV.topIndex, nextV.bottomIndex, currV.topIndex, currV.bottomIndex);
                        }
                        wallCount++;
                    }
                }
            }
        }
    }
    
    // Vertical edges
    for (let i = 0; i < workingResolution; i++) {
        for (let j = 0; j < workingResolution - 1; j++) {
            const curr = getVertex(i, j);
            const next = getVertex(i, j + 1);
            
            if (curr !== null && next !== null) {
                // Check if this edge is part of a diagonal boundary
                const gridEdgeKey = getGridEdgeKey(i, j, i, j + 1);
                if (useSmoothBoundaries && diagonalBoundaryEdges.has(gridEdgeKey)) {
                    continue; // Skip - will be handled by diagonal wall
                }
                
                const currV = validVertices[curr];
                const nextV = validVertices[next];
                
                // Check neighbors - use AND logic (BOTH must be null for "missing")
                const left = i > 0 ? getVertex(i - 1, j) : null;
                const leftNext = i > 0 ? getVertex(i - 1, j + 1) : null;
                const right = i < workingResolution - 1 ? getVertex(i + 1, j) : null;
                const rightNext = i < workingResolution - 1 ? getVertex(i + 1, j + 1) : null;
                
                const missingLeft = (left === null && leftNext === null);
                const missingRight = (right === null && rightNext === null);
                
                if (missingLeft && !missingRight) {
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        addWallQuad(nextV.topIndex, nextV.bottomIndex, currV.topIndex, currV.bottomIndex);
                        wallCount++;
                    }
                } else if (missingRight && !missingLeft) {
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        addWallQuad(currV.topIndex, currV.bottomIndex, nextV.topIndex, nextV.bottomIndex);
                        wallCount++;
                    }
                } else if (i === 0 || i === workingResolution - 1) {
                    // Grid edge boundary
                    const edgeKey = getEdgeKey(currV.topIndex, nextV.topIndex);
                    if (!processedEdges.has(edgeKey)) {
                        processedEdges.add(edgeKey);
                        if (i === 0) {
                            addWallQuad(nextV.topIndex, nextV.bottomIndex, currV.topIndex, currV.bottomIndex);
                        } else {
                            addWallQuad(currV.topIndex, currV.bottomIndex, nextV.topIndex, nextV.bottomIndex);
                        }
                        wallCount++;
                    }
                }
            }
        }
    }
    
    // Third pass: Add diagonal walls for 3-corner cells
    let diagonalWalls = 0;
    
    if (useSmoothBoundaries) {
        for (let j = 0; j < workingResolution - 1; j++) {
            for (let i = 0; i < workingResolution - 1; i++) {
                const blIdx = getVertex(i, j);
                const brIdx = getVertex(i + 1, j);
                const tlIdx = getVertex(i, j + 1);
                const trIdx = getVertex(i + 1, j + 1);
                
                const bl = blIdx !== null;
                const br = brIdx !== null;
                const tl = tlIdx !== null;
                const tr = trIdx !== null;
                const validCount = (bl ? 1 : 0) + (br ? 1 : 0) + (tl ? 1 : 0) + (tr ? 1 : 0);
                
                if (validCount === 3) {
                    if (!bl && br && tl && tr) {
                        // BL missing - surface has edge BR→TL, wall needs TL→BR
                        const vtl = validVertices[tlIdx!];
                        const vbr = validVertices[brIdx!];
                        const edgeKey = getEdgeKey(vtl.topIndex, vbr.topIndex);
                        if (!processedEdges.has(edgeKey)) {
                            processedEdges.add(edgeKey);
                            addWallQuad(vtl.topIndex, vtl.bottomIndex, vbr.topIndex, vbr.bottomIndex);
                            diagonalWalls++;
                        }
                    } else if (bl && !br && tl && tr) {
                        // BR missing - surface has edge TR→BL, wall needs BL→TR
                        const vtr = validVertices[trIdx!];
                        const vbl = validVertices[blIdx!];
                        const edgeKey = getEdgeKey(vbl.topIndex, vtr.topIndex);
                        if (!processedEdges.has(edgeKey)) {
                            processedEdges.add(edgeKey);
                            addWallQuad(vbl.topIndex, vbl.bottomIndex, vtr.topIndex, vtr.bottomIndex);
                            diagonalWalls++;
                        }
                    } else if (bl && br && !tl && tr) {
                        // TL missing - surface has edge BL→TR, wall needs TR→BL
                        const vbl = validVertices[blIdx!];
                        const vtr = validVertices[trIdx!];
                        const edgeKey = getEdgeKey(vbl.topIndex, vtr.topIndex);
                        if (!processedEdges.has(edgeKey)) {
                            processedEdges.add(edgeKey);
                            addWallQuad(vtr.topIndex, vtr.bottomIndex, vbl.topIndex, vbl.bottomIndex);
                            diagonalWalls++;
                        }
                    } else if (bl && br && tl && !tr) {
                        // TR missing - surface has edge TL→BR, wall needs BR→TL
                        const vtl = validVertices[tlIdx!];
                        const vbr = validVertices[brIdx!];
                        const edgeKey = getEdgeKey(vtl.topIndex, vbr.topIndex);
                        if (!processedEdges.has(edgeKey)) {
                            processedEdges.add(edgeKey);
                            addWallQuad(vbr.topIndex, vbr.bottomIndex, vtl.topIndex, vtl.bottomIndex);
                            diagonalWalls++;
                        }
                    }
                }
            }
        }
    }
    
    // Create geometry
    const finalIndices = new Uint32Array(indicesList);
    const finalPositions = new Float32Array(positions);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3));
    geometry.setIndex(new THREE.BufferAttribute(finalIndices, 1));
    geometry.computeVertexNormals();
    
    const endTime = performance.now();
    console.log(`[MeshGenerator] Created mesh: ${validVertices.length} valid points, ${indicesList.length / 3} triangles, ${wallCount} walls (${diagonalWalls} diagonal) [${(endTime - startTime).toFixed(0)}ms]`);
    
    // Perform manifold analysis
    const analysis = analyzeMeshManifold(geometry);
    logMeshAnalysis(analysis, 'Offset Mesh');
    
    return geometry;
}

// ============================================
// Heightmap Downsampling
// ============================================

function downsampleHeightmap(heightMap: Float32Array, resolution: number, factor: number) {
    const newResolution = Math.floor(resolution / factor);
    const newHeightMap = new Float32Array(newResolution * newResolution);
    
    for (let j = 0; j < newResolution; j++) {
        for (let i = 0; i < newResolution; i++) {
            const srcJ = j * factor;
            const srcI = i * factor;
            
            let sum = 0;
            let count = 0;
            
            for (let dj = 0; dj < factor; dj++) {
                for (let di = 0; di < factor; di++) {
                    const sj = Math.min(resolution - 1, srcJ + dj);
                    const si = Math.min(resolution - 1, srcI + di);
                    sum += heightMap[sj * resolution + si];
                    count++;
                }
            }
            
            newHeightMap[j * newResolution + i] = sum / count;
        }
    }
    
    return {
        heightMap: newHeightMap,
        resolution: newResolution
    };
}

export function calculateOptimalMeshSettings(resolution: number, heightMap: Float32Array): MeshGeneratorOptions & { quality: string; estimatedVertices: number; estimatedTriangles: number } {
    const MAX_VERTICES = 2000000;
    const totalVertices = resolution * resolution;
    
    let downsampleFactor = 2;
    let quality = 'optimized';
    
    if (totalVertices > MAX_VERTICES) {
        const criticalDownsample = Math.ceil(Math.sqrt(totalVertices / MAX_VERTICES));
        downsampleFactor = Math.max(2, criticalDownsample);
        quality = 'auto-reduced';
    }
    
    const effectiveResolution = Math.floor(resolution / downsampleFactor);
    const estimatedVertices = effectiveResolution * effectiveResolution * 2;
    const estimatedTriangles = effectiveResolution * effectiveResolution * 4;
    
    return {
        downsampleFactor,
        effectiveResolution,
        useSmoothBoundaries: true,
        quality,
        estimatedVertices,
        estimatedTriangles
    };
}
