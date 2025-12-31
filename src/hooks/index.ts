/**
 * Fixture App Hooks
 * 
 * Re-exports all custom hooks for the fixture design app.
 * These hooks provide backward-compatible interfaces for migrating
 * from useState to Zustand stores.
 */

// Selection hooks (Phase 7a)
export {
  useSelectedPart,
  useSelectedSupport,
  useSelectedClamp,
  useSelectedLabel,
  useSelectedHole,
  useSelectedBaseplateSection,
  useSelectedId,
  useSelectionType,
  useClearSelection,
  useSelection,
  SELECTION_CATEGORIES,
} from './useSelection';

// Workflow hooks (Phase 7c)
export {
  useInitializeFixtureWorkflow,
  useWorkflowStep,
  useCompletedSteps,
  useSkippedSteps,
  useWorkflowNavigation,
  useWorkflow,
  FIXTURE_WORKFLOW_STEPS,
  type FixtureWorkflowStep,
} from './useWorkflow';

// UI hooks (Phase 7h)
export {
  useContextPanelCollapsed,
  usePropertiesPanelCollapsed,
  useViewportOptions,
  useUI,
} from './useUI';

// Dialog hooks (Phase 7f)
export {
  useUnitsDialog,
  useOptimizationDialog,
  useExportDialog,
  useBaseplateConfigDialog,
  useConfirmDialog,
  useDialogs,
} from './useDialogs';

// Existing hooks
export { useDragDrop } from './useDragDrop';
export { useLoadingManager } from './useLoadingManager';
export { useMobile } from './use-mobile';
export { useToast } from './use-toast';
