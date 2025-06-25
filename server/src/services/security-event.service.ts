import { PrismaClient, SecurityEvent, SecuritySeverity, SecurityRule } from '@prisma/client';
import { Logger } from '../infrastructure/logger';

export interface SecurityEventFilters {
  vmId?: number;
  severity?: SecuritySeverity;
  rule?: SecurityRule;
  since?: Date;
  until?: Date;
  acknowledged?: boolean;
}

export interface SecurityEventStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unacknowledged: number;
}

export class SecurityEventService {
  private logger: Logger;
  private prisma: PrismaClient;

  constructor() {
    this.logger = new Logger('SecurityEventService');
    this.prisma = new PrismaClient();
  }

  async getEvents(
    filters: SecurityEventFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: SecurityEvent[]; total: number }> {
    try {
      const where: any = {};

      if (filters.vmId) where.vmId = filters.vmId;
      if (filters.severity) where.severity = filters.severity;
      if (filters.rule) where.rule = filters.rule;
      if (filters.acknowledged !== undefined) {
        where.ackAt = filters.acknowledged ? { not: null } : null;
      }
      
      if (filters.since || filters.until) {
        where.timestamp = {};
        if (filters.since) where.timestamp.gte = filters.since;
        if (filters.until) where.timestamp.lte = filters.until;
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.securityEvent.findMany({
          where,
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
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.securityEvent.count({ where })
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error('Failed to get security events', error);
      throw error;
    }
  }

  async getEventById(id: number): Promise<SecurityEvent | null> {
    try {
      return await this.prisma.securityEvent.findUnique({
        where: { id },
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
    } catch (error) {
      this.logger.error(`Failed to get security event ${id}`, error);
      throw error;
    }
  }

  async acknowledgeEvent(id: number, user: string = 'system'): Promise<SecurityEvent> {
    try {
      const event = await this.prisma.securityEvent.update({
        where: { id },
        data: { ackAt: new Date() },
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

      this.logger.info(`Security event ${id} acknowledged by ${user}`);
      return event;
    } catch (error) {
      this.logger.error(`Failed to acknowledge security event ${id}`, error);
      throw error;
    }
  }

  async acknowledgeMultiple(ids: number[], user: string = 'system'): Promise<number> {
    try {
      const result = await this.prisma.securityEvent.updateMany({
        where: {
          id: { in: ids },
          ackAt: null // Only acknowledge unacknowledged events
        },
        data: { ackAt: new Date() }
      });

      this.logger.info(`${result.count} security events acknowledged by ${user}`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to acknowledge multiple security events', error);
      throw error;
    }
  }

  async getStats(since?: Date): Promise<SecurityEventStats> {
    try {
      const where: any = {};
      if (since) {
        where.timestamp = { gte: since };
      }

      const [total, critical, high, medium, low, unacknowledged] = await Promise.all([
        this.prisma.securityEvent.count({ where }),
        this.prisma.securityEvent.count({ where: { ...where, severity: SecuritySeverity.critical } }),
        this.prisma.securityEvent.count({ where: { ...where, severity: SecuritySeverity.high } }),
        this.prisma.securityEvent.count({ where: { ...where, severity: SecuritySeverity.medium } }),
        this.prisma.securityEvent.count({ where: { ...where, severity: SecuritySeverity.low } }),
        this.prisma.securityEvent.count({ where: { ...where, ackAt: null } })
      ]);

      return {
        total,
        critical,
        high,
        medium,
        low,
        unacknowledged
      };
    } catch (error) {
      this.logger.error('Failed to get security event stats', error);
      throw error;
    }
  }

  async getRecentCriticalEvents(limit: number = 10): Promise<SecurityEvent[]> {
    try {
      return await this.prisma.securityEvent.findMany({
        where: {
          severity: { in: [SecuritySeverity.critical, SecuritySeverity.high] },
          ackAt: null
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
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Failed to get recent critical events', error);
      throw error;
    }
  }

  async cleanupOldEvents(retentionDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.securityEvent.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      this.logger.info(`Cleaned up ${result.count} security events older than ${retentionDays} days`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old security events', error);
      throw error;
    }
  }
} 