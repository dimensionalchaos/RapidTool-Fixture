# Phase 5 Incremental Refactoring Plan

## Overview

This document outlines the incremental approach to decompose `3DScene.tsx` from ~6163 lines to a maintainable ~500-800 lines through systematic extraction of handlers and effects into dedicated hooks and modules.

**Current State (Jan 1, 2025):**
- 3DScene.tsx: ~5982 lines (reduced from ~6163)
- State hooks wired: ✅ (useSupportState, useClampState, useLabelState, useHoleState, useBaseplateState)
- **NEW: usePartManagement** ✅ WIRED - Part mesh refs, bounds, colors
- **NEW: useModelTransform** ✅ WIRED - Transform state, live transform, pivot control
- **NEW: useCameraControls** 📝 CREATED (not wired - complex deps on useThree)
- Renderers extracted: ✅ (SupportsRenderer, LabelsRenderer, ModelMesh, ScalableGrid, etc.)
- Utilities extracted: ✅ (geometryUtils, colorUtils, csgUtils)

**Progress:**
- ~180 lines removed through usePartManagement and useModelTransform hooks

**Target State:**
- 3DScene.tsx: ~500-800 lines (orchestration only)
- All feature logic in dedicated hooks/handlers
- Clean separation of concerns

---

## Extraction Strategy

### Principle: Extract by Feature Domain

Each extraction creates a hook that encapsulates:
1. **State** (already done via existing hooks)
2. **Effects** (event listeners, side effects)
3. **Handlers** (callbacks, event handlers)
4. **Computed values** (useMemo calculations)

---

## Phase 5.6: File Import & Positioning System ✅ COMPLETE

**Target:** Extract all part import, positioning, and bounds calculation logic

### 5.6.1: Create `usePartManagement` Hook ✅ DONE

**File:** `src/components/3DScene/hooks/usePartManagement.ts`
**Status:** ✅ Created and wired into 3DScene.tsx
**Commit:** Phase 5.6.1

**Extracted:**
- `modelMeshRefs` - Map<string, RefObject<Mesh>>
- `partInitialOffsetsRef` - Map<string, Vector3>
- `modelDimensions` state
- `modelColors` state
- `modelBounds` state
- `partBounds` state
- `getPartMeshRef()` callback
- `recalculateCombinedBounds()` callback
- Effects for bounds calculation
- Effect for reporting colors

**Lines removed:** ~100+ lines

---

### 5.6.2: Create `useModelTransform` Hook ✅ DONE

**File:** `src/components/3DScene/hooks/useModelTransform.ts`
**Status:** ✅ Created and wired into 3DScene.tsx
**Commit:** Phase 5.6.2

**Extracted:**
- `modelTransform` state
- `liveTransform` state
- `pivotClosingRef` ref
- `handleLiveTransformChange()` callback
- `livePositionDelta` computed value
- Effect for emitting initial transform

**Lines removed:** ~70+ lines

---

### 5.6.3: Create `useCameraControls` Hook 📝 DEFERRED

**File:** `src/components/3DScene/hooks/useCameraControls.ts`
**Status:** 📝 Created but NOT wired (deferred - complex useThree deps)

**Note:** This hook requires camera, size, controlsRef from useThree() context.
The current inline implementation works well. Wiring would require significant
refactoring to pass dependencies properly without breaking the render flow.

**To wire in future:**
- Pass `camera`, `size`, `controlsRef` as props
- Remove inline `updateCamera` function
- Move effects from lines ~530-620 to hook

---

### 5.6.4: Create
```typescript
interface UseCameraControlsReturn {
  currentOrientation: ViewOrientation;
  setCurrentOrientation: Dispatch<...>;
  prevOrientationRef: RefObject<ViewOrientation>;
  updateCamera: (orientation: ViewOrientation, bounds: BoundsSummary | null) => void;
  shouldReframeCameraRef: RefObject<boolean>;
}
```

**Lines to remove from 3DScene.tsx:** ~110 lines

---

### 5.6.3: Create `useModelTransform` Hook

**File:** `src/components/3DScene/hooks/useModelTransform.ts`

**Extracts from 3DScene.tsx (lines ~180-186, 433-628):**
- `modelTransform` state
- `liveTransform` state
- `pivotClosingRef` ref
- `handleLiveTransformChange()` callback
- `livePositionDelta` computed value

**Dependencies:**
- `selectedPartId: string | null`
- `basePlate` state
- `modelMeshRefs`

**Returns:**
```typescript
interface UseModelTransformReturn {
  modelTransform: TransformData;
  setModelTransform: Dispatch<...>;
  liveTransform: LiveTransform | null;
  setLiveTransform: Dispatch<...>;
  handleLiveTransformChange: (transform: ...) => void;
  livePositionDelta: { x: number; z: number } | null;
}
```

**Lines to remove from 3DScene.tsx:** ~110 lines

---

## Phase 5.7: Baseplate System (All Types)

### 5.7.1: Create `useBaseplateEffects` Hook

**File:** `src/components/3DScene/hooks/useBaseplateEffects.ts`

**Extracts from 3DScene.tsx (lines ~529-570, 753-815):**
- Effect for `baseTopY` calculation (lines 529-570)
- Effect for part count changes triggering baseplate recalc (lines 753-815)
- Part lifting logic when colliding with baseplate

**Dependencies:**
- `basePlate` state (from useBaseplateState)
- `basePlateMeshRef` (from useBaseplateState)
- `multiSectionBasePlateGroupRef`
- `importedParts`
- `modelMeshRefs`

**Lines to remove from 3DScene.tsx:** ~90 lines

---

### 5.7.2: Create `useMultiSectionBaseplate` Hook

**File:** `src/components/3DScene/hooks/useMultiSectionBaseplate.ts`

**Extracts from 3DScene.tsx (lines ~1396-1520, 4741-4928):**
- Effects for section selection during support/clamp/label/hole placement
- `handleSectionDrawn()` callback
- Section validation and expansion logic
- Effects for multi-section drawing mode
- ESC key handlers for section selection cancellation

**Dependencies:**
- `basePlate` state
- `selectedBasePlateSectionId` state
- Various `waitingFor*Selection` states
- `gl`, `camera`, `scene` from useThree()

**Lines to remove from 3DScene.tsx:** ~300 lines

---

### 5.7.3: Create `useBaseplateExpansion` Hook

**File:** `src/components/3DScene/hooks/useBaseplateExpansion.ts`

**Extracts from 3DScene.tsx (lines ~1925-2050, 2193-2278):**
- `getClampFootprintBounds()` callback
- `calculateOptimalSectionBounds()` callback
- `expandSectionForSupport()` callback
- Auto-expand effects for holes/supports/clamps/labels

**Dependencies:**
- `basePlate` state
- `clampSupportInfos` state
- `supports`, `placedClamps`, `labels`, `mountingHoles`

**Lines to remove from 3DScene.tsx:** ~200 lines

---

## Phase 5.8: Supports System

### 5.8.1: Create `useSupportHandlers` Hook

**File:** `src/components/3DScene/hooks/useSupportHandlers.ts`

**Extracts from 3DScene.tsx (lines ~1295-1345, 2060-2190, 3298-3508):**
- Effects for support placement start/cancel events
- `handleSupportCreate()` callback
- `buildSupportMesh()` callback
- Support trimming and CSG logic
- Support snap handling

**Dependencies:**
- `useSupportState()` return values
- `basePlate`, `selectedBasePlateSectionId`
- `modelBounds`, `updateCamera`

**Lines to remove from 3DScene.tsx:** ~350 lines

---

## Phase 5.9: Clamps System

### 5.9.1: Create `useClampHandlers` Hook

**File:** `src/components/3DScene/hooks/useClampHandlers.ts`

**Extracts from 3DScene.tsx (lines ~2617-2982, 2983-3214):**
- `handleClampPlacementClick()` callback
- Effects for clamp placement mode
- Clamp adjustment after data load
- Clamp silhouette computation
- Clamp min offset calculations

**Dependencies:**
- `useClampState()` return values
- `importedParts`, `modelMeshRefs`
- `baseTopY`, `partVisibility`

**Lines to remove from 3DScene.tsx:** ~600 lines

---

### 5.9.2: Create `useClampHullPoints` Hook

**File:** `src/components/3DScene/hooks/useClampHullPoints.ts`

**Extracts from 3DScene.tsx (lines ~443-480):**
- `prevClampSupportHullPointsRef` ref
- `clampSupportHullPoints` computed value

**Dependencies:**
- `placedClamps`
- `clampSupportInfos`

**Lines to remove from 3DScene.tsx:** ~40 lines

---

## Phase 5.10: Holes System

### 5.10.1: Create `useHoleHandlers` Hook

**File:** `src/components/3DScene/hooks/useHoleHandlers.ts`

**Extracts from 3DScene.tsx (lines ~1347-1585, 1587-1735):**
- Effects for hole placement start/cancel events
- `handleHoleCreate()` callback
- Effects for holes-updated sync
- Effects for hole selection/edit
- Hole position update handlers

**Dependencies:**
- `useHoleState()` return values
- `basePlate`, `selectedBasePlateSectionId`
- `modelBounds`, `updateCamera`

**Lines to remove from 3DScene.tsx:** ~350 lines

---

### 5.10.2: Create `useHoleCSG` Hook

**File:** `src/components/3DScene/hooks/useHoleCSG.ts`

**Extracts from 3DScene.tsx (lines ~1739-1920):**
- `waitForRenderCycle()` utility
- `scheduleCSGTrigger()` callback
- Effects for hole CSG updates
- `hullPointsKey` computed value
- Baseplate depth sync effect

**Dependencies:**
- `useHoleState()` return values
- `basePlate`, `combinedHullPoints`
- `basePlateMeshRef`

**Lines to remove from 3DScene.tsx:** ~180 lines

---

### 5.10.3: Create `useHoleHullPoints` Hook

**File:** `src/components/3DScene/hooks/useHoleHullPoints.ts`

**Extracts from 3DScene.tsx (lines ~481-520):**
- `HOLE_MARGIN` constant
- `POINTS_PER_HOLE` constant
- `prevHoleHullPointsRef` ref
- `holeHullPoints` computed value
- `combinedHullPoints` computed value

**Dependencies:**
- `mountingHoles`
- `supportHullPoints`, `labelHullPoints`, `clampSupportHullPoints`

**Lines to remove from 3DScene.tsx:** ~40 lines

---

## Phase 5.11: Labels System

### 5.11.1: Create `useLabelHandlers` Hook

**File:** `src/components/3DScene/hooks/useLabelHandlers.ts`

**Extracts from 3DScene.tsx (lines ~4315-4580):**
- Effects for label add/update/delete events
- Label position update handlers
- Label depth calculation

**Dependencies:**
- `useLabelState()` return values
- `basePlate`, `selectedBasePlateSectionId`
- `baseTopY`

**Lines to remove from 3DScene.tsx:** ~250 lines

---

## Phase 5.12: Cavity/CSG System

### 5.12.1: Create `useCavityOperations` Hook

**File:** `src/components/3DScene/hooks/useCavityOperations.ts`

**Extracts from 3DScene.tsx (lines ~817-888, 3364-3507):**
- `cavityPreview` state
- Effects for cavity context request
- Effects for cavity operation results
- Effects for cavity apply
- Support trim preview CSG

**Dependencies:**
- `importedParts`, `modelMeshRefs`
- `basePlateMeshRef`
- `supports`, `basePlate`

**Lines to remove from 3DScene.tsx:** ~300 lines

---

### 5.12.2: Create `useOffsetMesh` Hook

**File:** `src/components/3DScene/hooks/useOffsetMesh.ts`

**Extracts from 3DScene.tsx (lines ~889-1275):**
- `offsetMeshPreviews` state
- `offsetMeshProcessing` state
- `showOffsetPreview` state
- Effects for generate/clear/toggle offset mesh

**Dependencies:**
- `importedParts`, `modelMeshRefs`
- `baseTopY`, `supports`, `placedClamps`

**Lines to remove from 3DScene.tsx:** ~400 lines

---

### 5.12.3: Create `useMergedFixture` Hook

**File:** `src/components/3DScene/hooks/useMergedFixture.ts`

**Extracts from 3DScene.tsx (lines ~3508-4315):**
- `mergedFixtureMesh` state
- Effects for support/clamp geometry union
- Effects for merged fixture generation

**Dependencies:**
- `supports`, `placedClamps`
- `basePlate`, `clampSupportInfos`

**Lines to remove from 3DScene.tsx:** ~800 lines

---

## Phase 5.13: Miscellaneous Handlers

### 5.13.1: Create `useSceneEventHandlers` Hook

**File:** `src/components/3DScene/hooks/useSceneEventHandlers.ts`

**Extracts from 3DScene.tsx (remaining event listeners):**
- Component selection events
- Keyboard shortcuts (ESC for cancellation)
- `handlePointerMove`, `handlePointerUp` placeholders

**Lines to remove from 3DScene.tsx:** ~100 lines

---

## Execution Order (Safest First)

| Priority | Phase | Hook | Risk | Est. Lines Saved |
|----------|-------|------|------|------------------|
| 1 | 5.6.1 | usePartManagement | 🟢 LOW | ~150 |
| 2 | 5.6.2 | useCameraControls | 🟢 LOW | ~110 |
| 3 | 5.6.3 | useModelTransform | 🟢 LOW | ~110 |
| 4 | 5.10.3 | useHoleHullPoints | 🟢 LOW | ~40 |
| 5 | 5.9.2 | useClampHullPoints | 🟢 LOW | ~40 |
| 6 | 5.7.1 | useBaseplateEffects | 🟡 MED | ~90 |
| 7 | 5.10.1 | useHoleHandlers | 🟡 MED | ~350 |
| 8 | 5.10.2 | useHoleCSG | 🟡 MED | ~180 |
| 9 | 5.11.1 | useLabelHandlers | 🟡 MED | ~250 |
| 10 | 5.8.1 | useSupportHandlers | 🟡 MED | ~350 |
| 11 | 5.7.3 | useBaseplateExpansion | 🟡 MED | ~200 |
| 12 | 5.7.2 | useMultiSectionBaseplate | 🔴 HIGH | ~300 |
| 13 | 5.9.1 | useClampHandlers | 🔴 HIGH | ~600 |
| 14 | 5.12.1 | useCavityOperations | 🔴 HIGH | ~300 |
| 15 | 5.12.2 | useOffsetMesh | 🔴 HIGH | ~400 |
| 16 | 5.12.3 | useMergedFixture | 🔴 HIGH | ~800 |
| 17 | 5.13.1 | useSceneEventHandlers | 🟢 LOW | ~100 |

**Total Estimated Lines Saved: ~4,370 lines**
**Projected Final 3DScene.tsx: ~1,793 lines → ~500-800 after JSX cleanup**

---

## Validation Checklist (Per Extraction)

Before each extraction:
- [ ] Identify all dependencies (state, refs, callbacks)
- [ ] Identify all consumers within 3DScene.tsx
- [ ] Create hook with proper TypeScript types
- [ ] Export from `hooks/index.ts`

After each extraction:
- [ ] `npm run build` passes
- [ ] Feature still works (manual test)
- [ ] No TypeScript errors in 3DScene.tsx
- [ ] Commit with descriptive message

---

## Quick Start: Phase 5.6.1

```powershell
# Create the first extraction branch
git checkout -b refactor/phase-5.6-part-management

# After implementing usePartManagement:
npm run build
npm run dev
# Test: Import a file, verify bounds calculation, colors assigned
git add -A
git commit -m "refactor(phase-5.6.1): extract usePartManagement hook"
```

---

*Created: December 29, 2025*
*Status: Planning Complete - Ready for Execution*
