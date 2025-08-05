import { PrismaClient } from '@prisma/client';
import { NodeSSH } from 'node-ssh';
import { Logger } from '../infrastructure/logger';

export interface ServiceCheck {
  service: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  errorMsg?: string;
  lastCheck: Date;
}

export interface UserServiceHealth {
  userId: number;
  username: string;
  environment: string;
  hostname?: string;
  ip?: string;
  services: ServiceCheck[];
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
}

export class ServiceMonitorService {
  private prisma: PrismaClient;
  private logger: Logger;
  private sshConnections: Map<string, NodeSSH> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.logger = new Logger('ServiceMonitor');
  }

  /**
   * Check all user services across all environments
   */
  async checkAllUserServices(): Promise<UserServiceHealth[]> {
    this.logger.info('Starting comprehensive service health check...');

    try {
      // Get all users with their environments
      const users = await this.prisma.projectUser.findMany({
        include: {
          environment: true,
          serviceStatus: true,
        },
      });

      const healthReports: UserServiceHealth[] = [];

      for (const user of users) {
        const userHealth = await this.checkUserServices(user);
        healthReports.push(userHealth);
      }

      this.logger.info(`Completed health check for ${healthReports.length} users`);
      return healthReports;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error during comprehensive health check:', errorMessage);
      throw error;
    }
  }

  /**
   * Check services for a specific user
   */
  async checkUserServices(user: any): Promise<UserServiceHealth> {
    const services: ServiceCheck[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown' = 'unknown';

    try {
      // Check if environment is accessible
      if (!user.environment.hostname && !user.environment.ip) {
        this.logger.warn(`No hostname/IP for environment ${user.environment.name}`);
        return {
          userId: user.id,
          username: user.username,
          environment: user.environment.name,
          services: [],
          overallStatus: 'unknown',
        };
      }

      const target = user.environment.hostname || user.environment.ip;

      // For demonstration purposes, we'll simulate SSH checks
      // In a real environment, you'd want proper SSH key management
      
      // Check VNC service
      const vncCheck = await this.simulateServiceCheck('vnc', user);
      services.push(vncCheck);

      // Check nginx service
      const nginxCheck = await this.simulateServiceCheck('nginx', user);
      services.push(nginxCheck);

      // Check home directory
      const homeCheck = await this.simulateServiceCheck('home_directory', user);
      services.push(homeCheck);

      // Check SSH access
      const sshCheck = await this.simulateServiceCheck('ssh_access', user);
      services.push(sshCheck);

      // Determine overall status
      const runningServices = services.filter(s => s.status === 'running').length;
      const errorServices = services.filter(s => s.status === 'error').length;
      const stoppedServices = services.filter(s => s.status === 'stopped').length;

      if (runningServices === services.length) {
        overallStatus = 'healthy';
      } else if (errorServices > 0 || stoppedServices >= services.length / 2) {
        overallStatus = 'critical';
      } else {
        overallStatus = 'degraded';
      }

      // Update database with latest status
      await this.updateServiceStatus(user.id, services);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error checking services for user ${user.username}:`, errorMessage);
      overallStatus = 'critical';
    }

    return {
      userId: user.id,
      username: user.username,
      environment: user.environment.name,
      hostname: user.environment.hostname,
      ip: user.environment.ip,
      services,
      overallStatus,
    };
  }

  /**
   * Simulate service check (for demo purposes)
   * In production, this would use actual SSH connections
   */
  private async simulateServiceCheck(serviceName: string, user: any): Promise<ServiceCheck> {
    const lastCheck = new Date();
    
    // Simulate realistic service status based on user status
    const isActive = user.status === 'active';
    const randomFactor = Math.random();
    
    let status: 'running' | 'stopped' | 'error';
    let errorMsg: string | undefined;

    if (!isActive) {
      status = 'stopped';
      errorMsg = `User ${user.username} is inactive`;
    } else if (randomFactor < 0.8) {
      status = 'running';
    } else if (randomFactor < 0.9) {
      status = 'error';
      errorMsg = `${serviceName} service encountered an error`;
    } else {
      status = 'stopped';
      errorMsg = `${serviceName} service is not running`;
    }

    return {
      service: serviceName,
      status,
      errorMsg,
      lastCheck,
    };
  }

  /**
   * Check VNC service status via SSH (actual implementation)
   */
  private async checkVNCService(host: string, user: any): Promise<ServiceCheck> {
    const serviceName = 'vnc';
    const lastCheck = new Date();

    try {
      // Check if VNC service is running using systemctl
      const serviceCheck = await this.executeSSHCommand(
        host,
        `systemctl is-active vncserver@${user.username}.service`
      );

      if (serviceCheck.includes('active')) {
        // Also check if the port is actually listening
        const portCheck = await this.executeSSHCommand(
          host,
          `netstat -tuln | grep :${user.vncPort || 'UNKNOWN'}`
        );

        if (portCheck.length > 0) {
          return { service: serviceName, status: 'running', lastCheck };
        } else {
          return {
            service: serviceName,
            status: 'error',
            errorMsg: 'Service active but port not listening',
            lastCheck,
          };
        }
      } else {
        return {
          service: serviceName,
          status: 'stopped',
          errorMsg: 'VNC service not active',
          lastCheck,
        };
      }
    } catch (error) {
      return {
        service: serviceName,
        status: 'error',
        errorMsg: `SSH check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck,
      };
    }
  }

  /**
   * Check nginx service status
   */
  private async checkNginxService(host: string, user: any): Promise<ServiceCheck> {
    const serviceName = 'nginx';
    const lastCheck = new Date();

    try {
      // Check nginx main service
      const serviceCheck = await this.executeSSHCommand(host, 'systemctl is-active nginx');

      if (serviceCheck.includes('active')) {
        // Check if nginx is listening on port 80/443
        const portCheck = await this.executeSSHCommand(
          host,
          'netstat -tuln | grep -E ":(80|443)"'
        );

        if (portCheck.length > 0) {
          return { service: serviceName, status: 'running', lastCheck };
        } else {
          return {
            service: serviceName,
            status: 'error',
            errorMsg: 'Nginx active but not listening on standard ports',
            lastCheck,
          };
        }
      } else {
        return {
          service: serviceName,
          status: 'stopped',
          errorMsg: 'Nginx service not active',
          lastCheck,
        };
      }
    } catch (error) {
      return {
        service: serviceName,
        status: 'error',
        errorMsg: `SSH check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck,
      };
    }
  }

  /**
   * Check home directory accessibility
   */
  private async checkHomeDirectory(host: string, user: any): Promise<ServiceCheck> {
    const serviceName = 'home_directory';
    const lastCheck = new Date();
    const homeDir = user.homeDirectory || `/home/${user.username}`;

    try {
      // Check if home directory exists and is accessible
      const dirCheck = await this.executeSSHCommand(host, `test -d "${homeDir}" && echo "exists"`);

      if (dirCheck.includes('exists')) {
        // Check permissions
        const permCheck = await this.executeSSHCommand(
          host,
          `ls -ld "${homeDir}" | awk '{print $1, $3}'`
        );

        if (permCheck.includes(user.username)) {
          return { service: serviceName, status: 'running', lastCheck };
        } else {
          return {
            service: serviceName,
            status: 'error',
            errorMsg: 'Directory exists but wrong ownership',
            lastCheck,
          };
        }
      } else {
        return {
          service: serviceName,
          status: 'stopped',
          errorMsg: 'Home directory does not exist',
          lastCheck,
        };
      }
    } catch (error) {
      return {
        service: serviceName,
        status: 'error',
        errorMsg: `Directory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck,
      };
    }
  }

  /**
   * Check SSH access for user
   */
  private async checkSSHAccess(host: string, user: any): Promise<ServiceCheck> {
    const serviceName = 'ssh_access';
    const lastCheck = new Date();

    try {
      // Check if user exists in system
      const userCheck = await this.executeSSHCommand(host, `id ${user.username}`);

      if (userCheck.includes(`uid=`)) {
        // Check SSH daemon
        const sshCheck = await this.executeSSHCommand(host, 'systemctl is-active ssh');

        if (sshCheck.includes('active')) {
          return { service: serviceName, status: 'running', lastCheck };
        } else {
          return {
            service: serviceName,
            status: 'error',
            errorMsg: 'User exists but SSH daemon not active',
            lastCheck,
          };
        }
      } else {
        return {
          service: serviceName,
          status: 'stopped',
          errorMsg: 'User does not exist in system',
          lastCheck,
        };
      }
    } catch (error) {
      return {
        service: serviceName,
        status: 'error',
        errorMsg: `User check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck,
      };
    }
  }

  /**
   * Execute SSH command on remote host
   */
  private async executeSSHCommand(host: string, command: string): Promise<string> {
    const connectionKey = host;
    let ssh = this.sshConnections.get(connectionKey);

    if (!ssh) {
      ssh = new NodeSSH();
      
      // Connection configuration - in production, use proper SSH keys
      const connectConfig = {
        host,
        username: process.env.SSH_USERNAME || 'root',
        privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
        password: process.env.SSH_PASSWORD, // Fallback, not recommended for production
        readyTimeout: 5000,
        tryKeyboard: true,
      };

      try {
        await ssh.connect(connectConfig);
        this.sshConnections.set(connectionKey, ssh);
        this.logger.debug(`Established SSH connection to ${host}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to connect to ${host}: ${errorMessage}`);
      }
    }

    try {
      const result = await ssh.execCommand(command);
      if (result.code !== 0 && result.stderr) {
        throw new Error(`Command failed: ${result.stderr}`);
      }
      return result.stdout;
    } catch (error) {
      // Connection might be stale, remove it
      this.sshConnections.delete(connectionKey);
      ssh.dispose();
      throw error;
    }
  }

  /**
   * Update service status in database
   */
  private async updateServiceStatus(userId: number, services: ServiceCheck[]): Promise<void> {
    try {
      for (const serviceCheck of services) {
        await this.prisma.userServiceStatus.upsert({
          where: {
            userId_service: {
              userId,
              service: serviceCheck.service,
            },
          },
          update: {
            status: serviceCheck.status,
            lastCheck: serviceCheck.lastCheck,
            errorMsg: serviceCheck.errorMsg,
            updatedAt: new Date(),
          },
          create: {
            userId,
            service: serviceCheck.service,
            status: serviceCheck.status,
            lastCheck: serviceCheck.lastCheck,
            errorMsg: serviceCheck.errorMsg,
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update service status for user ${userId}:`, errorMessage);
    }
  }

  /**
   * Get service health summary
   */
  async getServiceHealthSummary(): Promise<{
    totalUsers: number;
    healthyUsers: number;
    degradedUsers: number;
    criticalUsers: number;
    unknownUsers: number;
    serviceStats: Record<string, { running: number; stopped: number; error: number }>;
  }> {
    try {
      const allHealth = await this.checkAllUserServices();
      
      const summary = {
        totalUsers: allHealth.length,
        healthyUsers: allHealth.filter(h => h.overallStatus === 'healthy').length,
        degradedUsers: allHealth.filter(h => h.overallStatus === 'degraded').length,
        criticalUsers: allHealth.filter(h => h.overallStatus === 'critical').length,
        unknownUsers: allHealth.filter(h => h.overallStatus === 'unknown').length,
        serviceStats: {} as Record<string, { running: number; stopped: number; error: number }>,
      };

      // Calculate service-specific stats
      const allServices = allHealth.flatMap(h => h.services);
      const serviceNames = [...new Set(allServices.map(s => s.service))];

      for (const serviceName of serviceNames) {
        const serviceChecks = allServices.filter(s => s.service === serviceName);
        summary.serviceStats[serviceName] = {
          running: serviceChecks.filter(s => s.status === 'running').length,
          stopped: serviceChecks.filter(s => s.status === 'stopped').length,
          error: serviceChecks.filter(s => s.status === 'error').length,
        };
      }

      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error generating service health summary:', errorMessage);
      throw error;
    }
  }

  /**
   * Cleanup SSH connections
   */
  async cleanup(): Promise<void> {
    for (const [host, ssh] of this.sshConnections) {
      try {
        ssh.dispose();
        this.logger.debug(`Closed SSH connection to ${host}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Error closing SSH connection to ${host}:`, errorMessage);
      }
    }
    this.sshConnections.clear();
    await this.prisma.$disconnect();
  }
} 