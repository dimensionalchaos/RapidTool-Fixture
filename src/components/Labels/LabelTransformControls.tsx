/**
 * LabelTransformControls
 * 
 * Transform controls for labels using PivotControls from @react-three/drei.
 * Allows XZ plane translation (same as supports), Y-axis rotation for orientation,
 * and Y-axis height controls the emboss depth.
 * 
 * The gizmo stays UPRIGHT (like supports) even though the label lies flat.
 * - X/Z axes: move label on the baseplate surface
 * - Y axis: adjust emboss depth
 * - Y rotation: rotate label text orientation
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LabelConfig, MIN_DEPTH, MAX_DEPTH } from './types';

interface LabelTransformControlsProps {
  label: LabelConfig;
  onTransformChange: (position: THREE.Vector3, rotation: THREE.Euler, depth?: number) => void;
  onTransformEnd: (position: THREE.Vector3, rotation: THREE.Euler, depth?: number) => void;
  onDeselect: () => void;
}

// Reusable THREE.js objects to avoid allocations
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

const LabelTransformControls: React.FC<LabelTransformControlsProps> = ({
  label,
  onTransformChange,
  onTransformEnd,
  onDeselect,
}) => {
  const { gl } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Mesh>(null);
  const isDraggingRef = useRef(false);
  
  // Store initial group transform at drag start to prevent feedback loop
  const dragStartGroupPos = useRef<THREE.Vector3 | null>(null);
  const dragStartGroupRotY = useRef<number>(0);
  const dragStartDepth = useRef<number>(label.depth);
  const dragStartAnchorY = useRef<number>(0); // Track starting anchor Y for smooth depth adjustment

  // Ensure label position/rotation are THREE objects
  const labelPosition = useMemo(() => {
    const pos = label.position;
    if (pos instanceof THREE.Vector3) return pos;
    return new THREE.Vector3((pos as any).x, (pos as any).y, (pos as any).z);
  }, [label.position]);

  const labelRotation = useMemo(() => {
    const rot = label.rotation;
    if (rot instanceof THREE.Euler) return rot;
    return new THREE.Euler((rot as any).x, (rot as any).y, (rot as any).z);
  }, [label.rotation]);

  // Position the gizmo slightly above the label (like supports)
  const gizmoY = labelPosition.y + label.depth + 5;
  
  // The gizmo's Y rotation corresponds to label's Z rotation when label is flat
  // (label lies flat with X rotation of -PI/2, so its "spin" is around world Y)
  const currentRotationY = labelRotation.z; // Label's Z rotation becomes Y rotation in world space

  // Use locked position during drag to prevent janky feedback loop
  const displayPos = isDraggingRef.current && dragStartGroupPos.current 
    ? dragStartGroupPos.current 
    : new THREE.Vector3(labelPosition.x, gizmoY, labelPosition.z);
  const displayRotY = isDraggingRef.current ? dragStartGroupRotY.current : currentRotationY;
  
  // Gizmo scale based on font size
  const gizmoScale = useMemo(() => {
    return Math.max(label.fontSize * 2, 20);
  }, [label.fontSize]);

  // Read world transform from the anchor mesh (inside PivotControls)
  const getTransformFromAnchor = useCallback(() => {
    if (!anchorRef.current) return null;
    
    anchorRef.current.updateMatrixWorld(true);
    anchorRef.current.getWorldPosition(tempPosition);
    anchorRef.current.getWorldQuaternion(tempQuaternion);
    tempEuler.setFromQuaternion(tempQuaternion, 'YXZ');
    
    // Calculate depth change from Y movement delta (smooth, no snapping)
    const yDelta = tempPosition.y - dragStartAnchorY.current;
    const newDepth = Math.max(MIN_DEPTH, Math.min(MAX_DEPTH, dragStartDepth.current + yDelta));
    
    // New position (XZ plane movement, Y stays at label surface)
    const newPosition = new THREE.Vector3(tempPosition.x, labelPosition.y, tempPosition.z);
    
    // Rotation - gizmo Y rotation maps to label Z rotation (label lies flat)
    // Label rotation: X = -PI/2 (flat), Y = 0, Z = rotation on surface
    const newRotation = new THREE.Euler(labelRotation.x, labelRotation.y, tempEuler.y);
    
    return { position: newPosition, rotation: newRotation, depth: newDepth };
  }, [labelPosition, labelRotation]);

  // Handle drag - read transform from anchor mesh
  const handleDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    const transform = getTransformFromAnchor();
    if (transform) {
      onTransformChange(transform.position, transform.rotation, transform.depth);
    }
  }, [getTransformFromAnchor, onTransformChange]);

  // Drag start - lock the group position to prevent feedback loop
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartGroupPos.current = new THREE.Vector3(labelPosition.x, gizmoY, labelPosition.z);
    dragStartGroupRotY.current = currentRotationY;
    dragStartDepth.current = label.depth;
    
    // Record anchor starting Y for smooth depth calculation
    if (anchorRef.current) {
      anchorRef.current.updateMatrixWorld(true);
      anchorRef.current.getWorldPosition(tempPosition);
      dragStartAnchorY.current = tempPosition.y;
    } else {
      dragStartAnchorY.current = gizmoY;
    }
    
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: true } }));
    gl.domElement.style.cursor = 'grabbing';
  }, [gl, labelPosition, gizmoY, currentRotationY, label.depth]);

  // Drag end - emit final transform and reset pivot
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragStartGroupPos.current = null;
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: false } }));
    gl.domElement.style.cursor = 'auto';
    
    // Read final transform from anchor
    const transform = getTransformFromAnchor();
    if (transform) {
      onTransformEnd(transform.position, transform.rotation, transform.depth);
    }
    
    // Reset pivot to identity after drag ends
    if (pivotRef.current) {
      pivotRef.current.matrix.identity();
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.rotation.set(0, 0, 0);
      pivotRef.current.scale.set(1, 1, 1);
      pivotRef.current.updateMatrix();
    }
  }, [gl, getTransformFromAnchor, onTransformEnd]);

  // Click outside to close - ONLY when clicking on UI elements, NOT on canvas
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // If click is on canvas, allow it (for camera controls) - don't deselect
      if (gl.domElement.contains(target) || gl.domElement === target) return;
      
      // If click is on UI elements (buttons, inputs, accordions, etc.), deselect
      if (target.closest('button, input, select, [role="button"], [role="slider"], [data-radix-collection-item], [class*="accordion"]')) {
        onDeselect();
      }
    };
    
    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => document.removeEventListener('mousedown', handleDocumentClick, true);
  }, [onDeselect, gl.domElement]);
  
  // Keyboard escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDeselect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeselect]);
  
  // Close when another pivot control is activated
  useEffect(() => {
    const handleOtherActivated = (e: CustomEvent) => {
      // Check if it's a different label or support being activated
      const detail = e.detail;
      if (detail?.labelId && detail.labelId !== label.id) {
        onDeselect();
      } else if (detail?.supportId) {
        onDeselect();
      }
    };
    window.addEventListener('pivot-control-activated', handleOtherActivated as EventListener);
    return () => window.removeEventListener('pivot-control-activated', handleOtherActivated as EventListener);
  }, [onDeselect, label.id]);

  return (
    <group 
      position={[displayPos.x, displayPos.y, displayPos.z]} 
      rotation={[0, displayRotY, 0]}
    >
      <PivotControls
        ref={pivotRef}
        scale={gizmoScale}
        lineWidth={4}
        depthTest={false}
        fixed={false}
        visible={true}
        activeAxes={[true, true, true]}
        axisColors={['#ff4060', '#40ff60', '#4080ff']}
        hoveredColor="#ffff40"
        annotations={true}
        annotationsClass="pivot-annotation"
        autoTransform={true}
        disableScaling={true}
        disableSliders={true}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Anchor mesh - we read world transform from this */}
        <mesh ref={anchorRef} visible={false}>
          <sphereGeometry args={[0.1]} />
        </mesh>
        
        {/* Close button at gizmo center */}
        <Html center style={{ pointerEvents: 'auto', userSelect: 'none' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeselect();
            }}
            className="w-6 h-6 flex items-center justify-center bg-slate-800/90 hover:bg-red-600 text-white rounded-full shadow-lg border border-slate-600 transition-colors text-xs"
            title="Close (Esc)"
          >
            ✕
          </button>
        </Html>
      </PivotControls>
    </group>
  );
};

export default LabelTransformControls;

