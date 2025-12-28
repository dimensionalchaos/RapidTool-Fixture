# Directive 15: Extract Scene Renderers

## Objective
Extract rendering logic from 3DScene.tsx into feature-specific renderer components.

## Current Problem
The return statement of 3DScene.tsx contains thousands of lines of JSX rendering:
- Part meshes with transform controls
- Baseplate rendering (single and multi-section)
- Support meshes and transform controls
- Clamp meshes and transform controls
- Label meshes and transform controls
- Hole meshes and transform controls
- Grid, lighting, camera helpers
- Export/cavity preview meshes

## Target Architecture

```
src/components/3DScene/
├── index.tsx                    # Main orchestrator (~300 lines)
├── renderers/
│   ├── PartsRenderer.tsx        # Model meshes + transform controls
│   ├── BaseplateRenderer.tsx    # Baseplate (single + multi-section)
│   ├── SupportsRenderer.tsx     # Support meshes + gizmos
│   ├── ClampsRenderer.tsx       # Clamp meshes + gizmos
│   ├── LabelsRenderer.tsx       # Label meshes + gizmos
│   ├── HolesRenderer.tsx        # Hole meshes + gizmos
│   ├── SceneEnvironment.tsx     # Grid, lights, camera controls
│   └── ExportPreview.tsx        # Cavity/export preview meshes
└── ...
```

## Actions

### Step 1: Create renderers folder
```powershell
mkdir src/components/3DScene/renderers
```

### Step 2: Extract SceneEnvironment.tsx
Extract static scene elements:
```tsx
// Grid, OrbitControls, lights, GizmoHelper
export const SceneEnvironment: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl>;
  orbitControlsEnabled: boolean;
  isDarkMode: boolean;
  gridSize: number;
  gridPosition: THREE.Vector3;
}> = ({ ... }) => (
  <>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} intensity={1} />
    <DreiOrbitControls ref={controlsRef} enabled={orbitControlsEnabled} />
    <gridHelper args={[gridSize, gridSize / 10]} position={gridPosition} />
    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
      <GizmoViewport ... />
    </GizmoHelper>
  </>
);
```

### Step 3: Extract PartsRenderer.tsx
Extract model mesh rendering:
```tsx
export const PartsRenderer: React.FC<{
  importedParts: ProcessedFile[];
  selectedPartId: string | null;
  modelMeshRefs: Map<string, RefObject<THREE.Mesh>>;
  modelColors: Map<string, string>;
  partVisibility: Map<string, boolean>;
  onPartSelected: (id: string | null) => void;
  onLiveTransformChange: (transform: LiveTransformData | null) => void;
}> = ({ ... }) => (
  <>
    {importedParts.map(part => (
      <SelectableTransformControls
        key={part.id}
        meshRef={modelMeshRefs.get(part.id)}
        ...
      >
        <mesh ref={modelMeshRefs.get(part.id)} ...>
          <bufferGeometry ... />
          <meshStandardMaterial color={modelColors.get(part.id)} />
        </mesh>
      </SelectableTransformControls>
    ))}
  </>
);
```

### Step 4: Extract BaseplateRenderer.tsx
Extract baseplate rendering:
```tsx
export const BaseplateRenderer: React.FC<{
  basePlate: BasePlateConfig | null;
  drawnSections: BasePlateSection[];
  isMultiSectionDrawingMode: boolean;
  selectedSectionId: string | null;
  basePlateMeshRef: RefObject<THREE.Mesh>;
  multiSectionGroupRef: RefObject<THREE.Group>;
  onSectionSelect: (id: string | null) => void;
  onSectionTransform: (section: BasePlateSection, bounds: {...}) => void;
}> = ({ ... }) => {
  if (drawnSections.length > 0) {
    return <MultiSectionBasePlate ... />;
  }
  if (basePlate) {
    return <BasePlate ... />;
  }
  return null;
};
```

### Step 5: Extract SupportsRenderer.tsx
Extract support rendering:
```tsx
export const SupportsRenderer: React.FC<{
  supports: AnySupport[];
  selectedSupportId: string | null;
  baseTopY: number;
  supportPreviewPosition: THREE.Vector2 | null;
  supportPlacementMode: SupportPlacement | null;
  onSupportSelect: (id: string | null) => void;
  onSupportTransform: (id: string, center: THREE.Vector2, rotationY?: number, height?: number) => void;
}> = ({ ... }) => (
  <>
    {supports.map(support => (
      <group key={support.id}>
        <SupportMesh support={support} baseTopY={baseTopY} ... />
        {selectedSupportId === support.id && (
          <SupportTransformControls support={support} ... />
        )}
      </group>
    ))}
    {supportPreviewPosition && <SupportPreviewMesh ... />}
  </>
);
```

### Step 6: Extract ClampsRenderer.tsx
Extract clamp rendering:
```tsx
export const ClampsRenderer: React.FC<{
  placedClamps: PlacedClamp[];
  selectedClampId: string | null;
  onClampSelect: (id: string | null) => void;
  onClampTransform: (id: string, position: {...}, rotation: {...}) => void;
}> = ({ ... }) => (
  <>
    {placedClamps.map(clamp => (
      <group key={clamp.id}>
        <ClampMesh placedClamp={clamp} ... />
        {selectedClampId === clamp.id && (
          <ClampTransformControls placedClamp={clamp} ... />
        )}
      </group>
    ))}
  </>
);
```

### Step 7: Extract LabelsRenderer.tsx
Extract label rendering:
```tsx
export const LabelsRenderer: React.FC<{
  labels: LabelConfig[];
  selectedLabelId: string | null;
  onLabelSelect: (id: string | null) => void;
  onLabelTransform: (id: string, position: THREE.Vector3, rotation: THREE.Euler, depth?: number) => void;
}> = ({ ... }) => (
  <>
    {labels.map(label => (
      <group key={label.id}>
        <LabelMesh label={label} ... />
        {selectedLabelId === label.id && (
          <LabelTransformControls label={label} ... />
        )}
      </group>
    ))}
  </>
);
```

### Step 8: Extract HolesRenderer.tsx
Extract hole rendering:
```tsx
export const HolesRenderer: React.FC<{
  holes: PlacedHole[];
  selectedHoleId: string | null;
  baseTopY: number;
  holePlacementMode: HolePlacement | null;
  onHoleSelect: (id: string | null) => void;
  onHoleTransform: (id: string, position: THREE.Vector2) => void;
}> = ({ ... }) => (
  <>
    {holes.map(hole => (
      <group key={hole.id}>
        <HoleMesh hole={hole} baseTopY={baseTopY} ... />
        {selectedHoleId === hole.id && (
          <HoleTransformControls hole={hole} ... />
        )}
      </group>
    ))}
  </>
);
```

### Step 9: Extract ExportPreview.tsx
Extract export/cavity preview:
```tsx
export const ExportPreview: React.FC<{
  cavityGeometry: THREE.BufferGeometry | null;
  showCavityPreview: boolean;
  exportGeometry: THREE.BufferGeometry | null;
}> = ({ cavityGeometry, showCavityPreview, exportGeometry }) => (
  <>
    {showCavityPreview && cavityGeometry && (
      <mesh geometry={cavityGeometry}>
        <meshStandardMaterial color="#88ff88" transparent opacity={0.5} />
      </mesh>
    )}
  </>
);
```

### Step 10: Simplify 3DScene/index.tsx
Main component becomes an orchestrator:
```tsx
const ThreeDScene: React.FC<ThreeDSceneProps> = (props) => {
  const state = useSceneState(props);
  
  return (
    <>
      <SceneEnvironment {...state.environment} />
      <PartsRenderer {...state.parts} />
      <BaseplateRenderer {...state.baseplate} />
      <SupportsRenderer {...state.supports} />
      <ClampsRenderer {...state.clamps} />
      <LabelsRenderer {...state.labels} />
      <HolesRenderer {...state.holes} />
      <ExportPreview {...state.export} />
    </>
  );
};
```

## Validation Checklist
- [ ] Build passes after each renderer extraction
- [ ] Visual rendering unchanged
- [ ] Interactions still work (click, drag, transform)
- [ ] Transform controls render at correct positions
- [ ] Preview meshes appear correctly

## Dependencies
- Directive 14 complete (state hooks extracted)

## Estimated Time
4-5 hours

## Risk Level
🟡 MEDIUM - JSX extraction is straightforward but needs careful prop passing
