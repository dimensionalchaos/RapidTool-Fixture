# Directive 17: Wire Scene State Hooks into 3DScene.tsx

## Status: READY FOR EXECUTION

## Objective
Replace inline state declarations in 3DScene.tsx with calls to extracted hooks, progressively reducing the file from ~6,800 lines to ~500 lines.

## Pre-requisites
- ✅ Phase 5.1-5.3 complete (hooks, utils, renderers extracted)
- ✅ Scene3DContainer.tsx created with composite hook
- ✅ Build passes with extracted modules

## Extracted Components Available

### State Hooks (`src/components/3DScene/hooks/`)
| Hook | State Variables | Lines Saved |
|------|-----------------|-------------|
| `useSupportState` | placing, supports, supportsTrimPreview, supportsTrimProcessing, supportSnapEnabled, modifiedSupportGeometries, cavitySubtractionProcessing | ~20 |
| `useClampState` | placedClamps, selectedClampId, showClampDebug, clampMinOffsets, clampSupportInfos, clampDebugPoints, clampPlacementMode, debugPerimeter, debugClampSilhouette, waitingForClampSectionSelection | ~40 |
| `useLabelState` | labels, selectedLabelId, waitingForLabelSectionSelection, pendingLabelConfig | ~15 |
| `useHoleState` | mountingHoles, selectedHoleId, editingHoleId, isDraggingHole, holePlacementMode, holeSnapEnabled, baseplateWithHoles, holeCSGProcessing, holeCSGTrigger, waitingForHoleSectionSelection, pendingHoleConfig | ~25 |
| `useBaseplateState` | basePlate, isMultiSectionDrawingMode, drawnSections, multiSectionPadding, baseTopY, selectedBasePlateSectionId, editingBasePlateSectionId, waitingForSectionSelection | ~20 |
| `useSceneState` | placedComponents, selectedComponent, modelDimensions, orbitControlsEnabled, modelColors, modelBounds, partBounds, currentOrientation, modelTransform, liveTransform, itemBoundsUpdateTrigger, isDraggingAnyItem, cavityPreview, offsetMeshPreviews, offsetMeshProcessing, showOffsetPreview, mergedFixtureMesh | ~40 |

### Utilities (`src/components/3DScene/utils/`)
| Module | Functions | Lines Saved |
|--------|-----------|-------------|
| `geometryUtils` | computeDominantUpQuaternion, getActualMinYFromMesh, getFootprintMetrics, calculateGridConfig | ~200 |
| `colorUtils` | MODEL_COLOR_PALETTE, getModelColor, getNextAvailableColor | ~50 |
| `csgUtils` | buildClampSupportGeometryAtOrigin, buildLabelGeometry | ~150 |

### Renderers (`src/components/3DScene/renderers/`)
| Component | Purpose | Lines Saved |
|-----------|---------|-------------|
| `ScalableGrid` | Dynamic grid rendering | ~80 |
| `ModelMesh` | Model with orientation | ~170 |
| `DebugPerimeterLine` | Debug visualization | ~30 |
| `DebugSilhouetteLine` | Debug visualization | ~40 |
| `FixtureComponent` | Placeholder component | ~20 |

## Migration Strategy

### Option A: Progressive In-Place Migration (Recommended)
1. Import hooks at top of 3DScene.tsx
2. Replace state declarations one hook at a time
3. Update usages to use hook returns
4. Test each feature after migration
5. Delete replaced inline code

### Option B: Context-Based Migration
1. Wrap ThreeDScene with Scene3DProvider
2. Convert child components to use useScene3DContext
3. Gradually lift state out of ThreeDScene
4. Replace props with context access

## Execution Steps

### Step 1: Import Hooks
```typescript
// Add to 3DScene.tsx imports
import {
  useSupportState,
  useClampState,
  useLabelState,
  useHoleState,
  useBaseplateState,
  useSceneState,
  computeDominantUpQuaternion,
  getActualMinYFromMesh,
  getModelColor,
  MODEL_COLOR_PALETTE,
  buildClampSupportGeometryAtOrigin,
  buildLabelGeometry,
} from './3DScene';
```

### Step 2: Replace State Declarations
For each hook, replace the inline useState calls with hook destructuring:

```typescript
// Before:
const [placing, setPlacing] = useState<{...}>({ active: false, type: null });
const [supports, setSupports] = useState<AnySupport[]>([]);
// ... many more lines

// After:
const {
  placing, setPlacing,
  supports, setSupports,
  supportsTrimPreview, setSupportsTrimPreview,
  supportsTrimProcessing, setSupportsTrimProcessing,
  supportSnapEnabled, setSupportSnapEnabled,
  modifiedSupportGeometries, setModifiedSupportGeometries,
  cavitySubtractionProcessing, setCavitySubtractionProcessing,
  isDraggingSupportRef,
  editingSupportRef,
  supportHullPoints,
} = useSupportState();
```

### Step 3: Delete Duplicate Code
Remove:
- Inline utility functions (computeDominantUpQuaternion, etc.)
- Inline component definitions (ModelMesh, DebugPerimeterLine, etc.)
- Replaced state declarations and their associated useMemo/useCallback

### Step 4: Test Each Feature
After each hook migration:
1. `npm run build` - verify no type errors
2. `npm run dev` - manual test:
   - Support placement/editing
   - Clamp placement/editing
   - Label placement/editing
   - Hole placement/editing
   - Baseplate configuration
   - Model transforms

## Validation Checklist
- [ ] Build passes after each hook migration
- [ ] Support features work (place, edit, delete, auto-place)
- [ ] Clamp features work (place, edit, delete)
- [ ] Label features work (add, edit, delete)
- [ ] Hole features work (place, edit, delete)
- [ ] Baseplate features work (create, sections, resize)
- [ ] Transform controls work for all features
- [ ] Export/CSG operations work
- [ ] Keyboard shortcuts work
- [ ] No console errors

## Expected Outcome
- 3DScene.tsx reduced from ~6,800 lines to ~500-800 lines
- All functionality preserved
- State management centralized in reusable hooks
- Better testability and maintainability

## Rollback
If issues arise:
```bash
git checkout HEAD -- src/components/3DScene.tsx
```

The extracted hooks remain available for gradual adoption.

---

*Created: December 30, 2025*
*Phase: 5 (Scene Decomposition)*
