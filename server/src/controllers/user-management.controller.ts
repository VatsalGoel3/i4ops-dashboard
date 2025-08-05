import { Request, Response } from 'express';
import { UserManagementService } from '../services/user-management.service';
import { ServiceMonitorService } from '../services/service-monitor.service';
import { 
  UserFiltersSchema, 
  ProjectFiltersSchema
} from '../schemas/user-management.schema';
import { Logger } from '../infrastructure/logger';

const userManagementService = new UserManagementService();
const serviceMonitorService = new ServiceMonitorService();
const logger = new Logger('UserManagementController');

/**
 * GET /api/user-management/environments
 * Get all environments with basic information
 */
export async function getAllEnvironments(req: Request, res: Response) {
  try {
    logger.info('Fetching all environments');
    const environments = await userManagementService.getAllEnvironments();
    
    res.json({
      success: true,
      data: environments
    });
  } catch (error) {
    logger.error('Error fetching environments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/environments/:name
 * Get specific environment with detailed information
 */
export async function getEnvironmentByName(req: Request, res: Response) {
  try {
    const { name } = req.params;
    logger.info(`Fetching environment: ${name}`);
    
    const environment = await userManagementService.getEnvironmentByName(name);
    
    if (!environment) {
      return res.status(404).json({
        success: false,
        message: `Environment '${name}' not found`
      });
    }
    
    res.json({
      success: true,
      data: environment
    });
  } catch (error) {
    logger.error('Error fetching environment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/users
 * Get all users with optional filtering
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    // Validate and parse query parameters
    const filtersResult = UserFiltersSchema.safeParse(req.query);
    
    if (!filtersResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filter parameters',
        errors: filtersResult.error.errors
      });
    }
    
    const filters = filtersResult.data;
    logger.info('Fetching users with filters', filters);
    
    const users = await userManagementService.getAllUsers(filters);
    
    res.json({
      success: true,
      data: users,
      meta: {
        total: users.length,
        filters
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/users/:id
 * Get specific user by ID
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    logger.info(`Fetching user by ID: ${userId}`);
    const user = await userManagementService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/projects
 * Get all projects with optional filtering
 */
export async function getAllProjects(req: Request, res: Response) {
  try {
    // Validate and parse query parameters
    const filtersResult = ProjectFiltersSchema.safeParse(req.query);
    
    if (!filtersResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filter parameters',
        errors: filtersResult.error.errors
      });
    }
    
    const filters = filtersResult.data;
    logger.info('Fetching projects with filters', filters);
    
    const projects = await userManagementService.getAllProjects(filters);
    
    res.json({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        filters
      }
    });
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/users/:id/access
 * Get user access information including URLs
 */
export async function getUserAccess(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    const { environment } = req.query;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    if (!environment || typeof environment !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Environment parameter is required'
      });
    }
    
    logger.info(`Getting access info for user ${userId} in environment ${environment}`);
    const accessInfo = await userManagementService.getUserAccessInfo(userId, environment);
    
    if (!accessInfo) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found in environment ${environment}`
      });
    }
    
    res.json({
      success: true,
      data: accessInfo
    });
  } catch (error) {
    logger.error('Error fetching user access info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user access information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/statistics
 * Get user management statistics for dashboard
 */
export async function getStatistics(req: Request, res: Response) {
  try {
    logger.info('Fetching user management statistics');
    const statistics = await userManagementService.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * GET /api/user-management/search
 * Search across all user management entities
 */
export async function searchUserManagement(req: Request, res: Response) {
  try {
    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required'
      });
    }
    
    const searchLimit = limit && typeof limit === 'string' 
      ? Math.min(parseInt(limit), 100) 
      : 20;
    
    if (query.length < 2) {
      return res.json({
        success: true,
        data: { users: [], projects: [], environments: [] },
        meta: {
          query,
          limit: searchLimit,
          message: 'Query too short'
        }
      });
    }
    
    logger.info(`Searching for: ${query}`);
    const results = await userManagementService.search(query, searchLimit);
    
    res.json({
      success: true,
      data: results,
      meta: {
        query,
        limit: searchLimit,
        totalResults: results.users.length + results.projects.length + results.environments.length
      }
    });
  } catch (error) {
    logger.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 

/**
 * Get service health status for all users
 */
export const getServiceHealth = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching service health status');
    const healthData = await serviceMonitorService.checkAllUserServices();
    
    res.json({
      success: true,
      data: healthData,
      message: 'Service health data retrieved successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching service health:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service health status',
      details: errorMessage
    });
  }
};

/**
 * Get service health summary statistics
 */
export const getServiceHealthSummary = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching service health summary');
    const summary = await serviceMonitorService.getServiceHealthSummary();
    
    res.json({
      success: true,
      data: summary,
      message: 'Service health summary retrieved successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching service health summary:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service health summary',
      details: errorMessage
    });
  }
};

/**
 * Get service health for a specific user
 */
export const getUserServiceHealth = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID provided'
      });
    }

    logger.info(`Fetching service health for user ID: ${userId}`);
    
    // Get user data first
    const user = await userManagementService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check services for this specific user
    const healthData = await serviceMonitorService.checkUserServices(user);
    
    res.json({
      success: true,
      data: healthData,
      message: 'User service health retrieved successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching user service health:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user service health',
      details: errorMessage
    });
  }
}; 