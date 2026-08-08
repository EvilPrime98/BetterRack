import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const LOG_DIR = path.join(process.cwd(), 'logs');

fs.mkdirSync(LOG_DIR, { recursive: true });

const logFilePath = path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`);

export const logger = pino(
    {
        level: process.env.LOG_LEVEL ?? 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
        { stream: process.stdout },
        { stream: pino.destination({ dest: logFilePath, mkdir: true, sync: false }) },
    ])
);
