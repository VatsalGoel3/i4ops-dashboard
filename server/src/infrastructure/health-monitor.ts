import { Logger } from './logger';
import { prisma } from './database';
import { getConnectedClients } from '../events';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: number;
  metrics?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthStatus[];
  timestamp: number;
  uptime: number;
}

export class HealthMonitor {
  private logger: Logger;
  private startTime: number;
  private healthChecks = new Map<string, () => Promise<HealthStatus>>();

  constructor() {
    this.logger = new Logger('HealthMonitor');
    this.startTime = Date.now();
    this.setupDefaultChecks();
  }

  private setupDefaultChecks(): void {
    // Database health check
    this.addHealthCheck('database', async () => {
      try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        // Check recent activity
        const recentVMUpdates = await prisma.vM.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 300000)
            }
          }
        });

        return {
          service: 'database',
          status: latency < 1000 ? 'healthy' : latency < 5000 ? 'degraded' : 'unhealthy',
          message: `Database responding in ${latency}ms`,
          timestamp: Date.now(),
          metrics: {
            latency,
            recentVMUpdates
          }
        };
      } catch (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          message: `Database error: ${(error as Error).message}`,
          timestamp: Date.now()
        };
      }
    });

    // SSE connections health check
    this.addHealthCheck('sse', async () => {
      const connectedClients = getConnectedClients();
      
      return {
        service: 'sse',
        status: 'healthy',
        message: `${connectedClients} connected clients`,
        timestamp: Date.now(),
        metrics: {
          connectedClients
        }
      };
    });

    // Memory usage health check
    this.addHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const totalMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      const status = totalMB > 1000 ? 'degraded' : totalMB > 2000 ? 'unhealthy' : 'healthy';

      return {
        service: 'memory',
        status,
        message: `Memory usage: ${totalMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`,
        timestamp: Date.now(),
        metrics: {
          rss: totalMB,
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      };
    });

    // Event loop lag check
    this.addHealthCheck('eventloop', async () => {
      return new Promise((resolve) => {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
          
          const status = lag < 10 ? 'healthy' : lag < 50 ? 'degraded' : 'unhealthy';
          
          resolve({
            service: 'eventloop',
            status,
            message: `Event loop lag: ${lag.toFixed(2)}ms`,
            timestamp: Date.now(),
            metrics: {
              lag
            }
          });
        });
      });
    });
  }

  addHealthCheck(name: string, check: () => Promise<HealthStatus>): void {
    this.healthChecks.set(name, check);
    this.logger.debug(`Added health check: ${name}`);
  }

  async checkHealth(): Promise<SystemHealth> {
    const results: HealthStatus[] = [];
    
    for (const [name, check] of this.healthChecks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise<HealthStatus>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        results.push(result);
      } catch (error) {
        results.push({
          service: name,
          status: 'unhealthy',
          message: `Health check failed: ${(error as Error).message}`,
          timestamp: Date.now()
        });
      }
    }

    // Determine overall health
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      services: results,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  async getMetrics(): Promise<Record<string, any>> {
    const health = await this.checkHealth();
    
    const metrics: Record<string, any> = {
      uptime: health.uptime,
      timestamp: health.timestamp,
      overall_status: health.overall
    };

    // Flatten service metrics
    for (const service of health.services) {
      metrics[`${service.service}_status`] = service.status;
      if (service.metrics) {
        for (const [key, value] of Object.entries(service.metrics)) {
          metrics[`${service.service}_${key}`] = value;
        }
      }
    }

    return metrics;
  }

  async logHealthSummary(): Promise<void> {
    const health = await this.checkHealth();
    
    const healthyServices = health.services.filter(s => s.status === 'healthy').length;
    const totalServices = health.services.length;
    
    this.logger.info(`System Health: ${health.overall} (${healthyServices}/${totalServices} services healthy)`);
    
    const unhealthyServices = health.services.filter(s => s.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      for (const service of unhealthyServices) {
        this.logger.warn(`Service ${service.service} is unhealthy: ${service.message}`);
      }
    }
  }
} 