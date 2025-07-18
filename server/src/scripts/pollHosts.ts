import dotenv from 'dotenv';
import { NodeSSH, Config as SSHConfig } from 'node-ssh';
import { PrismaClient, Host, HostStatus, VMStatus } from '@prisma/client';
import { updateIPsFromTailscale } from './sync-IPs';

dotenv.config();

const prisma = new PrismaClient();
const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;

if (!SSH_PASSWORD) {
  console.error('ERROR: SSH_PASSWORD not set in .env');
  process.exit(1);
}

async function logPollSnapshot(up: number, down: number) {
  await prisma.pollHistory.create({
    data: { up, down },
  });
}

async function runSSHCommand(ip: string, command: string): Promise<string | null> {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: ip,
      username: SSH_USER,
      password: SSH_PASSWORD,
      readyTimeout: 15_000,
      tryKeyboard: false
    } as SSHConfig);

    const result = await ssh.execCommand(command, { cwd: '/' });
    ssh.dispose();

    if (result.stderr && !result.stdout) {
      console.error(`SSH ${ip} stderr:`, result.stderr.trim());
      return null;
    }
    return result.stdout.trim();
  } catch (err) {
    console.error(`SSH connection to ${ip} failed:`, (err as any).message || err);
    return null;
  }
}

function parseFreeOut(output: string): number {
  const lines = output.split('\n');
  const memLine = lines.find(l => l.toLowerCase().startsWith('mem:'));
  if (!memLine) return 0;
  const parts = memLine.trim().split(/\s+/);
  const total = parseFloat(parts[1]);
  const used = parseFloat(parts[2]);
  return Math.round((used / total) * 10) / 10;
}

function parseDfRoot(output: string): number {
  const lines = output.split('\n');
  if (lines.length < 2) return 0;
  const cols = lines[1].trim().split(/\s+/);
  return parseFloat(cols[4].replace('%', ''));
}

function parseUptime(output: string): number {
  const parts = output.trim().split(/\s+/);
  return Math.floor(parseFloat(parts[0]));
}

function parseLoadAvg(output: string): number {
  const parts = output.trim().split(/\s+/);
  return Math.round(parseFloat(parts[0]) * 100) / 100;
}

export async function pollAllHosts(): Promise<void> {
  console.log('→ Syncing IPs from Tailscale API...');
  await updateIPsFromTailscale();

  console.log('Starting poll at', new Date().toISOString());
  const hosts: Host[] = await prisma.host.findMany({ include: { vms: true } });

  // Process hosts in batches of 5 for concurrency control
  for (let i = 0; i < hosts.length; i += 5) {
    const batch = hosts.slice(i, i + 5);
    await Promise.all(
      batch.map(async (host) => {
        console.log(`→ Polling host ${host.name} (${host.ip})`);

        const uptimeOut = await runSSHCommand(host.ip, 'cat /proc/uptime');

        // Unreachable host
        if (!uptimeOut) {
          console.log(`   • ${host.ip} unreachable → marking status=down`);

          await prisma.$transaction([
            prisma.host.update({
              where: { id: host.id },
              data: {
                status: 'down' as HostStatus,
                ssh: false,
                uptime: 0,
                cpu: 0,
                ram: 0,
                disk: 0
              }
            }),
            prisma.vM.updateMany({
              where: { hostId: host.id },
              data: {
                status: 'offline' as VMStatus,
                cpu: 0,
                ram: 0,
                disk: 0
              }
            })
          ]);

          return;
        }

        // Reachable host
        const osRelease = await runSSHCommand(host.ip, 'cat /etc/os-release');
        let osLine = host.os;
        if (osRelease) {
          const match = osRelease.split('\n').find((l) => l.startsWith('PRETTY_NAME='));
          if (match) {
            osLine = match.split('=')[1].replace(/"/g, '');
          }
        }

        const uptimeSecs = parseUptime(uptimeOut);
        const loadOut = await runSSHCommand(host.ip, 'cat /proc/loadavg');
        const cpuLoad = loadOut ? parseLoadAvg(loadOut) : 0;
        const freeOut = await runSSHCommand(host.ip, 'free -m');
        const ramUsage = freeOut ? parseFreeOut(freeOut) : 0;
        const dfOut = await runSSHCommand(host.ip, 'df -h /');
        const diskUsage = dfOut ? parseDfRoot(dfOut) : 0;

        await prisma.$transaction([
          prisma.host.update({
            where: { id: host.id },
            data: {
              os: osLine,
              uptime: uptimeSecs,
              status: 'up' as HostStatus,
              ssh: true,
              cpu: cpuLoad,
              ram: ramUsage,
              disk: diskUsage,
            },
          }),
          prisma.vM.updateMany({
            where: { hostId: host.id },
            data: {
              // Adjust this logic if needed — setting default for now
              status: 'running' as VMStatus,
              cpu: 0,
              ram: 0,
              disk: 0
            }
          })
        ]);

        console.log(
          `   • Updated host ${host.name}: load=${cpuLoad}, RAM=${ramUsage}%, Disk=${diskUsage}%`
        );
      })
    );
  }

  console.log('Poll complete at', new Date().toISOString());

  const updatedHosts = await prisma.host.findMany();
  const upCount = updatedHosts.filter((h) => h.status === 'up').length;
  const downCount = updatedHosts.length - upCount;

  await logPollSnapshot(upCount, downCount);
}

export async function pollAllHostsSafe(): Promise<void> {
  try {
    await pollAllHosts();
  } catch (err) {
    console.error('Fatal error in pollHosts:', err);
  }
}