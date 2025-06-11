import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hosts = [
  { name: 'u0', ip: '100.76.195.14' },
  { name: 'u1', ip: '100.112.103.42' },
  { name: 'u10', ip: '100.124.126.62' },
  { name: 'u11', ip: '100.87.158.3' },
  { name: 'u12', ip: '100.92.140.4' },
  { name: 'u2', ip: '100.78.74.90' },
  { name: 'u3-nfs-server', ip: '100.72.254.70' },
  { name: 'u4', ip: '100.92.96.25' },
  { name: 'u5', ip: '100.71.251.12' },
  { name: 'u6', ip: '100.68.46.16' },
  { name: 'u7', ip: '100.89.0.126' },
  { name: 'u8', ip: '100.71.67.120' },
  { name: 'u9', ip: '100.98.52.5' },
];

async function main() {
  console.log('Seeding u* hosts...');

  // Delete existing data (CAUTION in prod)
  await prisma.vM.deleteMany();
  await prisma.host.deleteMany();

  for (const h of hosts) {
    await prisma.host.create({
      data: {
        name: h.name,
        ip: h.ip,
        os: 'Ubuntu 24.10',
        uptime: 0,
        status: 'up',
        ssh: true,
        cpu: 0,
        ram: 0,
        disk: 0,
      },
    });
  }

  console.log(`Seeded ${hosts.length} u* hosts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });