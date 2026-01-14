import { z } from 'zod';

export const createLicenseSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(['FREE', 'PREMIUM']),
  duration: z.number().min(1).optional(), // Duration in days
});

export const updateLicenseSchema = z.object({
  id: z.string().uuid(),
  tier: z.enum(['FREE', 'PREMIUM']).optional(),
  expiryDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const getLicenseSchema = z.object({
  userId: z.string().uuid(),
});

export const validateLicenseSchema = z.object({
  licenseKey: z.string().min(1),
});
