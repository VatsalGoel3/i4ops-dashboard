import { NodeSSH } from 'node-ssh';
import { PrismaClient, VMStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ssh = new NodeSSH();

const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;
const U0_IP = process.env.U0_IP || '100.76.195.14';

export async function pollVMsFromTelemetry() {
  console.log('→ Starting VM telemetry poll via SSH from u0...');

  if (!SSH_PASSWORD) {
    console.error('❌ SSH_PASSWORD not set in .env');
    return;
  }

  try {
    await ssh.connect({
      host: U0_IP,
      username: SSH_USER,
      password: SSH_PASSWORD,
      readyTimeout: 15000,
    });

    const fileList = await ssh.execCommand('ls /mnt/vm-telemetry-json');
    const files = fileList.stdout.split('\n').filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
      console.warn('⚠️ No telemetry files found in /mnt/vm-telemetry-json');
    }

    for (const file of files) {
      console.log(`📄 Reading file: ${file}`);
      const filePath = `/mnt/vm-telemetry-json/${file}`;
      const { stdout: content } = await ssh.execCommand(`cat ${filePath}`);

      try {
        const data = JSON.parse(content);
        console.log('🧪 Parsed data:', data);

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
          console.warn(`⚠️ Missing hostname or machineId in file ${file}`);
          continue;
        }

        const host = await prisma.host.findUnique({ where: { name: hostname } });

        if (!host) {
          console.warn(`⚠️ Host '${hostname}' not found in DB. Skipping VM '${vmname}'`);
          continue;
        }

        const updated = await prisma.vM.upsert({
          where: { machineId },
          create: {
            name: vmname,
            machineId,
            os,
            ip,
            cpu,
            ram,
            disk,
            uptime,
            status: VMStatus.running,
            hostId: host.id,
          },
          update: {
            name: vmname,
            os,
            ip,
            cpu,
            ram,
            disk,
            uptime,
            status: VMStatus.running,
            updatedAt: new Date(),
            hostId: host.id,
          },
        });

        console.log(`✔️ Synced VM '${vmname}' (${machineId}) on host '${hostname}'`);
      } catch (err) {
        console.error(`🚨 Failed to parse or update for file ${file}:`, err);
      }
    }

    ssh.dispose();
    console.log('✅ VM telemetry polling complete.');
  } catch (err) {
    console.error('🚨 Fatal error in VM telemetry poller:', err);
  }
}

// Run manually from CLI
if (require.main === module) {
  pollVMsFromTelemetry()
    .then(() => {
      console.log('📦 Finished manual run of pollVMsFromTelemetry.ts');
    })
    .catch((err) => {
      console.error('🚨 Uncaught error in pollVMsFromTelemetry.ts:', err);
    });
}