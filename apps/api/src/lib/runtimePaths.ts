import fs from 'fs';
import path from 'path';

/** Writable uploads directory (ephemeral on Vercel serverless). */
export const getUploadsDir = (): string => {
  if (process.env.UPLOADS_DIR?.trim()) {
    return path.resolve(process.env.UPLOADS_DIR.trim());
  }
  return path.resolve(process.cwd(), 'uploads');
};

export const ensureUploadsDir = async (): Promise<void> => {
  const dir = getUploadsDir();
  await fs.promises.mkdir(dir, { recursive: true });
};

export const ensureUploadsDirSync = (): void => {
  const dir = getUploadsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
