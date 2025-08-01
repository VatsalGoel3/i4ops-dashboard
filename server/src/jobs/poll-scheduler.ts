import cron from 'node-cron';
import { VMSyncService } from '../services/vm-sync-service';
import { HostSyncService } from '../services/host-sync-service';
import { Logger } from '../infrastructure/logger';
import { broadcast } from '../events';
import { prisma } from '../infrastructure/database';

const logger = new Logger('PollScheduler');
const vmSync = new VMSyncService();
const hostSync = new HostSyncService();

let isVMPolling = false;
let isHostPolling = false;
let vmPollTimeout: NodeJS.Timeout | null = null;

export function startPollingJob(): void {
  logger.info('Starting optimized polling services');

  // Initial runs with delay
  setTimeout(() => {
    pollVMs();
    pollHosts();
  }, 3000);

  // Setup file watcher for real-time updates (when running locally)
  setupFileWatcherTrigger();

  // Schedule VM polling every 30 seconds (reduced from 2 minutes)
  // Note: node-cron doesn't support seconds, so we use setInterval for sub-minute intervals
  setInterval(pollVMs, 30 * 1000); // Every 30 seconds
  
  // Schedule host polling every 15 minutes (reduced from 30 minutes)
  cron.schedule('*/15 * * * *', pollHosts);
  
  logger.info('Optimized polling scheduled: VMs every 30s, Hosts every 15min');
}

function setupFileWatcherTrigger(): void {
  try {
    // Access the telemetry service from vm sync service
    const telemetryService = vmSync.getTelemetryService();
    
    if (telemetryService) {
      telemetryService.on('fileChanged', (filePath: string) => {
        logger.debug(`File watcher triggered VM poll due to: ${filePath}`);
        
        // Debounce rapid file changes
        if (vmPollTimeout) {
          clearTimeout(vmPollTimeout);
        }
        
        vmPollTimeout = setTimeout(() => {
          pollVMs();
        }, 2000); // 2 second debounce
      });
      
      logger.info('File watcher trigger setup for real-time VM updates');
    }
  } catch (error) {
    logger.warn('Could not setup file watcher trigger', error);
  }
}

async function pollVMs(): Promise<void> {
  if (isVMPolling) {
    logger.debug('VM polling already in progress, skipping');
    return;
  }

  isVMPolling = true;
  const startTime = Date.now();
  
  try {
    const result = await vmSync.syncVMs();
    const duration = Date.now() - startTime;
    
    // Broadcast VM updates immediately after sync
    const vms = await prisma.vM.findMany({ 
      include: { host: { select: { id: true, name: true } } } 
    });
    broadcast('vms-update', vms);
    
    logger.info(`VM polling complete in ${duration}ms`, result);
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
  const startTime = Date.now();
  
  try {
    const result = await hostSync.syncHosts();
    const duration = Date.now() - startTime;
    
    // Broadcast updates
    const hosts = await prisma.host.findMany({ include: { vms: true } });
    broadcast('hosts-update', hosts);

    const vms = await prisma.vM.findMany({ 
      include: { host: { select: { id: true, name: true } } } 
    });
    broadcast('vms-update', vms);
    
    logger.info(`Host polling complete in ${duration}ms`, result);
  } catch (error) {
    logger.error('Host polling failed', error);
  } finally {
    isHostPolling = false;
  }
}