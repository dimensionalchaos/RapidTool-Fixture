import { Request, Response } from 'express';
import {
  createModelImport,
  updateImportStatus,
  updateImportMetadata,
  getUserModelUsage,
  getModelImportById,
  getUserModelImports,
  handleImportError,
} from '../services/modelImport.service';
import { createErrorLog } from '../services/errorLog.service';

export async function uploadModel(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const file = req.file;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    console.log('[ModelImport] Upload started:', {
      userId,
      filename: file.originalname,
      size: file.size,
    });

    // Generate unique filename (multer memoryStorage doesn't provide file.filename)
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${sanitizedName}`;



    const modelImport = await createModelImport({
      userId,
      projectId: req.body.projectId,
      filename: uniqueFilename,
      originalFilename: file.originalname,
      fileSize: file.size,
      fileBuffer: file.buffer,
      fileHash: req.body.fileHash,
    });

    // NOTE: We no longer increment modelsUsed here. 
    // It is updated only on export to match export count.

    res.status(201).json({
      success: true,
      message: 'Model uploaded successfully',
      data: {
        importId: modelImport.id,
        filename: modelImport.filename,
        status: modelImport.status,
      },
    });
  } catch (error) {
    console.error('[ModelImport] Upload failed:', error);

    await createErrorLog({
      userId: req.user?.userId,
      category: 'IMPORT_ERROR',
      severity: 'HIGH',
      errorCode: 'UPLOAD_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      operation: 'model_upload',
      userAction: 'User attempted to upload a model file',
    });

    res.status(500).json({
      success: false,
      error: 'Failed to upload model',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
    });
  }
}

export async function getImportStatus(req: Request, res: Response): Promise<void> {
  try {
    const { importId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const modelImport = await getModelImportById(importId);

    if (!modelImport) {
      res.status(404).json({
        success: false,
        error: 'Import not found',
      });
      return;
    }

    if (modelImport.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: modelImport.id,
        filename: modelImport.filename,
        status: modelImport.status,
        progress: modelImport.progress,
        fileSize: modelImport.fileSize,
        vertexCount: modelImport.vertexCount,
        faceCount: modelImport.faceCount,
        createdAt: modelImport.createdAt,
        errorMessage: modelImport.errorMessage,
      },
    });
  } catch (error) {
    console.error('[ModelImport] Get status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import status',
    });
  }
}

export async function getUserImports(req: Request, res: Response): Promise<void> {
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

    const imports = await getUserModelImports(userId, limit);

    res.json({
      success: true,
      data: imports,
    });
  } catch (error) {
    console.error('[ModelImport] Get user imports failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get imports',
    });
  }
}

export async function getModelUsage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const usage = await getUserModelUsage(userId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('[ModelImport] Get usage failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model usage',
    });
  }
}

export async function updateImportProgress(req: Request, res: Response): Promise<void> {
  try {
    const { importId } = req.params;
    const { status, progress, metadata } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const modelImport = await getModelImportById(importId);

    if (!modelImport) {
      res.status(404).json({
        success: false,
        error: 'Import not found',
      });
      return;
    }

    if (modelImport.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized access',
      });
      return;
    }

    if (status) {
      await updateImportStatus(importId, status, progress);
    }

    if (metadata) {
      await updateImportMetadata(importId, metadata);
    }

    res.json({
      success: true,
      message: 'Import updated successfully',
    });
  } catch (error) {
    console.error('[ModelImport] Update progress failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update import',
    });
  }
}
