import { prisma } from '../lib/prisma';

export async function trackUserTime(userId: string, timeSpent: number) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        timeSpent: { increment: timeSpent },
      },
      select: {
        id: true,
        timeSpent: true,
      },
    });

    console.log(`[UserProgress] User ${userId} total time: ${user.timeSpent}s`);
    return user;
  } catch (error) {
    console.error('[UserProgress] Failed to track time:', error);
    throw error;
  }
}

export async function trackUserStep(userId: string, stepNumber: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { maxStepReached: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updateData: any = {
      lastSessionFinalStep: stepNumber,
    };

    // Update max step if this is a new highest step
    if (stepNumber > user.maxStepReached) {
      updateData.maxStepReached = stepNumber;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        maxStepReached: true,
        lastSessionFinalStep: true,
      },
    });

    console.log(
      `[UserProgress] User ${userId} step: ${stepNumber} (max: ${updated.maxStepReached})`
    );
    return updated;
  } catch (error) {
    console.error('[UserProgress] Failed to track step:', error);
    throw error;
  }
}

export async function getUserProgress(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        timeSpent: true,
        maxStepReached: true,
        lastSessionFinalStep: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      timeSpent: user.timeSpent,
      maxStepReached: user.maxStepReached,
      lastSessionFinalStep: user.lastSessionFinalStep,
      timeSpentFormatted: formatTime(user.timeSpent),
    };
  } catch (error) {
    console.error('[UserProgress] Failed to get progress:', error);
    throw error;
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
