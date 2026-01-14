import dotenv from 'dotenv';

dotenv.config();

export const exportConfig = {
  // Export Limits
  maxExportsPerUser: parseInt(process.env.MAX_EXPORTS_PER_USER || '100'),
  
  // File Size Limits (in bytes)
  maxExportFileSize: parseInt(process.env.MAX_EXPORT_FILE_SIZE || '104857600'), // 100MB default
  
  // Export Expiry (in milliseconds)
  exportExpiryDuration: parseInt(process.env.EXPORT_EXPIRY_DURATION || '604800000'), // 7 days default
  
  // Processing Timeout (in milliseconds)
  processingTimeout: parseInt(process.env.EXPORT_PROCESSING_TIMEOUT || '300000'), // 5 minutes default
  
  // Supported Formats
  supportedFormats: ['STL', 'STEP', 'OBJ', 'GLTF'] as const,
};

// Validate configuration
export function validateExportConfig() {
  const errors: string[] = [];

  if (exportConfig.maxExportsPerUser < 1) {
    errors.push('MAX_EXPORTS_PER_USER must be at least 1');
  }

  if (exportConfig.maxExportFileSize < 1024) {
    errors.push('MAX_EXPORT_FILE_SIZE must be at least 1KB');
  }

  if (exportConfig.exportExpiryDuration < 3600000) {
    errors.push('EXPORT_EXPIRY_DURATION must be at least 1 hour');
  }

  if (errors.length > 0) {
    throw new Error(`Export configuration errors:\n${errors.join('\n')}`);
  }
}
