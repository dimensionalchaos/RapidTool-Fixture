/**
 * Model Import API Service
 * Handles communication with backend for model import/upload operations
 */

import { apiClient } from './client';

export interface ModelImportResponse {
  importId: string;
  filename: string;
  status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileSize?: number;
  createdAt?: string;
}

export interface ModelUsageStats {
  used: number;
  limit: number;
  tier: 'FREE' | 'PREMIUM';
  remaining: number;
  canImport: boolean;
}

export interface ModelImport {
  id: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  metadata?: any;
}

/**
 * Upload a model file to the backend
 */
export async function uploadModel(
  file: File,
  projectId: string | null
): Promise<ModelImportResponse> {
  const formData = new FormData();
  formData.append('model', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }

  const response = await apiClient.instance.post<{
    success: boolean;
    message: string;
    data: ModelImportResponse;
  }>('/models/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes for large file uploads
  });

  return response.data.data;
}

/**
 * Get current user's model usage statistics
 */
export async function getModelUsageStats(): Promise<ModelUsageStats> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: ModelUsageStats;
  }>('/models/usage/stats');

  return response.data.data;
}

/**
 * Get list of user's model imports
 */
export async function getUserImports(limit: number = 10): Promise<ModelImport[]> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: ModelImport[];
  }>(`/models?limit=${limit}`);

  return response.data.data;
}

/**
 * Get status of a specific import
 */
export async function getImportStatus(importId: string): Promise<ModelImport> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: ModelImport;
  }>(`/models/${importId}`);

  return response.data.data;
}

/**
 * Update import progress/status
 */
export async function updateImportProgress(
  importId: string,
  data: {
    status?: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress?: number;
    metadata?: any;
  }
): Promise<ModelImport> {
  const response = await apiClient.instance.patch<{
    success: boolean;
    data: ModelImport;
  }>(`/models/${importId}`, data);

  return response.data.data;
}

export const modelImportAPI = {
  uploadModel,
  getModelUsageStats,
  getUserImports,
  getImportStatus,
  updateImportProgress,
};
