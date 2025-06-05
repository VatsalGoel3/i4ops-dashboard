import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with sample hosts & VMs...');

  // Delete existing data (if any)
  await prisma.vM.deleteMany();
  await prisma.host.deleteMany();

  // Create sample hosts
  const host1 = await prisma.host.create({
    data: {
      name: 'baremetal01',
      ip: '100.64.0.1',
      os: 'Ubuntu 24.04',
      uptime: 123456,
      status: 'up',
      ssh: true,
      cpu: 35.2,
      ram: 58.7,
      disk: 72.1,
      vms: {
        create: [
          {
            name: 'vm-web-01',
            status: 'running',
            cpu: 16.8,
            ram: 27.5,
            disk: 40.3,
            os: 'CentOS 8',
            uptime: 9876,
            xml: `<domain type='kvm'> ... </domain>`,
            networkIp: '192.168.122.101',
            networkMac: '52:54:00:ca:fe:01',
          },
          {
            name: 'vm-db-01',
            status: 'stopped',
            cpu: 0,
            ram: 0,
            disk: 0,
            os: 'Ubuntu 22.04',
            uptime: 0,
            xml: `<domain type='kvm'> ... </domain>`,
            networkIp: '192.168.122.102',
            networkMac: '52:54:00:ab:cd:02',
          }
        ]
      }
    }
  });

  const host2 = await prisma.host.create({
    data: {
      name: 'baremetal02',
      ip: '100.64.0.2',
      os: 'CentOS 8',
      uptime: 234567,
      status: 'down',
      ssh: false,
      cpu: 0,
      ram: 0,
      disk: 0,
      vms: {
        create: [
          {
            name: 'vm-app-01',
            status: 'running',
            cpu: 22.4,
            ram: 30.8,
            disk: 52.9,
            os: 'Debian 11',
            uptime: 5432,
            xml: `<domain type='kvm'> ... </domain>`,
            networkIp: '192.168.122.111',
            networkMac: '52:54:00:ef:01:03',
          }
        ]
      }
    }
  });

  console.log('Seed completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });