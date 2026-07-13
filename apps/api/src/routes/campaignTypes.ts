import { Router } from 'express';
import {
  getCampaignTypeByCodeHandler,
  listCampaignTypesHandler,
} from '../controllers/campaignTypeController';

export const campaignTypesRouter = Router();

campaignTypesRouter.get('/', listCampaignTypesHandler);
campaignTypesRouter.get('/:type', getCampaignTypeByCodeHandler);
