import { prisma } from '../lib/prisma';
import { ExportStatus, ExportFormat } from '@prisma/client';
import { createErrorLog } from './errorLog.service';

interface ExportData {
  userId: string;
  projectId: string;
  format: ExportFormat;
  filename: string;
  settings?: any;
  includeSupports?: boolean;
  includeClamps?: boolean;
  includeBaseplate?: boolean;
}

export async function createExport(data: ExportData) {
  try {
    let targetProjectId = data.projectId;

    // 1. Resolve Project ID (Handle dummy/missing)
    if (!targetProjectId || targetProjectId === 'dummy-project-id') {
      const existingProject = await prisma.project.findFirst({
        where: { userId: data.userId },
      });
      if (existingProject) {
        targetProjectId = existingProject.id;
      } else {
        // Create default project to allow export tracking
        const newProject = await prisma.project.create({
          data: {
            userId: data.userId,
            name: 'Default Project',
            description: 'Auto-created for exports',
          },
        });
        targetProjectId = newProject.id;
      }
    }

    // 2. Calculate New Export Count (Count UP)
    // Get the *previous* last export to determine current accumulation
    const lastExport = await prisma.export.findFirst({
      where: { userId: data.userId },
      orderBy: { createdAt: 'desc' },
      select: { numberOfExportsDone: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { modelLimit: true }
    });

    const currentCount = lastExport ? lastExport.numberOfExportsDone : 0;
    const EXPORT_LIMIT = user?.modelLimit ?? 5;

    // Fix possible null/undefined fallback
    const countToCheck = currentCount ?? 0;

    if (countToCheck >= EXPORT_LIMIT) {
      throw new Error(`Export limit reached (${EXPORT_LIMIT}). Please upgrade to generate more exports.`);
    }

    const newExportCount = countToCheck + 1;

    // Sync User's modelsUsed with export count
    await prisma.user.update({
      where: { id: data.userId },
      data: { modelsUsed: newExportCount }
    });

    // 3. Create Export Record
    const exportRecord = await prisma.export.create({
      data: {
        userId: data.userId,
        projectId: targetProjectId,
        format: data.format,
        filename: data.filename,
        settings: data.settings,
        includeSupports: data.includeSupports ?? true,
        includeClamps: data.includeClamps ?? true,
        includeBaseplate: data.includeBaseplate ?? true,
        status: 'COMPLETED',
        completedAt: new Date(),
        numberOfExportsDone: newExportCount,
      },
    });

    console.log(`[Export] Created export record: ${exportRecord.id} (Exports Done: ${newExportCount})`);
    return exportRecord;
  } catch (error) {
    console.error('[Export] Failed to create export record:', error);
    throw error;
  }
}

export async function updateExportStatus(
  exportId: string,
  status: ExportStatus,
  errorMessage?: string
) {
  try {
    const updateData: any = {
      status,
    };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    if (status === 'FAILED' && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const updated = await prisma.export.update({
      where: { id: exportId },
      data: updateData,
    });

    console.log(`[Export] Updated status to ${status}: ${exportId}`);
    return updated;
  } catch (error) {
    console.error('[Export] Failed to update status:', error);
    throw error;
  }
}

export async function saveExportData(
  exportId: string,
  exportBuffer: Buffer,
  fileSize: number,
  processingTime?: number
) {
  try {
    const updated = await prisma.export.update({
      where: { id: exportId },
      data: {
        exportData: exportBuffer, // Store workpiece in DB
        fileSize,
        processingTime,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`[Export] Saved export data: ${exportId} (${fileSize} bytes)`);
    return updated;
  } catch (error) {
    console.error('[Export] Failed to save export data:', error);
    throw error;
  }
}

export async function getExportById(exportId: string) {
  try {
    return await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Export] Failed to get export:', error);
    throw error;
  }
}

export async function getExportData(exportId: string, userId: string) {
  try {
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      select: {
        id: true,
        userId: true,
        exportData: true,
        filename: true,
        format: true,
        fileSize: true,
        downloadCount: true,
      },
    });

    if (!exportRecord) {
      throw new Error('Export not found');
    }

    // Check ownership
    if (exportRecord.userId !== userId) {
      throw new Error('Unauthorized access to export');
    }

    if (!exportRecord.exportData) {
      throw new Error('Export data not available');
    }

    // Increment download count
    await prisma.export.update({
      where: { id: exportId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    return {
      data: exportRecord.exportData,
      filename: exportRecord.filename,
      format: exportRecord.format,
      fileSize: exportRecord.fileSize,
    };
  } catch (error) {
    console.error('[Export] Failed to get export data:', error);
    throw error;
  }
}

export async function getUserExports(userId: string, limit = 10) {
  try {
    return await prisma.export.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        filename: true,
        format: true,
        fileSize: true,
        status: true,
        createdAt: true,
        completedAt: true,
        downloadCount: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Export] Failed to get user exports:', error);
    throw error;
  }
}

export async function getProjectExports(projectId: string) {
  try {
    return await prisma.export.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        filename: true,
        format: true,
        fileSize: true,
        status: true,
        createdAt: true,
        completedAt: true,
        numberOfExportsDone: true,
      },
    });
  } catch (error) {
    console.error('[Export] Failed to get project exports:', error);
    throw error;
  }
}

export async function incrementExportCount(projectId: string) {
  try {
    await prisma.export.updateMany({
      where: { projectId },
      data: {
        numberOfExportsDone: { increment: 1 },
      },
    });

    console.log(`[Export] Incremented export count for project: ${projectId}`);
  } catch (error) {
    console.error('[Export] Failed to increment export count:', error);
    throw error;
  }
}

export async function handleExportError(
  exportId: string,
  userId: string,
  projectId: string,
  error: any
) {
  try {
    // Update export status
    await updateExportStatus(exportId, 'FAILED', error.message);

    // Log error
    await createErrorLog({
      userId,
      projectId,
      exportId,
      category: 'EXPORT_ERROR',
      severity: 'HIGH',
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      operation: 'model_export',
      step: 'generation',
      userAction: 'User attempted to export a model',
    });

    console.log(`[Export] Logged error for export: ${exportId}`);
  } catch (logError) {
    console.error('[Export] Failed to log error:', logError);
  }
}

export async function cleanupExpiredExports() {
  try {
    const result = await prisma.export.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: 'COMPLETED',
      },
      data: {
        status: 'EXPIRED',
        exportData: null, // Clear data to free space
      },
    });

    console.log(`[Export] Cleaned up ${result.count} expired exports`);
    return result.count;
  } catch (error) {
    console.error('[Export] Failed to cleanup expired exports:', error);
    throw error;
  }
}
