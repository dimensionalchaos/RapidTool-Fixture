/**
 * TransformGizmo - A clean, production-ready transform control component
 * 
 * Features:
 * - Double-click activation via custom event
 * - PivotControls for translate/rotate operations
 * - Escape key or close button to deactivate
 * - Maintains camera view during state changes
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface TransformData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface TransformGizmoProps {
  /** Reference to the mesh being transformed */
  meshRef: React.RefObject<THREE.Mesh>;
  /** Whether the gizmo system is enabled */
  enabled: boolean;
  /** Callback when transform changes during drag */
  onTransformChange?: (transform: TransformData) => void;
  /** Callback when gizmo activation state changes */
  onActiveChange?: (active: boolean) => void;
  /** Child elements (typically the mesh) */
  children?: React.ReactNode;
}

interface MeshBounds {
  center: THREE.Vector3;
  size: THREE.Vector3;
  radius: number;
}

// ============================================================================
// Constants
// ============================================================================

const GIZMO_CONFIG = {
  lineWidth: 4,
  minScale: 25,
  scaleMultiplier: 0.75,
  axisColors: ['#ff4060', '#40ff60', '#4080ff'] as [string, string, string],
  hoveredColor: '#ffff40',
  closeButtonOffset: 1.2,
} as const;

const EVENTS = {
  meshDoubleClick: 'mesh-double-click',
  disableOrbitControls: 'disable-orbit-controls',
} as const;

// ============================================================================
// Component
// ============================================================================

const TransformGizmo: React.FC<TransformGizmoProps> = ({
  meshRef,
  enabled,
  onTransformChange,
  onActiveChange,
  children,
}) => {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const lastTransformRef = useRef<TransformData | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [bounds, setBounds] = useState<MeshBounds | null>(null);

  // --------------------------------------------------------------------------
  // Bounds Calculation (per-frame)
  // --------------------------------------------------------------------------
  
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !enabled) return;
    
    mesh.updateMatrixWorld(true);
    
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;
    
    // Only update state if bounds changed significantly
    const boundsChanged = !bounds || 
      Math.abs(bounds.radius - radius) > 0.001 ||
      bounds.center.distanceTo(center) > 0.001;
    
    if (boundsChanged) {
      setBounds({ center: center.clone(), size: size.clone(), radius });
    }
    
    // Track transform changes for parent
    if (onTransformChange) {
      const current: TransformData = {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
      };
      
      const last = lastTransformRef.current;
      const hasChanged = !last ||
        !current.position.equals(last.position) ||
        current.rotation.x !== last.rotation.x ||
        current.rotation.y !== last.rotation.y ||
        current.rotation.z !== last.rotation.z;
      
      if (hasChanged) {
        lastTransformRef.current = {
          position: current.position.clone(),
          rotation: current.rotation.clone(),
        };
        onTransformChange(current);
      }
    }
  });

  // --------------------------------------------------------------------------
  // Activation Handler (via custom event from mesh)
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleActivation = () => {
      if (isActive) return;
      setIsActive(true);
      onActiveChange?.(true);
    };
    
    window.addEventListener(EVENTS.meshDoubleClick, handleActivation);
    return () => window.removeEventListener(EVENTS.meshDoubleClick, handleActivation);
  }, [enabled, isActive, onActiveChange]);

  // --------------------------------------------------------------------------
  // Keyboard Handler (Escape to close)
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActive(false);
        onActiveChange?.(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onActiveChange]);

  // --------------------------------------------------------------------------
  // Drag Handlers
  // --------------------------------------------------------------------------
  
  const handleDragStart = useCallback(() => {
    window.dispatchEvent(new CustomEvent(EVENTS.disableOrbitControls, { 
      detail: { disabled: true } 
    }));
    gl.domElement.style.cursor = 'grabbing';
  }, [gl]);

  const handleDragEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent(EVENTS.disableOrbitControls, { 
      detail: { disabled: false } 
    }));
    gl.domElement.style.cursor = 'auto';
  }, [gl]);

  const handleDrag = useCallback((_local: THREE.Matrix4, _deltaL: THREE.Matrix4, world: THREE.Matrix4) => {
    if (!onTransformChange) return;
    
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    world.decompose(position, quaternion, scale);
    
    onTransformChange({
      position,
      rotation: new THREE.Euler().setFromQuaternion(quaternion),
    });
  }, [onTransformChange]);

  // --------------------------------------------------------------------------
  // Close Handler
  // --------------------------------------------------------------------------
  
  const handleClose = useCallback(() => {
    setIsActive(false);
    onActiveChange?.(false);
  }, [onActiveChange]);

  // --------------------------------------------------------------------------
  // Computed Values
  // --------------------------------------------------------------------------
  
  const gizmoScale = useMemo(() => {
    return bounds 
      ? Math.max(bounds.radius * GIZMO_CONFIG.scaleMultiplier, GIZMO_CONFIG.minScale) 
      : GIZMO_CONFIG.minScale * 2;
  }, [bounds]);

  const closeButtonPosition = useMemo((): [number, number, number] => {
    if (!bounds) return [0, 0, 0];
    const offset = bounds.radius * GIZMO_CONFIG.closeButtonOffset;
    return [
      bounds.center.x + offset,
      bounds.center.y + offset,
      bounds.center.z,
    ];
  }, [bounds]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  
  return (
    <group ref={groupRef}>
      <PivotControls
        scale={gizmoScale}
        lineWidth={GIZMO_CONFIG.lineWidth}
        depthTest={false}
        fixed={false}
        axisColors={GIZMO_CONFIG.axisColors}
        hoveredColor={GIZMO_CONFIG.hoveredColor}
        annotations={isActive}
        annotationsClass="pivot-annotation"
        autoTransform
        anchor={[0, 0, 0]}
        disableAxes={!isActive}
        disableSliders={!isActive}
        disableRotations={!isActive}
        disableScaling
        visible={isActive}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrag={handleDrag}
      >
        {children}
      </PivotControls>
      
      {isActive && bounds && (
        <Html position={closeButtonPosition} center style={{ pointerEvents: 'auto', userSelect: 'none' }}>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center bg-slate-800/90 hover:bg-red-600 text-white rounded-full shadow-lg border border-slate-600 transition-colors text-xs"
            title="Close (Esc)"
            aria-label="Close transform gizmo"
          >
            ✕
          </button>
        </Html>
      )}
    </group>
  );
};

export default TransformGizmo;
