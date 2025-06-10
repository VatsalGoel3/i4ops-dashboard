import cron from 'node-cron';
import { pollAllHostsSafe } from '../scripts/pollHosts';

let isPolling = false;

export function startPollingJob() {
  console.log('[CRON] Running initial poll on server startup...');
  triggerPoll();

  console.log('[CRON] Scheduling host polling every 30 minutes...');
  cron.schedule('*/30 * * * *', () => {
    triggerPoll();
  });
}

async function triggerPoll() {
  if (isPolling) {
    console.log('[CRON] Poll already in progress. Skipping...');
    return;
  }

  try {
    isPolling = true;
    console.log(`[CRON] Starting poll at ${new Date().toISOString()}`);
    await pollAllHostsSafe();
    console.log(`[CRON] Poll complete at ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[CRON] Polling failed:', e);
  } finally {
    isPolling = false;
  }
}