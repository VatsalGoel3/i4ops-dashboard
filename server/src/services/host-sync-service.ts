import { NodeSSH } from 'node-ssh';
import { Logger } from '../infrastructure/logger';
import { prisma } from '../infrastructure/database';
import { env } from '../config/env';
import { updateIPsFromTailscale } from '../scripts/sync-IPs';
import { HostStatus, VMStatus } from '@prisma/client';

export class HostSyncService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('HostSyncService');
  }

  async syncHosts(): Promise<{ synced: number; errors: number }> {
    const startTime = Date.now();
    let synced = 0;
    let errors = 0;

    try {
      // Sync IPs from Tailscale first
      await updateIPsFromTailscale();

      const hosts = await prisma.host.findMany();
      
      // Process hosts in batches of 5 for concurrency control
      for (let i = 0; i < hosts.length; i += 5) {
        const batch = hosts.slice(i, i + 5);
        await Promise.all(
          batch.map(async (host) => {
            try {
              await this.syncSingleHost(host);
              synced++;
            } catch (error) {
              this.logger.error(`Failed to sync host ${host.name}`, error);
              errors++;
            }
          })
        );
      }

      // Log poll history
      const upCount = hosts.filter(h => h.status === 'up').length;
      const downCount = hosts.length - upCount;
      
      await prisma.pollHistory.create({
        data: { up: upCount, down: downCount }
      });

      const duration = Date.now() - startTime;
      this.logger.info('Host sync complete', { synced, errors, duration });

      return { synced, errors };
    } catch (error) {
      this.logger.error('Host sync failed', error);
      throw error;
    }
  }

  private async syncSingleHost(host: any): Promise<void> {
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: host.ip,
        username: env.SSH_USER,
        password: env.SSH_PASSWORD,
        readyTimeout: 15000,
      });

      // Get all metrics in parallel
      const [uptimeOut, loadOut, freeOut, dfOut, osRelease] = await Promise.all([
        ssh.execCommand('cat /proc/uptime'),
        ssh.execCommand('cat /proc/loadavg'),
        ssh.execCommand('free -m'),
        ssh.execCommand('df -h /'),
        ssh.execCommand('cat /etc/os-release')
      ]);

      const uptime = this.parseUptime(uptimeOut.stdout);
      const cpu = this.parseLoadAvg(loadOut.stdout);
      const ram = this.parseMemoryUsage(freeOut.stdout);
      const disk = this.parseDiskUsage(dfOut.stdout);
      const os = this.parseOS(osRelease.stdout) || host.os;

      await prisma.host.update({
        where: { id: host.id },
        data: {
          os,
          uptime,
          status: HostStatus.up,
          ssh: true,
          cpu,
          ram,
          disk,
        },
      });

      this.logger.debug(`Host ${host.name} synced`, { cpu, ram, disk });

    } catch (error) {
      // Mark host as down
      await prisma.$transaction([
        prisma.host.update({
          where: { id: host.id },
          data: {
            status: HostStatus.down,
            ssh: false,
            uptime: 0,
            cpu: 0,
            ram: 0,
            disk: 0
          }
        }),
        prisma.vM.updateMany({
          where: { hostId: host.id },
          data: { status: VMStatus.offline }
        })
      ]);

      throw error;
    } finally {
      ssh.dispose();
    }
  }

  private parseUptime(output: string): number {
    const parts = output.trim().split(/\s+/);
    return Math.floor(parseFloat(parts[0]));
  }

  private parseLoadAvg(output: string): number {
    const parts = output.trim().split(/\s+/);
    return Math.round(parseFloat(parts[0]) * 100) / 100;
  }

  private parseMemoryUsage(output: string): number {
    const lines = output.split('\n');
    const memLine = lines.find(l => l.toLowerCase().startsWith('mem:'));
    if (!memLine) return 0;
    const parts = memLine.trim().split(/\s+/);
    const total = parseFloat(parts[1]);
    const used = parseFloat(parts[2]);
    return Math.round((used / total) * 100) / 100;
  }

  private parseDiskUsage(output: string): number {
    const lines = output.split('\n');
    if (lines.length < 2) return 0;
    const cols = lines[1].trim().split(/\s+/);
    return parseFloat(cols[4].replace('%', ''));
  }

  private parseOS(output: string): string | null {
    const match = output.split('\n').find(l => l.startsWith('PRETTY_NAME='));
    return match ? match.split('=')[1].replace(/"/g, '') : null;
  }
} 