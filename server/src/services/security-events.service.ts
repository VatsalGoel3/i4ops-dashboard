import { PrismaClient, SecurityEventType, SecurityEventSeverity } from '@prisma/client';
import { Logger } from '../infrastructure/logger';

export interface SecurityEventFilters {
  vmName?: string;
  hostName?: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  logType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface SecurityEventStats {
  total: number;
  byType: Record<SecurityEventType, number>;
  bySeverity: Record<SecurityEventSeverity, number>;
  byVM: Record<string, number>;
  recent: number; // Events in last 24 hours
}

export class SecurityEventsService {
  private prisma: PrismaClient;
  private logger: Logger;

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('SecurityEventsService');
  }

  async getSecurityEvents(filters: SecurityEventFilters = {}) {
    const {
      vmName,
      hostName,
      eventType,
      severity,
      logType,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;

    const where: any = {};

    if (vmName) where.vmName = { contains: vmName, mode: 'insensitive' };
    if (hostName) where.hostName = { contains: hostName, mode: 'insensitive' };
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (logType) where.logType = logType;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    try {
      const [events, total] = await Promise.all([
        this.prisma.securityEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.securityEvent.count({ where })
      ]);

      return {
        events,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch security events', error);
      throw error;
    }
  }

  async getSecurityEventStats(): Promise<SecurityEventStats> {
    try {
      const [
        total,
        byType,
        bySeverity,
        byVM,
        recent
      ] = await Promise.all([
        this.prisma.securityEvent.count(),
        this.prisma.securityEvent.groupBy({
          by: ['eventType'],
          _count: { eventType: true }
        }),
        this.prisma.securityEvent.groupBy({
          by: ['severity'],
          _count: { severity: true }
        }),
        this.prisma.securityEvent.groupBy({
          by: ['vmName'],
          _count: { vmName: true }
        }),
        this.prisma.securityEvent.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      const stats: SecurityEventStats = {
        total,
        byType: {} as Record<SecurityEventType, number>,
        bySeverity: {} as Record<SecurityEventSeverity, number>,
        byVM: {},
        recent
      };

      // Convert groupBy results to expected format
      byType.forEach(item => {
        stats.byType[item.eventType] = item._count.eventType;
      });

      bySeverity.forEach(item => {
        stats.bySeverity[item.severity] = item._count.severity;
      });

      byVM.forEach(item => {
        stats.byVM[item.vmName] = item._count.vmName;
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch security event stats', error);
      throw error;
    }
  }

  async getRecentSecurityEvents(limit: number = 10) {
    try {
      return await this.prisma.securityEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error('Failed to fetch recent security events', error);
      throw error;
    }
  }

  async getSecurityEventById(id: number) {
    try {
      return await this.prisma.securityEvent.findUnique({
        where: { id }
      });
    } catch (error) {
      this.logger.error(`Failed to fetch security event ${id}`, error);
      throw error;
    }
  }

  async getVMsWithSecurityEvents(): Promise<string[]> {
    try {
      const vms = await this.prisma.securityEvent.groupBy({
        by: ['vmName'],
        _count: { vmName: true }
      });
      return vms.map(vm => vm.vmName);
    } catch (error) {
      this.logger.error('Failed to fetch VMs with security events', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
} 