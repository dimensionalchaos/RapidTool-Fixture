# Master Execution Plan

## Director of Engineering (DOE) Orchestration

This document serves as the master control for the refactoring process. The DOE (orchestrator) manages agent execution through directives, validates results, and controls progression.

---

## Execution Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOE ORCHESTRATION LOOP                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  Select  │───▶│  Agent   │───▶│   Test   │───▶│  Review  │ │
│   │Directive │    │ Execute  │    │ Validate │    │ & Commit │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│        ▲                                               │        │
│        │                                               │        │
│        └───────────────────────────────────────────────┘        │
│                                                                 │
│   If PASS: Next directive                                       │
│   If FAIL: Fix issues, re-test                                  │
│   If BLOCKED: Escalate, document, skip if possible              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview (Ordered by Difficulty)

| Phase | Name | Risk | Effort | Directives | Est. Time |
|-------|------|------|--------|------------|-----------|
| **1** | Cleanup | 🟢 LOW | 🟢 LOW | 01-03 | 1 hour |
| **2** | Consolidation | 🟡 LOW-MED | 🟡 MED | 04-06 | 3 hours |
| **3** | Feature Modules | 🟡 MED | 🟡 MED | 07-10 | 4 hours |
| **4** | Transform System | 🔴 HIGH | 🔴 HIGH | 11-13 | 6 hours |
| **5** | Scene Decomposition | 🔴 HIGH | 🔴 HIGH | 14-15 | 6 hours |
| **6** | Package Extraction | 🔴 HIGH | 🔴 HIGH | 16-17 | 6 hours |

**Total Estimated Time: 26 hours**

---

## Detailed Execution Schedule

### Phase 1: Cleanup (Start Here) 🟢

**Branch:** `refactor/phase-1-cleanup`

| Order | Directive | Time | Checkpoint |
|-------|-----------|------|------------|
| 1.1 | `01-delete-empty-directories.md` | 5 min | Build passes |
| 1.2 | `02-delete-unused-files.md` | 15 min | Build passes, no broken imports |
| 1.3 | `03-fix-lint-errors.md` | 30 min | ESLint errors = 0 |

**Phase 1 Gate:**
```bash
node docs/refactoring/execution/tests/01-test-cleanup.js
# Must pass before proceeding
```

**Commit:**
```bash
git add -A
git commit -m "refactor(phase-1): cleanup - remove unused code"
```

---

### Phase 2: Consolidation 🟡

**Branch:** `refactor/phase-2-consolidation`

| Order | Directive | Time | Checkpoint |
|-------|-----------|------|------------|
| 2.1 | `04-consolidate-events.md` | 1 hr | Events centralized, all features work |
| 2.2 | `05-consolidate-utilities.md` | 1 hr | No duplicate utils, transforms work |
| 2.3 | `06-extract-shared-hooks.md` | 1.5 hr | Hooks extracted, one control migrated |

**Phase 2 Gate:**
```bash
node docs/refactoring/execution/tests/02-test-consolidation.js
# Must pass before proceeding
```

**Commit:**
```bash
git add -A
git commit -m "refactor(phase-2): consolidate events, utilities, hooks"
```

---

### Phase 3: Feature Module Structure 🟡

**Branch:** `phase-3-features`

| Order | Directive | Time | Checkpoint |
|-------|-----------|------|------------|
| 3.1 | Create feature folders | 15 min | Folder structure created |
| 3.2 | Migrate supports module | 30 min | Supports feature works |
| 3.3 | Migrate clamps module | 30 min | Clamps feature works |
| 3.4 | Migrate holes module | 20 min | Holes feature works |
| 3.5 | Migrate labels module | 20 min | Labels feature works |
| 3.6 | Migrate baseplate module | 30 min | Baseplate feature works |

**Phase 3 Gate:**
```bash
npm run build
# Build must pass with all features migrated
```

---

### Phase 4: Transform System Unification 🔴

**Branch:** `phase-4-transform`

**⚠️ HIGH RISK PHASE - Read `09_CRITICAL_SYSTEMS.md` before starting!**

| Order | Directive | Time | Checkpoint |
|-------|-----------|------|------------|
| 4.1 | `11-create-transform-core.md` | 2 hr | Core system in `src/core/transform/` |
| 4.2 | `12-create-transform-hooks.md` | 2 hr | Hooks created, build passes |
| 4.3 | `13-migrate-transform-controls.md` | 3 hr | All 6 controls migrated, manual tests pass |

**Critical Files Being Replaced:**
- `SupportTransformControls.tsx` (~227 lines)
- `ClampTransformControls.tsx` (~206 lines)
- `HoleTransformControls.tsx` (~247 lines)
- `LabelTransformControls.tsx` (~180 lines)
- `BasePlateTransformControls.tsx` (~320 lines)
- `SelectableTransformControls.tsx` (~448 lines)

**Migration Order (Safest First):**
1. HoleTransformControls (XZ only)
2. BasePlateTransformControls (XZ only)
3. SupportTransformControls (Y rotation)
4. LabelTransformControls (Y rotation + depth)
5. ClampTransformControls (rotation in degrees)
6. SelectableTransformControls (full transform + baking)

**Phase 4 Gate:**
```bash
npm run build
# PLUS manual testing of ALL transform controls:
# - Gizmo position correct
# - Correct axes enabled
# - Transform applies correctly
# - UI values update
# - Deselection works
# - No jittering
```

**Commit:**
```bash
git add -A
git commit -m "refactor(phase-4): unified transform system"
```

---

### Phase 5-6: Scene Decomposition & Final Cleanup

**Branch:** `phase-5-scene`

**⚠️ HIGH RISK PHASE - 3DScene.tsx is 6,800+ lines with 188 hooks!**

| Order | Directive | Time | Checkpoint |
|-------|-----------|------|------------|
| 5.1 | `14-extract-scene-state.md` | 4-5 hr | State hooks in `src/components/3DScene/hooks/` |
| 5.2 | `15-extract-scene-renderers.md` | 4-5 hr | Renderers in `src/components/3DScene/renderers/` |
| 5.3 | `16-extract-event-handlers.md` | 3-4 hr | Handlers in `src/components/3DScene/handlers/` |

**Target Outcome:**
- 3DScene.tsx reduced from ~6,800 lines to ~300 lines
- State management in 8 dedicated hooks
- Rendering in 8 dedicated renderer components
- Event handlers in 8 organized modules

**Phase 5 Gate:**
```bash
npm run build
# PLUS manual testing of ALL features:
# - File import works
# - All transforms work
# - Export/CSG generates correctly
# - Keyboard shortcuts work
```

---

## Agent Instructions

### For Each Directive:

1. **Read the directive completely** before starting
2. **Check pre-execution checklist** - all items must be true
3. **Execute actions** in order
4. **Run validation tests** specified in directive
5. **Report results** to DOE before proceeding

### Agent Response Format:

```markdown
## Directive Execution Report

**Directive:** [name]
**Status:** ✅ COMPLETE | ⚠️ PARTIAL | ❌ BLOCKED

### Actions Completed:
- [ ] Action 1
- [ ] Action 2

### Test Results:
- Build: ✅/❌
- Manual tests: ✅/❌

### Issues Encountered:
- None | [description]

### Ready for Next Directive: YES/NO
```

---

## Quick Start Commands

### Before Starting Any Work:

```powershell
# 1. Ensure clean state
git status
git stash  # if needed

# 2. Create phase branch
git checkout -b refactor/phase-1-cleanup

# 3. Run baseline test
node docs/refactoring/execution/tests/full-regression.js
```

### During Work:

```powershell
# After each directive
npm run build
npm run dev
# Test manually
# Then run phase test
```

### After Completing Phase:

```powershell
# Commit phase
git add -A
git commit -m "refactor(phase-N): description"

# Merge to main
git checkout main
git merge refactor/phase-N-name

# Create next phase branch
git checkout -b refactor/phase-N+1-name
```

---

## Rollback Procedures

### Single File Rollback:
```powershell
git checkout HEAD -- path/to/file.tsx
```

### Directive Rollback:
```powershell
git reset --soft HEAD~1  # Undo last commit, keep changes
git checkout -- .        # Discard all changes
```

### Phase Rollback:
```powershell
git checkout main
git branch -D refactor/phase-N-name  # Delete failed branch
git checkout -b refactor/phase-N-name  # Start fresh
```

---

## Progress Tracking

### Current Status

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1 | ✅ Complete | Dec 29, 2025 | Dec 29, 2025 | Commit `558fbd1` |
| 2 | ✅ Complete | Dec 29, 2025 | Dec 29, 2025 | Commit `ebfd88d` |
| 3 | ✅ Complete | Dec 29, 2025 | Dec 29, 2025 | Commit `24e501a` |
| 4 | ✅ Complete | Dec 29, 2025 | Dec 30, 2025 | Commits `4abeb1e`, `842bbb2`, `91e80c7` |
| 5 | ✅ Complete | Dec 30, 2025 | Dec 29, 2025 | 22 hooks extracted, 62% reduction (6163→2339 lines) |
| 6 | ✅ 6.1-6.3 Complete | Dec 29, 2025 | Dec 29, 2025 | Monorepo structure + cad-core + cad-ui packages |

### Phase 5 Completion Summary ✅

**3DScene.tsx:** 6,163 lines → 2,339 lines (**62% reduction**)

| Hook | Status | Description |
|------|--------|-------------|
| useBaseplateState | ✅ | Baseplate configuration state |
| useBaseplateEffects | ✅ | baseTopY calculation, part count changes |
| useBaseplateHandlers | ✅ | Section bounds, footprint helpers |
| useBaseplateOperations | ✅ | Create, update, remove, collision checks |
| useMultiSectionSelection | ✅ | Section selection coordination |
| usePartManagement | ✅ | Part mesh refs, bounds, colors |
| useModelTransform | ✅ | Transform state, live transform, pivot |
| useCameraControls | 📝 | Created (deferred wiring - complex deps) |
| useSupportState | ✅ | Support placement and management |
| useSupportHandlers | ✅ | Support event listeners |
| useSupportTrimPreview | ✅ | Support trim preview CSG |
| useClampState | ✅ | Clamp placement and management |
| useClampHandlers | ✅ | Clamp event listeners |
| useClampPlacement | ✅ | DOM click handler + legacy R3F handler |
| useLabelState | ✅ | Label placement and management |
| useLabelHandlers | ✅ | Label event listeners |
| useHoleState | ✅ | Mounting hole placement and management |
| useHoleHandlers | ✅ | Hole event listeners |
| useHoleCSG | ✅ | Hole CSG operations (+ bug fix) |
| useCavityOperations | ✅ | Cavity CSG operations |
| useOffsetMeshPreview | ✅ | Offset mesh preview generation |
| useSceneState | ✅ | General scene state |

**Note:** `useCameraControls` was created but not wired due to complex `useThree()` dependencies. The inline implementation works well.

---

### Phase 6: Package Extraction (Planned)

**See:** [`docs/refactoring/directives/PHASE_6_PACKAGE_EXTRACTION.md`](directives/PHASE_6_PACKAGE_EXTRACTION.md)

### Directive Checklist

**Phase 1:** ✅ Complete
- [x] 01-delete-empty-directories
- [x] 02-delete-unused-files  
- [x] 03-fix-lint-errors (20 auto-fixed)

**Phase 2:** ✅ Complete
- [x] 04-consolidate-events (`src/core/events.ts`)
- [x] 05-consolidate-utilities (`src/lib/transformUtils.ts`)
- [x] 06-extract-shared-hooks (`src/hooks/transform/`)

**Phase 3:** ✅ Complete
- [x] Create feature folders (`src/features/`)
- [x] Migrate supports module (`@/features/supports`)
- [x] Migrate clamps module (`@/features/clamps`)
- [x] Migrate holes module (`@/features/holes`)
- [x] Migrate labels module (`@/features/labels`)
- [x] Migrate baseplate module (`@/features/baseplate`)

**Phase 4:** ✅ Complete
- [x] 11-create-transform-core (`src/core/transform/`)
- [x] 12-create-transform-hooks (`src/core/transform/hooks/`)
- [x] 13-migrate-transform-controls (all 6 components migrated)

**Phase 5:** ✅ Complete
- [x] 14-extract-scene-types-utils (Commits `7fe8c3f`, `36a44bf`)
- [x] 15-extract-scene-renderers (Commit `d295736`)
- [x] 16-extract-state-hooks (Commit `d295736`)
- [x] 17-add-imports-to-3DScene (Commit `9b12540`)
- [x] 5.5: Wire state hooks (useSupportState, useClampState, useLabelState, useHoleState, useBaseplateState)
- [x] 5.6.1: usePartManagement hook ✅
- [x] 5.6.2: useCameraControls hook (created, wiring deferred)
- [x] 5.6.3: useModelTransform hook ✅
- [x] 5.7.1: useBaseplateEffects hook ✅
- [x] 5.7.2: useMultiSectionSelection hook ✅
- [x] 5.7.3: useBaseplateHandlers hook ✅
- [x] 5.8.1: useSupportHandlers hook ✅
- [x] 5.8.2: useSupportTrimPreview hook ✅
- [x] 5.9.1: useClampHandlers hook ✅
- [x] 5.9.2: useClampPlacement hook ✅
- [x] 5.10.1: useHoleHandlers hook ✅
- [x] 5.10.2: useHoleCSG hook ✅ (+ infinite loop fix)
- [x] 5.11.1: useLabelHandlers hook ✅
- [x] 5.12.1: useCavityOperations hook ✅
- [x] 5.12.2: useOffsetMeshPreview hook ✅
- [x] 5.12.3: useBaseplateOperations hook ✅

**Result:** 3DScene.tsx reduced from 6,163 to 2,339 lines (62% reduction)

**Phase 6:** ✅ Phase 6.1-6.3 Complete (Package Extraction)
- [x] 6.1: Setup monorepo structure (`packages/cad-core`, `packages/cad-ui`)
- [x] 6.2: Extract @rapidtool/cad-core package
  - [x] Transform system → `packages/cad-core/src/transform/`
  - [x] CSG Engine → `packages/cad-core/src/csg/`
  - [x] Transform utilities → `packages/cad-core/src/utils/`
  - [x] CAD operations → `packages/cad-core/src/cad/`
- [x] 6.3: Extract @rapidtool/cad-ui package
  - [x] ViewCube component → `packages/cad-ui/src/viewport/`
  - [x] ScalableGrid component → `packages/cad-ui/src/viewport/`
  - [x] Viewport types (BoundsSummary, ViewOrientation, GridConfig)
- [ ] 6.4: Update app imports to use @rapidtool/cad-core
- [x] 6.5: Documentation (README.md for both packages)

**See:** [`docs/refactoring/directives/PHASE_6_PACKAGE_EXTRACTION.md`](directives/PHASE_6_PACKAGE_EXTRACTION.md)

---

## Communication Protocol

### DOE to Agent:
```
Execute directive: [directive name]
Context: [any additional context]
Priority: [normal/high/critical]
```

### Agent to DOE:
```
Directive [name] execution report:
- Status: [complete/blocked/failed]
- Tests: [pass/fail]
- Issues: [none/description]
- Ready for next: [yes/no]
```

---

## Success Metrics

### Per Directive:
- Build passes
- No new TypeScript errors
- Feature functionality preserved
- Tests pass

### Per Phase:
- All directives complete
- Phase test passes
- No regressions
- Code review approved

### Overall:
- All phases complete
- Full regression passes
- Bundle size same or smaller
- Performance maintained or improved

---

*Last Updated: December 29, 2025*
*Current: Phase 6.3-6.4 (Package Extraction) - cad-ui extraction & app import updates remaining*

## Phase 5 Final Results

### Extracted Components (src/components/3DScene/)

**Types** (`types.ts`):
- ThreeDSceneProps, BoundsSummary, TransformData, GridConfig, ModelMeshProps

**Utils** (`utils/`):
- `geometryUtils.ts`: computeDominantUpQuaternion, getActualMinYFromMesh, getFootprintMetrics, calculateGridConfig
- `colorUtils.ts`: MODEL_COLOR_PALETTE, getModelColor, getNextAvailableColor
- `csgUtils.ts`: buildClampSupportGeometryAtOrigin, buildLabelGeometry

**Renderers** (`renderers/`):
- `ScalableGrid.tsx`: Grid component with dynamic sizing
- `ModelMesh.tsx`: Model rendering with orientation correction
- `DebugVisualization.tsx`: DebugPerimeterLine, DebugSilhouetteLine, FixtureComponent
- `SceneLighting.tsx`: Scene lighting configuration
- `LabelsRenderer.tsx`: Label rendering
- `SupportsRenderer.tsx`: Support rendering

**State Hooks** (`hooks/`) - 22 total:
- State: useSupportState, useClampState, useLabelState, useHoleState, useBaseplateState, useSceneState
- Part/Camera: usePartManagement, useModelTransform, useCameraControls (created)
- Baseplate: useBaseplateEffects, useBaseplateHandlers, useBaseplateOperations, useMultiSectionSelection
- Features: useSupportHandlers, useSupportTrimPreview, useClampHandlers, useClampPlacement, useLabelHandlers
- Holes/CSG: useHoleHandlers, useHoleCSG, useCavityOperations, useOffsetMeshPreview

### Phase 5 Achievements
- ✅ 3DScene.tsx reduced from 6,163 to 2,339 lines (62% reduction)
- ✅ 22 dedicated hooks for modular state/effect management
- ✅ All features working correctly
- ✅ Build passing with no TypeScript errors
- ✅ Fixed infinite loop bug in useHoleCSG
