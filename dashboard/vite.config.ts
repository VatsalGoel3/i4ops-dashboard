import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Extract API configuration
  const apiHost = env.VITE_API_HOST || 'localhost';
  const apiPort = env.VITE_API_PORT || '4000';
  const apiTarget = `http://${apiHost}:${apiPort}`;

  return {
    plugins: [react()],
    server: {
      host: true,        
      port: 8888,           
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Environment variables that start with VITE_ are exposed to client
    define: {
      __DEV_API_TARGET__: JSON.stringify(apiTarget),
    },
  };
});