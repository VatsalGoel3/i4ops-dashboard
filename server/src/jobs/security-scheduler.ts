import * as cron from 'node-cron';
import { Logger } from '../infrastructure/logger';
import { broadcastSecurityUpdate } from '../events';
import { PrismaClient } from '@prisma/client';
import { LogSyncService } from '../services/log-sync-service';
import { env } from '../config/env';

const logger = new Logger('SecurityScheduler');
const prisma = new PrismaClient();

let securitySyncJob: cron.ScheduledTask | null = null;
let logSyncService: LogSyncService | null = null;
let isProcessing = false;

/**
 * Start the security log sync job
 * Runs every minute to sync logs from u0 and process them
 */
export function startSecurityJob() {
  if (securitySyncJob) {
    logger.warn('Security sync job already running');
    return;
  }

  // Initialize log sync service
  logSyncService = new LogSyncService();

  // Run every minute
  securitySyncJob = cron.schedule('* * * * *', async () => {
    if (isProcessing) {
      logger.debug('Security sync already in progress, skipping...');
      return;
    }

    await runSecuritySync();
  }, {
    scheduled: false,
    timezone: 'UTC'
  });

  securitySyncJob.start();
  logger.info('Security sync job scheduler started (every minute)');

  // Run initial sync after 10 seconds
  setTimeout(() => {
    runSecuritySync();
  }, 10000);
}

/**
 * Stop the security job scheduler
 */
export function stopSecurityJob() {
  if (securitySyncJob) {
    securitySyncJob.destroy();
    securitySyncJob = null;
    logger.info('Security sync job scheduler stopped');
  }
  
  if (logSyncService) {
    logSyncService.disconnect();
    logSyncService = null;
  }
}

/**
 * Run a security log sync manually
 */
export async function runSecuritySync(): Promise<void> {
  if (isProcessing) {
    logger.debug('Security sync already in progress');
    return;
  }

  if (!logSyncService) {
    logger.error('Log sync service not initialized');
    return;
  }

  isProcessing = true;
  const startTime = Date.now();
  
  try {
    logger.debug('Starting security log sync from u0...');

    // Get count before sync
    const eventsBefore = await prisma.securityEvent.count();

    // Sync all VM logs from u0
    const syncResult = await logSyncService.syncAllVMLogs();

    const duration = Date.now() - startTime;
    
    if (syncResult.success) {
      logger.info(`Security sync completed in ${duration}ms. VMs: ${syncResult.vmsProcessed}, Events: ${syncResult.eventsSaved} saved`);
      
      // Broadcast update to connected clients if new events found
      if (syncResult.eventsSaved > 0) {
        await broadcastSecurityUpdate();
        logger.info(`Broadcasted security update for ${syncResult.eventsSaved} new events`);
      }
    } else {
      logger.warn(`Security sync completed with errors in ${duration}ms: ${syncResult.errors.join(', ')}`);
    }

    // Clean up old temp files every 10 syncs (roughly every 10 minutes)
    if (Math.random() < 0.1) {
      logSyncService.cleanupTempFiles();
    }

  } catch (error) {
    logger.error('Security sync error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Get security job status
 */
export function getSecurityJobStatus() {
  return {
    isRunning: securitySyncJob !== null && securitySyncJob.scheduled,
    isProcessing,
    interval: '1 minute',
    nextRun: securitySyncJob ? 'Every minute' : null,
    syncMethod: 'SSH to u0',
    logPath: env.LOG_BASE_PATH
  };
}

/**
 * Trigger a manual security sync
 */
export async function triggerManualSync(): Promise<{ message: string; processing: boolean }> {
  if (isProcessing) {
    return {
      message: 'Security sync already in progress',
      processing: true
    };
  }

  // Run sync in background
  setImmediate(() => {
    runSecuritySync().catch(error => {
      logger.error('Manual security sync failed:', error);
    });
  });

  return {
    message: 'Security sync started',
    processing: true
  };
} 