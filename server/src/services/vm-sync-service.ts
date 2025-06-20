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
      
      if (telemetryData.length === 0) {
        this.logger.warn('No telemetry data found');
        return { synced: 0, errors: 0 };
      }

      // Batch process with transaction
      await prisma.$transaction(async (tx) => {
        for (const data of telemetryData) {
          try {
            await this.syncSingleVM(tx, data);
            synced++;
          } catch (error) {
            this.logger.error(`Failed to sync VM ${data.vmname}`, error);
            errors++;
          }
        }
      });

      // Mark stale VMs as offline
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
    
    const staleCount = await prisma.vM.updateMany({
      where: {
        updatedAt: { lt: fiveMinutesAgo },
        status: VMStatus.running
      },
      data: { status: VMStatus.offline }
    });

    if (staleCount.count > 0) {
      this.logger.info(`Marked ${staleCount.count} VMs as offline (stale)`);
    }
  }
} 