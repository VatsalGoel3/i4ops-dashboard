// sync-IPs.ts
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

export async function updateIPsFromTailscale() {
  const token = await getOAuthAccessToken();
  const devices = await fetchTailscaleDevices(token);

  const updates = [];

  for (const device of devices) {
    const hostname = device.hostname;
    const ip = device.addresses?.[0];

    if (!hostname?.startsWith('u') || !ip) continue;

    const host = await prisma.host.findUnique({ where: { name: hostname } });

    if (!host) {
      console.warn(`Host ${hostname} not found in DB — skipping`);
      continue;
    }

    if (host.ip !== ip) {
      console.log(`→ Updating ${hostname} IP: ${host.ip} → ${ip}`);
      updates.push(
        prisma.host.update({
          where: { id: host.id },
          data: { ip }
        })
      );
    }
  }

  await Promise.all(updates);
  console.log(`Updated ${updates.length} host IPs from Tailscale`);
}

if (require.main === module) {
  updateIPsFromTailscale()
    .catch(err => {
      console.error('Error syncing Tailscale IPs:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}