import { Router } from 'express';
import {
  getAllEnvironments,
  getEnvironmentByName,
  getAllUsers,
  getUserById,
  getAllProjects,
  getUserAccess,
  getStatistics,
  searchUserManagement
} from '../controllers/user-management.controller';

const router = Router();

// Environment routes
router.get('/environments', getAllEnvironments);
router.get('/environments/:name', getEnvironmentByName);

// User routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/access', getUserAccess);

// Project routes
router.get('/projects', getAllProjects);

// Statistics and search
router.get('/statistics', getStatistics);
router.get('/search', searchUserManagement);

export default router; 