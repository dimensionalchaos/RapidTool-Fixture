import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BasePlateProps {
  type: 'rectangular' | 'convex-hull' | 'perforated-panel' | 'metal-wooden-plate';
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  position?: THREE.Vector3;
  material?: 'metal' | 'wood' | 'plastic';
  onSelect?: () => void;
  selected?: boolean;
  modelGeometry?: THREE.BufferGeometry; // For convex hull around model
  modelMatrixWorld?: THREE.Matrix4; // World transform of model for accurate hull
  modelOrigin?: THREE.Vector3; // Model world position so hull is relative to model
  oversizeXY?: number; // extra margin on XZ for convex hull
  pitch?: number; // perforated panel hole spacing
  holeDiameter?: number; // perforated panel hole diameter
  onPointerDown?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  onPointerUp?: (e: any) => void;
  meshRef?: React.RefObject<THREE.Mesh>;
}

const finalizeGeometry = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  if (typeof (geometry as any).computeBoundsTree === 'function') {
    (geometry as any).computeBoundsTree();
  }
  return geometry;
};

// Helper function to compute signed area of a polygon (positive = CCW, negative = CW)
const computeSignedArea = (polygon: Array<{x: number; y: number}>): number => {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];
    area += (curr.x * next.y - next.x * curr.y);
  }
  return area / 2;
};

// Helper function to offset a 2D polygon outward by a given distance
// Automatically detects winding order and offsets outward
const offsetPolygon = (polygon: Array<{x: number; y: number}>, distance: number): Array<{x: number; y: number}> => {
  if (polygon.length < 3 || distance === 0) return polygon;
  
  // Determine winding order: positive area = CCW, negative = CW
  const signedArea = computeSignedArea(polygon);
  const isCCW = signedArea >= 0;
  
  const result: Array<{x: number; y: number}> = [];
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];
    
    // Edge vectors (direction of traversal)
    const e1x = curr.x - prev.x;
    const e1y = curr.y - prev.y;
    const e2x = next.x - curr.x;
    const e2y = next.y - curr.y;
    
    // Normalize edge vectors
    const len1 = Math.hypot(e1x, e1y) || 1;
    const len2 = Math.hypot(e2x, e2y) || 1;
    const d1x = e1x / len1;
    const d1y = e1y / len1;
    const d2x = e2x / len2;
    const d2y = e2y / len2;
    
    // Outward normals - perpendicular to edge direction
    // For CCW polygon: outward is to the LEFT of the edge direction = (-dy, dx)
    // For CW polygon: outward is to the RIGHT of the edge direction = (dy, -dx)
    let out1x: number, out1y: number, out2x: number, out2y: number;
    if (isCCW) {
      out1x = -d1y; out1y = d1x;
      out2x = -d2y; out2y = d2x;
    } else {
      out1x = d1y; out1y = -d1x;
      out2x = d2y; out2y = -d2x;
    }
    
    // Average normal direction at vertex
    let avgX = out1x + out2x;
    let avgY = out1y + out2y;
    const avgLen = Math.hypot(avgX, avgY);
    
    if (avgLen < 0.001) {
      // Edges are nearly parallel (straight line), just offset along one normal
      result.push({
        x: curr.x + out1x * distance,
        y: curr.y + out1y * distance
      });
    } else {
      avgX /= avgLen;
      avgY /= avgLen;
      
      // Calculate miter length (how far to push the vertex)
      // miterLen = distance / cos(angle between normal and average)
      const dot = out1x * avgX + out1y * avgY;
      const miterLen = dot > 0.1 ? distance / dot : distance;
      
      // Clamp miter length to avoid spikes at sharp corners
      const clampedMiter = Math.min(miterLen, distance * 4);
      
      result.push({
        x: curr.x + avgX * clampedMiter,
        y: curr.y + avgY * clampedMiter
      });
    }
  }
  
  return result;
};

const BasePlate: React.FC<BasePlateProps> = ({
  type,
  width = 100,
  height = 100,
  depth = 10,
  radius = 50,
  position = new THREE.Vector3(0, 0, 0),
  material = 'metal',
  onSelect,
  selected = false,
  modelGeometry,
  modelMatrixWorld,
  modelOrigin,
  oversizeXY = 10,
  pitch = 20,
  holeDiameter = 6
  , onPointerDown, onPointerMove, onPointerUp,
  meshRef: externalMeshRef
}) => {
  const internalMeshRef = useRef<THREE.Mesh>(null);
  const meshRef = externalMeshRef || internalMeshRef;
  const groupRef = useRef<THREE.Group>(null);

  // Material properties based on type (with transparency for perforated panels)
  const materialProps = useMemo(() => {
    let base: any;
    switch (material) {
      case 'metal':
        base = {
          color: selected ? 0x0066cc : 0x888888,
          metalness: 0.8,
          roughness: 0.2,
          emissive: selected ? 0x001133 : 0x222222
        };
        break;
      case 'wood':
        base = {
          color: selected ? 0xcc6600 : 0x8B4513,
          metalness: 0.1,
          roughness: 0.8
        };
        break;
      case 'plastic':
        base = {
          color: selected ? 0x66cc00 : 0x333333,
          metalness: 0.0,
          roughness: 0.3
        };
        break;
      default:
        base = {
          color: 0x888888,
          metalness: 0.5,
          roughness: 0.5
        };
    }
    if (type === 'perforated-panel') {
      base = {
        ...base,
        transparent: true,
        opacity: 0.35,
      };
    }
    return base;
  }, [material, selected, type]);

  // Create geometry based on type
  const geometry = useMemo(() => {
    switch (type) {
      case 'convex-hull':
        if (modelGeometry && modelGeometry.attributes && modelGeometry.attributes.position) {
          try {
            // === STEP 1: Collect all XZ points from the model (top-down shadow) ===
            const positions = modelGeometry.attributes.position as THREE.BufferAttribute;
            const xzPoints: Array<{x: number; z: number}> = [];
            const dedupe = new Set<string>();
            const sampleStep = Math.max(1, Math.floor(positions.count / 5000));
            const v = new THREE.Vector3();
            
            for (let i = 0; i < positions.count; i += sampleStep) {
              v.set(positions.getX(i), positions.getY(i), positions.getZ(i));
              if (modelMatrixWorld) {
                v.applyMatrix4(modelMatrixWorld);
              }
              // Project to XZ plane (the floor)
              const key = `${Math.round(v.x * 100)}:${Math.round(v.z * 100)}`;
              if (!dedupe.has(key)) {
                dedupe.add(key);
                xzPoints.push({ x: v.x, z: v.z });
              }
            }

            if (xzPoints.length < 3) {
              throw new Error('Not enough points for convex hull');
            }

            // === STEP 2: Compute 2D convex hull using monotone chain ===
            // Sort points by x, then by z
            const sorted = xzPoints.slice().sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);
            
            // Cross product for 2D points (using x and z)
            const cross = (o: {x: number; z: number}, a: {x: number; z: number}, b: {x: number; z: number}) => 
              (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
            
            // Build lower hull
            const lower: Array<{x: number; z: number}> = [];
            for (const p of sorted) {
              while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
              }
              lower.push(p);
            }
            
            // Build upper hull
            const upper: Array<{x: number; z: number}> = [];
            for (let i = sorted.length - 1; i >= 0; i--) {
              const p = sorted[i];
              while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
              }
              upper.push(p);
            }
            
            // Concatenate hulls (remove last point of each as it's repeated)
            // This produces a CCW hull in XZ space
            const hull = lower.slice(0, lower.length - 1).concat(upper.slice(0, upper.length - 1));

            // === STEP 3: Apply padding by offsetting each vertex outward ===
            const margin = typeof oversizeXY === 'number' ? oversizeXY : 0;
            let finalHull = hull;
            
            if (margin > 0) {
              // Compute centroid of the hull
              let cx = 0, cz = 0;
              for (const p of hull) {
                cx += p.x;
                cz += p.z;
              }
              cx /= hull.length;
              cz /= hull.length;
              
              // Offset each vertex outward from centroid by margin
              // This is a simple radial offset that always expands the polygon
              finalHull = hull.map(p => {
                const dx = p.x - cx;
                const dz = p.z - cz;
                const dist = Math.hypot(dx, dz);
                if (dist < 0.001) return p; // Point is at centroid, don't move
                // Move point outward by margin amount
                const scale = (dist + margin) / dist;
                return {
                  x: cx + dx * scale,
                  z: cz + dz * scale
                };
              });
            }

            // === STEP 4: Create THREE.Shape ===
            // Shape is defined in XY plane, we'll rotate to XZ after extrusion
            // Map our XZ coordinates to Shape's XY: shape.x = world.x, shape.y = -world.z
            // We negate Z because rotateX(-PI/2) will flip the Y axis
            const shape = new THREE.Shape();
            shape.moveTo(finalHull[0].x, -finalHull[0].z);
            for (let i = 1; i < finalHull.length; i++) {
              shape.lineTo(finalHull[i].x, -finalHull[i].z);
            }
            shape.closePath();

            // === STEP 5: Extrude and position with bevel/chamfer ===
            // Calculate bevel size based on depth (similar to rectangular baseplate)
            const bevelThickness = Math.min(0.6, depth * 0.15);
            const bevelSize = Math.min(0.8, depth * 0.1);
            // Reduce extrusion depth so total height (including bevels) equals specified depth
            const extrudeDepth = Math.max(0.1, depth - 2 * bevelThickness);
            
            const g = new THREE.ExtrudeGeometry(shape, { 
              depth: extrudeDepth, 
              bevelEnabled: true,
              bevelThickness: bevelThickness,
              bevelSize: bevelSize,
              bevelSegments: 2,
            });
            
            // After rotation, geometry spans Y=-bevelThickness to Y=extrudeDepth+bevelThickness
            // = Y=-bevelThickness to Y=(depth-2*bevel)+bevel = Y=-bevelThickness to Y=depth-bevelThickness
            // Translate up by bevelThickness so bottom sits at Y=0, top at Y=depth
            g.rotateX(-Math.PI / 2);
            g.translate(0, bevelThickness, 0);
            
            return finalizeGeometry(g);
          } catch (error) {
            console.warn('Error creating convex hull geometry, falling back to rectangular:', error);
          }
        }
        // Fallback to simple rounded rectangle if no model geometry or error
        const fallbackWidth = width || 100;
        const fallbackHeight = height || 100;
        const hullShape = new THREE.Shape();
        const cornerRadius = Math.min(fallbackWidth, fallbackHeight) * 0.1;

        hullShape.moveTo(-fallbackWidth/2 + cornerRadius, -fallbackHeight/2);
        hullShape.lineTo(fallbackWidth/2 - cornerRadius, -fallbackHeight/2);
        hullShape.quadraticCurveTo(fallbackWidth/2, -fallbackHeight/2, fallbackWidth/2, -fallbackHeight/2 + cornerRadius);
        hullShape.lineTo(fallbackWidth/2, fallbackHeight/2 - cornerRadius);
        hullShape.quadraticCurveTo(fallbackWidth/2, fallbackHeight/2, fallbackWidth/2 - cornerRadius, fallbackHeight/2);
        hullShape.lineTo(-fallbackWidth/2 + cornerRadius, fallbackHeight/2);
        hullShape.quadraticCurveTo(-fallbackWidth/2, fallbackHeight/2, -fallbackWidth/2, fallbackHeight/2 - cornerRadius);
        hullShape.lineTo(-fallbackWidth/2, -fallbackHeight/2 + cornerRadius);
        hullShape.quadraticCurveTo(-fallbackWidth/2, -fallbackHeight/2, -fallbackWidth/2 + cornerRadius, -fallbackHeight/2);

        const g = new THREE.ExtrudeGeometry(hullShape, {
          depth: depth,
          bevelEnabled: false
        });
        // rotateX(-PI/2): extrusion from Z=0..depth becomes Y=0..depth
        // No pre-translation needed - bottom at Y=0, top at Y=depth
        g.rotateX(-Math.PI / 2);
        return finalizeGeometry(g);

      case 'perforated-panel':
        // Rounded rectangle with slight bevel for soft edges
        {
          const cornerRadius = Math.min(width, height) * 0.08;
          const shape = new THREE.Shape();
          const hw = width / 2;
          const hh = height / 2;
          const r = Math.min(cornerRadius, hw, hh);
          shape.moveTo(-hw + r, -hh);
          shape.lineTo(hw - r, -hh);
          shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
          shape.lineTo(hw, hh - r);
          shape.quadraticCurveTo(hw, hh, hw - r, hh);
          shape.lineTo(-hw + r, hh);
          shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
          shape.lineTo(-hw, -hh + r);
          shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

          const bevelThickness = Math.min(0.6, depth * 0.15);
          // Reduce extrusion depth so total height (including bevels) equals specified depth
          const extrudeDepth = Math.max(0.1, depth - 2 * bevelThickness);
          const g = new THREE.ExtrudeGeometry(shape, {
            depth: extrudeDepth,
            bevelEnabled: true,
            bevelThickness: bevelThickness,
            bevelSize: Math.min(0.8, r * 0.25),
            bevelSegments: 2,
          });
          g.rotateX(-Math.PI / 2);
          // Translate up by bevelThickness so bottom sits at Y=0, top at Y=depth
          g.translate(0, bevelThickness, 0);
          return finalizeGeometry(g);
        }

      case 'metal-wooden-plate':
        {
          const cornerRadius = Math.min(width, height) * 0.06;
          const shape = new THREE.Shape();
          const hw = width / 2;
          const hh = height / 2;
          const r = Math.min(cornerRadius, hw, hh);
          shape.moveTo(-hw + r, -hh);
          shape.lineTo(hw - r, -hh);
          shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
          shape.lineTo(hw, hh - r);
          shape.quadraticCurveTo(hw, hh, hw - r, hh);
          shape.lineTo(-hw + r, hh);
          shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
          shape.lineTo(-hw, -hh + r);
          shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

          const bevelThickness = Math.min(0.6, depth * 0.15);
          // Reduce extrusion depth so total height (including bevels) equals specified depth
          const extrudeDepth = Math.max(0.1, depth - 2 * bevelThickness);
          const g = new THREE.ExtrudeGeometry(shape, {
            depth: extrudeDepth,
            bevelEnabled: true,
            bevelThickness: bevelThickness,
            bevelSize: Math.min(0.8, r * 0.2),
            bevelSegments: 2,
          });
          g.rotateX(-Math.PI / 2);
          // Translate up by bevelThickness so bottom sits at Y=0, top at Y=depth
          g.translate(0, bevelThickness, 0);
          return finalizeGeometry(g);
        }

      case 'rectangular':
      default:
        {
          const cornerRadius = Math.min(width, height) * 0.08;
          const shape = new THREE.Shape();
          const hw = width / 2;
          const hh = height / 2;
          const r = Math.min(cornerRadius, hw, hh);
          shape.moveTo(-hw + r, -hh);
          shape.lineTo(hw - r, -hh);
          shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
          shape.lineTo(hw, hh - r);
          shape.quadraticCurveTo(hw, hh, hw - r, hh);
          shape.lineTo(-hw + r, hh);
          shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
          shape.lineTo(-hw, -hh + r);
          shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

          const bevelThickness = Math.min(0.6, depth * 0.15);
          // Reduce extrusion depth so total height (including bevels) equals specified depth
          const extrudeDepth = Math.max(0.1, depth - 2 * bevelThickness);
          const g = new THREE.ExtrudeGeometry(shape, {
            depth: extrudeDepth,
            bevelEnabled: true,
            bevelThickness: bevelThickness,
            bevelSize: Math.min(0.8, r * 0.25),
            bevelSegments: 2,
          });
          g.rotateX(-Math.PI / 2);
          // Translate up by bevelThickness so bottom sits at Y=0, top at Y=depth
          g.translate(0, bevelThickness, 0);
          return finalizeGeometry(g);
        }
    }
  }, [type, width, height, depth, radius, modelGeometry, modelMatrixWorld, modelOrigin, oversizeXY]);

  // Update geometry when props change
  React.useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;
    }
  }, [geometry]);

  // Add perforation holes for perforated panel type
  const perforationMeshes = useMemo(() => {
    if (type !== 'perforated-panel') return null;

    const meshes: JSX.Element[] = [];
    const holeSpacing = typeof pitch === 'number' ? pitch : 20;
    const holeRadius = (typeof holeDiameter === 'number' ? holeDiameter : 6) / 2;
    const panelWidth = width;
    const panelHeight = height;

    for (let x = -panelWidth/2 + holeSpacing; x < panelWidth/2; x += holeSpacing) {
      for (let y = -panelHeight/2 + holeSpacing; y < panelHeight/2; y += holeSpacing) {
        meshes.push(
          <mesh key={`hole-${x}-${y}`} position={[x, depth/2 + 0.1, y]}>
            <cylinderGeometry args={[holeRadius, holeRadius, 0.5, 12]} />
            <meshBasicMaterial color={0x444444} />
          </mesh>
        );
      }
    }

    return meshes;
  }, [type, width, height, depth, pitch, holeDiameter]);

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onClick={onSelect}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        geometry={geometry}
        material={new THREE.MeshStandardMaterial(materialProps)}
        receiveShadow
        castShadow
      />

      {/* Add perforation holes for perforated panel */}
      {perforationMeshes && perforationMeshes.map((mesh, index) => (
        <React.Fragment key={index}>
          {mesh}
        </React.Fragment>
      ))}

      {/* Add visual indicators for different types */}
      {selected && (
        <mesh position={[0, depth/2 + 1, 0]}>
          <ringGeometry args={[radius * 0.8, radius * 0.9, 32]} />
          <meshBasicMaterial color={0x00ff00} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

export default BasePlate;



