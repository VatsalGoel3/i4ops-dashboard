import { NodeSSH } from 'node-ssh';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { env } from '../config/env';
import { Logger } from '../infrastructure/logger';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('LogSyncService');
const prisma = new PrismaClient();

export interface LogSyncResult {
  success: boolean;
  vmsProcessed: number;
  eventsFound: number;
  eventsSaved: number;
  duration: number;
  errors: string[];
}

export interface VMLogFiles {
  vmName: string;
  logs: {
    'auth.log': string;
    'kern.log': string;
    'syslog': string;
  };
  lastModified: {
    'auth.log': Date | null;
    'kern.log': Date | null;
    'syslog': Date | null;
  };
}

export class LogSyncService {
  private ssh: NodeSSH;
  private isConnected = false;
  private tempDir: string;
  private lastSyncTimes = new Map<string, Date>(); // Track last sync time per VM

  constructor() {
    this.ssh = new NodeSSH();
    this.tempDir = path.join(os.tmpdir(), 'i4ops-logs');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      logger.info(`Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Connect to u0 via SSH
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.ssh.connect({
        host: env.U0_IP,
        username: env.SSH_USERNAME,
        password: env.SSH_PASSWORD,
        readyTimeout: env.SSH_TIMEOUT,
        algorithms: {
          kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
          compress: ['none'],
        },
      });

      this.isConnected = true;
      logger.info(`Successfully connected to u0 (${env.U0_IP})`);
    } catch (error) {
      logger.error('Failed to connect to u0 via SSH:', error);
      throw error;
    }
  }

  /**
   * Disconnect from u0
   */
  disconnect(): void {
    if (this.isConnected) {
      this.ssh.dispose();
      this.isConnected = false;
      logger.info('Disconnected from u0');
    }
  }

  /**
   * Discover all VM directories on u0
   */
  async discoverVMDirectories(): Promise<string[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.ssh.execCommand(`ls -1 ${env.LOG_BASE_PATH}`);
      
      if (result.code !== 0) {
        logger.error(`Failed to list VM directories: ${result.stderr}`);
        return [];
      }

      const vmDirs = result.stdout
        .split('\n')
        .filter(dir => dir.trim())
        .filter(dir => dir.startsWith('u') && (dir.match(/^u\d+$/) || dir.includes('-vm')))
        .sort();

      logger.info(`Discovered ${vmDirs.length} VM directories: ${vmDirs.join(', ')}`);
      return vmDirs;
    } catch (error) {
      logger.error('Error discovering VM directories:', error);
      return [];
    }
  }

  /**
   * Check if log files have been modified since last sync
   */
  async getModifiedLogFiles(vmName: string): Promise<{ [key: string]: boolean }> {
    if (!this.isConnected) {
      await this.connect();
    }

    const logFiles = ['auth.log', 'kern.log', 'syslog'];
    const modifiedFiles: { [key: string]: boolean } = {};
    const lastSync = this.lastSyncTimes.get(vmName);

    for (const logFile of logFiles) {
      try {
        const filePath = `${env.LOG_BASE_PATH}/${vmName}/${logFile}`;
        const result = await this.ssh.execCommand(`stat -c %Y ${filePath} 2>/dev/null || echo 0`);
        
        if (result.code === 0) {
          const modTime = new Date(parseInt(result.stdout.trim()) * 1000);
          modifiedFiles[logFile] = !lastSync || modTime > lastSync;
        } else {
          modifiedFiles[logFile] = false;
        }
      } catch (error) {
        logger.warn(`Failed to check modification time for ${vmName}/${logFile}:`, error);
        modifiedFiles[logFile] = true; // Assume modified on error
      }
    }

    return modifiedFiles;
  }

  /**
   * Download log file from u0
   */
  async downloadLogFile(vmName: string, logFile: string): Promise<string | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const remotePath = `${env.LOG_BASE_PATH}/${vmName}/${logFile}`;
      const localPath = path.join(this.tempDir, `${vmName}_${logFile}`);

      // Get recent log entries (last 1000 lines) to avoid huge files
      const result = await this.ssh.execCommand(`tail -1000 ${remotePath} 2>/dev/null || echo ""`);
      
      if (result.code === 0 && result.stdout.trim()) {
        fs.writeFileSync(localPath, result.stdout);
        logger.debug(`Downloaded ${vmName}/${logFile} (${result.stdout.length} chars)`);
        return localPath;
      } else {
        logger.debug(`No content in ${vmName}/${logFile}`);
        return null;
      }
    } catch (error) {
      logger.warn(`Failed to download ${vmName}/${logFile}:`, error);
      return null;
    }
  }

  /**
   * Process downloaded logs using Python security processor
   */
  async processLogFile(localPath: string, vmName: string, logSource: string): Promise<number> {
    return new Promise((resolve) => {
      let eventsProcessed = 0;

      try {
        const pythonProcess = spawn('python3', [
          path.join(process.cwd(), 'security_processor.py'),
          localPath
        ], {
          env: { 
            ...process.env, 
            DATABASE_URL: env.DATABASE_URL,
            VM_NAME_OVERRIDE: vmName,
            LOG_SOURCE_OVERRIDE: logSource
          }
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            // Extract events count from output
            const eventsMatch = output.match(/events_saved":\s*(\d+)/);
            eventsProcessed = eventsMatch ? parseInt(eventsMatch[1]) : 0;
            
            logger.debug(`Processed ${vmName}/${logSource}: ${eventsProcessed} events`);
          } else {
            logger.error(`Python processing failed for ${vmName}/${logSource}: ${errorOutput}`);
          }
          
          resolve(eventsProcessed);
        });

        pythonProcess.on('error', (error) => {
          logger.error(`Failed to spawn Python process for ${vmName}/${logSource}:`, error);
          resolve(0);
        });
      } catch (error) {
        logger.error(`Error processing ${vmName}/${logSource}:`, error);
        resolve(0);
      }
    });
  }

  /**
   * Sync logs for a specific VM
   */
  async syncVMLogs(vmName: string): Promise<{ eventsFound: number; errors: string[] }> {
    const result = { eventsFound: 0, errors: [] };

    try {
      // Check which files have been modified
      const modifiedFiles = await this.getModifiedLogFiles(vmName);
      const logFiles = ['auth.log', 'kern.log', 'syslog'];

      for (const logFile of logFiles) {
        if (modifiedFiles[logFile]) {
          logger.debug(`Syncing ${vmName}/${logFile} (modified)`);
          
          const localPath = await this.downloadLogFile(vmName, logFile);
          if (localPath) {
            const events = await this.processLogFile(localPath, vmName, logFile);
            result.eventsFound += events;
            
            // Clean up temp file
            try {
              fs.unlinkSync(localPath);
            } catch (cleanupError) {
              logger.warn(`Failed to cleanup temp file ${localPath}:`, cleanupError);
            }
          }
        } else {
          logger.debug(`Skipping ${vmName}/${logFile} (not modified)`);
        }
      }

      // Update last sync time
      this.lastSyncTimes.set(vmName, new Date());
    } catch (error) {
      const errorMsg = `Failed to sync logs for ${vmName}: ${error.message}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Sync all VM logs
   */
  async syncAllVMLogs(): Promise<LogSyncResult> {
    const startTime = Date.now();
    const result: LogSyncResult = {
      success: false,
      vmsProcessed: 0,
      eventsFound: 0,
      eventsSaved: 0,
      duration: 0,
      errors: []
    };

    try {
      await this.connect();
      
      const vmDirectories = await this.discoverVMDirectories();
      
      if (vmDirectories.length === 0) {
        result.errors.push('No VM directories found');
        return result;
      }

      logger.info(`Syncing logs for ${vmDirectories.length} VMs...`);

      // Get events count before sync
      const eventsBefore = await prisma.securityEvent.count();

      // Process each VM
      for (const vmName of vmDirectories) {
        logger.debug(`Processing VM: ${vmName}`);
        
        const vmResult = await this.syncVMLogs(vmName);
        result.vmsProcessed++;
        result.eventsFound += vmResult.eventsFound;
        result.errors.push(...vmResult.errors);
      }

      // Get events count after sync
      const eventsAfter = await prisma.securityEvent.count();
      result.eventsSaved = eventsAfter - eventsBefore;

      result.success = result.errors.length === 0;
      logger.info(`Log sync completed: ${result.vmsProcessed} VMs, ${result.eventsFound} events found, ${result.eventsSaved} saved`);

    } catch (error) {
      const errorMsg = `Log sync failed: ${error.message}`;
      logger.error(errorMsg);
      result.errors.push(errorMsg);
    } finally {
      this.disconnect();
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Clean up old temp files
   */
  cleanupTempFiles(maxAge: number = 3600000): void { // 1 hour default
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned up old temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp files:', error);
    }
  }
} 