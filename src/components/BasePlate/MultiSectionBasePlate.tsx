/**
 * MultiSectionBasePlate
 * 
 * Component for rendering multi-section baseplates.
 * Each section is rendered as a separate extruded rectangle.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import type { BasePlateSection, BasePlateMaterial } from './types';

interface MultiSectionBasePlateProps {
  /** Array of sections to render */
  sections: BasePlateSection[];
  /** Thickness of the baseplate in Y direction (mm) */
  depth: number;
  /** Material appearance */
  material?: BasePlateMaterial;
  /** Whether the baseplate is selected */
  selected?: boolean;
  /** Callback when baseplate is clicked */
  onSelect?: () => void;
  /** ID of the selected section for highlighting */
  selectedSectionId?: string | null;
  /** Callback when a section is double-clicked */
  onSectionDoubleClick?: (sectionId: string) => void;
  /** Ref to the group for external access */
  groupRef?: React.RefObject<THREE.Group>;
}

// Double-click threshold in milliseconds
const DOUBLE_CLICK_THRESHOLD_MS = 300;

// Material configurations
const MATERIAL_CONFIGS = {
  wood: { color: 0x8B4513, roughness: 0.8, metalness: 0.1 },
  plastic: { color: 0x333333, roughness: 0.3, metalness: 0.0 },
  metal: { color: 0x888888, roughness: 0.7, metalness: 0.0 },
} as const;

// Selection colors
const COLORS = {
  selected: 0x00ff88,
  hover: 0x4488ff,
  selectedEmissive: 0x004422,
} as const;

/**
 * Gets material configuration for a given material type.
 */
const getMaterialConfig = (material: BasePlateMaterial) => {
  return MATERIAL_CONFIGS[material] || MATERIAL_CONFIGS.metal;
};

/**
 * Calculates rectangle dimensions from section bounds.
 */
const getSectionDimensions = (section: BasePlateSection) => {
  const width = section.maxX - section.minX;
  const height = section.maxZ - section.minZ;
  const centerX = (section.minX + section.maxX) / 2;
  const centerZ = (section.minZ + section.maxZ) / 2;
  
  return { width, height, centerX, centerZ };
};

/**
 * Creates a rounded rectangle shape with smooth corners.
 * @param width - Total width of the rectangle
 * @param height - Total height of the rectangle
 * @param cornerRadiusFactor - Factor to determine corner radius (0-1)
 */
const createRoundedRectShape = (
  width: number,
  height: number,
  cornerRadiusFactor: number = 0.08
): THREE.Shape => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = Math.min(width, height) * cornerRadiusFactor;
  const clampedRadius = Math.min(radius, halfWidth, halfHeight);
  
  const shape = new THREE.Shape();
  
  // Start from bottom-left, move clockwise
  shape.moveTo(-halfWidth + clampedRadius, -halfHeight);
  shape.lineTo(halfWidth - clampedRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + clampedRadius);
  shape.lineTo(halfWidth, halfHeight - clampedRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - clampedRadius, halfHeight);
  shape.lineTo(-halfWidth + clampedRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - clampedRadius);
  shape.lineTo(-halfWidth, -halfHeight + clampedRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + clampedRadius, -halfHeight);
  
  return shape;
};

/**
 * Creates an extruded geometry with chamfered edges for a baseplate section.
 * @param width - Width in the X direction
 * @param height - Height in the Z direction
 * @param depth - Extrusion depth in the Y direction
 * @param chamferSizeFactor - Factor to determine chamfer size (0-1)
 */
const createExtrudedSection = (
  width: number,
  height: number,
  depth: number,
  chamferSizeFactor: number = 0.15
): THREE.BufferGeometry => {
  const shape = createRoundedRectShape(width, height);
  
  const chamferSize = Math.min(1.0, depth * chamferSizeFactor);
  const extrudeDepth = Math.max(0.1, depth - 2 * chamferSize);
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: chamferSize,
    bevelSize: chamferSize,
    bevelSegments: 1,
  });
  
  // Transform from Z-up to Y-up coordinate system
  geometry.rotateX(-Math.PI / 2);
  // Position so bottom face sits at Y=0
  geometry.translate(0, chamferSize, 0);
  
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  
  return geometry;
};

const MultiSectionBasePlate: React.FC<MultiSectionBasePlateProps> = ({
  sections,
  depth,
  material = 'metal',
  selected = false,
  onSelect,
  selectedSectionId = null,
  onSectionDoubleClick,
  groupRef,
}) => {
  // Track last click time for each section for double-click detection
  const lastClickTimesRef = useRef<Map<string, number>>(new Map());

  // Handle section click for double-click detection
  const handleSectionClick = useCallback(
    (event: ThreeEvent<MouseEvent>, sectionId: string) => {
      event.stopPropagation();
      
      const now = Date.now();
      const lastClickTime = lastClickTimesRef.current.get(sectionId) || 0;
      const timeSinceLastClick = now - lastClickTime;
      
      if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD_MS) {
        // Double-click detected
        onSectionDoubleClick?.(sectionId);
        lastClickTimesRef.current.set(sectionId, 0); // Reset to prevent triple-click
      } else {
        lastClickTimesRef.current.set(sectionId, now);
        onSelect?.();
      }
    },
    [onSectionDoubleClick, onSelect]
  );

  // Get material configuration
  const materialConfig = useMemo(() => getMaterialConfig(material), [material]);

  // Create geometries for each section
  const sectionMeshes = useMemo(
    () =>
      sections.map((section) => {
        const { width, height, centerX, centerZ } = getSectionDimensions(section);
        const geometry = createExtrudedSection(width, height, depth);
        
        return {
          id: section.id,
          geometry,
          position: new THREE.Vector3(centerX, 0, centerZ),
        };
      }),
    [sections, depth]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {sectionMeshes.map((meshData) => {
        const isSelected = selectedSectionId === meshData.id;
        const baseColor = isSelected ? COLORS.selected : (selected ? COLORS.hover : materialConfig.color);
        
        return (
          <mesh
            key={meshData.id}
            geometry={meshData.geometry}
            position={meshData.position}
            receiveShadow
            castShadow
            onClick={(e) => handleSectionClick(e, meshData.id)}
          >
            <meshStandardMaterial
              color={baseColor}
              roughness={materialConfig.roughness}
              metalness={materialConfig.metalness}
              emissive={isSelected ? COLORS.selectedEmissive : 0x000000}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default MultiSectionBasePlate;
