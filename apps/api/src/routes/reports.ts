import { Router } from 'express';
import {
  listReportRowsHandler,
  parseReportHandler,
  reparseReportHandler,
} from '../controllers/reportParsingController';

export const reportsRouter = Router();

reportsRouter.post('/:id/parse', parseReportHandler);
reportsRouter.post('/:id/reparse', reparseReportHandler);
reportsRouter.get('/:id/rows', listReportRowsHandler);
