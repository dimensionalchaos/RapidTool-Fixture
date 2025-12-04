/**
 * File Import Module - Refactored Exports
 * 
 * Clean, production-ready exports for mesh processing pipeline.
 */

// Services
export { 
  MeshAnalysisService,
  type MeshAnalysisResult,
  type RepairResult,
  type DecimationResult,
  type ProcessingPipelineResult,
  type MeshIssues,
  type MeshProcessingConfig,
} from './services/meshAnalysisService';

export { 
  STLParser,
  type STLParseResult,
  type STLParseOptions,
  type STLFormat,
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
