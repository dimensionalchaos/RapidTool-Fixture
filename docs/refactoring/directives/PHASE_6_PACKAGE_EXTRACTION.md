# Phase 6: Package Extraction

## Overview

Phase 6 extracts reusable logic into independent packages (`@rapidtool/cad-core` and `@rapidtool/cad-ui`) that can be used across multiple CAD applications.

**Goal:** Create a monorepo structure with shareable packages while keeping the current app functional.

---

## Pre-Phase Assessment

### Current State (Post-Phase 5)

| Metric | Before | After Phase 5 | Change |
|--------|--------|---------------|--------|
| 3DScene.tsx | 6,163 lines | 2,339 lines | -62% |
| Hooks extracted | 0 | 22 | +22 |
| Feature modules | 0 | 5 | +5 |
| Transform system | Scattered | `src/core/transform/` | Unified |

### What We Have Ready for Package Extraction

**Already in `src/core/` (candidates for `@rapidtool/cad-core`):**
```
src/core/
├── cad/                    # CAD operations
│   └── cadOperations.ts    # Pure CAD logic
├── transform/              # Transform system
│   ├── TransformController.ts
│   ├── presets.ts
│   ├── types.ts
│   ├── utils.ts
│   └── hooks/              # Transform hooks
├── events.ts               # Event system
└── index.ts
```

**Already in `src/features/` (candidates for `@rapidtool/cad-ui`):**
```
src/features/
├── supports/    # Support components, types, utils
├── clamps/      # Clamp components, types, utils
├── holes/       # Hole components, types, utils
├── labels/      # Label components, types, utils
└── baseplate/   # Baseplate components, types, utils
```

**Already in `src/components/3DScene/` (candidates for `@rapidtool/cad-ui`):**
```
src/components/3DScene/
├── hooks/       # 22 orchestration hooks
├── renderers/   # Modular renderers (Grid, Mesh, Debug)
├── utils/       # Geometry, color, CSG utilities
└── types.ts     # Scene-related types
```

---

## Phase 6 Strategy

### Option A: In-Repo Package Structure (Recommended)

Create internal packages within the monorepo without publishing to npm initially. This allows:
- ✅ Immediate organization benefits
- ✅ No npm publishing complexity
- ✅ Easy to test and iterate
- ✅ Can publish later when stable

### Option B: Separate npm Packages

Publish `@rapidtool/cad-core` and `@rapidtool/cad-ui` to npm. This adds:
- ⚠️ Publishing and versioning overhead
- ⚠️ Requires npm org setup
- ⚠️ More complex dependency management

**Recommendation:** Start with Option A, migrate to Option B when packages are stable.

---

## Phase 6 Execution Plan

### 6.1: Setup Monorepo Structure (Est. 1 hour)

**Create directory structure:**
```
packages/
├── cad-core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── cad-ui/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts
```

**Update root package.json with workspaces:**
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

**Checkpoint:**
- [ ] `npm install` succeeds
- [ ] Can import from `@rapidtool/cad-core`
- [ ] Can import from `@rapidtool/cad-ui`

---

### 6.2: Extract `@rapidtool/cad-core` (Est. 2-3 hours)

**Move to `packages/cad-core/src/`:**

| Source | Destination | Notes |
|--------|-------------|-------|
| `src/core/transform/` | `transform/` | TransformController, presets, types |
| `src/lib/csgEngine.ts` | `csg/CSGEngine.ts` | CSG operations |
| `src/lib/transformUtils.ts` | `utils/transformUtils.ts` | Coord conversion |
| `src/lib/workers/` | `workers/` | CSG web workers |
| `src/core/cad/cadOperations.ts` | `cad/CADOperations.ts` | Pure CAD logic |

**Package exports:**
```typescript
// packages/cad-core/src/index.ts
export * from './transform';
export * from './csg';
export * from './cad';
export * from './utils';
```

**Checkpoint:**
- [ ] Build succeeds
- [ ] Transform controls still work
- [ ] CSG operations still work
- [ ] No circular dependencies

---

### 6.3: Extract `@rapidtool/cad-ui` (Est. 3-4 hours)

**Move to `packages/cad-ui/src/`:**

| Source | Destination | Notes |
|--------|-------------|-------|
| `src/components/3DScene/renderers/` | `viewport/renderers/` | Grid, Mesh, Debug |
| `src/components/ViewCube.tsx` | `viewport/ViewCube.tsx` | Camera orientation |
| `src/components/3DScene/utils/` | `viewport/utils/` | Geometry, color utils |
| `src/components/ui/` | `primitives/` | Shadcn base components |

**Note:** Feature modules (supports, clamps, etc.) stay in the app for now. They're app-specific.

**Package exports:**
```typescript
// packages/cad-ui/src/index.ts
export * from './viewport';
export * from './primitives';
```

**Checkpoint:**
- [ ] Build succeeds
- [ ] 3D viewport renders correctly
- [ ] ViewCube works
- [ ] UI components work

---

### 6.4: Update App Imports (Est. 1-2 hours)

**Update all imports in `src/` to use new package paths:**

```typescript
// Before
import { TransformController } from '@/core/transform';
import { CSGEngine } from '@/lib/csgEngine';

// After
import { TransformController, CSGEngine } from '@rapidtool/cad-core';
```

**Checkpoint:**
- [ ] Build succeeds
- [ ] All features work
- [ ] No broken imports

---

### 6.5: Documentation & Cleanup (Est. 1 hour)

- [ ] Add README.md to each package
- [ ] Document public APIs
- [ ] Update root README.md with new structure
- [ ] Clean up any leftover files

---

## Risk Assessment

### Low Risk Items ✅
- Transform system (already isolated in `src/core/transform/`)
- Utility functions (pure functions, no side effects)
- Type definitions (no runtime impact)

### Medium Risk Items ⚠️
- CSG Engine (worker communication must be preserved)
- Web Workers (path resolution may change)

### High Risk Items 🔴
- Feature components (tightly coupled to app state)
- Event system (global window events)
- 3DScene hooks (complex dependencies)

---

## Decision: What to Extract vs Keep

### Extract to `@rapidtool/cad-core`:
1. ✅ TransformController & presets
2. ✅ CSGEngine & workers
3. ✅ transformUtils (coordinate conversion)
4. ✅ CADOperations
5. ✅ Type definitions

### Extract to `@rapidtool/cad-ui`:
1. ✅ ViewCube
2. ✅ ScalableGrid
3. ✅ Base UI primitives (shadcn components)
4. ⚠️ Geometry/color utilities (may have app dependencies)

### Keep in App (for now):
1. ❌ Feature modules (supports, clamps, holes, labels, baseplate)
2. ❌ 3DScene hooks (too tightly coupled)
3. ❌ AppShell (app-specific orchestration)
4. ❌ Event system (app-specific events)

---

## Rollback Plan

If package extraction causes issues:
```bash
git checkout phase-5-scene -- src/
rm -rf packages/
# Update package.json to remove workspaces
```

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Build passes | `npm run build` exits 0 |
| No regressions | All features work in browser |
| Package structure | Both packages import correctly |
| Type safety | No new TypeScript errors |
| Bundle size | Same or smaller |

---

## Timeline

| Step | Est. Time | Cumulative |
|------|-----------|------------|
| 6.1 Setup | 1 hr | 1 hr |
| 6.2 cad-core | 3 hr | 4 hr |
| 6.3 cad-ui | 4 hr | 8 hr |
| 6.4 Update imports | 2 hr | 10 hr |
| 6.5 Documentation | 1 hr | 11 hr |
| Buffer | 1 hr | **12 hr** |

---

## Alternative: Deferred Approach

If full package extraction is too risky, consider a **deferred approach**:

1. **Phase 6a:** Create package structure but don't move files
2. **Phase 6b:** Gradually migrate low-risk items
3. **Phase 6c:** Complete migration when confident

This reduces risk but extends timeline.

---

*Created: December 29, 2025*
*Status: Planning - Ready for Review*
