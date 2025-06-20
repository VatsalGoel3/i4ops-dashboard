import cron from 'node-cron';
import { pollAllHostsSafe } from '../scripts/pollHosts';
import { broadcast } from '../events';
import { PrismaClient, VMStatus } from '@prisma/client';
import { NodeSSH } from 'node-ssh';

const prisma = new PrismaClient();
let isPolling = false;
let isVMPolling = false;

const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;
const U0_IP = '100.76.195.14';

export function startPollingJob() {
  console.log('[CRON] Running initial poll on server startup...');
  triggerPoll();
  pollVMTelemetry(); // immediate run

  console.log('[CRON] Scheduling host polling every 30 minutes...');
  cron.schedule('*/30 * * * *', triggerPoll);

  console.log('[CRON] Scheduling VM telemetry polling every 2 minutes...');
  cron.schedule('*/2 * * * *', pollVMTelemetry);
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

    console.log('[CRON] Poll complete. Broadcasting updates...');
    const hosts = await prisma.host.findMany({ include: { vms: true } });
    broadcast('hosts-update', hosts);

    const vms = await prisma.vM.findMany({ include: { host: { select: { id: true, name: true } } } });
    broadcast('vms-update', vms);

    console.log(`[CRON] Broadcast complete at ${new Date().toISOString()}`);
  } catch (e) {
    console.error('[CRON] Polling failed:', e);
  } finally {
    isPolling = false;
  }
}

async function pollVMTelemetry() {
  if (isVMPolling) {
    console.log('[VM POLL] Already in progress. Skipping...');
    return;
  }

  if (!SSH_PASSWORD) {
    console.error('[VM POLL] SSH_PASSWORD not set in .env');
    return;
  }

  console.log('[VM POLL] Starting VM telemetry poll via SSH from u0...');
  const ssh = new NodeSSH();

  try {
    isVMPolling = true;
    
    await ssh.connect({
      host: U0_IP,
      username: SSH_USER,
      password: SSH_PASSWORD,
      readyTimeout: 15_000,
    });

    const listResult = await ssh.execCommand('ls /mnt/vm-telemetry-json');
    const files = listResult.stdout.split('\n').filter((f) => f.endsWith('.json'));

    let updatedCount = 0;
    const startTime = Date.now();

    for (const file of files) {
      const filePath = `/mnt/vm-telemetry-json/${file}`;
      const { stdout } = await ssh.execCommand(`cat ${filePath}`);

      try {
        const data = JSON.parse(stdout);
        const {
          hostname,
          vmname,
          machineId,
          ip,
          os,
          cpu,
          ram,
          disk,
          uptime,
        } = data;

        if (!hostname || !machineId) {
          console.warn(`[VM POLL] Missing hostname or machineId in ${file}`);
          continue;
        }

        const host = await prisma.host.findUnique({ where: { name: hostname } });
        if (!host) {
          console.warn(`[VM POLL] Host '${hostname}' not found. Skipping VM '${vmname}'`);
          continue;
        }

        await prisma.vM.upsert({
          where: { machineId },
          create: {
            name: vmname,
            machineId,
            os,
            ip,
            cpu: parseFloat(cpu) || 0,
            ram: parseFloat(ram) || 0,
            disk: parseFloat(disk) || 0,
            uptime: parseInt(uptime) || 0,
            status: VMStatus.running,
            hostId: host.id,
          },
          update: {
            name: vmname,
            os,
            ip,
            cpu: parseFloat(cpu) || 0,
            ram: parseFloat(ram) || 0,
            disk: parseFloat(disk) || 0,
            uptime: parseInt(uptime) || 0,
            status: VMStatus.running,
            updatedAt: new Date(),
          },
        });

        updatedCount++;
        console.log(`[VM POLL] ✓ Synced VM '${vmname}' (${machineId}) on host '${hostname}'`);
      } catch (err) {
        console.error(`[VM POLL] Failed to parse or sync ${file}:`, err);
      }
    }

    ssh.dispose();
    
    const duration = Date.now() - startTime;
    console.log(`[VM POLL] Complete. Updated ${updatedCount} VMs in ${duration}ms`);

    // Broadcast VM updates
    const vms = await prisma.vM.findMany({ 
      include: { host: { select: { id: true, name: true } } } 
    });
    broadcast('vms-update', vms);

  } catch (err) {
    console.error('[VM POLL] Fatal error:', err);
  } finally {
    isVMPolling = false;
  }
}