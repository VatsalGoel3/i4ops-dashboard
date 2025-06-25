import dotenv from 'dotenv';
import { PrismaClient, VMStatus } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function createDefaultVMs() {
  console.log('🔄 Creating default VM entries for all hosts...');
  
  // Get all hosts
  const hosts = await prisma.host.findMany();
  
  const created = [];
  const skipped = [];

  for (const host of hosts) {
    // Default VM name for each host (you can customize this pattern)
    const defaultVMName = 'vm30000';
    const machineId = `${host.name}-${defaultVMName}`;
    
    // Check if VM already exists
    const existingVM = await prisma.vM.findUnique({
      where: { machineId }
    });

    if (existingVM) {
      skipped.push(`${host.name}-${defaultVMName}`);
      continue;
    }

    // Create default VM entry
    await prisma.vM.create({
      data: {
        name: defaultVMName,
        machineId: machineId,
        os: 'Unknown',
        ip: '0.0.0.0', // Will be updated when telemetry comes in
        cpu: 0,
        ram: 0,
        disk: 0,
        uptime: 0,
        status: VMStatus.offline, // Start as offline until telemetry confirms
        hostId: host.id,
      }
    });

    created.push(`${host.name}-${defaultVMName}`);
  }

  console.log(`\n✅ Default VM creation complete:`);
  console.log(`   📦 Created: ${created.length} VMs`);
  created.forEach(vm => console.log(`      + ${vm}`));
  
  console.log(`   ⏭️  Skipped: ${skipped.length} VMs (already exist)`);
  skipped.forEach(vm => console.log(`      - ${vm}`));

  // Show final VM count
  const totalVMs = await prisma.vM.count();
  console.log(`\n📊 Total VMs in database: ${totalVMs}`);
}

if (require.main === module) {
  createDefaultVMs()
    .catch(err => {
      console.error('❌ Error creating default VMs:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { createDefaultVMs }; 