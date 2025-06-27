import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000'),
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // SSH Configuration
  SSH_USERNAME: process.env.SSH_USERNAME || 'i4ops',
  SSH_PASSWORD: process.env.SSH_PASSWORD!,
  SSH_TIMEOUT: parseInt(process.env.SSH_TIMEOUT || '30') * 1000, // Convert to milliseconds
  
  // u0 Log Collection
  U0_HOST: process.env.U0_HOST || 'u0',
  U0_IP: process.env.U0_IP || '100.76.195.14',
  LOG_SYNC_INTERVAL: parseInt(process.env.LOG_SYNC_INTERVAL || '60') * 1000, // Convert to milliseconds
  LOG_BASE_PATH: process.env.LOG_BASE_PATH || '/mnt/vm-security',
  
  // Tailscale OAuth
  TS_OAUTH_CLIENT_ID: process.env.TS_OAUTH_CLIENT_ID,
  TS_OAUTH_CLIENT_SECRET: process.env.TS_OAUTH_CLIENT_SECRET,
  TAILNET: process.env.TAILNET,
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function validateEnv() {
  const required = ['DATABASE_URL', 'SSH_PASSWORD'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  
  // Validate numeric values
  if (isNaN(env.PORT)) {
    throw new Error('PORT must be a valid number');
  }
  
  if (isNaN(env.SSH_TIMEOUT)) {
    throw new Error('SSH_TIMEOUT must be a valid number');
  }
  
  if (isNaN(env.LOG_SYNC_INTERVAL)) {
    throw new Error('LOG_SYNC_INTERVAL must be a valid number');
  }
}

validateEnv(); 