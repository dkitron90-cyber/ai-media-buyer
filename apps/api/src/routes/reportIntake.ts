import { Router } from 'express';
import { reportUpload } from '../middleware/reportUpload';
import {
  inspectReportIntakeHandler,
  attachReportIntakeHandler,
  reportIntakeIntelligenceHandler,
} from '../controllers/reportIntakeController';

export const reportIntakeRouter = Router();

reportIntakeRouter.post(
  '/inspect',
  reportUpload.single('file'),
  inspectReportIntakeHandler
);

reportIntakeRouter.post('/attach', attachReportIntakeHandler);
reportIntakeRouter.post('/intelligence', reportIntakeIntelligenceHandler);

