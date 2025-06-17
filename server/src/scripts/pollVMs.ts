import dotenv from 'dotenv';
import { NodeSSH } from 'node-ssh';
import { PrismaClient, VMStatus } from '@prisma/client';
import pLimit from 'p-limit';

dotenv.config();

const prisma = new PrismaClient();
const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;

const SLEEP_INTERVAL = 60000; // 60s
const USER_HZ = 100;

if (!SSH_PASSWORD) {
  console.error('ERROR: SSH_PASSWORD not set in .env');
  process.exit(1);
}

async function runSSHCommand(ssh: NodeSSH, cmd: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await ssh.execCommand(cmd, { cwd: '/' });
    if (stderr && !stdout) {
      return null;
    }
    return stdout.trim();
  } catch {
    return null;
  }
}

async function parseQemuVMs(ip: string): Promise<any[]> {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({ host: ip, username: SSH_USER, password: SSH_PASSWORD });

    const psOut = await runSSHCommand(ssh, `ps -eo pid,cmd | grep '[q]emu-kvm'`);
    if (!psOut) return [];

    const vms: any[] = [];

    for (const line of psOut.split('\n').filter(Boolean)) {
      const [pid] = line.trim().split(/\s+/, 2);
      const nameMatch = line.match(/-name guest=([^ ,]+)/);
      const name = nameMatch ? nameMatch[1] : `vm-${pid}`;

      const readProc = async () => {
        const [stat, status, io, etime] = await Promise.all([
          runSSHCommand(ssh, `cat /proc/${pid}/stat`),
          runSSHCommand(ssh, `cat /proc/${pid}/status`),
          runSSHCommand(ssh, `cat /proc/${pid}/io`),
          runSSHCommand(ssh, `ps -p ${pid} -o etimes=`),
        ]);

        const cpuTicks = (() => {
          const parts = stat?.split(' ') || [];
          return parseInt(parts[13] || '0') + parseInt(parts[14] || '0');
        })();

        const ramKib = (() => {
          const match = status?.match(/VmRSS:\s+(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })();

        const readBytes = (() => {
          const match = io?.match(/read_bytes:\s+(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })();

        const writeBytes = (() => {
          const match = io?.match(/write_bytes:\s+(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })();

        const uptimeSec = parseInt(etime || '0');

        return { cpuTicks, ramKib, readBytes, writeBytes, uptimeSec };
      };

      const before = await readProc();
      await new Promise((r) => setTimeout(r, SLEEP_INTERVAL));
      const after = await readProc();

      const deltaCpu = after.cpuTicks - before.cpuTicks;
      const cpuPct = (deltaCpu / (SLEEP_INTERVAL / 1000) / USER_HZ) * 100;
      const totalMem = 1024 * 1024 * 16; // 16 GiB host
      const ramPct = (after.ramKib / totalMem) * 100;
      const ioRate = (after.readBytes + after.writeBytes - before.readBytes - before.writeBytes) / (SLEEP_INTERVAL / 1000);

      vms.push({
        name,
        cpu: parseFloat(cpuPct.toFixed(2)),
        ram: parseFloat(ramPct.toFixed(2)),
        diskIoRate: Math.round(ioRate),
        uptime: after.uptimeSec,
      });
    }

    return vms;
  } catch (err) {
    console.error(`[pollVMs] Failed on ${ip}:`, (err as Error).message);
    return [];
  } finally {
    ssh.dispose();
  }
}

export async function pollAllVMs(): Promise<void> {
  const hosts = await prisma.host.findMany({ select: { id: true, ip: true, name: true } });
  const limit = pLimit(3);

  await Promise.all(
    hosts.map((host) =>
      limit(async () => {
        console.log(`→ Polling VMs on host ${host.name} (${host.ip})`);
        const vms = await parseQemuVMs(host.ip);

        for (const vm of vms) {
          try {
            await prisma.vM.update({
              where: { name_hostId: { name: vm.name, hostId: host.id } },
              data: {
                cpu: vm.cpu,
                ram: vm.ram,
                diskIoRate: vm.diskIoRate,
                uptime: vm.uptime,
                status: VMStatus.running,
              },
            });

            console.log(`   • Updated VM ${vm.name} on ${host.name}`);
          } catch (err) {
            console.error(`   ✘ VM ${vm.name} not found on ${host.name}`);
          }
        }
      })
    )
  );

  console.log('→ VM poll complete.');
}

export async function pollAllVMsSafe(): Promise<void> {
  try {
    await pollAllVMs();
  } catch (err) {
    console.error('Fatal error in pollVMs:', (err as Error).message);
  }
}