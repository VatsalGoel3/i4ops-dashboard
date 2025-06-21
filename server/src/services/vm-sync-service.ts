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
      const telemetryData = await this.telemetry.getAllTelemetryData();
      
      this.logger.info(`Found ${telemetryData.length} fresh telemetry records`);
      
      if (telemetryData.length === 0) {
        this.logger.warn('No fresh telemetry data found - marking all VMs as offline');
        // If no fresh telemetry data, mark all running VMs as offline
        await this.markAllVMsOffline();
      } else {
        // Track which VMs we've seen in fresh data
        const freshVMIdentifiers = new Set<string>();

        // Batch process with transaction
        await prisma.$transaction(async (tx) => {
          for (const data of telemetryData) {
            try {
              const vmIdentifier = `${data.hostname}-${data.vmname}`;
              freshVMIdentifiers.add(vmIdentifier);
              await this.syncSingleVM(tx, data);
              synced++;
            } catch (error) {
              this.logger.error(`Failed to sync VM ${data.vmname}`, error);
              errors++;
            }
          }
        });

        // Mark VMs that weren't in fresh telemetry as offline
        await this.markMissingVMsOffline(freshVMIdentifiers);
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

  private async syncSingleVM(tx: any, data: TelemetryData): Promise<void> {
    const host = await tx.host.findUnique({ where: { name: data.hostname } });
    
    if (!host) {
      throw new Error(`Host ${data.hostname} not found`);
    }

    // Create a unique identifier from hostname and vmname since the telemetry machineId 
    // may not be unique across different VMs (same base image/template)
    const uniqueIdentifier = `${data.hostname}-${data.vmname}`;
    
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
        status: VMStatus.running,
        hostId: host.id,
      },
      update: {
        name: data.vmname,
        os: data.os,
        ip: data.ip,
        cpu: data.cpu,
        ram: data.ram,
        disk: data.disk,
        uptime: data.uptime,
        status: VMStatus.running,
        updatedAt: new Date(),
      },
    });
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

  private async markMissingVMsOffline(freshVMIdentifiers: Set<string>): Promise<void> {
    // Get missing VMs first to log their details
    const missingVMs = await prisma.vM.findMany({
      where: {
        machineId: { notIn: Array.from(freshVMIdentifiers) },
        status: VMStatus.running
      },
      select: { machineId: true, updatedAt: true }
    });

    if (missingVMs.length > 0) {
      // Update only status, preserve updatedAt to show true last seen time
      await prisma.vM.updateMany({
        where: {
          machineId: { notIn: Array.from(freshVMIdentifiers) },
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