import { PrismaClient } from '@prisma/client';
import { Logger } from '../infrastructure/logger';
import type {
  Environment,
  Project,
  ProjectUser,
  ProjectUserWithRelations,
  ProjectWithRelations,
  EnvironmentWithRelations,
  UserAccessInfo,
  UserFilters,
  ProjectFilters
} from '../schemas/user-management.schema';

const prisma = new PrismaClient();
const logger = new Logger('UserManagementService');

export class UserManagementService {
  
  /**
   * Calculate VNC ports based on username seed (matching Ansible logic)
   */
  private calculatePorts(username: string): { vncDisplay: number; vncPort: number; webPort: number } {
    // Simulate Ansible's random filter with seed
    const seed = this.hashString(username);
    const vncDisplay = (seed % 2048) + 9999;
    const vncPort = (seed % 2048) + 10000;
    const webPort = vncDisplay + 8443;
    
    return { vncDisplay, vncPort, webPort };
  }

  /**
   * Simple hash function to mimic Ansible's seeded random
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all environments with basic stats
   */
  async getAllEnvironments(): Promise<EnvironmentWithRelations[]> {
    logger.info('Fetching all environments');
    
    const environments = await prisma.environment.findMany({
      include: {
        projects: {
          include: {
            users: true,
            managers: true,
          }
        },
        users: true,
      },
      orderBy: { name: 'asc' }
    });

    return environments;
  }

  /**
   * Get environment by name
   */
  async getEnvironmentByName(name: string): Promise<EnvironmentWithRelations | null> {
    logger.info(`Fetching environment: ${name}`);
    
    const environment = await prisma.environment.findUnique({
      where: { name },
      include: {
        projects: {
          include: {
            users: true,
            managers: true,
            pathWhitelists: true,
          }
        },
        users: {
          include: {
            projects: true,
            serviceStatus: true,
          }
        },
      }
    });

    return environment;
  }

  /**
   * Get all users with filters
   */
  async getAllUsers(filters: UserFilters = {}): Promise<ProjectUserWithRelations[]> {
    logger.info('Fetching users with filters', filters);

    const where: any = {};

    if (filters.environment) {
      where.environment = { name: filters.environment };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.project) {
      where.projects = {
        some: { name: filters.project }
      };
    }

    const users = await prisma.projectUser.findMany({
      where,
      include: {
        environment: true,
        projects: {
          include: {
            environment: true,
          }
        },
        serviceStatus: true,
      },
      orderBy: [
        { environment: { name: 'asc' } },
        { username: 'asc' }
      ]
    });

    return users;
  }

  /**
   * Get user by ID with all relations
   */
  async getUserById(id: number): Promise<ProjectUserWithRelations | null> {
    logger.info(`Fetching user by ID: ${id}`);

    const user = await prisma.projectUser.findUnique({
      where: { id },
      include: {
        environment: true,
        projects: {
          include: {
            environment: true,
            managers: true,
            pathWhitelists: true,
          }
        },
        serviceStatus: true,
      }
    });

    return user;
  }

  /**
   * Get all projects with filters
   */
  async getAllProjects(filters: ProjectFilters = {}): Promise<ProjectWithRelations[]> {
    logger.info('Fetching projects with filters', filters);

    const where: any = {};

    if (filters.environment) {
      where.environment = { name: filters.environment };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        environment: true,
        users: {
          include: {
            serviceStatus: true,
          }
        },
        managers: true,
        pathWhitelists: true,
      },
      orderBy: [
        { environment: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    return projects;
  }

  /**
   * Get user access information including URLs
   */
  async getUserAccessInfo(userId: number, environmentName: string): Promise<UserAccessInfo | null> {
    logger.info(`Getting access info for user ${userId} in environment ${environmentName}`);

    const user = await prisma.projectUser.findFirst({
      where: {
        id: userId,
        environment: { name: environmentName }
      },
      include: {
        environment: true,
        serviceStatus: true,
      }
    });

    if (!user) {
      return null;
    }

    // Calculate ports if not stored
    let { vncDisplay, vncPort, webPort } = user;
    if (!vncPort || !webPort) {
      const calculated = this.calculatePorts(user.username);
      vncDisplay = calculated.vncDisplay;
      vncPort = calculated.vncPort;
      webPort = calculated.webPort;
    }

    // Generate access URLs
    const tailscaleUrl = user.environment.hostname 
      ? `https://${user.environment.hostname}:${webPort}/`
      : null;
    
    const tailscaleIpUrl = user.environment.ip 
      ? `https://${user.environment.ip}:${webPort}/`
      : null;

    // Get service status
    const vncStatus = user.serviceStatus.find(s => s.service === 'vnc');
    const status = vncStatus?.status || 'unknown';
    const lastCheck = vncStatus?.lastCheck || null;

    return {
      username: user.username,
      tailscaleUrl,
      tailscaleIpUrl,
      vncPort,
      webPort,
      status,
      lastCheck,
    };
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics() {
    logger.info('Fetching user management statistics');

    const [
      totalEnvironments,
      totalProjects,
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
    ] = await Promise.all([
      prisma.environment.count(),
      prisma.project.count({ where: { status: 'active' } }),
      prisma.projectUser.count(),
      prisma.projectUser.count({ where: { status: 'active' } }),
      prisma.projectUser.count({ where: { status: 'inactive' } }),
      prisma.projectUser.count({ where: { status: 'suspended' } }),
    ]);

    // Get users per environment
    const usersPerEnvironment = await prisma.environment.findMany({
      select: {
        name: true,
        displayName: true,
        _count: {
          select: {
            users: true,
            projects: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return {
      totals: {
        environments: totalEnvironments,
        projects: totalProjects,
        users: totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
      },
      usersPerEnvironment: usersPerEnvironment.map(env => ({
        environment: env.name,
        displayName: env.displayName,
        userCount: env._count.users,
        projectCount: env._count.projects,
      })),
    };
  }

  /**
   * Search across all user management entities
   */
  async search(query: string, limit: number = 20) {
    logger.info(`Searching for: ${query}`);

    const searchTerm = query.toLowerCase();

    const [users, projects, environments] = await Promise.all([
      // Search users
      prisma.projectUser.findMany({
        where: {
          OR: [
            { username: { contains: searchTerm, mode: 'insensitive' } },
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ]
        },
        include: {
          environment: true,
          projects: true,
        },
        take: Math.floor(limit / 3),
      }),
      
      // Search projects
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { displayName: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ]
        },
        include: {
          environment: true,
          users: true,
        },
        take: Math.floor(limit / 3),
      }),

      // Search environments
      prisma.environment.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { displayName: { contains: searchTerm, mode: 'insensitive' } },
          ]
        },
        include: {
          _count: {
            select: {
              users: true,
              projects: true,
            }
          }
        },
        take: Math.floor(limit / 3),
      }),
    ]);

    return {
      users: users.map(user => ({
        type: 'user' as const,
        id: user.id,
        title: `${user.name} (${user.username})`,
        subtitle: `${user.environment.displayName} • ${user.projects.length} projects`,
        data: user,
      })),
      projects: projects.map(project => ({
        type: 'project' as const,
        id: project.id,
        title: project.displayName,
        subtitle: `${project.environment.displayName} • ${project.users.length} users`,
        data: project,
      })),
      environments: environments.map(env => ({
        type: 'environment' as const,
        id: env.id,
        title: env.displayName,
        subtitle: `${env._count.users} users • ${env._count.projects} projects`,
        data: env,
      })),
    };
  }
}

export const userManagementService = new UserManagementService(); 