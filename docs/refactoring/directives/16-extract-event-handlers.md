# Directive 16: Extract Event Handlers

## Objective
Extract the massive event handler callbacks from 3DScene.tsx into organized modules.

## Current Problem
3DScene.tsx has dozens of useCallback hooks handling:
- Window events (resize, keyboard shortcuts)
- Custom events (pivot-control-activated, disable-orbit-controls, etc.)
- Model events (transform updates, selection)
- Feature-specific events (support placement, clamp placement, etc.)
- Export events (generate-fixture, cavity operations)

## Target Architecture

```
src/components/3DScene/
├── handlers/
│   ├── windowHandlers.ts       # Window resize, keyboard
│   ├── modelHandlers.ts        # Model transform, selection
│   ├── supportHandlers.ts      # Support-specific handlers
│   ├── clampHandlers.ts        # Clamp-specific handlers
│   ├── labelHandlers.ts        # Label-specific handlers
│   ├── holeHandlers.ts         # Hole-specific handlers
│   ├── baseplateHandlers.ts    # Baseplate handlers
│   └── exportHandlers.ts       # Export/CSG handlers
└── ...
```

## Event Categories to Extract

### Window Events
```typescript
// windowHandlers.ts
export const useWindowHandlers = (deps: WindowHandlerDeps) => {
  // Keyboard shortcuts (Delete, Escape, etc.)
  // Resize handling
  // Orbit controls enable/disable
};
```

### Model Events
```typescript
// modelHandlers.ts
export const useModelHandlers = (deps: ModelHandlerDeps) => {
  // set-model-transform
  // model-transform-updated
  // check-baseplate-collision
  // mesh-double-click
};
```

### Feature Events
Each feature gets its own handler module:
```typescript
// supportHandlers.ts
export const useSupportHandlers = (deps: SupportHandlerDeps) => {
  // add-support
  // delete-support
  // support-transform events
  // auto-place-supports
};

// clampHandlers.ts
export const useClampHandlers = (deps: ClampHandlerDeps) => {
  // place-clamp
  // delete-clamp
  // clamp-transform events
};

// etc.
```

### Export Events
```typescript
// exportHandlers.ts
export const useExportHandlers = (deps: ExportHandlerDeps) => {
  // generate-fixture
  // export-stl
  // generate-cavity
  // update-csg-preview
};
```

## Actions

### Step 1: Create handlers folder
```powershell
mkdir src/components/3DScene/handlers
```

### Step 2: Identify all event handlers
Search for useEffect with addEventListener:
```typescript
// Pattern to find:
useEffect(() => {
  const handler = (e: CustomEvent) => { ... };
  window.addEventListener('event-name', handler);
  return () => window.removeEventListener('event-name', handler);
}, [deps]);
```

### Step 3: Extract by category
Move related handlers together, preserving dependencies.

### Step 4: Create handler hooks
Each handler file exports a hook:
```typescript
export const useFeatureHandlers = (deps: FeatureHandlerDeps) => {
  useEffect(() => {
    // Event subscriptions
  }, [deps]);
  
  return {
    // Any imperative methods needed
  };
};
```

### Step 5: Wire handlers in main component
```typescript
const ThreeDScene: React.FC<ThreeDSceneProps> = (props) => {
  const state = useSceneState(props);
  
  // Wire up handlers
  useWindowHandlers({ state });
  useModelHandlers({ state, props });
  useSupportHandlers({ state });
  useClampHandlers({ state });
  useLabelHandlers({ state });
  useHoleHandlers({ state });
  useExportHandlers({ state });
  
  return (
    // Renderers
  );
};
```

## Key Events to Extract

| Event Name | Current Location | Target Module |
|------------|-----------------|---------------|
| `disable-orbit-controls` | 3DScene | windowHandlers |
| `set-camera-orientation` | 3DScene | windowHandlers |
| `set-model-transform` | 3DScene | modelHandlers |
| `model-transform-updated` | 3DScene | modelHandlers |
| `pivot-control-activated` | 3DScene | modelHandlers |
| `add-support` | 3DScene | supportHandlers |
| `delete-support` | 3DScene | supportHandlers |
| `place-clamp` | 3DScene | clampHandlers |
| `delete-clamp` | 3DScene | clampHandlers |
| `add-label` | 3DScene | labelHandlers |
| `delete-label` | 3DScene | labelHandlers |
| `add-hole` | 3DScene | holeHandlers |
| `delete-hole` | 3DScene | holeHandlers |
| `generate-fixture` | 3DScene | exportHandlers |
| `export-stl` | 3DScene | exportHandlers |

## Validation Checklist
- [ ] Build passes
- [ ] All keyboard shortcuts work
- [ ] All custom events trigger correctly
- [ ] Delete operations work
- [ ] Transform events propagate
- [ ] Export/CSG operations work

## Dependencies
- Directive 14 complete (state hooks)
- Directive 15 complete (renderers)

## Estimated Time
3-4 hours

## Risk Level
🔴 HIGH - Event handlers have complex dependencies and side effects
