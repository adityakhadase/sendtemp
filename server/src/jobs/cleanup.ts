import { prisma } from '../lib/prisma';
import { defaultStorageProvider } from '../services/StorageService';

let cleanupIntervalTimer: NodeJS.Timeout | null = null;
let isCleanupRunning = false;

export interface CleanupResult {
  expiredSharesCount: number;
  deletedFilesCount: number;
  failedDeletionsCount: number;
}

/**
 * Executes a single idempotent pass of the cleanup job.
 * Finds all expired shares, updates status atomically, and purges physical files.
 */
export async function runCleanupJob(): Promise<CleanupResult> {
  if (isCleanupRunning) {
    console.log(
      JSON.stringify({
        event: 'cleanup.skipped',
        reason: 'Previous cleanup job is still executing',
        timestamp: new Date().toISOString(),
      })
    );
    return { expiredSharesCount: 0, deletedFilesCount: 0, failedDeletionsCount: 0 };
  }

  isCleanupRunning = true;
  let expiredSharesCount = 0;
  let deletedFilesCount = 0;
  let failedDeletionsCount = 0;

  try {
    const now = new Date();

    // Query shares that have surpassed their TTL but haven't been marked as EXPIRED yet
    const expiredShares = await prisma.share.findMany({
      where: {
        expiresAt: { lt: now },
        status: { not: 'EXPIRED' },
      },
      include: {
        file: true,
      },
    });

    for (const share of expiredShares) {
      try {
        // Atomic status transition to EXPIRED
        const updateResult = await prisma.share.updateMany({
          where: {
            id: share.id,
            status: { not: 'EXPIRED' },
          },
          data: {
            status: 'EXPIRED',
          },
        });

        if (updateResult.count > 0) {
          expiredSharesCount++;

          // Attempt to remove physical file asset
          try {
            await defaultStorageProvider.delete(share.file.storageKey);
            deletedFilesCount++;
          } catch (fileErr: any) {
            failedDeletionsCount++;
            console.error(
              JSON.stringify({
                event: 'cleanup.file_delete_failed',
                shareId: share.id,
                storageKey: share.file.storageKey,
                error: fileErr.message || 'File deletion failed',
                timestamp: new Date().toISOString(),
              })
            );
          }
        }
      } catch (dbErr: any) {
        console.error(
          JSON.stringify({
            event: 'cleanup.share_update_failed',
            shareId: share.id,
            error: dbErr.message || 'Database update failed',
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    console.log(
      JSON.stringify({
        event: 'cleanup.completed',
        expiredSharesCount,
        deletedFilesCount,
        failedDeletionsCount,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err: any) {
    console.error(
      JSON.stringify({
        event: 'cleanup.error',
        error: err.message || 'Unexpected error during cleanup run',
        timestamp: new Date().toISOString(),
      })
    );
  } finally {
    isCleanupRunning = false;
  }

  return { expiredSharesCount, deletedFilesCount, failedDeletionsCount };
}

/**
 * Starts the background cleanup worker with a configurable interval.
 */
export function startCleanupWorker(intervalMs: number = 60000): NodeJS.Timeout {
  if (cleanupIntervalTimer) {
    clearInterval(cleanupIntervalTimer);
  }

  console.log(
    JSON.stringify({
      event: 'cleanup.worker_started',
      intervalMs,
      timestamp: new Date().toISOString(),
    })
  );

  // Initial pass shortly after boot
  setTimeout(() => {
    runCleanupJob().catch(() => {});
  }, 2000);

  cleanupIntervalTimer = setInterval(() => {
    runCleanupJob().catch(() => {});
  }, intervalMs);

  return cleanupIntervalTimer;
}

/**
 * Stops the background cleanup worker.
 */
export function stopCleanupWorker(): void {
  if (cleanupIntervalTimer) {
    clearInterval(cleanupIntervalTimer);
    cleanupIntervalTimer = null;
    console.log(
      JSON.stringify({
        event: 'cleanup.worker_stopped',
        timestamp: new Date().toISOString(),
      })
    );
  }
}
