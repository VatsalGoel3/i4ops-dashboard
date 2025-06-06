// server/scripts/pollHosts.ts

/**
 * Poll each host over SSH, gather system stats (OS, uptime, load, RAM, Disk),
 * and upsert into Postgres. We skip any VM/virsh logic for now.
 *
 * Usage:
 *   1) In server/.env, set SSH_USER="i4ops" and SSH_PASSWORD="<your_password>".
 *   2) Make sure your Host table is seeded with each { name, ip }.
 *   3) Run: `npm run poll`.
 */

import dotenv from 'dotenv';
import { NodeSSH, Config as SSHConfig } from 'node-ssh';
import { PrismaClient, Host, VM } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const ssh = new NodeSSH();

const SSH_USER = process.env.SSH_USER || 'i4ops';
const SSH_PASSWORD = process.env.SSH_PASSWORD;
if (!SSH_PASSWORD) {
  console.error('ERROR: SSH_PASSWORD not set in .env');
  process.exit(1);
}

/**
 * Run a single SSH command on a given IP. Returns stdout or null on error.
 */
async function runSSHCommand(ip: string, command: string): Promise<string | null> {
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

/**
 * Parse RAM usage from `free -m` output.
 * Returns used% (e.g. 62.3).
 */
function parseFreeOut(output: string): number {
  // Example lines:
  //               total        used        free      shared  buff/cache   available
  // Mem:           7974        2104         980         173        4889        5382
  const lines = output.split('\n');
  const memLine = lines.find(l => l.toLowerCase().startsWith('mem:'));
  if (!memLine) return 0;
  const parts = memLine.trim().split(/\s+/);
  const total = parseFloat(parts[1]);
  const used = parseFloat(parts[2]);
  return Math.round((used / total) * 10) / 10; // one decimal place
}

/**
 * Parse Disk usage (root partition) from `df -h /`.
 * Returns used% (e.g. 43).
 */
function parseDfRoot(output: string): number {
  // Example:
  // Filesystem      Size  Used Avail Use% Mounted on
  // /dev/vda1        50G   20G   27G  43% /
  const lines = output.split('\n');
  if (lines.length < 2) return 0;
  const cols = lines[1].trim().split(/\s+/);
  // cols = ['/dev/vda1','50G','20G','27G','43%','/']
  const usePercent = cols[4]; // '43%'
  return parseFloat(usePercent.replace('%', ''));
}

/**
 * Parse uptime in seconds from /proc/uptime.
 */
function parseUptime(output: string): number {
  // Example: "123456.78 23456.90"
  const parts = output.trim().split(/\s+/);
  return Math.floor(parseFloat(parts[0]));
}

/**
 * Parse 1-minute load average from /proc/loadavg.
 * Returns a number like 0.05 or 1.23.
 */
function parseLoadAvg(output: string): number {
  // /proc/loadavg example: "0.05 0.02 0.01 1/123 4567"
  const parts = output.trim().split(/\s+/);
  const oneMin = parseFloat(parts[0]);
  return Math.round(oneMin * 100) / 100; // two decimal places
}

async function pollAllHosts() {
  console.log('Starting poll at', new Date().toISOString());

  // 1) Read all Host records (with their existing VMs, if any)
  const hosts: Host[] = await prisma.host.findMany({ include: { vms: true } });

  for (const host of hosts) {
    console.log(`→ Polling host ${host.name} (${host.ip})`);
    // 2) Check uptime (if this fails, SSH likely failed)
    const uptimeOut = await runSSHCommand(host.ip, 'cat /proc/uptime');
    if (!uptimeOut) {
      console.log(`   • ${host.ip} unreachable → marking status=down`);
      // Mark the host down
      await prisma.host.update({
        where: { id: host.id },
        data: { status: 'down', ssh: false, uptime: 0, cpu: 0, ram: 0, disk: 0 }
      });
      // Optionally mark its VMs offline
      await prisma.vM.updateMany({
        where: { hostId: host.id },
        data: { status: 'offline', cpu: 0, ram: 0, disk: 0 }
      });
      continue;
    }

    // 3) Read OS from /etc/os-release (PRETTY_NAME)
    const osRelease = await runSSHCommand(host.ip, 'cat /etc/os-release');
    let osLine = host.os;
    if (osRelease) {
      const match = osRelease
        .split('\n')
        .find(l => l.startsWith('PRETTY_NAME='));
      if (match) {
        osLine = match.split('=')[1].replace(/"/g, '');
      }
    }

    // 4) Uptime in seconds
    const uptimeSecs = parseUptime(uptimeOut);

    // 5) 1-minute load average
    const loadOut = await runSSHCommand(host.ip, 'cat /proc/loadavg');
    const cpuLoad = loadOut ? parseLoadAvg(loadOut) : 0;

    // 6) RAM usage %
    const freeOut = await runSSHCommand(host.ip, 'free -m');
    const ramUsage = freeOut ? parseFreeOut(freeOut) : 0;

    // 7) Disk usage % (root)
    const dfOut = await runSSHCommand(host.ip, 'df -h /');
    const diskUsage = dfOut ? parseDfRoot(dfOut) : 0;

    // 8) Upsert Host with new metrics (leave manual fields unchanged)
    await prisma.host.update({
      where: { id: host.id },
      data: {
        os: osLine,
        uptime: uptimeSecs,
        status: 'up',
        ssh: true,
        cpu: cpuLoad,
        ram: ramUsage,
        disk: diskUsage
      }
    });

    // 9) We skip VM/virsh logic for now
    console.log(
      `   • Updated host ${host.name}: load=${cpuLoad}, RAM=${ramUsage}%, Disk=${diskUsage}%`
    );
  }

  console.log('Poll complete at', new Date().toISOString());
  process.exit(0);
}

pollAllHosts().catch(err => {
  console.error('Fatal error in pollHosts:', err);
  process.exit(1);
});