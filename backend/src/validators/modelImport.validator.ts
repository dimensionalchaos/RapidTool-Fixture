import { z } from 'zod';

export const uploadModelSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  fileHash: z.string().optional(),
});

export const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  errorMessage: z.string().optional(),
});

export const getModelSchema = z.object({
  id: z.string().uuid(),
});

export const deleteModelSchema = z.object({
  id: z.string().uuid(),
});
