/**
 * License Routes
 * API endpoints for license management
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as licenseController from '../controllers/license.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// LICENSE INFORMATION ROUTES
// ============================================================================

// Get current user's license
router.get('/me', licenseController.getLicense);

// Get license status and validation
router.get('/status', licenseController.checkStatus);

// Get comprehensive license statistics
router.get('/stats', licenseController.getLicenseStats);

// ============================================================================
// TIER MANAGEMENT ROUTES
// ============================================================================

// Upgrade to PREMIUM tier
router.post('/upgrade', licenseController.upgradeToPremium);

// Downgrade to FREE tier
router.post('/downgrade', licenseController.downgradeToFree);

// ============================================================================
// LICENSE LIFECYCLE ROUTES
// ============================================================================

// Create a new license
router.post('/create', licenseController.createLicense);

// Renew existing license
router.post('/renew', licenseController.renewLicense);

// Cancel license
router.delete('/cancel', licenseController.cancelLicense);

// Update license status
router.patch('/status', licenseController.updateStatus);

// ============================================================================
// TRIAL LICENSE ROUTES
// ============================================================================

// Grant trial license
router.post('/trial', licenseController.grantTrial);

// Convert trial to paid
router.post('/convert-trial', licenseController.convertTrial);

export default router;
