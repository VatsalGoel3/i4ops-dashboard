import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../infrastructure/logger';

const prisma = new PrismaClient();
const logger = new Logger('AnsibleDataPopulation');

// Interface matching the Ansible project-users.yml structure
interface AnsibleProjectUsers {
  i4ops_customer: {
    biz_id: string;
    shortname: string;
    pretty_name: string;
    managers: Record<string, {
      name: string;
      email: string;
      password?: string;
      projects: string[];
      project_manager_id?: string;
    }>;
    users: Record<string, {
      name: string;
      email: string;
      password?: string;
      projects: string[];
    }>;
    projects: Record<string, {
      project_id: string;
      description: string;
      path_whitelists: Array<{
        name: string;
        sources: string[];
        target?: {
          host: string;
          path: string;
        };
      }>;
    }>;
  };
}

interface EnvironmentConfig {
  name: string;
  displayName: string;
  hostname?: string;
  ip?: string;
  status: string;
}

/**
 * Function to calculate VNC ports based on username (matching Ansible logic)
 */
function calculateVncPorts(username: string): { vncDisplay: number; vncPort: number; webPort: number } {
  // Simple hash function to mimic Ansible's seeded random(2048, seed=item.key)
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  hash = Math.abs(hash);
  
  // Mimic random(2048, seed=username) + 9999 for VNC display
  const vncDisplay = (hash % 2048) + 9999;
  // VNC port is typically vncDisplay + 1
  const vncPort = vncDisplay + 1;
  // Web access port as configured in project.yml
  const webPort = vncDisplay + 8443;
  
  return { vncDisplay, vncPort, webPort };
}

/**
 * Discover all environment directories in the Ansible inventory
 */
function discoverEnvironments(inventoryPath: string): EnvironmentConfig[] {
  const environments: EnvironmentConfig[] = [];
  
  try {
    const invPath = path.resolve(inventoryPath);
    if (!fs.existsSync(invPath)) {
      logger.warn(`Inventory path does not exist: ${invPath}`);
      return environments;
    }

    const entries = fs.readdirSync(invPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const envName = entry.name;
        const envPath = path.join(invPath, envName);
        
        // Check if it has the expected structure
        const groupVarsPath = path.join(envPath, 'group_vars', envName);
        if (fs.existsSync(groupVarsPath)) {
          // Try to read host information
          const hostsYmlPath = path.join(envPath, 'hosts.yml');
          let hostname: string | undefined;
          let ip: string | undefined;
          
          if (fs.existsSync(hostsYmlPath)) {
            try {
              const hostsContent = fs.readFileSync(hostsYmlPath, 'utf8');
              const hostsData = yaml.load(hostsContent) as any;
              
              // Extract hostname and IP from hosts.yml structure
              if (hostsData && hostsData.all && hostsData.all.hosts) {
                const firstHost = Object.values(hostsData.all.hosts)[0] as any;
                if (firstHost) {
                  hostname = firstHost.ansible_host || firstHost.tailscale_hostname;
                  ip = firstHost.ansible_host || firstHost.tailscale_ip;
                }
              }
            } catch (error) {
              logger.warn(`Failed to parse hosts.yml for ${envName}:`, error);
            }
          }
          
          environments.push({
            name: envName,
            displayName: `Environment ${envName.toUpperCase()}`,
            hostname,
            ip,
            status: 'unknown', // Will be determined by actual connectivity
          });
        }
      }
    }
    
    logger.info(`Discovered ${environments.length} environments`);
    return environments;
  } catch (error) {
    logger.error('Error discovering environments:', error);
    return environments;
  }
}

/**
 * Load project users data from a specific environment
 */
function loadProjectUsersData(envPath: string, envName: string): AnsibleProjectUsers | null {
  try {
    const projectUsersPath = path.join(envPath, 'group_vars', envName, 'project-users.yml');
    
    if (!fs.existsSync(projectUsersPath)) {
      logger.warn(`No project-users.yml found for environment ${envName}`);
      return null;
    }
    
    const yamlContent = fs.readFileSync(projectUsersPath, 'utf8');
    const data = yaml.load(yamlContent) as AnsibleProjectUsers;
    
    if (!data || !data.i4ops_customer) {
      logger.warn(`Invalid project-users.yml structure for environment ${envName}`);
      return null;
    }
    
    logger.info(`Loaded project users data for environment ${envName}`);
    return data;
  } catch (error) {
    logger.error(`Error loading project users data for ${envName}:`, error);
    return null;
  }
}

/**
 * Populate database with data from Ansible inventories
 */
async function populateFromAnsible(inventoryBasePath: string = '/home/vt003/Desktop/i4infra/ansible/inv') {
  logger.info('Starting population from Ansible data...');
  
  try {
    // Clear existing data first
    logger.info('Clearing existing user management data...');
    await prisma.userServiceStatus.deleteMany();
    await prisma.pathWhitelist.deleteMany();
    await prisma.projectManager.deleteMany();
    await prisma.projectUser.deleteMany();
    await prisma.project.deleteMany();
    await prisma.environment.deleteMany();
    
    // Discover all environments
    const environments = discoverEnvironments(inventoryBasePath);
    if (environments.length === 0) {
      logger.warn('No environments discovered. Please check the inventory path.');
      return;
    }
    
    // Create environments in database
    const createdEnvironments = new Map<string, any>();
    for (const envConfig of environments) {
      const environment = await prisma.environment.create({
        data: {
          name: envConfig.name,
          displayName: envConfig.displayName,
          hostname: envConfig.hostname,
          ip: envConfig.ip,
          status: envConfig.status,
        },
      });
      createdEnvironments.set(envConfig.name, environment);
      logger.info(`Created environment: ${environment.displayName}`);
    }
    
    // Process each environment
    for (const envConfig of environments) {
      const envPath = path.join(inventoryBasePath, envConfig.name);
      const projectUsersData = loadProjectUsersData(envPath, envConfig.name);
      
      if (!projectUsersData) {
        continue;
      }
      
      const environment = createdEnvironments.get(envConfig.name);
      const customerData = projectUsersData.i4ops_customer;
      
      // Create projects
      const createdProjects = new Map<string, any>();
      if (customerData.projects) {
        for (const [projectKey, projectValue] of Object.entries(customerData.projects)) {
          const project = await prisma.project.create({
            data: {
              name: projectKey,
              displayName: customerData.pretty_name || projectKey,
              description: projectValue.description,
              projectId: projectValue.project_id,
              bizId: customerData.biz_id,
              status: 'active',
              environmentId: environment.id,
            },
          });
          createdProjects.set(projectKey, project);
          logger.info(`Created project: ${project.displayName} in ${environment.name}`);
          
          // Create path whitelists for this project
          if (projectValue.path_whitelists) {
            for (const whitelist of projectValue.path_whitelists) {
              await prisma.pathWhitelist.create({
                data: {
                  name: whitelist.name,
                  sources: whitelist.sources,
                  targetHost: whitelist.target?.host,
                  targetPath: whitelist.target?.path,
                  projectId: project.id,
                },
              });
            }
          }
        }
      }
      
      // Create project managers
      if (customerData.managers) {
        for (const managerItem of customerData.managers) {
          const managerKey = managerItem.key;
          const managerValue = managerItem.value;
          
          // Find associated projects
          const associatedProjects = managerValue.projects || [];
          for (const projectName of associatedProjects) {
            const project = createdProjects.get(projectName);
            if (project) {
              await prisma.projectManager.create({
                data: {
                  username: managerKey,
                  name: managerValue.name,
                  email: managerValue.email,
                  managerId: managerValue.id,
                  projectId: project.id,
                  status: 'active',
                  environmentId: environment.id,
                  // Note: We don't store the actual password hash for security
                },
              });
              logger.info(`Created manager: ${managerValue.name} for project ${projectName}`);
            }
          }
        }
      }
      
      // Create project users
      if (customerData.users) {
        for (const userItem of customerData.users) {
          const username = userItem.key;
          const userValue = userItem.value;
          
          // Calculate VNC ports
          const { vncDisplay, vncPort, webPort } = calculateVncPorts(username);
          
          const user = await prisma.projectUser.create({
            data: {
              username,
              name: userValue.name,
              email: userValue.email,
              status: 'active',
              vncDisplay,
              vncPort,
              webPort,
              homeDirectory: `/home/${username}`,
              environmentId: environment.id,
            },
          });
          
          logger.info(`Created user: ${userValue.name} (@${username}) with VNC ports ${vncDisplay}:${vncPort}`);
          
          // Connect user to projects
          const associatedProjects = userValue.projects || [];
          for (const projectName of associatedProjects) {
            const project = createdProjects.get(projectName);
            if (project) {
              await prisma.project.update({
                where: { id: project.id },
                data: {
                  users: {
                    connect: { id: user.id }
                  }
                }
              });
              logger.info(`Connected user ${username} to project ${projectName}`);
            }
          }
          
          // Create default service status entries
          const services = ['vnc', 'nginx', 'home_directory', 'ssh_access'];
          for (const service of services) {
            await prisma.userServiceStatus.create({
              data: {
                userId: user.id,
                service,
                status: 'unknown',
                lastCheck: new Date(),
                errorMsg: 'Not yet checked',
              },
            });
          }
        }
      }
    }
    
    // Print summary
    const summary = await Promise.all([
      prisma.environment.count(),
      prisma.project.count(),
      prisma.projectUser.count(),
      prisma.projectManager.count(),
      prisma.pathWhitelist.count(),
      prisma.userServiceStatus.count(),
    ]);

    logger.info(`Successfully populated database:
      - ${summary[0]} environments
      - ${summary[1]} projects
      - ${summary[2]} users
      - ${summary[3]} managers
      - ${summary[4]} path whitelists
      - ${summary[5]} service status entries`);
    
  } catch (error) {
    logger.error('Error populating from Ansible data:', error);
    throw error;
  }
}

// Run the population if this script is executed directly
if (require.main === module) {
  const inventoryPath = process.argv[2] || '/home/vt003/Desktop/i4infra/ansible/inv';
  
  populateFromAnsible(inventoryPath)
    .catch((error) => {
      console.error('Population failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { populateFromAnsible }; 