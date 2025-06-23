import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.TS_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.TS_OAUTH_CLIENT_SECRET;
const TAILNET = process.env.TAILNET;

async function main() {
  console.log('.env Loaded Values:');
  console.log('TS_OAUTH_CLIENT_ID:', CLIENT_ID);
      console.log('TS_OAUTH_CLIENT_SECRET:', CLIENT_SECRET ? '***SET***' : 'MISSING');
  console.log('TAILNET:', TAILNET);

  if (!CLIENT_ID || !CLIENT_SECRET || !TAILNET) {
    console.error('❌ One or more required env vars are missing.');
    process.exit(1);
  }

  try {
    const tokenRes = await fetch('https://api.tailscale.com/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'read:devices',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`❌ Token fetch failed: ${tokenRes.status} - ${err}`);
    }

    const { access_token } = await tokenRes.json() as { access_token: string };
    console.log('OAuth token fetched successfully.');

    const devRes = await fetch(`https://api.tailscale.com/api/v2/tailnet/${TAILNET}/devices`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!devRes.ok) {
      const err = await devRes.text();
      throw new Error(`❌ Device fetch failed: ${devRes.status} - ${err}`);
    }

    const { devices } = await devRes.json() as { devices: any[] };
          console.log(`Got ${devices.length} devices from Tailscale.`);

  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

main();