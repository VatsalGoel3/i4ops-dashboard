import dotenv from 'dotenv';
import { PrismaClient, HostStatus, PipelineStage } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const CLIENT_ID = process.env.TS_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.TS_OAUTH_CLIENT_SECRET;
const TAILNET = process.env.TAILNET;

if (!CLIENT_ID || !CLIENT_SECRET || !TAILNET) {
  console.error('Missing OAuth env vars.');
  process.exit(1);
}

type TailscaleDevice = {
  hostname: string;
  addresses: string[];
  os: string;
};

async function getOAuthAccessToken(): Promise<string> {
  const res = await fetch('https://api.tailscale.com/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID || '',
      client_secret: CLIENT_SECRET || '',
      scope: 'read:devices',
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OAuth token request failed: ${res.status} - ${error}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

async function fetchTailscaleDevices(token: string): Promise<TailscaleDevice[]> {
  const res = await fetch(`https://api.tailscale.com/api/v2/tailnet/${TAILNET}/devices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Tailscale API failed: ${res.status}`);
  }

  const json = await res.json() as { devices: TailscaleDevice[] };
  return json.devices;
}

async function populateHosts() {
  console.log('Fetching devices from Tailscale...');
  const token = await getOAuthAccessToken();
  const devices = await fetchTailscaleDevices(token);

  // Filter for host machines (u0, u1, u2, etc.)
  const hostDevices = devices.filter(device => 
    device.hostname?.match(/^u\d+$/) && device.addresses?.[0]
  );

  console.log(`Found ${hostDevices.length} host devices from Tailscale:`);
  hostDevices.forEach(device => {
    console.log(`  - ${device.hostname}: ${device.addresses[0]} (${device.os})`);
  });

  const created = [];
  const updated = [];

  for (const device of hostDevices) {
    const hostname = device.hostname;
    const ip = device.addresses[0];
    const os = device.os || 'Linux';

    const existingHost = await prisma.host.findUnique({ 
      where: { name: hostname } 
    });

    if (existingHost) {
      // Update existing host
      if (existingHost.ip !== ip) {
        await prisma.host.update({
          where: { id: existingHost.id },
          data: { ip, os }
        });
        updated.push(`${hostname}: ${existingHost.ip} → ${ip}`);
      }
    } else {
      // Create new host
      await prisma.host.create({
        data: {
          name: hostname,
          ip: ip,
          os: os,
          uptime: 0,
          status: HostStatus.down,
          ssh: false,
          cpu: 0,
          ram: 0,
          disk: 0,
          pipelineStage: PipelineStage.unassigned,
          assignedTo: null,
          notes: null
        }
      });
      created.push(`${hostname}: ${ip}`);
    }
  }

  console.log(`\nHost population complete:`);
  console.log(`   Created: ${created.length} hosts`);
  created.forEach(host => console.log(`      + ${host}`));
  
  console.log(`   Updated: ${updated.length} hosts`);
  updated.forEach(host => console.log(`      → ${host}`));

  // Show final host count
  const totalHosts = await prisma.host.count();
  console.log(`\nTotal hosts in database: ${totalHosts}`);
}

if (require.main === module) {
  populateHosts()
    .catch(err => {
      console.error('Error populating hosts:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { populateHosts }; 