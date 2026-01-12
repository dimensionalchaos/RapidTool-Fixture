/**
 * License Service
 * Handles all license-related business logic including CRUD operations,
 * tier management, validation, and expiry handling
 */

import { prisma } from '../lib/prisma';
import { LicenseType, LicenseStatus, UserTier } from '@prisma/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateLicenseData {
  userId: string;
  licenseType: LicenseType;
  dateEnd?: Date;
}

export interface LicenseInfo {
  id: string;
  userId: string;
  licenseType: LicenseType;
  status: LicenseStatus;
  dateStart: Date;
  dateEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  daysRemaining?: number;
  isExpired: boolean;
}

export interface UpgradeTierResult {
  success: boolean;
  message: string;
  newTier: UserTier;
  newLimit: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_LIMITS = {
  FREE: 5,
  PREMIUM: 999999,
} as const;

const TRIAL_DURATION_DAYS = 14;
const EXPIRY_WARNING_DAYS = 7;

// ============================================================================
// LICENSE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new license for a user
 */
export async function createLicense(data: CreateLicenseData): Promise<LicenseInfo> {
  const { userId, licenseType, dateEnd } = data;

  // Check if user already has a license
  const existingLicense = await prisma.license.findUnique({
    where: { userId },
  });

  if (existingLicense) {
    throw new Error('User already has a license');
  }

  // Calculate dates
  const dateStart = new Date();
  let calculatedDateEnd = dateEnd;

  if (licenseType === 'TRIAL' && !dateEnd) {
    calculatedDateEnd = new Date();
    calculatedDateEnd.setDate(calculatedDateEnd.getDate() + TRIAL_DURATION_DAYS);
  }

  // Create license
  const license = await prisma.license.create({
    data: {
      userId,
      licenseType,
      status: 'ACTIVE',
      dateStart,
      dateEnd: calculatedDateEnd,
    },
  });

  return formatLicenseInfo(license);
}

/**
 * Get license by user ID
 */
export async function getLicenseByUserId(userId: string): Promise<LicenseInfo | null> {
  const license = await prisma.license.findUnique({
    where: { userId },
  });

  if (!license) {
    return null;
  }

  return formatLicenseInfo(license);
}

/**
 * Get license by license ID
 */
export async function getLicenseById(licenseId: string): Promise<LicenseInfo | null> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
  });

  if (!license) {
    return null;
  }

  return formatLicenseInfo(license);
}

/**
 * Update license status
 */
export async function updateLicenseStatus(
  licenseId: string,
  status: LicenseStatus
): Promise<LicenseInfo> {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: { status },
  });

  return formatLicenseInfo(license);
}

/**
 * Update license by user ID
 */
export async function updateLicenseByUserId(
  userId: string,
  data: {
    status?: LicenseStatus;
    licenseType?: LicenseType;
    dateEnd?: Date;
  }
): Promise<LicenseInfo> {
  const license = await prisma.license.update({
    where: { userId },
    data,
  });

  return formatLicenseInfo(license);
}

/**
 * Delete/Cancel a license
 */
export async function cancelLicense(licenseId: string): Promise<LicenseInfo> {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      status: 'CANCELLED',
    },
  });

  // Downgrade user to FREE tier
  await prisma.user.update({
    where: { id: license.userId },
    data: {
      tier: 'FREE',
      modelLimit: TIER_LIMITS.FREE,
    },
  });

  return formatLicenseInfo(license);
}

/**
 * Renew a license
 */
export async function renewLicense(
  licenseId: string,
  dateEnd: Date
): Promise<LicenseInfo> {
  const license = await prisma.license.update({
    where: { id: licenseId },
    data: {
      status: 'ACTIVE',
      dateEnd,
    },
  });

  return formatLicenseInfo(license);
}

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

/**
 * Upgrade user tier from FREE to PREMIUM
 */
export async function upgradeToPremium(userId: string): Promise<UpgradeTierResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.tier === 'PREMIUM') {
    return {
      success: false,
      message: 'User is already on PREMIUM tier',
      newTier: 'PREMIUM',
      newLimit: TIER_LIMITS.PREMIUM,
    };
  }

  // Update user tier and model limit
  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: 'PREMIUM',
      modelLimit: TIER_LIMITS.PREMIUM,
    },
  });

  return {
    success: true,
    message: 'Successfully upgraded to PREMIUM tier',
    newTier: 'PREMIUM',
    newLimit: TIER_LIMITS.PREMIUM,
  };
}

/**
 * Downgrade user tier from PREMIUM to FREE
 */
export async function downgradeToFree(userId: string): Promise<UpgradeTierResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, modelsUsed: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.tier === 'FREE') {
    return {
      success: false,
      message: 'User is already on FREE tier',
      newTier: 'FREE',
      newLimit: TIER_LIMITS.FREE,
    };
  }

  // Check if user has exceeded FREE tier limit
  if (user.modelsUsed > TIER_LIMITS.FREE) {
    throw new Error(
      `Cannot downgrade: User has ${user.modelsUsed} models, exceeding FREE tier limit of ${TIER_LIMITS.FREE}`
    );
  }

  // Update user tier and model limit
  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: 'FREE',
      modelLimit: TIER_LIMITS.FREE,
    },
  });

  return {
    success: true,
    message: 'Successfully downgraded to FREE tier',
    newTier: 'FREE',
    newLimit: TIER_LIMITS.FREE,
  };
}

/**
 * Update user model limit
 */
export async function updateModelLimit(userId: string, newLimit: number): Promise<void> {
  if (newLimit < 0) {
    throw new Error('Model limit cannot be negative');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { modelLimit: newLimit },
  });
}

// ============================================================================
// LICENSE VALIDATION
// ============================================================================

/**
 * Validate if a license is active and not expired
 */
export async function validateLicense(userId: string): Promise<{
  valid: boolean;
  reason?: string;
  license?: LicenseInfo;
}> {
  const license = await getLicenseByUserId(userId);

  if (!license) {
    return {
      valid: false,
      reason: 'No license found',
    };
  }

  // Check status
  if (license.status !== 'ACTIVE') {
    return {
      valid: false,
      reason: `License is ${license.status.toLowerCase()}`,
      license,
    };
  }

  // Check expiry
  if (license.dateEnd && license.dateEnd < new Date()) {
    // Auto-expire the license
    await updateLicenseStatus(license.id, 'EXPIRED');
    
    return {
      valid: false,
      reason: 'License has expired',
      license: { ...license, status: 'EXPIRED', isExpired: true },
    };
  }

  return {
    valid: true,
    license,
  };
}

/**
 * Check if license is expiring soon
 */
export async function checkLicenseExpiry(userId: string): Promise<{
  isExpiringSoon: boolean;
  daysRemaining?: number;
  dateEnd?: Date;
}> {
  const license = await getLicenseByUserId(userId);

  if (!license || !license.dateEnd) {
    return { isExpiringSoon: false };
  }

  const daysRemaining = Math.ceil(
    (license.dateEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isExpiringSoon: daysRemaining <= EXPIRY_WARNING_DAYS && daysRemaining > 0,
    daysRemaining,
    dateEnd: license.dateEnd,
  };
}

/**
 * Auto-expire licenses (for cron job)
 */
export async function autoExpireLicenses(): Promise<{
  expiredCount: number;
  expiredLicenses: string[];
}> {
  const now = new Date();

  // Find all active licenses that have expired
  const expiredLicenses = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      dateEnd: {
        lt: now,
      },
    },
  });

  // Update them to EXPIRED status
  const updatePromises = expiredLicenses.map((license) =>
    prisma.license.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' },
    })
  );

  await Promise.all(updatePromises);

  // Downgrade users to FREE tier
  const downgradePromises = expiredLicenses.map((license) =>
    prisma.user.update({
      where: { id: license.userId },
      data: {
        tier: 'FREE',
        modelLimit: TIER_LIMITS.FREE,
      },
    })
  );

  await Promise.all(downgradePromises);

  return {
    expiredCount: expiredLicenses.length,
    expiredLicenses: expiredLicenses.map((l) => l.id),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format license data with additional computed fields
 */
function formatLicenseInfo(license: any): LicenseInfo {
  const now = new Date();
  const isExpired = license.dateEnd ? license.dateEnd < now : false;
  
  let daysRemaining: number | undefined;
  if (license.dateEnd) {
    daysRemaining = Math.ceil(
      (license.dateEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysRemaining < 0) daysRemaining = 0;
  }

  return {
    id: license.id,
    userId: license.userId,
    licenseType: license.licenseType,
    status: license.status,
    dateStart: license.dateStart,
    dateEnd: license.dateEnd,
    createdAt: license.createdAt,
    updatedAt: license.updatedAt,
    daysRemaining,
    isExpired,
  };
}

/**
 * Get license statistics for a user
 */
export async function getLicenseStats(userId: string): Promise<{
  hasLicense: boolean;
  licenseType?: LicenseType;
  status?: LicenseStatus;
  tier: UserTier;
  modelLimit: number;
  modelsUsed: number;
  modelsRemaining: number;
  daysRemaining?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      modelLimit: true,
      modelsUsed: true,
      license: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const license = user.license ? formatLicenseInfo(user.license) : null;
  const expiryCheck = license ? await checkLicenseExpiry(userId) : { isExpiringSoon: false };

  return {
    hasLicense: !!license,
    licenseType: license?.licenseType,
    status: license?.status,
    tier: user.tier,
    modelLimit: user.modelLimit,
    modelsUsed: user.modelsUsed,
    modelsRemaining: Math.max(0, user.modelLimit - user.modelsUsed),
    daysRemaining: license?.daysRemaining,
    isExpired: license?.isExpired || false,
    isExpiringSoon: expiryCheck.isExpiringSoon,
  };
}

/**
 * Grant a trial license to a new user
 */
export async function grantTrialLicense(userId: string): Promise<LicenseInfo> {
  return createLicense({
    userId,
    licenseType: 'TRIAL',
  });
}

/**
 * Convert trial to paid license
 */
export async function convertTrialToPaid(
  userId: string,
  dateEnd: Date
): Promise<LicenseInfo> {
  const license = await prisma.license.findUnique({
    where: { userId },
  });

  if (!license) {
    throw new Error('No license found for user');
  }

  if (license.licenseType !== 'TRIAL') {
    throw new Error('License is not a trial license');
  }

  return updateLicenseByUserId(userId, {
    licenseType: 'PAID',
    status: 'ACTIVE',
    dateEnd,
  });
}
