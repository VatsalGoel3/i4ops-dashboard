import { VMStatus } from '@prisma/client';
import { TelemetryService, TelemetryData } from '../infrastructure/telemetry-service';
import { Logger } from '../infrastructure/logger';
import { broadcast } from '../events';
import { prisma } from '../infrastructure/database';

export class VMSyncService {
  private telemetry: TelemetryService;
  private logger: Logger;

  constructor() {
    this.telemetry = new TelemetryService();
    this.logger = new Logger('VMSyncService');
  }

  async syncVMs(): Promise<{ synced: number; errors: number }> {
    const startTime = Date.now();
    let synced = 0;
    let errors = 0;

    try {
      // First, try to get fresh telemetry data for regular sync
      const freshTelemetryData = await this.telemetry.getAllTelemetryData();
      
      // Also run VM discovery with more lenient rules (every 5th poll, or if no fresh data)
      const shouldRunDiscovery = Math.random() < 0.2 || freshTelemetryData.length === 0; // 20% chance or no fresh data
      let discoveredVMs: any[] = [];
      
      if (shouldRunDiscovery) {
        this.logger.info('Running VM discovery with extended grace period...');
        discoveredVMs = await this.telemetry.discoverAllVMs();
      }

      // Combine fresh data and discovered VMs, prioritizing fresh data
      const allTelemetryData = freshTelemetryData.length > 0 ? freshTelemetryData : discoveredVMs;
      
      this.logger.info(`Found ${freshTelemetryData.length} fresh telemetry records, ${discoveredVMs.length} discovered VMs`);
      
      if (allTelemetryData.length === 0) {
        this.logger.warn('No telemetry data found - marking all VMs as offline');
        // If no fresh telemetry data, mark all running VMs as offline
        await this.markAllVMsOffline();
      } else {
        // Track which VMs we've seen in data
        const seenVMIdentifiers = new Set<string>();

        // Batch process with transaction
        await prisma.$transaction(async (tx) => {
          for (const data of allTelemetryData) {
            try {
              const vmIdentifier = `${data.hostname}-${data.vmname}`;
              seenVMIdentifiers.add(vmIdentifier);
              
              // Determine if this is fresh or discovered data
              const isFreshData = freshTelemetryData.some(fresh => 
                fresh.hostname === data.hostname && fresh.vmname === data.vmname
              );
              
              await this.syncSingleVM(tx, data, isFreshData);
              synced++;
            } catch (error) {
              this.logger.error(`Failed to sync VM ${data.vmname}`, error);
              errors++;
            }
          }
        });

        // Only mark missing VMs as offline if we have fresh data
        if (freshTelemetryData.length > 0) {
          await this.markMissingVMsOffline(seenVMIdentifiers);
        }
      }

      // Also mark stale VMs as offline (backup safety net)
      await this.markStaleVMsOffline();

      // Broadcast updates
      const vms = await prisma.vM.findMany({
        include: { host: { select: { id: true, name: true } } }
      });
      broadcast('vms-update', vms);

      const duration = Date.now() - startTime;
      this.logger.info('VM sync complete', { synced, errors, duration });

      return { synced, errors };
    } catch (error) {
      this.logger.error('VM sync failed', error);
      throw error;
    } finally {
      this.telemetry.disconnect();
    }
  }

  private async syncSingleVM(tx: any, data: TelemetryData, isFreshData: boolean = true): Promise<void> {
    const host = await tx.host.findUnique({ where: { name: data.hostname } });
    
    if (!host) {
      throw new Error(`Host ${data.hostname} not found`);
    }

    // Create a unique identifier from hostname and vmname since the telemetry machineId 
    // may not be unique across different VMs (same base image/template)
    const uniqueIdentifier = `${data.hostname}-${data.vmname}`;
    
    // Determine VM status - if data is not fresh, mark as offline
    const vmStatus = isFreshData ? VMStatus.running : VMStatus.offline;
    
    await tx.vM.upsert({
      where: { machineId: uniqueIdentifier },
      create: {
        name: data.vmname,
        machineId: uniqueIdentifier,
        os: data.os,
        ip: data.ip,
        cpu: data.cpu,
        ram: data.ram,
        disk: data.disk,
        uptime: data.uptime,
        status: vmStatus,
        hostId: host.id,
      },
      update: {
        name: data.vmname,
        os: data.os,
        ip: data.ip,
        cpu: isFreshData ? data.cpu : 0, // Zero out metrics if not fresh
        ram: isFreshData ? data.ram : 0,
        disk: isFreshData ? data.disk : 0,
        uptime: isFreshData ? data.uptime : 0,
        status: vmStatus,
        updatedAt: isFreshData ? new Date() : undefined, // Only update timestamp if fresh
      },
    });
    
    if (!isFreshData) {
      this.logger.info(`Registered VM ${uniqueIdentifier} from stale telemetry (marked offline)`);
    }
  }

  private async markStaleVMsOffline(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Get stale VMs first to log their actual last seen times
    const staleVMs = await prisma.vM.findMany({
      where: {
        updatedAt: { lt: fiveMinutesAgo },
        status: VMStatus.running
      },
      select: { machineId: true, updatedAt: true }
    });

    if (staleVMs.length > 0) {
      // Update only status, preserve updatedAt to show true last seen time
      await prisma.vM.updateMany({
        where: {
          updatedAt: { lt: fiveMinutesAgo },
          status: VMStatus.running
        },
        data: { 
          status: VMStatus.offline
          // Deliberately NOT updating updatedAt to preserve last seen time
        }
      });

      this.logger.info(`Marked ${staleVMs.length} VMs as offline (stale) - preserving last seen times`);
    }
  }

  private async markAllVMsOffline(): Promise<void> {
    // Update only status, preserve updatedAt to show true last seen time
    await prisma.vM.updateMany({
      where: {
        status: VMStatus.running
      },
      data: { 
        status: VMStatus.offline
        // Deliberately NOT updating updatedAt to preserve last seen time
      }
    });

    this.logger.info('Marked all VMs as offline - preserving last seen times');
  }

  private async markMissingVMsOffline(seenVMIdentifiers: Set<string>): Promise<void> {
    // Get missing VMs first to log their details
    const missingVMs = await prisma.vM.findMany({
      where: {
        machineId: { notIn: Array.from(seenVMIdentifiers) },
        status: VMStatus.running
      },
      select: { machineId: true, updatedAt: true }
    });

    if (missingVMs.length > 0) {
      // Update only status, preserve updatedAt to show true last seen time
      await prisma.vM.updateMany({
        where: {
          machineId: { notIn: Array.from(seenVMIdentifiers) },
          status: VMStatus.running
        },
        data: { 
          status: VMStatus.offline
          // Deliberately NOT updating updatedAt to preserve last seen time
        }
      });

      this.logger.info(`Marked ${missingVMs.length} VMs as offline (missing from fresh telemetry) - preserving last seen times`);
    }
  }
} 