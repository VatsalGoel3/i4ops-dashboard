import { z } from 'zod';

// Enums
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended']);
export const ProjectStatusSchema = z.enum(['active', 'inactive', 'archived']);

// Environment Schema
export const EnvironmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  hostname: z.string().nullable(),
  ip: z.string().nullable(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Project Schema
export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  projectId: z.string().nullable(),
  bizId: z.string().nullable(),
  status: ProjectStatusSchema,
  environmentId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Project User Schema
export const ProjectUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  status: UserStatusSchema,
  vncDisplay: z.number().nullable(),
  vncPort: z.number().nullable(),
  webPort: z.number().nullable(),
  homeDirectory: z.string().nullable(),
  environmentId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Project Manager Schema
export const ProjectManagerSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  projectId: z.number(),
  managerId: z.string().nullable(),
  passwordHash: z.string().nullable(),
  status: UserStatusSchema,
  environmentId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Path Whitelist Schema
export const PathWhitelistSchema = z.object({
  id: z.number(),
  name: z.string(),
  sources: z.array(z.string()),
  targetHost: z.string().nullable(),
  targetPath: z.string().nullable(),
  projectId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User Service Status Schema
export const UserServiceStatusSchema = z.object({
  id: z.number(),
  userId: z.number(),
  service: z.string(),
  status: z.string(),
  lastCheck: z.date(),
  errorMsg: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Extended schemas with relations for API responses
export const ProjectUserWithRelationsSchema = ProjectUserSchema.extend({
  environment: EnvironmentSchema,
  projects: z.array(ProjectSchema),
  serviceStatus: z.array(UserServiceStatusSchema),
});

export const ProjectWithRelationsSchema = ProjectSchema.extend({
  environment: EnvironmentSchema,
  users: z.array(ProjectUserSchema),
  managers: z.array(ProjectManagerSchema),
  pathWhitelists: z.array(PathWhitelistSchema),
});

export const EnvironmentWithRelationsSchema = EnvironmentSchema.extend({
  projects: z.array(ProjectSchema),
  users: z.array(ProjectUserSchema),
});

// Access URL Schema for frontend
export const UserAccessInfoSchema = z.object({
  username: z.string(),
  tailscaleUrl: z.string().nullable(),
  tailscaleIpUrl: z.string().nullable(),
  vncPort: z.number().nullable(),
  webPort: z.number().nullable(),
  status: z.string(),
  lastCheck: z.date().nullable(),
});

// Filter schemas for API queries
export const UserFiltersSchema = z.object({
  environment: z.string().optional(),
  project: z.string().optional(),
  status: UserStatusSchema.optional(),
  search: z.string().optional(),
});

export const ProjectFiltersSchema = z.object({
  environment: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  search: z.string().optional(),
});

// TypeScript types
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectUser = z.infer<typeof ProjectUserSchema>;
export type ProjectManager = z.infer<typeof ProjectManagerSchema>;
export type PathWhitelist = z.infer<typeof PathWhitelistSchema>;
export type UserServiceStatus = z.infer<typeof UserServiceStatusSchema>;

export type ProjectUserWithRelations = z.infer<typeof ProjectUserWithRelationsSchema>;
export type ProjectWithRelations = z.infer<typeof ProjectWithRelationsSchema>;
export type EnvironmentWithRelations = z.infer<typeof EnvironmentWithRelationsSchema>;
export type UserAccessInfo = z.infer<typeof UserAccessInfoSchema>;
export type UserFilters = z.infer<typeof UserFiltersSchema>;
export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>; 