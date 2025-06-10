import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const HISTORY_FILE = path.resolve(__dirname, '../../../poll_history.json');

router.get('/poll-history', async (_, res) => {
  try {
    const file = await fs.readFile(HISTORY_FILE, 'utf8');
    const data = JSON.parse(file);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Could not load poll history' });
  }
});

export default router;