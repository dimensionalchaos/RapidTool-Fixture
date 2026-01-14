import { z } from 'zod';

export const createExportSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(['STL', 'STEP', 'OBJ', 'GLTF']),
  settings: z.object({
    includeSupports: z.boolean().optional(),
    includeClamps: z.boolean().optional(),
    includeBaseplate: z.boolean().optional(),
  }).optional(),
});

export const getExportSchema = z.object({
  id: z.string().uuid(),
});

export const downloadExportSchema = z.object({
  id: z.string().uuid(),
});

export const deleteExportSchema = z.object({
  id: z.string().uuid(),
});
