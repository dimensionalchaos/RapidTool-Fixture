/**
 * License Controller
 * Handles HTTP requests for license management operations
 */

import { Request, Response } from 'express';
import * as licenseService from '../services/license.service';
import { LicenseStatus, LicenseType } from '@prisma/client';

// ============================================================================
// GET LICENSE INFORMATION
// ============================================================================

/**
 * Get current user's license
 * GET /api/license/me
 */
export async function getLicense(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const license = await licenseService.getLicenseByUserId(userId);

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'No license found',
        message: 'User does not have a license',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: license,
    });
  } catch (error) {
    console.error('[License Controller] Error getting license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get license status and validation
 * GET /api/license/status
 */
export async function checkStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const validation = await licenseService.validateLicense(userId);

    res.status(200).json({
      success: true,
      data: {
        valid: validation.valid,
        reason: validation.reason,
        license: validation.license,
      },
    });
  } catch (error) {
    console.error('[License Controller] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check license status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get comprehensive license statistics
 * GET /api/license/stats
 */
export async function getLicenseStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const stats = await licenseService.getLicenseStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[License Controller] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get license statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

/**
 * Upgrade user to PREMIUM tier
 * POST /api/license/upgrade
 */
export async function upgradeToPremium(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const result = await licenseService.upgradeToPremium(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
        data: {
          currentTier: result.newTier,
          currentLimit: result.newLimit,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        tier: result.newTier,
        modelLimit: result.newLimit,
      },
    });
  } catch (error) {
    console.error('[License Controller] Error upgrading to premium:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade tier',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Downgrade user to FREE tier
 * POST /api/license/downgrade
 */
export async function downgradeToFree(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const result = await licenseService.downgradeToFree(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
        data: {
          currentTier: result.newTier,
          currentLimit: result.newLimit,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        tier: result.newTier,
        modelLimit: result.newLimit,
      },
    });
  } catch (error) {
    console.error('[License Controller] Error downgrading to free:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to downgrade tier',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// LICENSE LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Create a new license for user
 * POST /api/license/create
 * Body: { licenseType: 'TRIAL' | 'PAID', dateEnd?: Date }
 */
export async function createLicense(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { licenseType, dateEnd } = req.body;

    if (!licenseType || !['TRIAL', 'PAID'].includes(licenseType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid license type',
        message: 'licenseType must be either TRIAL or PAID',
      });
      return;
    }

    const license = await licenseService.createLicense({
      userId,
      licenseType: licenseType as LicenseType,
      dateEnd: dateEnd ? new Date(dateEnd) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'License created successfully',
      data: license,
    });
  } catch (error) {
    console.error('[License Controller] Error creating license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Renew an existing license
 * POST /api/license/renew
 * Body: { dateEnd: Date }
 */
export async function renewLicense(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { dateEnd } = req.body;

    if (!dateEnd) {
      res.status(400).json({
        success: false,
        error: 'Missing dateEnd',
        message: 'dateEnd is required for license renewal',
      });
      return;
    }

    const license = await licenseService.getLicenseByUserId(userId);

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'No license found',
        message: 'User does not have a license to renew',
      });
      return;
    }

    const renewedLicense = await licenseService.renewLicense(
      license.id,
      new Date(dateEnd)
    );

    res.status(200).json({
      success: true,
      message: 'License renewed successfully',
      data: renewedLicense,
    });
  } catch (error) {
    console.error('[License Controller] Error renewing license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to renew license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Cancel user's license
 * DELETE /api/license/cancel
 */
export async function cancelLicense(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const license = await licenseService.getLicenseByUserId(userId);

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'No license found',
        message: 'User does not have a license to cancel',
      });
      return;
    }

    const cancelledLicense = await licenseService.cancelLicense(license.id);

    res.status(200).json({
      success: true,
      message: 'License cancelled successfully. User downgraded to FREE tier.',
      data: cancelledLicense,
    });
  } catch (error) {
    console.error('[License Controller] Error cancelling license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update license status
 * PATCH /api/license/status
 * Body: { status: LicenseStatus }
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { status } = req.body;

    if (!status || !['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'status must be one of: ACTIVE, EXPIRED, SUSPENDED, CANCELLED',
      });
      return;
    }

    const license = await licenseService.getLicenseByUserId(userId);

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'No license found',
      });
      return;
    }

    const updatedLicense = await licenseService.updateLicenseStatus(
      license.id,
      status as LicenseStatus
    );

    res.status(200).json({
      success: true,
      message: 'License status updated successfully',
      data: updatedLicense,
    });
  } catch (error) {
    console.error('[License Controller] Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update license status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// TRIAL LICENSE MANAGEMENT
// ============================================================================

/**
 * Grant trial license to current user
 * POST /api/license/trial
 */
export async function grantTrial(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const license = await licenseService.grantTrialLicense(userId);

    res.status(201).json({
      success: true,
      message: 'Trial license granted successfully',
      data: license,
    });
  } catch (error) {
    console.error('[License Controller] Error granting trial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grant trial license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Convert trial to paid license
 * POST /api/license/convert-trial
 * Body: { dateEnd: Date }
 */
export async function convertTrial(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { dateEnd } = req.body;

    if (!dateEnd) {
      res.status(400).json({
        success: false,
        error: 'Missing dateEnd',
        message: 'dateEnd is required for converting trial to paid',
      });
      return;
    }

    const license = await licenseService.convertTrialToPaid(
      userId,
      new Date(dateEnd)
    );

    res.status(200).json({
      success: true,
      message: 'Trial license converted to paid successfully',
      data: license,
    });
  } catch (error) {
    console.error('[License Controller] Error converting trial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert trial license',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
