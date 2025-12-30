# Memory Management & Performance Audit Plan

## Executive Summary

This document outlines a comprehensive plan to audit and improve memory management across the fixture-view application. The goal is to identify memory leaks, optimize garbage collection, and ensure efficient resource usage throughout the application lifecycle.

---

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYERS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        UI Layer (React)                              │   │
│  │  • AppShell.tsx (~2000 lines) - Orchestration & State               │   │
│  │  • Feature Components (baseplate, supports, clamps, holes, labels)  │   │
│  │  • Heavy event-driven communication (window.dispatchEvent)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      3D Scene Layer (R3F)                            │   │
│  │  • 3DScene.tsx (~2400 lines) - Main 3D viewport                     │   │
│  │  • THREE.js geometries, materials, meshes                           │   │
│  │  • Transform controls, camera, lighting                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Core Processing Layer                             │   │
│  │  • @rapidtool/cad-core - CSG, mesh analysis, workers                │   │
│  │  • Web Workers for heavy computations                                │   │
│  │  • Manifold-3D WASM module                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Steps & Memory-Intensive Operations

| Step | Operation | Memory Concerns |
|------|-----------|-----------------|
| **1. Import** | STL/OBJ parsing, mesh analysis | Large geometry buffers, analysis caching |
| **2. Optimization** | Decimation, repair | Temporary geometry clones, worker data |
| **3. Baseplate** | Create/resize baseplate | Convex hull computation, section geometries |
| **4. Supports** | Place/trim supports | Multiple geometry clones, CSG operations |
| **5. Clamps** | Load/place clamps | OBJ loading, clamp geometry caching |
| **6. Holes** | Place holes, CSG subtraction | Hole geometry creation, CSG workers |
| **7. Labels** | Create 3D text | Font loading, text geometry |
| **8. Cavity** | CSG subtraction | Large CSG operations, preview meshes |
| **9. Export** | STL generation | Geometry merging, file generation |

---

## Audit Categories

### Category 1: THREE.js Resource Disposal
**Priority: HIGH**

Three.js objects require explicit disposal to free GPU memory:
- `BufferGeometry.dispose()`
- `Material.dispose()`
- `Texture.dispose()`
- `WebGLRenderTarget.dispose()`

**Files to Audit:**
| File | Concern | Status |
|------|---------|--------|
| `src/components/3DScene.tsx` | Main scene geometries | ⏳ Pending |
| `src/features/supports/components/SupportMeshes.tsx` | Support geometries | ⏳ Pending |
| `src/features/clamps/components/ClampMesh.tsx` | Clamp geometries | ⏳ Pending |
| `src/features/holes/components/HoleMesh.tsx` | Hole geometries | ⏳ Pending |
| `src/features/labels/components/LabelMesh.tsx` | Label geometries | ⏳ Pending |
| `src/features/baseplate/components/*.tsx` | Baseplate geometries | ⏳ Pending |
| `src/modules/FileImport/hooks/useViewer.ts` | Import preview scene | ⏳ Pending |

### Category 2: Event Listener Cleanup
**Priority: HIGH**

Event listeners must be removed when components unmount.

**Known Event Listeners:**
```typescript
// AppShell.tsx - Multiple listeners
'export-complete'
'hole-placed', 'hole-placement-cancelled', 'hole-select-request', 'hole-updated'
'create-baseplate', 'baseplate-section-drawn', 'baseplate-config-updated'
'baseplate-section-updated', 'baseplate-section-selected'
'support-created', 'support-updated', 'support-deleted'
'offset-mesh-preview-complete', 'cavity-subtraction-complete'

// 3DScene.tsx & hooks - Multiple listeners
'export-fixture', 'model-transform-updated'
'disable-orbit-controls'
```

**Files to Audit:**
| File | Listeners | Cleanup Status |
|------|-----------|----------------|
| `src/layout/AppShell.tsx` | 15+ listeners | ⏳ Verify all cleaned |
| `src/components/3DScene.tsx` | 10+ listeners | ⏳ Verify all cleaned |
| `src/features/export/hooks/useExport.ts` | 2 listeners | ⏳ Verify cleanup |
| `src/hooks/useHoleCSG.ts` | Potential listeners | ⏳ Audit needed |

### Category 3: Web Worker Management
**Priority: HIGH**

Workers persist in memory and should be terminated when no longer needed.

**Worker Files:**
```
packages/cad-core/src/workers/
├── workerManager.ts      # Singleton worker pool
├── csgWorker.ts          # CSG operations worker
├── holeCSGWorker.ts      # Hole-specific CSG worker
└── clampCSGWorker.ts     # Clamp-specific CSG worker
```

**Issues to Check:**
- [ ] Worker termination on app unmount
- [ ] Pending promise cleanup on worker errors
- [ ] Transfer buffer cleanup after worker messages
- [ ] Worker restart after errors

### Category 4: Geometry Cloning & Caching
**Priority: MEDIUM**

Geometry clones are expensive - audit for unnecessary cloning.

**Pattern Search:**
```typescript
// Cloning patterns that may leak memory
geometry.clone()
mesh.geometry.clone()
// These create new GPU buffers that must be disposed
```

**Hot Spots:**
| Location | Pattern | Action Needed |
|----------|---------|---------------|
| `src/features/export/utils/geometryCollector.ts` | Multiple `.clone()` calls | Audit disposal |
| `src/features/supports/components/SupportMeshes.tsx` | Geometry creation in render | Memoization |
| `src/features/holes/utils/holeGeometry.ts` | Temporary geometry operations | Cleanup |
| `src/hooks/useDragDrop.ts` | Preview geometry cloning | Dispose on drop end |

### Category 5: React Component Re-renders
**Priority: MEDIUM**

Unnecessary re-renders can cause geometry recreation.

**Patterns to Check:**
- [ ] `useMemo` for expensive geometry computations
- [ ] `useCallback` for event handlers passed to children
- [ ] Proper dependency arrays in `useEffect`
- [ ] Ref usage for values that shouldn't trigger re-renders

**Components to Audit:**
| Component | Concern | Status |
|-----------|---------|--------|
| `SupportMesh` | Geometry recreation on prop changes | ⏳ |
| `ClampMesh` | Full reload on position change | ⏳ |
| `LabelMesh` | Text geometry recreation | ⏳ |
| `HoleMesh` | Geometry params change | ⏳ |

### Category 6: State Management
**Priority: MEDIUM**

Large state objects that could be trimmed or lazily loaded.

**State Areas:**
```typescript
// Large state in 3DScene.tsx
supports: AnySupport[]           // Can grow large
placedClamps: PlacedClamp[]      // Include loaded geometries?
placedHoles: PlacedHole[]        // Hole configs
labels: LabelConfig[]            // Label configs
modifiedSupportGeometries: Map<string, BufferGeometry>  // Cached geometries
```

**Questions to Answer:**
- Are we storing geometry references in state that should be refs?
- Can we lazy-load clamp data instead of pre-loading all?
- Should we clear undo/redo history to free memory?

### Category 7: WASM Module Management
**Priority: LOW**

Manifold-3D WASM module initialization and cleanup.

**Files:**
- `packages/cad-core/src/csg/manifold.ts`
- Worker WASM initialization

**Concerns:**
- [ ] Single WASM instance (not multiple initializations)
- [ ] Proper mesh destruction after Manifold operations
- [ ] Memory limits for WASM heap

---

## Audit Execution Plan

### Phase 1: Instrumentation (Day 1)
**Goal:** Add memory monitoring without changing functionality

**Tasks:**
1. Add `performance.memory` logging at key lifecycle points
2. Create utility functions for tracking:
   - Geometry count
   - Material count  
   - Active event listeners
   - Worker status
3. Log memory snapshots before/after major operations

**Deliverables:**
- `src/utils/memoryMonitor.ts` - Memory tracking utilities
- Console logging at workflow step transitions

### Phase 2: Three.js Disposal Audit (Day 2)
**Goal:** Ensure all THREE.js resources are properly disposed

**Tasks:**
1. Audit each feature module for dispose calls
2. Create `disposeGeometry`, `disposeMaterial` helper functions
3. Add disposal to `useEffect` cleanup functions
4. Verify disposal in:
   - Component unmount
   - Geometry replacement
   - Scene reset

**Files to Modify:**
- `src/features/supports/components/SupportMeshes.tsx`
- `src/features/clamps/components/ClampMesh.tsx`
- `src/features/holes/components/HoleMesh.tsx`
- `src/features/labels/components/LabelMesh.tsx`
- `src/features/baseplate/components/*.tsx`

### Phase 3: Event Listener Audit (Day 2)
**Goal:** Verify all event listeners are properly cleaned up

**Tasks:**
1. Create inventory of all `addEventListener` calls
2. Match each with corresponding `removeEventListener`
3. Verify cleanup happens in correct `useEffect` return
4. Test listener counts don't grow on re-mount

**Validation:**
```javascript
// Debug utility to count active listeners
const listenerCount = getEventListeners(window).length;
```

### Phase 4: Worker Management Audit (Day 3)
**Goal:** Ensure workers don't leak memory

**Tasks:**
1. Verify worker singleton pattern
2. Add worker termination on app unmount
3. Clear pending promises on worker errors
4. Implement worker health monitoring

**Files to Modify:**
- `packages/cad-core/src/workers/workerManager.ts`

### Phase 5: Geometry Cloning Optimization (Day 3-4)
**Goal:** Reduce unnecessary geometry cloning

**Tasks:**
1. Audit all `.clone()` calls
2. Determine if clone is necessary
3. Add disposal for temporary clones
4. Consider geometry caching strategies

**Patterns to Apply:**
```typescript
// Before: Clone without disposal
const tempGeom = originalGeom.clone();
// ... use tempGeom
// Memory leak!

// After: Clone with cleanup
const tempGeom = originalGeom.clone();
try {
  // ... use tempGeom
} finally {
  tempGeom.dispose();
}
```

### Phase 6: React Optimization (Day 4)
**Goal:** Reduce unnecessary re-renders

**Tasks:**
1. Add React DevTools Profiler analysis
2. Identify expensive renders
3. Add `useMemo` for geometry computations
4. Add `React.memo` for pure components
5. Verify dependency arrays

### Phase 7: Session Reset Testing (Day 5)
**Goal:** Verify full cleanup on session reset

**Tasks:**
1. Test "New Session" workflow
2. Monitor memory before/after reset
3. Verify all state is cleared
4. Verify all geometries disposed
5. Verify workers reset if needed

---

## Memory Budget Guidelines

| Resource Type | Recommended Limit | Action if Exceeded |
|---------------|-------------------|-------------------|
| Total JS Heap | < 500MB | Force garbage collection, show warning |
| Geometry Count | < 1000 | Merge geometries, simplify |
| Material Count | < 100 | Share materials |
| Worker Memory | < 200MB each | Restart worker |
| Texture Memory | < 100MB | Reduce resolution |

---

## Testing Checklist

### Per-Feature Tests
- [ ] **Import**: Memory after importing 10 models sequentially
- [ ] **Supports**: Memory after placing 100 supports
- [ ] **Clamps**: Memory after placing 20 clamps
- [ ] **Holes**: Memory after placing 50 holes
- [ ] **Labels**: Memory after creating 20 labels
- [ ] **Export**: Memory during and after export
- [ ] **Session Reset**: Memory returns to baseline

### Stress Tests
- [ ] Import large file (1M+ triangles)
- [ ] Rapid support placement/deletion
- [ ] Multiple CSG operations in sequence
- [ ] Long session (30+ minutes)

---

## Success Criteria

1. **No memory growth** on repeated operations (place/delete cycle)
2. **Session reset** returns memory to within 10% of initial
3. **Worker memory** stays bounded during CSG operations
4. **No console warnings** about geometry/material disposal
5. **Smooth performance** on reference hardware (8GB RAM)

---

## Implementation Notes

### Critical Systems to Preserve

Per `docs/refactoring/09_CRITICAL_SYSTEMS.md`:

1. **Coordinate System**: Z-up (CAD) ↔ Y-up (Three.js) transforms
2. **Transform Controls**: Anti-jitter pattern, Euler order 'YXZ'
3. **Hole CSG**: PENETRATION_BUFFER = 4mm, worker communication format
4. **Multi-Section Baseplates**: XZ coordinate system, merge behavior

### Do NOT Change

- Event names and payloads (without updating all consumers)
- Worker message formats
- CSG operation sequences
- Transform matrix application order

---

## Appendix: Utility Code

### Memory Monitor Utility

```typescript
// src/utils/memoryMonitor.ts
export const logMemoryUsage = (label: string) => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`[Memory] ${label}:`, {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  }
};

export const countThreeResources = (renderer: THREE.WebGLRenderer) => {
  const info = renderer.info;
  return {
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length ?? 0,
    calls: info.render.calls,
    triangles: info.render.triangles,
  };
};
```

### Disposal Helper

```typescript
// src/utils/dispose.ts
export const disposeObject3D = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
};

export const disposeGeometry = (geometry: THREE.BufferGeometry | null | undefined) => {
  if (geometry) {
    geometry.dispose();
  }
};
```

---

## Next Steps

1. **Review this plan** - Confirm scope and priorities
2. **Phase 1 execution** - Add instrumentation
3. **Baseline measurement** - Document current memory usage
4. **Iterative fixes** - Address highest priority issues first
5. **Regression testing** - Verify fixes don't break functionality
