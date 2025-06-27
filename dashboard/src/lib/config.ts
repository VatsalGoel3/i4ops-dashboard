// Centralized configuration for deployment flexibility
interface AppConfig {
  api: {
    baseUrl: string;
    host: string;
    port: number;
    timeout: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

// Helper to get environment variable with fallback
function getEnvVar(key: string, fallback: string): string {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} not found, using fallback: ${fallback}`);
    return fallback;
  }
  return value;
}

// Smart API URL construction
function buildApiUrl(): string {
  const baseUrl = getEnvVar('VITE_API_BASE_URL', '');
  
  if (baseUrl) {
    return baseUrl;
  }

  // Fallback: construct from host/port
  const host = getEnvVar('VITE_API_HOST', 'localhost');
  const port = getEnvVar('VITE_API_PORT', '4000');
  
  // Auto-detect protocol based on environment
  const protocol = host === 'localhost' || host.startsWith('192.168.') ? 'http' : 'https';
  
  return `${protocol}://${host}:${port}/api`;
}

export const config: AppConfig = {
  api: {
    baseUrl: buildApiUrl(),
    host: getEnvVar('VITE_API_HOST', 'localhost'),
    port: parseInt(getEnvVar('VITE_API_PORT', '4000'), 10),
    timeout: 30000, // 30 seconds
  },
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL', ''),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),
  },
  app: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  },
};

// Validation on load
if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Missing required Supabase configuration. Check your .env file.');
}

// Debug logging in development
if (config.app.isDevelopment) {
  console.log('App Configuration:', {
    apiBaseUrl: config.api.baseUrl,
    environment: import.meta.env.MODE,
    supabaseUrl: config.supabase.url,
  });
}

export default config; 