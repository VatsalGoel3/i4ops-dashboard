import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  SSH_USER: z.string().min(1),
  SSH_PASSWORD: z.string().min(1),
  U0_IP: z.string().ip().default('100.76.195.14'),
  TS_OAUTH_CLIENT_ID: z.string().min(1),
  TS_OAUTH_CLIENT_SECRET: z.string().min(1),
  TAILNET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  SECURITY_LOG_DIR: z.string().default('/mnt/vm-security'),
  SECURITY_EVENT_RETENTION_DAYS: z.string().transform(Number).default('7')
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    console.error(result.error.errors);
    process.exit(1);
  }
  
  return result.data;
}

export const env = validateEnv(); 