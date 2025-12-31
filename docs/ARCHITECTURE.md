# RapidTool Fixture View - Architecture & Development Guide

> **Purpose:** This document serves as the single source of truth for AI agents and developers working on this codebase. It consolidates all architectural decisions, patterns, and remaining work.

**Last Updated:** December 31, 2025  
**Version:** 2.0 (Post Phase 7 - Zustand Migration)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Package Structure](#3-package-structure)
4. [State Management](#4-state-management)
5. [Critical Systems](#5-critical-systems)
6. [Production Readiness Gaps](#6-production-readiness-gaps)
7. [Refactoring Roadmap](#7-refactoring-roadmap)
8. [Development Guidelines](#8-development-guidelines)
9. [File Reference](#9-file-reference)

---

## 1. Executive Summary

### What This Application Does

RapidTool Fixture View is a **browser-based 3D CAD application** for designing manufacturing fixtures. Users follow a step-wise workflow:

```
Import Part → Configure Baseplate → Add Supports → Place Clamps → Add Mounting Holes → Create Cavity → Export
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| **UI Framework** | React 18 + TypeScript |
| **3D Rendering** | Three.js via React Three Fiber |
| **State Management** | Zustand + Immer |
| **Styling** | Tailwind CSS + shadcn/ui |
| **CSG Operations** | Manifold 3D (WASM) |
| **Build Tool** | Vite |
| **Monorepo** | npm workspaces |

### Current Statistics

| Metric | Value |
|--------|-------|
| Total TypeScript/TSX files | ~309 |
| Total lines of code | ~2.7M characters |
| Largest file | `3DScene.tsx` (2,404 lines) |
| Second largest | `AppShell.tsx` (2,132 lines) |
| Zustand stores | 11 (6 app-specific, 5 generic in cad-ui) |

---

## 2. Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
│                       (fixture-view)                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  src/features/     - Feature modules (supports, clamps...)  │   │
│  │  src/layout/       - AppShell orchestration                 │   │
│  │  src/stores/       - App-specific Zustand stores            │   │
│  │  src/hooks/        - App-specific hook wrappers             │   │
│  │  src/components/   - 3DScene + UI components                │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                       UI COMPONENT LAYER                            │
│                      (@rapidtool/cad-ui)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  stores/       - Generic stores (selection, workflow, UI)   │   │
│  │  viewport/     - 3D viewport components                     │   │
│  │  panels/       - Accordion, properties panels               │   │
│  │  navigation/   - Step navigation, workflow types            │   │
│  │  primitives/   - Base UI components (from shadcn)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                        CORE LOGIC LAYER                             │
│                      (@rapidtool/cad-core)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  mesh/         - Mesh analysis, repair, decimation          │   │
│  │  offset/       - Cavity/heightmap generation                │   │
│  │  csg/          - CSG operations with Manifold               │   │
│  │  transform/    - Coordinate transforms                      │   │
│  │  parsers/      - STL parser                                 │   │
│  │  workers/      - Web Worker pool management                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → UI Event → Zustand Store Update → React Re-render → 3D Scene Update
                ↑                                      ↓
                └────── Custom Events (for 3D operations) ────┘
```

### Key Design Decisions

1. **Zustand for State** - Phase 7 migrated all 46 useState calls to Zustand stores with backward-compatible hooks
2. **Custom Events Bridge** - Some operations still use window.dispatchEvent for 3D scene communication
3. **Feature Modules** - Business logic organized by domain (supports, clamps, holes, etc.)
4. **Monorepo Packages** - Core logic and UI components extracted to reusable packages

---

## 3. Package Structure

### `packages/cad-core/` - Pure Logic (No React)

```
cad-core/
├── src/
│   ├── mesh/                 # Mesh processing
│   │   ├── meshAnalysis.ts       # Geometry analysis
│   │   ├── meshAnalysisService.ts # Service wrapper
│   │   ├── manifoldMeshService.ts # Manifold integration
│   │   └── index.ts
│   ├── offset/               # Cavity generation
│   │   ├── offsetHeightmap.ts    # Heightmap-based offset
│   │   ├── types.ts              # CavitySettings, etc.
│   │   └── index.ts
│   ├── csg/                  # Boolean operations
│   │   ├── csgEngine.ts          # Manifold wrapper
│   │   └── types.ts
│   ├── transform/            # Coordinate systems
│   │   ├── coordinateUtils.ts    # CAD ↔ Three.js
│   │   └── index.ts
│   ├── parsers/              # File parsers
│   │   ├── stlParser.ts
│   │   └── index.ts
│   ├── workers/              # Worker management
│   │   ├── workerManager.ts
│   │   └── index.ts
│   └── index.ts              # Public API
└── package.json
```

### `packages/cad-ui/` - React Components

```
cad-ui/
├── src/
│   ├── stores/               # Generic Zustand stores
│   │   ├── selectionStore.ts     # Selection state
│   │   ├── workflowStore.ts      # Workflow steps
│   │   ├── uiStore.ts            # UI preferences
│   │   ├── historyStore.ts       # Undo/redo
│   │   ├── transformStore.ts     # Transform mode
│   │   └── index.ts
│   ├── viewport/             # 3D viewport
│   │   ├── ViewCube.tsx
│   │   └── index.ts
│   ├── navigation/           # Workflow navigation
│   │   ├── types.ts              # WorkflowStep, ComponentCategory
│   │   └── index.ts
│   ├── panels/               # Panel components
│   ├── primitives/           # Base UI (shadcn)
│   └── index.ts
└── package.json
```

### `src/` - Application Code

```
src/
├── features/                 # Feature modules
│   ├── supports/                 # Support placement
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── index.ts
│   ├── clamps/                   # Clamp placement
│   ├── holes/                    # Mounting holes
│   ├── labels/                   # Labels
│   ├── baseplate/                # Baseplate config
│   └── export/                   # Export functionality
├── stores/                   # App-specific stores
│   ├── fixtureStore.ts           # Parts, supports, clamps, labels, holes
│   ├── cavityStore.ts            # Cavity operations
│   ├── placementStore.ts         # Placement modes
│   ├── processingStore.ts        # File processing state
│   ├── dialogStore.ts            # Modal dialogs
│   └── index.ts
├── hooks/                    # Hook wrappers (backward compatibility)
│   ├── useSelection.ts           # Selection hooks
│   ├── useWorkflow.ts            # Workflow hooks
│   ├── useFixture.ts             # Fixture entity hooks
│   ├── useCavity.ts              # Cavity hooks
│   ├── usePlacement.ts           # Placement mode hooks
│   ├── useProcessing.ts          # Processing hooks
│   ├── useDialogs.ts             # Dialog hooks
│   ├── useUI.ts                  # UI hooks
│   ├── useHistory.ts             # Undo/redo hooks
│   └── index.ts
├── layout/                   # Layout orchestration
│   └── AppShell.tsx              # Main orchestration (2,132 lines)
├── components/               # UI components
│   ├── 3DScene/                  # 3D scene (decomposed)
│   │   ├── hooks/                    # Scene-specific hooks
│   │   ├── renderers/                # Render components
│   │   ├── handlers/                 # Event handlers
│   │   └── index.ts
│   ├── 3DScene.tsx               # Main scene (2,404 lines)
│   ├── ContextOptionsPanel/      # Step panels
│   ├── ui/                       # shadcn components
│   └── ...
├── utils/                    # Utilities
│   ├── performanceSettings.ts    # Device detection
│   ├── memoryMonitor.ts          # Memory management
│   └── ...
└── main.tsx                  # Entry point
```

---

## 4. State Management

### Store Architecture (Post Phase 7)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GENERIC STORES (cad-ui)                      │
│                   Workflow-agnostic, reusable                   │
├─────────────────────────────────────────────────────────────────┤
│ selectionStore    │ { category, id } selection pattern          │
│ workflowStore     │ Active step, accordion sync                 │
│ uiStore           │ Theme, panel states, settings               │
│ historyStore      │ Undo/redo stacks                            │
│ transformStore    │ Transform mode (translate/rotate/scale)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  APP-SPECIFIC STORES (src/stores)               │
│                   Fixture workflow specific                     │
├─────────────────────────────────────────────────────────────────┤
│ fixtureStore      │ Parts, supports, clamps, labels, holes      │
│ cavityStore       │ Cavity settings, processing state           │
│ placementStore    │ Support/hole/baseplate placement modes      │
│ processingStore   │ File processing, mesh analysis              │
│ dialogStore       │ Units dialog, optimization dialog           │
└─────────────────────────────────────────────────────────────────┘
```

### Hook Wrapper Pattern

All stores expose backward-compatible hooks:

```typescript
// Example: useSelection hooks
export function useSelectedPart() {
  const partId = useSelectionStore(state => state.selectedIds.part);
  const select = useSelectionStore(state => state.select);
  
  const setSelectedPartId = useCallback((id: string | null) => {
    select('part', id);
  }, [select]);
  
  return [partId, setSelectedPartId] as const;
}

// Usage (same as old useState pattern)
const [selectedPartId, setSelectedPartId] = useSelectedPart();
```

### Custom Events Still in Use

These events remain for 3D scene operations:

| Event | Purpose | Location |
|-------|---------|----------|
| `generate-offset-mesh-preview` | Trigger cavity preview | AppShell → 3DScene |
| `execute-cavity-subtraction` | Apply cavity to baseplate | AppShell → 3DScene |
| `export-fixture` | Export merged mesh | AppShell → 3DScene |
| `hole-start-placement` | Start hole placement mode | AppShell → 3DScene |
| `viewer-reset` | Reset viewer state | Utils → 3DScene |
| `session-reset` | Reset entire session | Utils → All |
| `model-transform-updated` | Part position changed | 3DScene → Panels |

**Note:** These are intentional cross-boundary events, not state management issues.

---

## 5. Critical Systems

### ⚠️ DO NOT MODIFY WITHOUT UNDERSTANDING

#### 5.1 Coordinate System Transform

**Problem:** CAD uses Z-up, Three.js uses Y-up.

```typescript
// CRITICAL: packages/cad-core/src/transform/coordinateUtils.ts
export const toCadPosition = (position) => ({
  x: position.x,
  y: position.z,  // CAD Y = Three.js Z
  z: position.y,  // CAD Z = Three.js Y
});
```

| Application | Three.js | Description |
|-------------|----------|-------------|
| X | X | Horizontal |
| Y | Z | Depth |
| Z | Y | Vertical |

#### 5.2 Euler Order for Rotation

```typescript
// ✅ CORRECT - Use YXZ for clean Y-axis extraction
tempEuler.setFromQuaternion(quaternion, 'YXZ');
const spin = tempEuler.y;

// ❌ WRONG - Default order pollutes Y
tempEuler.setFromQuaternion(quaternion);  // Don't do this!
```

#### 5.3 Transform Anti-Jitter Pattern

```typescript
// In all transform controls
const isDraggingRef = useRef(false);
const dragStartPos = useRef<THREE.Vector3 | null>(null);

const handleDragStart = () => {
  isDraggingRef.current = true;
  dragStartPos.current = position.clone();  // LOCK position
};

// During drag, use LOCKED position for display
const displayPos = isDraggingRef.current ? dragStartPos.current : currentPosition;

const handleDragEnd = () => {
  isDraggingRef.current = false;
  dragStartPos.current = null;
  // CRITICAL: Reset pivot to identity
  pivotRef.current.matrix.identity();
};
```

#### 5.4 Hole CSG Penetration

```typescript
// CRITICAL: Holes must fully penetrate baseplate
const PENETRATION_BUFFER = 4;  // mm - extends hole beyond surfaces
```

#### 5.5 Immer Frozen State

Zustand with Immer produces **frozen state**. Never mutate directly:

```typescript
// ❌ WRONG - Will throw "Cannot assign to read only property"
updates.position.y = newValue;

// ✅ CORRECT - Create mutable copy
const mutableUpdates = { ...updates };
mutableUpdates.position = { ...mutableUpdates.position };
mutableUpdates.position.y = newValue;
```

---

## 6. Production Readiness Gaps

### 🔴 High Priority

| Gap | Impact | Effort | Solution |
|-----|--------|--------|----------|
| **Large Files** | Maintainability | High | Decompose 3DScene.tsx (2,404 lines), AppShell.tsx (2,132 lines) |
| **Console Logs** | Debug noise in prod | Low | Replace with proper logging service |
| **Error Boundaries** | User sees crashes | Medium | Add React error boundaries around 3D canvas |
| **No Unit Tests** | Regression risk | High | Add Vitest tests for critical paths |

### 🟡 Medium Priority

| Gap | Impact | Effort | Solution |
|-----|--------|--------|----------|
| **TODO Comments** | Incomplete features | Medium | Complete or remove (12 TODOs found) |
| **Memory Leaks** | Performance degradation | Medium | Implement cleanup in geometry disposal |
| **No E2E Tests** | Integration risk | High | Add Playwright tests for workflow |
| **Bundle Size** | Load time | Medium | Analyze and optimize chunks |

### 🟢 Low Priority

| Gap | Impact | Effort | Solution |
|-----|--------|--------|----------|
| **Duplicate Utils** | Code bloat | Low | Consolidate transform utilities |
| **Stub Code** | Confusion | Low | Remove replicad/, unused components |
| **Type Coverage** | Type safety | Medium | Enable stricter TypeScript |

---

## 7. Refactoring Roadmap

### Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **7.0** | Install Zustand | ✅ Done |
| **7.1** | Selection Store | ✅ Done |
| **7.2** | Workflow Store | ✅ Done |
| **7.3** | Transform Store | ✅ Done |
| **7.4** | UI Store | ✅ Done |
| **7.5** | Store Exports | ✅ Done |
| **7.6** | AppShell Migration | ✅ Done (46 useState → hooks) |

### Remaining Phases

#### Phase 8: Component Decomposition (Recommended Next)

**Goal:** Reduce 3DScene.tsx from 2,404 lines to ~500 lines

```
3DScene.tsx (2,404 lines)
    ↓ Extract
├── hooks/
│   ├── useViewer.ts         (existing, 831 lines)
│   ├── useCavityOps.ts      (existing, 1,035 lines)
│   ├── useBaseplateOps.ts   (existing, 822 lines)
│   ├── useClampHandlers.ts  (existing)
│   └── useSceneEvents.ts    (new - event handlers)
├── renderers/
│   ├── PartRenderer.tsx     (new)
│   ├── SupportRenderer.tsx  (new)
│   ├── ClampRenderer.tsx    (new)
│   ├── HoleRenderer.tsx     (new)
│   └── BaseplateRenderer.tsx (new)
└── 3DScene.tsx (~500 lines - orchestration only)
```

**Effort:** 6-8 hours  
**Risk:** HIGH - requires careful testing

#### Phase 9: Event System Cleanup

**Goal:** Replace remaining custom events with store actions where possible

**Keep:** Cross-boundary 3D operations (cavity, export)  
**Replace:** UI-to-UI communication events

**Effort:** 4-6 hours  
**Risk:** MEDIUM

#### Phase 10: Testing Infrastructure

**Goal:** Establish testing foundation

1. Unit tests for cad-core (Vitest)
2. Component tests for cad-ui (React Testing Library)
3. E2E tests for workflows (Playwright)

**Effort:** 8-12 hours  
**Risk:** LOW

#### Phase 11: Production Hardening

1. Error boundaries
2. Logging service
3. Performance monitoring
4. Bundle optimization

**Effort:** 6-8 hours  
**Risk:** LOW

---

## 8. Development Guidelines

### Adding New Features

1. **Create feature module** in `src/features/{feature-name}/`
2. **Add store slice** if needed in `src/stores/`
3. **Create hook wrappers** in `src/hooks/`
4. **Add to workflow** in ContextOptionsPanel

```
src/features/new-feature/
├── components/
│   └── NewFeaturePanel.tsx
├── hooks/
│   └── useNewFeature.ts
├── utils/
│   └── newFeatureUtils.ts
├── types.ts
└── index.ts
```

### Modifying State

1. **Update store** in `src/stores/` or `packages/cad-ui/src/stores/`
2. **Update hook wrapper** to maintain backward compatibility
3. **Test:** Ensure no frozen state mutations

### Working with 3D Scene

1. **Read 09_CRITICAL_SYSTEMS.md** before any transform work
2. **Use coordinate transforms** for CAD ↔ Three.js
3. **Implement anti-jitter pattern** for any new transform controls
4. **Test with complex models** - not just simple cubes

### Code Quality Standards

```typescript
// ✅ DO: Use typed hooks
const [partId, setPartId] = useSelectedPart();

// ❌ DON'T: Access store directly in components
const partId = useSelectionStore.getState().selectedIds.part;

// ✅ DO: Handle loading/error states
if (isProcessing) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;

// ❌ DON'T: Leave console.logs in production code
console.log('Debug:', value);  // Remove before commit
```

---

## 9. File Reference

### Critical Files (Handle with Care)

| File | Lines | Purpose | Risk Level |
|------|-------|---------|------------|
| [src/components/3DScene.tsx](../src/components/3DScene.tsx) | 2,404 | Main 3D scene | 🔴 HIGH |
| [src/layout/AppShell.tsx](../src/layout/AppShell.tsx) | 2,132 | App orchestration | 🔴 HIGH |
| [packages/cad-core/src/mesh/meshAnalysis.ts](../packages/cad-core/src/mesh/meshAnalysis.ts) | 3,295 | Mesh processing | 🔴 HIGH |
| [packages/cad-core/src/offset/offsetHeightmap.ts](../packages/cad-core/src/offset/offsetHeightmap.ts) | 1,180 | Cavity generation | 🟡 MED |

### Store Files

| File | Purpose |
|------|---------|
| [src/stores/fixtureStore.ts](../src/stores/fixtureStore.ts) | Parts, supports, clamps, labels, holes |
| [src/stores/cavityStore.ts](../src/stores/cavityStore.ts) | Cavity operations |
| [src/stores/placementStore.ts](../src/stores/placementStore.ts) | Placement modes |
| [packages/cad-ui/src/stores/selectionStore.ts](../packages/cad-ui/src/stores/selectionStore.ts) | Selection state |
| [packages/cad-ui/src/stores/workflowStore.ts](../packages/cad-ui/src/stores/workflowStore.ts) | Workflow steps |

### Hook Files

| File | Purpose |
|------|---------|
| [src/hooks/useSelection.ts](../src/hooks/useSelection.ts) | Selection hooks |
| [src/hooks/useWorkflow.ts](../src/hooks/useWorkflow.ts) | Workflow hooks |
| [src/hooks/useFixture.ts](../src/hooks/useFixture.ts) | Fixture entity hooks |
| [src/hooks/useCavity.ts](../src/hooks/useCavity.ts) | Cavity hooks |

### Feature Modules

| Directory | Purpose |
|-----------|---------|
| [src/features/supports/](../src/features/supports/) | Support placement |
| [src/features/clamps/](../src/features/clamps/) | Clamp placement |
| [src/features/holes/](../src/features/holes/) | Mounting holes |
| [src/features/labels/](../src/features/labels/) | Label system |
| [src/features/export/](../src/features/export/) | Export functionality |

---

## Appendix A: Event Reference

### Events Dispatched

| Event Name | Payload | From → To |
|------------|---------|-----------|
| `generate-offset-mesh-preview` | `{ settings: CavitySettings }` | AppShell → 3DScene |
| `clear-offset-mesh-preview` | none | AppShell → 3DScene |
| `execute-cavity-subtraction` | `{ settings: CavitySettings }` | AppShell → 3DScene |
| `reset-cavity` | none | AppShell → 3DScene |
| `export-fixture` | `{ config: ExportConfig }` | AppShell → 3DScene |
| `hole-start-placement` | `{ config: HoleConfig }` | AppShell → 3DScene |
| `hole-cancel-placement` | none | AppShell → 3DScene |
| `holes-updated` | `MountingHole[]` | AppShell → 3DScene |
| `viewer-reset` | none | Utils → 3DScene |
| `session-reset` | none | Utils → All |
| `viewer-undo` | state | AppShell → 3DScene |
| `viewer-redo` | state | AppShell → 3DScene |
| `model-transform-updated` | transform | 3DScene → Panels |
| `baseplate-drawing-mode-changed` | mode | AppShell → 3DScene |
| `part-imported` | ProcessedFile | AppShell → 3DScene |

---

## Appendix B: Type Definitions

### Core Types (from cad-core)

```typescript
// CavitySettings - packages/cad-core/src/offset/types.ts
interface CavitySettings {
  enabled: boolean;
  offsetDistance: number;
  pixelsPerUnit: number;
  rotationXZ: number;
  rotationYZ: number;
  fillHoles: boolean;
  showPreview: boolean;
  previewOpacity: number;
  enableDecimation: boolean;
  enableSmoothing: boolean;
  smoothingStrength: number;
  smoothingIterations: number;
  smoothingQuality: boolean;
  debugSmoothingColors: boolean;
  csgMinVolume: number;
  csgMinThickness: number;
  csgMinTriangles: number;
}
```

### Store Types (from stores)

```typescript
// Selection - packages/cad-ui/src/stores/selectionStore.ts
interface SelectionState {
  selectedIds: {
    part: string | null;
    support: string | null;
    clamp: string | null;
    label: string | null;
    hole: string | null;
    baseplate: string | null;
  };
  transformTarget: { category: string; id: string } | null;
}

// Workflow - packages/cad-ui/src/stores/workflowStore.ts
interface WorkflowState {
  activeStep: WorkflowStep | null;
  activeAccordion: string | null;
}
```

---

## Appendix C: AI Agent Instructions

### When Modifying This Codebase

1. **Read this document first** - especially Critical Systems section
2. **Check file size** before editing - files >500 lines may need decomposition
3. **Use hook wrappers** - don't access stores directly in components
4. **Test coordinate transforms** - CAD uses Z-up, Three.js uses Y-up
5. **Create mutable copies** before modifying objects from Zustand state
6. **Run build** after changes: `npm run build`

### Priority Order for Improvements

1. Fix any runtime errors (immediate)
2. Address TypeScript errors (immediate)
3. Remove console.logs (low effort)
4. Complete TODO items or remove them
5. Decompose large files (when safe)
6. Add tests (before major refactors)

### Files to Avoid Major Changes

- `meshAnalysis.ts` - Core mesh processing, well-tested
- `offsetHeightmap.ts` - Cavity algorithm, complex
- Any file in `packages/cad-core/src/workers/` - Worker communication

---

*End of Architecture Document*
