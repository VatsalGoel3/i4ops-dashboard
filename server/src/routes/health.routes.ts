import { Router } from 'express';
import { HealthMonitor } from '../infrastructure/health-monitor';
import { getConnectedClients } from '../events';

const router = Router();
const healthMonitor = new HealthMonitor();

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