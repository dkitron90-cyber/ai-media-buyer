import fs from 'fs';
import path from 'path';

/**
 * Vercel/serverless bootstrap — runs before Prisma reads DATABASE_URL.
 * Copies bundled demo.db to /tmp for writable SQLite on ephemeral functions.
 */
export const prepareServerlessRuntime = (): void => {
  if (process.env.VERCEL !== '1') return;

  const tmpDb = '/tmp/demo.db';
  if (!fs.existsSync(tmpDb)) {
    const candidates = [
      path.join(process.cwd(), 'apps', 'api', 'prisma', 'demo.db'),
      path.join(process.cwd(), 'prisma', 'demo.db'),
      path.join(__dirname, '..', '..', 'prisma', 'demo.db'),
    ];
    for (const src of candidates) {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, tmpDb);
        break;
      }
    }
  }

  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = `file:${tmpDb}`;
  }

  if (!process.env.UPLOADS_DIR?.trim()) {
    process.env.UPLOADS_DIR = '/tmp/uploads';
  }

  if (!process.env.DEMO_MODE) {
    process.env.DEMO_MODE = 'true';
  }

  const uploads = process.env.UPLOADS_DIR;
  if (uploads && !fs.existsSync(uploads)) {
    fs.mkdirSync(uploads, { recursive: true });
  }
};

prepareServerlessRuntime();
