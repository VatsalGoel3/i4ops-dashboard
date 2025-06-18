import cron from 'node-cron';
import { pollAllHostsSafe } from '../scripts/pollHosts';
import { broadcast } from '../events';
import { PrismaClient, VMStatus } from '@prisma/client';
import { NodeSSH } from 'node-ssh';

const prisma = new PrismaClient();
let isPolling = false;

// SSH credentials from .env
const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;
const U0_IP = '100.76.195.14'; // hardcoded as requested

export function startPollingJob() {
  console.log('[CRON] Running initial poll on server startup...');
  triggerPoll();
  pollVMTelemetry(); // run immediately

  console.log('[CRON] Scheduling host polling every 30 minutes...');
  cron.schedule('*/30 * * * *', () => {
    triggerPoll();
  });

  console.log('[CRON] Scheduling VM telemetry polling every 2 minutes...');
  cron.schedule('*/2 * * * *', () => {
    pollVMTelemetry();
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

    const hosts = await prisma.host.findMany({ include: { vms: true } });
    broadcast('hosts-update', hosts);

    const vms = await prisma.vM.findMany({ include: { host: { select: { id: true } } } });
    broadcast('vms-update', vms);

    console.log(`[CRON] Broadcast complete at ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[CRON] Polling failed:', e);
  } finally {
    isPolling = false;
  }
}

async function pollVMTelemetry() {
  console.log('→ Starting VM telemetry poll via SSH from u0...');
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: U0_IP,
      username: SSH_USER,
      password: SSH_PASSWORD,
      readyTimeout: 15_000
    });

    const listResult = await ssh.execCommand('ls /mnt/vm-telemetry-json');
    const files = listResult.stdout.split('\n').filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = `/mnt/vm-telemetry-json/${file}`;
      const { stdout } = await ssh.execCommand(`cat ${filePath}`);

      try {
        const json = JSON.parse(stdout);
        const { machineId, cpu, ram, disk, uptime } = json;
        if (!machineId) continue;

        await prisma.vM.updateMany({
          where: { machineId },
          data: {
            cpu,
            ram,
            disk,
            uptime,
            status: VMStatus.running,
          }
        });

        console.log(`✔️ Updated VM telemetry for machineId=${machineId}`);
      } catch (err) {
        console.error(`⚠️ Failed to parse ${file}:`, err);
      }
    }

    ssh.dispose();
    console.log('✅ VM telemetry polling complete.');
  } catch (err) {
    console.error('❌ VM telemetry poll failed:', err);
  }
}