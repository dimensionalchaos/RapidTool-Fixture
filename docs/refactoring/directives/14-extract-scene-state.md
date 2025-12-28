# Directive 14: Extract Scene State Management

## Objective
Extract the massive state management from 3DScene.tsx into dedicated state hooks, reducing complexity and improving maintainability.

## Current Problem
3DScene.tsx has ~188 hook usages with state scattered throughout:
- Baseplate state (~10 useState)
- Support state (~15 useState)
- Clamp state (~12 useState)
- Label state (~8 useState)
- Hole state (~10 useState)
- Transform state (~8 useState)
- Export/CSG state (~15 useState)
- Camera/view state (~10 useState)

## Target Architecture

```
src/components/3DScene/
├── index.tsx              # Main component (slim orchestrator)
├── hooks/
│   ├── useSceneState.ts      # Combined scene state hook
│   ├── useBaseplateState.ts  # Baseplate-specific state
│   ├── useSupportState.ts    # Support-specific state
│   ├── useClampState.ts      # Clamp-specific state
│   ├── useLabelState.ts      # Label-specific state
│   ├── useHoleState.ts       # Hole-specific state
│   ├── useExportState.ts     # Export/CSG state
│   └── useCameraState.ts     # Camera and view state
├── utils/
│   ├── sceneHelpers.ts       # Helper functions from top of file
│   └── geometryUtils.ts      # Geometry computation helpers
└── types.ts                  # Scene-specific types
```

## Actions

### Step 1: Create 3DScene folder structure
```powershell
mkdir src/components/3DScene
mkdir src/components/3DScene/hooks
mkdir src/components/3DScene/utils
```

### Step 2: Extract types (types.ts)
Move interface definitions:
- `ThreeDSceneProps`
- `BoundsSummary` 
- `LiveTransformData`
- Any other local types

### Step 3: Extract utility functions (utils/)
Move functions defined BEFORE the component:
- `computeDominantUpQuaternion`
- `getActualMinYFromMesh`
- `modelColorPalette`
- `getNextColor`
- `SelectionHighlight`
- Other helper functions

### Step 4: Extract useBaseplateState hook
State to extract:
```typescript
const [basePlate, setBasePlate] = useState<BasePlateConfig | null>(null);
const [isMultiSectionDrawingMode, setIsMultiSectionDrawingMode] = useState(false);
const [drawnSections, setDrawnSections] = useState<BasePlateSection[]>([]);
const [multiSectionPadding, setMultiSectionPadding] = useState(0);
const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
const basePlateMeshRef = useRef<THREE.Mesh>(null);
const multiSectionBasePlateGroupRef = useRef<THREE.Group>(null);
const [baseTopY, setBaseTopY] = useState<number>(0);
```

### Step 5: Extract useSupportState hook
State to extract:
```typescript
const [supports, setSupports] = useState<AnySupport[]>([]);
const [selectedSupportIdLocal, setSelectedSupportIdLocal] = useState<string | null>(null);
const [supportPreviewPosition, setSupportPreviewPosition] = useState<THREE.Vector2 | null>(null);
const [supportPlacementMode, setSupportPlacementMode] = useState<SupportPlacement | null>(null);
const [currentSupportType, setCurrentSupportType] = useState<SupportType>('cylinder');
// Plus all support-related callbacks
```

### Step 6: Extract useClampState hook
State to extract:
```typescript
const [placedClamps, setPlacedClamps] = useState<PlacedClamp[]>([]);
const [selectedClampId, setSelectedClampId] = useState<string | null>(null);
const [clampPlacementMode, setClampPlacementMode] = useState<{...} | null>(null);
const [selectedClampModelId, setSelectedClampModelId] = useState<string | null>(null);
// Plus clamp placement callbacks
```

### Step 7: Extract useLabelState hook
State to extract:
```typescript
const [labels, setLabels] = useState<LabelConfig[]>([]);
const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
const [labelPreviewPosition, setLabelPreviewPosition] = useState<THREE.Vector3 | null>(null);
// Plus label callbacks
```

### Step 8: Extract useHoleState hook
State to extract:
```typescript
const [holes, setHoles] = useState<PlacedHole[]>([]);
const [holeConfig, setHoleConfig] = useState<HoleConfig>({...});
const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
const [holePlacementMode, setHolePlacementMode] = useState<HolePlacement | null>(null);
// Plus hole callbacks
```

### Step 9: Extract useExportState hook
State to extract:
```typescript
const [cavityGeometry, setCavityGeometry] = useState<THREE.BufferGeometry | null>(null);
const [isProcessingCavity, setIsProcessingCavity] = useState(false);
const [showCavityPreview, setShowCavityPreview] = useState(false);
const [exportGeometry, setExportGeometry] = useState<THREE.BufferGeometry | null>(null);
// Plus CSG/export callbacks
```

### Step 10: Create useSceneState orchestrator
Combines all feature hooks into unified interface:
```typescript
export function useSceneState(props: ThreeDSceneProps) {
  const baseplate = useBaseplateState(props);
  const supports = useSupportState(props, baseplate.baseTopY);
  const clamps = useClampState(props);
  const labels = useLabelState(props, baseplate.baseTopY);
  const holes = useHoleState(props);
  const exportState = useExportState(props);
  
  return {
    baseplate,
    supports,
    clamps,
    labels,
    holes,
    exportState,
  };
}
```

## Validation Checklist
- [ ] Build passes after each extraction
- [ ] No functionality changes
- [ ] State updates still work correctly
- [ ] Event handlers still fire
- [ ] All imports resolved

## Dependencies
- Phase 1-4 complete
- Feature modules in `src/features/` exist

## Estimated Time
4-5 hours (large extraction)

## Risk Level
🟡 MEDIUM - State extraction is mechanical but error-prone
