# @rapidtool/cad-ui

Reusable React components for building CAD applications. Built on top of `@rapidtool/cad-core`, Three.js, and React Three Fiber.

## Status

 **Work in Progress** - This package is a placeholder for future extraction of reusable UI components.

## Planned Features

- **Viewport Components** - ViewCube, ScalableGrid, camera controls
- **UI Primitives** - Base components built on shadcn/ui

## Installation

This package is part of the rapidtool monorepo. It's available as a workspace dependency:

```json
{
  "dependencies": {
    "@rapidtool/cad-ui": "*"
  }
}
```

## Current Exports

Currently re-exports everything from `@rapidtool/cad-core`:

```typescript
import {
  // All cad-core exports available
  TransformController,
  CSGEngine,
  safeNum,
  // ...
} from '@rapidtool/cad-ui';
```

## Roadmap

| Component | Status | Phase |
|-----------|--------|-------|
| ViewCube |  Planned | 6.3 |
| ScalableGrid |  Planned | 6.3 |
| UI Primitives |  Planned | 6.3 |

## License

MIT
