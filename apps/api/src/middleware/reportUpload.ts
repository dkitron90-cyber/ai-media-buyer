import multer from 'multer';
import { ensureUploadsDirSync, getUploadsDir } from '../lib/runtimePaths';

ensureUploadsDirSync();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, getUploadsDir());
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    callback(null, `${timestamp}-${safeFileName}`);
  },
});

export const reportUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
