import { Router } from 'express';
import { HealthMonitor } from '../infrastructure/health-monitor';
import { getConnectedClients } from '../events';
import { securityStream } from './security-events.routes';

const router = Router();
const healthMonitor = new HealthMonitor();

// Add security log parser health check
healthMonitor.addHealthCheck('security-parser', async () => {
  // This would be injected from the polling scheduler
  return {
    service: 'security-parser',
    status: 'healthy', // TODO: Get actual status from parser
    message: 'Security log parser running',
    timestamp: Date.now()
  };
});

// Add security event stream health check
healthMonitor.addHealthCheck('security-stream', async () => {
  const stats = securityStream.getStats();
  
  return {
    service: 'security-stream',
    status: 'healthy',
    message: `Security event stream active with ${stats.connectedClients} clients`,
    timestamp: Date.now(),
    metrics: stats
  };
});

router.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.checkHealth();
    
    const httpStatus = health.overall === 'healthy' ? 200 : 
                      health.overall === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json(health);
  } catch (error) {
    res.status(503).json({
      overall: 'unhealthy',
      services: [],
      timestamp: Date.now(),
      uptime: 0,
      error: (error as Error).message
    });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await healthMonitor.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get metrics',
      details: (error as Error).message
    });
  }
});

router.get('/health/summary', async (req, res) => {
  try {
    await healthMonitor.logHealthSummary();
    res.json({ message: 'Health summary logged' });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to log health summary',
      details: (error as Error).message
    });
  }
});

export default router; 