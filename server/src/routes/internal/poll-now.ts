import { Router, Request, Response } from 'express';
import { pollAllHostsSafe } from '../../scripts/pollHosts';

const router = Router();

let lastPoll = 0;
let pollInProgress = false;
const MIN_COOLDOWN_MS = 30_000;

router.post('/poll-now', async (_req: Request, res: Response) => {
  if (pollInProgress) {
    return res.status(429).json({ error: 'Polling in progress' });
  }

  const now = Date.now();
  if (now - lastPoll < MIN_COOLDOWN_MS) {
    const wait = ((MIN_COOLDOWN_MS - (now - lastPoll)) / 1000).toFixed(1);
    return res.status(429).json({ error: `Please wait ${wait}s before polling again.` });
  }

  pollInProgress = true;
  try {
    await pollAllHostsSafe();
    lastPoll = Date.now();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Polling failed', details: (error as any).message });
  } finally {
    pollInProgress = false;
  }
});

export default router;