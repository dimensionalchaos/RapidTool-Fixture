# Phase 7: State Extraction & Component Decomposition

## Overview

Phase 7 continues the refactoring effort by introducing **Zustand** for state management and decomposing large components. This phase focuses on:

1. **Generic State Management** → Implement Zustand stores in `@rapidtool/cad-ui` (workflow-agnostic)
2. **App-Specific State** → Implement Zustand stores in `src/stores/` (fixture-specific)
3. **AppShell.tsx** (2,009 lines) → Extract state into Zustand stores
4. **3DScene.tsx** (2,262 lines) → Further modularization with renderer components
5. **Event System Replacement** → Replace custom events with reactive state

**Goal:** Reduce both files to under 500 lines each while maintaining functionality.

---

## Architecture Principle: Workflow-Agnostic cad-ui

> **IMPORTANT:** `@rapidtool/cad-ui` must remain **workflow-agnostic**. It provides generic building blocks for ANY CAD workflow app, not just fixture design.
>
> ❌ **NOT in cad-ui:** baseplateStore, cavityStore, supportStore, holeStore, clampStore
> ✅ **IN cad-ui:** selectionStore (generic categories), workflowStore (generic steps), transformStore, uiStore

### Store Distribution

| Store Location | Purpose | Examples |
|---------------|---------|----------|
| `packages/cad-ui/src/stores/` | Generic, reusable across apps | selection, workflow, transform, ui, history |
| `src/stores/` | Fixture-specific, this app only | fixture, cavity, baseplate, processing, placement |

---

## Why Zustand?

### Current Problems

| Problem | Impact |
|---------|--------|
| Custom events (`highlight-component`, `workflow-step-changed`, etc.) | Hard to trace, no type safety |
| Prop drilling through 5+ component levels | Bloated props, hard to maintain |
| State scattered across AppShell (15+ useState calls) | Difficult to reason about |
| 3DScene inline handlers calling parent callbacks | Tight coupling |
| Event listeners for state sync | Race conditions, memory leaks |

### Why Zustand Over Alternatives

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Zustand** | Minimal boilerplate, works outside React, great with R3F, TypeScript support | Learning curve for teams used to Redux | ✅ **Best fit** |
| Redux Toolkit | Powerful devtools, time-travel debugging | Heavy boilerplate, overkill for this app | ❌ |
| Jotai | Atomic, minimal | Less suited for complex derived state | ❌ |
| Context + useReducer | Built-in, no deps | Re-render issues, verbose | ❌ |
| MobX | Reactive, automatic tracking | Magic/implicit behavior | ❌ |

### Zustand Benefits for CAD Apps

```typescript
// ✅ Access state anywhere - even outside React components
const selectedId = useSelectionStore.getState().selected;

// ✅ Subscribe to specific slices - minimal re-renders
const selected = useSelectionStore(state => state.selected);

// ✅ Update from 3D event handlers without React lifecycle
mesh.onClick = () => useSelectionStore.getState().select('model', mesh.userData.id);

// ✅ Combine multiple stores with selector
const { selected, activeStep } = useCombinedStore(state => ({
  selected: state.selection.selected,
  activeStep: state.workflow.activeStep
}));
```

---

## Phase 7 Execution Plan (Revised)

### 7.0: Install Zustand & Setup (Est. 30 mins)

**Install in BOTH packages:**
```bash
# In cad-ui (generic stores)
cd packages/cad-ui
npm install zustand immer

# In main app (app-specific stores)
cd ../..
npm install zustand immer
```

**Create store structures:**
```
# Generic stores (cad-ui) - workflow agnostic
packages/cad-ui/src/stores/
├── index.ts              # Re-exports all generic stores
├── types.ts              # Shared store types
├── selectionStore.ts     # Generic selection (category + id)
├── workflowStore.ts      # Generic workflow steps
├── transformStore.ts     # Transform mode/pivot state
├── uiStore.ts            # UI preferences (theme, panels)
└── historyStore.ts       # Generic undo/redo

# App-specific stores (fixture-view) - fixture workflow specific
src/stores/
├── index.ts              # Re-exports app stores + cad-ui stores
├── fixtureStore.ts       # Parts, supports, clamps, labels, holes
├── baseplateStore.ts     # Baseplate config + drawing mode
├── cavityStore.ts        # Cavity operations
├── processingStore.ts    # File processing, export
├── dialogStore.ts        # Modal dialogs
└── sceneStore.ts         # 3D scene state, previews
```

---

### 7.1: Generic Selection Store (Est. 1-2 hours) - IN CAD-UI

**Create `packages/cad-ui/src/stores/selectionStore.ts`:**
```typescript
/**
 * Generic Selection Store
 * 
 * Manages selection state for ANY category of items.
 * Categories are defined by the consuming application.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface SelectionState {
  /** Currently selected item: { category, id } or null */
  selected: { category: string; id: string } | null;
  
  /** Transform target (may differ from selection) */
  transformTarget: { category: string; id: string } | null;
  
  /** Multi-select support (future) */
  multiSelected: Array<{ category: string; id: string }>;
}

export interface SelectionActions {
  /** Select an item */
  select: (category: string, id: string | null) => void;
  
  /** Clear selection */
  clear: () => void;
  
  /** Set transform target */
  setTransformTarget: (category: string | null, id: string | null) => void;
  
  /** Check if item is selected */
  isSelected: (category: string, id: string) => boolean;
}

type SelectionStore = SelectionState & SelectionActions;

const INITIAL_STATE: SelectionState = {
  selected: null,
  transformTarget: null,
  multiSelected: [],
};

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...INITIAL_STATE,

        select: (category, id) => {
          set((state) => {
            if (id === null) {
              state.selected = null;
              state.transformTarget = null;
            } else {
              state.selected = { category, id };
              state.transformTarget = { category, id };
            }
          });
        },

        clear: () => {
          set(INITIAL_STATE);
        },

        setTransformTarget: (category, id) => {
          set((state) => {
            state.transformTarget = category && id ? { category, id } : null;
          });
        },

        isSelected: (category, id) => {
          const { selected } = get();
          return selected?.category === category && selected?.id === id;
        },
      }))
    ),
    { name: 'cad-selection' }
  )
);

// Selectors
export const selectSelected = (state: SelectionStore) => state.selected;
export const selectTransformTarget = (state: SelectionStore) => state.transformTarget;
```
 * Selection Store
 * 
 * Manages selection state for all component categories.
 * Replaces: selectedPartId, selectedSupportId, selectedClampId, etc.
 * Replaces events: highlight-component, clamp-selected, support-selected
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ComponentCategory } from '../navigation/types';

export interface SelectionState {
  // Selected IDs by category
  part: string | null;
  support: string | null;
  clamp: string | null;
  label: string | null;
  hole: string | null;
  baseplate: string | null;
  cavity: string | null;
  
  // Transform state for selected item
  transformTarget: {
    category: ComponentCategory | null;
    id: string | null;
  };
}

export interface SelectionActions {
  /** Select an item, optionally clearing other categories */
  select: (category: ComponentCategory, id: string | null, options?: { exclusive?: boolean }) => void;
  
  /** Clear all selections */
  clearAll: () => void;
  
  /** Clear a specific category */
  clearCategory: (category: ComponentCategory) => void;
  
  /** Set transform target (for pivot controls) */
  setTransformTarget: (category: ComponentCategory | null, id: string | null) => void;
  
  /** Get currently active selection */
  getActiveSelection: () => { category: ComponentCategory; id: string } | null;
}

type SelectionStore = SelectionState & SelectionActions;

const INITIAL_STATE: SelectionState = {
  part: null,
  support: null,
  clamp: null,
  label: null,
  hole: null,
  baseplate: null,
  cavity: null,
  transformTarget: { category: null, id: null },
};

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...INITIAL_STATE,

        select: (category, id, options = { exclusive: true }) => {
          set((state) => {
            // Clear other categories if exclusive
            if (options.exclusive) {
              Object.keys(INITIAL_STATE).forEach((key) => {
                if (key !== 'transformTarget' && key !== category) {
                  (state as any)[key] = null;
                }
              });
            }
            state[category] = id;
            
            // Also set as transform target
            if (id) {
              state.transformTarget = { category, id };
            }
          });
        },

        clearAll: () => {
          set(INITIAL_STATE);
        },

        clearCategory: (category) => {
          set((state) => {
            state[category] = null;
            if (state.transformTarget.category === category) {
              state.transformTarget = { category: null, id: null };
            }
          });
        },

        setTransformTarget: (category, id) => {
          set((state) => {
            state.transformTarget = { category, id };
          });
        },

        getActiveSelection: () => {
          const state = get();
          for (const cat of ['part', 'support', 'clamp', 'label', 'hole', 'baseplate', 'cavity'] as ComponentCategory[]) {
            if (state[cat]) {
              return { category: cat, id: state[cat]! };
            }
          }
          return null;
        },
      }))
    ),
    { name: 'selection-store' }
  )
);

// Selectors for optimized re-renders
export const selectPart = (state: SelectionStore) => state.part;
export const selectSupport = (state: SelectionStore) => state.support;
export const selectClamp = (state: SelectionStore) => state.clamp;
export const selectLabel = (state: SelectionStore) => state.label;
export const selectHole = (state: SelectionStore) => state.hole;
export const selectBaseplate = (state: SelectionStore) => state.baseplate;
export const selectTransformTarget = (state: SelectionStore) => state.transformTarget;
```

**Usage in Components:**
```typescript
// In ClampMesh.tsx - no more onDoubleClick prop drilling!
import { useSelectionStore } from '@rapidtool/cad-ui';

function ClampMesh({ placedClamp }) {
  const select = useSelectionStore(state => state.select);
  
  return (
    <mesh
      onDoubleClick={() => select('clamp', placedClamp.id)}
    />
  );
}

// In 3DScene.tsx - subscribe to selection changes
const selectedClampId = useSelectionStore(selectClamp);

// In AppShell.tsx - replace 6 useState calls with one subscription
const { part, support, clamp } = useSelectionStore(state => ({
  part: state.part,
  support: state.support,
  clamp: state.clamp,
}));
```

---

### 7.2: Workflow Store (Est. 1-2 hours)

**Problem:** Workflow state scattered, custom events for step changes.

**Current Code (AppShell.tsx + ContextOptionsPanel):**
```typescript
const [activeStep, setActiveStep] = useState<WorkflowStep | null>(null);
// Plus event listeners for workflow-step-changed, highlight-component
```

**Solution:** Create `workflowStore` with automatic accordion sync.

**Create `packages/cad-ui/src/stores/workflowStore.ts`:**
```typescript
/**
 * Workflow Store
 * 
 * Manages workflow step state and accordion synchronization.
 * Replaces: activeStep, workflow-step-changed event, highlight-component event
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { CATEGORY_TO_STEP, STEP_TO_ACCORDION, type WorkflowStep, type ComponentCategory } from '../navigation/types';

export interface WorkflowState {
  /** Current active workflow step */
  activeStep: WorkflowStep | null;
  
  /** Accordion that should be open */
  activeAccordion: string | null;
  
  /** Sub-accordion that should be open */
  activeSubAccordion: string | null;
  
  /** History of visited steps (for back navigation) */
  stepHistory: WorkflowStep[];
}

export interface WorkflowActions {
  /** Set active step directly */
  setActiveStep: (step: WorkflowStep | null) => void;
  
  /** Navigate to step for a component category */
  navigateToCategory: (category: ComponentCategory) => void;
  
  /** Set accordion state */
  setActiveAccordion: (accordion: string | null, subAccordion?: string | null) => void;
  
  /** Go back to previous step */
  goBack: () => void;
  
  /** Reset workflow */
  reset: () => void;
}

type WorkflowStore = WorkflowState & WorkflowActions;

const INITIAL_STATE: WorkflowState = {
  activeStep: null,
  activeAccordion: null,
  activeSubAccordion: null,
  stepHistory: [],
};

export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...INITIAL_STATE,

        setActiveStep: (step) => {
          set((state) => {
            // Add to history if navigating to new step
            if (step && state.activeStep && state.activeStep !== step) {
              state.stepHistory.push(state.activeStep);
              // Keep history limited
              if (state.stepHistory.length > 10) {
                state.stepHistory.shift();
              }
            }
            
            state.activeStep = step;
            
            // Auto-sync accordion
            if (step && STEP_TO_ACCORDION[step]) {
              const accordionConfig = STEP_TO_ACCORDION[step];
              state.activeAccordion = accordionConfig.accordion;
              state.activeSubAccordion = accordionConfig.subAccordion || null;
            }
          });
        },

        navigateToCategory: (category) => {
          const step = CATEGORY_TO_STEP[category];
          if (step) {
            get().setActiveStep(step);
          }
        },

        setActiveAccordion: (accordion, subAccordion = null) => {
          set((state) => {
            state.activeAccordion = accordion;
            state.activeSubAccordion = subAccordion;
          });
        },

        goBack: () => {
          set((state) => {
            const prevStep = state.stepHistory.pop();
            if (prevStep) {
              state.activeStep = prevStep;
              if (STEP_TO_ACCORDION[prevStep]) {
                const accordionConfig = STEP_TO_ACCORDION[prevStep];
                state.activeAccordion = accordionConfig.accordion;
                state.activeSubAccordion = accordionConfig.subAccordion || null;
              }
            }
          });
        },

        reset: () => {
          set(INITIAL_STATE);
        },
      }))
    ),
    { name: 'workflow-store' }
  )
);

// Selectors
export const selectActiveStep = (state: WorkflowStore) => state.activeStep;
export const selectActiveAccordion = (state: WorkflowStore) => state.activeAccordion;
export const selectActiveSubAccordion = (state: WorkflowStore) => state.activeSubAccordion;
```

**Integration with Selection Store:**
```typescript
// In cad-ui/src/stores/index.ts - combine stores for cross-store effects

import { useSelectionStore } from './selectionStore';
import { useWorkflowStore } from './workflowStore';
import { CATEGORY_TO_STEP } from '../navigation/types';

// Subscribe to selection changes and auto-navigate workflow
useSelectionStore.subscribe(
  (state) => state.getActiveSelection(),
  (selection) => {
    if (selection) {
      const step = CATEGORY_TO_STEP[selection.category];
      if (step) {
        useWorkflowStore.getState().setActiveStep(step);
      }
    }
  }
);
```

**This eliminates the custom event system!**
```typescript
// BEFORE: Custom events
window.dispatchEvent(new CustomEvent('highlight-component', { detail: { category: 'clamp', id } }));
// ... listener in AppShell
// ... dispatch workflow-step-changed
// ... listener in PartPropertiesAccordion

// AFTER: Direct state update with automatic sync
useSelectionStore.getState().select('clamp', id);
// Workflow store automatically updates via subscription
// Accordions re-render reactively
```

---

### 7.3: Transform Store (Est. 1 hour)

**Problem:** Transform mode, pivot state scattered across components.

**Create `packages/cad-ui/src/stores/transformStore.ts`:**
```typescript
/**
 * Transform Store
 * 
 * Manages transform controls state.
 * Replaces: transformMode, isPivotMode, activePivotControl
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type TransformMode = 'translate' | 'rotate' | 'scale' | 'off';
export type CoordinateSpace = 'local' | 'world';

export interface TransformState {
  mode: TransformMode;
  space: CoordinateSpace;
  isPivotMode: boolean;
  activePivotControl: string | null;
  snapEnabled: boolean;
  snapTranslate: number;
  snapRotate: number;
  snapScale: number;
}

export interface TransformActions {
  setMode: (mode: TransformMode) => void;
  setSpace: (space: CoordinateSpace) => void;
  togglePivotMode: () => void;
  setActivePivotControl: (id: string | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapValues: (translate?: number, rotate?: number, scale?: number) => void;
  reset: () => void;
}

type TransformStore = TransformState & TransformActions;

const INITIAL_STATE: TransformState = {
  mode: 'translate',
  space: 'local',
  isPivotMode: false,
  activePivotControl: null,
  snapEnabled: false,
  snapTranslate: 10,
  snapRotate: 15,
  snapScale: 0.1,
};

export const useTransformStore = create<TransformStore>()(
  devtools(
    immer((set) => ({
      ...INITIAL_STATE,

      setMode: (mode) => set((state) => { state.mode = mode; }),
      
      setSpace: (space) => set((state) => { state.space = space; }),
      
      togglePivotMode: () => set((state) => { 
        state.isPivotMode = !state.isPivotMode; 
      }),
      
      setActivePivotControl: (id) => set((state) => { 
        state.activePivotControl = id; 
      }),
      
      setSnapEnabled: (enabled) => set((state) => { 
        state.snapEnabled = enabled; 
      }),
      
      setSnapValues: (translate, rotate, scale) => set((state) => {
        if (translate !== undefined) state.snapTranslate = translate;
        if (rotate !== undefined) state.snapRotate = rotate;
        if (scale !== undefined) state.snapScale = scale;
      }),
      
      reset: () => set(INITIAL_STATE),
    })),
    { name: 'transform-store' }
  )
);
```

---

### 7.4: UI Store (Est. 30 mins)

**Create `packages/cad-ui/src/stores/uiStore.ts`:**
```typescript
/**
 * UI Store
 * 
 * Manages UI preferences and panel state.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  showGrid: boolean;
  showAxes: boolean;
  showLabels: boolean;
  showDebugInfo: boolean;
}

export interface UIActions {
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setViewOption: (option: keyof Pick<UIState, 'showGrid' | 'showAxes' | 'showLabels' | 'showDebugInfo'>, value: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set) => ({
        theme: 'system',
        sidebarOpen: true,
        rightPanelOpen: true,
        showGrid: true,
        showAxes: true,
        showLabels: true,
        showDebugInfo: false,

        setTheme: (theme) => set((state) => { state.theme = theme; }),
        toggleSidebar: () => set((state) => { state.sidebarOpen = !state.sidebarOpen; }),
        toggleRightPanel: () => set((state) => { state.rightPanelOpen = !state.rightPanelOpen; }),
        setViewOption: (option, value) => set((state) => { state[option] = value; }),
      })),
      { name: 'cad-ui-preferences' }
    ),
    { name: 'ui-store' }
  )
);
```

---

### 7.5: Store Index & Exports (Est. 30 mins)

**Create `packages/cad-ui/src/stores/index.ts`:**
```typescript
/**
 * CAD UI Stores
 * 
 * Central state management for CAD applications using Zustand.
 */

// Selection
export {
  useSelectionStore,
  selectPart,
  selectSupport,
  selectClamp,
  selectLabel,
  selectHole,
  selectBaseplate,
  selectTransformTarget,
  type SelectionState,
  type SelectionActions,
} from './selectionStore';

// Workflow
export {
  useWorkflowStore,
  selectActiveStep,
  selectActiveAccordion,
  selectActiveSubAccordion,
  type WorkflowState,
  type WorkflowActions,
} from './workflowStore';

// Transform
export {
  useTransformStore,
  type TransformState,
  type TransformActions,
  type TransformMode,
  type CoordinateSpace,
} from './transformStore';

// UI
export {
  useUIStore,
  type UIState,
  type UIActions,
} from './uiStore';

// Cross-store subscriptions (auto-sync selection → workflow)
import { useSelectionStore } from './selectionStore';
import { useWorkflowStore } from './workflowStore';
import { CATEGORY_TO_STEP } from '../navigation/types';

// Initialize cross-store sync on module load
if (typeof window !== 'undefined') {
  useSelectionStore.subscribe(
    (state) => {
      for (const cat of ['part', 'support', 'clamp', 'label', 'hole', 'baseplate', 'cavity'] as const) {
        if (state[cat]) return { category: cat, id: state[cat] };
      }
      return null;
    },
    (selection) => {
      if (selection) {
        const step = CATEGORY_TO_STEP[selection.category];
        if (step) {
          useWorkflowStore.getState().setActiveStep(step);
        }
      }
    }
  );
}
```

**Update `packages/cad-ui/src/index.ts`:**
```typescript
// ... existing exports ...

// Stores
export * from './stores';
```

---

### 7.6: Migrate AppShell.tsx (Est. 2-3 hours)

**Before (AppShell.tsx - 2,009 lines):**
```typescript
// 15+ useState calls
const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
// ... more state

// 10+ event listeners
useEffect(() => {
  const handleHighlightComponent = (e) => { ... };
  window.addEventListener('highlight-component', handleHighlightComponent);
  return () => window.removeEventListener('highlight-component', handleHighlightComponent);
}, []);
// ... more listeners

// Passing 30+ props to 3DScene
<ThreeDScene
  selectedPartId={selectedPartId}
  setSelectedPartId={setSelectedPartId}
  selectedSupportId={selectedSupportId}
  setSelectedSupportId={setSelectedSupportId}
  // ... 25 more props
/>
```

**After (AppShell.tsx - ~500 lines):**
```typescript
import { 
  useSelectionStore, 
  useWorkflowStore, 
  useTransformStore,
  useUIStore 
} from '@rapidtool/cad-ui';

function AppShell() {
  // ✅ All selection state from store (replaces 6 useState calls)
  const { part: selectedPartId, clamp: selectedClampId } = useSelectionStore();
  
  // ✅ Workflow state from store (replaces event listeners)
  const { activeStep, activeAccordion } = useWorkflowStore();
  
  // ✅ Transform state from store
  const { mode: transformMode, isPivotMode } = useTransformStore();

  // ✅ App-specific state (cavity, baseplate config) stays local or in app stores
  const [cavityPreview, setCavityPreview] = useState<CavityPreview | null>(null);
  
  // No more event listeners needed!
  // Selection changes automatically sync workflow via store subscription
  
  return (
    <div>
      <ThreeDScene 
        // ✅ Only pass app-specific data, not selection/workflow state
        parts={parts}
        cavityPreview={cavityPreview}
      />
      <PartPropertiesAccordion />
    </div>
  );
}
```

---

### 7.7: Migrate 3DScene.tsx (Est. 2-3 hours)

**Before (3DScene.tsx - 2,262 lines):**
```typescript
interface ThreeDSceneProps {
  selectedPartId: string | null;
  setSelectedPartId: (id: string | null) => void;
  selectedSupportId: string | null;
  setSelectedSupportId: (id: string | null) => void;
  // ... 25 more props
}

// Inline event handlers with prop callbacks
<ClampWithSupport
  onDoubleClick={(id) => {
    setSelectedClampId(id);
    window.dispatchEvent(new CustomEvent('highlight-component', { ... }));
  }}
/>
```

**After (3DScene.tsx - ~500 lines):**
```typescript
import { useSelectionStore, useTransformStore } from '@rapidtool/cad-ui';

interface ThreeDSceneProps {
  // ✅ Only app-specific data props
  parts: Part[];
  placedClamps: PlacedClamp[];
  placedSupports: PlacedSupport[];
  cavityPreview: CavityPreview | null;
  // No more selection/callback props!
}

function ThreeDScene({ parts, placedClamps, placedSupports, cavityPreview }: ThreeDSceneProps) {
  // ✅ Get state directly from stores
  const selectedClampId = useSelectionStore(selectClamp);
  const transformMode = useTransformStore(state => state.mode);
  
  // ✅ Get actions for updates
  const select = useSelectionStore(state => state.select);
  
  return (
    <Canvas>
      {placedClamps.map(clamp => (
        <ClampWithSupport
          key={clamp.id}
          clamp={clamp}
          isSelected={selectedClampId === clamp.id}
          // ✅ Simple handler, no prop drilling
          onDoubleClick={() => select('clamp', clamp.id)}
        />
      ))}
    </Canvas>
  );
}
```

---

### 7.8: Remove Custom Event System (Est. 1-2 hours)

**Events to Remove:**

| Event | Replacement |
|-------|-------------|
| `highlight-component` | `useSelectionStore.select(category, id)` |
| `workflow-step-changed` | Auto-sync via store subscription |
| `clamp-selected` | `useSelectionStore.select('clamp', id)` |
| `support-selected` | `useSelectionStore.select('support', id)` |
| `pivot-control-activated` | `useTransformStore.setActivePivotControl(id)` |

**Search and replace pattern:**
```typescript
// BEFORE
window.dispatchEvent(new CustomEvent('highlight-component', { 
  detail: { category: 'clamp', id } 
}));

// AFTER
import { useSelectionStore } from '@rapidtool/cad-ui';
useSelectionStore.getState().select('clamp', id);
```

---

## Migration Strategy

### Step-by-Step Migration

1. **Install & Setup** (7.0) - Non-breaking, adds dependencies
2. **Create Stores** (7.1-7.4) - Non-breaking, adds new code
3. **Export Stores** (7.5) - Non-breaking, exposes API
4. **Migrate Components Gradually** (7.6-7.7):
   - Start with leaf components (ClampMesh, SupportMesh)
   - Move up to container components (3DScene)
   - Finally migrate AppShell
5. **Remove Events** (7.8) - Breaking, remove old system

### Coexistence During Migration

During migration, both systems can coexist:
```typescript
// Temporary bridge - dispatch event AND update store
const handleSelect = (id: string) => {
  // New: Update store
  useSelectionStore.getState().select('clamp', id);
  
  // Old: Dispatch event (remove after full migration)
  window.dispatchEvent(new CustomEvent('clamp-selected', { detail: id }));
};
```

---

## Estimated Impact

### Code Reduction

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| AppShell.tsx | 2,009 lines | ~500 lines | **75%** |
| 3DScene.tsx | 2,262 lines | ~500 lines | **78%** |
| Event listeners | 10+ useEffects | 0 | **100%** |
| Props drilling | 30+ props | ~10 props | **67%** |

### Developer Experience

- ✅ **Redux DevTools** - Time-travel debugging
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Testability** - Easy to mock stores in tests
- ✅ **Performance** - Selector-based subscriptions minimize re-renders
- ✅ **Traceability** - State changes visible in devtools

---

## Complete State Inventory & Migration Map

### AppShell.tsx State (47 useState calls)

#### Selection State → `selectionStore` (cad-ui)

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `selectedPartId` | `string \| null` | `selectionStore.part` |
| `selectedSupportId` | `string \| null` | `selectionStore.support` |
| `selectedClampId` | `string \| null` | `selectionStore.clamp` |
| `selectedLabelId` | `string \| null` | `selectionStore.label` |
| `selectedHoleId` | `string \| null` | `selectionStore.hole` |
| `selectedBasePlateSectionId` | `string \| null` | `selectionStore.baseplate` |

#### Workflow State → `workflowStore` (cad-ui)

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `activeStep` | `WorkflowStep` | `workflowStore.activeStep` |
| `completedSteps` | `WorkflowStep[]` | `workflowStore.completedSteps` |
| `skippedSteps` | `WorkflowStep[]` | `workflowStore.skippedSteps` |

#### UI State → `uiStore` (cad-ui)

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isContextPanelCollapsed` | `boolean` | `uiStore.contextPanelCollapsed` |
| `isPropertiesCollapsed` | `boolean` | `uiStore.propertiesPanelCollapsed` |
| `baseplateVisible` | `boolean` | `uiStore.baseplateVisible` |

#### Entity Data → `fixtureStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `importedParts` | `ProcessedFile[]` | `fixtureStore.parts` |
| `partVisibility` | `Map<string, boolean>` | `fixtureStore.partVisibility` |
| `modelColors` | `Map<string, string>` | `fixtureStore.partColors` |
| `supports` | `AnySupport[]` | `fixtureStore.supports` |
| `clamps` | `PlacedClamp[]` | `fixtureStore.clamps` |
| `labels` | `LabelConfig[]` | `fixtureStore.labels` |
| `mountingHoles` | `PlacedHole[]` | `fixtureStore.holes` |
| `currentBaseplate` | `BaseplateConfig \| null` | `fixtureStore.baseplate` |
| `drawnBaseplateSections` | `Section[]` | `fixtureStore.baseplateSections` |

#### Baseplate Drawing State → `baseplateDrawingStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isBaseplateDrawingMode` | `boolean` | `baseplateDrawingStore.isDrawingMode` |
| `currentBaseplateParams` | `{ padding, height }` | `baseplateDrawingStore.params` |

#### Hole Placement State → `holePlacementStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isHolePlacementMode` | `boolean` | `holePlacementStore.isPlacementMode` |
| `pendingHoleConfig` | `HoleConfig \| null` | `holePlacementStore.pendingConfig` |

#### Support Placement State → `supportPlacementStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isPlacementMode` | `boolean` | `supportPlacementStore.isPlacementMode` |
| `selectedSupportType` | `SupportType` | `supportPlacementStore.selectedType` |

#### Cavity State → `cavityStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `cavityClearance` | `number` | `cavityStore.clearance` |
| `cavitySettings` | `CavitySettings` | `cavityStore.settings` |
| `isCavityProcessing` | `boolean` | `cavityStore.isProcessing` |
| `isApplyingCavity` | `boolean` | `cavityStore.isApplying` |
| `hasCavityPreview` | `boolean` | `cavityStore.hasPreview` |
| `isCavityApplied` | `boolean` | `cavityStore.isApplied` |

#### Processing/Loading State → `processingStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isProcessing` | `boolean` | `processingStore.isProcessing` |
| `fileError` | `string \| null` | `processingStore.error` |
| `isMeshProcessing` | `boolean` | `processingStore.isMeshProcessing` |
| `meshProgress` | `MeshProcessingProgress \| null` | `processingStore.meshProgress` |
| `meshAnalysis` | `MeshAnalysisResult \| null` | `processingStore.meshAnalysis` |
| `pendingProcessedFile` | `ProcessedFile \| null` | `processingStore.pendingFile` |
| `pendingFileSize` | `number \| undefined` | `processingStore.pendingFileSize` |
| `processingResult` | `ProcessingResult \| null` | `processingStore.result` |
| `isExporting` | `boolean` | `processingStore.isExporting` |

#### Dialog State → `dialogStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `isUnitsDialogOpen` | `boolean` | `dialogStore.unitsDialogOpen` |
| `isOptimizationDialogOpen` | `boolean` | `dialogStore.optimizationDialogOpen` |

#### Undo/Redo State → `historyStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `undoStack` | `any[]` | `historyStore.undoStack` |
| `redoStack` | `any[]` | `historyStore.redoStack` |

---

### 3DScene.tsx State (12 useState calls)

#### Scene-Specific State → `sceneStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `orbitControlsEnabled` | `boolean` | `sceneStore.orbitControlsEnabled` |
| `currentOrientation` | `ViewOrientation` | `sceneStore.currentOrientation` |
| `isDraggingAnyItem` | `boolean` | `sceneStore.isDragging` |

#### Preview State → `previewStore` (cad-ui) **NEW**

| Current State | Type | → Store Property |
|---------------|------|------------------|
| `cavityPreview` | `THREE.Mesh \| null` | `previewStore.cavityMesh` |
| `offsetMeshPreviews` | `Map<string, THREE.Mesh>` | `previewStore.offsetMeshes` |
| `offsetMeshProcessing` | `boolean` | `previewStore.isProcessing` |
| `showOffsetPreview` | `boolean` | `previewStore.showOffset` |
| `mergedFixtureMesh` | `THREE.Mesh \| null` | `previewStore.mergedMesh` |

#### Component State (Keep Local - Not Shared)

| Current State | Type | Notes |
|---------------|------|-------|
| `placedComponents` | `Array<...>` | Legacy - appears unused |
| `selectedComponent` | `unknown` | Legacy - appears unused |
| `itemBoundsUpdateTrigger` | `number` | Internal render trigger |

---

### Event Listeners to Eliminate

#### AppShell.tsx Event Listeners (20+)

| Event | Handler | → Zustand Action |
|-------|---------|------------------|
| `highlight-component` | `handleHighlightComponent` | `selectionStore.select(category, id)` |
| `create-baseplate` | `handleBaseplateCreated` | `fixtureStore.setBaseplate(config)` |
| `baseplate-section-drawn` | `handleSectionDrawn` | `fixtureStore.addBaseplateSection(section)` |
| `baseplate-section-updated` | `handleBasePlateSectionUpdated` | `fixtureStore.updateBaseplateSection(id, data)` |
| `baseplate-section-selected` | `handleSectionSelected` | `selectionStore.select('baseplate', id)` |
| `baseplate-config-updated` | `handleConfigUpdate` | `fixtureStore.updateBaseplateConfig(config)` |
| `support-created` | `onSupportCreated` | `fixtureStore.addSupport(support)` |
| `support-updated` | `onSupportUpdated` | `fixtureStore.updateSupport(id, data)` |
| `support-delete` | `onSupportDelete` | `fixtureStore.removeSupport(id)` |
| `supports-clear-all` | `onSupportsClearAll` | `fixtureStore.clearSupports()` |
| `supports-cancel-placement` | `onCancelPlacement` | `supportPlacementStore.cancel()` |
| `supports-auto-placed` | `onSupportsAutoPlaced` | `fixtureStore.setSupports(supports)` |
| `label-update` | `onLabelUpdate` | `fixtureStore.updateLabel(id, data)` |
| `label-added` | `onLabelAdded` | `fixtureStore.addLabel(label)` |
| `hole-placed` | `handleHoleCreated` | `fixtureStore.addHole(hole)` |
| `hole-placement-cancelled` | `handlePlacementCancelled` | `holePlacementStore.cancel()` |
| `hole-select-request` | `handleHoleSelectRequest` | `selectionStore.select('hole', id)` |
| `hole-updated` | `handleHoleUpdatedFrom3D` | `fixtureStore.updateHole(id, data)` |
| `offset-mesh-preview-complete` | `handleComplete` | `previewStore.setOffsetMesh(id, mesh)` |
| `cavity-subtraction-complete` | `handleComplete` | `cavityStore.setApplied(true)` |
| `export-complete` | `handleExportComplete` | `processingStore.setExporting(false)` |
| `clamp-selected` | handler in clamp effect | `selectionStore.select('clamp', id)` |

---

### Updated Store Architecture

```
packages/cad-ui/src/stores/
├── index.ts                    # Re-exports + cross-store subscriptions
├── types.ts                    # Shared types
│
├── selectionStore.ts           # Selection state (existing in plan)
├── workflowStore.ts            # Workflow + accordion sync (existing in plan)
├── transformStore.ts           # Transform mode/pivot (existing in plan)
├── uiStore.ts                  # UI preferences, persisted (existing in plan)
│
├── fixtureStore.ts             # NEW: Entity data (parts, supports, clamps, etc.)
├── baseplateDrawingStore.ts    # NEW: Baseplate drawing mode
├── holePlacementStore.ts       # NEW: Hole placement mode
├── supportPlacementStore.ts    # NEW: Support placement mode
├── cavityStore.ts              # NEW: Cavity operations
├── processingStore.ts          # NEW: File processing, export
├── dialogStore.ts              # NEW: Modal dialog states
├── historyStore.ts             # NEW: Undo/redo stacks
├── sceneStore.ts               # NEW: 3D scene state
└── previewStore.ts             # NEW: Mesh previews (cavity, offset)
```

---

### New Store Definitions

#### 7.9: Fixture Store (Est. 2-3 hours) **NEW**

**Create `packages/cad-ui/src/stores/fixtureStore.ts`:**
```typescript
/**
 * Fixture Store
 * 
 * Manages all fixture entity data: parts, supports, clamps, labels, holes, baseplate.
 * This is the main data store - the "source of truth" for the fixture design.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface FixtureState {
  // Parts
  parts: ProcessedFile[];
  partVisibility: Record<string, boolean>;
  partColors: Record<string, string>;
  
  // Supports
  supports: AnySupport[];
  
  // Clamps
  clamps: PlacedClamp[];
  
  // Labels
  labels: LabelConfig[];
  
  // Holes
  holes: PlacedHole[];
  
  // Baseplate
  baseplate: BaseplateConfig | null;
  baseplateSections: BaseplateSection[];
}

export interface FixtureActions {
  // Parts
  addPart: (part: ProcessedFile) => void;
  removePart: (id: string) => void;
  updatePart: (id: string, data: Partial<ProcessedFile>) => void;
  setPartVisibility: (id: string, visible: boolean) => void;
  setPartColor: (id: string, color: string) => void;
  
  // Supports
  addSupport: (support: AnySupport) => void;
  removeSupport: (id: string) => void;
  updateSupport: (id: string, data: Partial<AnySupport>) => void;
  setSupports: (supports: AnySupport[]) => void;
  clearSupports: () => void;
  
  // Clamps
  addClamp: (clamp: PlacedClamp) => void;
  removeClamp: (id: string) => void;
  updateClamp: (id: string, data: Partial<PlacedClamp>) => void;
  setClamps: (clamps: PlacedClamp[]) => void;
  
  // Labels
  addLabel: (label: LabelConfig) => void;
  removeLabel: (id: string) => void;
  updateLabel: (id: string, data: Partial<LabelConfig>) => void;
  
  // Holes
  addHole: (hole: PlacedHole) => void;
  removeHole: (id: string) => void;
  updateHole: (id: string, data: Partial<PlacedHole>) => void;
  
  // Baseplate
  setBaseplate: (config: BaseplateConfig | null) => void;
  addBaseplateSection: (section: BaseplateSection) => void;
  updateBaseplateSection: (id: string, data: Partial<BaseplateSection>) => void;
  removeBaseplateSection: (id: string) => void;
  
  // Bulk operations
  reset: () => void;
  loadFixture: (data: FixtureState) => void;
}

type FixtureStore = FixtureState & FixtureActions;

const INITIAL_STATE: FixtureState = {
  parts: [],
  partVisibility: {},
  partColors: {},
  supports: [],
  clamps: [],
  labels: [],
  holes: [],
  baseplate: null,
  baseplateSections: [],
};

export const useFixtureStore = create<FixtureStore>()(
  devtools(
    subscribeWithSelector(
      immer((set) => ({
        ...INITIAL_STATE,

        // Parts
        addPart: (part) => set((state) => { state.parts.push(part); }),
        removePart: (id) => set((state) => { 
          state.parts = state.parts.filter(p => p.id !== id); 
        }),
        updatePart: (id, data) => set((state) => {
          const idx = state.parts.findIndex(p => p.id === id);
          if (idx !== -1) Object.assign(state.parts[idx], data);
        }),
        setPartVisibility: (id, visible) => set((state) => { 
          state.partVisibility[id] = visible; 
        }),
        setPartColor: (id, color) => set((state) => { 
          state.partColors[id] = color; 
        }),

        // Supports
        addSupport: (support) => set((state) => { state.supports.push(support); }),
        removeSupport: (id) => set((state) => { 
          state.supports = state.supports.filter(s => s.id !== id); 
        }),
        updateSupport: (id, data) => set((state) => {
          const idx = state.supports.findIndex(s => s.id === id);
          if (idx !== -1) Object.assign(state.supports[idx], data);
        }),
        setSupports: (supports) => set((state) => { state.supports = supports; }),
        clearSupports: () => set((state) => { state.supports = []; }),

        // Clamps
        addClamp: (clamp) => set((state) => { state.clamps.push(clamp); }),
        removeClamp: (id) => set((state) => { 
          state.clamps = state.clamps.filter(c => c.id !== id); 
        }),
        updateClamp: (id, data) => set((state) => {
          const idx = state.clamps.findIndex(c => c.id === id);
          if (idx !== -1) Object.assign(state.clamps[idx], data);
        }),
        setClamps: (clamps) => set((state) => { state.clamps = clamps; }),

        // Labels
        addLabel: (label) => set((state) => { state.labels.push(label); }),
        removeLabel: (id) => set((state) => { 
          state.labels = state.labels.filter(l => l.id !== id); 
        }),
        updateLabel: (id, data) => set((state) => {
          const idx = state.labels.findIndex(l => l.id === id);
          if (idx !== -1) Object.assign(state.labels[idx], data);
        }),

        // Holes
        addHole: (hole) => set((state) => { state.holes.push(hole); }),
        removeHole: (id) => set((state) => { 
          state.holes = state.holes.filter(h => h.id !== id); 
        }),
        updateHole: (id, data) => set((state) => {
          const idx = state.holes.findIndex(h => h.id === id);
          if (idx !== -1) Object.assign(state.holes[idx], data);
        }),

        // Baseplate
        setBaseplate: (config) => set((state) => { state.baseplate = config; }),
        addBaseplateSection: (section) => set((state) => { 
          state.baseplateSections.push(section); 
        }),
        updateBaseplateSection: (id, data) => set((state) => {
          const idx = state.baseplateSections.findIndex(s => s.id === id);
          if (idx !== -1) Object.assign(state.baseplateSections[idx], data);
        }),
        removeBaseplateSection: (id) => set((state) => { 
          state.baseplateSections = state.baseplateSections.filter(s => s.id !== id); 
        }),

        // Bulk
        reset: () => set(INITIAL_STATE),
        loadFixture: (data) => set(data),
      }))
    ),
    { name: 'fixture-store' }
  )
);
```

#### 7.10: Placement Mode Stores (Est. 1 hour) **NEW**

```typescript
// packages/cad-ui/src/stores/supportPlacementStore.ts
export const useSupportPlacementStore = create<SupportPlacementStore>()(
  devtools(
    immer((set) => ({
      isPlacementMode: false,
      selectedType: 'cylindrical' as SupportType,
      
      startPlacement: (type) => set((state) => {
        state.isPlacementMode = true;
        state.selectedType = type;
      }),
      cancel: () => set((state) => { state.isPlacementMode = false; }),
      setType: (type) => set((state) => { state.selectedType = type; }),
    })),
    { name: 'support-placement-store' }
  )
);

// packages/cad-ui/src/stores/holePlacementStore.ts
export const useHolePlacementStore = create<HolePlacementStore>()(
  devtools(
    immer((set) => ({
      isPlacementMode: false,
      pendingConfig: null,
      
      startPlacement: (config) => set((state) => {
        state.isPlacementMode = true;
        state.pendingConfig = config;
      }),
      cancel: () => set((state) => { 
        state.isPlacementMode = false;
        state.pendingConfig = null;
      }),
    })),
    { name: 'hole-placement-store' }
  )
);

// packages/cad-ui/src/stores/baseplateDrawingStore.ts
export const useBaseplateDrawingStore = create<BaseplateDrawingStore>()(
  devtools(
    immer((set) => ({
      isDrawingMode: false,
      params: { padding: 5, height: 4 },
      
      startDrawing: (params) => set((state) => {
        state.isDrawingMode = true;
        if (params) state.params = params;
      }),
      stopDrawing: () => set((state) => { state.isDrawingMode = false; }),
      setParams: (params) => set((state) => { state.params = params; }),
    })),
    { name: 'baseplate-drawing-store' }
  )
);
```

#### 7.11: Processing & Dialog Stores (Est. 1 hour) **NEW**

```typescript
// packages/cad-ui/src/stores/processingStore.ts
export const useProcessingStore = create<ProcessingStore>()(
  devtools(
    immer((set) => ({
      isProcessing: false,
      isMeshProcessing: false,
      isExporting: false,
      error: null,
      meshProgress: null,
      meshAnalysis: null,
      pendingFile: null,
      pendingFileSize: undefined,
      result: null,
      
      setProcessing: (isProcessing) => set((state) => { state.isProcessing = isProcessing; }),
      setError: (error) => set((state) => { state.error = error; }),
      setMeshProgress: (progress) => set((state) => { state.meshProgress = progress; }),
      // ... etc
    })),
    { name: 'processing-store' }
  )
);

// packages/cad-ui/src/stores/dialogStore.ts
export const useDialogStore = create<DialogStore>()(
  devtools(
    immer((set) => ({
      unitsDialogOpen: false,
      optimizationDialogOpen: false,
      
      openUnitsDialog: () => set((state) => { state.unitsDialogOpen = true; }),
      closeUnitsDialog: () => set((state) => { state.unitsDialogOpen = false; }),
      openOptimizationDialog: () => set((state) => { state.optimizationDialogOpen = true; }),
      closeOptimizationDialog: () => set((state) => { state.optimizationDialogOpen = false; }),
    })),
    { name: 'dialog-store' }
  )
);
```

#### 7.12: History Store with Undo/Redo (Est. 1-2 hours) **NEW**

```typescript
// packages/cad-ui/src/stores/historyStore.ts
import { useFixtureStore } from './fixtureStore';

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    immer((set, get) => ({
      undoStack: [],
      redoStack: [],
      
      // Capture current fixture state before changes
      captureState: () => {
        const fixtureState = useFixtureStore.getState();
        set((state) => {
          state.undoStack.push(JSON.parse(JSON.stringify(fixtureState)));
          state.redoStack = []; // Clear redo on new action
          // Keep max 50 undo states
          if (state.undoStack.length > 50) state.undoStack.shift();
        });
      },
      
      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        
        // Save current state to redo
        const currentState = useFixtureStore.getState();
        set((state) => {
          state.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        });
        
        // Pop and apply last undo state
        set((state) => {
          const prevState = state.undoStack.pop();
          if (prevState) {
            useFixtureStore.getState().loadFixture(prevState);
          }
        });
      },
      
      redo: () => {
        const { redoStack } = get();
        if (redoStack.length === 0) return;
        
        // Save current to undo
        const currentState = useFixtureStore.getState();
        set((state) => {
          state.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        });
        
        // Pop and apply redo state
        set((state) => {
          const nextState = state.redoStack.pop();
          if (nextState) {
            useFixtureStore.getState().loadFixture(nextState);
          }
        });
      },
      
      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
    })),
    { name: 'history-store' }
  )
);
```

---

## Pre-Phase Assessment

### What's Working Well

✅ Navigation system centralized in `@rapidtool/cad-ui`
✅ 3DScene hooks well-organized in `src/components/3DScene/hooks/`
✅ Feature modules isolated (`supports`, `clamps`, `labels`, `holes`, `baseplate`)
✅ CSG operations in `@rapidtool/cad-core`

### Pain Points

❌ AppShell manages 15+ different state categories
❌ Selection state scattered (partId, supportId, clampId, labelId, holeId, baseplateSection)
❌ Workflow state mixed with UI state
❌ File processing logic embedded in AppShell
❌ 3DScene still has inline handlers that could be extracted

---

## Appendix A: Legacy Hook-Based Approach (SUPERSEDED)

> **Note:** The sections below describe an earlier hook-based approach using `useState`/`useCallback`.
> This has been **superseded by the Zustand store approach** described above (sections 7.0-7.8).
> The Zustand approach provides:
> - Global state without prop drilling
> - Cross-component reactivity without custom events
> - Redux DevTools integration
> - Better performance with selectors
>
> The legacy hook approach is kept here for reference only.

### Legacy 7.1: Extract Selection State Hook (Est. 1-2 hours)

**Problem:** AppShell manages 6 different selection states with similar patterns.

**Current Code (AppShell.tsx):**
```typescript
const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);
const [selectedClampId, setSelectedClampId] = useState<string | null>(null);
const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
const [selectedBasePlateSectionId, setSelectedBasePlateSectionId] = useState<string | null>(null);
```

**Solution:** Create `useSelectionState` hook in `@rapidtool/cad-ui`.

**Create `packages/cad-ui/src/hooks/useSelectionState.ts`:**
```typescript
/**
 * useSelectionState Hook
 * 
 * Manages selection state for multiple component categories.
 * Ensures only one item is selected at a time across all categories.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ComponentCategory } from '../navigation/types';

export interface SelectionState {
  part: string | null;
  support: string | null;
  clamp: string | null;
  label: string | null;
  hole: string | null;
  baseplate: string | null;
  cavity: string | null;
}

export interface SelectionActions {
  select: (category: ComponentCategory, id: string | null) => void;
  clearAll: () => void;
  clearCategory: (category: ComponentCategory) => void;
  getSelected: (category: ComponentCategory) => string | null;
  hasSelection: () => boolean;
  getActiveCategory: () => ComponentCategory | null;
}

const INITIAL_STATE: SelectionState = {
  part: null,
  support: null,
  clamp: null,
  label: null,
  hole: null,
  baseplate: null,
  cavity: null,
};

export function useSelectionState(
  options: {
    /** Clear other categories when selecting */
    exclusiveSelection?: boolean;
    /** Callback when selection changes */
    onSelectionChange?: (category: ComponentCategory, id: string | null) => void;
  } = {}
): [SelectionState, SelectionActions] {
  const { exclusiveSelection = true, onSelectionChange } = options;
  
  const [state, setState] = useState<SelectionState>(INITIAL_STATE);

  const select = useCallback((category: ComponentCategory, id: string | null) => {
    setState(prev => {
      const next = exclusiveSelection ? { ...INITIAL_STATE } : { ...prev };
      next[category] = id;
      return next;
    });
    onSelectionChange?.(category, id);
  }, [exclusiveSelection, onSelectionChange]);

  const clearAll = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const clearCategory = useCallback((category: ComponentCategory) => {
    setState(prev => ({ ...prev, [category]: null }));
  }, []);

  const getSelected = useCallback((category: ComponentCategory) => {
    return state[category];
  }, [state]);

  const hasSelection = useCallback(() => {
    return Object.values(state).some(v => v !== null);
  }, [state]);

  const getActiveCategory = useCallback((): ComponentCategory | null => {
    for (const [key, value] of Object.entries(state)) {
      if (value !== null) return key as ComponentCategory;
    }
    return null;
  }, [state]);

  const actions = useMemo(() => ({
    select,
    clearAll,
    clearCategory,
    getSelected,
    hasSelection,
    getActiveCategory,
  }), [select, clearAll, clearCategory, getSelected, hasSelection, getActiveCategory]);

  return [state, actions];
}
```

**Checkpoint:**
- [ ] Hook created and exported from cad-ui
- [ ] AppShell updated to use `useSelectionState`
- [ ] Selection still works across all component types
- [ ] Exclusive selection behavior preserved

---

### 7.2: Extract Workflow State Hook (Est. 1-2 hours)

**Problem:** Workflow step management scattered across AppShell.

**Current Code (AppShell.tsx):**
```typescript
const [activeStep, setActiveStep] = useState<WorkflowStep>('import');
const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
const [skippedSteps, setSkippedSteps] = useState<WorkflowStep[]>([]);
```

**Solution:** Create `useWorkflowState` hook in `@rapidtool/cad-ui`.

**Create `packages/cad-ui/src/hooks/useWorkflowState.ts`:**
```typescript
/**
 * useWorkflowState Hook
 * 
 * Manages workflow step progression with completion and skip tracking.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { WorkflowStepId, AccordionSection } from '../navigation/types';
import { STEP_TO_ACCORDION } from '../navigation/types';

export interface WorkflowState {
  activeStep: WorkflowStepId;
  completedSteps: WorkflowStepId[];
  skippedSteps: WorkflowStepId[];
  expandedAccordion: AccordionSection | null;
}

export interface WorkflowActions {
  goToStep: (step: WorkflowStepId) => void;
  completeStep: (step: WorkflowStepId) => void;
  skipStep: (step: WorkflowStepId) => void;
  reset: () => void;
  isStepCompleted: (step: WorkflowStepId) => boolean;
  isStepSkipped: (step: WorkflowStepId) => boolean;
  canNavigateToStep: (step: WorkflowStepId) => boolean;
}

export function useWorkflowState(
  initialStep: WorkflowStepId = 'import',
  options: {
    /** Emit events on step change */
    emitEvents?: boolean;
    /** Callback when step changes */
    onStepChange?: (step: WorkflowStepId) => void;
  } = {}
): [WorkflowState, WorkflowActions] {
  const { emitEvents = true, onStepChange } = options;

  const [activeStep, setActiveStep] = useState<WorkflowStepId>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<WorkflowStepId[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<WorkflowStepId[]>([]);

  // Sync accordion with step
  const expandedAccordion = useMemo(() => {
    return STEP_TO_ACCORDION[activeStep] || null;
  }, [activeStep]);

  // Emit events when step changes
  useEffect(() => {
    if (emitEvents && expandedAccordion) {
      window.dispatchEvent(new CustomEvent('workflow-step-changed', {
        detail: { step: activeStep, accordion: expandedAccordion }
      }));
    }
    onStepChange?.(activeStep);
  }, [activeStep, expandedAccordion, emitEvents, onStepChange]);

  const goToStep = useCallback((step: WorkflowStepId) => {
    setActiveStep(step);
  }, []);

  const completeStep = useCallback((step: WorkflowStepId) => {
    setCompletedSteps(prev => 
      prev.includes(step) ? prev : [...prev, step]
    );
  }, []);

  const skipStep = useCallback((step: WorkflowStepId) => {
    setSkippedSteps(prev => 
      prev.includes(step) ? prev : [...prev, step]
    );
  }, []);

  const reset = useCallback(() => {
    setActiveStep(initialStep);
    setCompletedSteps([]);
    setSkippedSteps([]);
  }, [initialStep]);

  const isStepCompleted = useCallback((step: WorkflowStepId) => {
    return completedSteps.includes(step);
  }, [completedSteps]);

  const isStepSkipped = useCallback((step: WorkflowStepId) => {
    return skippedSteps.includes(step);
  }, [skippedSteps]);

  const canNavigateToStep = useCallback((step: WorkflowStepId) => {
    // Allow navigation to completed, skipped, or current step
    return completedSteps.includes(step) || 
           skippedSteps.includes(step) || 
           step === activeStep;
  }, [completedSteps, skippedSteps, activeStep]);

  const state = useMemo(() => ({
    activeStep,
    completedSteps,
    skippedSteps,
    expandedAccordion,
  }), [activeStep, completedSteps, skippedSteps, expandedAccordion]);

  const actions = useMemo(() => ({
    goToStep,
    completeStep,
    skipStep,
    reset,
    isStepCompleted,
    isStepSkipped,
    canNavigateToStep,
  }), [goToStep, completeStep, skipStep, reset, isStepCompleted, isStepSkipped, canNavigateToStep]);

  return [state, actions];
}
```

**Checkpoint:**
- [ ] Hook created and exported from cad-ui
- [ ] AppShell uses `useWorkflowState`
- [ ] ContextOptionsPanel works with new state
- [ ] Step navigation and completion tracking work

---

### 7.3: Extract Cavity State Hook (Est. 1 hour)

**Problem:** Cavity-related state and handlers scattered in AppShell.

**Current Code (AppShell.tsx):**
```typescript
const [cavityClearance, setCavityClearance] = useState(0.5);
const [cavitySettings, setCavitySettings] = useState<CavitySettings>(DEFAULT_CAVITY_SETTINGS);
const [isCavityProcessing, setIsCavityProcessing] = useState(false);
const [isApplyingCavity, setIsApplyingCavity] = useState(false);
const [hasCavityPreview, setHasCavityPreview] = useState(false);
const [isCavityApplied, setIsCavityApplied] = useState(false);
```

**Solution:** Create `useCavityState` hook in `src/hooks/` (app-specific, not cad-ui).

**Create `src/hooks/useCavityState.ts`:**
```typescript
/**
 * useCavityState Hook
 * 
 * Manages cavity operation state and settings.
 */

import { useState, useCallback } from 'react';
import { CavitySettings, DEFAULT_CAVITY_SETTINGS } from '@rapidtool/cad-core';

export interface CavityState {
  settings: CavitySettings;
  isProcessing: boolean;
  isApplying: boolean;
  hasPreview: boolean;
  isApplied: boolean;
}

export interface CavityActions {
  updateSettings: (settings: CavitySettings) => void;
  setProcessing: (processing: boolean) => void;
  setApplying: (applying: boolean) => void;
  setPreview: (hasPreview: boolean) => void;
  setApplied: (applied: boolean) => void;
  reset: () => void;
}

export function useCavityState(): [CavityState, CavityActions] {
  const [settings, setSettings] = useState<CavitySettings>(DEFAULT_CAVITY_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const updateSettings = useCallback((newSettings: CavitySettings) => {
    setSettings(newSettings);
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_CAVITY_SETTINGS);
    setIsProcessing(false);
    setIsApplying(false);
    setHasPreview(false);
    setIsApplied(false);
  }, []);

  return [
    { settings, isProcessing, isApplying, hasPreview, isApplied },
    { 
      updateSettings, 
      setProcessing: setIsProcessing, 
      setApplying: setIsApplying,
      setPreview: setHasPreview,
      setApplied: setIsApplied,
      reset 
    }
  ];
}
```

**Checkpoint:**
- [ ] Hook created in `src/hooks/`
- [ ] AppShell uses `useCavityState`
- [ ] Cavity preview and apply still work

---

### 7.4: Extract Baseplate State Hook (Est. 1 hour)

**Problem:** Baseplate state management complex with drawing mode.

**Current Code (AppShell.tsx):**
```typescript
const [currentBaseplate, setCurrentBaseplate] = useState<BaseplateType | null>(null);
const [selectedBasePlateSectionId, setSelectedBasePlateSectionId] = useState<string | null>(null);
const [isBaseplateDrawingMode, setIsBaseplateDrawingMode] = useState(false);
const [drawnBaseplateSections, setDrawnBaseplateSections] = useState<BasePlateSection[]>([]);
const [currentBaseplateParams, setCurrentBaseplateParams] = useState({ padding: 5, height: 4 });
```

**Solution:** Create `useBaseplateState` hook in `src/hooks/`.

**Create `src/hooks/useBaseplateState.ts`:**
```typescript
/**
 * useBaseplateState Hook
 * 
 * Manages baseplate configuration and multi-section drawing.
 */

import { useState, useCallback } from 'react';
import { BasePlateSection } from '@/features/baseplate';

export interface BaseplateConfig {
  id: string;
  type: string;
  padding?: number;
  height?: number;
  depth?: number;
  sections?: BasePlateSection[];
}

export interface BaseplateState {
  baseplate: BaseplateConfig | null;
  isDrawingMode: boolean;
  drawnSections: BasePlateSection[];
  params: { padding: number; height: number };
}

export interface BaseplateActions {
  setBaseplate: (baseplate: BaseplateConfig | null) => void;
  updateBaseplate: (updates: Partial<BaseplateConfig>) => void;
  setDrawingMode: (isDrawing: boolean) => void;
  addSection: (section: BasePlateSection) => void;
  removeSection: (sectionId: string) => void;
  clearSections: () => void;
  setParams: (params: { padding: number; height: number }) => void;
  reset: () => void;
}

export function useBaseplateState(): [BaseplateState, BaseplateActions] {
  const [baseplate, setBaseplate] = useState<BaseplateConfig | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnSections, setDrawnSections] = useState<BasePlateSection[]>([]);
  const [params, setParams] = useState({ padding: 5, height: 4 });

  const updateBaseplate = useCallback((updates: Partial<BaseplateConfig>) => {
    setBaseplate(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const addSection = useCallback((section: BasePlateSection) => {
    setDrawnSections(prev => [...prev, section]);
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setDrawnSections(prev => prev.filter(s => s.id !== sectionId));
    // Also update baseplate if it has sections
    setBaseplate(prev => {
      if (!prev?.sections) return prev;
      return {
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      };
    });
  }, []);

  const clearSections = useCallback(() => {
    setDrawnSections([]);
  }, []);

  const reset = useCallback(() => {
    setBaseplate(null);
    setIsDrawingMode(false);
    setDrawnSections([]);
    setParams({ padding: 5, height: 4 });
  }, []);

  return [
    { baseplate, isDrawingMode, drawnSections, params },
    { 
      setBaseplate, 
      updateBaseplate,
      setDrawingMode: setIsDrawingMode,
      addSection,
      removeSection,
      clearSections,
      setParams,
      reset
    }
  ];
}
```

**Checkpoint:**
- [ ] Hook created in `src/hooks/`
- [ ] AppShell uses `useBaseplateState`
- [ ] Multi-section drawing still works
- [ ] Baseplate updates work

---

### 7.5: Extract File Processing Hook (Est. 1-2 hours)

**Problem:** File processing logic mixed with UI state in AppShell.

**Solution:** Consolidate into `src/modules/FileImport/hooks/useFileImport.ts`.

This hook should manage:
- `importedParts` state
- `pendingFile` state  
- `meshAnalysis` state
- `processingResult` state
- File validation and processing

**Checkpoint:**
- [ ] Hook consolidates file processing
- [ ] AppShell uses `useFileImport`
- [ ] Import flow still works
- [ ] Mesh optimization dialog works

---

### 7.6: Create useAccordionSync Hook (Est. 30 min)

**Problem:** Accordion state sync logic duplicated.

**Current Code (PartPropertiesAccordion.tsx):**
```typescript
function useAccordionSection(
  selectedPartId, selectedSupportId, selectedClampId,
  selectedLabelId, selectedHoleId, selectedBasePlateSectionId
) {
  const [openSection, setOpenSection] = useState<string>('parts');
  
  // Multiple useEffects for auto-opening
  useEffect(() => { if (selectedPartId) setOpenSection('parts'); }, [selectedPartId]);
  useEffect(() => { if (selectedSupportId) setOpenSection('supports'); }, [selectedSupportId]);
  // ... etc
}
```

**Solution:** Move to `@rapidtool/cad-ui` as a generic hook.

**Create `packages/cad-ui/src/hooks/useAccordionSync.ts`:**
```typescript
/**
 * useAccordionSync Hook
 * 
 * Syncs accordion state with selection and workflow events.
 */

import { useState, useEffect } from 'react';
import type { SelectionState } from './useSelectionState';
import { CATEGORY_TO_ACCORDION, type AccordionSection, type ComponentCategory } from '../navigation/types';

export function useAccordionSync(
  selection: SelectionState,
  initialSection: AccordionSection = 'parts'
): [AccordionSection, (section: AccordionSection) => void] {
  const [openSection, setOpenSection] = useState<AccordionSection>(initialSection);

  // Auto-open accordion based on selection
  useEffect(() => {
    for (const [category, id] of Object.entries(selection)) {
      if (id) {
        const accordion = CATEGORY_TO_ACCORDION[category as ComponentCategory];
        if (accordion) {
          setOpenSection(accordion);
          break;
        }
      }
    }
  }, [selection]);

  // Listen for external navigation events
  useEffect(() => {
    const handleStepChange = (e: CustomEvent<{ accordion: string }>) => {
      if (e.detail.accordion) {
        setOpenSection(e.detail.accordion as AccordionSection);
      }
    };

    window.addEventListener('workflow-step-changed', handleStepChange as EventListener);
    return () => {
      window.removeEventListener('workflow-step-changed', handleStepChange as EventListener);
    };
  }, []);

  return [openSection, setOpenSection];
}
```

**Checkpoint:**
- [ ] Hook created in cad-ui
- [ ] PartPropertiesAccordion uses `useAccordionSync`
- [ ] Auto-open on selection works
- [ ] Step navigation accordion sync works

---

### 7.7: Update cad-ui Exports (Est. 15 min)

**Update `packages/cad-ui/src/hooks/index.ts`:**
```typescript
export * from './useSelectionState';
export * from './useWorkflowState';
export * from './useAccordionSync';
```

**Update `packages/cad-ui/src/index.ts`:**
```typescript
// ... existing exports
export * from './hooks';
```

---

### 7.8: Refactor AppShell (Est. 2-3 hours)

After creating all hooks, refactor AppShell:

**Before (2,009 lines):**
```typescript
// 15+ useState calls
// 20+ useCallback handlers
// Complex JSX with inline logic
```

**After (~500 lines):**
```typescript
import { useSelectionState, useWorkflowState } from '@rapidtool/cad-ui';
import { useCavityState, useBaseplateState, useFileImport } from '@/hooks';

const AppShell = () => {
  // Consolidated state hooks
  const [selection, selectionActions] = useSelectionState();
  const [workflow, workflowActions] = useWorkflowState();
  const [cavity, cavityActions] = useCavityState();
  const [baseplate, baseplateActions] = useBaseplateState();
  const { importedParts, processFile, ... } = useFileImport();
  
  // Feature-specific state (still needed)
  const [supports, setSupports] = useState<AnySupport[]>([]);
  const [clamps, setClamps] = useState<PlacedClamp[]>([]);
  const [labels, setLabels] = useState<LabelConfig[]>([]);
  const [holes, setHoles] = useState<PlacedHole[]>([]);
  
  // Clean JSX without inline handlers
  return (
    <Layout>
      <ContextOptionsPanel
        activeStep={workflow.activeStep}
        onStepChange={workflowActions.goToStep}
        completedSteps={workflow.completedSteps}
        skippedSteps={workflow.skippedSteps}
      />
      <ThreeDViewer ... />
      <PartPropertiesAccordion
        selection={selection}
        onSelect={selectionActions.select}
        ...
      />
    </Layout>
  );
};
```

---

## Phase 7 Summary

### Files to Create

| File | Location | Purpose |
|------|----------|---------|
| `useSelectionState.ts` | `packages/cad-ui/src/hooks/` | Multi-category selection |
| `useWorkflowState.ts` | `packages/cad-ui/src/hooks/` | Workflow step management |
| `useAccordionSync.ts` | `packages/cad-ui/src/hooks/` | Accordion ↔ selection sync |
| `useCavityState.ts` | `src/hooks/` | Cavity operations |
| `useBaseplateState.ts` | `src/hooks/` | Baseplate configuration |

### Files to Modify

| File | Changes |
|------|---------|
| `AppShell.tsx` | Use new hooks, reduce to ~500 lines |
| `PartPropertiesAccordion.tsx` | Use `useAccordionSync` from cad-ui |
| `ContextOptionsPanel/index.tsx` | Simplify, remove event emission (moved to hooks) |

### Expected Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| AppShell.tsx | 2,009 lines | ~500 lines | -75% |
| 3DScene.tsx | 2,262 lines | ~500 lines | -78% |
| useState calls (AppShell) | 47 | 0 | -100% |
| useState calls (3DScene) | 12 | ~3 (local only) | -75% |
| Event listeners | 20+ | 0 | -100% |
| Props to 3DScene | 30+ | ~10 | -67% |
| Zustand stores | 0 | 12 | New architecture |

### Store Summary

| Store | Purpose | State Count |
|-------|---------|-------------|
| `selectionStore` | Multi-category selection | 7 properties |
| `workflowStore` | Workflow step + accordion sync | 4 properties |
| `transformStore` | Transform mode, pivot, snap | 8 properties |
| `uiStore` | UI preferences (persisted) | 7 properties |
| `fixtureStore` | Entity data (parts, supports, clamps, etc.) | 9 properties |
| `baseplateDrawingStore` | Baseplate drawing mode | 2 properties |
| `holePlacementStore` | Hole placement mode | 2 properties |
| `supportPlacementStore` | Support placement mode | 2 properties |
| `cavityStore` | Cavity operations | 6 properties |
| `processingStore` | File processing, export | 9 properties |
| `dialogStore` | Modal dialog states | 2 properties |
| `historyStore` | Undo/redo stacks | 2 properties |

### Verification Checklist

- [ ] All selections work (part, support, clamp, label, hole, baseplate)
- [ ] Workflow navigation works
- [ ] Accordion auto-opens on selection
- [ ] Double-click navigation works
- [ ] Cavity preview and apply work
- [ ] Baseplate multi-section drawing works
- [ ] Hole placement works
- [ ] Support placement works
- [ ] File import works
- [ ] Undo/redo works
- [ ] Export works
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Redux DevTools shows all stores

---

## Future Considerations (Phase 8+)

### 3DScene Further Decomposition

3DScene (2,262 lines) could benefit from:

1. **Renderer Components** - Extract mesh rendering into:
   - `<PartRenderer parts={...} />`
   - `<SupportRenderer supports={...} />`
   - `<ClampRenderer clamps={...} />`

2. **Event Handler Hooks** - Move inline event handlers to dedicated hooks

3. **Camera Controller** - Extract camera and orientation logic

### Feature Module Consolidation

Each feature (`supports`, `clamps`, `labels`, `holes`) could have:
- Feature-specific actions in stores
- Shared patterns in cad-ui

---

## Appendix B: Updated Dependency Graph (Zustand - Full)

```
@rapidtool/cad-ui
├── navigation/
│   ├── types.ts (CATEGORY_TO_STEP, STEP_TO_ACCORDION, etc.)
│   └── WorkflowNavigationContext.tsx
├── stores/                           # Zustand stores
│   ├── index.ts                      # Re-exports + cross-store subscriptions
│   ├── types.ts                      # Shared TypeScript types
│   │
│   ├── selectionStore.ts             # Selection state (part, support, clamp, etc.)
│   ├── workflowStore.ts              # Workflow step + accordion sync
│   ├── transformStore.ts             # Transform mode, pivot, snap settings
│   ├── uiStore.ts                    # UI preferences (persisted to localStorage)
│   │
│   ├── fixtureStore.ts               # Entity data (parts, supports, clamps, labels, holes, baseplate)
│   ├── baseplateDrawingStore.ts      # Baseplate drawing mode
│   ├── holePlacementStore.ts         # Hole placement mode
│   ├── supportPlacementStore.ts      # Support placement mode
│   ├── cavityStore.ts                # Cavity operations
│   ├── processingStore.ts            # File processing, mesh analysis, export
│   ├── dialogStore.ts                # Modal dialog open/close states
│   ├── historyStore.ts               # Undo/redo stacks
│   ├── sceneStore.ts                 # 3D scene state (orbit, orientation)
│   └── previewStore.ts               # Mesh previews (cavity, offset)
└── ...existing components

src/layout/AppShell.tsx (~500 lines after migration)
└── Uses stores: selectionStore, workflowStore, transformStore, uiStore,
                 fixtureStore, processingStore, dialogStore, historyStore
    (No prop drilling, no event listeners)

src/components/3DScene.tsx (~500 lines after migration)
└── Uses stores: selectionStore, transformStore, fixtureStore,
                 sceneStore, previewStore, cavityStore
    (Access state directly via selectors)

src/components/PartPropertiesAccordion.tsx
└── Uses stores: workflowStore, selectionStore, fixtureStore

src/features/clamps/components/ClampMesh.tsx
└── Uses: useSelectionStore.getState().select('clamp', id)
    (Direct action call, no event dispatch)

src/features/supports/components/SupportMesh.tsx
└── Uses: useSelectionStore.getState().select('support', id)

Cross-Store Subscriptions (in stores/index.ts):
├── selectionStore → workflowStore (auto-navigate on selection)
├── fixtureStore → historyStore (auto-capture before mutations)
└── workflowStore → uiStore (persist last step)
```

## Appendix C: Legacy Dependency Graph (Hook-Based) - SUPERSEDED

```
@rapidtool/cad-ui
├── navigation/
│   ├── types.ts (CATEGORY_TO_STEP, STEP_TO_ACCORDION, etc.)
│   └── WorkflowNavigationContext.tsx
├── hooks/
│   ├── useSelectionState.ts
│   ├── useWorkflowState.ts
│   └── useAccordionSync.ts
└── ...existing components

src/hooks/
├── useCavityState.ts
├── useBaseplateState.ts
└── ...

src/layout/AppShell.tsx
└── Uses: useSelectionState, useWorkflowState, useCavityState, useBaseplateState

src/components/PartPropertiesAccordion.tsx
└── Uses: useAccordionSync
```
