import { prisma } from '../lib/prisma';
import { ImportStatus } from '@prisma/client';
import { createErrorLog } from './errorLog.service';

interface ModelImportData {
  userId: string;
  projectId?: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  fileBuffer?: Buffer;
  fileHash?: string;
}

export async function createModelImport(data: ModelImportData) {
  try {
    const modelImport = await prisma.modelImport.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        filename: data.filename,
        originalFilename: data.originalFilename,
        fileSize: data.fileSize,
        fileHash: data.fileHash,
        modelData: data.fileBuffer, // Store file in DB
        status: 'UPLOADING',
        progress: 0,
        countsTowardLimit: true,
      },
    });

    console.log(`[ModelImport] Created import record: ${modelImport.id}`);
    return modelImport;
  } catch (error) {
    console.error('[ModelImport] Failed to create import record:', error);
    throw error;
  }
}

export async function updateImportStatus(
  importId: string,
  status: ImportStatus,
  progress?: number,
  errorMessage?: string
) {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (status === 'PROCESSING' && !updateData.processingStartedAt) {
      updateData.processingStartedAt = new Date();
    }

    if (status === 'COMPLETED') {
      updateData.processingCompletedAt = new Date();
      const modelImport = await prisma.modelImport.findUnique({
        where: { id: importId },
        select: { processingStartedAt: true },
      });
      if (modelImport?.processingStartedAt) {
        updateData.processingDuration =
          Date.now() - modelImport.processingStartedAt.getTime();
      }
    }

    if (status === 'FAILED' && errorMessage) {
      updateData.errorMessage = errorMessage;
      updateData.errorCode = 'IMPORT_FAILED';
    }

    const updated = await prisma.modelImport.update({
      where: { id: importId },
      data: updateData,
    });

    console.log(`[ModelImport] Updated status to ${status}: ${importId}`);
    return updated;
  } catch (error) {
    console.error('[ModelImport] Failed to update status:', error);
    throw error;
  }
}

export async function updateImportMetadata(
  importId: string,
  metadata: {
    vertexCount?: number;
    faceCount?: number;
    boundingBox?: any;
    dimensions?: any;
    volume?: number;
    thumbnailData?: Buffer;
  }
) {
  try {
    const updated = await prisma.modelImport.update({
      where: { id: importId },
      data: {
        vertexCount: metadata.vertexCount,
        faceCount: metadata.faceCount,
        boundingBox: metadata.boundingBox,
        dimensions: metadata.dimensions,
        volume: metadata.volume,
        thumbnailData: metadata.thumbnailData,
      },
    });

    console.log(`[ModelImport] Updated metadata: ${importId}`);
    return updated;
  } catch (error) {
    console.error('[ModelImport] Failed to update metadata:', error);
    throw error;
  }
}

export async function incrementUserModelCount(userId: string) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        modelsUsed: { increment: 1 },
      },
      select: {
        id: true,
        modelsUsed: true,
        modelLimit: true,
        tier: true,
      },
    });

    console.log(
      `[ModelImport] User ${userId} models used: ${user.modelsUsed}/${user.modelLimit}`
    );

    return user;
  } catch (error) {
    console.error('[ModelImport] Failed to increment model count:', error);
    throw error;
  }
}

export async function getUserModelUsage(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        modelsUsed: true,
        modelLimit: true,
        tier: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      used: user.modelsUsed,
      limit: user.modelLimit,
      tier: user.tier,
      remaining: user.modelLimit - user.modelsUsed,
      canImport: user.modelsUsed < user.modelLimit,
    };
  } catch (error) {
    console.error('[ModelImport] Failed to get user usage:', error);
    throw error;
  }
}

export async function getModelImportById(importId: string) {
  try {
    return await prisma.modelImport.findUnique({
      where: { id: importId },
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
    console.error('[ModelImport] Failed to get import:', error);
    throw error;
  }
}

export async function getUserModelImports(userId: string, limit = 10) {
  try {
    return await prisma.modelImport.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        filename: true,
        fileSize: true,
        status: true,
        progress: true,
        createdAt: true,
        processingDuration: true,
      },
    });
  } catch (error) {
    console.error('[ModelImport] Failed to get user imports:', error);
    throw error;
  }
}

export async function handleImportError(
  importId: string,
  userId: string,
  error: any
) {
  try {
    // Update import status
    await updateImportStatus(importId, 'FAILED', undefined, error.message);

    // Log error
    await createErrorLog({
      userId,
      modelImportId: importId,
      category: 'IMPORT_ERROR',
      severity: 'HIGH',
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      operation: 'model_import',
      step: 'processing',
      userAction: 'User attempted to import a model file',
    });

    console.log(`[ModelImport] Logged error for import: ${importId}`);
  } catch (logError) {
    console.error('[ModelImport] Failed to log error:', logError);
  }
}
