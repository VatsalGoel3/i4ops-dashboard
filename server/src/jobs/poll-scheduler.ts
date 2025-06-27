import cron from 'node-cron';
import { VMSyncService } from '../services/vm-sync-service';
import { HostSyncService } from '../services/host-sync-service';
import { Logger } from '../infrastructure/logger';
import { broadcast, closeAllConnections } from '../events';
import { prisma } from '../infrastructure/database';

const logger = new Logger('PollScheduler');
const vmSync = new VMSyncService();
const hostSync = new HostSyncService();

let isVMPolling = false;
let isHostPolling = false;

export function startPollingJob(): void {
  logger.info('Starting polling services');

  // Initial runs with delay
  setTimeout(() => {
    pollVMs();
    pollHosts();
  }, 3000);

  // Schedule VM polling every 2 minutes
  cron.schedule('*/2 * * * *', pollVMs);
  
  // Schedule host polling every 30 minutes  
  cron.schedule('*/30 * * * *', pollHosts);
  
  logger.info('Polling scheduled successfully');
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

export async function stopPollingJob(): Promise<void> {
  logger.info('Stopping polling services');
  
  try {
    closeAllConnections();
    logger.info('SSE connections closed');
  } catch (error) {
    logger.error('Error closing SSE connections', error);
  }
}