import { prisma } from '../lib/prisma';
import { ErrorCategory, ErrorSeverity } from '@prisma/client';

interface ErrorLogData {
  userId?: string;
  projectId?: string;
  modelImportId?: string;
  exportId?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  errorCode: string;
  errorMessage: string;
  errorStack?: string;
  operation: string;
  step?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  browserInfo?: any;
  deviceInfo?: any;
  userAction?: string;
  metadata?: any;
}

export async function createErrorLog(data: ErrorLogData) {
  try {
    const errorLog = await prisma.errorLog.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        modelImportId: data.modelImportId,
        exportId: data.exportId,
        category: data.category,
        severity: data.severity,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        operation: data.operation,
        step: data.step,
        url: data.url,
        method: data.method,
        statusCode: data.statusCode,
        browserInfo: data.browserInfo,
        deviceInfo: data.deviceInfo,
        userAction: data.userAction,
        metadata: data.metadata,
        resolved: false,
      },
    });

    console.log(`[ErrorLog] Created error log: ${errorLog.id} [${data.category}]`);
    return errorLog;
  } catch (error) {
    console.error('[ErrorLog] Failed to create error log:', error);
    // Don't throw - we don't want error logging to break the app
    return null;
  }
}

export async function getErrorLogById(errorId: string) {
  try {
    return await prisma.errorLog.findUnique({
      where: { id: errorId },
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
    console.error('[ErrorLog] Failed to get error log:', error);
    throw error;
  }
}

export async function getUserErrors(userId: string, limit = 20) {
  try {
    return await prisma.errorLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        category: true,
        severity: true,
        errorCode: true,
        errorMessage: true,
        operation: true,
        step: true,
        resolved: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('[ErrorLog] Failed to get user errors:', error);
    throw error;
  }
}

export async function getUnresolvedErrors(limit = 50) {
  try {
    return await prisma.errorLog.findMany({
      where: {
        resolved: false,
        severity: {
          in: ['HIGH', 'CRITICAL'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[ErrorLog] Failed to get unresolved errors:', error);
    throw error;
  }
}

export async function resolveError(errorId: string, resolution: string) {
  try {
    const updated = await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolution,
      },
    });

    console.log(`[ErrorLog] Resolved error: ${errorId}`);
    return updated;
  } catch (error) {
    console.error('[ErrorLog] Failed to resolve error:', error);
    throw error;
  }
}

export async function getErrorStats(userId?: string) {
  try {
    const where = userId ? { userId } : {};

    const [total, byCategory, bySeverity, unresolved] = await Promise.all([
      prisma.errorLog.count({ where }),
      prisma.errorLog.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      prisma.errorLog.count({
        where: {
          ...where,
          resolved: false,
        },
      }),
    ]);

    return {
      total,
      unresolved,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count,
      })),
    };
  } catch (error) {
    console.error('[ErrorLog] Failed to get error stats:', error);
    throw error;
  }
}

// Helper function to capture errors from Express middleware
export async function captureExpressError(
  error: any,
  req: any,
  userId?: string
) {
  try {
    await createErrorLog({
      userId,
      category: determineErrorCategory(error),
      severity: determineErrorSeverity(error),
      errorCode: error.code || error.name || 'UNKNOWN_ERROR',
      errorMessage: error.message || 'An unknown error occurred',
      errorStack: error.stack,
      operation: 'api_request',
      url: req.originalUrl || req.url,
      method: req.method,
      statusCode: error.statusCode || error.status || 500,
      userAction: `${req.method} ${req.originalUrl || req.url}`,
      metadata: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });
  } catch (logError) {
    console.error('[ErrorLog] Failed to capture Express error:', logError);
  }
}

function determineErrorCategory(error: any): ErrorCategory {
  if (error.code?.startsWith('P')) return 'SYSTEM_ERROR'; // Prisma errors
  if (error.statusCode === 401 || error.statusCode === 403) return 'AUTH_ERROR';
  if (error.statusCode >= 400 && error.statusCode < 500) return 'VALIDATION_ERROR';
  if (error.message?.includes('network')) return 'NETWORK_ERROR';
  return 'SYSTEM_ERROR';
}

function determineErrorSeverity(error: any): ErrorSeverity {
  if (error.statusCode === 500 || error.code?.startsWith('P')) return 'HIGH';
  if (error.statusCode === 401 || error.statusCode === 403) return 'MEDIUM';
  if (error.statusCode >= 400 && error.statusCode < 500) return 'LOW';
  return 'MEDIUM';
}
