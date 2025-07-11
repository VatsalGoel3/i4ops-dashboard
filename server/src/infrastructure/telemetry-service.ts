import { NodeSSH } from 'node-ssh';
import { z } from 'zod';
import { Logger } from './logger';
import { RetryService } from './retry-service';

const TelemetrySchema = z.object({
  hostname: z.string(),
  vmname: z.string(),
  machineId: z.string(),
  ip: z.string().ip(),
  os: z.string(),
  cpu: z.object({
    usage_percent: z.number(),
    count: z.number().optional(),
    frequency_mhz: z.number().optional()
  }),
  memory: z.object({
    usage_percent: z.number(),
    total_gb: z.number().optional(),
    available_gb: z.number().optional(),
    used_gb: z.number().optional()
  }),
  disk: z.object({
    usage_percent: z.number(),
    total_gb: z.number().optional(),
    free_gb: z.number().optional(),
    used_gb: z.number().optional()
  }),
  system: z.object({
    uptime_seconds: z.number(),
    boot_time: z.string().optional(),
    load_average: z.array(z.number()).optional(),
    process_count: z.number().optional()
  }),
  timestamp: z.number()
});

// Derived type for easier consumption by other services
export type TelemetryData = {
  hostname: string;
  vmname: string;
  machineId: string;
  ip: string;
  os: string;
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
  timestamp: number;
};

type RawTelemetryData = z.infer<typeof TelemetrySchema>;

export class TelemetryService {
  private ssh: NodeSSH;
  private logger: Logger;
  private retry: RetryService;
  private isConnected = false;

  constructor() {
    this.ssh = new NodeSSH();
    this.logger = new Logger('TelemetryService');
    this.retry = new RetryService();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Use password auth for now (like your current system)
      await this.ssh.connect({
        host: process.env.U0_IP || '100.76.195.14',
        username: process.env.SSH_USER || 'i4ops',
        password: process.env.SSH_PASSWORD, // Use password instead of key
        readyTimeout: 10000,
      });
      this.isConnected = true;
      this.logger.info('SSH connection established');
    } catch (error) {
      this.logger.error('Failed to connect to u0', error);
      throw error;
    }
  }

  async getAllTelemetryData(): Promise<TelemetryData[]> {
    await this.connect();
    
    return this.retry.execute(async () => {
      // Use simpler command that doesn't require jq
      const { stdout } = await this.ssh.execCommand('ls /mnt/vm-telemetry-json/*.json 2>/dev/null || echo "no files"');
      
      if (stdout === "no files" || !stdout) {
        this.logger.warn('No telemetry files found');
        return [];
      }

      const files = stdout.split('\n').filter(f => f.endsWith('.json'));
      const validData: TelemetryData[] = [];
      const staleThresholdMs = 10 * 60 * 1000; // 10 minutes threshold for stale data

      for (const file of files) {
        try {
          // Get file modification time (stat command)
          const { stdout: statOutput } = await this.ssh.execCommand(`stat -c %Y "${file}"`);
          const fileModTimeSeconds = parseInt(statOutput.trim());
          const fileModTimeMs = fileModTimeSeconds * 1000;
          const now = Date.now();
          
          // Check if file is too old based on modification time
          if (now - fileModTimeMs > staleThresholdMs) {
            this.logger.info(`Skipping stale file ${file} (modified ${Math.round((now - fileModTimeMs) / 60000)} minutes ago)`);
            continue;
          }

          const { stdout: content } = await this.ssh.execCommand(`cat "${file}"`);
          const item = JSON.parse(content);
          
          const result = TelemetrySchema.safeParse(item);
          if (result.success) {
            // Also check the timestamp within the JSON data
            // Convert timestamp from seconds to milliseconds
            const jsonTimestampMs = result.data.timestamp * 1000;
            if (now - jsonTimestampMs > staleThresholdMs) {
              this.logger.info(`Skipping file ${file} with stale JSON timestamp (${Math.round((now - jsonTimestampMs) / 60000)} minutes old)`);
              continue;
            }

            // Transform nested structure to flat structure
            const transformedData: TelemetryData = {
              hostname: result.data.hostname,
              vmname: result.data.vmname,
              machineId: result.data.machineId,
              ip: result.data.ip,
              os: result.data.os,
              cpu: result.data.cpu.usage_percent,
              ram: result.data.memory.usage_percent,
              disk: result.data.disk.usage_percent,
              uptime: result.data.system.uptime_seconds,
              timestamp: result.data.timestamp
            };
            validData.push(transformedData);
          } else {
            this.logger.warn('Invalid telemetry data', { file, errors: result.error.errors });
          }
        } catch (error) {
          this.logger.warn(`Failed to read file ${file}`, error);
        }
      }

      this.logger.info(`Processed ${files.length} files, ${validData.length} valid, ${files.length - validData.length} stale/invalid`);
      return validData;
    }, 3);
  }

  // New method for VM discovery - more lenient with stale data
  async discoverAllVMs(): Promise<TelemetryData[]> {
    await this.connect();
    
    return this.retry.execute(async () => {
      const { stdout } = await this.ssh.execCommand('ls /mnt/vm-telemetry-json/*.json 2>/dev/null || echo "no files"');
      
      if (stdout === "no files" || !stdout) {
        this.logger.warn('No telemetry files found for VM discovery');
        return [];
      }

      const files = stdout.split('\n').filter(f => f.endsWith('.json'));
      const validData: TelemetryData[] = [];
      const discoveryThresholdMs = 24 * 60 * 60 * 1000; // 24 hours - much more lenient for discovery

      this.logger.info(`Discovering VMs from ${files.length} telemetry files (24h grace period)`);

      for (const file of files) {
        try {
          // More lenient file age check for discovery
          const { stdout: statOutput } = await this.ssh.execCommand(`stat -c %Y "${file}"`);
          const fileModTimeSeconds = parseInt(statOutput.trim());
          const fileModTimeMs = fileModTimeSeconds * 1000;
          const now = Date.now();
          
          // Allow files up to 24 hours old for VM discovery
          if (now - fileModTimeMs > discoveryThresholdMs) {
            this.logger.debug(`Skipping very old file ${file} (${Math.round((now - fileModTimeMs) / (60000 * 60))} hours old)`);
            continue;
          }

          const { stdout: content } = await this.ssh.execCommand(`cat "${file}"`);
          const item = JSON.parse(content);
          
          const result = TelemetrySchema.safeParse(item);
          if (result.success) {
            // For discovery, use the data even if timestamp is old
            const transformedData: TelemetryData = {
              hostname: result.data.hostname,
              vmname: result.data.vmname,
              machineId: result.data.machineId,
              ip: result.data.ip,
              os: result.data.os,
              cpu: result.data.cpu.usage_percent,
              ram: result.data.memory.usage_percent,
              disk: result.data.disk.usage_percent,
              uptime: result.data.system.uptime_seconds,
              timestamp: result.data.timestamp
            };
            validData.push(transformedData);
          } else {
            this.logger.warn('Invalid telemetry data during discovery', { file, errors: result.error.errors });
          }
        } catch (error) {
          this.logger.warn(`Failed to read file ${file} during discovery`, error);
        }
      }

      this.logger.info(`VM Discovery: found ${validData.length} VMs from ${files.length} files`);
      return validData;
    }, 3);
  }

  disconnect(): void {
    this.ssh.dispose();
    this.isConnected = false;
  }
} 