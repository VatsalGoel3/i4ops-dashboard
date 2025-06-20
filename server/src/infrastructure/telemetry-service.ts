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
  cpu: z.number(),
  ram: z.number(),
  disk: z.number(),
  uptime: z.number(),
  timestamp: z.number()
});

export type TelemetryData = z.infer<typeof TelemetrySchema>;

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

      for (const file of files) {
        try {
          const { stdout: content } = await this.ssh.execCommand(`cat "${file}"`);
          const item = JSON.parse(content);
          
          const result = TelemetrySchema.safeParse(item);
          if (result.success) {
            validData.push(result.data);
          } else {
            this.logger.warn('Invalid telemetry data', { file, errors: result.error.errors });
          }
        } catch (error) {
          this.logger.warn(`Failed to read file ${file}`, error);
        }
      }

      return validData;
    }, 3);
  }

  disconnect(): void {
    this.ssh.dispose();
    this.isConnected = false;
  }
} 