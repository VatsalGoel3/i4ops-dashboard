import fs from 'fs';
import path from 'path';
import { NodeSSH } from 'node-ssh';
import { PrismaClient, SecurityEventType, SecurityEventSeverity } from '@prisma/client';
import { Logger } from '../infrastructure/logger';
import { env } from '../config/env';

// Utility type for offset tracking
interface FileOffset {
  [filePath: string]: number;
}

interface ParsedEvent {
  vmName: string;
  hostName: string;
  logType: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: Date;
  rawLine: string;
  parsedData: any;
  sourceFile: string;
}

export class SecurityEventIngestService {
  private prisma: PrismaClient;
  private logger: Logger;
  private ssh?: NodeSSH;
  private offsets: FileOffset = {};
  private offsetFile: string;
  private isProduction: boolean;
  private basePath: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('SecurityEventIngest');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.offsetFile = path.resolve(__dirname, '../../.security_event_offsets.json');
    this.basePath = '/mnt/vm-security';
    this.loadOffsets();
  }

  // Main entry: poll all VM log folders and ingest new events
  async pollAndIngest(): Promise<number> {
    try {
      this.logger.info('Starting security event ingestion');
      
      // 1. List all VM folders under /mnt/vm-security/
      const vmFolders = await this.listVMFolders();
      this.logger.info(`Found ${vmFolders.length} VM folders`);

      let totalEvents = 0;
      
      // 2. Process each VM folder
      for (const vmFolder of vmFolders) {
        const events = await this.processVMFolder(vmFolder);
        totalEvents += events;
      }

      // 3. Save offsets
      this.saveOffsets();
      
      this.logger.info(`Ingestion complete: ${totalEvents} new events processed`);
      return totalEvents;
    } catch (error) {
      this.logger.error('Failed to poll and ingest security events', error);
      throw error;
    }
  }

  private async listVMFolders(): Promise<string[]> {
    if (this.isProduction) {
      // Direct file system access
      try {
        const items = await fs.promises.readdir(this.basePath);
        return items.filter(item => {
          const fullPath = path.join(this.basePath, item);
          return fs.statSync(fullPath).isDirectory();
        });
      } catch (error) {
        this.logger.error(`Failed to read directory ${this.basePath}`, error);
        return [];
      }
    } else {
      // SSH access for development
      await this.connectSSH();
      try {
        const { stdout } = await this.ssh!.execCommand(`ls -d ${this.basePath}/*/ 2>/dev/null || echo ""`);
        if (!stdout.trim()) return [];
        
        return stdout.split('\n')
          .filter(line => line.trim())
          .map(line => path.basename(line.replace(/\/$/, '')));
      } catch (error) {
        this.logger.error('Failed to list VM folders via SSH', error);
        return [];
      }
    }
  }

  private async processVMFolder(vmFolder: string): Promise<number> {
    const logFiles = ['auth.log', 'kern.log', 'syslog'];
    let totalEvents = 0;

    for (const logFile of logFiles) {
      try {
        const events = await this.processLogFile(vmFolder, logFile);
        totalEvents += events;
      } catch (error) {
        this.logger.warn(`Failed to process ${vmFolder}/${logFile}`, error);
      }
    }

    return totalEvents;
  }

  private async processLogFile(vmFolder: string, logFile: string): Promise<number> {
    const filePath = `${this.basePath}/${vmFolder}/${logFile}`;
    const fileKey = `${vmFolder}/${logFile}`;
    
    // Read new lines
    const newLines = await this.readNewLines(vmFolder, logFile);
    if (newLines.length === 0) return 0;

    // Parse and store events
    const events: ParsedEvent[] = [];
    const hostName = vmFolder.split('-')[0]; // Extract host from vm name like "u2-vm30000"

    for (const line of newLines) {
      const event = this.parseLogLine(line, logFile, vmFolder, hostName);
      if (event) {
        events.push(event);
      }
    }

    // Store events in database
    if (events.length > 0) {
      await this.storeEvents(events);
    }

    // Update offset
    this.offsets[fileKey] = (this.offsets[fileKey] || 0) + newLines.length;

    return events.length;
  }

  // Helper: Read file (local or SSH) from offset, return new lines
  private async readNewLines(vmFolder: string, logFile: string): Promise<string[]> {
    const filePath = `${this.basePath}/${vmFolder}/${logFile}`;
    const fileKey = `${vmFolder}/${logFile}`;
    const currentOffset = this.offsets[fileKey] || 0;

    if (this.isProduction) {
      // Direct file system access
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        return lines.slice(currentOffset).filter(line => line.trim());
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          // File doesn't exist, reset offset
          this.offsets[fileKey] = 0;
          return [];
        }
        throw error;
      }
    } else {
      // SSH access for development
      await this.connectSSH();
      try {
        // Use tail to get lines from offset
        const { stdout } = await this.ssh!.execCommand(
          `tail -n +${currentOffset + 1} "${filePath}" 2>/dev/null || echo ""`
        );
        
        if (!stdout.trim()) {
          // File might not exist or be empty, reset offset
          this.offsets[fileKey] = 0;
          return [];
        }
        
        return stdout.split('\n').filter(line => line.trim());
      } catch (error) {
        this.logger.warn(`Failed to read ${filePath} via SSH`, error);
        return [];
      }
    }
  }

  // Helper: Parse a log line, return event or null
  private parseLogLine(line: string, logType: string, vmName: string, hostName: string): ParsedEvent | null {
    // Extract timestamp from log line (common formats)
    const timestamp = this.extractTimestamp(line);
    if (!timestamp) return null;

    // Parse different log types
    switch (logType) {
      case 'kern.log':
        return this.parseKernLog(line, vmName, hostName, timestamp);
      case 'auth.log':
        return this.parseAuthLog(line, vmName, hostName, timestamp);
      case 'syslog':
        return this.parseSyslog(line, vmName, hostName, timestamp);
      default:
        return null;
    }
  }

  private extractTimestamp(line: string): Date | null {
    // Common timestamp patterns in log files
    const patterns = [
      /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/, // Jan 1 12:00:00
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/, // 2024-01-01T12:00:00
      /^(\d{2}:\d{2}:\d{2})/, // 12:00:00
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          // Try to parse the timestamp
          const dateStr = match[1];
          const now = new Date();
          let fullDateStr = dateStr;
          
          // If only time, add current date
          if (dateStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
            const today = now.toISOString().split('T')[0];
            fullDateStr = `${today}T${dateStr}`;
          }
          
          const date = new Date(fullDateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
    }

    // Fallback to current time
    return new Date();
  }

  private parseKernLog(line: string, vmName: string, hostName: string, timestamp: Date): ParsedEvent | null {
    // Look for egress attempts and suspicious kernel events
    const egressPattern = /egress.*read\s+(\S+)\s+write\s+(\S+)/i;
    const suspiciousPattern = /bad file descriptor|suspicious|security alert/i;
    const kernelAlertPattern = /kernel.*alert|kernel.*error/i;

    if (egressPattern.test(line)) {
      const match = line.match(egressPattern);
      return {
        vmName,
        hostName,
        logType: 'kern.log',
        eventType: SecurityEventType.egress_attempt,
        severity: SecurityEventSeverity.high,
        timestamp,
        rawLine: line,
        parsedData: {
          sourceFile: match?.[1],
          targetFile: match?.[2],
          action: 'egress_attempt'
        },
        sourceFile: `${this.basePath}/${vmName}/kern.log`
      };
    }

    if (suspiciousPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'kern.log',
        eventType: SecurityEventType.suspicious_behavior,
        severity: SecurityEventSeverity.medium,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'suspicious_behavior',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/kern.log`
      };
    }

    if (kernelAlertPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'kern.log',
        eventType: SecurityEventType.kernel_alert,
        severity: SecurityEventSeverity.medium,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'kernel_alert',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/kern.log`
      };
    }

    return null;
  }

  private parseAuthLog(line: string, vmName: string, hostName: string, timestamp: Date): ParsedEvent | null {
    // Look for authentication failures and security events
    const authFailurePattern = /authentication failure|failed password|invalid user/i;
    const sudoPattern = /sudo.*failed|sudo.*authentication failure/i;
    const securityPattern = /security.*alert|security.*violation/i;

    if (authFailurePattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'auth.log',
        eventType: SecurityEventType.authentication_failure,
        severity: SecurityEventSeverity.medium,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'authentication_failure',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/auth.log`
      };
    }

    if (sudoPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'auth.log',
        eventType: SecurityEventType.authentication_failure,
        severity: SecurityEventSeverity.high,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'sudo_failure',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/auth.log`
      };
    }

    if (securityPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'auth.log',
        eventType: SecurityEventType.suspicious_behavior,
        severity: SecurityEventSeverity.high,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'security_alert',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/auth.log`
      };
    }

    return null;
  }

  private parseSyslog(line: string, vmName: string, hostName: string, timestamp: Date): ParsedEvent | null {
    // Look for system-level security events
    const systemAlertPattern = /system.*alert|system.*error/i;
    const securityPattern = /security.*event|security.*breach/i;
    const fileAccessPattern = /file.*access.*denied|permission.*denied/i;

    if (systemAlertPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'syslog',
        eventType: SecurityEventType.system_alert,
        severity: SecurityEventSeverity.medium,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'system_alert',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/syslog`
      };
    }

    if (securityPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'syslog',
        eventType: SecurityEventType.suspicious_behavior,
        severity: SecurityEventSeverity.high,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'security_event',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/syslog`
      };
    }

    if (fileAccessPattern.test(line)) {
      return {
        vmName,
        hostName,
        logType: 'syslog',
        eventType: SecurityEventType.file_access,
        severity: SecurityEventSeverity.low,
        timestamp,
        rawLine: line,
        parsedData: {
          action: 'file_access_denied',
          details: line
        },
        sourceFile: `${this.basePath}/${vmName}/syslog`
      };
    }

    return null;
  }

  private async storeEvents(events: ParsedEvent[]): Promise<void> {
    try {
      const dbEvents = events.map(event => ({
        vmName: event.vmName,
        hostName: event.hostName,
        logType: event.logType,
        eventType: event.eventType,
        severity: event.severity,
        timestamp: event.timestamp,
        rawLine: event.rawLine,
        parsedData: event.parsedData,
        sourceFile: event.sourceFile
      }));

      await this.prisma.securityEvent.createMany({
        data: dbEvents,
        skipDuplicates: true
      });

      this.logger.info(`Stored ${events.length} security events`);
    } catch (error) {
      this.logger.error('Failed to store security events', error);
      throw error;
    }
  }

  private async connectSSH(): Promise<void> {
    if (this.ssh && this.ssh.isConnected()) return;

    this.ssh = new NodeSSH();
    try {
      await this.ssh.connect({
        host: env.U0_IP,
        username: env.SSH_USER,
        password: env.SSH_PASSWORD,
        readyTimeout: 10000,
      });
      this.logger.info('SSH connection established for security event ingestion');
    } catch (error) {
      this.logger.error('Failed to connect to u0 for security event ingestion', error);
      throw error;
    }
  }

  // Helper: Save offsets to disk
  private saveOffsets(): void {
    try {
      fs.writeFileSync(this.offsetFile, JSON.stringify(this.offsets, null, 2));
    } catch (error) {
      this.logger.warn('Failed to save offsets', error);
    }
  }

  // Helper: Load offsets from disk
  private loadOffsets(): void {
    try {
      if (fs.existsSync(this.offsetFile)) {
        const data = fs.readFileSync(this.offsetFile, 'utf8');
        this.offsets = JSON.parse(data);
      }
    } catch (error) {
      this.logger.warn('Failed to load offsets, starting fresh', error);
      this.offsets = {};
    }
  }

  async disconnect(): Promise<void> {
    if (this.ssh) {
      this.ssh.dispose();
    }
    await this.prisma.$disconnect();
  }
} 