/**
 * Export API Service
 * Handles communication with backend for model export operations
 */

import { apiClient } from './client';

export interface ExportRequest {
  projectId: string;
  format: 'STL' | 'STEP' | '3MF';
  filename: string;
  includeSupports?: boolean;
  includeClamps?: boolean;
  includeBaseplate?: boolean;
  settings?: any;
}

export interface ExportResponse {
  exportId: string;
  filename: string;
  format: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface Export {
  id: string;
  projectId: string;
  filename: string;
  format: string;
  status: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  downloadCount?: number;
}

/**
 * Request a new export
 */
export async function requestExport(data: ExportRequest): Promise<ExportResponse> {
  const response = await apiClient.instance.post<{
    success: boolean;
    message: string;
    data: ExportResponse;
  }>('/exports/request', data);

  return response.data.data;
}

/**
 * Get export status
 */
export async function getExportStatus(exportId: string): Promise<Export> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: Export;
  }>(`/exports/${exportId}`);

  return response.data.data;
}

/**
 * Download export file
 */
export async function downloadExport(exportId: string): Promise<Blob> {
  const response = await apiClient.instance.get(`/exports/${exportId}/download`, {
    responseType: 'blob',
  });

  return response.data;
}

/**
 * Get user's exports
 */
export async function getUserExports(limit: number = 10): Promise<Export[]> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: Export[];
  }>(`/exports?limit=${limit}`);

  return response.data.data;
}

/**
 * Get exports for a specific project
 */
export async function getProjectExports(projectId: string): Promise<Export[]> {
  const response = await apiClient.instance.get<{
    success: boolean;
    data: Export[];
  }>(`/exports/project/${projectId}`);

  return response.data.data;
}

export const exportAPI = {
  requestExport,
  getExportStatus,
  downloadExport,
  getUserExports,
  getProjectExports,
};
