import fs from 'fs';
import path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { NodeSSH } from 'node-ssh';
import { PrismaClient, SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from './logger';
import { broadcast } from '../events';
import { RetryService } from './retry-service';
import { SecurityEventStream } from './security-event-stream';

export interface SecurityEventData {
  vmId: number;
  timestamp: Date;
  source: string;
  message: string;
  severity: SecuritySeverity;
  rule: SecurityRule;
}

interface LogPosition {
  filePath: string;
  position: number;
  lastModified: number;
  inode?: number;
}

interface ParsedLogEntry {
  timestamp: Date;
  vmName: string;
  source: string;
  originalMessage: string;
  severity?: SecuritySeverity;
  rule?: SecurityRule;
}

export class SecurityLogParser {
  private logger: Logger;
  private prisma: PrismaClient;
  private retry: RetryService;
  private stream: SecurityEventStream;
  private isRunning = false;
  private watcher?: FSWatcher;
  private logBaseDir: string;
  private ssh?: NodeSSH;
  private useSSH: boolean;

  // Log position tracking for efficiency
  private logPositions = new Map<string, LogPosition>();
  private positionFile: string;

  // Event processing
  private eventQueue: SecurityEventData[] = [];
  private processingQueue = false;
  private readonly BATCH_SIZE = 50;
  private readonly QUEUE_FLUSH_INTERVAL = 5000; // 5 seconds

  // VM cache for performance
  private vmCache = new Map<string, number>();
  private vmCacheExpiry = 0;
  private readonly VM_CACHE_TTL = 300000; // 5 minutes

  // Enhanced security patterns with better matching
  private static readonly PATTERNS = {
    // SSH brute force: More comprehensive patterns
    brute_force: [
      /sshd\[\d+\]:\s*Failed\s+password\s+for\s+(?:invalid\s+user\s+)?(\w+)\s+from\s+([\d.]+)/i,
      /sshd\[\d+\]:\s*Invalid\s+user\s+(\w+)\s+from\s+([\d.]+)/i,
      /sshd\[\d+\]:\s*Connection\s+closed\s+by\s+([\d.]+)\s+port\s+\d+\s+\[preauth\]/i
    ],
    
    // Data exfiltration: Better egress detection
    egress: [
      /kernel:.*egress\s*\(\d+\)\s*pid\s+(\d+)\s+read\s+([^\s]+|\([^)]+\))\s+write\s+([^\s]*)\s+uid\s+(\d+)\s+gid\s+(\d+)/i,
      /kernel:.*EGRESS.*pid[:\s]+(\d+).*file[:\s]+([^\s]+)/i
    ],
    
    // Privilege escalation: Enhanced sudo detection
    sudo: [
      /sudo:\s*(\w+)\s*:\s*command\s+not\s+allowed/i,
      /sudo:\s*(\w+)\s*:\s*TTY=.*PWD=.*USER=([^\s]+)\s+COMMAND=(.+)/i,
      /sudo:\s*pam_unix\(sudo:auth\):\s*authentication\s+failure.*user=(\w+)/i
    ],
    
    // Out of memory killer
    oom_kill: [
      /kernel:.*Out\s+of\s+memory:\s*Kill\s+process\s+(\d+)\s*\(([^)]+)\)/i,
      /kernel:.*oom-kill:.*killed\s+process\s+(\d+)/i
    ],

    // Additional security patterns
    suspicious_network: [
      /kernel:.*blocked\s+connection.*from\s+([\d.]+)/i,
      /iptables:.*DROP.*SRC=([\d.]+)/i
    ],

    malware: [
      /clamav:.*FOUND.*([^\s]+)/i,
      /rkhunter:.*WARNING.*([^\s]+)/i
    ]
  };

  // Severity mapping
  private static readonly SEVERITY_MAP: Record<SecurityRule, SecuritySeverity> = {
    [SecurityRule.egress]: SecuritySeverity.critical,
    [SecurityRule.brute_force]: SecuritySeverity.high,
    [SecurityRule.sudo]: SecuritySeverity.medium,
    [SecurityRule.oom_kill]: SecuritySeverity.medium,
    [SecurityRule.other]: SecuritySeverity.low
  };

  constructor(logBaseDir: string = '/mnt/vm-security', useSSH: boolean = false, stream?: SecurityEventStream) {
    this.logger = new Logger('SecurityLogParser');
    this.prisma = new PrismaClient();
    this.retry = new RetryService();
    this.stream = stream || new SecurityEventStream();
    this.logBaseDir = logBaseDir;
    this.useSSH = useSSH;
    this.positionFile = path.join(process.cwd(), '.log-positions.json');
    
    if (useSSH) {
      this.ssh = new NodeSSH();
    }

    // Load log positions on startup
    this.loadLogPositions();
    
    // Flush queue periodically
    setInterval(() => this.flushEventQueue(), this.QUEUE_FLUSH_INTERVAL);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Security log parser is already running');
      return;
    }

    try {
      this.logger.info('Starting security log parser...');

      // Connect via SSH if using remote access
      if (this.useSSH && this.ssh) {
        await this.connectSSH();
      }

      // Verify log directory exists
      const dirExists = await this.checkLogDirExists();
      if (!dirExists) {
        this.logger.error(`Security log directory does not exist: ${this.logBaseDir}`);
        throw new Error(`Log directory not found: ${this.logBaseDir}`);
      }

      // Load VM cache
      await this.refreshVMCache();

      if (this.useSSH) {
        // For SSH mode, use intelligent polling
        this.startSSHPolling();
      } else {
        // Setup file watcher for local mode
        this.setupFileWatcher();
      }

      this.isRunning = true;
      this.logger.info(`Security log parser started successfully (SSH: ${this.useSSH})`);

      // Process any existing logs that haven't been processed
      await this.processUnprocessedLogs();

    } catch (error) {
      this.logger.error('Failed to start security log parser', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping security log parser...');
    this.isRunning = false;
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }

    // Process any remaining events
    await this.flushEventQueue();

    // Save log positions
    this.saveLogPositions();

    // Disconnect SSH if connected
    if (this.ssh) {
      this.ssh.dispose();
    }

    await this.prisma.$disconnect();
    this.logger.info('Security log parser stopped');
  }

  private async connectSSH(): Promise<void> {
    if (!this.ssh) return;
    
    try {
      await this.ssh.connect({
        host: process.env.U0_IP || '100.76.195.14',
        username: process.env.SSH_USER || 'i4ops',
        password: process.env.SSH_PASSWORD,
        readyTimeout: 15000,
      });
      this.logger.info('SSH connection established for log parsing');
    } catch (error) {
      this.logger.error('Failed to connect SSH for log parsing', error);
      throw error;
    }
  }

  private setupFileWatcher(): void {
    this.watcher = chokidar.watch(`${this.logBaseDir}/*/*.log`, {
      ignored: /[\/\\]\./,
      persistent: true,
      usePolling: false, // Use native file system events
      ignoreInitial: true, // Don't trigger for existing files
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

    this.logger.info('File watcher setup complete');
  }

  private async handleFileChange(filePath: string): Promise<void> {
    if (!this.isRunning) return;

    try {
      const stats = fs.statSync(filePath);
      const position = this.logPositions.get(filePath);

      // Check if file was rotated (inode changed or size decreased)
      if (position && (stats.ino !== position.inode || stats.size < position.position)) {
        this.logger.info(`Log rotation detected for ${filePath}`);
        this.logPositions.set(filePath, {
          filePath,
          position: 0,
          lastModified: stats.mtime.getTime(),
          inode: stats.ino
        });
      }

      await this.processFileFromPosition(filePath);

    } catch (error) {
      this.logger.error(`Error handling file change: ${filePath}`, error);
    }
  }

  private async processFileFromPosition(filePath: string): Promise<void> {
    const position = this.logPositions.get(filePath) || { 
      filePath, 
      position: 0, 
      lastModified: 0 
    };

    try {
      let content: string;
      
      if (this.useSSH && this.ssh) {
        // For SSH, read from position using tail
        const { stdout } = await this.ssh.execCommand(`tail -c +${position.position + 1} "${filePath}"`);
        content = stdout;
      } else {
        // For local, read from position
        const fd = fs.openSync(filePath, 'r');
        const stats = fs.fstatSync(fd);
        const buffer = Buffer.alloc(stats.size - position.position);
        fs.readSync(fd, buffer, 0, buffer.length, position.position);
        fs.closeSync(fd);
        content = buffer.toString('utf8');
      }

      if (!content.trim()) return;

      // Parse VM name and source from file path
      const pathParts = filePath.split('/');
      const vmName = pathParts[pathParts.length - 2];
      const source = pathParts[pathParts.length - 1];

      // Process new lines
      const lines = content.split('\n').filter(line => line.trim());
      let processedLines = 0;

      for (const line of lines) {
        const event = await this.parseLogLine(line, vmName, source);
        if (event) {
          this.eventQueue.push(event);
          processedLines++;
        }
      }

      // Update position
      const newPosition = position.position + Buffer.byteLength(content, 'utf8');
      const stats = fs.statSync(filePath);
      this.logPositions.set(filePath, {
        filePath,
        position: newPosition,
        lastModified: stats.mtime.getTime(),
        inode: stats.ino
      });

      if (processedLines > 0) {
        this.logger.info(`Processed ${processedLines} new lines from ${filePath}`);
      }

    } catch (error) {
      this.logger.error(`Failed to process file ${filePath}`, error);
    }
  }

  private async parseLogLine(line: string, vmName: string, source: string): Promise<SecurityEventData | null> {
    if (!line.trim()) return null;

    // Parse timestamp and extract log content
    let timestamp: Date;
    let logContent: string;

    // Try custom format first: TIMESTAMP | VM_NAME | LOG_SOURCE | ORIGINAL_LOG_ENTRY
    const customFormatMatch = line.match(/^(.+?) \| (.+?) \| (.+?) \| (.+)$/);
    if (customFormatMatch) {
      const [, timestampStr, logVmName, logSource, originalMessage] = customFormatMatch;
      timestamp = new Date(timestampStr);
      vmName = logVmName; // Use VM name from log
      source = logSource; // Use source from log
      logContent = originalMessage;
    } else {
      // Fallback to syslog format
      const syslogMatch = line.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$/);
      if (syslogMatch) {
        const [, timestampStr, content] = syslogMatch;
        timestamp = this.parseSyslogTimestamp(timestampStr);
        logContent = content;
      } else {
        // No recognizable timestamp, use current time
        timestamp = new Date();
        logContent = line;
      }
    }

    // Validate timestamp
    if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
      timestamp = new Date();
    }

    // Get VM ID with caching
    const vmId = await this.getVMId(vmName);
    if (!vmId) {
      this.logger.debug(`Unknown VM: ${vmName}`);
      return null;
    }

    // Check against security patterns
    for (const [ruleKey, patterns] of Object.entries(SecurityLogParser.PATTERNS)) {
      for (const pattern of patterns) {
        const match = logContent.match(pattern);
        if (match) {
          const rule = ruleKey as SecurityRule;
          const severity = SecurityLogParser.SEVERITY_MAP[rule] || SecuritySeverity.low;
          
          this.logger.info(`Security event detected: ${rule} in ${vmName} - ${match[0].substring(0, 100)}`);
          
          return {
            vmId,
            timestamp,
            source,
            message: line.trim(),
            severity,
            rule
          };
        }
      }
    }

    return null;
  }

  private parseSyslogTimestamp(timestampStr: string): Date {
    try {
      const year = new Date().getFullYear();
      const fullTimestamp = `${timestampStr} ${year}`;
      const date = new Date(fullTimestamp);
      
      if (isNaN(date.getTime())) {
        // Try manual parsing
        const [month, day, time] = timestampStr.split(/\s+/);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);
        const [hours, minutes, seconds] = time.split(':').map(Number);
        
        return new Date(year, monthIndex, parseInt(day), hours, minutes, seconds);
      }
      
      return date;
    } catch (error) {
      this.logger.warn(`Failed to parse timestamp: ${timestampStr}`);
      return new Date();
    }
  }

  private async getVMId(vmName: string): Promise<number | null> {
    // Check cache first
    if (this.vmCache.has(vmName) && Date.now() < this.vmCacheExpiry) {
      return this.vmCache.get(vmName) || null;
    }

    // Refresh cache if expired
    if (Date.now() >= this.vmCacheExpiry) {
      await this.refreshVMCache();
    }

    return this.vmCache.get(vmName) || null;
  }

  private async refreshVMCache(): Promise<void> {
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

      this.vmCacheExpiry = Date.now() + this.VM_CACHE_TTL;
      this.logger.debug(`VM cache refreshed with ${vms.length} VMs`);
      
    } catch (error) {
      this.logger.error('Failed to refresh VM cache', error);
    }
  }

  private async flushEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return;

    this.processingQueue = true;

    try {
      const events = this.eventQueue.splice(0, this.BATCH_SIZE);
        let insertedCount = 0;
        
      // Use transaction for batch insert with proper deduplication
      await this.prisma.$transaction(async (tx) => {
        for (const event of events) {
          try {
            // Check for exact duplicates within the last 5 minutes
            const existingEvent = await tx.securityEvent.findFirst({
              where: {
                vmId: event.vmId,
                source: event.source,
                message: event.message,
                timestamp: {
                  gte: new Date(event.timestamp.getTime() - 300000), // 5 minutes
                  lte: new Date(event.timestamp.getTime() + 300000)
                }
              }
            });

            if (!existingEvent) {
              await tx.securityEvent.create({ data: event });
              insertedCount++;
            }
          } catch (error) {
            this.logger.warn(`Failed to insert security event`, error);
          }
        }
      });

      if (insertedCount > 0) {
        this.logger.info(`Inserted ${insertedCount} new security events`);

        // Broadcast critical/high severity events
        await this.broadcastCriticalEvents(events.filter(e => 
          e.severity === SecuritySeverity.critical || e.severity === SecuritySeverity.high
        ));
      }

    } catch (error) {
      this.logger.error('Failed to flush event queue', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async broadcastCriticalEvents(events: SecurityEventData[]): Promise<void> {
        for (const event of events) {
      try {
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
                host: { select: { name: true } }
                  }
                }
              }
            });

            if (fullEvent) {
          // Use both old and new broadcast systems for compatibility
              broadcast('security-event', fullEvent);
          this.stream.broadcastSecurityEvent(fullEvent);
        }
      } catch (error) {
        this.logger.warn('Failed to broadcast security event', error);
      }
    }
  }

  private loadLogPositions(): void {
    try {
      if (fs.existsSync(this.positionFile)) {
        const data = fs.readFileSync(this.positionFile, 'utf8');
        const positions = JSON.parse(data);
        
        for (const [filePath, position] of Object.entries(positions as Record<string, LogPosition>)) {
          this.logPositions.set(filePath, position);
        }
        
        this.logger.info(`Loaded ${this.logPositions.size} log positions`);
      }
    } catch (error) {
      this.logger.warn('Failed to load log positions', error);
    }
  }

  private saveLogPositions(): void {
    try {
      const positions: Record<string, LogPosition> = {};
      for (const [filePath, position] of this.logPositions.entries()) {
        positions[filePath] = position;
      }
      
      fs.writeFileSync(this.positionFile, JSON.stringify(positions, null, 2));
      this.logger.debug('Log positions saved');
    } catch (error) {
      this.logger.warn('Failed to save log positions', error);
    }
  }

  private async checkLogDirExists(): Promise<boolean> {
    try {
      if (this.useSSH && this.ssh) {
        const { stdout } = await this.ssh.execCommand(`test -d "${this.logBaseDir}" && echo "exists" || echo "not found"`);
        return stdout.trim() === 'exists';
      } else {
        return fs.existsSync(this.logBaseDir);
      }
    } catch (error) {
      this.logger.error('Failed to check log directory', error);
      return false;
    }
  }

  private startSSHPolling(): void {
    // Intelligent polling - start with short intervals, back off if no changes
    let pollInterval = 10000; // Start with 10 seconds
    const maxInterval = 300000; // Max 5 minutes
    const minInterval = 5000; // Min 5 seconds
    let consecutiveEmptyPolls = 0;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const changes = await this.pollForChanges();
        
        if (changes > 0) {
          // Reset to fast polling if we found changes
          pollInterval = minInterval;
          consecutiveEmptyPolls = 0;
        } else {
          consecutiveEmptyPolls++;
          // Back off polling frequency if no changes
          if (consecutiveEmptyPolls >= 3) {
            pollInterval = Math.min(pollInterval * 1.5, maxInterval);
          }
        }

      } catch (error) {
        this.logger.error('SSH polling error', error);
        pollInterval = Math.min(pollInterval * 2, maxInterval); // Back off on errors
      }

      // Schedule next poll
      setTimeout(poll, pollInterval);
    };

    // Start polling
    poll();
    this.logger.info('SSH polling started with intelligent intervals');
  }

  private async pollForChanges(): Promise<number> {
    if (!this.ssh) return 0;

    let totalChanges = 0;

    try {
      // Get list of log files with their modification times
      const { stdout } = await this.ssh.execCommand(`find "${this.logBaseDir}" -name "*.log" -exec stat -c "%Y %s %i %n" {} \\;`);
      
      const files = stdout.split('\n').filter(line => line.trim());
      
      for (const line of files) {
        const [mtime, size, inode, filePath] = line.trim().split(' ', 4);
        if (!filePath) continue;

        const lastModified = parseInt(mtime) * 1000;
        const fileSize = parseInt(size);
        const fileInode = parseInt(inode);

        const position = this.logPositions.get(filePath);

        // Check if file has changed
        if (!position || position.lastModified < lastModified || position.inode !== fileInode) {
          await this.processFileFromPosition(filePath);
          totalChanges++;
        }
      }

    } catch (error) {
      this.logger.error('Failed to poll for changes', error);
    }

    return totalChanges;
  }

  private async processUnprocessedLogs(): Promise<void> {
    try {
      this.logger.info('Processing unprocessed logs...');

      const vmDirs = await this.getVMDirectories();
      let totalProcessed = 0;
      
      for (const vmDir of vmDirs) {
        const logFiles = await this.getLogFiles(vmDir);
        
        for (const logFile of logFiles) {
          const filePath = this.useSSH ? 
            `${this.logBaseDir}/${vmDir}/${logFile}` : 
            path.join(this.logBaseDir, vmDir, logFile);

          // Process file from last known position
          await this.processFileFromPosition(filePath);
          totalProcessed++;
        }
      }

      this.logger.info(`Processed ${totalProcessed} log files during startup`);

    } catch (error) {
      this.logger.error('Failed to process unprocessed logs', error);
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

  // Public API methods
  async manualProcessLogs(): Promise<{ processed: number; events: number }> {
    let totalProcessed = 0;
    const eventsBefore = this.eventQueue.length;
    
    try {
      if (this.useSSH && this.ssh) {
        await this.connectSSH();
      }

      await this.refreshVMCache();
      await this.processUnprocessedLogs();
      
      // Flush any queued events
      await this.flushEventQueue();

      const eventsAfter = this.eventQueue.length;
      const eventsProcessed = Math.max(0, eventsBefore - eventsAfter);

      this.logger.info(`Manual processing complete: ${totalProcessed} files processed, ${eventsProcessed} events generated`);
      return { processed: totalProcessed, events: eventsProcessed };
      
    } catch (error) {
      this.logger.error('Failed to manually process logs', error);
      throw error;
    }
  }

  getStats(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      useSSH: this.useSSH,
      queueSize: this.eventQueue.length,
      processingQueue: this.processingQueue,
      logPositions: this.logPositions.size,
      vmCacheSize: this.vmCache.size,
      vmCacheExpiry: new Date(this.vmCacheExpiry).toISOString()
    };
  }
} 

