import { NodeSSH } from 'node-ssh';
import { PrismaClient } from '@prisma/client';
import { VMStatus } from '@prisma/client';

const prisma = new PrismaClient();
const ssh = new NodeSSH();

const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;
const U0_IP = process.env.U0_IP || '100.76.195.14'; // replace if needed

export async function pollVMsFromTelemetry() {
  try {
    console.log('→ Starting VM telemetry poll via SSH from u0...');
    await ssh.connect({
      host: U0_IP,
      username: SSH_USER,
      password: SSH_PASSWORD,
      readyTimeout: 15_000,
    });

    // Read all files in telemetry directory
    const fileList = await ssh.execCommand('ls /mnt/vm-telemetry-json');
    const files = fileList.stdout.split('\n').filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = `/mnt/vm-telemetry-json/${file}`;
      const { stdout: content } = await ssh.execCommand(`cat ${filePath}`);
      try {
        const data = JSON.parse(content);
        const {
          machineId,
          cpu,
          ram,
          disk,
          uptime,
        } = data;

        if (!machineId) continue;

        await prisma.vM.updateMany({
          where: { machineId },
          data: {
            cpu,
            ram,
            disk,
            uptime,
            status: VMStatus.running, // assume running if reporting
          },
        });

        console.log(`✔️ Updated VM with machineId=${machineId}`);
      } catch (err) {
        console.error(`⚠️ Error parsing ${file}:`, err);
      }
    }

    ssh.dispose();
    console.log('VM telemetry polling complete.');
  } catch (err) {
    console.error('Fatal error in VM telemetry poller:', err);
  }
}