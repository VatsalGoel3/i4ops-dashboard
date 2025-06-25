import cron from 'node-cron';
import { VMSyncService } from '../services/vm-sync-service';
import { HostSyncService } from '../services/host-sync-service';
import { SecurityEventService } from '../services/security-event.service';
import { SecurityLogParser } from '../infrastructure/security-log-parser';
import { Logger } from '../infrastructure/logger';
import { broadcast } from '../events';
import { prisma } from '../infrastructure/database';
import { env } from '../config/env';

const logger = new Logger('PollScheduler');
const vmSync = new VMSyncService();
const hostSync = new HostSyncService();
const securityEventService = new SecurityEventService();
const securityLogParser = new SecurityLogParser(env.SECURITY_LOG_DIR);

let isVMPolling = false;
let isHostPolling = false;

export function startPollingJob(): void {
  logger.info('Starting polling services');

  // Start security log parser
  startSecurityLogParser();

  // Initial runs with delay
  setTimeout(() => {
    pollVMs();
    pollHosts();
  }, 3000);

  // Schedule VM polling every 2 minutes
  cron.schedule('*/2 * * * *', pollVMs);
  
  // Schedule host polling every 30 minutes  
  cron.schedule('*/30 * * * *', pollHosts);

  // Schedule security event cleanup daily at 2 AM
  cron.schedule('0 2 * * *', cleanupSecurityEvents);
  
  logger.info('Polling scheduled successfully');
}

async function startSecurityLogParser(): Promise<void> {
  try {
    await securityLogParser.start();
    logger.info('Security log parser started successfully');
  } catch (error) {
    logger.error('Failed to start security log parser', error);
    // Continue without security monitoring rather than crash
  }
}

async function pollVMs(): Promise<void> {
  if (isVMPolling) {
    logger.warn('VM polling already in progress, skipping');
    return;
  }

  isVMPolling = true;
  
  try {
    const result = await vmSync.syncVMs();
    logger.info('VM polling complete', result);
  } catch (error) {
    logger.error('VM polling failed', error);
  } finally {
    isVMPolling = false;
  }
}

async function pollHosts(): Promise<void> {
  if (isHostPolling) {
    logger.warn('Host polling already in progress, skipping');
    return;
  }

  isHostPolling = true;
  
  try {
    const result = await hostSync.syncHosts();
    
    // Broadcast updates
    const hosts = await prisma.host.findMany({ include: { vms: true } });
    broadcast('hosts-update', hosts);

    const vms = await prisma.vM.findMany({ 
      include: { host: { select: { id: true, name: true } } } 
    });
    broadcast('vms-update', vms);
    
    logger.info('Host polling complete', result);
  } catch (error) {
    logger.error('Host polling failed', error);
  } finally {
    isHostPolling = false;
  }
}

async function cleanupSecurityEvents(): Promise<void> {
  try {
    const deletedCount = await securityEventService.cleanupOldEvents(env.SECURITY_EVENT_RETENTION_DAYS);
    logger.info(`Security events cleanup complete: ${deletedCount} events deleted`);
  } catch (error) {
    logger.error('Security events cleanup failed', error);
  }
}

export async function stopPollingJob(): Promise<void> {
  logger.info('Stopping polling services');
  
  try {
    await securityLogParser.stop();
    logger.info('Security log parser stopped');
  } catch (error) {
    logger.error('Error stopping security log parser', error);
  }
}