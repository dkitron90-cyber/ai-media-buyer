import express, { type Application } from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health';
import { clientsRouter } from './routes/clients';
import { campaignsRouter } from './routes/campaigns';
import { reportsRouter } from './routes/reports';
import { reportIntakeRouter } from './routes/reportIntake';
import { campaignTypesRouter } from './routes/campaignTypes';
import { landingPageRouter } from './routes/landingPage';
import { integrationsRouter } from './routes/integrations';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/report-intake', reportIntakeRouter);
  app.use('/api/campaign-types', campaignTypesRouter);
  app.use('/api/landing-page', landingPageRouter);
  app.use('/api/integrations', integrationsRouter);

  app.use(errorHandler);

  return app;
};

