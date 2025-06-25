import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { PrismaClient, SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from './logger';
import { broadcast } from '../events';

export interface SecurityEventData {
  vmId: number;
  timestamp: Date;
  source: string;
  message: string;
  severity: SecuritySeverity;
  rule: SecurityRule;
}

interface LogParseResult {
  timestamp: Date;
  vmName: string;
  source: string;
  originalMessage: string;
  parsedEvent?: SecurityEventData;
}

export class SecurityLogParser {
  private logger: Logger;
  private prisma: PrismaClient;
  private isRunning = false;
  private watcher?: chokidar.FSWatcher;
  private logBaseDir: string;
  private eventQueue: SecurityEventData[] = [];
  private flushInterval?: NodeJS.Timeout;

  // Regex patterns for different security events
  private patterns = {
    // Egress pattern: kernel: egress (XXX) pid XXXX read XXX write XXX uid XXXX gid XXXX
    egress: /kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+(\S+)\s+write\s+(\S+)\s+uid\s+(\d+)\s+gid\s+(\d+)/i,
    
    // SSH brute force: sshd[XXXX]: Failed password for user from IP
    sshFailed: /sshd\[\d+\]:\s*Failed\s+password\s+for\s+(\w+)\s+from\s+([\d.]+)/i,
    
    // Sudo usage: sudo: user : TTY=pts/X ; PWD=/path ; USER=root ; COMMAND=/bin/xxx
    sudo: /sudo:\s*(\w+)\s*:.*USER=(\w+)\s*;\s*COMMAND=(.+)/i,
    
    // Out of memory: kernel: Out of memory: Kill process XXXX
    oom: /kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)/i
  };

  constructor(logBaseDir: string = '/mnt/vm-security') {
    this.logger = new Logger('SecurityLogParser');
    this.prisma = new PrismaClient();
    this.logBaseDir = logBaseDir;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Security log parser already running');
      return;
    }

    this.logger.info('Starting security log parser', { logBaseDir: this.logBaseDir });
    
    try {
      // Verify log directory exists
      if (!fs.existsSync(this.logBaseDir)) {
        throw new Error(`Security log directory does not exist: ${this.logBaseDir}`);
      }

      // Start file watcher
      this.startFileWatcher();
      
      // Start flush interval for batched writes
      this.startFlushInterval();
      
      this.isRunning = true;
      this.logger.info('Security log parser started successfully');
    } catch (error) {
      this.logger.error('Failed to start security log parser', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.logger.info('Stopping security log parser');
    
    if (this.watcher) {
      await this.watcher.close();
    }
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush any remaining events
    await this.flushEvents();
    
    await this.prisma.$disconnect();
    this.isRunning = false;
    
    this.logger.info('Security log parser stopped');
  }

  private startFileWatcher(): void {
    const watchPattern = path.join(this.logBaseDir, '*/*.log');
    
    this.watcher = chokidar.watch(watchPattern, {
      persistent: true,
      usePolling: true, // Important for NFS/network mounts
      interval: 1000,
      ignored: /(^|[\/\\])\../, // ignore dotfiles
    });

    this.watcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('add', (filePath) => {
      this.logger.info(`New security log file detected: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.watcher.on('error', (error) => {
      this.logger.error('File watcher error', error);
    });

    this.logger.info(`Watching security logs: ${watchPattern}`);
  }

  private startFlushInterval(): void {
    // Flush events every 2 seconds for near real-time processing
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 2000);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const vmName = this.extractVMNameFromPath(filePath);
      const source = path.basename(filePath);
      
      if (!vmName) {
        this.logger.warn(`Could not extract VM name from path: ${filePath}`);
        return;
      }

      // Read new lines from the file
      const newLines = await this.readNewLines(filePath);
      
      for (const line of newLines) {
        const parsed = this.parseLogLine(line, vmName, source);
        if (parsed?.parsedEvent) {
          this.eventQueue.push(parsed.parsedEvent);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing file change: ${filePath}`, error);
    }
  }

  private extractVMNameFromPath(filePath: string): string | null {
    // Extract VM name from path like /mnt/vm-security/u2-vm30000/auth.log
    const match = filePath.match(/\/([^\/]+)\/[^\/]+\.log$/);
    return match ? match[1] : null;
  }

  private async readNewLines(filePath: string): Promise<string[]> {
    // For now, read the last few lines. In production, we'd track file positions
    // to only read new content. This is a simplified version.
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Return last 10 lines to catch any recent events
      return lines.slice(-10);
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error);
      return [];
    }
  }

  private parseLogLine(line: string, vmName: string, source: string): LogParseResult | null {
    try {
      // Parse the standardized log format: TIMESTAMP | VM_NAME | LOG_SOURCE | ORIGINAL_LOG_ENTRY
      const parts = line.split(' | ');
      if (parts.length < 4) {
        return null; // Not in expected format
      }

      const timestamp = new Date(parts[0]);
      const originalMessage = parts[3];

      const result: LogParseResult = {
        timestamp,
        vmName,
        source,
        originalMessage
      };

      // Try to parse security events from the original message
      const securityEvent = this.classifySecurityEvent(originalMessage, vmName, timestamp, source);
      if (securityEvent) {
        result.parsedEvent = securityEvent;
      }

      return result;
    } catch (error) {
      this.logger.warn(`Failed to parse log line: ${line}`, error);
      return null;
    }
  }

  private async classifySecurityEvent(
    message: string, 
    vmName: string, 
    timestamp: Date, 
    source: string
  ): Promise<SecurityEventData | null> {
    try {
      // Get VM ID from database
      const vm = await this.getVMByName(vmName);
      if (!vm) {
        this.logger.warn(`VM not found in database: ${vmName}`);
        return null;
      }

      // Check for egress (data exfiltration) events
      if (this.patterns.egress.test(message)) {
        const match = message.match(this.patterns.egress);
        if (match) {
          return {
            vmId: vm.id,
            timestamp,
            source,
            message: `EXFILTRATION BLOCKED: Process ${match[1]} attempted to exfiltrate file '${match[2]}' (renamed to '${match[3]}') - uid:${match[4]} gid:${match[5]}`,
            severity: SecuritySeverity.critical,
            rule: SecurityRule.egress
          };
        }
      }

      // Check for SSH brute force
      if (this.patterns.sshFailed.test(message)) {
        const match = message.match(this.patterns.sshFailed);
        if (match) {
          return {
            vmId: vm.id,
            timestamp,
            source,
            message: `SSH login failure for user '${match[1]}' from ${match[2]}`,
            severity: SecuritySeverity.high,
            rule: SecurityRule.brute_force
          };
        }
      }

      // Check for sudo usage
      if (this.patterns.sudo.test(message)) {
        const match = message.match(this.patterns.sudo);
        if (match) {
          return {
            vmId: vm.id,
            timestamp,
            source,
            message: `Sudo access: User '${match[1]}' escalated to '${match[2]}' - Command: ${match[3]}`,
            severity: SecuritySeverity.medium,
            rule: SecurityRule.sudo
          };
        }
      }

      // Check for OOM kills
      if (this.patterns.oom.test(message)) {
        const match = message.match(this.patterns.oom);
        if (match) {
          return {
            vmId: vm.id,
            timestamp,
            source,
            message: `Out of Memory: Killed process ${match[1]} due to memory exhaustion`,
            severity: SecuritySeverity.medium,
            rule: SecurityRule.oom_kill
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error classifying security event', error);
      return null;
    }
  }

  private async getVMByName(vmName: string): Promise<{ id: number } | null> {
    try {
      // Try to find VM by machine ID (which includes VM name)
      const vm = await this.prisma.vM.findFirst({
        where: {
          OR: [
            { machineId: vmName },
            { machineId: { contains: vmName } }
          ]
        },
        select: { id: true }
      });
      
      return vm;
    } catch (error) {
      this.logger.error(`Error finding VM by name: ${vmName}`, error);
      return null;
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Batch insert events
      const createdEvents = await this.prisma.securityEvent.createMany({
        data: eventsToFlush,
        skipDuplicates: false
      });

      this.logger.info(`Flushed ${eventsToFlush.length} security events to database`);

      // Broadcast critical/high severity events immediately
      const criticalEvents = eventsToFlush.filter(event => 
        event.severity === SecuritySeverity.critical || event.severity === SecuritySeverity.high
      );

      for (const event of criticalEvents) {
        broadcast('security-event', {
          ...event,
          id: Date.now(), // Temporary ID for real-time updates
          createdAt: new Date()
        });
      }

      if (criticalEvents.length > 0) {
        this.logger.info(`Broadcasted ${criticalEvents.length} critical/high severity events`);
      }

    } catch (error) {
      this.logger.error('Failed to flush security events', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }
} 