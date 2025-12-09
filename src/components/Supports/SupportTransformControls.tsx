/**
 * SupportTransformControls
 * 
 * Transform controls for supports using PivotControls from @react-three/drei.
 * Allows XZ plane translation, Y-axis height adjustment, and Y-axis rotation.
 * Styled consistently with SelectableTransformControls for parts.
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AnySupport } from './types';

interface SupportTransformControlsProps {
  support: AnySupport;
  baseTopY: number;
  onTransformChange: (newCenter: THREE.Vector2, rotationY?: number, height?: number) => void;
  onTransformEnd: (newCenter: THREE.Vector2, rotationY?: number, height?: number) => void;
  onDeselect: () => void;
}

// Reusable THREE.js objects to avoid allocations
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempEuler = new THREE.Euler();

const SupportTransformControls: React.FC<SupportTransformControlsProps> = ({
  support,
  baseTopY,
  onTransformChange,
  onTransformEnd,
  onDeselect,
}) => {
  const { gl } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);
  const initialCenterRef = useRef<THREE.Vector2 | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialHeightRef = useRef<number>(0);
  
  const center = (support as any).center as THREE.Vector2;
  const effectiveBaseY = (support as any).baseY ?? baseTopY;
  const supportHeight = (support as any).height ?? 10;
  const currentRotationY = (support as any).rotationY ?? 0;
  
  // Position the gizmo at the top of the support
  const gizmoY = effectiveBaseY + supportHeight + 5;
  
  // Gizmo scale based on support size
  const gizmoScale = useMemo(() => {
    const supportRadius = (support as any).radius ?? (support as any).width ?? 10;
    return Math.max(supportRadius * 2, 25);
  }, [support]);

  // Handle drag - extract transform from pivot matrix
  const handleDrag = useCallback((localMatrix: THREE.Matrix4) => {
    if (!initialCenterRef.current) return;
    
    // Decompose the local matrix (relative transform from start)
    localMatrix.decompose(tempPosition, tempQuaternion, tempScale);
    tempEuler.setFromQuaternion(tempQuaternion, 'YXZ');
    
    // The PivotControls gives us world-aligned deltas
    // Simply add position deltas to initial position
    const newCenter = new THREE.Vector2(
      initialCenterRef.current.x + tempPosition.x,
      initialCenterRef.current.y + tempPosition.z // Vector2.y = world Z
    );
    // Add rotation delta to initial rotation
    const newRotationY = initialRotationRef.current + tempEuler.y;
    // Add Y delta to initial height (with minimum constraint)
    const newHeight = Math.max(1, initialHeightRef.current + tempPosition.y);
    
    onTransformChange(newCenter, newRotationY, newHeight);
  }, [onTransformChange]);

  // Drag handlers
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    initialCenterRef.current = center.clone();
    initialRotationRef.current = currentRotationY;
    initialHeightRef.current = supportHeight;
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: true } }));
    gl.domElement.style.cursor = 'grabbing';
  }, [gl, center, currentRotationY, supportHeight]);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: false } }));
    gl.domElement.style.cursor = 'auto';
    
    // Emit final transform with current values
    const currentCenter = (support as any).center as THREE.Vector2;
    const rotationY = (support as any).rotationY ?? 0;
    const height = (support as any).height ?? 10;
    onTransformEnd(currentCenter, rotationY, height);
    
    initialCenterRef.current = null;
    initialHeightRef.current = 0;
  }, [gl, onTransformEnd, support]);

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
  
  // Close when another pivot control (part transform) is activated
  useEffect(() => {
    const handleOtherActivated = () => {
      onDeselect();
    };
    window.addEventListener('pivot-control-activated', handleOtherActivated);
    return () => window.removeEventListener('pivot-control-activated', handleOtherActivated);
  }, [onDeselect]);

  return (
    <group position={[center.x, gizmoY, center.y]}>
      <PivotControls
        ref={pivotRef}
        scale={gizmoScale}
        lineWidth={4}
        depthTest={false}
        fixed={false}
        visible={true}
        // Enable all axes to show XZ planar control (the square)
        // Y movement is ignored in the drag handler
        activeAxes={[true, true, true]}
        axisColors={['#ff4060', '#40ff60', '#4080ff']}
        hoveredColor="#ffff40"
        annotations={true}
        annotationsClass="pivot-annotation"
        autoTransform={false}
        disableScaling={true}
        disableSliders={true}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Invisible anchor point - PivotControls needs a child */}
        <mesh visible={false}>
          <sphereGeometry args={[0.1]} />
        </mesh>
      </PivotControls>
      
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
    </group>
  );
};

export default SupportTransformControls;
