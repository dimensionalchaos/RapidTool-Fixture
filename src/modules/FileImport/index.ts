/**
 * File Import Module - Refactored Exports
 * 
 * Clean, production-ready exports for mesh processing pipeline.
 */

// Default export - FileImport component
export { default } from './index.tsx';

// Services - Mesh Analysis
export { 
  analyzeMesh,
  repairMesh,
  decimateMesh,
  processMeshPipeline,
  DECIMATION_THRESHOLD,
  DECIMATION_TARGET,
  type MeshAnalysisResult,
  type MeshRepairResult,
  type DecimationResult,
  type ProcessingProgress,
  type ProgressCallback,
  type PipelineOptions,
  type PipelineResult,
} from './services/meshAnalysisService';

export { 
  parseSTL,
  validateSTLBuffer,
  type ParseResult as STLParseResult,
} from './services/stlParser';

// Hooks
export { 
  useFileProcessing,
  type FileProcessingState,
  type FileProcessingResult,
} from './hooks/useFileProcessingRefactored';

// Types (re-export from types folder)
export type { 
  ProcessedFile, 
  FileMetadata, 
  ViewerConfig,
  ViewOrientation,
  ViewerHandle,
} from './types/index';

export { DEFAULT_VIEWER_CONFIG, SUPPORTED_FORMATS } from './types/index';
