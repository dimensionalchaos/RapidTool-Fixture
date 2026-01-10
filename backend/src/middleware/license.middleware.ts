import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function checkModelLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        modelLimit: true,
        modelsUsed: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user has reached limit
    if (user.modelsUsed >= user.modelLimit) {
      if (user.tier === 'FREE') {
        return res.status(403).json({
          success: false,
          error: 'MODEL_LIMIT_REACHED',
          message: `You have reached your free tier limit of ${user.modelLimit} models`,
          data: {
            currentUsage: user.modelsUsed,
            limit: user.modelLimit,
            tier: user.tier,
            upgradeRequired: true,
          },
        });
      }
    }

    // Attach user info to request for later use
    (req as any).userTier = user.tier;
    (req as any).userModelUsage = {
      used: user.modelsUsed,
      limit: user.modelLimit,
    };

    next();
  } catch (error) {
    console.error('[License Middleware] Error checking model limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check model limit',
    });
  }
}

export async function checkLicenseStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const license = await prisma.license.findUnique({
      where: { userId },
      select: {
        licenseType: true,
        status: true,
        dateEnd: true,
      },
    });

    if (!license) {
      // No license found, user might be on free tier
      next();
      return;
    }

    // Check if license has expired
    if (license.dateEnd && license.dateEnd < new Date()) {
      if (license.status === 'ACTIVE') {
        // Update license status to expired
        await prisma.license.update({
          where: { userId },
          data: { status: 'EXPIRED' },
        });

        return res.status(403).json({
          success: false,
          error: 'LICENSE_EXPIRED',
          message: 'Your license has expired. Please renew to continue.',
          data: {
            expiredAt: license.dateEnd,
          },
        });
      }
    }

    // Check if license is suspended or cancelled
    if (license.status === 'SUSPENDED' || license.status === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        error: 'LICENSE_INACTIVE',
        message: `Your license is ${license.status.toLowerCase()}. Please contact support.`,
        data: {
          status: license.status,
        },
      });
    }

    next();
  } catch (error) {
    console.error('[License Middleware] Error checking license status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check license status',
    });
  }
}
