import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Vercel/serverless bootstrap — runs before Prisma reads DATABASE_URL.
 * Copies bundled demo.db to a writable temp path for SQLite on ephemeral functions.
 */
export const prepareServerlessRuntime = (): void => {
  if (process.env.VERCEL !== '1') return;

  const tmpDir = os.tmpdir();
  const tmpDb = path.join(tmpDir, 'ai-media-buyer-demo.db');

  if (!fs.existsSync(tmpDb)) {
    const candidates = [
      path.join(process.cwd(), 'apps', 'api', 'prisma', 'demo.db'),
      path.join(process.cwd(), 'prisma', 'demo.db'),
      path.join(__dirname, '..', '..', 'prisma', 'demo.db'),
      path.join(__dirname, '..', '..', '..', 'prisma', 'demo.db'),
    ];

    let copied = false;
    for (const src of candidates) {
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(tmpDb), { recursive: true });
        fs.copyFileSync(src, tmpDb);
        copied = true;
        break;
      }
    }

    if (!copied) {
      // eslint-disable-next-line no-console
      console.error('[serverlessBootstrap] demo.db not found', {
        cwd: process.cwd(),
        dirname: __dirname,
        candidates,
      });
    }
  }

  if (!process.env.DATABASE_URL?.trim() && fs.existsSync(tmpDb)) {
    process.env.DATABASE_URL = `file:${tmpDb}`;
  }

  const uploadsDir = process.env.UPLOADS_DIR?.trim() || path.join(tmpDir, 'uploads');
  process.env.UPLOADS_DIR = uploadsDir;

  if (!process.env.DEMO_MODE) {
    process.env.DEMO_MODE = 'true';
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

prepareServerlessRuntime();
