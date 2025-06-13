import cron from 'node-cron';
import { pollAllHostsSafe } from '../scripts/pollHosts';
import { broadcast } from '../events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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

    console.log(`[CRON] Poll complete. Broadcasting updates...`);

    // Fetch and broadcast updated hosts
    const hosts = await prisma.host.findMany({ include: { vms: true } });
    broadcast('hosts-update', hosts);

    // Fetch and broadcast updated VMs
    const vms = await prisma.vM.findMany({ include: { host: { select: { id: true } } } });
    broadcast('vms-update', vms);

    console.log(`[CRON] Broadcast complete at ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[CRON] Polling failed:', e);
  } finally {
    isPolling = false;
  }
}