import { Request, Response } from 'express';
import {
  createExport,
  updateExportStatus,
  saveExportData,
  getExportById,
  getExportData,
  getUserExports,
  getProjectExports,
  handleExportError,
} from '../services/export.service';
import { ExportFormat } from '@prisma/client';
import { createErrorLog } from '../services/errorLog.service';
import { prisma } from '../lib/prisma';

export async function requestExport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    const { projectId, format, filename, settings, includeSupports, includeClamps, includeBaseplate } = req.body;

    if (!projectId || !format || !filename) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, format, filename',
      });
      return;
    }

    console.log('[Export] Request started:', {
      userId,
      projectId,
      format,
      filename,
    });

    const exportRecord = await createExport({
      userId,
      projectId,
      format: format as ExportFormat,
      filename,
      settings,
      includeSupports,
      includeClamps,
      includeBaseplate,
    });

    res.status(201).json({
      success: true,
      message: 'Export request created successfully',
      data: {
        exportId: exportRecord.id,
        filename: exportRecord.filename,
        format: exportRecord.format,
        status: exportRecord.status,
      },
    });
  } catch (error) {
    console.error('[Export] Request failed:', error);

    await createErrorLog({
      userId: req.user?.userId,
      category: 'EXPORT_ERROR',
      severity: 'HIGH',
      errorCode: 'EXPORT_REQUEST_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      operation: 'export_request',
      userAction: 'User requested model export',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create export request',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
    });
  }
}

export async function getExportStatus(req: Request, res: Response): Promise<void> {
  try {
    const { exportId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const exportRecord = await getExportById(exportId);

    if (!exportRecord) {
      res.status(404).json({
        success: false,
        error: 'Export not found',
      });
      return;
    }

    if (exportRecord.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: exportRecord.id,
        filename: exportRecord.filename,
        format: exportRecord.format,
        status: exportRecord.status,
        fileSize: exportRecord.fileSize,
        createdAt: exportRecord.createdAt,
        completedAt: exportRecord.completedAt,
        downloadCount: exportRecord.downloadCount,
        errorMessage: exportRecord.errorMessage,
      },
    });
  } catch (error) {
    console.error('[Export] Get status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status',
    });
  }
}

export async function downloadExport(req: Request, res: Response): Promise<void> {
  try {
    const { exportId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const exportData = await getExportData(exportId, userId);

    if (!exportData.data) {
      res.status(404).json({
        success: false,
        error: 'Export data not available',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Length', exportData.fileSize.toString());

    res.send(exportData.data);
  } catch (error) {
    console.error('[Export] Download failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download export',
    });
  }
}

export async function getUserExportsList(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 10;

    const exports = await getUserExports(userId, limit);

    res.json({
      success: true,
      data: exports,
    });
  } catch (error) {
    console.error('[Export] Get user exports failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exports',
    });
  }
}

export async function getProjectExportsList(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const exports = await getProjectExports(projectId);

    res.json({
      success: true,
      data: exports,
    });
  } catch (error) {
    console.error('[Export] Get project exports failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project exports',
    });
  }
}

export async function saveExport(req: Request, res: Response): Promise<void> {
  try {
    const { exportId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const exportRecord = await getExportById(exportId);

    if (!exportRecord) {
      res.status(404).json({
        success: false,
        error: 'Export not found',
      });
      return;
    }

    if (exportRecord.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access',
      });
      return;
    }

    await saveExportData(exportId, file.buffer, file.size);

    res.json({
      success: true,
      message: 'Export data saved successfully',
    });
  } catch (error) {
    console.error('[Export] Save failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save export data',
    });
  }
}

// Track export count logic
export async function trackExport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Upsert the export count
    const record = await prisma.numExports.upsert({
      where: { userId },
      update: { exports: { increment: 1 } },
      create: { userId, exports: 1 },
    });

    res.json({ success: true, exportCount: record.exports });
  } catch (error) {
    console.error('[Export] Track failed:', error);
    res.status(500).json({ success: false, error: 'Failed to to track export' });
  }
}

// Check export limit logic
export async function checkExportLimit(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const record = await prisma.numExports.findUnique({
      where: { userId },
    });

    const exports = record?.exports || 0;
    const canExport = exports < 5; // Allow max 5 exports (0,1,2,3,4). If 5, block.

    res.json({ success: true, canExport });
  } catch (error) {
    console.error('[Export] Check limit failed:', error);
    res.status(500).json({ success: false, error: 'Failed to check export limit' });
  }
}
