import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PivotControls, Html } from '@react-three/drei';
import * as THREE from 'three';

interface SelectableTransformControlsProps {
  meshRef: React.RefObject<THREE.Mesh>;
  enabled: boolean;
  onTransformChange?: (transform: { position: THREE.Vector3; rotation: THREE.Euler }) => void;
  onSelectionChange?: (selected: boolean) => void;
  children?: React.ReactNode;
}

/**
 * A transform control system that:
 * 1. Double-click on mesh to show PivotControls gizmo (translate + rotate together)
 * 2. Click X button or Escape to deselect
 */
const SelectableTransformControls: React.FC<SelectableTransformControlsProps> = ({
  meshRef,
  enabled,
  onTransformChange,
  onSelectionChange,
  children,
}) => {
  const { gl, camera } = useThree();
  const [isActive, setIsActive] = useState(false);
  const [bounds, setBounds] = useState<{ center: THREE.Vector3; size: THREE.Vector3; radius: number } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const groupRef = useRef<THREE.Group>(null);
  
  // Track the last transform to detect changes
  const lastTransformRef = useRef<{ position: THREE.Vector3; rotation: THREE.Euler } | null>(null);

  // Calculate mesh bounds continuously via useFrame
  useFrame(() => {
    if (!meshRef.current || !enabled) return;
    
    const mesh = meshRef.current;
    mesh.updateMatrixWorld(true);
    
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    
    const radius = Math.max(size.x, size.y, size.z) / 2;
    
    // Always update bounds - they might change due to transformations
    if (!bounds || 
        Math.abs(bounds.radius - radius) > 0.001 ||
        bounds.center.distanceTo(center) > 0.001) {
      setBounds({ center: center.clone(), size: size.clone(), radius });
    }
    
    // Track transform changes for parent component
    if (onTransformChange) {
      const currentTransform = {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
      };
      
      const lastTransform = lastTransformRef.current;
      if (
        !lastTransform ||
        !currentTransform.position.equals(lastTransform.position) ||
        currentTransform.rotation.x !== lastTransform.rotation.x ||
        currentTransform.rotation.y !== lastTransform.rotation.y ||
        currentTransform.rotation.z !== lastTransform.rotation.z
      ) {
        lastTransformRef.current = {
          position: currentTransform.position.clone(),
          rotation: currentTransform.rotation.clone(),
        };
        onTransformChange(currentTransform);
      }
    }
  });

  // Helper to get mouse position in normalized device coordinates
  const getMouseNDC = useCallback((event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }, [gl]);

  // Check if mouse is over the mesh (for cursor changes)
  const isMouseOverMesh = useCallback((event: MouseEvent) => {
    if (!meshRef.current) return false;
    
    const mesh = meshRef.current;
    mesh.updateMatrixWorld(true);
    
    const mouse = getMouseNDC(event);
    raycasterRef.current.setFromCamera(mouse, camera);
    
    const intersects = raycasterRef.current.intersectObject(mesh, true);
    return intersects.length > 0;
  }, [meshRef, camera, getMouseNDC]);

  // Handle double-click via custom event from the mesh itself (more reliable than canvas dblclick)
  useEffect(() => {
    if (!enabled) return;
    
    const handleMeshDoubleClick = () => {
      console.log('SelectableTransformControls: mesh-double-click event received, isActive:', isActive);
      
      if (isActive) {
        console.log('SelectableTransformControls: Already active, ignoring');
        return;
      }
      
      console.log('SelectableTransformControls: Activating gizmo');
      setIsActive(true);
      onSelectionChange?.(true);
    };
    
    window.addEventListener('mesh-double-click', handleMeshDoubleClick);
    return () => window.removeEventListener('mesh-double-click', handleMeshDoubleClick);
  }, [enabled, isActive, onSelectionChange]);

  // Cursor change on hover over mesh (to indicate it's clickable)
  useEffect(() => {
    if (!enabled || isActive) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      if (isMouseOverMesh(event)) {
        gl.domElement.style.cursor = 'pointer';
      } else {
        gl.domElement.style.cursor = 'auto';
      }
    };
    
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.style.cursor = 'auto';
    };
  }, [gl, enabled, isActive, isMouseOverMesh]);

  // Disable orbit controls when dragging gizmo
  const handleDragStart = useCallback(() => {
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: true } }));
    gl.domElement.style.cursor = 'grabbing';
  }, [gl]);

  const handleDragEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent('disable-orbit-controls', { detail: { disabled: false } }));
    gl.domElement.style.cursor = 'auto';
  }, [gl]);

  // Keyboard shortcut to close
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActive(false);
        onSelectionChange?.(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onSelectionChange]);

  // Scale the gizmo based on model size
  const gizmoScale = bounds ? Math.max(bounds.radius * 0.75, 25) : 50;

  // Always render PivotControls to prevent children remounting (which resets camera)
  // Use opacity/visibility and disable props to hide the gizmo when not active
  return (
    <group ref={groupRef}>
      <PivotControls
        scale={gizmoScale}
        lineWidth={4}
        depthTest={false}
        fixed={false}
        axisColors={['#ff4060', '#40ff60', '#4080ff']}
        hoveredColor="#ffff40"
        annotations={isActive}
        annotationsClass="pivot-annotation"
        autoTransform={true}
        anchor={[0, 0, 0]}
        disableAxes={!isActive}
        disableSliders={!isActive}
        disableRotations={!isActive}
        disableScaling={true}
        visible={isActive}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrag={(local, deltaL, world, deltaW) => {
          if (onTransformChange) {
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            world.decompose(position, quaternion, scale);
            const euler = new THREE.Euler().setFromQuaternion(quaternion);
            onTransformChange({ position, rotation: euler });
          }
        }}
      >
        {children}
      </PivotControls>
      
      {/* Small close button - only shown when active */}
      {isActive && bounds && (
        <Html
          position={[bounds.center.x + bounds.radius * 1.2, bounds.center.y + bounds.radius * 1.2, bounds.center.z]}
          center
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          <button
            onClick={() => {
              setIsActive(false);
              onSelectionChange?.(false);
            }}
            className="w-6 h-6 flex items-center justify-center bg-slate-800/90 hover:bg-red-600 text-white rounded-full shadow-lg border border-slate-600 transition-colors text-xs"
            title="Close (Esc)"
          >
            ✕
          </button>
        </Html>
      )}
    </group>
  );
};

export default SelectableTransformControls;
