import { NodeSSH } from 'node-ssh';
import { z } from 'zod';
import { Logger } from './logger';
import { RetryService } from './retry-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { watch } from 'chokidar';
import { EventEmitter } from 'events';

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

export class TelemetryService extends EventEmitter {
  private ssh: NodeSSH;
  private logger: Logger;
  private retry: RetryService;
  private isConnected = false;
  private useLocalFS = false;
  private telemetryDir = '/mnt/vm-telemetry-json';
  private watcher?: any;

  constructor() {
    super();
    this.ssh = new NodeSSH();
    this.logger = new Logger('TelemetryService');
    this.retry = new RetryService();
    this.checkLocalFS();
  }

  private async checkLocalFS(): Promise<void> {
    try {
      await fs.access(this.telemetryDir);
      this.useLocalFS = true;
      this.logger.info(`Local telemetry directory found: ${this.telemetryDir} - using filesystem access`);
      this.setupFileWatcher();
    } catch {
      this.useLocalFS = false;
      this.logger.info('Local telemetry directory not found - using SSH access');
    }
  }

  private setupFileWatcher(): void {
    if (!this.useLocalFS) return;

    try {
      this.watcher = watch(`${this.telemetryDir}/*.json`, {
        ignoreInitial: true,
        usePolling: false,
        alwaysStat: true
      });

      this.watcher.on('add', (filePath: string) => {
        this.logger.debug(`New telemetry file detected: ${filePath}`);
        this.emit('fileChanged', filePath);
      });

      this.watcher.on('change', (filePath: string) => {
        this.logger.debug(`Telemetry file updated: ${filePath}`);
        this.emit('fileChanged', filePath);
      });

      this.logger.info('File watcher initialized for real-time telemetry updates');
    } catch (error) {
      this.logger.warn('Failed to setup file watcher', error);
    }
  }

  async connect(): Promise<void> {
    if (this.useLocalFS || this.isConnected) return;

    try {
      // Use password auth for SSH fallback
      await this.ssh.connect({
        host: process.env.U0_IP || '100.76.195.14',
        username: process.env.SSH_USER || 'i4ops',
        password: process.env.SSH_PASSWORD,
        readyTimeout: 10000,
      });
      this.isConnected = true;
      this.logger.info('SSH connection established');
    } catch (error) {
      this.logger.error('Failed to connect to u0', error);
      throw error;
    }
  }

  private async getFilesLocal(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.telemetryDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(this.telemetryDir, file));
    } catch (error) {
      this.logger.warn('No local telemetry files found');
      return [];
    }
  }

  private async getFilesRemote(): Promise<string[]> {
    await this.connect();
    
    const { stdout } = await this.ssh.execCommand('ls /mnt/vm-telemetry-json/*.json 2>/dev/null || echo "no files"');
    
    if (stdout === "no files" || !stdout) {
      this.logger.warn('No remote telemetry files found');
      return [];
    }

    return stdout.split('\n').filter(f => f.endsWith('.json'));
  }

  private async getFileStatsLocal(filePath: string): Promise<{ modTime: number }> {
    const stats = await fs.stat(filePath);
    return { modTime: stats.mtime.getTime() };
  }

  private async getFileStatsRemote(filePath: string): Promise<{ modTime: number }> {
    const { stdout } = await this.ssh.execCommand(`stat -c %Y "${filePath}"`);
    const modTimeSeconds = parseInt(stdout.trim());
    return { modTime: modTimeSeconds * 1000 };
  }

  private async readFileLocal(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  private async readFileRemote(filePath: string): Promise<string> {
    const { stdout } = await this.ssh.execCommand(`cat "${filePath}"`);
    return stdout;
  }

  async getAllTelemetryData(): Promise<TelemetryData[]> {
    return this.retry.execute(async () => {
      const files = this.useLocalFS ? 
        await this.getFilesLocal() : 
        await this.getFilesRemote();

      if (files.length === 0) {
        return [];
      }

      const validData: TelemetryData[] = [];
      const staleThresholdMs = 5 * 60 * 1000; // Reduced to 5 minutes for faster detection
      const now = Date.now();

      for (const file of files) {
        try {
          // Get file modification time
          const stats = this.useLocalFS ?
            await this.getFileStatsLocal(file) :
            await this.getFileStatsRemote(file);

          // Check if file is too old based on modification time
          if (now - stats.modTime > staleThresholdMs) {
            this.logger.debug(`Skipping stale file ${file} (modified ${Math.round((now - stats.modTime) / 60000)} minutes ago)`);
            continue;
          }

          // Read file content
          const content = this.useLocalFS ?
            await this.readFileLocal(file) :
            await this.readFileRemote(file);

          const item = JSON.parse(content);
          
          const result = TelemetrySchema.safeParse(item);
          if (result.success) {
            // Also check the timestamp within the JSON data
            const jsonTimestampMs = result.data.timestamp * 1000;
            if (now - jsonTimestampMs > staleThresholdMs) {
              this.logger.debug(`Skipping file ${file} with stale JSON timestamp (${Math.round((now - jsonTimestampMs) / 60000)} minutes old)`);
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

      this.logger.info(`Processed ${files.length} files, ${validData.length} valid (${this.useLocalFS ? 'local' : 'remote'})`);
      return validData;
    }, 3);
  }

  // New method for VM discovery - more lenient with stale data
  async discoverAllVMs(): Promise<TelemetryData[]> {
    return this.retry.execute(async () => {
      const files = this.useLocalFS ? 
        await this.getFilesLocal() : 
        await this.getFilesRemote();

      if (files.length === 0) {
        this.logger.warn('No telemetry files found for VM discovery');
        return [];
      }

      const validData: TelemetryData[] = [];
      const discoveryThresholdMs = 24 * 60 * 60 * 1000; // 24 hours - lenient for discovery
      const now = Date.now();

      this.logger.info(`Discovering VMs from ${files.length} telemetry files (24h grace period)`);

      for (const file of files) {
        try {
          // More lenient file age check for discovery
          const stats = this.useLocalFS ?
            await this.getFileStatsLocal(file) :
            await this.getFileStatsRemote(file);

          // Allow files up to 24 hours old for VM discovery
          if (now - stats.modTime > discoveryThresholdMs) {
            this.logger.debug(`Skipping very old file ${file} (${Math.round((now - stats.modTime) / (60000 * 60))} hours old)`);
            continue;
          }

          const content = this.useLocalFS ?
            await this.readFileLocal(file) :
            await this.readFileRemote(file);

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
    if (this.watcher) {
      this.watcher.close();
      this.logger.info('File watcher closed');
    }
    if (this.isConnected) {
      this.ssh.dispose();
      this.isConnected = false;
    }
  }
} 