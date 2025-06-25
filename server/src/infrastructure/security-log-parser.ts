import fs from 'fs';
import path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { NodeSSH } from 'node-ssh';
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
  private ssh?: NodeSSH;
  private useSSH: boolean;

  // Log file patterns
  private static readonly PATTERNS = {
    // Data exfiltration pattern: kernel: [16077.878881] egress (521) pid 64338 read customers.csv write  uid 1002 gid 1004
    // Handle cases where write field might be empty
    egress: /kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+(\S+)\s+write\s+(\S*)\s+uid\s+(\d+)\s+gid\s+(\d+)/i,
    
    // SSH brute force pattern: sshd[1234]: Failed password for user from 192.168.1.100
    brute_force: /sshd\[\d+\]:\s*Failed\s+password\s+for\s+(\w+)\s+from\s+([\d.]+)/i,
    
    // Sudo privilege escalation patterns - handle various sudo log formats
    sudo: /sudo:\s*(?:(\w+)\s*:\s*.*|pam_unix\(sudo:session\):\s*session\s+(?:opened|closed)\s+for\s+user\s+(\w+))/i,
    
    // Out of memory killer: kernel: Out of memory: Kill process 1234
    oom_kill: /kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)/i
  };

  // VM name cache for performance
  private vmCache = new Map<string, number>();

  constructor(logBaseDir: string = '/mnt/vm-security', useSSH: boolean = false) {
    this.logger = new Logger('SecurityLogParser');
    this.prisma = new PrismaClient();
    this.logBaseDir = logBaseDir;
    this.useSSH = useSSH;
    
    if (useSSH) {
      this.ssh = new NodeSSH();
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Security log parser is already running');
      return;
    }

    try {
      // Connect via SSH if using remote access
      if (this.useSSH && this.ssh) {
        await this.connectSSH();
      }

      // Verify log directory exists
      const dirExists = await this.checkLogDirExists();
      if (!dirExists) {
        this.logger.warn(`Security log directory does not exist: ${this.logBaseDir}`);
        // Don't throw error - might be development environment
        return;
      }

      // Load VM cache
      await this.loadVMCache();

      // For SSH mode, we'll use polling instead of file watching
      if (this.useSSH) {
        this.logger.info('SSH mode: starting periodic log polling');
        this.startSSHPolling();
      } else {
        // Setup file watcher for local mode
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
      }

      this.isRunning = true;
      this.logger.info(`Security log parser started, watching: ${this.logBaseDir} (SSH: ${this.useSSH})`);

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

    // Disconnect SSH if connected
    if (this.ssh) {
      this.ssh.dispose();
    }

    await this.prisma.$disconnect();
    this.logger.info('Security log parser stopped');
  }

  private async loadVMCache(): Promise<void> {
    try {
      const vms = await this.prisma.vM.findMany({
        select: { id: true, machineId: true, name: true }
      });

      this.vmCache.clear();
      for (const vm of vms) {
        // Add multiple mappings for different VM name formats
        this.vmCache.set(vm.machineId, vm.id);
        this.vmCache.set(vm.name, vm.id);
        
        // Handle vm30000 format (without host prefix)
        const vmNumberMatch = vm.machineId.match(/vm(\d+)/);
        if (vmNumberMatch) {
          this.vmCache.set(`vm${vmNumberMatch[1]}`, vm.id);
        }
        
        // Handle u2-vm30000 format
        const hostVmMatch = vm.machineId.match(/^(u\d+)-vm(\d+)$/);
        if (hostVmMatch) {
          this.vmCache.set(`${hostVmMatch[1]}-vm${hostVmMatch[2]}`, vm.id);
          this.vmCache.set(`vm${hostVmMatch[2]}`, vm.id);
        }
      }

      this.logger.info(`Loaded ${vms.length} VMs into cache with ${this.vmCache.size} mappings`);
      
      // Log some cache entries for debugging
      const cacheEntries = Array.from(this.vmCache.entries()).slice(0, 5);
      this.logger.debug(`VM Cache sample: ${JSON.stringify(cacheEntries)}`);
      
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

    // Handle the custom log format: TIMESTAMP | VM_NAME | LOG_SOURCE | ORIGINAL_LOG_ENTRY
    const logParts = line.split(' | ');
    
    if (logParts.length >= 4) {
      // Parse custom format
      const timestampStr = logParts[0];
      const logVmName = logParts[1];
      const logSource = logParts[2];
      const originalMessage = logParts.slice(3).join(' | '); // Rejoin in case message contains pipes
      
      // Parse timestamp (format: 2025-06-25 20:46:27)
      const timestamp = new Date(timestampStr);
      
      const result: LogParseResult = {
        timestamp,
        vmName: logVmName, // Use VM name from log line
        source: logSource,
        originalMessage: line
      };

      // Try to parse security events from the original message part
      const securityEvent = await this.parseSecurityEvent(originalMessage, logVmName, logSource, timestamp);
      if (securityEvent) {
        result.parsedEvent = securityEvent;
      }

      return result;
    } else {
      // Fallback to original syslog parsing for compatibility
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
  }

  private async parseSecurityEvent(
    line: string, 
    vmName: string, 
    source: string, 
    timestamp: Date
  ): Promise<SecurityEventData | null> {
    // Get VM ID - try multiple name formats
    let vmId = this.vmCache.get(vmName);
    
    if (!vmId) {
      // Try different VM name variations
      const variations = [
        vmName,
        vmName.replace(/^u\d+-/, ''), // Remove host prefix (u2-vm30000 -> vm30000)
        vmName.match(/vm(\d+)$/)?.[0], // Extract just vm30000 part
      ].filter(Boolean);
      
      for (const variation of variations) {
        vmId = this.vmCache.get(variation!);
        if (vmId) break;
      }
    }
    
    if (!vmId) {
      // Try to refresh cache and retry
      await this.loadVMCache();
      vmId = this.vmCache.get(vmName);
      
      if (!vmId) {
        this.logger.warn(`Unknown VM: ${vmName}, tried variations: ${JSON.stringify([vmName, vmName.replace(/^u\d+-/, ''), vmName.match(/vm(\d+)$/)?.[0]].filter(Boolean))}`);
        return null;
      }
    }

    // Debug: Log what we're trying to parse
    this.logger.debug(`Parsing line from ${vmName}/${source}: ${line.substring(0, 100)}...`);

    // Check against security patterns
    for (const [ruleKey, pattern] of Object.entries(SecurityLogParser.PATTERNS)) {
      const match = line.match(pattern);
      if (match) {
        const rule = ruleKey as SecurityRule;
        const severity = this.getSeverityForRule(rule);
        
        this.logger.info(`Security event detected: ${rule} in ${vmName} (${source}) - Match: ${match[0].substring(0, 100)}...`);
        
        return {
          vmId,
          timestamp,
          source,
          message: line.trim(),
          severity,
          rule
        };
      } else {
        // Debug: Log failed pattern attempts for egress and sudo rules
        if (ruleKey === 'egress' && line.includes('egress')) {
          this.logger.debug(`Egress pattern failed for: ${line}`);
        }
        if (ruleKey === 'sudo' && line.includes('sudo')) {
          this.logger.debug(`Sudo pattern failed for: ${line}`);
        }
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
      const dirExists = await this.checkLogDirExists();
      if (!dirExists) return;

      const vmDirs = await this.getVMDirectories();
      
      for (const vmDir of vmDirs) {
        const logFiles = await this.getLogFiles(vmDir);
        
        for (const logFile of logFiles) {
          // Process only last 50 lines to avoid overwhelming on startup
          await this.processRecentLines(vmDir, logFile, 50);
        }
      }

    } catch (error) {
      this.logger.error('Failed to process existing logs', error);
    }
  }

  private async getVMDirectories(): Promise<string[]> {
    try {
      if (this.useSSH && this.ssh) {
        const { stdout } = await this.ssh.execCommand(`ls -d ${this.logBaseDir}/*/`);
        return stdout.split('\n')
          .filter(line => line.trim())
          .map(line => path.basename(line.replace('/', '')));
      } else {
        return fs.readdirSync(this.logBaseDir)
          .filter(item => fs.statSync(path.join(this.logBaseDir, item)).isDirectory());
      }
    } catch (error) {
      this.logger.error('Failed to get VM directories', error);
      return [];
    }
  }

  private async getLogFiles(vmDir: string): Promise<string[]> {
    try {
      if (this.useSSH && this.ssh) {
        const { stdout } = await this.ssh.execCommand(`ls ${this.logBaseDir}/${vmDir}/*.log 2>/dev/null || echo ""`);
        return stdout.split('\n')
          .filter(line => line.trim() && line.endsWith('.log'))
          .map(line => path.basename(line));
      } else {
        const vmPath = path.join(this.logBaseDir, vmDir);
        return fs.readdirSync(vmPath).filter(f => f.endsWith('.log'));
      }
    } catch (error) {
      this.logger.error(`Failed to get log files for ${vmDir}`, error);
      return [];
    }
  }

  private async processRecentLines(vmName: string, source: string, lineCount: number): Promise<void> {
    try {
      const content = await this.readLogFile(vmName, source);
      if (!content) return;

      const lines = content.split('\n').filter(line => line.trim());
      const recentLines = lines.slice(-lineCount);

      for (const line of recentLines) {
        const parseResult = await this.parseLogLine(line, vmName, source);
        if (parseResult?.parsedEvent) {
          this.eventQueue.push(parseResult.parsedEvent);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process recent lines from ${vmName}/${source}`, error);
    }
  }

  private async readLogFile(vmName: string, source: string): Promise<string | null> {
    try {
      if (this.useSSH && this.ssh) {
        const filePath = `${this.logBaseDir}/${vmName}/${source}`;
        const { stdout } = await this.ssh.execCommand(`cat "${filePath}"`);
        return stdout;
      } else {
        const filePath = path.join(this.logBaseDir, vmName, source);
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      this.logger.error(`Failed to read log file ${vmName}/${source}`, error);
      return null;
    }
  }

  async manualProcessLogs(): Promise<{ processed: number; events: number }> {
    let totalProcessed = 0;
    let totalEvents = 0;
    
    try {
      // Connect via SSH if needed
      if (this.useSSH && this.ssh) {
        await this.connectSSH();
      }

      const dirExists = await this.checkLogDirExists();
      if (!dirExists) {
        this.logger.warn(`Log directory does not exist: ${this.logBaseDir}`);
        return { processed: 0, events: 0 };
      }

      // Ensure VM cache is loaded
      await this.loadVMCache();

      const vmDirs = await this.getVMDirectories();
      this.logger.info(`Found ${vmDirs.length} VM directories`);
      
      for (const vmDir of vmDirs) {
        const logFiles = await this.getLogFiles(vmDir);
        this.logger.info(`Processing ${logFiles.length} log files for VM: ${vmDir}`);
        
        for (const logFile of logFiles) {
          const beforeCount = this.eventQueue.length;
          
          // Process last 50 lines
          await this.processRecentLines(vmDir, logFile, 50);
          
          const addedEvents = this.eventQueue.length - beforeCount;
          this.logger.info(`Processed ${vmDir}/${logFile}: added ${addedEvents} events`);
          totalProcessed++;
        }
      }

      // Process any queued events
      if (this.eventQueue.length > 0) {
        totalEvents = this.eventQueue.length;
        await this.processEventQueue();
      }

      this.logger.info(`Manual processing complete: ${totalProcessed} files, ${totalEvents} events`);
      return { processed: totalProcessed, events: totalEvents };
      
    } catch (error) {
      this.logger.error('Failed to manually process logs', error);
      throw error;
    }
  }

  private async connectSSH(): Promise<void> {
    if (!this.ssh) return;
    
    try {
      await this.ssh.connect({
        host: process.env.U0_IP || '100.76.195.14',
        username: process.env.SSH_USER || 'i4ops',
        password: process.env.SSH_PASSWORD,
        readyTimeout: 10000,
      });
      this.logger.info('SSH connection established for log parsing');
    } catch (error) {
      this.logger.error('Failed to connect SSH for log parsing', error);
      throw error;
    }
  }

  private async checkLogDirExists(): Promise<boolean> {
    try {
      if (this.useSSH && this.ssh) {
        const { stdout } = await this.ssh.execCommand(`ls -d "${this.logBaseDir}" 2>/dev/null || echo "not found"`);
        return stdout.trim() !== 'not found';
      } else {
        return fs.existsSync(this.logBaseDir);
      }
    } catch (error) {
      this.logger.error('Failed to check log directory', error);
      return false;
    }
  }

  private startSSHPolling(): void {
    // Poll every 30 seconds for new log entries
    setInterval(async () => {
      if (this.isRunning) {
        await this.processExistingLogs();
      }
    }, 30000);
    
    // Initial processing
    setTimeout(() => {
      this.processExistingLogs();
    }, 2000);
  }
} 

