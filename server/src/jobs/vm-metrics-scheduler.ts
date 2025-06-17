import cron from 'node-cron';
import { pollAllVMsSafe } from '../scripts/pollVMs';

cron.schedule('* * * * *', async () => {
  console.log(`[pollVMs] Cron triggered at ${new Date().toISOString()}`);
  await pollAllVMsSafe();
});