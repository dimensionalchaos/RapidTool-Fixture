import dotenv from 'dotenv';

dotenv.config();

export const licenseConfig = {
  // Trial Configuration
  trialDurationDays: parseInt(process.env.TRIAL_DURATION_DAYS || '14'),
  expiryWarningDays: parseInt(process.env.EXPIRY_WARNING_DAYS || '7'),
  
  // Model Limits
  freeModelLimit: parseInt(process.env.FREE_MODEL_LIMIT || '5'),
  premiumModelLimit: parseInt(process.env.PREMIUM_MODEL_LIMIT || '999999'),
  
  // Export Limits
  freeExportLimit: parseInt(process.env.FREE_EXPORT_LIMIT || '10'),
  premiumExportLimit: parseInt(process.env.PREMIUM_EXPORT_LIMIT || '999999'),
};

// Validate configuration
export function validateLicenseConfig() {
  const errors: string[] = [];

  if (licenseConfig.trialDurationDays < 1) {
    errors.push('TRIAL_DURATION_DAYS must be at least 1');
  }

  if (licenseConfig.freeModelLimit < 1) {
    errors.push('FREE_MODEL_LIMIT must be at least 1');
  }

  if (licenseConfig.premiumModelLimit < licenseConfig.freeModelLimit) {
    errors.push('PREMIUM_MODEL_LIMIT must be greater than FREE_MODEL_LIMIT');
  }

  if (errors.length > 0) {
    throw new Error(`License configuration errors:\n${errors.join('\n')}`);
  }
}
