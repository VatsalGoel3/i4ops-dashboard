import cron from 'node-cron';
import { pollAllHostsSafe } from '../scripts/pollHosts';

export function startPollingJob() {
  console.log('[CRON] Scheduling host polling every 30 minutes');
  cron.schedule('*/30 * * * *', async () => {
    console.log(`[CRON] Running pollAllHostsSafe at ${new Date().toISOString()}`);
    await pollAllHostsSafe();
  });
}