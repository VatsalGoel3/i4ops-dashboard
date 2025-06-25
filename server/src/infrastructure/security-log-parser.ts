import fs from 'fs';
import path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
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
  private watcher?: FSWatcher;
  private logBaseDir: string;
  private eventQueue: SecurityEventData[] = [];
  private processingQueue = false;

  // Log file patterns
  private static readonly PATTERNS = {
    // Data exfiltration pattern: kernel: egress (478) pid 38968 read foo write foo uid 1002 gid 1004
    egress: /kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+(\S+)\s+write\s+(\S+)\s+uid\s+(\d+)\s+gid\s+(\d+)/i,
    
    // SSH brute force pattern: sshd[1234]: Failed password for user from 192.168.1.100
    brute_force: /sshd\[\d+\]:\s*Failed\s+password\s+for\s+(\w+)\s+from\s+([\d.]+)/i,
    
    // Sudo privilege escalation: sudo: user : TTY=pts/0 ; PWD=/home ; USER=root ; COMMAND=/bin/bash
    sudo: /sudo:\s*(\w+)\s*:.*USER=(\w+)\s*;\s*COMMAND=(.+)/i,
    
    // Out of memory killer: kernel: Out of memory: Kill process 1234
    oom_kill: /kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)/i
  };

  // VM name cache for performance
  private vmCache = new Map<string, number>();

  constructor(logBaseDir: string = '/mnt/vm-security') {
    this.logger = new Logger('SecurityLogParser');
    this.prisma = new PrismaClient();
    this.logBaseDir = logBaseDir;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Security log parser is already running');
      return;
    }

    try {
      // Verify log directory exists
      if (!fs.existsSync(this.logBaseDir)) {
        this.logger.warn(`Security log directory does not exist: ${this.logBaseDir}`);
        // Don't throw error - might be development environment
        return;
      }

      // Load VM cache
      await this.loadVMCache();

      // Setup file watcher
      this.watcher = chokidar.watch(`${this.logBaseDir}/*/*.log`, {
        ignored: /[\/\\]\./,
        persistent: true,
        usePolling: true,
        interval: 1000, // Check every second
        binaryInterval: 2000
      });

      this.watcher.on('change', (filePath: string) => {
        this.handleFileChange(filePath);
      });

      this.watcher.on('add', (filePath: string) => {
        this.handleFileChange(filePath);
      });

      this.watcher.on('error', (error: unknown) => {
        this.logger.error('File watcher error', error);
      });

      this.isRunning = true;
      this.logger.info(`Security log parser started, watching: ${this.logBaseDir}`);

      // Process any existing logs
      await this.processExistingLogs();

    } catch (error) {
      this.logger.error('Failed to start security log parser', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }

    // Process any remaining events in queue
    if (this.eventQueue.length > 0) {
      await this.processEventQueue();
    }

    await this.prisma.$disconnect();
    this.logger.info('Security log parser stopped');
  }

  private async loadVMCache(): Promise<void> {
    try {
      const vms = await this.prisma.vM.findMany({
        select: { id: true, machineId: true }
      });

      this.vmCache.clear();
      for (const vm of vms) {
        this.vmCache.set(vm.machineId, vm.id);
      }

      this.logger.info(`Loaded ${vms.length} VMs into cache`);
    } catch (error) {
      this.logger.error('Failed to load VM cache', error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Extract VM name and log source from file path
      // Expected: /mnt/vm-security/u2-vm30000/auth.log
      const parts = filePath.split('/');
      const vmName = parts[parts.length - 2]; // u2-vm30000
      const source = parts[parts.length - 1]; // auth.log

      if (!vmName || !source) {
        this.logger.warn(`Invalid file path format: ${filePath}`);
        return;
      }

      // Read only new lines (this is simplified - in production, you'd track file positions)
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Process last 10 lines to catch new events
      const recentLines = lines.slice(-10);
      
      for (const line of recentLines) {
        const parseResult = await this.parseLogLine(line, vmName, source);
        if (parseResult?.parsedEvent) {
          this.eventQueue.push(parseResult.parsedEvent);
        }
      }

      // Process queue if not already processing
      if (!this.processingQueue && this.eventQueue.length > 0) {
        await this.processEventQueue();
      }

    } catch (error) {
      this.logger.error(`Error processing file change: ${filePath}`, error);
    }
  }

  private async parseLogLine(line: string, vmName: string, source: string): Promise<LogParseResult | null> {
    if (!line.trim()) return null;

    // Extract timestamp (assuming syslog format)
    const timestampMatch = line.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();
    
    // Set current year if not present
    if (timestamp.getFullYear() === 1900) {
      timestamp.setFullYear(new Date().getFullYear());
    }

    const result: LogParseResult = {
      timestamp,
      vmName,
      source,
      originalMessage: line
    };

    // Try to parse security events
    const securityEvent = await this.parseSecurityEvent(line, vmName, source, timestamp);
    if (securityEvent) {
      result.parsedEvent = securityEvent;
    }

    return result;
  }

  private async parseSecurityEvent(
    line: string, 
    vmName: string, 
    source: string, 
    timestamp: Date
  ): Promise<SecurityEventData | null> {
    // Get VM ID
    const vmId = this.vmCache.get(vmName);
    if (!vmId) {
      // Try to refresh cache and retry
      await this.loadVMCache();
      const refreshedVmId = this.vmCache.get(vmName);
      if (!refreshedVmId) {
        this.logger.warn(`Unknown VM: ${vmName}`);
        return null;
      }
    }

    const finalVmId = vmId || this.vmCache.get(vmName)!;

    // Check against security patterns
    for (const [ruleKey, pattern] of Object.entries(SecurityLogParser.PATTERNS)) {
      const match = line.match(pattern);
      if (match) {
        const rule = ruleKey as SecurityRule;
        const severity = this.getSeverityForRule(rule);
        
        return {
          vmId: finalVmId,
          timestamp,
          source,
          message: line.trim(),
          severity,
          rule
        };
      }
    }

    return null;
  }

  private getSeverityForRule(rule: SecurityRule): SecuritySeverity {
    switch (rule) {
      case 'egress':
        return SecuritySeverity.critical;
      case 'brute_force':
        return SecuritySeverity.high;
      case 'sudo':
        return SecuritySeverity.medium;
      case 'oom_kill':
        return SecuritySeverity.medium;
      default:
        return SecuritySeverity.low;
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return;

    this.processingQueue = true;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Batch insert events
      if (events.length > 0) {
        await this.prisma.securityEvent.createMany({
          data: events,
          skipDuplicates: true
        });

        this.logger.info(`Processed ${events.length} security events`);

        // Broadcast critical/high severity events via SSE
        for (const event of events) {
          if (event.severity === SecuritySeverity.critical || event.severity === SecuritySeverity.high) {
            // Get full event data for broadcast
            const fullEvent = await this.prisma.securityEvent.findFirst({
              where: {
                vmId: event.vmId,
                timestamp: event.timestamp,
                message: event.message
              },
              include: {
                vm: {
                  select: {
                    name: true,
                    machineId: true,
                    host: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            });

            if (fullEvent) {
              broadcast('security-event', fullEvent);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process security event queue', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processExistingLogs(): Promise<void> {
    try {
      if (!fs.existsSync(this.logBaseDir)) return;

      const vmDirs = fs.readdirSync(this.logBaseDir);
      
      for (const vmDir of vmDirs) {
        const vmPath = path.join(this.logBaseDir, vmDir);
        if (!fs.statSync(vmPath).isDirectory()) continue;

        const logFiles = fs.readdirSync(vmPath).filter(f => f.endsWith('.log'));
        
        for (const logFile of logFiles) {
          const filePath = path.join(vmPath, logFile);
          // Process only last 50 lines to avoid overwhelming on startup
          await this.processRecentLines(filePath, vmDir, logFile, 50);
        }
      }

    } catch (error) {
      this.logger.error('Failed to process existing logs', error);
    }
  }

  private async processRecentLines(filePath: string, vmName: string, source: string, lineCount: number): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-lineCount);

      for (const line of recentLines) {
        const parseResult = await this.parseLogLine(line, vmName, source);
        if (parseResult?.parsedEvent) {
          this.eventQueue.push(parseResult.parsedEvent);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process recent lines from ${filePath}`, error);
    }
  }
} 

