import fs from 'fs/promises';
import path from 'path';
import { PrismaClient, VMStatus } from '@prisma/client';

const prisma = new PrismaClient();
const TELEMETRY_DIR = '/mnt/vm-telemetry-json';
const STALE_THRESHOLD_SECONDS = 600; // 10 minutes

interface TelemetryJSON {
  hostname: string;
  vmname: string;
  machineId: string;
  cpu: number;
  ram: number;
  disk: number;
  uptime: number;
  timestamp: number;
}

async function readTelemetryFiles(): Promise<TelemetryJSON[]> {
  const files = await fs.readdir(TELEMETRY_DIR);
  const telemetry: TelemetryJSON[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const content = await fs.readFile(path.join(TELEMETRY_DIR, file), 'utf8');
      const data = JSON.parse(content) as TelemetryJSON;
      telemetry.push(data);
    } catch (err) {
      console.error(`⚠️  Failed to read ${file}:`, err);
    }
  }

  return telemetry;
}

async function pollVMsFromTelemetry() {
  console.log(`→ Reading telemetry from ${TELEMETRY_DIR}`);
  const entries = await readTelemetryFiles();
  const now = Math.floor(Date.now() / 1000);

  for (const entry of entries) {
    const age = now - entry.timestamp;
    const isStale = age > STALE_THRESHOLD_SECONDS;

    const vm = await prisma.vM.findUnique({
      where: { machineId: entry.machineId },
    });

    if (!vm) {
      console.warn(`⚠️  No VM found with machineId ${entry.machineId} (from ${entry.vmname})`);
      continue;
    }

    if (isStale) {
      console.warn(`⚠️  Stale telemetry for ${vm.name} (age: ${age}s) → skipping`);
      continue;
    }

    await prisma.vM.update({
      where: { id: vm.id },
      data: {
        cpu: entry.cpu,
        ram: entry.ram,
        disk: entry.disk,
        uptime: entry.uptime,
        status: VMStatus.running,
      },
    });

    console.log(`✅ Updated ${vm.name}: CPU=${entry.cpu} RAM=${entry.ram}% Disk=${entry.disk}%`);
  }

  console.log(`✓ Telemetry VM polling complete.`);
}

pollVMsFromTelemetry()
  .catch((err) => {
    console.error('❌ Fatal error in VM telemetry poller:', err);
  })
  .finally(() => prisma.$disconnect());