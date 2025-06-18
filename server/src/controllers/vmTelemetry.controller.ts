import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

const TELEMETRY_DIR = '/mnt/vm-telemetry-json';

export async function getVMFileTelemetry(_req: Request, res: Response) {
  try {
    const files = await fs.readdir(TELEMETRY_DIR);
    const telemetryData = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const filePath = path.join(TELEMETRY_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        telemetryData.push(parsed);
      } catch (err) {
        console.warn(`⚠️ Skipping corrupt or unreadable file: ${file}`);
        continue;
      }
    }

    res.json(telemetryData);
  } catch (err) {
    console.error('Failed to read telemetry files:', err);
    res.status(500).json({ error: 'Could not read VM telemetry' });
  }
}